import React, { useState, useRef } from 'react';
import { 
  motion, 
  useMotionValue, 
  useTransform, 
  useSpring, 
  AnimatePresence 
} from 'motion/react';
import { 
  Sparkles, FileText, CheckCircle, Zap, ShieldCheck, 
  ArrowRight, Award, Star, Layers, Mail, Eye, Download, Check
} from 'lucide-react';

interface Hero3DShowcaseProps {
  onStartForm: () => void;
  onLoadSample: () => void;
}

export const Hero3DShowcase: React.FC<Hero3DShowcaseProps> = ({
  onStartForm,
  onLoadSample
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [active3DTab, setActive3DTab] = useState<'cv' | 'letter'>('cv');

  // Motion values for smooth 3D tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for rotation
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 25 });

  // Map mouse offsets to degrees of rotation
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['14deg', '-14deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-14deg', '14deg']);

  // Parallax translation for floating badges
  const badge1X = useTransform(mouseXSpring, [-0.5, 0.5], ['-12px', '12px']);
  const badge1Y = useTransform(mouseYSpring, [-0.5, 0.5], ['-12px', '12px']);
  
  const badge2X = useTransform(mouseXSpring, [-0.5, 0.5], ['15px', '-15px']);
  const badge2Y = useTransform(mouseYSpring, [-0.5, 0.5], ['15px', '-15px']);

  const badge3X = useTransform(mouseXSpring, [-0.5, 0.5], ['-8px', '8px']);
  const badge3Y = useTransform(mouseYSpring, [-0.5, 0.5], ['8px', '-8px']);

  // Handle Mouse Movement over 3D Stage
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <div className="relative bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-indigo-900/50 shadow-2xl overflow-hidden mb-8">
      {/* Dynamic Background Glows & Grid */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b15_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* LEFT COLUMN: HERO TEXT & CTAS */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-7 space-y-6 text-center lg:text-left"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wide shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Nouveau : IA Gemini 2.0 & Normes UEMOA 2026</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Créez un <span className="bg-gradient-to-r from-indigo-300 via-amber-200 to-emerald-400 bg-clip-text text-transparent">CV Pro ATS & Lettre</span> d'exception
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-300 max-w-xl font-normal leading-relaxed mx-auto lg:mx-0">
            Optimisé par l'intelligence artificielle pour passer haut la main les filtres ATS au Sénégal et à l'international. Formats exportables prêts en PDF & Word (.docx).
          </p>

          {/* Feature Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 max-w-lg mx-auto lg:mx-0 text-left">
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-xl backdrop-blur-sm">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-slate-200 font-semibold">98% Conforme ATS</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-xl backdrop-blur-sm">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs text-slate-200 font-semibold">Export PDF & DOCX</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-xl col-span-2 sm:col-span-1 backdrop-blur-sm">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs text-slate-200 font-semibold">Génération 3 min</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
            <button
              type="button"
              onClick={onStartForm}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Remplir Mon Formulaire</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onLoadSample}
              className="w-full sm:w-auto px-5 py-3.5 bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Charger un Exemple Gratuit</span>
            </button>
          </div>

        </motion.div>

        {/* RIGHT COLUMN: INTERACTIVE 3D CARD SHOWCASE WITH FRAMER-MOTION PARALLAX */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center pt-4 lg:pt-0">
          
          {/* 3D Mode Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl mb-4 text-xs font-bold shadow-lg">
            <button
              type="button"
              onClick={() => setActive3DTab('cv')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                active3DTab === 'cv' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CV ATS 3D
            </button>
            <button
              type="button"
              onClick={() => setActive3DTab('letter')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                active3DTab === 'letter' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lettre 3D
            </button>
          </div>

          {/* Interactive 3D Perspective Box */}
          <div 
            className="w-full max-w-sm py-4 cursor-pointer"
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: 1200 }}
          >
            <motion.div
              ref={cardRef}
              style={{
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
              }}
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative w-full rounded-2xl"
            >
              {/* MAIN 3D DOCUMENT CANVAS */}
              <div 
                className="relative bg-slate-900/90 border-2 border-indigo-500/60 rounded-2xl p-6 shadow-2xl space-y-4 backdrop-blur-xl overflow-hidden"
                style={{ transform: 'translateZ(0px)' }}
              >
                {/* Dynamic Glossy Shine Spotlight Following Mouse */}
                <motion.div 
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                  style={{
                    background: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.12), transparent 40%)',
                    opacity: isHovered ? 1 : 0.2
                  }}
                />

                {/* Animated Document Tab Content */}
                <AnimatePresence mode="wait">
                  {active3DTab === 'cv' && (
                    <motion.div
                      key="cv"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      {/* Header Mockup */}
                      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-amber-400 flex items-center justify-center font-black text-white text-sm shadow-md">
                          CV
                        </div>
                        <div className="space-y-1">
                          <div className="h-3.5 w-36 bg-slate-100 rounded-full font-bold text-[11px] text-slate-900 px-2 flex items-center shadow-sm">
                            Mamadou DIOP
                          </div>
                          <div className="h-2.5 w-28 bg-indigo-400/80 rounded-full" />
                        </div>
                      </div>

                      {/* Body Lines Mockup */}
                      <div className="space-y-2.5 text-left">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <span>Expériences Professionnelles</span>
                          <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> IA Gemini
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full" />
                        <div className="h-2 w-4/5 bg-slate-800 rounded-full" />
                        <div className="h-2 w-3/4 bg-indigo-950 rounded-full border border-indigo-800/80" />
                      </div>

                      {/* Skills tags Mockup */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                          Gestion de Projet
                        </span>
                        <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                          Sage ERP 100
                        </span>
                        <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                          Score ATS 98%
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {active3DTab === 'letter' && (
                    <motion.div
                      key="letter"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      {/* Header Mockup */}
                      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center font-black text-white text-sm shadow-md">
                          LM
                        </div>
                        <div className="space-y-1">
                          <div className="h-3.5 w-32 bg-slate-100 rounded-full font-bold text-[11px] text-slate-900 px-2 flex items-center shadow-sm">
                            Lettre de Motivation
                          </div>
                          <div className="h-2.5 w-24 bg-amber-400/80 rounded-full" />
                        </div>
                      </div>

                      {/* Body Lines Mockup */}
                      <div className="space-y-2 text-left">
                        <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                          Objet : Candidature au poste de Manager
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full" />
                        <div className="h-2 w-full bg-slate-800 rounded-full" />
                        <div className="h-2 w-5/6 bg-slate-800 rounded-full" />
                        <div className="h-2 w-3/4 bg-amber-950 rounded-full border border-amber-800/80" />
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                          Structure AIDA Persuasive
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer Status */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-[10px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle className="w-3 h-3" /> Conforme Normes Sénégal & UEMOA
                  </span>
                  <span className="text-indigo-300 font-bold">PDF & Word</span>
                </div>

              </div>

              {/* FLOATING 3D PARALLAX BADGE #1: Score ATS (Pop out in Z-space) */}
              <motion.div 
                style={{
                  x: badge1X,
                  y: badge1Y,
                  transform: 'translateZ(65px)',
                }}
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs px-3.5 py-2 rounded-2xl shadow-2xl border border-emerald-300 flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform"
              >
                <Star className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>Score ATS 98%</span>
              </motion.div>

              {/* FLOATING 3D PARALLAX BADGE #2: Pack Status */}
              <motion.div 
                style={{
                  x: badge2X,
                  y: badge2Y,
                  transform: 'translateZ(80px)',
                }}
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                className="absolute -bottom-5 -left-4 bg-slate-950/95 border-2 border-indigo-500 text-indigo-200 font-extrabold text-[11px] px-3.5 py-2 rounded-2xl shadow-2xl flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-amber-400" />
                <span>
                  {active3DTab === 'pack' 
                    ? 'Pack CV + Lettre' 
                    : active3DTab === 'letter' 
                    ? 'Lettre de Motivation' 
                    : 'CV Pro UEMOA'}
                </span>
              </motion.div>

              {/* FLOATING 3D PARALLAX BADGE #3: Gemini IA Badge */}
              <motion.div 
                style={{
                  x: badge3X,
                  y: badge3Y,
                  transform: 'translateZ(45px)',
                }}
                className="absolute top-1/2 -right-5 -translate-y-1/2 bg-gradient-to-r from-indigo-950 to-slate-900 border border-indigo-400/80 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                <span>Gemini IA 2.0</span>
              </motion.div>

            </motion.div>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-medium">
            <span>💡 Survolez avec votre souris pour l'effet de parallaxe 3D</span>
          </p>

        </div>

      </div>
    </div>
  );
};
