import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0865957742",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:416474571173:web:07add45cea04518ffe084c",
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDrIGI9XiDRwq8Q7WDEHcbmhQGzy38skc4",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0865957742.firebaseapp.com",
  firestoreDatabaseId: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-gnrateurdecvlett-49cc73ad-7657-4218-be85-c050974ca976",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0865957742.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "416474571173"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let dbInstance;
try {
  dbInstance = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
} catch (_err) {
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
export const auth = getAuth(app);
export { app };
export default db;
