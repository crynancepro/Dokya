import React, { useState } from 'react';
import { 
  Sparkles, 
  FileText, 
  Mail, 
  Receipt, 
  BookOpen, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  Crown, 
  Download, 
  User, 
  LogIn, 
  ChevronRight, 
  Layers, 
  Star, 
  HelpCircle, 
  Check, 
  FileCheck, 
  Wallet, 
  Lock,
  Phone,
  LayoutDashboard
} from 'lucide-react';
import { auth } from '../lib/firebase';

interface LandingPageProps {
  onGoToAuth: (mode?: 'login' | 'signup') => void;
  onGoToDashboard: () => void;
  onSelectService: (service: 'cv' | 'letter' | 'devis' | 'facture' | 'ebook') => void;
  onOpenTarifs: () => void;
  onOpenTemplates: (service?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToAuth,
  onGoToDashboard,
  onSelectService,
  onOpenTarifs,
  onOpenTemplates,
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const currentUser = auth.currentUser;

  const handleActionClick = (service?: 'cv' | 'letter' | 'devis' | 'facture' | 'ebook') => {
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
      q: "Comment fonctionne le tunnel de création sur Dokya AI ?",
      a: "Le processus est simple et guidé en 4 étapes : 1. Choisissez votre type de document depuis votre tableau de bord. 2. Sélectionnez votre modèle visuel parmi plus de 50 designs professionnels. 3. Remplissez le formulaire assisté par l'IA Gemini. 4. Téléchargez instantanément votre document en PDF haute définition et Word (.docx) prêt à l'emploi."
    },
    {
      q: "Les CV créés sont-ils compatibles avec les filtres ATS ?",
      a: "Oui, 100% de nos modèles de CV respectent les standards internationaux de parsing ATS (Applicant Tracking Systems) utilisés par les recruteurs au Sénégal, en Côte d'Ivoire et dans toute l'Afrique de l'Ouest. Votre profil est scanné sans perte d'information."
    },
    {
      q: "Quels sont les moyens de paiement acceptés ?",
      a: "Nous acceptons tous les paiements Mobile Money locaux instantanés : Wave Sénégal, Orange Money, Free Money, ainsi que les cartes bancaires via notre passerelle sécurisée. Les tarifs sont clairs : 1 000 FCFA à l'acte ou 4 900 FCFA/mois pour le Pass VIP Illimité."
    },
    {
      q: "Les factures et devis sont-ils conformes aux règles OHADA / UEMOA ?",
      a: "Absolument. Nos modèles intègrent toutes les mentions légales obligatoires au Sénégal et dans la zone UEMOA : NINEA, Registre de Commerce (RC), TVA (18%), calculs automatiques des montants HT/TTC et arrêté de la somme en toutes lettres."
    },
    {
      q: "Mes documents restent-ils accessibles après création ?",
      a: "Oui, tous vos documents générés sont automatiquement archivés dans votre espace client privé, dans la section 'Mes Documents'. Vous pouvez les consulter, les rééditer ou les retélécharger à tout moment."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      
      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR                                                             */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-500/20">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-white font-sans">
                  Dokya<span className="text-indigo-400">AI</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Pro
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Suite Bureautique & Recrutement IA</p>
            </div>
          </div>

          {/* Nav items (Section anchors) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-300">
            <a 
              href="#services" 
              className="hover:text-white transition-colors cursor-pointer"
            >
              Services (5)
            </a>
            <a 
              href="#fonctionnalites" 
              className="hover:text-white transition-colors cursor-pointer"
            >
              Fonctionnalités
            </a>
            <a 
              href="#modeles" 
              className="hover:text-white transition-colors cursor-pointer"
            >
              Modèles (50+)
            </a>
            <a 
              href="#tarifs" 
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Tarifs FCFA
            </a>
            <a 
              href="#faq" 
              className="hover:text-white transition-colors cursor-pointer"
            >
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <button
                type="button"
                onClick={onGoToDashboard}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all cursor-pointer hover:scale-102"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-200" />
                <span>Mon Espace Client</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onGoToAuth('login')}
                  className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 text-xs font-bold transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-indigo-400" />
                  <span>Se connecter</span>
                </button>
                <button
                  type="button"
                  onClick={() => onGoToAuth('signup')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all cursor-pointer hover:scale-102"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Créer un compte</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-24 border-b border-slate-800/70">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-bold text-slate-300 shadow-md">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400">N°1 au Sénégal & UEMOA</span>
            <span className="text-slate-600">•</span>
            <span>Générateur IA Certifié ATS & OHADA</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
              Créez des <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-300">CV ATS, Lettres & Factures</span> Professionnels en 2 Minutes
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
              La suite documentaire propulsée par l’Intelligence Artificielle. Choisissez un modèle visuel haute fidélité, laissez l’IA rédiger vos contenus et téléchargez vos fichiers en PDF & Word.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => handleActionClick('cv')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 transition-all hover:scale-102 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Créer mon CV ATS (50+ Modèles)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onOpenTemplates('cv')}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 border border-slate-700/80 font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:border-slate-600"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Explorer la Galerie Visuelle</span>
            </button>
          </div>

          {/* Social Proof & Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>100% Parsing ATS Garanti</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Paiement Wave & Orange Money</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Conforme Normes OHADA / UEMOA</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Téléchargement PDF + Word (.docx)</span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. STRICT 4-STEP CONVERSION TUNNEL INFOGRAPHIC                            */}
      {/* ========================================================================= */}
      <section id="fonctionnalites" className="py-16 sm:py-20 bg-slate-900/40 border-b border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
              <span>Tunnel de Conversion Simplifié</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Comment ça marche ?
            </h2>
            <p className="text-sm text-slate-400">
              Un parcours fluide, rigoureux et transparent pour obtenir des documents impeccables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 relative group hover:border-indigo-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-lg">
                1
              </div>
              <div>
                <h3 className="text-base font-black text-white group-hover:text-indigo-400 transition-colors">
                  Connexion & Service
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Connectez-vous à votre espace et sélectionnez l'outil souhaité (CV ATS, Lettre, Facture, Devis, Ebook).
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 relative group hover:border-indigo-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center font-black text-lg">
                2
              </div>
              <div>
                <h3 className="text-base font-black text-white group-hover:text-purple-400 transition-colors">
                  Galerie de Modèles
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Explorez le catalogue de designs professionnels style Canva et cliquez sur <strong>[ Utiliser ce modèle ]</strong>.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 relative group hover:border-indigo-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-lg">
                3
              </div>
              <div>
                <h3 className="text-base font-black text-white group-hover:text-amber-400 transition-colors">
                  Saisie & Optimisation IA
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Remplissez votre formulaire guidé pas-à-pas avec réécriture instantanée et prévisualisation directe en temps réel.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 relative group hover:border-indigo-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black text-lg">
                4
              </div>
              <div>
                <h3 className="text-base font-black text-white group-hover:text-emerald-400 transition-colors">
                  Paiement & Téléchargement
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Règlement sécurisé (Wave / OM / Solde) et téléchargement immédiat en PDF et Word avec archivage automatique.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. THE 5 OFFICIAL SERVICES CATALOG                                        */}
      {/* ========================================================================= */}
      <section id="services" className="py-16 sm:py-24 border-b border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              5 Outils IA d'Élite dans une Seule Plateforme
            </h2>
            <p className="text-sm text-slate-400">
              Des générateurs complets, sur-mesure et adaptés au contexte du travail en Afrique francophone.
            </p>
          </div>

          <div id="modeles" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Service 1: CV ATS */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/60 transition-all duration-300 flex flex-col justify-between space-y-6 group shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    1 000 FCFA
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors">
                    CV ATS Professionnel
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    50+ modèles certifiés optimisés pour passer les filtres de recrutement. Format avec ou sans photo, exports PDF et Word.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>50+ modèles stylisés</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Réécriture IA des expériences</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Score ATS en temps réel</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleActionClick('cv')}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <span>Créer mon CV ATS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Service 2: Lettre de Motivation */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/60 transition-all duration-300 flex flex-col justify-between space-y-6 group shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    1 000 FCFA
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">
                    Lettre de Motivation IA
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Rédaction persuasive en 4 paragraphes (VOUS/MOI/NOUS/CONCLUSION) occupant parfaitement la page A4 avec formules de politesse adaptées.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Architecture 300+ mots A4</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>6 styles de mise en page</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Conseils d'entretien inclus</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleActionClick('letter')}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/20"
              >
                <span>Rédiger ma Lettre IA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Service 3: Facture & Devis */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 transition-all duration-300 flex flex-col justify-between space-y-6 group shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    1 000 FCFA
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
                    Factures & Devis OHADA
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Documents commerciaux légaux avec NINEA, RC, TVA, arrêté en toutes lettres et conditions de règlement UEMOA.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mentions légales Sénégal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Arrêté en lettres automatique</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pack Business Duo à 1 499 F</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleActionClick('devis')}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <span>Créer Devis / Facture</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Service 4: Ebook & Rapports */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/60 transition-all duration-300 flex flex-col justify-between space-y-6 group shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    3 000 FCFA
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white group-hover:text-purple-400 transition-colors">
                    Ebooks & Rapports Amazon KDP
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Générez des ouvrages complets de 30 à 150 pages structurés en chapitres avec introduction, conclusion et 4e de couverture.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Recherche de niches rentables</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Rédaction chapitre par chapitre</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Prêt pour Amazon KDP</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleActionClick('ebook')}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-600/20"
              >
                <span>Générer un Ebook IA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. PRICING OFFERS SECTION                                                 */}
      {/* ========================================================================= */}
      <section id="tarifs" className="py-16 sm:py-24 bg-slate-900/30 border-b border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
              <span>Tarification Transparente</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Payez à l'acte ou profitez du Pass VIP Illimité
            </h2>
            <p className="text-sm text-slate-400">
              Aucun frais caché. Règlement simple par Wave, Orange Money ou Carte Bancaire.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            
            {/* Card 1: À l'acte */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                  À la carte
                </span>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">1 000</span>
                    <span className="text-xs font-bold text-slate-400">FCFA / doc</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Idéal pour un besoin ponctuel et immédiat.</p>
                </div>
                <ul className="space-y-3 text-xs text-slate-300 pt-3 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>1 CV ATS ou 1 Lettre ou 1 Facture</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Exports PDF Haute Définition + Word</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Archivage dans 'Mes Documents'</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => handleActionClick('cv')}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition-all cursor-pointer"
              >
                Choisir à l'acte
              </button>
            </div>

            {/* Card 2: Pass VIP (Featured) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-indigo-950/80 to-slate-900 border-2 border-indigo-500 flex flex-col justify-between space-y-6 shadow-2xl shadow-indigo-600/20 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                ⭐ Le Plus Populaire
              </div>
              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Pass VIP Illimité
                </span>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">4 900</span>
                    <span className="text-xs font-bold text-slate-400">FCFA / mois</span>
                  </div>
                  <p className="text-xs text-indigo-300/80 mt-1">Accès total à tous les générateurs sans limite.</p>
                </div>
                <ul className="space-y-3 text-xs text-slate-200 pt-3 border-t border-indigo-900/60">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>CV ATS illimités (50+ modèles)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Lettres de motivation IA illimitées</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Factures & Devis OHADA illimités</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Badge Candidat VIP & Support Prioritaire</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onOpenTarifs}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                Souscrire au Pass VIP
              </button>
            </div>

            {/* Card 3: Pack Business Duo */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                  Pack Business
                </span>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">1 499</span>
                    <span className="text-xs font-bold text-slate-400">FCFA</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Duo Devis + Facture synchronisés en 1 clic.</p>
                </div>
                <ul className="space-y-3 text-xs text-slate-300 pt-3 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>1 Devis Commercial + 1 Facture Client</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Charte graphique assortie</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Économie de 500 FCFA</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => handleActionClick('devis')}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition-all cursor-pointer"
              >
                Commander le Pack Duo
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FAQ SECTION                                                            */}
      {/* ========================================================================= */}
      <section id="faq" className="py-16 sm:py-20 border-b border-slate-800/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Questions Fréquemment Posées
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Tout ce que vous devez savoir pour démarrer sereinement sur Dokya AI.
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
      {/* 7. FINAL CTA BANNER                                                       */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-indigo-950/40 via-slate-950 to-slate-950 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto text-white shadow-xl shadow-indigo-600/30">
            <Sparkles className="w-7 h-7 text-amber-300" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Prêt à transformer votre carrière et vos documents professionnels ?
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Rejoignez plus de 10 000 candidats et professionnels qui font confiance à Dokya AI au Sénégal et en Afrique de l’Ouest.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleActionClick('cv')}
              className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-600/40 inline-flex items-center gap-3 transition-all hover:scale-102 cursor-pointer"
            >
              <span>Créer mon premier document maintenant</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-10 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-white">Dokya AI Pro</span>
            <span>•</span>
            <span>Suite Documentaire & Recrutement IA</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Dakar, Sénégal (Zone UEMOA)</span>
            <span>•</span>
            <span>Support Wave & Orange Money</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
