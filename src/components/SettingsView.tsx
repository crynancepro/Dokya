import React, { useState } from 'react';
import { 
  Settings, 
  Globe, 
  Coins, 
  User, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  Crown, 
  Sparkles,
  ShoppingBag,
  Briefcase
} from 'lucide-react';
import { CandidateProfile } from '../types';
import { useLocale, SupportedCurrency } from '../contexts/LocaleContext';
import { auth, doc, updateDoc, db } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

interface SettingsViewProps {
  profile: CandidateProfile;
  onUpdateProfile?: (updated: Partial<CandidateProfile>) => void;
  userBalance?: number;
  onSwitchToTelemarketer?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onUpdateProfile,
  userBalance = 0,
  onSwitchToTelemarketer
}) => {
  const currentUid = auth.currentUser?.uid || profile.uid || 'guest';
  const { userCurrency, setUserCurrency, formatPrice } = useLocale();

  // Settings states
  const [language, setLanguage] = useState<'fr' | 'en'>(() => {
    return (profile.languagePreference as 'fr' | 'en') || 'fr';
  });

  const [activeRole, setActiveRole] = useState<'seller' | 'telemarketer' | 'candidate'>(() => {
    return (profile.userRole as 'seller' | 'telemarketer' | 'candidate') || 'seller';
  });

  // Profile Form States
  const [displayName, setDisplayName] = useState(
    profile.displayName || 
    [profile.personalInfo?.firstName, profile.personalInfo?.lastName].filter(Boolean).join(' ') || 
    ''
  );
  const [phone, setPhone] = useState(profile.personalInfo?.phone || profile.phone || '');
  const [city, setCity] = useState(profile.personalInfo?.city || 'Dakar');
  const [country, setCountry] = useState(profile.personalInfo?.country || 'Sénégal');

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password reset state
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const showFeedback = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updatedProfileData: Partial<CandidateProfile> = {
        displayName: displayName.trim(),
        userRole: activeRole,
        languagePreference: language,
        preferredCurrency: userCurrency,
        personalInfo: {
          ...profile.personalInfo,
          firstName: displayName.split(' ')[0] || '',
          lastName: displayName.split(' ').slice(1).join(' ') || '',
          phone: phone.trim(),
          city: city.trim(),
          country: country.trim()
        },
        updatedAt: new Date().toISOString()
      };

      if (currentUid && currentUid !== 'guest') {
        try {
          const userRef = doc(db, 'users', currentUid);
          await updateDoc(userRef, {
            displayName: displayName.trim(),
            userRole: activeRole,
            languagePreference: language,
            currency: userCurrency,
            phone: phone.trim(),
            phoneNumber: phone.trim(),
            updatedAt: new Date().toISOString()
          });
        } catch (_e) {}
      }

      if (onUpdateProfile) {
        onUpdateProfile(updatedProfileData);
      }

      showFeedback("Paramètres mis à jour avec succès !");
    } catch (err: any) {
      showFeedback("Erreur lors de la sauvegarde des paramètres.", true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    const targetEmail = auth.currentUser?.email || profile.email;
    if (!targetEmail) {
      showFeedback("Aucune adresse email valide trouvée sur ce compte.", true);
      return;
    }

    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetEmailSent(true);
      showFeedback(`Un lien de réinitialisation sécurisé a été envoyé à ${targetEmail}`);
    } catch (err: any) {
      showFeedback("Impossible d'envoyer l'email de réinitialisation. Réessayez plus tard.", true);
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-3 sm:px-6 py-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white">Paramètres du Compte</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gérez vos préférences de langue, votre devise d'affichage, vos rôles et la sécurité de votre compte.
          </p>
        </div>

        {/* Solde Wallet Indicatif */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl">
          <Coins className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-slate-400">Solde actif :</span>
          <span className="text-sm font-black text-emerald-400">{formatPrice(userBalance)}</span>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">

        {/* =================================================================== */}
        {/* SECTION 1: LANGUE & DEVISE GLOBALE                                  */}
        {/* =================================================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>Langue & Devise Globale</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Choix de la Langue */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Langue de l'interface
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('fr')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    language === 'fr'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-base">🇫🇷</span>
                  <span>Français (Défaut)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    language === 'en'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-base">🇬🇧</span>
                  <span>English (EN)</span>
                </button>
              </div>
            </div>

            {/* Changement de Devise */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Devise d'affichage & tarifs
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { code: 'XOF' as SupportedCurrency, label: 'FCFA XOF', flag: '🇸🇳' },
                  { code: 'XAF' as SupportedCurrency, label: 'FCFA XAF', flag: '🇨🇲' },
                  { code: 'USD' as SupportedCurrency, label: 'USD ($)', flag: '🇺🇸' },
                  { code: 'EUR' as SupportedCurrency, label: 'EUR (€)', flag: '🇪🇺' }
                ].map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setUserCurrency(c.code)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                      userCurrency === c.code
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{c.flag}</span>
                    <span className="truncate text-[11px]">{c.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Tous les tarifs d'abonnements, produits et soldes sont automatiquement convertis.
              </p>
            </div>

          </div>
        </div>

        {/* =================================================================== */}
        {/* SECTION 2: RÔLE UTILISATEUR (VENDEUR OU TÉLÉVENDEUR)               */}
        {/* =================================================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              <span>Rôle & Espace Utilisateur</span>
            </h2>
            <span className="text-xs text-indigo-400 font-bold">
              {activeRole === 'seller' ? 'Espace Vendeur / Boutique' : 'Espace Télévendeur / Marketplace'}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Choisissez votre profil principal sur Dokya. Vous pouvez basculer à tout moment selon votre activité.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setActiveRole('seller');
                if (typeof window !== 'undefined') {
                  localStorage.setItem('dokya_user_role', 'seller');
                }
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                activeRole === 'seller'
                  ? 'bg-indigo-600/15 border-indigo-500 shadow-lg'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm font-bold text-white">Vendeur / Commerçant</span>
                </div>
                {activeRole === 'seller' && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Créez vos fiches produits, définissez des commissions pour les affiliés et recevez des commandes directes.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveRole('telemarketer');
                if (typeof window !== 'undefined') {
                  localStorage.setItem('dokya_user_role', 'telemarketer');
                }
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                activeRole === 'telemarketer'
                  ? 'bg-emerald-600/15 border-emerald-500 shadow-lg'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold text-white">Télévendeur / Affilié</span>
                </div>
                {activeRole === 'telemarketer' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Accédez au marketplace des offres, enregistrez les commandes clients hors-site et touchez des commissions garanties.
              </p>
            </button>
          </div>

          {activeRole === 'telemarketer' && onSwitchToTelemarketer && (
            <div className="pt-2 animate-in fade-in">
              <button
                type="button"
                onClick={onSwitchToTelemarketer}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer hover:scale-[1.01] active:scale-95"
              >
                <Briefcase className="w-4 h-4" />
                <span>Ouvrir directement votre Espace Dédié Télévendeurs →</span>
              </button>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* SECTION 3: PROFIL PERSONNEL & COORDONNÉES                          */}
        {/* =================================================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            <span>Profil & Coordonnées</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Nom Complet */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Nom complet
              </label>
              <input 
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Votre nom et prénom"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Email (Readonly) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Adresse e-mail
              </label>
              <input 
                type="email"
                disabled
                value={auth.currentUser?.email || profile.email || ''}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-sm text-slate-400 cursor-not-allowed"
              />
            </div>

            {/* Téléphone WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Numéro WhatsApp / Téléphone
              </label>
              <input 
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+221 77 000 00 00"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Ville / Pays */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Ville & Pays de résidence
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Dakar"
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <input 
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Sénégal"
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

          </div>
        </div>

        {/* =================================================================== */}
        {/* SECTION 4: SÉCURITÉ DU COMPTE & MOT DE PASSE                       */}
        {/* =================================================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-400" />
            <span>Sécurité du Compte</span>
          </h2>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <span>Réinitialiser votre mot de passe</span>
              </p>
              <p className="text-xs text-slate-400">
                Recevez un lien de modification sécurisé par email pour renouveler votre mot de passe.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSendPasswordReset}
              disabled={isSendingReset || resetEmailSent}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer transition-colors shrink-0 disabled:opacity-50"
            >
              {isSendingReset ? 'Envoi...' : resetEmailSent ? 'Email envoyé ✓' : 'Envoyer le lien'}
            </button>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les Paramètres'}</span>
          </button>
        </div>

      </form>
    </div>
  );
};
