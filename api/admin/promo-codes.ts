/**
 * API Route: /api/admin/promo-codes
 * 100% autonome - Compatible Vercel Serverless Function & Next.js App Router
 * Renvoie la liste des codes promo Dokya et permet leur gestion.
 */

const promoCodesStore: any[] = [
  {
    id: 'PRM-001',
    code: 'TERANGA20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 1000,
    maxUsageLimit: 500,
    currentUsageCount: 18,
    active: true,
    description: '20% de remise sur tous les documents',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'PRM-002',
    code: 'DAKAR2026',
    discountType: 'percentage',
    discountValue: 30,
    minOrderAmount: 1399,
    maxUsageLimit: 200,
    currentUsageCount: 37,
    active: true,
    description: '30% de remise spéciale Pack Duo & Business',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'PRM-003',
    code: 'VIP100',
    discountType: 'percentage',
    discountValue: 100,
    minOrderAmount: 0,
    maxUsageLimit: 100,
    currentUsageCount: 8,
    active: true,
    description: 'Accès 100% gratuit VIP et testeurs',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export async function GET(req?: Request): Promise<Response> {
  return new Response(
    JSON.stringify({
      success: true,
      promoCodes: promoCodesStore
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
    const { code, discountType = 'percentage', discountValue = 20, description, minOrderAmount = 0 } = body;
    if (!code) {
      return new Response(JSON.stringify({ success: false, error: 'Code promo requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newPromo = {
      id: `PRM-${Date.now()}`,
      code: String(code).trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue) || 20,
      minOrderAmount: Number(minOrderAmount) || 0,
      maxUsageLimit: 1000,
      currentUsageCount: 0,
      active: true,
      description: description || `Remise de ${discountValue}%`,
      createdAt: new Date().toISOString()
    };
    promoCodesStore.unshift(newPromo);

    return new Response(JSON.stringify({ success: true, promoCode: newPromo }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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
    const { code, discountType = 'percentage', discountValue = 20, description, minOrderAmount = 0 } = req.body || {};
    if (!code) {
      return res.status(400).json({ success: false, error: 'Code requis' });
    }
    const newPromo = {
      id: `PRM-${Date.now()}`,
      code: String(code).trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue) || 20,
      minOrderAmount: Number(minOrderAmount) || 0,
      maxUsageLimit: 1000,
      currentUsageCount: 0,
      active: true,
      description: description || `Remise de ${discountValue}%`,
      createdAt: new Date().toISOString()
    };
    promoCodesStore.unshift(newPromo);
    return res.status(200).json({ success: true, promoCode: newPromo });
  }

  return res.status(200).json({
    success: true,
    promoCodes: promoCodesStore
  });
}
