import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  limit,
  orderBy,
  getDocs,
  runTransaction as firestoreRunTransaction,
  increment as firestoreIncrement,
  arrayUnion as firestoreArrayUnion,
  arrayRemove as firestoreArrayRemove,
  serverTimestamp as firestoreServerTimestamp,
  deleteField as firestoreDeleteField
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const FIRESTORE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0865957742';
const FIRESTORE_DATABASE_ID = 'ai-studio-gnrateurdecvlett-49cc73ad-7657-4218-be85-c050974ca976';
const FIRESTORE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDrIGI9XiDRwq8Q7WDEHcbmhQGzy38skc4';
const FIRESTORE_APP_ID = process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || '1:416474571173:web:07add45cea04518ffe084c';

const firebaseConfig = {
  projectId: FIRESTORE_PROJECT_ID,
  apiKey: FIRESTORE_API_KEY,
  appId: FIRESTORE_APP_ID,
  firestoreDatabaseId: FIRESTORE_DATABASE_ID
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const rawFirestore = getFirestore(app, FIRESTORE_DATABASE_ID);

function wrapDocSnap(snap) {
  const isEx = snap.exists();
  return {
    id: snap.id,
    exists: isEx,
    ref: snap.ref,
    data: () => snap.data() || {}
  };
}

function createDocRef(raw, colPath, docId) {
  const dRef = doc(raw, colPath, docId);
  return {
    id: docId,
    path: `${colPath}/${docId}`,
    async get() {
      const snap = await getDoc(dRef);
      return wrapDocSnap(snap);
    },
    async set(data, options = {}) {
      return await setDoc(dRef, data, { merge: options?.merge !== false });
    },
    async update(data) {
      return await updateDoc(dRef, data);
    },
    async delete() {
      return await deleteDoc(dRef);
    },
    collection(subColName) {
      return createColRef(raw, `${colPath}/${docId}/${subColName}`);
    }
  };
}

function createColRef(raw, colPath) {
  const cRef = collection(raw, colPath);
  return {
    path: colPath,
    doc(docId) {
      const id = docId || ('id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
      return createDocRef(raw, colPath, id);
    },
    async add(data) {
      const res = await addDoc(cRef, data);
      return { id: res.id };
    },
    async get() {
      const snap = await getDocs(cRef);
      return {
        empty: snap.empty,
        size: snap.size,
        docs: snap.docs.map(wrapDocSnap)
      };
    },
    where(field, op, value) {
      return this.buildQuery([{ type: 'where', field, op, value }]);
    },
    limit(n) {
      return this.buildQuery([{ type: 'limit', value: n }]);
    },
    orderBy(field, dir = 'asc') {
      return this.buildQuery([{ type: 'orderBy', field, dir }]);
    },
    buildQuery(clauses = []) {
      const self = this;
      const currentClauses = [...clauses];
      return {
        where(field, op, value) {
          return self.buildQuery([...currentClauses, { type: 'where', field, op, value }]);
        },
        limit(n) {
          return self.buildQuery([...currentClauses, { type: 'limit', value: n }]);
        },
        orderBy(field, dir = 'asc') {
          return self.buildQuery([...currentClauses, { type: 'orderBy', field, dir }]);
        },
        async get() {
          const constraints = currentClauses.map(c => {
            if (c.type === 'where') return where(c.field, c.op, c.value);
            if (c.type === 'limit') return limit(c.value);
            if (c.type === 'orderBy') return orderBy(c.field, c.dir);
            return null;
          }).filter(Boolean);
          const q = query(cRef, ...constraints);
          const snap = await getDocs(q);
          return {
            empty: snap.empty,
            size: snap.size,
            docs: snap.docs.map(wrapDocSnap)
          };
        }
      };
    }
  };
}

export function createDbAdapter(raw = rawFirestore) {
  return {
    collection: (colName) => createColRef(raw, colName),
    doc: (colName, docId) => createDocRef(raw, colName, docId),
    runTransaction: (fn) => firestoreRunTransaction(raw, fn)
  };
}

export const dbAdmin = createDbAdapter(rawFirestore);
export const db = dbAdmin;

export const FieldValue = {
  increment: (n) => firestoreIncrement(n),
  arrayUnion: (...elements) => firestoreArrayUnion(...elements),
  arrayRemove: (...elements) => firestoreArrayRemove(...elements),
  serverTimestamp: () => firestoreServerTimestamp(),
  delete: () => firestoreDeleteField()
};

export const auth = getAuth(app);

/**
 * Exécution ATOMIQUE et IDEMPOTENTE du crédit de portefeuille avec verrou Firestore
 * Garantit qu'une transaction n'est créditée qu'une et UNE SEULE FOIS,
 * même si Money Fusion envoie plusieurs webhooks en parallèle simultanément.
 */
export async function executeAtomicPaymentCredit({
  searchId,
  effectiveUserId,
  effectiveAmount,
  userEmail = '',
  userName = '',
  phoneNumber = ''
}) {
  const numericAmount = Math.max(0, Math.round(Number(effectiveAmount) || 0));
  if (numericAmount <= 0) {
    return { alreadyProcessed: false, success: false, reason: 'Montant nul ou invalide' };
  }

  // 1. Localiser l'ID réel du document dans Firestore
  let targetDocId = searchId;
  const directDocRef = doc(rawFirestore, 'transactions', searchId);
  const directSnap = await getDoc(directDocRef);
  if (!directSnap.exists()) {
    try {
      const q = query(collection(rawFirestore, 'transactions'), where('transactionId', '==', searchId), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        targetDocId = qSnap.docs[0].id;
      } else {
        const qToken = query(collection(rawFirestore, 'transactions'), where('token', '==', searchId), limit(1));
        const qTokenSnap = await getDocs(qToken);
        if (!qTokenSnap.empty) {
          targetDocId = qTokenSnap.docs[0].id;
        } else {
          const qTokenPay = query(collection(rawFirestore, 'transactions'), where('tokenPay', '==', searchId), limit(1));
          const qPaySnap = await getDocs(qTokenPay);
          if (!qPaySnap.empty) {
            targetDocId = qPaySnap.docs[0].id;
          }
        }
      }
    } catch (_e) {}
  }

  const txDocRef = doc(rawFirestore, 'transactions', targetDocId);
  const nowIso = new Date().toISOString();

  // 2. Transaction Firestore ACID : Toutes les lectures d'abord, puis toutes les écritures
  return await firestoreRunTransaction(rawFirestore, async (transaction) => {
    const txSnap = await transaction.get(txDocRef);

    // Si la transaction a DÉJÀ été créditée/traitée (statut SUCCESS ou isProcessed: true)
    if (txSnap.exists()) {
      const txData = txSnap.data();
      if (txData.status === 'SUCCESS' || txData.isProcessed === true) {
        console.log(`[Atomic Lock] Transaction ${targetDocId} déjà traitée (isProcessed: true). Double crédit neutralisé.`);
        return { alreadyProcessed: true, success: true, transactionId: targetDocId };
      }
    }

    let userSnap = null;
    let userDocRef = null;
    if (effectiveUserId && effectiveUserId !== 'guest') {
      userDocRef = doc(rawFirestore, 'users', effectiveUserId);
      userSnap = await transaction.get(userDocRef);
    }

    // Écritures :
    // A) Mise à jour de la transaction à SUCCESS + isProcessed: true
    transaction.set(txDocRef, {
      id: targetDocId,
      transactionId: targetDocId,
      userId: effectiveUserId || 'anonymous',
      userEmail: userEmail || (txSnap.exists() ? txSnap.data()?.userEmail : '') || '',
      userName: userName || (txSnap.exists() ? txSnap.data()?.userName : '') || 'Utilisateur',
      phoneNumber: phoneNumber || (txSnap.exists() ? txSnap.data()?.phoneNumber : '') || '',
      type: 'wallet_recharge',
      resolvedType: 'wallet',
      amount: numericAmount,
      expectedAmount: numericAmount,
      currency: 'XOF',
      status: 'SUCCESS',
      isProcessed: true,
      paidAt: nowIso,
      processedAt: nowIso,
      completedAt: nowIso,
      updatedAt: nowIso,
      paymentGateway: 'Money Fusion',
      paymentMethod: 'moneyfusion'
    }, { merge: true });

    // B) Mise à jour unique du solde utilisateur
    if (userDocRef && userSnap) {
      const prevBal = userSnap.exists() ? Number(userSnap.data()?.walletBalance ?? userSnap.data()?.balance ?? 0) : 0;
      const validPrev = isNaN(prevBal) ? 0 : prevBal;
      const newBal = validPrev + numericAmount;

      transaction.set(userDocRef, {
        walletBalance: newBal,
        balance: newBal,
        solde: newBal,
        lastPaymentAt: nowIso,
        lastPaymentProvider: 'Money Fusion',
        updatedAt: nowIso
      }, { merge: true });

      console.log(`[Atomic Lock] Solde crédité avec succès pour ${effectiveUserId}: ${validPrev} -> ${newBal} FCFA (+${numericAmount})`);
      return { alreadyProcessed: false, success: true, newBalance: newBal, transactionId: targetDocId };
    }

    return { alreadyProcessed: false, success: true, transactionId: targetDocId };
  });
}

export { rawFirestore, firestoreRunTransaction as runTransaction, doc as rawDocRef };

const adminCompat = {
  firestore: () => dbAdmin,
  auth: () => auth,
  apps: [app],
  app: () => app
};

adminCompat.firestore.FieldValue = FieldValue;

export default adminCompat;
