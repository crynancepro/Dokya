import { db } from '../../lib/firebaseAdmin.js';

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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    } else if (!body && typeof req.on === 'function') {
      const raw = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', (chunk: any) => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', () => resolve(''));
      });
      try { body = JSON.parse(raw); } catch { body = {}; }
    }

    const { code, amount = 1000 } = body || {};

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(200).json({
        success: false,
        valid: false,
        error: 'Veuillez saisir un code promo.'
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const orderAmount = Math.max(0, Number(amount) || 0);

    let promo: any = null;

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

    if (!promo) {
      promo = DEFAULT_PROMOS.find((p) => p.code === cleanCode);
    }

    if (!promo) {
      return res.status(200).json({
        success: false,
        valid: false,
        error: `Le code promo "${cleanCode}" est invalide ou inexistant.`
      });
    }

    if (promo.active === false) {
      return res.status(200).json({
        success: false,
        valid: false,
        error: `Le code promo "${cleanCode}" a été désactivé.`
      });
    }

    if (promo.maxUsageLimit && promo.currentUsageCount >= promo.maxUsageLimit) {
      return res.status(200).json({
        success: false,
        valid: false,
        error: `Le code promo "${cleanCode}" a atteint son quota maximal d'utilisations.`
      });
    }

    if (promo.minOrderAmount && orderAmount < promo.minOrderAmount) {
      return res.status(200).json({
        success: false,
        valid: false,
        error: `Montant minimum requis pour ce code : ${promo.minOrderAmount.toLocaleString('fr-FR')} FCFA.`
      });
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

    return res.status(200).json({
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
    return res.status(200).json({
      success: false,
      valid: false,
      error: err.message || 'Erreur lors de la validation du code promo.'
    });
  }
}
