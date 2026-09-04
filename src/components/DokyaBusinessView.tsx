import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Users, Receipt, Plus, Search, Filter, Phone, Mail, 
  MapPin, CheckCircle2, AlertCircle, Clock, ArrowRight, ExternalLink, 
  Trash2, Edit3, X, Save, MessageSquare, FileText, ChevronRight, 
  TrendingUp, DollarSign, Eye, RefreshCw, Send, Check
} from 'lucide-react';
import { Customer, BusinessInvoice, BusinessDocData } from '../types';
import { 
  fetchCustomers, saveCustomer, deleteCustomer, subscribeToCustomers,
  fetchBusinessInvoices, saveBusinessInvoice, updateInvoicePaymentStatus, 
  deleteBusinessInvoice, subscribeToBusinessInvoices
} from '../lib/firebase';
import { auth } from '../lib/firebase';
import { 
  generateInvoiceWhatsAppLink, 
  generateCustomerStatementWhatsAppLink, 
  cleanPhoneNumberForWhatsApp 
} from '../utils/whatsappUtils';

interface DokyaBusinessViewProps {
  onOpenInvoiceGenerator?: (customer?: Customer, type?: 'devis' | 'facture') => void;
  onLoadInvoiceToEditor?: (data: BusinessDocData) => void;
}

export const DokyaBusinessView: React.FC<DokyaBusinessViewProps> = ({
  onOpenInvoiceGenerator,
  onLoadInvoiceToEditor
}) => {
  const currentUid = auth.currentUser?.uid || 'guest';

  // Subscriptions & Data State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<BusinessInvoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active View Tab inside Business
  const [activeTab, setActiveTab] = useState<'clients' | 'invoices'>('clients');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterUnpaidOnly, setFilterUnpaidOnly] = useState<boolean>(false);
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'unpaid' | 'paid' | 'devis'>('all');

  // Modals state
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState<boolean>(false);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // New Client Form state
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    ninea: '',
    paymentTerms: 'Comptant',
    notes: ''
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Toast / Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Real-time Firestore Subscriptions
  useEffect(() => {
    setIsLoading(true);
    const unsubCustomers = subscribeToCustomers(currentUid, (data) => {
      setCustomers(data);
      setIsLoading(false);
    });

    const unsubInvoices = subscribeToBusinessInvoices(currentUid, (data) => {
      setInvoices(data);
    });

    return () => {
      unsubCustomers();
      unsubInvoices();
    };
  }, [currentUid]);

  // Keep selected client updated if customers list changes
  useEffect(() => {
    if (selectedClientForDetails) {
      const updated = customers.find(c => c.id === selectedClientForDetails.id);
      if (updated) setSelectedClientForDetails(updated);
    }
  }, [customers]);

  // ============================================================================
  // FINANCIAL CALCULATIONS & STATS
  // ============================================================================
  const stats = useMemo(() => {
    const onlyFactures = invoices.filter(i => i.type === 'facture');
    const totalFacture = onlyFactures.reduce((acc, curr) => acc + (Number(curr.totalTTC) || 0), 0);
    const impayes = onlyFactures
      .filter(i => i.status === 'UNPAID')
      .reduce((acc, curr) => acc + (Number(curr.totalTTC) || 0), 0);
    const payees = totalFacture - impayes;

    return {
      totalClients: customers.length,
      facturesEmises: onlyFactures.length,
      devisEmis: invoices.filter(i => i.type === 'devis').length,
      totalFactureFCFA: totalFacture,
      impayesFCFA: impayes,
      payeesFCFA: payees
    };
  }, [customers, invoices]);

  // Client Financial Map
  const clientFinancialMap = useMemo(() => {
    const map = new Map<string, { totalBilled: number; totalUnpaid: number; invoicesCount: number }>();
    customers.forEach(c => {
      map.set(c.id, { totalBilled: 0, totalUnpaid: 0, invoicesCount: 0 });
    });

    invoices.forEach(inv => {
      // Find matching client by customerId or customerName/phone
      let matchedId = inv.customerId;
      if (!matchedId) {
        const found = customers.find(c => 
          c.name.trim().toLowerCase() === (inv.customerName || '').trim().toLowerCase() ||
          (c.phone && inv.customerPhone && cleanPhoneNumberForWhatsApp(c.phone) === cleanPhoneNumberForWhatsApp(inv.customerPhone))
        );
        if (found) matchedId = found.id;
      }

      if (matchedId && map.has(matchedId)) {
        const current = map.get(matchedId)!;
        if (inv.type === 'facture') {
          current.totalBilled += Number(inv.totalTTC) || 0;
          if (inv.status === 'UNPAID') {
            current.totalUnpaid += Number(inv.totalTTC) || 0;
          }
          current.invoicesCount += 1;
        }
      }
    });

    return map;
  }, [customers, invoices]);

  // Filtered Clients
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.ninea && c.ninea.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterUnpaidOnly) {
        const fin = clientFinancialMap.get(c.id);
        return (fin?.totalUnpaid || 0) > 0;
      }

      return true;
    });
  }, [customers, searchQuery, filterUnpaidOnly, clientFinancialMap]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        inv.docNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        (inv.customerPhone && inv.customerPhone.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (invoiceFilter === 'unpaid') return inv.type === 'facture' && inv.status === 'UNPAID';
      if (invoiceFilter === 'paid') return inv.type === 'facture' && inv.status === 'PAID';
      if (invoiceFilter === 'devis') return inv.type === 'devis';

      return true;
    });
  }, [invoices, searchQuery, invoiceFilter]);

  // ============================================================================
  // HANDLERS: CLIENT SAVE / EDIT / DELETE
  // ============================================================================
  const handleOpenAddClient = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      ninea: '',
      paymentTerms: 'Comptant',
      notes: ''
    });
    setEditingCustomer(null);
    setFormError(null);
    setIsNewClientModalOpen(true);
  };

  const handleOpenEditClient = (customer: Customer) => {
    setFormData({ ...customer });
    setEditingCustomer(customer);
    setFormError(null);
    setIsNewClientModalOpen(true);
  };

  const handleSaveClientForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setFormError('Le nom du client ou entreprise est obligatoire.');
      return;
    }
    if (!formData.phone?.trim()) {
      setFormError('Le numéro de téléphone WhatsApp est obligatoire.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const saved = await saveCustomer(currentUid, {
        ...(editingCustomer ? { id: editingCustomer.id } : {}),
        ...formData
      });
      if (saved) {
        setIsNewClientModalOpen(false);
        showToast(editingCustomer ? 'Fiche client mise à jour !' : 'Nouveau client ajouté !');
        if (selectedClientForDetails && selectedClientForDetails.id === saved.id) {
          setSelectedClientForDetails(saved);
        }
      }
    } catch (err) {
      setFormError('Erreur lors de la sauvegarde. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClient = async (customerId: string, clientName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le client "${clientName}" ?`)) {
      return;
    }
    await deleteCustomer(currentUid, customerId);
    if (selectedClientForDetails?.id === customerId) {
      setSelectedClientForDetails(null);
    }
    showToast(`Client "${clientName}" supprimé.`);
  };

  // Toggle Invoice Payment Status
  const handleToggleInvoiceStatus = async (invoice: BusinessInvoice) => {
    const newStatus = invoice.status === 'PAID' ? 'UNPAID' : 'PAID';
    await updateInvoicePaymentStatus(currentUid, invoice.id, newStatus);
    showToast(`Facture ${invoice.docNumber} marquée comme ${newStatus === 'PAID' ? 'PAYÉE' : 'IMPAYÉE'}`);
  };

  const handleDeleteInvoice = async (invoiceId: string, docNumber: string) => {
    if (!window.confirm(`Supprimer la facture / devis ${docNumber} ?`)) {
      return;
    }
    await deleteBusinessInvoice(currentUid, invoiceId);
    showToast(`Document ${docNumber} supprimé.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP HEADER & TITLE                                                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>Pôle Dokya Business</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase tracking-wider">
                  Clients & Suivi Financier
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gérez votre portefeuille clients sénégalais, suivez vos créances et partagez devis & factures en 1 clic sur WhatsApp.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddClient}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Client</span>
          </button>

          {onOpenInvoiceGenerator && (
            <button
              type="button"
              onClick={() => onOpenInvoiceGenerator(undefined, 'facture')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Créer Facture / Devis</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 GLOBAL STATISTIC CARDS (En-tête de bord)                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Clients */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Clients</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-black text-white font-mono">{stats.totalClients}</span>
            <p className="text-[11px] text-slate-500">Comptes enregistrés</p>
          </div>
        </div>

        {/* Factures Émises */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Factures Émises</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{stats.facturesEmises}</span>
              {stats.devisEmis > 0 && (
                <span className="text-xs text-slate-400 font-mono">(+{stats.devisEmis} devis)</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">Documents commerciaux</p>
          </div>
        </div>

        {/* Total Facturé FCFA */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Facturé</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xl font-black text-emerald-400 font-mono tracking-tight">
              {stats.totalFactureFCFA.toLocaleString('fr-FR')}{' '}
              <span className="text-xs text-emerald-300 font-normal">FCFA</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Encaissé : {stats.payeesFCFA.toLocaleString('fr-FR')} F
            </p>
          </div>
        </div>

        {/* Impayés FCFA (Highlighted) */}
        <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-colors ${
          stats.impayesFCFA > 0 
            ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/60' 
            : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Impayés Restants</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              stats.impayesFCFA > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'
            }`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className={`text-xl font-black font-mono tracking-tight ${
              stats.impayesFCFA > 0 ? 'text-amber-400' : 'text-slate-400'
            }`}>
              {stats.impayesFCFA.toLocaleString('fr-FR')}{' '}
              <span className="text-xs font-normal">FCFA</span>
            </div>
            <p className="text-[11px] text-amber-300/80">
              {stats.impayesFCFA > 0 ? 'Créances en attente de règlement' : 'Aucun impayé en cours'}
            </p>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SEARCH BAR & TAB SWITCHER                                                 */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
        
        {/* Tabs: Mes Clients vs Factures & Devis */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'clients'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mes Clients ({customers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'invoices'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Factures & Devis ({invoices.length})</span>
          </button>
        </div>

        {/* Search input & Filter Chips */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'clients' ? "Rechercher client, tél, email, NINEA..." : "Rechercher facture, n° doc, client..."}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {activeTab === 'clients' ? (
            <button
              type="button"
              onClick={() => setFilterUnpaidOnly(!filterUnpaidOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 border ${
                filterUnpaidOnly 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Avec Impayés</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setInvoiceFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  invoiceFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Toutes
              </button>
              <button
                type="button"
                onClick={() => setInvoiceFilter('unpaid')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  invoiceFilter === 'unpaid' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Impayées
              </button>
              <button
                type="button"
                onClick={() => setInvoiceFilter('paid')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  invoiceFilter === 'paid' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Payées
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* CONTENT VIEW: 1. MES CLIENTS                                              */}
      {/* ========================================================================= */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">
                {searchQuery || filterUnpaidOnly ? "Aucun client ne correspond à votre recherche" : "Aucun client enregistré pour l'instant"}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {searchQuery || filterUnpaidOnly 
                  ? "Essayez de réinitialiser vos critères de recherche ou ajoutez un nouveau client."
                  : "Enregistrez les coordonnées de vos clients dakarois et régionaux pour générer automatiquement vos devis et factures et assurer un suivi comptable fluide."}
              </p>
              <button
                type="button"
                onClick={handleOpenAddClient}
                className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter mon premier client</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((customer) => {
                const fin = clientFinancialMap.get(customer.id) || { totalBilled: 0, totalUnpaid: 0, invoicesCount: 0 };
                const hasUnpaid = fin.totalUnpaid > 0;
                const cleanPhone = cleanPhoneNumberForWhatsApp(customer.phone);
                const whatsappStatementUrl = generateCustomerStatementWhatsAppLink({
                  clientName: customer.name,
                  phone: customer.phone,
                  totalInvoiced: fin.totalBilled,
                  unpaidAmount: fin.totalUnpaid,
                  currency: 'FCFA',
                  invoicesCount: fin.invoicesCount
                });

                return (
                  <div 
                    key={customer.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4.5 flex flex-col justify-between gap-4 transition-all shadow-md group"
                  >
                    {/* Header: Name + Badge */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-black text-sm uppercase shrink-0">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-indigo-300 transition-colors">
                              {customer.name}
                            </h4>
                            {customer.ninea ? (
                              <span className="text-[10px] text-slate-500 font-mono block">
                                NINEA : {customer.ninea}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 block">
                                {customer.paymentTerms || 'Comptant'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Unpaid Alert Badge */}
                        {hasUnpaid ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px] whitespace-nowrap">
                            Impayé
                          </span>
                        ) : fin.totalBilled > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] whitespace-nowrap">
                            À jour
                          </span>
                        ) : null}
                      </div>

                      {/* Contact Details */}
                      <div className="space-y-1 pt-1 text-xs text-slate-400">
                        {customer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="font-mono text-slate-300">{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate text-slate-300">{customer.email}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate text-slate-300">{customer.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financial Summary Box */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 grid grid-cols-2 gap-2 text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-medium">Total Facturé</span>
                        <span className="text-xs font-bold text-white font-mono">
                          {fin.totalBilled.toLocaleString('fr-FR')} F
                        </span>
                      </div>
                      <div className="border-l border-slate-800 pl-2">
                        <span className="text-[10px] text-slate-500 block font-medium">Impayés</span>
                        <span className={`text-xs font-bold font-mono ${hasUnpaid ? 'text-amber-400 font-black' : 'text-emerald-400'}`}>
                          {fin.totalUnpaid.toLocaleString('fr-FR')} F
                        </span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
                      
                      {/* WhatsApp 1-Click Button */}
                      <a
                        href={whatsappStatementUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Partager le solde sur WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-400" />
                        <span>WhatsApp</span>
                      </a>

                      <div className="flex items-center gap-1">
                        {/* New Invoice Shortcut for this client */}
                        {onOpenInvoiceGenerator && (
                          <button
                            type="button"
                            onClick={() => onOpenInvoiceGenerator(customer, 'facture')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                            title="Créer une facture pour ce client"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          </button>
                        )}

                        {/* View Client Details Drawer */}
                        <button
                          type="button"
                          onClick={() => setSelectedClientForDetails(customer)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>Voir la Fiche</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTENT VIEW: 2. FACTURES & DEVIS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                <Receipt className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">
                {searchQuery || invoiceFilter !== 'all' ? "Aucun document trouvé" : "Aucune facture ni devis émis pour l'instant"}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Générez des factures professionnelles conformes aux standards OHADA / Sénégal, associez vos clients et suivez leurs paiements en temps réel.
              </p>
              {onOpenInvoiceGenerator && (
                <button
                  type="button"
                  onClick={() => onOpenInvoiceGenerator(undefined, 'facture')}
                  className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Émettre une Facture ou Devis</span>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase font-bold">
                      <th className="py-3.5 px-4">Réf. Document</th>
                      <th className="py-3.5 px-4">Client</th>
                      <th className="py-3.5 px-4">Date d'émission</th>
                      <th className="py-3.5 px-4">Montant TTC</th>
                      <th className="py-3.5 px-4">Statut Règlement</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredInvoices.map((inv) => {
                      const isPaid = inv.status === 'PAID';
                      const isQuote = inv.type === 'devis';
                      const waLink = generateInvoiceWhatsAppLink({
                        clientName: inv.customerName,
                        phone: inv.customerPhone || '',
                        docNumber: inv.docNumber,
                        type: inv.type,
                        totalTTC: inv.totalTTC,
                        currency: inv.currency,
                        dueDate: inv.dueDate,
                        isPaid: isPaid
                      });

                      return (
                        <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                          
                          {/* N° Document */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                isQuote 
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              }`}>
                                {isQuote ? 'Devis' : 'Facture'}
                              </span>
                              <span className="font-mono font-bold text-white text-xs">
                                {inv.docNumber}
                              </span>
                            </div>
                          </td>

                          {/* Client */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{inv.customerName}</div>
                            {inv.customerPhone && (
                              <div className="text-[11px] text-slate-400 font-mono">{inv.customerPhone}</div>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-slate-400">
                            <div>{inv.issueDate || '—'}</div>
                            {inv.dueDate && (
                              <div className="text-[10px] text-slate-500">Échéance: {inv.dueDate}</div>
                            )}
                          </td>

                          {/* Montant TTC */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-black text-white text-sm">
                              {inv.totalTTC.toLocaleString('fr-FR')} {inv.currency || 'FCFA'}
                            </span>
                          </td>

                          {/* Statut Toggle */}
                          <td className="py-3.5 px-4">
                            {isQuote ? (
                              <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-bold text-[11px] border border-slate-700">
                                Proposition
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleInvoiceStatus(inv)}
                                className={`px-2.5 py-1 rounded-md font-bold text-[11px] border transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isPaid 
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30' 
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                }`}
                                title="Cliquer pour basculer le statut"
                              >
                                {isPaid ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>PAYÉE</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                                    <span>IMPAYÉE</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              
                              {/* 1-Click WhatsApp */}
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                                title="Envoyer au client par WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>

                              {/* Recharger dans l'éditeur */}
                              {onLoadInvoiceToEditor && inv.businessDocData && (
                                <button
                                  type="button"
                                  onClick={() => onLoadInvoiceToEditor(inv.businessDocData!)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                                  title="Ouvrir dans l'éditeur"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Supprimer */}
                              <button
                                type="button"
                                onClick={() => handleDeleteInvoice(inv.id, inv.docNumber)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
                                title="Supprimer de l'historique"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FICHE CLIENT DÉTAILLÉE & HISTORIQUE                              */}
      {/* ========================================================================= */}
      {selectedClientForDetails && (() => {
        const client = selectedClientForDetails;
        const fin = clientFinancialMap.get(client.id) || { totalBilled: 0, totalUnpaid: 0, invoicesCount: 0 };
        const clientInvoices = invoices.filter(i => 
          i.customerId === client.id ||
          i.customerName.trim().toLowerCase() === client.name.trim().toLowerCase() ||
          (client.phone && i.customerPhone && cleanPhoneNumberForWhatsApp(client.phone) === cleanPhoneNumberForWhatsApp(i.customerPhone))
        );
        const waStatementUrl = generateCustomerStatementWhatsAppLink({
          clientName: client.name,
          phone: client.phone,
          totalInvoiced: fin.totalBilled,
          unpaidAmount: fin.totalUnpaid,
          currency: 'FCFA',
          invoicesCount: fin.invoicesCount
        });

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
              
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-black text-lg uppercase shrink-0">
                    {client.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <span>{client.name}</span>
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      {client.ninea && <span>NINEA: <strong className="text-slate-300 font-mono">{client.ninea}</strong></span>}
                      <span>Conditions: <strong className="text-slate-300">{client.paymentTerms || 'Comptant'}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedClientForDetails(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1 scrollbar-thin scrollbar-thumb-slate-800">
                
                {/* 3 Financial metric badges */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 block font-bold uppercase">Total Facturé</span>
                    <span className="text-sm font-black text-white font-mono">
                      {fin.totalBilled.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 block font-bold uppercase">Encaissé (Payé)</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      {(fin.totalBilled - fin.totalUnpaid).toLocaleString('fr-FR')} F
                    </span>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${fin.totalUnpaid > 0 ? 'bg-amber-950/30 border-amber-500/40' : 'bg-slate-950 border-slate-800'}`}>
                    <span className="text-[10px] text-amber-400 block font-bold uppercase">Impayé Dû</span>
                    <span className={`text-sm font-black font-mono ${fin.totalUnpaid > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {fin.totalUnpaid.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                </div>

                {/* Contact Card */}
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                  <div className="font-bold text-slate-300 uppercase text-[10px] tracking-wider">
                    Coordonnées de Facturation
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-mono">{client.phone || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{client.email || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{client.address || 'Non renseignée'}</span>
                    </div>
                  </div>
                  {client.notes && (
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      <strong className="text-slate-300">Notes internes :</strong> {client.notes}
                    </div>
                  )}
                </div>

                {/* Quick Action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={waStatementUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Partager Situation sur WhatsApp</span>
                  </a>

                  {onOpenInvoiceGenerator && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientForDetails(null);
                        onOpenInvoiceGenerator(client, 'facture');
                      }}
                      className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nouvelle Facture</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEditClient(client)}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>
                </div>

                {/* Invoices History Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                      Historique des Devis & Factures ({clientInvoices.length})
                    </h4>
                  </div>

                  {clientInvoices.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center bg-slate-950/40 rounded-xl border border-slate-800/60">
                      Aucune facture ni devis n'a encore été rattaché à ce client.
                    </p>
                  ) : (
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-[10px] uppercase font-bold">
                            <th className="py-2 px-3">Réf</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Total TTC</th>
                            <th className="py-2 px-3">Statut</th>
                            <th className="py-2 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                          {clientInvoices.map(inv => {
                            const isPaid = inv.status === 'PAID';
                            const waLink = generateInvoiceWhatsAppLink({
                              clientName: client.name,
                              phone: client.phone,
                              docNumber: inv.docNumber,
                              type: inv.type,
                              totalTTC: inv.totalTTC,
                              currency: inv.currency,
                              dueDate: inv.dueDate,
                              isPaid: isPaid
                            });

                            return (
                              <tr key={inv.id} className="hover:bg-slate-800/40">
                                <td className="py-2.5 px-3 font-mono font-bold text-white">
                                  {inv.docNumber}
                                </td>
                                <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                                  {inv.issueDate || '—'}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-white">
                                  {inv.totalTTC.toLocaleString('fr-FR')} F
                                </td>
                                <td className="py-2.5 px-3">
                                  {inv.type === 'devis' ? (
                                    <span className="text-[10px] text-blue-300 font-bold">Devis</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleInvoiceStatus(inv)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer border ${
                                        isPaid 
                                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      }`}
                                    >
                                      {isPaid ? 'PAYÉE' : 'IMPAYÉE'}
                                    </button>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 inline-flex items-center"
                                    title="Envoyer sur WhatsApp"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteClient(client.id, client.name)}
                  className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer ce client</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedClientForDetails(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Fermer
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 2: AJOUTER / MODIFIER UN CLIENT                                     */}
      {/* ========================================================================= */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">
                  {editingCustomer ? 'Modifier la Fiche Client' : 'Ajouter un Nouveau Client'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewClientModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveClientForm} className="p-5 space-y-4 text-xs">
              
              {formError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Nom du Client ou de l'Entreprise <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Société Générale Sénégal, Alpha Diop..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Téléphone WhatsApp <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ex: +221 77 123 45 67"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Email de contact
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@client.sn"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Adresse physique / Ville
                  </label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ex: Plateau, Dakar"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    NINEA / Registre de Commerce
                  </label>
                  <input
                    type="text"
                    value={formData.ninea || ''}
                    onChange={(e) => setFormData({ ...formData, ninea: e.target.value })}
                    placeholder="Ex: 001234567 2V3"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Conditions de règlement par défaut
                </label>
                <select
                  value={formData.paymentTerms || 'Comptant'}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Comptant">Comptant à réception</option>
                  <option value="15 jours">15 jours net</option>
                  <option value="30 jours">30 jours fin de mois</option>
                  <option value="50% acompte, solde à la livraison">50% acompte, solde à la livraison</option>
                  <option value="Autre">Autre accord commercial</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Notes internes & observations
                </label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informations utiles sur ce client..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Enregistrement...' : 'Enregistrer le Client'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
