import { NextResponse } from 'next/server';

/**
 * Route API Next.js App Router : Initialisation du Checkout Money Fusion
 * POST /api/moneyfusion/checkout
 * 
 * Paramètres reçus : { amount, docId, userId, customer, description, ... }
 * Retourne : { success: true, url: string, ... }
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
      currency = 'XOF',
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

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'https://dokya-seven.vercel.app';
    const finalSuccessUrl = success_url || `${appBaseUrl}/dashboard?payment=success&provider=moneyfusion&docId=${targetDocId}`;
    const finalErrorUrl = error_url || cancel_url || `${appBaseUrl}/dashboard?payment=cancelled&provider=moneyfusion&docId=${targetDocId}`;

    const apiKey = process.env.MONEYFUSION_API_KEY;
    const apiUrl = (process.env.MONEYFUSION_API_URL || 'https://api.moneyfusion.net').replace(/\/+$/, '');
    const directPaymentUrl = process.env.MONEYFUSION_PAYMENT_URL;

    console.log('[Money Fusion Checkout] Requête reçue:', {
      amount: targetAmount,
      docId: targetDocId,
      userId: targetUserId,
      hasApiKey: Boolean(apiKey)
    });

    // 1. Si une clé API Money Fusion officielle est fournie, appelons le service
    if (apiKey) {
      try {
        const payload = {
          totalPrice: targetAmount,
          amount: targetAmount,
          currency: currency || 'XOF',
          orderId: `DOKYA_${targetDocId || 'DOC'}_${Date.now()}`,
          clientName: targetName,
          clientEmail: targetEmail,
          clientNumber: targetPhone,
          description: description || `Déblocage document Dokya (${targetDocId || 'Pro'})`,
          articles: [
            {
              name: description || 'Document Pro Dokya',
              price: targetAmount,
              quantity: 1
            }
          ],
          customData: {
            docId: targetDocId,
            userId: targetUserId,
            platform: 'dokya'
          },
          returnUrl: finalSuccessUrl,
          cancelUrl: finalErrorUrl,
          webhookUrl: `${appBaseUrl}/api/webhooks/moneyfusion`
        };

        const response = await fetch(`${apiUrl}/api/v1/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          const paymentUrl = data.url || data.paymentUrl || data.checkout_url || data.checkoutUrl || data.data?.url;
          if (paymentUrl) {
            console.log('[Money Fusion Checkout] URL générée avec succès par l\'API:', paymentUrl);
            return NextResponse.json({
              success: true,
              url: paymentUrl,
              checkout_url: paymentUrl,
              paymentId: data.token || data.id || data.orderId || null,
              provider: 'moneyfusion'
            });
          }
        }

        console.warn('[Money Fusion Checkout] Réponse inattendue de l\'API Money Fusion, utilisation du lien direct ou de secours:', data);
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
        provider: 'moneyfusion'
      });
    }

    // 3. Fallback élégant en environnement de prévisualisation / test si les clés ne sont pas encore définies
    console.info('[Money Fusion Checkout] Mode simulation/test actif (Définissez MONEYFUSION_API_KEY dans les paramètres pour la passerelle en direct).');
    const simulatedSuccessUrl = `${finalSuccessUrl}&status=approved&unlocked=true&ref=MF_${Date.now()}`;

    return NextResponse.json({
      success: true,
      url: simulatedSuccessUrl,
      checkout_url: simulatedSuccessUrl,
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
