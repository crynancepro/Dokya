import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDocs, collection, deleteDoc, updateDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function purgeAllTestData() {
  console.log('--- PURGE OFFICIELLE DES DONNEES DE TEST DOKYA ---');

  // 1. Purge des transactions de test
  const txCol = collection(db, 'transactions');
  const txSnap = await getDocs(txCol);
  console.log(`Transactions trouvées : ${txSnap.size}`);
  let deletedTx = 0;
  for (const d of txSnap.docs) {
    await deleteDoc(doc(db, 'transactions', d.id));
    deletedTx++;
    console.log(`- Transaction supprimée : ${d.id}`);
  }
  console.log(`=> ${deletedTx} transaction(s) effacée(s) de Firestore.`);

  // 2. Purge des paiements
  const payCol = collection(db, 'payments');
  const paySnap = await getDocs(payCol);
  console.log(`Paiements trouvés : ${paySnap.size}`);
  for (const d of paySnap.docs) {
    await deleteDoc(doc(db, 'payments', d.id));
    console.log(`- Paiement supprimé : ${d.id}`);
  }

  // 3. Purge des commandes (orders)
  const ordCol = collection(db, 'orders');
  const ordSnap = await getDocs(ordCol);
  console.log(`Commandes trouvées : ${ordSnap.size}`);
  for (const d of ordSnap.docs) {
    await deleteDoc(doc(db, 'orders', d.id));
    console.log(`- Commande supprimée : ${d.id}`);
  }

  // 4. Remise à zéro des soldes portefeuilles des utilisateurs
  const usersCol = collection(db, 'users');
  const usersSnap = await getDocs(usersCol);
  console.log(`Utilisateurs trouvés : ${usersSnap.size}`);
  let resetUsers = 0;
  for (const d of usersSnap.docs) {
    const data = d.data();
    if (data.walletBalance !== 0 || data.balance !== 0 || data.credits !== 0) {
      await updateDoc(doc(db, 'users', d.id), {
        walletBalance: 0,
        balance: 0,
        credits: 0,
        updatedAt: new Date().toISOString()
      });
      resetUsers++;
      console.log(`- Solde remis à 0 pour l'utilisateur ${d.id} (${data.email || 'candidat'})`);
    }
  }
  console.log(`=> Soldes remis à 0 pour ${resetUsers} utilisateur(s).`);

  console.log('--- PURGE REUSSIE A 100% : LA BASE DE DONNEES EST PARFAITEMENT PROPRE ET VIERGE ---');
  process.exit(0);
}

purgeAllTestData().catch((err) => {
  console.error('Erreur lors de la purge :', err);
  process.exit(1);
});
