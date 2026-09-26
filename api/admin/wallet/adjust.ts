/**
 * API Route: /api/admin/wallet/adjust
 * Ajustement du solde du portefeuille utilisateur Dokya (Crédit / Débit)
 * Compatible Next.js App Router, Pages Router & Vercel Serverless
 */

import admin, { db } from '../../../lib/firebaseAdmin';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-email, x-admin-key, x-user-role'
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request | any): Promise<Response> {
  try {
    let bodyData: any = {};
    if (typeof req.json === 'function') {
      try {
        bodyData = await req.json();
      } catch {
        bodyData = {};
      }
    } else if (req.body) {
      bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    const {
      userId,
      userEmail,
      amount,
      action = 'add',
      type,
      reason = 'Ajustement Administrateur Dokya',
      adminEmail = 'peter25ngouala@gmail.com'
    } = bodyData;

    const targetUserId = userId || (userEmail ? userEmail.trim().toLowerCase() : '');

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Identifiant utilisateur (userId) manquant.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const numericAmount = Math.abs(Number(amount));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Montant invalide. Doit être supérieur à 0 FCFA.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Déterminer si l'action est un ajout ou un retrait
    const resolvedAction = (action || type || 'add').toLowerCase();
    const isAdding = (
      resolvedAction === 'add' ||
      resolvedAction === 'credit' ||
      resolvedAction === 'ajouter' ||
      resolvedAction === '+'
    );

    // 1. Lire le document utilisateur actuel depuis Firestore
    const userDocRef = db.collection('users').doc(targetUserId);
    const userDocSnap = await userDocRef.get();

    let currentBalance = 0;
    let userData: any = {};

    if (userDocSnap.exists) {
      userData = userDocSnap.data() || {};
      const rawBal = userData.walletBalance ?? userData.balance ?? userData.solde ?? 0;
      currentBalance = isNaN(Number(rawBal)) ? 0 : Math.max(0, Number(rawBal));
    }

    // 2. Calculer le nouveau solde
    let newBalance = 0;
    if (isAdding) {
      newBalance = currentBalance + numericAmount;
    } else {
      if (currentBalance < numericAmount) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Solde insuffisant pour ce débit. Solde actuel : ${currentBalance.toLocaleString('fr-FR')} FCFA, montant demandé : ${numericAmount.toLocaleString('fr-FR')} FCFA.`
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
      newBalance = Math.max(0, currentBalance - numericAmount);
    }

    const nowIso = new Date().toISOString();

    // 3. Mettre à jour le solde dans Firestore
    const updateData = {
      walletBalance: newBalance,
      balance: newBalance,
      solde: newBalance,
      lastAdjustedAt: nowIso,
      lastAdjustedBy: adminEmail,
      updatedAt: nowIso
    };

    try {
      await userDocRef.update(updateData);
    } catch {
      await userDocRef.set({
        ...updateData,
        email: userData.email || userEmail || targetUserId,
        createdAt: userData.createdAt || nowIso
      }, { merge: true });
    }

    // 4. Enregistrer la trace de transaction dans Firestore
    const txId = `TX-ADJUST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const txRecord = {
      id: txId,
      transactionId: txId,
      userId: targetUserId,
      userEmail: userData.email || userEmail || '',
      type: isAdding ? 'admin_credit' : 'admin_debit',
      action: isAdding ? 'add' : 'remove',
      amount: numericAmount,
      currency: 'XOF',
      previousBalance: currentBalance,
      newBalance: newBalance,
      status: 'APPROVED',
      description: reason || (isAdding ? 'Crédit administratif de solde' : 'Débit administratif de solde'),
      paymentMethod: 'admin_manual',
      adminEmail,
      createdAt: nowIso,
      processedAt: nowIso
    };

    try {
      await db.collection('transactions').doc(txId).set(txRecord, { merge: true });
    } catch (txErr: any) {
      console.warn('[Admin Adjust TX Save Warning]:', txErr?.message);
    }

    console.log(`[Admin Wallet Adjust] ${targetUserId}: ${currentBalance} -> ${newBalance} FCFA (${isAdding ? '+' : '-'}${numericAmount})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Solde mis à jour : ${newBalance.toLocaleString('fr-FR')} FCFA`,
        newBalance,
        walletBalance: newBalance,
        previousBalance: currentBalance,
        adjustedAmount: numericAmount,
        action: isAdding ? 'add' : 'remove',
        transaction: txRecord
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[Admin Wallet Adjust Error]:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Erreur lors de l\'ajustement du solde.'
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// Default Handler pour Express / Node / Pages Router
export default async function handler(req: any, res?: any) {
  if (!res || typeof res.status !== 'function') {
    if (req.method === 'OPTIONS') return OPTIONS();
    return POST(req);
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-email, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      userId,
      userEmail,
      amount,
      action = 'add',
      type,
      reason = 'Ajustement Administrateur Dokya',
      adminEmail = 'peter25ngouala@gmail.com'
    } = bodyData;

    const targetUserId = userId || (userEmail ? userEmail.trim().toLowerCase() : '');
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'Identifiant utilisateur (userId) manquant.' });
    }

    const numericAmount = Math.abs(Number(amount));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Montant invalide.' });
    }

    const resolvedAction = (action || type || 'add').toLowerCase();
    const isAdding = (
      resolvedAction === 'add' ||
      resolvedAction === 'credit' ||
      resolvedAction === 'ajouter' ||
      resolvedAction === '+'
    );

    const userDocRef = db.collection('users').doc(targetUserId);
    const userDocSnap = await userDocRef.get();
    let currentBalance = 0;
    let userData: any = {};

    if (userDocSnap.exists) {
      userData = userDocSnap.data() || {};
      const rawBal = userData.walletBalance ?? userData.balance ?? userData.solde ?? 0;
      currentBalance = isNaN(Number(rawBal)) ? 0 : Math.max(0, Number(rawBal));
    }

    let newBalance = 0;
    if (isAdding) {
      newBalance = currentBalance + numericAmount;
    } else {
      if (currentBalance < numericAmount) {
        return res.status(400).json({
          success: false,
          error: `Solde insuffisant pour ce débit. Solde actuel : ${currentBalance.toLocaleString('fr-FR')} FCFA.`
        });
      }
      newBalance = Math.max(0, currentBalance - numericAmount);
    }

    const nowIso = new Date().toISOString();
    const updateData = {
      walletBalance: newBalance,
      balance: newBalance,
      solde: newBalance,
      lastAdjustedAt: nowIso,
      lastAdjustedBy: adminEmail,
      updatedAt: nowIso
    };

    try {
      await userDocRef.update(updateData);
    } catch {
      await userDocRef.set({
        ...updateData,
        email: userData.email || userEmail || targetUserId,
        createdAt: userData.createdAt || nowIso
      }, { merge: true });
    }

    return res.status(200).json({
      success: true,
      message: `Solde mis à jour : ${newBalance.toLocaleString('fr-FR')} FCFA`,
      newBalance,
      walletBalance: newBalance,
      previousBalance: currentBalance,
      adjustedAmount: numericAmount,
      action: isAdding ? 'add' : 'remove'
    });
  } catch (err: any) {
    console.error('[Wallet Adjust Handler Error]:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Erreur interne' });
  }
}
