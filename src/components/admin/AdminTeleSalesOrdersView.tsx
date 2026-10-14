import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Crown,
  Phone,
  User,
  MapPin,
  RefreshCw,
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  MessageCircle,
  Eye,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { StoreOrder } from '../../types';
import { 
  fetchAllTelemarketerOrders, 
  adminForceValidateCommission, 
  adminCancelCommission 
} from '../../lib/storeService';
import { useLocale } from '../../contexts/LocaleContext';

interface AdminTeleSalesOrdersViewProps {
  initialTelemarketerId?: string;
  adminEmail?: string;
}

export const AdminTeleSalesOrdersView: React.FC<AdminTeleSalesOrdersViewProps> = ({
  initialTelemarketerId,
  adminEmail = 'admin@dokya.site'
}) => {
  const { formatPrice } = useLocale();

  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTelemarketerFilter, setSelectedTelemarketerFilter] = useState<string>(initialTelemarketerId || 'all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered' | 'cancelled'>('all');
  const [commissionFilter, setCommissionFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all');

  // Action Modals State
  const [forceValidateOrder, setForceValidateOrder] = useState<StoreOrder | null>(null);
  const [validateNote, setValidateNote] = useState<string>('Validation administrative de la commission : livraison client confirmée.');
  const [isForceValidating, setIsForceValidating] = useState<boolean>(false);

  const [cancelCommissionOrder, setCancelCommissionOrder] = useState<StoreOrder | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Commande fictive ou non livrée au client final');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const [selectedProofOrder, setSelectedProofOrder] = useState<StoreOrder | null>(null);

  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4000);
  };

  // Load orders
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllTelemarketerOrders();
      setOrders(data);
    } catch (err: any) {
      console.error('Erreur chargement commandes téléventes:', err);
      showError('Impossible de charger les commandes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Telemarketer filter
      if (selectedTelemarketerFilter !== 'all' && o.telemarketerId !== selectedTelemarketerFilter) {
        return false;
      }

      // Search
      const search = searchTerm.toLowerCase().trim();
      const matchSearch = !search || 
        o.id.toLowerCase().includes(search) ||
        (o.productTitle || '').toLowerCase().includes(search) ||
        (o.telemarketerName || '').toLowerCase().includes(search) ||
        (o.buyerName || '').toLowerCase().includes(search) ||
        (o.buyerPhone || '').toLowerCase().includes(search) ||
        (o.sellerUsername || '').toLowerCase().includes(search);

      // Status
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;

      // Commission status
      const commStatus = o.commissionStatus || (o.status === 'delivered' ? 'paid' : o.status === 'cancelled' ? 'cancelled' : 'pending');
      const matchCommission = commissionFilter === 'all' || commStatus === commissionFilter;

      return matchSearch && matchStatus && matchCommission;
    });
  }, [orders, selectedTelemarketerFilter, searchTerm, statusFilter, commissionFilter]);

  // KPIs
  const kpiTotalCount = orders.length;
  const kpiTotalVolume = useMemo(() => orders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0), [orders]);
  const kpiPaidCommissions = useMemo(() => {
    return orders
      .filter(o => o.commissionStatus === 'paid' || o.status === 'delivered')
      .reduce((acc, o) => acc + Number(o.commissionNet || 0), 0);
  }, [orders]);
  const kpiPendingCommissions = useMemo(() => {
    return orders
      .filter(o => o.status === 'pending' && o.commissionStatus !== 'cancelled')
      .reduce((acc, o) => acc + Number(o.commissionNet || 0), 0);
  }, [orders]);

  // ACTION: FORCE VALIDATE COMMISSION
  const handleConfirmForceValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forceValidateOrder) return;

    setIsForceValidating(true);
    try {
      await adminForceValidateCommission({
        orderId: forceValidateOrder.id,
        adminEmail,
        note: validateNote.trim()
      });

      // Update local state
      setOrders(prev => prev.map(o => {
        if (o.id === forceValidateOrder.id) {
          return {
            ...o,
            status: 'delivered',
            commissionStatus: 'paid',
            forceValidatedByAdmin: true,
            adminValidatedAt: new Date().toISOString(),
            adminValidatorEmail: adminEmail,
            adminValidationNote: validateNote.trim()
          };
        }
        return o;
      }));

      showSuccess(`Commission de ${formatPrice(forceValidateOrder.commissionNet || 0)} validée et créditée avec succès au télévendeur !`);
      setForceValidateOrder(null);
    } catch (err: any) {
      showError(err?.message || 'Erreur lors de la validation de la commission.');
    } finally {
      setIsForceValidating(false);
    }
  };

  // ACTION: CANCEL COMMISSION
  const handleConfirmCancelCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelCommissionOrder) return;
    if (!cancelReason.trim()) {
      showError('Le motif d\'annulation est obligatoire.');
      return;
    }

    setIsCancelling(true);
    try {
      await adminCancelCommission({
        orderId: cancelCommissionOrder.id,
        adminEmail,
        reason: cancelReason.trim()
      });

      setOrders(prev => prev.map(o => {
        if (o.id === cancelCommissionOrder.id) {
          return {
            ...o,
            status: 'cancelled',
            commissionStatus: 'cancelled',
            isCommissionCancelled: true,
            adminCancelledAt: new Date().toISOString(),
            adminCancellerEmail: adminEmail,
            adminCancellationReason: cancelReason.trim()
          };
        }
        return o;
      }));

      showSuccess(`Commission de la commande ${cancelCommissionOrder.id} annulée.`);
      setCancelCommissionOrder(null);
    } catch (err: any) {
      showError(err?.message || 'Erreur lors de l\'annulation de la commission.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Messages */}
      {successToast && (
        <div className="fixed top-5 right-5 z-[200] max-w-md p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold">{successToast}</p>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-5 right-5 z-[200] max-w-md p-4 rounded-2xl bg-rose-600 text-white shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <XCircle className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold">{errorToast}</p>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Modération des Commandes & Litiges Téléventes</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-500/30">
                  {kpiTotalCount} Commande{kpiTotalCount > 1 ? 's' : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Arbitrage administratif : Validation forcée des commissions légitimes et annulation des abus.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualiser les commandes</span>
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Volume Ventes Télévente</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-white truncate">
            {formatPrice(kpiTotalVolume)}
          </div>
          <p className="text-[10px] text-slate-500">{kpiTotalCount} commandes passées</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Commissions Versées</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 truncate">
            {formatPrice(kpiPaidCommissions)}
          </div>
          <p className="text-[10px] text-emerald-400/70">Créditées sur soldes</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Commissions En Attente</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 truncate">
            {formatPrice(kpiPendingCommissions)}
          </div>
          <p className="text-[10px] text-amber-400/70">En cours de livraison / litige</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Prélèvement Dokya (20%)</span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-400 truncate">
            {formatPrice(Math.round(kpiPaidCommissions * 0.25))}
          </div>
          <p className="text-[10px] text-purple-400/70">Sur télévendeurs Standard</p>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° commande, client, produit..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Statut Livraison */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Tous les Statuts Livraison</option>
            <option value="pending">En attente de livraison</option>
            <option value="delivered">Livrées avec succès</option>
            <option value="cancelled">Annulées</option>
          </select>

          {/* Statut Commission */}
          <select
            value={commissionFilter}
            onChange={(e) => setCommissionFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Toutes les Commissions</option>
            <option value="pending">Commissions en attente</option>
            <option value="paid">Commissions validées / payées</option>
            <option value="cancelled">Commissions annulées</option>
          </select>
        </div>
      </div>

      {/* ORDERS TABLE */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Commande</th>
                <th className="py-3 px-3">Télévendeur</th>
                <th className="py-3 px-3">Produit & Vendeur</th>
                <th className="py-3 px-3">Client Acheteur</th>
                <th className="py-3 px-3 text-right">Montant</th>
                <th className="py-3 px-3 text-right">Commission Nette</th>
                <th className="py-3 px-3 text-center">Statuts</th>
                <th className="py-3 px-4 text-center">Actions Arbitrage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-400" />
                    <p className="font-semibold text-slate-400">Aucune commande télévente trouvée</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Les commandes saisies par vos télévendeurs apparaîtront automatiquement ici.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isVip = order.telemarketerMode === 'vip';
                  const commStatus = order.commissionStatus || (order.status === 'delivered' ? 'paid' : order.status === 'cancelled' ? 'cancelled' : 'pending');
                  const isForceValidated = order.forceValidatedByAdmin;
                  const isCommCancelled = order.isCommissionCancelled || commStatus === 'cancelled';
                  const hasProof = !!(order.proofUrl || order.proofNote);

                  return (
                    <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Commande ID & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white text-xs">
                          {order.id}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>

                      {/* Télévendeur */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-white flex items-center gap-1.5 truncate">
                          <span>{order.telemarketerName || 'Télévendeur'}</span>
                          {isVip && (
                            <span title="Mode VIP (100% Commissions)">
                              <Crown className="w-3 h-3 text-purple-400 shrink-0" />
                            </span>
                          )}
                        </div>
                        {order.telemarketerPhone && (
                          <a
                            href={`https://wa.me/${order.telemarketerPhone.replace(/[^\d]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:underline"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>{order.telemarketerPhone}</span>
                          </a>
                        )}
                      </td>

                      {/* Produit & Vendeur */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-200 line-clamp-1" title={order.productTitle}>
                          {order.productTitle}
                        </div>
                        <div className="text-[10px] text-indigo-400 font-medium">
                          Vendeur : @{order.sellerUsername || 'vendeur'}
                        </div>
                      </td>

                      {/* Client Acheteur */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-200 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{order.buyerName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-[150px]">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span title={order.buyerAddress}>{order.buyerAddress}</span>
                        </div>
                        {order.buyerPhone && (
                          <a
                            href={`https://wa.me/${order.buyerPhone.replace(/[^\d]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:underline mt-0.5"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>{order.buyerPhone}</span>
                          </a>
                        )}
                      </td>

                      {/* Montant Commande */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono font-bold text-white text-xs">
                          {formatPrice(order.totalAmount)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Qté : {order.quantity || 1}
                        </div>
                      </td>

                      {/* Commission Nette */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono font-black text-emerald-400 text-xs">
                          +{formatPrice(order.commissionNet || 0)}
                        </div>
                        <div className="text-[9px] text-slate-400">
                          {isVip ? 'VIP (100%)' : `Brut: ${formatPrice(order.commissionGross || 0)} (-20%)`}
                        </div>
                      </td>

                      {/* Statuts */}
                      <td className="py-3.5 px-3 text-center space-y-1">
                        {/* Livraison */}
                        <div>
                          {order.status === 'delivered' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Livré</span>
                            </span>
                          ) : order.status === 'cancelled' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-black uppercase">
                              <XCircle className="w-2.5 h-2.5" />
                              <span>Annulé</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase">
                              <Clock className="w-2.5 h-2.5" />
                              <span>En Attente</span>
                            </span>
                          )}
                        </div>

                        {/* Commission */}
                        <div>
                          {commStatus === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-black uppercase">
                              <DollarSign className="w-2.5 h-2.5" />
                              <span>{isForceValidated ? 'Validée (Admin)' : 'Payée'}</span>
                            </span>
                          ) : commStatus === 'cancelled' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold">
                              <span>Comm. Annulée</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[9px]">
                              <span>Non Versée</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ACTIONS D'ARBITRAGE ADMIN */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Force Validate Button */}
                          {commStatus !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => {
                                setForceValidateOrder(order);
                                setValidateNote(`Validation forcée par l'administrateur : livraison confirmée auprès du client ${order.buyerName}.`);
                              }}
                              title="Valider manuellement la commission et créditer le télévendeur"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            >
                              <Check className="w-3 h-3" />
                              <span>Force-Validate</span>
                            </button>
                          )}

                          {/* Cancel Commission Button */}
                          {commStatus !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelCommissionOrder(order);
                                setCancelReason(`Litige commande ${order.id} : commande non livrée ou coordonnées client erronées.`);
                              }}
                              title="Annuler la commission injustifiée"
                              className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-bold transition-all cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}

                          {/* View Proof Button */}
                          {hasProof && (
                            <button
                              type="button"
                              onClick={() => setSelectedProofOrder(order)}
                              title="Voir la preuve de vente déposée par le télévendeur"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 transition-all cursor-pointer"
                            >
                              <FileText className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: FORCE VALIDATE COMMISSION                                    */}
      {/* ===================================================================== */}
      {forceValidateOrder && (
        <div 
          className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setForceValidateOrder(null)}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-emerald-500/40 p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Validation Forcée de Commission</h3>
                <p className="text-[11px] text-slate-400">
                  Commande {forceValidateOrder.id} • {forceValidateOrder.productTitle}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Télévendeur bénéficiaire :</span>
                <span className="font-bold text-white">{forceValidateOrder.telemarketerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Commission nette à créditer :</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  +{formatPrice(forceValidateOrder.commissionNet || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Mode Télévendeur :</span>
                <span className="font-bold text-purple-400 uppercase text-[10px]">
                  {forceValidateOrder.telemarketerMode === 'vip' ? 'VIP (100%)' : 'Standard (20% Dokya)'}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmForceValidate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Note d'arbitrage administrateur
                </label>
                <textarea
                  rows={2}
                  required
                  value={validateNote}
                  onChange={(e) => setValidateNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setForceValidateOrder(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isForceValidating}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isForceValidating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Valider & Créditer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: CANCEL COMMISSION                                            */}
      {/* ===================================================================== */}
      {cancelCommissionOrder && (
        <div 
          className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCancelCommissionOrder(null)}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-rose-500/40 p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Annuler la commission</h3>
                <p className="text-[11px] text-slate-400">
                  Commande {cancelCommissionOrder.id} • {cancelCommissionOrder.productTitle}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Cette action annulera la commission de <strong className="text-rose-400">{formatPrice(cancelCommissionOrder.commissionNet || 0)}</strong> et enverra une notification de rejet au télévendeur.
            </p>

            <form onSubmit={handleConfirmCancelCommission} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Motif d'annulation <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Fausse commande, client non joignable, tentative de fraude..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setCancelCommissionOrder(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isCancelling ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Confirmer Rejet Commission</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: PREUVE DE VENTE & BORDEREAU                                  */}
      {/* ===================================================================== */}
      {selectedProofOrder && (
        <div 
          className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedProofOrder(null)}
        >
          <div 
            className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Preuve de Vente & Conversation</h3>
                  <p className="text-[11px] text-slate-400">
                    Commande {selectedProofOrder.id} • Télévendeur : {selectedProofOrder.telemarketerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProofOrder(null)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            {selectedProofOrder.proofNote && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes du Télévendeur :</span>
                <p className="text-xs text-slate-200">{selectedProofOrder.proofNote}</p>
              </div>
            )}

            {selectedProofOrder.proofUrl ? (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capture d'écran / Document :</span>
                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 max-h-80 flex items-center justify-center">
                  <img
                    src={selectedProofOrder.proofUrl}
                    alt="Preuve de vente"
                    className="max-h-80 w-auto object-contain"
                  />
                </div>
                <a
                  href={selectedProofOrder.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ouvrir l'image en taille réelle</span>
                </a>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Aucune image téléversée pour cette commande.</p>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedProofOrder(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
