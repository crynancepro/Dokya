import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeApp as initAdminApp, getApps as getAdminApps, getApp as getAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
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
  token = '',
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

  const cleanSearchId = String(searchId || '').trim();
  const cleanInputToken = String(token || '').trim();

  // 1. Localiser l'ID réel du document dans Firestore et ses identifiants uniques
  let targetDocId = cleanSearchId;
  let foundTxData = null;

  if (cleanSearchId) {
    const directDocRef = doc(rawFirestore, 'transactions', cleanSearchId);
    const directSnap = await getDoc(directDocRef);
    if (directSnap.exists()) {
      foundTxData = directSnap.data();
      targetDocId = cleanSearchId;
    } else {
      try {
        const q = query(collection(rawFirestore, 'transactions'), where('transactionId', '==', cleanSearchId), limit(1));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          targetDocId = qSnap.docs[0].id;
          foundTxData = qSnap.docs[0].data();
        } else {
          const qToken = query(collection(rawFirestore, 'transactions'), where('token', '==', cleanSearchId), limit(1));
          const qTokenSnap = await getDocs(qToken);
          if (!qTokenSnap.empty) {
            targetDocId = qTokenSnap.docs[0].id;
            foundTxData = qTokenSnap.docs[0].data();
          } else {
            const qTokenPay = query(collection(rawFirestore, 'transactions'), where('tokenPay', '==', cleanSearchId), limit(1));
            const qPaySnap = await getDocs(qTokenPay);
            if (!qPaySnap.empty) {
              targetDocId = qPaySnap.docs[0].id;
              foundTxData = qPaySnap.docs[0].data();
            }
          }
        }
      } catch (_e) {}
    }
  }

  // Si toujours non trouvé, recherche par le token d'entrée
  if (!foundTxData && cleanInputToken) {
    try {
      const qInToken = query(collection(rawFirestore, 'transactions'), where('token', '==', cleanInputToken), limit(1));
      const qInSnap = await getDocs(qInToken);
      if (!qInSnap.empty) {
        targetDocId = qInSnap.docs[0].id;
        foundTxData = qInSnap.docs[0].data();
      }
    } catch (_e) {}
  }

  // Si toujours non trouvé et que l'utilisateur est identifié, rechercher sa dernière transaction en attente (PENDING)
  if (!foundTxData && effectiveUserId && effectiveUserId !== 'guest') {
    try {
      const qPending = query(
        collection(rawFirestore, 'transactions'),
        where('userId', '==', effectiveUserId),
        where('status', '==', 'PENDING'),
        limit(1)
      );
      const qPendingSnap = await getDocs(qPending);
      if (!qPendingSnap.empty) {
        targetDocId = qPendingSnap.docs[0].id;
        foundTxData = qPendingSnap.docs[0].data();
        console.log(`[Atomic Lock] Transaction rattachée au PENDING existant de l'utilisateur: ${targetDocId}`);
      }
    } catch (_e) {}
  }

  // Détermination du token Money Fusion unique pour le double verrou
  const primaryToken = String(
    cleanInputToken ||
    foundTxData?.token ||
    foundTxData?.tokenPay ||
    (!cleanSearchId.startsWith('MF-') ? cleanSearchId : '')
  ).trim();

  const originalTransactionId = String(foundTxData?.transactionId || targetDocId || cleanSearchId).trim();
  const txDocRef = doc(rawFirestore, 'transactions', targetDocId);
  const lockTargetRef = doc(rawFirestore, 'payment_locks', targetDocId);
  const lockTokenRef = primaryToken ? doc(rawFirestore, 'payment_locks', primaryToken) : null;
  const lockTxIdRef = (originalTransactionId && originalTransactionId !== targetDocId) 
    ? doc(rawFirestore, 'payment_locks', originalTransactionId) 
    : null;

  const nowIso = new Date().toISOString();
  const resolvedCreatedAt = foundTxData?.createdAt || nowIso;

  // 2. Transaction Firestore ACID : Toutes les lectures d'abord, puis toutes les écritures
  return await firestoreRunTransaction(rawFirestore, async (transaction) => {
    // LECTURES
    const txSnap = await transaction.get(txDocRef);
    const lockTargetSnap = await transaction.get(lockTargetRef);
    const lockTokenSnap = lockTokenRef ? await transaction.get(lockTokenRef) : null;
    const lockTxIdSnap = lockTxIdRef ? await transaction.get(lockTxIdRef) : null;

    // VERIFICATION 1 : Le verrou de paiement est-il déjà posé ?
    if (lockTargetSnap.exists()) {
      console.log(`[Atomic Lock] Verrou payment_locks/${targetDocId} déjà présent. Double crédit neutralisé.`);
      return { alreadyProcessed: true, success: true, transactionId: targetDocId };
    }
    if (lockTokenSnap && lockTokenSnap.exists()) {
      console.log(`[Atomic Lock] Verrou payment_locks/${primaryToken} (token) déjà présent. Double crédit neutralisé.`);
      return { alreadyProcessed: true, success: true, transactionId: targetDocId };
    }
    if (lockTxIdSnap && lockTxIdSnap.exists()) {
      console.log(`[Atomic Lock] Verrou payment_locks/${originalTransactionId} (txId) déjà présent. Double crédit neutralisé.`);
      return { alreadyProcessed: true, success: true, transactionId: targetDocId };
    }

    // VERIFICATION 2 : Statut de la transaction dans transactions
    if (txSnap.exists()) {
      const txData = txSnap.data();
      if (txData?.status === 'SUCCESS' || txData?.isProcessed === true) {
        console.log(`[Atomic Lock] Transaction ${targetDocId} déjà SUCCESS / isProcessed: true. Double crédit neutralisé.`);
        return { alreadyProcessed: true, success: true, transactionId: targetDocId };
      }
    }

    let userSnap = null;
    let userDocRef = null;
    let profileSnap = null;
    let profileDocRef = null;

    if (effectiveUserId && effectiveUserId !== 'guest') {
      userDocRef = doc(rawFirestore, 'users', effectiveUserId);
      userSnap = await transaction.get(userDocRef);

      profileDocRef = doc(rawFirestore, 'user_profiles', effectiveUserId);
      profileSnap = await transaction.get(profileDocRef);
    }

    // ECRITURES

    // A) Poser les verrous atomiques permanents
    const lockPayload = {
      processedAt: nowIso,
      amount: numericAmount,
      userId: effectiveUserId || 'anonymous',
      targetDocId,
      primaryToken: primaryToken || null,
      transactionId: originalTransactionId
    };
    transaction.set(lockTargetRef, lockPayload);
    if (lockTokenRef) {
      transaction.set(lockTokenRef, lockPayload);
    }
    if (lockTxIdRef) {
      transaction.set(lockTxIdRef, lockPayload);
    }

    // B) Mettre à jour la transaction principale à SUCCESS
    const mainTxRecord = {
      id: targetDocId,
      transactionId: originalTransactionId,
      token: primaryToken || null,
      tokenPay: primaryToken || null,
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
      createdAt: resolvedCreatedAt,
      updatedAt: nowIso,
      paymentGateway: 'Money Fusion',
      paymentMethod: 'moneyfusion'
    };
    transaction.set(txDocRef, mainTxRecord, { merge: true });

    // C) Si un token séparé existe, créer / mettre à jour l'alias miroir à SUCCESS
    if (primaryToken && primaryToken !== targetDocId) {
      const tokenDocRef = doc(rawFirestore, 'transactions', primaryToken);
      transaction.set(tokenDocRef, {
        ...mainTxRecord,
        id: primaryToken,
        linkedTxId: targetDocId
      }, { merge: true });
    }

    // D) Mise à jour unique et certifiée du solde utilisateur
    if (userDocRef && userSnap) {
      const prevBal = userSnap.exists() ? Number(userSnap.data()?.walletBalance ?? userSnap.data()?.balance ?? userSnap.data()?.solde ?? 0) : 0;
      const validPrev = isNaN(prevBal) ? 0 : Math.max(0, prevBal);
      const newBal = validPrev + numericAmount;

      transaction.set(userDocRef, {
        walletBalance: newBal,
        balance: newBal,
        solde: newBal,
        lastPaymentAt: nowIso,
        lastPaymentProvider: 'Money Fusion',
        updatedAt: nowIso
      }, { merge: true });

      if (profileDocRef && profileSnap && profileSnap.exists()) {
        transaction.set(profileDocRef, {
          balance: newBal,
          walletBalance: newBal,
          updatedAt: nowIso
        }, { merge: true });
      }

      console.log(`[Atomic Lock] Solde crédité avec succès pour ${effectiveUserId}: ${validPrev} -> ${newBal} FCFA (+${numericAmount})`);
      return { alreadyProcessed: false, success: true, newBalance: newBal, transactionId: targetDocId };
    }

    return { alreadyProcessed: false, success: true, transactionId: targetDocId };
  });
}

export { rawFirestore, firestoreRunTransaction as runTransaction, doc as rawDocRef };

// Initialize Admin SDK Auth for server-side user management
let adminSdkApp = null;
let adminAuth = null;
try {
  adminSdkApp = getAdminApps().length > 0 ? getAdminApp() : initAdminApp({ projectId: FIRESTORE_PROJECT_ID });
  adminAuth = getAdminAuth(adminSdkApp);
} catch (e) {
  console.warn('[firebaseAdmin] Warning initializing firebase-admin Auth:', e.message);
}

export { adminAuth };

export const admin = {
  firestore: () => dbAdmin,
  auth: () => {
    return {
      async deleteUser(uid) {
        if (adminAuth && typeof adminAuth.deleteUser === 'function') {
          return await adminAuth.deleteUser(uid);
        }
        console.warn(`[admin.auth] deleteUser warning: adminAuth not available for uid ${uid}`);
        return true;
      },
      async getUser(uid) {
        if (adminAuth && typeof adminAuth.getUser === 'function') {
          return await adminAuth.getUser(uid);
        }
        return null;
      },
      async updateUser(uid, properties) {
        if (adminAuth && typeof adminAuth.updateUser === 'function') {
          return await adminAuth.updateUser(uid, properties);
        }
        return null;
      }
    };
  },
  apps: [app],
  app: () => app
};

admin.firestore.FieldValue = FieldValue;

export const adminCompat = admin;
export default admin;
