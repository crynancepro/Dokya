import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin'; // Utilise impérativement Firebase Admin SDK
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req) {
  try {
    const rawBody = await req.text();
    console.log("=== WEBHOOK BRUT RECEVOIR ===", rawBody);

    let body = {};
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.warn("⚠️ Impossible de parser le JSON brut, fallback sur req.json() ou query");
    }

    // Récupération des paramètres URL éventuels
    const url = new URL(req.url, 'http://localhost');
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Extraction souple des données sous tous les formats possibles de Money Fusion
    const personalInfo = Array.isArray(body.personal_Info)
      ? (body.personal_Info[0] || {})
      : (body.personal_Info || {});

    const metadata = body.metadata || body.custom_data || body.customData || {};
    const articleData = Array.isArray(body.article) ? (body.article[0] || {}) : (body.article || {});

    const userId = personalInfo.userId ||
      body.userId ||
      metadata.userId ||
      queryParams.userId ||
      articleData.userId;

    const docId = personalInfo.docId ||
      body.docId ||
      metadata.docId ||
      queryParams.docId ||
      articleData.docId;

    const type = (personalInfo.type ||
      body.type ||
      metadata.type ||
      queryParams.type ||
      articleData.type || '').toLowerCase();

    const plan = personalInfo.plan ||
      personalInfo.planId ||
      body.plan ||
      body.planId ||
      metadata.plan ||
      metadata.planId ||
      queryParams.plan;

    // Récupération du montant
    let amount = Number(
      body.totalPrice ||
      body.amount ||
      body.Montant ||
      personalInfo.amount ||
      metadata.amount ||
      queryParams.amount ||
      0
    );

    // Vérification du statut de paiement (PAID, SUCCESS, SUCCES, true, ou status 200)
    const rawStatus = String(body.statut ?? body.status ?? queryParams.status ?? '').toUpperCase();
    const isSuccess =
      rawStatus === 'TRUE' ||
      rawStatus === 'PAID' ||
      rawStatus === 'SUCCESS' ||
      rawStatus === 'SUCCES' ||
      rawStatus === 'COMPLETED' ||
      rawStatus === 'APPROVED' ||
      body.statut === true ||
      body.status === 200 ||
      body.status === '200';

    console.log(`[Money Fusion Webhook] userId=${userId}, docId=${docId}, type=${type}, amount=${amount}, isSuccess=${isSuccess}, rawStatus=${rawStatus}`);

    if (!isSuccess) {
      console.warn(`[Money Fusion Webhook] Statut non approuvé: ${rawStatus}`);
      return NextResponse.json({ message: "Statut non approuvé ou en attente", status: rawStatus }, { status: 200 });
    }

    if (!userId && !docId) {
      console.error("Erreur: Ni userId ni docId identifiables dans le payload");
      return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });
    }

    // TRAITEMENT 1 : RECHARGEMENT DU SOLDE (WALLET)
    if (userId && (type === 'wallet' || (!docId && !plan && amount > 0))) {
      try {
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
          walletBalance: FieldValue.increment(amount),
          balance: FieldValue.increment(amount),
          solde: FieldValue.increment(amount),
          updatedAt: new Date()
        }, { merge: true });
        console.log(`✅ Solde de l'utilisateur ${userId} crédité de ${amount} FCFA`);
      } catch (err) {
        console.error(`❌ Erreur crédit solde utilisateur ${userId}:`, err);
      }
    }

    // TRAITEMENT 2 : DÉBLOCAGE DE DOCUMENT
    if (docId) {
      try {
        const docRef = db.collection('user_documents').doc(docId);
        await docRef.set({
          isUnlocked: true,
          status: "UNLOCKED",
          paymentGateway: "Money Fusion",
          unlocked: true,
          isPaid: true,
          unlockedAt: new Date(),
          updatedAt: new Date()
        }, { merge: true });
        console.log(`✅ Document ${docId} débloqué avec succès`);

        if (userId && userId !== 'guest') {
          const userRef = db.collection('users').doc(userId);
          await userRef.set({
            purchasedDocIds: FieldValue.arrayUnion(docId),
            updatedAt: new Date()
          }, { merge: true });
        }
      } catch (err) {
        console.error(`❌ Erreur déblocage document ${docId}:`, err);
      }
    }

    // TRAITEMENT 3 : ABONNEMENT VIP
    if (userId && (type === 'subscription' || plan)) {
      try {
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
          isVip: true,
          subscriptionStatus: "ACTIVE",
          plan: plan || "PASS_VIP",
          vipActivatedAt: new Date(),
          updatedAt: new Date()
        }, { merge: true });
        console.log(`✅ Abonnement VIP activé pour l'utilisateur ${userId}`);
      } catch (err) {
        console.error(`❌ Erreur activation abonnement ${userId}:`, err);
      }
    }

    // Enregistrement de la transaction globale
    try {
      await db.collection('transactions').add({
        userId: userId || 'anonymous',
        amount,
        type: docId ? 'DOCUMENT' : (type === 'subscription' || plan ? 'SUBSCRIPTION' : 'WALLET'),
        gateway: 'Money Fusion',
        paymentGateway: 'Money Fusion',
        status: 'COMPLETED',
        docId: docId || null,
        plan: plan || null,
        token: body.token || body.tokenPay || queryParams.token || null,
        createdAt: new Date()
      });
    } catch (txErr) {
      console.warn("⚠️ Impossible d'enregistrer la transaction dans Firestore:", txErr);
    }

    return NextResponse.json({ status: "success", message: "Traitement effectué avec succès" }, { status: 200 });

  } catch (error) {
    console.error("❌ Erreur Webhook Money Fusion :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
