import React, { useState } from 'react';
import { CreditCard, Loader2, ArrowRight, ExternalLink, CheckCircle } from 'lucide-react';
import { createHostedCheckoutSession } from '../services/senepay';

interface SenePayCheckoutButtonProps {
  amount?: number;
  description?: string;
  orderReference?: string;
  className?: string;
  buttonText?: string;
  onSuccessRedirect?: (redirectUrl: string) => void;
  onError?: (error: string) => void;
}

export const SenePayCheckoutButton: React.FC<SenePayCheckoutButtonProps> = ({
  amount = 1500,
  description = "Paiement de document sur Dokya",
  orderReference,
  className,
  buttonText = "Payer par Mobile Money ou Carte",
  onSuccessRedirect,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const handleSenePayCheckout = async () => {
    setLoading(true);
    setErrorMessage(null);
    setRedirectUrl(null);

    try {
      const result = await createHostedCheckoutSession({
        amount,
        description,
        orderReference
      });

      const targetUrl = result.redirectUrl || result.checkoutUrl;

      if (!result.success || !targetUrl) {
        throw new Error(result.error || 'Impossible d\'initialiser la session de paiement SenePay.');
      }

      setRedirectUrl(targetUrl);

      if (onSuccessRedirect) {
        onSuccessRedirect(targetUrl);
      }

      // Redirection immédiate du client
      // 1. Tenter la redirection directe
      try {
        if (typeof window !== 'undefined') {
          // Si nous sommes dans une iframe (ex: aperçu), ouvrir un nouvel onglet ou tenter la fenêtre principale
          if (window.self !== window.top) {
            const newWin = window.open(targetUrl, '_blank');
            if (newWin && !newWin.closed) {
              newWin.focus();
            } else {
              window.top!.location.href = targetUrl;
            }
          } else {
            window.location.href = targetUrl;
          }
        }
      } catch (_e) {
        // En cas de blocage d'iframe ou de pop-up, l'utilisateur a le bouton direct ci-dessous
      }

    } catch (err: any) {
      console.error('Erreur Checkout SenePay:', err);
      const errMsg = err.message || 'Une erreur est survenue lors de l\'initialisation du paiement sécurisé.';
      setErrorMessage(errMsg);
      if (onError) onError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block w-full">
      <button
        type="button"
        onClick={handleSenePayCheckout}
        disabled={loading}
        className={
          className ||
          "px-4 py-3 text-xs sm:text-sm font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed w-full"
        }
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Redirection vers SenePay Checkout...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            <span>{buttonText}</span>
            <ArrowRight className="w-4 h-4 opacity-90" />
          </>
        )}
      </button>

      {/* Message de confirmation de session & Lien direct si la redirection automatique est bloquée */}
      {redirectUrl && (
        <div className="mt-2.5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs space-y-2 animate-in fade-in shadow-md">
          <div className="flex items-center gap-2 font-semibold text-emerald-800">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Session de paiement sécurisée prête !</span>
          </div>
          <p className="text-[11px] text-emerald-700 leading-relaxed">
            Si la redirection vers SenePay ne démarre pas automatiquement, cliquez ci-dessous pour choisir votre opérateur (Wave, Orange Money, Free Money) :
          </p>
          <a
            href={redirectUrl}
            target="_top"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs w-full"
          >
            <span>Procéder au paiement sur SenePay</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {errorMessage && (
        <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-2 animate-in fade-in">
          <div className="flex items-start gap-2">
            <span className="text-base leading-none">⚠️</span>
            <div className="space-y-1">
              <p className="font-bold text-[11px] text-amber-950">{errorMessage}</p>
              <p className="text-[10px] text-amber-800 leading-normal">
                Vous pouvez également débloquer votre document immédiatement via votre <strong>Solde Portefeuille Dokya</strong> ou en saisissant un code promo (ex: <strong>PETER</strong> ou <strong>LIL</strong>).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
