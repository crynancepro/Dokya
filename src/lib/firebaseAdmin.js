import admin from 'firebase-admin';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Compatibilité pour admin.credential, admin.apps, admin.firestore et admin.auth
if (!admin.credential) {
  admin.credential = {
    cert: (credentials) => {
      try {
        return admin.cert ? admin.cert(credentials) : cert(credentials);
      } catch (e) {
        return undefined;
      }
    }
  };
}

if (!admin.apps) {
  Object.defineProperty(admin, 'apps', {
    get: () => getApps()
  });
}

if (!admin.firestore) {
  admin.firestore = (app) => (app ? getFirestore(app) : getFirestore());
}

if (!admin.auth) {
  admin.auth = (app) => (app ? getAuth(app) : getAuth());
}

const FIRESTORE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0865957742';
const FIRESTORE_DATABASE_ID = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-gnrateurdecvlett-49cc73ad-7657-4218-be85-c050974ca976';

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || FIRESTORE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : undefined,
        }),
      });
    } else {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || FIRESTORE_PROJECT_ID,
      });
    }
  } catch (error) {
    console.error("Erreur d'initialisation Firebase Admin:", error);
    try {
      if (!admin.apps.length) {
        admin.initializeApp({ projectId: FIRESTORE_PROJECT_ID });
      }
    } catch (_fallbackErr) {
      // Ignorer si déjà initialisé
    }
  }
}

let firestoreInstance;
try {
  firestoreInstance = FIRESTORE_DATABASE_ID && FIRESTORE_DATABASE_ID !== '(default)'
    ? getFirestore(getApp(), FIRESTORE_DATABASE_ID)
    : admin.firestore();
} catch (e) {
  try {
    firestoreInstance = admin.firestore();
  } catch (err2) {
    console.error('Erreur récupération Firestore Admin:', err2?.message);
    firestoreInstance = null;
  }
}

let authInstance;
try {
  authInstance = admin.auth();
} catch (e) {
  authInstance = null;
}

export const db = firestoreInstance;
export const auth = authInstance;
export { FieldValue };
export default admin;
