import type { NextApiRequest, NextApiResponse } from 'next';
import { db, FieldValue } from '../lib/firebaseAdmin.js';

/**
 * Route API Vercel Serverless consolidée : /api/payment
 * Regroupe et unifie :
 *  - action: 'wallet_pay'       -> Déblocage de document ou abonnement via solde wallet
 *  - action: 'validate_promo'   -> Vérification et calcul de réduction de code promo
 *  - action: 'verify_checkout'  -> Vérification de transaction / recharge Money Fusion
 */

const DEFAULT_PROMOS = [
  {
    code: 'PETER',
    discountType: 'percentage',
    discountValue: 100,
    minOrderAmount: 0,
    maxUsageLimit: 9999,
    currentUsageCount: 0,
    active: true,
    description: 'Accès VIP Gratuit Administrateur (-100%)'
  },
  {
    code: 'VIP100',
    discountType: 'percentage',
    discountValue: 100,
    minOrderAmount: 0,
    maxUsageLimit: 9999,
    currentUsageCount: 0,
    active: true,
    description: 'Code VIP Déblocage 100% Offert'
  },
  {
    code: 'GRATUIT100',
    discountType: 'percentage',
    discountValue: 100,
    minOrderAmount: 0,
    maxUsageLimit: 9999,
    currentUsageCount: 0,
    active: true,
    description: 'Déblocage 100% Gratuit Dokya'
  },
  {
    code: 'ADMIN100',
    discountType: 'percentage',
    discountValue: 100,
    minOrderAmount: 0,
    maxUsageLimit: 9999,
    currentUsageCount: 0,
    active: true,
    description: 'Accès Administrateur (-100%)'
  },
  {
    code: 'LIL',
    discountType: 'percentage',
    discountValue: 90,
    minOrderAmount: 0,
    maxUsageLimit: 500,
    currentUsageCount: 0,
    active: true,
    description: 'Offre Spéciale LIL (-90%)'
  },
  {
    code: 'PROMO50',
    discountType: 'percentage',
    discountValue: 50,
    minOrderAmount: 500,
    maxUsageLimit: 500,
    currentUsageCount: 15,
    active: true,
    description: '50% de réduction exceptionnelle'
  },
  {
    code: 'DAKAR2026',
    discountType: 'percentage',
    discountValue: 30,
    minOrderAmount: 1000,
    maxUsageLimit: 200,
    currentUsageCount: 29,
    active: true,
    description: '30% de remise spéciale promotionnelle'
  },
  {
    code: 'TERANGA20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 1000,
    maxUsageLimit: 500,
    currentUsageCount: 47,
    active: true,
    description: '20% de réduction sur tous les documents'
  },
  {
    code: 'BIENVENUE500',
    discountType: 'fixed',
    discountValue: 500,
    minOrderAmount: 1000,
    maxUsageLimit: 500,
    currentUsageCount: 112,
    active: true,
    description: '500 FCFA offerts sur votre commande'
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    // 1. Extraction et parsing du corps ou de la query
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

    const query = req.query || {};
    const payload = { ...query, ...(body || {}) };

    // Détermination de l'action demandée
    let action = String(payload.action || payload.type || '').trim().toLowerCase();

    // Inférence automatique de l'action si non précisée
    if (!action) {
      if (payload.code || payload.promoCode) {
        action = 'validate_promo';
      } else if (payload.token || payload.paymentId) {
        action = 'verify_checkout';
      } else if (payload.documentId || payload.itemId || payload.docId || payload.userId) {
        action = 'wallet_pay';
      }
    }

    // 2. Dispatching selon l'action
    switch (action) {
      case 'wallet_pay':
      case 'pay_wallet':
      case 'wallet':
        return await handleWalletPay(payload, res);

      case 'validate_promo':
      case 'promo_validate':
      case 'promo':
      case 'validate':
        return await handleValidatePromo(payload, res);

      case 'verify_checkout':
      case 'verify_payment':
      case 'verify':
      case 'moneyfusion_verify':
        return await handleVerifyCheckout(payload, res);

      default:
        return res.status(400).json({
          success: false,
          error: "Action inconnue ou non spécifiée. Actions valides : 'wallet_pay', 'validate_promo', 'verify_checkout'."
        });
    }
  } catch (error: any) {
    console.error('[API /api/payment Internal Error]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erreur interne du serveur de paiement.'
    });
  }
}

// ---------------------------------------------------------------------------
// GESTIONNAIRE : WALLET PAY (Déblocage document / VIP par solde)
// ---------------------------------------------------------------------------
async function handleWalletPay(payload: any, res: NextApiResponse) {
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
  } = payload;

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

  // Vérification de couverture du solde
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
    // Déduction du solde
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

    // Mise à jour du document 'user_documents/{documentId}'
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

    // Gestion de l'abonnement VIP si applicable
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

    // Enregistrement dans Firestore 'transactions'
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

    // Notification utilisateur
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

  return res.status(200).json({
    success: true,
    message: "Document débloqué avec succès",
    transactionId,
    newBalance: newComputedBalance,
    amount: numericPrice
  });
}

// ---------------------------------------------------------------------------
// GESTIONNAIRE : VALIDATE PROMO (Validation et calcul de réduction de promo)
// ---------------------------------------------------------------------------
async function handleValidatePromo(payload: any, res: NextApiResponse) {
  const code = payload.code || payload.promoCode;
  const orderAmount = payload.orderAmount !== undefined ? payload.orderAmount : payload.amount;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      valid: false,
      error: 'Code promo manquant ou invalide.'
    });
  }

  const normalizedCode = code.trim().toUpperCase();
  const numericAmount = Math.max(0, Number(orderAmount) || 0);

  let promoFound: any = null;

  // 1. Recherche dans Firestore si disponible
  if (db && typeof db.collection === 'function') {
    try {
      const snap = await db.collection('promo_codes').doc(normalizedCode).get();
      if (snap.exists) {
        promoFound = snap.data();
      } else {
        const qSnap = await db.collection('promo_codes').where('code', '==', normalizedCode).limit(1).get();
        if (!qSnap.empty) {
          promoFound = qSnap.docs[0].data();
        }
      }
    } catch (_e) {
      console.warn('[handleValidatePromo] Erreur lecture Firestore, repli mémoire locale');
    }
  }

  // 2. Recherche dans les codes par défaut en secours
  if (!promoFound) {
    promoFound = DEFAULT_PROMOS.find(p => p.code === normalizedCode);
  }

  if (!promoFound) {
    return res.status(200).json({
      success: false,
      valid: false,
      error: `Le code promo "${normalizedCode}" est inexistant ou expiré.`
    });
  }

  if (promoFound.active === false) {
    return res.status(200).json({
      success: false,
      valid: false,
      error: `Le code promo "${normalizedCode}" est actuellement inactif.`
    });
  }

  if (promoFound.expiresAt) {
    const expiry = new Date(promoFound.expiresAt).getTime();
    if (Date.now() > expiry) {
      return res.status(200).json({
        success: false,
        valid: false,
        error: `Le code promo "${normalizedCode}" a expiré.`
      });
    }
  }

  const maxUsage = Number(promoFound.maxUsageLimit ?? promoFound.maxUses ?? 9999);
  const currentUsage = Number(promoFound.currentUsageCount ?? promoFound.usedCount ?? 0);
  if (currentUsage >= maxUsage) {
    return res.status(200).json({
      success: false,
      valid: false,
      error: `Le quota d'utilisation du code "${normalizedCode}" a été atteint.`
    });
  }

  const minOrder = Number(promoFound.minOrderAmount ?? promoFound.minAmount ?? 0);
  if (numericAmount > 0 && numericAmount < minOrder) {
    return res.status(200).json({
      success: false,
      valid: false,
      error: `Montant minimum de ${minOrder.toLocaleString('fr-FR')} FCFA requis pour utiliser ce code.`
    });
  }

  const discountType = (promoFound.discountType || 'percentage').toLowerCase();
  const discountValue = Number(promoFound.discountValue ?? promoFound.value ?? 0);

  let discountAmount = 0;
  if (discountType === 'percentage' || discountType === 'percent') {
    discountAmount = Math.round((numericAmount * discountValue) / 100);
  } else {
    discountAmount = discountValue;
  }

  discountAmount = Math.min(numericAmount, Math.max(0, discountAmount));
  const discountedAmount = Math.max(0, numericAmount - discountAmount);

  return res.status(200).json({
    success: true,
    valid: true,
    promoCode: normalizedCode,
    discountType: discountType === 'fixed' ? 'fixed' : 'percentage',
    discountValue,
    discountAmount,
    discountedAmount,
    originalAmount: numericAmount,
    description: promoFound.description || `Réduction de ${discountValue}${discountType === 'fixed' ? ' FCFA' : '%'} appliquée.`,
    message: discountValue === 100 
      ? `Félicitations ! Votre code "${normalizedCode}" vous offre une gratuité totale (100% de réduction) !`
      : `Code "${normalizedCode}" appliqué : -${discountValue}${discountType === 'fixed' ? ' FCFA' : '%'} sur votre commande.`
  });
}

// ---------------------------------------------------------------------------
// GESTIONNAIRE : VERIFY CHECKOUT (Vérification et crédit après paiement Money Fusion)
// ---------------------------------------------------------------------------
async function handleVerifyCheckout(payload: any, res: NextApiResponse) {
  const token = String(payload.token || payload.paymentId || '').trim();
  let transactionId = String(payload.transactionId || '').trim();
  let userId = String(payload.userId || '').trim();
  let userEmail = String(payload.userEmail || '').trim();
  let userName = String(payload.userName || '').trim();
  let phoneNumber = String(payload.phoneNumber || payload.userPhone || '').trim();
  let amount = Number(payload.amount || 0);

  const searchId = transactionId || token;
  let txRecord: any = null;

  if (searchId && db && typeof db.collection === 'function') {
    try {
      const snap = await db.collection('transactions').doc(searchId).get();
      if (snap.exists) {
        txRecord = snap.data();
        transactionId = searchId;
      }
    } catch (_e) {}

    if (!txRecord) {
      try {
        const qSnap = await db.collection('transactions').where('transactionId', '==', searchId).limit(1).get();
        if (!qSnap.empty) {
          txRecord = qSnap.docs[0].data();
          transactionId = qSnap.docs[0].id;
        }
      } catch (_e) {}
    }
  }

  // Héritage des données existantes
  if (txRecord) {
    if (!userId || userId === 'guest') userId = txRecord.userId || userId;
    if (!userEmail) userEmail = txRecord.userEmail || userEmail;
    if (!userName || userName === 'Client Dokya' || userName === 'Utilisateur') userName = txRecord.userName || userName;
    if (!phoneNumber) phoneNumber = txRecord.phoneNumber || txRecord.userPhone || phoneNumber;
    if (!amount || isNaN(amount) || amount <= 0) {
      amount = Number(txRecord.amount || txRecord.expectedAmount || 0);
    }
  }

  // Vérification auprès des passerelles Money Fusion si token distant
  let isVerified = false;
  let mfAmount = 0;
  if (token && !token.startsWith('MF_') && !token.startsWith('MF-')) {
    const checkEndpoints = [
      `https://pay.moneyfusion.net/paiementNotif/${token}`,
      `https://api.moneyfusion.net/api/v1/payments/${token}`
    ];
    for (const url of checkEndpoints) {
      try {
        const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (resp.ok) {
          const resData: any = await resp.json();
          const pData = resData.data || {};
          const status = String(pData.statut || resData.statut || '').toLowerCase();
          if (status === 'paid' || status === 'completed' || status === 'success' || status === 'approved' || resData.statut === true) {
            isVerified = true;
            const pInfo = Array.isArray(pData.personal_Info) ? (pData.personal_Info[0] || {}) : (pData.personal_Info || {});
            if (!userId || userId === 'guest') userId = String(pInfo.userId || '').trim();
            if (!userEmail) userEmail = String(pInfo.userEmail || pInfo.email || '').trim();
            if (!userName) userName = String(pInfo.userName || pData.nomclient || '').trim();
            if (!phoneNumber) phoneNumber = String(pData.numeroSend || pInfo.phoneNumber || '').trim();
            if (pData.totalPrice || pData.amount || pInfo.amount) {
              mfAmount = Number(pData.totalPrice || pData.amount || pInfo.amount || 0);
            }
            break;
          }
        }
      } catch (_err) {}
    }
  } else if (token) {
    isVerified = true;
  }

  const realAmount = mfAmount > 0 ? mfAmount : (amount > 0 ? amount : 0);
  const nowIso = new Date().toISOString();
  const finalTxId = transactionId || token || `TX-${Date.now()}`;

  // Mise à jour de la transaction et du solde si utilisateur identifié
  if (db && typeof db.collection === 'function') {
    try {
      await db.collection('transactions').doc(finalTxId).set({
        id: finalTxId,
        transactionId: finalTxId,
        token: token || null,
        userId: userId || 'guest',
        userEmail: userEmail || 'client@dokya.sn',
        userName: userName || 'Client Dokya',
        phoneNumber: phoneNumber || null,
        amount: realAmount,
        currency: 'FCFA',
        status: 'SUCCESS',
        isVerified: true,
        completedAt: nowIso,
        updatedAt: nowIso
      }, { merge: true });

      if (userId && userId !== 'guest' && realAmount > 0) {
        const userDocRef = db.collection('users').doc(userId);
        await userDocRef.set({
          walletBalance: FieldValue ? FieldValue.increment(realAmount) : realAmount,
          lastRechargeAt: nowIso,
          updatedAt: nowIso
        }, { merge: true });
      }
    } catch (_dbErr) {
      console.warn('[handleVerifyCheckout] Erreur écriture Firestore:', _dbErr);
    }
  }

  return res.status(200).json({
    success: true,
    amount: realAmount,
    status: 'SUCCESS',
    transactionId: finalTxId,
    userId: userId || null,
    message: "Paiement validé avec succès"
  });
}
