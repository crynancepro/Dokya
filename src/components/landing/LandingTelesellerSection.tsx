import React, { useState } from 'react';
import { 
  Briefcase, 
  TrendingUp, 
  CheckCircle2, 
  Crown, 
  Coins, 
  Smartphone, 
  Share2, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  Zap,
  Award
} from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';

interface LandingTelesellerSectionProps {
  onGoToTelemarketer?: () => void;
  onGoToAuth: (mode?: 'login' | 'signup') => void;
}

export const LandingTelesellerSection: React.FC<LandingTelesellerSectionProps> = ({
  onGoToTelemarketer,
  onGoToAuth,
}) => {
  const { formatPrice, userCurrency } = useLocale();

  // Simulateur de gains télévendeurs
  const [salesPerWeek, setSalesPerWeek] = useState<number>(10);
  const [avgProductPrice, setAvgProductPrice] = useState<number>(25000);
  const [isVipMode, setIsVipMode] = useState<boolean>(true);

  // Commission : en VIP, le télévendeur touche 100% de la commission allouée (par défaut 20% du prix du produit ou commission vendeur fixée).
  // En standard : 20% de frais de plateforme retenus sur la commission (donc 80% perçus).
  // Exemple de calcul transparent :
  // Commission vendeur moyenne : 20% du prix du produit = avgProductPrice * 0.20
  // Si VIP (0% retenue plateforme) : gain par vente = avgProductPrice * 0.20
  // Si Standard (20% retenue plateforme) : gain par vente = avgProductPrice * 0.20 * 0.80 = 16% du prix
  const baseCommissionPerSale = avgProductPrice * 0.20;
  const netCommissionPerSale = isVipMode ? baseCommissionPerSale : baseCommissionPerSale * 0.80;
  const weeklyEstimatedEarnings = salesPerWeek * netCommissionPerSale;
  const monthlyEstimatedEarnings = weeklyEstimatedEarnings * 4;

  return (
    <section id="televendeurs" className="py-16 sm:py-24 border-b border-slate-800/70 relative overflow-hidden bg-slate-900/40">
      
      {/* Halo volumétrique néon vert émeraude */}
      <div className="absolute top-1/3 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-600/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-1/4 w-[450px] h-[450px] bg-indigo-600/10 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        
        {/* En-tête */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-wider shadow-xs">
            <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
            <span>Réseau Télévendeurs Indépendants • Gagnez depuis Votre Mobile</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Monétisez Votre Réseau &amp; Vos Contacts <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300">
              avec des commissions versées immédiatement
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Rejoignez des centaines de télévendeurs indépendants. Choisissez des produits vérifiés dans le Dokya Store, partagez vos liens trackés et touchez jusqu'à 100% de vos commissions sans plafond de gain.
          </p>
        </div>

        {/* 3 Étapes Faciles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 hover:border-emerald-500/50 transition-all shadow-lg group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 font-black text-lg flex items-center justify-center">
              1
            </div>
            <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
              Sélectionnez vos Produits
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Accédez au catalogue complet de produits et services mis en vente par les boutiques Dokya Store vérifiées.
            </p>
            <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 pt-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Plus de 500 produits certifiés</span>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 hover:border-cyan-500/50 transition-all shadow-lg group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 font-black text-lg flex items-center justify-center">
              2
            </div>
            <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
              Partagez votre Lien Tracké
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Diffusez votre lien unique sur WhatsApp, Telegram, TikTok, Instagram ou Facebook. Chaque clic est automatiquement tracé.
            </p>
            <div className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5 pt-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Attribution 100% garantie</span>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 hover:border-amber-500/50 transition-all shadow-lg group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 font-black text-lg flex items-center justify-center">
              3
            </div>
            <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
              Encaissez par Mobile Money
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dès validation de la commande, votre commission est créditée sur votre portefeuille et retirable instantanément par Wave ou Orange Money.
            </p>
            <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 pt-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Retrait Wave &amp; OM dès 2 000 FCFA</span>
            </div>
          </div>
        </div>

        {/* Simulateur Interactif de Gains Télévendeur */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/40 shadow-2xl space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Simulateur de Revenus Mensuels Télévendeur
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Ajustez votre volume de vente hebdomadaire et votre mode de commission pour estimer vos gains.
              </p>
            </div>

            {/* Toggle Mode Standard (20% plateforme) vs VIP (100% net pour vous) */}
            <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsVipMode(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !isVipMode ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Standard (Gratuit)
              </button>
              <button
                type="button"
                onClick={() => setIsVipMode(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                  isVipMode ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Mode VIP (100% Commission)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Sliders de simulation */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Slider 1 : Ventes par semaine */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Nombre de ventes générées par semaine :</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">{salesPerWeek} ventes / sem.</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="50"
                  step="1"
                  value={salesPerWeek}
                  onChange={(e) => setSalesPerWeek(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>2 ventes</span>
                  <span>15 ventes</span>
                  <span>30 ventes</span>
                  <span>50 ventes</span>
                </div>
              </div>

              {/* Slider 2 : Prix moyen d'un article */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Prix moyen d'un article vendu :</span>
                  <span className="font-mono font-black text-cyan-400 text-sm">{formatPrice(avgProductPrice)}</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="100000"
                  step="5000"
                  value={avgProductPrice}
                  onChange={(e) => setAvgProductPrice(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>{formatPrice(5000)}</span>
                  <span>{formatPrice(50000)}</span>
                  <span>{formatPrice(100000)}</span>
                </div>
              </div>

              {/* Explication du Mode */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">
                    {isVipMode ? 'Avantage VIP Dokya :' : 'Formule Standard Gratuite :'}
                  </span>{' '}
                  {isVipMode ? (
                    <span>
                      En Mode VIP, 0% de frais de plateforme sont déduits. Vous touchez <strong>100% de la commission</strong> allouée par le vendeur (soit <strong>{formatPrice(baseCommissionPerSale)}</strong> par vente).
                    </span>
                  ) : (
                    <span>
                      L'accès est 100% gratuit. Une commission standard de 20% est partagée avec la plateforme (gain net de <strong>{formatPrice(netCommissionPerSale)}</strong> par vente).
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Carte des Résultats Estimés */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-2xl bg-gradient-to-b from-emerald-950/70 via-slate-900 to-slate-950 border-2 border-emerald-500/50 space-y-5 text-center shadow-xl">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Estimation de Vos Revenus Mensuels
                </div>
                
                <div className="space-y-1">
                  <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-400 tracking-tight">
                    {formatPrice(monthlyEstimatedEarnings)}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    soit environ {formatPrice(weeklyEstimatedEarnings)} par semaine
                  </div>
                </div>

                <div className="pt-2 pb-1 border-t border-slate-800 text-xs text-slate-300 space-y-1.5 text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total ventes / mois :</span>
                    <span className="font-mono font-bold text-white">{salesPerWeek * 4} commandes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gain moyen par vente :</span>
                    <span className="font-mono font-bold text-emerald-400">+{formatPrice(netCommissionPerSale)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mode de retrait :</span>
                    <span className="font-bold text-white">Wave / Orange Money</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onGoToTelemarketer ? onGoToTelemarketer : () => onGoToAuth('signup')}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-95 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
                >
                  <Briefcase className="w-4 h-4 text-slate-950" />
                  <span>Rejoindre l'Espace Télévendeurs</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
