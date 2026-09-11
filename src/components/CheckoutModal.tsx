import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Zap, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Copy, 
  Check, 
  ExternalLink, 
  Upload, 
  Smartphone, 
  CreditCard, 
  Clock, 
  Info,
  Gift,
  ArrowRight,
  Sparkles,
  Phone,
  User,
  Mail,
  Receipt
} from 'lucide-react';

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId?: string;
  planName?: string;
  amount?: number;
  currency?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  referredBy?: string;
  onSuccess?: () => void;
}

// Coordonnées officielles Dokya pour le paiement direct
const OFFICIAL_PAYMENT_INFO = {
  wavePhone: '+221 78 961 90 88',
  waveName: 'NGOUALA LAVOISIER FORTUNÉ PETER',
  waveDirectUrl: 'https://pay.wave.com/m/M_sn_wXlszdyVZOIV/c/sn/',
  orangeMoneyPhone: '+221 78 961 90 88',
  orangeMoneyName: 'NGOUALA LAVOISIER FORTUNÉ PETER',
  bankName: 'Banque Atlantique / BOA Sénégal',
  bankRib: 'SN089 01001 00123456789 45',
  bankBeneficiary: 'DOKYA TECHNOLOGIES / PETER NGOUALA'
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
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
  // Navigation entre les 2 méthodes
  const [activeMethod, setActiveMethod] = useState<'AUTO' | 'MANUAL'>('AUTO');

  // Champs formulaire paiement automatique
  const [customerName, setCustomerName] = useState(userName);
  const [customerEmail, setCustomerEmail] = useState(userEmail);
  const [customerPhone, setCustomerPhone] = useState(userPhone || '+221');
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);

  // Champs formulaire paiement manuel
  const [manualOperator, setManualOperator] = useState<'WAVE' | 'ORANGE_MONEY' | 'BANK_TRANSFER' | 'OTHER'>('WAVE');
  const [manualReference, setManualReference] = useState('');
  const [manualSenderPhone, setManualSenderPhone] = useState(userPhone || '+221');
  const [manualProofBase64, setManualProofBase64] = useState<string | null>(null);
  const [manualNote, setManualNote] = useState('');
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccessMessage, setManualSuccessMessage] = useState<string | null>(null);

  // Outils UI
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomerName(userName);
      setCustomerEmail(userEmail);
      setCustomerPhone(userPhone || '+221');
      setManualSenderPhone(userPhone || '+221');
      setAutoError(null);
      setManualError(null);
      setManualSuccessMessage(null);
    }
  }, [isOpen, userName, userEmail, userPhone]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // ---------------------------------------------------------------------------
  // METHODE 1 : PAIEMENT AUTOMATIQUE (GENIUSPAY CHECKOUT)
  // ---------------------------------------------------------------------------
  const handleGeniusPayCheckout = async (e: React.FormEvent) => {
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
          success_url: `${window.location.origin}/dashboard?payment=success&provider=geniuspay`,
          error_url: `${window.location.origin}/dashboard?payment=error&provider=geniuspay`,
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

      if (data.checkoutUrl) {
        // Redirection vers la page de paiement sécurisée multi-opérateurs GeniusPay
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("L'URL de paiement retournée par GeniusPay est indisponible.");
      }
    } catch (err: any) {
      console.error('[GeniusPay Checkout UI Error]:', err);
      setAutoError(err.message || 'Impossible de joindre la passerelle de paiement.');
    } finally {
      setIsAutoLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // METHODE 2 : PAIEMENT MANUEL (VALIDATION ADMINISTRATEUR)
  // ---------------------------------------------------------------------------
  const handleFileProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setManualError('Le fichier est trop volumineux (maximum 5 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setManualProofBase64(reader.result as string);
      setManualError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReference.trim() && !manualSenderPhone.trim()) {
      setManualError('Veuillez renseigner la référence du transfert ou le numéro expéditeur.');
      return;
    }

    setIsManualLoading(true);
    setManualError(null);

    try {
      const response = await fetch('/api/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'anonymous',
          userName: customerName || userName,
          userEmail: customerEmail || userEmail,
          userPhone: manualSenderPhone,
          planType: planId,
          amount,
          currency,
          operator: manualOperator,
          reference: manualReference,
          senderPhone: manualSenderPhone,
          proofBase64: manualProofBase64,
          referredBy: referredBy || null,
          note: manualNote
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de l'enregistrement de votre demande.");
      }

      setManualSuccessMessage(
        data.message || 'Votre paiement a été soumis avec succès. Validation sous 15-30 min.'
      );

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('[Manual Payment UI Error]:', err);
      setManualError(err.message || "Erreur lors de la soumission de la preuve.");
    } finally {
      setIsManualLoading(false);
    }
  };

  return (
    <div 
      id="dokya_checkout_modal_backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      <div 
        id="dokya_checkout_modal_container"
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto text-slate-800 dark:text-slate-100"
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

        {/* Barre de sélection de méthode de paiement (Tabs) */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1.5">
          <button
            id="tab_checkout_auto"
            type="button"
            onClick={() => setActiveMethod('AUTO')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
              activeMethod === 'AUTO'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-500" />
            <span>Paiement Automatique</span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded">
              Recommandé
            </span>
          </button>

          <button
            id="tab_checkout_manual"
            type="button"
            onClick={() => setActiveMethod('MANUAL')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
              activeMethod === 'MANUAL'
                ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-teal-500" />
            <span>Paiement Manuel</span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">
              Dépôt direct
            </span>
          </button>
        </div>

        {/* Corps du modal */}
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto">
          {/* =================================================================== */}
          {/* METHODE 1 : GENIUSPAY AUTOMATIQUE                                   */}
          {/* =================================================================== */}
          {activeMethod === 'AUTO' && (
            <div className="space-y-5">
              {/* Badges d'opérateurs supportés */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  Opérateurs compatibles via Checkout sécurisé :
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
                    🟢 Free Money
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    💳 Carte Visa / Mastercard
                  </span>
                </div>
              </div>

              {autoError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Erreur de paiement :</span> {autoError}
                  </div>
                </div>
              )}

              <form onSubmit={handleGeniusPayCheckout} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        placeholder="Ex: Cheikh Anta Diop"
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
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-base"
                  >
                    {isAutoLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Génération de la session GeniusPay...</span>
                      </>
                    ) : (
                      <>
                        <span>Payer {amount.toLocaleString('fr-FR')} {currency} en toute sécurité</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2.5 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Redirection immédiate vers la page officielle de paiement crypté SSL.
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* =================================================================== */}
          {/* METHODE 2 : PAIEMENT MANUEL (VALIDATION ADMIN)                      */}
          {/* =================================================================== */}
          {activeMethod === 'MANUAL' && (
            <div className="space-y-5">
              {manualSuccessMessage ? (
                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                    Demande de paiement enregistrée !
                  </h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 max-w-md mx-auto">
                    {manualSuccessMessage}
                  </p>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800/80 text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Statut actuel : <strong className="text-amber-600 dark:text-amber-400">EN ATTENTE DE VALIDATION</strong>.
                    Vous recevrez l'accès dès confirmation par un administrateur.
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                    >
                      Compris, fermer
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Instructions de dépôt direct */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-teal-500" />
                        Comptes officiels pour votre dépôt direct :
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Montant : {amount.toLocaleString('fr-FR')} {currency}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option Wave Direct */}
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1">
                            🌊 Wave Sénégal
                          </span>
                          <a
                            href={OFFICIAL_PAYMENT_INFO.waveDirectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-sky-500 hover:text-sky-600 underline flex items-center gap-0.5"
                          >
                            Lien direct <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {OFFICIAL_PAYMENT_INFO.wavePhone}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {OFFICIAL_PAYMENT_INFO.waveName}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(OFFICIAL_PAYMENT_INFO.wavePhone, 'wave')}
                          className="w-full py-1 px-2 text-xs rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 font-medium transition-colors"
                        >
                          {copiedKey === 'wave' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" /> Copié !
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copier le numéro Wave
                            </>
                          )}
                        </button>
                      </div>

                      {/* Option Orange Money Direct */}
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-orange-600 dark:text-orange-400">
                            🍊 Orange Money
                          </span>
                          <span className="text-[11px] text-slate-400">Dépôt national</span>
                        </div>
                        <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {OFFICIAL_PAYMENT_INFO.orangeMoneyPhone}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {OFFICIAL_PAYMENT_INFO.orangeMoneyName}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(OFFICIAL_PAYMENT_INFO.orangeMoneyPhone, 'om')}
                          className="w-full py-1 px-2 text-xs rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 font-medium transition-colors"
                        >
                          {copiedKey === 'om' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" /> Copié !
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copier le numéro Orange Money
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {manualError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>{manualError}</div>
                    </div>
                  )}

                  {/* Formulaire de confirmation client */}
                  <form onSubmit={handleManualPaymentSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Opérateur utilisé pour le transfert
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setManualOperator('WAVE')}
                          className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                            manualOperator === 'WAVE'
                              ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-700 dark:text-sky-300'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600'
                          }`}
                        >
                          🌊 Wave
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualOperator('ORANGE_MONEY')}
                          className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                            manualOperator === 'ORANGE_MONEY'
                              ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-500 text-orange-700 dark:text-orange-300'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600'
                          }`}
                        >
                          🍊 Orange Money
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualOperator('BANK_TRANSFER')}
                          className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                            manualOperator === 'BANK_TRANSFER'
                              ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-700 dark:text-teal-300'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600'
                          }`}
                        >
                          🏦 Virement / Autre
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Numéro ayant effectué le transfert *
                        </label>
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={manualSenderPhone}
                            onChange={(e) => setManualSenderPhone(e.target.value)}
                            placeholder="Ex: +221 77 123 45 67"
                            className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Référence de transaction / ID de reçu *
                        </label>
                        <div className="relative">
                          <Receipt className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={manualReference}
                            onChange={(e) => setManualReference(e.target.value)}
                            placeholder="Ex: WAVE-TX-98721 ou OM-382910"
                            className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preuve facultative : capture d'écran */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Capture d'écran du reçu (Facultatif mais recommandé pour validation express)
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors">
                          <Upload className="w-4 h-4 text-teal-500" />
                          <span>{manualProofBase64 ? 'Changer l\'image du reçu' : 'Téléverser une capture d\'écran (PNG, JPG)'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileProofChange}
                            className="hidden"
                          />
                        </label>
                        {manualProofBase64 && (
                          <div className="relative w-12 h-12 rounded-lg border border-teal-500 overflow-hidden shrink-0 group">
                            <img
                              src={manualProofBase64}
                              alt="Aperçu reçu"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setManualProofBase64(null)}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] transition-opacity"
                            >
                              Retirer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        id="submit_manual_payment"
                        type="submit"
                        disabled={isManualLoading}
                        className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 active:scale-[0.99] shadow-lg shadow-teal-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-base"
                      >
                        {isManualLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Envoi de votre demande...</span>
                          </>
                        ) : (
                          <>
                            <span>Confirmer mon transfert de {amount.toLocaleString('fr-FR')} {currency}</span>
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                      <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2.5 flex items-center justify-center gap-1.5">
                        <Clock className="w-4 h-4 text-teal-500" />
                        Traitement manuel par l'administrateur sous 15 à 30 minutes.
                      </p>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
