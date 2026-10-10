/**
 * API Route: /api/moneyfusion/checkout
 * 100% autonome - Compatible Vercel Serverless Function & Next.js App Router
 * Capture obligatoire du téléphone Mobile Money et montant > 0 FCFA
 * Prise en charge intégrale des frais de transaction par le marchand (fee_take_over)
 */

// Helper asynchrone dynamique pour charger la base Firestore sans risque ERR_REQUIRE_ESM
let _cachedDb: any = null;
async function getFirestoreDb(): Promise<any> {
  if (_cachedDb) return _cachedDb;
  try {
    const mod = await import('../../lib/firebaseAdmin.js');
    _cachedDb = mod.db || mod.dbAdmin || null;
    return _cachedDb;
  } catch (err: any) {
    console.warn('[Checkout API] Warning chargement Firestore DB (repli sécurisé):', err?.message || err);
    return null;
  }
}

interface MoneyFusionRequestBody {
  amount?: number | string;
  totalPrice?: number | string;
  phoneNumber?: string;
  userPhone?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  type?: string;
  paymentMethodType?: 'mobile_money' | 'crypto';
  operator?: string;
  cryptoNetwork?: string;
  cryptoNetworkLabel?: string;
  cryptoToken?: string;
  [key: string]: any;
}

export async function processMoneyFusionCheckout(body: MoneyFusionRequestBody) {
  const {
    amount,
    totalPrice,
    phoneNumber = '',
    userPhone = '',
    userId = '',
    userEmail = '',
    userName = '',
    customer = {},
    paymentMethodType = 'mobile_money',
    operator = '',
    cryptoNetwork = '',
    cryptoNetworkLabel = '',
    cryptoToken = ''
  } = body || {};

  const rawAmount = amount !== undefined ? amount : (totalPrice !== undefined ? totalPrice : 0);
  const numericAmount = Number(rawAmount);

  const isCrypto = paymentMethodType === 'crypto' || Boolean(cryptoNetwork);

  // 1. Validation du montant selon le mode
  if (isCrypto) {
    if (isNaN(numericAmount) || numericAmount < 10000) {
      return {
        status: 400,
        data: {
          success: false,
          error: 'Le montant minimum pour un rechargement en cryptomonnaie est de 10 000 FCFA.'
        }
      };
    }
  } else {
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return {
        status: 400,
        data: {
          success: false,
          error: 'Montant de paiement invalide. Le montant doit être supérieur à 0 FCFA.'
        }
      };
    }
    // Validation du numéro de téléphone pour Mobile Money
    const targetPhone = String(phoneNumber || userPhone || customer.phone || '').trim();
    if (!targetPhone) {
      return {
        status: 400,
        data: {
          success: false,
          error: 'Le numéro de téléphone (pour le paiement Mobile Money) est obligatoire.'
        }
      };
    }
  }

  const targetPhone = String(phoneNumber || userPhone || customer.phone || (isCrypto ? 'CRYPTO_BLOCKCHAIN' : '')).trim();
  const targetUserId = String(userId || 'guest').trim() || 'guest';
  const targetUserEmail = String(userEmail || customer.email || '').trim();
  const targetName = String(userName || customer.name || 'Utilisateur').trim() || 'Utilisateur';

  const paymentId = isCrypto 
    ? `MF-CRYPTO-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    : `MF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const nowIso = new Date().toISOString();

  // Détermination du réseau et token crypto
  const resolvedCryptoNetwork = isCrypto ? (cryptoNetwork || 'USDTTRC20') : null;
  const resolvedCryptoLabel = isCrypto ? (cryptoNetworkLabel || (resolvedCryptoNetwork === 'USDTTRC20' ? 'TRC20 (USDTTRC20)' : resolvedCryptoNetwork === 'USDTBSC' ? 'BEP20 (USDTBSC)' : resolvedCryptoNetwork === 'SOL' ? 'SOLANA (SOL)' : 'USDC BEP20 (USDCBSC)')) : null;
  const resolvedCryptoToken = isCrypto ? (cryptoToken || (resolvedCryptoNetwork?.startsWith('USDC') ? 'USDC' : resolvedCryptoNetwork === 'SOL' ? 'SOL' : 'USDT')) : null;
  const mockTxHash = isCrypto ? `0x${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 12)}` : null;

  // 3. Création de la transaction dans Firestore 'transactions' avec statut PENDING
  const db = await getFirestoreDb();
  if (db && typeof db.collection === 'function') {
    try {
      const pendingTx = {
        transactionId: paymentId,
        id: paymentId,
        userId: targetUserId,
        userEmail: targetUserEmail,
        userName: targetName,
        phoneNumber: targetPhone,
        userPhone: targetPhone,
        type: 'wallet_recharge',
        resolvedType: 'wallet',
        typeLabel: isCrypto ? `Recharge Crypto (${resolvedCryptoNetwork})` : 'Recharge Solde Mobile Money',
        amount: numericAmount,
        expectedAmount: numericAmount,
        nominalAmount: numericAmount,
        fee_take_over: true,
        currency: 'XOF',
        status: 'PENDING',
        paymentGateway: 'Money Fusion',
        paymentMethod: isCrypto ? 'crypto' : (operator || 'mobile_money'),
        paymentMethodType: isCrypto ? 'crypto' : 'mobile_money',
        operator: isCrypto ? 'crypto' : (operator || 'mobile_money'),
        cryptoNetwork: resolvedCryptoNetwork,
        cryptoNetworkLabel: resolvedCryptoLabel,
        cryptoToken: resolvedCryptoToken,
        transactionHash: mockTxHash,
        hash: mockTxHash,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      await db.collection('transactions').doc(paymentId).set(pendingTx, { merge: true });
      console.log(`[Checkout API] Transaction PENDING enregistrée dans Firestore: ${paymentId} (${numericAmount} FCFA, mode: ${isCrypto ? `crypto ${resolvedCryptoNetwork}` : `mobile money ${operator}`})`);
    } catch (dbErr: any) {
      console.warn('[Checkout API] Warning Firestore save:', dbErr?.message);
    }
  }

  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'https://dokya-seven.vercel.app').replace(/\/$/, '');
  const returnUrl = `${appBaseUrl}/dashboard?payment=return&transactionId=${paymentId}&type=wallet&amount=${numericAmount}&method=${isCrypto ? 'crypto' : 'mobile_money'}`;
  const webhookUrl = `${appBaseUrl}/api/webhooks/moneyfusion`;

  const apiKey = process.env.MONEYFUSION_API_KEY;
  let targetEndpoint = (process.env.MONEYFUSION_API_URL || 'https://api.moneyfusion.net').trim();
  if (targetEndpoint === 'https://api.moneyfusion.net' || targetEndpoint === 'https://api.moneyfusion.net/') {
    targetEndpoint = 'https://api.moneyfusion.net/api/v1/payments';
  }

  // 4. Transmission à Money Fusion avec prise en charge des frais par le marchand (fee_take_over)
  // L'utilisateur doit impérativement recevoir le montant exact rechargé X FCFA
  const paymentData = {
    amount: Number(numericAmount),
    totalPrice: Number(numericAmount),
    // Configuration officielle de prise en charge des frais par le marchand
    fee_take_over: true,
    frais: false,
    frais_client: false,
    frais_marchand: true,
    fee_charge: 'merchant',
    moyen_paiement: isCrypto ? 'crypto' : 'mobile_money',
    payment_method: isCrypto ? 'crypto' : (operator || 'mobile_money'),
    channel: isCrypto ? 'crypto' : 'mobile_money',
    crypto_currency: isCrypto ? resolvedCryptoNetwork : undefined,
    crypto: isCrypto ? resolvedCryptoNetwork : undefined,
    network: isCrypto ? resolvedCryptoNetwork : undefined,
    article: [
      { [isCrypto ? `Recharge Crypto (${resolvedCryptoNetwork}) Dokya` : "Rechargement Wallet Dokya"]: Number(numericAmount) }
    ],
    personal_Info: [
      {
        transactionId: paymentId,
        userId: targetUserId,
        userEmail: targetUserEmail,
        userName: targetName,
        phoneNumber: targetPhone,
        amount: Number(numericAmount),
        expectedAmount: Number(numericAmount),
        nominalAmount: Number(numericAmount),
        fee_take_over: true,
        type: 'wallet_recharge',
        paymentMethod: isCrypto ? 'crypto' : (operator || 'mobile_money'),
        paymentMethodType: isCrypto ? 'crypto' : 'mobile_money',
        operator: isCrypto ? 'crypto' : (operator || 'mobile_money'),
        cryptoNetwork: resolvedCryptoNetwork,
        cryptoNetworkLabel: resolvedCryptoLabel,
        cryptoToken: resolvedCryptoToken
      }
    ],
    numeroSend: targetPhone,
    nomclient: targetName,
    return_url: returnUrl,
    webhook_url: webhookUrl
  };


  if (apiKey || process.env.MONEYFUSION_API_URL) {
    try {
      const response = await fetch(targetEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}`, 'X-API-KEY': apiKey } : {})
        },
        body: JSON.stringify(paymentData)
      });

      const data: any = await response.json().catch(() => ({}));

      if (response.ok) {
        const checkoutUrl = data.url || (data.token ? `https://pay.moneyfusion.net/checkout/${data.token}` : null);
        if (checkoutUrl) {
          // Sauvegarder le token Money Fusion officiel dans la transaction Firestore
          if (db && typeof db.collection === 'function') {
            try {
              const nowIso = new Date().toISOString();
              const mfToken = String(data.token || '').trim();
              await db.collection('transactions').doc(paymentId).set({
                token: mfToken || null,
                tokenPay: mfToken || null,
                checkoutUrl: checkoutUrl,
                status: 'PENDING',
                isProcessed: false,
                amount: numericAmount,
                expectedAmount: numericAmount,
                nominalAmount: numericAmount,
                fee_take_over: true,
                createdAt: nowIso,
                updatedAt: nowIso
              }, { merge: true });

              if (mfToken && mfToken !== paymentId) {
                await db.collection('transactions').doc(mfToken).set({
                  id: mfToken,
                  transactionId: paymentId,
                  linkedTxId: paymentId,
                  token: mfToken,
                  tokenPay: mfToken,
                  userId: targetUserId,
                  userEmail: targetUserEmail,
                  userName: targetName,
                  phoneNumber: targetPhone,
                  amount: numericAmount,
                  expectedAmount: numericAmount,
                  nominalAmount: numericAmount,
                  fee_take_over: true,
                  currency: 'XOF',
                  type: 'wallet_recharge',
                  status: 'PENDING',
                  isProcessed: false,
                  checkoutUrl: checkoutUrl,
                  createdAt: nowIso,
                  updatedAt: nowIso
                }, { merge: true });
              }
            } catch (_e) {}
          }

          console.log(`[Checkout API] Guichet Money Fusion obtenu avec succès: ${checkoutUrl} (token: ${data.token})`);
          return {
            status: 200,
            data: {
              success: true,
              url: checkoutUrl,
              token: data.token || paymentId,
              transactionId: paymentId,
              amount: numericAmount,
              provider: 'moneyfusion'
            }
          };
        }
      }
      console.warn('[Checkout API] Échec réponse Money Fusion:', data);
      return {
        status: 400,
        data: {
          success: false,
          error: data.message || "Échec de l'initialisation du paiement chez Money Fusion."
        }
      };
    } catch (err: any) {
      console.error('[Checkout API] Erreur appel Money Fusion:', err?.message);
      return {
        status: 502,
        data: {
          success: false,
          error: "Erreur de communication avec le guichet Money Fusion. Veuillez réessayer."
        }
      };
    }
  }

  return {
    status: 500,
    data: {
      success: false,
      error: "Service Money Fusion non configuré sur le serveur."
    }
  };
}

export default async function handler(req: any, res?: any) {
  if (!res || typeof res.status !== 'function') {
    const body = await req.json().catch(() => ({}));
    const result = await processMoneyFusionCheckout(body);
    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const result = await processMoneyFusionCheckout(req.body || {});
  return res.status(result.status).json(result.data);
}
