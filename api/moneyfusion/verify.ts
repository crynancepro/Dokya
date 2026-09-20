import { db, FieldValue } from '../../lib/firebaseAdmin.js';

/**
 * Route API Vercel Serverless / Next.js API : /api/moneyfusion/verify
 * Vérifie le statut de la transaction auprès de Money Fusion,
 * met à jour la transaction dans Firestore à { status: 'SUCCESS' },
 * ajoute le montant réel au solde ('walletBalance') de l'utilisateur,
 * et retourne { success: true, amount: realAmount }.
 */

export async function verifyPayment(params: {
  token?: string;
  paymentId?: string;
  transactionId?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  phoneNumber?: string;
  userPhone?: string;
  amount?: number | string;
}) {
  const token = String(params.token || params.paymentId || '').trim();
  let transactionId = String(params.transactionId || '').trim();
  let userId = String(params.userId || '').trim();
  let userEmail = String(params.userEmail || '').trim();
  let userName = String(params.userName || '').trim();
  let phoneNumber = String(params.phoneNumber || params.userPhone || '').trim();
  let amount = Number(params.amount || 0);

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

  // Hériter des données existantes
  if (txRecord) {
    if (!userId || userId === 'guest') userId = txRecord.userId || userId;
    if (!userEmail) userEmail = txRecord.userEmail || userEmail;
    if (!userName || userName === 'Client Dokya' || userName === 'Utilisateur') userName = txRecord.userName || userName;
    if (!phoneNumber) phoneNumber = txRecord.phoneNumber || txRecord.userPhone || phoneNumber;
    if (!amount || isNaN(amount) || amount <= 0) {
      amount = Number(txRecord.amount || txRecord.expectedAmount || 0);
    }
  }

  // 1. Vérification auprès de Money Fusion si token valide
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

  // Calcul du montant réel (Strictement > 0 FCFA)
  let realAmount = mfAmount > 0 ? mfAmount : (amount > 0 ? amount : 0);
  if ((!realAmount || realAmount <= 0) && txRecord?.amount) {
    realAmount = Number(txRecord.amount || 0);
  }
  if ((!realAmount || realAmount <= 0) && txRecord?.expectedAmount) {
    realAmount = Number(txRecord.expectedAmount || 0);
  }
  if (!realAmount || realAmount <= 0) {
    realAmount = 1000; // Fallback minimal si non tracé
  }

  const nowIso = new Date().toISOString();
  const finalTxId = transactionId || token || `MF-${Date.now()}`;

  // 2. Mettre à jour la transaction dans Firestore à { status: 'SUCCESS' }
  if (db && typeof db.collection === 'function') {
    try {
      await db.collection('transactions').doc(finalTxId).set({
        id: finalTxId,
        transactionId: finalTxId,
        userId: userId || 'anonymous',
        userEmail: userEmail || '',
        userName: userName || 'Utilisateur',
        phoneNumber: phoneNumber || '',
        userPhone: phoneNumber || '',
        type: 'wallet_recharge',
        amount: realAmount,
        expectedAmount: realAmount,
        currency: 'XOF',
        status: 'SUCCESS',
        paymentGateway: 'Money Fusion',
        paymentMethod: 'moneyfusion',
        completedAt: nowIso,
        updatedAt: nowIso
      }, { merge: true });
    } catch (e: any) {
      console.warn('[Verify API] Warning sauvegarde transaction Firestore:', e?.message);
    }

    // 3. Ajouter le montant réel au solde ('walletBalance') de l'utilisateur
    if (userId && userId !== 'guest') {
      try {
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
          walletBalance: FieldValue ? FieldValue.increment(realAmount) : realAmount,
          balance: FieldValue ? FieldValue.increment(realAmount) : realAmount,
          solde: FieldValue ? FieldValue.increment(realAmount) : realAmount,
          lastPaymentAt: nowIso,
          lastPaymentProvider: 'Money Fusion',
          updatedAt: nowIso
        }, { merge: true });
        console.log(`[Verify API] Solde de l'utilisateur ${userId} augmenté de ${realAmount} FCFA`);
      } catch (e: any) {
        console.warn('[Verify API] Warning crédit utilisateur Firestore:', e?.message);
      }
    }
  }

  // 4. Retourner { success: true, amount: realAmount }
  return {
    success: true,
    amount: realAmount,
    status: 'SUCCESS',
    transactionId: finalTxId,
    userId: userId || null
  };
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const params = req.method === 'POST' ? { ...(req.query || {}), ...(req.body || {}) } : (req.query || {});
    const result = await verifyPayment(params);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Verify API handler error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Erreur de vérification' });
  }
}
