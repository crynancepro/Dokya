import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { 
  db 
} from '@/src/lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';

/**
 * Route API Next.js App Router : Webhook GeniusPay
 * POST /api/webhooks/geniuspay
 * 
 * - Vérifie la signature HMAC-SHA256 (X-Webhook-Signature & X-Webhook-Timestamp)
 * - Traite l'événement 'payment.success' avec statut 'completed'
 * - Active l'abonnement dans users/{userId} (subscription.status = 'ACTIVE')
 * - Si referredBy est présent : calcule 20% de commission et crédite le solde du parrain
 * - Enregistre l'historique dans affiliate_commissions et transactions
 */
export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('X-Webhook-Signature');
    const timestamp = req.headers.get('x-webhook-timestamp') || req.headers.get('X-Webhook-Timestamp');
    const webhookSecret = process.env.GENIUSPAY_WEBHOOK_SECRET;

    // 1. Vérification de la signature HMAC-SHA256
    if (webhookSecret) {
      if (!signature) {
        console.warn('[GeniusPay Webhook Warning] Signature X-Webhook-Signature manquante');
        return NextResponse.json({ error: 'Signature manquante' }, { status: 401 });
      }

      // Construction du message signé selon les formats standards GeniusPay
      const payloadToSign = timestamp ? `${timestamp}.${rawBody}` : rawBody;
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadToSign)
        .digest('hex');

      // Deuxième variante de concaténation si l'expéditeur n'inclut pas de séparateur point
      const altExpectedSignature = timestamp
        ? crypto.createHmac('sha256', webhookSecret).update(`${timestamp}${rawBody}`).digest('hex')
        : expectedSignature;

      const isValid = (signature === expectedSignature) || (signature === altExpectedSignature);

      if (!isValid) {
        console.error('[GeniusPay Webhook Error] Signature invalide.');
        return NextResponse.json({ error: 'Signature invalide' }, { status: 403 });
      }
    } else {
      console.warn('[GeniusPay Webhook Warning] GENIUSPAY_WEBHOOK_SECRET non configuré. Validation de signature ignorée en mode test.');
    }

    // 2. Parsing du corps de l'événement
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[GeniusPay Webhook Error] Payload JSON invalide:', parseError);
      return NextResponse.json({ error: 'Payload JSON invalide' }, { status: 400 });
    }

    console.log('[GeniusPay Webhook] Événement reçu:', {
      event: payload.event,
      status: payload.data?.status || payload.status,
      id: payload.data?.id || payload.id
    });

    const event = payload.event;
    const paymentData = payload.data || payload;
    const paymentStatus = paymentData.status;

    // 3. Traitement uniquement si paiement réussi / completed
    const isSuccessEvent = (event === 'payment.success') || (paymentStatus === 'completed') || (paymentStatus === 'success');

    if (!isSuccessEvent) {
      console.log(`[GeniusPay Webhook] Événement ignoré (non complété) : ${event} / statut: ${paymentStatus}`);
      return NextResponse.json({ received: true, ignored: true });
    }

    const metadata = paymentData.metadata || {};
    const userId = metadata.userId;
    const planType = metadata.planType || 'PASS_VIP';
    const referredBy = metadata.referredBy;
    const amount = Number(paymentData.amount || 5000);
    const currency = paymentData.currency || 'XOF';
    const transactionId = paymentData.id || `GP-${Date.now()}`;
    const now = new Date();

    if (!userId) {
      console.warn('[GeniusPay Webhook Warning] userId introuvable dans metadata. Paiement enregistré sans activation immédiate.');
      return NextResponse.json({ received: true, warning: 'userId manquant' });
    }

    // Résolution du nom de la formule et de la durée
    const targetDocId = metadata.targetDocId || metadata.documentId;
    let planName = 'Pass VIP Mensuel';
    let durationDays = 30;

    if (planType === 'single') {
      planName = "Paiement à l'acte (Document)";
      durationDays = 0;
    } else if (planType === 'vip_career') {
      planName = 'Pass VIP Carrière (30 jours)';
      durationDays = 30;
    } else if (planType === 'business') {
      planName = 'Pass Business (30 jours)';
      durationDays = 30;
    } else if (planType === 'annual') {
      planName = 'Pass VIP Annuel';
      durationDays = 365;
    } else if (planType === 'weekly') {
      planName = 'Pass VIP Semaine';
      durationDays = 7;
    }

    const expiresDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // 4. Mise à jour de Firestore : Activation de l'accès document ou abonnement
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    const subscriptionData = {
      planId: planType,
      planName,
      status: 'ACTIVE',
      activatedAt: now.toISOString(),
      expiresAt: expiresDate.toISOString(),
      autoRenew: false,
      pricePaid: amount,
      paymentMethod: 'geniuspay_auto',
      updatedAt: now.toISOString()
    };

    const userUpdateFields = {
      updatedAt: now.toISOString()
    };

    // Si un document spécifique a été acheté
    if (targetDocId) {
      userUpdateFields.purchasedDocIds = arrayUnion(targetDocId);
    }

    // Si c'est un abonnement complet (VIP ou Business)
    if (planType !== 'single') {
      userUpdateFields.subscription = subscriptionData;
      userUpdateFields.subscriptionStatus = 'unlimited';
    }

    if (userSnap.exists()) {
      await updateDoc(userRef, userUpdateFields);
    } else {
      await setDoc(userRef, {
        uid: userId,
        ...userUpdateFields,
        createdAt: now.toISOString()
      }, { merge: true });
    }

    console.log(`[GeniusPay Webhook] Droits activés avec succès pour l'utilisateur ${userId} (${planName})`);

    // 5. Gestion de la commission d'affiliation (20%) si referredBy est renseigné
    if (referredBy) {
      try {
        const commissionAmount = Math.round(amount * 0.20);
        let referrerUid = referredBy;
        let referrerDocRef = doc(db, 'users', referrerUid);
        let referrerSnap = await getDoc(referrerDocRef);

        // Si referredBy est un code parrain textuel (ex: "PARRAIN123") au lieu d'un UID
        if (!referrerSnap.exists()) {
          const refQuery = query(
            collection(db, 'users'),
            where('referralCode', '==', referredBy),
            limit(1)
          );
          const refQuerySnap = await getDocs(refQuery);
          if (!refQuerySnap.empty) {
            referrerUid = refQuerySnap.docs[0].id;
            referrerDocRef = doc(db, 'users', referrerUid);
            referrerSnap = refQuerySnap.docs[0];
          }
        }

        if (referrerSnap.exists()) {
          // Créditer atomiquement le solde d'affiliation du parrain
          await updateDoc(referrerDocRef, {
            affiliateBalance: increment(commissionAmount),
            totalAffiliateEarnings: increment(commissionAmount),
            updatedAt: now.toISOString()
          });

          // Enregistrer la commission dans affiliate_commissions
          const commissionId = `COMM-GP-${transactionId}`;
          const commissionRef = doc(db, 'affiliate_commissions', commissionId);
          await setDoc(commissionRef, {
            id: commissionId,
            commissionId,
            transactionId,
            referrerId: referrerUid,
            referredUserId: userId,
            referredUserName: userSnap.exists() ? (userSnap.data().displayName || 'Filleul') : 'Filleul',
            totalAmount: amount,
            affiliateCommission: commissionAmount,
            status: 'APPROVED',
            approvedAt: now.toISOString(),
            serviceTitle: `Abonnement ${planType} (GeniusPay)`,
            createdAt: now.toISOString()
          }, { merge: true });

          console.log(`[GeniusPay Webhook] Commission de 20% (${commissionAmount} XOF) créditée au parrain ${referrerUid}`);
        } else {
          console.warn(`[GeniusPay Webhook Warning] Parrain introuvable avec l'identifiant ou code: ${referredBy}`);
        }
      } catch (affiliateError) {
        console.error('[GeniusPay Webhook Affiliate Error]:', affiliateError);
      }
    }

    // 6. Enregistrement de la transaction globale dans la collection 'transactions'
    try {
      const txDocRef = doc(db, 'transactions', transactionId);
      await setDoc(txDocRef, {
        id: transactionId,
        transactionId,
        userId,
        userEmail: userSnap.exists() ? userSnap.data().email : (paymentData.customer?.email || ''),
        userName: userSnap.exists() ? userSnap.data().displayName : (paymentData.customer?.name || 'Client'),
        type: planType === 'single' ? 'DIRECT_PURCHASE' : 'SUBSCRIPTION_PURCHASE',
        planId: planType,
        targetDocId: targetDocId || '',
        unlockedDocId: targetDocId || '',
        amount,
        currency,
        paymentMethod: 'geniuspay',
        operator: paymentData.payment_method || 'geniuspay_multi',
        status: 'COMPLETED',
        completedAt: now.toISOString(),
        createdAt: now.toISOString(),
        metadata: {
          ...metadata,
          geniuspayPaymentId: paymentData.id
        }
      }, { merge: true });
    } catch (txError) {
      console.warn('[GeniusPay Webhook Transaction Log Warn]:', txError);
    }

    return NextResponse.json({
      received: true,
      status: 'PROCESSED',
      userId,
      activatedPlan: planType
    });
  } catch (error) {
    console.error('[GeniusPay Webhook Fatal Error]:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erreur interne du webhook'
      },
      { status: 500 }
    );
  }
}
