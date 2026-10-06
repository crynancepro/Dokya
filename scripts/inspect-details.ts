import { db } from '../lib/firebaseAdmin.js';

async function main() {
  const usersSnap = await db.collection('users').get();
  console.log('--- USERS ---');
  (usersSnap.docs || []).forEach((u: any) => {
    const d = u.data();
    console.log(u.id, d.email, d.role, d.walletBalance, d.documentsCount, d.ordersCount);
  });

  const txSnap = await db.collection('transactions').get();
  console.log('--- TRANSACTIONS ---');
  (txSnap.docs || []).forEach((t: any) => {
    const d = t.data();
    console.log(t.id, d.type, d.amount, d.status, d.userEmail, d.description);
  });

  const ordersSnap = await db.collection('store_orders').get();
  console.log('--- STORE ORDERS ---');
  (ordersSnap.docs || []).forEach((o: any) => {
    const d = o.data();
    console.log(o.id, d.productTitle, d.sellerName, d.telemarketerName, d.status);
  });

  const docsSnap = await db.collection('user_documents').get();
  console.log('--- USER DOCUMENTS ---');
  (docsSnap.docs || []).forEach((doc: any) => {
    const d = doc.data();
    console.log(doc.id, d.userId, d.title, d.createdAt);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
