import React, { useState } from 'react';
import { BUSINESS_DOC_TEMPLATES } from '../data/businessDocTemplates';
import { BusinessDocTemplateOption, BusinessDocData, BusinessDocTemplateId } from '../types';
import { DevisFactureTemplate } from './DevisFactureTemplate';
import { 
  Sparkles, CheckCircle2, ArrowRight, Eye, 
  ArrowLeft, FileCheck, Receipt, Package, Check, X, Maximize2, ZoomIn, ZoomOut
} from 'lucide-react';

interface BusinessDocTemplateGalleryProps {
  docType: 'devis' | 'facture' | 'pack_business';
  onSelectTemplate: (templateId: string, themeStyle?: 'indigo' | 'emerald' | 'amber' | 'slate') => void;
  selectedTemplateId?: string;
  onGoServices?: () => void;
}

export const BusinessDocTemplateGallery: React.FC<BusinessDocTemplateGalleryProps> = ({
  docType,
  onSelectTemplate,
  selectedTemplateId = 'classique_ohada',
  onGoServices
}) => {
  const [selectedTheme, setSelectedTheme] = useState<'indigo' | 'emerald' | 'amber' | 'slate'>('indigo');
  const [previewTemplate, setPreviewTemplate] = useState<BusinessDocTemplateOption | null>(null);
  const [modalZoom, setModalZoom] = useState<number>(0.9);

  const getDocTypeInfo = () => {
    switch (docType) {
      case 'devis':
        return {
          title: "Galerie des Modèles de Devis Professionnel",
          badge: "Devis Pro",
          icon: FileCheck,
          accent: "text-amber-400",
          price: "1 000 FCFA",
          desc: "Sélectionnez votre modèle conforme aux normes commerciales OHADA / UEMOA avant de saisir vos prestations et coordonnées."
        };
      case 'facture':
        return {
          title: "Galerie des Modèles de Facture Client",
          badge: "Facture Client",
          icon: Receipt,
          accent: "text-emerald-400",
          price: "1 000 FCFA",
          desc: "Choisissez le modèle de facture certifié avec mentions légales sénégalaises (NINEA, RC, TVA 18%, arrêté en toutes lettres)."
        };
      case 'pack_business':
      default:
        return {
          title: "Galerie Pack Business (Devis + Facture Synchronisés)",
          badge: "Pack Business Duo",
          icon: Package,
          accent: "text-indigo-400",
          price: "1 499 FCFA",
          desc: "Choisissez votre charte graphique commune pour générer en 1 clic votre devis et votre facture client synchronisés."
        };
    }
  };

  const docInfo = getDocTypeInfo();

  // Helper sample business document data
  const getSampleDocData = (tpl: BusinessDocTemplateOption): BusinessDocData => {
    const isQuote = docType === 'devis';
    return {
      type: isQuote ? 'devis' : 'facture',
      templateId: tpl.id as BusinessDocTemplateId,
      themeStyle: selectedTheme,
      docNumber: isQuote ? 'DEV-2026-042' : 'FAC-2026-088',
      issueDate: '2026-08-27',
      dueDate: '2026-09-27',
      validityDays: 30,
      issuer: {
        companyName: 'NEXUS DIGITAL SOLUTIONS SARL',
        name: 'Moussa DIOP',
        ninea: '008945231 2V3',
        rc: 'SN.DKR.2023.B.14890',
        phone: '+221 77 654 32 10',
        email: 'contact@nexus-digital.sn',
        address: 'Point E, Boulevard de l\'Est',
        city: 'Dakar',
        country: 'Sénégal'
      },
      client: {
        companyName: 'GROUPE SAHEL EXPANSION SA',
        name: 'Fatou NDIAYE',
        phone: '+221 78 123 45 67',
        email: 'direction@sahel-expansion.com',
        address: 'Zone Industrielle de Yoff',
        city: 'Dakar',
        country: 'Sénégal'
      },
      items: [
        {
          id: '1',
          description: 'Refonte complète de l\'écosystème web et intégration CRM Cloud',
          quantity: 1,
          unitPrice: 650000,
          total: 650000
        },
        {
          id: '2',
          description: 'Formation opérationnelle des équipes (2 sessions x 4h)',
          quantity: 2,
          unitPrice: 125000,
          total: 250000
        },
        {
          id: '3',
          description: 'Maintenance préventive & assistance technique prioritaire (Trimestre 1)',
          quantity: 3,
          unitPrice: 50000,
          total: 150000
        }
      ],
      discountPercent: 5,
      applyVat: true,
      vatRate: 18,
      currency: 'FCFA',
      notes: isQuote 
        ? 'Validité de l\'offre : 30 jours. Acompte de 40% exigible au démarrage des prestations.' 
        : 'Règlement sous 30 jours par virement bancaire ou Wave / Orange Money.',
      paymentInfo: {
        waveNumber: '+221 77 654 32 10',
        orangeMoneyNumber: '+221 78 500 11 22',
        bankName: 'SGBS Dakar',
        ibanOrRib: 'SN12 SN08 0100 1234 5678 9012 34',
        accountName: 'NEXUS DIGITAL SOLUTIONS SARL'
      }
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-7xl mx-auto pb-12">
      
      {/* 1. TOP HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border border-indigo-900/50 shadow-2xl p-6 sm:p-8 lg:p-10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Étape 1 sur 2 : Sélection du Format
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                10 Vrais Modèles Rendus en Haute Définition
              </span>
            </div>

            {onGoServices && (
              <button
                type="button"
                onClick={onGoServices}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-all cursor-pointer active:scale-95 w-fit"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour aux services</span>
              </button>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            {docInfo.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
            Consultez le rendu réel de vos devis et factures. Cliquez sur <span className="font-bold text-white">« Aperçu Plein Écran »</span> pour inspecter les tableaux de chiffrage, totaux et mentions légales avant de choisir.
          </p>

          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4 text-slate-300">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                Conformité OHADA / UEMOA (NINEA, RC, TVA 18%, Arrêté en lettres)
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                QR Code Wave, Orange Money & Virement
              </span>
            </div>

            <div className="text-amber-300 font-bold bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
              Tarif : {docInfo.price}
            </div>
          </div>
        </div>
      </div>

      {/* 2. THEME COLOR SELECTOR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Palette de couleurs de l'entreprise :
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sélectionnez la nuance principale appliquée aux en-têtes, lignes et totaux
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'indigo' as const, label: 'Indigo Corporate', bg: 'bg-indigo-600' },
            { id: 'emerald' as const, label: 'Émeraude Finance', bg: 'bg-emerald-600' },
            { id: 'amber' as const, label: 'Or & Prestige', bg: 'bg-amber-500' },
            { id: 'slate' as const, label: 'Ardoise Exécutive', bg: 'bg-slate-900' }
          ].map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => setSelectedTheme(theme.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 ${theme.bg} ${
                selectedTheme === theme.id ? 'ring-2 ring-offset-2 ring-indigo-600 scale-105 shadow-md' : 'opacity-70 hover:opacity-100'
              }`}
            >
              {selectedTheme === theme.id && <Check className="w-3.5 h-3.5" />}
              <span>{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. TEMPLATES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {BUSINESS_DOC_TEMPLATES.map((template, index) => {
          const isSelected = selectedTemplateId === template.id;
          const sampleData = getSampleDocData(template);

          return (
            <div
              key={template.id}
              className={`group bg-white rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-2xl hover:-translate-y-1.5 ${
                isSelected
                  ? 'border-indigo-600 ring-4 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-indigo-400'
              }`}
            >
              <div className="p-4 space-y-3 flex-1 flex flex-col">
                
                {/* Header info */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-slate-900 text-white shadow-2xs">
                    Modèle N° {index + 1}
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    {template.badge}
                  </span>
                </div>

                {/* REAL MINI-RENDER HTML/CSS THUMBNAIL */}
                <div 
                  onClick={() => {
                    setPreviewTemplate(template);
                    setModalZoom(0.9);
                  }}
                  className="relative h-64 sm:h-72 w-full rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden cursor-pointer group-hover:border-indigo-400 transition-all shadow-inner flex items-start justify-center"
                  title="Cliquer pour voir l'aperçu plein écran haute définition"
                >
                  <div 
                    className="w-[794px] min-h-[1123px] bg-white origin-top shadow-md pointer-events-none select-none transition-transform duration-300 group-hover:scale-[0.27]"
                    style={{
                      transform: 'scale(0.25)',
                      transformOrigin: 'top center',
                      marginTop: '4px'
                    }}
                  >
                    <DevisFactureTemplate
                      data={sampleData}
                      isUnlocked={true}
                    />
                  </div>

                  {/* Gradient Shadow bottom overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-900/30 to-transparent pointer-events-none" />

                  {/* Hover Overlay with Action Button */}
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-3 text-center">
                    <span className="px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-black shadow-xl flex items-center gap-1.5 transform translate-y-1 group-hover:translate-y-0 transition-transform">
                      <Maximize2 className="w-4 h-4 text-indigo-600" />
                      <span>Aperçu Plein Écran</span>
                    </span>
                    <span className="text-[11px] text-white/90 font-medium">
                      Inspecter le tableau & mentions légales
                    </span>
                  </div>
                </div>

                {/* Title & Desc */}
                <div className="pt-1">
                  <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {template.description}
                  </p>
                </div>

              </div>

              {/* Action Button */}
              <div className="p-3 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onSelectTemplate(template.id, selectedTheme)}
                  className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                    isSelected
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-900 hover:bg-indigo-600 text-white group-hover:bg-indigo-600'
                  }`}
                >
                  <span>Choisir ce modèle & Remplir</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* 4. FULL-SCREEN HIGH DEFINITION PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-5xl h-[92vh] bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
            
            {/* Modal Top Bar */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white shrink-0 z-10">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md text-xs font-black bg-indigo-600 text-white">
                  {previewTemplate.badge}
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                    {previewTemplate.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Modèle Conforme OHADA / UEMOA • Thème {selectedTheme.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                <div className="hidden sm:flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setModalZoom(prev => Math.max(0.6, prev - 0.1))}
                    className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold px-2 text-slate-300">
                    {Math.round(modalZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalZoom(prev => Math.min(1.3, prev + 0.1))}
                    className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const tpl = previewTemplate;
                    setPreviewTemplate(null);
                    onSelectTemplate(tpl.id, selectedTheme);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <span>Choisir ce modèle ({docInfo.price})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 bg-slate-900/90 flex justify-center items-start scrollbar-thin">
              <div 
                className="bg-white rounded-md shadow-2xl transition-transform duration-200 ease-out origin-top border border-slate-300"
                style={{
                  width: '794px',
                  minHeight: '1123px',
                  transform: `scale(${modalZoom})`,
                  marginBottom: '60px'
                }}
              >
                <DevisFactureTemplate
                  data={getSampleDocData(previewTemplate)}
                  isUnlocked={true}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Format A4 Standard (Exportable en PDF HD & Word .docx)
                </span>
                <span className="hidden md:inline text-slate-500">
                  {previewTemplate.description}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="px-3 py-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tpl = previewTemplate;
                    setPreviewTemplate(null);
                    onSelectTemplate(tpl.id, selectedTheme);
                  }}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all"
                >
                  Valider la sélection →
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
