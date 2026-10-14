import React, { useState } from 'react';
import { 
  Store, 
  ShoppingBag, 
  Share2, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  Percent, 
  Smartphone, 
  QrCode,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';

interface LandingStoreShowcaseProps {
  onGoToStore?: () => void;
  onGoToAuth: (mode?: 'login' | 'signup') => void;
}

export const LandingStoreShowcase: React.FC<LandingStoreShowcaseProps> = ({
  onGoToStore,
  onGoToAuth,
}) => {
  const { formatPrice, userCurrency } = useLocale();

  // Démo interactive de boutique vendeur
  const [selectedDemoProduct, setSelectedDemoProduct] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const DEMO_STORE = {
    sellerName: 'Fatou Kébé Creations',
    username: 'fatou-creations',
    bio: 'Artisanat d’art, maroquinerie haut de gamme en cuir de Thiès & accessoires sur-mesure.',
    city: 'Dakar, Sénégal',
    rating: 4.9,
    salesCount: 342,
    products: [
      {
        id: 'p1',
        title: 'Sac Cabas Cuir Végétal Dakar Élite',
        price: 35000,
        originalPrice: 42000,
        category: 'Maroquinerie',
        inStock: true,
        commissionTelemarketer: 7000,
        description: 'Cuir pleine fleur tanné naturellement, finitions faites main, intérieur velours avec poches zippées.',
        badge: 'Top Vente',
      },
      {
        id: 'p2',
        title: 'Portefeuille Minimaliste Slim RFID',
        price: 15000,
        originalPrice: 18000,
        category: 'Accessoires',
        inStock: true,
        commissionTelemarketer: 3000,
        description: 'Protection anti-fraude RFID intégrée, capacité 8 cartes + billets pliés, cuir véritable texturé.',
        badge: 'Nouveau',
      },
      {
        id: 'p3',
        title: 'Ceinture Traditionnelle Tressée Bicolore',
        price: 18500,
        originalPrice: 22000,
        category: 'Mode & Style',
        inStock: true,
        commissionTelemarketer: 3700,
        description: 'Boucle en laiton massif vieilli, double couture renforcée, ajustable à toutes les morphologies.',
        badge: 'Coup de Cœur',
      },
    ],
  };

  const currentProduct = DEMO_STORE.products[selectedDemoProduct];

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(`https://dokya.site/b/${DEMO_STORE.username}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <section id="boutique-store" className="py-16 sm:py-24 border-b border-slate-800/70 relative overflow-hidden">
      {/* Halo lumineux d'ambiance */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-br from-amber-500/10 via-cyan-500/10 to-indigo-500/10 blur-[130px] pointer-events-none rounded-full" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        
        {/* En-tête de section */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider shadow-xs">
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span>Dokya Store • E-Commerce Clé en Main</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Votre Boutique Vendeur Pro en Ligne <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-amber-200">
              créée en 2 minutes sans coder
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Vendez vos produits et services avec votre lien exclusif <code className="text-amber-300 font-mono text-[11px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">dokya.site/b/votre-nom</code>, partagez des fiches produits optimisées sur WhatsApp et mobilisez notre réseau de télévendeurs.
          </p>
        </div>

        {/* Vitrine Interactive Double : Contrôles & Mockup Storefront */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Colonne Gauche (5 cols) : Les 4 Avantages Clés */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Lien Public Personnalisé</span>
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Actif &amp; Référencé SEO
                </span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono">
                <Store className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">https://dokya.site/b/{DEMO_STORE.username}</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="ml-auto px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-sans font-bold text-[10px] transition-colors shrink-0"
                >
                  {copiedLink ? 'Copié !' : 'Copier'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Partage WhatsApp Instantané (Cartes HD)</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Vos liens génèrent automatiquement des aperçus riches avec photo HD, titre, prix et bouton d'action sur WhatsApp, Facebook et Telegram.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Réseau Télévendeurs Dokya Intégré</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Définissez une commission pour les télévendeurs indépendants qui feront la promotion active de votre catalogue auprès de leurs audiences.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Facturation OHADA Automatique</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Chaque commande validée génère directement une facture légale OHADA avec suivi des règlements Mobile Money (Wave, Orange Money).
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onGoToAuth('signup')}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:opacity-95 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/20 transition-all hover:scale-101 cursor-pointer"
              >
                <Store className="w-4 h-4 text-slate-950" />
                <span>Ouvrir ma Boutique Dokya Store</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Colonne Droite (7 cols) : Aperçu Réel du Storefront */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-slate-900 border-2 border-slate-800 shadow-2xl overflow-hidden">
              
              {/* Browser Bar */}
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="text-[11px] text-slate-500 ml-2 font-mono">dokya.site/b/{DEMO_STORE.username}</span>
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-full">
                  Vitrine En Ligne
                </span>
              </div>

              {/* Contenu de la vitrine */}
              <div className="p-6 sm:p-8 space-y-6 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
                
                {/* Header Boutique */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                      FK
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base sm:text-lg font-black text-white">{DEMO_STORE.sellerName}</h4>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                          Vendeur Vérifié
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{DEMO_STORE.bio}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                        <span>⭐ {DEMO_STORE.rating} (128 avis)</span>
                        <span>•</span>
                        <span>{DEMO_STORE.salesCount} ventes</span>
                        <span>•</span>
                        <span>{DEMO_STORE.city}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sélecteur de Produits Démo */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Catalogue des Produits Disponibles</span>
                    <span className="text-[11px] text-amber-400 font-bold">Sélectionnez un article pour voir l'impact</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {DEMO_STORE.products.map((prod, idx) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => setSelectedDemoProduct(idx)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          selectedDemoProduct === idx
                            ? 'bg-amber-950/40 border-amber-400/80 ring-2 ring-amber-400/20'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-[10px] font-bold text-slate-400 truncate">{prod.category}</div>
                        <div className="text-xs font-black text-white truncate mt-0.5">{prod.title}</div>
                        <div className="text-xs font-mono font-bold text-amber-400 mt-1">{formatPrice(prod.price)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fiche Produit Détaillée Zoomée */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                          {currentProduct.badge}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold">En Stock (Livraison 24h)</span>
                      </div>
                      <h4 className="text-base font-black text-white mt-1">{currentProduct.title}</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{currentProduct.description}</p>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <div className="text-xs text-slate-500 line-through">{formatPrice(currentProduct.originalPrice)}</div>
                      <div className="text-2xl font-black font-mono text-emerald-400">{formatPrice(currentProduct.price)}</div>
                    </div>
                  </div>

                  {/* Bandeau d'affiliation télévendeur */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-bold text-white">Commission Télévendeur : </span>
                        <span className="font-mono font-black text-emerald-300">+{formatPrice(currentProduct.commissionTelemarketer)} / vente</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      Versement Wave instantané
                    </span>
                  </div>

                  {/* Boutons d'Action Public Client */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onGoToAuth('signup')}
                      className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/30"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Commander via WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onGoToAuth('signup')}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-cyan-400" />
                      <span>Partager la fiche produit</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
