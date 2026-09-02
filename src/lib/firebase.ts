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

/**
 * Deeply strips any object or nested field with value `undefined`
 * to avoid Firestore "Unsupported field value: undefined" errors.
 */
export function cleanFirestorePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => (typeof item === 'object' && item !== null ? cleanFirestorePayload(item) : item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = typeof value === 'object' && value !== null ? cleanFirestorePayload(value) : value;
      }
    }
    return cleaned as T;
  }
  return obj;
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
    await setDoc(txDocRef, cleanFirestorePayload({
      ...tx,
      updatedAt: new Date().toISOString()
    }), { merge: true });
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

/**
 * Real-time listener for all transactions of a user via Firestore onSnapshot
 */
export function subscribeToUserTransactions(
  userId: string,
  onUpdate: (transactions: TransactionRecord[]) => void
): () => void {
  if (!userId || userId === 'guest') {
    return () => {};
  }
  try {
    const q = query(collection(db, 'transactions'), where('userId', '==', userId));
    const unsub = onSnapshot(q, (snapshot) => {
      const txs: TransactionRecord[] = [];
      snapshot.forEach((d) => {
        txs.push(d.data() as TransactionRecord);
      });
      txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(txs);
    }, (err) => {
      console.warn('[subscribeToUserTransactions warn]:', err);
    });
    return unsub;
  } catch (e) {
    console.warn('[subscribeToUserTransactions init warn]:', e);
    return () => {};
  }
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
    await setDoc(docRef, cleanFirestorePayload({
      ...profile,
      updatedAt: new Date().toISOString()
    }));
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
  const cleanDoc = cleanFirestorePayload({
    ...userDoc,
    userId: auth.currentUser.uid
  });
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
    await setDoc(docRef, cleanFirestorePayload(userDoc));
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
    await setDoc(docRef, cleanFirestorePayload({
      ...pricing,
      updatedAt: new Date().toISOString()
    }), { merge: true });
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
    await setDoc(docRef, cleanFirestorePayload({
      ...promo,
      code: promo.code.trim().toUpperCase()
    }), { merge: true });
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
 * Action [ VALIDER ] - Exécute une validation atomique Firestore robuste :
 * 1. Résout la transaction par document ID, champ 'id', 'transactionId' ou objet fourni.
 * 2. Si le document n'existe pas encore dans Firestore, l'initialise immédiatement pour garantir l'atomicité.
 * 3. Passe le statut de la transaction à 'APPROVED' (et 'MANUALLY_VALIDATED').
 * 4. Accrédite le champ 'walletBalance' de 'users/{userId}' (si recharge) ou active le Pass VIP ou débloque le document.
 * 5. Notifie et synchronise le backend (/api/admin/transactions/:id/validate).
 */
export async function approveTransactionWithAtomicFirestore(
  txInput: string | TransactionRecord,
  adminEmail: string,
  note: string = 'Validation manuelle effectuée par l\'administrateur'
): Promise<{ success: boolean; message: string; newBalance?: number; error?: string }> {
  try {
    const rawTxId = typeof txInput === 'string' ? txInput : (txInput.id || (txInput as any).transactionId || `TX-${Date.now()}`);
    let targetDocRef = doc(db, 'transactions', rawTxId);
    let resolvedDocSnap = await getDoc(targetDocRef);

    // 1. If document not found by direct doc ID, attempt query lookups
    if (!resolvedDocSnap.exists()) {
      try {
        const qId = query(collection(db, 'transactions'), where('id', '==', rawTxId));
        const snapId = await getDocs(qId);
        if (!snapId.empty) {
          targetDocRef = doc(db, 'transactions', snapId.docs[0].id);
          resolvedDocSnap = snapId.docs[0];
        } else {
          const qRef = query(collection(db, 'transactions'), where('transactionId', '==', rawTxId));
          const snapRef = await getDocs(qRef);
          if (!snapRef.empty) {
            targetDocRef = doc(db, 'transactions', snapRef.docs[0].id);
            resolvedDocSnap = snapRef.docs[0];
          }
        }
      } catch (_lookupErr) {
        console.warn('[Tx Lookup Warn]:', _lookupErr);
      }
    }

    // 2. If still missing from Firestore (e.g. was held in memory/API store), seed it immediately
    if (!resolvedDocSnap.exists()) {
      const fallbackObj: Partial<TransactionRecord> = typeof txInput === 'object' ? txInput : {
        id: rawTxId,
        transactionId: rawTxId,
        userId: 'guest',
        userEmail: 'candidat@dokya.sn',
        userName: 'Candidat Dokya',
        type: 'WALLET_RECHARGE',
        amount: 2000,
        expectedAmount: 2000,
        currency: 'FCFA',
        description: `Recharge Solde (${rawTxId})`,
        status: 'PENDING',
        aiStatus: 'PENDING',
        paymentMethod: 'wave',
        createdAt: new Date().toISOString()
      };

      await setDoc(targetDocRef, cleanFirestorePayload({
        ...fallbackObj,
        id: rawTxId,
        status: 'PENDING',
        createdAt: fallbackObj.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }), { merge: true });
    }

    // 3. Run atomic transaction on Firestore
    const result = await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const txDoc = await transaction.get(targetDocRef);
      if (!txDoc.exists()) {
        throw new Error(`Transaction ${rawTxId} introuvable dans Firestore après synchronisation.`);
      }

      const txData = txDoc.data() as TransactionRecord;
      const targetUserId = txData.userId;
      const txTypeUpper = (txData.type || '').toUpperCase();
      const isDirectPurchase = txTypeUpper === 'DIRECT_PURCHASE' || txTypeUpper === 'DOCUMENT_PURCHASE' || (txData as any).purpose === 'document_purchase' || (txData as any).purpose === 'document_unlock';
      const isSubscription = txTypeUpper === 'SUBSCRIPTION_PURCHASE' || txTypeUpper === 'VIP_PASS' || txTypeUpper === 'SUBSCRIPTION' || (txData as any).purpose === 'subscription_purchase';
      const isRecharge = txTypeUpper === 'WALLET_RECHARGE' || txTypeUpper === 'RECHARGE' || (txData as any).purpose === 'wallet_recharge' || (!isDirectPurchase && !isSubscription);
      const targetAmount = Math.abs(Number(txData.expectedAmount || txData.amount || (txData as any).extractedAmount || 0));
      const targetDocId = txData.targetDocId || (txData as any).unlockedDocId;

      let userDocSnapshot: any = null;
      let userRef: any = null;
      let userProfileSnapshot: any = null;
      let userProfileRef: any = null;

      if (targetUserId && targetUserId !== 'guest') {
        userRef = doc(db, 'users', targetUserId);
        userDocSnapshot = await transaction.get(userRef);

        userProfileRef = doc(db, 'user_profiles', targetUserId);
        userProfileSnapshot = await transaction.get(userProfileRef);
      }

      let targetDocSnapshot: any = null;
      let targetDocItemRef: any = null;
      if (isDirectPurchase && targetDocId) {
        targetDocItemRef = doc(db, 'user_documents', targetDocId);
        targetDocSnapshot = await transaction.get(targetDocItemRef);
      }

      // 2. ALL WRITES AFTER ALL READS
      const nowIso = new Date().toISOString();

      // Update the transaction atomically to APPROVED
      const txApprovalData: Record<string, any> = {
        status: 'APPROVED',
        aiStatus: 'MANUALLY_VALIDATED',
        approvedAt: nowIso,
        approvedBy: adminEmail,
        manuallyValidatedBy: adminEmail,
        manuallyValidatedAt: nowIso,
        adminValidationNote: note,
        updatedAt: nowIso
      };
      if (targetDocId) {
        txApprovalData.unlockedDocId = targetDocId;
      }
      transaction.update(targetDocRef, cleanFirestorePayload(txApprovalData));

      let updatedBalance: number | undefined;

      // Update Target Document if direct purchase
      if (targetDocItemRef && targetDocSnapshot && targetDocSnapshot.exists()) {
        transaction.update(targetDocItemRef, cleanFirestorePayload({
          unlocked: true,
          isPaid: true,
          paidAt: nowIso,
          updatedAt: nowIso
        }));
      }

      // Update User Document in 'users/{userId}' and 'user_profiles/{userId}'
      if (userRef) {
        if (userDocSnapshot && userDocSnapshot.exists()) {
          const userData = userDocSnapshot.data();
          const currentBalance = typeof userData.walletBalance === 'number' ? userData.walletBalance : (typeof userData.balance === 'number' ? userData.balance : 0);
          const currentUnlockedDocs = Array.isArray(userData.purchasedDocIds) ? userData.purchasedDocIds : [];

          if (isDirectPurchase) {
            // DIRECT PURCHASE: Unlock document without modifying walletBalance
            updatedBalance = currentBalance;
            const updatedPurchasedDocs = targetDocId && !currentUnlockedDocs.includes(targetDocId)
              ? [...currentUnlockedDocs, targetDocId]
              : currentUnlockedDocs;

            transaction.update(userRef, cleanFirestorePayload({
              purchasedDocIds: updatedPurchasedDocs,
              ordersCount: (userData.ordersCount || 0) + 1,
              updatedAt: nowIso
            }));

            if (userProfileRef && userProfileSnapshot && userProfileSnapshot.exists()) {
              transaction.update(userProfileRef, cleanFirestorePayload({
                purchasedDocIds: updatedPurchasedDocs,
                updatedAt: nowIso
              }));
            }
          } else if (isSubscription) {
            // PASS VIP: Activate VIP subscription
            updatedBalance = currentBalance;
            const days = (txData as any).planId === 'weekly' ? 7 : (txData as any).planId === 'annual' ? 365 : 30;
            const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
            const subscriptionPayload = cleanFirestorePayload({
              planId: (txData as any).planId || 'VIP',
              planName: (txData as any).planTitle || 'Pass VIP Dokya',
              status: 'ACTIVE',
              startedAt: nowIso,
              expiresAt,
              pricePaid: targetAmount,
              adminValidationNote: note
            });

            transaction.update(userRef, cleanFirestorePayload({
              subscription: subscriptionPayload,
              subscriptionStatus: 'unlimited',
              ordersCount: (userData.ordersCount || 0) + 1,
              updatedAt: nowIso
            }));

            if (userProfileRef && userProfileSnapshot && userProfileSnapshot.exists()) {
              transaction.update(userProfileRef, cleanFirestorePayload({
                subscription: subscriptionPayload,
                subscriptionStatus: 'unlimited',
                updatedAt: nowIso
              }));
            }
          } else {
            // WALLET RECHARGE: Credit user balance
            updatedBalance = currentBalance + targetAmount;
            transaction.update(userRef, cleanFirestorePayload({
              walletBalance: updatedBalance,
              balance: updatedBalance,
              currency: 'FCFA',
              ordersCount: (userData.ordersCount || 0) + 1,
              updatedAt: nowIso
            }));

            if (userProfileRef && userProfileSnapshot && userProfileSnapshot.exists()) {
              transaction.update(userProfileRef, cleanFirestorePayload({
                walletBalance: updatedBalance,
                balance: updatedBalance,
                currency: 'FCFA',
                updatedAt: nowIso
              }));
            }
          }
        } else if (targetUserId && targetUserId !== 'guest') {
          updatedBalance = isRecharge ? targetAmount : 0;
          const initialUserObj = cleanFirestorePayload({
            uid: targetUserId,
            email: txData.userEmail || '',
            displayName: txData.userName || 'Candidat',
            walletBalance: updatedBalance,
            balance: updatedBalance,
            currency: 'FCFA',
            purchasedDocIds: targetDocId ? [targetDocId] : [],
            subscription: isSubscription ? {
              planId: (txData as any).planId || 'VIP',
              planName: (txData as any).planTitle || 'Pass VIP Dokya',
              status: 'ACTIVE',
              startedAt: nowIso,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              pricePaid: targetAmount,
              adminValidationNote: note
            } : {
              planId: 'FREE',
              status: 'INACTIVE',
              expiresAt: null,
              startedAt: null
            },
            ordersCount: 1,
            createdAt: nowIso,
            updatedAt: nowIso,
            role: 'candidate'
          });

          transaction.set(userRef, initialUserObj);

          if (userProfileRef) {
            transaction.set(userProfileRef, initialUserObj, { merge: true });
          }
        }
      }

      return {
        success: true,
        message: isDirectPurchase
          ? `Achat direct pour "${txData.documentTitle || targetDocId || 'le document'}" validé ! Le document est débloqué.`
          : isSubscription
            ? `Pass VIP validé avec succès pour ${(txData as any).planTitle || 'le candidat'} !`
            : `Recharge de ${targetAmount.toLocaleString('fr-FR')} FCFA validée avec succès !`,
        newBalance: updatedBalance
      };
    });

    // Also notify backend store
    fetch(`/api/admin/transactions/${encodeURIComponent(rawTxId)}/validate`, {
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
  txInput: string | TransactionRecord,
  adminEmail: string,
  reason: string = 'Rejet confirmé par l\'administrateur'
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const rawTxId = typeof txInput === 'string' ? txInput : (txInput.id || (txInput as any).transactionId || `TX-${Date.now()}`);
    let targetDocRef = doc(db, 'transactions', rawTxId);
    let resolvedDocSnap = await getDoc(targetDocRef);

    if (!resolvedDocSnap.exists()) {
      try {
        const qId = query(collection(db, 'transactions'), where('id', '==', rawTxId));
        const snapId = await getDocs(qId);
        if (!snapId.empty) {
          targetDocRef = doc(db, 'transactions', snapId.docs[0].id);
          resolvedDocSnap = snapId.docs[0];
        }
      } catch (_lookupErr) {}
    }

    const nowIso = new Date().toISOString();

    if (resolvedDocSnap.exists()) {
      await updateDoc(targetDocRef, cleanFirestorePayload({
        status: 'REJECTED',
        aiStatus: 'REJECTED_BY_ADMIN',
        rejectionReason: reason,
        rejectedBy: adminEmail,
        rejectedAt: nowIso,
        updatedAt: nowIso
      }));
    } else {
      const fallbackObj: Partial<TransactionRecord> = typeof txInput === 'object' ? txInput : {
        id: rawTxId,
        userId: 'guest',
        amount: 0,
        description: `Transaction ${rawTxId}`
      };
      await setDoc(targetDocRef, cleanFirestorePayload({
        ...fallbackObj,
        id: rawTxId,
        status: 'REJECTED',
        aiStatus: 'REJECTED_BY_ADMIN',
        rejectionReason: reason,
        rejectedBy: adminEmail,
        rejectedAt: nowIso,
        updatedAt: nowIso
      }), { merge: true });
    }

    // Sync to backend store
    fetch(`/api/admin/transactions/${encodeURIComponent(rawTxId)}/reject`, {
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
      message: `Rejet de la transaction ${rawTxId} enregistré avec succès.`
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
