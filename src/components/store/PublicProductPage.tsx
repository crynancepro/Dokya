import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShoppingBag, 
  ArrowLeft, 
  ExternalLink, 
  CheckCircle2, 
  MessageCircle, 
  Phone, 
  MapPin, 
  User, 
  ShieldCheck, 
  Truck, 
  Share2, 
  Copy, 
  Check, 
  Store,
  Sparkles, 
  AlertCircle, 
  Plus, 
  Minus,
  Star,
  Flame,
  CreditCard,
  Clock,
  Zap,
  ChevronRight,
  FileText,
  Download,
  Eye,
  Lock,
  Package,
  Layers,
  X,
  BookOpen,
  CheckCheck,
  FileDown
} from 'lucide-react';
import { ProductItem, StoreOrder } from '../../types';
import { fetchProductBySlug, createStoreOrder } from '../../lib/storeService';

interface PublicProductPageProps {
  slug: string;
  onBackToApp?: () => void;
  onOpenStore?: (username: string) => void;
}

interface DigitalFileItem {
  id: string;
  name: string;
  size: string;
  type: string;
  format: string;
  pagesCount?: number;
  description: string;
  previewSnippet: string[];
}

export const PublicProductPage: React.FC<PublicProductPageProps> = ({
  slug,
  onBackToApp,
  onOpenStore
}) => {
  const [product, setProduct] = useState<ProductItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mode hybride : Physique vs Digital
  const [activeProductType, setActiveProductType] = useState<'physical' | 'digital'>('physical');

  // Direct Order Form State (Produit physique)
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerNotes, setBuyerNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<StoreOrder | null>(null);

  // Digital purchase state & download unlock
  const [isDigitalUnlocked, setIsDigitalUnlocked] = useState(false);
  const [previewFile, setPreviewFile] = useState<DigitalFileItem | null>(null);

  // Compte à rebours d'urgence (Chariow Flash Sale)
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 15 });

  // Link copy feedback
  const [copied, setCopied] = useState(false);
  const orderFormRef = useRef<HTMLDivElement | null>(null);

  const scrollToOrderForm = () => {
    orderFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Timer compte à rebours
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 4, minutes: 59, seconds: 59 }; // boucle
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Chargement du produit
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const prod = await fetchProductBySlug(slug);
        if (isMounted) {
          if (prod) {
            setProduct(prod);
            // Déterminer le type par défaut
            const isDigit = prod.product_type === 'digital' || 
                            (prod as any).productType === 'digital' ||
                            (prod.category && prod.category !== 'Produits Physiques' && (
                              prod.category.includes('E-books') ||
                              prod.category.includes('Templates') ||
                              prod.category.includes('Formations') ||
                              prod.category.includes('Coaching')
                            )) ||
                            prod.saleType === 'redirect';
            setActiveProductType(isDigit ? 'digital' : 'physical');
          } else {
            setError("Ce produit ou service n'est plus disponible ou a été déplacé.");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Impossible de charger la fiche produit.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [slug]);

  // Fichiers inclus pour les produits digitaux
  const digitalFilesList: DigitalFileItem[] = useMemo(() => {
    if (product?.digitalFiles && product.digitalFiles.length > 0) {
      return product.digitalFiles.map((f, i) => ({
        id: f.id || `file_${i}`,
        name: f.name || `Document-Dokya-${i + 1}.pdf`,
        size: f.size || '3.4 Mo',
        type: f.type || 'pdf',
        format: 'PDF Haute Définition',
        pagesCount: f.pagesCount || 32,
        description: f.description || 'Document téléchargeable et imprimable immédiatement.',
        previewSnippet: [
          'Sommaire général et objectifs opérationnels',
          'Méthodologie détaillée étape par étape',
          'Exemples concrets et études de cas réels',
          'Ressources complémentaires et fiches outils'
        ]
      }));
    }

    // Fichiers par défaut riches adaptés au contexte de Dokya
    return [
      {
        id: 'file_guide',
        name: `${product?.title ? product.title.replace(/[^a-zA-Z0-9]/g, '-') : 'Guide'}-Edition-Complete.pdf`,
        size: '5.2 Mo',
        type: 'pdf',
        format: 'PDF Interactif & Imprimable',
        pagesCount: 48,
        description: 'Guide complet détaillé avec structure éprouvée, illustrations et pas-à-pas.',
        previewSnippet: [
          'Chapitre 1 : Les fondations indispensables et erreurs à éviter',
          'Chapitre 2 : La méthode exacte pour maximiser vos résultats',
          'Chapitre 3 : Modèles pratiques prêts à l’emploi',
          'Annexe : Grille d’évaluation et checklist de conformité'
        ]
      },
      {
        id: 'file_templates',
        name: 'Pack-Modeles-Prets-A-L-Emploi.docx',
        size: '2.1 Mo',
        type: 'docx',
        format: 'Word (.docx) & Google Docs',
        pagesCount: 12,
        description: 'Modèles 100% éditables et personnalisables en quelques minutes.',
        previewSnippet: [
          'Template standard optimisé pour recruteurs et clients',
          'Variante moderne avec mise en valeur visuelle',
          'Exemple de rédaction clé en main'
        ]
      },
      {
        id: 'file_checklist',
        name: 'Checklist-Feuille-De-Route-Action.pdf',
        size: '950 Ko',
        type: 'pdf',
        format: 'PDF Fiche Outil',
        pagesCount: 6,
        description: 'Feuille de route synthétique pour passer à l’action sans hésitation.',
        previewSnippet: [
          'Étape 1 : Préparation et inventaire préalable',
          'Étape 2 : Déploiement et tests de validation',
          'Étape 3 : Suivi des indicateurs de réussite'
        ]
      }
    ];
  }, [product]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Soumission commande physique
  const handleDirectOrderSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!product) return;

    if (!buyerName.trim() || !buyerPhone.trim() || !buyerAddress.trim()) {
      scrollToOrderForm();
      alert("Veuillez renseigner votre nom, votre numéro WhatsApp/téléphone et votre adresse de livraison.");
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await createStoreOrder({
        productId: product.id,
        productSlug: product.slug,
        productTitle: product.title,
        productPrice: product.price,
        productImage: (product.images && product.images[0]) || product.imageUrl,
        sellerId: product.userId,
        sellerUsername: product.sellerUsername,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        buyerAddress: buyerAddress.trim(),
        buyerNotes: buyerNotes.trim(),
        quantity
      });

      setOrderSuccess(order);
    } catch (err: any) {
      alert("Une erreur est survenue lors de l'enregistrement de votre commande. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Achat immédiat digital
  const handleDigitalPurchase = () => {
    if (product?.redirectUrl) {
      window.open(product.redirectUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    // Simulation / activation déblocage instantané
    setIsDigitalUnlocked(true);
  };

  // Lien WhatsApp de confirmation après commande
  const getSellerWhatsAppContactUrl = (order: StoreOrder) => {
    const rawSellerPhone = (product?.sellerWhatsapp || product?.sellerPhone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawSellerPhone.length === 9 ? `221${rawSellerPhone}` : rawSellerPhone;
    const msg = encodeURIComponent(
      `Bonjour ${product?.sellerName || 'Vendeur'}, je viens de passer la commande n° ${order.id} sur votre boutique Dokya !\n\n` +
      `📦 Produit : ${order.productTitle}\n` +
      `🔢 Quantité : ${order.quantity}\n` +
      `💰 Total : ${(Number(order.totalAmount) || 0).toLocaleString('fr-FR')} FCFA (Paiement à la livraison)\n` +
      `👤 Nom du client : ${order.buyerName}\n` +
      `📍 Adresse de livraison : ${order.buyerAddress}\n\n` +
      `Merci de me confirmer la prise en charge et l'expédition de mon colis.`
    );
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
  };

  // Lien commande rapide WhatsApp
  const getDirectWhatsAppFastOrderUrl = () => {
    if (!product) return '#';
    const rawSellerPhone = (product.sellerWhatsapp || product.sellerPhone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawSellerPhone.length === 9 ? `221${rawSellerPhone}` : rawSellerPhone;
    const currentTotal = (Number(product.price) || 0) * quantity;
    const msg = encodeURIComponent(
      `Bonjour ${product.sellerName || 'Vendeur'},\n\n` +
      `Je souhaite commander directement votre produit sur Dokya :\n` +
      `📦 Produit : ${product.title}\n` +
      `🔢 Quantité : ${quantity}\n` +
      `💰 Total : ${currentTotal.toLocaleString('fr-FR')} FCFA (Paiement à la livraison)\n\n` +
      `Pouvez-vous me confirmer la disponibilité et convenir de la livraison ? Merci !`
    );
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
        <p className="text-slate-400 text-xs font-semibold mt-4">Chargement de la vitrine produit...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Produit introuvable</h2>
        <p className="text-slate-400 text-xs max-w-sm mb-6">{error || "Cette fiche produit n'existe pas ou a été retirée."}</p>
        {onBackToApp && (
          <button
            type="button"
            onClick={onBackToApp}
            className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            Retourner à Dokya
          </button>
        )}
      </div>
    );
  }

  const totalPrice = product.price * quantity;
  const originalComparisonPrice = Math.round((Number(product.price) || 0) * 1.33 / 500) * 500;
  const productImageSrc = (product.images && product.images.length > 0 && product.images[0]) || 
                          product.imageUrl || 
                          'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white pb-24 lg:pb-12">
      
      {/* ===================================================================== */}
      {/* TOP HEADER : Navigation & Identité Boutique                          */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            {onBackToApp && (
              <button
                type="button"
                onClick={onBackToApp}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Retour"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenStore && onOpenStore(product.sellerUsername)}
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-xs shadow-md shadow-emerald-600/20">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white line-clamp-1">{product.sellerName}</p>
                <p className="text-[10px] text-slate-400 font-mono">dokya.site/b/{product.sellerUsername}</p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch Démo Format (Permet au vendeur ou client de tester les deux vues) */}
            <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveProductType('physical')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeProductType === 'physical'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📦 Physique
              </button>
              <button
                type="button"
                onClick={() => setActiveProductType('digital')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeProductType === 'digital'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ Digital
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Lien copié' : 'Partager'}</span>
            </button>

            {onOpenStore && (
              <button
                type="button"
                onClick={() => onOpenStore(product.sellerUsername)}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>Boutique</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </header>

      {/* ===================================================================== */}
      {/* BANNIÈRE COMMUTATEUR MOBILE (Optionnel pour basculer facilement)       */}
      {/* ===================================================================== */}
      <div className="md:hidden bg-slate-900/60 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
        <span className="text-slate-400">Format d'affichage :</span>
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveProductType('physical')}
            className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
              activeProductType === 'physical' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            📦 Physique
          </button>
          <button
            type="button"
            onClick={() => setActiveProductType('digital')}
            className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
              activeProductType === 'digital' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            ⚡ Digital
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LAYOUT PRINCIPAL (GRID 2 COLONNES STYLE CHARIOW)                      */}
      {/* ===================================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* ================================================================= */}
          {/* COLONNE GAUCHE (lg:col-span-7) : CONTENU PRINCIPAL & MÉDIAS       */}
          {/* ================================================================= */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8">
            
            {/* 1. GRANDE IMAGE IMMERSIVE (100% DE LA LARGEUR DE LA COLONNE) */}
            <div className="w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[16/10] rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 relative shadow-2xl border border-slate-800/80 group">
              <img 
                src={productImageSrc} 
                alt={product.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80';
                }}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700 ease-out"
              />
              
              {/* Gradient subtil en base pour lisibilité maximale */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-black/25 pointer-events-none" />

              {/* Badges Flottants Glassmorphism */}
              <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-white border border-white/20 text-xs font-bold shadow-lg">
                  {product.category || 'Offre Dokya'}
                </span>

                <span className={`px-3 py-1 rounded-full backdrop-blur-md text-xs font-black shadow-lg border ${
                  activeProductType === 'digital'
                    ? 'bg-indigo-600/90 text-white border-indigo-400/40'
                    : 'bg-emerald-600/90 text-slate-950 border-emerald-400/40'
                }`}>
                  {activeProductType === 'digital' ? '⚡ Produit Digital' : '📦 Produit Physique'}
                </span>
              </div>

              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-amber-300 border border-white/20 text-xs font-black shadow-lg">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{product.sellerRating || 4.9}/5</span>
                <span className="text-slate-400 font-normal text-[10px]">({product.sellerReviewsCount || 18} avis)</span>
              </div>

              <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-slate-200 border border-white/15 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{activeProductType === 'digital' ? 'Accès direct 24h/24 & 7j/7' : 'En stock • Prêt à expédier'}</span>
              </div>

              <div className="absolute bottom-4 right-4 hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-slate-300 border border-white/15 text-[11px] font-semibold">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>14 commandes cette semaine</span>
              </div>
            </div>

            {/* 2. TITRE DU PRODUIT, PRIX & DESCRIPTION DÉTAILLÉE */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3" />
                    <span>Sélection Dokya Vérifiée</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/25 text-[11px] font-bold">
                    <Flame className="w-3 h-3 text-rose-400" />
                    <span>Promotion en cours</span>
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                  {product.title}
                </h1>
              </div>

              {/* Prix immersif avec réduction barrée */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                  {(Number(product.price) || 0).toLocaleString('fr-FR')}
                </span>
                <span className="text-lg font-bold text-emerald-400/80">FCFA</span>
                
                <span className="text-sm font-semibold text-slate-500 line-through">
                  {originalComparisonPrice.toLocaleString('fr-FR')} FCFA
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                  -25% Économie Immédiate
                </span>
              </div>

              {/* Description complète */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span>Description du produit</span>
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line">
                  {product.description || "Profitez de cette offre exceptionnelle avec garantie de conformité Dokya."}
                </p>
              </div>
            </div>

            {/* =============================================================== */}
            {/* 3A. SI PRODUIT DIGITAL : SECTION FICHIERS INCLUS / APERÇU        */}
            {/* =============================================================== */}
            {activeProductType === 'digital' && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-400" />
                      <span>Fichiers inclus & Aperçu ({digitalFilesList.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tous ces livrables vous seront remis immédiatement après confirmation.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-bold">
                    Téléchargement instantané ⚡
                  </span>
                </div>

                <div className="space-y-3">
                  {digitalFilesList.map((file) => (
                    <div 
                      key={file.id}
                      className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md group"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                              {file.name}
                            </h4>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                              {file.size}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {file.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:border-indigo-400"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Prévisualiser</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Réassurance digitale Chariow */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                    <Download className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">Téléchargement Direct</p>
                      <p className="text-[10px] text-slate-400">Sans délai d'attente</p>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                    <Layers className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">Accès à vie</p>
                      <p className="text-[10px] text-slate-400">PC, Mobile et Tablette</p>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">100% Garanti</p>
                      <p className="text-[10px] text-slate-400">Mises à jour incluses</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* 3B. SI PRODUIT PHYSIQUE : FORMULAIRE COMMANDER EN 30 SECONDES    */}
            {/* =============================================================== */}
            {activeProductType === 'physical' && (
              <div 
                ref={orderFormRef}
                className="p-6 sm:p-7 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-2xl space-y-5 relative overflow-hidden"
              >
                <div className="space-y-1.5 border-b border-slate-800 pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-emerald-400" />
                      <span>Commander en 30 secondes</span>
                    </h3>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Paiement à la livraison
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Complétez vos coordonnées ci-dessous. Aucun paiement n'est exigé en ligne : vous ne payez qu'après réception de votre colis.
                  </p>
                </div>

                <form id="physical-order-form" onSubmit={handleDirectOrderSubmit} className="space-y-4">
                  
                  {/* Sélecteur de Quantité */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-300">Quantité souhaitée :</span>
                      <p className="text-[11px] text-slate-500">{(Number(product.price) || 0).toLocaleString('fr-FR')} FCFA / unité</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-base font-black text-white w-6 text-center">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(q => q + 1)}
                        className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Nom complet */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Nom & Prénom *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text"
                        required
                        placeholder="Ex: Moussa Diop"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Téléphone / WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Numéro WhatsApp ou Téléphone *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="tel"
                        required
                        placeholder="Ex: 77 123 45 67 (ou avec indicatif +221...)"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Adresse de livraison */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Ville & Quartier de livraison *
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text"
                        required
                        placeholder="Ex: Dakar, Liberté 6, Villa n°..."
                        value={buyerAddress}
                        onChange={(e) => setBuyerAddress(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Instructions facultatives */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Instructions complémentaires (Optionnel)
                    </label>
                    <textarea 
                      rows={2}
                      placeholder="Précisions de livraison, horaires souhaités..."
                      value={buyerNotes}
                      onChange={(e) => setBuyerNotes(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {/* Alternative WhatsApp rapide */}
                  <div className="text-center pt-1">
                    <p className="text-[11px] text-slate-500 mb-2">ou commandez directement par message :</p>
                    <a
                      href={getDirectWhatsAppFastOrderUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-emerald-500/30 text-emerald-400 font-bold text-xs transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      <span>Commander sur WhatsApp en 1 clic</span>
                    </a>
                  </div>

                </form>
              </div>
            )}

            {/* Reassurance globale */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                <Truck className="w-4 h-4 text-emerald-400 mx-auto" />
                <p className="text-[11px] font-bold text-white">Livraison Express</p>
                <p className="text-[10px] text-slate-500">24h - 48h</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                <CreditCard className="w-4 h-4 text-indigo-400 mx-auto" />
                <p className="text-[11px] font-bold text-white">Paiement Garanti</p>
                <p className="text-[10px] text-slate-500">À la réception</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                <ShieldCheck className="w-4 h-4 text-teal-400 mx-auto" />
                <p className="text-[11px] font-bold text-white">Vendeur Vérifié</p>
                <p className="text-[10px] text-slate-500">Qualité Dokya</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                <MessageCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                <p className="text-[11px] font-bold text-white">Support 7j/7</p>
                <p className="text-[10px] text-slate-500">WhatsApp direct</p>
              </div>
            </div>

          </div>

          {/* ================================================================= */}
          {/* COLONNE DROITE (lg:col-span-5) : CARTE D'ACHAT FLOTTANTE STICKY   */}
          {/* ================================================================= */}
          <div className="lg:col-span-5 relative">
            <div className="sticky top-6 lg:top-24 space-y-5 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl backdrop-blur-xl p-6 sm:p-7">
              
              {/* CAS DIGITAL : CARTE D'ACHAT RAPIDE & COMPTE À REBOURS */}
              {activeProductType === 'digital' ? (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                      ⚡ Accès Numérique Instantané
                    </span>
                    <h3 className="text-xl font-black text-white pt-2 leading-tight">
                      {product.title}
                    </h3>
                  </div>

                  {/* Prix & Réduction */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-emerald-400 tracking-tight">
                        {(Number(product.price) || 0).toLocaleString('fr-FR')}
                      </span>
                      <span className="text-sm font-bold text-emerald-400">FCFA</span>
                      <span className="text-xs text-slate-500 line-through ml-2">
                        {originalComparisonPrice.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Téléchargement immédiat des {digitalFilesList.length} fichiers inclus</span>
                    </div>
                  </div>

                  {/* Compte à rebours & Barre de stock Chariow */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span>Offre limitée dans le temps</span>
                      </span>
                      <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-[11px]">
                        {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
                      </span>
                    </div>

                    {/* Barre de stock */}
                    <div className="space-y-1">
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full w-[84%]" />
                      </div>
                      <p className="text-[10px] text-slate-400 text-right">
                        84% des accès à tarif réduit déjà réservés
                      </p>
                    </div>
                  </div>

                  {/* Bouton Acheter Maintenant */}
                  <button
                    type="button"
                    onClick={handleDigitalPurchase}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-base shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5 text-white" />
                    <span>Acheter maintenant & Télécharger</span>
                  </button>

                  {/* Réassurance de commande digitale */}
                  <div className="space-y-2 pt-1 border-t border-slate-800 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Fichiers disponibles immédiatement après clic</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Lien de sauvegarde expédié sur WhatsApp / Email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Format 100% compatible Smartphone & Ordinateur</span>
                    </div>
                  </div>

                </div>
              ) : (

                /* CAS PHYSIQUE : RÉCAPITULATIF & BOUTON VALIDER COMMANDE */
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      📦 Paiement à la livraison
                    </span>
                    <h3 className="text-lg font-black text-white pt-2 leading-tight">
                      Récapitulatif de Commande
                    </h3>
                  </div>

                  {/* Aperçu produit miniature */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                      <img 
                        src={productImageSrc} 
                        alt={product.title} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white line-clamp-1">{product.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Qté : <strong className="text-white">{quantity}</strong> × {(Number(product.price) || 0).toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>

                  {/* Décompte financier complet */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Sous-total ({quantity} article{quantity > 1 ? 's' : ''}) :</span>
                      <span className="font-semibold text-slate-200">{(Number(totalPrice) || 0).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Livraison à domicile :</span>
                      <span className="font-bold text-emerald-400">Offerte (0 FCFA) ✨</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Paiement requis maintenant :</span>
                      <span className="font-semibold text-emerald-400">0 FCFA</span>
                    </div>

                    <div className="pt-2.5 flex items-center justify-between border-t border-slate-800">
                      <span className="text-sm font-bold text-white">Montant Total à régler :</span>
                      <span className="text-2xl font-black text-emerald-400 tracking-tight">
                        {(Number(totalPrice) || 0).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                    💰 <strong>Réglez en espèces ou par Wave / Orange Money</strong> directement au livreur lorsqu'il se présente chez vous.
                  </p>

                  {/* Bouton de confirmation principal */}
                  <button
                    type="button"
                    onClick={() => handleDirectOrderSubmit()}
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                        <span>Validation en cours...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-slate-950" />
                        <span>Confirmer ma commande (Payer à la livraison)</span>
                      </>
                    )}
                  </button>

                  {/* Bouton WhatsApp direct */}
                  <a
                    href={getDirectWhatsAppFastOrderUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-emerald-500/30 text-emerald-400 font-bold text-xs transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>Commander directement sur WhatsApp</span>
                  </a>

                </div>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* ===================================================================== */}
      {/* MODALE DE PRÉVISUALISATION DE FICHIER DIGITAL (Aperçu)                */}
      {/* ===================================================================== */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-indigo-500/40 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-1">{previewFile.name}</h3>
                  <p className="text-[11px] text-slate-400">{previewFile.format} • {previewFile.size}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-white p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aperçu du contenu */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Extrait du Document</span>
                <span className="text-[10px] text-slate-500">{previewFile.pagesCount} pages au total</span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                {previewFile.previewSnippet.map((line, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Le contenu complet sera débloqué immédiatement après l’achat.</span>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewFile(null);
                  handleDigitalPurchase();
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Débloquer l'accès complet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALE DE CONFIRMATION COMMANDE PHYSIQUE OU DIGITALE RÉUSSIE          */}
      {/* ===================================================================== */}
      {(orderSuccess || isDigitalUnlocked) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {isDigitalUnlocked ? 'Vos fichiers sont prêts !' : 'Commande Enregistrée avec Succès !'}
              </h3>
              <p className="text-xs text-slate-300">
                {isDigitalUnlocked ? (
                  <span>Votre accès numérique a été débloqué. Vous pouvez télécharger vos ressources immédiatement.</span>
                ) : (
                  <span>
                    Merci <strong>{orderSuccess?.buyerName}</strong>, votre commande n° <span className="font-mono text-emerald-400 font-bold">{orderSuccess?.id}</span> a été transmise directement au vendeur.
                  </span>
                )}
              </p>
            </div>

            {/* Récapitulatif ou liens de téléchargement */}
            {isDigitalUnlocked ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Vos fichiers débloqués :</span>
                {digitalFilesList.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                    <span className="font-bold text-white truncate max-w-[200px]">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => alert(`Téléchargement de ${f.name} en cours...`)}
                      className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Télécharger</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              orderSuccess && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Produit :</span>
                    <span className="font-bold text-white">{orderSuccess.productTitle}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Quantité :</span>
                    <span className="font-bold text-white">{orderSuccess.quantity}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Total à régler à la livraison :</span>
                    <span className="font-bold text-emerald-400">{(Number(orderSuccess.totalAmount) || 0).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Adresse de livraison :</span>
                    <span className="font-bold text-white truncate max-w-[200px]">{orderSuccess.buyerAddress}</span>
                  </div>
                </div>
              )
            )}

            <div className="space-y-3 pt-2">
              {orderSuccess && (
                <a
                  href={getSellerWhatsAppContactUrl(orderSuccess)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Confirmer avec le vendeur sur WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  setOrderSuccess(null);
                  setIsDigitalUnlocked(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* BARRE FIXE EN BAS SUR MOBILE (Incite à commander instantanément)      */}
      {/* ===================================================================== */}
      {!orderSuccess && !isDigitalUnlocked && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 p-3 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 shrink-0">
              <img 
                src={productImageSrc} 
                alt={product.title} 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{product.title}</p>
              <p className="text-sm font-black text-emerald-400">
                {(Number(product.price) || 0).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeProductType === 'digital') {
                handleDigitalPurchase();
              } else {
                scrollToOrderForm();
              }
            }}
            className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-lg shrink-0 active:scale-95 transition-transform ${
              activeProductType === 'digital'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-500/25'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 shadow-emerald-500/25'
            }`}
          >
            {activeProductType === 'digital' ? 'Télécharger ⚡' : 'Commander ⚡'}
          </button>
        </div>
      )}

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-800/80 py-6 px-4 bg-slate-950 text-center text-xs text-slate-500">
        <p>Boutique propulsée par <strong>Dokya</strong> • Style immersif hybride physique & digital</p>
      </footer>

    </div>
  );
};
