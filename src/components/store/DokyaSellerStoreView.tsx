import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  ExternalLink, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Eye, 
  MessageCircle, 
  TrendingUp, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Share2, 
  Sparkles, 
  Globe, 
  Phone, 
  MapPin, 
  Settings, 
  Link as LinkIcon, 
  ArrowUpRight, 
  DollarSign, 
  Calendar, 
  User, 
  ChevronRight,
  ShieldCheck,
  Store,
  Layers,
  HelpCircle,
  Truck
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  ProductItem, 
  StoreOrder, 
  SellerStoreProfile, 
  StoreOrderStatus, 
  ProductSaleType,
  CandidateProfile 
} from '../../types';
import { 
  saveProduct, 
  fetchUserProducts, 
  deleteProduct, 
  fetchSellerOrders, 
  updateStoreOrderStatus, 
  fetchSellerStore, 
  saveSellerStoreProfile,
  generateProductSlug,
  slugify 
} from '../../lib/storeService';
import { auth } from '../../lib/firebase';

interface DokyaSellerStoreViewProps {
  profile: CandidateProfile;
  onOpenPublicProduct?: (slug: string) => void;
  onOpenPublicStore?: (username: string) => void;
}

export const DokyaSellerStoreView: React.FC<DokyaSellerStoreViewProps> = ({
  profile,
  onOpenPublicProduct,
  onOpenPublicStore
}) => {
  const currentUid = auth.currentUser?.uid || profile.uid || 'guest';
  const defaultUsername = slugify(profile.personalInfo?.firstName || profile.email?.split('@')[0] || 'vendeur');

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'orders' | 'settings'>('products');

  // Data states
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [storeProfile, setStoreProfile] = useState<SellerStoreProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Recharts Chart Time Period Filter: '7d' | '30d' | 'all'
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | 'all'>('7d');

  // Product Modal State (Add / Edit)
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Form State for Product
  const [productTitle, setProductTitle] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState<number | string>(5000);
  const [productCategory, setProductCategory] = useState('Services & Formations');
  const [productImages, setProductImages] = useState<string>('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80');
  const [productSaleType, setProductSaleType] = useState<ProductSaleType>('direct_order');
  const [productRedirectUrl, setProductRedirectUrl] = useState('');
  const [productCustomSlug, setProductCustomSlug] = useState('');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Store Settings Form State
  const [storeNameInput, setStoreNameInput] = useState('');
  const [storeUsernameInput, setStoreUsernameInput] = useState(defaultUsername);
  const [storeTaglineInput, setStoreTaglineInput] = useState('');
  const [storeDescriptionInput, setStoreDescriptionInput] = useState('');
  const [storeWhatsappInput, setStoreWhatsappInput] = useState(profile.personalInfo?.phone || '');
  const [storeCityInput, setStoreCityInput] = useState(profile.personalInfo?.city || 'Dakar');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Filter & Search states
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | StoreOrderStatus>('all');

  // Copy Feedback
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(label);
    showToast(`Lien ${label} copié dans le presse-papier !`);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Load all initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, ords, storeData] = await Promise.all([
        fetchUserProducts(currentUid),
        fetchSellerOrders(currentUid),
        fetchSellerStore(currentUid)
      ]);

      setProducts(prods);
      setOrders(ords);

      if (storeData.profile) {
        setStoreProfile(storeData.profile);
        setStoreNameInput(storeData.profile.storeName || '');
        setStoreUsernameInput(storeData.profile.username || defaultUsername);
        setStoreTaglineInput(storeData.profile.tagline || '');
        setStoreDescriptionInput(storeData.profile.description || '');
        setStoreWhatsappInput(storeData.profile.whatsappNumber || profile.personalInfo?.phone || '');
        setStoreCityInput(storeData.profile.city || profile.personalInfo?.city || 'Dakar');
      } else {
        // Initialiser avec les données du profil
        const autoStoreName = `Boutique ${profile.personalInfo?.firstName || 'Dokya'}`;
        setStoreNameInput(autoStoreName);
        setStoreUsernameInput(defaultUsername);
        setStoreWhatsappInput(profile.personalInfo?.phone || '');
      }
    } catch (err) {
      console.error('[DokyaSellerStoreView] Erreur chargement données:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUid]);

  // Open Product Modal (New or Edit)
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductTitle('');
    setProductDescription('');
    setProductPrice(5000);
    setProductCategory('Services & Formations');
    setProductImages('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80');
    setProductSaleType('direct_order');
    setProductRedirectUrl('');
    setProductCustomSlug('');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: ProductItem) => {
    setEditingProduct(prod);
    setProductTitle(prod.title);
    setProductDescription(prod.description);
    setProductPrice(prod.price);
    setProductCategory(prod.category || 'Services & Formations');
    setProductImages(prod.images?.[0] || '');
    setProductSaleType(prod.saleType);
    setProductRedirectUrl(prod.redirectUrl || '');
    setProductCustomSlug(prod.slug);
    setIsProductModalOpen(true);
  };

  // Submit Product Form
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productTitle.trim()) {
      showToast('Veuillez renseigner un titre pour le produit');
      return;
    }

    setIsSubmittingProduct(true);
    try {
      const sellerUsername = storeProfile?.username || storeUsernameInput || defaultUsername;
      const sellerName = storeProfile?.storeName || storeNameInput || profile.personalInfo?.firstName || 'Vendeur';
      const sellerPhone = storeProfile?.whatsappNumber || profile.personalInfo?.phone || '';

      const imagesArray = productImages.split(',').map(s => s.trim()).filter(Boolean);
      if (imagesArray.length === 0) {
        imagesArray.push('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80');
      }

      const slugCandidate = productCustomSlug.trim() 
        ? slugify(productCustomSlug) 
        : generateProductSlug(productTitle);

      const saved = await saveProduct({
        id: editingProduct?.id,
        userId: currentUid,
        sellerUsername,
        sellerName,
        sellerPhone,
        sellerEmail: profile.email || '',
        sellerWhatsapp: sellerPhone,
        title: productTitle.trim(),
        slug: slugCandidate,
        description: productDescription.trim(),
        price: Number(productPrice) || 0,
        currency: 'FCFA',
        category: productCategory,
        images: imagesArray,
        saleType: productSaleType,
        redirectUrl: productSaleType === 'redirect' ? productRedirectUrl.trim() : '',
        enableDirectOrder: productSaleType === 'direct_order',
        status: 'active'
      });

      showToast(editingProduct ? 'Produit mis à jour avec succès !' : 'Produit publié avec succès !');
      setIsProductModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Erreur sauvegarde produit:', err);
      showToast('Erreur lors de la sauvegarde du produit.');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette fiche produit ?')) return;
    try {
      await deleteProduct(prodId, currentUid);
      showToast('Produit supprimé.');
      loadData();
    } catch (err) {
      showToast('Erreur lors de la suppression.');
    }
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: StoreOrderStatus) => {
    try {
      await updateStoreOrderStatus(orderId, currentUid, newStatus);
      showToast(`Statut de la commande mis à jour : ${newStatus.toUpperCase()}`);
      loadData();
    } catch (err) {
      showToast('Erreur lors de la mise à jour.');
    }
  };

  // Save Store Settings
  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const cleanUsername = slugify(storeUsernameInput || defaultUsername);
      const saved = await saveSellerStoreProfile(currentUid, {
        storeName: storeNameInput.trim() || 'Ma Boutique Dokya',
        username: cleanUsername,
        tagline: storeTaglineInput.trim(),
        description: storeDescriptionInput.trim(),
        whatsappNumber: storeWhatsappInput.trim(),
        city: storeCityInput.trim(),
        country: 'Sénégal',
        email: profile.email || ''
      });
      setStoreProfile(saved);
      showToast('Paramètres de la boutique enregistrés avec succès !');
    } catch (err) {
      showToast('Erreur lors de la sauvegarde des paramètres.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Generate WhatsApp contact link for buyer
  const getBuyerWhatsAppLink = (order: StoreOrder) => {
    const rawPhone = (order.buyerPhone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 9 ? `221${rawPhone}` : rawPhone;
    const msg = encodeURIComponent(
      `Bonjour ${order.buyerName}, je vous contacte suite à votre commande n° ${order.id} pour le produit "${order.productTitle}" sur ma boutique Dokya (Montant : ${(Number(order.totalAmount) || 0).toLocaleString('fr-FR')} FCFA). Votre adresse de livraison est : ${order.buyerAddress}. Pouvons-nous finaliser les détails ?`
    );
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const totalOrdersCount = orders.length;
    const validatedOrders = orders.filter(o => o.status === 'validated' || o.status === 'delivered');
    const totalSalesAmount = validatedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const activeProductsCount = products.filter(p => p.status === 'active').length;
    const totalViews = products.reduce((sum, p) => sum + (p.viewsCount || 0), 0);

    return {
      totalOrdersCount,
      validatedOrdersCount: validatedOrders.length,
      totalSalesAmount,
      activeProductsCount,
      totalViews,
      averageOrderValue: validatedOrders.length > 0 ? Math.round(totalSalesAmount / validatedOrders.length) : 0
    };
  }, [orders, products]);

  // Recharts Chart Data Processing
  const chartData = useMemo(() => {
    const now = new Date();
    let daysCount = 7;
    if (chartPeriod === '30d') daysCount = 30;
    if (chartPeriod === 'all') daysCount = 60;

    const daysMap = new Map<string, { date: string; label: string; revenue: number; ordersCount: number }>();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const iso = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      daysMap.set(iso, { date: iso, label, revenue: 0, ordersCount: 0 });
    }

    orders.forEach(ord => {
      if (ord.createdAt) {
        const ordDate = ord.createdAt.split('T')[0];
        if (daysMap.has(ordDate)) {
          const entry = daysMap.get(ordDate)!;
          entry.ordersCount += 1;
          if (ord.status === 'validated' || ord.status === 'delivered') {
            entry.revenue += ord.totalAmount || 0;
          }
        }
      }
    });

    return Array.from(daysMap.values());
  }, [orders, chartPeriod]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = productSearch === '' || 
        p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(productSearch.toLowerCase());
      return matchSearch;
    });
  }, [products, productSearch]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
      const matchSearch = orderSearch === '' ||
        o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.buyerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.buyerPhone.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.productTitle.toLowerCase().includes(orderSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [orders, orderStatusFilter, orderSearch]);

  const activeStoreUsername = storeProfile?.username || storeUsernameInput || defaultUsername;
  const publicStoreUrl = `${window.location.origin}/b/${activeStoreUsername}`;

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-500 text-slate-950 font-bold rounded-2xl shadow-2xl flex items-center gap-2 text-xs animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-slate-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION: Store Identity & Quick Action */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Boutique & Liens de Vente Dokya</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>{storeProfile?.storeName || `Boutique ${profile.personalInfo?.firstName || 'Dokya'}`}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                En Ligne 🟢
              </span>
            </h1>

            <p className="text-sm text-slate-400 max-w-xl">
              Vendez vos formations, e-books, services ou produits avec des liens de paiement et commandes directes Dokya.
            </p>

            {/* Public Store Link Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300">
                <Store className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-slate-500 select-none">dokya.site/b/</span>
                <span className="text-white font-bold">{activeStoreUsername}</span>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(publicStoreUrl, 'Boutique')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                {copiedLink === 'Boutique' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copier</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenPublicStore) {
                    onOpenPublicStore(activeStoreUsername);
                  } else {
                    window.open(`/b/${activeStoreUsername}`, '_blank');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Voir ma vitrine</span>
              </button>
            </div>
          </div>

          {/* Right Action: Add Product */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={handleOpenAddProduct}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Produit / Service</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI CARDS (REVENUE, ORDERS, PRODUCTS, VIEWS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Chiffre d'Affaires Encaissé */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ventes Encaissées</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {(Number(metrics.totalSalesAmount) || 0).toLocaleString('fr-FR')} <span className="text-sm font-semibold text-emerald-400">FCFA</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">{metrics.validatedOrdersCount}</span> commandes validées
            </p>
          </div>
        </div>

        {/* Card 2: Commandes Reçues */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Commandes Totales</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {metrics.totalOrdersCount}
            </div>
            <p className="text-xs text-slate-400 mt-1">Direct Dokya & WhatsApp</p>
          </div>
        </div>

        {/* Card 3: Produits Actifs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produits Actifs</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {metrics.activeProductsCount}
            </div>
            <p className="text-xs text-slate-400 mt-1">Visibles sur votre boutique</p>
          </div>
        </div>

        {/* Card 4: Vues Cumulées */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visites / Vues</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {metrics.totalViews}
            </div>
            <p className="text-xs text-slate-400 mt-1">Trafic sur vos liens</p>
          </div>
        </div>
      </div>

      {/* INTERACTIVE RECHARTS GRAPH: Sales & Orders Trend */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <span>Évolution des Ventes & Commandes Reçues</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Suivi graphique en temps réel du chiffre d'affaires généré par votre boutique
            </p>
          </div>

          {/* Time Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
            {(['7d', '30d', 'all'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setChartPeriod(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartPeriod === p
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p === '7d' ? '7 Jours' : p === '30d' ? '30 Jours' : 'Global'}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="storeRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="storeOrdersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`} />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl shadow-2xl text-xs space-y-1.5 min-w-[160px]">
                        <p className="font-bold text-slate-300 border-b border-slate-800 pb-1">{data.label} ({data.date})</p>
                        <p className="text-indigo-400 font-extrabold flex items-center justify-between">
                          <span>Revenus :</span>
                          <span>{(Number(data.revenue) || 0).toLocaleString('fr-FR')} FCFA</span>
                        </p>
                        <p className="text-emerald-400 font-bold flex items-center justify-between">
                          <span>Commandes :</span>
                          <span>{data.ordersCount}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#6366f1" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#storeRevenueGrad)" 
                name="Ventes (FCFA)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NAVIGATION TABS: Products / Orders / Settings */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'products'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Mes Produits & Services ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'orders'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Commandes Reçues ({orders.length})</span>
          {orders.filter(o => o.status === 'pending').length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
              {orders.filter(o => o.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Paramètres Boutique</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* SUB-TAB 1: PRODUCTS & SERVICES                                        */}
      {/* ===================================================================== */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          
          {/* Search bar & filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text"
                placeholder="Rechercher un produit ou service..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenAddProduct}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Créer une fiche produit</span>
            </button>
          </div>

          {/* Product Cards Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">Aucun produit pour le moment</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Commencez à vendre vos prestations, templates de CV, e-books ou services dès aujourd'hui.
              </p>
              <button
                type="button"
                onClick={handleOpenAddProduct}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Créer mon premier produit</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(prod => {
                const productUrl = `${window.location.origin}/p/${prod.slug}`;
                return (
                  <div 
                    key={prod.id} 
                    className="group bg-slate-900/90 hover:bg-slate-900/95 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-5 shadow-lg hover:shadow-2xl hover:shadow-indigo-500/20 flex flex-col justify-between transform transition-all duration-300 ease-out hover:scale-[1.025] hover:-translate-y-1.5 will-change-transform"
                  >
                    <div className="space-y-3">
                      {/* Product Thumbnail & Category */}
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                        <img 
                          src={prod.images?.[0] || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80'} 
                          alt={prod.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-slate-300 border border-white/10 text-[10px] font-semibold">
                          {prod.category || 'Service'}
                        </div>
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md bg-emerald-500 text-slate-950">
                          {prod.saleType === 'direct_order' ? 'Commande Dokya' : 'Redirection'}
                        </div>
                      </div>

                      {/* Title & Price */}
                      <div>
                        <h4 className="text-base font-bold text-white line-clamp-1 group-hover:text-indigo-400 transition-colors">
                          {prod.title}
                        </h4>
                        <p className="text-lg font-black text-emerald-400 mt-0.5">
                          {(Number(prod.price) || 0).toLocaleString('fr-FR')} <span className="text-xs font-semibold">FCFA</span>
                        </p>
                      </div>

                      {/* Description Preview */}
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {prod.description || 'Aucune description spécifiée.'}
                      </p>

                      {/* Direct Slug URL badge */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
                        <span className="truncate max-w-[190px]">dokya.site/p/{prod.slug}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(productUrl, prod.title)}
                          className="p-1 hover:text-indigo-400 transition-colors cursor-pointer"
                          title="Copier le lien direct du produit"
                        >
                          {copiedLink === prod.title ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenPublicProduct) {
                              onOpenPublicProduct(prod.slug);
                            } else {
                              window.open(`/p/${prod.slug}`, '_blank');
                            }
                          }}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                          title="Tester la page publique"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(prod)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-semibold transition-all cursor-pointer"
                          title="Modifier"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/30 text-rose-400 text-xs font-semibold transition-all cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(productUrl, prod.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Partager</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 2: RECEIVED ORDERS                                            */}
      {/* ===================================================================== */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          
          {/* Orders Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text"
                placeholder="Rechercher par acheteur, n° commande, produit..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'pending', 'validated', 'delivered', 'cancelled'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    orderStatusFilter === st
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'all' ? 'Toutes' : st === 'pending' ? 'En attente' : st === 'validated' ? 'Validées' : st === 'delivered' ? 'Livrées' : 'Annulées'}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                <Package className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">Aucune commande reçue</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Partagez le lien de vos produits sur WhatsApp, Facebook ou LinkedIn pour recevoir vos premières commandes directes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(order => (
                <div 
                  key={order.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                >
                  {/* Left: Product & Buyer Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                        {order.id}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {/* Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        order.status === 'delivered' 
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : order.status === 'validated'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : order.status === 'cancelled'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {order.status === 'delivered' ? 'Livrée' : order.status === 'validated' ? 'Validée' : order.status === 'cancelled' ? 'Annulée' : 'En attente'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white">
                        {order.productTitle}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                        <span className="font-semibold text-emerald-400">
                          {(Number(order.totalAmount) || 0).toLocaleString('fr-FR')} FCFA (Qté : {order.quantity || 1})
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <strong className="text-white">{order.buyerName}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Phone className="w-3.5 h-3.5" />
                          {order.buyerPhone}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <MapPin className="w-3.5 h-3.5" />
                          {order.buyerAddress}
                        </span>
                      </p>
                      {order.buyerNotes && (
                        <p className="text-xs text-slate-400 bg-slate-950 p-2 rounded-xl border border-slate-800/80 mt-2 italic">
                          "{order.buyerNotes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Status Dropdown & WhatsApp Direct Contact */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    
                    {/* Status Changer Select */}
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as StoreOrderStatus)}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="pending">En attente 🟡</option>
                      <option value="validated">Validée 🟢</option>
                      <option value="delivered">Livrée 🔵</option>
                      <option value="cancelled">Annulée 🔴</option>
                    </select>

                    {/* Contact Buyer on WhatsApp */}
                    <a
                      href={getBuyerWhatsAppLink(order)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp Acheteur</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 3: STORE SETTINGS                                             */}
      {/* ===================================================================== */}
      {activeSubTab === 'settings' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-indigo-400" />
              <span>Paramètres de votre Vitrine / Boutique</span>
            </h3>
            <p className="text-xs text-slate-400">
              Personnalisez l'adresse publique de votre boutique et vos informations de contact client.
            </p>
          </div>

          <form onSubmit={handleSaveStoreSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Nom de la boutique
              </label>
              <input 
                type="text"
                required
                value={storeNameInput}
                onChange={(e) => setStoreNameInput(e.target.value)}
                placeholder="Ex: Formations Pro Sénégal, Tech & CV Services..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Identifiant / Username (Lien Public)
              </label>
              <div className="flex items-center rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden focus-within:border-indigo-500">
                <span className="px-3.5 text-xs text-slate-500 font-mono select-none">dokya.site/b/</span>
                <input 
                  type="text"
                  required
                  value={storeUsernameInput}
                  onChange={(e) => setStoreUsernameInput(slugify(e.target.value))}
                  placeholder="votre-nom"
                  className="w-full py-2.5 pr-4 bg-transparent text-sm text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Numéro WhatsApp de contact
              </label>
              <input 
                type="text"
                value={storeWhatsappInput}
                onChange={(e) => setStoreWhatsappInput(e.target.value)}
                placeholder="Ex: +221 77 123 45 67"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Ville / Pays
              </label>
              <input 
                type="text"
                value={storeCityInput}
                onChange={(e) => setStoreCityInput(e.target.value)}
                placeholder="Dakar, Sénégal"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Description / Bio de la boutique
              </label>
              <textarea 
                rows={3}
                value={storeDescriptionInput}
                onChange={(e) => setStoreDescriptionInput(e.target.value)}
                placeholder="Présentez brièvement vos compétences, produits et garanties de livraison..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingSettings ? 'Enregistrement...' : 'Enregistrer les paramètres'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE / EDIT PRODUCT                                          */}
      {/* ===================================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                <span>{editingProduct ? 'Modifier le Produit / Service' : 'Créer une Fiche Produit / Service'}</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="space-y-4">
              
              {/* Titre */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Titre du Produit / Service *
                </label>
                <input 
                  type="text"
                  required
                  value={productTitle}
                  onChange={(e) => {
                    setProductTitle(e.target.value);
                    if (!editingProduct && !productCustomSlug) {
                      setProductCustomSlug(slugify(e.target.value));
                    }
                  }}
                  placeholder="Ex: Ebook Réussir ses Entretiens RH, Pack 3 Modèles CV..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Prix en FCFA & Catégorie */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Prix (FCFA) *
                  </label>
                  <input 
                    type="number"
                    required
                    min={0}
                    step={100}
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Catégorie
                  </label>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Services & Formations">Services & Formations</option>
                    <option value="E-books & Guides">E-books & Guides</option>
                    <option value="Modèles & Templates">Modèles & Templates</option>
                    <option value="Coaching & Conseil">Coaching & Conseil</option>
                    <option value="Produits Physiques">Produits Physiques</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description détaillée
                </label>
                <textarea 
                  rows={3}
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Décrivez clairement ce que reçoit l'acheteur, les livrables, la méthode de livraison..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Lien Image Principale (URL)
                </label>
                <input 
                  type="url"
                  value={productImages}
                  onChange={(e) => setProductImages(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Vous pouvez utiliser une image Unsplash, Imgur ou votre propre hébergeur d'images.</p>
              </div>

              {/* TYPE DE VENTE: Option A (Redirection) vs Option B (Commande Directe) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Type de Vente *
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProductSaleType('direct_order')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      productSaleType === 'direct_order'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>Option B : Commande Dokya</span>
                      {productSaleType === 'direct_order' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                      L'acheteur remplit Nom, Tél/WhatsApp et Adresse sur Dokya.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProductSaleType('redirect')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      productSaleType === 'redirect'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>Option A : Redirection</span>
                      {productSaleType === 'redirect' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                      Redirige l'acheteur vers un lien externe (WhatsApp, site, etc.).
                    </div>
                  </button>
                </div>

                {/* Si Option A : Champ Lien de redirection */}
                {productSaleType === 'redirect' && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Lien personnalisé de redirection *
                    </label>
                    <input 
                      type="url"
                      required={productSaleType === 'redirect'}
                      value={productRedirectUrl}
                      onChange={(e) => setProductRedirectUrl(e.target.value)}
                      placeholder="https://wa.me/221... ou https://mon-site.com"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Slug URL unique */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Lien URL du Produit (Slug)
                </label>
                <div className="flex items-center rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden focus-within:border-indigo-500">
                  <span className="px-3.5 text-xs text-slate-500 font-mono select-none">dokya.site/p/</span>
                  <input 
                    type="text"
                    value={productCustomSlug}
                    onChange={(e) => setProductCustomSlug(slugify(e.target.value))}
                    placeholder="mon-produit"
                    className="w-full py-2.5 pr-4 bg-transparent text-sm text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingProduct ? 'Enregistrement...' : editingProduct ? 'Enregistrer les modifications' : 'Publier le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
