import { TransactionRecord } from '../types';

/**
 * Utilitaires financiers certifiés Dokya pour le calcul du Chiffre d'Affaires (CA) réel
 * Règle stricte Dokya :
 * - Le CA réel comptabilise UNIQUEMENT les entrées d'argent réelles :
 *   1. Recharges de solde / portefeuille validées (Money Fusion, Wave, Orange Money, Free Money, Carte, etc.)
 *   2. Achats directs payés hors-solde (payés directement via Wave, Orange Money, Money Fusion, Carte, etc.)
 * - Les achats effectués avec le solde interne (Wallet) NE DOIVENT PAS réaugmenter le Chiffre d'Affaires global,
 *   car cet argent a déjà été comptabilisé lors de la recharge du solde.
 */

export function parseTransactionAmount(tx: any): number {
  if (!tx) return 0;
  const candidateFields = [
    tx.amount,
    tx.expectedAmount,
    tx.extractedAmount,
    tx.paidAmount,
    tx.totalAmount,
    tx.pricePaid,
    tx.montant,
    tx.price,
    tx.total,
    tx.rechargeAmount,
    tx.extractedData?.amount,
    tx.extractedData?.expectedAmount,
    tx.paymentDetails?.amount
  ];

  for (const val of candidateFields) {
    if (val !== undefined && val !== null) {
      if (typeof val === 'number' && !isNaN(val) && val > 0) {
        return val;
      }
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        if (!isNaN(num) && num > 0) {
          return num;
        }
      }
    }
  }

  return 0;
}

export function parseTransactionDate(raw: any): Date | null {
  if (!raw) return null;
  try {
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    if (typeof raw.toDate === 'function') return raw.toDate();
    if (typeof raw.toMillis === 'function') return new Date(raw.toMillis());
    if (raw.seconds) return new Date(raw.seconds * 1000);
    if (typeof raw === 'number') return new Date(raw);
    if (typeof raw === 'string') {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
  } catch {}
  return null;
}

/**
 * Vérifie si la transaction est validée/approuvée avec succès
 */
export function isTransactionApproved(tx: any): boolean {
  if (!tx) return false;
  const status = String(tx.status || (tx as any).paymentStatus || '').toUpperCase().trim();
  return (
    status === 'APPROVED' ||
    status === 'VALIDATED_BY_AI' ||
    status === 'SUCCESS' ||
    status === 'COMPLETED' ||
    status === 'MANUALLY_VALIDATED' ||
    status === 'PAID'
  );
}

/**
 * Détecte si un paiement a été effectué via le solde interne / wallet de l'utilisateur
 */
export function isPaidWithInternalWallet(tx: any): boolean {
  if (!tx) return false;
  const methodStr = String(tx.paymentMethod || (tx as any).method || (tx as any).operator || '').toLowerCase().trim();
  const typeStr = String(tx.type || (tx as any).transactionType || '').toLowerCase().trim();
  const descStr = String((tx.description || '') + ' ' + (tx.title || '')).toLowerCase();

  return (
    methodStr === 'wallet' ||
    methodStr === 'solde' ||
    methodStr === 'solde_interne' ||
    methodStr === 'dokya_wallet' ||
    methodStr === 'credits' ||
    typeStr === 'wallet_debit' ||
    typeStr === 'balance_debit' ||
    descStr.includes('débit solde') ||
    descStr.includes('payé par solde') ||
    descStr.includes('payé avec solde') ||
    descStr.includes('payé avec le solde')
  );
}

/**
 * Détermine si une transaction est une ENTRÉE D'ARGENT RÉELLE (CA encaissé)
 * - Doit être validée (approved/success)
 * - Doit être externe (Recharge Money Fusion/Wave/OM OU achat direct hors-solde)
 * - Exclut strictement les paiements par solde interne pour éliminer tout doublon
 */
export function isRealCashInflow(tx: any): boolean {
  if (!isTransactionApproved(tx)) return false;
  if (isPaidWithInternalWallet(tx)) return false;
  const amt = parseTransactionAmount(tx);
  return amt > 0;
}

export type CATimeFilter = 'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'all' | 'custom';

export interface CATimeBounds {
  start: Date;
  end: Date;
  label: string;
}

export function getTimeBoundsForFilter(
  filter: CATimeFilter,
  customStart?: string,
  customEnd?: string
): CATimeBounds {
  const now = new Date();
  
  if (filter === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end, label: "Aujourd'hui" };
  }

  if (filter === 'this_week') {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
    const end = new Date(now.getTime());
    return { start, end, label: 'Semaine en cours' };
  }

  if (filter === 'last_week') {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const lastMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday - 7, 0, 0, 0, 0);
    const lastSunday = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() + 6, 23, 59, 59, 999);
    return { start: lastMonday, end: lastSunday, label: 'Semaine précédente' };
  }

  if (filter === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getTime());
    return { start, end, label: 'Mois en cours' };
  }

  if (filter === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end, label: 'Mois précédent' };
  }

  if (filter === 'custom' && customStart) {
    const start = new Date(customStart + 'T00:00:00');
    const end = customEnd ? new Date(customEnd + 'T23:59:59') : new Date();
    return { start, end, label: `Du ${customStart} au ${customEnd || 'maintenant'}` };
  }

  // 'all'
  return {
    start: new Date(2024, 0, 1),
    end: new Date(2099, 11, 31),
    label: 'Global (Tout)'
  };
}

/**
 * Calcule les métriques financières filtrées selon la période choisie
 */
export function computeFilteredFinancialStats(
  transactions: TransactionRecord[],
  filter: CATimeFilter,
  customStart?: string,
  customEnd?: string
) {
  const bounds = getTimeBoundsForFilter(filter, customStart, customEnd);
  const now = new Date();

  // Pour les compteurs comparatifs rapides
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
  const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday - 7, 0, 0, 0, 0);
  const lastWeekEnd = new Date(lastWeekStart.getFullYear(), lastWeekStart.getMonth(), lastWeekStart.getDate() + 6, 23, 59, 59, 999);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  let filteredRevenue = 0;
  let filteredCount = 0;
  let filteredWalletRecharges = 0;
  let filteredDirectSales = 0;

  let todayRevenue = 0;
  let todayCount = 0;
  let thisWeekRevenue = 0;
  let lastWeekRevenue = 0;
  let thisMonthRevenue = 0;
  let lastMonthRevenue = 0;
  let totalRevenue = 0;
  let totalValidatedCount = 0;

  let internalWalletSpentRevenue = 0; // Achats réglés avec solde (affiché séparément pour transparence)
  let internalWalletSpentCount = 0;

  transactions.forEach((tx) => {
    const isApproved = isTransactionApproved(tx);
    if (!isApproved) return;

    const amt = parseTransactionAmount(tx);
    if (amt <= 0) return;

    const isWalletPaid = isPaidWithInternalWallet(tx);
    const isCashIn = isRealCashInflow(tx);

    const txDate = parseTransactionDate(tx.createdAt || (tx as any).approvedAt || (tx as any).updatedAt);

    if (isWalletPaid) {
      internalWalletSpentRevenue += amt;
      internalWalletSpentCount++;
      return; // NE PAS compter dans le Chiffre d'Affaires encaissé réel
    }

    if (isCashIn) {
      totalRevenue += amt;
      totalValidatedCount++;

      if (txDate) {
        const time = txDate.getTime();

        // Période sélectionnée
        if (time >= bounds.start.getTime() && time <= bounds.end.getTime()) {
          filteredRevenue += amt;
          filteredCount++;

          const typeStr = String(tx.type || (tx as any).transactionType || '').toLowerCase();
          const descStr = String((tx.description || '') + ' ' + (tx.title || '')).toLowerCase();
          if (typeStr.includes('wallet') || descStr.includes('recharge') || descStr.includes('crédit')) {
            filteredWalletRecharges += amt;
          } else {
            filteredDirectSales += amt;
          }
        }

        // Aujourd'hui
        if (time >= todayStart.getTime()) {
          todayRevenue += amt;
          todayCount++;
        }

        // Semaine en cours
        if (time >= thisWeekStart.getTime()) {
          thisWeekRevenue += amt;
        }

        // Semaine précédente
        if (time >= lastWeekStart.getTime() && time <= lastWeekEnd.getTime()) {
          lastWeekRevenue += amt;
        }

        // Mois en cours
        if (time >= thisMonthStart.getTime()) {
          thisMonthRevenue += amt;
        }

        // Mois précédent
        if (time >= lastMonthStart.getTime() && time <= lastMonthEnd.getTime()) {
          lastMonthRevenue += amt;
        }
      } else {
        // Si pas de date, comptabiliser dans total et filtré si 'all'
        if (filter === 'all') {
          filteredRevenue += amt;
          filteredCount++;
        }
      }
    }
  });

  const averageBasket = filteredCount > 0 ? Math.round(filteredRevenue / filteredCount) : 0;

  return {
    periodLabel: bounds.label,
    filteredRevenue,
    filteredCount,
    averageBasket,
    filteredWalletRecharges,
    filteredDirectSales,
    todayRevenue,
    todayCount,
    thisWeekRevenue,
    lastWeekRevenue,
    thisMonthRevenue,
    lastMonthRevenue,
    totalRevenue,
    totalValidatedCount,
    internalWalletSpentRevenue,
    internalWalletSpentCount
  };
}
