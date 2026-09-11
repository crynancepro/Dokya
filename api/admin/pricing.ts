/**
 * API Route: /api/admin/pricing
 * 100% autonome - Compatible Vercel Serverless Function & Next.js App Router
 * Consultation et mise à jour de la grille tarifaire Dokya
 */

const DEFAULT_PRICING = {
  cvOnlyPrice: 1000,
  letterOnlyPrice: 1000,
  fullPackPrice: 1399,
  devisPrice: 1000,
  facturePrice: 1000,
  businessPackPrice: 1499,
  ebookPrice: 1500,
  unlimitedPassPrice: 3499,
  unlimitedPassMonthlyPrice: 3499,
  unlimitedPassAnnualPrice: 39999,
  recruiterSearchPrice: 10000,
  currency: 'FCFA',
  updatedAt: new Date().toISOString(),
  updatedBy: 'system'
};

let currentPricing = { ...DEFAULT_PRICING };

export async function GET(req?: Request): Promise<Response> {
  return new Response(
    JSON.stringify({
      success: true,
      pricing: currentPricing
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-email, x-admin-key'
      }
    }
  );
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    currentPricing = {
      ...currentPricing,
      ...body,
      updatedAt: new Date().toISOString()
    };
    return new Response(
      JSON.stringify({
        success: true,
        pricing: currentPricing,
        message: 'Tarification mise à jour avec succès'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export default async function handler(req: any, res?: any) {
  if (!res || typeof res.status !== 'function') {
    if (req.method === 'POST') return POST(req);
    return GET(req);
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-email, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'POST') {
    currentPricing = {
      ...currentPricing,
      ...(req.body || {}),
      updatedAt: new Date().toISOString()
    };
    return res.status(200).json({
      success: true,
      pricing: currentPricing,
      message: 'Tarification mise à jour avec succès'
    });
  }

  return res.status(200).json({
    success: true,
    pricing: currentPricing
  });
}
