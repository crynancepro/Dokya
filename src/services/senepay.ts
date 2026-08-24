/**
 * Service d'intégration SenePay - Mode Checkout Hébergé (redirection vers checkout.sene-pay.com)
 * Endpoint : POST https://api.sene-pay.com/api/v1/checkout/sessions
 */

export interface SenePaySessionParams {
  amount?: number;
  currency?: string;
  reference?: string;
  orderReference?: string;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  autoRedirect?: boolean;
}

export interface SenePaySessionResponse {
  success: boolean;
  redirectUrl?: string;
  checkoutUrl?: string;
  url?: string;
  reference?: string;
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
  if (key && typeof key === 'string' && key.trim() && !key.includes('votre_cle')) {
    return key.trim();
  }
  return 'pk_test_TchA2OXyRAIjh7JJQEJyLnqd';
}

/**
 * Récupère la clé API secrète officielle SenePay (X-Api-Secret)
 */
export function getSenePaySecretKey(): string {
  const key = import.meta.env.VITE_SENEPAY_SECRET_KEY;
  if (key && typeof key === 'string' && key.trim() && !key.includes('votre_cle')) {
    return key.trim();
  }
  return 'sk_test_8i1wREvXJ6hanfzTKkwC4Ead3BBrMnXl';
}

/**
 * Récupère l'URL de base officielle de l'application
 */
export function getAppUrl(): string {
  const envUrl = import.meta.env.VITE_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() && !envUrl.includes('cv-ia-self')) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return 'https://dokya-seven.vercel.app';
}

/**
 * Extrait l'URL de redirection Checkout de SenePay depuis la réponse JSON de l'API
 */
export function extractCheckoutUrl(data: any): string | null {
  if (!data || typeof data !== 'object') return null;

  const candidate =
    data.checkoutUrl ||
    data.redirectUrl ||
    data.url ||
    data.checkout_url ||
    data.redirect_url ||
    data.data?.checkoutUrl ||
    data.data?.redirectUrl ||
    data.data?.url ||
    data.data?.checkout_url ||
    data.data?.redirect_url;

  if (typeof candidate === 'string' && candidate.startsWith('http')) {
    return candidate;
  }

  // Si SenePay renvoie un sessionToken
  const sessionToken = data.sessionToken || data.session_token || data.data?.sessionToken;
  if (typeof sessionToken === 'string' && sessionToken.trim()) {
    return `https://checkout.sene-pay.com/?session=${encodeURIComponent(sessionToken.trim())}`;
  }

  return null;
}

/**
 * Initialise une session Checkout hébergé SenePay et redirige immédiatement vers la passerelle.
 * 
 * 1. ENDPOINT : POST https://api.sene-pay.com/api/v1/checkout/sessions
 * 2. EN-TÊTES LIVE :
 *    - 'X-Api-Key': import.meta.env.VITE_SENEPAY_PUBLIC_KEY
 *    - 'X-Api-Secret': import.meta.env.VITE_SENEPAY_SECRET_KEY
 *    - 'Content-Type': 'application/json'
 * 3. DONNÉES DU CORPS (BODY) :
 *    {
 *      "amount": 1000,
 *      "currency": "XOF",
 *      "reference": "DOKYA-" + Date.now(),
 *      "returnUrl": import.meta.env.VITE_APP_URL + "/?status=success",
 *      "cancelUrl": import.meta.env.VITE_APP_URL + "/?status=cancel"
 *    }
 * 4. REDIRECTION IMMÉDIATE :
 *    window.location.href = targetUrl;
 */
export async function createHostedCheckoutSession(
  params: SenePaySessionParams = {}
): Promise<SenePaySessionResponse> {
  const appBaseUrl = getAppUrl();
  const reference = params.reference || params.orderReference || `DOKYA-${Date.now()}`;
  const amount = Math.max(100, Math.round(Number(params.amount) || 1000));
  const currency = params.currency || 'XOF';
  const returnUrl = params.returnUrl || `${appBaseUrl}/?status=success`;
  const cancelUrl = params.cancelUrl || `${appBaseUrl}/?status=cancel`;

  const publicKey = (import.meta.env.VITE_SENEPAY_PUBLIC_KEY || getSenePayPublicKey() || '').trim();
  const secretKey = (import.meta.env.VITE_SENEPAY_SECRET_KEY || getSenePaySecretKey() || '').trim();

  // Corps de requête JSON standard SenePay Checkout Hébergé (Accepte snake_case, camelCase et PascalCase)
  const bodyPayload: Record<string, any> = {
    amount,
    currency,
    reference,
    order_reference: reference,
    orderReference: reference,
    return_url: returnUrl,
    returnUrl: returnUrl,
    cancel_url: cancelUrl,
    cancelUrl: cancelUrl,
    country: 'SN',
    expires_in_minutes: 60,
    expiresInMinutes: 60,
    ...(params.description ? { description: params.description } : {}),
    ...(params.customerEmail ? { customer_email: params.customerEmail, customerEmail: params.customerEmail } : {}),
    ...(params.customerName ? { customer_name: params.customerName, customerName: params.customerName } : {}),
    ...(params.customerPhone ? { customer_phone: params.customerPhone, customerPhone: params.customerPhone } : {})
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Api-Key': publicKey,
    'X-Api-Secret': secretKey
  };

  let targetUrl: string | null = null;
  let lastErrorMessage: string | null = null;
  let lastErrorCode: string | null = null;

  // 1. Envoi direct de la requête POST vers https://api.sene-pay.com/api/v1/checkout/sessions
  try {
    const response = await fetch('https://api.sene-pay.com/api/v1/checkout/sessions', {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload)
    });

    const responseText = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Not JSON
    }

    if (response.ok && data) {
      targetUrl = extractCheckoutUrl(data);
    } else if (!response.ok) {
      lastErrorCode = data?.code || data?.errorCode || `HTTP_${response.status}`;
      lastErrorMessage = data?.message || data?.error || `Erreur SenePay ${response.status}`;
      console.warn(`[SenePay Direct Response ${response.status}]:`, data || responseText);
    }
  } catch (directErr: any) {
    console.warn('[SenePay Direct Fetch Error]:', directErr?.message);
    lastErrorMessage = directErr?.message;
  }

  // 2. Si le navigateur est bloqué (CORS / Sandboxed iframe), relais via le proxy serveur local
  if (!targetUrl) {
    try {
      const serverRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (serverRes.ok && serverRes.status !== 405) {
        const serverData = await serverRes.json();
        targetUrl = extractCheckoutUrl(serverData);
      }
    } catch (_proxyErr) {
      // Server proxy not available
    }
  }

  // 3. Redirection navigateur immédiate si une URL de paiement a été obtenue
  if (targetUrl) {
    console.log(`[SenePay Hosted Checkout] Redirection immédiate vers : ${targetUrl}`);
    
    if (params.autoRedirect !== false && typeof window !== 'undefined') {
      try {
        window.location.href = targetUrl;
      } catch (redirectErr) {
        console.warn('Navigation error:', redirectErr);
      }
    }

    return {
      success: true,
      checkoutUrl: targetUrl,
      redirectUrl: targetUrl,
      url: targetUrl,
      reference,
      orderReference: reference
    };
  }

  return {
    success: false,
    reference,
    orderReference: reference,
    error: lastErrorMessage || "Impossible d'ouvrir la session SenePay. Vérifiez vos clés d'API SenePay.",
    errorCode: lastErrorCode || 'CHECKOUT_SESSION_FAILED'
  };
}

