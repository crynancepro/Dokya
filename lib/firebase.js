// Re-export both for CommonJS and ESM bundlers on Vercel / Node.js
export * from '../src/lib/firebase';
export { db, auth, storage } from '../src/lib/firebase';
