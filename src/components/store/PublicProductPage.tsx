import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { ProductItem, StoreOrder } from '../../types';
import { fetchProductBySlug, createStoreOrder } from '../../lib/storeService';

interface PublicProductPageProps {
  slug: string;
  onBackToApp?: () => void;
  onOpenStore?: (username: string) => void;
}

export const PublicProductPage: React.FC<PublicProductPageProps> = ({
  slug,
  onBackToApp,
  onOpenStore
}) => {
  const [product, setProduct] = useState<ProductItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Direct Order Form State
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerNotes, setBuyerNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<StoreOrder | null>(null);

  // Link copy feedback
  const [copied, setCopied] = useState(false);
  const orderFormRef = useRef<HTMLDivElement | null>(null);

  const scrollToOrderForm = () => {
    orderFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!buyerName.trim() || !buyerPhone.trim() || !buyerAddress.trim()) {
      alert("Veuillez renseigner votre nom, votre numéro WhatsApp/téléphone et votre adresse.");
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await createStoreOrder({
        productId: product.id,
        productSlug: product.slug,
        productTitle: product.title,
        productPrice: product.price,
        productImage: product.images?.[0],
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

  // WhatsApp link for buyer to contact seller after order
  const getSellerWhatsAppContactUrl = (order: StoreOrder) => {
    const rawSellerPhone = (product?.sellerWhatsapp || product?.sellerPhone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawSellerPhone.length === 9 ? `221${rawSellerPhone}` : rawSellerPhone;
    const msg = encodeURIComponent(
      `Bonjour ${product?.sellerName || 'Vendeur'}, je viens de passer la commande n° ${order.id} sur votre boutique Dokya !\n\n` +
      `📦 Produit : ${order.productTitle}\n` +
      `🔢 Quantité : ${order.quantity}\n` +
      `💰 Total : ${(Number(order.totalAmount) || 0).toLocaleString('fr-FR')} FCFA (Paiement à la livraison)\n` +
      `👤 Mon nom : ${order.buyerName}\n` +
      `📍 Adresse de livraison : ${order.buyerAddress}\n\n` +
      `Merci de me confirmer la prise en charge de ma commande.`
    );
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${msg}`;
    }
    return `https://wa.me/?text=${msg}`;
  };

  // Direct fast WhatsApp order link (pre-order instant chat)
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
        <div className="w-12 h-12 rounded-2xl border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <p className="text-slate-400 text-xs font-semibold mt-4">Chargement du produit...</p>
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
  const originalComparisonPrice = Math.round((Number(product.price) || 0) * 1.25 / 500) * 500;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white pb-20 md:pb-0">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          
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
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-xs shadow-md shadow-indigo-600/20">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white line-clamp-1">{product.sellerName}</p>
                <p className="text-[10px] text-slate-400 font-mono">dokya.site/b/{product.sellerUsername}</p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Lien copié' : 'Partager'}</span>
            </button>

            {onOpenStore && (
              <button
                type="button"
                onClick={() => onOpenStore(product.sellerUsername)}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>Visiter la boutique</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* ================================================================= */}
          {/* LEFT COLUMN: Clean Borderless Product Image & Trust Badges        */}
          {/* ================================================================= */}
          <div className="md:col-span-6 space-y-5">
            
            {/* Image Hero : Pleine présence, sans encadrement ni double bordure */}
            <div className="relative aspect-[4/3] sm:aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden bg-slate-950 shadow-2xl shadow-indigo-600/15 group">
              <img 
                src={product.images?.[0] || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80'} 
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              
              {/* Gradient subtil en base pour lisibilité des badges */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 pointer-events-none" />

              {/* Badges Flottants Glassmorphism */}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-white border border-white/20 text-xs font-bold shadow-lg">
                  {product.category || 'Service & Produit'}
                </span>
              </div>

              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-amber-300 border border-white/20 text-xs font-black shadow-lg">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>4.9/5</span>
                <span className="text-slate-400 font-normal text-[10px]">(18 avis)</span>
              </div>

              <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-slate-950 text-xs font-black shadow-lg">
                <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                <span>En stock • Prêt à expédier</span>
              </div>

              <div className="absolute bottom-4 right-4 hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-slate-300 border border-white/15 text-[11px] font-semibold">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>14 commandes cette semaine</span>
              </div>
            </div>

            {/* Reassurance Guarantees (Convertit les visiteurs indécis) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Paiement à la livraison</p>
                  <p className="text-[10px] text-slate-400">Réglez après réception</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Livraison Express</p>
                  <p className="text-[10px] text-slate-400">Prise en charge rapide</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Assistance WhatsApp</p>
                  <p className="text-[10px] text-slate-400">Échange direct 7j/7</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Vendeur Vérifié</p>
                  <p className="text-[10px] text-slate-400">Garantie conformité Dokya</p>
                </div>
              </div>
            </div>

          </div>

          {/* ================================================================= */}
          {/* RIGHT COLUMN: Product Info & High-Converting Order Form           */}
          {/* ================================================================= */}
          <div className="md:col-span-6 space-y-6">
            
            {/* Title, Social Proof & Pricing */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Offre Exclusive Dokya</span>
                </span>
                
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/25 text-[11px] font-bold">
                  <Flame className="w-3 h-3 text-rose-400" />
                  <span>Vente Flash</span>
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                {product.title}
              </h1>

              {/* Bloc de prix irrésistible avec réduction affichée */}
              <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                    {(Number(product.price) || 0).toLocaleString('fr-FR')}
                  </span>
                  <span className="text-lg font-bold text-emerald-400/80">FCFA</span>
                  
                  {/* Prix barré pour créer l'aubaine */}
                  <span className="text-sm font-semibold text-slate-500 line-through">
                    {originalComparisonPrice.toLocaleString('fr-FR')} FCFA
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                    -20% Réduction Immédiate
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Paiement sécurisé à la réception • Aucun paiement en ligne requis</span>
                </div>
              </div>
            </div>

            {/* Description détaillée */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span>Description du produit / service</span>
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {product.description || "Profitez de cette offre exceptionnelle en commandant directement ci-dessous."}
              </p>
            </div>

            {/* ACTION SECTION : FORMULAIRE COMMANDE DIRECTE OU REDIRECTION */}
            {product.saleType === 'redirect' ? (
              
              /* OPTION A: BOUTON DE REDIRECTION EXTERNE */
              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-2xl space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">Accéder à ce produit / service</h4>
                  <p className="text-xs text-slate-400">
                    Ce produit est disponible directement auprès du vendeur. Cliquez ci-dessous pour être redirigé immédiatement.
                  </p>
                </div>

                <a
                  href={product.redirectUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 text-slate-950" />
                  <span>Accéder à la commande</span>
                  <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
                </a>
              </div>

            ) : (

              /* OPTION B: FORMULAIRE DE COMMANDE DIRECTE DOKYA */
              <div 
                ref={orderFormRef}
                className="p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/40 shadow-2xl space-y-5 relative overflow-hidden"
              >
                {/* Glow décoratif en arrière-plan */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="space-y-1.5 border-b border-slate-800 pb-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-indigo-400" />
                      <span>Commander en 30 secondes</span>
                    </h4>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Paiement à la livraison
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Renseignez vos coordonnées. Le vendeur vous contactera immédiatement par WhatsApp pour convenir de la livraison.
                  </p>
                </div>

                <form onSubmit={handleDirectOrderSubmit} className="space-y-4 relative z-10">
                  
                  {/* Sélecteur de Quantité */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-300">Quantité désirée :</span>
                      <p className="text-[11px] text-slate-500">{(Number(product.price) || 0).toLocaleString('fr-FR')} FCFA / unité</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-base font-black text-white w-6 text-center">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(q => q + 1)}
                        className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Nom complet */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Votre Nom & Prénom *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text"
                        required
                        placeholder="Ex: Moussa Diop"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
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
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
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
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
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
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  {/* Récapitulatif Total & Remise */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Sous-total ({quantity} article{quantity > 1 ? 's' : ''}) :</span>
                      <span>{(Number(totalPrice) || 0).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-emerald-400">
                      <span>Paiement requis à la commande :</span>
                      <span className="font-bold">0 FCFA (Paiement à la livraison)</span>
                    </div>
                    <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                      <span className="text-sm font-bold text-white">Montant Total à régler :</span>
                      <span className="text-2xl font-black text-emerald-400 tracking-tight">
                        {(Number(totalPrice) || 0).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  </div>

                  {/* Bouton de confirmation principal */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                        <span>Enregistrement de votre commande...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-slate-950" />
                        <span>Confirmer ma Commande (Payer à la livraison)</span>
                      </>
                    )}
                  </button>

                  {/* Option Alternative Rapide : WhatsApp Direct */}
                  <div className="text-center pt-1">
                    <p className="text-[11px] text-slate-500 mb-2">ou commandez encore plus vite par message :</p>
                    <a
                      href={getDirectWhatsAppFastOrderUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-950 hover:bg-slate-900 border border-emerald-500/30 text-emerald-400 font-bold text-xs transition-all hover:scale-[1.01] cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      <span>Commander directement sur WhatsApp</span>
                    </a>
                  </div>

                </form>
              </div>

            )}

          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-800/80 py-6 px-4 bg-slate-950 text-center text-xs text-slate-500">
        <p>Boutique propulsée par <strong>Dokya</strong> • Plateforme de CV ATS & E-commerce UEMOA</p>
      </footer>

      {/* STICKY BOTTOM BAR SUR MOBILE (Incite l'acheteur à l'action en permanence) */}
      {product.saleType === 'direct_order' && !orderSuccess && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 p-3 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-900 shrink-0">
              <img 
                src={product.images?.[0] || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80'} 
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
            onClick={scrollToOrderForm}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 shrink-0 active:scale-95 transition-transform"
          >
            Commander ⚡
          </button>
        </div>
      )}

      {/* SUCCESS CONFIRMATION MODAL */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-white">Commande Enregistrée avec Succès !</h3>
              <p className="text-xs text-slate-300">
                Merci <strong>{orderSuccess.buyerName}</strong>, votre commande n° <span className="font-mono text-indigo-400 font-bold">{orderSuccess.id}</span> a été transmise directement au vendeur.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
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

            <div className="space-y-3 pt-2">
              <a
                href={getSellerWhatsAppContactUrl(orderSuccess)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Confirmer directement sur WhatsApp avec le vendeur</span>
              </a>

              <button
                type="button"
                onClick={() => setOrderSuccess(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
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
