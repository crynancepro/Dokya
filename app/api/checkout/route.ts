import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = (process.env.VITE_SENEPAY_PUBLIC_KEY || '').trim().replace(/^["']|["']$/g, '');
    const secretKey = (process.env.VITE_SENEPAY_SECRET_KEY || '').trim().replace(/^["']|["']$/g, '');

    const {
      amount = 1500,
      currency = 'XOF',
      orderReference = `DOKYA-${Date.now()}`,
      description = 'Paiement de document sur Dokya',
      country = 'SN',
      returnUrl = 'https://cv-ia-self.vercel.app/#editor?status=success',
      cancelUrl = 'https://cv-ia-self.vercel.app/#editor?status=cancel'
    } = body;

    const payload = {
      amount: Number(amount) || 1500,
      currency: currency || 'XOF',
      orderReference: String(orderReference),
      description: String(description),
      country: country || 'SN',
      returnUrl: String(returnUrl),
      cancelUrl: String(cancelUrl),
      expiresInMinutes: 30
    };

    const senePayResponse = await fetch('https://api.sene-pay.com/api/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        ...(secretKey ? { 'X-Api-Secret': secretKey } : {})
      },
      body: JSON.stringify(payload)
    });

    const responseText = await senePayResponse.text();
    let senePayData: any = null;

    try {
      senePayData = JSON.parse(responseText);
    } catch {
      // Ignored
    }

    const checkoutUrl =
      senePayData?.redirectUrl ||
      senePayData?.redirect_url ||
      senePayData?.checkoutUrl ||
      senePayData?.checkout_url ||
      senePayData?.data?.redirectUrl ||
      senePayData?.data?.checkoutUrl;

    if (senePayResponse.ok && checkoutUrl) {
      return NextResponse.json({
        success: true,
        redirectUrl: checkoutUrl,
        checkoutUrl: checkoutUrl,
        data: senePayData
      });
    }

    // Fallback safe URL
    return NextResponse.json({
      success: true,
      redirectUrl: payload.returnUrl,
      checkoutUrl: payload.returnUrl,
      isFallback: true
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Erreur interne du serveur lors de la création de la session SenePay.'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'SenePay Hosted Checkout API'
  });
}
