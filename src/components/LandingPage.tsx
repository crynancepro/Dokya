import React, { useState } from 'react';
import { 
  Sparkles, 
  Receipt, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  Crown, 
  LogIn, 
  ChevronRight, 
  Star, 
  Check, 
  Lock,
  LayoutDashboard,
  Globe,
  Briefcase,
  Building2,
  CreditCard,
  AlertCircle,
  Loader2,
  FileText,
  Boxes,
  Cpu,
  Download,
  Menu,
  X,
  Award,
  Coins
} from 'lucide-react';
import { DokyaLogo } from './DokyaLogo';
import { auth } from '../lib/firebase';
import { Landing3DCard } from './landing/Landing3DCard';
import { LandingHero3DShowcase } from './landing/LandingHero3DShowcase';
import { LandingCvCarousel } from './landing/LandingCvCarousel';
import { LandingInvoicesCarousel } from './landing/LandingInvoicesCarousel';
import { LandingPaymentMarquee } from './landing/LandingPaymentMarquee';
import { LandingSteps } from './landing/LandingSteps';
import { LandingAtsSimulator } from './landing/LandingAtsSimulator';
import { LandingComparison } from './landing/LandingComparison';
import { LandingTestimonials } from './landing/LandingTestimonials';
import { LandingFloatingCta } from './landing/LandingFloatingCta';
import { useLocale } from '../contexts/LocaleContext';
import { usePricing } from '../contexts/PricingContext';

interface LandingPageProps {
  onGoToAuth: (mode?: 'login' | 'signup') => void;
  onGoToDashboard: () => void;
  onSelectService: (service: 'cv' | 'letter' | 'devis' | 'facture') => void;
  onOpenTarifs: () => void;
  onOpenTemplates: (service?: string) => void;
}

// -------------------------------------------------------------
// PRICING OFFERS (GRILLE TARIFAIRE OFFICIELLE EN USD $)
// -------------------------------------------------------------
export interface PricingPlan {
  id: 'free' | 'single' | 'monthly' | 'semester' | 'annual';
  title: string;
  priceFormatted: string;
  amountUSD: number;
  periodLabel: string;
  subtitle: string;
  popular?: boolean;
  tag: string;
  features: string[];
  ctaLabel: string;
  colorScheme: 'slate' | 'indigo' | 'emerald' | 'amber';
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    title: 'Formule Gratuite',
    priceFormatted: '0 $',
    amountUSD: 0,
    periodLabel: '/ mois',
    subtitle: 'Idéal pour tester la plateforme Dokya sans engagement',
    tag: 'Découverte Gratuite',
    colorScheme: 'slate',
    features: [
      '1 CV ATS par mois avec filigrane Dokya obligatoire',
      '1 Lettre de motivation par mois avec filigrane Dokya',
      '1 Facture & 1 Devis par mois avec filigrane Dokya',
      'Accès aux 50+ modèles et assistant IA de rédaction',
      'Aperçu interactif et stockage de vos documents'
    ],
    ctaLabel: 'Commencer Gratuitement (0 $)'
  },
  {
    id: 'single',
    title: "Achat à l'Acte",
    priceFormatted: '1.99 $',
    amountUSD: 1.99,
    periodLabel: '/ document',
    subtitle: 'Paiement unique sans abonnement • 1.99 $ par CV et 1.99 $ par Lettre',
    tag: 'Paiement Unique',
    colorScheme: 'indigo',
    features: [
      '1.99 $ par CV ATS haute définition sans filigrane',
      '1.99 $ par Lettre de motivation ciblée sans filigrane',
      'Exports illimités en PDF vectoriel HD & Word (.docx)',
      'Score de conformité ATS supérieur à 98%',
      'Archivage sécurisé et ré-édition sans frais supplémentaires'
    ],
    ctaLabel: "Payer à l'acte (1.99 $)"
  },
  {
    id: 'monthly',
    title: 'Abonnement Mensuel',
    priceFormatted: '9.99 $',
    amountUSD: 9.99,
    periodLabel: '/ mois',
    subtitle: 'Accès complet illimité • Idéal pour booster votre carrière et vos ventes',
    popular: true,
    tag: '🔥 Le Plus Choisi',
    colorScheme: 'amber',
    features: [
      'CV & Lettres de motivation ILLIMITÉS SANS FILIGRANE',
      'Boutique vendeur Dokya Store intégrée en 1-clic',
      'Factures & Devis professionnels OHADA illimités',
      'Gestion complète de vos Clients & Suivi des Stocks',
      'Simulateur d\'entretien RH & Support prioritaire WhatsApp'
    ],
    ctaLabel: "S'abonner (9.99 $ / mois)"
  },
  {
    id: 'semester',
    title: 'Abonnement 6 Mois',
    priceFormatted: '47.95 $',
    amountUSD: 47.95,
    periodLabel: '/ 6 mois',
    subtitle: 'Soit ~7.99 $ / mois • Économisez 20% sur votre abonnement',
    tag: '💎 Forfait 6 Mois (-20%)',
    colorScheme: 'indigo',
    features: [
      'Accès complet illimité pendant 6 mois complets',
      'CV & Lettres illimités sans filigrane',
      'Boutique vendeur, Factures & Devis illimités',
      'Gestion Clientèle & Gestion des Stocks avancée',
      'Mises à jour prioritaires & support prioritaire'
    ],
    ctaLabel: 'Activer les 6 Mois (47.95 $)'
  },
  {
    id: 'annual',
    title: 'Abonnement Annuel',
    priceFormatted: '71.90 $',
    amountUSD: 71.90,
    periodLabel: '/ an',
    subtitle: 'Soit ~5.99 $ / mois • Économisez 40% sur toute l\'année',
    tag: '👑 Meilleure Offre (-40%)',
    colorScheme: 'emerald',
    features: [
      'Accès VIP Illimité pendant 1 an complet (365 jours)',
      'Tout Dokya en illimité : CV, Lettres, Factures, Devis',
      'Boutique vendeur complète + Gestion de Stock & Clients',
      'Relecture experte & support dédié 7j/7 sur WhatsApp',
      'Nouveaux modèles et fonctionnalités en avant-première'
    ],
    ctaLabel: 'Activer le Pass 1 An (71.90 $)'
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToAuth,
  onGoToDashboard,
  onSelectService,
  onOpenTarifs,
  onOpenTemplates,
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const currentUser = auth.currentUser;
  const { publishedPromo, calculateDiscountedPrice } = usePricing();

  const handlePlanClick = (_plan: PricingPlan) => {
    if (currentUser) {
      onGoToDashboard();
    } else {
      onGoToAuth('signup');
    }
  };

  const handleActionClick = (service?: 'cv' | 'letter' | 'devis' | 'facture') => {
    if (currentUser) {
      if (service) {
        onSelectService(service);
      } else {
        onGoToDashboard();
      }
    } else {
      onGoToAuth('signup');
    }
  };

  const faqs = [
    {
      q: "Comment fonctionne la double solution CV ATS & Factures OHADA sur Dokya ?",
      a: "Dokya regroupe sur une seule interface intelligente les deux outils documentaires indispensables : 1. Pour votre carrière, un générateur de CV certifiés ATS conformes aux exigences des recruteurs internationaux et locaux. 2. Pour votre activité, un module de facturation et devis strictement conforme au droit comptable OHADA (UEMOA/CEMAC) avec calculs automatisés et mentions légales obligatoires."
    },
    {
      q: "Pourquoi les CV Dokya garantissent-ils un score ATS supérieur à 98% ?",
      a: "Nos modèles utilisent une structure de balisage sémantique vectorielle sans tableaux imbriqués opaques ni éléments graphiques non parsables. Ils sont testés et validés auprès des principaux moteurs de filtrage (Workday, Taleo, Greenhouse, BambooHR) pour assurer une extraction exacte de vos compétences et expériences."
    },
    {
      q: "Comment s'effectue le paiement instantané via Money Fusion ?",
      a: "Le paiement est 100% automatisé et sans délai : dès que vous cliquez sur le bouton de paiement, vous êtes redirigé vers la passerelle sécurisée Money Fusion. Vous pouvez régler directement via Wave Sénégal, Orange Money, MTN Moov ou par QR Code Express. Dès validation, votre document ou abonnement est activé immédiatement sans envoi de capture d'écran."
    },
    {
      q: "Les factures et devis sont-ils conformes aux normes fiscales OHADA / UEMOA ?",
      a: "Oui, à 100%. Nos factures intègrent automatiquement le Numéro d'Identification Nationale des Entreprises et Associations (NINEA), le Registre de Commerce (RC), la TVA (18%), l'arrêté de la somme en toutes lettres ainsi que les coordonnées de règlement Mobile Money et bancaires."
    },
    {
      q: "Quelles sont les formules tarifaires proposées ?",
      a: "Dokya propose une formule Gratuite (0 $ / mois avec 1 CV, 1 lettre, 1 facture et 1 devis par mois avec filigrane Dokya), l'achat à l'acte à 1.99 $ par CV et 1.99 $ par lettre sans filigrane, et des abonnements Premium complets (Mensuel à 9.99 $, 6 Mois à 47.95 $ et Annuel à 71.90 $) donnant un accès illimité à tous les documents sans filigrane, à la boutique vendeur, à la facturation OHADA et à la gestion de stock et clients."
    },
    {
      q: "Puis-je exporter mes documents au format Word (.docx) et PDF ?",
      a: "Oui. Chaque document généré peut être téléchargé instantanément en PDF vectoriel A4 prêt pour l'impression ou l'envoi email, ainsi qu'au format Word (.docx) entièrement éditable sur Microsoft Word, Google Docs ou LibreOffice."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      
      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR                                                             */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          
          {/* Logo compact */}
          <DokyaLogo 
            size="sm"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />

          {/* Nav items compact & streamlined */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6 text-xs font-semibold text-slate-300">
            <a 
              href="#carrousels-section" 
              className="hover:text-cyan-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              Modèles 3D
            </a>
            <a 
              href="#simulateur-ats" 
              className="hover:text-indigo-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              Simulateur IA
            </a>
            <a 
              href="#tarifs" 
              className="hover:text-emerald-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              Tarifs
            </a>
            <a 
              href="#faq" 
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={onGoToDashboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer hover:scale-102 whitespace-nowrap"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-200" />
                <span>Mon Espace</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onGoToAuth('login')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Se connecter</span>
                </button>
                <button
                  type="button"
                  onClick={() => onGoToAuth('signup')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer hover:scale-102 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Créer un compte</span>
                </button>
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              aria-label="Ouvrir le menu de navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-rose-400" /> : <Menu className="w-5 h-5 text-indigo-400" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 px-5 py-4 space-y-3 animate-in slide-in-from-top-3 duration-200 shadow-2xl">
            <nav className="flex flex-col space-y-2 text-xs font-bold text-slate-300">
              <a
                href="#hero-section"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-900 hover:text-white transition-colors"
              >
                Accueil
              </a>
              <a
                href="#carrousels-section"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-900 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Modèles Réels 3D (CV &amp; Factures)</span>
              </a>
              <a
                href="#comment-ca-marche"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-900 hover:text-white transition-colors"
              >
                Comment ça marche (3 étapes)
              </a>
              <a
                href="#simulateur-ats"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-900 hover:text-indigo-400 transition-colors flex items-center gap-2"
              >
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>Simulateur ATS &amp; Reformulation IA</span>
              </a>
              <a
                href="#comparatif"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-900 hover:text-white transition-colors flex items-center gap-2"
              >
                <Award className="w-4 h-4 text-amber-400" />
                <span>Tableau Comparatif Dokya</span>
              </a>
              <a
                href="#tech-3d"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-900 hover:text-white transition-colors"
              >
                Piliers Technologiques
              </a>
              <a
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-900 hover:text-white transition-colors"
              >
                Double Solution (Carrière &amp; PME)
              </a>
              <a
                href="#tarifs"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-900 hover:text-emerald-400 transition-colors flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Tarifs &amp; Mobile Money (Dès 1 000 F)</span>
              </a>
              <a
                href="#avis"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-900 hover:text-amber-300 transition-colors"
              >
                Avis Clients &amp; Réussites
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-900 hover:text-white transition-colors"
              >
                FAQ
              </a>
            </nav>

            {!currentUser && (
              <div className="pt-2 border-t border-slate-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onGoToAuth('login');
                  }}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 text-center"
                >
                  Se connecter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onGoToAuth('signup');
                  }}
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold text-center shadow-lg shadow-indigo-600/30"
                >
                  Créer un compte
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION AVEC VITRINE 3D SPATIALE                                  */}
      {/* ========================================================================= */}
      <section id="hero-section" className="relative overflow-hidden pt-7 pb-12 sm:pt-10 sm:pb-16 border-b border-slate-800/70">
        
        {/* Glows d'ambiance volumétriques */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-indigo-600/20 via-cyan-600/15 to-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          
          {/* Badge International */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-bold text-slate-300 shadow-md">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-300">Portée Internationale &amp; Afrique UEMOA</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">Standard Mondial ATS &amp; OHADA</span>
          </div>

          {/* Headline Principal avec Double Proposition de Valeur */}
          <div className="space-y-4 max-w-5xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.16]">
              CV ATS Internationaux &amp; Factures Pro <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400">
                propulsés par l'Intelligence Artificielle
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
              Propulsez votre carrière à l’international et professionnalisez votre facturation d’entreprise. 
              Dokya combine la rédaction intelligente par l’IA, le respect strict des filtres ATS et la conformité légale OHADA.
            </p>
          </div>

          {/* DEUX BOUTONS D'ACTION DISTINCTS */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            
            {/* Bouton 1: Créer mon CV Pro */}
            <button
              type="button"
              onClick={() => handleActionClick('cv')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-sm sm:text-base shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 transition-all hover:scale-102 cursor-pointer active:scale-95 group"
            >
              <Briefcase className="w-5 h-5 text-amber-300" />
              <span>Créer mon CV Pro (ATS)</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            {/* Bouton 2: Créer une Facture */}
            <button
              type="button"
              onClick={() => handleActionClick('facture')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all hover:scale-102 cursor-pointer active:scale-95 group"
            >
              <Receipt className="w-5 h-5 text-emerald-200" />
              <span>Créer une Facture (OHADA)</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

          </div>

          {/* VITRINE 3D INTERACTIVE HERO (CV ATS & FACTURE EN RELIEF) */}
          <div className="pt-4">
            <LandingHero3DShowcase onSelectService={handleActionClick} />
          </div>

          {/* RUBAN DÉFILANT DES VRAIS LOGOS DE PAIEMENT (WAVE, OM, MTN, MOOV, VISA, MASTERCARD, APPLE PAY, STRIPE) */}
          <div className="pt-4 max-w-5xl mx-auto">
            <LandingPaymentMarquee />
          </div>

          {/* Social Proof & Indicateurs d'Excellence */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Score ATS Garanti 98%+</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Conforme Droit OHADA (UEMOA / CEMAC)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Exports PDF Haute Définition &amp; Word</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Tarifs dès 1 000 FCFA</span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SECTION CARROUSELS SANS ENCADREMENT (FULL-WIDTH SCROLL INFINI)         */}
      {/* ========================================================================= */}
      <section id="carrousels-section" className="py-16 sm:py-24 relative overflow-hidden space-y-12 border-b border-slate-800/70">
        
        {/* Glows d'ambiance volumétriques néon/violet/bleu */}
        <div className="absolute top-1/3 left-1/4 -translate-y-1/2 w-[520px] h-[520px] bg-indigo-600/15 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-2/3 right-1/4 -translate-y-1/2 w-[520px] h-[520px] bg-emerald-600/15 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-cyan-500/10 blur-[130px] pointer-events-none rounded-full" />

        {/* Header Global de la Galerie des Modèles */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 text-xs font-black uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Vrais Modèles Réels Dokya • Aperçus A4 Haute Définition &amp; Zoom Plein Écran</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Explorez les Vrais Modèles de Votre Compte Dokya
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl mx-auto">
            Défilement continu automatique des 50 vrais modèles de CV ATS et des 10 vrais modèles de factures et devis OHADA. Survolez pour figer le mouvement et explorer, zoomez en plein écran HD ou basculez en grille d'un simple clic.
          </p>
        </div>

        {/* LIGNE SUPÉRIEURE : LES 50 VRAIS MODÈLES DE CV ATS HAUTE DÉFINITION */}
        <div className="space-y-3 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-indigo-300">
              <Briefcase className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Ligne Supérieure • Les 50 Vrais Modèles de CV ATS Internationaux (Gabarits N°1 à N°50 • Score 98%+)</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400 inline-flex items-center gap-1.5 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 
              <span>30 Sans Photo (ATS Pur) + 20 Avec Photo • Filtres Workday &amp; Taleo</span>
            </span>
          </div>
          {/* Bande défilante continue avec les 50 vrais modèles de CV */}
          <LandingCvCarousel 
            onSelectCvTemplate={() => handleActionClick('cv')}
          />
        </div>

        {/* LIGNE INFÉRIEURE : LES 10 VRAIS MODÈLES DE FACTURES ET DEVIS COMMERCIAUX */}
        <div className="space-y-3 pt-6 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-emerald-300">
              <Receipt className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Ligne Inférieure • Les 10 Vrais Modèles de Factures &amp; Devis Conformes OHADA (Gabarits N°1 à N°10)</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400 inline-flex items-center gap-1.5 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 
              <span>SYSCOHADA &amp; Droit UEMOA • NINEA, RC &amp; TVA 18%</span>
            </span>
          </div>
          {/* Bande défilante continue avec les 10 vrais modèles de factures/devis */}
          <LandingInvoicesCarousel 
            onSelectBusinessDoc={(service) => handleActionClick(service)}
          />
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 3.1 COMMENT ÇA MARCHE EN 3 ÉTAPES (CARRIÈRE & ENTREPRISE)                 */}
      {/* ========================================================================= */}
      <LandingSteps onSelectService={handleActionClick} />

      {/* ========================================================================= */}
      {/* 3.2 SIMULATEUR INTERACTIF ATS & REFORMULATION IA AVANT / APRÈS            */}
      {/* ========================================================================= */}
      <LandingAtsSimulator onStartDoc={handleActionClick} />

      {/* ========================================================================= */}
      {/* 3.3 TABLEAU COMPARATIF : DOKYA VS WORD / EXCEL VS CANVA                  */}
      {/* ========================================================================= */}
      <LandingComparison onSelectService={handleActionClick} />

      {/* ========================================================================= */}
      {/* 4. BLOC TECHNIQUE & PERFORMANCE 3D : L'ARCHITETURE DOKYA                  */}
      {/* ========================================================================= */}
      <section id="tech-3d" className="py-16 sm:py-24 border-b border-slate-800/70 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-xs font-black uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Technologie &amp; Rigueur Documentaire</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Conçu pour Performer devant les Algorithmes et les Experts
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Découvrez les 4 piliers technologiques qui font la différence sur vos documents Dokya.
            </p>
          </div>

          {/* Grille 3D Tilt des 4 Piliers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Pilier 1 : Moteur ATS */}
            <Landing3DCard depth={14} className="h-full">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 transition-all h-full flex flex-col justify-between space-y-4 shadow-lg group">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Cpu className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors">
                    Moteur ATS Vectoriel
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Extraction garantie de chaque compétence sans blocage graphique. Conforme à Workday, Greenhouse et Taleo.
                  </p>
                </div>
                <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Score parsing 99%+
                </div>
              </div>
            </Landing3DCard>

            {/* Pilier 2 : Moteur OHADA */}
            <Landing3DCard depth={14} className="h-full">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition-all h-full flex flex-col justify-between space-y-4 shadow-lg group">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                    Conformité OHADA &amp; UEMOA
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Intégration automatique NINEA, RC, calculs TVA 18% et arrêté de la somme en toutes lettres.
                  </p>
                </div>
                <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 100% Légal &amp; Fiscal
                </div>
              </div>
            </Landing3DCard>

            {/* Pilier 3 : IA Gemini Multimodale */}
            <Landing3DCard depth={14} className="h-full">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 transition-all h-full flex flex-col justify-between space-y-4 shadow-lg group">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                    IA Gemini Rédactionnelle
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Reformulation percutante de vos expériences avec verbes d'action chiffrés et lettres de motivation ultra ciblées.
                  </p>
                </div>
                <div className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> IA de Dernière Génération
                </div>
              </div>
            </Landing3DCard>

            {/* Pilier 4 : Double Export Pro */}
            <Landing3DCard depth={14} className="h-full">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 transition-all h-full flex flex-col justify-between space-y-4 shadow-lg group">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Download className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                    Double Export PDF &amp; Word
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Téléchargez vos documents en PDF A4 vectoriel haute fidélité pour impression et en fichier Word (.docx) 100% éditable.
                  </p>
                </div>
                <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Téléchargement Illimité
                </div>
              </div>
            </Landing3DCard>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. PRÉSENTATION DÉTAILLÉE DE LA DOUBLE SOLUTION                           */}
      {/* ========================================================================= */}
      <section id="services" className="py-16 sm:py-24 border-b border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Deux Pôles d'Excellence Réunis dans une Seule Plateforme
            </h2>
            <p className="text-sm text-slate-400">
              Des technologies conçues pour éliminer les blocages d'embauche et sécuriser vos relations commerciales.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Pôle 1 : CV ATS & Carrière */}
            <Landing3DCard depth={10} className="h-full">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-900 border border-indigo-500/40 space-y-6 shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Standard International
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white">
                      CV ATS &amp; Candidatures d'Élite
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Passez les filtres des logiciels de recrutement automatisés sans être rejeté. 
                      Nos gabarits sont construits pour mettre en valeur vos compétences clés et votre parcours avec une clarté irréprochable.
                    </p>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>50+ Modèles certifiés compatibles avec les filtres ATS internationaux</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Rédaction et reformulation optimisée par l'IA Gemini</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Générateur de lettres de motivation ultra ciblées</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Simulateur d'entretien d'embauche avec questions de recruteurs réels</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleActionClick('cv')}
                  className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/25 mt-4"
                >
                  <span>Accéder au Générateur de CV ATS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </Landing3DCard>

            {/* Pôle 2 : Facturation & Devis OHADA */}
            <Landing3DCard depth={10} className="h-full">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-500/40 space-y-6 shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Conforme OHADA / UEMOA
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white">
                      Factures Pro &amp; Devis Commerciaux
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Émettez des documents comptables juridiquement irréprochables pour vos clients. 
                      Calcul automatique de la TVA (18%), arrêté de la somme en toutes lettres et conversion devis en facture en un clic.
                    </p>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Mentions obligatoires intégrées : NINEA, Registre de Commerce (RC), adresse fiscale</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Calcul automatique des totaux HT, TVA 18%, acomptes et Net à payer</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Conversion immédiate d'un devis accepté en facture d'acompte ou de solde</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Gestion du répertoire clients et suivi des règlements Mobile Money &amp; Virement</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleActionClick('facture')}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/25 mt-4"
                >
                  <span>Accéder au Module Facturation Pro</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </Landing3DCard>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5.1 AVIS CLIENTS CERTIFIÉS & STATS D'ADOPTION                             */}
      {/* ========================================================================= */}
      <LandingTestimonials />

      {/* ========================================================================= */}
      {/* 6. SECTION TARIFICATION CLAIRE EN USD (OFFRES SYNCHRONISÉES & CODES PROMO) */}
      {/* ========================================================================= */}
      <section id="tarifs" className="py-16 sm:py-24 bg-slate-900/30 border-b border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tarification Officielle Dokya (USD $)</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Des tarifs simples, transparents &amp; sans surprise
            </h2>
            <p className="text-sm text-slate-400">
              Formule gratuite avec filigrane, achat à l'acte direct ou abonnements illimités sans engagement.
            </p>
          </div>

          {/* BANDEAU CODE PROMO PUBLIÉ ACTIF (SYNCHRONISATION ADMIN AUTOMATIQUE) */}
          {publishedPromo && (
            <div className="max-w-4xl mx-auto p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border-2 border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-emerald-500/10 animate-in fade-in">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-inner">
                  <Sparkles className="w-6 h-6 text-emerald-300 fill-emerald-300 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                    <span className="text-xs sm:text-sm font-black text-white">
                      Code promo public actif : <span className="font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40 font-bold">{publishedPromo.code}</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 text-xs font-black shadow-xs">
                      {publishedPromo.discountType === 'percentage' ? `-${publishedPromo.discountValue}%` : `-${publishedPromo.discountValue}$`} de Réduction
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/90 mt-0.5">
                    {publishedPromo.description || `Cette remise exceptionnelle est automatiquement appliquée sur nos tarifs ci-dessous et au moment du paiement.`}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/25 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Réduction appliquée automatiquement</span>
                </span>
              </div>
            </div>
          )}

          {/* GRILLE DES OFFRES TARIFFAIRE */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            
            {PRICING_PLANS.map((plan) => {
              const isFree = plan.amountUSD === 0;
              const discount = !isFree ? calculateDiscountedPrice(plan.amountUSD) : null;
              const hasDiscount = Boolean(discount?.hasDiscount);
              const finalPriceDisplay = isFree 
                ? '0 $' 
                : hasDiscount 
                  ? `${discount?.finalPrice.toFixed(2)} $` 
                  : `${plan.amountUSD.toFixed(2)} $`;

              return (
                <Landing3DCard key={plan.id} depth={8} className="h-full">
                  <div 
                    className={`p-6 sm:p-7 rounded-3xl flex flex-col justify-between space-y-6 transition-all relative h-full ${
                      plan.popular
                        ? 'bg-gradient-to-b from-indigo-950/90 via-slate-900 to-slate-950 border-2 border-amber-400 ring-4 ring-amber-500/20 shadow-2xl shadow-amber-500/10 transform lg:-translate-y-2'
                        : plan.id === 'annual'
                          ? 'bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/60 shadow-xl'
                          : 'bg-slate-900/90 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Badge Populaire / En vedette */}
                    {plan.popular ? (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                        <Star className="w-3 h-3 fill-slate-950" />
                        <span>{plan.tag}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {plan.tag}
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {discount?.discountLabel}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-black text-white">
                          {plan.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 min-h-[32px]">
                          {plan.subtitle}
                        </p>

                        <div className="flex items-baseline gap-2 mt-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                          {hasDiscount && (
                            <span className="text-lg sm:text-xl font-bold text-slate-500 line-through">
                              {plan.amountUSD.toFixed(2)} $
                            </span>
                          )}
                          <span className={`text-3xl sm:text-4xl font-black font-mono ${hasDiscount ? 'text-emerald-400' : 'text-white'}`}>
                            {finalPriceDisplay}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {plan.periodLabel}
                          </span>
                        </div>
                      </div>

                      <ul className="space-y-2.5 text-xs text-slate-300 pt-3 border-t border-slate-800/80">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.popular ? 'text-amber-400' : 'text-emerald-400'}`} />
                            <span className="leading-tight">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Bouton de sélection et d'abonnement */}
                    <div className="space-y-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handlePlanClick(plan)}
                        className={`w-full py-3.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 ${
                          plan.popular
                            ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-amber-500/25'
                            : plan.id === 'annual'
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20'
                              : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>
                          {isFree
                            ? 'Commencer Gratuitement (0 $)'
                            : currentUser
                              ? `Souscrire (${finalPriceDisplay})`
                              : `Choisir cette offre (${finalPriceDisplay})`}
                        </span>
                      </button>

                      <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        <span>Paiement sécurisé • Sans engagement</span>
                      </p>
                    </div>

                  </div>
                </Landing3DCard>
              );
            })}

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FAQ SECTION                                                            */}
      {/* ========================================================================= */}
      <section id="faq" className="py-16 sm:py-20 border-b border-slate-800/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Questions Fréquemment Posées
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Toutes les réponses pour propulser votre carrière et votre facturation sur Dokya.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-white cursor-pointer hover:text-indigo-300 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-90 text-indigo-400' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3 animate-in fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. BANNIÈRE FINALE D'ACTION                                               */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-indigo-950/40 via-slate-950 to-slate-950 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-indigo-600 via-cyan-600 to-emerald-600 flex items-center justify-center mx-auto text-white shadow-xl shadow-indigo-600/30">
            <Sparkles className="w-7 h-7 text-amber-300" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Prêt à faire passer vos documents au standard international ?
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Rejoignez plus de 10 000 professionnels, cadres, freelances et PME qui font confiance à Dokya au Sénégal et dans le monde.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => handleActionClick('cv')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-600/40 inline-flex items-center justify-center gap-3 transition-all hover:scale-102 cursor-pointer"
            >
              <span>Créer mon CV ATS maintenant</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleActionClick('facture')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-600/40 inline-flex items-center justify-center gap-3 transition-all hover:scale-102 cursor-pointer"
            >
              <span>Créer ma Facture OHADA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-10 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <DokyaLogo size="xs" variant="compact" showBadge={false} />
            <span className="text-slate-600">•</span>
            <span>Suite Documentaire Internationale &amp; Recrutement IA</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Dakar, Sénégal (Zone UEMOA) &amp; International</span>
            <span>•</span>
            <span>Paiements Sécurisés Money Fusion (Wave, OM, QR Code)</span>
          </div>
        </div>
      </footer>

      {/* Barre d'action rapide flottante (CTA Bottom Sticky) */}
      <LandingFloatingCta onSelectService={handleActionClick} />

    </div>
  );
};
