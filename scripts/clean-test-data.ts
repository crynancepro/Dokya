import { db } from '../lib/firebaseAdmin.js';

async function main() {
  console.log('--- Inspecting collections ---');
  const collections = [
    'transactions', 
    'payments', 
    'orders', 
    'user_documents', 
    'documents', 
    'generated_cvs', 
    'store_orders', 
    'seller_reviews', 
    'users'
  ];

  for (const col of collections) {
    try {
      const snap = await db.collection(col).get();
      console.log(`Collection ${col}: ${snap.size} documents`);
    } catch (err: any) {
      console.warn(`Error reading ${col}:`, err?.message || err);
    }
  }
}

main().catch(console.error);
