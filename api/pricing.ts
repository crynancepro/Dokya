/**
 * API Route: /api/pricing
 * 100% autonome - Compatible Vercel Serverless Function & Next.js App Router
 * Renvoie les plans et tarifs officiels de Dokya.
 */

export const DEFAULT_PRICING = {
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

/**
 * Gestionnaire pour requêtes Web Standard (Next.js App Router / Edge)
 */
export async function GET(req?: Request): Promise<Response> {
  return new Response(
    JSON.stringify({
      success: true,
      pricing: DEFAULT_PRICING
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-email, x-admin-key'
      }
    }
  );
}

/**
 * Gestionnaire Node.js (Vercel Serverless Function classique)
 */
export default async function handler(req: any, res?: any) {
  if (!res || typeof res.status !== 'function') {
    return GET(req);
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-email, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return res.status(200).json({
    success: true,
    pricing: DEFAULT_PRICING
  });
}
