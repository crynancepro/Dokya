import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ShieldCheck, ArrowRight, Receipt, Award, Sparkles, FileText, 
  CheckCircle2, ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut, 
  X, SlidersHorizontal, LayoutGrid, Eye, Play, Pause
} from 'lucide-react';
import { BUSINESS_DOC_TEMPLATES } from '../../data/businessDocTemplates';
import { BusinessDocTemplateOption, BusinessDocData, BusinessDocTemplateId } from '../../types';
import { DevisFactureTemplate } from '../DevisFactureTemplate';

interface LandingInvoicesCarouselProps {
  onSelectBusinessDoc: (service: 'facture' | 'devis', templateId?: string) => void;
}

interface BusinessDocWithNumber extends BusinessDocTemplateOption {
  number: number;
}

const TEMPLATES_WITH_NUMBERS: BusinessDocWithNumber[] = BUSINESS_DOC_TEMPLATES.map((tpl, index) => ({
  ...tpl,
  number: index + 1
}));

// Données types conformes OHADA et UEMOA pour le rendu réel de la facture / devis
const getSampleInvoiceData = (tpl: BusinessDocWithNumber, isQuote: boolean): BusinessDocData => {
  return {
    type: isQuote ? 'devis' : 'facture',
    templateId: tpl.id as BusinessDocTemplateId,
    themeStyle: 'emerald',
    docNumber: isQuote ? `DEV-2026-0${tpl.number}` : `FAC-2026-0${tpl.number + 10}`,
    issueDate: '2026-09-12',
    dueDate: '2026-10-12',
    validityDays: 30,
    issuer: {
      companyName: 'DOKYA BUSINESS & CLOUD SARL',
      name: 'Amadou M. DIOP',
      ninea: '009847231 2V2',
      rc: 'SN.DKR.2026.B.1402',
      phone: '+221 77 654 32 10',
      email: 'facturation@dokya-pro.sn',
      address: 'Sacré-Cœur 3, Immeuble Horizon',
      city: 'Dakar',
      country: 'Sénégal',
    },
    client: {
      companyName: 'GROUPE SAHEL EXPANSION SA',
      name: 'Mme Fatou SOW',
      phone: '+221 78 123 45 67',
      email: 'comptabilite@sahel-expansion.com',
      address: 'Zone Industrielle de Yoff',
      city: 'Dakar',
      country: 'Sénégal',
    },
    items: [
      {
        id: '1',
        description: 'Audit & Mise en conformité système d\'information & API Wave/OM',
        quantity: 1,
        unitPrice: 850000,
        total: 850000,
      },
      {
        id: '2',
        description: 'Déploiement infrastructure cloud sécurisée & maintenance mensuelle',
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
};

// Carte A4 réelle pour la Facture / Devis
const RealA4InvoiceCard: React.FC<{
  template: BusinessDocWithNumber;
  sampleData: BusinessDocData;
  onSelect: () => void;
  onOpenPreview: () => void;
}> = ({ template, sampleData, onSelect, onOpenPreview }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(0.33);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        if (width > 0) {
          setScale(width / 794);
        }
      }
    };
    updateScale();
    const observer = new ResizeObserver(() => updateScale());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Sélectionner le modèle de facture ${template.name}`}
      className="group relative cursor-pointer select-none rounded-2xl overflow-hidden flex flex-col bg-slate-900 border border-slate-800 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/25 hover:border-emerald-500/50 transition-all duration-300 p-2 sm:p-2.5 shrink-0 w-[260px] sm:w-[290px] text-left transform hover:scale-102 hover:-translate-y-1"
    >
      {/* 1. VRAIE FEUILLE A4 DE FACTURE / DEVIS HAUTE DÉFINITION */}
      <div 
        ref={containerRef}
        className="w-full aspect-[210/297] bg-white overflow-hidden rounded-xl relative shadow-md shrink-0 border border-slate-200"
      >
        <div 
          className="w-[794px] h-[1123px] origin-top-left pointer-events-none select-none"
          style={{ transform: `scale(${scale})` }}
        >
          <DevisFactureTemplate data={sampleData} />
        </div>

        {/* Bouton Loupe / Aperçu Plein Écran HD */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPreview();
          }}
          className="absolute top-2.5 left-2.5 z-20 p-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 transition-all active:scale-90 cursor-pointer shadow-lg flex items-center justify-center group-hover:scale-105"
          title="Aperçu Plein Écran HD (Zoom)"
          aria-label="Aperçu Plein Écran HD"
        >
          <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
        </button>

        {/* Badge Numéro Officiel du Modèle */}
        <div className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-600 text-white shadow-md flex items-center gap-1 backdrop-blur-xs">
          <span>N° {template.number}</span>
        </div>

        {/* Overlay d'action subtile au survol */}
        <div className="absolute inset-0 bg-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-600/90 text-white text-xs font-black shadow-lg backdrop-blur-sm flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
            <Eye className="w-3.5 h-3.5" />
            <span>Examiner</span>
          </span>
        </div>
      </div>

      {/* 2. INFORMATIONS DU MODÈLE ET BOUTON D'ACTION */}
      <div className="pt-2.5 pb-1 px-1 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <h4 className="text-xs font-black text-white truncate group-hover:text-emerald-300 transition-colors">
              {template.name}
            </h4>
            <p className="text-[10px] text-slate-400 truncate">
              {template.badge}
            </p>
          </div>

          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50 flex items-center gap-0.5 shrink-0">
            <ShieldCheck className="w-2.5 h-2.5 text-cyan-300" />
            <span>OHADA</span>
          </span>
        </div>

        {/* Bouton de sélection */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer group-hover:bg-emerald-600"
        >
          <span>Créer avec le gabarit N° {template.number}</span>
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};

export const LandingInvoicesCarousel: React.FC<LandingInvoicesCarouselProps> = ({
  onSelectBusinessDoc,
}) => {
  const [filterDocType, setFilterDocType] = useState<'all' | 'facture' | 'devis'>('all');
  const [fullPreviewTemplate, setFullPreviewTemplate] = useState<BusinessDocWithNumber | null>(null);
  const [modalZoom, setModalZoom] = useState<number>(0.8);
  const [viewMode, setViewMode] = useState<'marquee' | 'grid'>('marquee');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Défilement automatique : duplication de la liste pour effet continu infini sans coupure
  const marqueeCards = useMemo(() => {
    return [...TEMPLATES_WITH_NUMBERS, ...TEMPLATES_WITH_NUMBERS];
  }, []);

  const handleOpenPreview = (tpl: BusinessDocWithNumber) => {
    setFullPreviewTemplate(tpl);
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      const calculatedZoom = Math.min(0.48, Math.max(0.38, (window.innerWidth - 32) / 794));
      setModalZoom(calculatedZoom);
    } else {
      setModalZoom(0.85);
    }
  };

  const isQuoteMode = filterDocType === 'devis';

  return (
    <div className="w-full relative py-2 space-y-4">
      
      {/* 1. BARRE DE COMMANDE SUPÉRIEURE (Filtres, Compteur, Mode Défilement Automatique vs Grille & Play/Pause) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
        
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Badge Compteur Officiel */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 font-mono font-bold flex items-center gap-2 shadow-sm">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Les 10 Vrais Modèles de Factures &amp; Devis Conformes OHADA</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 text-[11px] border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Défilement continu automatique • Pause au survol</span>
            </span>
          </div>

          {/* Contrôles de navigation manuelle & Mode d'affichage */}
          <div className="flex items-center gap-2">
            
            {/* Filtre Type Document */}
            <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 gap-1">
              <button
                type="button"
                onClick={() => setFilterDocType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterDocType === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tous les 10
              </button>
              <button
                type="button"
                onClick={() => setFilterDocType('facture')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterDocType === 'facture'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3 h-3 text-emerald-300" />
                <span>Factures</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterDocType('devis')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterDocType === 'devis'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3 h-3 text-cyan-300" />
                <span>Devis</span>
              </button>
            </div>

            {/* Bouton Play / Pause Défilement Automatique */}
            {viewMode === 'marquee' && (
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer shadow-sm"
                title={isPlaying ? 'Mettre en pause le défilement automatique' : 'Reprendre le défilement automatique'}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                    <span className="hidden sm:inline">Défiler</span>
                  </>
                )}
              </button>
            )}

            {/* Toggle Mode Défilement Automatique vs Grille Complète */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('marquee')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'marquee'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vue Défilement Automatique Continu"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auto-Scroll</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vue Grille Complète"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grille (10)</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* 2. ZONE DE PRÉSENTATION DES VRAIS MODÈLES DE FACTURES (DÉFILEMENT AUTOMATIQUE OU GRILLE) */}
      <div className="w-full">
        
        {viewMode === 'marquee' ? (
          /* BANDE DÉFILANTE CONTINUE INFINIE AUTOMATIQUE (SCROLL PAR LUI-MÊME AVEC PAUSE AU SURVOL) */
          <div className="relative w-full overflow-hidden">
            {/* Masques latéraux progressifs pour sortie/entrée transparente */}
            <div className="absolute top-0 left-0 bottom-0 w-12 sm:w-28 z-20 pointer-events-none bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
            <div className="absolute top-0 right-0 bottom-0 w-12 sm:w-28 z-20 pointer-events-none bg-gradient-to-l from-slate-950 via-slate-950/70 to-transparent" />

            <div 
              className="animate-marquee-right flex items-stretch gap-4 sm:gap-6 py-3"
              style={{ 
                animationDuration: '50s',
                animationPlayState: isPlaying ? undefined : 'paused' 
              }}
            >
              {marqueeCards.map((tpl, idx) => (
                <div key={`${tpl.id}-${tpl.number}-${idx}`} className="shrink-0">
                  <RealA4InvoiceCard
                    template={tpl}
                    sampleData={getSampleInvoiceData(tpl, isQuoteMode)}
                    onSelect={() => onSelectBusinessDoc(isQuoteMode ? 'devis' : 'facture', tpl.id)}
                    onOpenPreview={() => handleOpenPreview(tpl)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* VUE GRILLE COMPLÈTE (10 MODÈLES BIEN ALIGNÉS) */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 py-3">
            {TEMPLATES_WITH_NUMBERS.map((tpl) => (
              <RealA4InvoiceCard
                key={tpl.id}
                template={tpl}
                sampleData={getSampleInvoiceData(tpl, isQuoteMode)}
                onSelect={() => onSelectBusinessDoc(isQuoteMode ? 'devis' : 'facture', tpl.id)}
                onOpenPreview={() => handleOpenPreview(tpl)}
              />
            ))}
          </div>
        )}

      </div>

      {/* 3. MODALE D'APERÇU PLEIN ÉCRAN HD (ZOOMABLE) */}
      {fullPreviewTemplate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setFullPreviewTemplate(null)}
        >
          <div 
            className="relative w-full max-w-5xl h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header de la modale */}
            <div className="px-4 sm:px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0 bg-emerald-500 ring-2 ring-emerald-500/30" />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    {fullPreviewTemplate.name}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Gabarit N° {fullPreviewTemplate.number} sur 10 • {fullPreviewTemplate.badge} • Conforme OHADA
                  </p>
                </div>
              </div>

              {/* Contrôles de Zoom */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalZoom(prev => Math.max(0.35, prev - 0.08))}
                    className="p-1 sm:p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Zoom arrière"
                  >
                    <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <span className="text-[10px] sm:text-xs font-mono font-bold px-1.5 text-slate-300">
                    {Math.round(modalZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalZoom(prev => Math.min(1.4, prev + 0.08))}
                    className="p-1 sm:p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Zoom avant"
                  >
                    <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setFullPreviewTemplate(null)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                  title="Fermer"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Corps du modal : Feuille A4 haute définition */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-6 bg-slate-950 flex justify-center items-start scrollbar-thin">
              <div 
                className="bg-white shadow-2xl transition-transform duration-200 ease-out origin-top border border-slate-300 rounded-xs"
                style={{
                  width: '794px',
                  minHeight: '1123px',
                  transform: `scale(${modalZoom})`,
                  marginBottom: '80px',
                }}
              >
                <DevisFactureTemplate
                  data={getSampleInvoiceData(fullPreviewTemplate, isQuoteMode)}
                />
              </div>
            </div>

            {/* Bas de page du modal */}
            <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
              <div className="hidden sm:flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Conforme SYSCOHADA, DGI (NINEA, RC) et UEMOA (TVA 18%)
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setFullPreviewTemplate(null)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tpl = fullPreviewTemplate;
                    setFullPreviewTemplate(null);
                    onSelectBusinessDoc(isQuoteMode ? 'devis' : 'facture', tpl.id);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <span>Créer mon document avec ce gabarit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
