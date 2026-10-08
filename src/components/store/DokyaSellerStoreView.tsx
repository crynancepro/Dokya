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
  Truck,
  Upload,
  Image as ImageIcon,
  Receipt,
  FileText
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
import { useLocale } from '../../contexts/LocaleContext';

// Helper to compress and resize local image files before saving
function compressImageFile(
  file: File, 
  maxWidth = 1200, 
  maxHeight = 1200, 
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Attempt modern webp format first, fallback to jpeg
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {
          // fallback
        }
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error("Échec du décodage de l'image."));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Échec de la lecture du fichier."));
    reader.readAsDataURL(file);
  });
}

interface DokyaSellerStoreViewProps {
  profile: CandidateProfile;
  onOpenPublicProduct?: (slug: string) => void;
  onOpenPublicStore?: (username: string) => void;
  onGenerateInvoiceForOrder?: (order: StoreOrder, storeProfile?: SellerStoreProfile | null) => void;
}

export const DokyaSellerStoreView: React.FC<DokyaSellerStoreViewProps> = ({
  profile,
  onOpenPublicProduct,
  onOpenPublicStore,
  onGenerateInvoiceForOrder
}) => {
  const currentUid = auth.currentUser?.uid || profile.uid || 'guest';
  const defaultUsername = slugify(profile.personalInfo?.firstName || profile.email?.split('@')[0] || 'vendeur');
  const { formatPrice, userCurrency } = useLocale();

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

  // Delete Confirmation States (In-App Modals - avoiding blocked window.confirm)
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState<boolean>(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);

  // Form State for Product
  const [productTitle, setProductTitle] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState<number | string>(5000);
  const [productType, setProductType] = useState<'physical' | 'digital'>('physical');
  const [productCategory, setProductCategory] = useState('Produits Physiques');
  const [productImages, setProductImages] = useState<string>('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80');
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Traitement et optimisation du fichier image importé
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageUploadError("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setImageUploadError("L'image est trop volumineuse (maximum 15 Mo).");
      return;
    }

    setImageUploadLoading(true);
    setImageUploadError(null);

    try {
      const compressedDataUrl = await compressImageFile(file, 1200, 1200, 0.85);
      setProductImages(compressedDataUrl);
      showToast("Image importée et optimisée avec succès !");
    } catch (err: any) {
      console.error('Erreur compression image:', err);
      setImageUploadError("Impossible de traiter cette image. Réessayez ou utilisez un lien web.");
    } finally {
      setImageUploadLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const [productSaleType, setProductSaleType] = useState<ProductSaleType>('direct_order');
  const [productRedirectUrl, setProductRedirectUrl] = useState('');
  const [productCustomSlug, setProductCustomSlug] = useState('');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Télévendeurs / Marketplace Affiliation Form State
  const [commissionType, setCommissionType] = useState<'percent' | 'fixed'>('percent');
  const [commissionValue, setCommissionValue] = useState<number | string>(20); // 20% par défaut
  const [targetCountries, setTargetCountries] = useState<string[]>(['ALL']);
  const [isAffiliationEnabled, setIsAffiliationEnabled] = useState<boolean>(true);

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
    setProductType('physical');
    setProductCategory('Produits Physiques');
    setProductImages('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80');
    setImageInputMode('upload');
    setImageUploadError(null);
    setProductSaleType('direct_order');
    setProductRedirectUrl('');
    setProductCustomSlug('');
    setCommissionType('percent');
    setCommissionValue(20);
    setTargetCountries(['ALL']);
    setIsAffiliationEnabled(true);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: ProductItem) => {
    setEditingProduct(prod);
    setProductTitle(prod.title);
    setProductDescription(prod.description);
    setProductPrice(prod.price);
    const pType = prod.product_type || (prod as any).productType || (prod.category === 'Produits Physiques' ? 'physical' : 'digital');
    setProductType(pType);
    setProductCategory(prod.category || (pType === 'physical' ? 'Produits Physiques' : 'Services & Formations'));
    const existingImg = prod.images?.[0] || '';
    setProductImages(existingImg);
    setImageInputMode(existingImg.startsWith('data:') ? 'upload' : 'url');
    setImageUploadError(null);
    setProductSaleType(prod.saleType);
    setProductRedirectUrl(prod.redirectUrl || '');
    setProductCustomSlug(prod.slug);
    setCommissionType(prod.commissionType || 'percent');
    setCommissionValue(prod.commissionValue !== undefined ? prod.commissionValue : 20);
    setTargetCountries(Array.isArray(prod.targetCountries) && prod.targetCountries.length > 0 ? prod.targetCountries : ['ALL']);
    setIsAffiliationEnabled(prod.isAffiliationEnabled ?? true);
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
      const cleanSellerUsername = slugify(storeProfile?.username || storeUsernameInput || defaultUsername);
      const sellerName = storeProfile?.storeName || storeNameInput || profile.personalInfo?.firstName || 'Vendeur';
      const sellerPhone = storeProfile?.whatsappNumber || profile.personalInfo?.phone || '';

      const imagesArray: string[] = [];
      if (productImages && productImages.trim()) {
        imagesArray.push(productImages.trim());
      } else {
        imagesArray.push('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80');
      }

      const slugCandidate = productCustomSlug.trim() 
        ? slugify(productCustomSlug) 
        : generateProductSlug(productTitle);

      const saved = await saveProduct({
        id: editingProduct?.id,
        userId: currentUid,
        sellerUsername: cleanSellerUsername,
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
        product_type: productType,
        productType: productType,
        images: imagesArray,
        saleType: productSaleType,
        redirectUrl: productSaleType === 'redirect' ? productRedirectUrl.trim() : '',
        enableDirectOrder: productSaleType === 'direct_order',
        status: 'active',
        commissionType,
        commissionValue: Number(commissionValue) || 0,
        targetCountries: targetCountries.length > 0 ? targetCountries : ['ALL'],
        isAffiliationEnabled
      });

      // Synchroniser explicitement le profil de la vitrine pour que la boutique publique le reconnaisse immédiatement
      try {
        await saveSellerStoreProfile(currentUid, {
          storeName: sellerName,
          username: cleanSellerUsername,
          whatsappNumber: sellerPhone,
          phone: sellerPhone,
          city: storeCityInput || 'Dakar',
          country: 'Sénégal',
          email: profile.email || ''
        });
      } catch (_e) {}

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

  // Delete Product Trigger & Confirm
  const handleDeleteProduct = (prod: ProductItem) => {
    setProductToDelete(prod);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      await deleteProduct(productToDelete.id, currentUid);
      showToast(`Produit "${productToDelete.title}" supprimé avec succès.`);
      if (editingProduct?.id === productToDelete.id) {
        setIsProductModalOpen(false);
        setEditingProduct(null);
      }
      setProductToDelete(null);
      loadData();
    } catch (err) {
      console.error('Erreur suppression produit:', err);
      showToast('Erreur lors de la suppression.');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Delete All Products Trigger & Confirm
  const handleDeleteAllProducts = () => {
    setIsDeleteAllModalOpen(true);
  };

  const handleConfirmDeleteAllProducts = async () => {
    setIsDeletingAll(true);
    try {
      for (const prod of products) {
        await deleteProduct(prod.id, currentUid);
      }
      setProducts([]);
      showToast('Tous les produits du catalogue ont été supprimés.');
      setIsDeleteAllModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Erreur suppression catalogue:', err);
      showToast('Erreur lors de la suppression des produits.');
    } finally {
      setIsDeletingAll(false);
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

  // 1-Click Action: Générer la facture pour cette commande
  const handleGenerateInvoiceForOrder = (order: StoreOrder) => {
    // 1. Redirige le vendeur vers le module de facturation avec l'ID de commande en paramètre d'URL
    if (typeof window !== 'undefined') {
      const targetUrl = `/dashboard/factures/create?orderId=${encodeURIComponent(order.id)}`;
      window.history.pushState({ orderId: order.id }, '', targetUrl);
    }

    // 2. Déclenche le pré-remplissage via callback parent ou événement personnalisé
    if (onGenerateInvoiceForOrder) {
      onGenerateInvoiceForOrder(order, storeProfile);
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dokya:generate-invoice-from-order', {
        detail: { orderId: order.id, order, storeProfile }
      }));
    }
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
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl sm:rounded-3xl p-4 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Boutique & Liens de Vente Dokya</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="truncate max-w-[240px] xs:max-w-md sm:max-w-none">{storeProfile?.storeName || `Boutique ${profile.personalInfo?.firstName || 'Dokya'}`}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
                En Ligne 🟢
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Vendez vos formations, e-books, services ou produits avec des liens de paiement et commandes directes Dokya.
            </p>

            {/* Public Store Link Bar (Mobile Responsive & Overflow-Safe) */}
            <div className="pt-2 flex flex-wrap items-center gap-2 max-w-full">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300 min-w-0 max-w-full">
                <Store className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-slate-500 select-none shrink-0">dokya.site/b/</span>
                <span className="text-white font-bold truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">{activeStoreUsername}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => copyToClipboard(publicStoreUrl, 'Boutique')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer shrink-0"
                  title="Copier le lien de la vitrine"
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer shrink-0"
                  title="Ouvrir la vitrine publique"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Voir ma vitrine</span>
                  <span className="xs:hidden">Vitrine</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Action: Add Product */}
          <div className="w-full md:w-auto">
            <button
              type="button"
              onClick={handleOpenAddProduct}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Produit / Service</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI CARDS (REVENUE, ORDERS, PRODUCTS, VIEWS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Chiffre d'Affaires Encaissé */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Ventes Encaissées</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 min-w-0">
            <div className="text-lg sm:text-2xl lg:text-3xl font-black text-emerald-400 tracking-tight truncate">
              {formatPrice(Number(metrics.totalSalesAmount) || 0)}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 flex items-center gap-1 truncate">
              <span className="text-emerald-400 font-semibold">{metrics.validatedOrdersCount}</span> validées
            </p>
          </div>
        </div>

        {/* Card 2: Commandes Reçues */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-lg relative overflow-hidden group hover:border-indigo-500/30 transition-all min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Commandes Totales</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 min-w-0">
            <div className="text-lg sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              {metrics.totalOrdersCount}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 truncate">Direct & WhatsApp</p>
          </div>
        </div>

        {/* Card 3: Produits Actifs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Produits Actifs</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 min-w-0">
            <div className="text-lg sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              {metrics.activeProductsCount}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 truncate">En vitrine publique</p>
          </div>
        </div>

        {/* Card 4: Vues Cumulées */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-all min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Visites / Vues</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shrink-0">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 min-w-0">
            <div className="text-lg sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              {metrics.totalViews}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 truncate">Trafic sur liens</p>
          </div>
        </div>
      </div>

      {/* INTERACTIVE RECHARTS GRAPH: Sales & Orders Trend */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
              <span>Évolution des Ventes & Commandes Reçues</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Suivi graphique en temps réel du chiffre d'affaires généré par votre boutique
            </p>
          </div>

          {/* Time Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start sm:self-auto">
            {(['7d', '30d', 'all'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setChartPeriod(p)}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
        <div className="h-52 sm:h-64 w-full pt-2">
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

      {/* NAVIGATION TABS: Products / Orders / Settings (Mobile Responsive Scrollable Bar) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => setActiveSubTab('products')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'products'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4 shrink-0" />
          <span>Mes Produits ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('orders')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'orders'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span>Commandes Reçues ({orders.length})</span>
          {orders.filter(o => o.status === 'pending').length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center shrink-0">
              {orders.filter(o => o.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
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

            <div className="flex items-center gap-2">
              {products.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllProducts}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all cursor-pointer"
                  title="Supprimer tous les produits du catalogue"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Vider le catalogue</span>
                  <span className="sm:hidden">Vider</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenAddProduct}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Créer une fiche produit</span>
              </button>
            </div>
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
                    className="group bg-slate-900/90 hover:bg-slate-900/95 border border-slate-800/80 hover:border-indigo-500/50 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-indigo-500/20 flex flex-col justify-between transform transition-all duration-300 ease-out hover:scale-[1.025] hover:-translate-y-1.5 will-change-transform"
                  >
                    {/* Image sans encadrement bord à bord */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                      <img 
                        src={prod.images?.[0] || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80'} 
                        alt={prod.title}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/20 pointer-events-none" />

                      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-slate-200 border border-white/10 text-[10px] font-bold shadow-md">
                        {prod.category || 'Service'}
                      </div>
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] font-black shadow-md bg-emerald-500 text-slate-950">
                        {prod.saleType === 'direct_order' ? 'Commande Dokya' : 'Redirection'}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        {/* Title & Price */}
                        <div>
                          <h4 className="text-base font-bold text-white line-clamp-1 group-hover:text-indigo-400 transition-colors">
                            {prod.title}
                          </h4>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-xl font-black text-emerald-400">
                              {formatPrice(Number(prod.price) || 0)}
                            </span>
                            <span className="text-xs text-slate-500 line-through">
                              {formatPrice(Math.round((Number(prod.price) || 0) * 1.25 / 500) * 500)}
                            </span>
                          </div>
                        </div>

                        {/* Description Preview */}
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mt-2">
                          {prod.description || 'Aucune description spécifiée.'}
                        </p>
                      </div>

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
                          onClick={() => handleDeleteProduct(prod)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/30 text-rose-400 text-xs font-semibold transition-all cursor-pointer"
                          title="Supprimer ce produit"
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
                      <h4 className="text-sm sm:text-base font-bold text-white break-words">
                        {order.productTitle}
                      </h4>
                      <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="font-semibold text-emerald-400">
                          {formatPrice(Number(order.totalAmount) || 0)} (Qté : {order.quantity || 1})
                        </span>
                        <span className="hidden xs:inline">•</span>
                        <span className="flex items-center gap-1 min-w-0">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <strong className="text-white truncate max-w-[140px]">{order.buyerName}</strong>
                        </span>
                        <span className="hidden xs:inline">•</span>
                        <span className="flex items-center gap-1 text-slate-400 min-w-0">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-mono">{order.buyerPhone}</span>
                        </span>
                        <span className="hidden xs:inline">•</span>
                        <span className="flex items-center gap-1 text-slate-400 min-w-0">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[180px]">{order.buyerAddress}</span>
                        </span>
                      </div>
                      {order.buyerNotes && (
                        <p className="text-xs text-slate-400 bg-slate-950 p-2 rounded-xl border border-slate-800/80 mt-2 italic break-words">
                          "{order.buyerNotes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Status Dropdown, WhatsApp, Invoice (Mobile Responsive Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-800 shrink-0">
                    
                    {/* Status Changer Select */}
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as StoreOrderStatus)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp Acheteur</span>
                    </a>

                    {/* Générer la Facture en 1-Clic */}
                    <button
                      type="button"
                      onClick={() => handleGenerateInvoiceForOrder(order)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                      title="Générer la facture officielle pré-remplie en 1-clic pour cette commande"
                    >
                      <Receipt className="w-4 h-4 text-indigo-200" />
                      <span>Générer Facture</span>
                    </button>
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
      {/* MODAL: CREATE / EDIT PRODUCT (Mobile Responsive & Touch Optimized) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-7 max-w-xl w-full shadow-2xl space-y-4 sm:space-y-5 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400 shrink-0" />
                <span className="truncate">{editingProduct ? 'Modifier le Produit' : 'Créer une Fiche Produit'}</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
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
                  placeholder="Ex: Guide RH Réussir ses Entretiens, Pack 3 Modèles CV..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* TYPE DE PRODUIT (PHYSIQUE VS DIGITAL) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Format du Produit (Style Chariow)
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setProductType('physical');
                      setProductCategory('Produits Physiques');
                      setProductSaleType('direct_order');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      productType === 'physical'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Produit Physique</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProductType('digital');
                      if (productCategory === 'Produits Physiques') setProductCategory('E-books & Guides');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      productType === 'digital'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Produit Digital</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {productType === 'physical' 
                    ? '📦 Physique : Formulaire de livraison en 30s & paiement à la livraison.' 
                    : '⚡ Digital : Fichiers inclus (PDF, templates, e-books) avec téléchargement & accès direct.'}
                </p>
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

              {/* Image Produit : Upload depuis l'appareil OU Lien web (URL) */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Photo / Image du Produit ou Service *
                  </label>
                  
                  {/* Onglets sélecteur de mode : Fichier vs URL */}
                  <div className="inline-flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setImageInputMode('upload');
                        setImageUploadError(null);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        imageInputMode === 'upload'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Importer fichier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageInputMode('url');
                        setImageUploadError(null);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        imageInputMode === 'url'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Lien web (URL)</span>
                    </button>
                  </div>
                </div>

                {/* OPTION 1: Importer depuis l'appareil */}
                {imageInputMode === 'upload' && (
                  <div>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <div 
                      onClick={() => !imageUploadLoading && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                        imageUploadLoading 
                          ? 'border-indigo-500/50 bg-indigo-950/20 opacity-70' 
                          : 'border-slate-800 hover:border-indigo-500/60 bg-slate-950/60 hover:bg-slate-950'
                      }`}
                    >
                      {imageUploadLoading ? (
                        <div className="flex flex-col items-center justify-center space-y-2 py-2">
                          <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"></div>
                          <p className="text-xs text-indigo-300 font-semibold">Optimisation et traitement de l'image en cours...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">
                              Cliquez pour choisir une photo ou capture depuis votre appareil
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              JPG, PNG, WebP (Téléphone, Galerie, PC) • Redimensionnement & optimisation auto
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* OPTION 2: Lien web de l'image (URL) */}
                {imageInputMode === 'url' && (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="url"
                        value={productImages}
                        onChange={(e) => {
                          setProductImages(e.target.value);
                          setImageUploadError(null);
                        }}
                        placeholder="https://images.unsplash.com/... ou lien de votre image"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Collez le lien direct (URL) vers votre image en ligne (ex: Unsplash, Imgur, Cloudinary, votre site).
                    </p>
                  </div>
                )}

                {/* Message d'erreur s'il y a un souci */}
                {imageUploadError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{imageUploadError}</span>
                  </p>
                )}

                {/* Aperçu en direct de l'image sélectionnée sans encadrement inutile */}
                {productImages && (
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md">
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
                      <img 
                        src={productImages} 
                        alt="Aperçu produit" 
                        className="w-full h-full object-cover"
                        onError={() => setImageUploadError("L'image n'a pas pu être affichée. Vérifiez le lien ou importez un fichier.")}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/20 pointer-events-none" />

                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{productImages.startsWith('data:') ? 'Image importée & optimisée' : 'Lien URL vérifié'}</span>
                      </div>

                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        {imageInputMode === 'upload' && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-slate-200 text-xs font-semibold backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
                          >
                            Changer
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setProductImages('');
                            setImageUploadError(null);
                          }}
                          className="p-1.5 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white backdrop-blur-md transition-colors cursor-pointer shadow-md"
                          title="Retirer l'image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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

              {/* MODULE TÉLÉVENDEURS & MARKETPLACE D'AFFILIATION */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-950 border border-indigo-500/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      Module Télévendeurs & Affiliation Dokya
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isAffiliationEnabled}
                      onChange={(e) => setIsAffiliationEnabled(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <p className="text-[11px] text-slate-400">
                  Permettez au réseau de télévendeurs certifiés Dokya de vendre votre produit contre une commission.
                </p>

                {isAffiliationEnabled && (
                  <div className="space-y-3 pt-1 border-t border-indigo-500/20 animate-in fade-in duration-200">
                    {/* Choix Type de Commission et Montant */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Commission attribuée au télévendeur par vente
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1">
                          <button
                            type="button"
                            onClick={() => setCommissionType('percent')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              commissionType === 'percent'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Pourcentage (%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setCommissionType('fixed')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              commissionType === 'fixed'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Montant Fixe (FCFA)
                          </button>
                        </div>

                        <div className="relative">
                          <input 
                            type="number"
                            min={1}
                            value={commissionValue}
                            onChange={(e) => setCommissionValue(e.target.value)}
                            placeholder={commissionType === 'percent' ? "Ex: 20%" : "Ex: 3000 FCFA"}
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">
                            {commissionType === 'percent' ? '%' : 'FCFA'}
                          </span>
                        </div>
                      </div>

                      {/* Aperçu du gain calculé */}
                      <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
                        <span>Gain télévendeur par vente conclue :</span>
                        <span className="font-black text-sm">
                          {commissionType === 'percent'
                            ? `${Math.round(((Number(productPrice) || 0) * (Number(commissionValue) || 0)) / 100).toLocaleString('fr-FR')} FCFA (${commissionValue}%)`
                            : `${(Number(commissionValue) || 0).toLocaleString('fr-FR')} FCFA`}
                        </span>
                      </div>
                    </div>

                    {/* Ciblage géographique multi-pays */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-300">
                          Ciblage géographique de l'offre
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (targetCountries.includes('ALL')) {
                              setTargetCountries(['SN', 'CI', 'CM', 'CG']);
                            } else {
                              setTargetCountries(['ALL']);
                            }
                          }}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                        >
                          {targetCountries.includes('ALL') ? 'Cibler des pays précis' : 'Tous les pays (Par défaut)'}
                        </button>
                      </div>

                      {targetCountries.includes('ALL') ? (
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                          <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span><strong>Tous les pays éligibles</strong> (Afrique de l'Ouest, Centrale et International)</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {[
                            { code: 'SN', label: 'Sénégal', flag: '🇸🇳' },
                            { code: 'CI', label: 'Côte d\'Ivoire', flag: '🇨🇮' },
                            { code: 'CM', label: 'Cameroun', flag: '🇨🇲' },
                            { code: 'CG', label: 'Congo', flag: '🇨🇬' },
                            { code: 'BF', label: 'Burkina Faso', flag: '🇧🇫' },
                            { code: 'ML', label: 'Mali', flag: '🇲🇱' },
                            { code: 'BJ', label: 'Bénin', flag: '🇧🇯' },
                            { code: 'TG', label: 'Togo', flag: '🇹🇬' },
                            { code: 'GA', label: 'Gabon', flag: '🇬🇦' },
                            { code: 'FR', label: 'France', flag: '🇫🇷' },
                            { code: 'US', label: 'Monde / US', flag: '🌐' }
                          ].map(c => {
                            const isSelected = targetCountries.includes(c.code);
                            return (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    const next = targetCountries.filter(x => x !== c.code);
                                    setTargetCountries(next.length === 0 ? ['ALL'] : next);
                                  } else {
                                    setTargetCountries([...targetCountries.filter(x => x !== 'ALL'), c.code]);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600/30 border-indigo-500 text-white'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <span>{c.flag}</span>
                                <span className="truncate">{c.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
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
              <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-800">
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => {
                      setProductToDelete(editingProduct);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                    title="Supprimer définitivement cette fiche produit"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer ce produit</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: CONFIRMATION SUPPRESSION D'UN PRODUIT                       */}
      {/* ===================================================================== */}
      {productToDelete && (
        <div 
          className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !isDeletingProduct && setProductToDelete(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !isDeletingProduct) setProductToDelete(null);
            if (e.key === 'Enter' && !isDeletingProduct) handleConfirmDeleteProduct();
          }}
          tabIndex={0}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-rose-500/30 p-6 shadow-2xl shadow-rose-950/40 text-center animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-400">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-white mb-2">
              Supprimer cette fiche produit ?
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Êtes-vous sûr de vouloir supprimer définitivement le produit <strong className="text-white">« {productToDelete.title} »</strong> ({Number(productToDelete.price).toLocaleString('fr-FR')} FCFA) ?
            </p>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 text-left mb-6 flex items-start gap-2.5">
              <span className="text-rose-400 font-bold shrink-0">⚠️</span>
              <span>Cette action est immédiate et irréversible. Le lien public et l'accès affilié seront désactivés.</span>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeletingProduct}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                disabled={isDeletingProduct}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingProduct ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: CONFIRMATION VIDER TOUT LE CATALOGUE                        */}
      {/* ===================================================================== */}
      {isDeleteAllModalOpen && (
        <div 
          className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !isDeletingAll && setIsDeleteAllModalOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !isDeletingAll) setIsDeleteAllModalOpen(false);
            if (e.key === 'Enter' && !isDeletingAll) handleConfirmDeleteAllProducts();
          }}
          tabIndex={0}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-rose-500/30 p-6 shadow-2xl shadow-rose-950/40 text-center animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-400">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-white mb-2">
              Vider tout le catalogue vendeur ?
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Voulez-vous vraiment supprimer les <strong className="text-rose-400 font-bold">{products.length}</strong> produits de votre boutique ?
            </p>

            <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/20 text-[11px] text-rose-300 text-left mb-6">
              ⚠️ Attention : Toutes vos fiches produits seront supprimées de façon irréversible.
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(false)}
                disabled={isDeletingAll}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAllProducts}
                disabled={isDeletingAll}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingAll ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vider le catalogue</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
