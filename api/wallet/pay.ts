import { db, FieldValue } from '../../lib/firebaseAdmin.js';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    } else if (!body && typeof req.on === 'function') {
      const raw = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', (chunk: any) => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', () => resolve(''));
      });
      try { body = JSON.parse(raw); } catch { body = {}; }
    }

    const {
      userId,
      documentId,
      itemId,
      docId,
      price,
      amount,
      userEmail: bodyEmail = '',
      userName: bodyName = '',
      itemType = 'document'
    } = body || {};

    const targetUserId = String(userId || '').trim();
    const targetDocId = String(documentId || itemId || docId || '').trim();
    const rawPrice = price !== undefined ? price : (amount !== undefined ? amount : 0);
    const numericPrice = Math.max(0, Number(rawPrice) || 0);

    if (!targetUserId || targetUserId === 'guest') {
      return res.status(400).json({
        success: false,
        error: "Identifiant utilisateur manquant ou session invité."
      });
    }

    if (!targetDocId && itemType !== 'subscription') {
      return res.status(400).json({
        success: false,
        error: "Identifiant du document manquant (documentId)."
      });
    }

    let currentBalance = 0;
    let userEmail = String(bodyEmail || '').trim();
    let userName = String(bodyName || '').trim();

    let userRef: any = null;
    if (db && typeof db.collection === 'function') {
      userRef = db.collection('users').doc(targetUserId);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const uData = userSnap.data() || {};
        currentBalance = Number(uData.walletBalance ?? uData.balance ?? uData.solde ?? 0);
        if (!userEmail) userEmail = uData.email || '';
        if (!userName) userName = `${uData.firstName || ''} ${uData.lastName || ''}`.trim() || uData.displayName || uData.name || 'Utilisateur';
      }
    }

    // Vérification du solde : walletBalance >= price
    if (currentBalance < numericPrice) {
      return res.status(400).json({
        success: false,
        error: "Solde insuffisant",
        reason: "INSUFFICIENT_FUNDS",
        currentBalance,
        requiredPrice: numericPrice,
        message: `Solde insuffisant (${currentBalance.toLocaleString('fr-FR')} FCFA disponible, ${numericPrice.toLocaleString('fr-FR')} FCFA requis). Veuillez recharger votre solde.`
      });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const transactionId = "WAL-" + Date.now();
    const newComputedBalance = Math.max(0, currentBalance - numericPrice);

    if (userRef) {
      // a) Déduis le montant du solde : walletBalance -= price
      const userUpdate: any = {
        walletBalance: FieldValue ? FieldValue.increment(-numericPrice) : newComputedBalance,
        balance: FieldValue ? FieldValue.increment(-numericPrice) : newComputedBalance,
        solde: FieldValue ? FieldValue.increment(-numericPrice) : newComputedBalance,
        lastPaymentAt: nowIso,
        lastPaymentProvider: 'Wallet',
        updatedAt: nowIso
      };

      if (targetDocId && FieldValue) {
        userUpdate.purchasedDocIds = FieldValue.arrayUnion(targetDocId);
      }
      await userRef.set(userUpdate, { merge: true });

      // b) Mets à jour le document 'user_documents/{documentId}'
      if (targetDocId) {
        const docRef = db.collection('user_documents').doc(targetDocId);
        await docRef.set({
          id: targetDocId,
          docId: targetDocId,
          userId: targetUserId,
          isUnlocked: true,
          status: 'UNLOCKED',
          unlocked: true,
          isPaid: true,
          unlockedAt: nowIso,
          paidAt: nowIso,
          paymentMethod: 'WALLET',
          updatedAt: nowIso
        }, { merge: true });
      }

      // Si abonnement
      if (itemType === 'subscription') {
        const planDurationDays = targetDocId === 'annual' ? 365 : (targetDocId === 'weekly' ? 7 : 30);
        const expiresDate = new Date(Date.now() + planDurationDays * 24 * 60 * 60 * 1000).toISOString();
        await userRef.set({
          isVip: true,
          subscriptionStatus: 'ACTIVE',
          vipPlan: targetDocId,
          vipActivatedAt: nowIso,
          subscription: {
            planId: targetDocId,
            status: 'ACTIVE',
            activatedAt: nowIso,
            expiresAt: expiresDate,
            pricePaid: numericPrice,
            paymentMethod: 'WALLET'
          }
        }, { merge: true });
      }

      // c) Enregistre la transaction dans Firestore 'transactions'
      const txRecord = {
        id: transactionId,
        transactionId: transactionId,
        userId: targetUserId,
        userEmail: userEmail || "candidat@dokya.sn",
        userName: userName || "Utilisateur",
        type: itemType === 'document' ? "document_purchase" : "subscription_purchase",
        typeLabel: itemType === 'document' ? "Achat Document" : "Abonnement VIP",
        amount: numericPrice,
        expectedAmount: numericPrice,
        currency: "FCFA",
        status: "SUCCESS",
        paymentMethod: "WALLET",
        documentId: targetDocId || null,
        itemId: targetDocId || null,
        targetDocId: targetDocId || null,
        newBalance: newComputedBalance,
        createdAt: nowIso,
        completedAt: nowIso,
        updatedAt: nowIso
      };
      await db.collection('transactions').doc(transactionId).set(txRecord, { merge: true });

      // d) Envoie une notification dans 'users/{userId}/notifications'
      try {
        await userRef.collection('notifications').add({
          title: "Document débloqué avec succès",
          message: `Votre document a été débloqué avec succès via votre solde Dokya (${numericPrice.toLocaleString('fr-FR')} FCFA).`,
          type: "document_unlocked",
          documentId: targetDocId || null,
          createdAt: nowIso,
          read: false
        });
      } catch (_notifErr) {}
    }

    // e) Renvoie une réponse JSON
    return res.status(200).json({
      success: true,
      message: "Document débloqué avec succès",
      transactionId,
      newBalance: newComputedBalance,
      amount: numericPrice
    });
  } catch (err: any) {
    console.error('[API /api/wallet/pay Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || "Erreur lors du traitement du paiement par solde."
    });
  }
}
