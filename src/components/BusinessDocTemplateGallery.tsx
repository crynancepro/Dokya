import React, { useState } from 'react';
import { BUSINESS_DOC_TEMPLATES } from '../data/businessDocTemplates';
import { BusinessDocTemplateOption } from '../types';
import { 
  Sparkles, CheckCircle2, ArrowRight, Eye, 
  ArrowLeft, FileCheck, Receipt, Package, Check, X
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
                10 Modèles Conformes UEMOA / OHADA
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
            {docInfo.desc}
          </p>

          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4 text-slate-300">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                Calcul automatique TVA & Remises
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                Paiements Wave & Orange Money
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
            Palette de couleurs de l'entreprise
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sélectionnez la nuance principale appliquée aux en-têtes et bordures
          </p>
        </div>

        <div className="flex gap-2">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {BUSINESS_DOC_TEMPLATES.map((template, index) => {
          const isSelected = selectedTemplateId === template.id;

          return (
            <div
              key={template.id}
              className={`group bg-white rounded-3xl border-2 transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 ${
                isSelected
                  ? 'border-indigo-600 ring-2 ring-indigo-500/30'
                  : 'border-slate-200/90 hover:border-indigo-400'
              }`}
            >
              <div className="p-5 space-y-4 flex-1 flex flex-col">
                
                {/* Header info */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-900 text-white">
                    Modèle N° {index + 1}
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    {template.badge}
                  </span>
                </div>

                {/* Mock Visual Skeleton */}
                <div 
                  onClick={() => setPreviewTemplate(template)}
                  className="relative h-40 rounded-2xl bg-slate-50 border border-slate-200 p-3 overflow-hidden cursor-pointer group-hover:border-indigo-300 transition-colors flex flex-col justify-between shadow-inner"
                >
                  {/* Top company & client header */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="h-3 rounded w-20 bg-indigo-600 font-bold" />
                      <div className="h-1.5 rounded w-14 bg-slate-300" />
                      <div className="h-1.5 rounded w-10 bg-slate-200" />
                    </div>
                    <div className="text-right space-y-1">
                      <div className="h-3 rounded w-16 bg-slate-800 ml-auto" />
                      <div className="h-1.5 rounded w-12 bg-slate-300 ml-auto" />
                    </div>
                  </div>

                  {/* Items Table Mock */}
                  <div className="space-y-1 my-1">
                    <div className="h-2 rounded bg-slate-300 w-full" />
                    <div className="h-1.5 rounded bg-slate-200 w-full" />
                    <div className="h-1.5 rounded bg-slate-200 w-full" />
                  </div>

                  {/* Bottom totals & stamp */}
                  <div className="flex justify-between items-end pt-1 border-t border-slate-200">
                    <div className="h-2 rounded w-16 bg-emerald-500/70" />
                    <div className="h-3 rounded w-20 bg-indigo-900" />
                  </div>

                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-black shadow-md flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Inspecter le modèle</span>
                    </span>
                  </div>
                </div>

                {/* Title & Desc */}
                <div>
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
                  <span>Choisir ce modèle & Remplir mes infos</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* 4. PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <button
              onClick={() => setPreviewTemplate(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-black bg-indigo-600 text-white">
                {previewTemplate.badge}
              </span>
              <h3 className="text-lg font-black text-slate-900">
                {previewTemplate.name}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {previewTemplate.description}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold"
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
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100"
              >
                <span>Sélectionner ce modèle</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
