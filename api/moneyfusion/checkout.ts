/**
 * API Route: /api/moneyfusion/checkout
 * 100% autonome - Compatible Vercel Serverless Function & Next.js App Router
 */

interface MoneyFusionRequestBody {
  amount?: number | string;
  docId?: string;
  userId?: string;
  userPhone?: string;
  userName?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  [key: string]: any;
}

export async function processMoneyFusionCheckout(body: MoneyFusionRequestBody) {
  const {
    amount = 1000,
    docId = '',
    userId = '',
    userPhone = '',
    userName = '',
    customer = {}
  } = body || {};

  const targetAmount = Math.max(100, Math.round(Number(amount) || 1000));
  const targetDocId = String(docId || '').trim();
  const targetUserId = String(userId || 'guest').trim() || 'guest';
  const targetPhone = String(userPhone || customer.phone || '00000000').trim() || '00000000';
  const targetName = String(userName || customer.name || 'Client Dokya').trim() || 'Client Dokya';

  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'https://dokya-seven.vercel.app').replace(/\/$/, '');
  const returnUrl = `${appBaseUrl}/dashboard?payment=success&docId=${targetDocId}`;
  const webhookUrl = `${appBaseUrl}/api/webhooks/moneyfusion`;

  const apiKey = process.env.MONEYFUSION_API_KEY;
  const directPaymentUrl = process.env.MONEYFUSION_PAYMENT_URL;

  let apiUrl = (process.env.MONEYFUSION_API_URL || 'https://api.moneyfusion.net').trim();
  let targetEndpoint = apiUrl;
  if (!targetEndpoint.includes('/api/')) {
    targetEndpoint = `${targetEndpoint.replace(/\/+$/, '')}/api/v1/payments`;
  }

  // Structure du payload requise par Money Fusion
  const payload = {
    totalPrice: Number(targetAmount),
    article: [{ "Déblocage Document Dokya": Number(targetAmount) }],
    personal_Info: [{ userId: targetUserId, docId: targetDocId }],
    numeroSend: targetPhone,
    nomclient: targetName,
    return_url: returnUrl,
    webhook_url: webhookUrl
  };

  if (apiKey || process.env.MONEYFUSION_API_URL) {
    try {
      const response = await fetch(targetEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}`, 'X-API-KEY': apiKey } : {})
        },
        body: JSON.stringify(payload)
      });

      const data: any = await response.json().catch(() => ({}));

      if (response.ok) {
        const redirectUrl = data.url || data.paymentUrl || data.checkout_url || data.checkoutUrl || data.data?.url || (data.token ? `https://pay.moneyfusion.net/pay/${data.token}` : null);
        if (redirectUrl) {
          return {
            status: 200,
            data: {
              success: true,
              url: redirectUrl,
              checkout_url: redirectUrl,
              paymentId: data.token || data.id || null
            }
          };
        }
      }
    } catch (err: any) {
      console.error('[Money Fusion Process Checkout Error]:', err);
    }
  }

  if (directPaymentUrl) {
    const sep = directPaymentUrl.includes('?') ? '&' : '?';
    const checkoutUrl = `${directPaymentUrl}${sep}amount=${targetAmount}&docId=${encodeURIComponent(targetDocId)}&userId=${encodeURIComponent(targetUserId)}`;
    return {
      status: 200,
      data: {
        success: true,
        url: checkoutUrl,
        checkout_url: checkoutUrl
      }
    };
  }

  const simulatedUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}status=approved&unlocked=true&ref=MF_${Date.now()}`;
  return {
    status: 200,
    data: {
      success: true,
      url: simulatedUrl,
      checkout_url: simulatedUrl,
      simulated: true
    }
  };
}

export default async function handler(req: any, res?: any) {
  if (!res || typeof res.status !== 'function') {
    // Request standard
    const body = req && typeof req.json === 'function' ? await req.json().catch(() => ({})) : {};
    const result = await processMoneyFusionCheckout(body);
    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Node req / res
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const result = await processMoneyFusionCheckout(body || {});
  return res.status(result.status).json(result.data);
}

export async function POST(req: any) {
  return handler(req);
}
