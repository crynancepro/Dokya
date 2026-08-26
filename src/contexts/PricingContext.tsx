import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PlatformPricingConfig, PromoCode } from '../types';
import { 
  DEFAULT_PLATFORM_PRICING, 
  subscribeToPricing, 
  savePricingToFirestore, 
  subscribeToPromoCodes,
  savePromoCodeToFirestore,
  deletePromoCodeFromFirestore 
} from '../lib/firebase';
import { safeParseJsonResponse } from '../utils/apiHelpers';

export interface PromoValidationResult {
  valid: boolean;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
  isFree: boolean;
  message: string;
  discountLabel: string;
  description?: string;
  promo?: PromoCode;
}

interface PricingContextType {
  pricing: PlatformPricingConfig;
  promoCodes: PromoCode[];
  isLoading: boolean;
  updatePricing: (newPricing: Partial<PlatformPricingConfig>, adminEmail?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  validatePromoCode: (code: string, amount: number, documentTitle?: string) => Promise<PromoValidationResult>;
  savePromoCode: (promoData: Partial<PromoCode>, adminEmail?: string) => Promise<{ success: boolean; promoCode?: PromoCode; message?: string; error?: string }>;
  deletePromoCode: (id: string, code: string, adminEmail?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  togglePromoCode: (id: string, code: string, currentActive: boolean, adminEmail?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  formatPrice: (amount: number, currency?: string) => string;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

// Initial fallback storage key
const PRICING_STORAGE_KEY = 'senegal_cv_platform_pricing';
const PROMOS_STORAGE_KEY = 'senegal_cv_platform_promos';

export const PricingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Initial State from LocalStorage or Default
  const [pricing, setPricing] = useState<PlatformPricingConfig>(() => {
    try {
      const saved = localStorage.getItem(PRICING_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_PLATFORM_PRICING, ...JSON.parse(saved) };
      }
    } catch (_e) {}
    return DEFAULT_PLATFORM_PRICING;
  });

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(() => {
    try {
      const saved = localStorage.getItem(PROMOS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_e) {}
    return [
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
        createdAt: new Date().toISOString()
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
        createdAt: new Date().toISOString()
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
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 2. Real-time Listeners (Firestore + Window Custom Events + LocalStorage)
  useEffect(() => {
    let unsubscribePricing: (() => void) | null = null;
    let unsubscribePromos: (() => void) | null = null;

    // A. Initial fetch from API backend
    const fetchInitialData = async () => {
      try {
        const pRes = await fetch('/api/pricing');
        if (pRes.ok) {
          const data = await safeParseJsonResponse(pRes);
          if (data.success && data.pricing) {
            setPricing((prev) => {
              const updated = { ...prev, ...data.pricing };
              try { localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(updated)); } catch (_e) {}
              return updated;
            });
          }
        }
      } catch (_e) {}

      try {
        const promoRes = await fetch('/api/admin/promo-codes');
        if (promoRes.ok) {
          const pData = await safeParseJsonResponse(promoRes);
          if (pData.success && Array.isArray(pData.promoCodes) && pData.promoCodes.length > 0) {
            setPromoCodes(pData.promoCodes);
            try { localStorage.setItem(PROMOS_STORAGE_KEY, JSON.stringify(pData.promoCodes)); } catch (_e) {}
          }
        }
      } catch (_e) {} finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();

    // B. Firestore onSnapshot real-time listener for pricing
    try {
      unsubscribePricing = subscribeToPricing((updatedPricing) => {
        setPricing(updatedPricing);
        try {
          localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(updatedPricing));
        } catch (_e) {}
      });
    } catch (e) {
      console.warn('Could not subscribe to Firestore pricing:', e);
    }

    // C. Firestore onSnapshot real-time listener for promo codes
    try {
      unsubscribePromos = subscribeToPromoCodes((updatedPromos) => {
        if (Array.isArray(updatedPromos)) {
          setPromoCodes(updatedPromos);
          try {
            localStorage.setItem(PROMOS_STORAGE_KEY, JSON.stringify(updatedPromos));
          } catch (_e) {}
        }
      });
    } catch (e) {
      console.warn('Could not subscribe to Firestore promo codes:', e);
    }

    // D. Window CustomEvent listener for cross-tab or instant within-tab synchronization
    const handlePricingUpdatedEvent = (event: CustomEvent) => {
      if (event.detail) {
        setPricing((prev) => ({ ...prev, ...event.detail }));
      }
    };

    const handlePromoUpdatedEvent = (event: CustomEvent) => {
      if (event.detail) {
        setPromoCodes(event.detail);
      }
    };

    window.addEventListener('pricing-updated' as any, handlePricingUpdatedEvent);
    window.addEventListener('promos-updated' as any, handlePromoUpdatedEvent);

    return () => {
      if (unsubscribePricing) unsubscribePricing();
      if (unsubscribePromos) unsubscribePromos();
      window.removeEventListener('pricing-updated' as any, handlePricingUpdatedEvent);
      window.removeEventListener('promos-updated' as any, handlePromoUpdatedEvent);
    };
  }, []);

  // 3. Update Pricing Method (Unconstrained numbers, instantly updates Firestore, API, and local state)
  const updatePricing = async (
    newPricing: Partial<PlatformPricingConfig>, 
    adminEmail: string = 'admin1@gmail.com'
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const mergedPricing: PlatformPricingConfig = {
        ...pricing,
        ...newPricing,
        updatedAt: new Date().toISOString(),
        updatedBy: adminEmail
      };

      // A. Save locally & dispatch event immediately for zero-latency UI reactivity
      setPricing(mergedPricing);
      try {
        localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(mergedPricing));
        window.dispatchEvent(new CustomEvent('pricing-updated', { detail: mergedPricing }));
      } catch (_e) {}

      // B. Save to Firestore collection "settings_pricing/global"
      await savePricingToFirestore(mergedPricing);

      // C. Save to Backend Express server API
      try {
        const response = await fetch('/api/admin/pricing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-email': adminEmail
          },
          body: JSON.stringify({
            adminEmail,
            ...mergedPricing
          })
        });

        if (response.ok) {
          const resData = await safeParseJsonResponse(response);
          if (resData.success) {
            return {
              success: true,
              message: resData.message || 'Tarifs enregistrés et synchronisés en temps réel sur toute la plateforme !'
            };
          }
        }
      } catch (_apiErr) {
        // Fallback gracefully since Firestore already updated
      }

      return {
        success: true,
        message: 'Tarifs enregistrés avec succès !'
      };
    } catch (err: any) {
      console.error('Error in updatePricing:', err);
      return {
        success: false,
        error: err?.message || 'Erreur lors de la mise à jour des prix.'
      };
    }
  };

  // 4. Validate Promo Code Method (Calculates discount, checks active status and quota)
  const validatePromoCode = async (
    code: string, 
    amount: number, 
    documentTitle?: string
  ): Promise<PromoValidationResult> => {
    const cleanCode = code.trim().toUpperCase();
    const orderAmount = Math.max(0, Number(amount) || 0);

    if (!cleanCode) {
      throw new Error('Veuillez saisir un code promotionnel.');
    }

    // A. Check in local promo codes list / known codes
    const localPromo = promoCodes.find((p) => p.code === cleanCode);

    // Special hardcoded VIP codes fallback for instant reliability
    const knownPromoDict: Record<string, { type: 'percentage' | 'fixed'; val: number; desc: string }> = {
      'LIL': { type: 'percentage', val: 90, desc: 'Code spécial LIL (-90%)' },
      'PETER': { type: 'percentage', val: 100, desc: 'Accès VIP Gratuit Administrateur' },
      'VIP100': { type: 'percentage', val: 100, desc: 'Code VIP (-100% Déblocage Gratuit)' },
      'ADMIN100': { type: 'percentage', val: 100, desc: 'Code Admin (-100%)' },
      'GRATUIT100': { type: 'percentage', val: 100, desc: 'Déblocage Offert (-100%)' },
      'PROMO50': { type: 'percentage', val: 50, desc: '50% de réduction immédiate' },
      'DAKAR2026': { type: 'percentage', val: 30, desc: '30% de remise' },
      'TERANGA20': { type: 'percentage', val: 20, desc: '20% de réduction' },
      'BIENVENUE500': { type: 'fixed', val: 500, desc: '500 FCFA offerts' }
    };

    // First try backend API validation for authoritative check & usage counter
    try {
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, amount: orderAmount, documentTitle })
      });

      if (response.ok && response.status !== 405) {
        const data = await safeParseJsonResponse(response);
        if (data.success && data.valid) {
          return {
            valid: true,
            code: data.code || cleanCode,
            discountType: data.discountType || 'percentage',
            discountValue: data.discountValue || 0,
            discountAmount: data.discountAmount ?? (orderAmount - (data.finalAmount ?? 0)),
            originalAmount: data.originalAmount || orderAmount,
            finalAmount: data.finalAmount ?? Math.max(0, orderAmount - (data.discountAmount || 0)),
            isFree: Boolean(data.isFree || data.finalAmount === 0),
            message: data.message || `Code promo "${data.code}" appliqué avec succès !`,
            discountLabel: data.discountLabel || (data.discountType === 'percentage' ? `-${data.discountValue}%` : `-${data.discountValue} FCFA`),
            description: data.description
          };
        } else if (data.error) {
          throw new Error(data.error);
        }
      }
    } catch (e: any) {
      if (e?.message && !e.message.includes('fetch')) {
        throw e;
      }
    }

    // Fallback: Check local promo codes state
    if (localPromo) {
      if (!localPromo.active) {
        throw new Error(`Le code promo "${cleanCode}" a été désactivé.`);
      }
      if (localPromo.maxUsageLimit && localPromo.currentUsageCount >= localPromo.maxUsageLimit) {
        throw new Error(`Le code promo "${cleanCode}" a atteint son quota d'utilisations.`);
      }
      if (localPromo.minOrderAmount && orderAmount < localPromo.minOrderAmount) {
        throw new Error(`Montant minimum requis : ${localPromo.minOrderAmount.toLocaleString('fr-FR')} FCFA.`);
      }

      let discountAmount = 0;
      if (localPromo.discountType === 'percentage') {
        discountAmount = localPromo.discountValue >= 100 ? orderAmount : Math.round((orderAmount * localPromo.discountValue) / 100);
      } else {
        discountAmount = Math.min(orderAmount, localPromo.discountValue);
      }

      const finalAmount = Math.max(0, orderAmount - discountAmount);
      const isFree = finalAmount === 0;
      const discountLabel = localPromo.discountType === 'percentage' ? `-${localPromo.discountValue}%` : `-${localPromo.discountValue.toLocaleString('fr-FR')} FCFA`;

      return {
        valid: true,
        code: cleanCode,
        discountType: localPromo.discountType,
        discountValue: localPromo.discountValue,
        discountAmount,
        originalAmount: orderAmount,
        finalAmount,
        isFree,
        message: isFree ? `Code "${cleanCode}" appliqué : 100% de réduction (Gratuit) !` : `Code "${cleanCode}" appliqué : ${discountLabel} (-${discountAmount.toLocaleString('fr-FR')} FCFA)`,
        discountLabel,
        description: localPromo.description,
        promo: localPromo
      };
    }

    // Fallback: Check known promo dict
    if (knownPromoDict[cleanCode]) {
      const item = knownPromoDict[cleanCode];
      let discountAmount = 0;
      if (item.type === 'percentage') {
        discountAmount = item.val >= 100 ? orderAmount : Math.round((orderAmount * item.val) / 100);
      } else {
        discountAmount = Math.min(orderAmount, item.val);
      }

      const finalAmount = Math.max(0, orderAmount - discountAmount);
      const isFree = finalAmount === 0;
      const discountLabel = item.type === 'percentage' ? `-${item.val}%` : `-${item.val} FCFA`;

      return {
        valid: true,
        code: cleanCode,
        discountType: item.type,
        discountValue: item.val,
        discountAmount,
        originalAmount: orderAmount,
        finalAmount,
        isFree,
        message: isFree ? `Code "${cleanCode}" appliqué : 100% de réduction (Gratuit) !` : `Code "${cleanCode}" appliqué : ${discountLabel} (-${discountAmount.toLocaleString('fr-FR')} FCFA)`,
        discountLabel,
        description: item.desc,
        promo: {
          id: `PRM-${cleanCode}`,
          code: cleanCode,
          discountType: item.type,
          discountValue: item.val,
          minOrderAmount: 0,
          maxUsageLimit: 1000,
          currentUsageCount: 0,
          active: true,
          description: item.desc,
          createdAt: new Date().toISOString()
        }
      };
    }

    throw new Error(`Le code promo "${cleanCode}" est invalide ou inexistant.`);
  };

  // 5. Save Promo Code
  const savePromoCode = async (
    promoData: Partial<PromoCode>, 
    adminEmail: string = 'admin1@gmail.com'
  ): Promise<{ success: boolean; promoCode?: PromoCode; message?: string; error?: string }> => {
    try {
      const cleanCode = (promoData.code || '').trim().toUpperCase();
      if (!cleanCode || cleanCode.length < 2) {
        return { success: false, error: 'Code promo invalide.' };
      }

      const promoId = promoData.id || `PRM-${Date.now().toString().slice(-6)}`;
      const val = Number(promoData.discountValue) || 10;

      const newPromo: PromoCode = {
        id: promoId,
        code: cleanCode,
        discountType: promoData.discountType || 'percentage',
        discountValue: val,
        minOrderAmount: Number(promoData.minOrderAmount) || 0,
        maxUsageLimit: Number(promoData.maxUsageLimit) || 100,
        currentUsageCount: promoData.currentUsageCount || 0,
        active: promoData.active !== undefined ? Boolean(promoData.active) : true,
        description: promoData.description || `Réduction de ${val}${promoData.discountType === 'percentage' ? '%' : ' FCFA'}`,
        createdAt: promoData.createdAt || new Date().toISOString(),
        createdBy: adminEmail
      };

      // Update local state & storage
      setPromoCodes((prev) => {
        const existingIdx = prev.findIndex((p) => p.id === promoId || p.code === cleanCode);
        let updated: PromoCode[];
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = newPromo;
        } else {
          updated = [newPromo, ...prev];
        }
        try {
          localStorage.setItem(PROMOS_STORAGE_KEY, JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('promos-updated', { detail: updated }));
        } catch (_e) {}
        return updated;
      });

      // Save to Firestore
      await savePromoCodeToFirestore(newPromo);

      // Save to API
      try {
        await fetch('/api/admin/promo-codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-email': adminEmail
          },
          body: JSON.stringify({
            adminEmail,
            ...newPromo
          })
        });
      } catch (_e) {}

      return {
        success: true,
        promoCode: newPromo,
        message: `Code promo "${cleanCode}" enregistré avec succès !`
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Erreur lors de l\'enregistrement du code promo.'
      };
    }
  };

  // 6. Delete Promo Code
  const deletePromoCode = async (
    id: string, 
    code: string, 
    adminEmail: string = 'admin1@gmail.com'
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const cleanCode = code.trim().toUpperCase();

      // Remove from local state immediately
      setPromoCodes((prev) => {
        const updated = prev.filter((p) => p.id !== id && p.code !== cleanCode);
        try {
          localStorage.setItem(PROMOS_STORAGE_KEY, JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('promos-updated', { detail: updated }));
        } catch (_e) {}
        return updated;
      });

      // Delete from Firestore
      await deletePromoCodeFromFirestore(id);

      // Delete from API
      try {
        await fetch(`/api/admin/promo-codes/${id}?adminEmail=${encodeURIComponent(adminEmail)}`, {
          method: 'DELETE',
          headers: {
            'x-admin-email': adminEmail
          }
        });
      } catch (_e) {}

      return {
        success: true,
        message: `Code promo "${code}" supprimé avec succès !`
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Erreur lors de la suppression du code promo.'
      };
    }
  };

  // 7. Toggle Promo Code
  const togglePromoCode = async (
    id: string, 
    code: string, 
    currentActive: boolean, 
    adminEmail: string = 'admin1@gmail.com'
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const newActive = !currentActive;

      // Update local state
      setPromoCodes((prev) => {
        const updated = prev.map((p) => (p.id === id || p.code === code ? { ...p, active: newActive } : p));
        try {
          localStorage.setItem(PROMOS_STORAGE_KEY, JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('promos-updated', { detail: updated }));
        } catch (_e) {}
        return updated;
      });

      // Update Firestore
      const target = promoCodes.find((p) => p.id === id || p.code === code);
      if (target) {
        await savePromoCodeToFirestore({ ...target, active: newActive });
      }

      // Update API
      try {
        await fetch(`/api/admin/promo-codes/${id}/toggle`, {
          method: 'POST',
          headers: {
            'x-admin-email': adminEmail
          }
        });
      } catch (_e) {}

      return {
        success: true,
        message: `Code promo "${code}" ${newActive ? 'activé' : 'désactivé'} avec succès.`
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Erreur lors du changement de statut.'
      };
    }
  };

  // 8. Helper to format price with thousands separator and currency
  const formatPrice = (amount: number, currency: string = 'FCFA'): string => {
    const num = Number(amount) || 0;
    return `${num.toLocaleString('fr-FR')} ${currency}`;
  };

  return (
    <PricingContext.Provider
      value={{
        pricing,
        promoCodes,
        isLoading,
        updatePricing,
        validatePromoCode,
        savePromoCode,
        deletePromoCode,
        togglePromoCode,
        formatPrice
      }}
    >
      {children}
    </PricingContext.Provider>
  );
};

export const usePricing = (): PricingContextType => {
  const context = useContext(PricingContext);
  if (!context) {
    throw new Error('usePricing must be used within a PricingProvider');
  }
  return context;
};
