import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

const DEFAULT_PROMOS = [
  {
    code: 'PETER',
    discountType: 'percentage',
    discountValue: 100,
    minOrderAmount: 0,
    maxUsageLimit: 9999,
    currentUsageCount: 0,
    active: true,
    description: 'Accès VIP Gratuit Administrateur (-100%)'
  },
  {
    code: 'VIP100',
    discountType: 'percentage',
    discountValue: 100,
    minOrderAmount: 0,
    maxUsageLimit: 9999,
    currentUsageCount: 0,
    active: true,
    description: 'Code VIP Déblocage 100% Offert'
  },
  {
    code: 'GRATUIT100',
    discountType: 'percentage',
    discountValue: 100,
    minOrderAmount: 0,
    maxUsageLimit: 9999,
    currentUsageCount: 0,
    active: true,
    description: 'Déblocage 100% Gratuit Dokya'
  },
  {
    code: 'ADMIN100',
    discountType: 'percentage',
    discountValue: 100,
    minOrderAmount: 0,
    maxUsageLimit: 9999,
    currentUsageCount: 0,
    active: true,
    description: 'Accès Administrateur (-100%)'
  },
  {
    code: 'LIL',
    discountType: 'percentage',
    discountValue: 90,
    minOrderAmount: 0,
    maxUsageLimit: 500,
    currentUsageCount: 0,
    active: true,
    description: 'Offre Spéciale LIL (-90%)'
  },
  {
    code: 'PROMO50',
    discountType: 'percentage',
    discountValue: 50,
    minOrderAmount: 500,
    maxUsageLimit: 500,
    currentUsageCount: 15,
    active: true,
    description: '50% de réduction exceptionnelle'
  },
  {
    code: 'DAKAR2026',
    discountType: 'percentage',
    discountValue: 30,
    minOrderAmount: 1000,
    maxUsageLimit: 200,
    currentUsageCount: 29,
    active: true,
    description: '30% de remise spéciale promotionnelle'
  },
  {
    code: 'TERANGA20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 1000,
    maxUsageLimit: 500,
    currentUsageCount: 47,
    active: true,
    description: '20% de réduction sur tous les documents'
  },
  {
    code: 'BIENVENUE500',
    discountType: 'fixed',
    discountValue: 500,
    minOrderAmount: 1000,
    maxUsageLimit: 500,
    currentUsageCount: 112,
    active: true,
    description: '500 FCFA offerts sur votre commande'
  }
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return handleValidation(body);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, valid: false, error: err?.message || 'Erreur lors de la validation du code promo.' },
      { status: 200 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params = {
      code: searchParams.get('code') || '',
      amount: searchParams.get('amount') || 1000,
      documentTitle: searchParams.get('documentTitle') || ''
    };
    return handleValidation(params);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, valid: false, error: err?.message || 'Erreur lors de la validation du code promo.' },
      { status: 200 }
    );
  }
}

async function handleValidation(params: { code?: string; amount?: any; documentTitle?: string }) {
  try {
    const { code, amount = 1000, documentTitle } = params;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { success: false, valid: false, error: 'Veuillez saisir un code promo.' },
        { status: 200 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const orderAmount = Math.max(0, Number(amount) || 0);

    let promo: any = null;

    // 1. Chercher dans Firestore si disponible
    if (db && typeof db.collection === 'function') {
      try {
        const docSnap = await db.collection('promo_codes').doc(cleanCode).get();
        if (docSnap.exists) {
          promo = { ...docSnap.data(), code: cleanCode };
        }
      } catch (_e) {}

      if (!promo) {
        try {
          const qSnap = await db.collection('promo_codes').where('code', '==', cleanCode).limit(1).get();
          if (!qSnap.empty) {
            promo = { ...qSnap.docs[0].data(), code: cleanCode };
          }
        } catch (_e) {}
      }
    }

    // 2. Chercher dans les codes par défaut
    if (!promo) {
      promo = DEFAULT_PROMOS.find((p) => p.code === cleanCode);
    }

    if (!promo) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: `Le code promo "${cleanCode}" est invalide ou inexistant.`
        },
        { status: 200 }
      );
    }

    if (promo.active === false) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: `Le code promo "${cleanCode}" a été désactivé.`
        },
        { status: 200 }
      );
    }

    if (promo.maxUsageLimit && promo.currentUsageCount >= promo.maxUsageLimit) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: `Le code promo "${cleanCode}" a atteint son quota maximal d'utilisations.`
        },
        { status: 200 }
      );
    }

    if (promo.minOrderAmount && orderAmount < promo.minOrderAmount) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: `Montant minimum requis pour ce code : ${promo.minOrderAmount.toLocaleString('fr-FR')} FCFA.`
        },
        { status: 200 }
      );
    }

    let discountAmount = 0;
    if (promo.discountType === 'percentage') {
      if (promo.discountValue >= 100) {
        discountAmount = orderAmount;
      } else {
        discountAmount = Math.round((orderAmount * promo.discountValue) / 100);
      }
    } else {
      discountAmount = Math.min(orderAmount, promo.discountValue);
    }

    const finalAmount = Math.max(0, orderAmount - discountAmount);
    const isFree = finalAmount === 0;
    const discountLabel = promo.discountType === 'percentage'
      ? `-${promo.discountValue}%`
      : `-${(promo.discountValue || 0).toLocaleString('fr-FR')} FCFA`;

    return NextResponse.json({
      success: true,
      valid: true,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discountLabel,
      discountAmount,
      originalAmount: orderAmount,
      finalAmount,
      isFree,
      description: promo.description || `Remise de ${discountLabel}`,
      message: isFree
        ? `Code "${promo.code}" appliqué : 100% de réduction (Gratuit) !`
        : `Code "${promo.code}" appliqué : ${discountLabel} (-${discountAmount.toLocaleString('fr-FR')} FCFA)`
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, valid: false, error: err.message || 'Erreur lors de la validation du code promo.' },
      { status: 200 }
    );
  }
}
