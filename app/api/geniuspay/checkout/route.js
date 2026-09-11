import { NextResponse } from 'next/server';

/**
 * Route API Next.js App Router : Initialisation du Checkout GeniusPay
 * POST /api/geniuspay/checkout
 * 
 * Documentation GeniusPay :
 * - Endpoint : https://geniuspay.ci/api/v1/merchant/payments
 * - Headers : X-API-Key, X-API-Secret, Content-Type: application/json
 * - En ne spécifiant pas de `payment_method`, GeniusPay affiche sa page de
 *   checkout hébergée supportant Wave, Orange Money, MTN, Moov, Free et Carte Bancaire.
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
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
    } = body;

    const publicKey = process.env.GENIUSPAY_PUBLIC_KEY;
    const secretKey = process.env.GENIUSPAY_SECRET_KEY;

    if (!publicKey || !secretKey) {
      console.warn('[GeniusPay Checkout] Clés API GeniusPay non configurées dans les variables d\'environnement.');
      return NextResponse.json(
        {
          error: "Configuration GeniusPay manquante. Veuillez renseigner GENIUSPAY_PUBLIC_KEY et GENIUSPAY_SECRET_KEY dans vos variables d'environnement.",
          missingConfig: true
        },
        { status: 500 }
      );
    }

    const targetAmount = Math.max(100, Math.round(Number(amount) || 5000));
    const targetEmail = (email || userEmail || customer.email || 'client@dokya.com').trim();
    const targetName = (customer.name || 'Client Dokya').trim();
    const targetPhone = (customer.phone || '+221770000000').trim();
    const targetUserId = (userId || metadata.userId || 'anonymous').trim();
    const targetAffiliateId = (affiliateId || referredBy || metadata.affiliateId || metadata.referredBy || '').trim();

    // Détermination des URLs de redirection avec fallback
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'https://dokya-seven.vercel.app';
    const finalSuccessUrl = success_url || `${appBaseUrl}/dashboard?payment=success&provider=geniuspay`;
    const finalErrorUrl = error_url || `${appBaseUrl}/checkout?payment=error&provider=geniuspay`;

    // Construction du payload conforme aux spécifications GeniusPay
    // IMPORTANT : On ne spécifie PAS payment_method pour utiliser la page de Checkout multi-opérateurs hébergée
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
        planType: metadata.planType || 'PASS_VIP',
        source: 'dokya_checkout'
      }
    };

    console.log('[GeniusPay Checkout] Initialisation de la session de paiement:', {
      amount: payload.amount,
      currency: payload.currency,
      customerEmail: payload.customer.email,
      metadata: payload.metadata
    });

    const response = await fetch('https://geniuspay.ci/api/v1/merchant/payments', {
      method: 'POST',
      headers: {
        'X-API-Key': publicKey,
        'X-API-Secret': secretKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[GeniusPay Checkout Error] Réponse API HTTP ' + response.status + ':', data);
      return NextResponse.json(
        {
          error: data.message || data.error || 'Erreur lors de la création de la session GeniusPay',
          details: data
        },
        { status: response.status }
      );
    }

    // Récupération de l'URL de redirection retournée par GeniusPay
    const checkoutUrl = data?.data?.checkout_url || data?.checkout_url || data?.data?.url || data?.url;

    if (!checkoutUrl) {
      console.error('[GeniusPay Checkout Error] Aucune URL de checkout retournée:', data);
      return NextResponse.json(
        {
          error: 'URL de redirection manquante dans la réponse de GeniusPay',
          response: data
        },
        { status: 502 }
      );
    }

    console.log('[GeniusPay Checkout Success] Session générée avec succès:', checkoutUrl);

    return NextResponse.json({
      success: true,
      checkout_url: checkoutUrl,
      checkoutUrl,
      paymentId: data?.data?.id || data?.id || null
    });
  } catch (error) {
    console.error('[GeniusPay Checkout Internal Error]:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erreur interne du serveur lors du checkout'
      },
      { status: 500 }
    );
  }
}
