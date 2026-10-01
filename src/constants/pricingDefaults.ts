import { PlatformPricingConfig, PromoCode } from '../types';

/**
 * Grille tarifaire officielle par défaut de la plateforme DOKYA
 */
export const DEFAULT_PLATFORM_PRICING: PlatformPricingConfig = {
  cvOnlyPrice: 1.99,
  letterOnlyPrice: 1.99,
  fullPackPrice: 2.99,
  devisPrice: 1.99,
  facturePrice: 1.99,
  businessPackPrice: 2.99,
  unlimitedPassPrice: 9.99,
  unlimitedPassMonthlyPrice: 9.99,
  unlimitedPassSemesterPrice: 47.95,
  unlimitedPassAnnualPrice: 71.90,
  recruiterSearchPrice: 15.00,
  currency: 'USD',
  updatedAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'system'
};

/**
 * Codes promo officiels par défaut de DOKYA
 */
export const DEFAULT_PROMO_CODES: PromoCode[] = [
  {
    id: 'PRM-001',
    code: 'PROMO50',
    discountType: 'percentage',
    discountValue: 50,
    minOrderAmount: 0,
    maxUsageLimit: 500,
    currentUsageCount: 42,
    active: true,
    isPublished: true,
    description: '50% de réduction immédiate sur tous les tarifs',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'PRM-002',
    code: 'DOKYA30',
    discountType: 'percentage',
    discountValue: 30,
    minOrderAmount: 0,
    maxUsageLimit: 200,
    currentUsageCount: 37,
    active: true,
    isPublished: false,
    description: '30% de remise spéciale sur les abonnements et actes',
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
    isPublished: false,
    description: 'Accès 100% gratuit VIP et testeurs (0 $)',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'PRM-004',
    code: 'TERANGA20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 0,
    maxUsageLimit: 500,
    currentUsageCount: 18,
    active: true,
    isPublished: false,
    description: '20% de remise sur tous les documents et abonnements',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];
