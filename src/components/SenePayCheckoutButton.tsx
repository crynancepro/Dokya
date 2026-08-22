import React, { useState } from 'react';
import { CreditCard, Loader2, ArrowRight, ExternalLink, CheckCircle } from 'lucide-react';
import { safeParseJsonResponse } from '../utils/apiHelpers';

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
  description = "Création de document",
  orderReference,
  className,
  buttonText = "Recharger Mon Solde",
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

    // Définition de la base du domaine marchand pour SenePay
    const BASE_URL = (
      (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_APP_URL || process.env?.APP_URL)) ||
      (typeof (import.meta as any) !== 'undefined' && ((import.meta as any).env?.VITE_APP_URL || (import.meta as any).env?.NEXT_PUBLIC_APP_URL)) ||
      'https://cv-ia-self.vercel.app'
    ).replace(/\/+$/, '');

    const generatedRef = orderReference || `CMD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const returnUrl = `${BASE_URL}/payment/success`;
    const cancelUrl = `${BASE_URL}/payment/cancel`;

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: 'XOF',
          orderReference: generatedRef,
          description,
          country: 'SN',
          returnUrl,
          return_url: returnUrl,
          cancelUrl,
          cancel_url: cancelUrl,
          redirect_url: returnUrl
        }),
      });

      const data = await safeParseJsonResponse(response);

      const checkoutUrl = data.checkoutUrl || data.redirectUrl;

      if (!checkoutUrl) {
        throw new Error(data.error || 'Impossible d\'obtenir l\'URL de redirection SenePay Checkout.');
      }

      setRedirectUrl(checkoutUrl);

      if (onSuccessRedirect) {
        onSuccessRedirect(checkoutUrl);
      }

      // 1. Ouvrir dans un nouvel onglet principal (contourne les restrictions X-Frame-Options d'iframe)
      const newWin = window.open(checkoutUrl, '_blank');

      // 2. Si non bloqué par un bloqueur de pop-up, c'est réussi
      if (newWin && !newWin.closed) {
        newWin.focus();
      } else {
        // 3. Sinon, tenter la redirection de la fenêtre parente si disponible
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = checkoutUrl;
          } else {
            window.location.href = checkoutUrl;
          }
        } catch (_e) {
          // Bloqué par sécurité cross-origin iframe : l'utilisateur cliquera sur le bouton direct sous la modal
        }
      }

    } catch (err: any) {
      console.error('Erreur Checkout:', err);
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
          "px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed w-full"
        }
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Initialisation du paiement sécurisé...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            <span>{buttonText}</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-80" />
          </>
        )}
      </button>

      {/* Message de confirmation de session & Lien direct si la redirection automatique est bloquée par l'iframe */}
      {redirectUrl && (
        <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs space-y-2 animate-in fade-in shadow-md">
          <div className="flex items-center gap-2 font-semibold text-emerald-800">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Session de paiement sécurisée prête !</span>
          </div>
          <p className="text-[11px] text-emerald-700 leading-relaxed">
            Si la page de paiement ne s'est pas ouverte automatiquement dans un nouvel onglet, cliquez sur le bouton ci-dessous :
          </p>
          <a
            href={redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
          >
            <span>Ouvrir la page de paiement sécurisée</span>
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
                Astuce : Vous pouvez débloquer votre document immédiatement et sans frais en saisissant le code promo <strong className="font-extrabold text-amber-950 underline cursor-pointer">PETER</strong> ou <strong className="font-extrabold text-amber-950 underline cursor-pointer">LIL</strong> ci-dessus, ou en utilisant votre solde Portefeuille.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


