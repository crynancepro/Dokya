import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Clock, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  RefreshCw, 
  FileText, 
  Download, 
  AlertCircle, 
  CreditCard,
  Layers,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { CandidateProfile, SavedUserDocument } from '../types';

interface MySubscriptionViewProps {
  profile: CandidateProfile;
  documents: SavedUserDocument[];
  onGoToPricing: () => void;
  onSubscribePlan: (plan: 'weekly' | 'monthly' | 'annual', price: number, planName: string) => void;
  onOpenRecharge: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
}

export const MySubscriptionView: React.FC<MySubscriptionViewProps> = ({
  profile,
  documents = [],
  onGoToPricing,
  onSubscribePlan,
  onOpenRecharge
}) => {
  const [now, setNow] = useState<number>(Date.now());

  // Update real-time countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const subscription = profile?.subscription;
  const isSubscriptionDefined = !!subscription && subscription.planId !== 'none';
  
  // Calculate remaining time
  const calculateRemaining = (): TimeRemaining => {
    if (!subscription?.expiresAt) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true };
    }
    const expireTime = new Date(subscription.expiresAt).getTime();
    const diff = expireTime - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, totalMs: diff, isExpired: false };
  };

  const remaining = calculateRemaining();
  const isCurrentlyActive = isSubscriptionDefined && !remaining.isExpired && subscription.status === 'active';

  // Calculate duration progress percentage
  let durationProgress = 0;
  if (subscription?.startedAt && subscription?.expiresAt) {
    const startMs = new Date(subscription.startedAt).getTime();
    const endMs = new Date(subscription.expiresAt).getTime();
    const totalDuration = endMs - startMs;
    if (totalDuration > 0) {
      const elapsed = now - startMs;
      durationProgress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
    }
  }

  // Format date helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Non définie';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div id="my-subscription-view" className="space-y-8 animate-in fade-in max-w-5xl mx-auto pb-12">
      
      {/* 1. TOP STATUS HEADER */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Mon Abonnement & Privilèges VIP
            </h1>
            {isCurrentlyActive ? (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                🟢 Actif
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                ⚪ Standard / À l'acte
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gérez votre abonnement, suivez la validité en temps réel et débloquez les fonctionnalités illimitées.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToPricing}
          className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
        >
          <CreditCard className="w-4 h-4" />
          <span>Voir la Grille Tarifaire</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CASE A: USER HAS AN ACTIVE VIP SUBSCRIPTION                               */}
      {/* ========================================================================= */}
      {isCurrentlyActive ? (
        <div className="space-y-6">
          
          {/* Main Active Subscription Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-2 border-amber-400/80 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Plan Title & Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                    Formule Souscrite
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {subscription?.planName || 'Pass VIP Dokya AI'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950 flex items-center gap-1.5 shadow-md">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pass Actif & Illimité</span>
                </span>
              </div>
            </div>

            {/* DYNAMIC REAL-TIME COUNTDOWN TIMER */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                  Temps restant avant expiration (Compteur direct)
                </span>
                <span className="text-amber-400 font-black font-mono">
                  {remaining.days}j {remaining.hours}h {remaining.minutes}m {remaining.seconds}s
                </span>
              </div>

              {/* Digital Numbers Grid */}
              <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                  <p className="text-xl sm:text-3xl font-black text-white font-mono">{remaining.days}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Jours</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                  <p className="text-xl sm:text-3xl font-black text-white font-mono">{String(remaining.hours).padStart(2, '0')}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Heures</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                  <p className="text-xl sm:text-3xl font-black text-white font-mono">{String(remaining.minutes).padStart(2, '0')}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Minutes</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                  <p className="text-xl sm:text-3xl font-black text-amber-400 font-mono">{String(remaining.seconds).padStart(2, '0')}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Secondes</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Activation : {formatDate(subscription?.startedAt)}</span>
                  <span>Expiration : {formatDate(subscription?.expiresAt)}</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500 rounded-full transition-all duration-1000"
                    style={{ width: `${durationProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Renewal CTA & Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-xs text-slate-300">
                Besoin de prolonger votre accès avant expiration ?
              </p>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onSubscribePlan(subscription?.planId === 'weekly' ? 'monthly' : 'annual', 5000, 'Pass VIP Mensuel')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Prolonger mon abonnement</span>
                </button>
              </div>
            </div>
          </div>

          {/* Usage Analytics Grid under Subscription */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Documents Créés</p>
                <p className="text-lg font-black text-white">{documents.length} document(s)</p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Téléchargements Illimités</p>
                <p className="text-lg font-black text-emerald-400">Illimité (0 FCFA)</p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">IA Dokya Générative</p>
                <p className="text-lg font-black text-amber-400">Active (Gemini Pro)</p>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* ========================================================================= */
        /* CASE B: USER HAS NO ACTIVE VIP SUBSCRIPTION (FREE / PAY-PER-DOC)          */
        /* ========================================================================= */
        <div className="space-y-6">
          
          {/* Status Alert Banner */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                  <ShieldCheck className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Statut Actuel du Compte
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Compte Standard • Mode Paiement à l'Acte
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onGoToPricing}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Crown className="w-4 h-4" />
                <span>Débloquer le Pass VIP Illimité</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Vous êtes actuellement en mode <strong>Paiement à l'acte</strong>. Vous pouvez créer librement tous vos documents et payer uniquement lors du téléchargement final (1 000 F par CV ou Lettre, 1 500 F par Pack Duo, 3 000 F par Ebook).
            </p>
          </div>

          {/* Value Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Standard Mode Card */}
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white">Mode Actuel : Paiement à l'Acte</h3>
                <span className="text-xs text-slate-400 font-mono">0 F / mois</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Accès gratuit aux formulaires et éditeurs</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Aperçu interactif plein écran avant achat</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Archivage et ré-téléchargement à vie des documents payés</span>
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>Paiement de 1 000 à 3 000 FCFA à chaque nouvelle création</span>
                </li>
              </ul>
            </div>

            {/* VIP Pass Card */}
            <div className="rounded-3xl bg-gradient-to-br from-indigo-950 to-slate-900 border-2 border-amber-400/70 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-black text-white">Pass VIP Illimité</h3>
                </div>
                <span className="text-xs font-black text-amber-300">Dès 2 500 FCFA</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Téléchargements Word (.docx) & PDF <strong>100% ILLIMITÉS</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Générations IA Dokya illimitées sur tous les services</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Accès complet au générateur d'Ebooks & Livres complets</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Support prioritaire direct sur WhatsApp 7j/7</span>
                </li>
              </ul>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onSubscribePlan('monthly', 5000, 'Pass VIP Mensuel')}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Souscrire au Pass VIP Mensuel (5 000 F)</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 3. GUARANTEES & SECURITY FOOTER */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Paiements sécurisés par Wave, Orange Money et Carte Bancaire. Aucun renouvellement automatique caché.</span>
        </div>

        <button
          type="button"
          onClick={onOpenRecharge}
          className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors whitespace-nowrap"
        >
          <span>Recharger mon portefeuille</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
