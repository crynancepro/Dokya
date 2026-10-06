import type { IncomingMessage, ServerResponse } from 'http';
import { dbAdmin as importedDbAdmin } from '../../lib/firebaseAdmin.js';
import { isAdminEmail } from '../../src/lib/adminAuth.js';

let _resolvedDb: any = importedDbAdmin || null;

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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const requesterEmail = req.headers['x-admin-email'] || req.headers['x-user-email'] || req.body?.adminEmail || '';
  if (!isAdminEmail(String(requesterEmail))) {
    return res.status(403).json({ success: false, error: 'Accès non autorisé. Droits administrateur requis.' });
  }

  try {
    const db = await getDbAdmin();
    if (!db) {
      return res.status(500).json({ success: false, error: 'Base de données indisponible' });
    }

    // Purge test transactions
    const txSnap = await db.collection('transactions').get();
    let txCount = 0;
    for (const d of (txSnap.docs || [])) {
      await db.collection('transactions').doc(d.id).delete();
      txCount++;
    }

    // Purge test payments & orders
    const paySnap = await db.collection('payments').get();
    for (const d of (paySnap.docs || [])) {
      await db.collection('payments').doc(d.id).delete();
    }
    const storeOrdersSnap = await db.collection('store_orders').get();
    for (const d of (storeOrdersSnap.docs || [])) {
      await db.collection('store_orders').doc(d.id).delete();
    }
    const userDocsSnap = await db.collection('user_documents').get();
    for (const d of (userDocsSnap.docs || [])) {
      await db.collection('user_documents').doc(d.id).delete();
    }

    // Reset user balances & counters
    const usersSnap = await db.collection('users').get();
    for (const d of (usersSnap.docs || [])) {
      const data = d.data() || {};
      const email = (data.email || '').toLowerCase().trim();
      const isAdmin = email === 'peter25ngouala@gmail.com';
      await db.collection('users').doc(d.id).update({
        walletBalance: 0,
        balance: 0,
        credits: 0,
        ordersCount: 0,
        documentsCount: 0,
        role: isAdmin ? 'admin' : (data.role || 'candidate'),
        subscriptionStatus: 'free',
        updatedAt: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      message: `Nettoyage réussi: ${txCount} transaction(s) et commandes supprimées. Soldes et compteurs réinitialisés à neuf.`,
      purgedTransactions: txCount
    });
  } catch (err: any) {
    console.error('[clean-test-data API error]:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Erreur lors du nettoyage' });
  }
}
