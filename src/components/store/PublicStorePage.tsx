import React, { useState, useEffect, useMemo } from 'react';
import { 
  Store, 
  ShoppingBag, 
  ArrowLeft, 
  Search, 
  MapPin, 
  MessageCircle, 
  ExternalLink, 
  ShieldCheck, 
  Share2, 
  Check, 
  Sparkles,
  Phone,
  Mail,
  ChevronRight,
  Filter
} from 'lucide-react';
import { SellerStoreProfile, ProductItem } from '../../types';
import { fetchSellerStore } from '../../lib/storeService';

interface PublicStorePageProps {
  username: string;
  onOpenProduct: (slug: string) => void;
  onBackToApp?: () => void;
}

export const PublicStorePage: React.FC<PublicStorePageProps> = ({
  username,
  onOpenProduct,
  onBackToApp
}) => {
  const [storeProfile, setStoreProfile] = useState<SellerStoreProfile | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const { profile, products: prods } = await fetchSellerStore(username);
        if (isMounted) {
          setStoreProfile(profile);
          setProducts(prods);
        }
      } catch (err) {
        console.error('[PublicStorePage] Erreur:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [username]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Categories list derived from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = searchQuery === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const storeName = storeProfile?.storeName || `Boutique de ${username}`;
  const rawWhatsapp = (storeProfile?.whatsappNumber || storeProfile?.phone || '').replace(/[^0-9]/g, '');
  const cleanWhatsapp = rawWhatsapp.length === 9 ? `221${rawWhatsapp}` : rawWhatsapp;
  const whatsappUrl = cleanWhatsapp 
    ? `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`Bonjour ${storeName}, je vous contacte depuis votre boutique Dokya.`)}`
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
        <p className="text-slate-400 text-xs font-semibold mt-4">Chargement de la vitrine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 py-3">
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

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 font-bold text-xs">
                <Store className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-300">Vitrine Dokya</span>
            </div>
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

      {/* STORE HERO BANNER & PROFILE INFO */}
      <div className="bg-gradient-to-b from-slate-900 via-indigo-950/30 to-slate-950 border-b border-slate-800/80 px-4 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center text-2xl font-black shadow-xl shadow-indigo-600/30 shrink-0 border-2 border-indigo-400/40">
                {storeName.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                    {storeName}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Vendeur Vérifié</span>
                  </span>
                </div>

                {storeProfile?.tagline && (
                  <p className="text-sm font-medium text-indigo-300">
                    {storeProfile.tagline}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{storeProfile?.city || 'Dakar'}, {storeProfile?.country || 'Sénégal'}</span>
                  </span>
                  <span>•</span>
                  <span>{products.length} produit{products.length > 1 ? 's' : ''} en ligne</span>
                </div>

                {storeProfile?.description && (
                  <p className="text-xs text-slate-300 max-w-2xl pt-2 leading-relaxed">
                    {storeProfile.description}
                  </p>
                )}
              </div>
            </div>

            {/* Direct WhatsApp Contact Button */}
            {whatsappUrl && (
              <div className="sm:self-center">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contacter sur WhatsApp</span>
                </a>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* PRODUCTS SECTION */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text"
              placeholder="Rechercher dans cette boutique..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Tous
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 px-4 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">Aucun produit disponible</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Ce vendeur n'a pas encore publié de produit actif correspondant à votre recherche.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map(prod => (
              <div 
                key={prod.id}
                onClick={() => onOpenProduct(prod.slug)}
                className="group relative bg-slate-900/90 hover:bg-slate-900/95 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-4 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/20 flex flex-col justify-between cursor-pointer transform transition-all duration-300 ease-out hover:scale-[1.03] hover:-translate-y-1.5 will-change-transform"
              >
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                    <img 
                      src={prod.images?.[0] || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80'} 
                      alt={prod.title}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-slate-300 border border-white/10 text-[10px] font-semibold">
                      {prod.category || 'Service'}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-indigo-400 transition-colors duration-200">
                      {prod.title}
                    </h3>
                    <p className="text-lg font-black text-emerald-400 mt-0.5">
                      {(Number(prod.price) || 0).toLocaleString('fr-FR')} <span className="text-xs font-semibold">FCFA</span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {prod.description || 'Cliquez pour voir les détails de ce produit.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  <span>{prod.saleType === 'direct_order' ? 'Commander sur Dokya' : 'Voir le lien direct'}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300 ease-out" />
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-800/80 py-6 px-4 bg-slate-950 text-center text-xs text-slate-500">
        <p>Boutique propulsée par <strong>Dokya</strong> • Plateforme de CV ATS & E-commerce UEMOA</p>
      </footer>

    </div>
  );
};
