import admin from 'firebase-admin';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Compatibilité ESM / CommonJS pour admin
if (!admin.credential) {
  admin.credential = {
    cert: (credentials) => {
      try {
        return cert(credentials);
      } catch (e) {
        return credentials;
      }
    }
  };
}

if (!admin.apps) {
  Object.defineProperty(admin, 'apps', {
    get: () => getApps()
  });
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0865957742';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;
const databaseId = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-gnrateurdecvlett-49cc73ad-7657-4218-be85-c050974ca976';

let app;
if (!getApps().length) {
  try {
    if (clientEmail && privateKey) {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      app = initializeApp({
        projectId,
      });
    }
  } catch (error) {
    console.error("Erreur d'initialisation Firebase Admin:", error);
    try {
      app = getApps().length > 0 ? getApp() : initializeApp({ projectId });
    } catch (_fallbackErr) {
      // Ignorer
    }
  }
} else {
  app = getApp();
}

let firestoreInstance;
try {
  if (databaseId && databaseId !== '(default)') {
    firestoreInstance = getFirestore(app, databaseId);
  } else {
    firestoreInstance = getFirestore(app);
  }
} catch (e) {
  try {
    firestoreInstance = getFirestore();
  } catch (err2) {
    console.error('Erreur récupération Firestore Admin:', err2?.message);
  }
}

if (!admin.firestore) {
  admin.firestore = (appInstance) => (appInstance ? getFirestore(appInstance) : (firestoreInstance || getFirestore()));
  admin.firestore.FieldValue = FieldValue;
} else if (!admin.firestore.FieldValue) {
  admin.firestore.FieldValue = FieldValue;
}

export const dbAdmin = firestoreInstance || admin.firestore();
export const db = dbAdmin;
export { FieldValue };
export const auth = app ? getAuth(app) : undefined;
export default admin;
