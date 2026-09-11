/**
 * API Route: /api/geniuspay/checkout
 * 100% autonome - Compatible Vercel Serverless Function & Next.js App Router
 * Aucune dépendance vers '../server' ou 'server.ts'.
 */

interface CheckoutRequestBody {
  amount?: number | string;
  email?: string;
  userEmail?: string;
  userId?: string;
  affiliateId?: string;
  referredBy?: string;
  currency?: string;
  description?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  success_url?: string;
  error_url?: string;
  metadata?: {
    userId?: string;
    affiliateId?: string;
    referredBy?: string;
    planType?: string;
    documentId?: string;
    source?: string;
  };
}

async function processCheckout(body: CheckoutRequestBody) {
  const publicKey = process.env.GENIUSPAY_PUBLIC_KEY;
  const secretKey = process.env.GENIUSPAY_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return {
      status: 500,
      data: {
        error: "Configuration GeniusPay manquante. Veuillez renseigner GENIUSPAY_PUBLIC_KEY et GENIUSPAY_SECRET_KEY dans vos variables d'environnement.",
        missingConfig: true
      }
    };
  }

  const {
    amount = 5000,
    email,
    userEmail,
    userId,
    affiliateId,
    referredBy,
    currency = 'XOF',
    description = 'Abonnement Pass VIP - DOKYA',
    customer = {},
    success_url,
    error_url,
    metadata = {}
  } = body || {};

  const targetAmount = Math.max(100, Math.round(Number(amount) || 5000));
  const targetEmail = (email || userEmail || customer.email || 'client@dokya.com').trim();
  const targetName = (customer.name || 'Client Dokya').trim();
  const targetPhone = (customer.phone || '+221770000000').trim();
  const targetUserId = (userId || metadata.userId || 'anonymous').trim();
  const targetAffiliateId = (affiliateId || referredBy || metadata.affiliateId || metadata.referredBy || '').trim();
  const targetPlanType = metadata.planType || 'PASS_VIP';

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'https://dokya-seven.vercel.app';
  const finalSuccessUrl = success_url || `${appBaseUrl}/dashboard?payment=success&provider=geniuspay`;
  const finalErrorUrl = error_url || `${appBaseUrl}/checkout?payment=error&provider=geniuspay`;

  // Construction du payload conforme à l'API GeniusPay
  // IMPORTANT: en omettant payment_method, GeniusPay active sa page multi-opérateurs
  const payload = {
    amount: targetAmount,
    currency: currency || 'XOF',
    description: description || 'Abonnement Pass VIP - DOKYA',
    customer: {
      name: targetName,
      email: targetEmail,
      phone: targetPhone
    },
    success_url: finalSuccessUrl,
    error_url: finalErrorUrl,
    metadata: {
      userId: targetUserId,
      affiliateId: targetAffiliateId,
      referredBy: targetAffiliateId,
      planType: targetPlanType,
      source: 'dokya_checkout'
    }
  };

  console.log('[GeniusPay Checkout] Initialisation checkout autonome vers https://geniuspay.ci/api/v1/merchant/payments...', {
    amount: payload.amount,
    email: payload.customer.email,
    userId: payload.metadata.userId,
    affiliateId: payload.metadata.affiliateId
  });

  const gpResponse = await fetch('https://geniuspay.ci/api/v1/merchant/payments', {
    method: 'POST',
    headers: {
      'X-API-Key': publicKey,
      'X-API-Secret': secretKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const gpData: any = await gpResponse.json().catch(() => ({}));

  if (!gpResponse.ok) {
    console.error('[GeniusPay Checkout Error] HTTP ' + gpResponse.status + ':', gpData);
    return {
      status: gpResponse.status,
      data: {
        error: gpData.message || gpData.error || 'Erreur lors de la création de la session de paiement GeniusPay',
        details: gpData
      }
    };
  }

  const checkoutUrl = gpData?.data?.checkout_url || gpData?.checkout_url || gpData?.data?.url || gpData?.url;

  if (!checkoutUrl) {
    console.error('[GeniusPay Checkout Error] URL de redirection absente:', gpData);
    return {
      status: 502,
      data: {
        error: 'URL de redirection manquante dans la réponse de GeniusPay',
        response: gpData
      }
    };
  }

  console.log('[GeniusPay Checkout Success] Session générée avec succès:', checkoutUrl);

  return {
    status: 200,
    data: {
      success: true,
      checkout_url: checkoutUrl,
      checkoutUrl: checkoutUrl,
      paymentId: gpData?.data?.id || gpData?.id || null
    }
  };
}

/**
 * Gestionnaire pour requêtes Web Standard (Next.js App Router / Edge)
 */
async function handleWebRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-API-Secret'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const result = await processCheckout(body);
    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    console.error('[GeniusPay Web Handler Error]:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Gestionnaire Node.js (Vercel Serverless Function classique)
 */
async function handleNodeRequest(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-API-Secret');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    } else if (!body && typeof req.on === 'function') {
      const raw = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', (chunk: any) => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', () => resolve(''));
      });
      try {
        body = JSON.parse(raw);
      } catch {
        body = {};
      }
    }

    const result = await processCheckout(body || {});
    return res.status(result.status).json(result.data);
  } catch (err: any) {
    console.error('[GeniusPay Node Handler Error]:', err);
    return res.status(500).json({ error: err.message || 'Erreur interne du serveur' });
  }
}

/**
 * Export par défaut universel : détecte si res est fourni (Node) ou si req est un objet Request (Web)
 */
export default async function handler(req: any, res?: any) {
  if (!res || typeof res.status !== 'function') {
    return handleWebRequest(req);
  }
  return handleNodeRequest(req, res);
}

/**
 * Export nommé pour compatibilité Next.js App Router (POST /api/geniuspay/checkout)
 */
export async function POST(req: any) {
  if (req && typeof req.json === 'function') {
    return handleWebRequest(req);
  }
  return handler(req);
}
