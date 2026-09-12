import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, ShieldCheck, Star, Briefcase, Receipt, CheckCircle2, ArrowRight, Award, Eye } from 'lucide-react';
import { ALL_CV_TEMPLATES } from '../../data/cvTemplatesList';
import { BUSINESS_DOC_TEMPLATES } from '../../data/businessDocTemplates';
import { SAMPLE_CV_DATA } from '../../data/sampleData';
import { CVTemplate } from '../CVTemplate';
import { DevisFactureTemplate } from '../DevisFactureTemplate';
import { BusinessDocData, BusinessDocTemplateId, CVFormData } from '../../types';

interface LandingHero3DShowcaseProps {
  onSelectService: (service: 'cv' | 'facture') => void;
}

// Données du Vrai Modèle N°1 de Facture OHADA (Classique OHADA)
const SAMPLE_INVOICE_MODEL_1: BusinessDocData = {
  type: 'facture',
  templateId: 'classique_ohada' as BusinessDocTemplateId,
  themeStyle: 'emerald',
  docNumber: 'FAC-2026-001',
  issueDate: '2026-09-12',
  dueDate: '2026-10-12',
  validityDays: 30,
  issuer: {
    companyName: 'DOKYA CLOUD & BUSINESS SARL',
    name: 'Amadou M. DIOP',
    ninea: '009847231 2V2',
    rc: 'SN.DKR.2026.B.1402',
    phone: '+221 77 654 32 10',
    email: 'contact@dokya-services.sn',
    address: 'Sacré-Cœur 3, Immeuble Horizon',
    city: 'Dakar',
    country: 'Sénégal',
  },
  client: {
    companyName: 'GROUPE SAHEL EXPANSION SA',
    name: 'Mme Fatou SOW',
    phone: '+221 78 123 45 67',
    email: 'direction@sahel-expansion.com',
    address: 'Zone Franche Industrielle',
    city: 'Dakar',
    country: 'Sénégal',
  },
  items: [
    {
      id: '1',
      description: 'Conseil en Transformation Numérique & Conformité SYSCOHADA',
      quantity: 1,
      unitPrice: 850000,
      total: 850000,
    },
    {
      id: '2',
      description: 'Déploiement Passerelles de Paiement Wave & Orange Money B2B',
      quantity: 1,
      unitPrice: 400000,
      total: 400000,
    },
  ],
  applyVat: true,
  vatRate: 18,
  discountPercent: 0,
  currency: 'FCFA',
  paymentInfo: {
    waveNumber: '77 654 32 10',
    orangeMoneyNumber: '78 123 45 67',
    bankName: 'CBAO Attijariwafa Bank Sénégal',
    ibanOrRib: 'SN012 01234 567890001234567 89',
  },
  notes: 'Arrêté la présente facture à la somme de UN MILLION QUATRE CENT SOIXANTE-QUINZE MILLE (1 475 000) FCFA Toutes Taxes Comprises.',
};

// Données du Vrai Modèle N°1 de CV ATS (Moderne Pur - Sans Photo)
const SAMPLE_CV_MODEL_1: CVFormData = {
  ...SAMPLE_CV_DATA,
  templateStyle: 'moderne',
  themeColor: '#1e3a8a',
  highlightsSummary: 'Directeur des Opérations avec plus de 12 ans d\'expérience dans le pilotage de centres de profit, la gestion budgétaire multi-pays (SYSCOHADA) et la transformation logistique dans l\'espace UEMOA.',
  personalInfo: {
    ...SAMPLE_CV_DATA.personalInfo,
    photoUrl: '', // Modèle 1 est 100% ATS sans photo
    firstName: 'Amadou',
    lastName: 'Diallo',
    targetJob: 'Directeur des Opérations & Supply Chain',
    email: 'amadou.diallo@pro-uemoa.com',
    phone: '+221 77 123 45 67',
    city: 'Dakar',
    country: 'Sénégal (Mobilité Internationale)',
    address: 'Sacré-Cœur 3',
  },
};

export const LandingHero3DShowcase: React.FC<LandingHero3DShowcaseProps> = ({
  onSelectService,
}) => {
  const [activeTab, setActiveTab] = useState<'cv' | 'facture'>('cv');
  const stageRef = useRef<HTMLDivElement>(null);
  const cvCardRef = useRef<HTMLDivElement>(null);
  const invoiceCardRef = useRef<HTMLDivElement>(null);

  const [cvScale, setCvScale] = useState<number>(0.48);
  const [invoiceScale, setInvoiceScale] = useState<number>(0.48);

  // État d'inclinaison dynamique 3D asservi aux mouvements du curseur
  const [tilt, setTilt] = useState<{
    rotateX: number;
    rotateY: number;
    glareX: number;
    glareY: number;
    isHovering: boolean;
  }>({
    rotateX: 6,
    rotateY: -6,
    glareX: 50,
    glareY: 50,
    isHovering: false,
  });

  // Calcul du scale pour les deux cartes A4
  useEffect(() => {
    const updateScales = () => {
      if (cvCardRef.current) {
        const w = cvCardRef.current.clientWidth;
        if (w > 0) setCvScale(w / 794);
      }
      if (invoiceCardRef.current) {
        const w = invoiceCardRef.current.clientWidth;
        if (w > 0) setInvoiceScale(w / 794);
      }
    };
    updateScales();
    const ro = new ResizeObserver(() => updateScales());
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Amplitude de rotation spatiale (max +/- 14 degrés)
    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 14;

    const glX = Math.round((x / rect.width) * 100);
    const glY = Math.round((y / rect.height) * 100);

    setTilt({
      rotateX: rotX,
      rotateY: rotY,
      glareX: glX,
      glareY: glY,
      isHovering: true,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({
      rotateX: 4,
      rotateY: -4,
      glareX: 50,
      glareY: 50,
      isHovering: false,
    });
  }, []);

  const cvTemplate1 = ALL_CV_TEMPLATES[0];
  const invoiceTemplate1 = BUSINESS_DOC_TEMPLATES[0];

  return (
    <div className="relative w-full max-w-5xl mx-auto pt-4 pb-2">
      
      {/* 1. TOGGLE BUTTON POUR SWITCHER L'APERÇU 3D */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
        <div className="p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md flex items-center gap-2">
          
          {/* Bouton Mode CV ATS */}
          <button
            type="button"
            onClick={() => setActiveTab('cv')}
            className={`px-5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 flex items-center gap-2.5 cursor-pointer select-none ${
              activeTab === 'cv'
                ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 text-white shadow-xl shadow-indigo-600/50 scale-102 ring-2 ring-indigo-400/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Briefcase className={`w-4 h-4 ${activeTab === 'cv' ? 'text-amber-300' : 'text-slate-500'}`} />
            <span>Mode CV ATS • Vrai Modèle N°1</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              activeTab === 'cv' ? 'bg-black/30 text-emerald-300 border border-emerald-400/30' : 'bg-slate-800 text-slate-400'
            }`}>
              Score 99%
            </span>
          </button>

          {/* Bouton Mode Facture OHADA */}
          <button
            type="button"
            onClick={() => setActiveTab('facture')}
            className={`px-5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 flex items-center gap-2.5 cursor-pointer select-none ${
              activeTab === 'facture'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-xl shadow-emerald-600/50 scale-102 ring-2 ring-emerald-400/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Receipt className={`w-4 h-4 ${activeTab === 'facture' ? 'text-emerald-200' : 'text-slate-500'}`} />
            <span>Mode Facture OHADA • Vrai Gabarit N°1</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              activeTab === 'facture' ? 'bg-black/30 text-cyan-300 border border-cyan-400/30' : 'bg-slate-800 text-slate-400'
            }`}>
              100% Légal
            </span>
          </button>

        </div>

        {/* Indication interactive */}
        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>Inclinez la souris pour explorer le document réel en 3D</span>
        </span>
      </div>

      {/* 2. STAGE SPATIAL 3D AVEC SUIVI DYNAMIQUE DE LA SOURIS */}
      <div
        ref={stageRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative flex items-center justify-center min-h-[580px] sm:min-h-[640px] px-2 sm:px-4 cursor-grab active:cursor-grabbing"
        style={{ perspective: '1400px' }}
      >
        
        {/* Halo volumétrique dynamique en arrière-plan */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] sm:w-[650px] h-[380px] rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
            activeTab === 'cv'
              ? 'bg-gradient-to-tr from-indigo-600/35 via-violet-600/25 to-cyan-500/20'
              : 'bg-gradient-to-tr from-emerald-600/35 via-teal-600/25 to-cyan-500/20'
          }`}
        />

        {/* ========================================================================= */}
        {/* A. CARTE 3D : LE VRAI MODÈLE DE CV N°1 DE DOKYA (COMPOSANT RÉEL CVTEMPLATE)*/}
        {/* ========================================================================= */}
        <div
          style={{
            transformStyle: 'preserve-3d',
            transform: activeTab === 'cv'
              ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateZ(40px)`
              : `rotateX(${tilt.rotateX + 6}deg) rotateY(${tilt.rotateY - 24}deg) translateZ(-90px) translateX(-110px) scale(0.86)`,
            opacity: activeTab === 'cv' ? 1 : 0.25,
            pointerEvents: activeTab === 'cv' ? 'auto' : 'none',
            transition: tilt.isHovering ? 'transform 0.08s ease-out, opacity 0.4s ease' : 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="absolute z-20 w-full max-w-[360px] sm:max-w-[430px] rounded-2xl bg-slate-900 text-slate-900 p-3 sm:p-4 shadow-2xl shadow-indigo-950/90 border border-slate-700/80 select-none overflow-hidden"
        >
          {/* Reflet spéculaire réactif à la souris */}
          <div
            className="pointer-events-none absolute inset-0 z-30 rounded-2xl transition-opacity duration-200"
            style={{
              opacity: tilt.isHovering && activeTab === 'cv' ? 0.3 : 0.05,
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.1) 45%, transparent 70%)`,
              mixBlendMode: 'overlay',
            }}
          />

          {/* Badge 3D flottant au-dessus (translateZ 45px) */}
          <div
            style={{ transform: 'translateZ(45px)' }}
            className="absolute top-2 right-3 z-30 px-3 py-1 rounded-full bg-slate-950 text-white border border-indigo-500/60 shadow-xl flex items-center gap-1.5 text-[11px] font-black"
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-emerald-400">Modèle N°1 : Moderne Pur</span>
            <span className="text-[9px] text-slate-400">• Score ATS 99%</span>
          </div>

          {/* Badge catégorie 3D */}
          <div
            style={{ transform: 'translateZ(35px)' }}
            className="absolute top-2 left-3 z-30 px-2.5 py-1 rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-500/40 shadow-md text-[10px] font-black"
          >
            100% Sans Photo • Workday &amp; Taleo
          </div>

          {/* VÉRITABLE FEUILLE A4 DU MODÈLE DE CV N°1 (CVTEMPLATE OFFICIEL) */}
          <div 
            ref={cvCardRef}
            className="w-full aspect-[210/297] bg-white rounded-xl overflow-hidden shadow-inner border border-slate-300 relative mt-7"
          >
            <div 
              className="w-[794px] h-[1123px] origin-top-left pointer-events-none select-none"
              style={{ transform: `scale(${cvScale})` }}
            >
              <CVTemplate
                formData={SAMPLE_CV_MODEL_1}
                style="moderne"
                primaryColor="#1e3a8a"
                isPaid={true}
              />
            </div>
          </div>

          {/* Barre d'action 3D en bas de carte */}
          <div
            style={{ transform: 'translateZ(30px)' }}
            className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-white"
          >
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Conforme ATS International
            </span>
            <button
              type="button"
              onClick={() => onSelectService('cv')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30 transition-transform hover:scale-105 active:scale-95"
            >
              <span>Créer mon CV avec le Modèle 1</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* B. CARTE 3D : LE VRAI MODÈLE DE FACTURE N°1 (DEVISFACTURETEMPLATE OFFICIEL)*/}
        {/* ========================================================================= */}
        <div
          style={{
            transformStyle: 'preserve-3d',
            transform: activeTab === 'facture'
              ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateZ(40px)`
              : `rotateX(${tilt.rotateX + 6}deg) rotateY(${tilt.rotateY + 24}deg) translateZ(-90px) translateX(110px) scale(0.86)`,
            opacity: activeTab === 'facture' ? 1 : 0.25,
            pointerEvents: activeTab === 'facture' ? 'auto' : 'none',
            transition: tilt.isHovering ? 'transform 0.08s ease-out, opacity 0.4s ease' : 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="absolute z-20 w-full max-w-[360px] sm:max-w-[430px] rounded-2xl bg-slate-900 text-slate-900 p-3 sm:p-4 shadow-2xl shadow-emerald-950/90 border border-slate-700/80 select-none overflow-hidden"
        >
          {/* Reflet spéculaire réactif à la souris */}
          <div
            className="pointer-events-none absolute inset-0 z-30 rounded-2xl transition-opacity duration-200"
            style={{
              opacity: tilt.isHovering && activeTab === 'facture' ? 0.3 : 0.05,
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.1) 45%, transparent 70%)`,
              mixBlendMode: 'overlay',
            }}
          />

          {/* Badge 3D flottant au-dessus (translateZ 45px) */}
          <div
            style={{ transform: 'translateZ(45px)' }}
            className="absolute top-2 right-3 z-30 px-3 py-1 rounded-full bg-slate-950 text-white border border-emerald-500/60 shadow-xl flex items-center gap-1.5 text-[11px] font-black"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-emerald-400">Gabarit N°1 : Classique OHADA</span>
            <span className="text-[9px] text-slate-400">• Standard UEMOA</span>
          </div>

          {/* Badge légalité 3D */}
          <div
            style={{ transform: 'translateZ(35px)' }}
            className="absolute top-2 left-3 z-30 px-2.5 py-1 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 shadow-md text-[10px] font-black"
          >
            NINEA, RC &amp; TVA 18% Conformes
          </div>

          {/* VÉRITABLE FEUILLE A4 DE FACTURE OHADA N°1 (DEVISFACTURETEMPLATE OFFICIEL) */}
          <div 
            ref={invoiceCardRef}
            className="w-full aspect-[210/297] bg-white rounded-xl overflow-hidden shadow-inner border border-slate-300 relative mt-7"
          >
            <div 
              className="w-[794px] h-[1123px] origin-top-left pointer-events-none select-none"
              style={{ transform: `scale(${invoiceScale})` }}
            >
              <DevisFactureTemplate
                data={SAMPLE_INVOICE_MODEL_1}
              />
            </div>
          </div>

          {/* Barre d'action 3D en bas de carte */}
          <div
            style={{ transform: 'translateZ(30px)' }}
            className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-white"
          >
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Droit Commercial &amp; Fiscal
            </span>
            <button
              type="button"
              onClick={() => onSelectService('facture')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30 transition-transform hover:scale-105 active:scale-95"
            >
              <span>Créer ma Facture avec le Gabarit 1</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
