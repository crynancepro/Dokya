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
    doc: (colName, docId) => createDocRef(raw, colName, docId)
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

const adminCompat = {
  firestore: () => dbAdmin,
  auth: () => auth,
  apps: [app],
  app: () => app
};

adminCompat.firestore.FieldValue = FieldValue;

export default adminCompat;
