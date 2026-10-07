/**
 * API Route Catch-All Consolidée : /api/admin/[...slug]
 * Regroupe tous les endpoints d'administration Dokya sous UNE SEULE Serverless Function Vercel
 * Respecte la limite stricte de 12 Serverless Functions du plan Vercel Hobby.
 *
 * Endpoints gérés :
 *  - /api/admin/stats                    (GET)
 *  - /api/admin/pricing                  (GET, POST)
 *  - /api/admin/promo-codes              (GET, POST)
 *  - /api/admin/promo-codes/:id          (DELETE)
 *  - /api/admin/promo-codes/:id/toggle   (POST)
 *  - /api/admin/users                    (GET, DELETE, PUT, PATCH)
 *  - /api/admin/users/:id                (GET, DELETE, PUT, PATCH)
 *  - /api/admin/users/:id/impersonate    (POST)
 *  - /api/admin/users/:id/unlock-documents (POST)
 *  - /api/admin/users/:id/toggle-suspension (POST)
 *  - /api/admin/wallet/adjust            (POST)
 *  - /api/admin/subscriptions/manage     (POST)
 *  - /api/admin/transactions             (GET, POST)
 *  - /api/admin/transactions/:id/validate (POST)
 *  - /api/admin/transactions/:id/reject  (POST)
 *  - /api/admin/clean-test-data          (POST)
 *  - /api/admin/purge-demo-data          (POST)
 */

import admin, { db, dbAdmin } from '../../lib/firebaseAdmin.js';
import { isAdminEmail } from '../../src/lib/adminAuth.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-email, x-admin-key, x-user-role, x-user-email'
};

// =========================================================================
// 1. HELPERS & FIREBASE ADMIN RESOLVER
// =========================================================================

let _resolvedDb: any = dbAdmin || db || null;

async function getDbAdmin(): Promise<any> {
  if (_resolvedDb) return _resolvedDb;
  try {
    const mod = await import('../../lib/firebaseAdmin.js');
    _resolvedDb = mod.dbAdmin || mod.db || null;
    if (_resolvedDb) return _resolvedDb;
  } catch (_e1) {}

  try {
    const mod = await import('../../lib/firebaseAdmin');
    _resolvedDb = mod.dbAdmin || mod.db || null;
    if (_resolvedDb) return _resolvedDb;
  } catch (_e2) {}

  return null;
}

function parseRoute(req: any, context?: any): { segments: string[]; path: string } {
  let segments: string[] = [];

  if (context?.params?.slug) {
    segments = Array.isArray(context.params.slug)
      ? context.params.slug
      : String(context.params.slug).split('/').filter(Boolean);
  } else if (req?.query?.slug) {
    segments = Array.isArray(req.query.slug)
      ? req.query.slug
      : String(req.query.slug).split('/').filter(Boolean);
  } else if (req?.query?.route) {
    segments = String(req.query.route).split('/').filter(Boolean);
  } else if (req?.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const allParts = parsed.pathname.split('/').filter(Boolean);
      const adminIdx = allParts.indexOf('admin');
      if (adminIdx !== -1) {
        segments = allParts.slice(adminIdx + 1);
      } else {
        segments = allParts;
      }
    } catch {}
  }

  return {
    segments,
    path: segments.join('/')
  };
}

async function getRequestBody(req: any): Promise<any> {
  if (req?.body) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  if (typeof req?.json === 'function') {
    try {
      return await req.json();
    } catch {
      return {};
    }
  }
  return {};
}

// =========================================================================
// 2. PRICING STORE & HANDLERS
// =========================================================================

let currentPricing = {
  cvOnlyPrice: 1000,
  letterOnlyPrice: 1000,
  fullPackPrice: 1399,
  devisPrice: 1000,
  facturePrice: 1000,
  businessPackPrice: 1499,
  ebookPrice: 1500,
  unlimitedPassPrice: 3499,
  unlimitedPassMonthlyPrice: 3499,
  unlimitedPassAnnualPrice: 39999,
  recruiterSearchPrice: 10000,
  currency: 'FCFA',
  updatedAt: new Date().toISOString(),
  updatedBy: 'system'
};

async function handlePricing(req: any, method: string) {
  if (method === 'GET') {
    return { status: 200, data: { success: true, pricing: currentPricing } };
  }
  if (method === 'POST') {
    const body = await getRequestBody(req);
    currentPricing = {
      ...currentPricing,
      ...body,
      updatedAt: new Date().toISOString()
    };
    return { status: 200, data: { success: true, pricing: currentPricing, message: 'Tarification mise à jour avec succès' } };
  }
  return { status: 405, data: { success: false, error: 'Méthode non autorisée sur pricing' } };
}

// =========================================================================
// 3. STATS HANDLER (REAL METRICS & KPIS)
// =========================================================================

function isRealCashInflow(tx: any): boolean {
  if (!tx) return false;
  const isApproved =
    tx.status === 'APPROVED' ||
    tx.status === 'VALIDATED_BY_AI' ||
    tx.status === 'success' ||
    tx.status === 'SUCCESS' ||
    tx.status === 'COMPLETED' ||
    tx.status === 'MANUALLY_VALIDATED';
  if (!isApproved) return false;

  const paymentMethod = String(tx.paymentMethod || tx.operator || tx.method || '').toLowerCase().trim();
  const txType = String(tx.type || tx.transactionType || '').toLowerCase().trim();
  const desc = String((tx.description || '') + ' ' + (tx.title || '')).toLowerCase();

  const isPaidWithWallet =
    paymentMethod === 'wallet' ||
    paymentMethod === 'solde' ||
    paymentMethod === 'solde_interne' ||
    paymentMethod === 'dokya_wallet' ||
    txType === 'wallet_debit' ||
    desc.includes('débit solde') ||
    desc.includes('payé par solde') ||
    desc.includes('payé avec solde');

  if (isPaidWithWallet) return false;

  const amt = Math.abs(Number(tx.amount || tx.expectedAmount || tx.extractedAmount || 0));
  return amt > 0;
}

function getDefaultStats() {
  return {
    totalRevenue: 0,
    totalCVsGenerated: 0,
    totalUsersCount: 0,
    totalTransactionsCount: 0,
    totalCirculatingBalance: 0,
    successPaymentRate: 100,
    revenueByService: {
      cvOnly: 0,
      letterOnly: 0,
      fullPack: 0,
      devis: 0,
      facture: 0,
      businessPack: 0,
      unlimitedPass: 0,
      walletRecharge: 0
    },
    dailyRevenueTrend: []
  };
}

async function handleStats() {
  try {
    const firestore = await getDbAdmin();
    if (!firestore) {
      return { status: 200, data: { success: true, stats: getDefaultStats() } };
    }

    const [txSnap, userSnap] = await Promise.all([
      firestore.collection('transactions').get(),
      firestore.collection('users').get()
    ]);

    let totalRevenue = 0;
    let successfulCount = 0;
    let cvOnlyRevenue = 0;
    let fullPackRevenue = 0;
    let letterRevenue = 0;
    let unlimitedRevenue = 0;
    let walletRechargeRevenue = 0;

    const allTx = (txSnap?.docs || []).map((d: any) => ({ id: d.id, ...d.data() }));
    allTx.forEach(tx => {
      if (isRealCashInflow(tx)) {
        const amt = Math.abs(Number((tx as any).amount || (tx as any).expectedAmount || 0));
        totalRevenue += amt;
        successfulCount++;

        const typeStr = ((tx as any).type || '').toLowerCase();
        const desc = (((tx as any).description || '') + ' ' + ((tx as any).title || '')).toLowerCase();

        if (typeStr.includes('wallet') || desc.includes('recharge') || desc.includes('crédit')) {
          walletRechargeRevenue += amt;
        } else if (desc.includes('pack') || desc.includes('duo')) {
          fullPackRevenue += amt;
        } else if (desc.includes('lettre')) {
          letterRevenue += amt;
        } else if (desc.includes('pass') || desc.includes('vip') || desc.includes('illimit')) {
          unlimitedRevenue += amt;
        } else {
          cvOnlyRevenue += amt;
        }
      }
    });

    let totalCirculatingBalance = 0;
    let totalCVsGenerated = 0;
    (userSnap?.docs || []).forEach((d: any) => {
      const u = d.data();
      totalCirculatingBalance += Number(u.walletBalance || u.balance || 0);
      totalCVsGenerated += Number(u.documentsCount || 0);
    });

    const successPaymentRate = allTx.length > 0 ? Math.round((successfulCount / allTx.length) * 100) : 100;

    return {
      status: 200,
      data: {
        success: true,
        stats: {
          totalRevenue,
          totalCVsGenerated,
          totalUsersCount: userSnap?.size || 0,
          totalTransactionsCount: allTx.length,
          totalCirculatingBalance,
          successPaymentRate,
          revenueByService: {
            cvOnly: cvOnlyRevenue,
            letterOnly: letterRevenue,
            fullPack: fullPackRevenue,
            devis: 0,
            facture: 0,
            businessPack: 0,
            unlimitedPass: unlimitedRevenue,
            walletRecharge: walletRechargeRevenue
          },
          dailyRevenueTrend: []
        }
      }
    };
  } catch (err) {
    console.warn('[Stats API Compute Warning]:', err);
    return { status: 200, data: { success: true, stats: getDefaultStats() } };
  }
}

// =========================================================================
// 4. PROMO CODES STORE & HANDLERS
// =========================================================================

const promoCodesStore: any[] = [
  {
    id: 'PRM-001',
    code: 'TERANGA20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 1000,
    maxUsageLimit: 500,
    currentUsageCount: 18,
    active: true,
    isPublished: true,
    description: '20% de remise sur tous les documents',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'PRM-002',
    code: 'DAKAR2026',
    discountType: 'percentage',
    discountValue: 30,
    minOrderAmount: 1399,
    maxUsageLimit: 200,
    currentUsageCount: 37,
    active: true,
    isPublished: true,
    description: '30% de remise spéciale Pack Duo & Business',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'PRM-003',
    code: 'VIP100',
    discountType: 'percentage',
    discountValue: 100,
    minOrderAmount: 0,
    maxUsageLimit: 100,
    currentUsageCount: 8,
    active: true,
    isPublished: false,
    description: 'Accès 100% gratuit VIP et testeurs',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

async function handlePromoCodes(req: any, method: string, segments: string[]) {
  // GET /api/admin/promo-codes
  if (method === 'GET' && segments.length === 1) {
    return { status: 200, data: { success: true, promoCodes: promoCodesStore } };
  }

  // POST /api/admin/promo-codes/:id/toggle
  if (method === 'POST' && segments.length >= 3 && segments[2] === 'toggle') {
    const promoId = segments[1];
    const target = promoCodesStore.find(p => p.id === promoId || p.code === promoId);
    if (target) {
      target.active = !target.active;
      return { status: 200, data: { success: true, promo: target } };
    }
    return { status: 404, data: { success: false, error: 'Code promo introuvable' } };
  }

  // DELETE /api/admin/promo-codes/:id
  if (method === 'DELETE' && segments.length >= 2) {
    const promoId = segments[1];
    const idx = promoCodesStore.findIndex(p => p.id === promoId || p.code === promoId);
    if (idx !== -1) {
      promoCodesStore.splice(idx, 1);
      return { status: 200, data: { success: true, message: 'Code promo supprimé' } };
    }
    return { status: 404, data: { success: false, error: 'Code promo introuvable' } };
  }

  // POST /api/admin/promo-codes (Create or update)
  if (method === 'POST') {
    const body = await getRequestBody(req);
    const existingIdx = promoCodesStore.findIndex(p => p.id === body.id || (p.code && p.code.toUpperCase() === String(body.code || '').toUpperCase()));
    if (existingIdx !== -1) {
      promoCodesStore[existingIdx] = { ...promoCodesStore[existingIdx], ...body };
      return { status: 200, data: { success: true, promo: promoCodesStore[existingIdx] } };
    } else {
      const newPromo = {
        id: body.id || `PRM-${Date.now()}`,
        code: String(body.code || `PROMO${Date.now()}`).toUpperCase().trim(),
        discountType: body.discountType || 'percentage',
        discountValue: Number(body.discountValue) || 10,
        minOrderAmount: Number(body.minOrderAmount) || 0,
        maxUsageLimit: Number(body.maxUsageLimit) || 100,
        currentUsageCount: 0,
        active: body.active !== undefined ? Boolean(body.active) : true,
        isPublished: Boolean(body.isPublished),
        description: body.description || '',
        createdAt: new Date().toISOString()
      };
      promoCodesStore.push(newPromo);
      return { status: 200, data: { success: true, promo: newPromo } };
    }
  }

  return { status: 405, data: { success: false, error: 'Méthode non autorisée sur promo-codes' } };
}

// =========================================================================
// 5. USERS & ACCOUNT MANAGEMENT
// =========================================================================

async function handleUsers(req: any, method: string, segments: string[]) {
  const firestore = await getDbAdmin();
  if (!firestore) {
    return { status: 500, data: { success: false, error: 'Base de données indisponible' } };
  }

  const userId = segments.length > 1 ? decodeURIComponent(segments[1]) : '';
  const subAction = segments.length > 2 ? segments[2] : '';

  // A) GET /api/admin/users
  if (method === 'GET' && !userId) {
    try {
      const usersSnapshot = await firestore.collection('users').get();
      const users: any[] = [];
      usersSnapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        users.push({
          uid: docSnap.id,
          id: docSnap.id,
          email: data.email || `${docSnap.id}@user.dokya.sn`,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          city: data.city || '',
          targetJob: data.targetJob || '',
          walletBalance: Number(data.walletBalance ?? data.balance ?? 0),
          balance: Number(data.walletBalance ?? data.balance ?? 0),
          role: data.role || 'candidate',
          status: data.status || 'active',
          subscriptionStatus: data.subscriptionStatus || 'free',
          hasForceUnlockedDocs: Boolean(data.hasForceUnlockedDocs),
          documentsCount: Number(data.documentsCount || 0),
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        });
      });
      return { status: 200, data: { success: true, users, total: users.length } };
    } catch (err: any) {
      return { status: 500, data: { success: false, error: err.message } };
    }
  }

  // B) Sub-actions on specific user: /api/admin/users/:id/subAction
  if (userId && subAction) {
    if (subAction === 'impersonate') {
      return { status: 200, data: { success: true, message: `Session d'usurpation initialisée pour ${userId}` } };
    }

    if (subAction === 'unlock-documents') {
      try {
        await firestore.collection('users').doc(userId).set({ hasForceUnlockedDocs: true, updatedAt: new Date().toISOString() }, { merge: true });
        return { status: 200, data: { success: true, message: `Tous les documents ont été débloqués pour l'utilisateur ${userId}` } };
      } catch (err: any) {
        return { status: 500, data: { success: false, error: err.message } };
      }
    }

    if (subAction === 'toggle-suspension') {
      try {
        const docRef = firestore.collection('users').doc(userId);
        const snap = await docRef.get();
        const currentStatus = snap.exists() ? snap.data().status : 'active';
        const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
        await docRef.set({ status: newStatus, updatedAt: new Date().toISOString() }, { merge: true });
        return { status: 200, data: { success: true, status: newStatus, message: `Compte ${newStatus === 'suspended' ? 'suspendu' : 'réactivé'}` } };
      } catch (err: any) {
        return { status: 500, data: { success: false, error: err.message } };
      }
    }
  }

  // C) DELETE user: /api/admin/users/:id ou /api/admin/users avec body.targetUserId
  if (method === 'DELETE') {
    let targetId = userId;
    if (!targetId) {
      const body = await getRequestBody(req);
      targetId = body.targetUserId || body.userId || body.id;
    }

    if (!targetId) {
      return { status: 400, data: { success: false, error: 'Identifiant utilisateur requis pour la suppression' } };
    }

    if (targetId === 'peter25ngouala@gmail.com') {
      return { status: 403, data: { success: false, error: 'Impossible de supprimer le compte Super Administrateur' } };
    }

    try {
      if ((admin as any)?.auth && typeof (admin as any).auth === 'function') {
        try {
          await (admin as any).auth().deleteUser(targetId);
        } catch (_authErr) {}
      }
      await firestore.collection('users').doc(targetId).delete();
      return { status: 200, data: { success: true, message: `Utilisateur ${targetId} supprimé avec succès` } };
    } catch (err: any) {
      return { status: 500, data: { success: false, error: err.message } };
    }
  }

  // D) PUT / PATCH user: /api/admin/users/:id ou /api/admin/users
  if (method === 'PUT' || method === 'PATCH') {
    const body = await getRequestBody(req);
    const targetId = userId || body.userId || body.uid || body.id;
    if (!targetId) {
      return { status: 400, data: { success: false, error: 'Identifiant utilisateur manquant' } };
    }

    try {
      await firestore.collection('users').doc(targetId).set({ ...body, updatedAt: new Date().toISOString() }, { merge: true });
      return { status: 200, data: { success: true, message: 'Utilisateur mis à jour avec succès' } };
    } catch (err: any) {
      return { status: 500, data: { success: false, error: err.message } };
    }
  }

  return { status: 405, data: { success: false, error: 'Méthode non autorisée sur users' } };
}

// =========================================================================
// 6. WALLET ADJUSTMENT HANDLER
// =========================================================================

async function handleWalletAdjust(req: any) {
  const firestore = await getDbAdmin();
  if (!firestore) {
    return { status: 500, data: { success: false, error: 'Base de données indisponible' } };
  }

  const body = await getRequestBody(req);
  const {
    userId,
    userEmail,
    amount,
    action = 'add',
    reason = 'Ajustement Administrateur Dokya',
    adminEmail = 'peter25ngouala@gmail.com'
  } = body;

  const targetUserId = userId || (userEmail ? userEmail.trim().toLowerCase() : '');
  if (!targetUserId) {
    return { status: 400, data: { success: false, error: 'Identifiant utilisateur requis' } };
  }

  const numericAmount = Math.abs(Number(amount));
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return { status: 400, data: { success: false, error: 'Montant invalide (> 0 requis)' } };
  }

  try {
    const userDocRef = firestore.collection('users').doc(targetUserId);
    const userDoc = await userDocRef.get();
    const currentBalance = userDoc.exists() ? Number(userDoc.data().walletBalance ?? userDoc.data().balance ?? 0) : 0;

    let newBalance = currentBalance;
    if (action === 'subtract') {
      newBalance = Math.max(0, currentBalance - numericAmount);
    } else {
      newBalance = currentBalance + numericAmount;
    }

    await userDocRef.set({
      walletBalance: newBalance,
      balance: newBalance,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Enregistrement de la transaction d'ajustement
    const txId = `ADJ-${Date.now()}`;
    await firestore.collection('transactions').doc(txId).set({
      id: txId,
      userId: targetUserId,
      type: action === 'subtract' ? 'admin_debit' : 'admin_credit',
      amount: numericAmount,
      balanceAfter: newBalance,
      status: 'APPROVED',
      reason,
      adminEmail,
      createdAt: new Date().toISOString()
    });

    return {
      status: 200,
      data: {
        success: true,
        balance: newBalance,
        message: `Solde mis à jour à ${newBalance} FCFA`
      }
    };
  } catch (err: any) {
    return { status: 500, data: { success: false, error: err.message } };
  }
}

// =========================================================================
// 7. SUBSCRIPTIONS MANAGE HANDLER
// =========================================================================

async function handleSubscriptionsManage(req: any) {
  const firestore = await getDbAdmin();
  if (!firestore) {
    return { status: 500, data: { success: false, error: 'Base de données indisponible' } };
  }

  const body = await getRequestBody(req);
  const { userId, action, days = 30 } = body;
  if (!userId) {
    return { status: 400, data: { success: false, error: 'userId requis' } };
  }

  try {
    const userDocRef = firestore.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    const userData = userDoc.exists() ? userDoc.data() : {};

    let subscriptionStatus = userData.subscriptionStatus || 'free';
    let subscription = userData.subscription || {};

    if (action === 'extend' || action === 'activate') {
      subscriptionStatus = 'unlimited';
      const now = Date.now();
      const currentExpiry = subscription.expiresAt ? new Date(subscription.expiresAt).getTime() : now;
      const baseTime = currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(baseTime + Number(days) * 86400000).toISOString();

      subscription = {
        ...subscription,
        status: 'ACTIVE',
        planName: 'Pass VIP Dokya',
        activatedAt: subscription.activatedAt || new Date().toISOString(),
        expiresAt: newExpiry,
        adminNote: `Prolongé de ${days} jours par admin`
      };
    } else if (action === 'suspend') {
      subscriptionStatus = 'free';
      subscription = {
        ...subscription,
        status: 'EXPIRED',
        adminNote: 'Suspendu par administrateur'
      };
    }

    await userDocRef.set({
      subscriptionStatus,
      subscription,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return { status: 200, data: { success: true, subscriptionStatus, subscription, message: 'Abonnement mis à jour' } };
  } catch (err: any) {
    return { status: 500, data: { success: false, error: err.message } };
  }
}

// =========================================================================
// 8. TRANSACTIONS HANDLER
// =========================================================================

async function handleTransactions(req: any, method: string, segments: string[]) {
  const firestore = await getDbAdmin();
  if (!firestore) {
    return { status: 200, data: { success: true, transactions: [] } };
  }

  if (method === 'GET') {
    try {
      const snap = await firestore.collection('transactions').get();
      const transactions: any[] = [];
      snap.forEach((d: any) => transactions.push({ id: d.id, ...d.data() }));
      return { status: 200, data: { success: true, transactions } };
    } catch (err: any) {
      return { status: 500, data: { success: false, error: err.message } };
    }
  }

  if (method === 'POST') {
    const txId = segments.length > 1 ? segments[1] : '';
    const subAction = segments.length > 2 ? segments[2] : '';

    if (txId && subAction === 'validate') {
      try {
        await firestore.collection('transactions').doc(txId).set({ status: 'APPROVED', manuallyValidatedAt: new Date().toISOString() }, { merge: true });
        return { status: 200, data: { success: true, message: `Transaction ${txId} validée` } };
      } catch (err: any) {
        return { status: 500, data: { success: false, error: err.message } };
      }
    }

    if (txId && subAction === 'reject') {
      try {
        await firestore.collection('transactions').doc(txId).set({ status: 'REJECTED', rejectedAt: new Date().toISOString() }, { merge: true });
        return { status: 200, data: { success: true, message: `Transaction ${txId} rejetée` } };
      } catch (err: any) {
        return { status: 500, data: { success: false, error: err.message } };
      }
    }

    const body = await getRequestBody(req);
    const newTxId = body.id || `TX-${Date.now()}`;
    try {
      await firestore.collection('transactions').doc(newTxId).set({ ...body, id: newTxId, createdAt: new Date().toISOString() }, { merge: true });
      return { status: 200, data: { success: true, transactionId: newTxId } };
    } catch (err: any) {
      return { status: 500, data: { success: false, error: err.message } };
    }
  }

  return { status: 405, data: { success: false, error: 'Méthode non autorisée sur transactions' } };
}

// =========================================================================
// 9. CLEAN / PURGE DEMO DATA HANDLER
// =========================================================================

async function handleCleanTestData(req: any) {
  const requesterEmail = req.headers?.['x-admin-email'] || req.headers?.['x-user-email'] || '';
  if (requesterEmail && !isAdminEmail(String(requesterEmail))) {
    return { status: 403, data: { success: false, error: 'Accès non autorisé. Droits administrateur requis.' } };
  }

  const firestore = await getDbAdmin();
  if (!firestore) {
    return { status: 500, data: { success: false, error: 'Base de données indisponible' } };
  }

  try {
    const txSnap = await firestore.collection('transactions').get();
    for (const d of (txSnap.docs || [])) {
      await firestore.collection('transactions').doc(d.id).delete();
    }
    const paySnap = await firestore.collection('payments').get();
    for (const d of (paySnap.docs || [])) {
      await firestore.collection('payments').doc(d.id).delete();
    }
    const storeOrdersSnap = await firestore.collection('store_orders').get();
    for (const d of (storeOrdersSnap.docs || [])) {
      await firestore.collection('store_orders').doc(d.id).delete();
    }
    const userDocsSnap = await firestore.collection('user_documents').get();
    for (const d of (userDocsSnap.docs || [])) {
      await firestore.collection('user_documents').doc(d.id).delete();
    }

    return {
      status: 200,
      data: {
        success: true,
        message: 'Données de test et démonstration purgées avec succès.'
      }
    };
  } catch (err: any) {
    return { status: 500, data: { success: false, error: err.message } };
  }
}

// =========================================================================
// 10. ROUTER CENTRAL & DISPATCHER
// =========================================================================

async function dispatchAdminRoute(req: any, method: string, context?: any): Promise<{ status: number; data: any }> {
  const { segments } = parseRoute(req, context);
  const root = segments[0] ? segments[0].toLowerCase() : '';

  switch (root) {
    case 'stats':
    case '':
      return handleStats();

    case 'pricing':
      return handlePricing(req, method);

    case 'promo-codes':
    case 'codes-promo':
      return handlePromoCodes(req, method, segments);

    case 'users':
      return handleUsers(req, method, segments);

    case 'wallet':
      if (segments[1] === 'adjust') {
        return handleWalletAdjust(req);
      }
      return { status: 404, data: { success: false, error: `Sous-route wallet '${segments[1]}' inconnue` } };

    case 'subscriptions':
      if (segments[1] === 'manage') {
        return handleSubscriptionsManage(req);
      }
      return { status: 404, data: { success: false, error: `Sous-route subscriptions '${segments[1]}' inconnue` } };

    case 'transactions':
      return handleTransactions(req, method, segments);

    case 'clean-test-data':
    case 'purge-demo-data':
      return handleCleanTestData(req);

    default:
      return {
        status: 404,
        data: {
          success: false,
          error: `Route administrative inconnue: /api/admin/${segments.join('/')}`,
          availableEndpoints: [
            '/api/admin/stats',
            '/api/admin/pricing',
            '/api/admin/promo-codes',
            '/api/admin/users',
            '/api/admin/wallet/adjust',
            '/api/admin/subscriptions/manage',
            '/api/admin/transactions',
            '/api/admin/clean-test-data'
          ]
        }
      };
  }
}

// =========================================================================
// 11. EXPORTS : COMPATIBLE VERCEL SERVERLESS & NEXT.JS APP ROUTER
// =========================================================================

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request, context?: any): Promise<Response> {
  const result = await dispatchAdminRoute(req, 'GET', context);
  return new Response(JSON.stringify(result.data), { status: result.status, headers: CORS_HEADERS });
}

export async function POST(req: Request, context?: any): Promise<Response> {
  const result = await dispatchAdminRoute(req, 'POST', context);
  return new Response(JSON.stringify(result.data), { status: result.status, headers: CORS_HEADERS });
}

export async function PUT(req: Request, context?: any): Promise<Response> {
  const result = await dispatchAdminRoute(req, 'PUT', context);
  return new Response(JSON.stringify(result.data), { status: result.status, headers: CORS_HEADERS });
}

export async function PATCH(req: Request, context?: any): Promise<Response> {
  const result = await dispatchAdminRoute(req, 'PATCH', context);
  return new Response(JSON.stringify(result.data), { status: result.status, headers: CORS_HEADERS });
}

export async function DELETE(req: Request, context?: any): Promise<Response> {
  const result = await dispatchAdminRoute(req, 'DELETE', context);
  return new Response(JSON.stringify(result.data), { status: result.status, headers: CORS_HEADERS });
}

export default async function handler(req: any, res?: any) {
  if (!res || typeof res.status !== 'function') {
    const method = req?.method || 'GET';
    const result = await dispatchAdminRoute(req, method);
    return new Response(JSON.stringify(result.data), { status: result.status, headers: CORS_HEADERS });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-email, x-admin-key, x-user-role, x-user-email');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const result = await dispatchAdminRoute(req, req.method);
  return res.status(result.status).json(result.data);
}
