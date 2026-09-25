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
  TrendingUp,
  Award,
  Unlock
} from 'lucide-react';
import { CandidateProfile, SavedUserDocument, isUserVipActive, getTimestampMillis, UserSubscription } from '../types';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

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
  const [liveSubscription, setLiveSubscription] = useState<UserSubscription | any>(profile?.subscription || null);
  const [liveSubscriptionStatus, setLiveSubscriptionStatus] = useState<string>(profile?.subscriptionStatus || 'free');

  // Real-time onSnapshot listener on users/{auth.currentUser.uid}
  useEffect(() => {
    const targetUid = auth.currentUser?.uid || profile?.uid;
    if (!targetUid) return;

    const userDocRef = doc(db, 'users', targetUid);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.subscription) {
          setLiveSubscription(data.subscription);
        }
        if (data.subscriptionStatus) {
          setLiveSubscriptionStatus(data.subscriptionStatus);
        }
      }
    }, (err) => {
      console.warn('[MySubscriptionView onSnapshot warn]:', err);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  // Update real-time countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const subscription = liveSubscription || profile?.subscription;
  const isSubscriptionDefined = !!subscription && subscription.planId !== 'none';
  
  // Calculate remaining time
  const calculateRemaining = (): TimeRemaining => {
    const expireTime = getTimestampMillis(subscription?.expiresAt);
    if (!expireTime) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true };
    }
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
  const subStatusUpper = (subscription?.status || '').toUpperCase();
  const isPending = isSubscriptionDefined && (subStatusUpper === 'PENDING');
  const isCurrentlyActive = subStatusUpper === 'ACTIVE' || isUserVipActive(subscription) || (isSubscriptionDefined && !remaining.isExpired && subStatusUpper === 'ACTIVE') || liveSubscriptionStatus === 'unlimited';

  // Calculate duration progress percentage
  let durationProgress = 0;
  const startMs = getTimestampMillis(subscription?.activatedAt) || getTimestampMillis(subscription?.startedAt);
  const endMs = getTimestampMillis(subscription?.expiresAt);
  if (startMs && endMs) {
    const totalDuration = endMs - startMs;
    if (totalDuration > 0) {
      const elapsed = now - startMs;
      durationProgress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
    }
  }

  // Format date helper
  const formatDate = (rawDate?: any) => {
    if (!rawDate) return 'Accès permanent';
    try {
      const millis = getTimestampMillis(rawDate);
      if (!millis) return 'Accès permanent';
      const d = new Date(millis);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(rawDate);
    }
  };

  // Format date helper compact (mobile & compact bars)
  const formatDateCompact = (rawDate?: any) => {
    if (!rawDate) return 'Permanent';
    try {
      const millis = getTimestampMillis(rawDate);
      if (!millis) return 'Permanent';
      const d = new Date(millis);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return String(rawDate);
    }
  };

  return (
    <div id="my-subscription-view" className="space-y-4 sm:space-y-8 animate-in fade-in max-w-5xl mx-auto pb-8 sm:pb-12">
      
      {/* 1. TOP STATUS HEADER */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap border-b border-slate-800 pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              Mon Abonnement & Privilèges VIP
            </h1>
            {isCurrentlyActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm animate-pulse">
                👑 Pass VIP Actif
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                ⏳ Validation en cours
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                ⚪ Standard / À l'acte
              </span>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Gérez votre abonnement, suivez la validité en temps réel et profitez de l'accès illimité.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToPricing}
          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Grille Tarifaire</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CASE A: USER HAS AN ACTIVE VIP SUBSCRIPTION                               */}
      {/* ========================================================================= */}
      {isCurrentlyActive ? (
        <div className="space-y-3 sm:space-y-4">
          
          {/* Main Active Subscription Card - Ultra-compact, élégant et optimisé Mobile & PC */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-800/80 border border-slate-700/60 p-3 sm:p-4 shadow-xl">
            {/* Subtle glow effect */}
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              {/* Left: Crown Icon + Title + Status + Compact Expiry & Live Countdown */}
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 via-emerald-500/20 to-teal-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white truncate tracking-tight">
                      {subscription?.planName || 'Pass VIP Dokya'}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Pass VIP Actif
                    </span>
                    <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-lg border border-teal-500/20">
                      <Unlock className="w-3 h-3 text-teal-400" />
                      Accès total débloqué
                    </span>
                  </div>

                  {/* Inline Expiration & Countdown */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Jusqu'au {formatDateCompact(subscription?.expiresAt)}</span>
                    </span>
                    <span className="text-slate-600 hidden sm:inline">•</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/70 border border-slate-800 text-[11px] font-mono text-emerald-300 font-bold">
                      <Clock className="w-3 h-3 text-emerald-400 animate-spin shrink-0" />
                      {remaining.days > 0 && `${remaining.days}j `}
                      {String(remaining.hours).padStart(2, '0')}h {String(remaining.minutes).padStart(2, '0')}m {String(remaining.seconds).padStart(2, '0')}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Compact Prolonger CTA Button */}
              <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 shrink-0">
                <button
                  type="button"
                  onClick={() => onSubscribePlan(subscription?.planId === 'weekly' ? 'monthly' : 'annual', 5000, 'Pass VIP Mensuel')}
                  className="w-full sm:w-auto px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  title="Prolonger ou renouveler votre abonnement VIP"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Prolonger</span>
                </button>
              </div>

            </div>

            {/* Hairline Progress Bar */}
            <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden mt-2.5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full transition-all duration-1000"
                style={{ width: `${durationProgress}%` }}
              />
            </div>
          </div>

          {/* Usage Analytics Grid under Subscription (Ultra compact) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 truncate font-medium">Documents</p>
                <p className="text-xs sm:text-sm font-black text-white truncate">{documents.length}</p>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 truncate font-medium">Exports</p>
                <p className="text-xs sm:text-sm font-black text-emerald-400 truncate">Illimité</p>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 truncate font-medium">IA Dokya</p>
                <p className="text-xs sm:text-sm font-black text-teal-300 truncate">Active</p>
              </div>
            </div>
          </div>

        </div>
      ) : isPending ? (
        /* ========================================================================= */
        /* CASE B: SUBSCRIPTION PAYMENT IS SUBMITTED & PENDING VALIDATION            */
        /* ========================================================================= */
        <div className="space-y-6 animate-in fade-in">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 border-2 border-amber-500/60 p-6 sm:p-8 shadow-2xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-lg">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                    Souscription en cours de traitement
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {subscription?.planName || 'Pass VIP Dokya AI'}
                  </h2>
                </div>
              </div>

              <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 w-fit">
                <Clock className="w-4 h-4 animate-spin" />
                <span>Validation en cours (5-15 min)</span>
              </span>
            </div>

            {/* Validation Progress Stepper */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                État d'avancement de votre validation :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-400">1. Paiement Émis</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {subscription?.paymentMethod?.toUpperCase() || 'MOBILE MONEY'} • {subscription?.pricePaid?.toLocaleString('fr-FR')} F
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-400">2. Preuve Transmise</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Réf : {subscription?.transactionReference || 'Reçu téléversé'}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-spin" />
                  <div>
                    <p className="font-bold text-amber-300">3. Examen & Activation</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Délai estimé : 5 à 15 minutes max
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp acceleration CTA */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-0.5">
                <p className="font-bold text-white">Envie d'accélérer l'activation en 2 minutes ?</p>
                <p className="text-[11px] text-slate-300">
                  Notre équipe support vérifie votre preuve immédiatement sur WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const message = encodeURIComponent(
                    `Bonjour Dokya AI, j'ai transmis mon reçu pour l'activation de mon ${subscription?.planName || 'Pass VIP'}.\nRéf: ${subscription?.transactionReference || 'Reçu Dokya'}\nMerci de valider mon accès !`
                  );
                  window.open(`https://wa.me/221789619088?text=${message}`, '_blank');
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <span>Accélérer sur WhatsApp →</span>
              </button>
            </div>

          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* CASE C: USER HAS NO ACTIVE VIP SUBSCRIPTION (FREE / PAY-PER-DOC)          */
        /* ========================================================================= */
        <div className="space-y-4 sm:space-y-6">
          
          {/* Status Alert Banner */}
          <div className="rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 shadow-xl space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Statut Actuel du Compte
                  </span>
                  <h2 className="text-base sm:text-xl font-black text-white">
                    Compte Standard • Paiement à l'Acte
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onGoToPricing}
                className="w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Pass VIP Illimité</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Vous êtes actuellement en mode <strong>Paiement à l'acte</strong>. Vous pouvez créer librement tous vos documents et payer uniquement lors du téléchargement final (1 000 F par CV ou Lettre, 1 500 F par Pack Duo, 3 000 F par Ebook).
            </p>
          </div>

          {/* Value Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6">
            
            {/* Standard Mode Card */}
            <div className="rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-black text-white">Mode Actuel : Paiement à l'Acte</h3>
                <span className="text-xs text-slate-400 font-mono">0 F / mois</span>
              </div>

              <ul className="space-y-2 sm:space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Accès gratuit aux formulaires et éditeurs</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Aperçu interactif plein écran avant achat</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Archivage et ré-téléchargement à vie des documents payés</span>
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>Paiement de 1 000 à 3 000 FCFA à chaque nouvelle création</span>
                </li>
              </ul>
            </div>

            {/* VIP Pass Card */}
            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-950 to-slate-900 border-2 border-amber-400/70 p-4 sm:p-6 space-y-3 sm:space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm sm:text-base font-black text-white">Pass VIP Illimité</h3>
                </div>
                <span className="text-xs font-black text-amber-300">Dès 2 500 FCFA</span>
              </div>

              <ul className="space-y-2 sm:space-y-2.5 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Téléchargements Word (.docx) & PDF <strong>100% ILLIMITÉS</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Générations IA Dokya illimitées sur tous les services</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Accès complet au générateur d'Ebooks & Livres complets</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Support prioritaire direct sur WhatsApp 7j/7</span>
                </li>
              </ul>

              <div className="pt-1 sm:pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const balance = profile?.balance ?? 0;
                    if (balance < 5000) {
                      onOpenRecharge();
                    } else {
                      onSubscribePlan('monthly', 5000, 'Pass VIP Mensuel');
                    }
                  }}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {(profile?.balance ?? 0) < 5000 
                      ? 'Recharger mon portefeuille' 
                      : "S'abonner avec mon solde (5 000 FCFA)"}
                  </span>
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
