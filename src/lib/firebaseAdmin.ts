import admin from 'firebase-admin';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

// Compatibilité pour admin.credential, admin.apps, admin.firestore et admin.auth
if (!(admin as any).credential) {
  (admin as any).credential = {
    cert: (credentials: any) => {
      try {
        return (admin as any).cert ? (admin as any).cert(credentials) : cert(credentials);
      } catch (e) {
        return undefined;
      }
    }
  };
}

if (!(admin as any).apps) {
  Object.defineProperty(admin, 'apps', {
    get: () => getApps()
  });
}

if (!(admin as any).firestore) {
  (admin as any).firestore = (app?: any) => (app ? getFirestore(app) : getFirestore());
}

if (!(admin as any).auth) {
  (admin as any).auth = (app?: any) => (app ? getAuth(app) : getAuth());
}

const FIRESTORE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0865957742';
const FIRESTORE_DATABASE_ID = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-gnrateurdecvlett-49cc73ad-7657-4218-be85-c050974ca976';

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || FIRESTORE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        } as any),
      });
    } else {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || FIRESTORE_PROJECT_ID,
      });
    }
  } catch (error) {
    console.error("Erreur d'initialisation Firebase Admin:", error);
    try {
      if (!getApps().length) {
        initializeApp({ projectId: FIRESTORE_PROJECT_ID });
      }
    } catch (_fallbackErr) {
      // Ignorer si déjà initialisé
    }
  }
}

let firestoreInstance: Firestore;
try {
  firestoreInstance = FIRESTORE_DATABASE_ID && FIRESTORE_DATABASE_ID !== '(default)'
    ? getFirestore(getApp(), FIRESTORE_DATABASE_ID)
    : getFirestore(getApp());
} catch (e) {
  try {
    firestoreInstance = getFirestore();
  } catch (err2: any) {
    console.error('Erreur récupération Firestore Admin:', err2?.message);
    firestoreInstance = {} as any;
  }
}

let authInstance: Auth;
try {
  authInstance = getAuth(getApp());
} catch (e) {
  authInstance = {} as any;
}

export const db = firestoreInstance;
export const auth = authInstance;
export { FieldValue };
export default admin;
