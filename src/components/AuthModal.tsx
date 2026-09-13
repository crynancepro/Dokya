'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Tag,
  Gift,
  MailCheck,
  RotateCcw,
  HelpCircle,
  KeyRound,
  Globe,
  Coins,
  ChevronDown
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth, googleProvider, appleProvider, initializeUserAccountDoc } from '../lib/firebase';
import { DokyaLogo } from './DokyaLogo';
import { useLocale, SupportedCurrency } from '../contexts/LocaleContext';
import { COUNTRIES, CountryOption } from '../constants/countries';
import { PhoneInputWithCountry } from './PhoneInputWithCountry';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login'
}) => {
  const { userCountry, setUserCountry, userCurrency, setUserCurrency } = useLocale();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(userCountry);
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>(userCurrency);
  const [showAdvancedLocale, setShowAdvancedLocale] = useState(false);

  const [referralCodeInput, setReferralCodeInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dokya_ref_code') || sessionStorage.getItem('dokya_ref_code') || '';
    }
    return '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // État spécifique pour la confirmation d'envoi du lien de réinitialisation
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Décompte pour le bouton renvoyer l'email
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Synchronisation si initialMode change à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setSuccessMsg(null);
      setResetEmailSent(false);
      setSelectedCountry(userCountry);
      setSelectedCurrency(userCurrency);
    }
  }, [isOpen, initialMode, userCountry, userCurrency]);

  if (!isOpen) return null;

  const handleSendResetEmail = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Veuillez renseigner une adresse email valide.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetEmailSent(true);
      setSuccessMsg(`Un e-mail de réinitialisation sécurisé a été transmis à ${cleanEmail}.`);
      setResendCooldown(45);
    } catch (err: any) {
      console.warn('Password reset notice:', err.code, err.message);
      if (err.code === 'auth/user-not-found') {
        setError('Aucun compte Dokya trouvé avec cet e-mail. Si vous vous êtes inscrit avec Google, utilisez le bouton "Continuer avec Google".');
      } else if (err.code === 'auth/invalid-email') {
        setError('Cette adresse e-mail est invalide. Vérifiez l\'orthographe.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Trop de demandes récentes. Par sécurité, patientez quelques minutes avant de réessayer.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Problème de connexion Internet. Vérifiez votre réseau.');
      } else {
        setError('Impossible d\'envoyer le lien pour le moment. Vous pouvez vous connecter facilement via Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    // Sauvegarde du code parrainage
    if (referralCodeInput.trim() && typeof window !== 'undefined') {
      try {
        localStorage.setItem('dokya_ref_code', referralCodeInput.trim().toUpperCase());
        sessionStorage.setItem('dokya_ref_code', referralCodeInput.trim().toUpperCase());
      } catch (_e) {}
    }

    try {
      if (mode === 'forgot_password') {
        await handleSendResetEmail(email);
        return;
      }

      if (mode === 'login') {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        await initializeUserAccountDoc(userCred.user);
        setSuccessMsg('Connexion réussie !');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 800);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await initializeUserAccountDoc(userCred.user, { 
          displayName: fullName.trim() || undefined,
          phone: phone.trim() || undefined,
          phoneNumber: phone.trim() || undefined,
          country: selectedCountry.name,
          residenceCountry: selectedCountry.code,
          currency: selectedCurrency
        });
        // Synchroniser le contexte global avec les choix d'inscription
        setUserCountry(selectedCountry);
        setUserCurrency(selectedCurrency);
        setSuccessMsg('Compte créé avec succès ! Bienvenue sur Dokya AI.');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 800);
      }
    } catch (err: any) {
      console.warn('Auth notice:', err.code, err.message);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Email ou mot de passe incorrect. Vous pouvez aussi vous connecter avec Google.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Connexion par e-mail non activée dans Firebase. Utilisez la connexion par Google.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Cet e-mail est déjà utilisé. Veuillez vous connecter ou utiliser Google.');
      } else if (err.code === 'auth/weak-password') {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Adresse e-mail invalide.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Trop de tentatives infructueuses. Veuillez patienter avant de réessayer.');
      } else {
        setError('Identifiants non reconnus. Connectez-vous facilement via Google ou Apple.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCred = await signInWithPopup(auth, googleProvider);
      await initializeUserAccountDoc(userCred.user, {
        country: selectedCountry.name,
        residenceCountry: selectedCountry.code,
        currency: selectedCurrency
      });
      setUserCountry(selectedCountry);
      setUserCurrency(selectedCurrency);
      setSuccessMsg('Connexion Google réussie !');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 800);
    } catch (err: any) {
      console.warn('Google Auth notice:', err.code, err.message);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Connexion annulée : la fenêtre Google a été fermée.');
      } else {
        setError('Impossible de se connecter avec Google pour le moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCred = await signInWithPopup(auth, appleProvider);
      await initializeUserAccountDoc(userCred.user, {
        country: selectedCountry.name,
        residenceCountry: selectedCountry.code,
        currency: selectedCurrency
      });
      setUserCountry(selectedCountry);
      setUserCurrency(selectedCurrency);
      setSuccessMsg('Connexion Apple réussie !');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 800);
    } catch (err: any) {
      console.warn('Apple Auth notice:', err.code, err.message);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Connexion annulée : la fenêtre Apple a été fermée.');
      } else if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        setError("L'authentification Apple nécessite la liaison Apple Developer. Vous pouvez continuer immédiatement via Google ou votre adresse e-mail !");
      } else {
        setError('Connexion Apple indisponible. Utilisez Google ou inscrivez-vous par e-mail.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        
        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800/60 hover:bg-neutral-800 transition-all cursor-pointer z-10"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ========================================================================= */}
        {/* ÉCRAN SPÉCIAL : CONFIRMATION D'ENVOI DU LIEN DE MOT DE PASSE OUBLIÉ       */}
        {/* ========================================================================= */}
        {mode === 'forgot_password' && resetEmailSent ? (
          <div className="text-center space-y-5 py-2">
            
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center shadow-xl shadow-emerald-950/50">
              <MailCheck className="w-8 h-8 text-emerald-400 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-white tracking-tight">
                E-mail envoyé !
              </h2>
              <p className="text-xs text-neutral-400">
                Un lien de réinitialisation sécurisé a été transmis à :
              </p>
              <p className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/60 py-1.5 px-3 rounded-xl border border-emerald-800/60 inline-block max-w-full truncate">
                {email}
              </p>
            </div>

            {/* Boîte de consignes précises */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-left space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Ouvrez votre boîte de réception et cliquez sur le lien reçu.</span>
              </div>
              <div className="flex items-start gap-2 text-amber-300/90 font-medium">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Pensez à vérifier votre dossier <strong>Spams / Courriers indésirables</strong> si vous ne le voyez pas.</span>
              </div>
              <div className="flex items-start gap-2 text-slate-400">
                <KeyRound className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>Définissez votre nouveau mot de passe (au moins 6 caractères).</span>
              </div>
            </div>

            {/* Actions post-envoi */}
            <div className="space-y-2.5 pt-1">
              
              {/* Bouton principal : Revenir à la connexion */}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setResetEmailSent(false);
                  setError(null);
                  setSuccessMsg('Renseignez votre nouveau mot de passe pour vous connecter.');
                }}
                className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black text-xs shadow-lg shadow-violet-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Revenir à la connexion</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Bouton secondaire : Renvoyer l'e-mail */}
              <button
                type="button"
                disabled={loading || resendCooldown > 0}
                onClick={() => handleSendResetEmail(email)}
                className="w-full py-2.5 px-4 rounded-2xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 text-violet-400" />
                )}
                <span>
                  {resendCooldown > 0 
                    ? `Renvoyer l'e-mail dans ${resendCooldown}s` 
                    : "Vous n'avez rien reçu ? Renvoyer l'e-mail"}
                </span>
              </button>

            </div>

            {/* Alternative Google au cas où */}
            <div className="pt-2 border-t border-neutral-800/80">
              <p className="text-[11px] text-neutral-400 mb-2">
                Vous aviez créé votre compte avec Google ?
              </p>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 font-bold transition-colors cursor-pointer"
              >
                <span>Se connecter directement avec Google</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        ) : (
          /* ========================================================================= */
          /* FORMULAIRE CLASSIQUE (LOGIN, SIGNUP OU SAISIE EMAIL FORGOT PASSWORD)      */
          /* ========================================================================= */
          <>
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-1">
                <DokyaLogo size="lg" variant="icon" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {mode === 'forgot_password' 
                  ? 'Mot de passe oublié ?' 
                  : mode === 'login' 
                    ? 'Se connecter à Dokya AI' 
                    : 'Créer un compte Dokya AI'}
              </h2>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                {mode === 'forgot_password'
                  ? 'Entrez votre adresse e-mail. Nous vous enverrons immédiatement un lien sécurisé pour définir un nouveau mot de passe.'
                  : mode === 'login' 
                    ? 'Accédez à votre espace sécurisé, vos CV et vos documents'
                    : 'Rejoignez les professionnels et candidats sur Dokya AI'}
              </p>
            </div>

            {/* Messages d'état */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Boutons d'inscription rapide Google & Apple (mis en avant en haut) */}
            {mode !== 'forgot_password' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{mode === 'signup' ? 'Inscription ultra-rapide (1-clic)' : 'Connexion instantanée'}</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                    Recommandé
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Bouton Google */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-2.5 px-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700/80 border border-neutral-700/70 text-white font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95 disabled:opacity-60 shadow-xs"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span className="truncate">Google</span>
                  </button>

                  {/* Bouton Apple */}
                  <button
                    type="button"
                    onClick={handleAppleSignIn}
                    disabled={loading}
                    className="w-full py-2.5 px-3 rounded-2xl bg-black hover:bg-neutral-900 border border-neutral-700/80 text-white font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95 disabled:opacity-60 shadow-xs"
                  >
                    <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-5.74-8.81-10.15-18.7-13.23-29.68-3.08-10.97-4.62-21.49-4.62-31.54 0-14.46 3.66-26.47 10.98-36.03 7.32-9.56 16.51-14.46 27.56-14.69 4.35 0 9.43 1.16 15.24 3.49 5.81 2.33 9.77 3.55 11.88 3.66 2.33-.21 6.5-1.53 12.51-3.97 6.01-2.44 11.07-3.5 15.18-3.18 11.45.64 20.65 4.67 27.58 12.08-9.87 5.96-14.66 14.28-14.36 24.96.32 8.35 3.44 15.34 9.36 20.97 5.92 5.63 12.92 8.94 21.01 9.94-2.22 6.6-4.73 13.06-7.53 19.38zM119.22 33.64c0-7.23 2.65-13.91 7.95-20.04 5.3-6.13 11.66-9.78 19.08-10.95.21 1.27.32 2.38.32 3.33 0 7.23-2.73 14.13-8.19 20.7-5.46 6.57-11.96 10.37-19.5 11.4-.21-1.37-.32-2.56-.32-3.57l.66-.87z" />
                    </svg>
                    <span className="truncate">Apple</span>
                  </button>
                </div>

                <div className="relative flex items-center justify-center pt-1">
                  <div className="border-t border-neutral-800 w-full" />
                  <span className="bg-neutral-900 px-3 text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                    {mode === 'signup' ? 'ou inscription avec vos coordonnées' : 'ou connexion par e-mail'}
                  </span>
                </div>
              </div>
            )}

            {/* Formulaire Principal */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Nom complet</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="Mamadou Ndiaye"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 !text-white text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all !placeholder:text-slate-500 caret-indigo-400"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  {mode === 'forgot_password' ? 'Votre adresse e-mail de compte' : 'Adresse E-mail'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="votre.email@domaine.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 !text-white text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all !placeholder:text-slate-500 caret-indigo-400"
                  />
                </div>
              </div>

              {/* Champ Téléphone avec détection d'indicatif international & drapeau (spécifique inscription) */}
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-300">
                      Numéro de téléphone / WhatsApp
                    </label>
                    <span className="text-[10px] text-indigo-400 font-medium">
                      Indicatif automatique
                    </span>
                  </div>
                  <PhoneInputWithCountry
                    value={phone}
                    onChange={(fullNumber, details) => {
                      setPhone(fullNumber);
                      if (details?.country) {
                        setSelectedCountry(details.country);
                        if (details.country.currency) {
                          setSelectedCurrency(details.country.currency);
                        }
                      }
                    }}
                    defaultCountryCode={selectedCountry.code}
                    placeholder={selectedCountry.example}
                  />
                </div>
              )}

              {mode !== 'forgot_password' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-300">Mot de passe</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot_password');
                          setError(null);
                          setSuccessMsg(null);
                          setResetEmailSent(false);
                        }}
                        className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 !text-white text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all !placeholder:text-slate-500 caret-indigo-400"
                    />
                  </div>
                </div>
              )}

              {/* Préférences régionales : Pays de résidence & Devise principale (Optionnel) */}
              {mode === 'signup' && (
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-bold text-slate-200">
                        Pays & Devise principale
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      (Optionnel • 1 000 FCFA ≈ 1.50 €)
                    </span>
                  </div>

                  {/* Choix de devise principale : XOF, XAF, EUR, USD */}
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">
                      Devise d'affichage préférée :
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['XOF', 'XAF', 'EUR', 'USD'] as SupportedCurrency[]).map((cur) => {
                        const isCurSelected = selectedCurrency === cur;
                        return (
                          <button
                            key={cur}
                            type="button"
                            onClick={() => setSelectedCurrency(cur)}
                            className={`py-1.5 px-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
                              isCurSelected
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            <span className="block font-mono text-[11px] leading-tight">{cur}</span>
                            <span className="text-[9px] text-slate-300 opacity-80 block">
                              {cur === 'XOF' ? 'FCFA UEMOA' : cur === 'XAF' ? 'FCFA CEMAC' : cur === 'EUR' ? 'Euro €' : 'Dollar $'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pays de résidence */}
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">
                      Pays de résidence :
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCountry.code}
                        onChange={(e) => {
                          const found = COUNTRIES.find(c => c.code === e.target.value);
                          if (found) {
                            setSelectedCountry(found);
                            if (found.currency) {
                              setSelectedCurrency(found.currency);
                            }
                          }
                        }}
                        className="w-full py-2 pl-3 pr-8 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                            {c.flag} {c.name} ({c.dialCode}) • {c.currency}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-300">Code de parrainage</label>
                    <span className="text-[10px] text-neutral-500">(Facultatif)</span>
                  </div>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Ex: PETER25"
                      value={referralCodeInput}
                      onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 !text-amber-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-500 transition-all !placeholder:text-slate-500"
                    />
                  </div>
                  {referralCodeInput && (
                    <p className="text-[11px] text-amber-300 flex items-center gap-1 mt-0.5">
                      <Gift className="w-3 h-3 text-amber-400" />
                      <span>Parrain détecté : {referralCodeInput}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Bouton de soumission */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-75"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Création du compte...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'forgot_password' 
                        ? 'Envoyer le lien de réinitialisation' 
                        : mode === 'login' 
                          ? 'Se connecter' 
                          : 'Créer mon compte Dokya AI'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Mode Footer */}
            <div className="text-center pt-2 text-xs text-neutral-400">
              {mode === 'forgot_password' ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-violet-400 font-bold hover:underline cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>← Revenir à la connexion</span>
                  </button>

                  <div className="pt-2 border-t border-neutral-800">
                    <p className="text-[11px] text-neutral-400 mb-1.5">
                      Vous vous êtes inscrit avec Google ?
                    </p>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="inline-flex items-center gap-2 text-xs text-white bg-neutral-800 hover:bg-neutral-700 py-1.5 px-3 rounded-xl border border-neutral-700 font-semibold transition-colors cursor-pointer"
                    >
                      <span>Se connecter avec Google</span>
                      <ArrowRight className="w-3 h-3 text-violet-400" />
                    </button>
                  </div>
                </div>
              ) : mode === 'login' ? (
                <p>
                  Vous n'avez pas encore de compte ?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError(null);
                    }}
                    className="text-violet-400 font-bold hover:underline cursor-pointer"
                  >
                    Créer un compte
                  </button>
                </p>
              ) : (
                <p>
                  Vous avez déjà un compte ?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="text-violet-400 font-bold hover:underline cursor-pointer"
                  >
                    Se connecter
                  </button>
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Authentification sécurisée Firebase Auth</span>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
