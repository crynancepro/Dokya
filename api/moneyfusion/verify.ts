/**
 * API Route: /api/moneyfusion/verify
 * Vérification en lecture seule du statut d'une transaction Money Fusion
 * Compatible Vercel Serverless Function & Next.js App Router & Node.js
 * 
 * NOTE ARCHITECTURE :
 * - Remplacement de l'API dépréciée `url.parse(...)` par l'API standard `new URL(req.url, 'http://localhost')`
 * - RÈGLE D'OR : Strictement en LECTURE SEULE. Seul le webhook officiel (/api/webhooks/moneyfusion)
 *   est habilité à exécuter le crédit atomique du solde utilisateur.
 */

// Helper asynchrone dynamique pour charger Firestore sans risque d'erreur ESM
let _cachedDb: any = null;
async function getFirestoreDb(): Promise<any> {
  if (_cachedDb) return _cachedDb;
  try {
    const mod = await import('../../lib/firebaseAdmin.js');
    _cachedDb = mod.db || mod.dbAdmin || null;
    return _cachedDb;
  } catch (err: any) {
    console.warn('[Verify API] Repli mémoire/hors ligne pour Firestore:', err?.message || err);
    return null;
  }
}

// Helper asynchrone pour vérifier avec l'API officielle Money Fusion en lecture seule
async function verifyOfficialMoneyFusionApi(tokenOrTxId: string) {
  try {
    const mod = await import('../../lib/moneyFusionVerify.js');
    if (typeof mod.verifyMoneyFusionWithOfficialApi === 'function') {
      return await mod.verifyMoneyFusionWithOfficialApi(tokenOrTxId);
    }
  } catch (err: any) {
    console.warn('[Verify API] Erreur appel module moneyFusionVerify:', err?.message || err);
  }
  return { isPaid: false, isPending: true, isFailed: false, status: 'PENDING', amount: 0 };
}

interface VerifyParams {
  token: string;
  transactionId: string;
  docId: string;
  userId: string;
  type: string;
  amount: number;
}

/**
 * Extraction standardisée et moderne des paramètres de requête.
 * Utilise `new URL(req.url, 'http://localhost')` pour remplacer `url.parse(...)` déprécié.
 */
function extractVerifyParams(req: any, bodyParams: any = {}): VerifyParams {
  let urlParams: Record<string, string> = {};

  if (typeof req?.url === 'string' && req.url.trim() !== '') {
    try {
      // Nouvelle API standard URL (conforme WHATWG, remplace url.parse déprécié)
      const parsedUrl = new URL(req.url, 'http://localhost');
      parsedUrl.searchParams.forEach((val, key) => {
        urlParams[key] = val;
      });
    } catch (e) {
      console.warn('[Verify API] Erreur parsing URL standard:', e);
    }
  }

  const queryParams = req?.query || {};
  const combined = { ...urlParams, ...queryParams, ...bodyParams };

  const token = String(combined.token || combined.paymentId || combined.orderId || '').trim();
  const transactionId = String(combined.transactionId || combined.reference || combined.orderReference || combined.ref || '').trim();
  const docId = String(combined.docId || combined.documentId || combined.itemId || '').trim();
  const userId = String(combined.userId || '').trim();
  const type = String(combined.type || '').trim().toLowerCase();
  const amount = Number(combined.amount || 0);

  return { token, transactionId, docId, userId, type, amount };
}

export async function processVerifyRequest(params: VerifyParams) {
  const { token, transactionId, docId, userId, type, amount } = params;
  const searchId = transactionId || token;

  const db = await getFirestoreDb();
  let txData: any = null;

  if (searchId && db && typeof db.collection === 'function') {
    try {
      const txDoc = await db.collection('transactions').doc(searchId).get();
      if (txDoc.exists) {
        txData = txDoc.data();
      } else {
        const qSnap = await db.collection('transactions').where('transactionId', '==', searchId).limit(1).get();
        if (!qSnap.empty) {
          txData = qSnap.docs[0].data();
        } else if (token) {
          const qTokenSnap = await db.collection('transactions').where('token', '==', token).limit(1).get();
          if (!qTokenSnap.empty) {
            txData = qTokenSnap.docs[0].data();
          }
        }
      }
    } catch (err: any) {
      console.warn('[Verify API] Erreur lecture transaction Firestore:', err?.message || err);
    }
  }

  const finalAmount = Number(txData?.amount || txData?.nominalAmount || txData?.expectedAmount || amount || 0);
  let status = txData?.status || 'PENDING';
  let isPaid = status === 'SUCCESS' || txData?.isProcessed === true;
  let currentNewBalance: number | undefined = undefined;

  // Si pas encore validé SUCCESS dans Firestore, interroge l'API officielle Money Fusion en lecture seule
  const queryToken = token || txData?.token || txData?.tokenPay || transactionId;
  if (!isPaid && queryToken) {
    try {
      const mfCheck = await verifyOfficialMoneyFusionApi(queryToken);
      if (mfCheck && mfCheck.isPaid) {
        // STRICTEMENT EN LECTURE SEULE :
        // Le webhook officiel (/api/webhooks/moneyfusion) est le SEUL habilité à créditer le solde via executeAtomicPaymentCredit.
        // Ici, on signale simplement paid: true pour l'affichage de confirmation à l'utilisateur.
        isPaid = true;
        status = 'SUCCESS';
        console.log(`[Verify API - Lecture Seule] Paiement certifié PAYÉ par API officielle Money Fusion pour ${queryToken}.`);
      }
    } catch (mfErr: any) {
      console.warn('[Verify API] Erreur vérification API Money Fusion:', mfErr?.message || mfErr);
    }
  }

  return {
    success: true,
    paid: isPaid,
    amount: finalAmount,
    status: status,
    newBalance: currentNewBalance,
    transactionId: searchId,
    docId: txData?.docId || docId || null,
    userId: txData?.userId || userId || null,
    type: txData?.type || type || null,
    message: isPaid
      ? 'Paiement validé avec succès'
      : 'Paiement en attente de confirmation par votre opérateur Mobile Money'
  };
}

// ---------------------------------------------------------------------------
// Handlers App Router (Next.js 13+ / 14+ / 15+)
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  // Utilisation de l'API standard `new URL(request.url, 'http://localhost')`
  const params = extractVerifyParams(request);
  const data = await processVerifyRequest(params);

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function POST(request: Request) {
  let body = {};
  try {
    body = await request.json();
  } catch {}

  // Utilisation de l'API standard `new URL(request.url, 'http://localhost')`
  const params = extractVerifyParams(request, body);
  const data = await processVerifyRequest(params);

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// ---------------------------------------------------------------------------
// Handler Pages Router & Vercel Serverless Function (req, res)
// ---------------------------------------------------------------------------
export default async function handler(req: any, res?: any) {
  // Si exécuté dans un environnement App Router (sans res.status)
  if (!res || typeof res.status !== 'function') {
    if (req.method === 'POST') {
      return POST(req);
    }
    return GET(req);
  }

  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    // Utilisation de la nouvelle API standard URL à la place de url.parse(...)
    const params = extractVerifyParams(req, body || {});
    const data = await processVerifyRequest(params);

    return res.status(200).json(data);
  } catch (err: any) {
    console.error('[Verify API Handler Error]:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Erreur interne lors de la vérification de transaction'
    });
  }
}
