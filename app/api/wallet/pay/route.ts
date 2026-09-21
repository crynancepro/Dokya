import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
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
    } = body;

    const targetUserId = String(userId || '').trim();
    const targetDocId = String(documentId || itemId || docId || '').trim();
    const rawPrice = price !== undefined ? price : (amount !== undefined ? amount : 0);
    const numericPrice = Math.max(0, Number(rawPrice) || 0);

    if (!targetUserId || targetUserId === 'guest') {
      return NextResponse.json(
        { success: false, error: "Identifiant utilisateur manquant ou session invité." },
        { status: 400 }
      );
    }

    if (!targetDocId && itemType !== 'subscription') {
      return NextResponse.json(
        { success: false, error: "Identifiant du document manquant (documentId)." },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          success: false,
          error: "Solde insuffisant",
          reason: "INSUFFICIENT_FUNDS",
          currentBalance,
          requiredPrice: numericPrice,
          message: `Solde insuffisant (${currentBalance.toLocaleString('fr-FR')} FCFA disponible, ${numericPrice.toLocaleString('fr-FR')} FCFA requis). Veuillez recharger votre solde.`
        },
        { status: 400 }
      );
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
    return NextResponse.json({
      success: true,
      message: "Document débloqué avec succès",
      transactionId,
      newBalance: newComputedBalance,
      amount: numericPrice
    });
  } catch (err: any) {
    console.error('[App API /api/wallet/pay Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Erreur lors du traitement du paiement par solde."
      },
      { status: 500 }
    );
  }
}
