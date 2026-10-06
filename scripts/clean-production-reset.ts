import { db } from '../lib/firebaseAdmin.js';

async function main() {
  console.log('=== NETTOYAGE ET RÉINITIALISATION OFFICIELLE DES DONNÉES DE TEST DOKYA ===');

  // 1. Purge des transactions de test
  const txSnap = await db.collection('transactions').get();
  console.log(`Transactions trouvées : ${txSnap.size}`);
  let deletedTx = 0;
  for (const doc of (txSnap.docs || [])) {
    await db.collection('transactions').doc(doc.id).delete();
    deletedTx++;
    console.log(`- Transaction supprimée: ${doc.id}`);
  }
  console.log(`=> Total transactions supprimées: ${deletedTx}`);

  // 2. Purge des paiements
  const paySnap = await db.collection('payments').get();
  console.log(`Paiements trouvés : ${paySnap.size}`);
  let deletedPay = 0;
  for (const doc of (paySnap.docs || [])) {
    await db.collection('payments').doc(doc.id).delete();
    deletedPay++;
    console.log(`- Paiement supprimé: ${doc.id}`);
  }
  console.log(`=> Total paiements supprimés: ${deletedPay}`);

  // 3. Purge des commandes (orders & store_orders)
  const ordSnap = await db.collection('orders').get();
  for (const doc of (ordSnap.docs || [])) {
    await db.collection('orders').doc(doc.id).delete();
  }
  const storeOrdersSnap = await db.collection('store_orders').get();
  for (const doc of (storeOrdersSnap.docs || [])) {
    await db.collection('store_orders').doc(doc.id).delete();
    console.log(`- Commande boutique supprimée: ${doc.id}`);
  }

  // 4. Purge des documents générés de test
  const userDocsSnap = await db.collection('user_documents').get();
  for (const doc of (userDocsSnap.docs || [])) {
    await db.collection('user_documents').doc(doc.id).delete();
    console.log(`- Document utilisateur supprimé: ${doc.id}`);
  }

  const docsSnap = await db.collection('documents').get();
  for (const doc of (docsSnap.docs || [])) {
    await db.collection('documents').doc(doc.id).delete();
  }

  const genCvsSnap = await db.collection('generated_cvs').get();
  for (const doc of (genCvsSnap.docs || [])) {
    await db.collection('generated_cvs').doc(doc.id).delete();
  }

  // 5. Réinitialisation des comptes utilisateurs (Vendeur, Télévendeur, Admin)
  const usersSnap = await db.collection('users').get();
  console.log(`Utilisateurs trouvés : ${usersSnap.size}`);
  for (const doc of (usersSnap.docs || [])) {
    const data = doc.data() || {};
    const email = (data.email || '').toLowerCase().trim();
    const isAdmin = email === 'peter25ngouala@gmail.com';

    await db.collection('users').doc(doc.id).update({
      walletBalance: 0,
      balance: 0,
      credits: 0,
      ordersCount: 0,
      documentsCount: 0,
      role: isAdmin ? 'admin' : (data.role || 'candidate'),
      subscriptionStatus: 'free',
      updatedAt: new Date().toISOString()
    });
    console.log(`- Profil réinitialisé à propre: ${doc.id} (${email})`);
  }

  // 6. Réinitialisation des profils dans 'candidates'
  try {
    const candSnap = await db.collection('candidates').get();
    for (const doc of (candSnap.docs || [])) {
      await db.collection('candidates').doc(doc.id).update({
        walletBalance: 0,
        balance: 0,
        credits: 0,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (_e) {}

  console.log('=== NETTOYAGE TERMINÉ AVEC SUCCÈS : TOUTES LES MÉTRIQUES SONT PARFAITEMENT NEUVES ET RÉINITIALISÉES ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur lors du nettoyage:', err);
  process.exit(1);
});
