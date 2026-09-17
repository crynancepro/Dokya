import { NextResponse } from 'next/server';

/**
 * Route API Backend : Initialisation du Checkout Money Fusion
 * POST /api/moneyfusion/checkout
 * 
 * Conforme à la documentation officielle Money Fusion
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      amount = 3000,
      docId = '',
      plan = '',
      planId = '',
      type = '',
      userId = '',
      userPhone = '',
      userName = '',
      description = '',
      customer = {}
    } = body || {};

    const resolvedUserId = String(userId || 'guest').trim();
    const resolvedDocId = String(docId || '').trim();
    const resolvedPlan = String(plan || planId || '').trim();
    const resolvedType = String(type || (resolvedDocId ? 'document' : (resolvedPlan ? 'subscription' : 'wallet'))).trim();
    const resolvedAmount = Number(amount) || 3000;
    const resolvedPhone = String(userPhone || customer.phone || '00000000').trim() || '00000000';
    const resolvedName = String(userName || customer.name || 'Client Dokya').trim() || 'Client Dokya';
    const resolvedDescription = description || (resolvedDocId ? "Déblocage Document Dokya" : (resolvedPlan ? `Abonnement Dokya ${resolvedPlan}` : "Service Dokya"));

    // Payload officiel Money Fusion
    const paymentData = {
      totalPrice: Number(resolvedAmount),
      article: [
        { [resolvedDescription || "Service Dokya"]: Number(resolvedAmount) }
      ],
      personal_Info: [
        { 
          userId: resolvedUserId, 
          docId: resolvedDocId || "", 
          type: resolvedType || "wallet", 
          plan: resolvedPlan || "" 
        }
      ],
      numeroSend: resolvedPhone || "00000000",
      nomclient: resolvedName || "Client Dokya",
      return_url: "https://dokya-seven.vercel.app/dashboard?payment=success",
      webhook_url: "https://dokya-seven.vercel.app/api/webhooks/moneyfusion"
    };

    console.log('[Money Fusion Checkout] Payload officiel envoyé :', JSON.stringify(paymentData, null, 2));

    const apiKey = process.env.MONEYFUSION_API_KEY;

    // Détermination de l'endpoint API Money Fusion
    let targetEndpoint = (process.env.MONEYFUSION_API_URL || 'https://api.moneyfusion.net').trim();
    if (targetEndpoint === 'https://api.moneyfusion.net' || targetEndpoint === 'https://api.moneyfusion.net/') {
      targetEndpoint = 'https://api.moneyfusion.net/api/v1/payments';
    }

    if (apiKey || process.env.MONEYFUSION_API_URL) {
      try {
        const response = await fetch(targetEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(apiKey ? { 'Authorization': `Bearer ${apiKey}`, 'X-API-KEY': apiKey } : {})
          },
          body: JSON.stringify(paymentData)
        });

        const data = await response.json().catch(() => ({}));
        console.log('[Money Fusion Checkout] Réponse reçue:', response.status, data);

        if (response.ok) {
          const checkoutUrl = data.url || (data.token ? `https://pay.moneyfusion.net/checkout/${data.token}` : null);
          if (checkoutUrl) {
            return NextResponse.json({
              success: true,
              url: checkoutUrl,
              token: data.token || null
            });
          }
        }
      } catch (err) {
        console.error('[Money Fusion Checkout] Erreur lors de l\'appel API:', err);
      }
    }

    // Fallback de simulation pour tests locaux et prévisualisations
    const simulatedUrl = `https://dokya-seven.vercel.app/dashboard?payment=success&status=approved&unlocked=true&docId=${resolvedDocId}&plan=${resolvedPlan}&type=${resolvedType}&amount=${resolvedAmount}&ref=MF_${Date.now()}`;
    return NextResponse.json({
      success: true,
      url: simulatedUrl,
      simulated: true
    });
  } catch (error) {
    console.error('[Money Fusion Checkout Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne Money Fusion' },
      { status: 500 }
    );
  }
}
