/**
 * Service officiel de vérification d'authenticité et de statut des paiements Money Fusion
 * Interroge directement l'API officielle Money Fusion (https://pay.moneyfusion.net/paiementNotif/:token)
 * pour garantir à 100% qu'un paiement a réellement été encaissé avant tout crédit.
 */

export interface MoneyFusionVerificationResult {
  isPaid: boolean;
  isPending: boolean;
  isFailed: boolean;
  status: string;
  amount: number;
  transactionNumber?: string;
  token?: string;
  raw?: any;
}

export async function verifyMoneyFusionWithOfficialApi(tokenOrTxId: string): Promise<MoneyFusionVerificationResult> {
  const cleanId = String(tokenOrTxId || '').trim();
  if (!cleanId) {
    return { isPaid: false, isPending: false, isFailed: true, status: 'EMPTY_ID', amount: 0 };
  }

  try {
    const checkUrls = [
      `https://pay.moneyfusion.net/paiementNotif/${encodeURIComponent(cleanId)}`
    ];

    for (const url of checkUrls) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          const json: any = await res.json().catch(() => ({}));
          const pData = json.data || json;
          const rawStatut = String(pData.statut ?? json.statut ?? '').trim().toLowerCase();
          const montant = Number(pData.Montant ?? pData.amount ?? pData.totalPrice ?? 0);
          const numeroTransaction = String(pData.numeroTransaction || pData.transactionNumber || '').trim();

          const isPaid = (rawStatut === 'paid' || rawStatut === 'success' || rawStatut === 'completed') &&
            (montant > 0 || Boolean(numeroTransaction));

          const isPending = rawStatut === 'pending' || rawStatut === 'en cours' || rawStatut === 'creation' || rawStatut === '';
          const isFailed = rawStatut === 'cancel' || rawStatut === 'failed' || rawStatut === 'echec' || rawStatut === 'refused' || rawStatut === 'no paid';

          return {
            isPaid,
            isPending: !isPaid && isPending,
            isFailed: !isPaid && isFailed,
            status: isPaid ? 'SUCCESS' : (isFailed ? 'FAILED' : 'PENDING'),
            amount: montant,
            transactionNumber: numeroTransaction,
            token: pData.tokenPay || pData._id || cleanId,
            raw: pData
          };
        }
      } catch (subErr) {
        console.warn(`[verifyMoneyFusionWithOfficialApi] Warn pour URL ${url}:`, subErr);
      }
    }
  } catch (err: any) {
    console.error('[verifyMoneyFusionWithOfficialApi] Erreur globale:', err?.message);
  }

  return {
    isPaid: false,
    isPending: true,
    isFailed: false,
    status: 'PENDING',
    amount: 0
  };
}
