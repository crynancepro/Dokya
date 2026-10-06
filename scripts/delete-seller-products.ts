import { dbAdmin } from '../lib/firebaseAdmin.js';

async function deleteAllProducts() {
  console.log('--- SUPPRESSION DU CATALOGUE PRODUITS / OFFRES MARKETPLACE SUR LES COMPTES VENDEURS ---');
  const snap = await dbAdmin.collection('products').get();
  console.log(`Nombre de produits trouvés dans Firestore : ${snap.size}`);

  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    await dbAdmin.collection('products').doc(doc.id).delete();
    count++;
    console.log(`- Produit supprimé : ${doc.id} (Titre: ${data.title || 'Sans titre'}, Vendeur: ${data.sellerName || data.userId || 'Inconnu'})`);
  }

  console.log(`=> ${count} produit(s) supprimé(s) de Firestore avec succès.`);
  process.exit(0);
}

deleteAllProducts().catch(err => {
  console.error('Erreur lors de la suppression des produits :', err);
  process.exit(1);
});
