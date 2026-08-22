'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Download, 
  CheckCircle2, 
  Loader2, 
  FileText, 
  AlertCircle, 
  Lock, 
  Smartphone, 
  Star, 
  ArrowRight, 
  Check, 
  TrendingUp, 
  Users, 
  Award, 
  Menu, 
  X,
  CreditCard,
  Briefcase,
  Layers,
  ChevronRight,
  User as UserIcon,
  LogOut,
  UserPlus,
  PartyPopper,
  HelpCircle,
  ChevronDown,
  Receipt,
  FileCheck,
  Building2,
  Clock,
  Send,
  Sliders,
  DollarSign
} from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { motion } from 'motion/react';
import { CVTemplate } from '../src/components/CVTemplate';
import { CVAutoScrollShowcase, CVShowcaseItem } from '../src/components/CVAutoScrollShowcase';
import { CVFormData, AIOptimizedData } from '../src/types';
import { saveOrderRecord, auth } from '../lib/firebase';
import { AuthModal } from '../src/components/AuthModal';
import { safeParseJsonResponse } from '../src/utils/apiHelpers';
import { isAdminEmail } from '../src/lib/adminAuth';

interface PageProps {
  onOpenEditor?: () => void;
  onOpenAdmin?: () => void;
}

export default function Page({ onOpenEditor, onOpenAdmin }: PageProps) {
  const [generationMode, setGenerationMode] = useState<'cv_only' | 'letter_only' | 'full_pack' | 'devis' | 'facture' | 'pack_business' | 'pass_illimite'>('full_pack');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Auth States
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setMessage("Vous êtes déconnecté.");
      setIsError(false);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };

  // Default sample data for live CV preview
  const [formData, setFormData] = useState<CVFormData>({
    personalInfo: {
      firstName: 'Mamadou',
      lastName: 'Ndiaye',
      email: 'm.ndiaye@example.sn',
      phone: '+221 77 123 45 67',
      address: 'Mermoz, Dakar',
      city: 'Dakar',
      targetJob: 'Ingénieur Logiciel Full-Stack & Fintech',
      linkedin: 'linkedin.com/in/m-ndiaye',
      portfolio: 'github.com/m-ndiaye'
    },
    experiences: [
      {
        id: '1',
        title: 'Développeur Full-Stack Senior',
        company: 'Fintech Sénégal Labs',
        location: 'Dakar',
        startDate: '2022',
        endDate: 'Présent',
        description: 'Intégration d\'APIs de paiement Mobile Money (Wave, Orange Money) et architecture d\'applications web résilientes.'
      },
      {
        id: '2',
        title: 'Développeur Frontend React / Next.js',
        company: 'Tech Hub West Africa',
        location: 'Dakar',
        startDate: '2020',
        endDate: '2022',
        description: 'Conception d\'interfaces utilisateur intuitives et sécurisées pour plateformes e-commerce et bancaires.'
      }
    ],
    education: [
      {
        id: 'e1',
        degree: 'Master en Génie Logiciel',
        institution: 'Université Cheikh Anta Diop (UCAD)',
        location: 'Dakar',
        startDate: '2018',
        endDate: '2020'
      }
    ],
    skills: [
      { category: 'Langages & Frameworks', skills: ['TypeScript', 'Next.js', 'React', 'Node.js', 'Express', 'Tailwind CSS'] },
      { category: 'Paiements & APIs', skills: ['Wave API', 'Orange Money Webhook', 'REST APIs', 'Cloud Firestore'] }
    ],
    languages: [
      { language: 'Français', level: 'Courant / Bilingue' },
      { language: 'Anglais', level: 'Professionnel' },
      { language: 'Wolof', level: 'Langue maternelle' }
    ],
    templateStyle: 'moderne',
    themeColor: '#4f46e5',
    generationMode: 'full_pack'
  });

  const [aiData] = useState<AIOptimizedData>({
    profileSummary: 'Ingénieur Logiciel expérimenté basé à Dakar, spécialisé dans la conception de plateformes web modernes et l\'intégration sécurisée de passerelles de paiement mobile (Wave, Orange Money) aux normes internationales.',
    experiences: [],
    suggestedKeywords: ['Next.js', 'Wave API', 'Fintech UEMOA', 'Optimisation ATS', 'Architecture Cloud'],
    coverLetter: {
      subject: 'Candidature au poste d\'Ingénieur Logiciel Full-Stack Senior',
      greeting: 'Chère équipe de recrutement,',
      opening: 'Je vous adresse avec enthousiasme ma candidature au poste d\'Ingénieur Logiciel Full-Stack Senior.',
      bodyParagraphs: [
        'Fort de plusieurs années d’expérience dans le développement d’applications web performantes, j’ai dirigé avec succès le déploiement de solutions fintech sécurisées à fort volume de transactions à Dakar.',
        'Ma maîtrise approfondie des technologies React, Node.js, des APIs REST et des intégrations de paiement mobile (Wave, Orange Money) me permet d’apporter une valeur ajoutée immédiate à vos projets stratégiques.'
      ],
      callToAction: 'Je serais ravi d’échanger avec vous lors d’un prochain entretien afin de vous détailler mon parcours et ma motivation.',
      closing: 'Veuillez agréer, Madame, Monsieur, l’expression de mes salutations distinguées.'
    }
  });

  // Calculate current price based on selected mode
  const getPrice = () => {
    switch (generationMode) {
      case 'cv_only':
      case 'letter_only':
      case 'devis':
      case 'facture':
        return 1000;
      case 'full_pack':
        return 1399;
      case 'pack_business':
        return 1499;
      case 'pass_illimite':
        return 3499;
      default:
        return 1000;
    }
  };

  const price = getPrice();

  // 1. Charge le script KKiaPay Widget (https://cdn.kkiapay.me/k.js)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const existingScript = document.getElementById('kkiapay-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'kkiapay-script';
      script.src = 'https://cdn.kkiapay.me/k.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // 2. Écouteurs d'événements KKiaPay (onSuccess / onFailed)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKkiapaySuccess = async (data: any) => {
      console.log("✅ KKiaPay Widget onSuccess:", data);
      const transactionId = data?.transactionId || data?.transaction_id || data?.reference;
      const refOrder = `ORD-${Date.now()}`;

      setIsRedirecting(true);
      setMessage("Vérification du paiement en cours...");
      setIsError(false);

      try {
        const response = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId,
            refCommand: refOrder,
            mode: generationMode,
            amount: price
          })
        });

        const result = await safeParseJsonResponse(response);

        if (result.success || result.paid) {
          setIsPaid(true);
          setIsDownloading(true);
          setMessage("🎉 Paiement validé avec succès ! Téléchargement de votre document...");
          setIsError(false);

          // Confetti celebration
          try {
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#4f46e5', '#059669', '#d97706', '#0284c7']
            });
          } catch (e) {}

          // Save in Firestore
          saveOrderRecord({
            id: refOrder,
            mode: generationMode,
            price,
            transactionId,
            createdAt: new Date().toISOString(),
            paymentStatus: 'success'
          });

          // Trigger automatic print/download
          setTimeout(() => {
            window.print();
            setIsDownloading(false);
          }, 1000);
        } else {
          throw new Error(result.error || "Échec de la validation du paiement.");
        }
      } catch (err: any) {
        console.error("Erreur vérification KKiaPay:", err);
        setMessage(err.message || "Impossible de valider la transaction auprès du serveur.");
        setIsError(true);
      } finally {
        setIsRedirecting(false);
      }
    };

    const handleKkiapayFailed = (err: any) => {
      console.warn("❌ KKiaPay Widget onFailed / Annulé:", err);
      setMessage("Le paiement a été annulé ou a échoué. Vous pouvez réessayer à tout moment.");
      setIsError(true);
      setIsRedirecting(false);
    };

    if ((window as any).addKkiapayListener) {
      (window as any).addKkiapayListener('success', handleKkiapaySuccess);
      (window as any).addKkiapayListener('failed', handleKkiapayFailed);
    }

    return () => {
      if ((window as any).removeKkiapayListener) {
        (window as any).removeKkiapayListener('success', handleKkiapaySuccess);
        (window as any).removeKkiapayListener('failed', handleKkiapayFailed);
      }
    };
  }, [generationMode, price]);

  // Handle KKiaPay payment trigger
  const handleKkiapayPayment = async () => {
    setIsRedirecting(true);
    setMessage(null);
    setIsError(false);

    try {
      const configRes = await fetch('/api/payment/config');
      const config = await safeParseJsonResponse(configRes);

      const publicKey = config.publicKey || '';
      const isSandbox = config.sandbox ?? false;

      if (typeof (window as any).openKkiapayWidget === 'function') {
        const clientName = `${formData.personalInfo.firstName} ${formData.personalInfo.lastName}`.trim();
        
        (window as any).openKkiapayWidget({
          amount: price,
          position: "center",
          callback: "",
          data: JSON.stringify({ mode: generationMode }),
          theme: "#4f46e5",
          key: publicKey,
          sandbox: isSandbox,
          phone: formData.personalInfo.phone || "",
          name: clientName || "Client Sénégal",
          email: formData.personalInfo.email || "client@example.com"
        });
        setIsRedirecting(false);
      } else {
        throw new Error("Le module de paiement sécurisé charge... Veuillez réessayer dans un instant.");
      }
    } catch (err: any) {
      console.error("Erreur lancement paiement:", err);
      setMessage(err.message || "Erreur lors de l'ouverture du module de paiement.");
      setIsError(true);
      setIsRedirecting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!isPaid) {
      handleKkiapayPayment();
      return;
    }
    setIsDownloading(true);
    window.print();
    setTimeout(() => setIsDownloading(false), 800);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const handleSelectCVShowcase = (item: CVShowcaseItem) => {
    const [firstName, ...lastNameParts] = item.name.split(' ');
    setFormData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        firstName: firstName || 'Mamadou',
        lastName: lastNameParts.join(' ') || 'Ndiaye',
        targetJob: item.title,
        city: item.location.split(',')[0] || 'Dakar'
      }
    }));
    scrollToSection('paywall');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white relative overflow-x-hidden">
      
      {/* Subtle Ambient Background Highlights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-tr from-indigo-100 via-sky-50 to-transparent blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-[700px] right-0 w-[500px] h-[500px] bg-emerald-50/80 blur-[140px] pointer-events-none rounded-full" />

      {/* 1. TOP HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-slate-200 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-100 text-white font-black">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tight text-slate-900 flex items-center gap-1.5">
                Portail Pro <span className="text-indigo-600 text-xs px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 font-bold">Sénégal</span>
              </span>
              <span className="text-[11px] text-slate-500 -mt-1 font-medium">CV, Lettres, Devis & Factures</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-600">
            <button type="button" onClick={() => scrollToSection('services-4')} className="hover:text-indigo-600 transition-colors cursor-pointer">
              Les 4 Services
            </button>
            <button type="button" onClick={() => scrollToSection('modeles')} className="hover:text-indigo-600 transition-colors cursor-pointer">
              Modèles CV & Exemples
            </button>
            <button type="button" onClick={() => scrollToSection('tarifs')} className="hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1.5">
              <span>Tarifs</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 font-extrabold">Dès 500 F</span>
            </button>
            <button type="button" onClick={() => scrollToSection('etapes')} className="hover:text-indigo-600 transition-colors cursor-pointer">
              Comment ça marche
            </button>
            <button type="button" onClick={() => scrollToSection('avis')} className="hover:text-indigo-600 transition-colors cursor-pointer">
              Avis Clients
            </button>
          </nav>

          {/* CTA Right Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2.5">
                {isAdminEmail(user?.email) && onOpenAdmin && (
                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-900 border border-amber-400/40 hover:bg-amber-500/25 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Dashboard Admin</span>
                  </button>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                  <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="truncate max-w-[130px]">{user.email || 'Mon Compte'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Se déconnecter"
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-rose-600 border border-slate-200 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Se connecter</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onOpenEditor ? onOpenEditor() : scrollToSection('paywall')}
              className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-100 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <span>Accéder aux Éditeurs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 p-5 space-y-3 shadow-lg animate-in slide-in-from-top-2">
            <button type="button" onClick={() => scrollToSection('services-4')} className="block w-full text-left py-2 text-sm font-bold text-slate-700">Les 4 Services</button>
            <button type="button" onClick={() => scrollToSection('modeles')} className="block w-full text-left py-2 text-sm font-bold text-slate-700">Modèles CV</button>
            <button type="button" onClick={() => scrollToSection('tarifs')} className="block w-full text-left py-2 text-sm font-bold text-slate-700">Tarifs (dès 500 FCFA)</button>
            <button type="button" onClick={() => scrollToSection('etapes')} className="block w-full text-left py-2 text-sm font-bold text-slate-700">Comment ça marche</button>
            <button type="button" onClick={() => scrollToSection('avis')} className="block w-full text-left py-2 text-sm font-bold text-slate-700">Avis Clients</button>
            
            <div className="pt-3 border-t border-slate-100 space-y-2">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 text-xs text-slate-700">
                    <span className="truncate font-semibold">{user.email}</span>
                    <button type="button" onClick={handleSignOut} className="text-rose-600 font-bold">Déconnexion</button>
                  </div>
                  {isAdminEmail(user.email) && onOpenAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full py-2.5 rounded-xl bg-amber-500/15 text-amber-900 border border-amber-400/40 text-xs font-black flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Tableau de Bord Administrateur</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openAuth('login')}
                    className="py-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Se connecter</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth('signup')}
                    className="py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Créer un compte</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenEditor ? onOpenEditor() : scrollToSection('paywall');
                }}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-100"
              >
                <span>Accéder aux Éditeurs</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <motion.section 
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative pt-10 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        
        {/* Main Hero Card Container */}
        <div className="relative rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 lg:p-14 shadow-sm overflow-hidden">
          
          {/* Dot grid decoration */}
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-70 pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-7">
            
            {/* Top Reputation Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-xs"
            >
              <div className="flex items-center text-amber-500">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                <Star className="w-3.5 h-3.5 fill-amber-500" />
              </div>
              <span className="font-extrabold text-slate-900">4.9/5</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">Plus de 10 000 documents générés au Sénégal</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]"
            >
              Générez vos CV ATS, Lettres IA, Devis & Factures professionnels{' '}
              <span className="text-indigo-600">
                en moins de 2 minutes
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
            >
              Plateforme 4-en-1 conforme aux normes sénégalaises et UEMOA. Téléchargement instantané en PDF & Word avec paiement direct par <strong>Wave ou Orange Money dès 1 000 FCFA</strong>.
            </motion.p>

            {/* 4 CORE SERVICES DISPLAY */}
            <div id="services-4" className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left relative">
              
              {/* Service 1: CV Pro ATS */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                onClick={() => {
                  setGenerationMode('cv_only');
                  if (onOpenEditor) onOpenEditor();
                  else scrollToSection('paywall');
                }}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 relative flex flex-col justify-between group hover:-translate-y-1 hover:shadow-md ${
                  generationMode === 'cv_only'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                      1 000 FCFA
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                    1. CV Professionnel ATS
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    20 modèles modernes avec scoring IA et mots-clés recruteurs.
                  </p>

                  <ul className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Score ATS garanti (98%)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Export PDF HD & Word (.docx)</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                  <span>Créer mon CV (1 000 F)</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>

              {/* Service 2: Lettre de Motivation IA */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                onClick={() => {
                  setGenerationMode('letter_only');
                  if (onOpenEditor) onOpenEditor();
                  else scrollToSection('paywall');
                }}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 relative flex flex-col justify-between group hover:-translate-y-1 hover:shadow-md ${
                  generationMode === 'letter_only'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-xs">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                      1 000 FCFA
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-purple-600 transition-colors">
                    2. Lettre de Motivation
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Rédaction persuasive IA adaptée à l'offre et l'entreprise cible.
                  </p>

                  <ul className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Formules percutantes & politesse</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Export PDF HD & Word (.docx)</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600">
                  <span>Rédiger ma Lettre (1 000 F)</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>

              {/* Service 3: Devis Professionnel */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
                onClick={() => {
                  setGenerationMode('devis');
                  if (onOpenEditor) onOpenEditor();
                  else scrollToSection('paywall');
                }}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 relative flex flex-col justify-between group hover:-translate-y-1 hover:shadow-md ${
                  generationMode === 'devis'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/30'
                    : 'border-slate-200 bg-white hover:border-amber-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                      1 000 FCFA
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
                    3. Devis Professionnel
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Calculs HT, TVA 18%, remises, NINEA, RCCM et Total TTC en FCFA.
                  </p>

                  <ul className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Conforme réglementation UEMOA</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Export PDF Haute Résolution</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
                  <span>Créer un Devis</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>

              {/* Service 4: Facture Client */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                onClick={() => {
                  setGenerationMode('facture');
                  if (onOpenEditor) onOpenEditor();
                  else scrollToSection('paywall');
                }}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 relative flex flex-col justify-between group hover:-translate-y-1 hover:shadow-md ${
                  generationMode === 'facture'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/30'
                    : 'border-slate-200 bg-white hover:border-emerald-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      1 000 FCFA
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                    4. Facture Client
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Numérotation officielle, échéance, Wave, OM et RIB bancaire.
                  </p>

                  <ul className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Coordonnées Wave & OM incluses</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Export PDF Haute Résolution</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                  <span>Créer une Facture</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>

            </div>

            {/* ECONOMIC PACKS ROW */}
            <div className="pt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              
              {/* Pack Emploi Duo */}
              <div 
                onClick={() => {
                  setGenerationMode('full_pack');
                  if (onOpenEditor) onOpenEditor();
                  else scrollToSection('paywall');
                }}
                className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 hover:border-indigo-400 cursor-pointer transition-all flex items-center justify-between gap-3 group shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        Pack Emploi Duo
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                        CV + Lettre
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Dossier de candidature complet prêt à l'emploi.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-indigo-600 block">1 399 FCFA</span>
                  <span className="text-[10px] text-slate-400 font-semibold line-through">2 000 F</span>
                </div>
              </div>

              {/* Pack Business Pro */}
              <div 
                onClick={() => {
                  setGenerationMode('pack_business');
                  if (onOpenEditor) onOpenEditor();
                  else scrollToSection('paywall');
                }}
                className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 hover:border-amber-400 cursor-pointer transition-all flex items-center justify-between gap-3 group shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                        Pack Business Pro
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        Devis + Facture
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Devis + Facture client pour indépendants & PME.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-amber-700 block">1 499 FCFA</span>
                  <span className="text-[10px] text-slate-400 font-semibold line-through">2 000 F</span>
                </div>
              </div>

              {/* Pass VIP Illimité */}
              <div 
                onClick={() => {
                  setGenerationMode('pass_illimite');
                  if (onOpenEditor) onOpenEditor();
                  else scrollToSection('paywall');
                }}
                className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 hover:border-emerald-400 cursor-pointer transition-all flex items-center justify-between gap-3 group shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Zap className="w-5 h-5 fill-amber-300 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                        Pass Illimité
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                        4 Services
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Générations & exports illimités (3 499 F/m ou 39 999 F/an).
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-emerald-700 block">3 499 FCFA</span>
                  <span className="text-[10px] text-slate-500">/ mois</span>
                </div>
              </div>

            </div>

            {/* Mobile Money Payment Methods Banner */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Paiement sécurisé et instantané par Mobile Money :</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-extrabold text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-sky-600 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                  <span>Wave</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-orange-600 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>Orange Money</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-emerald-700 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Free Money</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-indigo-700 flex items-center gap-1.5 shadow-2xs">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Carte Bancaire</span>
                </span>
              </div>
            </div>

          </div>
        </div>
      </motion.section>

      {/* 3. AUTO-SCROLLING CV TEMPLATES SHOWCASE */}
      <CVAutoScrollShowcase onSelectCV={handleSelectCVShowcase} />

      {/* 4. COMMENT ÇA MARCHE EN 3 ÉTAPES */}
      <section 
        id="etapes"
        className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <div className="text-center space-y-3 mb-14">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
            Simplicité & Rapidité
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Comment ça marche en 3 étapes ?</h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Créez des documents impeccables sans compétences techniques ni graphiques.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {[
            {
              step: '01',
              title: '1. Choisissez votre service',
              desc: 'Sélectionnez parmi nos 4 services (CV, Lettre, Devis ou Facture) et remplissez vos informations pas-à-pas.',
              icon: Sliders,
              badge: 'Étape 1',
              color: 'bg-indigo-50 text-indigo-600 border-indigo-200'
            },
            {
              step: '02',
              title: '2. L\'IA optimise & met en page',
              desc: 'Notre moteur IA ajuste la structure, insère les mots-clés métiers et applique les normes administratives sénégalaises.',
              icon: Sparkles,
              badge: 'Étape 2',
              color: 'bg-purple-50 text-purple-600 border-purple-200'
            },
            {
              step: '03',
              title: '3. Téléchargez en PDF & Word',
              desc: 'Validez votre document et réglez de manière instantanée par Wave ou Orange Money pour obtenir votre PDF Haute Définition.',
              icon: Download,
              badge: 'Étape 3',
              color: 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }
          ].map((item, idx) => (
            <div 
              key={idx}
              className="bg-white border border-slate-200 rounded-3xl p-8 space-y-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
            >
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-3xl font-black text-slate-200 group-hover:text-indigo-200 transition-colors">
                  {item.step}
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. PAYWALL & INTERACTIVE PREVIEW SECTION */}
      <section 
        id="paywall" 
        className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6"
      >
        
        {/* Status Notification Toast */}
        {message && (
          <div 
            className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm font-bold border flex items-center justify-between gap-3 shadow-sm transition-all ${
              isError 
                ? 'bg-rose-50 border-rose-200 text-rose-800' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {isError ? (
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
                  <PartyPopper className="w-5 h-5" />
                </div>
              )}
              <div className="space-y-0.5">
                <span className="block text-xs sm:text-sm font-black">{message}</span>
                {!isError && (
                  <span className="block text-[11px] text-emerald-700 font-medium">
                    Votre document haute définition est prêt pour le téléchargement
                  </span>
                )}
              </div>
            </div>
            {!isError && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Validé
              </span>
            )}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Aperçu en Direct</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                Aperçu de votre Document ({generationMode === 'cv_only' ? 'CV Pro ATS' : generationMode === 'letter_only' ? 'Lettre de Motivation' : generationMode === 'devis' ? 'Devis Pro' : generationMode === 'facture' ? 'Facture Client' : 'Pack Complet'})
              </h2>
            </div>

            {/* Main Action Download / Pay Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isDownloading || isRedirecting}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-md shadow-emerald-100 transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-95 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-70"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Génération du PDF...</span>
                  </>
                ) : isRedirecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Ouverture de Wave / Orange Money...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      {isPaid ? 'Télécharger mon PDF HD' : `Débloquer mon PDF (${price} FCFA)`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Preview Canvas */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 p-2 sm:p-4 min-h-[500px]">
            <CVTemplate
              formData={formData}
              aiData={aiData}
              isPaid={isPaid}
            />
          </div>

        </div>
      </section>

      {/* 6. TABLEAU COMPARATIF (VALEUR AJOUTÉE) */}
      <section 
        className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-200"
      >
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            Comparatif de Performance
          </span>
          <h2 className="text-3xl font-black text-slate-900">Pourquoi choisir notre solution ?</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Une technologie taillée sur-mesure pour le marché professionnel sénégalais et ouest-africain.
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-4 sm:p-5 font-bold text-slate-900">Critères</th>
                <th className="p-4 sm:p-5 font-bold text-slate-500 w-1/3">Outils Traditionnels (Word, Canva)</th>
                <th className="p-4 sm:p-5 font-black text-indigo-700 w-1/3 bg-indigo-50/70">Portail Pro Sénégal ✨</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-4 sm:p-5 font-bold text-slate-900">Compatibilité ATS Recruteurs</td>
                <td className="p-4 sm:p-5 text-rose-600 flex items-center gap-1.5"><X className="w-4 h-4 shrink-0" /> Faible (rejeté par les robots)</td>
                <td className="p-4 sm:p-5 text-emerald-700 font-bold bg-indigo-50/30 flex items-center gap-1.5"><Check className="w-4 h-4 shrink-0" /> 98% de passage garanti</td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-bold text-slate-900">Formulation IA & Mots-clés</td>
                <td className="p-4 sm:p-5 text-slate-400">Non (rédaction manuelle)</td>
                <td className="p-4 sm:p-5 text-emerald-700 font-bold bg-indigo-50/30 flex items-center gap-1.5"><Check className="w-4 h-4 shrink-0" /> Automatique & Percutant</td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-bold text-slate-900">Facturation & Devis UEMOA</td>
                <td className="p-4 sm:p-5 text-slate-400">Non adapté (manque NINEA/TVA)</td>
                <td className="p-4 sm:p-5 text-emerald-700 font-bold bg-indigo-50/30 flex items-center gap-1.5"><Check className="w-4 h-4 shrink-0" /> 100% Conforme Sénégal</td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-bold text-slate-900">Paiement Mobile Money local</td>
                <td className="p-4 sm:p-5 text-slate-400">Abonnements CB en dollars ($15+/mois)</td>
                <td className="p-4 sm:p-5 text-emerald-700 font-bold bg-indigo-50/30 flex items-center gap-1.5"><Check className="w-4 h-4 shrink-0" /> Wave & OM dès 500 FCFA</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. TARIFS CLAIRS & SANS ENGAGEMENT */}
      <section 
        id="tarifs" 
        className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200"
      >
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            Tarifs Transparents
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Pas d'abonnement forcé. Payez au besoin.</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Réglez de manière instantanée par Mobile Money en toute sécurité.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          
          {/* Card 1: CV Seul ou Lettre */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">Unitaire</span>
              <h3 className="font-extrabold text-slate-900 text-base mt-2">CV Pro ou Lettre IA</h3>
              <p className="text-xs text-slate-500 mt-1">Pour postuler rapidement à une opportunité clé.</p>
              <div className="text-3xl font-black text-slate-900 mt-4">1 000 <span className="text-xs font-bold text-slate-500">FCFA</span></div>
              <ul className="space-y-2 text-xs text-slate-600 mt-4 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> CV Pro ATS ou Lettre IA</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Export PDF HD & Word</li>
              </ul>
            </div>
            <button 
              onClick={() => { setGenerationMode('cv_only'); if (onOpenEditor) onOpenEditor(); else scrollToSection('paywall'); }}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-all mt-3"
            >
              Choisir (1 000 FCFA)
            </button>
          </div>

          {/* Card 2: Devis ou Facture Seul */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md uppercase">Business</span>
              <h3 className="font-extrabold text-slate-900 text-base mt-2">Devis ou Facture Pro</h3>
              <p className="text-xs text-slate-500 mt-1">Pour prestataires, freelances & entreprises.</p>
              <div className="text-3xl font-black text-slate-900 mt-4">1 000 <span className="text-xs font-bold text-slate-500">FCFA</span></div>
              <ul className="space-y-2 text-xs text-slate-600 mt-4 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Calculs HT, TVA 18% & TTC</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Paiement Wave/OM intégré</li>
              </ul>
            </div>
            <button 
              onClick={() => { setGenerationMode('devis'); if (onOpenEditor) onOpenEditor(); else scrollToSection('paywall'); }}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-all mt-3"
            >
              Créer Devis / Facture (1 000 F)
            </button>
          </div>

          {/* Card 3: Pack Business Pro */}
          <div className="bg-amber-50/50 border-2 border-amber-400 rounded-3xl p-6 space-y-4 relative shadow-sm flex flex-col justify-between">
            <span className="absolute -top-3 right-4 bg-amber-500 text-white font-black text-[10px] uppercase px-3 py-0.5 rounded-full shadow-xs">Pack Business</span>
            <div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md uppercase">Duo Entreprise</span>
              <h3 className="font-extrabold text-slate-900 text-base mt-2">Devis + Facture Client</h3>
              <p className="text-xs text-slate-600 mt-1">Pack complet gestion commerciale.</p>
              <div className="text-3xl font-black text-amber-800 mt-4">1 499 <span className="text-xs font-bold text-slate-500">FCFA</span></div>
              <ul className="space-y-2 text-xs text-slate-700 mt-4 border-t border-amber-200/60 pt-3">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Devis + Facture Client assortie</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Économisez sur le duo</li>
              </ul>
            </div>
            <button 
              onClick={() => { setGenerationMode('pack_business'); if (onOpenEditor) onOpenEditor(); else scrollToSection('paywall'); }}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-xs cursor-pointer transition-all mt-3"
            >
              Prendre le Pack Business (1 499 F)
            </button>
          </div>

          {/* Card 4: Pass VIP Illimité */}
          <div className="bg-indigo-50/50 border-2 border-indigo-500 rounded-3xl p-6 space-y-4 relative shadow-sm flex flex-col justify-between">
            <span className="absolute -top-3 right-4 bg-indigo-600 text-white font-black text-[10px] uppercase px-3 py-0.5 rounded-full shadow-xs">Pass Illimité</span>
            <div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md uppercase">Tout Inclus</span>
              <h3 className="font-extrabold text-slate-900 text-base mt-2">Pass Illimité (4 Services)</h3>
              <p className="text-xs text-slate-600 mt-1">Accès total sans limite (3 499 F/mois ou 39 999 F/an).</p>
              <div className="text-3xl font-black text-indigo-700 mt-4">3 499 <span className="text-xs font-bold text-slate-500">FCFA</span></div>
              <ul className="space-y-2 text-xs text-slate-700 mt-4 border-t border-indigo-200/60 pt-3">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> CV, Lettres, Devis & Factures illimités</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Support client prioritaire</li>
              </ul>
            </div>
            <button 
              onClick={() => { setGenerationMode('pass_illimite'); if (onOpenEditor) onOpenEditor(); else scrollToSection('paywall'); }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-100 cursor-pointer transition-all mt-3"
            >
              Activer le Pass Illimité
            </button>
          </div>

        </div>
      </section>

      {/* 8. FAQ ACCORDION */}
      <section 
        className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-200"
      >
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
            Foire Aux Questions
          </span>
          <h2 className="text-3xl font-black text-slate-900">Questions fréquemment posées</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "Comment s'effectue le paiement par Wave ou Orange Money ?",
              a: "Lorsque vous cliquez sur 'Débloquer' ou 'Télécharger', la fenêtre sécurisée s'ouvre. Vous choisissez votre moyen de paiement (Wave, Orange Money, Free Money ou Carte Bancaire) et validez la transaction sur votre téléphone en moins de 10 secondes."
            },
            {
              q: "Les CV sont-ils compatibles avec les filtres ATS des recruteurs ?",
              a: "Oui, à 100%. Nos modèles respectent scrupuleusement les exigences des logiciels de tri de candidatures (ATS) utilisés par les grandes entreprises et cabinets RH au Sénégal et à l'international."
            },
            {
              q: "Les devis et factures comportent-ils les mentions légales sénégalaises ?",
              a: "Absolument. Nos modèles intègrent les champs NINEA, RCCM, calculs automatiques HT/TVA 18%/TTC, conditions de validité et coordonnées de paiement Mobile Money pour un encaissement direct."
            },
            {
              q: "Puis-je modifier mes documents après achat ?",
              a: "Oui. Votre espace de travail reste accessible pour apporter toutes les modifications souhaitées à vos documents et les réexporter à tout moment."
            }
          ].map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div 
                key={index} 
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-5 text-left font-extrabold text-slate-900 text-sm sm:text-base flex items-center justify-between gap-4 cursor-pointer hover:text-indigo-600 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. AVIS CLIENTS */}
      <section 
        id="avis" 
        className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200"
      >
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            Témoignages Vérifiés
          </span>
          <h2 className="text-3xl font-black text-slate-900">Ce que disent nos utilisateurs au Sénégal</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Awa Diop', role: 'Comptable • Dakar', comment: 'Grâce au CV ATS généré, j\'ai décroché mon premier entretien d\'embauche en moins de 48 heures. Paiement par Wave fluide et instantané.' },
            { name: 'Ousmane Sow', role: 'Ingénieur BTP • Thiès', comment: 'Le Pack Duo est génial. La lettre de motivation était parfaitement rédigée selon l\'offre du recruteur.' },
            { name: 'Fatou Fall', role: 'Entrepreneure • Saint-Louis', comment: 'Les modèles de factures et devis avec NINEA et Wave intégré me font gagner un temps précieux chaque semaine.' }
          ].map((testimonial, i) => (
            <div 
              key={i} 
              className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-xs hover:shadow-md transition-all"
            >
              <div className="flex text-amber-500">
                <Star className="w-4 h-4 fill-amber-500" />
                <Star className="w-4 h-4 fill-amber-500" />
                <Star className="w-4 h-4 fill-amber-500" />
                <Star className="w-4 h-4 fill-amber-500" />
                <Star className="w-4 h-4 fill-amber-500" />
              </div>
              <p className="text-xs sm:text-sm text-slate-700 italic">"{testimonial.comment}"</p>
              <div className="pt-2 border-t border-slate-100">
                <div className="font-bold text-slate-900 text-xs">{testimonial.name}</div>
                <div className="text-[10px] text-slate-500">{testimonial.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-12 px-4 text-center text-xs text-slate-500 space-y-4">
        <div className="flex items-center justify-center gap-2 text-slate-800 font-extrabold text-sm">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Portail Pro Sénégal • CV, Lettres, Devis & Factures</span>
        </div>
        <p className="max-w-md mx-auto text-slate-500">
          Plateforme certifiée pour la création et le téléchargement de documents professionnels conformes aux normes sénégalaises.
        </p>
        <p className="text-[11px] text-slate-400">© {new Date().getFullYear()} Tous droits réservés. Paiements sécurisés via Wave, Orange Money & Free Money.</p>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

    </div>
  );
}
