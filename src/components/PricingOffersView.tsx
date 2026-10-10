import React, { useState } from 'react';
import { 
  CreditCard, 
  Sparkles, 
  Crown, 
  Check, 
  Zap, 
  ShieldCheck, 
  FileText, 
  Mail, 
  Receipt, 
  BookOpen, 
  Package, 
  ArrowRight, 
  Wallet, 
  Clock, 
  Star,
  CheckCircle2,
  HelpCircle,
  Smartphone,
  ChevronDown,
  Tag,
  Gift,
  Trash2,
  Loader2,
  AlertCircle,
  Award
} from 'lucide-react';
import { CandidateProfile, isUserVipActive } from '../types';
import { usePricing } from '../contexts/PricingContext';
import { useLocale } from '../contexts/LocaleContext';

interface PricingOffersViewProps {
  userBalance: number;
  profile: CandidateProfile;
  onSelectService: (service: 'cv' | 'letter' | 'full_pack' | 'devis' | 'facture' | 'pack_business') => void;
  onSubscribePlan: (plan: 'weekly' | 'monthly' | 'semester' | 'annual', price: number, planName: string) => void;
  onOpenRecharge: () => void;
}

export const PricingOffersView: React.FC<PricingOffersViewProps> = ({
  userBalance,
  profile,
  onSelectService,
  onSubscribePlan,
  onOpenRecharge
}) => {
  const [selectedBillingTab, setSelectedBillingTab] = useState<'all' | 'single' | 'subscription'>('all');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Global Promo & Published Promo integration
  const { 
    pricing,
    publishedPromo,
    appliedGlobalPromo, 
    applyGlobalPromo, 
    clearGlobalPromo, 
    calculateDiscountedPrice,
    formatPrice
  } = usePricing();

  const { formatPrice: formatLocalePrice } = useLocale();

  const [promoInput, setPromoInput] = useState<string>('');
  const [isCheckingPromo, setIsCheckingPromo] = useState<boolean>(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const handleApplyPromoOnPage = async (codeToUse?: string) => {
    const code = (codeToUse || promoInput).trim().toUpperCase();
    if (!code) return;
    setIsCheckingPromo(true);
    setPromoError(null);
    try {
      const res = await applyGlobalPromo(code, 1000);
      if (!res.valid) {
        setPromoError(res.message || `Code "${code}" non valide.`);
      } else {
        setPromoInput('');
      }
    } catch (err: any) {
      setPromoError(err?.message || 'Erreur lors de la validation.');
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const isSubscriptionActive = isUserVipActive(profile?.subscription) || 
    profile?.subscriptionStatus === 'unlimited' ||
    (profile?.subscription?.status?.toUpperCase() === 'ACTIVE' && (
      !profile.subscription.expiresAt || new Date(profile.subscription.expiresAt).getTime() > Date.now()
    ));

  const singleProducts = [
    {
      id: 'cv' as const,
      title: 'CV ATS Professionnel',
      price: formatLocalePrice(1000),
      priceNum: 1000,
      badge: 'Indispensable',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      icon: FileText,
      iconColor: 'text-indigo-400',
      desc: 'Optimisé pour passer les filtres de recrutement ATS avec scoring de pertinence instantané supérieur à 98%.',
      features: [
        '50+ Modèles certifiés ATS internationaux',
        'Exportation PDF Haute Définition & Word (.docx)',
        'Score ATS en temps réel & conseils IA',
        'Sans filigrane & téléchargements illimités'
      ],
      cta: `Créer mon CV ATS (${formatLocalePrice(1000)})`,
      serviceKey: 'cv' as const
    },
    {
      id: 'letter' as const,
      title: 'Lettre de Motivation IA',
      price: formatLocalePrice(1000),
      priceNum: 1000,
      badge: 'Sur-mesure',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: Mail,
      iconColor: 'text-blue-400',
      desc: 'Rédigée intelligemment selon votre poste cible, l\'entreprise visée et votre ton préféré.',
      features: [
        '10+ Modèles graphiques assortis au CV',
        'Rédaction persuasive personnalisée par IA',
        'Exportation immédiate PDF & Word (.docx)',
        'Sans filigrane & modifications libres'
      ],
      cta: `Rédiger ma Lettre (${formatLocalePrice(1000)})`,
      serviceKey: 'letter' as const
    },
    {
      id: 'pack_duo' as const,
      title: 'Pack Duo Carrière',
      price: formatLocalePrice(1500),
      priceNum: 1500,
      badge: 'Économie 25%',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: Package,
      iconColor: 'text-amber-400',
      desc: 'La formule gagnante pour postuler : votre CV ATS complet + votre Lettre de motivation assortie.',
      features: [
        'CV ATS complet + Lettre de motivation assortie',
        'Export groupé en formats Word & PDF HD',
        'Zéro filigrane & ré-édition permanente',
        'Idéal pour toute candidature stratégique'
      ],
      cta: `Choisir le Pack Duo (${formatLocalePrice(1500)})`,
      serviceKey: 'full_pack' as const
    },
    {
      id: 'business_doc' as const,
      title: 'Facture & Devis OHADA',
      price: formatLocalePrice(1000),
      priceNum: 1000,
      badge: 'Entreprises & PME',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: FileText,
      iconColor: 'text-emerald-400',
      desc: 'Documents commerciaux et comptables stricts conformes aux exigences fiscales et légales.',
      features: [
        'Calculs automatiques TVA 18% & totaux TTC',
        'Mentions légales NINEA, RC & coordonnées',
        'Export PDF vectoriel & conversion devis en facture',
        'Sans filigrane avec signature & logo officiel'
      ],
      cta: `Créer Devis / Facture (${formatLocalePrice(1000)})`,
      serviceKey: 'facture' as const
    }
  ];

  const subscriptionPlans = [
    {
      id: 'free' as const,
      title: 'Formule Gratuite',
      duration: 'Gratuit pour toujours',
      price: formatLocalePrice(0),
      priceNum: 0,
      popular: false,
      badge: 'Découverte',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
      icon: Clock,
      features: [
        '1 CV ATS par mois avec FILIGRANE Dokya',
        '1 Lettre de motivation avec FILIGRANE Dokya',
        '1 Facture & 1 Devis par mois avec FILIGRANE Dokya',
        'Accès aux 50+ modèles et assistant IA de rédaction',
        'Aperçu interactif complet avant export'
      ],
      cta: `Formule Actuelle (${formatLocalePrice(0)})`
    },
    {
      id: 'monthly' as const,
      title: 'Abonnement Mensuel',
      duration: '30 Jours d\'accès illimité',
      price: formatLocalePrice(5000),
      priceNum: 5000,
      popular: true,
      badge: '🔥 Le Plus Populaire',
      badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black border-amber-400',
      icon: Crown,
      features: [
        'CV & Lettres ILLIMITÉS SANS FILIGRANE',
        'Boutique vendeur en ligne Dokya intégrée',
        'Factures & Devis OHADA en illimité',
        'Gestion de la Clientèle & Suivi des Stocks',
        'Exports Word (.docx) & PDF HD illimités',
        'Support prioritaire 7j/7 sur WhatsApp'
      ],
      cta: `S'abonner (${formatLocalePrice(5000)} / mois)`
    },
    {
      id: 'semester' as const,
      title: 'Abonnement 6 Mois',
      duration: `6 Mois d'accès illimité (~${formatLocalePrice(4166)}/mois)`,
      price: formatLocalePrice(25000),
      priceNum: 25000,
      popular: false,
      badge: '💎 Économisez 20%',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-black',
      icon: Star,
      features: [
        'Accès complet illimité pendant 6 mois complets',
        'CV, Lettres, Boutique, Factures & Devis illimités',
        'Gestion Clientèle & Gestion des Stocks complète',
        'Zéro filigrane sur l\'intégralité des exports',
        'Support prioritaire dédié sur WhatsApp'
      ],
      cta: `S'abonner (${formatLocalePrice(25000)} pour 6 mois)`
    },
    {
      id: 'annual' as const,
      title: 'Abonnement Annuel',
      duration: `365 Jours d'accès illimité (~${formatLocalePrice(3333)}/mois)`,
      price: formatLocalePrice(40000),
      priceNum: 40000,
      popular: false,
      badge: '👑 Économisez 40%',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-black',
      icon: Award,
      features: [
        'Accès VIP Illimité pendant 1 an complet (365 jours)',
        'Tout Dokya en illimité sans filigrane',
        'Boutique vendeur complète + Gestion de Stock & Clients',
        'Mises à jour & nouveaux modèles en avant-première',
        'Assistance VIP dédiée et relecture personnalisée'
      ],
      cta: `S'abonner (${formatLocalePrice(40000)} / an)`
    }
  ];

  const faqs = [
    {
      q: 'Comment fonctionne le paiement à l\'acte ?',
      a: 'Avec le paiement à l\'acte, vous ne payez que le document précis que vous créez (1.99 $ pour un CV ou une Lettre, 2.99 $ pour un Pack Duo). Vous bénéficiez d\'exports haute définition sans aucun filigrane. Aucun abonnement n\'est prélevé automatiquement.'
    },
    {
      q: 'Qu\'inclut la formule Gratuite (Free) ?',
      a: 'La formule Gratuite (0 $ / mois) vous permet de créer 1 CV, 1 Lettre de motivation, 1 Facture et 1 Devis par mois avec filigrane Dokya obligatoire sur les exports finaux. Pour supprimer le filigrane ou obtenir des exports illimités, vous pouvez passer à l\'achat à l\'acte (1.99 $) ou à un abonnement Premium.'
    },
    {
      q: 'Quels sont les moyens de paiement acceptés ?',
      a: 'Vous pouvez recharger votre solde Dokya en toute sécurité via Mobile Money Afrique (Wave, Orange Money, MTN, Moov, Free Money, Perfect Money) ou en Cryptomonnaies (USDT TRC20, USDT BEP20, USDC, Solana) gérées via Money Fusion. Tous les achats s\'effectuent directement depuis votre solde.'
    },
    {
      q: 'Puis-je modifier mes documents après achat ?',
      a: 'Oui ! Tous vos documents achetés ou générés sont sauvegardés dans votre espace sous « Mes Documents » et restent téléchargeables en PDF et Word (.docx) sans frais supplémentaires.'
    },
    {
      q: 'Les abonnements se renouvellent-ils automatiquement ?',
      a: 'Non, chez Dokya AI nous privilégions la transparence : aucun prélèvement surprise. Vous renouvelez votre abonnement manuellement quand vous le souhaitez en un clic.'
    }
  ];

  return (
    <div id="pricing-offers-view" className="space-y-8 animate-in fade-in max-w-6xl mx-auto pb-12">
      
      {/* 1. HERO HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 p-6 sm:p-10 shadow-2xl text-center space-y-4">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Grille Tarifaire Dokya AI • Transparence & Liberté</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          Choisissez la formule adaptée à <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-300 to-amber-300">vos objectifs</span>
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Paiement à l'acte sans engagement ou Pass VIP Illimité pour postuler en continu et facturer vos clients en toute sérénité.
        </p>

        {/* User Balance Strip */}
        <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
          <div className="bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-inner">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-300">Votre Solde Actuel :</span>
            <span className="text-sm font-black text-emerald-400">{formatLocalePrice(userBalance ?? 0)}</span>
          </div>

          <button
            type="button"
            onClick={onOpenRecharge}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Recharger mon solde</span>
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="pt-4 flex items-center justify-center">
          <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 flex gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => setSelectedBillingTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                selectedBillingTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Toutes les Offres
            </button>
            <button
              type="button"
              onClick={() => setSelectedBillingTab('single')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                selectedBillingTab === 'single'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Option A : À l'acte
            </button>
            <button
              type="button"
              onClick={() => setSelectedBillingTab('subscription')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                selectedBillingTab === 'subscription'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Option B : Pass VIP Illimité
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BANNIÈRE CODE PROMO ET RÉDUCTIONS IMMÉDIATES                              */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                <span>Code Promo & Réduction Immédiate</span>
                {appliedGlobalPromo && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                    {appliedGlobalPromo.discountLabel} ACTIF
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                {appliedGlobalPromo 
                  ? `La remise de ${appliedGlobalPromo.discountLabel} est automatiquement appliquée sur tous les tarifs ci-dessous.`
                  : "Entrez un code promo pour appliquer une réduction immédiate sur tous les abonnements et documents."}
              </p>
            </div>
          </div>

          {appliedGlobalPromo && (
            <button
              type="button"
              onClick={clearGlobalPromo}
              className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Retirer ({appliedGlobalPromo.code})</span>
            </button>
          )}
        </div>

        {!appliedGlobalPromo && (
          <div className="pt-1 space-y-2">
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyPromoOnPage();
                  }
                }}
                placeholder="Ex: PROMO50, DAKAR2026, VIP100..."
                className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-white placeholder-slate-500 text-xs px-3.5 py-2.5 rounded-xl uppercase font-mono tracking-wider transition-all"
              />
              <button
                type="button"
                onClick={() => handleApplyPromoOnPage()}
                disabled={isCheckingPromo || !promoInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer shrink-0"
              >
                {isCheckingPromo ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Appliquer</span>
              </button>
            </div>

            {/* Suggestions de codes promo */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="text-slate-400">Codes populaires :</span>
              {[
                { code: 'PROMO50', label: '🔥 -50%' },
                { code: 'DAKAR2026', label: '⚡ -30%' },
                { code: 'TERANGA20', label: '🌊 -20%' },
                { code: 'VIP100', label: '👑 -100%' }
              ].map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => handleApplyPromoOnPage(s.code)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="font-bold">{s.code}</span>
                  <span className="text-amber-400 font-sans">{s.label}</span>
                </button>
              ))}
            </div>

            {promoError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 animate-in fade-in">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{promoError}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* OPTION B: PASS ABONNEMENT (ACCÈS ILLIMITÉ)                                */}
      {/* ========================================================================= */}
      {(selectedBillingTab === 'all' || selectedBillingTab === 'subscription') && (
        <div className="space-y-6">
          {/* Active VIP Status notice */}
          {isSubscriptionActive && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-emerald-500/10 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 fill-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>👑 Vous êtes déjà membre Pass VIP Actif</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      Privilèges Illimités
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Tous vos téléchargements sont 100% gratuits. Vous n'avez pas besoin de souscrire un nouvel abonnement tant que le vôtre est valide.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">OPTION B : PASS ABONNEMENT (Accès Illimité)</h2>
                <p className="text-xs text-slate-400">Accédez à l'ensemble du catalogue et téléchargez en illimité sans payer par document.</p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Sans engagement • Sans reconduction automatique
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {subscriptionPlans.map((plan) => {
              const isFree = plan.priceNum === 0;
              const discount = !isFree ? calculateDiscountedPrice(plan.priceNum) : null;
              const hasDiscount = Boolean(discount?.hasDiscount);
              const displayPrice = isFree 
                ? formatLocalePrice(0) 
                : hasDiscount 
                  ? formatLocalePrice(discount?.finalPrice ?? plan.priceNum) 
                  : formatLocalePrice(plan.priceNum);

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xl ${
                    plan.popular
                      ? 'bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 border-2 border-amber-400 ring-4 ring-amber-500/20 transform md:-translate-y-2'
                      : plan.id === 'annual'
                        ? 'bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border-2 border-emerald-500/60'
                        : 'bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50'
                  }`}
                >
                  {/* Popular Ribbon */}
                  {plan.popular && (
                    <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                      <span className="px-3.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-md">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-2">
                      {!plan.popular && (
                        <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${plan.badgeColor}`}>
                          {plan.badge}
                        </span>
                      )}
                      {hasDiscount && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 ml-auto">
                          {discount?.discountLabel}
                        </span>
                      )}
                    </div>

                    <div className={plan.popular ? 'pt-2' : ''}>
                      <h3 className="text-lg font-black text-white">{plan.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{plan.duration}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tarif Forfaitaire</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        {hasDiscount && (
                          <span className="text-sm font-semibold text-slate-500 line-through">
                            {formatLocalePrice(plan.priceNum)}
                          </span>
                        )}
                        <span className={`text-2xl sm:text-3xl font-black ${hasDiscount ? 'text-emerald-400' : 'text-white'}`}>
                          {displayPrice}
                        </span>
                        {isFree && <span className="text-xs text-slate-400">/ mois</span>}
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-2.5 text-xs">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${plan.popular ? 'text-amber-400' : 'text-emerald-400'}`} />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() => {
                        if (isFree) return;
                        if (isSubscriptionActive) return;
                        const targetPrice = hasDiscount ? (discount?.finalPrice ?? plan.priceNum) : plan.priceNum;
                        onSubscribePlan(plan.id as any, targetPrice, plan.title);
                      }}
                      disabled={isSubscriptionActive && !isFree}
                      className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                        isFree
                          ? 'bg-slate-800 text-slate-300 border border-slate-700 cursor-default'
                          : isSubscriptionActive
                            ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-80'
                            : plan.popular
                              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-amber-500/20 cursor-pointer active:scale-95'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 cursor-pointer active:scale-95'
                      }`}
                    >
                      <span>
                        {isFree
                          ? `Formule Gratuite Active (${formatLocalePrice(0)})`
                          : isSubscriptionActive 
                            ? '👑 Pass VIP Déjà Actif' 
                            : `S'abonner (${displayPrice})`}
                      </span>
                      {!isSubscriptionActive && !isFree && <ArrowRight className="w-4 h-4 shrink-0" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OPTION A: PAIEMENT A L'ACTE (SANS ENGAGEMENT)                              */}
      {/* ========================================================================= */}
      {(selectedBillingTab === 'all' || selectedBillingTab === 'single') && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">OPTION A : PAIEMENT À L'ACTE (Sans Engagement)</h2>
                <p className="text-xs text-slate-400">Payez uniquement au moment du téléchargement de votre document finalisé.</p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              Format Word (.docx) & PDF Haute Définition
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {singleProducts.map((product) => {
              const IconComponent = product.icon;
              const discount = calculateDiscountedPrice(product.priceNum);
              const hasDiscount = Boolean(discount?.hasDiscount);
              const displayPrice = hasDiscount
                ? formatLocalePrice(discount.finalPrice)
                : product.price;

              return (
                <div
                  key={product.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 shadow-lg hover:-translate-y-1 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                        <IconComponent className={`w-5 h-5 ${product.iconColor}`} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasDiscount && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {discount?.discountLabel}
                          </span>
                        )}
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${product.badgeColor}`}>
                          {product.badge}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors">
                        {product.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {product.desc}
                      </p>
                    </div>

                    <div className="py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tarif Unitaire</p>
                      <div className="mt-0.5 flex items-baseline gap-2">
                        {hasDiscount && (
                          <span className="text-xs text-slate-500 line-through">
                            {formatLocalePrice(product.priceNum)}
                          </span>
                        )}
                        <span className={`text-lg font-black ${hasDiscount ? 'text-emerald-400' : 'text-white'}`}>
                          {displayPrice}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-1.5 text-[11px] text-slate-300">
                      {product.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={() => onSelectService(product.serviceKey)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 group-hover:bg-indigo-600 shadow-sm"
                    >
                      <span>
                        {hasDiscount 
                          ? `Choisir (${displayPrice})` 
                          : product.cta}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FAQ ACCORDION SECTION                                                     */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base sm:text-lg font-black text-white">Questions Fréquentes sur les Tarifs & Paiements</h3>
        </div>

        <div className="space-y-2 pt-2">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className="rounded-2xl bg-slate-900 border border-slate-800/80 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-white hover:text-indigo-300 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${activeFaq === idx ? 'rotate-180 text-indigo-400' : ''}`} />
              </button>
              {activeFaq === idx && (
                <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3 animate-in fade-in">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
