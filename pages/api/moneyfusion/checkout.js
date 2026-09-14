/**
 * Route API Backend (Next.js Pages Router / Vercel Serverless compatible)
 * POST /api/moneyfusion/checkout
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY');

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
    }

    const {
      amount = 3000,
      docId = '',
      userId = '',
      userPhone = '',
      userName = '',
      customer = {}
    } = body || {};

    const targetAmount = Math.max(100, Math.round(Number(amount) || 3000));
    const targetDocId = String(docId || '').trim();
    const targetUserId = String(userId || 'guest').trim() || 'guest';
    const targetPhone = String(userPhone || customer.phone || '00000000').trim() || '00000000';
    const targetName = String(userName || customer.name || 'Client Dokya').trim() || 'Client Dokya';

    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'https://dokya-seven.vercel.app').replace(/\/$/, '');
    const returnUrl = `${appBaseUrl}/dashboard?payment=success&docId=${targetDocId}`;
    const webhookUrl = `${appBaseUrl}/api/webhooks/moneyfusion`;

    const apiKey = process.env.MONEYFUSION_API_KEY;

    let targetEndpoint = (process.env.MONEYFUSION_API_URL || 'https://api.moneyfusion.net').trim();
    if (targetEndpoint === 'https://api.moneyfusion.net' || targetEndpoint === 'https://api.moneyfusion.net/') {
      targetEndpoint = 'https://api.moneyfusion.net/api/v1/payments';
    }

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

        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          const checkoutUrl = data.url || (data.token ? `https://pay.moneyfusion.net/checkout/${data.token}` : null);
          if (checkoutUrl) {
            return res.status(200).json({
              success: true,
              url: checkoutUrl,
              token: data.token || null
            });
          }
        }
      } catch (err) {
        console.error('[Money Fusion Pages API] Erreur:', err);
      }
    }

    const simulatedUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}status=approved&unlocked=true&ref=MF_${Date.now()}`;
    return res.status(200).json({
      success: true,
      url: simulatedUrl,
      simulated: true
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erreur interne Money Fusion' });
  }
}
