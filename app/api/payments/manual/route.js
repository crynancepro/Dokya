import { NextResponse } from 'next/server.js';
import { db } from '../../../../lib/firebase.js';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  increment 
} from 'firebase/firestore';

/**
 * Route API Next.js App Router : Paiements Manuels (Dépôt Direct & Validation Administrateur)
 * 
 * - POST /api/payments/manual (Soumission par le client ou Validation par l'Admin)
 * - Actions gérées :
 *   1. Soumission standard par l'utilisateur :
 *      - Enregistre une demande dans `manual_payments` avec le statut 'PENDING'
 *      - Met à jour l'abonnement du client dans `users/{userId}` avec status 'PENDING_APPROVAL'
 *   2. Validation par l'Administrateur (action === 'APPROVE') :
 *      - Passe la demande à 'APPROVED'
 *      - Active le compte de l'utilisateur : `subscription.status = 'ACTIVE'`
 *      - Si `referredBy` est présent, calcule 20% et crédite le solde d'affiliation du parrain
 *   3. Rejet par l'Administrateur (action === 'REJECT') :
 *      - Passe la demande à 'REJECTED' avec motif optionnel
 *      - Réinitialise le statut de l'abonnement utilisateur à 'INACTIVE'
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // =========================================================================
    // ACTION ADMIN : VALIDATION OU REJET D'UN PAIEMENT MANUEL
    // =========================================================================
    if (action === 'APPROVE' || action === 'REJECT') {
      const { paymentId, adminEmail = 'admin@dokya.com', rejectionReason } = body;

      if (!paymentId) {
        return NextResponse.json({ error: 'Identifiant paymentId requis pour cette action' }, { status: 400 });
      }

      const paymentRef = doc(db, 'manual_payments', paymentId);
      const paymentSnap = await getDoc(paymentRef);

      if (!paymentSnap.exists()) {
        return NextResponse.json({ error: 'Demande de paiement manuel introuvable' }, { status: 404 });
      }

      const paymentData = paymentSnap.data();
      const userId = paymentData.userId;
      const now = new Date();

      if (action === 'APPROVE') {
        const planType = paymentData.planType || 'PASS_VIP';
        const amount = Number(paymentData.amount || 5000);
        const referredBy = paymentData.referredBy;

        // Calcul de la période d'expiration
        let durationDays = 30;
        if (planType === 'annual') durationDays = 365;
        else if (planType === 'weekly') durationDays = 7;
        const expiresDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        // 1. Mettre à jour la demande en 'APPROVED'
        await updateDoc(paymentRef, {
          status: 'APPROVED',
          approvedBy: adminEmail,
          approvedAt: now.toISOString(),
          updatedAt: now.toISOString()
        });

        // 2. Activer l'abonnement dans users/{userId}
        if (userId) {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            subscription: {
              planId: planType,
              planName: planType === 'annual' ? 'Pass VIP Annuel' : (planType === 'weekly' ? 'Pass VIP Semaine' : 'Pass VIP Mensuel'),
              status: 'ACTIVE',
              activatedAt: now.toISOString(),
              expiresAt: expiresDate.toISOString(),
              autoRenew: false,
              pricePaid: amount,
              paymentMethod: 'manual_transfer',
              manuallyApprovedBy: adminEmail
            },
            subscriptionStatus: 'unlimited',
            updatedAt: now.toISOString()
          });
        }

        // 3. Créditer 20% au parrain si un code ou identifiant est présent
        if (referredBy) {
          try {
            const commission = Math.round(amount * 0.20);
            let referrerUid = referredBy;
            let referrerRef = doc(db, 'users', referrerUid);
            let referrerSnap = await getDoc(referrerRef);

            if (!referrerSnap.exists()) {
              const q = query(collection(db, 'users'), where('referralCode', '==', referredBy), limit(1));
              const snap = await getDocs(q);
              if (!snap.empty) {
                referrerUid = snap.docs[0].id;
                referrerRef = doc(db, 'users', referrerUid);
                referrerSnap = snap.docs[0];
              }
            }

            if (referrerSnap.exists()) {
              await updateDoc(referrerRef, {
                affiliateBalance: increment(commission),
                totalAffiliateEarnings: increment(commission),
                updatedAt: now.toISOString()
              });

              // Enregistrement de la commission
              const commId = `COMM-MANUAL-${paymentId}`;
              await setDoc(doc(db, 'affiliate_commissions', commId), {
                id: commId,
                commissionId: commId,
                transactionId: paymentId,
                referrerId: referrerUid,
                referredUserId: userId,
                referredUserName: paymentData.userName || 'Client',
                totalAmount: amount,
                affiliateCommission: commission,
                status: 'APPROVED',
                approvedAt: now.toISOString(),
                serviceTitle: `Abonnement ${planType} (Paiement Manuel Validé)`,
                createdAt: now.toISOString()
              }, { merge: true });
            }
          } catch (affErr) {
            console.warn('[Manual Payment Admin Approve Affiliate Warn]:', affErr);
          }
        }

        return NextResponse.json({
          success: true,
          status: 'APPROVED',
          message: 'Paiement manuel validé et compte VIP activé avec succès.'
        });
      }

      if (action === 'REJECT') {
        await updateDoc(paymentRef, {
          status: 'REJECTED',
          rejectedBy: adminEmail,
          rejectionReason: rejectionReason || 'Preuve de virement non conforme ou introuvable.',
          rejectedAt: now.toISOString(),
          updatedAt: now.toISOString()
        });

        if (userId) {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            'subscription.status': 'INACTIVE',
            'subscription.adminNote': rejectionReason || 'Paiement manuel refusé.',
            updatedAt: now.toISOString()
          });
        }

        return NextResponse.json({
          success: true,
          status: 'REJECTED',
          message: 'Demande de paiement manuel refusée.'
        });
      }
    }

    // =========================================================================
    // SOUMISSION CLIENT : NOUVELLE DEMANDE DE PAIEMENT MANUEL
    // =========================================================================
    const {
      userId,
      userName = '',
      userEmail = '',
      userPhone = '',
      planType = 'PASS_VIP',
      amount = 5000,
      currency = 'XOF',
      operator = 'WAVE',
      reference = '',
      senderPhone = '',
      proofBase64 = null,
      proofUrl = null,
      referredBy = null,
      note = ''
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Identifiant utilisateur (userId) manquant.' },
        { status: 400 }
      );
    }

    if (!reference && !senderPhone) {
      return NextResponse.json(
        { error: 'Veuillez fournir au moins le numéro expéditeur ou la référence de transfert.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const paymentId = `MP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const manualPaymentRecord = {
      id: paymentId,
      paymentId,
      userId,
      userName,
      userEmail,
      userPhone,
      planType,
      amount: Number(amount) || 5000,
      currency: currency || 'XOF',
      operator: operator || 'WAVE',
      reference: reference.trim(),
      senderPhone: senderPhone.trim(),
      proofBase64: proofBase64 || null,
      proofUrl: proofUrl || null,
      referredBy: referredBy || null,
      note: note.trim() || null,
      status: 'PENDING',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    // 1. Enregistrement dans la collection 'manual_payments'
    const paymentRef = doc(db, 'manual_payments', paymentId);
    await setDoc(paymentRef, manualPaymentRecord);

    // 2. Mise à jour de l'utilisateur avec subscription.status = 'PENDING_APPROVAL'
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'subscription.status': 'PENDING_APPROVAL',
      'subscription.planId': planType,
      'subscription.requestedAt': now.toISOString(),
      'subscription.pendingPaymentId': paymentId,
      'subscription.paymentMethod': 'manual_transfer',
      updatedAt: now.toISOString()
    });

    console.log(`[Manual Payment] Demande créée pour l'utilisateur ${userId} (ID: ${paymentId})`);

    return NextResponse.json({
      success: true,
      paymentId,
      status: 'PENDING',
      message: 'Votre preuve de transfert a été envoyée avec succès. Notre équipe va vérifier votre paiement sous 15 à 30 minutes.'
    });
  } catch (error) {
    console.error('[Manual Payment Route Error]:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement du paiement manuel'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/manual?userId=...
 * Permet de récupérer l'historique ou le statut d'une demande
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId manquant' }, { status: 400 });
    }

    const q = query(
      collection(db, 'manual_payments'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => d.data());

    return NextResponse.json({ success: true, count: list.length, payments: list });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
