import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, 
  ShoppingBag, 
  Sparkles, 
  ShieldCheck, 
  Crown, 
  Wallet, 
  TrendingUp, 
  Package, 
  Plus, 
  Phone, 
  User, 
  MapPin, 
  Clock, 
  Star, 
  MessageSquare, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  ChevronDown, 
  Globe, 
  ArrowLeft, 
  ArrowRight,
  DollarSign, 
  Layers, 
  Send,
  Building2,
  Lock,
  Unlock,
  CreditCard,
  Tag,
  ArrowUpRight,
  Coins
} from 'lucide-react';
import { CandidateProfile, ProductItem, StoreOrder, SellerReview } from '../types';
import { 
  fetchAllMarketplaceOffers, 
  createTelemarketerOrder, 
  fetchTelemarketerOrders, 
  saveSellerReview, 
  fetchSellerReviews,
  calculateTelemarketerCommission,
  purgeLocalMockProducts
} from '../lib/storeService';
import { useLocale, SupportedCurrency } from '../contexts/LocaleContext';
import { usePricing } from '../contexts/PricingContext';
import { auth, setDoc, updateDoc, doc, db, createNotification, recordTransactionEverywhere } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { NotificationBell } from './NotificationBell';
import { RechargeWalletModal } from './RechargeWalletModal';

interface DokyaTelemarketerPortalProps {
  profile: CandidateProfile;
  onUpdateProfile?: (updated: Partial<CandidateProfile>) => void;
  onSwitchToSeller: () => void;
  onSignOut?: () => void;
}

export type TelemarketerTab = 
  | 'overview'
  | 'marketplace'
  | 'new_order'
  | 'orders'
  | 'wallet'
  | 'reviews'
  | 'badge'
  | 'settings';

export const DokyaTelemarketerPortal: React.FC<DokyaTelemarketerPortalProps> = ({
  profile,
  onUpdateProfile,
  onSwitchToSeller,
  onSignOut
}) => {
  const currentUid = auth.currentUser?.uid || profile.uid || 'guest';
  const { formatPrice, userCurrency, setUserCurrency } = useLocale();
  const { publishedPromo, calculateDiscountedPrice } = usePricing();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TelemarketerTab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  // Offers & Orders states
  const [offers, setOffers] = useState<ProductItem[]>([]);
  const [myOrders, setMyOrders] = useState<StoreOrder[]>([]);
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters for marketplace
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [commissionSort, setCommissionSort] = useState<'default' | 'highest' | 'percent' | 'fixed'>('default');

  // Order registration modal
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<ProductItem | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderProofUrl, setOrderProofUrl] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccessMessage, setOrderSuccessMessage] = useState<string | null>(null);
  const [orderErrorMessage, setOrderErrorMessage] = useState<string | null>(null);

  // Seller review modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewSellerId, setReviewSellerId] = useState('');
  const [reviewSellerName, setReviewSellerName] = useState('');
  const [reviewSellerUsername, setReviewSellerUsername] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewTag, setReviewTag] = useState('Paiement rapide');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);
  const [reviewErrorMessage, setReviewErrorMessage] = useState<string | null>(null);

  // Rechargement du solde de compte Dokya
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const effectiveUserBalance = profile.walletBalance ?? profile.balance ?? 0;

  // Certified badge & VIP prices with dynamic admin promo code discounts
  const BASE_BADGE_PRICE = 10000;
  const BASE_VIP_MONTHLY_PRICE = 5000;

  // Calcul dynamique de réduction si un code promo admin est publié
  const badgeDiscount = useMemo(() => {
    return calculateDiscountedPrice(BASE_BADGE_PRICE);
  }, [calculateDiscountedPrice]);
  const effectiveBadgePrice = badgeDiscount.hasDiscount ? badgeDiscount.finalPrice : BASE_BADGE_PRICE;
  const BADGE_PRICE = effectiveBadgePrice;

  const vipDiscount = useMemo(() => {
    return calculateDiscountedPrice(BASE_VIP_MONTHLY_PRICE);
  }, [calculateDiscountedPrice]);
  const effectiveVipPrice = vipDiscount.hasDiscount ? vipDiscount.finalPrice : BASE_VIP_MONTHLY_PRICE;
  const VIP_MONTHLY_PRICE = effectiveVipPrice;

  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isPurchasingBadge, setIsPurchasingBadge] = useState(false);
  const [badgeSuccessMessage, setBadgeSuccessMessage] = useState<string | null>(null);
  const [badgeErrorMsg, setBadgeErrorMsg] = useState<string | null>(null);

  // VIP Subscription modal
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [isActivatingVip, setIsActivatingVip] = useState(false);
  const [vipErrorMsg, setVipErrorMsg] = useState<string | null>(null);

  // Withdrawal modal
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(10000);
  const [withdrawOperator, setWithdrawOperator] = useState<'wave' | 'orange_money' | 'mtn' | 'bank'>('wave');
  const [withdrawPhone, setWithdrawPhone] = useState(profile.personalInfo?.phone || profile.phone || '');
  const [withdrawAccountName, setWithdrawAccountName] = useState(profile.displayName || '');
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string | null>(null);

  // Certified badge & VIP status with local reactive state and fallback storage
  const [localBadge, setLocalBadge] = useState<boolean>(() => {
    if (profile.teleSellerBadge || profile.isTelemarketerCertified || profile.certifiedBadgePurchased || profile.telemarketerBadge) return true;
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`dokya_badge_${currentUid}`) === 'true' || 
             localStorage.getItem(`dokya_tel_badge_${currentUid}`) === 'true';
    }
    return false;
  });

  const [localPlan, setLocalPlan] = useState<'standard' | 'vip'>(() => {
    if (profile.telemarketerPlan === 'vip' || profile.telemarketerMode === 'vip' || profile.subscriptionStatus === 'unlimited') return 'vip';
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`dokya_tel_plan_${currentUid}`) || localStorage.getItem(`dokya_tel_mode_${currentUid}`);
      if (saved === 'vip') return 'vip';
    }
    return 'standard';
  });

  const hasCertifiedBadge = Boolean(localBadge || profile.teleSellerBadge || profile.isTelemarketerCertified || profile.certifiedBadgePurchased || profile.telemarketerBadge);
  const isVipMode = localPlan === 'vip' || profile.telemarketerPlan === 'vip' || profile.telemarketerMode === 'vip' || profile.subscriptionStatus === 'unlimited';

  // Copied link toast feedback
  const [copiedLinkProductId, setCopiedLinkProductId] = useState<string | null>(null);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Nettoyage proactif de sécurité des caches locaux de fausses offres
      purgeLocalMockProducts();

      const [allOffers, teleOrders, allReviews] = await Promise.all([
        fetchAllMarketplaceOffers(),
        fetchTelemarketerOrders(currentUid),
        fetchSellerReviews()
      ]);
      setOffers(allOffers);
      setMyOrders(teleOrders);
      setReviews(allReviews);
    } catch (e) {
      console.error('Error loading telemarketer data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUid]);

  // Derived metrics
  const totalSalesCount = myOrders.length;
  const validatedOrders = myOrders.filter(o => o.status === 'validated' || o.status === 'delivered');
  const totalCommissionsEarned = validatedOrders.reduce((sum, o) => sum + (o.commissionNet || 0), 0);
  const pendingCommissions = myOrders.filter(o => o.status === 'pending').reduce((sum, o) => sum + (o.commissionNet || 0), 0);
  const availableWithdrawBalance = Math.max(0, (profile.affiliateBalance ?? 0) || totalCommissionsEarned);

  // Filtered offers
  const filteredOffers = useMemo(() => {
    return offers.filter(prod => {
      // Country
      if (selectedCountryFilter !== 'ALL') {
        const countries = prod.targetCountries || ['ALL'];
        if (!countries.includes('ALL') && !countries.includes(selectedCountryFilter)) {
          return false;
        }
      }
      // Category
      if (selectedCategoryFilter !== 'ALL' && prod.category !== selectedCategoryFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = prod.title?.toLowerCase().includes(q);
        const matchDesc = prod.description?.toLowerCase().includes(q);
        const matchSeller = prod.sellerName?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchSeller) return false;
      }
      return true;
    }).sort((a, b) => {
      if (commissionSort === 'highest') {
        const valA = a.commissionType === 'percent' ? (a.price * (a.commissionValue || 20) / 100) : (a.commissionValue || 0);
        const valB = b.commissionType === 'percent' ? (b.price * (b.commissionValue || 20) / 100) : (b.commissionValue || 0);
        return valB - valA;
      }
      if (commissionSort === 'percent') {
        return (b.commissionValue || 0) - (a.commissionValue || 0);
      }
      return 0;
    });
  }, [offers, selectedCountryFilter, selectedCategoryFilter, searchQuery, commissionSort]);

  // Handle Order Submit
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForOrder) return;
    if (!clientName.trim() || !clientPhone.trim() || !clientAddress.trim()) {
      setOrderErrorMessage('Veuillez remplir tous les champs obligatoires (Nom, Téléphone, Adresse).');
      return;
    }

    setIsSubmittingOrder(true);
    setOrderErrorMessage(null);
    setOrderSuccessMessage(null);

    try {
      const order = await createTelemarketerOrder({
        product: selectedProductForOrder,
        telemarketerId: currentUid,
        telemarketerName: profile.displayName || profile.personalInfo?.firstName || 'Télévendeur Pro',
        telemarketerPhone: profile.phone || profile.personalInfo?.phone || '',
        telemarketerEmail: profile.email || '',
        telemarketerMode: isVipMode ? 'vip' : 'standard',
        buyerName: clientName.trim(),
        buyerPhone: clientPhone.trim(),
        buyerAddress: clientAddress.trim(),
        buyerNotes: orderNotes || undefined,
        quantity: Number(orderQuantity) || 1,
        proofUrl: orderProofUrl || undefined,
        proofNote: orderNotes || undefined
      });

      setOrderSuccessMessage(`Commande client enregistrée avec succès ! Le vendeur a reçu la notification instantanée.`);
      setClientName('');
      setClientPhone('');
      setClientAddress('');
      setOrderQuantity(1);
      setOrderNotes('');
      setOrderProofUrl('');
      
      // Refresh orders
      await loadData();
      setTimeout(() => {
        setIsOrderModalOpen(false);
        setOrderSuccessMessage(null);
        setActiveTab('orders');
      }, 1500);
    } catch (err: any) {
      setOrderErrorMessage(err?.message || 'Erreur lors de l\'enregistrement de la commande.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Handle Buy Badge with Balance Check & Automatic Wallet Debit
  const handlePurchaseCertifiedBadge = async () => {
    // Si code promo 100% ou gratuit, aucun solde requis
    if (BADGE_PRICE > 0 && effectiveUserBalance < BADGE_PRICE) {
      setBadgeErrorMsg(`Solde insuffisant : Vous avez ${formatPrice(effectiveUserBalance)}. Il vous manque ${formatPrice(BADGE_PRICE - effectiveUserBalance)}. Veuillez recharger votre solde.`);
      return;
    }

    setIsPurchasingBadge(true);
    setBadgeErrorMsg(null);
    try {
      const deduction = BADGE_PRICE > 0 ? Math.min(effectiveUserBalance, BADGE_PRICE) : 0;
      const newBalance = Math.max(0, effectiveUserBalance - deduction);
      const updatedProfileData = {
        balance: newBalance,
        walletBalance: newBalance,
        isTelemarketerCertified: true,
        certifiedBadgePurchased: true,
        telemarketerBadge: true,
        certifiedBadgeDate: new Date().toISOString()
      };

      setLocalBadge(true);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`dokya_badge_${currentUid}`, 'true');
          localStorage.setItem(`dokya_tel_badge_${currentUid}`, 'true');
        } catch (_e) {}
      }

      if (onUpdateProfile) {
        onUpdateProfile(updatedProfileData);
      }

      if (currentUid && currentUid !== 'guest') {
        try {
          const userRef = doc(db, 'candidates', currentUid);
          await setDoc(userRef, updatedProfileData, { merge: true });
        } catch (_e) {}
        try {
          await setDoc(doc(db, 'users', currentUid), {
            balance: newBalance,
            walletBalance: newBalance,
            isTelemarketerCertified: true,
            telemarketerBadge: true
          }, { merge: true });
        } catch (_e) {}
      }

      // Record transaction
      const txId = `TX-BADGE-${Date.now()}`;
      try {
        await recordTransactionEverywhere({
          id: txId,
          transactionId: txId,
          userId: currentUid,
          userEmail: profile.email || auth.currentUser?.email || 'televendeur@dokya.sn',
          userName: profile.displayName || profile.personalInfo?.firstName || 'Télévendeur Dokya',
          type: 'telemarketer_badge',
          amount: -BADGE_PRICE,
          expectedAmount: BADGE_PRICE,
          currency: 'FCFA',
          description: publishedPromo
            ? `Achat Badge Télévendeur Certifié VIP (Code Promo ${publishedPromo.code}: -${badgeDiscount.discountLabel})`
            : 'Achat Badge Télévendeur Certifié VIP (Débit solde de compte)',
          status: 'SUCCESS',
          aiStatus: 'COMPLETED',
          paymentMethod: BADGE_PRICE === 0 ? 'promo_code' : 'wallet',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } catch (errTx) {
        console.warn('Error recording badge transaction:', errTx);
      }

      try {
        await createNotification(currentUid, {
          title: 'Badge Télévendeur Certifié Activé !',
          message: BADGE_PRICE === 0
            ? `Félicitations ! Votre Badge Télévendeur Certifié a été activé Gratuitement grâce au Code Promo ${publishedPromo?.code || 'VIP'}. Accès illimité débloqué.`
            : `Félicitations ! Votre Badge Télévendeur Certifié a été validé (-${formatPrice(BADGE_PRICE)} débités du solde). Accès illimité débloqué.`,
          type: 'success',
          tabTarget: 'badge'
        });
      } catch (_e) {}

      setBadgeSuccessMessage(
        BADGE_PRICE === 0
          ? `Félicitations ! Votre Badge Télévendeur Certifié est activé Gratuitement (Code Promo). Vous avez désormais un accès illimité à toutes les offres de vente.`
          : `Félicitations ! Votre Badge Télévendeur Certifié est activé (-${formatPrice(BADGE_PRICE)} débité du solde). Vous avez désormais un accès illimité à toutes les offres de vente.`
      );
      setTimeout(() => {
        setIsBadgeModalOpen(false);
        setBadgeSuccessMessage(null);
      }, 2500);
    } catch (e: any) {
      console.error('Error purchasing badge:', e);
      setBadgeErrorMsg(e?.message || 'Erreur lors de l\'activation du badge.');
    } finally {
      setIsPurchasingBadge(false);
    }
  };

  // Handle VIP Activation with Balance Check & Automatic Wallet Debit
  const handleToggleVipMode = async () => {
    // If activating VIP, check balance if price > 0
    if (!isVipMode && VIP_MONTHLY_PRICE > 0) {
      if (effectiveUserBalance < VIP_MONTHLY_PRICE) {
        setVipErrorMsg(`Solde insuffisant : Vous avez ${formatPrice(effectiveUserBalance)}. Il vous manque ${formatPrice(VIP_MONTHLY_PRICE - effectiveUserBalance)}. Veuillez recharger votre solde.`);
        setIsVipModalOpen(true);
        return;
      }
    }

    setIsActivatingVip(true);
    setVipErrorMsg(null);
    try {
      const willBeVip = !isVipMode;
      const deduction = willBeVip && VIP_MONTHLY_PRICE > 0 ? Math.min(effectiveUserBalance, VIP_MONTHLY_PRICE) : 0;
      const newBalance = Math.max(0, effectiveUserBalance - deduction);

      const updated = {
        telemarketerPlan: (willBeVip ? 'vip' : 'standard') as 'standard' | 'vip',
        telemarketerMode: (willBeVip ? 'vip' : 'standard') as 'standard' | 'vip',
        balance: newBalance,
        walletBalance: newBalance
      };

      setLocalPlan(willBeVip ? 'vip' : 'standard');
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`dokya_tel_plan_${currentUid}`, willBeVip ? 'vip' : 'standard');
          localStorage.setItem(`dokya_tel_mode_${currentUid}`, willBeVip ? 'vip' : 'standard');
        } catch (_e) {}
      }

      if (onUpdateProfile) {
        onUpdateProfile(updated);
      }

      if (currentUid && currentUid !== 'guest') {
        try {
          const userRef = doc(db, 'candidates', currentUid);
          await setDoc(userRef, updated, { merge: true });
        } catch (_e) {}
        try {
          await setDoc(doc(db, 'users', currentUid), {
            telemarketerPlan: updated.telemarketerPlan,
            telemarketerMode: updated.telemarketerMode,
            balance: newBalance,
            walletBalance: newBalance
          }, { merge: true });
        } catch (_e) {}
      }

      if (willBeVip) {
        const txId = `TX-VIP-${Date.now()}`;
        try {
          await recordTransactionEverywhere({
            id: txId,
            transactionId: txId,
            userId: currentUid,
            userEmail: profile.email || auth.currentUser?.email || 'televendeur@dokya.sn',
            userName: profile.displayName || profile.personalInfo?.firstName || 'Télévendeur Dokya',
            type: 'telemarketer_vip',
            amount: -VIP_MONTHLY_PRICE,
            expectedAmount: VIP_MONTHLY_PRICE,
            currency: 'FCFA',
            description: publishedPromo
              ? `Souscription Mode VIP Télévendeur 100% Commissions (Code Promo ${publishedPromo.code}: -${vipDiscount.discountLabel})`
              : 'Souscription Mode VIP Télévendeur (100% Commissions)',
            status: 'SUCCESS',
            aiStatus: 'COMPLETED',
            paymentMethod: VIP_MONTHLY_PRICE === 0 ? 'promo_code' : 'wallet',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } catch (_tx) {}

        try {
          await createNotification(currentUid, {
            title: 'Mode VIP Télévendeur Activé !',
            message: VIP_MONTHLY_PRICE === 0
              ? `Mode VIP actif ! Vous touchez désormais 100% de toutes vos commissions (Gratuit via Code Promo).`
              : `Mode VIP actif ! Vous touchez désormais 100% de toutes vos commissions (-${formatPrice(VIP_MONTHLY_PRICE)} débités).`,
            type: 'success',
            tabTarget: 'wallet'
          });
        } catch (_n) {}
      }

      setIsVipModalOpen(false);
    } catch (e: any) {
      console.error('Error toggling VIP mode:', e);
      setVipErrorMsg(e?.message || 'Erreur lors de la mise à jour du mode VIP.');
    } finally {
      setIsActivatingVip(false);
    }
  };

  // Handle Submit Seller Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewErrorMessage(null);

    // Résolution robuste de l'identifiant du vendeur
    let effectiveSellerId = reviewSellerId;
    let effectiveSellerName = reviewSellerName;
    let effectiveSellerUsername = reviewSellerUsername;

    if (!effectiveSellerId && offers.length > 0) {
      const match = offers.find(o => 
        (o.sellerId && o.sellerId === reviewSellerId) ||
        (o.userId && o.userId === reviewSellerId) ||
        (reviewSellerName && o.sellerName === reviewSellerName)
      ) || offers[0];

      if (match) {
        effectiveSellerId = match.sellerId || match.userId || '';
        effectiveSellerName = match.sellerName || 'Vendeur';
        effectiveSellerUsername = match.sellerUsername || match.sellerName || 'vendeur';
      }
    }

    if (!effectiveSellerId) {
      setReviewErrorMessage("Veuillez sélectionner le vendeur partenaire à évaluer.");
      return;
    }
    if (!reviewComment.trim()) {
      setReviewErrorMessage("Veuillez renseigner un commentaire sur votre expérience.");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const reviewerName = profile.displayName || 
                           [profile.personalInfo?.firstName, profile.personalInfo?.lastName].filter(Boolean).join(' ') || 
                           'Télévendeur Dokya';

      const savedRev = await saveSellerReview({
        sellerId: effectiveSellerId,
        sellerName: effectiveSellerName || 'Vendeur Dokya',
        sellerUsername: effectiveSellerUsername || 'vendeur',
        telemarketerId: currentUid,
        telemarketerName: reviewerName,
        rating: reviewRating,
        comment: reviewComment.trim(),
        tags: reviewTag ? [reviewTag] : ['Produit conforme']
      });

      // Mettre à jour immédiatement la liste dans l'état local
      setReviews(prev => [savedRev, ...prev.filter(r => r.id !== savedRev.id)]);
      setReviewSuccessMessage('Votre avis public a été publié avec succès !');
      setReviewComment('');
      
      // Rechargement en tâche de fond
      loadData().catch(() => {});

      setTimeout(() => {
        setIsReviewModalOpen(false);
        setReviewSuccessMessage(null);
        setReviewErrorMessage(null);
      }, 1500);
    } catch (e: any) {
      console.error('Error saving review:', e);
      setReviewErrorMessage(e?.message || "Erreur lors de la publication de l'avis.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle Withdrawal Request
  const handleRequestWithdrawal = () => {
    if (withdrawAmount <= 0) return;
    setWithdrawSuccessMsg(`Votre demande de retrait de ${formatPrice(withdrawAmount)} via ${withdrawOperator.toUpperCase()} (${withdrawPhone}) a été transmise au service financier. Traitement sous 24h.`);
    setTimeout(() => {
      setIsWithdrawModalOpen(false);
      setWithdrawSuccessMsg(null);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-white">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER : DÉDIÉ ESPACE TÉLÉVENDEUR (DESKTOP & MOBILE COMPACT)        */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-emerald-900/40 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3 shadow-xl">
        
        {/* Left: Telemarketer Portal Brand & Switch to Seller */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 md:hidden hover:text-white cursor-pointer shrink-0"
            title="Ouvrir le menu"
          >
            <Menu className="w-5 h-5 text-emerald-400" />
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40 shrink-0">
              <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-base font-black text-white tracking-tight truncate">
                  Dokya Télévendeurs
                </span>
                <span className="hidden xs:inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  Affiliation Pro 💼
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Espace indépendant de vente & commissions directes
              </p>
            </div>
          </div>
        </div>

        {/* Right Desktop: Full Toolbar (>= 768px) */}
        <div className="hidden md:flex items-center gap-2 sm:gap-2.5 flex-wrap">
          
          {/* BOUTON CLÉ : BASCULER VERS ESPACE VENDEUR / COMMERÇANT */}
          <button
            type="button"
            onClick={onSwitchToSeller}
            className="px-3 py-1.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-700/60 hover:border-indigo-500 text-indigo-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95 shrink-0"
            title="Revenir au compte Vendeur Dokya"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
            <span>Espace Vendeur</span>
            <ArrowRight className="w-3 h-3 text-indigo-400" />
          </button>

          {/* Solde Dokya partagé du compte & Bouton Recharger */}
          <div className="bg-slate-900 hover:bg-slate-850 border border-blue-900/50 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner shrink-0">
            <Coins className="w-3.5 h-3.5 text-blue-400" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-slate-400">Solde Compte :</span>
              <span className="text-xs font-black text-white whitespace-nowrap">
                {formatPrice(effectiveUserBalance)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsRechargeModalOpen(true)}
              className="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] transition-all cursor-pointer shadow-xs active:scale-95"
              title="Recharger mon solde de compte Dokya"
            >
              + Recharger
            </button>
          </div>

          {/* Quick Commissions Balance indicator */}
          <div 
            onClick={() => setActiveTab('wallet')}
            className="bg-slate-900 hover:bg-slate-850 border border-emerald-900/60 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-inner cursor-pointer transition-colors shrink-0"
            title="Voir mon solde commissions et demander un retrait"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-slate-400">Commissions :</span>
              <span className="text-xs font-black text-emerald-400 whitespace-nowrap">
                {formatPrice(availableWithdrawBalance)}
              </span>
            </div>
          </div>

          {/* SÉLECTEUR GLOBAL DE DEVISE */}
          <div className="relative z-50">
            <button
              type="button"
              onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer"
              title="Changer la devise globale"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono">{userCurrency}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isCurrencyDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-36 rounded-2xl bg-slate-900 border border-slate-800 p-1.5 shadow-2xl z-[9999] animate-in fade-in zoom-in-95 duration-150">
                {[
                  { code: 'XOF' as SupportedCurrency, label: 'FCFA XOF', flag: '🇸🇳' },
                  { code: 'XAF' as SupportedCurrency, label: 'FCFA XAF', flag: '🇨🇲' },
                  { code: 'EUR' as SupportedCurrency, label: 'Euro (€)', flag: '🇪🇺' },
                  { code: 'USD' as SupportedCurrency, label: 'Dollar ($)', flag: '🇺🇸' }
                ].map((curr) => (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => {
                      setUserCurrency(curr.code);
                      setIsCurrencyDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      userCurrency === curr.code
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{curr.flag}</span>
                      <span>{curr.label}</span>
                    </span>
                    {userCurrency === curr.code && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <NotificationBell userId={currentUid} />

          {/* Logout */}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 text-slate-400 hover:text-rose-300 text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden lg:inline">Déconnexion</span>
            </button>
          )}
        </div>

        {/* Right Mobile Compact Controls (< 768px): Never Overflows */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          {/* SÉLECTEUR GLOBAL DE DEVISE (MOBILE) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
              className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-900 text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
            >
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>{userCurrency}</span>
            </button>

            {isCurrencyDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-36 rounded-2xl bg-slate-900 border border-slate-800 p-1.5 shadow-2xl z-[9999]">
                {[
                  { code: 'XOF' as SupportedCurrency, label: 'FCFA XOF', flag: '🇸🇳' },
                  { code: 'XAF' as SupportedCurrency, label: 'FCFA XAF', flag: '🇨🇲' },
                  { code: 'EUR' as SupportedCurrency, label: 'Euro (€)', flag: '🇪🇺' },
                  { code: 'USD' as SupportedCurrency, label: 'Dollar ($)', flag: '🇺🇸' }
                ].map((curr) => (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => {
                      setUserCurrency(curr.code);
                      setIsCurrencyDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                      userCurrency === curr.code
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{curr.flag} {curr.label}</span>
                    {userCurrency === curr.code && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <NotificationBell userId={currentUid} />

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-950/40 cursor-pointer"
              title="Déconnexion"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MOBILE TELEMARKETER COMMAND & QUICK NAVIGATION BAR (MOBILE ONLY)          */}
      {/* ========================================================================= */}
      <div className="md:hidden bg-slate-950 border-b border-slate-800/80 sticky top-[53px] z-40 shadow-lg">
        {/* Row 1: Switch to Seller + Quick Balances */}
        <div className="px-3 py-2 flex items-center justify-between gap-1.5 border-b border-slate-900 overflow-x-auto no-scrollbar">
          {/* Switch to Seller button */}
          <button
            type="button"
            onClick={onSwitchToSeller}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-200 text-[11px] font-bold flex items-center gap-1 shrink-0 active:scale-95"
            title="Basculer vers mon compte vendeur"
          >
            <ShoppingBag className="w-3 h-3 text-indigo-400" />
            <span>Espace Vendeur</span>
            <ArrowRight className="w-2.5 h-2.5 text-indigo-400" />
          </button>

          {/* Solde Compte */}
          <div className="px-2 py-1 rounded-xl bg-slate-900 border border-blue-900/40 flex items-center gap-1.5 shrink-0 text-[11px]">
            <Coins className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="font-black text-white">{formatPrice(effectiveUserBalance)}</span>
            <button
              type="button"
              onClick={() => setIsRechargeModalOpen(true)}
              className="px-1.5 py-0.2 rounded bg-blue-600 text-white font-black text-[10px]"
              title="Recharger mon solde"
            >
              +
            </button>
          </div>

          {/* Solde Commissions */}
          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className="px-2 py-1 rounded-xl bg-slate-900 border border-emerald-900/50 flex items-center gap-1.5 shrink-0 text-[11px]"
            title="Voir mes commissions et retraits"
          >
            <Wallet className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-black text-emerald-400">{formatPrice(availableWithdrawBalance)}</span>
          </button>
        </div>

        {/* Row 2: Thumb-Friendly Horizontal Scroll Tab Bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Aperçu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('marketplace')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'marketplace'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            <span>Offres ({offers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOrderModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>+ Vendre</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ventes ({myOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'wallet'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Portefeuille</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('badge')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'badge'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Badge {hasCertifiedBadge ? '★' : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsVipModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>{isVipMode ? 'VIP Actif' : 'Pass VIP'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>Avis</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BODY LAYOUT : SIDEBAR + MAIN CONTENT                                   */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR NAVIGATION TÉLÉVENDEUR */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800/90 flex flex-col transition-transform duration-300 md:static md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          {/* User profile brief card */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-base shadow-md">
                {(profile.displayName || profile.personalInfo?.firstName || 'T').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate">
                  {profile.displayName || `${profile.personalInfo?.firstName || ''} ${profile.personalInfo?.lastName || ''}`.trim() || 'Télévendeur Pro'}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                    {hasCertifiedBadge ? 'Certifié ★' : 'Standard'}
                  </span>
                </div>
              </div>
            </div>

            {/* Badge Status */}
            <div className="mt-3 p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold text-emerald-200">
                  {isVipMode ? 'Mode VIP (100% net)' : 'Mode Standard (80% net)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsVipModalOpen(true)}
                className="text-[10px] font-black text-amber-300 hover:underline cursor-pointer"
              >
                {isVipMode ? 'Gérer' : 'Pass VIP'}
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            
            {/* 1. Overview */}
            <button
              type="button"
              onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Vue d'ensemble</span>
            </button>

            {/* 2. Marketplace Catalogue */}
            <button
              type="button"
              onClick={() => { setActiveTab('marketplace'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'marketplace'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Catalogue d'Offres</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                {offers.length}
              </span>
            </button>

            {/* 3. Enregistrer une Commande Client */}
            <button
              type="button"
              onClick={() => { setIsOrderModalOpen(true); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Enregistrer une Vente</span>
            </button>

            {/* 4. Mes Commandes & Commissions */}
            <button
              type="button"
              onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Mes Ventes & Preuves</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-bold">
                {myOrders.length}
              </span>
            </button>

            {/* 5. Mon Portefeuille & Retraits */}
            <button
              type="button"
              onClick={() => { setActiveTab('wallet'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'wallet'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Retraits & Portefeuille</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </button>

            {/* 6. Avis sur les Vendeurs */}
            <button
              type="button"
              onClick={() => { setActiveTab('reviews'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Star className="w-4 h-4 text-amber-400" />
              <span>Avis & Anti-Fraude</span>
            </button>

            {/* 7. Mon Badge Certifié */}
            <button
              type="button"
              onClick={() => { setActiveTab('badge'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'badge'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Badge & Monétisation</span>
              </div>
              {hasCertifiedBadge ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>

            {/* 8. Paramètres */}
            <button
              type="button"
              onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Paramètres & Coordonnées</span>
            </button>

          </nav>

          {/* Bottom Sidebar Switcher */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-900/60">
            <button
              type="button"
              onClick={onSwitchToSeller}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-600/50 text-indigo-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-indigo-400" />
              <span>Aller vers Compte Vendeur</span>
            </button>
          </div>
        </aside>

        {/* Mobile menu backdrop */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}

        {/* MAIN VIEW CONTENT AREA */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
          
          {/* BANDEAU PROMO PUBLIQUE ADMIN EN COURS (SYNCHRONISÉ AVEC LE DASHBOARD ADMIN) */}
          {publishedPromo && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-2 border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl shadow-emerald-500/10 animate-in fade-in">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-emerald-300 fill-emerald-300 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-white">
                      Code promo actif : <span className="font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40 font-bold">{publishedPromo.code}</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 text-xs font-black">
                      {publishedPromo.discountType === 'percentage' ? `-${publishedPromo.discountValue}%` : `-${formatPrice(publishedPromo.discountValue)}`} de Réduction
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/90 mt-0.5">
                    Remise exceptionnelle automatiquement appliquée sur le <strong>Badge Télévendeur Certifié</strong> ({formatPrice(effectiveBadgePrice)}) et l'<strong>Abonnement Mode VIP</strong> ({formatPrice(effectiveVipPrice)}/mois).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!hasCertifiedBadge && (
                  <button
                    type="button"
                    onClick={() => setIsBadgeModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    Badge à {formatPrice(effectiveBadgePrice)}
                  </button>
                )}
                {!isVipMode && (
                  <button
                    type="button"
                    onClick={() => setIsVipModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    VIP à {formatPrice(effectiveVipPrice)}/m
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW / TABLEAU DE BORD TÉLÉVENDEUR                              */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Banner with role greeting */}
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-800/50 p-4 sm:p-8 shadow-2xl">
                <div className="relative z-10 max-w-2xl space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Espace Télévendeurs Dokya</span>
                  </div>
                  <h1 className="text-xl sm:text-4xl font-black text-white tracking-tight">
                    Vos Offres, Vos Ventes, Vos Commissions
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Vendez des produits physiques et digitaux de commerçants certifiés sans stock ni logistique. Enregistrez vos commandes clients et touchez vos commissions immédiatement.
                  </p>
                  <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setIsOrderModalOpen(true)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Enregistrer une Vente Client</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('marketplace')}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Package className="w-4 h-4 text-emerald-400" />
                      <span>Explorer les {offers.length} Offres</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
                {/* 1. Commissions Encaissées */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Commissions Validées</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white">
                    {formatPrice(totalCommissionsEarned)}
                  </div>
                  <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{validatedOrders.length} commandes livrées</span>
                  </p>
                </div>

                {/* 2. Commissions en attente */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">En Attente</span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-300">
                    {formatPrice(pendingCommissions)}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    En cours de livraison / validation
                  </p>
                </div>

                {/* 3. Ventes Conclues */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Commandes Totales</span>
                    <Package className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white">
                    {totalSalesCount}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Générées depuis votre compte
                  </p>
                </div>

                {/* 4. Statut Monétisation */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mode de Gains</span>
                    <Crown className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-base sm:text-lg font-black text-white truncate">
                    {isVipMode ? '👑 VIP (100% Net)' : 'Standard (80% Net)'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVipModalOpen(true)}
                    className="text-[10px] font-bold text-emerald-400 hover:underline cursor-pointer"
                  >
                    {isVipMode ? 'Gérer votre Pass VIP' : 'Passer à 100% de commission →'}
                  </button>
                </div>

              </div>

              {/* Quick Offers Spotlight */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-400" />
                    <span>Top Offres Rémunératrices du Moment</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('marketplace')}
                    className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Voir tout le catalogue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {offers.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-dashed border-slate-800/80 space-y-2.5">
                    <Package className="w-8 h-8 text-slate-600 mx-auto" />
                    <h4 className="text-sm font-bold text-white">Catalogue d'offres actuellement vierge</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Aucune fausse offre. Dès que des vendeurs certifiés publieront des produits avec commission d'affiliation, ils apparaîtront ici.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {offers.slice(0, 3).map(prod => {
                      const cardImg = (prod.images && prod.images.length > 0 && prod.images[0]) || 
                                      prod.imageUrl || 
                                      (prod as any).image || 
                                      'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80';
                      return (
                        <div key={prod.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-700/60 transition-all flex flex-col justify-between space-y-3 overflow-hidden group">
                          <div>
                            {/* Product preview thumbnail */}
                            <div className="h-28 w-full rounded-xl overflow-hidden bg-slate-950 mb-3 relative">
                              <img 
                                src={cardImg} 
                                alt={prod.title} 
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80';
                                }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                              />
                              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/50 text-[10px] font-black text-emerald-300 backdrop-blur-sm">
                                +{prod.commissionType === 'percent' ? `${prod.commissionValue || 20}%` : formatPrice(prod.commissionValue || 2000)}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                {prod.category}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white line-clamp-1">{prod.title}</h4>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{prod.description}</p>
                            <div className="mt-2 text-sm font-black text-white">
                              Prix client : <span className="text-emerald-400">{formatPrice(prod.price)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductForOrder(prod);
                              setIsOrderModalOpen(true);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Enregistrer une vente</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: MARKETPLACE / CATALOGUE DES OFFRES DE VENTE                        */}
          {/* ========================================================================= */}
          {activeTab === 'marketplace' && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Header with Search and Country filters */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <Package className="w-5 h-5 text-emerald-400" />
                      <span>Catalogue d'Offres Marketplace Dokya</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Filtrez les produits par pays de ciblage, commissions et catégories
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOrderModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Enregistrer Commande</span>
                    </button>
                  </div>
                </div>

                {/* Filters Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Rechercher une offre..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* Country Filter */}
                  <div>
                    <select
                      value={selectedCountryFilter}
                      onChange={(e) => setSelectedCountryFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none cursor-pointer"
                    >
                      <option value="ALL">🌍 Tous les Pays</option>
                      <option value="SN">🇸🇳 Sénégal (SN)</option>
                      <option value="CI">🇨🇮 Côte d'Ivoire (CI)</option>
                      <option value="CM">🇨🇲 Cameroun (CM)</option>
                      <option value="CG">🇨🇬 Congo (CG)</option>
                      <option value="BJ">🇧🇯 Bénin (BJ)</option>
                      <option value="ML">🇲🇱 Mali (ML)</option>
                      <option value="TG">🇹🇬 Togo (TG)</option>
                      <option value="GA">🇬🇦 Gabon (GA)</option>
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none cursor-pointer"
                    >
                      <option value="ALL">📦 Toutes Catégories</option>
                      <option value="Services & Formations">Services & Formations</option>
                      <option value="Mode & Beauté">Mode & Beauté</option>
                      <option value="Électronique & High-Tech">Électronique & High-Tech</option>
                      <option value="Maison & Décoration">Maison & Décoration</option>
                      <option value="Santé & Bien-être">Santé & Bien-être</option>
                    </select>
                  </div>

                  {/* Commission Sort */}
                  <div>
                    <select
                      value={commissionSort}
                      onChange={(e) => setCommissionSort(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none cursor-pointer"
                    >
                      <option value="default">↕ Tri par Défaut</option>
                      <option value="highest">💰 Meilleure Commission</option>
                      <option value="percent">% Commission Élevée</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* Offer Cards Grid */}
              {filteredOffers.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
                  <Package className="w-10 h-10 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-white">
                    {offers.length === 0 ? "Le catalogue d'offres est actuellement vierge" : "Aucune offre ne correspond à vos filtres"}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {offers.length === 0 
                      ? "Le compte télévendeur est parfaitement vierge de toute fausse offre. Les offres réelles créées par les vendeurs partenaires apparaîtront ici." 
                      : 'Essayez de modifier votre recherche ou de sélectionner "Tous les pays".'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOffers.map((prod) => {
                    const calc = calculateTelemarketerCommission(
                      prod.price, 
                      prod.commissionType || 'percent', 
                      prod.commissionValue || 20, 
                      isVipMode
                    );

                    return (
                      <div 
                        key={prod.id} 
                        className="rounded-3xl bg-slate-900 border border-slate-800/90 overflow-hidden flex flex-col justify-between hover:border-emerald-600/60 transition-all shadow-xl group"
                      >
                        {/* Top banner / Image du produit plein format garanti */}
                        <div className="h-44 sm:h-48 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                          {(() => {
                            const imgSrc = (prod.images && prod.images.length > 0 && prod.images[0]) || 
                                           prod.imageUrl || 
                                           (prod as any).image || 
                                           (prod as any).productImage ||
                                           'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80';
                            return (
                              <img 
                                src={imgSrc} 
                                alt={prod.title} 
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80';
                                }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              />
                            );
                          })()}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 pointer-events-none" />
                          
                          {/* Commission Tag */}
                          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-emerald-900/90 border border-emerald-500/50 backdrop-blur-md text-emerald-200 text-xs font-black shadow-lg">
                            {prod.commissionType === 'percent' ? `${prod.commissionValue || 20}%` : formatPrice(prod.commissionValue || 2000)} commission
                          </div>

                          {/* Country Badges */}
                          <div className="absolute bottom-2 left-3 flex items-center gap-1">
                            {prod.targetCountries?.includes('ALL') ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-950/80 text-slate-200 border border-white/10 backdrop-blur-md">
                                🌍 Tous pays
                              </span>
                            ) : (
                              prod.targetCountries?.slice(0, 3).map(c => (
                                <span key={c} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-950/80 text-emerald-300 border border-white/10 backdrop-blur-md">
                                  {c}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {prod.category}
                            </span>
                            <h3 className="text-base font-black text-white line-clamp-1 group-hover:text-emerald-300 transition-colors">
                              {prod.title}
                            </h3>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {prod.description || 'Offre vérifiée par Dokya AI.'}
                            </p>
                          </div>

                          {/* Price & Telemarketer Net Earnings */}
                          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Prix Vente Client :</span>
                              <span className="font-bold text-white">{formatPrice(prod.price)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                              <span className="text-emerald-400 font-bold">Votre Gain Net :</span>
                              <span className="font-black text-sm text-emerald-400">
                                {formatPrice(calc.telemarketerNet)}
                              </span>
                            </div>
                          </div>

                          {/* Seller & Action */}
                          <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span className="flex items-center gap-1 truncate max-w-[150px]">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{prod.sellerName || 'Vendeur Dokya'}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const sId = prod.sellerId || prod.userId || (prod as any).id;
                                  setReviewSellerId(sId);
                                  setReviewSellerName(prod.sellerName || 'Vendeur');
                                  setReviewSellerUsername(prod.sellerUsername || prod.sellerName || 'vendeur');
                                  setReviewErrorMessage(null);
                                  setReviewSuccessMessage(null);
                                  setIsReviewModalOpen(true);
                                }}
                                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold cursor-pointer transition-colors"
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>Noter ce Vendeur</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const link = `${window.location.origin}/p/${prod.slug || prod.id}?ref=${currentUid}`;
                                  navigator.clipboard.writeText(link);
                                  setCopiedLinkProductId(prod.id);
                                  setTimeout(() => setCopiedLinkProductId(null), 2000);
                                }}
                                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                              >
                                {copiedLinkProductId === prod.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Lien Vente</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProductForOrder(prod);
                                  setIsOrderModalOpen(true);
                                }}
                                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Vendre</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: MES COMMANDES & COMMISSIONS CLIENTS                                 */}
          {/* ========================================================================= */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-400" />
                    <span>Mes Commandes Clients ({myOrders.length})</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Suivez en temps réel le statut des livraisons et le versement de vos commissions
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Enregistrer une nouvelle vente</span>
                </button>
              </div>

              {myOrders.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">Aucune commande enregistrée pour le moment</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Prenez contact avec vos prospects et clients, puis enregistrez directement leur commande ici pour toucher vos commissions.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsOrderModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer shadow-lg"
                  >
                    + Enregistrer ma première vente
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myOrders.map(order => (
                    <div 
                      key={order.id} 
                      className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-400">#{order.id.slice(0, 10)}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            order.status === 'delivered' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : order.status === 'validated'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : order.status === 'cancelled'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {order.status === 'delivered' ? 'Livré & Validé' : order.status === 'validated' ? 'Validé par Vendeur' : order.status === 'cancelled' ? 'Annulé' : 'En attente livraison'}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-400">{order.sellerName || 'Vendeur'}</span>
                        </div>

                        <h4 className="text-base font-bold text-white">{order.productTitle}</h4>

                        <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <strong>{order.buyerName}</strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{order.buyerPhone}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{order.buyerAddress}</span>
                          </span>
                        </div>
                      </div>

                      {/* Financial info */}
                      <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-800 gap-1 w-full md:w-auto">
                        <div className="flex sm:flex-col items-baseline justify-between sm:justify-start w-full sm:w-auto gap-2">
                          <span className="text-xs text-slate-400">Commission Nette :</span>
                          <div className="text-base sm:text-lg font-black text-emerald-400">
                            {formatPrice(order.commissionNet || 0)}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Montant total : {formatPrice(order.totalAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: WALLET & DEMANDES DE RETRAIT TÉLÉVENDEUR                           */}
          {/* ========================================================================= */}
          {activeTab === 'wallet' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-800/60 space-y-5 sm:space-y-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Portefeuille Commissions Télévendeur</span>
                    </span>
                    <h3 className="text-xl sm:text-4xl font-black text-white">
                      Solde Retirable : <span className="text-emerald-400">{formatPrice(availableWithdrawBalance)}</span>
                    </h3>
                    <p className="text-xs text-slate-300">
                      Retrait direct vers Wave, Orange Money ou MTN Mobile Money sans délai caché.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black shadow-xl shadow-emerald-900/50 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
                  >
                    <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                    <span>Demander un Retrait</span>
                  </button>
                </div>
              </div>

              {/* Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Paiements Rapides</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Les retraits sont traités quotidiennement vers vos comptes Wave, Orange Money ou bancaires sous 24h ouvrées.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Protection Anti-Fraude</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Chaque commande fait l'objet d'une validation avec le commerçant propriétaire afin d'assurer l'encaissement effectif.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>Avantage VIP 100%</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Activez le mode VIP pour éliminer toute commission plateforme et conserver 100% de la valeur de vos ventes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: AVIS & NOTATIONS ANTI-FRAUDE SUR LES VENDEURS                      */}
          {/* ========================================================================= */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span>Système d'Avis & Notations Vendeurs</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Consultez et publiez des avis transparents sur les vendeurs pour sécuriser la communauté des télévendeurs.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setReviewSellerId('');
                    setReviewSellerName('');
                    setReviewSellerUsername('');
                    setReviewErrorMessage(null);
                    setReviewSuccessMessage(null);
                    setIsReviewModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Laisser un avis sur un vendeur</span>
                </button>
              </div>

              {reviews.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                  <Star className="w-10 h-10 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-white">Aucun avis publié pour le moment</h4>
                  <p className="text-xs text-slate-400">Soyez le premier télévendeur à évaluer la réactivité et la ponctualité d'un commerçant.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.map(rev => (
                    <div key={rev.id} className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-emerald-400" />
                            <span>{rev.sellerName}</span>
                          </h4>
                          <span className="text-[11px] text-slate-400">Par {rev.telemarketerName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-400' : 'text-slate-600'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed italic">
                        "{rev.comment}"
                      </p>
                      <div className="text-[10px] text-slate-500 text-right">
                        Publié le {new Date(rev.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: BADGE TÉLÉVENDEUR CERTIFIÉ & MODES DE MONÉTISATION                 */}
          {/* ========================================================================= */}
          {activeTab === 'badge' && (
            <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
              
              {/* Badge Status Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    hasCertifiedBadge 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {hasCertifiedBadge ? <ShieldCheck className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {hasCertifiedBadge ? 'Badge Télévendeur Certifié : ACTIF ★' : 'Badge Télévendeur Certifié : NON ACTIVÉ'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {hasCertifiedBadge 
                        ? 'Votre profil est vérifié. Vous avez un accès prioritaire à l\'ensemble des catalogues de vente.'
                        : 'Activez votre badge pour débloquer le catalogue complet et enregistrer des commandes sans restriction.'}
                    </p>
                  </div>
                </div>

                {!hasCertifiedBadge && (
                  <button
                    type="button"
                    onClick={() => setIsBadgeModalOpen(true)}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-lg hover:from-emerald-500 hover:to-teal-500 cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>Activer mon Badge Certifié</span>
                    {badgeDiscount.hasDiscount ? (
                      <div className="flex items-center gap-1.5">
                        <span className="line-through text-slate-300 opacity-70 text-[11px]">{formatPrice(BASE_BADGE_PRICE)}</span>
                        <span className="text-amber-300 font-black">{formatPrice(effectiveBadgePrice)}</span>
                        <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-black">{badgeDiscount.discountLabel}</span>
                      </div>
                    ) : (
                      <span>({formatPrice(effectiveBadgePrice)})</span>
                    )}
                  </button>
                )}
              </div>

              {/* Comparison 2 Modes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Standard */}
                <div className={`p-6 rounded-3xl border space-y-4 ${
                  !isVipMode ? 'bg-slate-900 border-emerald-600 ring-1 ring-emerald-500/50' : 'bg-slate-900/50 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Formule Gratuite</span>
                    {!isVipMode && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">Actif</span>}
                  </div>
                  <h4 className="text-xl font-black text-white">Mode Standard</h4>
                  <div className="text-2xl font-black text-white">
                    0 FCFA <span className="text-xs font-normal text-slate-400">/ mois</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Vous conservez <strong>80%</strong> de chaque commission</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Prélèvement automatique plateforme de 20%</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Accès complet au catalogue d'offres</span>
                    </li>
                  </ul>
                </div>

                {/* VIP */}
                <div className={`p-6 rounded-3xl border space-y-4 ${
                  isVipMode ? 'bg-slate-900 border-amber-500 ring-1 ring-amber-500/50' : 'bg-slate-900/50 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" />
                      <span>Recommandé</span>
                    </span>
                    {isVipMode && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">Actif</span>}
                  </div>
                  <h4 className="text-xl font-black text-white">Mode VIP Mensuel</h4>
                  <div className="flex items-baseline gap-2">
                    {vipDiscount.hasDiscount && (
                      <span className="text-sm font-bold text-slate-500 line-through">
                        {formatPrice(BASE_VIP_MONTHLY_PRICE)}
                      </span>
                    )}
                    <span className="text-2xl font-black text-amber-300">
                      {formatPrice(effectiveVipPrice)}
                    </span>
                    <span className="text-xs font-normal text-slate-400">/ mois</span>
                    {vipDiscount.hasDiscount && (
                      <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        {vipDiscount.discountLabel}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-400" />
                      <span>Vous conservez <strong>100%</strong> de vos commissions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-400" />
                      <span><strong>0% de prélèvement</strong> par Dokya</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-400" />
                      <span>Paiements prioritaires sous 12h</span>
                    </li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      if (isVipMode) {
                        handleToggleVipMode();
                      } else {
                        if (VIP_MONTHLY_PRICE <= 0 || effectiveUserBalance >= VIP_MONTHLY_PRICE) {
                          handleToggleVipMode();
                        } else {
                          setIsVipModalOpen(true);
                        }
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    {isVipMode ? 'Repasser en Mode Standard (80%)' : `Activer le Mode VIP (100%) ${vipDiscount.hasDiscount ? `— ${formatPrice(effectiveVipPrice)}` : ''}`}
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: PARAMÈTRES TÉLÉVENDEUR                                             */}
          {/* ========================================================================= */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Globe className="w-4.5 h-4.5 text-emerald-400" />
                  <span>Paramètres du Compte Télévendeur</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Devise active pour les commissions & tarifs
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { code: 'XOF' as SupportedCurrency, label: 'FCFA (XOF)', flag: '🇸🇳' },
                        { code: 'XAF' as SupportedCurrency, label: 'FCFA (XAF)', flag: '🇨🇲' },
                        { code: 'EUR' as SupportedCurrency, label: 'Euro (€)', flag: '🇪🇺' },
                        { code: 'USD' as SupportedCurrency, label: 'USD ($)', flag: '🇺🇸' }
                      ].map(curr => (
                        <button
                          key={curr.code}
                          type="button"
                          onClick={() => setUserCurrency(curr.code)}
                          className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                            userCurrency === curr.code
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          <span className="text-base">{curr.flag}</span>
                          <span>{curr.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Numéro de réception des commissions (Wave / OM)
                    </label>
                    <input
                      type="text"
                      defaultValue={profile.personalInfo?.phone || profile.phone || ''}
                      onChange={(e) => {
                        if (onUpdateProfile) onUpdateProfile({ phone: e.target.value });
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-emerald-500"
                      placeholder="+221 77 000 00 00"
                    />
                  </div>

                  <div className="pt-4 flex justify-between items-center border-t border-slate-800">
                    <span className="text-xs text-slate-400">Rôle Actuel :</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Télévendeur / Affilié
                    </span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onSwitchToSeller}
                      className="w-full py-2.5 px-3 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <ShoppingBag className="w-4 h-4 text-indigo-400" />
                      <span>Basculer vers mon Compte Vendeur Dokya</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ENREGISTRER UNE VENTE CLIENT (DIRECT ORDER FORM)                    */}
      {/* ========================================================================= */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Enregistrer une Vente Client</h3>
                  <p className="text-[11px] text-slate-400">Le commerçant recevra la notification immédiatement</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsOrderModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              
              {orderSuccessMessage && (
                <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{orderSuccessMessage}</span>
                </div>
              )}

              {orderErrorMessage && (
                <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{orderErrorMessage}</span>
                </div>
              )}

              {/* Produit Sélectionné */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Produit Vendu *
                </label>
                <select
                  value={selectedProductForOrder?.id || ''}
                  onChange={(e) => {
                    const found = offers.find(o => o.id === e.target.value);
                    setSelectedProductForOrder(found || null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
                  required
                >
                  <option value="">Sélectionnez un produit...</option>
                  {offers.map(prod => (
                    <option key={prod.id} value={prod.id}>
                      {prod.title} — {formatPrice(prod.price)} (Commission : {prod.commissionType === 'percent' ? `${prod.commissionValue}%` : formatPrice(prod.commissionValue || 0)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nom du Client *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Amadou Diallo"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Téléphone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: +221 77 123 45 67"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Adresse & Quantité */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Adresse de Livraison *</label>
                  <input
                    type="text"
                    required
                    placeholder="Quartier, Rue, Ville"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Quantité *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Estimated Commission Preview */}
              {selectedProductForOrder && (
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Total Commande Client :</span>
                    <span className="font-bold text-white">{formatPrice(selectedProductForOrder.price * orderQuantity)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-800/40">
                    <span className="text-emerald-400 font-bold">Votre Commission Nette ({isVipMode ? '100% VIP' : '80% Standard'}) :</span>
                    <span className="text-sm font-black text-emerald-400">
                      {formatPrice(
                        calculateTelemarketerCommission(
                          selectedProductForOrder.price, 
                          selectedProductForOrder.commissionType || 'percent', 
                          selectedProductForOrder.commissionValue || 20, 
                          isVipMode
                        ).telemarketerNet * orderQuantity
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Preuve de livraison / Bordereau */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Preuve de commande / Notes pour le commerçant (Optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions de livraison, créneau horaire souhaité par le client..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingOrder}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs shadow-xl cursor-pointer disabled:opacity-50 transition-all"
              >
                {isSubmittingOrder ? 'Transmission en cours...' : 'Confirmer et Notifier le Vendeur'}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DEMANDE DE RETRAIT                                                 */}
      {/* ========================================================================= */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Demande de Retrait</h3>
                  <p className="text-[11px] text-slate-400">Solde disponible : {formatPrice(availableWithdrawBalance)}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsWithdrawModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {withdrawSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-200 text-xs space-y-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="font-bold">{withdrawSuccessMsg}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Moyen de Retrait</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'wave', label: 'Wave 🌊' },
                      { id: 'orange_money', label: 'Orange Money 🟠' },
                      { id: 'mtn', label: 'MTN MoMo 🟡' }
                    ].map(op => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setWithdrawOperator(op.id as any)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          withdrawOperator === op.id
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Montant à Retirer</label>
                  <input
                    type="number"
                    min="1000"
                    max={availableWithdrawBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Numéro Mobile Money Récepteur</label>
                  <input
                    type="text"
                    value={withdrawPhone}
                    onChange={(e) => setWithdrawPhone(e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nom du Titulaire</label>
                  <input
                    type="text"
                    value={withdrawAccountName}
                    onChange={(e) => setWithdrawAccountName(e.target.value)}
                    placeholder="Prénom et Nom"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRequestWithdrawal}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-lg active:scale-95 transition-all"
                >
                  Confirmer le Retrait de {formatPrice(withdrawAmount)}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOTER UN VENDEUR PARTENAIRE (ANTI-FRAUDE)                           */}
      {/* ========================================================================= */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Évaluer le Vendeur Partenaire</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {reviewSellerName ? `Avis pour ${reviewSellerName}` : 'Sélectionnez un vendeur et publiez votre avis public'}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setIsReviewModalOpen(false);
                  setReviewErrorMessage(null);
                  setReviewSuccessMessage(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reviewSuccessMessage ? (
              <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs text-center font-bold animate-in fade-in space-y-1">
                <Check className="w-6 h-6 text-emerald-400 mx-auto" />
                <p>{reviewSuccessMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-3.5">
                {reviewErrorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                    {reviewErrorMessage}
                  </div>
                )}

                {/* Sélecteur de vendeur si non pré-sélectionné */}
                {!reviewSellerId && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Sélectionner le Vendeur *
                    </label>
                    <select
                      value={reviewSellerId}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        setReviewSellerId(targetId);
                        const found = offers.find(o => (o.sellerId || o.userId) === targetId);
                        if (found) {
                          setReviewSellerName(found.sellerName || 'Vendeur');
                          setReviewSellerUsername(found.sellerUsername || 'vendeur');
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
                      required
                    >
                      <option value="">Sélectionnez un vendeur de votre catalogue...</option>
                      {Array.from(new Map(offers.map(o => [o.sellerId || o.userId, o])).values()).map(o => (
                        <option key={o.sellerId || o.userId} value={o.sellerId || o.userId}>
                          {o.sellerName} ({o.title})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Vendeur ciblé */}
                {reviewSellerId && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white">{reviewSellerName || 'Vendeur Dokya'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setReviewSellerId('');
                        setReviewSellerName('');
                        setReviewSellerUsername('');
                      }}
                      className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Changer
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Note de Fiabilité (1 à 5)</label>
                  <div className="flex items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 cursor-pointer transition-transform hover:scale-125"
                      >
                        <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-black text-amber-400">{reviewRating} / 5</span>
                  </div>
                </div>

                {/* Badge de confiance */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Point fort constaté</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['Paiement rapide', 'Produit conforme', 'Support réactif', 'Excellente communication'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setReviewTag(t)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                          reviewTag === t 
                            ? 'bg-amber-500 text-slate-950 font-black shadow' 
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Votre Avis Public *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Qualité des produits, rapidité de validation et paiement des commissions..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-amber-500 placeholder-slate-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSubmittingReview ? 'Publication en cours...' : 'Publier mon Avis Vendeur'}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ACHAT DU BADGE TÉLÉVENDEUR CERTIFIÉ                                 */}
      {/* ========================================================================= */}
      {isBadgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-emerald-700/60 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">Badge Télévendeur Certifié</h3>
              <p className="text-xs text-slate-400">
                Débloquez l'accès illimité au catalogue de produits et démarrez immédiatement vos ventes avec commissions garanties.
              </p>
            </div>

            {badgeSuccessMessage ? (
              <div className="p-3 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-200 text-xs text-center font-bold">
                {badgeSuccessMessage}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Tarif unique d'activation :</span>
                    <div className="flex items-center gap-2">
                      {badgeDiscount.hasDiscount && (
                        <span className="text-xs font-bold text-slate-500 line-through">
                          {formatPrice(BASE_BADGE_PRICE)}
                        </span>
                      )}
                      <span className="font-black text-emerald-400 text-lg">
                        {formatPrice(effectiveBadgePrice)}
                      </span>
                      {badgeDiscount.hasDiscount && (
                        <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          {badgeDiscount.discountLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  {publishedPromo && (
                    <div className="text-[11px] text-emerald-300/90 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-xl flex items-center justify-between">
                      <span>Code promo actif : <strong className="font-mono text-emerald-200">{publishedPromo.code}</strong></span>
                      <span className="font-bold text-emerald-300">Remise déduite</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80">
                    <span className="text-slate-400">Votre Solde Dokya actuel :</span>
                    <span className={`font-black ${effectiveUserBalance >= effectiveBadgePrice ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {formatPrice(effectiveUserBalance)}
                    </span>
                  </div>
                </div>

                {badgeErrorMsg && (
                  <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-600/40 text-amber-200 text-xs space-y-2 animate-in fade-in">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{badgeErrorMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRechargeModalOpen(true)}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md hover:from-blue-500 hover:to-indigo-500 cursor-pointer active:scale-95"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Recharger mon Solde (+{formatPrice(Math.max(300, BADGE_PRICE - effectiveUserBalance))})</span>
                    </button>
                  </div>
                )}

                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Accès permanent à toutes les offres de vente</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Badge "Certifié ★" visible sur toutes vos fiches</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Retraits prioritaires Wave / Orange Money</span>
                  </li>
                </ul>

                {effectiveUserBalance < BADGE_PRICE ? (
                  <button
                    type="button"
                    onClick={() => setIsRechargeModalOpen(true)}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Solde insuffisant : Recharger (+{formatPrice(Math.max(300, BADGE_PRICE - effectiveUserBalance))})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePurchaseCertifiedBadge}
                    disabled={isPurchasingBadge}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isPurchasingBadge ? 'Débit du compte & Activation...' : `Activer mon Badge (-${formatPrice(BADGE_PRICE)} du solde)`}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsBadgeModalOpen(false);
                    setBadgeErrorMsg(null);
                  }}
                  className="w-full text-center text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MODE VIP (100% DES COMMISSIONS)                                     */}
      {/* ========================================================================= */}
      {isVipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/60 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                <Crown className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">Mode VIP Télévendeur</h3>
              <p className="text-xs text-slate-400">
                Conservez 100% de toutes vos commissions sans aucun prélèvement plateforme.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Abonnement mensuel :</span>
                <div className="flex items-center gap-2">
                  {vipDiscount.hasDiscount && (
                    <span className="text-xs font-bold text-slate-500 line-through">
                      {formatPrice(BASE_VIP_MONTHLY_PRICE)}
                    </span>
                  )}
                  <div className="text-xl font-black text-amber-400">
                    {formatPrice(effectiveVipPrice)} <span className="text-xs text-slate-400 font-normal">/ mois</span>
                  </div>
                  {vipDiscount.hasDiscount && (
                    <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      {vipDiscount.discountLabel}
                    </span>
                  )}
                </div>
              </div>
              {publishedPromo && (
                <div className="text-[11px] text-emerald-300/90 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-xl flex items-center justify-between">
                  <span>Code promo actif : <strong className="font-mono text-emerald-200">{publishedPromo.code}</strong></span>
                  <span className="font-bold text-emerald-300">Remise déduite</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80">
                <span className="text-slate-400">Votre Solde Dokya actuel :</span>
                <span className={`font-black ${effectiveUserBalance >= effectiveVipPrice ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {formatPrice(effectiveUserBalance)}
                </span>
              </div>
            </div>

            {vipErrorMsg && (
              <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-600/40 text-amber-200 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{vipErrorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRechargeModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md hover:from-blue-500 hover:to-indigo-500 cursor-pointer active:scale-95"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Recharger mon Solde (+{formatPrice(Math.max(300, VIP_MONTHLY_PRICE - effectiveUserBalance))})</span>
                </button>
              </div>
            )}

            {!isVipMode && effectiveUserBalance < VIP_MONTHLY_PRICE && VIP_MONTHLY_PRICE > 0 ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleToggleVipMode}
                  disabled={isActivatingVip}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4 text-slate-950" />
                  <span>{isActivatingVip ? 'Activation en cours...' : 'Activer le Mode VIP (100% Commissions)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRechargeModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs shadow-sm cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>Recharger mon solde (+{formatPrice(Math.max(300, VIP_MONTHLY_PRICE - effectiveUserBalance))})</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleToggleVipMode}
                disabled={isActivatingVip}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isActivatingVip ? 'Mise à jour...' : isVipMode ? 'Repasser en Mode Standard (80%)' : `Activer le Mode VIP ${VIP_MONTHLY_PRICE > 0 ? `(-${formatPrice(VIP_MONTHLY_PRICE)} du solde)` : '(Gratuit 100%)'}`}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsVipModalOpen(false);
                setVipErrorMsg(null);
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Annuler
            </button>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECHARGEMENT DU SOLDE WALLET (COMPTE TÉLÉVENDEUR)                    */}
      {/* ========================================================================= */}
      <RechargeWalletModal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
        userBalance={effectiveUserBalance}
        userId={currentUid}
        userEmail={profile.email || auth.currentUser?.email || undefined}
        userName={profile.displayName || profile.personalInfo?.firstName || undefined}
        onSuccess={(addedAmount) => {
          const newBal = effectiveUserBalance + addedAmount;
          const updated = { balance: newBal, walletBalance: newBal };
          if (onUpdateProfile) onUpdateProfile(updated);
          setIsRechargeModalOpen(false);
          setBadgeErrorMsg(null);
          setVipErrorMsg(null);
        }}
      />

    </div>
  );
};
