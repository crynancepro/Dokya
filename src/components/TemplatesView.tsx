import React from 'react';
import { CVTemplateGallery } from './CVTemplateGallery';
import { LetterTemplateGallery } from './LetterTemplateGallery';
import { BusinessDocTemplateGallery } from './BusinessDocTemplateGallery';
import { TemplateStyle, CoverLetterType } from '../types';
import { 
  FileText, 
  Mail, 
  Receipt, 
  FileCheck, 
  Package, 
  BookOpen, 
  ArrowLeft, 
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface TemplatesViewProps {
  initialService?: 'cv' | 'letter' | 'devis' | 'facture' | 'pack_business' | 'ebook';
  onSelectCVTemplate: (templateId: TemplateStyle, accentColor?: string) => void;
  onSelectLetterTemplate: (styleId: string, letterType: CoverLetterType) => void;
  onSelectBusinessTemplate: (docType: 'devis' | 'facture' | 'pack_business', templateId: string, themeStyle?: 'indigo' | 'emerald' | 'amber' | 'slate') => void;
  onSelectEbookTemplate: () => void;
  onBackToDashboard: () => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  initialService = 'cv',
  onSelectCVTemplate,
  onSelectLetterTemplate,
  onSelectBusinessTemplate,
  onSelectEbookTemplate,
  onBackToDashboard,
}) => {
  const activeService = initialService;

  const getServiceInfo = () => {
    switch (activeService) {
      case 'cv':
        return {
          title: "Galerie Exclusive : 50+ Modèles de CV ATS Professionnels",
          subtitle: "Sélectionnez votre design optimisé pour passer avec succès les filtres de recrutement.",
          badge: "CV Pro ATS",
          icon: FileText,
          accentBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
          price: "1 000 FCFA"
        };
      case 'letter':
        return {
          title: "Galerie Exclusive : Modèles de Lettre de Motivation IA",
          subtitle: "Choisissez le format rédactionnel adapté à votre candidature (Offre, Spontanée, Stage, Reconversion).",
          badge: "Lettre de Motivation IA",
          icon: Mail,
          accentBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          price: "1 000 FCFA"
        };
      case 'facture':
        return {
          title: "Galerie Exclusive : Modèles de Facture Client UEMOA / OHADA",
          subtitle: "Modèles certifiés avec mentions légales sénégalaises (NINEA, RC, TVA 18%, arrêté en toutes lettres).",
          badge: "Facture Client OHADA",
          icon: Receipt,
          accentBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          price: "1 000 FCFA"
        };
      case 'devis':
        return {
          title: "Galerie Exclusive : Modèles de Devis Commercial Pro",
          subtitle: "Format conforme aux transactions B2B et B2C, conditions de règlement et validité de l'offre.",
          badge: "Devis Commercial Pro",
          icon: FileCheck,
          accentBg: "bg-teal-500/10 text-teal-400 border-teal-500/20",
          price: "1 000 FCFA"
        };
      case 'pack_business':
        return {
          title: "Galerie Exclusive : Pack Business Duo (Devis + Facture)",
          subtitle: "Générez simultanément un devis et une facture synchronisés avec la même charte graphique.",
          badge: "Pack Business Duo",
          icon: Package,
          accentBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
          price: "1 499 FCFA"
        };
      case 'ebook':
      default:
        return {
          title: "Galerie & Assistant : Ebook & Rapport Pro KDP",
          subtitle: "Mise en page automatique au standard A4 / 6x9 pouces avec table des matières et chapitres IA.",
          badge: "Ebook & Guide Numérique",
          icon: BookOpen,
          accentBg: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
          price: "3 000 FCFA"
        };
    }
  };

  const serviceInfo = getServiceInfo();
  const IconComponent = serviceInfo.icon;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
      
      {/* 1. TOP BREADCRUMB & RETURN TO DASHBOARD */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer hover:border-slate-600 border border-slate-700/60 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            <span>← Tableau de Bord</span>
          </button>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase border ${serviceInfo.accentBg}`}>
              {serviceInfo.badge}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">Étape 2 / 4 :</span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-black uppercase flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sélectionnez un modèle pour ouvrir l'éditeur</span>
          </span>
        </div>
      </div>

      {/* 2. DEDICATED GALLERY RENDERING (HERMETICALLY SEPARATED BY SERVICE) */}
      {activeService === 'cv' && (
        <CVTemplateGallery
          onSelectTemplate={(tplId, color) => onSelectCVTemplate(tplId, color)}
          onGoServices={onBackToDashboard}
        />
      )}

      {activeService === 'letter' && (
        <LetterTemplateGallery
          onSelectTemplate={(styleId, letterType) => onSelectLetterTemplate(styleId, letterType)}
          onGoServices={onBackToDashboard}
        />
      )}

      {(activeService === 'facture' || activeService === 'devis' || activeService === 'pack_business') && (
        <BusinessDocTemplateGallery
          docType={activeService}
          onSelectTemplate={(tplId, theme) => onSelectBusinessTemplate(activeService, tplId, theme)}
          onGoServices={onBackToDashboard}
        />
      )}

      {activeService === 'ebook' && (
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-fuchsia-600/20 text-fuchsia-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-black text-white">Générateur d'Ebook & Rapport Amazon KDP</h3>
            <p className="text-xs text-slate-400">
              Mise en page automatique au standard A4 / 6x9 pouces avec table des matières, chapitres et 4e de couverture.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={onSelectEbookTemplate}
              className="px-6 py-3.5 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs shadow-lg shadow-fuchsia-600/30 transition-all cursor-pointer"
            >
              Lancer l'assistant Ebook →
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

