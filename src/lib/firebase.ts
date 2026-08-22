import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, getDocFromServer, setDoc, deleteDoc, 
  collection, query, where, getDocs 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CandidateProfile, SavedUserDocument, TransactionRecord, GenerationMode, CVFormData, AIOptimizedData } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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
    await setDoc(txDocRef, tx);
    return true;
  } catch (error) {
    console.warn('Could not save transaction to Firestore:', error);
    return false;
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
  const path = `user_documents/${userDoc.id}`;
  try {
    const docRef = doc(db, 'user_documents', userDoc.id);
    await setDoc(docRef, userDoc);
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
