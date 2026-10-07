import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Sparkles, 
  ShieldCheck, 
  Crown, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  DollarSign, 
  Percent, 
  Globe, 
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
  ChevronRight, 
  X, 
  TrendingUp, 
  Zap,
  Tag,
  ArrowRight,
  Wallet,
  Lock,
  Unlock,
  Building2,
  CheckCheck
} from 'lucide-react';
import { ProductItem, StoreOrder, CandidateProfile, SellerReview } from '../types';
import { 
  fetchAllMarketplaceOffers, 
  createTelemarketerOrder, 
  fetchTelemarketerOrders, 
  saveSellerReview, 
  fetchSellerReviews,
  purgeLocalMockProducts
} from '../lib/storeService';
import { useLocale, SupportedCurrency } from '../contexts/LocaleContext';
import { usePricing } from '../contexts/PricingContext';
import { auth, setDoc, updateDoc, doc, db } from '../lib/firebase';

interface DokyaTelemarketerMarketplaceViewProps {
  profile: CandidateProfile;
  onUpdateProfile?: (updated: Partial<CandidateProfile>) => void;
  onOpenRecharge?: () => void;
  userBalance?: number;
}

export const DokyaTelemarketerMarketplaceView: React.FC<DokyaTelemarketerMarketplaceViewProps> = ({
  profile,
  onUpdateProfile,
  onOpenRecharge,
  userBalance = 0
}) => {
  const currentUid = auth.currentUser?.uid || profile.uid || 'guest';
  const { formatPrice, userCurrency, setUserCurrency } = useLocale();
  const { publishedPromo, calculateDiscountedPrice } = usePricing();

  // Navigation tab inside Telemarketer space
  const [activeTab, setActiveTab] = useState<'catalog' | 'my_orders' | 'reviews'>('catalog');

  // Tarifs dynamiques synchronisés avec code promo admin
  const BASE_BADGE_PRICE = 5000;
  const BASE_VIP_PRICE = 4990;

  const badgeDiscount = useMemo(() => {
    return calculateDiscountedPrice(BASE_BADGE_PRICE);
  }, [calculateDiscountedPrice]);
  const effectiveBadgePrice = badgeDiscount.hasDiscount ? badgeDiscount.finalPrice : BASE_BADGE_PRICE;

  const vipDiscount = useMemo(() => {
    return calculateDiscountedPrice(BASE_VIP_PRICE);
  }, [calculateDiscountedPrice]);
  const effectiveVipPrice = vipDiscount.hasDiscount ? vipDiscount.finalPrice : BASE_VIP_PRICE;

  // Badge Status & Monetization Mode
  const [hasBadge, setHasBadge] = useState<boolean>(() => {
    return Boolean(profile.telemarketerBadge || localStorage.getItem(`dokya_badge_${currentUid}`) === 'true');
  });
  const [gainMode, setGainMode] = useState<'standard' | 'vip'>(() => {
    return (profile.telemarketerMode as 'standard' | 'vip') || 
      (localStorage.getItem(`dokya_tel_mode_${currentUid}`) as 'standard' | 'vip') || 
      'standard';
  });

  // Badge Purchase Modal
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isActivatingBadge, setIsActivatingBadge] = useState(false);

  // VIP Upgrade Modal
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [isUpgradingVip, setIsUpgradingVip] = useState(false);

  // Offers Data & Filters
  const [offers, setOffers] = useState<ProductItem[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [minCommission, setMinCommission] = useState<number>(0);

  // Order Recording Modal (Off-Site Flow & Anti-Fraud)
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<ProductItem | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerNotes, setBuyerNotes] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [proofUrl, setProofUrl] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // My Telemarketer Orders
  const [telemarketerOrders, setTelemarketerOrders] = useState<StoreOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Reviews Modal
  const [selectedSellerForReviews, setSelectedSellerForReviews] = useState<{ id: string; name: string } | null>(null);
  const [sellerReviews, setSellerReviews] = useState<SellerReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewTag, setNewReviewTag] = useState<string>('Paiement rapide');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load offers
  const loadOffers = async () => {
    setIsLoadingOffers(true);
    try {
      // Purge proactive des caches de fausses offres
      purgeLocalMockProducts();

      const items = await fetchAllMarketplaceOffers({
        country: selectedCountry,
        category: selectedCategory,
        minCommission,
        searchQuery
      });
      setOffers(items);
    } catch (err) {
      console.warn('Erreur chargement catalogue offres:', err);
    } finally {
      setIsLoadingOffers(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, [selectedCountry, selectedCategory, minCommission]);

  // Load telemarketer orders when tab is opened
  useEffect(() => {
    if (activeTab === 'my_orders') {
      setIsLoadingOrders(true);
      fetchTelemarketerOrders(currentUid).then(res => {
        setTelemarketerOrders(res);
        setIsLoadingOrders(false);
      });
    }
  }, [activeTab, currentUid]);

  // Filter offers locally for instant search
  const filteredOffers = useMemo(() => {
    if (!searchQuery.trim()) return offers;
    const q = searchQuery.toLowerCase().trim();
    return offers.filter(o => 
      o.title.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      o.sellerName.toLowerCase().includes(q) ||
      (o.category && o.category.toLowerCase().includes(q))
    );
  }, [offers, searchQuery]);

  // Handle Badge Purchase
  const handlePurchaseBadge = async () => {
    setIsActivatingBadge(true);
    try {
      // Met à jour Firestore et le profil local
      if (currentUid && currentUid !== 'guest') {
        try {
          const userRef = doc(db, 'users', currentUid);
          await setDoc(userRef, {
            telemarketerBadge: true,
            isTelemarketerCertified: true,
            certifiedBadgePurchased: true,
            telemarketerBadgeDate: new Date().toISOString(),
            telemarketerMode: gainMode,
            telemarketerPlan: gainMode,
            userRole: 'telemarketer',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (_e) {}
        try {
          await setDoc(doc(db, 'candidates', currentUid), {
            telemarketerBadge: true,
            isTelemarketerCertified: true,
            certifiedBadgePurchased: true,
            telemarketerBadgeDate: new Date().toISOString(),
            telemarketerMode: gainMode,
            telemarketerPlan: gainMode,
            userRole: 'telemarketer',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (_e) {}
      }

      setHasBadge(true);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`dokya_badge_${currentUid}`, 'true');
          localStorage.setItem(`dokya_tel_badge_${currentUid}`, 'true');
        } catch (_e) {}
      }

      if (onUpdateProfile) {
        onUpdateProfile({
          telemarketerBadge: true,
          isTelemarketerCertified: true,
          certifiedBadgePurchased: true,
          telemarketerBadgeDate: new Date().toISOString(),
          telemarketerMode: gainMode,
          telemarketerPlan: gainMode,
          userRole: 'telemarketer'
        });
      }

      setIsBadgeModalOpen(false);
      showToast("🎉 Félicitations ! Votre Badge Télévendeur Certifié Dokya est activé.");
      loadOffers();
    } catch (err) {
      showToast("Erreur lors de l'activation du badge.");
    } finally {
      setIsActivatingBadge(false);
    }
  };

  // Handle Switch Gain Mode (Standard 20% Dokya vs VIP 100% conservé)
  const handleToggleVipMode = async () => {
    setIsUpgradingVip(true);
    try {
      const newMode = gainMode === 'vip' ? 'standard' : 'vip';
      setGainMode(newMode);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`dokya_tel_mode_${currentUid}`, newMode);
          localStorage.setItem(`dokya_tel_plan_${currentUid}`, newMode);
        } catch (_e) {}
      }

      if (currentUid && currentUid !== 'guest') {
        try {
          const userRef = doc(db, 'users', currentUid);
          await setDoc(userRef, {
            telemarketerMode: newMode,
            telemarketerPlan: newMode,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (_e) {}
        try {
          await setDoc(doc(db, 'candidates', currentUid), {
            telemarketerMode: newMode,
            telemarketerPlan: newMode,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (_e) {}
      }

      if (onUpdateProfile) {
        onUpdateProfile({ telemarketerMode: newMode, telemarketerPlan: newMode });
      }

      setIsVipModalOpen(false);
      showToast(newMode === 'vip' 
        ? "⭐ Mode Télévendeur VIP Activé ! Vous conservez désormais 100% de vos commissions !" 
        : "Mode Standard Réactivé (Prélèvement Dokya 20%)."
      );
    } catch (err) {
      showToast("Erreur lors de la mise à jour du mode.");
    } finally {
      setIsUpgradingVip(false);
    }
  };

  // Open Order Recording Modal
  const handleOpenOrderModal = (product: ProductItem) => {
    setSelectedProductForOrder(product);
    setBuyerName('');
    setBuyerPhone('');
    setBuyerAddress('');
    setBuyerNotes('');
    setOrderQuantity(1);
    setProofUrl('');
    setProofNote('');
    setIsOrderModalOpen(true);
  };

  // Submit Order Form (Off-site flow)
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForOrder) return;
    if (!buyerName.trim() || !buyerPhone.trim() || !buyerAddress.trim()) {
      showToast("Veuillez renseigner le nom, téléphone et adresse du client.");
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const telemarketerName = [profile.personalInfo?.firstName, profile.personalInfo?.lastName]
        .filter(Boolean)
        .join(' ') || profile.displayName || profile.email?.split('@')[0] || 'Télévendeur Dokya';

      const order = await createTelemarketerOrder({
        product: selectedProductForOrder,
        telemarketerId: currentUid,
        telemarketerName,
        telemarketerPhone: profile.personalInfo?.phone || '',
        telemarketerEmail: profile.email || '',
        telemarketerMode: gainMode,
        buyerName,
        buyerPhone,
        buyerAddress,
        buyerNotes,
        quantity: orderQuantity,
        proofUrl,
        proofNote
      });

      setIsOrderModalOpen(false);
      showToast(`✅ Commande ${order.id} enregistrée ! Notification transmise au vendeur ${selectedProductForOrder.sellerName}.`);
      
      // Recharger commandes
      fetchTelemarketerOrders(currentUid).then(setTelemarketerOrders);
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement de la commande.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Copy Affiliate Link
  const handleCopyAffiliateLink = (prod: ProductItem) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dokya.site';
    const link = `${origin}/p/${prod.slug}?ref=${currentUid}&tel=${currentUid}`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(prod.slug);
    showToast("Lien affilié personnalisé copié dans le presse-papier !");
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  // Open Reviews Modal for a Seller
  const handleOpenSellerReviews = async (sellerId: string, sellerName: string) => {
    setSelectedSellerForReviews({ id: sellerId, name: sellerName });
    setIsLoadingReviews(true);
    try {
      const revs = await fetchSellerReviews(sellerId);
      setSellerReviews(revs);
    } catch (err) {
      console.warn(err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSellerForReviews || !newReviewComment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const reviewerName = [profile.personalInfo?.firstName, profile.personalInfo?.lastName]
        .filter(Boolean)
        .join(' ') || profile.displayName || 'Télévendeur Dokya';

      await saveSellerReview({
        sellerId: selectedSellerForReviews.id,
        sellerName: selectedSellerForReviews.name,
        sellerUsername: selectedSellerForReviews.name,
        telemarketerId: currentUid,
        telemarketerName: reviewerName,
        rating: newReviewRating,
        comment: newReviewComment.trim(),
        tags: [newReviewTag]
      });

      const updated = await fetchSellerReviews(selectedSellerForReviews.id);
      setSellerReviews(updated);
      setNewReviewComment('');
      showToast("Votre avis public sur le vendeur a été publié avec succès !");
    } catch (err) {
      showToast("Erreur lors de la publication de l'avis.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Compute Total Telemarketer Commissions Stats
  const stats = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    let validatedCount = 0;
    let pendingCount = 0;

    telemarketerOrders.forEach(o => {
      const g = o.commissionGross || 0;
      const n = o.commissionNet || 0;
      totalGross += g;
      totalNet += n;
      if (o.status === 'validated' || o.status === 'delivered') validatedCount++;
      else if (o.status === 'pending') pendingCount++;
    });

    return { totalGross, totalNet, validatedCount, pendingCount, ordersCount: telemarketerOrders.length };
  }, [telemarketerOrders]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-indigo-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* BANDEAU PROMO PUBLIQUE ADMIN EN COURS */}
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
                Remise exceptionnelle appliquée sur le <strong>Badge Télévendeur Certifié</strong> ({formatPrice(effectiveBadgePrice)}) et le <strong>Mode VIP</strong> ({formatPrice(effectiveVipPrice)}/mois).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!hasBadge && (
              <button
                type="button"
                onClick={() => setIsBadgeModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Badge à {formatPrice(effectiveBadgePrice)}
              </button>
            )}
            {gainMode !== 'vip' && (
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
      {/* HEADER SECTION: TELEMARKETER STATUS & MONETIZATION MODE (RESPONSIVE)       */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 border border-slate-800 p-4 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5 relative z-10">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 sm:px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Espace Télévendeurs Dokya
              </span>

              {hasBadge ? (
                <span className="px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Badge Certifié ★
                </span>
              ) : (
                <span className="px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Badge Requis
                </span>
              )}

              {gainMode === 'vip' ? (
                <span className="px-2.5 sm:px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  Mode VIP (100%)
                </span>
              ) : (
                <span className="px-2.5 sm:px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px] sm:text-xs font-bold uppercase tracking-wider shrink-0">
                  Mode Standard (80%)
                </span>
              )}
            </div>

            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight break-words">
              Marketplace des Offres de Vente & Affiliation
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Vendez les produits vérifiés des commerçants et formateurs Dokya. Enregistrez directement vos commandes clients hors-site et touchez des commissions garanties.
            </p>
          </div>

          {/* Quick Actions (Badge & Gain Mode) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!hasBadge ? (
              <button
                type="button"
                onClick={() => setIsBadgeModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                <span>Débloquer mon Badge Certifié</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsVipModalOpen(true)}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                  gainMode === 'vip'
                    ? 'bg-purple-900/60 border border-purple-500/50 text-purple-200 hover:bg-purple-900'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
                }`}
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span>{gainMode === 'vip' ? 'Gérer Mode VIP (100%)' : 'Passer en Mode VIP (100%)'}</span>
              </button>
            )}

            {/* Currency switcher shortcut */}
            <div className="flex items-center gap-1 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
              <span className="text-slate-500 font-bold">Devise :</span>
              {(['XOF', 'USD', 'EUR'] as SupportedCurrency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setUserCurrency(c)}
                  className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    userCurrency === c 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Financial Overview Stats Cards */}
        {hasBadge && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-slate-800">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Commissions Nettes</p>
              <p className="text-sm sm:text-lg font-black text-emerald-400 mt-1 truncate">
                {formatPrice(stats.totalNet || 0)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                {gainMode === 'vip' ? '100% net (0% Dokya)' : '80% net (20% Dokya)'}
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Commandes</p>
              <p className="text-sm sm:text-lg font-black text-white mt-1 truncate">
                {stats.ordersCount}
              </p>
              <p className="text-[10px] text-emerald-400 mt-0.5 truncate">
                {stats.validatedCount} validée(s)
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">En Attente</p>
              <p className="text-sm sm:text-lg font-black text-amber-400 mt-1 truncate">
                {stats.pendingCount}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Vérification</p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Solde Dokya</p>
              <p className="text-sm sm:text-lg font-black text-indigo-400 mt-1 truncate">
                {formatPrice(userBalance || 0)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Wallet</p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ACCESS GATE: BLOCKED CATALOG IF NO CERTIFIED BADGE                          */}
      {/* ========================================================================= */}
      {!hasBadge && (
        <div className="rounded-3xl bg-slate-900 border-2 border-dashed border-amber-500/40 p-8 text-center space-y-5 max-w-3xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Catalogue d'Offres Réservé aux Télévendeurs Certifiés
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              Pour accéder aux offres exclusives à forte commission, aux coordonnées complètes des vendeurs et au module de commande directe, vous devez vous procurer votre <strong>Badge Télévendeur Certifié Dokya</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-xl mx-auto pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Check className="w-4 h-4" />
                <span>Accès Catalogue Illimité</span>
              </div>
              <p className="text-[11px] text-slate-400">Toutes les offres au Sénégal, Côte d'Ivoire, Cameroun, etc.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Check className="w-4 h-4" />
                <span>Enregistrement Hors-Site</span>
              </div>
              <p className="text-[11px] text-slate-400">Passez des commandes clients avec preuves anti-fraude.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Check className="w-4 h-4" />
                <span>Paiements Protégés</span>
              </div>
              <p className="text-[11px] text-slate-400">Versement de vos commissions directement sur Wave ou OM.</p>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="button"
              onClick={() => setIsBadgeModalOpen(true)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-sm shadow-xl shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 inline-flex items-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Acheter mon Badge Télévendeur Certifié — {formatPrice(5000)}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TABS NAVIGATION (CATALOGUE / MES COMMANDES TÉLÉVENDEUR / AVIS VENDEURS)     */}
      {/* ========================================================================= */}
      {hasBadge && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeTab === 'catalog'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>Catalogue des Offres ({offers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('my_orders')}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeTab === 'my_orders'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>Mes Ventes ({telemarketerOrders.length})</span>
              </button>
            </div>

            <div className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5 shrink-0">
              <span>Mode :</span>
              <strong className={gainMode === 'vip' ? 'text-purple-300' : 'text-slate-200'}>
                {gainMode === 'vip' ? 'VIP (100% net)' : 'Standard (80% net)'}
              </strong>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* TAB 1: CATALOGUE DES OFFRES DE VENTE                                  */}
          {/* ===================================================================== */}
          {activeTab === 'catalog' && (
            <div className="space-y-5">
              {/* FILTRES PAR PAYS, CATÉGORIE ET COMMISSION MINIMUM */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  
                  {/* Recherche textuelle */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher une offre, un vendeur..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Filtre par Pays */}
                  <div>
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="ALL">🌐 Tous les pays cibles</option>
                      <option value="SN">🇸🇳 Sénégal</option>
                      <option value="CI">🇨🇮 Côte d'Ivoire</option>
                      <option value="CM">🇨🇲 Cameroun</option>
                      <option value="CG">🇨🇬 Congo</option>
                      <option value="BF">🇧🇫 Burkina Faso</option>
                      <option value="ML">🇲🇱 Mali</option>
                      <option value="BJ">🇧🇯 Bénin</option>
                      <option value="TG">🇹🇬 Togo</option>
                      <option value="GA">🇬🇦 Gabon</option>
                      <option value="FR">🇫🇷 France</option>
                    </select>
                  </div>

                  {/* Filtre par Catégorie */}
                  <div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="all">📂 Toutes les catégories</option>
                      <option value="Formations & Coaching">Formations & Coaching</option>
                      <option value="Juridique & Entreprise">Juridique & Entreprise</option>
                      <option value="Santé & Beauté">Santé & Beauté</option>
                      <option value="High-Tech & Gadgets">High-Tech & Gadgets</option>
                      <option value="Services & Formations">Services & Formations</option>
                      <option value="Modèles & Templates">Modèles & Templates</option>
                    </select>
                  </div>

                  {/* Filtre par Montant minimum de commission */}
                  <div>
                    <select
                      value={minCommission}
                      onChange={(e) => setMinCommission(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value={0}>💰 Commission min : Toutes</option>
                      <option value={2000}>≥ {formatPrice(2000)} / vente</option>
                      <option value={4000}>≥ {formatPrice(4000)} / vente</option>
                      <option value={6000}>≥ {formatPrice(6000)} / vente</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* OFFERS CARDS GRID */}
              {isLoadingOffers ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-2" />
                  Chargement des offres certifiées...
                </div>
              ) : filteredOffers.length === 0 ? (
                <div className="p-10 text-center rounded-3xl bg-slate-900 border border-dashed border-slate-800 space-y-3">
                  <Package className="w-10 h-10 text-slate-500 mx-auto" />
                  <p className="text-sm font-bold text-white">
                    {offers.length === 0 ? "Le catalogue d'offres Marketplace est actuellement vierge" : "Aucune offre ne correspond à vos filtres"}
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    {offers.length === 0
                      ? "Le compte télévendeur est parfaitement vierge. Dès que des commerçants et formateurs certifiés publieront des produits réels d'affiliation sur Dokya, ils apparaîtront automatiquement ici avec vos commissions garanties."
                      : "Essayez d'élargir la sélection géographique ou de réinitialiser la recherche."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOffers.map((product) => {
                    const priceInFCFA = Number(product.price) || 0;
                    const commissionType = product.commissionType || 'percent';
                    const commissionValue = product.commissionValue || 20;

                    // Commission brute
                    const grossCommission = commissionType === 'percent'
                      ? (priceInFCFA * commissionValue) / 100
                      : commissionValue;

                    // Commission nette selon mode (VIP 100% vs Standard 80%)
                    const netCommission = gainMode === 'vip' 
                      ? grossCommission 
                      : Math.round(grossCommission * 0.8);

                    const targetCountries = product.targetCountries || ['ALL'];

                    return (
                      <div 
                        key={product.id}
                        className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all shadow-md group"
                      >
                        {/* Top: Image & Country Badges */}
                        <div>
                          <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                            {(() => {
                              const prodImg = (product.images && product.images.length > 0 && product.images[0]) || 
                                              product.imageUrl || 
                                              (product as any).image || 
                                              (product as any).productImage ||
                                              'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80';
                              return (
                                <img 
                                  src={prodImg} 
                                  alt={product.title}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80';
                                  }}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              );
                            })()}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 pointer-events-none" />

                            {/* Catégorie */}
                            <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-indigo-300 border border-indigo-500/20">
                              {product.category || 'Offre Dokya'}
                            </span>

                            {/* Pays cibles */}
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-slate-800 text-[10px] text-slate-300">
                              <Globe className="w-3 h-3 text-indigo-400" />
                              <span>{targetCountries.includes('ALL') ? 'Monde' : targetCountries.join(', ')}</span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-4 space-y-3">
                            <div className="space-y-1">
                              <h4 className="text-sm font-black text-white line-clamp-2 leading-snug">
                                {product.title}
                              </h4>
                              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                {product.description}
                              </p>
                            </div>

                            {/* Vendeur & Avis */}
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                              <div className="flex items-center gap-1.5 text-slate-300 font-semibold truncate">
                                <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate">{product.sellerName}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleOpenSellerReviews(product.sellerId || product.userId, product.sellerName)}
                                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold shrink-0 cursor-pointer transition-colors"
                                title="Noter ce vendeur ou consulter ses avis"
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>{product.sellerRating || 4.9}</span>
                                <span className="text-amber-400 underline ml-0.5 text-[10px]">Noter</span>
                              </button>
                            </div>

                            {/* Prix client & Commission Télévendeur */}
                            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">Prix public client :</span>
                                <span className="font-bold text-white">{formatPrice(priceInFCFA)}</span>
                              </div>

                              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span>Gain Net Télévendeur :</span>
                                </span>
                                <span className="font-black text-emerald-400 text-sm">
                                  +{formatPrice(netCommission)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span>Taux brut : {commissionType === 'percent' ? `${commissionValue}%` : formatPrice(commissionValue)}</span>
                                <span>{gainMode === 'vip' ? '0% prélevé (VIP 100%)' : '20% Dokya déduit'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyAffiliateLink(product)}
                            className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title="Copier mon lien affilié personnel"
                          >
                            {copiedSlug === product.slug ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copié !</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Partager Lien</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenOrderModal(product)}
                            className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>Commander</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 2: MES COMMANDES ENREGISTRÉES & PREUVES ANTI-FRAUDE              */}
          {/* ===================================================================== */}
          {activeTab === 'my_orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Historique de vos commandes apportées ({telemarketerOrders.length})</span>
                </h3>
              </div>

              {isLoadingOrders ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-2" />
                  Chargement de vos commandes...
                </div>
              ) : telemarketerOrders.length === 0 ? (
                <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                  <Package className="w-10 h-10 text-slate-500 mx-auto" />
                  <p className="text-sm font-bold text-white">Vous n'avez pas encore enregistré de commande client</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Consultez le catalogue, proposez les offres à vos prospects et enregistrez ici leurs coordonnées pour déclencher la livraison et vos commissions.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer shadow-md inline-flex items-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Voir le catalogue d'offres</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {telemarketerOrders.map((order) => {
                    const statusConfig = {
                      pending: { label: 'En attente validation vendeur', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                      validated: { label: 'Commande Validée', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
                      delivered: { label: 'Livrée & Commission Versée', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                      cancelled: { label: 'Annulée', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }
                    }[order.status] || { label: order.status, color: 'text-slate-400 bg-slate-800 border-slate-700' };

                    return (
                      <div 
                        key={order.id}
                        className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-md"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                              {order.id}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                        </div>

                        {/* Order Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <p className="text-[11px] text-slate-500 font-bold uppercase">Produit & Montant</p>
                            <p className="font-bold text-white mt-0.5">{order.productTitle}</p>
                            <p className="text-slate-400">
                              {order.quantity} x {formatPrice(order.productPrice)} = <strong className="text-white">{formatPrice(order.totalAmount)}</strong>
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] text-slate-500 font-bold uppercase">Client Acheteur</p>
                            <p className="font-bold text-white mt-0.5">{order.buyerName}</p>
                            <p className="text-slate-400">{order.buyerPhone}</p>
                            <p className="text-[11px] text-slate-500 truncate">{order.buyerAddress}</p>
                          </div>

                          <div className="sm:text-right">
                            <p className="text-[11px] text-slate-500 font-bold uppercase">Votre Commission Nette</p>
                            <p className="text-base font-black text-emerald-400 mt-0.5">
                              +{formatPrice(order.commissionNet || 0)}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Brut : {formatPrice(order.commissionGross || 0)} ({order.telemarketerMode === 'vip' ? 'VIP 100%' : 'Standard -20% Dokya'})
                            </p>
                          </div>
                        </div>

                        {/* Proof & Notes */}
                        {(order.proofUrl || order.proofNote) && (
                          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-slate-300 truncate">
                              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="truncate">Preuve anti-fraude fournie : {order.proofNote || 'Document / Capture enregistrée'}</span>
                            </div>
                            {order.proofUrl && (
                              <a 
                                href={order.proofUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 font-bold shrink-0 flex items-center gap-1"
                              >
                                <span>Voir preuve</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ACHAT BADGE TÉLÉVENDEUR CERTIFIÉ                                    */}
      {/* ========================================================================= */}
      {isBadgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-black text-white">Badge Télévendeur Certifié Dokya</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsBadgeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                Le Badge Certifié valide votre identité de télévendeur professionnel et vous accorde l'accès immédiat à l'ensemble du catalogue des commerçants partenaires.
              </p>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Tarif unique du Badge :</span>
                  <div className="flex items-center gap-2">
                    {badgeDiscount.hasDiscount && (
                      <span className="text-xs font-bold text-slate-500 line-through">
                        {formatPrice(BASE_BADGE_PRICE)}
                      </span>
                    )}
                    <span className="text-base font-black text-emerald-400">
                      {formatPrice(effectiveBadgePrice)}
                    </span>
                    {badgeDiscount.hasDiscount && (
                      <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        {badgeDiscount.discountLabel}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Votre solde portefeuille disponible :</span>
                  <span className="font-bold text-white">{formatPrice(userBalance || 0)}</span>
                </div>
              </div>

              <ul className="space-y-2 pt-1 text-slate-400">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Accès sans restriction au catalogue d'offres en Afrique et dans le monde</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Possibilité d'enregistrer des commandes clients hors-site</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Protection anti-fraude et priorité sur le paiement de commissions</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBadgeModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer text-center"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handlePurchaseBadge}
                disabled={isActivatingBadge}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isActivatingBadge ? (
                  <span>Activation en cours...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Confirmer et Activer ({formatPrice(effectiveBadgePrice)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MODE VIP (ABONNEMENT MENSUEL POUR CONSERVER 100% DES COMMISSIONS)   */}
      {/* ========================================================================= */}
      {isVipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 sm:w-6 h-5 sm:h-6 text-amber-400 shrink-0" />
                <h3 className="text-base sm:text-lg font-black text-white">Mode Télévendeur VIP (100% Gains)</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsVipModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                En mode Standard, Dokya prélève automatiquement 20% sur chaque commission générée pour financer la plateforme. 
                Avec le <strong>Mode VIP</strong>, vous conservez <strong>100% de vos commissions</strong> !
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                <div className={`p-3.5 sm:p-4 rounded-2xl border ${gainMode === 'standard' ? 'bg-slate-950 border-indigo-500' : 'bg-slate-950/60 border-slate-800'}`}>
                  <p className="font-bold text-white text-xs">Mode Standard</p>
                  <p className="text-sm font-black text-slate-300 mt-1">20% Dokya</p>
                  <p className="text-[11px] text-slate-400 mt-1">Vous touchez 80% net de chaque commission.</p>
                </div>

                <div className={`p-3.5 sm:p-4 rounded-2xl border ${gainMode === 'vip' ? 'bg-purple-950/50 border-purple-500' : 'bg-slate-950/60 border-slate-800'}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-purple-300 text-xs">Mode VIP</p>
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-sm font-black text-emerald-400 mt-1">0% Dokya</p>
                  <p className="text-[11px] text-slate-400 mt-1">Vous conservez 100% net de chaque commission.</p>
                </div>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>Abonnement Télévendeur VIP :</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {vipDiscount.hasDiscount && (
                    <span className="text-xs font-bold text-slate-500 line-through">
                      {formatPrice(BASE_VIP_PRICE)}
                    </span>
                  )}
                  <span className="font-black text-purple-300 text-sm">
                    {formatPrice(effectiveVipPrice)} / mois
                  </span>
                  {vipDiscount.hasDiscount && (
                    <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      {vipDiscount.discountLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsVipModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer text-center"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleToggleVipMode}
                disabled={isUpgradingVip}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isUpgradingVip ? (
                  <span>Mise à jour...</span>
                ) : (
                  <>
                    <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>{gainMode === 'vip' ? 'Repasser en Standard' : `Activer Mode VIP (${formatPrice(effectiveVipPrice)}/mois)`}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ENREGISTRER UNE COMMANDE CLIENT (FLUX HORS-SITE & ANTI-FRAUDE)       */}
      {/* ========================================================================= */}
      {isOrderModalOpen && selectedProductForOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-xl w-full shadow-2xl space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span>Enregistrer une Commande Client</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Produit : <strong className="text-white">{selectedProductForOrder.title}</strong> ({formatPrice(selectedProductForOrder.price)})
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsOrderModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              
              {/* Nom du Client */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nom et Prénom du client *
                </label>
                <input 
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Ex: Aminata Diallo"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Téléphone / WhatsApp & Quantité */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Téléphone / WhatsApp *
                  </label>
                  <input 
                    type="tel"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Quantité commandée
                  </label>
                  <input 
                    type="number"
                    min={1}
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Adresse complète */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Adresse complète de livraison / Ville *
                </label>
                <input 
                  type="text"
                  required
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder="Ex: Dakar, Mermoz près de la pharmacie..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Notes client */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Instructions de livraison / Notes
                </label>
                <textarea 
                  rows={2}
                  value={buyerNotes}
                  onChange={(e) => setBuyerNotes(e.target.value)}
                  placeholder="Ex: Livrer de préférence après 16h, appeler avant d'arriver..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* SÉCURITÉ ANTI-FRAUDE : PREUVE DE COMMANDE / LIVRAISON */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Sécurisation Anti-Fraude (Preuve)</span>
                </div>

                <p className="text-[11px] text-slate-400">
                  Fournissez une preuve de votre échange avec le client (lien capture WhatsApp, bon de livraison, vocal ou note explicative) pour garantir le déblocage prioritaire de votre commission.
                </p>

                <div className="space-y-2">
                  <input 
                    type="url"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="Lien de la capture d'écran / reçu (ex: imgur, drive, etc.)"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <input 
                    type="text"
                    value={proofNote}
                    onChange={(e) => setProofNote(e.target.value)}
                    placeholder="Note de validation (ex: Accord vocal obtenu par téléphone le 02/10)"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Récapitulatif Commission */}
              {(() => {
                const totalClient = selectedProductForOrder.price * orderQuantity;
                const unitComm = selectedProductForOrder.commissionType === 'percent'
                  ? (selectedProductForOrder.price * (selectedProductForOrder.commissionValue || 20)) / 100
                  : (selectedProductForOrder.commissionValue || 2000);
                const grossComm = Math.round(unitComm * orderQuantity);
                const netComm = gainMode === 'vip' ? grossComm : Math.round(grossComm * 0.8);

                return (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Total client à payer :</span>
                      <strong className="text-white ml-1.5">{formatPrice(totalClient)}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-bold">Votre gain net estimé :</span>
                      <strong className="text-emerald-400 text-sm ml-1.5">+{formatPrice(netComm)}</strong>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingOrder ? (
                    <span>Transmission au vendeur...</span>
                  ) : (
                    <>
                      <Package className="w-4 h-4 shrink-0" />
                      <span>Transmettre la commande au Vendeur</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SYSTÈME D'AVIS & NOTES PUBLICS SUR LES VENDEURS                     */}
      {/* ========================================================================= */}
      {selectedSellerForReviews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span>Avis Télévendeurs : {selectedSellerForReviews.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consultez la réputation du commerçant et laissez votre évaluation publique.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedSellerForReviews(null)}
                className="text-slate-400 hover:text-white p-1 rounded-xl"
              >
                ✕
              </button>
            </div>

            {/* Formulaire pour laisser un avis */}
            <form onSubmit={handleSubmitReview} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                Laisser un avis sur ce vendeur
              </p>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Note :</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReviewRating(star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star className={`w-5 h-5 ${star <= newReviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400">Badge de confiance :</span>
                {['Paiement rapide', 'Produit conforme', 'Support réactif', 'Excellente communication'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewReviewTag(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      newReviewTag === t 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <textarea 
                rows={2}
                required
                value={newReviewComment}
                onChange={(e) => setNewReviewComment(e.target.value)}
                placeholder="Partagez votre expérience : délais de livraison, respect des commissions, relation client..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReview ? 'Publication...' : 'Publier mon avis public'}
                </button>
              </div>
            </form>

            {/* Liste des avis existants */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Avis de la communauté des télévendeurs ({sellerReviews.length})
              </h4>

              {isLoadingReviews ? (
                <div className="py-6 text-center text-slate-400 text-xs">Chargement des avis...</div>
              ) : sellerReviews.length === 0 ? (
                <div className="p-4 text-center rounded-xl bg-slate-950 text-xs text-slate-500">
                  Aucun avis n'a encore été déposé pour ce vendeur. Soyez le premier !
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {sellerReviews.map((r) => (
                    <div key={r.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white">{r.telemarketerName}</span>
                          {r.tags?.[0] && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                              {r.tags[0]}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300">{r.comment}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedSellerForReviews(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
