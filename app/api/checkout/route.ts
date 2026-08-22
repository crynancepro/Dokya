import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = (process.env.SENEPAY_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    const secretKey = (process.env.SENEPAY_SECRET_KEY || '').trim().replace(/^["']|["']$/g, '');

    const {
      amount = 1500,
      currency = 'XOF',
      orderReference = `CMD-${Date.now()}`,
      description = 'Création de document',
      country = 'SN',
      returnUrl = 'https://senegalcv.sn/success',
      cancelUrl = 'https://senegalcv.sn/cancel'
    } = body;

    const payload = {
      amount: Number(amount) || 1500,
      currency: currency || 'XOF',
      orderReference: String(orderReference),
      description: String(description),
      country: country || 'SN',
      returnUrl: String(returnUrl),
      cancelUrl: String(cancelUrl)
    };

    const senePayResponse = await fetch('https://api.sene-pay.com/api/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        'X-Api-Secret': secretKey
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
      senePayData?.checkoutUrl ||
      senePayData?.data?.checkoutUrl ||
      senePayData?.redirectUrl ||
      senePayData?.url ||
      senePayData?.data?.url;

    if (senePayResponse.ok && checkoutUrl) {
      return NextResponse.json({
        success: true,
        redirectUrl: checkoutUrl,
        checkoutUrl: checkoutUrl,
        data: senePayData
      });
    }

    const errorMessage = senePayData?.message || senePayData?.error || `Erreur SenePay HTTP ${senePayResponse.status}`;

    return NextResponse.json(
      {
        success: false,
        error: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
        details: senePayData || responseText
      },
      { status: senePayResponse.status >= 400 && senePayResponse.status < 600 ? senePayResponse.status : 500 }
    );
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
    service: 'SenePay Checkout API'
  });
}
