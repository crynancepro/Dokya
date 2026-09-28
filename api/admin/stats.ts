/**
 * API Route: /api/admin/stats
 * 100% autonome - Compatible Vercel Serverless Function & Next.js App Router
 * Renvoie les métriques et KPIs administratifs de Dokya
 */

import { dbAdmin } from '../../lib/firebaseAdmin';

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

async function computeRealStats() {
  try {
    const [txSnap, userSnap] = await Promise.all([
      dbAdmin.collection('transactions').get(),
      dbAdmin.collection('users').get()
    ]);

    let totalRevenue = 0;
    let successfulCount = 0;
    let cvOnlyRevenue = 0;
    let fullPackRevenue = 0;
    let letterRevenue = 0;
    let unlimitedRevenue = 0;
    let walletRechargeRevenue = 0;

    const allTx = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    userSnap.docs.forEach(d => {
      const u = d.data();
      totalCirculatingBalance += Number(u.walletBalance || u.balance || 0);
      totalCVsGenerated += Number(u.documentsCount || 0);
    });

    const successPaymentRate = allTx.length > 0 ? Math.round((successfulCount / allTx.length) * 100) : 100;

    return {
      totalRevenue,
      totalCVsGenerated,
      totalUsersCount: userSnap.size,
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
    };
  } catch (_e) {
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
}

export async function GET(req?: Request): Promise<Response> {
  const stats = await computeRealStats();
  return new Response(
    JSON.stringify({
      success: true,
      stats
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-email, x-admin-key'
      }
    }
  );
}

export default async function handler(req: any, res?: any) {
  if (!res || typeof res.status !== 'function') {
    return GET(req);
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-email, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const stats = await computeRealStats();
  return res.status(200).json({
    success: true,
    stats
  });
}
