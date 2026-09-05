import React, { useState, useRef } from 'react';
import { 
  Building2, Plus, Edit3, Trash2, Check, Star, Upload, 
  X, AlertCircle, Phone, Mail, MapPin, FileText, Image as ImageIcon 
} from 'lucide-react';
import { UserBusiness } from '../types';
import { 
  saveUserBusiness, deleteUserBusiness, setDefaultUserBusiness 
} from '../lib/firebase';
import { auth } from '../lib/firebase';
import { processImageFileToDataUrl } from '../utils/imageUtils';

interface ManageBusinessesModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: UserBusiness[];
  onSelectBusiness?: (business: UserBusiness) => void;
  initialEditingBusiness?: UserBusiness | null;
}

export const ManageBusinessesModal: React.FC<ManageBusinessesModalProps> = ({
  isOpen,
  onClose,
  businesses,
  onSelectBusiness,
  initialEditingBusiness = null
}) => {
  const currentUid = auth.currentUser?.uid || 'guest';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form View state: 'list' | 'create' | 'edit'
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [ninea, setNinea] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isDefault, setIsDefault] = useState(false);

  // UI state
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Open in edit mode if initialEditingBusiness provided
  React.useEffect(() => {
    if (initialEditingBusiness) {
      handleStartEdit(initialEditingBusiness);
    }
  }, [initialEditingBusiness]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setCompanyName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNinea('');
    setLogoUrl('');
    setIsDefault(businesses.length === 0);
    setErrorMessage(null);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsDefault(businesses.length === 0);
    setViewMode('form');
  };

  const handleStartEdit = (b: UserBusiness) => {
    setEditingId(b.id);
    setCompanyName(b.companyName);
    setPhone(b.phone || '');
    setEmail(b.email || '');
    setAddress(b.address || '');
    setNinea(b.ninea || '');
    setLogoUrl(b.logoUrl || '');
    setIsDefault(b.isDefault || false);
    setErrorMessage(null);
    setViewMode('form');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processLogoFile(files[0]);
  };

  const processLogoFile = async (file: File) => {
    setIsProcessingLogo(true);
    setErrorMessage(null);
    try {
      const dataUrl = await processImageFileToDataUrl(file, 400, 400);
      setLogoUrl(dataUrl);
      setSuccessMessage("Logo chargé et optimisé avec succès !");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Impossible de charger cette image.");
    } finally {
      setIsProcessingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = companyName.trim();
    if (!cleanName) {
      setErrorMessage("La raison sociale de l'entreprise est obligatoire.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const saved = await saveUserBusiness(currentUid, {
        id: editingId || undefined,
        companyName: cleanName,
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        ninea: ninea.trim(),
        logoUrl: logoUrl || '',
        isDefault: isDefault || businesses.length === 0
      });

      if (saved) {
        setSuccessMessage(`Société "${cleanName}" enregistrée avec succès !`);
        setTimeout(() => setSuccessMessage(null), 3000);
        if (onSelectBusiness) {
          onSelectBusiness(saved);
        }
        resetForm();
        setViewMode('list');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Erreur lors de la sauvegarde de l'entreprise.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (b: UserBusiness) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer l'entreprise "${b.companyName}" ?`)) {
      return;
    }
    await deleteUserBusiness(currentUid, b.id);
    setSuccessMessage(`Société supprimée.`);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleSetDefault = async (b: UserBusiness) => {
    await setDefaultUserBusiness(currentUid, b.id);
    setSuccessMessage(`"${b.companyName}" définie comme société émettrice par défaut.`);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                {viewMode === 'form' 
                  ? (editingId ? "Modifier l'entreprise émettrice" : "Ajouter une nouvelle entreprise")
                  : "Mes Entreprises & Sociétés Émettrices"
                }
              </h2>
              <p className="text-xs text-slate-400">
                Gérez vos raisons sociales, coordonnées et logos pour vos factures et devis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {viewMode === 'list' ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Entreprises enregistrées ({businesses.length})
                </span>
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une entreprise</span>
                </button>
              </div>

              {businesses.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">Aucune entreprise émettrice enregistrée</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                    Ajoutez vos différentes structures (société, agence, statut freelance) pour générer automatiquement vos devis et factures avec leur logo.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Créer ma première entreprise</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {businesses.map((b) => (
                    <div
                      key={b.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        b.isDefault 
                          ? 'border-indigo-300 bg-indigo-50/40 shadow-xs' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          {/* Logo or Icon */}
                          <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0 p-1 overflow-hidden shadow-2xs">
                            {b.logoUrl ? (
                              <img 
                                src={b.logoUrl} 
                                alt={b.companyName} 
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Building2 className="w-6 h-6 text-slate-400" />
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-black text-slate-900">{b.companyName}</h4>
                              {b.isDefault && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-2xs">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  <span>Par défaut</span>
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              {b.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{b.phone}</span>
                                </span>
                              )}
                              {b.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span>{b.email}</span>
                                </span>
                              )}
                              {b.address && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{b.address}</span>
                                </span>
                              )}
                            </div>

                            {b.ninea && (
                              <div className="text-[11px] font-mono text-slate-500">
                                NINEA : <strong className="text-slate-700">{b.ninea}</strong>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {onSelectBusiness && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectBusiness(b);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Utiliser cette entreprise comme émettrice"
                            >
                              <Check className="w-3 h-3" />
                              <span>Sélectionner</span>
                            </button>
                          )}

                          {!b.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(b)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors cursor-pointer"
                              title="Définir comme entreprise par défaut"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartEdit(b)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                            title="Modifier cette entreprise"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(b)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Supprimer cette entreprise"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* FORM MODE */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-black text-indigo-700 uppercase tracking-wider">
                  Informations de l'entreprise
                </span>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  ← Revenir à la liste
                </button>
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Raison Sociale / Nom de l'Entreprise <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Dokya Technologies SARL, Agence Créative..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-sm focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              {/* Logo Upload Section */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Logo Officiel de l'Entreprise (PDF & En-tête)
                </label>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-2xl border border-slate-200 bg-slate-50/60">
                  {/* Logo Preview Box */}
                  <div className="w-24 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center p-1.5 shrink-0 overflow-hidden relative group">
                    {logoUrl ? (
                      <>
                        <img 
                          src={logoUrl} 
                          alt="Logo" 
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
                          title="Supprimer ce logo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-slate-400">
                        <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                        <span className="text-[9px] font-medium block">Aucun logo</span>
                      </div>
                    )}
                  </div>

                  {/* Drop / Upload Action */}
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    className={`flex-1 w-full p-3 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer ${
                      isDragOver 
                        ? 'border-indigo-500 bg-indigo-50/50' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
                    <span className="text-xs font-bold text-slate-800 block">
                      {isProcessingLogo ? "Optimisation en cours..." : "Glissez une image ou cliquez pour parcourir"}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      PNG avec transparence recommandé, JPG ou WebP (max 400x400)
                    </span>
                  </div>
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Téléphone Professionnel / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Professionnel
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@monentreprise.sn"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Address & NINEA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Adresse & Ville
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Almadies, Dakar, Sénégal"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Identifiant Fiscal (NINEA / RCCM)
                  </label>
                  <input
                    type="text"
                    value={ninea}
                    onChange={(e) => setNinea(e.target.value)}
                    placeholder="Ex: 006452781 2V2 / SN.DKR.2023.B.1234"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Set as Default Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Définir comme entreprise émettrice par défaut
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Cette société sera automatiquement présélectionnée lors de la création d'un nouveau devis ou d'une nouvelle facture.
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isProcessingLogo}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? "Enregistrement..." : (editingId ? "Mettre à jour" : "Enregistrer la société")}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
