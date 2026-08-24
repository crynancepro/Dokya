import React from 'react';
import { 
  FileText, Mail, FileCheck, Receipt, Sparkles, 
  CheckCircle2, ArrowRight, ShieldCheck, Zap, 
  Layers, Package, Star, Clock, CreditCard, User, Download, FileCode, BookOpen
} from 'lucide-react';

interface ServicesOverviewBannerProps {
  currentTab: string;
  onSelectService: (service: 'cv' | 'letter' | 'full_pack' | 'devis' | 'facture' | 'pack_business' | 'ebook' | 'dashboard') => void;
  onOpenRecharge?: () => void;
  onLoadSample?: () => void;
}

export const ServicesOverviewBanner: React.FC<ServicesOverviewBannerProps> = ({
  currentTab,
  onSelectService,
  onOpenRecharge,
  onLoadSample
}) => {
  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      
      {/* HERO / WELCOME HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white border border-indigo-900/40 shadow-2xl p-6 sm:p-8 lg:p-10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center gap-2.5 flex-wrap mb-3.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-500/25 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              Dokya & Business AI Suite
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              100% Conforme Sénégal & UEMOA
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Les 4 Services Professionnels de notre Plateforme
          </h1>
          
          <p className="text-sm sm:text-base text-slate-300 mt-3 max-w-2xl leading-relaxed">
            Choisissez le document dont vous avez besoin ci-dessous. Rédaction et mise en page propulsées par l'Intelligence Artificielle, téléchargement instantané en <strong className="text-white">PDF Haute Définition</strong> et <strong className="text-white">Word (.docx)</strong>.
          </p>

          {/* Quick highlights bar */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Paiement mobile instantané : <strong>Wave • Orange Money • Free Money</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Mentions légales & conformité RH sénégalaise</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: THE 4 DISTINCT SERVICES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs font-black text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Layers className="w-4 h-4" />
              <span>Catalogue des Services</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Choisissez votre service pour démarrer
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {onLoadSample && (
              <button
                type="button"
                onClick={onLoadSample}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Charger un exemple</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectService('dashboard')}
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>Mon Espace Candidat</span>
            </button>
          </div>
        </div>

        {/* 5 LARGE STRUCTURED SERVICE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
          
          {/* SERVICE 1: CV PROFESSIONNEL ATS */}
          <div 
            onClick={() => onSelectService('cv')}
            className="group relative bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-indigo-600 hover:shadow-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            <div>
              {/* Header card */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-indigo-700">1 000 FCFA</div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Tarif unique</span>
                </div>
              </div>

              {/* Title & Badge */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                  1. CV Pro ATS
                </h3>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded-full">
                  Emploi
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Création de CV moderne optimisé pour passer les filtres des logiciels recruteurs ATS au Sénégal et à l'international.
              </p>

              {/* Key Features List */}
              <div className="bg-slate-50 rounded-2xl p-3.5 mb-5 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>20 modèles</strong> pros (avec ou sans photo)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Score ATS & Mots-clés IA métiers</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Export <strong>PDF HD & Word (.docx)</strong></span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 group-hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer"
            >
              <span>Créer mon CV Pro (1 000 F)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* SERVICE 2: LETTRE DE MOTIVATION CIBLÉE */}
          <div 
            onClick={() => onSelectService('letter')}
            className="group relative bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-blue-600 hover:shadow-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            <div>
              {/* Header card */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-blue-700">1 000 FCFA</div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Tarif unique</span>
                </div>
              </div>

              {/* Title & Badge */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                  2. Lettre Ciblée
                </h3>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-full">
                  5 Formats
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Rédaction personnalisée et persuasive adaptée précisément à l'offre d'emploi ou à l'entreprise ciblée.
              </p>

              {/* Key Features List */}
              <div className="bg-slate-50 rounded-2xl p-3.5 mb-5 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Réponse à offre & Candidature spontanée</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Stages, reconversion & parrainage</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Formules de politesse sénégalaises</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              className="w-full py-3 px-4 rounded-2xl bg-blue-600 group-hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition-all cursor-pointer"
            >
              <span>Rédiger ma Lettre (1 000 F)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* SERVICE 3: DEVIS PROFESSIONNEL */}
          <div 
            onClick={() => onSelectService('devis')}
            className="group relative bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-amber-500 hover:shadow-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            <div>
              {/* Header card */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-amber-700">1 000 FCFA</div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Tarif unique</span>
                </div>
              </div>

              {/* Title & Badge */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                  3. Devis Pro
                </h3>
                <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                  Commercial
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Devis commercial conforme aux normes sénégalaises avec mentions légales NINEA, RCCM et calculs automatiques.
              </p>

              {/* Key Features List */}
              <div className="bg-slate-50 rounded-2xl p-3.5 mb-5 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Mentions NINEA, RCCM & Adresse Dakar</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Calcul automatique HT, TVA 18% & TTC</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Validité de l'offre & Acompte au choix</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              className="w-full py-3 px-4 rounded-2xl bg-amber-500 group-hover:bg-amber-600 text-black text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-amber-200 transition-all cursor-pointer"
            >
              <span>Établir un Devis (1 000 F)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* SERVICE 4: FACTURE CLIENT & ENCAISSEMENT */}
          <div 
            onClick={() => onSelectService('facture')}
            className="group relative bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-emerald-600 hover:shadow-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            <div>
              {/* Header card */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                  <Receipt className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-emerald-700">1 000 FCFA</div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Tarif unique</span>
                </div>
              </div>

              {/* Title & Badge */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                  4. Facture Client
                </h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full">
                  Encaissement
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Facture officielle numérotée avec intégration des coordonnées Wave, Orange Money et RIB bancaire.
              </p>

              {/* Key Features List */}
              <div className="bg-slate-50 rounded-2xl p-3.5 mb-5 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Numéro officiel FAC-2026 & Échéance</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Paiements Wave, Orange Money & IBAN</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Design certifié prêt à imprimer / envoyer</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition-all cursor-pointer"
            >
              <span>Émettre une Facture (1 000 F)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* SERVICE 5: EBOOK & LIVRE NUMÉRIQUE */}
          <div 
            onClick={() => onSelectService('ebook')}
            className="group relative bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-purple-600 hover:shadow-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            <div>
              {/* Header card */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-purple-700">1 500 FCFA</div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Tarif unique</span>
                </div>
              </div>

              {/* Title & Badge */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-black text-slate-900 group-hover:text-purple-600 transition-colors">
                  5. Ebook & Livre
                </h3>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-extrabold px-2 py-0.5 rounded-full">
                  Nouveau
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Génération complète de livre numérique : 4 propositions de couverture, quatrième de couverture et rédaction des chapitres par l'IA.
              </p>

              {/* Key Features List */}
              <div className="bg-slate-50 rounded-2xl p-3.5 mb-5 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>4 Couvertures avant</strong> au choix + upload</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>4e de couverture</strong> (Pitch, Bio & ISBN)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Format <strong>Auto-Édition 6x9</strong> & multilingue</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              className="w-full py-3 px-4 rounded-2xl bg-purple-600 group-hover:bg-purple-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-purple-200 transition-all cursor-pointer"
            >
              <span>Créer mon Ebook (1 500 F)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </section>

      {/* SECTION: 3 FORMULES ÉCONOMIQUES & PACKS */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-amber-700 uppercase tracking-wider">
          <Package className="w-4 h-4" />
          <span>Nos Formules Avantageuses & Packs Économiques</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* PACK 1 */}
          <div 
            onClick={() => onSelectService('full_pack')}
            className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 to-white border-2 border-indigo-200 hover:border-indigo-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-md">
                  Pack Emploi (CV + Lettre)
                </span>
                <div className="text-right">
                  <span className="text-base font-black text-indigo-700">1 399 FCFA</span>
                  <span className="text-[10px] text-slate-400 line-through ml-1.5">2 000 F</span>
                </div>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 mb-1">CV Pro ATS + Lettre de Motivation</h4>
              <p className="text-xs text-slate-600 mb-3">
                Générez votre CV et votre lettre synchronisés pour postuler immédiatement avec un dossier complet.
              </p>
            </div>
            <div className="text-xs font-black text-indigo-600 flex items-center gap-1 mt-2">
              <span>Sélectionner ce Pack (1 399 F)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* PACK 2 */}
          <div 
            onClick={() => onSelectService('pack_business')}
            className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/90 to-white border-2 border-amber-300 hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-md">
                  Pack Business (Devis + Facture)
                </span>
                <div className="text-right">
                  <span className="text-base font-black text-amber-800">1 499 FCFA</span>
                  <span className="text-[10px] text-slate-400 line-through ml-1.5">2 000 F</span>
                </div>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 mb-1">Devis Professionnel + Facture Client</h4>
              <p className="text-xs text-slate-600 mb-3">
                Idéal pour prestataires, consultants, freelances et PME pour chiffrer et encaisser sereinement.
              </p>
            </div>
            <div className="text-xs font-black text-amber-700 flex items-center gap-1 mt-2">
              <span>Sélectionner ce Pack (1 499 F)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* PACK 3 */}
          <div 
            onClick={() => {
              if (onOpenRecharge) onOpenRecharge();
              else onSelectService('cv');
            }}
            className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-2 border-indigo-700 hover:border-amber-400 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <Star className="w-3 h-3 fill-slate-950" />
                  Pass Illimité
                </span>
                <div className="text-right">
                  <span className="text-base font-black text-amber-300">3 499 FCFA <span className="text-[10px] font-normal text-slate-300">/mois</span></span>
                  <span className="text-[10px] text-amber-200/80 block">ou 39 999 F / an</span>
                </div>
              </div>
              <h4 className="text-sm font-extrabold text-white mb-1">Accès Illimité aux 4 Services</h4>
              <p className="text-xs text-slate-300 mb-3">
                Générez et téléchargez autant de CV, Lettres, Devis et Factures que vous voulez sans restriction.
              </p>
            </div>
            <div className="text-xs font-black text-amber-300 flex items-center gap-1 mt-2">
              <span>Activer le Pass Illimité</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

        </div>
      </section>

      {/* TRUST & CONFIRMATION GUARANTEES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-xs font-black text-slate-900">Génération Instantanée</div>
          <div className="text-[11px] text-slate-500 mt-0.5">En moins de 30 secondes</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <Download className="w-4 h-4" />
          </div>
          <div className="text-xs font-black text-slate-900">PDF HD & Word .docx</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Téléchargement direct</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="text-xs font-black text-slate-900">Paiements Locaux</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Wave, OM & Free Money</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs font-black text-slate-900">100% Conforme UEMOA</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Normes Sénégal & OHADA</div>
        </div>
      </div>

    </div>
  );
};
