/**
 * Service d'intégration SenePay - Méthode A : Checkout hébergé (v1)
 * Documentation officielle : POST https://api.sene-pay.com/api/v1/checkout/sessions
 */

export interface SenePaySessionParams {
  amount: number;
  description?: string;
  orderReference?: string;
  returnUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface SenePaySessionResponse {
  success: boolean;
  redirectUrl?: string;
  checkoutUrl?: string;
  orderReference?: string;
  error?: string;
  errorCode?: string;
  isFallback?: boolean;
}

/**
 * Récupère la clé API publique officielle SenePay (X-Api-Key)
 */
export function getSenePayPublicKey(): string {
  const key = import.meta.env.VITE_SENEPAY_PUBLIC_KEY;
  if (key && typeof key === 'string' && key.trim()) {
    return key.trim();
  }
  return '';
}

/**
 * Récupère la clé API secrète officielle SenePay (X-Api-Secret)
 */
export function getSenePaySecretKey(): string {
  const key = import.meta.env.VITE_SENEPAY_SECRET_KEY;
  if (key && typeof key === 'string' && key.trim()) {
    return key.trim();
  }
  return '';
}

/**
 * Récupère l'URL de base officielle de l'application
 */
export function getAppUrl(): string {
  const envUrl = import.meta.env.VITE_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return 'https://cv-ia-self.vercel.app';
}

/**
 * Extrait l'URL de redirection Checkout de SenePay depuis la réponse de l'API
 */
function extractCheckoutUrl(data: any): string | null {
  if (!data || typeof data !== 'object') return null;

  const candidate =
    data.redirectUrl ||
    data.checkoutUrl ||
    data.url ||
    data.redirect_url ||
    data.checkout_url ||
    data.data?.redirectUrl ||
    data.data?.checkoutUrl ||
    data.data?.url ||
    data.data?.redirect_url ||
    data.data?.checkout_url;

  if (typeof candidate === 'string' && candidate.startsWith('http')) {
    return candidate;
  }

  // Si SenePay renvoie uniquement le sessionToken, construire l'URL officielle SenePay
  const sessionToken = data.sessionToken || data.session_token || data.data?.sessionToken;
  if (typeof sessionToken === 'string' && sessionToken.trim()) {
    return `https://api.sene-pay.com/checkout.html?session=${encodeURIComponent(sessionToken.trim())}`;
  }

  return null;
}

/**
 * Crée une session de paiement SenePay Checkout Hébergé (Méthode A v1)
 * Envoie la requête POST à https://api.sene-pay.com/api/v1/checkout/sessions
 * avec les en-têtes officiels X-Api-Key et X-Api-Secret.
 *
 * Retourne EXCLUSIVEMENT l'URL externe de la passerelle SenePay.
 */
export async function createHostedCheckoutSession(
  params: SenePaySessionParams
): Promise<SenePaySessionResponse> {
  const baseUrl = getAppUrl();
  const orderReference = params.orderReference || `DOKYA-${Date.now()}`;
  const amount = Math.max(200, Math.round(Number(params.amount) || 1000));
  const description = params.description || 'Paiement de document sur Dokya';
  const returnUrl = params.returnUrl || `${baseUrl}/#editor?status=success&reference=${encodeURIComponent(orderReference)}&amount=${amount}`;
  const cancelUrl = params.cancelUrl || `${baseUrl}/#editor?status=cancel&reference=${encodeURIComponent(orderReference)}`;

  const apiKey = getSenePayPublicKey();
  const apiSecret = getSenePaySecretKey();

  if (!apiKey) {
    return {
      success: false,
      orderReference,
      error: "Clé publique SenePay manquante. Veuillez définir VITE_SENEPAY_PUBLIC_KEY dans vos variables d'environnement.",
      errorCode: 'MISSING_API_KEY'
    };
  }

  // Payload conforme à la documentation v1 Méthode A
  const payload = {
    amount,
    currency: 'XOF',
    orderReference,
    description,
    returnUrl,
    cancelUrl,
    country: 'SN',
    expiresInMinutes: 60
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Api-Key': apiKey,
    ...(apiSecret ? { 'X-Api-Secret': apiSecret } : {})
  };

  let lastErrorMessage: string | null = null;
  let lastErrorCode: string | null = null;

  // 1. Appel direct au endpoint officiel SenePay Checkout Hébergé
  try {
    const response = await fetch('https://api.sene-pay.com/api/v1/checkout/sessions', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Ignored
    }

    if (response.ok && data) {
      const targetUrl = extractCheckoutUrl(data);
      if (targetUrl) {
        return {
          success: true,
          redirectUrl: targetUrl,
          checkoutUrl: targetUrl,
          orderReference
        };
      }
    }

    if (!response.ok) {
      lastErrorCode = data?.code || data?.errorCode || (response.status === 401 ? '401_UNAUTHORIZED' : `HTTP_${response.status}`);
      lastErrorMessage = data?.message || data?.error || (response.status === 401 ? 'Authentification SenePay échouée (401). Vérifiez vos clés VITE_SENEPAY_PUBLIC_KEY et VITE_SENEPAY_SECRET_KEY.' : `Erreur SenePay ${response.status}`);
      console.warn(`[SenePay Direct Error ${response.status}]:`, data || responseText);
    }
  } catch (directErr: any) {
    console.warn('[SenePay Direct Network/CORS Error]:', directErr?.message);
    lastErrorMessage = directErr?.message;
  }

  // 2. Appel au proxy local serveur (si actif dans l'environnement avec backend)
  try {
    const serverRes = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (serverRes.ok && serverRes.status !== 405) {
      const serverData = await serverRes.json();
      const targetUrl = extractCheckoutUrl(serverData);
      if (targetUrl) {
        return {
          success: true,
          redirectUrl: targetUrl,
          checkoutUrl: targetUrl,
          orderReference
        };
      }
    }
  } catch (_proxyErr) {
    // Proxy unavailable
  }

  // Si l'API SenePay n'a pas pu renvoyer d'URL externe de paiement valide
  return {
    success: false,
    orderReference,
    error: lastErrorMessage || "Impossible d'ouvrir la passerelle de paiement SenePay. Vérifiez vos clés et votre compte marchand SenePay.",
    errorCode: lastErrorCode || 'GATEWAY_ERROR'
  };
}
