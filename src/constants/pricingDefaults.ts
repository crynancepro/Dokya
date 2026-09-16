import { PlatformPricingConfig, PromoCode } from '../types';

/**
 * Grille tarifaire officielle par défaut de la plateforme DOKYA
 */
export const DEFAULT_PLATFORM_PRICING: PlatformPricingConfig = {
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
  updatedAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'system'
};

/**
 * Codes promo officiels par défaut de DOKYA
 */
export const DEFAULT_PROMO_CODES: PromoCode[] = [
  {
    id: 'PRM-001',
    code: 'TERANGA20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 1000,
    maxUsageLimit: 500,
    currentUsageCount: 18,
    active: true,
    description: '20% de remise sur tous les documents et abonnements',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'PRM-002',
    code: 'DAKAR2026',
    discountType: 'percentage',
    discountValue: 30,
    minOrderAmount: 1000,
    maxUsageLimit: 200,
    currentUsageCount: 37,
    active: true,
    description: '30% de remise spéciale sur les abonnements et packs',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'PRM-003',
    code: 'PROMO50',
    discountType: 'percentage',
    discountValue: 50,
    minOrderAmount: 1000,
    maxUsageLimit: 200,
    currentUsageCount: 42,
    active: true,
    description: '50% de réduction immédiate sur tous les documents et abonnements',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'PRM-004',
    code: 'VIP100',
    discountType: 'percentage',
    discountValue: 100,
    minOrderAmount: 0,
    maxUsageLimit: 100,
    currentUsageCount: 8,
    active: true,
    description: 'Accès 100% gratuit VIP et testeurs (0 FCFA)',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'PRM-005',
    code: 'BIENVENUE500',
    discountType: 'fixed',
    discountValue: 500,
    minOrderAmount: 1000,
    maxUsageLimit: 1000,
    currentUsageCount: 54,
    active: true,
    description: '500 FCFA offerts sur votre commande',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];
