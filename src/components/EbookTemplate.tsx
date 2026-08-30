import React from 'react';
import { EbookData, EbookCoverProposal, EbookBackCoverProposal } from '../types';
import { distributeChaptersIntoExactPages } from '../data/sampleEbookData';
import { BookOpen, Sparkles, User, Check, Quote, Bookmark, Clock, Award, Hash } from 'lucide-react';

interface EbookTemplateProps {
  data: EbookData;
  isEditingDirectly?: boolean;
  onUpdateData?: (newData: Partial<EbookData>) => void;
  unlocked?: boolean;
}

export const EbookTemplate: React.FC<EbookTemplateProps> = ({
  data,
  isEditingDirectly = false,
  onUpdateData,
  unlocked = true
}) => {
  const totalExactPages = Math.max(4, data?.targetPageCount || 10);
  const exactInteriorPages = distributeChaptersIntoExactPages(data);

  const frontMode = data?.frontCover?.mode || 'proposal';
  const selectedFrontIndex = data?.frontCover?.selectedIndex || 0;
  const currentFrontProposal: EbookCoverProposal = (data?.frontCover?.proposals && data.frontCover.proposals[selectedFrontIndex]) || {
    id: 'default-front',
    title: data?.title || "Mon Livre Numérique",
    subtitle: data?.subtitle || "Guide Pratique",
    author: data?.author || "Auteur",
    genreBadge: data?.genre || "Business",
    tagline: "Guide complet & actionnable",
    paletteName: "Prestige Indigo & Or",
    bgGradient: "from-slate-950 via-indigo-950 to-slate-900",
    bgPattern: "gold_frame",
    textColor: "#ffffff",
    subtitleColor: "#cbd5e1",
    accentColor: "#fbbf24",
    fontFamily: "serif",
    layoutVariant: "editorial"
  };

  const backMode = data?.backCover?.mode || 'proposal';
  const selectedBackIndex = data?.backCover?.selectedIndex || 0;
  const currentBackProposal: EbookBackCoverProposal = (data?.backCover?.proposals && data.backCover.proposals[selectedBackIndex]) || {
    id: 'default-back',
    synopsis: "Découvrez dans cet ouvrage les principes fondamentaux pour réussir.",
    authorBio: `${data?.author || 'L\'auteur'} est un spécialiste reconnu dans son domaine.`,
    keyTakeaways: ["Comprendre les bases", "Appliquer pas à pas", "Obtenir des résultats"],
    quoteOrCallToAction: "« La connaissance mise en pratique transforme les destins. »",
    isbnNumber: "978-2-84000-123-4",
    barcodeDigits: "9782840001234",
    bgGradient: "from-slate-950 via-indigo-950 to-slate-900",
    textColor: "#f8fafc",
    accentColor: "#fbbf24",
    layoutVariant: "card_synopsis"
  };

  const getFontFamilyClass = () => {
    if (data?.fontFamily === 'serif') return 'font-serif';
    if (data?.fontFamily === 'sans') return 'font-sans';
    return 'font-serif'; // Default to elegant book serif (Garamond/Merriweather feel)
  };

  const getCoverFontFamilyClass = (family?: string) => {
    if (family === 'serif') return 'font-serif';
    if (family === 'sans') return 'font-sans';
    if (family === 'display') return 'font-sans tracking-tight';
    if (family === 'mono') return 'font-mono';
    return 'font-serif';
  };

  return (
    <div 
      id="ebook-printable-area" 
      className={`kdp-printable-manuscript w-full max-w-[820px] mx-auto space-y-12 select-text ${getFontFamilyClass()}`}
    >

      {/* ========================================================================= */}
      {/* 1. FRONT COVER (PAGE 1 SUR N) - AUTO-ÉDITION 6x9 RATIO STANDARD          */}
      {/* ========================================================================= */}
      <div 
        id="ebook-page-1"
        className="kdp-page-break relative w-full aspect-[1/1.5] max-w-[620px] mx-auto rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between p-8 sm:p-12 text-white border-2 border-slate-800 transition-all duration-300"
        style={{
          backgroundImage: frontMode === 'uploaded' && data.frontCover.customImageUrl 
            ? `url(${data.frontCover.customImageUrl})` 
            : currentFrontProposal.artImageUrl 
              ? `url(${currentFrontProposal.artImageUrl})`
              : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          pageBreakAfter: 'always',
          breakAfter: 'page',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        {/* If using proposals: Gradient & Darkening Overlay Layer */}
        {!(frontMode === 'uploaded' && data.frontCover.customImageUrl) && (
          <div 
            className={`absolute inset-0 bg-gradient-to-br ${currentFrontProposal.bgGradient || 'from-slate-950 via-indigo-950 to-slate-900'} ${currentFrontProposal.artImageUrl ? 'bg-black/55 backdrop-brightness-75' : ''} -z-10`} 
          />
        )}

        {/* Decorative Gold / Minimalist Border Frame for 6x9 standard books */}
        <div className="absolute inset-4 sm:inset-6 border border-amber-400/30 rounded-xl pointer-events-none -z-0" />

        {/* Middle Body: Main Title & Subtitle */}
        <div className="relative z-10 text-center my-auto py-8 space-y-4">
          
          {/* Main Title */}
          <h1 
            className={`text-2xl sm:text-4xl md:text-5xl font-black leading-tight sm:leading-tight tracking-tight drop-shadow-lg ${getCoverFontFamilyClass(currentFrontProposal.fontFamily)}`}
            style={{ color: currentFrontProposal.textColor || '#ffffff' }}
          >
            {data.title || currentFrontProposal.title}
          </h1>

          {/* Golden Divider Line */}
          <div className="w-16 h-1 mx-auto rounded-full shadow-sm" style={{ backgroundColor: currentFrontProposal.accentColor || '#fbbf24' }} />

          {/* Subtitle */}
          {(data.subtitle || currentFrontProposal.subtitle) && (
            <p 
              className="text-sm sm:text-lg font-medium max-w-md mx-auto leading-relaxed drop-shadow-md text-slate-100"
              style={{ color: currentFrontProposal.subtitleColor || '#e2e8f0' }}
            >
              {data.subtitle || currentFrontProposal.subtitle}
            </p>
          )}

          {/* Tagline / Icon */}
          {currentFrontProposal.tagline && (
            <p className="text-xs sm:text-sm font-semibold tracking-wide italic opacity-95 pt-2 drop-shadow-xs" style={{ color: currentFrontProposal.accentColor || '#fbbf24' }}>
              « {currentFrontProposal.tagline} »
            </p>
          )}
        </div>

        {/* Bottom Footer: Author */}
        <div className="relative z-10 flex items-center justify-center pt-6 border-t border-white/20">
          <div className="flex items-center gap-2.5 text-center">
            <div className="w-8 h-8 rounded-full bg-black/50 border border-white/30 flex items-center justify-center text-amber-300">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300 block">Auteur</span>
              <span className="text-sm sm:text-base font-black tracking-wide text-white drop-shadow-xs">
                {data.author || currentFrontProposal.author}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TITLE PAGE & COPYRIGHT (PAGE 2 SUR N : GARDE & MENTIONS LÉGALES)       */}
      {/* ========================================================================= */}
      <div 
        id="ebook-page-2"
        className="kdp-page-break bg-white text-slate-900 p-10 sm:p-16 min-h-[900px] flex flex-col justify-between text-left shadow-sm border border-slate-100"
        style={{
          backgroundColor: '#ffffff',
          color: '#1a1a1a',
          pageBreakAfter: 'always',
          breakAfter: 'page',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        {/* Title Top Half */}
        <div className="pt-16 text-center space-y-6">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Édition Numérique</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 max-w-lg mx-auto tracking-tight font-serif leading-tight">
            {data.title}
          </h2>
          {data.subtitle && (
            <p className="text-base sm:text-lg text-slate-600 max-w-md mx-auto italic font-serif leading-relaxed">
              {data.subtitle}
            </p>
          )}
          <div className="w-16 h-px bg-slate-300 mx-auto my-6" />
          <p className="text-lg sm:text-xl font-bold text-slate-900 pt-2 font-serif">
            {data.author}
          </p>
        </div>

        {/* Legal & Self-Publishing Mentions */}
        <div className="pt-16 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-3 max-w-md font-serif">
          <p className="font-semibold text-slate-800">
            © {new Date().getFullYear()} {data.author}. Tous droits réservés.
          </p>
          <p className="leading-relaxed text-justify">
            Aucune partie de cette publication ne peut être reproduite, distribuée ou transmise sous quelque forme ou par quelque moyen que ce soit, y compris la photocopie, l'enregistrement ou d'autres méthodes électroniques ou mécaniques, sans l'autorisation écrite préalable de l'auteur.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3 text-slate-600 text-[11px]">
            <span>Format : Ouvrage Imprimé & Numérique (6×9 po)</span>
            <span>•</span>
            <span>Langue : {data.language || 'Français'}</span>
            <span>•</span>
            <span>ISBN : {currentBackProposal.isbnNumber || '978-2-84000-123-4'}</span>
          </div>

          <div className="pt-6 flex items-center justify-between text-[11px] text-slate-400 font-sans border-t border-slate-100">
            <span>{data.author}</span>
            <span>Page 2 sur {totalExactPages}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TABLE OF CONTENTS (PAGE 3 SUR N : SOMMAIRE STRUCTURÉ)                 */}
      {/* ========================================================================= */}
      <div 
        id="ebook-page-3"
        className="kdp-page-break bg-white text-slate-900 p-10 sm:p-16 min-h-[900px] flex flex-col justify-between shadow-sm border border-slate-100"
        style={{
          backgroundColor: '#ffffff',
          color: '#1a1a1a',
          pageBreakAfter: 'always',
          breakAfter: 'page',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        <div className="space-y-8">
          <div className="border-b border-slate-200 pb-5 text-center sm:text-left">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 block mb-1">Structure de l'ouvrage</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 font-serif">Table des Matières</h2>
          </div>

          {/* TOC List with exact page references - Clean book layout */}
          <div className="space-y-3 pt-2">
            {data.tableOfContents && data.tableOfContents.map((toc, idx) => {
              const matchedPage = exactInteriorPages.find(p => p.chapterNumber === toc.chapterNumber);
              const targetPageNumber = matchedPage ? matchedPage.pageNumber : Math.min(totalExactPages - 1, 4 + idx);
              return (
                <div 
                  key={toc.id || `toc-${idx}`}
                  className="flex items-baseline justify-between py-2 border-b border-dotted border-slate-200"
                >
                  <div className="flex items-baseline gap-2 max-w-[85%]">
                    <span className="text-sm font-black text-slate-900 font-serif">
                      Chapitre {toc.chapterNumber || (idx + 1)}.
                    </span>
                    <span className="text-sm font-semibold text-slate-900 font-serif">
                      {toc.title}
                    </span>
                  </div>

                  {/* Page number */}
                  <div className="text-xs font-bold text-slate-700 shrink-0 font-mono">
                    {targetPageNumber}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Running Footer Page 3 */}
        <div className="pt-6 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 font-sans">
          <span>{data.author}</span>
          <span>Page 3 sur {totalExactPages}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. EXACT INTERIOR PAGES (PAGES 4 À N-1 : RÉDACTION ÉDITORIALE FLUIDE)     */}
      {/* ========================================================================= */}
      {exactInteriorPages.map((page) => (
        <article 
          key={`interior-page-${page.pageNumber}`}
          id={`ebook-page-${page.pageNumber}`}
          className="kdp-page-break bg-white text-slate-900 p-10 sm:p-16 min-h-[920px] flex flex-col justify-between shadow-sm border border-slate-100"
          style={{
            backgroundColor: '#ffffff',
            color: '#1a1a1a',
            pageBreakAfter: 'always',
            breakAfter: 'page',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}
        >
          {/* Main Interior Page Content */}
          <div>
            {/* Chapter Header Section - Natural in-page title without box */}
            {page.isChapterStart ? (
              <header className="pt-6 pb-8 text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500 font-sans block">
                  Chapitre {page.chapterNumber}
                </span>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-950 tracking-tight font-serif leading-tight max-w-xl mx-auto">
                  {page.pageHeaderTitle}
                </h2>
                
                {page.chapterSubtitle && (
                  <p className="text-sm sm:text-base text-slate-600 italic font-serif max-w-lg mx-auto pt-1">
                    {page.chapterSubtitle}
                  </p>
                )}

                <div className="w-12 h-px bg-slate-300 mx-auto mt-4" />
              </header>
            ) : (
              <div className="pt-2 pb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-sans block mb-1">
                  Chapitre {page.chapterNumber} (Suite)
                </span>
                <h3 className="text-lg font-black text-slate-900 font-serif mb-4">
                  {page.pageHeaderTitle}
                </h3>
              </div>
            )}

            {/* Chapter Body Content (Fluid standard editorial typography, justified) */}
            <div className="text-slate-900 text-[15px] sm:text-[16px] leading-[1.8] space-y-5 pt-2 font-serif text-justify">
              {page.paragraphs.map((paragraph, pIdx) => {
                const trimmed = paragraph.trim();
                if (!trimmed) return null;

                // Subheading H2
                if (trimmed.startsWith('## ')) {
                  return (
                    <h3 key={pIdx} className="text-xl sm:text-2xl font-bold text-slate-950 font-serif pt-6 pb-2 text-left">
                      {trimmed.replace('## ', '')}
                    </h3>
                  );
                }

                // Subheading H3
                if (trimmed.startsWith('### ')) {
                  return (
                    <h4 key={pIdx} className="text-base sm:text-lg font-bold text-slate-900 font-serif pt-4 pb-1 text-left">
                      {trimmed.replace('### ', '')}
                    </h4>
                  );
                }

                // Blockquote / Citation - Clean editorial line
                if (trimmed.startsWith('>')) {
                  return (
                    <blockquote key={pIdx} className="my-6 py-2 px-6 border-l-2 border-slate-900 text-slate-800 italic text-[15px] sm:text-base font-serif">
                      « {trimmed.replace(/^>\s*/, '').replace(/[*_]/g, '')} »
                    </blockquote>
                  );
                }

                // Bullet points or numbers
                if (trimmed.includes('\n- ') || trimmed.includes('\n1. ') || trimmed.startsWith('- ') || trimmed.startsWith('1. ')) {
                  const lines = trimmed.split('\n');
                  return (
                    <ul key={pIdx} className="space-y-2 my-4 pl-6 list-disc marker:text-slate-800 text-slate-900">
                      {lines.map((line, lIdx) => (
                        <li key={lIdx} className="pl-1">
                          {line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '')}
                        </li>
                      ))}
                    </ul>
                  );
                }

                // Standard Paragraph with Drop Cap for first paragraph of chapter start
                if (page.isChapterStart && pIdx === 0 && trimmed.length > 20) {
                  const firstLetter = trimmed.charAt(0);
                  const restOfParagraph = trimmed.slice(1);
                  return (
                    <p key={pIdx} className="text-justify leading-[1.85] indent-0">
                      <span className="float-left text-5xl sm:text-6xl font-bold font-serif text-slate-950 leading-none pr-3 pt-1">
                        {firstLetter}
                      </span>
                      {restOfParagraph}
                    </p>
                  );
                }

                return (
                  <p key={pIdx} className="text-justify leading-[1.8] indent-6">
                    {trimmed}
                  </p>
                );
              })}
            </div>

            {/* Key Takeaways if present on page - Subtle, non-card book presentation */}
            {page.keyTakeaways && page.keyTakeaways.length > 0 && (
              <div className="kdp-no-break mt-8 pt-5 border-t border-slate-200 text-slate-900 space-y-2 font-serif">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Synthèse du chapitre :
                </div>
                <ul className="space-y-1.5 text-xs sm:text-sm pl-4 list-disc text-slate-800">
                  {page.keyTakeaways.map((point, ptIdx) => (
                    <li key={ptIdx} className="leading-relaxed">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Running Footer Page Number */}
          <div className="pt-6 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-400 font-sans">
            <span>{data.author}</span>
            <span className="font-semibold text-slate-600 font-mono">Page {page.pageNumber} sur {totalExactPages}</span>
          </div>
        </article>
      ))}

      {/* ========================================================================= */}
      {/* 5. BACK COVER (PAGE N SUR N : 4e DE COUVERTURE)                           */}
      {/* ========================================================================= */}
      <div 
        id={`ebook-page-${totalExactPages}`}
        className="kdp-page-break relative w-full aspect-[1/1.5] max-w-[620px] mx-auto rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between p-8 sm:p-12 text-white border-2 border-slate-800 transition-all duration-300"
        style={{
          backgroundImage: backMode === 'uploaded' && data.backCover.customImageUrl 
            ? `url(${data.backCover.customImageUrl})` 
            : currentBackProposal.artImageUrl 
              ? `url(${currentBackProposal.artImageUrl})`
              : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        {/* Background Gradient if not uploaded */}
        {!(backMode === 'uploaded' && data.backCover.customImageUrl) && (
          <div 
            className={`absolute inset-0 bg-gradient-to-br ${currentBackProposal.bgGradient || 'from-slate-950 via-indigo-950 to-slate-900'} ${currentBackProposal.artImageUrl ? 'bg-black/65 backdrop-brightness-75' : ''} -z-10`} 
          />
        )}

        {/* Top Header: Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span 
              className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.6)', 
                color: currentBackProposal.accentColor || '#fbbf24',
                borderColor: `${currentBackProposal.accentColor || '#fbbf24'}40`
              }}
            >
              Quatrième de Couverture
            </span>

            {currentBackProposal.artStyleLabel && (
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-slate-200 border border-white/20 backdrop-blur-xs">
                {currentBackProposal.artStyleLabel}
              </span>
            )}
          </div>

          <span className="text-[11px] font-bold text-slate-300 bg-black/40 px-2 py-0.5 rounded border border-white/10">
            Page {totalExactPages} sur {totalExactPages}
          </span>
        </div>

        {/* Middle Content: Synopsis + Key Takeaways + Author Bio */}
        <div className="relative z-10 my-auto py-4 space-y-4 text-left">
          
          {/* Main Synopsis / Pitch */}
          <div className="p-4 sm:p-5 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-xs space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
              Résumé de l'ouvrage
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-100 line-clamp-6">
              {currentBackProposal.synopsis}
            </p>
          </div>

          {/* Key Bullet Points */}
          {currentBackProposal.keyTakeaways && currentBackProposal.keyTakeaways.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Dans ce livre, vous découvrirez :
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {currentBackProposal.keyTakeaways.slice(0, 3).map((kw, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-200">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{kw}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Author Bio Box */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-1">
            <span className="font-bold text-white block">À propos de l'auteur :</span>
            <p className="line-clamp-2 leading-relaxed">
              {currentBackProposal.authorBio}
            </p>
          </div>

          {/* Motivational Quote */}
          {currentBackProposal.quoteOrCallToAction && (
            <p className="text-xs italic text-center font-serif text-amber-200/90 pt-1">
              {currentBackProposal.quoteOrCallToAction}
            </p>
          )}

        </div>

        {/* Bottom Bar: Barcode, ISBN & Publisher Logo */}
        <div className="relative z-10 flex items-center justify-between gap-4 pt-4 border-t border-white/10">
          
          {/* Barcode representation */}
          <div className="bg-white text-slate-950 p-2 rounded-lg shadow flex flex-col items-center">
            {/* Visual Barcode Lines */}
            <div className="flex items-center h-8 gap-[2px] px-1">
              {[4,2,6,1,3,5,2,4,1,6,3,2,5,1,4,2,6,3,1,5,2,4].map((h, bIdx) => (
                <div key={bIdx} className="bg-slate-900 w-[2px]" style={{ height: `${h * 4}px` }} />
              ))}
            </div>
            <span className="text-[9px] font-mono font-bold tracking-widest text-slate-900 mt-0.5">
              {currentBackProposal.barcodeDigits || '9782840001234'}
            </span>
          </div>

          {/* ISBN & Category Text */}
          <div className="text-right text-[10px] text-slate-400 space-y-0.5">
            <span className="block font-bold text-white">Édition Broché & Numérique</span>
            <span>ISBN : {currentBackProposal.isbnNumber || '978-2-84000-123-4'}</span>
            <span className="block text-amber-400 font-bold">Prix : 1 500 FCFA</span>
          </div>

        </div>

      </div>

    </div>
  );
};
