import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, User as FirebaseUser } from 'firebase/auth';
import { 
  initializeFirestore, doc, getDoc, getDocFromServer, setDoc, updateDoc, deleteDoc, 
  collection, query, where, getDocs, onSnapshot, Unsubscribe, runTransaction,
  serverTimestamp, writeBatch, increment
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CandidateProfile, SavedUserDocument, TransactionRecord, GenerationMode, CVFormData, AIOptimizedData, PlatformPricingConfig, PromoCode } from '../types';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  walletBalance: number;
  currency?: string; // e.g. "FCFA"
  balance?: number; // legacy alias
  subscription: {
    planId: string; // "FREE" | "VIP" | "weekly" | "monthly" | "annual"
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'active' | 'expired' | 'none';
    expiresAt?: string | null;
    startedAt?: string | null;
  };
  createdAt: string;
  updatedAt: string;
  personalInfo?: any;
  role?: 'admin' | 'candidate';
}

export interface OrderRecord {
  id: string;
  mode: 'cv_only' | 'letter_only' | 'full_pack' | 'credit_recharge';
  price: number;
  createdAt: string;
  paymentStatus: 'pending' | 'success' | 'cancel';
  userId?: string;
  transactionId?: string;
  creditsAdded?: number;
}

export async function saveOrderRecord(order: OrderRecord) {
  try {
    const orderDocRef = doc(db, 'orders', order.id);
    await setDoc(orderDocRef, {
      id: order.id,
      mode: order.mode,
      price: order.price,
      createdAt: order.createdAt,
      paymentStatus: order.paymentStatus,
      ...(order.userId ? { userId: order.userId } : {}),
      ...(order.transactionId ? { transactionId: order.transactionId } : {}),
      ...(order.creditsAdded ? { creditsAdded: order.creditsAdded } : {})
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${order.id}`);
    return false;
  }
}

export async function fetchUserOrders(userId: string): Promise<OrderRecord[]> {
  const path = 'orders';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const orders: OrderRecord[] = [];
    querySnapshot.forEach((d) => {
      orders.push(d.data() as OrderRecord);
    });
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('Could not fetch user orders from Firestore, fallback to local', error);
    return [];
  }
}

export async function saveTransactionRecord(tx: TransactionRecord): Promise<boolean> {
  try {
    const txDocRef = doc(db, 'transactions', tx.id);
    await setDoc(txDocRef, {
      ...tx,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('Could not save transaction to Firestore:', error);
    return false;
  }
}

/**
 * Initializes a new user's document in Firestore users/{userId} with STRICT 0 FCFA balance and FREE subscription
 */
export async function initializeUserAccountDoc(
  user: FirebaseUser,
  extra?: { displayName?: string }
): Promise<FirebaseUserProfile> {
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const nowIso = new Date().toISOString();
      const initialProfile: FirebaseUserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: extra?.displayName || user.displayName || user.email?.split('@')[0] || 'Candidat',
        photoURL: user.photoURL || '',
        walletBalance: 0,
        currency: 'FCFA',
        subscription: {
          planId: 'FREE',
          status: 'INACTIVE',
          expiresAt: null,
          startedAt: null
        },
        createdAt: nowIso,
        updatedAt: nowIso,
        role: user.email === 'peter25ngouala@gmail.com' ? 'admin' : 'candidate'
      };
      await setDoc(userRef, initialProfile, { merge: true });
      return initialProfile;
    }
    return snap.data() as FirebaseUserProfile;
  } catch (err) {
    console.warn('[Initialize User Doc Warn]:', err);
    return {
      uid: user.uid,
      email: user.email || '',
      displayName: extra?.displayName || user.displayName || 'Candidat',
      walletBalance: 0,
      currency: 'FCFA',
      subscription: { planId: 'FREE', status: 'INACTIVE', expiresAt: null, startedAt: null },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: user.email === 'peter25ngouala@gmail.com' ? 'admin' : 'candidate'
    };
  }
}

/**
 * Real-time listener for user profile from Firestore collection 'users/{userId}'
 * Automatically initializes clean default user document (0 FCFA, INACTIVE) if missing.
 */
export function subscribeToUserProfile(
  userId: string,
  onUpdate: (userDoc: FirebaseUserProfile) => void
): Unsubscribe {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, async (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const profile: FirebaseUserProfile = {
        uid: userId,
        email: data.email || auth.currentUser?.email || '',
        displayName: data.displayName || auth.currentUser?.displayName || 'Candidat',
        photoURL: data.photoURL || auth.currentUser?.photoURL || '',
        walletBalance: typeof data.walletBalance === 'number' ? data.walletBalance : (typeof data.balance === 'number' ? data.balance : 0),
        currency: data.currency || 'FCFA',
        subscription: {
          planId: data.subscription?.planId || (data.subscriptionStatus === 'unlimited' ? 'VIP' : 'FREE'),
          status: data.subscription?.status || (data.subscriptionStatus === 'unlimited' ? 'ACTIVE' : 'INACTIVE'),
          expiresAt: data.subscription?.expiresAt || null,
          startedAt: data.subscription?.startedAt || null,
        },
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        personalInfo: data.personalInfo || undefined,
        role: data.role || (data.email === 'peter25ngouala@gmail.com' ? 'admin' : 'candidate')
      };
      onUpdate(profile);
    } else if (auth.currentUser && auth.currentUser.uid === userId) {
      // Initialize dynamic user profile in Firestore with STRICT 0 FCFA
      const initialProfile: FirebaseUserProfile = {
        uid: userId,
        email: auth.currentUser.email || '',
        displayName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Candidat',
        photoURL: auth.currentUser.photoURL || '',
        walletBalance: 0,
        currency: 'FCFA',
        subscription: {
          planId: 'FREE',
          status: 'INACTIVE',
          expiresAt: null,
          startedAt: null
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        role: auth.currentUser.email === 'peter25ngouala@gmail.com' ? 'admin' : 'candidate'
      };
      try {
        await setDoc(userRef, initialProfile, { merge: true });
        onUpdate(initialProfile);
      } catch (e) {
        console.warn('[Initialize User Doc Warn]:', e);
        onUpdate(initialProfile);
      }
    }
  }, (err) => {
    console.warn('[Firestore User Snapshot Warn]:', err);
  });
}

/**
 * Real-time listener for transaction status changes via Firestore onSnapshot + HTTP polling fallback
 */
export function subscribeToTransactionStatus(
  txId: string,
  onStatusChange: (status: string, txData?: TransactionRecord) => void
): () => void {
  let isCleanedUp = false;
  let firestoreUnsub: Unsubscribe | null = null;

  // 1. Listen via Firestore onSnapshot
  try {
    const txRef = doc(db, 'transactions', txId);
    firestoreUnsub = onSnapshot(txRef, (snapshot) => {
      if (isCleanedUp) return;
      if (snapshot.exists()) {
        const data = snapshot.data() as TransactionRecord;
        if (data && data.status) {
          onStatusChange(data.status, data);
        }
      }
    }, (err) => {
      console.warn('[Firestore Tx Listen Warn]:', err);
    });
  } catch (e) {
    console.warn('[Firestore Tx Sub Init Warn]:', e);
  }

  // 2. Ultra-responsive HTTP polling fallback (every 1.5s)
  const pollInterval = setInterval(async () => {
    if (isCleanedUp) return;
    try {
      const res = await fetch(`/api/transactions/${encodeURIComponent(txId)}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.status) {
          onStatusChange(data.status, data.transaction);
        }
      }
    } catch (_err) {}
  }, 1500);

  // Return teardown function
  return () => {
    isCleanedUp = true;
    clearInterval(pollInterval);
    if (firestoreUnsub) {
      try { firestoreUnsub(); } catch (_e) {}
    }
  };
}

export async function fetchUserTransactions(userId: string): Promise<TransactionRecord[]> {
  const path = 'transactions';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const transactions: TransactionRecord[] = [];
    querySnapshot.forEach((d) => {
      transactions.push(d.data() as TransactionRecord);
    });
    return transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('Could not fetch transactions from Firestore, fallback to local', error);
    return [];
  }
}

export async function fetchUserProfile(userId: string): Promise<CandidateProfile | null> {
  const path = `user_profiles/${userId}`;
  try {
    const docRef = doc(db, 'user_profiles', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as CandidateProfile;
    }
    return null;
  } catch (error) {
    console.warn('Error fetching candidate profile:', error);
    return null;
  }
}

export async function saveCandidateProfile(profile: CandidateProfile): Promise<boolean> {
  if (!auth.currentUser) {
    return true;
  }
  const path = `user_profiles/${profile.uid}`;
  try {
    const docRef = doc(db, 'user_profiles', profile.uid);
    await setDoc(docRef, {
      ...profile,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function fetchUserDocuments(userId: string): Promise<SavedUserDocument[]> {
  if (!userId || userId === 'guest') return [];
  const path = 'user_documents';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const docs: SavedUserDocument[] = [];
    querySnapshot.forEach((d) => {
      docs.push(d.data() as SavedUserDocument);
    });
    return docs.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  } catch (error) {
    console.warn('Error fetching user documents:', error);
    return [];
  }
}

export async function saveUserDocument(userDoc: SavedUserDocument): Promise<boolean> {
  if (!auth.currentUser) {
    // For unauthenticated guest sessions, document is saved in local storage
    return true;
  }
  const cleanDoc = {
    ...userDoc,
    userId: auth.currentUser.uid
  };
  const path = `user_documents/${cleanDoc.id}`;
  try {
    const docRef = doc(db, 'user_documents', cleanDoc.id);
    await setDoc(docRef, cleanDoc);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export interface SaveDocumentMetadataParams {
  userId?: string;
  title: string;
  selectedFormat: 'PDF' | 'DOCX' | 'PDF + DOCX' | string;
  generationMode?: GenerationMode;
  formData?: CVFormData;
  aiData?: AIOptimizedData | null;
  businessDocData?: any;
  ebookData?: any;
  createdAt?: string;
  isPaid?: boolean;
}

/**
 * Enregistre les métadonnées du document final généré (titre, format choisi, horodatage)
 * dans la collection `user_documents` du profil utilisateur après confirmation de paiement.
 */
export async function saveGeneratedDocumentMetadata(params: SaveDocumentMetadataParams): Promise<SavedUserDocument | null> {
  const currentUid = params.userId || auth.currentUser?.uid || 'guest';
  const docId = `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = params.createdAt || new Date().toISOString();

  const userDoc: SavedUserDocument = {
    id: docId,
    userId: currentUid,
    title: params.title,
    generationMode: params.generationMode || 'cv_only',
    createdAt: timestamp,
    updatedAt: timestamp,
    isPaid: params.isPaid ?? true,
    formData: params.formData || ({ personalInfo: {} } as CVFormData),
    aiData: params.aiData || null,
    businessDocData: params.businessDocData,
    ebookData: params.ebookData,
    selectedFormat: params.selectedFormat,
  };

  try {
    // Sync to local storage history as well for instant offline reactivity
    const savedDocsList = localStorage.getItem('senegal_cv_saved_documents');
    let docs: any[] = [];
    if (savedDocsList) {
      try { docs = JSON.parse(savedDocsList); } catch (e) {}
    }
    docs.unshift(userDoc);
    localStorage.setItem('senegal_cv_saved_documents', JSON.stringify(docs));
  } catch (e) {
    console.warn('Could not sync document metadata to localStorage:', e);
  }

  try {
    const docRef = doc(db, 'user_documents', docId);
    await setDoc(docRef, userDoc);
    return userDoc;
  } catch (error) {
    console.warn('Could not save user document metadata to Firestore:', error);
    return userDoc;
  }
}

export async function deleteUserDocument(docId: string): Promise<boolean> {
  if (!auth.currentUser) {
    return true;
  }
  const path = `user_documents/${docId}`;
  try {
    const docRef = doc(db, 'user_documents', docId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

// =========================================================================
// PRICING & PROMO CODES FIRESTORE REAL-TIME SYNCHRONIZATION
// =========================================================================

export const DEFAULT_PLATFORM_PRICING: PlatformPricingConfig = {
  cvOnlyPrice: 1000,
  letterOnlyPrice: 1000,
  fullPackPrice: 1399,
  devisPrice: 1000,
  facturePrice: 1000,
  businessPackPrice: 1499,
  ebookPrice: 1500,
  unlimitedPassPrice: 3499,
  unlimitedPassMonthlyPrice: 3499,
  unlimitedPassAnnualPrice: 39999,
  recruiterSearchPrice: 10000,
  currency: 'FCFA',
  updatedAt: new Date().toISOString(),
  updatedBy: 'system'
};

/**
 * Real-time listener for platform pricing configuration from Firestore collection "settings_pricing".
 */
export function subscribeToPricing(
  onUpdate: (pricing: PlatformPricingConfig) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const docRef = doc(db, 'settings_pricing', 'global');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<PlatformPricingConfig>;
        const merged: PlatformPricingConfig = {
          ...DEFAULT_PLATFORM_PRICING,
          ...data,
          cvOnlyPrice: Number(data.cvOnlyPrice ?? DEFAULT_PLATFORM_PRICING.cvOnlyPrice),
          letterOnlyPrice: Number(data.letterOnlyPrice ?? DEFAULT_PLATFORM_PRICING.letterOnlyPrice),
          fullPackPrice: Number(data.fullPackPrice ?? DEFAULT_PLATFORM_PRICING.fullPackPrice),
          devisPrice: Number(data.devisPrice ?? DEFAULT_PLATFORM_PRICING.devisPrice),
          facturePrice: Number(data.facturePrice ?? DEFAULT_PLATFORM_PRICING.facturePrice),
          businessPackPrice: Number(data.businessPackPrice ?? DEFAULT_PLATFORM_PRICING.businessPackPrice),
          ebookPrice: Number(data.ebookPrice ?? DEFAULT_PLATFORM_PRICING.ebookPrice),
          unlimitedPassPrice: Number(data.unlimitedPassPrice ?? DEFAULT_PLATFORM_PRICING.unlimitedPassPrice),
          unlimitedPassMonthlyPrice: Number(data.unlimitedPassMonthlyPrice ?? DEFAULT_PLATFORM_PRICING.unlimitedPassMonthlyPrice),
          unlimitedPassAnnualPrice: Number(data.unlimitedPassAnnualPrice ?? DEFAULT_PLATFORM_PRICING.unlimitedPassAnnualPrice),
          recruiterSearchPrice: Number(data.recruiterSearchPrice ?? DEFAULT_PLATFORM_PRICING.recruiterSearchPrice),
          currency: data.currency || 'FCFA',
          updatedAt: data.updatedAt || new Date().toISOString()
        };
        onUpdate(merged);
      }
    },
    (err) => {
      console.warn('Firestore pricing snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save pricing configuration to Firestore "settings_pricing/global"
 */
export async function savePricingToFirestore(pricing: PlatformPricingConfig): Promise<boolean> {
  try {
    const docRef = doc(db, 'settings_pricing', 'global');
    await setDoc(docRef, {
      ...pricing,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('Could not save pricing to Firestore:', error);
    return false;
  }
}

/**
 * Real-time listener for promo codes from Firestore collection "promo_codes"
 */
export function subscribeToPromoCodes(
  onUpdate: (promos: PromoCode[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const colRef = collection(db, 'promo_codes');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: PromoCode[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) } as PromoCode);
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore promo codes snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save / Update a promo code in Firestore "promo_codes/{id}"
 */
export async function savePromoCodeToFirestore(promo: PromoCode): Promise<boolean> {
  try {
    const docRef = doc(db, 'promo_codes', promo.id);
    await setDoc(docRef, {
      ...promo,
      code: promo.code.trim().toUpperCase()
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('Could not save promo code to Firestore:', error);
    return false;
  }
}

/**
 * Delete a promo code from Firestore "promo_codes/{id}"
 */
export async function deletePromoCodeFromFirestore(promoId: string, promoCode?: string): Promise<boolean> {
  try {
    if (promoId) {
      const docRef = doc(db, 'promo_codes', promoId);
      await deleteDoc(docRef);
    }
    if (promoCode && promoCode !== promoId) {
      try {
        const codeDocRef = doc(db, 'promo_codes', promoCode.toUpperCase());
        await deleteDoc(codeDocRef);
      } catch (_e) {}
    }
    return true;
  } catch (error) {
    console.warn('Could not delete promo code from Firestore:', error);
    return false;
  }
}



export async function fetchAllFirestoreTransactions(): Promise<TransactionRecord[]> {
  try {
    const q = query(collection(db, 'transactions'));
    const querySnapshot = await getDocs(q);
    const transactions: TransactionRecord[] = [];
    querySnapshot.forEach((d) => {
      transactions.push({ id: d.id, ...(d.data() as any) } as TransactionRecord);
    });
    return transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('Could not fetch all transactions from Firestore:', error);
    return [];
  }
}

export async function fetchAllFirestoreUserProfiles(): Promise<CandidateProfile[]> {
  try {
    const q = query(collection(db, 'user_profiles'));
    const querySnapshot = await getDocs(q);
    const profiles: CandidateProfile[] = [];
    querySnapshot.forEach((d) => {
      profiles.push({ uid: d.id, ...(d.data() as any) } as CandidateProfile);
    });
    return profiles;
  } catch (error) {
    console.warn('Could not fetch all user profiles from Firestore:', error);
    return [];
  }
}

/**
 * Persists transaction simultaneously to Firestore and Backend Admin Store
 */
export async function recordTransactionEverywhere(tx: TransactionRecord): Promise<boolean> {
  let firestoreSuccess = false;
  try {
    firestoreSuccess = await saveTransactionRecord(tx);
  } catch (e) {
    console.warn('Error saving to Firestore:', e);
  }

  try {
    const res = await fetch('/api/admin/transactions/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': 'peter25ngouala@gmail.com',
        'x-user-role': 'admin'
      },
      body: JSON.stringify({ transaction: tx })
    });
    if (res.ok) {
      return true;
    }
  } catch (e) {
    console.warn('Error posting to backend transaction recorder:', e);
  }

  return firestoreSuccess;
}

/**
 * Real-time listener for ALL transactions for the Admin Panel (ordering by date desc)
 */
export function subscribeToAllTransactions(
  onUpdate: (txs: TransactionRecord[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const colRef = collection(db, 'transactions');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: TransactionRecord[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) } as TransactionRecord);
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn('[Firestore All Transactions Snapshot Warn]:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Action [ VALIDER ] - Exécute une transaction atomique Firestore (runTransaction) :
 * 1. Passe le statut de la transaction à 'APPROVED' (et 'MANUALLY_VALIDATED').
 * 2. Accrédite le champ 'walletBalance' du document 'users/{userId}' de la valeur exacte de la recharge (+amount).
 * 3. Si achat d'abonnement, active le Pass VIP 'subscription.status = ACTIVE' pour +30 jours.
 * 4. Enregistre la date d'approbation et l'ID de l'admin.
 */
export async function approveTransactionWithAtomicFirestore(
  txId: string,
  adminEmail: string,
  note: string = 'Validation manuelle effectuée par l\'administrateur'
): Promise<{ success: boolean; message: string; newBalance?: number; error?: string }> {
  try {
    const txRef = doc(db, 'transactions', txId);

    const result = await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const txDoc = await transaction.get(txRef);
      if (!txDoc.exists()) {
        throw new Error(`Transaction ${txId} introuvable dans Firestore.`);
      }

      const txData = txDoc.data() as TransactionRecord;
      const targetUserId = txData.userId;
      const isSubscription = txData.type === 'subscription_purchase' || (txData as any).purpose === 'subscription_purchase';
      const isRecharge = !isSubscription;
      const rechargeAmount = Math.abs(Number(txData.expectedAmount || txData.amount || (txData as any).extractedAmount || 0));

      let userDocSnapshot: any = null;
      let userRef: any = null;
      if (targetUserId && targetUserId !== 'guest') {
        userRef = doc(db, 'users', targetUserId);
        userDocSnapshot = await transaction.get(userRef);
      }

      // 2. ALL WRITES AFTER ALL READS
      const nowIso = new Date().toISOString();

      // Update the transaction atomically to APPROVED
      transaction.update(txRef, {
        status: 'APPROVED',
        aiStatus: 'MANUALLY_VALIDATED',
        approvedAt: nowIso,
        approvedBy: adminEmail,
        manuallyValidatedBy: adminEmail,
        manuallyValidatedAt: nowIso,
        adminValidationNote: note,
        updatedAt: nowIso
      });

      let updatedBalance: number | undefined;

      // Update User Document in 'users/{userId}'
      if (userRef) {
        if (userDocSnapshot && userDocSnapshot.exists()) {
          const userData = userDocSnapshot.data();
          const currentBalance = typeof userData.walletBalance === 'number' ? userData.walletBalance : (typeof userData.balance === 'number' ? userData.balance : 0);

          if (isSubscription) {
            const days = (txData as any).planId === 'weekly' ? 7 : (txData as any).planId === 'annual' ? 365 : 30;
            const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
            transaction.update(userRef, {
              subscription: {
                planId: (txData as any).planId || 'VIP',
                planName: (txData as any).planTitle || 'Pass VIP Dokya',
                status: 'ACTIVE',
                startedAt: nowIso,
                expiresAt,
                pricePaid: rechargeAmount,
                adminValidationNote: note
              },
              subscriptionStatus: 'unlimited',
              updatedAt: nowIso
            });
          } else {
            updatedBalance = currentBalance + rechargeAmount;
            transaction.update(userRef, {
              walletBalance: updatedBalance,
              balance: updatedBalance,
              currency: 'FCFA',
              updatedAt: nowIso
            });
          }
        } else if (targetUserId && targetUserId !== 'guest') {
          updatedBalance = isSubscription ? 0 : rechargeAmount;
          transaction.set(userRef, {
            uid: targetUserId,
            email: txData.userEmail || '',
            displayName: txData.userName || 'Candidat',
            walletBalance: updatedBalance,
            balance: updatedBalance,
            currency: 'FCFA',
            subscription: isSubscription ? {
              planId: (txData as any).planId || 'VIP',
              planName: (txData as any).planTitle || 'Pass VIP Dokya',
              status: 'ACTIVE',
              startedAt: nowIso,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              pricePaid: rechargeAmount,
              adminValidationNote: note
            } : {
              planId: 'FREE',
              status: 'INACTIVE',
              expiresAt: null,
              startedAt: null
            },
            createdAt: nowIso,
            updatedAt: nowIso,
            role: 'candidate'
          });
        }
      }

      return {
        success: true,
        message: `Transaction ${txId} validée et accréditée avec succès !`,
        newBalance: updatedBalance
      };
    });

    // Also notify backend store
    fetch(`/api/admin/transactions/${encodeURIComponent(txId)}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': adminEmail,
        'x-user-role': 'admin'
      },
      body: JSON.stringify({ adminEmail, note })
    }).catch((e) => console.warn('[Backend Validate Sync Warn]:', e));

    return result;
  } catch (error: any) {
    console.error('[Firestore Atomic Transaction Error]:', error);
    return {
      success: false,
      message: error?.message || 'Erreur lors de la validation atomique.',
      error: error?.message
    };
  }
}

/**
 * Action [ REJETER ] - Passe le statut à 'REJECTED' avec un motif dans Firestore
 */
export async function rejectTransactionWithFirestore(
  txId: string,
  adminEmail: string,
  reason: string = 'Rejet confirmé par l\'administrateur'
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const txRef = doc(db, 'transactions', txId);
    const nowIso = new Date().toISOString();

    await updateDoc(txRef, {
      status: 'REJECTED',
      aiStatus: 'REJECTED_BY_ADMIN',
      rejectionReason: reason,
      rejectedBy: adminEmail,
      rejectedAt: nowIso,
      updatedAt: nowIso
    });

    // Sync to backend store
    fetch(`/api/admin/transactions/${encodeURIComponent(txId)}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': adminEmail,
        'x-user-role': 'admin'
      },
      body: JSON.stringify({ adminEmail, reason })
    }).catch((e) => console.warn('[Backend Reject Sync Warn]:', e));

    return {
      success: true,
      message: `Rejet de la transaction ${txId} enregistré avec succès.`
    };
  } catch (error: any) {
    console.error('[Firestore Reject Error]:', error);
    return {
      success: false,
      message: error?.message || 'Erreur lors du rejet de la transaction.',
      error: error?.message
    };
  }
}

/**
 * GESTION DES ABONNEMENTS EN TEMPS RÉEL (Pass VIP)
 * Vérifie le solde dans 'users/{userId}.walletBalance', le débite et active l'abonnement VIP.
 */
export async function subscribeToVipWithWallet(
  userId: string,
  planId: 'VIP' | 'weekly' | 'monthly' | 'annual' = 'VIP',
  price: number = 3499,
  userEmail?: string,
  userName?: string
): Promise<{ success: boolean; newBalance?: number; error?: string; message?: string }> {
  try {
    const userRef = doc(db, 'users', userId);
    const txId = `SUB-VIP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const days = planId === 'weekly' ? 7 : (planId === 'annual' ? 365 : 30);
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const result = await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error("Profil utilisateur introuvable dans Firestore.");
      }

      const userData = userDoc.data();
      const currentBalance = typeof userData.walletBalance === 'number' ? userData.walletBalance : (typeof userData.balance === 'number' ? userData.balance : 0);

      if (currentBalance < price) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const newBalance = currentBalance - price;

      // 1. Débite et active l'abonnement dans 'users/{userId}'
      transaction.update(userRef, {
        walletBalance: newBalance,
        balance: newBalance,
        subscription: {
          planId: planId || 'VIP',
          planName: planId === 'annual' ? 'Pass VIP Annuel' : (planId === 'weekly' ? 'Pass VIP Semaine' : 'Pass VIP Mensuel'),
          status: 'ACTIVE',
          startedAt: now.toISOString(),
          expiresAt,
          pricePaid: price,
          paymentMethod: 'wallet'
        },
        subscriptionStatus: 'unlimited',
        updatedAt: now.toISOString()
      });

      // 2. Enregistre la transaction dans la collection 'transactions'
      const txRef = doc(db, 'transactions', txId);
      transaction.set(txRef, {
        id: txId,
        transactionId: txId,
        userId,
        userEmail: userEmail || userData.email || auth.currentUser?.email || '',
        userName: userName || userData.displayName || auth.currentUser?.displayName || 'Candidat',
        type: 'subscription_purchase',
        amount: -price,
        expectedAmount: price,
        currency: 'XOF',
        description: `Souscription ${planId === 'annual' ? 'Pass VIP Annuel' : 'Pass VIP Mensuel'} (Débit Solde)`,
        status: 'APPROVED',
        aiStatus: 'COMPLETED',
        paymentMethod: 'wallet',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });

      return {
        success: true,
        newBalance,
        message: "Abonnement Pass VIP activé avec succès !"
      };
    });

    return result;
  } catch (error: any) {
    console.warn('[Vip Wallet Subscription Error]:', error);
    if (error?.message === 'INSUFFICIENT_BALANCE') {
      return {
        success: false,
        error: 'INSUFFICIENT_BALANCE',
        message: `Solde insuffisant. Vous avez besoin de ${price.toLocaleString('fr-FR')} FCFA pour activer le Pass VIP.`
      };
    }
    return {
      success: false,
      error: error?.message || 'Erreur lors de l\'activation de l\'abonnement.',
      message: error?.message
    };
  }
}

/**
 * 5. NETTOYAGE ET PURGE DES DONNÉES DE TEST (REMISE À ZÉRO) :
 * Réservé exclusivement à peter25ngouala@gmail.com
 * Purge les faux reçus, remet les soldes de test à zéro et vide les transactions factices.
 */
export async function purgeDemoDataInFirestore(
  adminEmail: string
): Promise<{ success: boolean; deletedTransactionsCount: number; message: string }> {
  if (adminEmail !== 'peter25ngouala@gmail.com') {
    throw new Error("Action non autorisée. Réservée au super-administrateur.");
  }

  try {
    let deletedCount = 0;

    // 1. Purge all transactions in Firestore
    try {
      const txQuery = query(collection(db, 'transactions'));
      const txSnapshot = await getDocs(txQuery);

      if (!txSnapshot.empty) {
        // Delete in batches of up to 400
        const docs = txSnapshot.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const chunk = docs.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach((docSnap) => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
          deletedCount += chunk.length;
        }
      }
    } catch (txErr) {
      console.warn('[Purge Transactions Warning]:', txErr);
    }

    // 2. Reset demo balances in 'users' collection to 0 FCFA
    try {
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      if (!usersSnapshot.empty) {
        const userDocs = usersSnapshot.docs;
        for (let i = 0; i < userDocs.length; i += 400) {
          const chunk = userDocs.slice(i, i + 400);
          const userBatch = writeBatch(db);
          chunk.forEach((userDoc) => {
            userBatch.update(userDoc.ref, {
              walletBalance: 0,
              balance: 0,
              updatedAt: new Date().toISOString()
            });
          });
          await userBatch.commit();
        }
      }
    } catch (userErr) {
      console.warn('[Purge Users Balances Warning]:', userErr);
    }

    // 3. Clear server backend demo cache
    try {
      await fetch('/api/admin/purge-demo-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
          'x-user-role': 'admin'
        }
      });
    } catch (_e) {}

    // 4. Clear local test transactions cache
    try {
      localStorage.removeItem('senegal_cv_user_transactions');
      localStorage.removeItem('senegal_cv_paid_docs');
    } catch (_e) {}

    return {
      success: true,
      deletedTransactionsCount: deletedCount,
      message: `🔥 Base de données remise à zéro avec succès ! ${deletedCount} transaction(s) de test purgée(s). Les soldes ont été réinitialisés à 0 FCFA pour le mode production réel.`
    };
  } catch (error: any) {
    console.error('[Purge Demo Data Error]:', error);
    return {
      success: false,
      deletedTransactionsCount: 0,
      message: error?.message || 'Erreur lors du nettoyage des données.'
    };
  }
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();
