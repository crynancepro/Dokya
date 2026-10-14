import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Star,
  CheckCircle2,
  Trash2,
  Search,
  Filter,
  Shield,
  Clock,
  User,
  Store,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Tag,
  ExternalLink
} from 'lucide-react';
import { SellerReview } from '../../types';
import { 
  fetchSellerReviews, 
  adminApproveSellerReview, 
  adminDeleteSellerReview 
} from '../../lib/storeService';

interface AdminReviewsModerationViewProps {
  adminEmail?: string;
}

export const AdminReviewsModerationView: React.FC<AdminReviewsModerationViewProps> = ({
  adminEmail = 'admin@dokya.site'
}) => {
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4' | 'low'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');

  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4000);
  };

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSellerReviews();
      setReviews(data);
    } catch (err: any) {
      console.error('Erreur chargement avis vendeurs:', err);
      showError('Impossible de charger les avis vendeurs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      const search = searchTerm.toLowerCase().trim();
      const matchSearch = !search ||
        (r.telemarketerName || '').toLowerCase().includes(search) ||
        (r.sellerName || '').toLowerCase().includes(search) ||
        (r.sellerUsername || '').toLowerCase().includes(search) ||
        (r.comment || '').toLowerCase().includes(search);

      const matchRating = ratingFilter === 'all' ||
        (ratingFilter === '5' ? r.rating === 5 :
         ratingFilter === '4' ? r.rating === 4 :
         r.rating <= 3);

      const isApproved = r.status === 'approved';
      const matchStatus = statusFilter === 'all' || (statusFilter === 'approved' ? isApproved : !isApproved);

      return matchSearch && matchRating && matchStatus;
    });
  }, [reviews, searchTerm, ratingFilter, statusFilter]);

  // KPIs
  const kpiTotal = reviews.length;
  const kpiApproved = reviews.filter(r => r.status === 'approved').length;
  const kpiPending = reviews.filter(r => r.status !== 'approved').length;
  const kpiAverageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  // Approve action
  const handleApprove = async (reviewId: string) => {
    setIsProcessingId(reviewId);
    try {
      await adminApproveSellerReview(reviewId, adminEmail);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: 'approved', moderatedAt: new Date().toISOString() } : r));
      showSuccess("Avis approuvé avec succès ! Il est maintenant public.");
    } catch (err: any) {
      showError(err?.message || "Erreur lors de l'approbation de l'avis.");
    } finally {
      setIsProcessingId(null);
    }
  };

  // Delete action
  const handleDelete = async (reviewId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cet avis ? Cette action est irréversible.")) {
      return;
    }

    setIsProcessingId(reviewId);
    try {
      await adminDeleteSellerReview(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      showSuccess("Avis supprimé définitivement du profil vendeur.");
    } catch (err: any) {
      showError(err?.message || "Erreur lors de la suppression de l'avis.");
    } finally {
      setIsProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Messages */}
      {successToast && (
        <div className="fixed top-5 right-5 z-[200] max-w-md p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold">{successToast}</p>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-5 right-5 z-[200] max-w-md p-4 rounded-2xl bg-rose-600 text-white shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <XCircle className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold">{errorToast}</p>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Modération des Avis Télévendeurs sur les Vendeurs</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                  {kpiTotal} Avis
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Surveillance de la réputation : Validation des évaluations positives et suppression des abus ou diffamations.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadReviews}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Avis Reçus</span>
            <MessageSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-white">{kpiTotal}</div>
          <p className="text-[10px] text-slate-500">Par les télévendeurs</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Avis Approuvés</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">{kpiApproved}</div>
          <p className="text-[10px] text-emerald-400/70">Publics sur les boutiques</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>En Attente de Vérification</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400">{kpiPending}</div>
          <p className="text-[10px] text-amber-400/70">À modérer</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Note Moyenne Plateforme</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 flex items-center gap-1">
            <span>{kpiAverageRating}</span>
            <span className="text-xs text-slate-500">/ 5</span>
          </div>
          <p className="text-[10px] text-slate-500">Satisfaction générale</p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par télévendeur, vendeur ou mot-clé..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Note Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Toutes les Notes</option>
            <option value="5">⭐⭐⭐⭐⭐ (5 étoiles)</option>
            <option value="4">⭐⭐⭐⭐ (4 étoiles)</option>
            <option value="low">⭐ à ⭐⭐⭐ (1 à 3 étoiles - Litiges)</option>
          </select>

          {/* Statut Modération */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Tous les Statuts Modération</option>
            <option value="approved">Approuvés (Publics)</option>
            <option value="pending">En attente / Non modérés</option>
          </select>
        </div>
      </div>

      {/* REVIEWS LIST */}
      <div className="space-y-3">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-400" />
            <p className="font-semibold text-slate-400">Aucun avis trouvé</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Les évaluations publiées par vos télévendeurs apparaîtront ici.</p>
          </div>
        ) : (
          filteredReviews.map(review => {
            const isApproved = review.status === 'approved';
            const busy = isProcessingId === review.id;

            return (
              <div 
                key={review.id}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all space-y-3"
              >
                {/* Top Row: Author & Target Seller & Rating */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                      {(review.telemarketerName?.[0] || 'T').toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{review.telemarketerName || 'Télévendeur'}</span>
                        <span className="text-slate-500 font-normal">a évalué</span>
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          <span>@{review.sellerUsername || review.sellerName || 'vendeur'}</span>
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{new Date(review.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stars & Moderation Status */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= review.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-black text-amber-400 ml-1">{review.rating}/5</span>
                    </div>

                    {/* Status Badge */}
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Approuvé</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase">
                        <Clock className="w-3 h-3" />
                        <span>En Attente</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Comment Text */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-200 leading-relaxed">
                  "{review.comment}"
                </div>

                {/* Tags & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  {/* Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {review.tags && review.tags.length > 0 ? (
                      review.tags.map((tag, idx) => (
                        <span 
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700/60"
                        >
                          <Tag className="w-2.5 h-2.5 text-indigo-400" />
                          <span>{tag}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">Aucun tag spécifique</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!isApproved && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleApprove(review.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approuver l'avis</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(review.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
