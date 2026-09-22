import adminCompat, { db, FieldValue, executeAtomicPaymentCredit } from '../../lib/firebaseAdmin.js';
import { verifyMoneyFusionWithOfficialApi } from '../../lib/moneyFusionVerify.js';

const admin = adminCompat;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const body = req.body || {};
    console.log("[Money Fusion Webhook Handler] Payload reçu:", JSON.stringify(body));

    const personalInfo = Array.isArray(body.personal_Info) ? (body.personal_Info[0] || {}) : (body.personal_Info || {});
    const metadata = body.metadata || body.customData || {};

    let transactionId = String(body.transactionId || personalInfo.transactionId || metadata.transactionId || '').trim();
    const token = String(body.token || body.tokenPay || body.orderId || body.id || '').trim();
    let userId = String(personalInfo.userId || body.userId || metadata.userId || '').trim();
    let userEmail = String(personalInfo.userEmail || personalInfo.email || body.email || metadata.userEmail || '').trim();
    let userName = String(personalInfo.userName || personalInfo.nom || body.nomclient || '').trim();
    let phoneNumber = String(body.numeroSend || personalInfo.phoneNumber || personalInfo.userPhone || personalInfo.telephone || '').trim();

    let rawAmount = Number(body.totalPrice || body.amount || personalInfo.amount || metadata.amount || 0);

    const searchId = transactionId || token;
    if (!searchId) {
      return res.status(400).json({ error: "Identifiant de transaction manquant." });
    }

    // 1. Récupère la transaction existante dans Firestore
    let transactionRef = db.collection('transactions').doc(searchId);
    let transactionDoc = await transactionRef.get();

    if (!transactionDoc.exists) {
      try {
        const qSnap = await db.collection('transactions').where('transactionId', '==', searchId).limit(1).get();
        if (!qSnap.empty) {
          transactionDoc = qSnap.docs[0];
          transactionRef = transactionDoc.ref;
          transactionId = transactionDoc.id;
        } else if (token) {
          const qToken = await db.collection('transactions').where('token', '==', token).limit(1).get();
          if (!qToken.empty) {
            transactionDoc = qToken.docs[0];
            transactionRef = transactionDoc.ref;
            transactionId = transactionDoc.id;
          }
        }
      } catch (_e) {}
    }

    const transaction = transactionDoc.exists ? transactionDoc.data() : null;

    // 2. VÉRIFICATION D'IDEMPOTENCE IMMÉDIATE (RÈGLE ABSOLUE) :
    if (transaction && (transaction.status === 'SUCCESS' || transaction.isProcessed === true)) {
      console.log(`[Webhook] Transaction ${searchId} déjà traitée (SUCCESS / isProcessed: true). Annulation immédiate du doublon.`);
      return res.status(200).json({ message: "Transaction déjà traitée, aucun crédit ajouté" });
    }

    // 3. VÉRIFICATION STRICTE ET DIRECTE AUPRÈS DE L'API OFFICIELLE MONEY FUSION :
    // Ne jamais se fier uniquement au boolean statut:true qui indique seulement la réussite de la requête HTTP.
    // L'argent n'est crédité que si et seulement si statut === 'paid' / 'success' avec montant > 0.
    const queryToken = token || transaction?.token || transaction?.tokenPay || searchId;
    let isConfirmedPaid = false;
    let validatedAmount = 0;

    if (queryToken) {
      const mfCheck = await verifyMoneyFusionWithOfficialApi(queryToken);
      if (mfCheck.isPaid) {
        isConfirmedPaid = true;
        validatedAmount = mfCheck.amount;
        console.log(`[Webhook] Paiement certifié PAYÉ par l'API officielle Money Fusion pour ${queryToken} (${validatedAmount} FCFA)`);
      } else if (mfCheck.isFailed) {
        if (transactionDoc.exists) {
          await transactionRef.update({
            status: 'FAILED',
            isProcessed: false,
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        }
        return res.status(200).json({ message: "Transaction échouée chez Money Fusion" });
      } else {
        console.log(`[Webhook] API Money Fusion confirme statut en attente (${mfCheck.status}) pour ${queryToken}. AUCUN CRÉDIT EFFECTUÉ.`);
      }
    }

    // Repli de secours STRICT sur le payload si l'API officielle était indisponible
    if (!isConfirmedPaid) {
      const payloadData = body.data || body;
      const explicitStatus = String(payloadData.statut || '').trim().toLowerCase();
      const payloadAmount = Number(payloadData.Montant || payloadData.amount || 0);
      const hasTxNumber = Boolean(payloadData.numeroTransaction);

      if ((explicitStatus === 'paid' || explicitStatus === 'success' || explicitStatus === 'completed') && (payloadAmount > 0 || hasTxNumber)) {
        isConfirmedPaid = true;
        validatedAmount = payloadAmount;
      }
    }

    // Si le paiement n'est pas 100% confirmé : STOP IMMÉDIAT SANS CRÉDITER
    if (!isConfirmedPaid) {
      return res.status(200).json({
        message: "Notification Money Fusion reçue. En attente de paiement confirmé par l'opérateur, aucun crédit ajouté."
      });
    }

    // 4. LE PAIEMENT EST 100% CONFIRMÉ (statut 'paid' / 'success') :
    const effectiveUserId = (transaction?.userId && transaction.userId !== 'guest') ? transaction.userId : userId;
    const effectiveAmount = Math.round(Number(validatedAmount || transaction?.amount || transaction?.expectedAmount || rawAmount || 0));

    if (effectiveAmount <= 0) {
      console.warn(`[Money Fusion Webhook] Montant détecté à 0 FCFA pour ${searchId}. Aucun crédit.`);
      return res.status(200).json({ message: "Montant nul, aucun crédit ajouté" });
    }

    // 5. EXÉCUTION ATOMIQUE AVEC VERROU FIRESTORE :
    // runTransaction garantit que même si Money Fusion bombarde plusieurs webhooks simultanément,
    // UNE SEULE requête obtiendra le verrou et créditera le solde.
    const atomicResult = await executeAtomicPaymentCredit({
      searchId: transactionId || searchId,
      effectiveUserId,
      effectiveAmount,
      userEmail: userEmail || transaction?.userEmail || '',
      userName: userName || transaction?.userName || 'Client Dokya',
      phoneNumber: phoneNumber || transaction?.phoneNumber || ''
    });

    if (atomicResult.alreadyProcessed) {
      console.log(`[Webhook] Idempotence atomique : Transaction ${searchId} déjà traitée par une requête parallèle concurrente.`);
      return res.status(200).json({ message: "Transaction déjà traitée, aucun crédit ajouté" });
    }

    console.log(`[Webhook] Transaction ${searchId} validée et solde crédité de +${effectiveAmount} FCFA avec succès (atomique).`);
    return res.status(200).json({
      success: true,
      message: "Solde crédité avec succès",
      newBalance: atomicResult.newBalance
    });

  } catch (err: any) {
    console.error("[Webhook Error]:", err);
    return res.status(500).json({ error: err?.message || 'Erreur interne de traitement' });
  }
}

