import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Zap, 
  AlertCircle, 
  Loader2, 
  Gift,
  ArrowRight,
  Sparkles,
  Phone,
  User,
  Mail
} from 'lucide-react';

/**
 * Composant React de Checkout DOKYA
 * 100% Automatisé via GeniusPay (Wave, Orange Money, MTN, Moov, Carte)
 */
export const CheckoutModal = ({
  isOpen,
  onClose,
  planId = 'PASS_VIP',
  planName = 'Abonnement Pass VIP - DOKYA',
  amount = 5000,
  currency = 'XOF',
  userId = '',
  userEmail = '',
  userName = '',
  userPhone = '',
  referredBy = '',
  onSuccess
}) => {
  const [customerName, setCustomerName] = useState(userName);
  const [customerEmail, setCustomerEmail] = useState(userEmail);
  const [customerPhone, setCustomerPhone] = useState(userPhone || '+221');
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [autoError, setAutoError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setCustomerName(userName);
      setCustomerEmail(userEmail);
      setCustomerPhone(userPhone || '+221');
      setAutoError(null);
    }
  }, [isOpen, userName, userEmail, userPhone]);

  if (!isOpen) return null;

  const handleGeniusPayCheckout = async (e) => {
    e.preventDefault();
    setIsAutoLoading(true);
    setAutoError(null);

    try {
      const response = await fetch('/api/geniuspay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          description: planName,
          customer: {
            name: customerName || 'Client Dokya',
            email: customerEmail || 'client@dokya.com',
            phone: customerPhone
          },
          redirect_url: `${window.location.origin}/dashboard?payment=success`,
          cancel_url: `${window.location.origin}/dashboard?payment=cancelled`,
          success_url: `${window.location.origin}/dashboard?payment=success`,
          error_url: `${window.location.origin}/dashboard?payment=cancelled`,
          return_url: `${window.location.origin}/dashboard?payment=success`,
          metadata: {
            userId: userId || 'anonymous',
            planType: planId,
            referredBy: referredBy || ''
          }
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création de la session de paiement.');
      }

      const checkoutUrl = data.checkout_url || data.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error("L'URL de paiement retournée par GeniusPay est indisponible.");
      }
    } catch (err) {
      console.error('[GeniusPay Checkout UI Error]:', err);
      setAutoError(err.message || 'Impossible de joindre la passerelle de paiement GeniusPay.');
    } finally {
      setIsAutoLoading(false);
    }
  };

  return (
    <div
      id="dokya_checkout_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="dokya_checkout_modal_container"
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto text-slate-800 dark:text-slate-100"
      >
        {/* Header avec récapitulatif du forfait */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-5 sm:p-6 text-white">
          <button
            id="dokya_checkout_close_btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              Paiement Sécurisé DOKYA
            </span>
            {referredBy && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-400/20 text-amber-200 border border-amber-300/30">
                <Gift className="w-3 h-3" /> Parrainage Actif
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{planName}</h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-0.5">
                Accès complet aux modèles de CV ATS, lettres IA, devis, factures & livres numériques.
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {amount.toLocaleString('fr-FR')} <span className="text-base font-semibold">{currency}</span>
              </div>
              <span className="text-xs text-emerald-100/80">Activation immédiate</span>
            </div>
          </div>
        </div>

        {/* Corps du modal */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Badges d'opérateurs supportés */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              Règlement instantané via GeniusPay Checkout :
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                🌊 Wave
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                🍊 Orange Money
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                🟡 MTN Money
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                🔵 Moov Money
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                💳 Carte Bancaire
              </span>
            </div>
          </div>

          {/* Formulaire de paiement automatique */}
          <form onSubmit={handleGeniusPayCheckout} className="space-y-4">
            {autoError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{autoError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: Amadou Diallo"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Adresse Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Ex: contact@exemple.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Numéro de téléphone (avec indicatif pays)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+221 77 000 00 00"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Format recommandé : +221 (Sénégal), +225 (Côte d'Ivoire), +223 (Mali), +226 (Burkina), etc.
              </p>
            </div>

            <div className="pt-2">
              <button
                id="submit_geniuspay_checkout"
                type="submit"
                disabled={isAutoLoading}
                className="w-full py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-base cursor-pointer"
              >
                {isAutoLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Génération de la session GeniusPay...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Payer {amount.toLocaleString('fr-FR')} {currency} via GeniusPay</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Redirection immédiate vers la page officielle de paiement crypté SSL.</span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
