import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const FIRESTORE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0865957742';
const FIRESTORE_DATABASE_ID = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-gnrateurdecvlett-49cc73ad-7657-4218-be85-c050974ca976';

function initAdminApp() {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (serviceAccountKey) {
      try {
        const creds = JSON.parse(serviceAccountKey);
        return initializeApp({
          credential: cert(creds),
          projectId: creds.project_id || FIRESTORE_PROJECT_ID
        });
      } catch (err: any) {
        console.warn('[firebaseAdmin] Erreur parsing credentials, utilisation projectId direct:', err?.message);
        return initializeApp({ projectId: FIRESTORE_PROJECT_ID });
      }
    } else {
      return initializeApp({ projectId: FIRESTORE_PROJECT_ID });
    }
  }
  return getApp();
}

const adminApp = initAdminApp();

export const db = FIRESTORE_DATABASE_ID && FIRESTORE_DATABASE_ID !== '(default)'
  ? getFirestore(adminApp, FIRESTORE_DATABASE_ID)
  : getFirestore(adminApp);

export { adminApp, initAdminApp };
export default db;
