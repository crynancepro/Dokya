'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Boxes, Plus, Search, AlertTriangle, TrendingUp, 
  Edit2, Trash2, PlusCircle, MinusCircle, Check, X, 
  Building2, RefreshCw, FileText, DollarSign, Tag, 
  Barcode, Layers, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { Product, UserBusiness } from '../types';
import { 
  fetchBusinessProducts, 
  subscribeToBusinessProducts, 
  saveBusinessProduct, 
  deleteBusinessProduct, 
  updateProductQuantity 
} from '../lib/firebase';

interface DokyaInventoryViewProps {
  currentUid: string;
  businesses: UserBusiness[];
  activeBusinessId?: string;
  onSelectBusiness?: (businessId: string) => void;
  onCreateInvoiceWithProduct?: (product: Product) => void;
}

export const DokyaInventoryView: React.FC<DokyaInventoryViewProps> = ({
  currentUid,
  businesses,
  activeBusinessId: propBusinessId,
  onSelectBusiness,
  onCreateInvoiceWithProduct
}) => {
  // Determine selected business
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(() => {
    if (propBusinessId) return propBusinessId;
    const def = businesses.find(b => b.isDefault);
    return def?.id || businesses[0]?.id || `business_${currentUid}`;
  });

  useEffect(() => {
    if (propBusinessId) {
      setSelectedBusinessId(propBusinessId);
    } else if (businesses.length > 0 && !selectedBusinessId) {
      const def = businesses.find(b => b.isDefault);
      setSelectedBusinessId(def?.id || businesses[0].id);
    }
  }, [propBusinessId, businesses]);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'in_stock'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity_asc' | 'quantity_desc' | 'margin_desc' | 'price_desc'>('name');

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    sku: string;
    purchasePrice: string;
    sellingPrice: string;
    quantity: string;
    lowStockThreshold: string;
  }>({
    name: '',
    sku: '',
    purchasePrice: '',
    sellingPrice: '',
    quantity: '1',
    lowStockThreshold: '3'
  });

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Real-time listener on products
  useEffect(() => {
    if (!selectedBusinessId) return;
    setIsLoading(true);
    const unsub = subscribeToBusinessProducts(selectedBusinessId, (list) => {
      setProducts(list);
      setIsLoading(false);
    });

    return () => unsub();
  }, [selectedBusinessId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const list = await fetchBusinessProducts(selectedBusinessId);
      setProducts(list);
      showToast('Inventaire synchronisé avec succès !');
    } catch (e) {
      console.warn("Erreur refresh:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Switch active business
  const handleBusinessChange = (newBusId: string) => {
    setSelectedBusinessId(newBusId);
    if (onSelectBusiness) onSelectBusiness(newBusId);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalRef = products.length;
    const totalUnits = products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
    const totalStockValuePurchase = products.reduce((sum, p) => sum + ((Number(p.purchasePrice) || 0) * (Number(p.quantity) || 0)), 0);
    const totalStockValueSelling = products.reduce((sum, p) => sum + ((Number(p.sellingPrice) || 0) * (Number(p.quantity) || 0)), 0);
    const potentialMargin = totalStockValueSelling - totalStockValuePurchase;
    const lowStockCount = products.filter(p => (Number(p.quantity) || 0) <= (Number(p.lowStockThreshold) ?? 3)).length;
    const outOfStockCount = products.filter(p => (Number(p.quantity) || 0) <= 0).length;

    return {
      totalRef,
      totalUnits,
      totalStockValuePurchase,
      totalStockValueSelling,
      potentialMargin,
      lowStockCount,
      outOfStockCount
    };
  }, [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = 
          !q || 
          p.name.toLowerCase().includes(q) || 
          (p.sku && p.sku.toLowerCase().includes(q));

        if (!matchesSearch) return false;

        const qty = Number(p.quantity) || 0;
        const threshold = p.lowStockThreshold !== undefined ? Number(p.lowStockThreshold) : 3;

        if (statusFilter === 'out_of_stock') return qty <= 0;
        if (statusFilter === 'low_stock') return qty > 0 && qty <= threshold;
        if (statusFilter === 'in_stock') return qty > threshold;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'quantity_asc') return (a.quantity || 0) - (b.quantity || 0);
        if (sortBy === 'quantity_desc') return (b.quantity || 0) - (a.quantity || 0);
        if (sortBy === 'price_desc') return (b.sellingPrice || 0) - (a.sellingPrice || 0);
        if (sortBy === 'margin_desc') {
          const marginA = (a.sellingPrice || 0) - (a.purchasePrice || 0);
          const marginB = (b.sellingPrice || 0) - (b.purchasePrice || 0);
          return marginB - marginA;
        }
        return 0;
      });
  }, [products, searchQuery, statusFilter, sortBy]);

  // Quick quantity change (+1 / -1)
  const handleQuickQtyChange = async (product: Product, delta: number) => {
    const current = product.quantity || 0;
    if (delta < 0 && current <= 0) return;
    const targetQty = Math.max(0, current + delta);

    // Optimistic UI update
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: targetQty } : p));

    await updateProductQuantity(selectedBusinessId, product.id, { delta });
  };

  // Open Add Product Modal
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      purchasePrice: '',
      sellingPrice: '',
      quantity: '1',
      lowStockThreshold: '3'
    });
    setFormError(null);
    setIsProductModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || '',
      purchasePrice: product.purchasePrice ? String(product.purchasePrice) : '',
      sellingPrice: product.sellingPrice ? String(product.sellingPrice) : '',
      quantity: String(product.quantity || 0),
      lowStockThreshold: String(product.lowStockThreshold !== undefined ? product.lowStockThreshold : 3)
    });
    setFormError(null);
    setIsProductModalOpen(true);
  };

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Le nom du produit ou article est obligatoire.');
      return;
    }

    const purchasePrice = parseFloat(formData.purchasePrice) || 0;
    const sellingPrice = parseFloat(formData.sellingPrice) || 0;
    const quantity = parseInt(formData.quantity, 10) || 0;
    const lowStockThreshold = parseInt(formData.lowStockThreshold, 10) || 3;

    if (sellingPrice < 0 || purchasePrice < 0) {
      setFormError('Les prix ne peuvent pas être négatifs.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const saved = await saveBusinessProduct(selectedBusinessId, {
        ...(editingProduct ? { id: editingProduct.id } : {}),
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        purchasePrice,
        sellingPrice,
        quantity,
        lowStockThreshold
      });

      setIsProductModalOpen(false);
      showToast(editingProduct ? `Produit "${saved.name}" mis à jour !` : `Produit "${saved.name}" ajouté au stock !`);
    } catch (err) {
      setFormError("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Supprimer définitivement l'article "${product.name}" du catalogue ?`)) {
      return;
    }

    // Optimistic UI update
    setProducts(prev => prev.filter(p => p.id !== product.id));
    await deleteBusinessProduct(selectedBusinessId, product.id);
    showToast(`Produit "${product.name}" supprimé.`);
  };

  // Unit Margin calculations for form preview
  const formPurchaseNum = parseFloat(formData.purchasePrice) || 0;
  const formSellingNum = parseFloat(formData.sellingPrice) || 0;
  const formUnitMargin = formSellingNum - formPurchaseNum;
  const formMarginRate = formSellingNum > 0 ? ((formUnitMargin / formSellingNum) * 100).toFixed(1) : '0';

  const currentBusiness = businesses.find(b => b.id === selectedBusinessId) || businesses[0];

  return (
    <div id="dokya-inventory-root" className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HEADER WITH ACTIONS & BUSINESS SELECTOR                                */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                <span>Gestion de Stock & Catalogue Produits</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  Dokya Business
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Gérez vos articles, surveillez les seuils critiques et déduisez automatiquement le stock lors de chaque vente.
              </p>
            </div>
          </div>
        </div>

        {/* Business Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {businesses.length > 1 && (
            <div className="relative">
              <select
                value={selectedBusinessId}
                onChange={(e) => handleBusinessChange(e.target.value)}
                className="bg-slate-950 text-white text-xs font-bold border border-slate-800 rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    🏢 {b.companyName || 'Mon Entreprise'}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                ▼
              </div>
            </div>
          )}

          <button
            id="btn-refresh-inventory"
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Rafraîchir le stock"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>

          <button
            id="btn-add-product"
            type="button"
            onClick={handleOpenAddProduct}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Produit</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATISTIC CARDS (Vue d'ensemble financière et logistique)               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Références */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Catalogue</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{stats.totalRef}</span>
              <span className="text-xs text-slate-400">références</span>
            </div>
            <p className="text-[11px] text-slate-500">{stats.totalUnits} unités physiques en stock</p>
          </div>
        </div>

        {/* Valeur du Stock (Prix de Vente & Achat) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Valeur Marchande</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xl font-black text-emerald-400 font-mono tracking-tight">
              {stats.totalStockValueSelling.toLocaleString('fr-FR')}{' '}
              <span className="text-xs text-emerald-300 font-normal">FCFA</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Coût achat : {stats.totalStockValuePurchase.toLocaleString('fr-FR')} F
            </p>
          </div>
        </div>

        {/* Bénéfice / Marge Potentielle */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Marge Potentielle</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xl font-black text-blue-400 font-mono tracking-tight">
              {stats.potentialMargin > 0 ? `+${stats.potentialMargin.toLocaleString('fr-FR')}` : stats.potentialMargin.toLocaleString('fr-FR')}{' '}
              <span className="text-xs font-normal">FCFA</span>
            </div>
            <p className="text-[11px] text-slate-500">Bénéfice brut sur stock total</p>
          </div>
        </div>

        {/* Alerte Stock Faible / Ruptures (Highlighted) */}
        <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-colors ${
          stats.lowStockCount > 0 
            ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60' 
            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${stats.lowStockCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              Alertes Stock
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              stats.lowStockCount > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-500'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className={`text-2xl font-black font-mono ${stats.lowStockCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {stats.lowStockCount}
            </div>
            <p className="text-[11px] text-rose-300/80">
              {stats.outOfStockCount > 0 ? `${stats.outOfStockCount} en rupture totale (0)` : stats.lowStockCount > 0 ? 'Produits sous le seuil critique' : 'Aucun produit sous le seuil critique'}
            </p>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. TOOLBAR: SEARCH, FILTERS & SORT                                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
        
        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Tous ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('low_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'low_stock' ? 'bg-rose-600 text-white' : 'bg-slate-950 text-rose-400 hover:text-rose-300 border border-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Stock Faible ({stats.lowStockCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('out_of_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'out_of_stock' ? 'bg-red-700 text-white' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>Rupture ({stats.outOfStockCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'in_stock' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Disponible
          </button>
        </div>

        {/* Search and Sort controls */}
        <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 lg:max-w-md">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher produit, code SKU, référence..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full sm:w-auto bg-slate-950 text-slate-300 text-xs font-bold border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="name">Nom (A-Z)</option>
            <option value="quantity_asc">Stock : Plus Faible d'abord</option>
            <option value="quantity_desc">Stock : Plus Élevé d'abord</option>
            <option value="margin_desc">Marge la plus élevée</option>
            <option value="price_desc">Prix de vente décroissant</option>
          </select>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. PRODUCTS LIST / TABLE                                                  */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Chargement de votre catalogue produits...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <Boxes className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {searchQuery || statusFilter !== 'all' ? "Aucun produit ne correspond à vos filtres" : "Votre catalogue de produits est vide"}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'all' 
                ? "Essayez de modifier vos critères de recherche ou réinitialisez les filtres."
                : "Enregistrez vos articles, matières premières ou marchandises pour suivre les stocks en temps réel et les insérer en 1 clic dans vos factures et devis."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddProduct}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter mon premier produit</span>
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Article & Réf</th>
                  <th className="py-3 px-4">Prix Achat</th>
                  <th className="py-3 px-4">Prix Vente</th>
                  <th className="py-3 px-4">Marge Unitaire</th>
                  <th className="py-3 px-4 text-center">Quantité en Stock</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredProducts.map((product) => {
                  const qty = Number(product.quantity) || 0;
                  const threshold = product.lowStockThreshold !== undefined ? Number(product.lowStockThreshold) : 3;
                  const isOutOfStock = qty <= 0;
                  const isLowStock = !isOutOfStock && qty <= threshold;
                  const unitMargin = (product.sellingPrice || 0) - (product.purchasePrice || 0);
                  const marginPercent = product.sellingPrice ? ((unitMargin / product.sellingPrice) * 100).toFixed(0) : '0';

                  return (
                    <tr 
                      key={product.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{product.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {product.sku ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                <Barcode className="w-3 h-3 text-slate-500" />
                                {product.sku}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Sans SKU</span>
                            )}
                            <span className="text-[10px] text-slate-500">
                              Seuil min : {threshold}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Purchase Price */}
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {product.purchasePrice ? (
                          <span>{product.purchasePrice.toLocaleString('fr-FR')} F</span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {product.sellingPrice ? (
                          <span>{product.sellingPrice.toLocaleString('fr-FR')} F</span>
                        ) : (
                          <span className="text-slate-500">0 F</span>
                        )}
                      </td>

                      {/* Unit Margin */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className={`font-mono font-bold text-xs ${unitMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {unitMargin > 0 ? `+${unitMargin.toLocaleString('fr-FR')}` : unitMargin.toLocaleString('fr-FR')} F
                          </div>
                          {product.sellingPrice > 0 && (
                            <div className="text-[10px] text-slate-400">
                              ({marginPercent}% de marge)
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Quantity in Stock with +1 / -1 Fast Controls */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                          <button
                            type="button"
                            onClick={() => handleQuickQtyChange(product, -1)}
                            disabled={qty <= 0}
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              qty <= 0 
                                ? 'text-slate-600 cursor-not-allowed' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                            title="Diminuer de 1 unité"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>

                          <span className={`font-mono font-black text-sm min-w-[2.5rem] text-center ${
                            isOutOfStock 
                              ? 'text-rose-400' 
                              : isLowStock 
                              ? 'text-amber-400' 
                              : 'text-white'
                          }`}>
                            {qty}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleQuickQtyChange(product, 1)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Augmenter de 1 unité"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 bg-red-950/40 text-red-400 border border-red-500/40 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase">
                            <AlertCircle className="w-3 h-3" />
                            <span>🚨 RUPTURE (0)</span>
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 bg-rose-950/40 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>⚠️ STOCK FAIBLE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-950/30 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold">
                            <Check className="w-3 h-3" />
                            <span>En Stock</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Invoice with this product */}
                          {onCreateInvoiceWithProduct && (
                            <button
                              type="button"
                              onClick={() => onCreateInvoiceWithProduct(product)}
                              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Créer une facture avec ce produit"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Facturer</span>
                            </button>
                          )}

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditProduct(product)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Modifier ce produit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Supprimer définitivement"
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

      {/* ========================================================================= */}
      {/* 5. MODAL: AJOUTER / MODIFIER UN PRODUIT                                   */}
      {/* ========================================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {editingProduct ? 'Modifier le Produit' : 'Ajouter un Produit au Stock'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    🏢 {currentBusiness?.companyName || 'Mon Entreprise'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              
              {formError && (
                <div className="bg-rose-950/40 border border-rose-500/40 p-3 rounded-xl flex items-center gap-2 text-xs text-rose-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Désignation / Nom du Produit <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Sac de Ciment 50kg, Ordinateur Portable HP..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* SKU / Reference */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Code SKU / Réf. Interne <span className="text-slate-500 font-normal">(Optionnel)</span>
                </label>
                <div className="relative">
                  <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="ex: CIM-50KG-SN, REF-HP15-01"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
              </div>

              {/* Financials: Purchase Price vs Selling Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Prix d'Achat (FCFA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="Coût unitaire"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">Pour calcul de marge nette</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white">
                    Prix de Vente (FCFA) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="50"
                    placeholder="Prix client"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/50 text-xs text-emerald-400 font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400">Inséré sur vos factures</span>
                </div>
              </div>

              {/* Live Margin Indicator */}
              {(formPurchaseNum > 0 || formSellingNum > 0) && (
                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-400">Bénéfice estimé par unité vendue :</span>
                  <div className="text-right">
                    <span className={`font-mono font-black ${formUnitMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formUnitMargin > 0 ? `+${formUnitMargin.toLocaleString('fr-FR')}` : formUnitMargin.toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1.5">
                      ({formMarginRate}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Stock Quantity & Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Quantité en Stock <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Seuil Alerte Stock Faible
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Par défaut : 3"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">Affiche le badge [ ⚠️ STOCK FAIBLE ]</span>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingProduct ? 'Mettre à jour' : 'Enregistrer le Produit'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
