import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, User as FirebaseUser } from 'firebase/auth';
import { 
  initializeFirestore, doc, getDoc, getDocFromServer, setDoc, updateDoc, deleteDoc, 
  collection, query, where, getDocs, onSnapshot, Unsubscribe, runTransaction,
  serverTimestamp, writeBatch, increment, Timestamp, addDoc, orderBy, limit
} from 'firebase/firestore';
import { getStorage, ref as storageRef, deleteObject, listAll, getMetadata } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  CandidateProfile, SavedUserDocument, TransactionRecord, GenerationMode, 
  CVFormData, AIOptimizedData, PlatformPricingConfig, PromoCode,
  UserSubscription, isUserVipActive, getTimestampMillis, formatRemainingSubscriptionTime, AdminUserRecord,
  Customer, BusinessInvoice, UserBusiness, BusinessDocData, BusinessDocItem, Product,
  AffiliateCommission, AffiliatePayoutRequest,
  SupportMessage, SupportConversation, SupportConversationStatus, SupportSenderType,
  UserReferralItem, DokyaNotification
} from '../types';
import { getStoredReferralCode, clearStoredReferralCode } from './referralTracking';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app, firebaseConfig.storageBucket);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

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
    planId: string; // "PASS_VIP" | "FREE" | "weekly" | "monthly" | "annual"
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'active' | 'expired' | 'none';
    activatedAt?: any;
    expiresAt?: any;
    autoRenew?: boolean;
    startedAt?: any;
    adminNote?: string;
    updatedBy?: string;
  };
  createdAt: string;
  updatedAt: string;
  personalInfo?: any;
  role?: 'admin' | 'candidate';
  phone?: string;
  phoneNumber?: string;
  referralCode?: string;
  referredBy?: string;
  affiliateCodeUsed?: string;
  referredAt?: string;
  referrerName?: string;
  affiliateBalance?: number;
  totalAffiliateEarnings?: number;
  totalReferred?: number;
  purchasedDocIds?: string[];
  isVip?: boolean;
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
  // Preserve Date, Timestamp, FieldValue (serverTimestamp, increment, etc.)
  if (
    obj instanceof Date ||
    obj instanceof Timestamp ||
    (obj as any)?._delegate ||
    (obj as any)?._methodName ||
    (obj as any)?.constructor?.name === 'FieldValue' ||
    (obj as any)?.constructor?.name === 'Timestamp'
  ) {
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

export function generateUserReferralCode(email: string, displayName?: string, firstName?: string): string {
  let cleanName = '';
  if (firstName && firstName.trim()) {
    cleanName = firstName.trim();
  } else if (displayName && displayName.trim()) {
    cleanName = displayName.trim().split(' ')[0];
  } else if (email) {
    const local = email.split('@')[0];
    const lettersOnly = local.match(/^[a-zA-Z]+/);
    cleanName = lettersOnly && lettersOnly[0] ? lettersOnly[0] : local;
  }

  // Normalize: remove accents and non-alphanumeric chars
  cleanName = cleanName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  if (cleanName.startsWith('PETER')) return 'PETER';
  if (!cleanName || cleanName === 'DOKYA') {
    return 'VIP';
  }
  return cleanName;
}

export async function saveTransactionRecord(tx: TransactionRecord): Promise<boolean> {
  try {
    const txDocRef = doc(db, 'transactions', tx.id);
    await setDoc(txDocRef, cleanFirestorePayload({
      ...tx,
      updatedAt: new Date().toISOString()
    }), { merge: true });

    // Détection et calcul automatique de commission d'affiliation (20% affilié / 80% admin)
    if (tx.status === 'PENDING' && tx.userId && (tx.amount > 0 || (tx as any).totalAmount > 0)) {
      const amount = tx.amount || (tx as any).totalAmount || 0;
      createAffiliateCommissionIfReferred({
        userId: tx.userId,
        userDisplayName: tx.userEmail || tx.senderPhone || 'Client',
        transactionId: tx.id,
        totalAmount: amount,
        serviceTitle: tx.documentTitle || (tx as any).planName || (tx.type === 'recharge' ? 'Recharge de solde' : 'Achat Dokya')
      }).catch(err => console.warn('[Affiliate Commission Creation Error]:', err));
    }

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
  extra?: { 
    displayName?: string; 
    phone?: string; 
    phoneNumber?: string; 
    country?: string; 
    residenceCountry?: string; 
    currency?: string; 
  }
): Promise<FirebaseUserProfile> {
  const userRef = doc(db, 'users', user.uid);
  try {
    // Lookup pending referral code from storage / cookie
    let pendingRefBy: string | null = null;
    let pendingRefCode: string | null = null;
    let pendingReferrerName: string | null = null;

    try {
      const storedRefCode = getStoredReferralCode();
      if (storedRefCode) {
        pendingRefCode = storedRefCode;
        const qRef = query(collection(db, 'users'), where('referralCode', '==', storedRefCode));
        const snapRef = await getDocs(qRef);
        if (!snapRef.empty && snapRef.docs[0].id !== user.uid) {
          const referrerDoc = snapRef.docs[0];
          pendingRefBy = referrerDoc.id;
          const rData = referrerDoc.data();
          pendingReferrerName = rData.displayName || rData.personalInfo?.firstName || rData.email?.split('@')[0] || 'Parrain Dokya';
        }
      }
    } catch (e) {
      console.warn('[Referral code check error]:', e);
    }

    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const nowIso = new Date().toISOString();
      const generatedCode = generateUserReferralCode(user.email || '', extra?.displayName || user.displayName || '');
      const initialProfile: FirebaseUserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: extra?.displayName || user.displayName || user.email?.split('@')[0] || 'Candidat',
        photoURL: user.photoURL || '',
        walletBalance: 0,
        currency: extra?.currency || 'FCFA',
        subscription: {
          planId: 'FREE',
          status: 'INACTIVE',
          activatedAt: null,
          expiresAt: null,
          autoRenew: false
        },
        referralCode: generatedCode,
        referredBy: pendingRefBy || undefined,
        affiliateCodeUsed: pendingRefCode || undefined,
        referredAt: pendingRefBy ? nowIso : undefined,
        referrerName: pendingReferrerName || undefined,
        affiliateBalance: 0,
        totalAffiliateEarnings: 0,
        totalReferred: 0,
        phone: extra?.phone || extra?.phoneNumber || '',
        phoneNumber: extra?.phone || extra?.phoneNumber || '',
        createdAt: nowIso,
        updatedAt: nowIso,
        role: user.email === 'peter25ngouala@gmail.com' ? 'admin' : 'candidate'
      };
      if (extra?.country || extra?.residenceCountry) {
        (initialProfile as any).country = extra.country || extra.residenceCountry;
        (initialProfile as any).residenceCountry = extra.country || extra.residenceCountry;
      }
      await setDoc(userRef, initialProfile, { merge: true });

      // Si l'utilisateur est parrainé, mettre à jour le parrain et enregistrer dans son sous-ensemble
      if (pendingRefBy) {
        // 1. Incrémenter atomiquement totalReferred chez le parrain
        try {
          const referrerRef = doc(db, 'users', pendingRefBy);
          await updateDoc(referrerRef, {
            totalReferred: increment(1),
            updatedAt: nowIso
          });
        } catch (errRef) {
          console.warn('[Increment referrer totalReferred warn]:', errRef);
        }

        // 2. Créer l'entrée dans le sous-ensemble users/{referrerId}/referrals/{newUserId}
        try {
          const referralSubDocRef = doc(db, 'users', pendingRefBy, 'referrals', user.uid);
          await setDoc(referralSubDocRef, cleanFirestorePayload({
            id: user.uid,
            referredUserId: user.uid,
            referredName: extra?.displayName || user.displayName || user.email?.split('@')[0] || 'Candidat Dokya',
            referredEmail: user.email || '',
            affiliateCodeUsed: pendingRefCode || '',
            joinedAt: nowIso,
            conversionStatus: 'registered',
            totalSpent: 0,
            commissionEarned: 0
          }), { merge: true });
        } catch (errSub) {
          console.warn('[Create referral subdoc warn]:', errSub);
        }

        // 3. Vider le code stocké après attribution réussie
        clearStoredReferralCode();
      }

      return initialProfile;
    }
    const data = snap.data();

    // Ensure existing user has a referralCode, affiliateBalance, and totalAffiliateEarnings
    let userReferralCode = data.referralCode;
    if (!userReferralCode) {
      userReferralCode = generateUserReferralCode(data.email || user.email || '', data.displayName || user.displayName || '');
      updateDoc(userRef, {
        referralCode: userReferralCode,
        affiliateBalance: data.affiliateBalance ?? 0,
        totalAffiliateEarnings: data.totalAffiliateEarnings ?? 0,
        updatedAt: new Date().toISOString()
      }).catch(() => {});
    }

    let calculatedStatus: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' = 'INACTIVE';
    const rawStatus = (data.subscription?.status || '').toUpperCase();
    const rawPlanId = data.subscription?.planId || (data.subscriptionStatus === 'unlimited' ? 'PASS_VIP' : 'FREE');

    if (rawStatus === 'ACTIVE') {
      const expiresMillis = getTimestampMillis(data.subscription?.expiresAt);
      if (expiresMillis === null) {
        calculatedStatus = 'ACTIVE';
      } else if (expiresMillis > Date.now()) {
        calculatedStatus = 'ACTIVE';
      } else {
        calculatedStatus = 'EXPIRED';
        updateDoc(userRef, {
          'subscription.status': 'EXPIRED',
          subscriptionStatus: 'free',
          updatedAt: new Date().toISOString()
        }).catch(err => console.warn('[Auto-expire subscription warn]:', err));
      }
    } else if (rawStatus === 'EXPIRED') {
      calculatedStatus = 'EXPIRED';
    } else {
      calculatedStatus = 'INACTIVE';
    }

    return {
      uid: user.uid,
      email: data.email || user.email || '',
      displayName: data.displayName || extra?.displayName || user.displayName || 'Candidat',
      photoURL: data.photoURL || user.photoURL || '',
      walletBalance: typeof data.walletBalance === 'number' ? data.walletBalance : (typeof data.balance === 'number' ? data.balance : 0),
      currency: data.currency || 'FCFA',
      subscription: {
        planId: rawPlanId,
        status: calculatedStatus,
        activatedAt: data.subscription?.activatedAt || data.subscription?.startedAt || null,
        expiresAt: data.subscription?.expiresAt || null,
        autoRenew: data.subscription?.autoRenew ?? false,
        adminNote: data.subscription?.adminNote,
        updatedBy: data.subscription?.updatedBy
      },
      referralCode: userReferralCode,
      referredBy: data.referredBy,
      affiliateBalance: typeof data.affiliateBalance === 'number' ? data.affiliateBalance : 0,
      totalAffiliateEarnings: typeof data.totalAffiliateEarnings === 'number' ? data.totalAffiliateEarnings : 0,
      phone: data.phone || data.phoneNumber || data.personalInfo?.phone || '',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      personalInfo: data.personalInfo || undefined,
      role: data.role || (data.email === 'peter25ngouala@gmail.com' ? 'admin' : 'candidate')
    };
  } catch (err) {
    console.warn('[Initialize User Doc Warn]:', err);
    return {
      uid: user.uid,
      email: user.email || '',
      displayName: extra?.displayName || user.displayName || 'Candidat',
      walletBalance: 0,
      currency: 'FCFA',
      subscription: { planId: 'FREE', status: 'INACTIVE', activatedAt: null, expiresAt: null, autoRenew: false },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: user.email === 'peter25ngouala@gmail.com' ? 'admin' : 'candidate'
    };
  }
}

/**
 * Real-time listener for user profile from Firestore collection 'users/{userId}'
 * Automatically checks expiresAt against Date.now() and updates status accordingly.
 */
export function subscribeToUserProfile(
  userId: string,
  onUpdate: (userDoc: FirebaseUserProfile) => void
): Unsubscribe {
  if (!userId || userId === 'guest' || userId.startsWith('guest') || userId === 'guest-user') {
    return () => {};
  }
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, async (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      let calculatedStatus: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' = 'INACTIVE';
      const rawStatus = (data.subscription?.status || '').toUpperCase();
      const rawPlanId = data.subscription?.planId || (data.subscriptionStatus === 'unlimited' ? 'PASS_VIP' : 'FREE');

      if (rawStatus === 'ACTIVE') {
        const expiresMillis = getTimestampMillis(data.subscription?.expiresAt);
        if (expiresMillis === null) {
          calculatedStatus = 'ACTIVE';
        } else if (expiresMillis > Date.now()) {
          calculatedStatus = 'ACTIVE';
        } else {
          // EXPIRED: automatically update status in Firestore and revert to free mode
          calculatedStatus = 'EXPIRED';
          updateDoc(userRef, {
            'subscription.status': 'EXPIRED',
            subscriptionStatus: 'free',
            updatedAt: new Date().toISOString()
          }).catch(err => console.warn('[Auto-expire subscription warn]:', err));
        }
      } else if (rawStatus === 'EXPIRED') {
        calculatedStatus = 'EXPIRED';
      } else {
        calculatedStatus = 'INACTIVE';
      }

      const profile: FirebaseUserProfile = {
        uid: userId,
        email: data.email || auth.currentUser?.email || '',
        displayName: data.displayName || auth.currentUser?.displayName || 'Candidat',
        photoURL: data.photoURL || auth.currentUser?.photoURL || '',
        walletBalance: typeof data.walletBalance === 'number' ? data.walletBalance : (typeof data.balance === 'number' ? data.balance : 0),
        currency: data.currency || 'FCFA',
        subscription: {
          planId: rawPlanId,
          status: calculatedStatus,
          activatedAt: data.subscription?.activatedAt || data.subscription?.startedAt || null,
          expiresAt: data.subscription?.expiresAt || null,
          autoRenew: data.subscription?.autoRenew ?? false,
          adminNote: data.subscription?.adminNote,
          updatedBy: data.subscription?.updatedBy
        },
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        purchasedDocIds: Array.isArray(data.purchasedDocIds) ? data.purchasedDocIds : [],
        isVip: Boolean(data.isVip || calculatedStatus === 'ACTIVE'),
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
          activatedAt: null,
          expiresAt: null,
          autoRenew: false
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
 * Force refetch user data directly from Firestore server bypassing client cache
 */
export async function fetchUserData(userId: string): Promise<FirebaseUserProfile | null> {
  if (!userId || userId === 'guest' || userId.startsWith('guest')) {
    return null;
  }
  try {
    const userRef = doc(db, 'users', userId);
    let snapshot;
    try {
      snapshot = await getDocFromServer(userRef);
    } catch (_e) {
      snapshot = await getDoc(userRef);
    }
    if (snapshot.exists()) {
      const data = snapshot.data();
      const rawStatus = (data.subscription?.status || '').toUpperCase();
      const rawPlanId = data.subscription?.planId || (data.subscriptionStatus === 'unlimited' ? 'PASS_VIP' : 'FREE');
      
      let calculatedStatus: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' = 'INACTIVE';
      if (rawStatus === 'ACTIVE' || data.isVip || data.subscriptionStatus === 'ACTIVE') {
        const expiresMillis = getTimestampMillis(data.subscription?.expiresAt);
        if (expiresMillis === null || expiresMillis > Date.now()) {
          calculatedStatus = 'ACTIVE';
        } else {
          calculatedStatus = 'EXPIRED';
        }
      }

      const profile: FirebaseUserProfile = {
        uid: userId,
        email: data.email || auth.currentUser?.email || '',
        displayName: data.displayName || auth.currentUser?.displayName || 'Candidat',
        photoURL: data.photoURL || auth.currentUser?.photoURL || '',
        walletBalance: typeof data.walletBalance === 'number' ? data.walletBalance : (typeof data.balance === 'number' ? data.balance : (typeof data.solde === 'number' ? data.solde : 0)),
        currency: data.currency || 'FCFA',
        subscription: {
          planId: rawPlanId,
          status: calculatedStatus,
          activatedAt: data.subscription?.activatedAt || data.subscription?.startedAt || null,
          expiresAt: data.subscription?.expiresAt || null,
          autoRenew: data.subscription?.autoRenew ?? false,
          adminNote: data.subscription?.adminNote,
          updatedBy: data.subscription?.updatedBy
        },
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        purchasedDocIds: Array.isArray(data.purchasedDocIds) ? data.purchasedDocIds : [],
        isVip: Boolean(data.isVip || calculatedStatus === 'ACTIVE'),
        personalInfo: data.personalInfo || undefined,
        role: data.role || (data.email === 'peter25ngouala@gmail.com' ? 'admin' : 'candidate')
      };

      try {
        localStorage.setItem(getLocalProfileKey(userId), JSON.stringify(profile));
      } catch (_e) {}

      return profile;
    }
  } catch (err) {
    console.warn('[fetchUserData error]:', err);
  }
  return null;
}

export const refetchProfile = fetchUserData;

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

// User-scoped Local Storage Key Helpers (Strict Data Isolation per User)
export const getLocalDocumentsKey = (uid?: string) => `dokya_saved_docs_${uid || auth.currentUser?.uid || 'guest'}`;
export const getLocalProfileKey = (uid?: string) => `dokya_user_profile_${uid || auth.currentUser?.uid || 'guest'}`;
export const getLocalTransactionsKey = (uid?: string) => `dokya_transactions_${uid || auth.currentUser?.uid || 'guest'}`;

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

/**
 * Abonnement en temps réel aux documents d'un utilisateur spécifique.
 * Garantit l'isolation stricte : un utilisateur ne reçoit JAMAIS les documents d'un autre.
 */
export function subscribeToUserDocuments(
  userId: string,
  onUpdate: (docs: SavedUserDocument[]) => void
): () => void {
  if (!userId || userId === 'guest') {
    onUpdate([]);
    return () => {};
  }
  try {
    const q = query(collection(db, 'user_documents'), where('userId', '==', userId));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs: SavedUserDocument[] = [];
      snapshot.forEach((d) => {
        docs.push(d.data() as SavedUserDocument);
      });
      docs.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      
      try {
        localStorage.setItem(getLocalDocumentsKey(userId), JSON.stringify(docs));
      } catch (_e) {}

      onUpdate(docs);
    }, (err) => {
      console.warn('[subscribeToUserDocuments warn]:', err);
    });
    return unsub;
  } catch (e) {
    console.warn('[subscribeToUserDocuments init warn]:', e);
    return () => {};
  }
}

export async function saveUserDocument(userDoc: SavedUserDocument): Promise<boolean> {
  if (!auth.currentUser) {
    // For unauthenticated guest sessions, document is saved in local storage
    return true;
  }

  // Optimisation du stockage : nettoyer les photos ou données binaires volumineuses (>50KB)
  // pour conserver une structure texte minimale et ultra-légère dans Firestore
  const sanitizedDoc = { ...userDoc };
  const pInfo = sanitizedDoc.formData?.personalInfo as any;
  if (pInfo) {
    const rawPhoto = pInfo.photoUrl || pInfo.photo;
    if (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.length > 50000) {
      sanitizedDoc.formData = {
        ...sanitizedDoc.formData,
        personalInfo: {
          ...pInfo,
          photoUrl: '' // Conservé localement dans la session utilisateur, omis du document cloud lourd
        }
      };
    }
  }

  const cleanDoc = cleanFirestorePayload({
    ...sanitizedDoc,
    userId: auth.currentUser.uid,
    updatedAt: new Date().toISOString()
  });
  const path = `user_documents/${cleanDoc.id}`;
  try {
    const docRef = doc(db, 'user_documents', cleanDoc.id);
    await setDoc(docRef, cleanDoc);
    const rootDocRef = doc(db, 'documents', cleanDoc.id);
    await setDoc(rootDocRef, cleanDoc, { merge: true }).catch(() => {});
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
    // Sync to user-scoped local storage history for instant offline reactivity
    const storageKey = getLocalDocumentsKey(currentUid);
    const savedDocsList = localStorage.getItem(storageKey);
    let docs: any[] = [];
    if (savedDocsList) {
      try { docs = JSON.parse(savedDocsList); } catch (e) {}
    }
    docs.unshift(userDoc);
    localStorage.setItem(storageKey, JSON.stringify(docs));
  } catch (e) {
    console.warn('Could not sync document metadata to localStorage:', e);
  }

  try {
    const docRef = doc(db, 'user_documents', docId);
    await setDoc(docRef, cleanFirestorePayload(userDoc));
    const rootDocRef = doc(db, 'documents', docId);
    await setDoc(rootDocRef, cleanFirestorePayload(userDoc), { merge: true }).catch(() => {});
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
  const currentUid = auth.currentUser.uid;
  const path = `user_documents/${docId}`;
  try {
    const docRef = doc(db, 'user_documents', docId);
    await deleteDoc(docRef);
    const rootDocRef = doc(db, 'documents', docId);
    await deleteDoc(rootDocRef).catch(() => {});

    // Sync user-scoped local cache
    try {
      const storageKey = getLocalDocumentsKey(currentUid);
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const list = JSON.parse(raw);
        const filtered = list.filter((d: any) => d.id !== docId);
        localStorage.setItem(storageKey, JSON.stringify(filtered));
      }
    } catch (_e) {}

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
    // Compléter avec la collection 'payments' si présente
    try {
      const qPay = query(collection(db, 'payments'));
      const snapPay = await getDocs(qPay);
      snapPay.forEach((d) => {
        if (!transactions.some(t => t.id === d.id)) {
          transactions.push({ id: d.id, ...(d.data() as any) } as TransactionRecord);
        }
      });
    } catch (_e) {}

    return transactions.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
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
 * Real-time listener STRICTEMENT limité aux 20 dernières transactions en attente (PENDING)
 * Utilisé pour détecter immédiatement les nouveaux paiements et reçus soumis sans surcharger Firestore.
 */
export function subscribeToPendingTransactions(
  onUpdate: (pendingTxs: TransactionRecord[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const colRef = collection(db, 'transactions');
  const q = query(
    colRef,
    where('status', 'in', ['PENDING', 'WAITING_FOR_ADMIN', 'WAITING_VALIDATION', 'PENDING_APPROVAL']),
    limit(20)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: TransactionRecord[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) } as TransactionRecord);
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn('[Firestore Pending Transactions Snapshot Warn]:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener pour les transactions avec une limite stricte de 20 (ordering by date desc)
 */
export function subscribeToAllTransactions(
  onUpdate: (txs: TransactionRecord[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const colRef = collection(db, 'transactions');
  const q = query(colRef, limit(100));
  return onSnapshot(
    q,
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
 * PURGE AUTOMATIQUE DES REÇUS DE PAIEMENT (24 HEURES)
 * 
 * Pour les transactions validées ou rejetées par l'Admin (status == "APPROVED" ou "REJECTED") :
 * - Supprime le fichier de capture du reçu dans Firebase Storage ('payment_proofs/') 24h après validation/rejet.
 * - Dans le document Firestore de la transaction, remplace 'receiptUrl' par "PURGED" pour libérer la mémoire,
 *   tout en conservant la ligne de texte pour l'historique comptable.
 */
export async function purgeExpiredPaymentReceipts(
  transactionsToInspect?: TransactionRecord[]
): Promise<{ purgedCount: number; errorsCount: number }> {
  let purgedCount = 0;
  let errorsCount = 0;
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();

  try {
    let list = transactionsToInspect;
    if (!list || list.length === 0) {
      list = await fetchAllFirestoreTransactions();
    }

    // Filtrer les transactions terminées (validées ou rejetées) datant de plus de 24 heures avec un reçu actif
    const candidates = list.filter((tx) => {
      const isTerminal = 
        tx.status === 'APPROVED' || 
        tx.status === 'MANUALLY_VALIDATED' || 
        tx.status === 'VALIDATED_BY_AI' || 
        tx.status === 'success' || 
        tx.status === 'COMPLETED' ||
        tx.status === 'REJECTED' || 
        tx.status === 'REJECTED_BY_ADMIN' || 
        tx.status === 'REJECTED_BY_AI' || 
        tx.status === 'failed' || 
        tx.status === 'cancel';

      if (!isTerminal) return false;

      // Possède encore une image ou URL de reçu non purgée
      const isPurged = tx.receiptUrl === 'PURGED' || tx.receiptUrl === 'Purger' || tx.receiptPurged;
      const hasActiveReceipt = 
        !isPurged && (
          (Boolean(tx.receiptUrl) && tx.receiptUrl !== 'null') || 
          Boolean(tx.receiptImage)
        );
      if (!hasActiveReceipt) return false;

      // Déterminer la date de décision (validation, rejet ou mise à jour)
      const decisionTime = 
        (tx as any).approvedAt || 
        (tx as any).manuallyValidatedAt || 
        (tx as any).rejectedAt || 
        (tx as any).updatedAt || 
        tx.createdAt;
      if (!decisionTime) return false;

      const decisionMillis = new Date(decisionTime).getTime();
      return !isNaN(decisionMillis) && (now - decisionMillis > TWENTY_FOUR_HOURS_MS);
    });

    for (const tx of candidates) {
      try {
        const txDocId = tx.id || (tx as any).transactionId;
        if (!txDocId) continue;

        // 1. Si le reçu est stocké dans Firebase Storage ('payment_proofs/'), supprimer le fichier
        const receiptRefOrUrl = tx.receiptUrl || tx.receiptImage || '';
        if (receiptRefOrUrl.includes('payment_proofs/') || receiptRefOrUrl.includes('firebasestorage')) {
          try {
            let pathInStorage = '';
            if (receiptRefOrUrl.includes('/o/')) {
              const encoded = receiptRefOrUrl.split('/o/')[1]?.split('?')[0];
              if (encoded) pathInStorage = decodeURIComponent(encoded);
            } else if (receiptRefOrUrl.startsWith('payment_proofs/')) {
              pathInStorage = receiptRefOrUrl;
            }
            if (pathInStorage) {
              const fileRef = storageRef(storage, pathInStorage);
              await deleteObject(fileRef).catch(() => {});
            }
          } catch (_delErr) {
            // Ignorer silencieusement si déjà supprimé
          }
        }

        // 2. Mettre à jour Firestore : passer receiptUrl à "PURGED", receiptImage à null
        // La ligne comptable (id, montant, date, expéditeur, statut) est préservée 100%
        const txRef = doc(db, 'transactions', txDocId);
        await updateDoc(txRef, {
          receiptUrl: 'PURGED',
          receiptImage: null,
          receiptPurged: true,
          receiptPurgedAt: new Date().toISOString()
        });

        purgedCount++;
      } catch (itemErr) {
        console.warn(`[Purge Tx ${tx.id} Warn]:`, itemErr);
        errorsCount++;
      }
    }

    // 3. Scanner également le dossier 'payment_proofs/' dans Firebase Storage pour purger les fichiers orphelins de plus de 24h
    try {
      const folderRef = storageRef(storage, 'payment_proofs');
      const listRes = await listAll(folderRef);
      for (const item of listRes.items) {
        try {
          const meta = await getMetadata(item);
          if (meta.timeCreated) {
            const createdMillis = new Date(meta.timeCreated).getTime();
            if (now - createdMillis > TWENTY_FOUR_HOURS_MS) {
              await deleteObject(item);
              purgedCount++;
            }
          }
        } catch (_metaErr) {}
      }
    } catch (_listErr) {
      // Dossier payment_proofs inexistant ou non provisionné, sans impact
    }

  } catch (globalErr) {
    console.warn('[purgeExpiredPaymentReceipts Warn]:', globalErr);
  }

  return { purgedCount, errorsCount };
}

/**
 * PURGE AUTOMATIQUE DES FICHIERS PDF TEMPORAIRES (24 HEURES)
 * 
 * Supprime automatiquement les fichiers PDF et documents temporaires stockés dans Firebase Storage après 24 heures
 * pour éviter d'encombrer le serveur et la mémoire cloud.
 */
export async function purgeExpiredTemporaryStorageFiles(): Promise<{ purgedFilesCount: number }> {
  let purgedFilesCount = 0;
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const tempFolders = ['temp_pdfs', 'temp_documents', 'generated_pdfs', 'interview_prep_pdfs', 'user_pdfs'];

  for (const folder of tempFolders) {
    try {
      const folderRef = storageRef(storage, folder);
      const listRes = await listAll(folderRef);
      for (const item of listRes.items) {
        try {
          const meta = await getMetadata(item);
          if (meta.timeCreated) {
            const createdMillis = new Date(meta.timeCreated).getTime();
            if (now - createdMillis > TWENTY_FOUR_HOURS_MS) {
              await deleteObject(item);
              purgedFilesCount++;
            }
          }
        } catch (_metaErr) {
          // Déjà supprimé
        }
      }
    } catch (_folderErr) {
      // Dossier inexistant ou vide
    }
  }

  // Nettoyage des caches locaux de prévisualisations PDF temporaires expirés
  try {
    const keysToClean = ['dokya_temp_pdf_cache', 'dokya_temp_preview_blob'];
    for (const k of keysToClean) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.timestamp && (now - Number(parsed.timestamp) > TWENTY_FOUR_HOURS_MS)) {
            localStorage.removeItem(k);
          }
        } catch (_e) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch (_localErr) {}

  return { purgedFilesCount };
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

    // Pre-resolve target user document ID to guarantee userId points directly to users/{userId}
    let preResolvedUserId = typeof txInput === 'object' ? (txInput.userId || '') : '';
    let lookupEmail = typeof txInput === 'object' ? (txInput.userEmail || '') : '';

    if (resolvedDocSnap.exists()) {
      const snapData = resolvedDocSnap.data();
      if (!preResolvedUserId || preResolvedUserId === 'guest') {
        preResolvedUserId = snapData.userId || '';
      }
      if (!lookupEmail) {
        lookupEmail = snapData.userEmail || '';
      }
    }

    if ((!preResolvedUserId || preResolvedUserId === 'guest') && lookupEmail) {
      try {
        const uQ = query(collection(db, 'users'), where('email', '==', lookupEmail));
        const uSnap = await getDocs(uQ);
        if (!uSnap.empty) {
          preResolvedUserId = uSnap.docs[0].id;
        }
      } catch (_e) {}
    }

    // 3. Run atomic transaction on Firestore
    const result = await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const txDoc = await transaction.get(targetDocRef);
      if (!txDoc.exists()) {
        throw new Error(`Transaction ${rawTxId} introuvable dans Firestore après synchronisation.`);
      }

      const txData = txDoc.data() as TransactionRecord;
      let targetUserId = txData.userId;
      if ((!targetUserId || targetUserId === 'guest') && preResolvedUserId && preResolvedUserId !== 'guest') {
        targetUserId = preResolvedUserId;
      }
      const txTypeUpper = (txData.type || '').toUpperCase();
      const isDirectPurchase = txTypeUpper === 'DIRECT_PURCHASE' || txTypeUpper === 'DOCUMENT_PURCHASE' || (txData as any).purpose === 'document_purchase' || (txData as any).purpose === 'document_unlock';
      const isSubscription = txTypeUpper === 'SUBSCRIPTION_PURCHASE' || txTypeUpper === 'PASS_VIP' || txTypeUpper === 'VIP_PASS' || txTypeUpper === 'SUBSCRIPTION' || (txData as any).purpose === 'subscription_purchase' || (txData as any).purpose === 'pass_vip';
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

      // Calculate subscription parameters (30 or 365 days)
      let days = 30;
      if (txData.durationDays && typeof txData.durationDays === 'number' && txData.durationDays > 0) {
        days = txData.durationDays;
      } else if ((txData as any).planId === 'annual' || (txData as any).billingPeriod === 'year' || targetAmount >= 15000) {
        days = 365;
      } else if ((txData as any).planId === 'weekly') {
        days = 7;
      } else {
        days = 30;
      }
      const targetExpiresDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // Exact subscription structure mandated by user specifications
      const subscriptionPayload = {
        planId: "PASS_VIP",
        status: "ACTIVE",
        activatedAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(targetExpiresDate),
        autoRenew: false,
        durationDays: days,
        planName: (txData as any).planTitle || (days >= 365 ? 'Pass VIP Annuel Dokya' : days <= 7 ? 'Pass VIP Hebdo Dokya' : 'Pass VIP Dokya'),
        startedAt: nowIso,
        pricePaid: targetAmount,
        adminValidationNote: note,
        updatedBy: adminEmail
      };

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
            // PASS VIP: Activate VIP subscription with exact mandated structure
            updatedBalance = currentBalance;

            transaction.update(userRef, {
              subscription: subscriptionPayload,
              subscriptionStatus: 'unlimited',
              ordersCount: (userData.ordersCount || 0) + 1,
              updatedAt: nowIso
            });

            if (userProfileRef && userProfileSnapshot && userProfileSnapshot.exists()) {
              transaction.update(userProfileRef, {
                subscription: subscriptionPayload,
                subscriptionStatus: 'unlimited',
                updatedAt: nowIso
              });
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
          const initialUserObj = {
            uid: targetUserId,
            email: txData.userEmail || '',
            displayName: txData.userName || 'Candidat',
            walletBalance: updatedBalance,
            balance: updatedBalance,
            currency: 'FCFA',
            purchasedDocIds: targetDocId ? [targetDocId] : [],
            subscription: isSubscription ? subscriptionPayload : {
              planId: 'FREE',
              status: 'INACTIVE',
              activatedAt: null,
              expiresAt: null,
              autoRenew: false
            },
            subscriptionStatus: isSubscription ? 'unlimited' : 'free',
            ordersCount: 1,
            createdAt: nowIso,
            updatedAt: nowIso,
            role: 'candidate'
          };

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
          planId: 'PASS_VIP',
          planName: planId === 'annual' ? 'Pass VIP Annuel' : (planId === 'weekly' ? 'Pass VIP Semaine' : 'Pass VIP Mensuel'),
          status: 'ACTIVE',
          activatedAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(new Date(now.getTime() + days * 24 * 60 * 60 * 1000)),
          autoRenew: false,
          startedAt: now.toISOString(),
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
        type: 'SUBSCRIPTION_PURCHASE',
        planId: 'PASS_VIP',
        durationDays: days,
        amount: -price,
        expectedAmount: price,
        extractedAmount: price,
        currency: 'FCFA',
        description: `Souscription ${planId === 'annual' ? 'Pass VIP Annuel (365 jours)' : (planId === 'weekly' ? 'Pass VIP Hebdo (7 jours)' : 'Pass VIP Mensuel (30 jours)')} (Débit Solde)`,
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
 * Admin Action: Manage user VIP subscription in Firestore collection 'users/{userId}'
 * Supports:
 * - 'activate': activates VIP Pass with durationDays (e.g. 30, 90, or lifetime >= 36500)
 * - 'extend': extends current valid expiration date by durationDays, or sets now + durationDays
 * - 'suspend': sets status to 'INACTIVE', leaves expiration date, and revokes unlimited privileges
 * - 'reset': resets subscription to 'INACTIVE' with null expiration date and reverts to free
 */
export async function manageUserSubscriptionInFirestore(
  userId: string,
  action: 'activate' | 'extend' | 'suspend' | 'reset',
  durationDays: number = 30,
  adminNote?: string,
  adminEmail: string = 'peter25ngouala@gmail.com'
): Promise<{ success: boolean; message: string; user?: any; error?: string }> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return { success: false, message: "Utilisateur introuvable dans Firestore.", error: "USER_NOT_FOUND" };
    }

    const userData = userSnap.data();
    const nowIso = new Date().toISOString();
    let updatedSubscription: any = null;
    let subscriptionStatus: 'free' | 'unlimited' = 'free';

    if (action === 'activate' || action === 'extend') {
      const isLifetime = durationDays >= 36500;
      let targetDate: Date;
      
      if (action === 'extend' && userData.subscription?.expiresAt) {
        const currentExpMillis = getTimestampMillis(userData.subscription.expiresAt);
        const baseMillis = (currentExpMillis && currentExpMillis > Date.now()) ? currentExpMillis : Date.now();
        targetDate = isLifetime ? new Date('2099-12-31T23:59:59Z') : new Date(baseMillis + durationDays * 86400000);
      } else {
        targetDate = isLifetime ? new Date('2099-12-31T23:59:59Z') : new Date(Date.now() + durationDays * 86400000);
      }

      updatedSubscription = cleanFirestorePayload({
        planId: 'PASS_VIP',
        planName: isLifetime ? 'Pass VIP À Vie (Permanent)' : `Pass VIP (${durationDays} jours)`,
        status: 'ACTIVE',
        activatedAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(targetDate),
        autoRenew: false,
        startedAt: nowIso,
        adminNote: adminNote || (action === 'extend' ? `Prolongation administrative de +${durationDays} jours` : `Activation manuelle de ${durationDays} jours`),
        updatedBy: adminEmail
      });
      subscriptionStatus = 'unlimited';
    } else if (action === 'suspend') {
      updatedSubscription = cleanFirestorePayload({
        planId: userData.subscription?.planId || 'PASS_VIP',
        planName: userData.subscription?.planName || 'Pass VIP Dokya',
        status: 'INACTIVE',
        activatedAt: userData.subscription?.activatedAt || null,
        expiresAt: userData.subscription?.expiresAt || null,
        autoRenew: false,
        adminNote: adminNote || 'Suspension administrative par l\'administrateur',
        updatedBy: adminEmail
      });
      subscriptionStatus = 'free';
    } else if (action === 'reset') {
      updatedSubscription = cleanFirestorePayload({
        planId: 'FREE',
        planName: 'Compte Gratuit Standard',
        status: 'INACTIVE',
        activatedAt: null,
        expiresAt: null,
        autoRenew: false,
        adminNote: adminNote || 'Réinitialisation complète de l\'abonnement par l\'administrateur',
        updatedBy: adminEmail
      });
      subscriptionStatus = 'free';
    }

    await updateDoc(userRef, cleanFirestorePayload({
      subscription: updatedSubscription,
      subscriptionStatus,
      updatedAt: nowIso
    }));

    // Mirror to user_profiles if doc exists
    try {
      const profileRef = doc(db, 'user_profiles', userId);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        await updateDoc(profileRef, cleanFirestorePayload({
          subscription: updatedSubscription,
          subscriptionStatus,
          updatedAt: nowIso
        }));
      }
    } catch (_e) {}

    // Notify backend
    fetch('/api/admin/subscriptions/manage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': adminEmail,
        'x-user-role': 'admin'
      },
      body: JSON.stringify({ userId, action, durationDays, adminNote, adminEmail })
    }).catch(_e => {});

    return {
      success: true,
      message: action === 'activate' ? `Abonnement Pass VIP activé pour ${durationDays >= 36500 ? 'une durée permanente' : `${durationDays} jours`} !`
        : action === 'extend' ? `Abonnement prolongé de +${durationDays} jours avec succès !`
        : action === 'suspend' ? `Abonnement suspendu (statut INACTIVE).`
        : `Abonnement réinitialisé au mode gratuit avec succès.`,
      user: {
        ...userData,
        subscription: updatedSubscription,
        subscriptionStatus
      }
    };
  } catch (error: any) {
    console.error('[Manage User Subscription Error]:', error);
    return {
      success: false,
      message: error?.message || "Erreur lors de la gestion de l'abonnement.",
      error: error?.message
    };
  }
}

/**
 * Fetches all users from Firestore collection 'users' with their parsed subscription statuses
 */
export async function fetchAllAdminUsersWithSubscriptions(): Promise<AdminUserRecord[]> {
  try {
    const q = query(collection(db, 'users'));
    const snap = await getDocs(q);
    const users: AdminUserRecord[] = [];

    snap.forEach((d) => {
      const data = d.data();
      let calculatedStatus: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' = 'INACTIVE';
      const rawStatus = (data.subscription?.status || '').toUpperCase();
      const rawPlanId = data.subscription?.planId || (data.subscriptionStatus === 'unlimited' ? 'PASS_VIP' : 'FREE');

      if (rawStatus === 'ACTIVE') {
        const expMillis = getTimestampMillis(data.subscription?.expiresAt);
        if (expMillis === null || expMillis > Date.now()) {
          calculatedStatus = 'ACTIVE';
        } else {
          calculatedStatus = 'EXPIRED';
        }
      } else if (rawStatus === 'EXPIRED') {
        calculatedStatus = 'EXPIRED';
      } else {
        calculatedStatus = 'INACTIVE';
      }

      const balance = typeof data.walletBalance === 'number' ? data.walletBalance : (typeof data.balance === 'number' ? data.balance : 0);

      users.push({
        uid: d.id,
        email: data.email || '',
        firstName: data.personalInfo?.firstName || data.displayName?.split(' ')[0] || '',
        lastName: data.personalInfo?.lastName || data.displayName?.split(' ').slice(1).join(' ') || '',
        phone: data.personalInfo?.phone || data.phone,
        city: data.personalInfo?.city || data.city,
        targetJob: data.personalInfo?.targetJob || data.targetJob,
        balance,
        credits: data.credits || 0,
        role: data.role || (data.email === 'peter25ngouala@gmail.com' ? 'admin' : 'candidate'),
        subscriptionStatus: calculatedStatus === 'ACTIVE' ? 'unlimited' : 'free',
        subscription: {
          planId: rawPlanId,
          status: calculatedStatus,
          activatedAt: data.subscription?.activatedAt || data.subscription?.startedAt || null,
          expiresAt: data.subscription?.expiresAt || null,
          autoRenew: data.subscription?.autoRenew ?? false,
          adminNote: data.subscription?.adminNote,
          updatedBy: data.subscription?.updatedBy
        },
        status: data.status || 'active',
        suspendedReason: data.suspendedReason,
        documentsCount: data.documentsCount || 0,
        ordersCount: data.ordersCount || 0,
        unlockedDocsCount: data.unlockedDocsCount || (data.purchasedDocIds?.length || 0),
        hasForceUnlockedDocs: data.hasForceUnlockedDocs || false,
        referredBy: data.referredBy,
        affiliateCodeUsed: data.affiliateCodeUsed,
        referredAt: data.referredAt,
        referrerName: data.referrerName,
        referralCode: data.referralCode,
        affiliateBalance: typeof data.affiliateBalance === 'number' ? data.affiliateBalance : 0,
        totalAffiliateEarnings: typeof data.totalAffiliateEarnings === 'number' ? data.totalAffiliateEarnings : 0,
        totalReferred: typeof data.totalReferred === 'number' ? data.totalReferred : 0,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      });
    });

    // Résoudre le referrerName si manquant via le tableau des utilisateurs
    const usersMap = new Map<string, AdminUserRecord>();
    users.forEach(u => usersMap.set(u.uid, u));
    users.forEach(u => {
      if (u.referredBy && !u.referrerName) {
        const refUser = usersMap.get(u.referredBy);
        if (refUser) {
          u.referrerName = `${refUser.firstName} ${refUser.lastName}`.trim() || refUser.email;
        }
      }
    });

    return users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (error) {
    console.warn('[Fetch All Admin Users With Subscriptions Error]:', error);
    return [];
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

    // 1. Purge all transactions, payments, and orders in Firestore
    try {
      const collectionsToPurge = ['transactions', 'payments', 'orders'];
      for (const colName of collectionsToPurge) {
        try {
          const colQuery = query(collection(db, colName));
          const colSnapshot = await getDocs(colQuery);
          if (!colSnapshot.empty) {
            const docs = colSnapshot.docs;
            for (let i = 0; i < docs.length; i += 400) {
              const chunk = docs.slice(i, i + 400);
              const batch = writeBatch(db);
              chunk.forEach((docSnap) => {
                batch.delete(docSnap.ref);
              });
              await batch.commit();
              if (colName === 'transactions') {
                deletedCount += chunk.length;
              }
            }
          }
        } catch (_colErr) {
          console.warn(`[Purge ${colName} Warning]:`, _colErr);
        }
      }
    } catch (txErr) {
      console.warn('[Purge Collections Warning]:', txErr);
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

// ============================================================================
// DOKYA BUSINESS - CUSTOMERS & FINANCIAL TRACKING (INVOICES / DEVIS)
// ============================================================================

const getLocalCustomersKey = (uid: string) => `dokya_business_customers_${uid}`;
const getLocalInvoicesKey = (uid: string) => `dokya_business_invoices_${uid}`;

/**
 * Enregistre ou met à jour un client dans Firestore ('users/{userId}/customers/{customerId}')
 */
export async function saveCustomer(userId: string, customerData: Partial<Customer>): Promise<Customer | null> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) {
    console.warn("Utilisateur non connecté pour sauvegarder le client.");
    return null;
  }

  const customerId = customerData.id || `CUST-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const customer: Customer = {
    id: customerId,
    name: customerData.name?.trim() || 'Client sans nom',
    phone: customerData.phone?.trim() || '',
    email: customerData.email?.trim() || '',
    address: customerData.address?.trim() || '',
    ninea: customerData.ninea?.trim() || '',
    paymentTerms: customerData.paymentTerms?.trim() || 'Comptant',
    notes: customerData.notes?.trim() || '',
    createdAt: customerData.createdAt || now,
    updatedAt: now,
  };

  // 1. Sauvegarde locale d'abord pour réactivité immédiate
  try {
    const raw = localStorage.getItem(getLocalCustomersKey(currentUid));
    let list: Customer[] = raw ? JSON.parse(raw) : [];
    const existingIndex = list.findIndex(c => c.id === customerId);
    if (existingIndex >= 0) {
      list[existingIndex] = customer;
    } else {
      list.unshift(customer);
    }
    localStorage.setItem(getLocalCustomersKey(currentUid), JSON.stringify(list));
  } catch (e) {
    console.warn("Erreur cache local clients:", e);
  }

  // 2. Sauvegarde Firestore
  const path = `users/${currentUid}/customers/${customerId}`;
  try {
    const docRef = doc(db, 'users', currentUid, 'customers', customerId);
    await setDoc(docRef, cleanFirestorePayload({
      ...customer,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }), { merge: true });
    return customer;
  } catch (error) {
    console.warn(`Erreur Firestore pour ${path}:`, error);
    return customer; // Return local representation
  }
}

/**
 * Récupère tous les clients d'un utilisateur
 */
export async function fetchCustomers(userId: string): Promise<Customer[]> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return [];

  // Fallback local
  let localList: Customer[] = [];
  try {
    const raw = localStorage.getItem(getLocalCustomersKey(currentUid));
    if (raw) localList = JSON.parse(raw);
  } catch (e) {}

  const path = `users/${currentUid}/customers`;
  try {
    const colRef = collection(db, 'users', currentUid, 'customers');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty && localList.length > 0) {
      return localList;
    }
    const firestoreList: Customer[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      firestoreList.push({
        id: d.id,
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        ninea: data.ninea || '',
        paymentTerms: data.paymentTerms || '',
        notes: data.notes || '',
        totalSpent: Number(data.totalSpent) || 0,
        totalBilled: Number(data.totalBilled) || 0,
        totalUnpaid: Number(data.totalUnpaid) || 0,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || ''),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || ''),
      });
    });

    // Mettre à jour le cache local
    if (firestoreList.length > 0) {
      localStorage.setItem(getLocalCustomersKey(currentUid), JSON.stringify(firestoreList));
      return firestoreList.sort((a, b) => a.name.localeCompare(b.name));
    }
    return localList;
  } catch (error) {
    console.warn(`Erreur fetchCustomers (${path}):`, error);
    return localList;
  }
}

/**
 * Écoute en temps réel les clients
 */
export function subscribeToCustomers(userId: string, callback: (customers: Customer[]) => void): Unsubscribe {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) {
    callback([]);
    return () => {};
  }

  // Émettre le cache local immédiatement
  try {
    const raw = localStorage.getItem(getLocalCustomersKey(currentUid));
    if (raw) callback(JSON.parse(raw));
  } catch (e) {}

  const colRef = collection(db, 'users', currentUid, 'customers');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const customers: Customer[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        customers.push({
          id: d.id,
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          ninea: data.ninea || '',
          paymentTerms: data.paymentTerms || '',
          notes: data.notes || '',
          totalSpent: Number(data.totalSpent) || 0,
          totalBilled: Number(data.totalBilled) || 0,
          totalUnpaid: Number(data.totalUnpaid) || 0,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || ''),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || ''),
        });
      });
      customers.sort((a, b) => a.name.localeCompare(b.name));
      localStorage.setItem(getLocalCustomersKey(currentUid), JSON.stringify(customers));
      callback(customers);
    },
    (err) => {
      console.warn("Erreur onSnapshot customers:", err);
    }
  );
}

/**
 * Supprime un client
 */
export async function deleteCustomer(userId: string, customerId: string): Promise<boolean> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return false;

  // Local update
  try {
    const raw = localStorage.getItem(getLocalCustomersKey(currentUid));
    if (raw) {
      const list: Customer[] = JSON.parse(raw);
      const filtered = list.filter(c => c.id !== customerId);
      localStorage.setItem(getLocalCustomersKey(currentUid), JSON.stringify(filtered));
    }
  } catch (e) {}

  try {
    const docRef = doc(db, 'users', currentUid, 'customers', customerId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.warn(`Erreur deleteCustomer (${customerId}):`, error);
    return true;
  }
}

const getLocalBusinessesKey = (uid: string) => `senegal_cv_user_businesses_${uid}`;

/**
 * Sauvegarde ou met à jour une entreprise émettrice
 */
export async function saveUserBusiness(userId: string, businessData: Partial<UserBusiness>): Promise<UserBusiness | null> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return null;

  const businessId = businessData.id || `BIZ-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const business: UserBusiness = {
    id: businessId,
    companyName: businessData.companyName || 'Mon Entreprise',
    phone: businessData.phone || '',
    email: businessData.email || '',
    address: businessData.address || '',
    ninea: businessData.ninea || '',
    logoUrl: businessData.logoUrl || '',
    isDefault: businessData.isDefault ?? false,
    createdAt: businessData.createdAt || now,
    updatedAt: now,
  };

  // 1. Sauvegarde locale d'abord
  try {
    const raw = localStorage.getItem(getLocalBusinessesKey(currentUid));
    let list: UserBusiness[] = raw ? JSON.parse(raw) : [];
    
    // Si isDefault ou première entreprise, garantir isDefault
    if (business.isDefault || list.length === 0) {
      business.isDefault = true;
      list = list.map(b => b.id === businessId ? business : { ...b, isDefault: false });
    }
    const existingIndex = list.findIndex(b => b.id === businessId);
    if (existingIndex >= 0) {
      list[existingIndex] = business;
    } else {
      list.unshift(business);
    }
    localStorage.setItem(getLocalBusinessesKey(currentUid), JSON.stringify(list));
  } catch (e) {
    console.warn("Erreur cache local businesses:", e);
  }

  // 2. Sauvegarde Firestore
  const path = `users/${currentUid}/businesses/${businessId}`;
  try {
    const docRef = doc(db, 'users', currentUid, 'businesses', businessId);
    await setDoc(docRef, cleanFirestorePayload({
      ...business,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }), { merge: true });

    // Si marquée par défaut, désactiver isDefault sur les autres documents Firestore
    if (business.isDefault) {
      try {
        const colRef = collection(db, 'users', currentUid, 'businesses');
        const snap = await getDocs(colRef);
        snap.forEach(async (d) => {
          if (d.id !== businessId && d.data().isDefault) {
            await updateDoc(doc(db, 'users', currentUid, 'businesses', d.id), { isDefault: false });
          }
        });
      } catch (e) {}
    }

    return business;
  } catch (error) {
    console.warn(`Erreur Firestore pour ${path}:`, error);
    return business;
  }
}

/**
 * Récupère toutes les entreprises émettrices de l'utilisateur
 */
export async function fetchUserBusinesses(userId: string): Promise<UserBusiness[]> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return [];

  let localList: UserBusiness[] = [];
  try {
    const raw = localStorage.getItem(getLocalBusinessesKey(currentUid));
    if (raw) localList = JSON.parse(raw);
  } catch (e) {}

  const path = `users/${currentUid}/businesses`;
  try {
    const colRef = collection(db, 'users', currentUid, 'businesses');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty && localList.length > 0) {
      return localList;
    }
    const firestoreList: UserBusiness[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      firestoreList.push({
        id: d.id,
        companyName: data.companyName || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        ninea: data.ninea || '',
        logoUrl: data.logoUrl || '',
        isDefault: !!data.isDefault,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || ''),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || ''),
      });
    });

    if (firestoreList.length > 0) {
      firestoreList.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0) || a.companyName.localeCompare(b.companyName));
      localStorage.setItem(getLocalBusinessesKey(currentUid), JSON.stringify(firestoreList));
      return firestoreList;
    }
    return localList;
  } catch (error) {
    console.warn(`Erreur fetchUserBusinesses (${path}):`, error);
    return localList;
  }
}

/**
 * Écoute en temps réel les entreprises de l'utilisateur
 */
export function subscribeToUserBusinesses(userId: string, callback: (businesses: UserBusiness[]) => void): Unsubscribe {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) {
    callback([]);
    return () => {};
  }

  try {
    const raw = localStorage.getItem(getLocalBusinessesKey(currentUid));
    if (raw) callback(JSON.parse(raw));
  } catch (e) {}

  const colRef = collection(db, 'users', currentUid, 'businesses');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: UserBusiness[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          companyName: data.companyName || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          ninea: data.ninea || '',
          logoUrl: data.logoUrl || '',
          isDefault: !!data.isDefault,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || ''),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || ''),
        });
      });
      list.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0) || a.companyName.localeCompare(b.companyName));
      localStorage.setItem(getLocalBusinessesKey(currentUid), JSON.stringify(list));
      callback(list);
    },
    (err) => {
      console.warn("Erreur onSnapshot businesses:", err);
    }
  );
}

/**
 * Supprime une entreprise émettrice
 */
export async function deleteUserBusiness(userId: string, businessId: string): Promise<boolean> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return false;

  try {
    const raw = localStorage.getItem(getLocalBusinessesKey(currentUid));
    if (raw) {
      const list: UserBusiness[] = JSON.parse(raw);
      const filtered = list.filter(b => b.id !== businessId);
      if (filtered.length > 0 && !filtered.some(b => b.isDefault)) {
        filtered[0].isDefault = true;
      }
      localStorage.setItem(getLocalBusinessesKey(currentUid), JSON.stringify(filtered));
    }
  } catch (e) {}

  try {
    const docRef = doc(db, 'users', currentUid, 'businesses', businessId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.warn(`Erreur deleteUserBusiness (${businessId}):`, error);
    return true;
  }
}

/**
 * Définit une entreprise comme étant celle par défaut
 */
export async function setDefaultUserBusiness(userId: string, businessId: string): Promise<boolean> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return false;

  try {
    const raw = localStorage.getItem(getLocalBusinessesKey(currentUid));
    if (raw) {
      let list: UserBusiness[] = JSON.parse(raw);
      list = list.map(b => ({ ...b, isDefault: b.id === businessId }));
      localStorage.setItem(getLocalBusinessesKey(currentUid), JSON.stringify(list));
    }
  } catch (e) {}

  try {
    const colRef = collection(db, 'users', currentUid, 'businesses');
    const snap = await getDocs(colRef);
    const promises: Promise<any>[] = [];
    snap.forEach((d) => {
      const isTarget = d.id === businessId;
      if (d.data().isDefault !== isTarget) {
        promises.push(updateDoc(doc(db, 'users', currentUid, 'businesses', d.id), { isDefault: isTarget }));
      }
    });
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.warn(`Erreur setDefaultUserBusiness:`, error);
    return true;
  }
}

// =============================================================================
// GESTION DE STOCK & CATALOGUE PRODUITS (businesses/{businessId}/products)
// =============================================================================

export function getLocalProductsKey(businessId: string): string {
  return `dokya_business_products_${businessId || 'default'}`;
}

/**
 * Récupère les produits d'une entreprise depuis Firestore 'businesses/{businessId}/products'
 */
export async function fetchBusinessProducts(businessId: string): Promise<Product[]> {
  const bId = businessId || 'default';
  let localList: Product[] = [];
  try {
    const raw = localStorage.getItem(getLocalProductsKey(bId));
    if (raw) localList = JSON.parse(raw);
  } catch (e) {}

  try {
    const colRef = collection(db, 'businesses', bId, 'products');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty && localList.length > 0) {
      return localList;
    }
    const firestoreList: Product[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      firestoreList.push({
        id: d.id,
        businessId: bId,
        name: data.name || '',
        sku: data.sku || '',
        purchasePrice: Number(data.purchasePrice) || 0,
        sellingPrice: Number(data.sellingPrice) || 0,
        quantity: Number(data.quantity) || 0,
        lowStockThreshold: data.lowStockThreshold !== undefined ? Number(data.lowStockThreshold) : 3,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || ''),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || ''),
      });
    });

    if (firestoreList.length > 0) {
      firestoreList.sort((a, b) => a.name.localeCompare(b.name));
      localStorage.setItem(getLocalProductsKey(bId), JSON.stringify(firestoreList));
      return firestoreList;
    }
    return localList;
  } catch (error) {
    console.warn(`Erreur fetchBusinessProducts (${bId}):`, error);
    return localList;
  }
}

/**
 * Écoute en temps réel les produits du catalogue
 */
export function subscribeToBusinessProducts(
  businessId: string, 
  callback: (products: Product[]) => void
): Unsubscribe {
  const bId = businessId || 'default';
  try {
    const colRef = collection(db, 'businesses', bId, 'products');
    return onSnapshot(colRef, (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          businessId: bId,
          name: data.name || '',
          sku: data.sku || '',
          purchasePrice: Number(data.purchasePrice) || 0,
          sellingPrice: Number(data.sellingPrice) || 0,
          quantity: Number(data.quantity) || 0,
          lowStockThreshold: data.lowStockThreshold !== undefined ? Number(data.lowStockThreshold) : 3,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || ''),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || ''),
        });
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      try {
        localStorage.setItem(getLocalProductsKey(bId), JSON.stringify(list));
      } catch (e) {}
      callback(list);
    }, (err) => {
      console.warn(`Erreur onSnapshot subscribeToBusinessProducts (${bId}):`, err);
      try {
        const raw = localStorage.getItem(getLocalProductsKey(bId));
        if (raw) callback(JSON.parse(raw));
      } catch (e) {}
    });
  } catch (error) {
    console.warn(`Erreur configuration subscribeToBusinessProducts:`, error);
    return () => {};
  }
}

/**
 * Crée ou met à jour un produit dans le catalogue
 */
export async function saveBusinessProduct(
  businessId: string, 
  productData: Partial<Product>
): Promise<Product> {
  const bId = businessId || 'default';
  const productId = productData.id || `PROD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const currentUid = auth.currentUser?.uid || 'guest';
  const product: Product = {
    id: productId,
    businessId: bId,
    userId: currentUid,
    name: (productData.name || '').trim(),
    sku: (productData.sku || '').trim(),
    purchasePrice: Number(productData.purchasePrice) || 0,
    sellingPrice: Number(productData.sellingPrice) || 0,
    quantity: Number(productData.quantity) || 0,
    lowStockThreshold: productData.lowStockThreshold !== undefined ? Number(productData.lowStockThreshold) : 3,
    createdAt: productData.createdAt || now,
    updatedAt: now,
  };

  // 1. Mise à jour du cache local
  try {
    const raw = localStorage.getItem(getLocalProductsKey(bId));
    let list: Product[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex(p => p.id === productId);
    if (index >= 0) {
      list[index] = { ...list[index], ...product };
    } else {
      list.unshift(product);
    }
    localStorage.setItem(getLocalProductsKey(bId), JSON.stringify(list));
  } catch (e) {}

  // 2. Enregistrement Firestore 'businesses/{businessId}/products/{productId}' et racine 'products/{productId}'
  try {
    const docRef = doc(db, 'businesses', bId, 'products', productId);
    await setDoc(docRef, cleanFirestorePayload({
      name: product.name,
      sku: product.sku || '',
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      quantity: product.quantity,
      lowStockThreshold: product.lowStockThreshold,
      userId: currentUid,
      businessId: bId,
      updatedAt: serverTimestamp(),
      createdAt: product.createdAt,
    }), { merge: true });

    // Enregistrement dans la collection racine 'products' avec userId pour isolation stricte
    const rootRef = doc(db, 'products', productId);
    await setDoc(rootRef, cleanFirestorePayload({
      ...product,
      userId: currentUid,
      updatedAt: serverTimestamp()
    }), { merge: true }).catch(() => {});

    // Enregistrement dans la collection 'inventory' (requis pour le déstockage et la gestion globale)
    const inventoryRef = doc(db, 'inventory', productId);
    await setDoc(inventoryRef, cleanFirestorePayload({
      ...product,
      userId: currentUid,
      businessId: bId,
      updatedAt: serverTimestamp()
    }), { merge: true }).catch(() => {});
  } catch (error) {
    console.warn(`Erreur saveBusinessProduct (${productId}):`, error);
  }

  return product;
}

/**
 * Supprime un produit du catalogue
 */
export async function deleteBusinessProduct(businessId: string, productId: string): Promise<boolean> {
  const bId = businessId || 'default';

  // 1. Suppression du cache local
  try {
    const raw = localStorage.getItem(getLocalProductsKey(bId));
    if (raw) {
      const list: Product[] = JSON.parse(raw);
      const filtered = list.filter(p => p.id !== productId);
      localStorage.setItem(getLocalProductsKey(bId), JSON.stringify(filtered));
    }
  } catch (e) {}

  // 2. Suppression Firestore
  try {
    const docRef = doc(db, 'businesses', bId, 'products', productId);
    await deleteDoc(docRef);
    const rootRef = doc(db, 'products', productId);
    await deleteDoc(rootRef).catch(() => {});
    const invRef = doc(db, 'inventory', productId);
    await deleteDoc(invRef).catch(() => {});
    return true;
  } catch (error) {
    console.warn(`Erreur deleteBusinessProduct (${productId}):`, error);
    return true;
  }
}

/**
 * Met à jour la quantité en stock rapidement (+1 / -1 ou saisie directe)
 */
export async function updateProductQuantity(
  businessId: string, 
  productId: string, 
  change: { delta?: number; exact?: number }
): Promise<number> {
  const bId = businessId || 'default';
  let newQty = 0;

  // 1. Local update
  try {
    const raw = localStorage.getItem(getLocalProductsKey(bId));
    if (raw) {
      const list: Product[] = JSON.parse(raw);
      const target = list.find(p => p.id === productId);
      if (target) {
        if (change.exact !== undefined) {
          newQty = Math.max(0, change.exact);
        } else if (change.delta !== undefined) {
          newQty = Math.max(0, (target.quantity || 0) + change.delta);
        }
        target.quantity = newQty;
        target.updatedAt = new Date().toISOString();
        localStorage.setItem(getLocalProductsKey(bId), JSON.stringify(list));
      }
    }
  } catch (e) {}

  // 2. Firestore update (businesses + inventory + products)
  try {
    const docRef = doc(db, 'businesses', bId, 'products', productId);
    await updateDoc(docRef, {
      quantity: newQty,
      updatedAt: serverTimestamp()
    }).catch(() => {});

    const invRef = doc(db, 'inventory', productId);
    await setDoc(invRef, {
      quantity: newQty,
      updatedAt: serverTimestamp()
    }, { merge: true }).catch(() => {});

    const prodRef = doc(db, 'products', productId);
    await setDoc(prodRef, {
      quantity: newQty,
      updatedAt: serverTimestamp()
    }, { merge: true }).catch(() => {});
  } catch (error) {
    console.warn(`Erreur updateProductQuantity (${productId}):`, error);
  }

  return newQty;
}

/**
 * Déduit automatiquement la quantité vendue des articles lors de la validation d'un devis ou l'émission d'une facture
 * Met à jour la collection 'inventory' (ex: si stock initial = 10 et quantité facturée = 3, le nouveau stock devient 7).
 */
export async function deductStockForInvoice(
  businessId: string, 
  items: BusinessDocItem[],
  invoiceDocNumber?: string
): Promise<boolean> {
  if (!items || items.length === 0) return true;
  const bId = businessId || 'default';
  const currentUid = auth.currentUser?.uid;

  try {
    const products = await fetchBusinessProducts(bId);
    if (!products || products.length === 0) return true;

    const productsMap = new Map<string, Product>();
    products.forEach(p => {
      productsMap.set(p.id, p);
      if (p.sku) productsMap.set(p.sku.toLowerCase().trim(), p);
      productsMap.set(p.name.toLowerCase().trim(), p);
    });

    for (const item of items) {
      const qtyToDeduct = Number(item.quantity) || 1;
      let targetProduct: Product | undefined;

      if (item.productId && productsMap.has(item.productId)) {
        targetProduct = productsMap.get(item.productId);
      } else if (item.sku && productsMap.has(item.sku.toLowerCase().trim())) {
        targetProduct = productsMap.get(item.sku.toLowerCase().trim());
      } else {
        const descClean = (item.description || '').toLowerCase().trim();
        if (productsMap.has(descClean)) {
          targetProduct = productsMap.get(descClean);
        }
      }

      if (targetProduct) {
        const currentQty = targetProduct.quantity ?? 0;
        // Calcul du nouveau stock (ex: 10 - 3 = 7)
        const finalQty = Math.max(0, currentQty - qtyToDeduct);
        targetProduct.quantity = finalQty;
        
        // Mise à jour de l'inventaire dans la collection 'inventory' et 'businesses'
        await updateProductQuantity(bId, targetProduct.id, { exact: finalQty });

        try {
          const invDocRef = doc(db, 'inventory', targetProduct.id);
          await setDoc(invDocRef, cleanFirestorePayload({
            id: targetProduct.id,
            name: targetProduct.name,
            sku: targetProduct.sku || '',
            quantity: finalQty,
            sellingPrice: targetProduct.sellingPrice,
            purchasePrice: targetProduct.purchasePrice,
            lowStockThreshold: targetProduct.lowStockThreshold || 2,
            businessId: bId,
            userId: currentUid,
            updatedAt: serverTimestamp()
          }), { merge: true });
        } catch (e) {
          console.warn("Erreur synchronisation collection 'inventory':", e);
        }

        // Émission d'une notification Firestore
        if (currentUid) {
          await createNotification(currentUid, {
            title: 'Déstockage automatique effectué',
            message: `${qtyToDeduct}x "${targetProduct.name}" déduit(s)${invoiceDocNumber ? ` pour ${invoiceDocNumber}` : ''}. Nouveau stock en inventaire : ${finalQty} (précédent: ${currentQty}).`,
            type: 'stock',
            read: false,
            tabTarget: 'business'
          }).catch(() => {});

          const lowThreshold = targetProduct.lowStockThreshold ?? 2;
          if (finalQty <= lowThreshold) {
            await createNotification(currentUid, {
              title: '⚠️ Alerte Stock Faible',
              message: `Le produit "${targetProduct.name}" atteint un seuil critique : ${finalQty} unité(s) restante(s).`,
              type: 'warning',
              read: false,
              tabTarget: 'business'
            }).catch(() => {});
          }
        }
      }
    }
    return true;
  } catch (error) {
    console.warn(`Erreur deductStockForInvoice (${bId}):`, error);
    return false;
  }
}

/**
 * Enregistre une facture ou un devis pour suivi financier
 */
export async function saveBusinessInvoice(userId: string, invoiceData: Partial<BusinessInvoice>): Promise<BusinessInvoice | null> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return null;

  const invoiceId = invoiceData.id || `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const invoice: BusinessInvoice = {
    id: invoiceId,
    userId: currentUid,
    customerId: invoiceData.customerId || '',
    customerName: invoiceData.customerName || 'Client Inconnu',
    customerPhone: invoiceData.customerPhone || '',
    customerEmail: invoiceData.customerEmail || '',
    customerAddress: invoiceData.customerAddress || '',
    customerNinea: invoiceData.customerNinea || '',
    docNumber: invoiceData.docNumber || `FAC-${new Date().getFullYear()}-001`,
    type: invoiceData.type || 'facture',
    totalHT: Number(invoiceData.totalHT) || 0,
    totalTTC: Number(invoiceData.totalTTC) || 0,
    currency: invoiceData.currency || 'FCFA',
    status: invoiceData.status || 'UNPAID',
    issueDate: invoiceData.issueDate || now.split('T')[0],
    dueDate: invoiceData.dueDate || '',
    businessDocData: invoiceData.businessDocData,
    createdAt: invoiceData.createdAt || now,
    updatedAt: now,
  };

  // Cache local
  try {
    const raw = localStorage.getItem(getLocalInvoicesKey(currentUid));
    let list: BusinessInvoice[] = raw ? JSON.parse(raw) : [];
    const existingIndex = list.findIndex(i => i.id === invoiceId || i.docNumber === invoice.docNumber);
    if (existingIndex >= 0) {
      list[existingIndex] = invoice;
    } else {
      list.unshift(invoice);
    }
    localStorage.setItem(getLocalInvoicesKey(currentUid), JSON.stringify(list));
  } catch (e) {}

  try {
    const docRef = doc(db, 'users', currentUid, 'invoices', invoiceId);
    await setDoc(docRef, cleanFirestorePayload({
      ...invoice,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }), { merge: true });
    return invoice;
  } catch (error) {
    console.warn("Erreur saveBusinessInvoice Firestore:", error);
    return invoice;
  }
}

/**
 * Récupère toutes les factures / devis d'un utilisateur
 */
export async function fetchBusinessInvoices(userId: string): Promise<BusinessInvoice[]> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return [];

  let localList: BusinessInvoice[] = [];
  try {
    const raw = localStorage.getItem(getLocalInvoicesKey(currentUid));
    if (raw) localList = JSON.parse(raw);
  } catch (e) {}

  try {
    const colRef = collection(db, 'users', currentUid, 'invoices');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty && localList.length > 0) {
      return localList;
    }
    const firestoreList: BusinessInvoice[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      firestoreList.push({
        id: d.id,
        userId: currentUid,
        customerId: data.customerId || '',
        customerName: data.customerName || '',
        customerPhone: data.customerPhone || '',
        customerEmail: data.customerEmail || '',
        customerAddress: data.customerAddress || '',
        customerNinea: data.customerNinea || '',
        docNumber: data.docNumber || '',
        type: data.type || 'facture',
        totalHT: Number(data.totalHT) || 0,
        totalTTC: Number(data.totalTTC) || 0,
        currency: data.currency || 'FCFA',
        status: data.status === 'PAID' ? 'PAID' : 'UNPAID',
        quoteStatus: data.quoteStatus || 'BROUILLON',
        paidAt: data.paidAt || '',
        issueDate: data.issueDate || '',
        dueDate: data.dueDate || '',
        businessDocData: data.businessDocData,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || ''),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || ''),
      });
    });

    if (firestoreList.length > 0) {
      localStorage.setItem(getLocalInvoicesKey(currentUid), JSON.stringify(firestoreList));
      return firestoreList.sort((a, b) => new Date(b.issueDate || b.createdAt).getTime() - new Date(a.issueDate || a.createdAt).getTime());
    }
    return localList;
  } catch (error) {
    console.warn("Erreur fetchBusinessInvoices Firestore:", error);
    return localList;
  }
}

/**
 * Écoute en direct les factures et devis d'un utilisateur
 */
export function subscribeToBusinessInvoices(userId: string, callback: (invoices: BusinessInvoice[]) => void): Unsubscribe {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) {
    callback([]);
    return () => {};
  }

  // Cache initial
  try {
    const raw = localStorage.getItem(getLocalInvoicesKey(currentUid));
    if (raw) callback(JSON.parse(raw));
  } catch (e) {}

  const colRef = collection(db, 'users', currentUid, 'invoices');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const invoices: BusinessInvoice[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        invoices.push({
          id: d.id,
          userId: currentUid,
          customerId: data.customerId || '',
          customerName: data.customerName || '',
          customerPhone: data.customerPhone || '',
          customerEmail: data.customerEmail || '',
          customerAddress: data.customerAddress || '',
          customerNinea: data.customerNinea || '',
          docNumber: data.docNumber || '',
          type: data.type || 'facture',
          totalHT: Number(data.totalHT) || 0,
          totalTTC: Number(data.totalTTC) || 0,
          currency: data.currency || 'FCFA',
          status: data.status === 'PAID' ? 'PAID' : 'UNPAID',
          quoteStatus: data.quoteStatus || 'BROUILLON',
          paidAt: data.paidAt || '',
          issueDate: data.issueDate || '',
          dueDate: data.dueDate || '',
          businessDocData: data.businessDocData,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || ''),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || ''),
        });
      });
      invoices.sort((a, b) => new Date(b.issueDate || b.createdAt).getTime() - new Date(a.issueDate || a.createdAt).getTime());
      localStorage.setItem(getLocalInvoicesKey(currentUid), JSON.stringify(invoices));
      callback(invoices);
    },
    (err) => {
      console.warn("Erreur onSnapshot invoices:", err);
    }
  );
}

/**
 * Recalcule et synchronise le total dépensé (totalSpent), facturé et impayé du client
 */
export async function syncCustomerFinancials(userId: string, customerId: string): Promise<void> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid || !customerId) return;

  try {
    const rawInvoices = localStorage.getItem(getLocalInvoicesKey(currentUid));
    const invoices: BusinessInvoice[] = rawInvoices ? JSON.parse(rawInvoices) : [];
    
    // Filtrer les factures associées à ce client (par ID ou nom)
    const clientInvoices = invoices.filter(i => 
      i.customerId === customerId || 
      (i.businessDocData?.customerId === customerId)
    );

    let totalBilled = 0;
    let totalSpent = 0;
    let totalUnpaid = 0;

    for (const inv of clientInvoices) {
      if (inv.type === 'facture') {
        const amount = Number(inv.totalTTC) || 0;
        totalBilled += amount;
        if (inv.status === 'PAID' || inv.businessDocData?.paymentStatus === 'PAID') {
          totalSpent += amount;
        } else {
          totalUnpaid += amount;
        }
      }
    }

    // Mise à jour locale du client
    const rawCustomers = localStorage.getItem(getLocalCustomersKey(currentUid));
    if (rawCustomers) {
      const custList: Customer[] = JSON.parse(rawCustomers);
      const target = custList.find(c => c.id === customerId);
      if (target) {
        target.totalSpent = totalSpent;
        target.totalBilled = totalBilled;
        target.totalUnpaid = totalUnpaid;
        localStorage.setItem(getLocalCustomersKey(currentUid), JSON.stringify(custList));
      }
    }

    // Mise à jour Firestore du client
    const custRef = doc(db, 'users', currentUid, 'customers', customerId);
    await updateDoc(custRef, {
      totalSpent,
      totalBilled,
      totalUnpaid,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn("Erreur syncCustomerFinancials:", err);
  }
}

/**
 * Met à jour le statut PAYÉE ou IMPAYÉE d'une facture
 * Recalcule automatiquement les statistiques globales et met à jour totalSpent du client
 */
export async function updateInvoicePaymentStatus(
  userId: string, 
  invoiceId: string, 
  status: 'PAID' | 'UNPAID',
  paidDate?: string
): Promise<boolean> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return false;

  const now = new Date().toISOString();
  const effectivePaidAt = status === 'PAID' ? (paidDate || now) : null;
  let customerIdToSync: string | undefined;

  // 1. Mise à jour dans le cache local des factures
  try {
    const raw = localStorage.getItem(getLocalInvoicesKey(currentUid));
    if (raw) {
      const list: BusinessInvoice[] = JSON.parse(raw);
      const target = list.find(i => i.id === invoiceId || i.docNumber === invoiceId);
      if (target) {
        target.status = status;
        target.paidAt = effectivePaidAt || undefined;
        target.updatedAt = now;
        customerIdToSync = target.customerId || target.businessDocData?.customerId;
        if (target.businessDocData) {
          target.businessDocData.paymentStatus = status;
          target.businessDocData.paidAt = effectivePaidAt || undefined;
        }
        localStorage.setItem(getLocalInvoicesKey(currentUid), JSON.stringify(list));
      }
    }
  } catch (e) {}

  // 2. Mise à jour dans le cache local isolé de l'utilisateur
  try {
    const storageKey = getLocalDocumentsKey(currentUid);
    const rawDocs = localStorage.getItem(storageKey);
    if (rawDocs) {
      const docs: SavedUserDocument[] = JSON.parse(rawDocs);
      let changed = false;
      for (const d of docs) {
        if (d.id === invoiceId || d.businessDocData?.docNumber === invoiceId) {
          if (d.businessDocData) {
            d.businessDocData.paymentStatus = status;
            d.businessDocData.paidAt = effectivePaidAt || undefined;
            if (!customerIdToSync && d.businessDocData.customerId) {
              customerIdToSync = d.businessDocData.customerId;
            }
          }
          d.updatedAt = now;
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(storageKey, JSON.stringify(docs));
      }
    }
  } catch (e) {}

  // 3. Mise à jour Firestore dans users/{userId}/invoices/{invoiceId}
  try {
    const docRef = doc(db, 'users', currentUid, 'invoices', invoiceId);
    await updateDoc(docRef, cleanFirestorePayload({
      status,
      paidAt: effectivePaidAt,
      'businessDocData.paymentStatus': status,
      'businessDocData.paidAt': effectivePaidAt,
      updatedAt: serverTimestamp()
    }));
  } catch (error) {
    console.warn("Erreur updateInvoicePaymentStatus Firestore invoices:", error);
  }

  // 4. Mise à jour Firestore dans users/{userId}/documents/{invoiceId}
  try {
    const subDocRef = doc(db, 'users', currentUid, 'documents', invoiceId);
    await setDoc(subDocRef, {
      'businessDocData.paymentStatus': status,
      'businessDocData.paidAt': effectivePaidAt,
      updatedAt: now
    }, { merge: true });
  } catch (e) {}

  // 5. Mise à jour Firestore dans user_documents/{invoiceId}
  try {
    const userDocRef = doc(db, 'user_documents', invoiceId);
    await setDoc(userDocRef, {
      'businessDocData.paymentStatus': status,
      'businessDocData.paidAt': effectivePaidAt,
      updatedAt: now
    }, { merge: true });
  } catch (e) {}

  // 6. Recalculer et mettre à jour totalSpent du client
  if (customerIdToSync) {
    await syncCustomerFinancials(currentUid, customerIdToSync);
  }

  // 7. Déduction automatique du stock lors du paiement de la facture
  if (status === 'PAID') {
    try {
      let targetInv: BusinessInvoice | undefined;
      const raw = localStorage.getItem(getLocalInvoicesKey(currentUid));
      if (raw) {
        const list: BusinessInvoice[] = JSON.parse(raw);
        targetInv = list.find(i => i.id === invoiceId || i.docNumber === invoiceId);
      }
      if (!targetInv) {
        const invSnap = await getDoc(doc(db, 'users', currentUid, 'invoices', invoiceId));
        if (invSnap.exists()) {
          targetInv = invSnap.data() as BusinessInvoice;
        }
      }

      if (targetInv && !targetInv.stockDeducted) {
        const items = targetInv.businessDocData?.items || targetInv.items || [];
        const bId = targetInv.businessId || targetInv.businessDocData?.businessId || (targetInv.businessDocData?.issuer as any)?.businessId || 'default';
        await deductStockForInvoice(bId, items);

        // Marquer le stock comme déduit
        targetInv.stockDeducted = true;
        if (raw) {
          const list: BusinessInvoice[] = JSON.parse(raw);
          const idx = list.findIndex(i => i.id === invoiceId || i.docNumber === invoiceId);
          if (idx >= 0) {
            list[idx].stockDeducted = true;
            localStorage.setItem(getLocalInvoicesKey(currentUid), JSON.stringify(list));
          }
        }
        await updateDoc(doc(db, 'users', currentUid, 'invoices', invoiceId), {
          stockDeducted: true,
          'businessDocData.stockDeducted': true,
          updatedAt: serverTimestamp()
        }).catch(() => {});
      }
    } catch (err) {
      console.warn("Erreur déduction automatique stock sur paiement:", err);
    }
  }

  return true;
}

/**
 * Met à jour le statut d'un devis (BROUILLON, EN_ATTENTE, ACCEPTE, REFUSE)
 */
export async function updateQuoteStatus(
  userId: string,
  quoteId: string,
  quoteStatus: 'BROUILLON' | 'EN_ATTENTE' | 'ACCEPTE' | 'REFUSE'
): Promise<boolean> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return false;

  const now = new Date().toISOString();

  // 1. Local update invoices
  try {
    const raw = localStorage.getItem(getLocalInvoicesKey(currentUid));
    if (raw) {
      const list: BusinessInvoice[] = JSON.parse(raw);
      const target = list.find(i => i.id === quoteId || i.docNumber === quoteId);
      if (target) {
        target.quoteStatus = quoteStatus;
        target.updatedAt = now;
        if (target.businessDocData) {
          target.businessDocData.quoteStatus = quoteStatus;
        }
        localStorage.setItem(getLocalInvoicesKey(currentUid), JSON.stringify(list));
      }
    }
  } catch (e) {}

  // 2. Mise à jour dans le cache local isolé de l'utilisateur
  try {
    const storageKey = getLocalDocumentsKey(currentUid);
    const rawDocs = localStorage.getItem(storageKey);
    if (rawDocs) {
      const docs: SavedUserDocument[] = JSON.parse(rawDocs);
      let changed = false;
      for (const d of docs) {
        if (d.id === quoteId || d.businessDocData?.docNumber === quoteId) {
          if (d.businessDocData) {
            d.businessDocData.quoteStatus = quoteStatus;
          }
          d.updatedAt = now;
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(storageKey, JSON.stringify(docs));
      }
    }
  } catch (e) {}

  // 3. Firestore update
  try {
    const docRef = doc(db, 'users', currentUid, 'invoices', quoteId);
    await updateDoc(docRef, cleanFirestorePayload({
      quoteStatus,
      'businessDocData.quoteStatus': quoteStatus,
      updatedAt: serverTimestamp()
    }));
  } catch (e) {
    console.warn("Erreur updateQuoteStatus Firestore:", e);
  }

  // 4. Déstockage automatique lors de la validation d'un devis
  if (quoteStatus === 'ACCEPTE') {
    try {
      const raw = localStorage.getItem(getLocalInvoicesKey(currentUid));
      if (raw) {
        const list: BusinessInvoice[] = JSON.parse(raw);
        const target = list.find(i => i.id === quoteId || i.docNumber === quoteId);
        if (target && !target.stockDeducted && target.businessDocData?.items) {
          const bId = target.businessId || target.businessDocData.businessId || 'default';
          await deductStockForInvoice(bId, target.businessDocData.items, target.docNumber);
          target.stockDeducted = true;
          localStorage.setItem(getLocalInvoicesKey(currentUid), JSON.stringify(list));
        }
      }
    } catch (e) {
      console.warn("Erreur déstockage devis validé:", e);
    }
  }

  return true;
}

/**
 * Convertit un devis en facture avec les mêmes prestations et le statut initial IMPAYÉE
 */
export async function convertQuoteToInvoice(userId: string, quoteId: string): Promise<BusinessInvoice | null> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return null;

  // 1. Récupérer le devis
  let quote: BusinessInvoice | undefined;
  try {
    const raw = localStorage.getItem(getLocalInvoicesKey(currentUid));
    if (raw) {
      const list: BusinessInvoice[] = JSON.parse(raw);
      quote = list.find(i => i.id === quoteId || i.docNumber === quoteId);
    }
  } catch (e) {}

  if (!quote) {
    try {
      const snap = await getDoc(doc(db, 'users', currentUid, 'invoices', quoteId));
      if (snap.exists()) {
        quote = snap.data() as BusinessInvoice;
      }
    } catch (e) {}
  }

  if (!quote) return null;

  // Marquer le devis original comme ACCEPTÉ
  await updateQuoteStatus(currentUid, quoteId, 'ACCEPTE');

  // Générer un nouveau numéro de facture professionnel
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const newDocNumber = `FAC-${year}-${randomSuffix}`;
  const newInvoiceId = `INV-${Date.now()}`;
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];

  const clonedDocData: BusinessDocData = quote.businessDocData ? {
    ...JSON.parse(JSON.stringify(quote.businessDocData)),
    id: newInvoiceId,
    type: 'facture',
    docNumber: newDocNumber,
    issueDate: todayStr,
    paymentStatus: 'UNPAID',
    status: 'envoye',
    quoteStatus: undefined,
    paidAt: undefined
  } : {
    id: newInvoiceId,
    type: 'facture',
    docNumber: newDocNumber,
    issueDate: todayStr,
    currency: quote.currency || 'FCFA',
    issuer: { companyName: '', phone: '', email: '', address: '', ninea: '' },
    client: {
      name: quote.customerName,
      phone: quote.customerPhone || '',
      email: quote.customerEmail || '',
      address: quote.customerAddress || '',
      ninea: quote.customerNinea || ''
    },
    items: [],
    paymentStatus: 'UNPAID',
    status: 'envoye',
    customerId: quote.customerId
  };

  const newInvoice: BusinessInvoice = {
    id: newInvoiceId,
    userId: currentUid,
    customerId: quote.customerId,
    customerName: quote.customerName,
    customerPhone: quote.customerPhone,
    customerEmail: quote.customerEmail,
    customerAddress: quote.customerAddress,
    customerNinea: quote.customerNinea,
    docNumber: newDocNumber,
    type: 'facture',
    totalHT: quote.totalHT,
    totalTTC: quote.totalTTC,
    currency: quote.currency || 'FCFA',
    status: 'UNPAID',
    issueDate: todayStr,
    businessDocData: clonedDocData,
    createdAt: now,
    updatedAt: now
  };

  // Sauvegarder la nouvelle facture
  await saveBusinessInvoice(currentUid, newInvoice);

  // Sauvegarder dans user_documents et users/{uid}/documents
  try {
    const savedUserDoc: SavedUserDocument = {
      id: newInvoiceId,
      userId: currentUid,
      title: `Facture Client - ${newDocNumber}`,
      generationMode: 'facture',
      isPaid: true,
      businessDocData: clonedDocData,
      createdAt: now,
      updatedAt: now
    };
    await saveUserDocument(savedUserDoc);

    const subDocRef = doc(db, 'users', currentUid, 'documents', newInvoiceId);
    await setDoc(subDocRef, cleanFirestorePayload(savedUserDoc), { merge: true });
  } catch (e) {}

  // Synchroniser les finances du client
  if (newInvoice.customerId) {
    await syncCustomerFinancials(currentUid, newInvoice.customerId);
  }

  // Déstockage automatique pour la facture créée
  try {
    const items = clonedDocData.items || [];
    if (items.length > 0) {
      const bId = quote.businessId || clonedDocData.businessId || 'default';
      await deductStockForInvoice(bId, items, newDocNumber);
      newInvoice.stockDeducted = true;
      clonedDocData.stockDeducted = true;
    }
  } catch (e) {
    console.warn("Erreur déstockage convertQuoteToInvoice:", e);
  }

  return newInvoice;
}

/**
 * Sauvegarde ou met à jour un document Devis ou Facture existant dans Firestore et le cache local
 * Écrase ou met à jour 'users/{userId}/documents/{documentId}', 'users/{userId}/invoices/{id}', etc.
 */
export async function saveOrUpdateBusinessDocument(
  userId: string,
  docId: string,
  docData: BusinessDocData
): Promise<{ invoice: BusinessInvoice; doc: SavedUserDocument }> {
  const currentUid = userId || auth.currentUser?.uid;
  const now = new Date().toISOString();
  const effectiveId = docId || docData.id || `DOC-${Date.now()}`;

  // Calculs des totaux
  const subtotalHT = (docData.items || []).reduce((acc, item) => {
    return acc + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
  }, 0);
  const discountAmount = docData.discountPercent ? Math.round((subtotalHT * docData.discountPercent) / 100) : 0;
  const netHT = subtotalHT - discountAmount;
  const vatRate = docData.applyVat ? (docData.vatRate ?? 18) : 0;
  const vatAmount = docData.applyVat ? Math.round((netHT * vatRate) / 100) : 0;
  const totalTTC = netHT + vatAmount;

  const enrichedDocData: BusinessDocData = {
    ...docData,
    id: effectiveId
  };

  const invoice: BusinessInvoice = {
    id: effectiveId,
    userId: currentUid,
    customerId: docData.customerId,
    customerName: docData.client?.companyName || docData.client?.name || 'Client',
    customerPhone: docData.client?.phone,
    customerEmail: docData.client?.email,
    customerAddress: docData.client?.address,
    customerNinea: docData.client?.ninea,
    docNumber: docData.docNumber,
    type: docData.type,
    totalHT: subtotalHT,
    totalTTC,
    currency: docData.currency || 'FCFA',
    status: docData.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID',
    quoteStatus: docData.quoteStatus,
    paidAt: docData.paidAt,
    issueDate: docData.issueDate || now.split('T')[0],
    dueDate: docData.dueDate,
    businessDocData: enrichedDocData,
    createdAt: now,
    updatedAt: now
  };

  const savedUserDoc: SavedUserDocument = {
    id: effectiveId,
    userId: currentUid,
    title: `${docData.type === 'devis' ? 'Devis Pro' : 'Facture Client'} - ${docData.docNumber}`,
    generationMode: docData.type,
    isPaid: true,
    businessDocData: enrichedDocData,
    createdAt: now,
    updatedAt: now
  };

  // 1. Sauvegarder dans 'users/{userId}/invoices/{id}'
  await saveBusinessInvoice(currentUid, invoice);

  // 2. Sauvegarder dans 'user_documents/{id}'
  await saveUserDocument(savedUserDoc);

  // 3. Sauvegarder explicitement dans 'users/{userId}/documents/{documentId}'
  try {
    const userSubDocRef = doc(db, 'users', currentUid, 'documents', effectiveId);
    await setDoc(userSubDocRef, cleanFirestorePayload({
      ...savedUserDoc,
      updatedAt: serverTimestamp()
    }), { merge: true });
  } catch (e) {
    console.warn("Erreur users/{userId}/documents:", e);
  }

  // 4. Si client rattaché, synchroniser ses finances
  if (docData.customerId) {
    await syncCustomerFinancials(currentUid, docData.customerId);
  }

  // 5. Déduction automatique du stock lors de l'émission d'une facture ou validation d'un devis
  const isInvoice = docData.type === 'facture';
  const isQuoteValidated = docData.type === 'devis' && docData.quoteStatus === 'ACCEPTE';
  if ((isInvoice || isQuoteValidated) && !invoice.stockDeducted) {
    try {
      const bId = invoice.businessId || docData.businessId || (docData.issuer as any)?.businessId || 'default';
      const items = docData.items || [];
      if (items.length > 0) {
        await deductStockForInvoice(bId, items, docData.docNumber);
        invoice.stockDeducted = true;
        if (savedUserDoc.businessDocData) {
          savedUserDoc.businessDocData.stockDeducted = true;
        }
      }
    } catch (e) {
      console.warn("Erreur déduction stock automatique:", e);
    }
  }

  return { invoice, doc: savedUserDoc };
}

/**
 * Supprime une facture
 */
export async function deleteBusinessInvoice(userId: string, invoiceId: string): Promise<boolean> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return false;

  try {
    const raw = localStorage.getItem(getLocalInvoicesKey(currentUid));
    if (raw) {
      const list: BusinessInvoice[] = JSON.parse(raw);
      const filtered = list.filter(i => i.id !== invoiceId);
      localStorage.setItem(getLocalInvoicesKey(currentUid), JSON.stringify(filtered));
    }
  } catch (e) {}

  try {
    const docRef = doc(db, 'users', currentUid, 'invoices', invoiceId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.warn("Erreur deleteBusinessInvoice Firestore:", error);
    return true;
  }
}

// =========================================================================
// MODULE D'AFFILIATION & PARRAINAGE AVEC VALIDATION ADMIN ET CALCUL DE MARGE
// =========================================================================

/**
 * Génère automatiquement une commission en attente (20% affilié / 80% admin)
 * si le client acheteur a été parrainé via un code d'affiliation.
 */
export async function createAffiliateCommissionIfReferred(params: {
  userId: string;
  userDisplayName?: string;
  transactionId: string;
  totalAmount: number;
  serviceTitle?: string;
}): Promise<AffiliateCommission | null> {
  if (!params.userId || !params.transactionId || params.totalAmount <= 0) return null;

  try {
    // 1. Vérifier si une commission existe déjà pour cette transaction
    const qExisting = query(collection(db, 'affiliate_commissions'), where('transactionId', '==', params.transactionId));
    const existingSnap = await getDocs(qExisting);
    if (!existingSnap.empty) {
      return existingSnap.docs[0].data() as AffiliateCommission;
    }

    // 2. Trouver l'acheteur et vérifier son parrain
    const userDocRef = doc(db, 'users', params.userId);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) return null;

    const userData = userSnap.data();
    const referrerId = userData.referredBy;
    if (!referrerId || referrerId === params.userId) return null;

    // 3. Charger les infos du parrain
    const referrerDocRef = doc(db, 'users', referrerId);
    const referrerSnap = await getDoc(referrerDocRef);
    if (!referrerSnap.exists()) return null;

    const referrerData = referrerSnap.data();
    const referrerName = referrerData.displayName || referrerData.email?.split('@')[0] || 'Parrain Dokya';
    const referrerPhone = referrerData.phone || referrerData.phoneNumber || referrerData.personalInfo?.phone || '';
    const referrerEmail = referrerData.email || '';
    const referrerCode = referrerData.referralCode || '';

    // 4. Calcul de marge : 20% pour l'affilié, 80% pour l'admin
    const totalAmount = Math.round(params.totalAmount);
    const affiliateCommission = Math.round(totalAmount * 0.20); // 20%
    const adminNetGain = totalAmount - affiliateCommission; // 80%

    const commissionId = `COMM-${params.transactionId}`;
    const commissionDocRef = doc(db, 'affiliate_commissions', commissionId);

    const commission: AffiliateCommission = {
      id: commissionId,
      transactionId: params.transactionId,
      referrerId,
      referrerName,
      referrerPhone,
      referrerEmail,
      referrerCode,
      referredUserId: params.userId,
      referredUserName: params.userDisplayName || userData.displayName || 'Client',
      serviceTitle: params.serviceTitle || 'Service Dokya AI',
      totalAmount,
      affiliateCommission,
      adminNetGain,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    await setDoc(commissionDocRef, cleanFirestorePayload(commission), { merge: true });

    // 5. Mettre à jour la fiche du filleul dans le sous-ensemble users/{referrerId}/referrals/{referredUserId}
    try {
      const refDocRef = doc(db, 'users', referrerId, 'referrals', params.userId);
      await setDoc(refDocRef, cleanFirestorePayload({
        id: params.userId,
        referredUserId: params.userId,
        referredName: commission.referredUserName,
        referredEmail: userData.email || '',
        affiliateCodeUsed: userData.affiliateCodeUsed || referrerCode,
        joinedAt: userData.referredAt || userData.createdAt || new Date().toISOString(),
        conversionStatus: 'converted',
        totalSpent: increment(totalAmount),
        commissionEarned: increment(affiliateCommission)
      }), { merge: true });
    } catch (errRefSync) {
      console.warn('[Sync referral subdoc conversion warn]:', errRefSync);
    }

    return commission;
  } catch (error) {
    console.warn('[Affiliate commission creation warn]:', error);
    return null;
  }
}

/**
 * Valide une commission d'affiliation :
 * - Passe le statut à APPROVED
 * - Crédite atomiquement le solde d'affiliation (affiliateBalance) et le total des gains (totalAffiliateEarnings) du parrain
 */
export async function approveAffiliateCommission(
  commissionId: string,
  adminEmail: string,
  note: string = 'Commission approuvée par l\'administrateur'
): Promise<{ success: boolean; error?: string }> {
  try {
    const commRef = doc(db, 'affiliate_commissions', commissionId);
    const commSnap = await getDoc(commRef);
    if (!commSnap.exists()) {
      return { success: false, error: 'Commission introuvable.' };
    }

    const comm = commSnap.data() as AffiliateCommission;
    if (comm.status === 'APPROVED') {
      return { success: true };
    }

    // 1. Mettre à jour la commission
    const nowIso = new Date().toISOString();
    await updateDoc(commRef, {
      status: 'APPROVED',
      approvedAt: nowIso,
      adminNote: `${note} (${adminEmail})`
    });

    // 2. Créditer atomiquement l'affilié
    const referrerRef = doc(db, 'users', comm.referrerId);
    await updateDoc(referrerRef, {
      affiliateBalance: increment(comm.affiliateCommission),
      totalAffiliateEarnings: increment(comm.affiliateCommission),
      updatedAt: nowIso
    });

    return { success: true };
  } catch (error: any) {
    console.warn('[Approve Affiliate Commission Error]:', error);
    return { success: false, error: error.message || 'Erreur lors de l\'approbation.' };
  }
}

/**
 * Rejette une commission d'affiliation en cas d'annulation ou de transaction frauduleuse
 */
export async function rejectAffiliateCommission(
  commissionId: string,
  adminEmail: string,
  note: string = 'Commission rejetée par l\'administrateur'
): Promise<{ success: boolean; error?: string }> {
  try {
    const commRef = doc(db, 'affiliate_commissions', commissionId);
    await updateDoc(commRef, {
      status: 'REJECTED',
      rejectedAt: new Date().toISOString(),
      adminNote: `${note} (${adminEmail})`
    });
    return { success: true };
  } catch (error: any) {
    console.warn('[Reject Affiliate Commission Error]:', error);
    return { success: false, error: error.message || 'Erreur lors du rejet.' };
  }
}

/**
 * Demande de retrait par un affilié (minimum 2 000 FCFA)
 */
export async function requestAffiliatePayout(
  userId: string,
  data: {
    affiliateName?: string;
    affiliatePhone?: string;
    network: 'wave' | 'orange_money';
    phoneNumber: string;
    amount: number;
  }
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    const amount = Math.round(Number(data.amount));
    if (amount < 2000) {
      return { success: false, error: 'Le montant minimum de retrait est de 2 000 FCFA.' };
    }
    if (!data.phoneNumber || data.phoneNumber.trim().length < 8) {
      return { success: false, error: 'Veuillez saisir un numéro de téléphone mobile valide.' };
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return { success: false, error: 'Profil utilisateur introuvable.' };
    }

    const userData = userSnap.data();
    const availableBalance = typeof userData.affiliateBalance === 'number' ? userData.affiliateBalance : 0;
    if (availableBalance < amount) {
      return { 
        success: false, 
        error: `Solde insuffisant (${availableBalance.toLocaleString('fr-FR')} FCFA disponible). Vous ne pouvez pas retirer plus que votre solde.` 
      };
    }

    const requestId = `PAYOUT-${Date.now()}`;
    const reqRef = doc(db, 'affiliate_payout_requests', requestId);

    const payoutReq: AffiliatePayoutRequest = {
      id: requestId,
      affiliateId: userId,
      affiliateName: data.affiliateName || userData.displayName || 'Affilié Dokya',
      affiliatePhone: data.affiliatePhone || data.phoneNumber,
      affiliateEmail: userData.email || '',
      network: data.network,
      phoneNumber: data.phoneNumber.trim(),
      amount,
      status: 'PENDING',
      requestedAt: new Date().toISOString()
    };

    await setDoc(reqRef, cleanFirestorePayload(payoutReq));
    return { success: true, requestId };
  } catch (error: any) {
    console.warn('[Request Affiliate Payout Error]:', error);
    return { success: false, error: error.message || 'Erreur lors de la création de la demande de retrait.' };
  }
}

/**
 * Marque une demande de retrait comme payée :
 * Déduit le montant du solde d'affiliation du parrain et clôture la demande
 */
export async function markAffiliatePayoutPaid(
  requestId: string,
  adminEmail: string,
  note: string = 'Virement mobile envoyé par l\'administrateur'
): Promise<{ success: boolean; error?: string }> {
  try {
    const reqRef = doc(db, 'affiliate_payout_requests', requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) {
      return { success: false, error: 'Demande de retrait introuvable.' };
    }

    const req = reqSnap.data() as AffiliatePayoutRequest;
    if (req.status === 'PAID') {
      return { success: true };
    }

    const nowIso = new Date().toISOString();
    // 1. Clôturer la demande
    await updateDoc(reqRef, {
      status: 'PAID',
      paidAt: nowIso,
      adminNote: `${note} (${adminEmail})`
    });

    // 2. Déduire le montant du solde de l'affilié
    const userRef = doc(db, 'users', req.affiliateId);
    await updateDoc(userRef, {
      affiliateBalance: increment(-req.amount),
      updatedAt: nowIso
    });

    return { success: true };
  } catch (error: any) {
    console.warn('[Mark Affiliate Payout Paid Error]:', error);
    return { success: false, error: error.message || 'Erreur lors de la validation du paiement.' };
  }
}

/**
 * Rejette une demande de retrait
 */
export async function rejectAffiliatePayout(
  requestId: string,
  adminEmail: string,
  note: string = 'Demande de retrait rejetée'
): Promise<{ success: boolean; error?: string }> {
  try {
    const reqRef = doc(db, 'affiliate_payout_requests', requestId);
    await updateDoc(reqRef, {
      status: 'REJECTED',
      rejectedAt: new Date().toISOString(),
      adminNote: `${note} (${adminEmail})`
    });
    return { success: true };
  } catch (error: any) {
    console.warn('[Reject Affiliate Payout Error]:', error);
    return { success: false, error: error.message || 'Erreur lors du rejet.' };
  }
}

/**
 * Écoute en temps réel les commissions d'affiliation
 * - Pour un affilié spécifique si userId est fourni
 * - Pour toutes les commissions (Admin) si userId est omis
 */
export function subscribeToAffiliateCommissions(
  userId: string | undefined,
  onUpdate: (commissions: AffiliateCommission[]) => void,
  onError?: (error: any) => void
): () => void {
  try {
    let q = query(collection(db, 'affiliate_commissions'), limit(20));
    if (userId) {
      q = query(collection(db, 'affiliate_commissions'), where('referrerId', '==', userId), limit(20));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AffiliateCommission[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) } as AffiliateCommission);
        });
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        onUpdate(list);
      },
      (err) => {
        console.warn('[Firestore Affiliate Commissions Snapshot Warn]:', err);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn('[Firestore subscribeToAffiliateCommissions error]:', e);
    return () => {};
  }
}

/**
 * Écoute en temps réel les demandes de retrait
 * - Pour un affilié spécifique si userId est fourni
 * - Pour toutes les demandes (Admin) si userId est omis
 */
export function subscribeToAffiliatePayoutRequests(
  userId: string | undefined,
  onUpdate: (requests: AffiliatePayoutRequest[]) => void,
  onError?: (error: any) => void
): () => void {
  try {
    let q = query(collection(db, 'affiliate_payout_requests'), limit(20));
    if (userId) {
      q = query(collection(db, 'affiliate_payout_requests'), where('affiliateId', '==', userId), limit(20));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AffiliatePayoutRequest[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) } as AffiliatePayoutRequest);
        });
        list.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
        onUpdate(list);
      },
      (err) => {
        console.warn('[Firestore Affiliate Payouts Snapshot Warn]:', err);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn('[Firestore subscribeToAffiliatePayoutRequests error]:', e);
    return () => {};
  }
}

/**
 * Récupère le nombre de filleuls apportés par un utilisateur
 */
export async function getReferredUsersCount(referrerId: string): Promise<number> {
  try {
    const q = query(collection(db, 'users'), where('referredBy', '==', referrerId));
    const snap = await getDocs(q);
    return snap.size;
  } catch (e) {
    return 0;
  }
}

/**
 * Récupère la liste détaillée des clients et filleuls parrainés par un utilisateur.
 * Combine la sous-collection users/{referrerId}/referrals et la collection users
 * avec le montant total dépensé et les commissions générées.
 */
export async function fetchReferredUsers(referrerId: string): Promise<UserReferralItem[]> {
  if (!referrerId || referrerId === 'guest') return [];

  const map = new Map<string, UserReferralItem>();

  // 1. Lire la sous-collection users/{referrerId}/referrals
  try {
    const subColRef = collection(db, 'users', referrerId, 'referrals');
    const snap = await getDocs(subColRef);
    snap.forEach((d) => {
      const data = d.data() as UserReferralItem;
      const refUid = data.referredUserId || d.id;
      map.set(refUid, {
        id: d.id,
        referredUserId: refUid,
        referredName: data.referredName || 'Client Dokya',
        referredEmail: data.referredEmail || '',
        affiliateCodeUsed: data.affiliateCodeUsed || '',
        joinedAt: data.joinedAt || new Date().toISOString(),
        conversionStatus: data.conversionStatus || 'registered',
        totalSpent: Number(data.totalSpent) || 0,
        commissionEarned: Number(data.commissionEarned) || 0,
      });
    });
  } catch (e) {
    console.warn('[Fetch referral subcollection warn]:', e);
  }

  // 2. Requête dans la collection racine users où referredBy == referrerId
  try {
    const qUsers = query(collection(db, 'users'), where('referredBy', '==', referrerId));
    const snapUsers = await getDocs(qUsers);
    snapUsers.forEach((d) => {
      const uData = d.data();
      const uid = d.id;
      if (!map.has(uid)) {
        map.set(uid, {
          id: uid,
          referredUserId: uid,
          referredName: uData.displayName || uData.email?.split('@')[0] || 'Candidat Dokya',
          referredEmail: uData.email || '',
          affiliateCodeUsed: uData.affiliateCodeUsed || '',
          joinedAt: uData.referredAt || uData.createdAt || new Date().toISOString(),
          conversionStatus: 'registered',
          totalSpent: 0,
          commissionEarned: 0,
        });
      }
    });
  } catch (e) {
    console.warn('[Fetch users referredBy warn]:', e);
  }

  // 3. Vérifier les commissions approuvées ou en attente pour enrichir le statut de conversion
  try {
    const qComms = query(collection(db, 'affiliate_commissions'), where('referrerId', '==', referrerId));
    const snapComms = await getDocs(qComms);
    snapComms.forEach((d) => {
      const c = d.data();
      const referredUid = c.referredUserId;
      if (referredUid && map.has(referredUid)) {
        const item = map.get(referredUid)!;
        item.conversionStatus = 'converted';
        item.totalSpent += (Number(c.totalAmount) || 0);
        item.commissionEarned += (Number(c.affiliateCommission) || 0);
      }
    });
  } catch (e) {}

  const result = Array.from(map.values());
  return result.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
}

/**
 * Écoute en temps réel les filleuls parrainés par un utilisateur
 */
export function subscribeToReferredUsers(
  referrerId: string,
  callback: (list: UserReferralItem[]) => void
): () => void {
  if (!referrerId || referrerId === 'guest') {
    callback([]);
    return () => {};
  }

  // Premier chargement
  fetchReferredUsers(referrerId).then(callback).catch(() => callback([]));

  // Écoute des mises à jour sur la sous-collection referrals
  try {
    const subColRef = collection(db, 'users', referrerId, 'referrals');
    const unsub = onSnapshot(subColRef, () => {
      fetchReferredUsers(referrerId).then(callback).catch(() => {});
    }, (err) => {
      console.warn('[subscribeToReferredUsers error]:', err);
    });
    return unsub;
  } catch (e) {
    return () => {};
  }
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

// =========================================================================
// SUPPORT CHAT & CONVERSATIONS (HYBRID AI + HUMAN ASSISTANCE)
// Collection: support_chats/{chatId}/messages
// =========================================================================

export function getOrCreateChatId(userId: string): string {
  if (!userId || userId === 'guest') return 'guest_user';
  return String(userId);
}

export function getOrCreateConversationId(userId: string): string {
  return getOrCreateChatId(userId);
}

export function subscribeToSupportConversation(
  chatId: string, 
  onUpdate: (conv: SupportConversation | null) => void
): Unsubscribe {
  if (!chatId) return () => {};
  const convRef = doc(db, 'support_chats', chatId);
  return onSnapshot(convRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate({ id: docSnap.id, ...(docSnap.data() as any) });
    } else {
      onUpdate(null);
    }
  }, (err) => {
    console.warn('[Support Chat] Error subscribing to conversation:', err);
    onUpdate(null);
  });
}

export function subscribeToSupportMessages(
  chatId: string, 
  onUpdate: (messages: SupportMessage[]) => void
): Unsubscribe {
  if (!chatId) return () => {};
  const messagesCol = collection(db, 'support_chats', chatId, 'messages');
  // Order by createdAt descending with limit(20) to only fetch the latest 20 messages in real-time
  const q = query(messagesCol, orderBy('createdAt', 'desc'), limit(20));

  return onSnapshot(q, (querySnap) => {
    const msgs: SupportMessage[] = [];
    querySnap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const role: 'USER' | 'ADMIN' = data.senderRole || (data.senderType === 'agent' ? 'ADMIN' : 'USER');
      const msgType: 'TEXT' | 'IMAGE' | 'AUDIO' = data.type || (data.mediaType === 'image' ? 'IMAGE' : data.mediaType === 'audio' ? 'AUDIO' : 'TEXT');
      
      let createdIso = new Date().toISOString();
      let createdMillis = Date.now();
      if (data.createdAt) {
        if (typeof data.createdAt.toDate === 'function') {
          const d = data.createdAt.toDate();
          createdIso = d.toISOString();
          createdMillis = d.getTime();
        } else if (typeof data.createdAt === 'string') {
          createdIso = data.createdAt;
          createdMillis = new Date(data.createdAt).getTime();
        }
      }

      msgs.push({
        id: docSnap.id,
        chatId,
        conversationId: chatId,
        senderId: data.senderId || (role === 'ADMIN' ? 'admin' : 'user'),
        senderRole: role,
        senderType: role === 'ADMIN' ? 'agent' : 'user',
        senderName: data.senderName || (role === 'ADMIN' ? 'Support Dokya' : 'Utilisateur'),
        text: data.text || '',
        type: msgType,
        mediaType: msgType === 'IMAGE' ? 'image' : msgType === 'AUDIO' ? 'audio' : undefined,
        mediaUrl: data.mediaUrl || undefined,
        audioDuration: data.audioDuration,
        createdAt: createdIso,
        timestamp: createdMillis,
      });
    });
    // Ensure strict ascending sorting chronologically for display
    msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    onUpdate(msgs);
  }, (err) => {
    console.warn('[Support Chat] Error with orderBy query, falling back with limit(20):', err);
    // Fallback if index is being built or offline
    const fallbackQ = query(messagesCol, limit(20));
    const fallbackUnsub = onSnapshot(fallbackQ, (querySnap) => {
      const msgs: SupportMessage[] = [];
      querySnap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const role: 'USER' | 'ADMIN' = data.senderRole || (data.senderType === 'agent' ? 'ADMIN' : 'USER');
        const msgType: 'TEXT' | 'IMAGE' | 'AUDIO' = data.type || (data.mediaType === 'image' ? 'IMAGE' : data.mediaType === 'audio' ? 'AUDIO' : 'TEXT');
        
        let createdIso = new Date().toISOString();
        let createdMillis = Date.now();
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            const d = data.createdAt.toDate();
            createdIso = d.toISOString();
            createdMillis = d.getTime();
          } else if (typeof data.createdAt === 'string') {
            createdIso = data.createdAt;
            createdMillis = new Date(data.createdAt).getTime();
          }
        }

        msgs.push({
          id: docSnap.id,
          chatId,
          conversationId: chatId,
          senderId: data.senderId || (role === 'ADMIN' ? 'admin' : 'user'),
          senderRole: role,
          senderType: role === 'ADMIN' ? 'agent' : 'user',
          senderName: data.senderName || (role === 'ADMIN' ? 'Support Dokya' : 'Utilisateur'),
          text: data.text || '',
          type: msgType,
          mediaType: msgType === 'IMAGE' ? 'image' : msgType === 'AUDIO' ? 'audio' : undefined,
          mediaUrl: data.mediaUrl || undefined,
          audioDuration: data.audioDuration,
          createdAt: createdIso,
          timestamp: createdMillis,
        });
      });
      msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      onUpdate(msgs);
    }, (fallbackErr) => {
      console.warn('[Support Chat fallback error]:', fallbackErr);
      onUpdate([]);
    });
    return fallbackUnsub;
  });
}

export async function sendSupportMessage(
  chatId: string,
  messageData: {
    senderId: string;
    senderRole?: 'USER' | 'ADMIN';
    senderType?: SupportSenderType;
    senderName?: string;
    text: string;
    mediaUrl?: string;
    type?: 'TEXT' | 'IMAGE' | 'AUDIO';
    mediaType?: 'image' | 'audio';
    audioDuration?: number;
  },
  convMetadata?: {
    userId?: string;
    userEmail?: string;
    userName?: string;
    userPhone?: string;
    status?: SupportConversationStatus;
    unreadByAdmin?: boolean;
    unreadAdmin?: boolean;
    unreadUser?: boolean;
    urgent?: boolean;
  }
): Promise<string> {
  const role: 'USER' | 'ADMIN' = messageData.senderRole 
    ? messageData.senderRole 
    : (messageData.senderType === 'agent' ? 'ADMIN' : 'USER');

  const msgType: 'TEXT' | 'IMAGE' | 'AUDIO' = messageData.type 
    ? messageData.type 
    : (messageData.mediaType === 'image' ? 'IMAGE' : messageData.mediaType === 'audio' ? 'AUDIO' : 'TEXT');

  // Exact structure required in Firestore 'support_chats/{chatId}/messages'
  const messagePayload: any = {
    senderId: messageData.senderId || (role === 'ADMIN' ? 'admin' : 'user'),
    senderRole: role,
    text: messageData.text || '',
    type: msgType,
    createdAt: serverTimestamp(),
  };

  if (messageData.mediaUrl) {
    messagePayload.mediaUrl = messageData.mediaUrl;
  }
  if (messageData.senderName) {
    messagePayload.senderName = messageData.senderName;
  }
  if (messageData.audioDuration !== undefined && messageData.audioDuration !== null) {
    messagePayload.audioDuration = messageData.audioDuration;
  }

  // 1. addDoc in 'support_chats/{chatId}/messages'
  const messagesCol = collection(db, 'support_chats', chatId, 'messages');
  const docRef = await addDoc(messagesCol, messagePayload);

  // 2. Update parent document 'support_chats/{chatId}'
  const isUser = role === 'USER';
  const chatParentRef = doc(db, 'support_chats', chatId);
  const lastText = messageData.text || (msgType === 'IMAGE' ? '📷 Capture d\'écran' : msgType === 'AUDIO' ? '🎙️ Message vocal' : '');

  const parentUpdate: any = {
    id: chatId,
    lastMessage: lastText,
    lastMessageText: lastText,
    lastMessageSender: role,
    lastMessageAt: serverTimestamp(),
    unreadByAdmin: isUser ? true : false,
    updatedAt: serverTimestamp(),
  };

  if (convMetadata?.userId) parentUpdate.userId = convMetadata.userId;
  if (convMetadata?.userEmail) parentUpdate.userEmail = convMetadata.userEmail;
  if (convMetadata?.userName) parentUpdate.userName = convMetadata.userName;
  if (convMetadata?.userPhone) parentUpdate.userPhone = convMetadata.userPhone;
  if (convMetadata?.status) parentUpdate.status = convMetadata.status;
  if (convMetadata?.urgent !== undefined) parentUpdate.urgent = convMetadata.urgent;

  await setDoc(chatParentRef, parentUpdate, { merge: true });

  return docRef.id;
}

export async function requestHumanSupport(
  chatId: string,
  user: { uid: string; displayName?: string; email?: string; phone?: string }
): Promise<void> {
  // 1. Insert alert message in discussion
  const messagesCol = collection(db, 'support_chats', chatId, 'messages');
  await addDoc(messagesCol, {
    senderId: user.uid,
    senderRole: 'USER',
    text: '🆘 Relais humain demandé : Le client souhaite s\'entretenir directement avec un conseiller Dokya.',
    type: 'TEXT',
    createdAt: serverTimestamp(),
  });

  // 2. Update conversation status with urgent: true and unreadByAdmin: true
  const chatParentRef = doc(db, 'support_chats', chatId);
  await setDoc(chatParentRef, {
    id: chatId,
    userId: user.uid,
    userEmail: user.email || '',
    userName: user.displayName || 'Candidat Dokya',
    userPhone: user.phone || '',
    status: 'HUMAN_REQUESTED',
    urgent: true,
    unreadByAdmin: true,
    lastMessage: '🆘 Relais humain demandé en urgence',
    lastMessageText: '🆘 Relais humain demandé en urgence',
    lastMessageSender: 'USER',
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function subscribeToActiveSupportConversations(
  onUpdate: (conversations: SupportConversation[]) => void
): Unsubscribe {
  const convCol = collection(db, 'support_chats');
  const q = query(convCol, limit(20));
  return onSnapshot(q, (querySnap) => {
    const list: SupportConversation[] = [];
    querySnap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      list.push({
        id: docSnap.id,
        ...data,
        lastMessage: data.lastMessage || data.lastMessageText || '',
        lastMessageText: data.lastMessage || data.lastMessageText || '',
        unreadByAdmin: data.unreadByAdmin !== undefined ? data.unreadByAdmin : (data.unreadAdmin ?? false),
      });
    });

    // Sort with unreadByAdmin or urgent first, then latest lastMessageAt
    list.sort((a, b) => {
      const aUrgent = a.urgent || a.status === 'HUMAN_REQUESTED';
      const bUrgent = b.urgent || b.status === 'HUMAN_REQUESTED';
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;

      if (a.unreadByAdmin && !b.unreadByAdmin) return -1;
      if (!a.unreadByAdmin && b.unreadByAdmin) return 1;

      const getTime = (val: any) => {
        if (!val) return 0;
        if (typeof val.toMillis === 'function') return val.toMillis();
        if (typeof val.toDate === 'function') return val.toDate().getTime();
        return new Date(val).getTime() || 0;
      };

      return getTime(b.lastMessageAt) - getTime(a.lastMessageAt);
    });

    onUpdate(list);
  }, (err) => {
    console.warn('[Support Chat] Error subscribing to all conversations:', err);
    onUpdate([]);
  });
}

export async function resolveSupportTicket(chatId: string, adminName: string): Promise<void> {
  const messagesCol = collection(db, 'support_chats', chatId, 'messages');
  await addDoc(messagesCol, {
    senderId: 'admin',
    senderRole: 'ADMIN',
    senderName: adminName,
    text: `✅ Ce ticket de support a été marqué comme résolu par ${adminName}. Vous pouvez poser une nouvelle question à tout moment pour réactiver l'assistance.`,
    type: 'TEXT',
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'support_chats', chatId), {
    status: 'RESOLVED',
    urgent: false,
    unreadByAdmin: false,
    updatedAt: serverTimestamp(),
  });
}

export async function reactivateAiSupport(chatId: string): Promise<void> {
  await updateDoc(doc(db, 'support_chats', chatId), {
    status: 'AI_ASSISTED',
    urgent: false,
    unreadByAdmin: false,
    updatedAt: serverTimestamp(),
  });
}

export async function purgeOldSupportMessages(chatId: string): Promise<number> {
  try {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const msgsCol = collection(db, 'support_chats', chatId, 'messages');
    const snap = await getDocs(msgsCol);
    let deletedCount = 0;
    const batch = writeBatch(db);

    snap.forEach((d) => {
      const data = d.data();
      let msgTime = 0;
      if (data.createdAt) {
        if (typeof data.createdAt.toMillis === 'function') msgTime = data.createdAt.toMillis();
        else if (typeof data.createdAt.toDate === 'function') msgTime = data.createdAt.toDate().getTime();
        else msgTime = new Date(data.createdAt).getTime();
      }
      if (msgTime > 0 && msgTime < cutoff) {
        batch.delete(d.ref);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      await batch.commit();
    }
    return deletedCount;
  } catch (err) {
    console.warn('[Support Chat] Purge old messages error:', err);
    return 0;
  }
}

export interface RealtimeSalesCategory {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  barColor: string;
  revenue: number;
  count: number;
  percentage: number;
}

export interface RealtimeAdminMetrics {
  // KPI Cards
  totalRevenue: number;
  totalDocumentsCount: number;
  totalUsersCount: number;
  totalCirculatingBalance: number;

  // Financial Statistics
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  successRate: number;
  totalAttempts: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;

  // Real Sales Breakdown
  salesBreakdown: RealtimeSalesCategory[];

  // Real users list (for table and synchronizing)
  realtimeUsers: AdminUserRecord[];

  // Real transactions list
  transactions: TransactionRecord[];
}

/**
 * Real-time Firestore onSnapshot synchronization for the Admin Dashboard.
 * 100% genuine data calculated from Firestore collections ('users', 'payments', 'transactions', 'orders', 'user_documents', 'documents', 'generated_cvs').
 */
export function subscribeToRealtimeAdminDashboardMetrics(
  onUpdate: (metrics: RealtimeAdminMetrics) => void,
  onError?: (err: any) => void
): Unsubscribe {
  // Local state caches across listeners
  let cachedUsers: AdminUserRecord[] = [];
  let cachedUsersDocCount = 0;
  let cachedCirculatingBalance = 0;

  let cachedPaymentsDocs: Map<string, any> = new Map();
  let cachedTransactionsDocs: Map<string, any> = new Map();
  let cachedOrdersDocs: Map<string, any> = new Map();

  let userDocsCount = 0;
  let generalDocsCount = 0;
  let generatedCvsCount = 0;

  const calculateAndEmit = () => {
    // 1. Deduplicate payments, transactions, orders into single map
    const mergedTxMap = new Map<string, any>();
    
    // Add transactions first
    cachedTransactionsDocs.forEach((doc, id) => {
      mergedTxMap.set(id, { id, ...doc });
    });
    
    // Add payments (override or supplement)
    cachedPaymentsDocs.forEach((doc, id) => {
      if (!mergedTxMap.has(id)) {
        mergedTxMap.set(id, { id, ...doc });
      } else {
        mergedTxMap.set(id, { ...mergedTxMap.get(id), ...doc });
      }
    });

    // Add orders
    cachedOrdersDocs.forEach((doc, id) => {
      if (!mergedTxMap.has(id)) {
        mergedTxMap.set(id, { id, ...doc });
      }
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const sevenDaysAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();

    let totalRevenue = 0;
    let todayRevenue = 0;
    let weekRevenue = 0;
    let monthRevenue = 0;

    let successfulCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    let duoRev = 0; let duoCount = 0;
    let cvRev = 0; let cvCount = 0;
    let letterRev = 0; let letterCount = 0;
    let unlimitedRev = 0; let unlimitedCount = 0;
    let businessRev = 0; let businessCount = 0;
    let otherRev = 0; let otherCount = 0;

    const allTxList: TransactionRecord[] = [];

    mergedTxMap.forEach((item, id) => {
      const statusRaw = String(item.status || item.paymentStatus || '').toLowerCase().trim();
      const isSuccess = ['completed', 'success', 'validated_by_ai', 'manually_validated', 'paid', 'approved'].includes(statusRaw);
      const isFailed = ['failed', 'rejected', 'rejected_by_ai', 'rejected_by_admin', 'cancelled', 'cancel', 'expired'].includes(statusRaw);
      const isPending = !isSuccess && !isFailed;

      if (isSuccess) successfulCount++;
      else if (isFailed) failedCount++;
      else if (isPending) pendingCount++;

      // Extract amount
      const rawAmt = item.amount ?? item.extractedAmount ?? item.expectedAmount ?? item.price ?? 0;
      const amount = typeof rawAmt === 'number' ? Math.abs(rawAmt) : Math.abs(parseFloat(String(rawAmt).replace(/[^0-9.-]/g, '')) || 0);

      // Parse timestamp
      let txTime = 0;
      if (item.createdAt) {
        if (typeof item.createdAt === 'number') txTime = item.createdAt;
        else if (item.createdAt.seconds) txTime = item.createdAt.seconds * 1000;
        else if (typeof item.createdAt.toMillis === 'function') txTime = item.createdAt.toMillis();
        else if (typeof item.createdAt.toDate === 'function') txTime = item.createdAt.toDate().getTime();
        else {
          const p = new Date(item.createdAt).getTime();
          txTime = isNaN(p) ? 0 : p;
        }
      }

      if (isSuccess) {
        totalRevenue += amount;

        if (txTime > 0) {
          if (txTime >= startOfToday && txTime <= now.getTime()) {
            todayRevenue += amount;
          }
          if (txTime >= sevenDaysAgo) {
            weekRevenue += amount;
          }
          if (txTime >= startOfMonth) {
            monthRevenue += amount;
          }
        }

        // Categorize for product sales breakdown
        const desc = `${item.itemType || ''} ${item.mode || ''} ${item.serviceType || ''} ${item.service || ''} ${item.plan || ''} ${item.formula || ''} ${item.title || ''} ${item.description || ''}`.toLowerCase();

        if (desc.includes('pack duo') || desc.includes('full_pack') || desc.includes('duo') || (desc.includes('cv') && desc.includes('lettre'))) {
          duoRev += amount;
          duoCount++;
        } else if (desc.includes('lettre') || desc.includes('letter_only') || desc.includes('cover_letter') || desc.includes('motivation')) {
          letterRev += amount;
          letterCount++;
        } else if (desc.includes('cv_only') || desc.includes('cv ats') || desc.includes('cv unique') || desc.includes('ats') || desc.includes('cv')) {
          cvRev += amount;
          cvCount++;
        } else if (desc.includes('illimit') || desc.includes('unlimited') || desc.includes('vip') || desc.includes('abonnement') || desc.includes('pass')) {
          unlimitedRev += amount;
          unlimitedCount++;
        } else if (desc.includes('devis') || desc.includes('facture') || desc.includes('business') || desc.includes('entreprise')) {
          businessRev += amount;
          businessCount++;
        } else {
          otherRev += amount;
          otherCount++;
        }
      }

      // Collect transaction record
      allTxList.push({
        id: item.id || id,
        userId: item.userId || item.userUid || 'anonymous',
        userEmail: item.userEmail || item.email,
        amount: item.amount || amount,
        currency: item.currency || 'FCFA',
        extractedAmount: item.extractedAmount || amount,
        expectedAmount: item.expectedAmount || amount,
        type: item.type || 'subscription_or_doc',
        status: item.status || (isSuccess ? 'success' : isFailed ? 'failed' : 'pending'),
        paymentMethod: item.paymentMethod || item.method || 'wave',
        createdAt: item.createdAt || new Date(txTime || Date.now()).toISOString(),
        description: item.description || item.title || item.plan || 'Paiement service Dokya',
        receiptUrl: item.receiptUrl || item.proofUrl || item.extractedReceiptUrl,
        receiptOriginalName: item.receiptOriginalName,
        smsBody: item.smsBody,
        senderPhone: item.senderPhone || item.phoneNumber,
        transactionId: item.transactionId || item.reference || id
      } as TransactionRecord);
    });

    allTxList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const totalAttempts = successfulCount + failedCount + pendingCount;
    const successRate = totalAttempts > 0 ? Math.round((successfulCount / totalAttempts) * 100) : 100;

    const totalSalesSum = duoRev + cvRev + letterRev + unlimitedRev + businessRev + otherRev;

    const salesBreakdown: RealtimeSalesCategory[] = [
      {
        id: 'cv_ats',
        name: 'CV ATS Unique',
        subtitle: '500 FCFA / 1 000 FCFA - Optimisé Recruteurs',
        color: 'teal',
        barColor: 'bg-teal-500',
        revenue: cvRev,
        count: cvCount,
        percentage: totalSalesSum > 0 ? Math.round((cvRev / totalSalesSum) * 100) : 0,
      },
      {
        id: 'duo',
        name: 'Pack Duo (CV + Lettre)',
        subtitle: '1 500 FCFA - Formule Complète IA',
        color: 'emerald',
        barColor: 'bg-emerald-500',
        revenue: duoRev,
        count: duoCount,
        percentage: totalSalesSum > 0 ? Math.round((duoRev / totalSalesSum) * 100) : 0,
      },
      {
        id: 'letter',
        name: 'Lettre de Motivation',
        subtitle: '500 FCFA - Ciblée Offre d\'Emploi',
        color: 'cyan',
        barColor: 'bg-cyan-500',
        revenue: letterRev,
        count: letterCount,
        percentage: totalSalesSum > 0 ? Math.round((letterRev / totalSalesSum) * 100) : 0,
      },
      {
        id: 'unlimited',
        name: 'Pass Illimité (VIP)',
        subtitle: '5 000 FCFA / mois - Accès Candidat Illimité',
        color: 'amber',
        barColor: 'bg-amber-500',
        revenue: unlimitedRev,
        count: unlimitedCount,
        percentage: totalSalesSum > 0 ? Math.round((unlimitedRev / totalSalesSum) * 100) : 0,
      },
      {
        id: 'business',
        name: 'Pack Business & Devis UEMOA',
        subtitle: '1 000 FCFA / 3 000 FCFA - Facturation & Devis',
        color: 'violet',
        barColor: 'bg-violet-500',
        revenue: businessRev,
        count: businessCount,
        percentage: totalSalesSum > 0 ? Math.round((businessRev / totalSalesSum) * 100) : 0,
      }
    ];

    if (otherRev > 0 || otherCount > 0) {
      salesBreakdown.push({
        id: 'other',
        name: 'Recharges Portefeuille & Divers',
        subtitle: 'Crédits portefeuilles & services additionnels',
        color: 'blue',
        barColor: 'bg-blue-500',
        revenue: otherRev,
        count: otherCount,
        percentage: totalSalesSum > 0 ? Math.round((otherRev / totalSalesSum) * 100) : 0,
      });
    }

    const totalDocsCount = userDocsCount + generalDocsCount + generatedCvsCount;

    onUpdate({
      totalRevenue,
      totalDocumentsCount: totalDocsCount,
      totalUsersCount: cachedUsersDocCount,
      totalCirculatingBalance: cachedCirculatingBalance,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      successRate,
      totalAttempts,
      successfulCount,
      failedCount,
      pendingCount,
      salesBreakdown,
      realtimeUsers: cachedUsers,
      transactions: allTxList
    });
  };

  const unsubs: Unsubscribe[] = [];

  // A. Listen to 'users' collection
  try {
    const usersCol = collection(db, 'users');
    const unsubUsers = onSnapshot(usersCol, (snap) => {
      cachedUsersDocCount = snap.size;
      let totalBal = 0;
      const list: AdminUserRecord[] = [];

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const bal = Number(d.walletBalance ?? d.credits ?? d.balance ?? 0);
        totalBal += isNaN(bal) ? 0 : bal;

        list.push({
          uid: docSnap.id,
          email: d.email || 'candidat@dokya.sn',
          firstName: d.firstName || d.personalInfo?.firstName || '',
          lastName: d.lastName || d.personalInfo?.lastName || '',
          phone: d.phone || d.personalInfo?.phone,
          city: d.city || d.personalInfo?.city,
          targetJob: d.targetJob || d.personalInfo?.targetJob,
          balance: bal,
          credits: d.credits || 0,
          subscriptionStatus: d.subscriptionStatus || 'free',
          ordersCount: d.ordersCount || 0,
          documentsCount: d.documentsCount || 0,
          createdAt: d.createdAt || d.updatedAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
          status: d.status || 'active',
          role: d.role === 'admin' ? 'admin' : 'candidate'
        });
      });

      cachedCirculatingBalance = totalBal;
      cachedUsers = list;
      calculateAndEmit();
    }, (err) => {
      console.warn('[Firestore Users Snapshot Warn]:', err);
      if (onError) onError(err);
    });
    unsubs.push(unsubUsers);
  } catch (err) {
    console.warn('[Firestore Users Listen Init Warn]:', err);
  }

  // B. Listen to 'transactions' collection
  try {
    const txCol = collection(db, 'transactions');
    const unsubTx = onSnapshot(txCol, (snap) => {
      cachedTransactionsDocs.clear();
      snap.forEach((d) => {
        cachedTransactionsDocs.set(d.id, d.data());
      });
      calculateAndEmit();
    }, (err) => {
      console.warn('[Firestore Transactions Snapshot Warn]:', err);
    });
    unsubs.push(unsubTx);
  } catch (err) {
    console.warn('[Firestore Transactions Listen Init Warn]:', err);
  }

  // C. Listen to 'payments' collection
  try {
    const paymentsCol = collection(db, 'payments');
    const unsubPayments = onSnapshot(paymentsCol, (snap) => {
      cachedPaymentsDocs.clear();
      snap.forEach((d) => {
        cachedPaymentsDocs.set(d.id, d.data());
      });
      calculateAndEmit();
    }, (err) => {
      console.warn('[Firestore Payments Snapshot Warn]:', err);
    });
    unsubs.push(unsubPayments);
  } catch (err) {
    console.warn('[Firestore Payments Listen Init Warn]:', err);
  }

  // D. Listen to 'orders' collection
  try {
    const ordersCol = collection(db, 'orders');
    const unsubOrders = onSnapshot(ordersCol, (snap) => {
      cachedOrdersDocs.clear();
      snap.forEach((d) => {
        cachedOrdersDocs.set(d.id, d.data());
      });
      calculateAndEmit();
    }, (err) => {
      console.warn('[Firestore Orders Snapshot Warn]:', err);
    });
    unsubs.push(unsubOrders);
  } catch (err) {
    console.warn('[Firestore Orders Listen Init Warn]:', err);
  }

  // E. Listen to 'user_documents' collection
  try {
    const userDocsCol = collection(db, 'user_documents');
    const unsubUserDocs = onSnapshot(userDocsCol, (snap) => {
      userDocsCount = snap.size;
      calculateAndEmit();
    }, (err) => {
      console.warn('[Firestore user_documents Snapshot Warn]:', err);
    });
    unsubs.push(unsubUserDocs);
  } catch (err) {
    console.warn('[Firestore user_documents Listen Init Warn]:', err);
  }

  // F. Listen to 'documents' collection
  try {
    const docsCol = collection(db, 'documents');
    const unsubDocs = onSnapshot(docsCol, (snap) => {
      generalDocsCount = snap.size;
      calculateAndEmit();
    }, (err) => {
      // Non-blocking if collection does not exist
    });
    unsubs.push(unsubDocs);
  } catch (err) {
    // Non-blocking
  }

  // G. Listen to 'generated_cvs' collection
  try {
    const cvsCol = collection(db, 'generated_cvs');
    const unsubCvs = onSnapshot(cvsCol, (snap) => {
      generatedCvsCount = snap.size;
      calculateAndEmit();
    }, (err) => {
      // Non-blocking if collection does not exist
    });
    unsubs.push(unsubCvs);
  } catch (err) {
    // Non-blocking
  }

  return () => {
    unsubs.forEach(unsub => {
      try { unsub(); } catch (_e) {}
    });
  };
}

// =========================================================================
// MODULE DE NOTIFICATIONS FIRESTORE (COLLECTION 'notifications')
// =========================================================================

/**
 * Abonne l'utilisateur en temps réel aux notifications de la collection 'notifications'
 */
export function subscribeToUserNotifications(
  userId: string,
  callback: (notifications: DokyaNotification[]) => void
): () => void {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) {
    callback([]);
    return () => {};
  }

  const localKey = `dokya_notifications_${currentUid}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      callback(JSON.parse(raw));
    }
  } catch (e) {}

  try {
    const notifsCol = collection(db, 'notifications');
    const q = query(
      notifsCol,
      where('userId', '==', currentUid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: DokyaNotification[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          userId: data.userId,
          title: data.title || 'Notification',
          message: data.message || '',
          type: data.type || 'info',
          read: !!data.read,
          link: data.link,
          tabTarget: data.tabTarget,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
          metadata: data.metadata
        });
      });
      try {
        localStorage.setItem(localKey, JSON.stringify(list));
      } catch (e) {}
      callback(list);
    }, (err) => {
      // Fallback query if index is absent
      console.warn('[Firestore notifications query warning, using fallback]:', err);
      const fallbackQuery = query(notifsCol, where('userId', '==', currentUid), limit(30));
      onSnapshot(fallbackQuery, (fallbackSnap) => {
        const list: DokyaNotification[] = [];
        fallbackSnap.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            userId: data.userId,
            title: data.title || 'Notification',
            message: data.message || '',
            type: data.type || 'info',
            read: !!data.read,
            link: data.link,
            tabTarget: data.tabTarget,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
            metadata: data.metadata
          });
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        try {
          localStorage.setItem(localKey, JSON.stringify(list));
        } catch (e) {}
        callback(list);
      }, (e2) => {
        console.warn('[Firestore notifications fallback warning]:', e2);
      });
    });

    return unsub;
  } catch (e) {
    console.warn('[subscribeToUserNotifications error]:', e);
    return () => {};
  }
}

/**
 * Crée une notification pour un utilisateur dans la collection Firestore 'notifications'
 */
export async function createNotification(
  userId: string,
  notif: Omit<DokyaNotification, 'id' | 'createdAt'>
): Promise<DokyaNotification> {
  const currentUid = userId || auth.currentUser?.uid || 'guest';
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  const newNotif: DokyaNotification = {
    id: notifId,
    userId: currentUid,
    title: notif.title,
    message: notif.message,
    type: notif.type || 'info',
    read: false,
    link: notif.link,
    tabTarget: notif.tabTarget,
    createdAt: nowIso,
    metadata: notif.metadata
  };

  // Cache local
  try {
    const localKey = `dokya_notifications_${currentUid}`;
    const raw = localStorage.getItem(localKey);
    const list: DokyaNotification[] = raw ? JSON.parse(raw) : [];
    list.unshift(newNotif);
    localStorage.setItem(localKey, JSON.stringify(list.slice(0, 50)));
  } catch (e) {}

  // Enregistrement Firestore
  try {
    const docRef = doc(db, 'notifications', notifId);
    await setDoc(docRef, cleanFirestorePayload({
      ...newNotif,
      createdAt: serverTimestamp()
    }));
  } catch (e) {
    console.warn('[createNotification firestore error]:', e);
  }

  return newNotif;
}

/**
 * Marque une notification comme lue
 */
export async function markNotificationAsRead(notifId: string, userId?: string): Promise<void> {
  const currentUid = userId || auth.currentUser?.uid;
  if (currentUid) {
    try {
      const localKey = `dokya_notifications_${currentUid}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const list: DokyaNotification[] = JSON.parse(raw);
        const target = list.find(n => n.id === notifId);
        if (target) {
          target.read = true;
          localStorage.setItem(localKey, JSON.stringify(list));
        }
      }
    } catch (e) {}
  }

  try {
    const docRef = doc(db, 'notifications', notifId);
    await updateDoc(docRef, {
      read: true,
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    console.warn('[markNotificationAsRead error]:', e);
  }
}

/**
 * Marque toutes les notifications comme lues
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return;

  try {
    const localKey = `dokya_notifications_${currentUid}`;
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: DokyaNotification[] = JSON.parse(raw);
      list.forEach(n => { n.read = true; });
      localStorage.setItem(localKey, JSON.stringify(list));
    }
  } catch (e) {}

  try {
    const notifsCol = collection(db, 'notifications');
    const q = query(notifsCol, where('userId', '==', currentUid), where('read', '==', false));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.update(d.ref, { read: true, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  } catch (e) {
    console.warn('[markAllNotificationsAsRead error]:', e);
  }
}

/**
 * Supprime une notification
 */
export async function deleteNotification(notifId: string, userId?: string): Promise<void> {
  const currentUid = userId || auth.currentUser?.uid;
  if (currentUid) {
    try {
      const localKey = `dokya_notifications_${currentUid}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const list: DokyaNotification[] = JSON.parse(raw);
        const filtered = list.filter(n => n.id !== notifId);
        localStorage.setItem(localKey, JSON.stringify(filtered));
      }
    } catch (e) {}
  }

  try {
    const docRef = doc(db, 'notifications', notifId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('[deleteNotification error]:', e);
  }
}

