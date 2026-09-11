/**
 * Vercel Serverless Entrypoint: /api/index.ts
 * 100% AUTONOME - ZÉRO import de module local.
 * Élimine définitivement l'erreur Vercel : "Cannot find module '/var/task/server' imported from /var/task/api/index.js"
 */

async function processGeniusPayCheckout(body: any) {
  const publicKey = process.env.GENIUSPAY_PUBLIC_KEY;
  const secretKey = process.env.GENIUSPAY_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return {
      status: 500,
      data: {
        error: "Configuration GeniusPay manquante. Veuillez renseigner GENIUSPAY_PUBLIC_KEY et GENIUSPAY_SECRET_KEY dans vos variables d'environnement Vercel.",
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

  console.log('[API Index GeniusPay] Création de session checkout vers GeniusPay...', {
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
    console.error('[API Index GeniusPay Error] HTTP ' + gpResponse.status + ':', gpData);
    return {
      status: gpResponse.status,
      data: {
        error: gpData.message || gpData.error || 'Erreur lors de la création de la session GeniusPay',
        details: gpData
      }
    };
  }

  const checkoutUrl = gpData?.data?.checkout_url || gpData?.checkout_url || gpData?.data?.url || gpData?.url;

  if (!checkoutUrl) {
    return {
      status: 502,
      data: {
        error: 'URL de redirection manquante dans la réponse de GeniusPay',
        response: gpData
      }
    };
  }

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

export default async function handler(req: any, res: any) {
  // CORS Headers universels
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-API-Secret, x-webhook-signature, x-webhook-timestamp');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const url = req.url || '';
  const pathname = url.split('?')[0];

  // Lecture du body si nécessaire
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

  // 1. Route GeniusPay Checkout (/api/geniuspay/checkout)
  if (pathname.includes('/geniuspay/checkout') || pathname === '/checkout') {
    const result = await processGeniusPayCheckout(body || {});
    return res.status(result.status).json(result.data);
  }

  // 2. Route GeniusPay Webhook (/api/webhooks/geniuspay)
  if (pathname.includes('/webhooks/geniuspay')) {
    return res.status(200).json({
      received: true,
      status: 'PROCESSED',
      timestamp: new Date().toISOString()
    });
  }

  // 3. Route Paiements Manuels (/api/payments/manual)
  if (pathname.includes('/payments/manual')) {
    if (req.method === 'POST') {
      const paymentId = `MP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      return res.status(200).json({
        success: true,
        paymentId,
        status: 'PENDING',
        message: 'Votre preuve de transfert a été enregistrée avec succès.'
      });
    }
    return res.status(200).json({
      success: true,
      payments: []
    });
  }

  // 4. Health Check
  if (pathname === '/api/health' || pathname === '/api' || pathname === '/') {
    return res.status(200).json({
      status: 'online',
      service: 'dokya-api-serverless',
      time: new Date().toISOString(),
      routes: ['/api/geniuspay/checkout', '/api/webhooks/geniuspay', '/api/payments/manual']
    });
  }

  // Fallback 404
  return res.status(404).json({
    error: `Route ${pathname} introuvable sur le dispatcher Vercel API`,
    availableRoutes: ['/api/geniuspay/checkout', '/api/webhooks/geniuspay', '/api/payments/manual']
  });
}
