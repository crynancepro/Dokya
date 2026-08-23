/**
 * SenePay Checkout Service - Re-export and adapter for Hosted Checkout v1
 */
import {
  createHostedCheckoutSession,
  getSenePayPublicKey,
  getSenePaySecretKey,
  SenePaySessionParams,
  SenePaySessionResponse
} from '../services/senepay';

export { getSenePayPublicKey, getSenePaySecretKey };
export type { SenePaySessionParams, SenePaySessionResponse };

export interface SenePayCheckoutOptions {
  amount: number;
  description?: string;
  orderReference?: string;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface SenePayCheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  redirectUrl?: string;
  orderReference?: string;
  error?: string;
  missingCredentials?: boolean;
  isFallback?: boolean;
}

/**
 * Initialize a SenePay Checkout Session directly using Method A (Hosted Checkout v1)
 */
export async function createSenePayCheckoutSession(
  options: SenePayCheckoutOptions
): Promise<SenePayCheckoutResult> {
  const result = await createHostedCheckoutSession({
    amount: options.amount,
    description: options.description,
    orderReference: options.orderReference,
    returnUrl: options.returnUrl,
    cancelUrl: options.cancelUrl,
    customerEmail: options.customerEmail,
    customerName: options.customerName,
    customerPhone: options.customerPhone
  });

  return {
    success: result.success,
    checkoutUrl: result.checkoutUrl || result.redirectUrl,
    redirectUrl: result.redirectUrl || result.checkoutUrl,
    orderReference: result.orderReference,
    error: result.error,
    isFallback: result.isFallback
  };
}
