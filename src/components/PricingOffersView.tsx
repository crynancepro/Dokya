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
  ChevronDown
} from 'lucide-react';
import { CandidateProfile } from '../types';

interface PricingOffersViewProps {
  userBalance: number;
  profile: CandidateProfile;
  onSelectService: (service: 'cv' | 'letter' | 'full_pack' | 'devis' | 'facture' | 'pack_business' | 'ebook') => void;
  onSubscribePlan: (plan: 'weekly' | 'monthly' | 'annual', price: number, planName: string) => void;
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

  const isSubscriptionActive = profile?.subscription?.status === 'active' && (
    !profile.subscription.expiresAt || new Date(profile.subscription.expiresAt).getTime() > Date.now()
  );

  const singleProducts = [
    {
      id: 'cv' as const,
      title: 'CV ATS Professionnel',
      price: '1 000 FCFA',
      priceNum: 1000,
      badge: 'Indispensable',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      icon: FileText,
      iconColor: 'text-indigo-400',
      desc: 'Optimisé pour passer les filtres de recrutement ATS avec scoring de pertinence instantané.',
      features: [
        '50+ Modèles certifiés (avec ou sans photo)',
        'Optimisation IA par secteur d\'activité',
        'Exportation PDF Haute Définition & Word (.docx)',
        'Conseils d\'entretien personnalisés'
      ],
      cta: 'Créer mon CV ATS (1 000 F)',
      serviceKey: 'cv' as const
    },
    {
      id: 'letter' as const,
      title: 'Lettre de Motivation IA',
      price: '1 000 FCFA',
      priceNum: 1000,
      badge: 'Sur-mesure',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: Mail,
      iconColor: 'text-blue-400',
      desc: 'Rédigée intelligemment selon votre poste cible, l\'entreprise visée et votre ton préféré.',
      features: [
        '10+ Modèles graphiques assortis au CV',
        'Rédaction persuasive (Stage, Emploi, Reconversion)',
        'Exportation immédiate PDF & Word (.docx)',
        'Modifications directes dans l\'éditeur'
      ],
      cta: 'Rédiger ma Lettre (1 000 F)',
      serviceKey: 'letter' as const
    },
    {
      id: 'pack_duo' as const,
      title: 'Pack Duo Emploi & Business',
      price: '1 500 FCFA',
      priceNum: 1500,
      badge: 'Économie 25%',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: Package,
      iconColor: 'text-amber-400',
      desc: 'La formule gagnante : CV + Lettre ou Pack Business Devis + Facture dans un même dossier.',
      features: [
        'CV ATS complet + Lettre de motivation assortie',
        'OU Pack Business Devis + Facture UEMOA',
        'Export groupé en formats Word & PDF',
        'Modifications illimitées dans la session'
      ],
      cta: 'Choisir le Pack Duo (1 500 F)',
      serviceKey: 'full_pack' as const
    },
    {
      id: 'ebook' as const,
      title: 'Ebook & Rapport Pro AI',
      price: '3 000 FCFA',
      priceNum: 3000,
      badge: 'IA Générative',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      icon: BookOpen,
      iconColor: 'text-purple-400',
      desc: 'Création complète de livres numériques, guides de formation et rapports d\'entreprise de 5 à 50+ pages.',
      features: [
        'Génération chapitres complets par IA',
        'Couvertures 3D & 4e de couverture personnalisées',
        'Export formats A4 / A5 / 6x9 (Amazon KDP ready)',
        'Exportation Word (.docx) & PDF imprimable'
      ],
      cta: 'Générer mon Ebook (3 000 F)',
      serviceKey: 'ebook' as const
    }
  ];

  const subscriptionPlans = [
    {
      id: 'weekly' as const,
      title: 'Pass VIP Hebdomadaire',
      duration: '7 Jours d\'accès illimité',
      price: '2 500 FCFA',
      priceNum: 2500,
      popular: false,
      badge: 'Idéal Postulation Express',
      badgeColor: 'bg-slate-700 text-slate-200 border-slate-600',
      icon: Clock,
      features: [
        'Téléchargements illimités PDF HD & Word',
        'Accès illimité aux 50+ modèles de CV ATS',
        'Générateur de Lettres de motivation illimité',
        'Générateur de Devis & Factures UEMOA',
        'Support standard WhatsApp'
      ],
      cta: 'Activer le Pass 7 Jours (2 500 F)'
    },
    {
      id: 'monthly' as const,
      title: 'Pass VIP Mensuel',
      duration: '30 Jours d\'accès illimité',
      price: '5 000 FCFA',
      priceNum: 5000,
      popular: true,
      badge: '🔥 Le Plus Populaire',
      badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black border-amber-400',
      icon: Crown,
      features: [
        'Tout le catalogue Dokya en accès TOTALEMENT ILLIMITÉ',
        'Générations IA illimitées (Gemini 2.5 Flash / 3.7)',
        'Générateur complet d\'Ebooks & Rapports d\'entreprise',
        'Exportations Word (.docx) & PDF HD illimitées',
        'Conformité OHADA / UEMOA sans restriction',
        'Suppression de tout filigrane',
        'Support VIP prioritaire 7j/7 sur WhatsApp'
      ],
      cta: 'Activer le Pass Mensuel (5 000 F)'
    },
    {
      id: 'annual' as const,
      title: 'Pass VIP Annuel',
      duration: '365 Jours d\'accès illimité',
      price: '35 000 FCFA',
      priceNum: 35000,
      popular: false,
      badge: '👑 Économisez plus de 40%',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-black',
      icon: Star,
      features: [
        'Accès VIP Illimité pendant 1 an complet',
        'Mises à jour prioritaires & nouveaux modèles en avant-première',
        'Création illimitée de CV, Lettres, Factures, Devis et Livres',
        'Assistance dédiée et relecture personnalisée par un expert',
        'Idéal pour consultants, indépendants, RH et demandeurs d\'emploi'
      ],
      cta: 'Activer le Pass Annuel (35 000 F)'
    }
  ];

  const faqs = [
    {
      q: 'Comment fonctionne le paiement à l\'acte ?',
      a: 'Avec le paiement à l\'acte, vous ne payez que le document précis que vous créez (1 000 FCFA pour un CV ou une Lettre, 1 500 FCFA pour un Pack Duo, 3 000 FCFA pour un Ebook). Aucun abonnement n\'est prélevé automatiquement.'
    },
    {
      q: 'Quels sont les moyens de paiement acceptés au Sénégal et dans la zone UEMOA ?',
      a: 'Vous pouvez payer directement avec votre solde Dokya Wallet, par Wave Direct (+221 78 961 90 88), Orange Money (#144# / Max It vers le +221 78 961 90 88), ou par Carte Bancaire (Visa / Mastercard) dans 12 pays d\'Afrique de l\'Ouest et la diaspora.'
    },
    {
      q: 'Puis-je modifier mes documents après achat ?',
      a: 'Oui ! Tous vos documents achetés ou générés sont sauvegardés dans votre espace sous « Mes Documents » et restent téléchargeables en PDF et Word (.docx) sans frais supplémentaires.'
    },
    {
      q: 'Le Pass VIP Illimité se renouvelle-t-il automatiquement ?',
      a: 'Non, chez Dokya AI nous privilégions la transparence : aucun prélèvement surprise. Vous renouvelez votre Pass manuellement quand vous le souhaitez en un clic.'
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
            <span className="text-sm font-black text-emerald-400">{(userBalance ?? 0).toLocaleString('fr-FR')} FCFA</span>
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
      {/* OPTION B: PASS ABONNEMENT (ACCÈS ILLIMITÉ)                                */}
      {/* ========================================================================= */}
      {(selectedBillingTab === 'all' || selectedBillingTab === 'subscription') && (
        <div className="space-y-6">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subscriptionPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xl ${
                  plan.popular
                    ? 'bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 border-2 border-amber-400 ring-4 ring-amber-500/20 transform md:-translate-y-2'
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
                  {!plan.popular && (
                    <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${plan.badgeColor}`}>
                      {plan.badge}
                    </span>
                  )}

                  <div className={plan.popular ? 'pt-2' : ''}>
                    <h3 className="text-lg font-black text-white">{plan.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{plan.duration}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tarif Forfaitaire</p>
                    <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                      {plan.price}
                    </p>
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
                    onClick={() => onSubscribePlan(plan.id, plan.priceNum, plan.title)}
                    className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-amber-500/20'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                    }`}
                  >
                    <span>{plan.cta}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            ))}
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
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${product.badgeColor}`}>
                        {product.badge}
                      </span>
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
                      <p className="text-lg font-black text-white mt-0.5">{product.price}</p>
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
                      <span>{product.cta}</span>
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
