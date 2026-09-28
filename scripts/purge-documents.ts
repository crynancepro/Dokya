import { db } from '../src/lib/firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

async function purgeAllTestDocuments() {
  console.log('--- PURGE DES DOCUMENTS DE TEST DOKYA ---');

  // 1. Purge user_documents
  try {
    const userDocsSnap = await getDocs(collection(db, 'user_documents'));
    console.log(`Documents trouvés dans user_documents : ${userDocsSnap.size}`);
    let deletedUserDocs = 0;
    for (const d of userDocsSnap.docs) {
      await deleteDoc(doc(db, 'user_documents', d.id));
      deletedUserDocs++;
    }
    console.log(`✅ user_documents purgés : ${deletedUserDocs}`);
  } catch (err: any) {
    console.error('Erreur purge user_documents:', err.message);
  }

  // 2. Purge documents
  try {
    const docsSnap = await getDocs(collection(db, 'documents'));
    console.log(`Documents trouvés dans documents : ${docsSnap.size}`);
    let deletedDocs = 0;
    for (const d of docsSnap.docs) {
      await deleteDoc(doc(db, 'documents', d.id));
      deletedDocs++;
    }
    console.log(`✅ documents purgés : ${deletedDocs}`);
  } catch (err: any) {
    console.error('Erreur purge documents:', err.message);
  }

  // 3. Purge generated_cvs
  try {
    const genCvsSnap = await getDocs(collection(db, 'generated_cvs'));
    console.log(`Documents trouvés dans generated_cvs : ${genCvsSnap.size}`);
    let deletedGenCvs = 0;
    for (const d of genCvsSnap.docs) {
      await deleteDoc(doc(db, 'generated_cvs', d.id));
      deletedGenCvs++;
    }
    console.log(`✅ generated_cvs purgés : ${deletedGenCvs}`);
  } catch (err: any) {
    console.error('Erreur purge generated_cvs:', err.message);
  }

  // 4. Remise à zéro de documentsCount chez tous les utilisateurs
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    console.log(`Utilisateurs trouvés : ${usersSnap.size}`);
    for (const uDoc of usersSnap.docs) {
      const uData = uDoc.data();
      if (uData.documentsCount || uData.unlockedDocsCount || uData.ordersCount) {
        await updateDoc(doc(db, 'users', uDoc.id), {
          documentsCount: 0,
          unlockedDocsCount: 0,
          ordersCount: 0
        });
      }
    }
    console.log(`✅ documentsCount remis à 0 pour tous les profils utilisateurs`);
  } catch (err: any) {
    console.error('Erreur reset users documentsCount:', err.message);
  }

  console.log('--- PURGE TERMINEE AVEC SUCCES ---');
  process.exit(0);
}

purgeAllTestDocuments();
