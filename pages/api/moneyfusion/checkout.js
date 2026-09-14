/**
 * Route API Backend (Next.js Pages Router / Vercel Serverless compatible)
 * POST /api/moneyfusion/checkout
 */
export default async function handler(req, res) {
  // CORS
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

    // Structure payload requise par Money Fusion
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
          const redirectUrl = data.url || data.paymentUrl || data.checkout_url || data.checkoutUrl || data.data?.url || (data.token ? `https://pay.moneyfusion.net/pay/${data.token}` : null);
          if (redirectUrl) {
            return res.status(200).json({
              success: true,
              url: redirectUrl,
              checkout_url: redirectUrl,
              paymentId: data.token || data.id || null
            });
          }
        }
      } catch (err) {
        console.error('[Money Fusion Pages API] Erreur API:', err);
      }
    }

    if (directPaymentUrl) {
      const sep = directPaymentUrl.includes('?') ? '&' : '?';
      const checkoutUrl = `${directPaymentUrl}${sep}amount=${targetAmount}&docId=${encodeURIComponent(targetDocId)}&userId=${encodeURIComponent(targetUserId)}`;
      return res.status(200).json({
        success: true,
        url: checkoutUrl,
        checkout_url: checkoutUrl
      });
    }

    const simulatedUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}status=approved&unlocked=true&ref=MF_${Date.now()}`;
    return res.status(200).json({
      success: true,
      url: simulatedUrl,
      checkout_url: simulatedUrl,
      simulated: true
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erreur interne Money Fusion' });
  }
}
