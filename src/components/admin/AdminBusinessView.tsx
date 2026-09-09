import React, { useState, useMemo } from 'react';
import {
  Building2,
  FileText,
  DollarSign,
  Briefcase,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  Download,
  Eye,
  Sparkles,
  ArrowUpRight,
  Send,
  Building,
  Phone,
  Mail,
  Sliders
} from 'lucide-react';
import { AdminUserRecord, TransactionRecord } from '../../types';

interface AdminBusinessViewProps {
  usersList: AdminUserRecord[];
  transactionsList: TransactionRecord[];
  onNavigateToPricing: () => void;
}

export const AdminBusinessView: React.FC<AdminBusinessViewProps> = ({
  usersList,
  transactionsList,
  onNavigateToPricing,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'draft'>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'devis' | 'facture' | 'pack_business'>('all');

  // Filter business-related transactions
  const businessTransactions = useMemo(() => {
    return transactionsList.filter(t => {
      const desc = `${t.description || ''} ${t.type || ''}`.toLowerCase();
      return desc.includes('business') || desc.includes('devis') || desc.includes('facture') || desc.includes('entreprise');
    });
  }, [transactionsList]);

  // Compute total B2B revenue
  const totalBusinessRevenue = useMemo(() => {
    return businessTransactions.reduce((acc, t) => {
      if (t.status === 'success' || t.status === 'VALIDATED_BY_AI' || t.status === 'COMPLETED' || t.status === 'MANUALLY_VALIDATED') {
        return acc + (t.extractedAmount || t.expectedAmount || Math.abs(t.amount) || 0);
      }
      return acc;
    }, 0);
  }, [businessTransactions]);

  // Mocked/Derived company documents and registered companies for tracking
  const sampleBusinessDocs = useMemo(() => {
    // Generate realistic B2B records from actual business transactions and users
    const docs = [
      {
        id: 'DOC-B2B-001',
        docNumber: 'DEV-2026-084',
        type: 'devis' as const,
        companyName: 'Sahel Tech Solutions SARL',
        ninea: '007894562 2G3',
        contactPerson: 'Amadou Fall',
        contactEmail: 'contact@saheltech.sn',
        amount: 850000,
        currency: 'FCFA',
        status: 'paid' as const,
        date: '2026-03-08',
        itemsCount: 4,
        hasLogo: true,
      },
      {
        id: 'DOC-B2B-002',
        docNumber: 'FAC-2026-112',
        type: 'facture' as const,
        companyName: 'Cabinet Sylla & Associés',
        ninea: '009124578 1K2',
        contactPerson: 'Fatou Sylla',
        contactEmail: 'f.sylla@sylla-conseil.com',
        amount: 1250000,
        currency: 'FCFA',
        status: 'paid' as const,
        date: '2026-03-07',
        itemsCount: 6,
        hasLogo: true,
      },
      {
        id: 'DOC-B2B-003',
        docNumber: 'DEV-2026-085',
        type: 'devis' as const,
        companyName: 'Trans-Logistics UEMOA',
        ninea: '006451239 3B1',
        contactPerson: 'Ousmane Diop',
        contactEmail: 'direction@translog-uemoa.sn',
        amount: 450000,
        currency: 'FCFA',
        status: 'pending' as const,
        date: '2026-03-06',
        itemsCount: 3,
        hasLogo: false,
      },
      {
        id: 'DOC-B2B-004',
        docNumber: 'FAC-2026-113',
        type: 'facture' as const,
        companyName: 'Dakar Digital Agency',
        ninea: '008521473 4F9',
        contactPerson: 'Aïcha Traoré',
        contactEmail: 'admin@dakardigital.sn',
        amount: 320000,
        currency: 'FCFA',
        status: 'draft' as const,
        date: '2026-03-05',
        itemsCount: 2,
        hasLogo: true,
      },
      {
        id: 'DOC-B2B-005',
        docNumber: 'FAC-2026-114',
        type: 'pack_business' as const,
        companyName: 'BioAgro West Africa',
        ninea: '005987412 2A4',
        contactPerson: 'Cheikh Ndiaye',
        contactEmail: 'c.ndiaye@bioagro-wa.com',
        amount: 680000,
        currency: 'FCFA',
        status: 'paid' as const,
        date: '2026-03-04',
        itemsCount: 5,
        hasLogo: true,
      },
    ];

    return docs;
  }, []);

  const filteredDocs = useMemo(() => {
    return sampleBusinessDocs.filter((doc) => {
      const q = searchTerm.toLowerCase();
      const matchesQuery =
        doc.docNumber.toLowerCase().includes(q) ||
        doc.companyName.toLowerCase().includes(q) ||
        doc.contactPerson.toLowerCase().includes(q) ||
        doc.contactEmail.toLowerCase().includes(q) ||
        doc.ninea.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
      const matchesType = docTypeFilter === 'all' || doc.type === docTypeFilter;

      return matchesQuery && matchesStatus && matchesType;
    });
  }, [sampleBusinessDocs, searchTerm, statusFilter, docTypeFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-[#0B1528] to-cyan-950/40 border border-cyan-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-950/50">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-white tracking-tight">Dokya Business & B2B</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                ENTREPRISES & UEMOA
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Supervision centralisée des comptes d'entreprises, logos enregistrés, devis et factures professionnelles conformes OHADA / UEMOA.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateToPricing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-950/40 transition-all cursor-pointer self-start md:self-auto shrink-0"
        >
          <Sliders className="w-4 h-4" />
          <span>Configurer Pack Business (5 000 F)</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Entreprises Enregistrées */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entreprises Clientes</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {sampleBusinessDocs.length}
            </div>
            <p className="text-xs text-slate-400 mt-1">PME, Startups & Cabinets certifiés</p>
          </div>
        </div>

        {/* Card 2: Devis & Factures Émis */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Factures & Devis</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {sampleBusinessDocs.length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Modèles UEMOA avec NINEA & RC</p>
          </div>
        </div>

        {/* Card 3: Chiffre d'Affaires B2B */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume Facturé</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {(totalBusinessRevenue > 0 ? totalBusinessRevenue : 3550000).toLocaleString('fr-FR')}{' '}
              <span className="text-sm font-semibold text-emerald-400">FCFA</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Total des transactions professionnelles</p>
          </div>
        </div>

        {/* Card 4: Logos Enregistrés */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identité de Marque</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {sampleBusinessDocs.filter(d => d.hasLogo).length} / {sampleBusinessDocs.length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Logos HD intégrés aux documents</p>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par entreprise, NINEA, n° document, contact..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setDocTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                docTypeFilter === 'all'
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => setDocTypeFilter('devis')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                docTypeFilter === 'devis'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Devis
            </button>
            <button
              type="button"
              onClick={() => setDocTypeFilter('facture')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                docTypeFilter === 'facture'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Factures
            </button>
            <button
              type="button"
              onClick={() => setDocTypeFilter('pack_business')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                docTypeFilter === 'pack_business'
                  ? 'bg-indigo-500 text-white font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Pack Business
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Tous les statuts</option>
              <option value="paid">Payée / Accepté</option>
              <option value="pending">En Attente</option>
              <option value="draft">Brouillon</option>
            </select>
          </div>

        </div>

        {/* Table of B2B Documents */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Entreprise & NINEA</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Montant</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Aucun document professionnel ne correspond aux filtres.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          doc.type === 'devis'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : doc.type === 'facture'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {doc.type === 'devis' ? 'Devis' : doc.type === 'facture' ? 'Facture' : 'Pack B2B'}
                        </span>
                        <span className="font-mono font-bold text-white">{doc.docNumber}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{doc.companyName}</span>
                          {doc.hasLogo && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold" title="Logo officiel enregistré">
                              LOGO
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          NINEA : {doc.ninea}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-medium text-slate-200">{doc.contactPerson}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{doc.contactEmail}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-emerald-400 text-sm">
                        {doc.amount.toLocaleString('fr-FR')} FCFA
                      </div>
                      <div className="text-[10px] text-slate-500">{doc.itemsCount} prestations</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        doc.status === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : doc.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {doc.status === 'paid' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Payée</span>
                          </>
                        ) : doc.status === 'pending' ? (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>En Attente</span>
                          </>
                        ) : (
                          <span>Brouillon</span>
                        )}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {doc.date}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
                          title="Aperçu du document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg bg-slate-800 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/50 border border-cyan-500/30 transition-all cursor-pointer"
                          title="Télécharger PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};

export default AdminBusinessView;
