import React, { useState, useEffect } from 'react';
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
  Minus
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
      `💰 Total : ${(Number(order.totalAmount) || 0).toLocaleString('fr-FR')} FCFA\n` +
      `👤 Mon nom : ${order.buyerName}\n` +
      `📍 Adresse de livraison : ${order.buyerAddress}\n\n` +
      `Merci de me confirmer la prise en charge de ma commande.`
    );
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${msg}`;
    }
    return `https://wa.me/?text=${msg}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          
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
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Lien copié' : 'Partager'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area: Mobile-First Layout */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* LEFT COLUMN: Product Image & Badges */}
          <div className="space-y-4">
            <div className="relative aspect-square sm:aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
              <img 
                src={product.images?.[0] || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80'} 
                alt={product.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/10 text-xs font-semibold">
                {product.category || 'Service & Formation'}
              </div>
            </div>

            {/* Reassurance Guarantees */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Vendeur certifié & vérifié sur Dokya</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Assistance & suivi direct via WhatsApp</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Traitement et livraison rapides</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Product Info & Order Action */}
          <div className="space-y-6">
            
            {/* Title & Pricing */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-bold">
                <Sparkles className="w-3 h-3" />
                <span>Fiche Produit Officielle</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                {product.title}
              </h1>

              <div className="pt-2">
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                  {(Number(product.price) || 0).toLocaleString('fr-FR')}
                </span>
                <span className="text-base font-bold text-emerald-400/80 ml-1.5">FCFA</span>
              </div>
            </div>

            {/* Description */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                À propos de ce produit / service
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {product.description || "Aucune description détaillée n'a été spécifiée."}
              </p>
            </div>

            {/* ACTION SECTION */}
            {product.saleType === 'redirect' ? (
              
              /* OPTION A: REDIRECTION BUTTON */
              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-2xl space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">Commander ou En Savoir Plus</h4>
                  <p className="text-xs text-slate-400">
                    Ce produit est disponible via le canal direct du vendeur. Cliquez ci-dessous pour y accéder immédiatement.
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

              /* OPTION B: DIRECT ORDER ON DOKYA */
              <div className="p-6 rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-2xl space-y-5">
                <div className="space-y-1 border-b border-slate-800 pb-3">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-indigo-400" />
                    <span>Commander Directement sur Dokya</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Remplissez vos coordonnées. Le vendeur vous contactera immédiatement pour la validation et livraison.
                  </p>
                </div>

                <form onSubmit={handleDirectOrderSubmit} className="space-y-4">
                  
                  {/* Quantity Selector */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-xs font-bold text-slate-300">Quantité :</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-black text-white w-6 text-center">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(q => q + 1)}
                        className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Buyer Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Nom complet *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text"
                        required
                        placeholder="Ex: Moussa Diop"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Buyer Phone / WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Téléphone / WhatsApp *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="tel"
                        required
                        placeholder="Ex: 77 123 45 67 (ou avec indicatif +221...)"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Buyer Delivery Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Ville & Adresse de livraison *
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text"
                        required
                        placeholder="Ex: Dakar, Liberté 6, Villa n°..."
                        value={buyerAddress}
                        onChange={(e) => setBuyerAddress(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Notes / Special Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Instructions complémentaires (Optionnel)
                    </label>
                    <textarea 
                      rows={2}
                      placeholder="Précisions de livraison, date souhaitée, format..."
                      value={buyerNotes}
                      onChange={(e) => setBuyerNotes(e.target.value)}
                      className="w-full px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Total calculation */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                    <span className="text-sm font-bold text-slate-400">Total à payer :</span>
                    <span className="text-xl font-black text-emerald-400">
                      {(Number(totalPrice) || 0).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black text-base shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Traitement de la commande...' : 'Confirmer ma Commande'}
                  </button>
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

      {/* SUCCESS CONFIRMATION MODAL */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Commande N° {orderSuccess.id}
              </span>
              <h3 className="text-2xl font-black text-white pt-2">Commande Enregistrée !</h3>
              <p className="text-xs text-slate-300">
                Merci {orderSuccess.buyerName}, votre commande pour <strong>{orderSuccess.productTitle}</strong> a bien été transmise à {product.sellerName}.
              </p>
            </div>

            {/* Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Quantité :</span>
                <span className="font-bold text-white">{orderSuccess.quantity}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Montant total :</span>
                <span className="font-black text-emerald-400">{(Number(orderSuccess.totalAmount) || 0).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Livraison à :</span>
                <span className="font-semibold text-white">{orderSuccess.buyerAddress}</span>
              </div>
            </div>

            {/* Direct WhatsApp button with prefilled message */}
            <div className="space-y-3 pt-2">
              <a
                href={getSellerWhatsAppContactUrl(orderSuccess)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Contacter le Vendeur sur WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setOrderSuccess(null);
                  if (onOpenStore) onOpenStore(product.sellerUsername);
                }}
                className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Voir d'autres produits de la boutique
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
