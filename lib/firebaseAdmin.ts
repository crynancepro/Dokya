import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
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
  deleteField as firestoreDeleteField,
  Firestore,
  DocumentSnapshot,
  QuerySnapshot,
  WhereFilterOp,
  OrderByDirection
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

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

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const rawFirestore: Firestore = getFirestore(app, FIRESTORE_DATABASE_ID);

function wrapDocSnap(snap: DocumentSnapshot) {
  const isEx = snap.exists();
  return {
    id: snap.id,
    exists: isEx,
    ref: snap.ref,
    data: () => snap.data() || {}
  };
}

function createDocRef(raw: Firestore, colPath: string, docId: string) {
  const dRef = doc(raw, colPath, docId);
  return {
    id: docId,
    path: `${colPath}/${docId}`,
    async get() {
      const snap = await getDoc(dRef);
      return wrapDocSnap(snap);
    },
    async set(data: any, options: { merge?: boolean } = {}) {
      return await setDoc(dRef, data, { merge: options?.merge !== false });
    },
    async update(data: any) {
      return await updateDoc(dRef, data);
    },
    async delete() {
      return await deleteDoc(dRef);
    },
    collection(subColName: string) {
      return createColRef(raw, `${colPath}/${docId}/${subColName}`);
    }
  };
}

function createColRef(raw: Firestore, colPath: string) {
  const cRef = collection(raw, colPath);
  return {
    path: colPath,
    doc(docId?: string) {
      const id = docId || ('id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
      return createDocRef(raw, colPath, id);
    },
    async add(data: any) {
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
    where(field: string, op: WhereFilterOp, value: any) {
      return this.buildQuery([{ type: 'where', field, op, value }]);
    },
    limit(n: number) {
      return this.buildQuery([{ type: 'limit', value: n }]);
    },
    orderBy(field: string, dir: OrderByDirection = 'asc') {
      return this.buildQuery([{ type: 'orderBy', field, dir }]);
    },
    buildQuery(clauses: any[] = []) {
      const self = this;
      const currentClauses = [...clauses];
      return {
        where(field: string, op: WhereFilterOp, value: any) {
          return self.buildQuery([...currentClauses, { type: 'where', field, op, value }]);
        },
        limit(n: number) {
          return self.buildQuery([...currentClauses, { type: 'limit', value: n }]);
        },
        orderBy(field: string, dir: OrderByDirection = 'asc') {
          return self.buildQuery([...currentClauses, { type: 'orderBy', field, dir }]);
        },
        async get() {
          const constraints: any[] = currentClauses.map(c => {
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

export function createDbAdapter(raw: Firestore = rawFirestore): any {
  return {
    collection: (colName: string) => createColRef(raw, colName),
    doc: (colName: string, docId: string) => createDocRef(raw, colName, docId)
  };
}

export const dbAdmin: any = createDbAdapter(rawFirestore);
export const db: any = dbAdmin;

export const FieldValue: any = {
  increment: (n: number) => firestoreIncrement(n),
  arrayUnion: (...elements: any[]) => firestoreArrayUnion(...elements),
  arrayRemove: (...elements: any[]) => firestoreArrayRemove(...elements),
  serverTimestamp: () => firestoreServerTimestamp(),
  delete: () => firestoreDeleteField()
};

export const auth: Auth = getAuth(app);

const adminCompat: any = {
  firestore: () => dbAdmin,
  auth: () => auth,
  apps: [app],
  app: () => app
};

adminCompat.firestore.FieldValue = FieldValue;

export default adminCompat;
