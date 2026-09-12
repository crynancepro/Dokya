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
  KeyRound
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth, googleProvider, initializeUserAccountDoc } from '../lib/firebase';
import { DokyaLogo } from './DokyaLogo';

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
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
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
    }
  }, [isOpen, initialMode]);

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
      setSuccessMsg(`Un e-mail de réinitialisation sécurisé a été envoyé à ${cleanEmail}.`);
      setResendCooldown(45); // 45 secondes de sécurité avant renvoi
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
        // Dans certains cas Firebase bloque pour des raisons de sécurité ou de politique de projet
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
        await initializeUserAccountDoc(userCred.user, { displayName: fullName.trim() || undefined });
        setSuccessMsg('Compte créé avec succès ! (Solde initial : 0 FCFA)');
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
        setError('Identifiants non reconnus. Connectez-vous facilement via Google.');
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
      await initializeUserAccountDoc(userCred.user);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800/60 hover:bg-neutral-800 transition-all cursor-pointer"
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

            {/* Bouton Google Rapide (affiché en login & signup) */}
            {mode !== 'forgot_password' && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700/80 border border-neutral-700/60 text-white font-bold text-xs flex items-center justify-center gap-3 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  <span>Continuer avec Google</span>
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-neutral-800 w-full" />
                  <span className="bg-neutral-900 px-3 text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">ou par email</span>
                </div>
              </>
            )}

            {/* Formulaire Principal */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Nom complet</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Mamadou Ndiaye"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 !text-white text-xs font-medium focus:outline-none focus:border-violet-500 transition-all !placeholder:text-slate-400 caret-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  {mode === 'forgot_password' ? 'Votre adresse e-mail de compte' : 'Adresse E-mail'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="votre.email@domaine.sn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 !text-white text-xs font-medium focus:outline-none focus:border-violet-500 transition-all !placeholder:text-slate-400 caret-blue-500"
                  />
                </div>
              </div>

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
                        className="text-[11px] font-semibold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 !text-white text-xs font-medium focus:outline-none focus:border-violet-500 transition-all !placeholder:text-slate-400 caret-blue-500"
                    />
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
                    <Tag className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ex: PETER25"
                      value={referralCodeInput}
                      onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 !text-amber-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-500 transition-all !placeholder:text-slate-500"
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
                className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs shadow-lg shadow-violet-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-75"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Chargement...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'forgot_password' 
                        ? 'Envoyer le lien de réinitialisation' 
                        : mode === 'login' 
                          ? 'Se connecter' 
                          : 'Créer mon compte'}
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
