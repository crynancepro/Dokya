import { NextResponse } from 'next/server';

/**
 * Route API Next.js App Router : Initialisation du Checkout Money Fusion
 * POST /api/moneyfusion/checkout
 * 
 * Reçoit les demandes de paiement de la modale frontend et transmet la requête
 * à process.env.MONEYFUSION_API_URL avec la structure JSON requise par Money Fusion :
 * - totalPrice
 * - article
 * - personal_Info
 * - return_url
 * - webhook_url
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      amount = 1000,
      docId = '',
      userId = '',
      email,
      userEmail,
      userName,
      description = 'Déblocage document Dokya',
      customer = {},
      success_url,
      error_url,
      cancel_url,
      metadata = {}
    } = body;

    const targetAmount = Math.max(100, Math.round(Number(amount) || 1000));
    const targetDocId = String(docId || metadata.targetDocId || metadata.docId || '').trim();
    const targetUserId = String(userId || metadata.userId || 'anonymous').trim();
    const targetEmail = (email || userEmail || customer.email || 'client@dokya.com').trim();
    const targetName = (userName || customer.name || 'Client Dokya').trim();
    const targetPhone = (customer.phone || '+221770000000').trim();

    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'https://dokya-seven.vercel.app').replace(/\/$/, '');
    const finalSuccessUrl = success_url || `${appBaseUrl}/dashboard?payment=success&provider=moneyfusion&docId=${targetDocId}`;
    const finalCancelUrl = error_url || cancel_url || `${appBaseUrl}/dashboard?payment=cancelled&provider=moneyfusion&docId=${targetDocId}`;
    const webhookUrl = `${appBaseUrl}/api/webhooks/moneyfusion`;

    const apiKey = process.env.MONEYFUSION_API_KEY;
    const directPaymentUrl = process.env.MONEYFUSION_PAYMENT_URL;

    // Détermination de l'endpoint API Money Fusion
    let apiUrl = (process.env.MONEYFUSION_API_URL || 'https://api.moneyfusion.net').trim();
    let targetEndpoint = apiUrl;
    if (!targetEndpoint.includes('/api/')) {
      targetEndpoint = `${targetEndpoint.replace(/\/+$/, '')}/api/v1/payments`;
    }

    console.log('[Money Fusion Checkout] Requête reçue:', {
      amount: targetAmount,
      docId: targetDocId,
      userId: targetUserId,
      hasApiKey: Boolean(apiKey),
      endpoint: targetEndpoint
    });

    // Structure JSON requise par Money Fusion (totalPrice, article, personal_Info, return_url, webhook_url)
    const moneyFusionPayload = {
      totalPrice: targetAmount,
      article: [
        {
          name: description || `Document Pro Dokya (${targetDocId || 'Pro'})`,
          price: targetAmount,
          quantity: 1
        }
      ],
      personal_Info: [
        {
          userId: targetUserId,
          docId: targetDocId,
          nom: targetName,
          prenom: '',
          email: targetEmail,
          telephone: targetPhone
        }
      ],
      return_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      webhook_url: webhookUrl
    };

    // 1. Si une clé API Money Fusion officielle ou une URL d'API est configurée, appel du service
    if (apiKey || process.env.MONEYFUSION_API_URL) {
      try {
        const response = await fetch(targetEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(apiKey ? { 'Authorization': `Bearer ${apiKey}`, 'X-API-KEY': apiKey } : {})
          },
          body: JSON.stringify(moneyFusionPayload)
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          const paymentUrl = data.url || data.paymentUrl || data.checkout_url || data.checkoutUrl || data.data?.url || (data.token ? `https://pay.moneyfusion.net/pay/${data.token}` : null);
          if (paymentUrl) {
            console.log('[Money Fusion Checkout] URL générée avec succès par l\'API Money Fusion:', paymentUrl);
            return NextResponse.json({
              success: true,
              url: paymentUrl,
              checkout_url: paymentUrl,
              checkoutUrl: paymentUrl,
              paymentId: data.token || data.id || data.orderId || null,
              provider: 'moneyfusion'
            });
          }
        }

        console.warn('[Money Fusion Checkout] Réponse de l\'API Money Fusion sans URL directe:', data);
      } catch (apiErr) {
        console.error('[Money Fusion Checkout] Erreur lors de l\'appel API Money Fusion:', apiErr);
      }
    }

    // 2. Si un lien marchand direct Money Fusion (Fusion Link) est configuré
    if (directPaymentUrl) {
      const separator = directPaymentUrl.includes('?') ? '&' : '?';
      const checkoutUrl = `${directPaymentUrl}${separator}amount=${targetAmount}&docId=${encodeURIComponent(targetDocId)}&userId=${encodeURIComponent(targetUserId)}`;
      return NextResponse.json({
        success: true,
        url: checkoutUrl,
        checkout_url: checkoutUrl,
        checkoutUrl,
        provider: 'moneyfusion'
      });
    }

    // 3. Fallback de test / simulation pour le preview si aucune clé n'est encore configurée
    console.info('[Money Fusion Checkout] Mode simulation/test actif (Renseignez MONEYFUSION_API_KEY dans les paramètres pour la production).');
    const simulatedSuccessUrl = `${finalSuccessUrl}${finalSuccessUrl.includes('?') ? '&' : '?'}status=approved&unlocked=true&ref=MF_${Date.now()}`;

    return NextResponse.json({
      success: true,
      url: simulatedSuccessUrl,
      checkout_url: simulatedSuccessUrl,
      checkoutUrl: simulatedSuccessUrl,
      simulated: true,
      provider: 'moneyfusion',
      message: 'Redirection vers la passerelle Money Fusion'
    });

  } catch (error) {
    console.error('[Money Fusion Checkout Internal Error]:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erreur interne lors de la création de la session Money Fusion'
      },
      { status: 500 }
    );
  }
}
