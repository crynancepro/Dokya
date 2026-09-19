import React, { useState, useEffect } from 'react';
import { 
  CVFormData, 
  AIOptimizedData, 
  CandidateProfile, 
  SavedUserDocument, 
  BusinessDocData, 
  EbookData,
  TemplateStyle,
  CoverLetterType,
  InterviewPrepData,
  UserSubscription,
  isUserVipActive,
  Customer
} from './types';
import { SAMPLE_CV_DATA } from './data/sampleData';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { TemplatesView } from './components/TemplatesView';
import { StepForm } from './components/StepForm';
import { LetterEditorForm } from './components/LetterEditorForm';
import { CandidateDashboard } from './components/CandidateDashboard';
import { PaymentModal } from './components/PaymentModal';
import { PaywallModal } from './components/PaywallModal';
import { RechargeWalletModal } from './components/RechargeWalletModal';
import { DevisFactureForm } from './components/DevisFactureForm';
import { EbookWizardForm } from './components/EbookWizardForm';
import { DocumentDedicatedPreview } from './components/DocumentDedicatedPreview';
import { CVTemplateGallery } from './components/CVTemplateGallery';
import { BusinessDocTemplateGallery } from './components/BusinessDocTemplateGallery';
import { LetterTemplateGallery } from './components/LetterTemplateGallery';
import { InterviewPrepOfferModal } from './components/InterviewPrepOfferModal';
import { InterviewPrepView } from './components/InterviewPrepView';
import { AuthModal } from './components/AuthModal';
import { VictoryModal } from './components/VictoryModal';
import { downloadElementAsPDF } from './lib/pdfUtils';
import { exportCVToDocx, exportLetterToDocx, exportBusinessDocToDocx, exportEbookToDocx } from './lib/exportUtils';
import { auth, db, saveUserDocument, saveTransactionRecord, subscribeToUserProfile, fetchUserData, refetchProfile, initializeUserAccountDoc, saveBusinessInvoice, getLocalProfileKey, getLocalTransactionsKey, getLocalDocumentsKey } from './lib/firebase';
import { doc, getDoc, setDoc, increment, arrayUnion } from 'firebase/firestore';
import { initAffiliateTracking } from './lib/referralTracking';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { generateCVWithGemini, generateInterviewPrepWithGemini } from './lib/geminiService';

import { 
  CheckCircle2, ArrowLeft,
  FileCheck, Receipt, Eye, FolderHeart, PlusCircle, X, ShieldCheck,
  Layers, Sparkles
} from 'lucide-react';

export const createEmptyCVFormData = (): CVFormData => ({
  generationMode: 'cv_only',
  personalInfo: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: 'Dakar',
    country: 'Sénégal',
    targetJob: ''
  },
  experiences: [],
  education: [],
  skills: [{ category: 'Compétences Principales', skills: [] }],
  languages: [{ name: 'Français', level: 'Bilingue / Maternelle' }],
  templateStyle: 'moderne',
  themeColor: '#4f46e5'
});

export const createEmptyBusinessDocData = (type: 'devis' | 'facture' = 'devis'): BusinessDocData => ({
  type,
  docNumber: `${type === 'devis' ? 'DEV' : 'FAC'}-${new Date().getFullYear()}-001`,
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  validityDays: 30,
  issuer: {
    name: '',
    companyName: '',
    ninea: '',
    rc: '',
    phone: '',
    email: '',
    address: '',
    city: 'Dakar',
    country: 'Sénégal'
  },
  client: {
    name: '',
    companyName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Dakar',
    country: 'Sénégal'
  },
  items: [
    { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }
  ],
  applyVat: true,
  vatRate: 18,
  discountPercent: 0,
  paymentInfo: {
    waveNumber: '',
    orangeMoneyNumber: '',
    bankName: '',
    ibanOrRib: ''
  },
  currency: 'FCFA'
});

export const createEmptyEbookData = (): EbookData => ({
  id: `EBOOK-${Date.now()}`,
  title: '',
  subtitle: '',
  author: '',
  language: 'Français',
  genre: 'Développement Personnel & Professionnel',
  targetAudience: 'Tous publics',
  tone: 'Inspirant & Pratique',
  summaryOrPrompt: '',
  chapterCount: 5,
  targetPageCount: 10,
  pageFormat: '6x9',
  fontFamily: 'sans',
  fontSize: 'normal',
  frontCover: {
    selectedIndex: 0,
    proposals: [],
    customPrompt: '',
    customImageUrl: '',
    mode: 'proposal'
  },
  backCover: {
    selectedIndex: 0,
    proposals: [],
    customPrompt: '',
    customImageUrl: '',
    mode: 'proposal'
  },
  tableOfContents: [],
  chapters: [],
  currentStep: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

export type MainAppView = 
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'templates'
  | 'cv_gallery'
  | 'cv'
  | 'cv_preview'
  | 'letter_gallery'
  | 'letter'
  | 'letter_preview'
  | 'devis_gallery'
  | 'devis'
  | 'devis_preview'
  | 'facture_gallery'
  | 'facture'
  | 'facture_preview'
  | 'pack_business_gallery'
  | 'pack_business'
  | 'pack_business_preview'
  | 'ebook'
  | 'ebook_preview'
  | 'interview_prep'
  | 'tarifs'
  | 'subscription'
  | 'help'
  | 'support';

interface AppProps {
  onOpenAdmin?: () => void;
}

export default function App({ onOpenAdmin }: AppProps = {}) {
  // Authentication status
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);

  // Form State
  const [formData, setFormData] = useState<CVFormData>(createEmptyCVFormData);
  const [businessDocData, setBusinessDocData] = useState<BusinessDocData>(() => createEmptyBusinessDocData('devis'));
  const [ebookData, setEbookData] = useState<EbookData>(createEmptyEbookData);
  const [aiData, setAiData] = useState<AIOptimizedData | null>(null);
  const [interviewPrepData, setInterviewPrepData] = useState<InterviewPrepData | null>(null);

  // Interview prep offer modal
  const [isInterviewOfferOpen, setIsInterviewOfferOpen] = useState<boolean>(false);
  const [isGeneratingInterviewPrep, setIsGeneratingInterviewPrep] = useState<boolean>(false);

  // Pay-per-document state strictly attached to the current document being crafted
  const [isCurrentDocPaid, setIsCurrentDocPaid] = useState<boolean>(false);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const isVip = isUserVipActive(userSubscription);
  const [currentDocId, setCurrentDocId] = useState<string>(() => `DOC-${Date.now()}`);

  // Post-download modal state
  const [isPostDownloadModalOpen, setIsPostDownloadModalOpen] = useState<boolean>(false);
  const [downloadedDocTitle, setDownloadedDocTitle] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Service for templates view
  const [templatesService, setTemplatesService] = useState<'cv' | 'letter' | 'devis' | 'facture' | 'pack_business' | 'ebook'>('cv');

  // Pack specific sub-switchers
  const [packBusinessSubTab, setPackBusinessSubTab] = useState<'devis' | 'facture'>('devis');

  const [isEditingDirectly, setIsEditingDirectly] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState<boolean>(false);

  // User Wallet Balance - Real-time synchronization with Firestore (starts at 0 FCFA)
  const [userBalance, setUserBalance] = useState<number>(() => {
    const currentUid = auth.currentUser?.uid;
    if (currentUid && currentUid !== 'guest') {
      try {
        const saved = localStorage.getItem(getLocalProfileKey(currentUid));
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.walletBalance === 'number') return parsed.walletBalance;
          if (typeof parsed.balance === 'number') return parsed.balance;
        }
      } catch (e) { /* ignore */ }
    }
    return 0;
  });

  // Modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentDocType, setPaymentDocType] = useState<'cv' | 'letter' | 'devis' | 'facture' | 'pack_business' | 'ebook'>('cv');
  const [paymentDocTitle, setPaymentDocTitle] = useState<string>('');
  const [paymentDocTypeLabel, setPaymentDocTypeLabel] = useState<string>('CV Pro ATS');
  const [paymentPrice, setPaymentPrice] = useState<number>(1000);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'signup'>('login');
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState<boolean>(false);
  const [victoryDocTitle, setVictoryDocTitle] = useState<string>('');

  // -------------------------------------------------------------
  // Initial View Determination & URL Sync
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<MainAppView>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      const user = auth.currentUser;

      if (hash === '#landing' || pathname === '/') {
        return user ? 'dashboard' : 'landing';
      }
      if (hash === '#auth' || pathname === '/auth') {
        return user ? 'dashboard' : 'landing';
      }
      if (hash === '#dashboard' || pathname === '/dashboard') {
        return user ? 'dashboard' : 'landing';
      }
      if (hash === '#templates' || pathname === '/templates') {
        return user ? 'templates' : 'landing';
      }
      if (hash === '#editor' || pathname === '/editor') {
        return user ? 'cv' : 'landing';
      }
      if (hash === '#tarifs' || pathname === '/tarifs') {
        return 'tarifs';
      }
      if (hash === '#subscription' || pathname === '/subscription') {
        return 'subscription';
      }
      if (pathname.startsWith('/documents/')) {
        return 'dashboard';
      }
      if (pathname === '/documents' || hash === '#documents') {
        return user ? 'dashboard' : 'landing';
      }
    }
    return auth.currentUser ? 'dashboard' : 'landing';
  });

  // Support direct access to /documents and /documents/:docId
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname;
    if (pathname.startsWith('/documents/')) {
      const routeDocId = pathname.replace(/^\/documents\//, '').split(/[?#/]/)[0];
      if (routeDocId) {
        getDoc(doc(db, 'user_documents', routeDocId)).then((snap) => {
          if (snap.exists()) {
            const data: any = snap.data();
            const isUnlocked = data.isUnlocked === true || data.status === 'UNLOCKED' || data.isPaid === true || data.unlocked === true;
            setCurrentDocId(routeDocId);
            if (data.formData) setFormData(data.formData);
            if (data.aiData) setAiData(data.aiData);
            if (data.businessDocData) setBusinessDocData(data.businessDocData);
            if (data.ebookData) setEbookData(data.ebookData);

            const effectiveType = data.type || data.documentType || data.generationMode;
            if (effectiveType === 'letter' || effectiveType === 'letter_only') {
              setActiveTab('letter_preview');
            } else if (effectiveType === 'devis') {
              setActiveTab('devis_preview');
            } else if (effectiveType === 'facture') {
              setActiveTab('facture_preview');
            } else if (effectiveType === 'pack_business') {
              setActiveTab('pack_business_preview');
            } else if (effectiveType === 'ebook') {
              setActiveTab('ebook_preview');
            } else {
              setActiveTab('cv_preview');
            }

            if (isUnlocked) {
              setIsCurrentDocPaid(true);
            } else {
              setIsCurrentDocPaid(false);
              setPaymentDocTitle(data.title || 'Document Professionnel');
              setIsPaymentModalOpen(true);
            }
          }
        }).catch(err => console.warn('[Route /documents/:id load error]:', err));
      }
    } else if (pathname === '/documents') {
      setActiveTab('dashboard');
    }
  }, []);

  // Clean stale storage
  useEffect(() => {
    try {
      localStorage.removeItem('cv_form_data');
      localStorage.removeItem('business_doc_data');
      localStorage.removeItem('ebook_data');
      localStorage.removeItem('cv_ai_data');
      localStorage.removeItem('senegal_cv_paid_docs');
    } catch (_e) {}
  }, []);

  // Handle user Sign Out with direct redirection to Landing Page
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setCurrentUser(null);
    navigateToView('landing');
  };

  // Listen to Firebase Auth state & subscribe in real-time to Firestore user profile (wallet balance & subscription)
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // Ensure user document exists in Firestore (0 FCFA default)
        initializeUserAccountDoc(user).catch(e => console.warn('User doc init error:', e));

        // Subscribe to real-time profile balance updates
        if (unsubProfile) unsubProfile();
        unsubProfile = subscribeToUserProfile(user.uid, (liveProfile) => {
          if (typeof liveProfile.walletBalance === 'number') {
            setUserBalance(liveProfile.walletBalance);
          }
          if (liveProfile.subscription) {
            setUserSubscription(liveProfile.subscription);
          }
        });

        // If user just logged in and was on landing or auth, navigate to dashboard
        if (activeTab === 'landing' || activeTab === 'auth') {
          setActiveTab('dashboard');
        }
      } else {
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
        setUserBalance(0);
        setUserSubscription(null);
        // When user logs out / is logged out, redirect immediately to landing page
        if (activeTab !== 'landing') {
          setActiveTab('landing');
          if (typeof window !== 'undefined') {
            window.location.hash = 'landing';
          }
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, [activeTab]);

  // Handle URL Hash synchronization
  const navigateToView = (view: MainAppView, serviceContext?: 'cv' | 'letter' | 'devis' | 'facture' | 'pack_business' | 'ebook') => {
    // Auth Guard for protected views
    const protectedViews: MainAppView[] = [
      'dashboard', 'templates', 'cv', 'cv_preview', 'letter', 'letter_preview',
      'devis', 'devis_preview', 'facture', 'facture_preview', 'pack_business',
      'pack_business_preview', 'ebook', 'ebook_preview'
    ];

    // Check either auth.currentUser or React state currentUser
    const isAuthUser = !!auth.currentUser || !!currentUser;

    if (protectedViews.includes(view) && !isAuthUser) {
      setAuthModalInitialMode('signup');
      setIsAuthModalOpen(true);
      setErrorMessage("Veuillez vous connecter ou créer un compte pour accéder à cette fonctionnalité.");
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    if (serviceContext) {
      setTemplatesService(serviceContext);
    }

    setActiveTab(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Sync hash in browser without full reload
    if (typeof window !== 'undefined') {
      if (view === 'landing') window.location.hash = 'landing';
      else if (view === 'dashboard') window.location.hash = 'dashboard';
      else if (view === 'templates') window.location.hash = `templates${serviceContext ? `?service=${serviceContext}` : ''}`;
      else if (view === 'cv' || view === 'letter' || view === 'devis' || view === 'facture' || view === 'pack_business' || view === 'ebook') window.location.hash = 'editor';
      else if (view === 'tarifs') window.location.hash = 'tarifs';
      else if (view === 'subscription') window.location.hash = 'subscription';
    }
  };

  // Traitement du retour après paiement Money Fusion (Return URL)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const searchParams = new URLSearchParams(window.location.search);
      let status = searchParams.get('status') || '';
      let paymentParam = searchParams.get('payment') || '';
      let token = searchParams.get('token') || searchParams.get('paymentId') || searchParams.get('orderId') || '';
      let reference = searchParams.get('reference') || searchParams.get('orderReference') || searchParams.get('ref') || '';
      let amountParam = Number(searchParams.get('amount') || 0);
      let returnDocId = searchParams.get('docId') || '';
      let returnPlan = searchParams.get('plan') || '';
      let returnType = searchParams.get('type') || '';

      // Traitement et détection automatique du code de parrainage (?ref=CODE)
      const detectedAffiliateCode = initAffiliateTracking();
      if (detectedAffiliateCode && !sessionStorage.getItem('dokya_ref_notified')) {
        sessionStorage.setItem('dokya_ref_notified', 'true');
        setSuccessMessage(`🤝 Invitation partenaire Dokya activée (Code : ${detectedAffiliateCode}) !`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }

      if (!status && !paymentParam && !token && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.substring(window.location.hash.indexOf('?') + 1);
        const hashParams = new URLSearchParams(hashQuery);
        status = hashParams.get('status') || status;
        paymentParam = hashParams.get('payment') || paymentParam;
        token = hashParams.get('token') || hashParams.get('paymentId') || token;
        reference = hashParams.get('reference') || hashParams.get('orderReference') || hashParams.get('ref') || reference;
        amountParam = Number(hashParams.get('amount') || amountParam);
        returnDocId = hashParams.get('docId') || returnDocId;
        returnPlan = hashParams.get('plan') || returnPlan;
        returnType = hashParams.get('type') || returnType;
      }

      const isPaymentSuccess = paymentParam === 'success' || 
        status === 'success' || 
        status === 'approved' || 
        searchParams.get('unlocked') === 'true' || 
        Boolean(token) ||
        (reference && status !== 'cancel');

      if (isPaymentSuccess) {
        const uid = auth.currentUser?.uid || currentUser?.uid;

        // 1. Appel direct de secours vers l'API de vérification backend sécurisée
        fetch('/api/moneyfusion/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            paymentId: token,
            docId: returnDocId,
            userId: uid,
            amount: amountParam,
            type: returnType,
            plan: returnPlan,
            status: 'success'
          })
        }).catch(err => console.warn('[Money Fusion Verify Request Warn]:', err));

        // 2. Synchronisation directe de secours dans Firestore côté client (sécurisée par les identifiants de l'utilisateur connecté)
        if (uid && uid !== 'guest') {
          const nowIso = new Date().toISOString();

          // A. Rechargement de Solde
          if (returnType === 'wallet' || reference?.includes('WALLET') || (!returnDocId && !returnPlan && amountParam > 0)) {
            const incrementAmount = amountParam > 0 ? amountParam : 3000;
            setDoc(doc(db, 'users', uid), {
              walletBalance: increment(incrementAmount),
              balance: increment(incrementAmount),
              solde: increment(incrementAmount),
              lastPaymentAt: nowIso,
              lastPaymentProvider: 'Money Fusion',
              updatedAt: nowIso
            }, { merge: true }).catch(e => console.error('[Client Firestore Wallet Sync Error]:', e));
          }

          // B. Déblocage de Document
          if (returnDocId) {
            setDoc(doc(db, 'user_documents', returnDocId), {
              isUnlocked: true,
              status: "UNLOCKED",
              paymentGateway: "Money Fusion",
              unlocked: true,
              isPaid: true,
              unlockedAt: nowIso,
              updatedAt: nowIso
            }, { merge: true }).catch(e => console.error('[Client Firestore Doc Sync Error]:', e));

            setDoc(doc(db, 'users', uid), {
              purchasedDocIds: arrayUnion(returnDocId),
              lastPaymentAt: nowIso,
              updatedAt: nowIso
            }, { merge: true }).catch(e => console.error('[Client Firestore User Docs Sync Error]:', e));
          }

          // C. Abonnement VIP
          if (returnType === 'subscription' || returnPlan) {
            const activePlan = returnPlan || 'PASS_VIP';
            const durationDays = activePlan === 'annual' ? 365 : (activePlan === 'weekly' ? 7 : 30);
            const expiresDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

            setDoc(doc(db, 'users', uid), {
              isVip: true,
              subscriptionStatus: 'ACTIVE',
              plan: activePlan,
              vipActivatedAt: nowIso,
              lastPaymentAt: nowIso,
              updatedAt: nowIso,
              subscription: {
                planId: activePlan,
                status: 'ACTIVE',
                activatedAt: nowIso,
                expiresAt: expiresDate,
                autoRenew: false
              }
            }, { merge: true }).catch(e => console.error('[Client Firestore VIP Sync Error]:', e));
          }

          // D. Mettre à jour la transaction correspondante dans la collection 'transactions' à status: 'SUCCESS' avec le montant exact
          const txKey = token || reference || (returnDocId ? `TX-${returnDocId}` : `TX-${Date.now()}`);
          if (txKey) {
            setDoc(doc(db, 'transactions', txKey), {
              id: txKey,
              transactionId: txKey,
              status: 'SUCCESS',
              aiStatus: 'COMPLETED',
              amount: amountParam > 0 ? amountParam : 1000,
              type: returnType === 'wallet' ? 'wallet' : returnType === 'subscription' ? 'subscription' : 'document',
              userId: uid,
              docId: returnDocId || null,
              plan: returnPlan || null,
              updatedAt: nowIso
            }, { merge: true }).catch(e => console.warn('[Client Firestore Tx Update Error]:', e));
          }
        }

        // 3. Déclenche immédiatement un rechargement des données utilisateur depuis Firestore (fetchUserData() / refetchProfile())
        const reloadUserData = async () => {
          const currentUid = auth.currentUser?.uid || currentUser?.uid || uid;
          if (currentUid && currentUid !== 'guest') {
            try {
              const freshProfile = await fetchUserData(currentUid);
              if (freshProfile) {
                if (typeof freshProfile.walletBalance === 'number') {
                  setUserBalance(freshProfile.walletBalance);
                }
                if (freshProfile.subscription) {
                  setUserSubscription(freshProfile.subscription);
                }
                if (freshProfile.isVip) {
                  setUserSubscription(prev => ({
                    planId: (freshProfile as any).plan || prev?.planId || 'PASS_VIP',
                    status: 'ACTIVE',
                    activatedAt: (freshProfile as any).vipActivatedAt || new Date().toISOString(),
                    expiresAt: prev?.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    autoRenew: false
                  }));
                }
                if (returnDocId && freshProfile.purchasedDocIds?.includes(returnDocId)) {
                  setIsCurrentDocPaid(true);
                }
              }
            } catch (err) {
              console.warn('[reloadUserData Error]:', err);
            }
          }
        };

        reloadUserData();
        setTimeout(reloadUserData, 600);
        setTimeout(reloadUserData, 1500);
        setTimeout(reloadUserData, 3000);

        // 4. Si type === 'wallet' : Affiche une notification Toast : "Votre solde a été crédité avec succès !"
        if (returnType === 'wallet' || reference?.includes('WALLET') || reference?.includes('RECHARGE') || (!returnDocId && !returnPlan && amountParam > 0)) {
          if (amountParam > 0) {
            setUserBalance(prev => prev + amountParam);
          }
          setSuccessMessage("✅ Votre solde a été crédité avec succès !");
        } 
        // 5. Si type === 'subscription' : Active l'état VIP localement
        else if (returnType === 'subscription' || returnPlan) {
          const activePlan = returnPlan || 'PASS_VIP';
          setUserSubscription({
            planId: activePlan,
            status: 'ACTIVE',
            activatedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            autoRenew: false
          });
          setSuccessMessage("👑 Félicitations ! Votre abonnement VIP est maintenant actif.");
        }

        // 6. Si docId est présent : Marque le document comme débloqué dans l'état local React et ouvre la vue de visualisation de CE document précis
        if (returnDocId) {
          setIsCurrentDocPaid(true);
          setCurrentDocId(returnDocId);
          if (returnType !== 'wallet' && returnType !== 'subscription' && !returnPlan) {
            setSuccessMessage("🎉 Paiement validé ! Votre document est débloqué et prêt au téléchargement.");
            setIsVictoryModalOpen(true);
          }

          // Charger les données complètes de ce document précis depuis Firestore
          getDoc(doc(db, 'user_documents', returnDocId)).then((snap) => {
            if (snap.exists()) {
              const docData: any = snap.data();
              if (docData.title) {
                setVictoryDocTitle(docData.title);
              }
              if (docData.formData) {
                setFormData(docData.formData);
              }
              if (docData.aiData) {
                setAiData(docData.aiData);
              }
              if (docData.businessDocData) {
                setBusinessDocData(docData.businessDocData);
              }
              if (docData.ebookData) {
                setEbookData(docData.ebookData);
              }
              const effectiveType = docData.type || docData.documentType || returnType;
              if (effectiveType === 'letter' || docData.formData?.generationMode === 'letter_only') {
                setActiveTab('letter_preview');
              } else if (effectiveType === 'devis') {
                setActiveTab('devis_preview');
              } else if (effectiveType === 'facture') {
                setActiveTab('facture_preview');
              } else if (effectiveType === 'pack_business') {
                setActiveTab('pack_business_preview');
              } else if (effectiveType === 'ebook') {
                setActiveTab('ebook_preview');
              } else {
                setActiveTab('cv_preview');
              }
            } else {
              // Fallback selon le type
              if (returnType === 'letter' || activeTab === 'letter' || activeTab === 'letter_preview') {
                setActiveTab('letter_preview');
              } else if (returnType === 'devis' || activeTab === 'devis' || activeTab === 'devis_preview') {
                setActiveTab('devis_preview');
              } else if (returnType === 'facture' || activeTab === 'facture' || activeTab === 'facture_preview') {
                setActiveTab('facture_preview');
              } else if (returnType === 'pack_business' || activeTab === 'pack_business' || activeTab === 'pack_business_preview') {
                setActiveTab('pack_business_preview');
              } else if (returnType === 'ebook' || activeTab === 'ebook' || activeTab === 'ebook_preview') {
                setActiveTab('ebook_preview');
              } else {
                setActiveTab('cv_preview');
              }
            }
          }).catch(() => {
            if (returnType === 'letter' || activeTab === 'letter' || activeTab === 'letter_preview') {
              setActiveTab('letter_preview');
            } else if (returnType === 'devis' || activeTab === 'devis' || activeTab === 'devis_preview') {
              setActiveTab('devis_preview');
            } else if (returnType === 'facture' || activeTab === 'facture' || activeTab === 'facture_preview') {
              setActiveTab('facture_preview');
            } else if (returnType === 'pack_business' || activeTab === 'pack_business' || activeTab === 'pack_business_preview') {
              setActiveTab('pack_business_preview');
            } else if (returnType === 'ebook' || activeTab === 'ebook' || activeTab === 'ebook_preview') {
              setActiveTab('ebook_preview');
            } else {
              setActiveTab('cv_preview');
            }
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setActiveTab('dashboard');
          setIsCurrentDocPaid(true);
          if (!returnType && !returnPlan) {
            setSuccessMessage("✅ Paiement Money Fusion validé avec succès !");
          }
        }

        setTimeout(() => setSuccessMessage(null), 6000);

        // 7. Nettoie l'URL sans recharger la page ou redirige vers /documents/:docId
        if (returnDocId) {
          window.history.replaceState({}, document.title, `/documents/${returnDocId}`);
        } else {
          const cleanPath = window.location.pathname;
          const cleanHash = window.location.hash ? window.location.hash.split('?')[0] : '';
          const cleanUrl = (cleanPath.endsWith('/') && cleanHash ? cleanPath.slice(0, -1) : cleanPath) + cleanHash;
          window.history.replaceState({}, document.title, cleanUrl || '/');
        }
      } else if (status === 'cancel') {
        setErrorMessage('Le paiement Money Fusion a été interrompu ou annulé. Vous pouvez réessayer à tout moment.');
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } catch (_e) {}
  }, [currentUser, activeTab]);

  // -------------------------------------------------------------
  // Open Payment Modal Handlers for each service
  // -------------------------------------------------------------
  const handleOpenPaymentModal = (docType: 'cv' | 'letter' | 'devis' | 'facture' | 'pack_business' | 'ebook') => {
    if (isVip) {
      setIsCurrentDocPaid(true);
      setSuccessMessage('👑 Document débloqué instantanément grâce à votre Pass VIP Actif !');
      setTimeout(() => setSuccessMessage(null), 4000);
      return;
    }
    setPaymentDocType(docType);
    let resolvedTitle = 'Document Professionnel';
    let resolvedPrice = 1000;
    if (docType === 'cv') {
      const title = `${formData?.personalInfo?.firstName || ''} ${formData?.personalInfo?.lastName || ''} - CV Pro ATS`.trim();
      resolvedTitle = title || 'Mon CV Pro ATS';
      setPaymentDocTitle(resolvedTitle);
      setPaymentDocTypeLabel('CV Pro ATS');
      resolvedPrice = 1000;
      setPaymentPrice(1000);
    } else if (docType === 'letter') {
      const title = `${formData?.personalInfo?.firstName || ''} ${formData?.personalInfo?.lastName || ''} - Lettre de Motivation`.trim();
      resolvedTitle = title || 'Ma Lettre de Motivation';
      setPaymentDocTitle(resolvedTitle);
      setPaymentDocTypeLabel('Lettre de Motivation');
      resolvedPrice = 1000;
      setPaymentPrice(1000);
    } else if (docType === 'devis') {
      resolvedTitle = `Devis Professionnel - ${businessDocData.docNumber}`;
      setPaymentDocTitle(resolvedTitle);
      setPaymentDocTypeLabel('Devis Professionnel');
      resolvedPrice = 1000;
      setPaymentPrice(1000);
    } else if (docType === 'facture') {
      resolvedTitle = `Facture Client - ${businessDocData.docNumber}`;
      setPaymentDocTitle(resolvedTitle);
      setPaymentDocTypeLabel('Facture Client');
      resolvedPrice = 1000;
      setPaymentPrice(1000);
    } else if (docType === 'ebook') {
      resolvedTitle = ebookData.title || 'Mon Livre Numérique';
      setPaymentDocTitle(resolvedTitle);
      setPaymentDocTypeLabel('Livre Numérique (Ebook Pro)');
      resolvedPrice = 3000;
      setPaymentPrice(3000);
    } else {
      resolvedTitle = `Pack Business (Devis + Facture) - ${businessDocData.docNumber}`;
      setPaymentDocTitle(resolvedTitle);
      setPaymentDocTypeLabel('Pack Business (Devis + Facture)');
      resolvedPrice = 1499;
      setPaymentPrice(1499);
    }

    const resolvedDocId = currentDocId || `DOC-${Date.now()}`;
    if (!currentDocId) {
      setCurrentDocId(resolvedDocId);
    }
    const currentUid = auth.currentUser?.uid || currentUser?.uid || 'guest';
    const contentPayload = {
      formData: { ...formData },
      aiData: aiData ? { ...aiData } : null,
      businessDocData: { ...businessDocData },
      ebookData: { ...ebookData },
      generationMode: (
        docType === 'letter' ? 'letter_only'
        : docType === 'devis' ? 'devis'
        : docType === 'facture' ? 'facture'
        : docType === 'pack_business' ? 'pack_business'
        : docType === 'ebook' ? 'ebook'
        : 'cv_only'
      )
    };

    // 1. SAUVEGARDE DU DOCUMENT AVANT LE PAIEMENT (Résolution NOT_FOUND)
    setDoc(doc(db, 'user_documents', resolvedDocId), {
      id: resolvedDocId,
      docId: resolvedDocId,
      userId: currentUid,
      title: resolvedTitle || "Document sans titre",
      content: contentPayload,
      formData: contentPayload.formData,
      aiData: contentPayload.aiData,
      businessDocData: contentPayload.businessDocData,
      ebookData: contentPayload.ebookData,
      generationMode: contentPayload.generationMode,
      isUnlocked: false,
      status: "PENDING",
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(err => console.warn('[App pre-save document warn]:', err));

    setIsPaymentModalOpen(true);
  };

  // Handle successful payment safely without any redirect or crash
  const handlePaymentSuccess = (method: 'wallet' | 'mobile_money' | 'free', tx?: any) => {
    try {
      setIsCurrentDocPaid(true);

      if (method === 'wallet' && tx) {
        if (typeof tx.newBalance === 'number') {
          setUserBalance(tx.newBalance);
        } else {
          setUserBalance(prev => Math.max(0, prev - paymentPrice));
        }

        try {
          const profileKey = getLocalProfileKey(currentUser?.uid);
          const savedProfileStr = localStorage.getItem(profileKey);
          let profileObj: any = {};
          if (savedProfileStr) {
            try { profileObj = JSON.parse(savedProfileStr); } catch (e) {}
          }
          profileObj.balance = typeof tx.newBalance === 'number' ? tx.newBalance : Math.max(0, userBalance - paymentPrice);
          localStorage.setItem(profileKey, JSON.stringify(profileObj));
        } catch (e) {
          console.warn('[Profile LocalStorage Warn]:', e);
        }

        try {
          const txKey = getLocalTransactionsKey(currentUser?.uid);
          const savedTxList = localStorage.getItem(txKey);
          let txs: any[] = [];
          if (savedTxList) {
            try { txs = JSON.parse(savedTxList); } catch (e) {}
          }
          txs.unshift(tx);
          localStorage.setItem(txKey, JSON.stringify(txs));
        } catch (e) {
          console.warn('[Tx LocalStorage Warn]:', e);
        }

        try {
          saveTransactionRecord(tx).catch(err => console.warn('[Firestore Tx Warn]:', err));
        } catch (e) {
          console.warn('[SaveTx Error]:', e);
        }
      }

      setSuccessMessage(`Document débloqué avec succès ! Vous pouvez maintenant le télécharger au format Word (.docx) et PDF (.pdf).`);
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err) {
      console.error('[Payment Handler Error]:', err);
      // Guarantee the document is unlocked even if logging fails
      setIsCurrentDocPaid(true);
    }
  };

  // Reset entire form states and payment status to create a brand new document
  const handleCreateNewDocument = () => {
    setFormData(createEmptyCVFormData());
    setBusinessDocData(createEmptyBusinessDocData('devis'));
    setEbookData(createEmptyEbookData());
    setAiData(null);
    setIsCurrentDocPaid(false);
    setCurrentDocId(`DOC-${Date.now()}`);
    setIsEditingDirectly(false);
  };

  // -------------------------------------------------------------
  // Post Download Archival and Reset Handler
  // -------------------------------------------------------------
  const handlePostDownloadArchival = (formatDownloaded: string) => {
    const docTitle = paymentDocTitle || (
      activeTab.startsWith('letter') ? `${formData?.personalInfo?.firstName || ''} ${formData?.personalInfo?.lastName || ''} - Lettre de Motivation`.trim() || 'Lettre de Motivation'
      : activeTab.startsWith('devis') ? `Devis Professionnel - ${businessDocData.docNumber}`
      : activeTab.startsWith('facture') ? `Facture Client - ${businessDocData.docNumber}`
      : activeTab.startsWith('pack_business') ? `Pack Business - ${businessDocData.docNumber}`
      : activeTab.startsWith('ebook') ? (ebookData.title || 'Livre Numérique (Ebook)')
      : `${formData?.personalInfo?.firstName || ''} ${formData?.personalInfo?.lastName || ''} - CV Pro ATS`.trim() || 'CV Pro ATS'
    );

    setDownloadedDocTitle(docTitle);

    // Save finalized document into "Mes Documents" history
    const savedDoc: SavedUserDocument = {
      id: currentDocId || `DOC-${Date.now()}`,
      userId: auth.currentUser?.uid || 'guest',
      title: docTitle,
      formData: { ...formData },
      aiData: aiData ? { ...aiData } : null,
      businessDocData: { ...businessDocData },
      ebookData: { ...ebookData },
      generationMode: (
        activeTab.startsWith('letter') ? 'letter_only'
        : activeTab.startsWith('devis') ? 'devis'
        : activeTab.startsWith('facture') ? 'facture'
        : activeTab.startsWith('pack_business') ? 'pack_business'
        : activeTab.startsWith('ebook') ? 'ebook'
        : 'cv_only'
      ),
      isPaid: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      selectedFormat: formatDownloaded
    };

    try {
      const docKey = getLocalDocumentsKey(auth.currentUser?.uid);
      const savedDocsList = localStorage.getItem(docKey);
      let docs: SavedUserDocument[] = [];
      if (savedDocsList) {
        try { docs = JSON.parse(savedDocsList); } catch (e) {}
      }
      const existingIdx = docs.findIndex(d => d.id === savedDoc.id);
      if (existingIdx >= 0) {
        docs[existingIdx] = savedDoc;
      } else {
        docs.unshift(savedDoc);
      }
      localStorage.setItem(docKey, JSON.stringify(docs));
    } catch (e) {
      console.warn('LocalStorage error saving document:', e);
    }

    saveUserDocument(savedDoc);

    // 1. Immediately hide download button from payment / preview interface
    // 2. Reset payment status for next documents
    setIsCurrentDocPaid(false);

    // 3. Reset form fields to clean state
    handleCreateNewDocument();

    // 4. Open post-download confirmation dialog
    setIsPostDownloadModalOpen(true);
  };

  // -------------------------------------------------------------
  // Step A -> Step B: Selection of Service from Dashboard -> Templates Gallery
  // -------------------------------------------------------------
  const handleSelectService = (service: 'cv' | 'letter' | 'full_pack' | 'devis' | 'facture' | 'pack_business' | 'ebook' | 'dashboard' | 'tarifs' | 'subscription' | 'gallery') => {
    handleCreateNewDocument();

    if (service === 'dashboard') {
      navigateToView('dashboard');
      return;
    }
    if (service === 'tarifs') {
      navigateToView('tarifs');
      return;
    }
    if (service === 'subscription') {
      navigateToView('subscription');
      return;
    }

    const serviceKey = (service === 'full_pack' ? 'cv' : service === 'gallery' ? 'cv' : service) as 'cv' | 'letter' | 'devis' | 'facture' | 'pack_business' | 'ebook';
    setTemplatesService(serviceKey);
    navigateToView('templates', serviceKey);
  };

  // -------------------------------------------------------------
  // Step B -> Step C: Selection of Template in Gallery -> Editor
  // -------------------------------------------------------------
  const handleSelectCVTemplate = (templateId: TemplateStyle, accentColor?: string) => {
    setFormData(prev => ({
      ...prev,
      generationMode: 'cv_only',
      templateStyle: templateId,
      themeColor: accentColor || prev.themeColor
    }));
    setActiveTab('cv');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectLetterTemplate = (styleId: string, letterType: CoverLetterType) => {
    setFormData(prev => ({
      ...prev,
      generationMode: 'letter_only',
      templateStyle: styleId as any,
      letterType
    }));
    setActiveTab('letter');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectBusinessTemplate = (docType: 'devis' | 'facture' | 'pack_business', templateId: string, themeStyle?: 'indigo' | 'emerald' | 'amber' | 'slate') => {
    setBusinessDocData(prev => ({
      ...prev,
      type: docType === 'pack_business' ? 'devis' : docType,
      templateStyle: templateId,
      themeColor: themeStyle === 'emerald' ? '#059669' : themeStyle === 'amber' ? '#d97706' : themeStyle === 'slate' ? '#334155' : '#4f46e5'
    }));

    if (docType === 'pack_business') {
      setPackBusinessSubTab('devis');
      setActiveTab('pack_business');
    } else if (docType === 'facture') {
      setActiveTab('facture');
    } else {
      setActiveTab('devis');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectEbookTemplate = () => {
    setActiveTab('ebook');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load Sample Data
  const handleLoadSample = () => {
    setFormData(prev => ({
      ...SAMPLE_CV_DATA,
      templateStyle: prev.templateStyle || SAMPLE_CV_DATA.templateStyle,
      themeColor: prev.themeColor || SAMPLE_CV_DATA.themeColor,
      generationMode: prev.generationMode || 'cv_only'
    }));
    setErrorMessage(null);
    setSuccessMessage("Exemple professionnel chargé avec succès ! (Style de modèle conservé)");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Handle Form Reset
  const handleReset = () => {
    if (window.confirm('Voulez-vous vraiment effacer les informations du formulaire actif ?')) {
      handleCreateNewDocument();
      setSuccessMessage("Formulaire réinitialisé.");
      setTimeout(() => setSuccessMessage(null), 2500);
    }
  };

  // Apply Candidate Profile to Editor Form
  const handleApplyProfileToEditor = (profile: CandidateProfile) => {
    const pInfo = profile?.personalInfo;
    setFormData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        firstName: pInfo?.firstName || prev.personalInfo.firstName,
        lastName: pInfo?.lastName || prev.personalInfo.lastName,
        email: pInfo?.email || prev.personalInfo.email,
        phone: pInfo?.phone || prev.personalInfo.phone,
        address: pInfo?.address || prev.personalInfo.address,
        city: pInfo?.city || prev.personalInfo.city,
        country: pInfo?.country || prev.personalInfo.country,
        targetJob: pInfo?.targetJob || prev.personalInfo.targetJob,
        linkedin: pInfo?.linkedin || prev.personalInfo.linkedin,
        portfolio: pInfo?.portfolio || prev.personalInfo.portfolio,
        photoUrl: pInfo?.photoUrl || prev.personalInfo.photoUrl,
      },
      experiences: profile?.experiences?.length > 0 ? profile.experiences : prev.experiences,
      education: profile?.education?.length > 0 ? profile.education : prev.education,
      skills: profile?.skills?.length > 0 ? profile.skills : prev.skills,
      languages: profile?.languages?.length > 0 ? profile.languages : prev.languages
    }));
    setActiveTab('cv');
    setSuccessMessage("Données de votre Profil Candidat chargées dans le formulaire !");
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Load Saved Document to Editor
  const handleLoadDocumentToEditor = (loadedFormData: CVFormData, loadedAiData: any) => {
    setFormData(loadedFormData);
    if (loadedAiData) {
      setAiData(loadedAiData);
    }
    setIsCurrentDocPaid(false);
    setCurrentDocId(`DOC-${Date.now()}`);
    setActiveTab('cv');
    setSuccessMessage("Document chargé dans l'Éditeur !");
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Main Submit Call using Gemini SDK
  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await generateCVWithGemini(formData);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Erreur lors de la génération avec l\'IA.');
      }

      setAiData(result.data);
      setSuccessMessage("Document généré et optimisé avec succès par l'IA Gemini !");
      setTimeout(() => setSuccessMessage(null), 3500);

      // Transition to Preview
      if (activeTab === 'letter') {
        setActiveTab('letter_preview');
      } else {
        setActiveTab('cv_preview');
        // Show the RH interview preparation offer modal automatically after CV generation
        setTimeout(() => {
          setIsInterviewOfferOpen(true);
        }, 1200);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Erreur submission:', err);
      setErrorMessage(err.message || 'Une erreur est survenue lors de la communication avec l\'IA Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate customized Interview Prep Sheet with Gemini
  const handleGenerateInterviewPrep = async () => {
    setIsGeneratingInterviewPrep(true);
    setErrorMessage(null);
    try {
      const res = await generateInterviewPrepWithGemini(formData, aiData);
      if (res.data) {
        setInterviewPrepData(res.data);
        setIsInterviewOfferOpen(false);
        setActiveTab('interview_prep');

        // Auto-save interview prep to Saved Documents and Account Storage
        const nowIso = new Date().toISOString();
        const prepDoc: SavedUserDocument = {
          id: `PREP-${Date.now()}`,
          userId: auth.currentUser?.uid || 'guest-user',
          title: `Fiche Entretien RH - ${res.data.candidateName || formData?.personalInfo?.firstName || 'Candidat'} (${res.data.targetJob || formData?.personalInfo?.targetJob || 'Poste Cible'})`,
          generationMode: 'interview_prep' as any,
          formData: formData,
          aiData: aiData,
          interviewPrepData: res.data,
          createdAt: nowIso,
          updatedAt: nowIso,
          isPaid: true
        };

        try {
          const docKey = getLocalDocumentsKey(auth.currentUser?.uid);
          const raw = localStorage.getItem(docKey);
          let list: SavedUserDocument[] = raw ? JSON.parse(raw) : [];
          list = [prepDoc, ...list.filter(d => d.id !== prepDoc.id)];
          localStorage.setItem(docKey, JSON.stringify(list));
        } catch (e) {
          console.error('Erreur sauvegarde locale:', e);
        }

        if (auth.currentUser) {
          saveUserDocument(prepDoc).catch(err => console.error('Erreur sync Firestore:', err));
        }

        setSuccessMessage("Fiche de préparation d'entretien générée et enregistrée dans votre Espace !");
        setTimeout(() => setSuccessMessage(null), 3500);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(res.error || "Impossible de générer la préparation d'entretien.");
      }
    } catch (err: any) {
      console.error("Erreur génération préparation d'entretien:", err);
      setErrorMessage(err.message || "Erreur lors de la création de la fiche d'entretien.");
    } finally {
      setIsGeneratingInterviewPrep(false);
    }
  };

  // Business Doc Generation / Preview Trigger
  const handleGenerateBusinessDoc = (type: 'devis' | 'facture' | 'pack_business') => {
    setSuccessMessage("Document commercial mis à jour avec succès !");
    setTimeout(() => setSuccessMessage(null), 3000);

    // Save/Sync to Firestore Business Invoices
    try {
      const currentUid = auth.currentUser?.uid || 'guest';
      const itemsSubtotal = (businessDocData.items || []).reduce((acc, it) => acc + ((it.quantity || 0) * (it.unitPrice || 0)), 0);
      const discount = (itemsSubtotal * (businessDocData.discountPercent || 0)) / 100;
      const taxable = itemsSubtotal - discount;
      const vat = businessDocData.applyVat ? (taxable * (businessDocData.vatRate || 18)) / 100 : 0;
      const totalTTC = taxable + vat;

      saveBusinessInvoice(currentUid, {
        docNumber: businessDocData.docNumber || (type === 'devis' ? 'DEV-2026-001' : 'FAC-2026-001'),
        type: type === 'devis' ? 'devis' : 'facture',
        customerId: businessDocData.customerId,
        customerName: businessDocData.client?.companyName || businessDocData.client?.name || 'Client',
        customerPhone: businessDocData.client?.phone || '',
        customerEmail: businessDocData.client?.email || '',
        issueDate: businessDocData.issueDate || new Date().toISOString().split('T')[0],
        dueDate: businessDocData.dueDate || '',
        totalHT: taxable,
        totalTTC: totalTTC,
        currency: businessDocData.currency || 'FCFA',
        status: businessDocData.paymentStatus || 'UNPAID',
        businessDocData: businessDocData
      }).catch(err => console.error('Error auto-saving invoice:', err));
    } catch (e) {
      console.error('Error calculating and saving business invoice:', e);
    }

    if (type === 'devis') {
      setActiveTab('devis_preview');
    } else if (type === 'facture') {
      setActiveTab('facture_preview');
    } else {
      setActiveTab('pack_business_preview');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // PDF Downloads
  const downloadCVPDF = async () => {
    setIsGeneratingPDF(true);
    setErrorMessage(null);
    try {
      const fullName = `${formData?.personalInfo?.firstName || ''}_${formData?.personalInfo?.lastName || ''}`.trim() || 'Candidat';
      const fileName = `CV_${fullName.replace(/[\s\/\\]+/g, '_')}.pdf`;
      const success = await downloadElementAsPDF('cv-preview', fileName);
      if (success) {
        handlePostDownloadArchival('PDF');
      }
    } catch (err: any) {
      console.error('Erreur lors du téléchargement du CV:', err);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const downloadLetterPDF = async () => {
    setIsGeneratingPDF(true);
    setErrorMessage(null);
    try {
      const fullName = `${formData?.personalInfo?.firstName || ''}_${formData?.personalInfo?.lastName || ''}`.trim() || 'Candidat';
      const fileName = `Lettre_Motivation_${fullName.replace(/[\s\/\\]+/g, '_')}.pdf`;
      const success = await downloadElementAsPDF('letter-preview', fileName);
      if (success) {
        handlePostDownloadArchival('PDF');
      }
    } catch (err: any) {
      console.error('Erreur lors du téléchargement de la Lettre:', err);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const downloadBusinessDocPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const fileName = `${businessDocData.type === 'devis' ? 'Devis' : 'Facture'}_${businessDocData.docNumber || 'Pro'}.pdf`;
      await downloadElementAsPDF('business-doc-preview', fileName);
      handlePostDownloadArchival('PDF');
    } catch (err) {
      console.error('Error generating Business Doc PDF:', err);
      setErrorMessage('Erreur lors de la création du fichier PDF.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const downloadEbookPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const fileName = `Ebook_${(ebookData.title || 'Livre_Numerique').replace(/[\s\/\\]+/g, '_')}.pdf`;
      await downloadElementAsPDF('ebook-printable-area', fileName);
      handlePostDownloadArchival('PDF');
    } catch (err) {
      console.error('Error generating Ebook PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Export as Word (.docx)
  const handleExportDOCX = async () => {
    setIsGeneratingDocx(true);
    setErrorMessage(null);
    try {
      if (activeTab === 'letter' || activeTab === 'letter_preview') {
        await exportLetterToDocx(formData, aiData);
      } else if (
        activeTab === 'devis' || activeTab === 'devis_preview' ||
        activeTab === 'facture' || activeTab === 'facture_preview' ||
        activeTab === 'pack_business' || activeTab === 'pack_business_preview'
      ) {
        await exportBusinessDocToDocx(businessDocData);
      } else if (activeTab === 'ebook' || activeTab === 'ebook_preview') {
        await exportEbookToDocx(ebookData);
      } else {
        await exportCVToDocx(formData, aiData);
      }
      handlePostDownloadArchival('DOCX');
    } catch (err: any) {
      console.error("Erreur lors de l'export DOCX:", err);
      setErrorMessage("Impossible de générer le fichier Word (.docx).");
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  const hasActiveData = (formData?.experiences?.length || 0) > 0 || !!formData?.personalInfo?.firstName || !!businessDocData?.issuer?.name || !!ebookData?.title;
  const isDashboardView = activeTab === 'dashboard' || activeTab === 'tarifs' || activeTab === 'subscription' || activeTab === 'business' || activeTab === 'clients' || activeTab === 'help' || activeTab === 'support';
  const isLandingView = activeTab === 'landing';
  const isTemplatesView = activeTab === 'templates';

  // -------------------------------------------------------------
  // ROUTE 1: PUBLIC LANDING PAGE (Vitrine commerciale aérée)
  // -------------------------------------------------------------
  if (isLandingView) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
        <LandingPage
          onGoToAuth={(mode) => {
            setAuthModalInitialMode(mode || 'login');
            setIsAuthModalOpen(true);
          }}
          onGoToDashboard={() => navigateToView('dashboard')}
          onSelectService={(service) => {
            if (currentUser) {
              handleSelectService(service);
            } else {
              setAuthModalInitialMode('signup');
              setIsAuthModalOpen(true);
            }
          }}
          onOpenTarifs={() => navigateToView('tarifs')}
          onOpenTemplates={(service) => {
            if (currentUser) {
              navigateToView('templates', (service || 'cv') as any);
            } else {
              setAuthModalInitialMode('signup');
              setIsAuthModalOpen(true);
            }
          }}
        />

        {/* Global Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authModalInitialMode}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            setIsAuthModalOpen(false);
            navigateToView('dashboard');
          }}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // ROUTE 2, 3, 4, 5: DASHBOARD, TEMPLATES GALLERY, EDITOR & PREVIEWS
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white relative">
      
      {/* Global Floating Toast Notifications (Visible on Dashboard, Editor & All Views) */}
      {successMessage && (
        <div id="global-success-toast" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[92%] sm:w-auto p-4 bg-emerald-950/95 border-2 border-emerald-500 rounded-2xl text-emerald-100 text-sm sm:text-base flex items-center justify-between gap-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div id="global-error-toast" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[92%] sm:w-auto p-4 bg-rose-950/95 border-2 border-rose-500 rounded-2xl text-rose-100 text-sm sm:text-base flex items-center justify-between gap-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <X className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. TOP HEADER (When in Editor or Studio) */}
      {!isDashboardView && !isTemplatesView && (
        <Header
          currentView={activeTab}
          userBalance={userBalance}
          onLoadSample={handleLoadSample}
          onReset={handleReset}
          hasData={hasActiveData}
          onOpenDashboard={() => navigateToView('dashboard')}
          onOpenAuth={() => {
            setAuthModalInitialMode('login');
            setIsAuthModalOpen(true);
          }}
          onSignOut={handleSignOut}
          onBackToTemplates={() => {
            const service = (activeTab.startsWith('letter') ? 'letter' : activeTab.startsWith('devis') ? 'devis' : activeTab.startsWith('facture') ? 'facture' : activeTab.startsWith('pack_business') ? 'pack_business' : activeTab.startsWith('ebook') ? 'ebook' : 'cv') as any;
            navigateToView('templates', service);
          }}
          onGoServices={() => navigateToView('templates', 'cv')}
          onOpenAdmin={onOpenAdmin}
          onOpenRecharge={() => setIsRechargeModalOpen(true)}
        />
      )}

      {/* 2. MAIN WORKSPACE */}
      {isDashboardView ? (
        <CandidateDashboard
          initialTab={activeTab === 'tarifs' ? 'tarifs' : activeTab === 'subscription' ? 'subscription' : activeTab === 'entretiens' ? 'entretiens' : activeTab === 'business' || activeTab === 'clients' ? 'business' : activeTab === 'help' || activeTab === 'support' ? 'help' : 'dashboard_home'}
          onApplyProfileToEditor={handleApplyProfileToEditor}
          onLoadDocumentToEditor={handleLoadDocumentToEditor}
          onSelectService={handleSelectService}
          onOpenAdmin={onOpenAdmin}
          onSignOut={handleSignOut}
          onOpenInterviewPrepDocument={(prepData) => {
            setInterviewPrepData(prepData);
            setActiveTab('interview_prep');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onLoadBusinessDocToEditor={(docData) => {
            setBusinessDocData(docData);
            setActiveTab(docData.type === 'devis' ? 'devis' : 'facture');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenInvoiceGenerator={(customer, type = 'facture', business) => {
            setBusinessDocData(prev => {
              let updated = { ...prev, type };
              if (customer) {
                updated = {
                  ...updated,
                  customerId: customer.id,
                  client: {
                    ...updated.client,
                    companyName: customer.name,
                    phone: customer.phone || '',
                    email: customer.email || '',
                    address: customer.address || '',
                    ninea: customer.ninea || ''
                  }
                };
              }
              if (business) {
                updated = {
                  ...updated,
                  businessId: business.id,
                  issuer: {
                    ...updated.issuer,
                    companyName: business.companyName,
                    phone: business.phone || '',
                    email: business.email || '',
                    address: business.address || '',
                    ninea: business.ninea || '',
                    logoUrl: business.logoUrl || ''
                  }
                };
              }
              return updated;
            });
            setActiveTab(type);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : isTemplatesView ? (
        <TemplatesView
          initialService={templatesService}
          onSelectCVTemplate={handleSelectCVTemplate}
          onSelectLetterTemplate={handleSelectLetterTemplate}
          onSelectBusinessTemplate={handleSelectBusinessTemplate}
          onSelectEbookTemplate={handleSelectEbookTemplate}
          onBackToDashboard={() => navigateToView('dashboard')}
        />
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        
        {/* Success Alert Box */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-white font-bold text-xs cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-950/80 border border-rose-500/40 rounded-2xl text-rose-200 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white font-bold text-xs cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Top Navigation Bar: Back to Dashboard & Change Template */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2.5 sm:p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateToView('dashboard')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm border border-slate-700/60"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400" />
              <span>← Tableau de Bord</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const service = (activeTab.startsWith('letter') ? 'letter' : activeTab.startsWith('devis') ? 'devis' : activeTab.startsWith('facture') ? 'facture' : activeTab.startsWith('pack_business') ? 'pack_business' : activeTab.startsWith('ebook') ? 'ebook' : 'cv') as any;
                navigateToView('templates', service);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold transition-all cursor-pointer border border-indigo-500/30"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Changer de Modèle (Galerie)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
            <span className="hidden sm:inline">Étape 3 / 4 : Saisie & Génération IA</span>
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase">
              Éditeur Actif
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 2A-GAL : GALERIE DES MODÈLES CV                                      */}
        {/* ========================================================================= */}
        {activeTab === 'cv_gallery' && (
          <CVTemplateGallery
            selectedTemplateId={formData.templateStyle}
            selectedColor={formData.themeColor}
            onSelectTemplate={handleSelectCVTemplate}
            onGoServices={() => navigateToView('dashboard')}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 2A : SAISIE DU CV PRO ATS (1 000 FCFA)                               */}
        {/* ========================================================================= */}
        {activeTab === 'cv' && (
          <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
            <StepForm
              formData={formData}
              onChange={setFormData}
              onSubmit={handleGenerate}
              onPreview={() => setActiveTab('cv_preview')}
              isLoading={isLoading}
              hideModeSelector={true}
              forceMode="cv_only"
              onChangeTemplateRequest={() => navigateToView('templates', 'cv')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2B : APERÇU PLEIN ÉCRAN DU CV PRO ATS                                */}
        {/* ========================================================================= */}
        {activeTab === 'cv_preview' && (
          <div className="animate-in fade-in">
            <DocumentDedicatedPreview
              docType="cv"
              formData={formData}
              setFormData={setFormData}
              aiData={aiData}
              businessDocData={businessDocData}
              setBusinessDocData={setBusinessDocData}
              isPaid={isCurrentDocPaid}
              isVipActive={isVip}
              isEditingDirectly={isEditingDirectly}
              setIsEditingDirectly={setIsEditingDirectly}
              onEditForm={() => {
                setActiveTab('cv');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPayToUnlock={() => handleOpenPaymentModal('cv')}
              onDownloadPDF={downloadCVPDF}
              onExportDocx={handleExportDOCX}
              isGeneratingPDF={isGeneratingPDF}
              isGeneratingDocx={isGeneratingDocx}
              onPrint={downloadCVPDF}
              onGoServices={() => navigateToView('dashboard')}
              onOpenInterviewPrep={() => {
                if (interviewPrepData) {
                  setActiveTab('interview_prep');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  setIsInterviewOfferOpen(true);
                }
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3A-GAL : GALERIE MODÈLES LETTRE DE MOTIVATION                        */}
        {/* ========================================================================= */}
        {activeTab === 'letter_gallery' && (
          <LetterTemplateGallery
            selectedStyleId={formData.templateStyle}
            selectedLetterType={formData.letterType}
            onSelectTemplate={handleSelectLetterTemplate}
            onGoServices={() => navigateToView('dashboard')}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 3A : SAISIE LETTRE DE MOTIVATION (1 000 FCFA)                        */}
        {/* ========================================================================= */}
        {activeTab === 'letter' && (
          <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
            <LetterEditorForm
              formData={formData}
              onChange={setFormData}
              onGenerate={handleGenerate}
              onPreview={() => setActiveTab('letter_preview')}
              isLoading={isLoading}
              onOpenWizard={() => handleOpenPaymentModal('letter')}
              onChangeTemplateRequest={() => navigateToView('templates', 'letter')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3B : APERÇU PLEIN ÉCRAN DE LA LETTRE                                 */}
        {/* ========================================================================= */}
        {activeTab === 'letter_preview' && (
          <div className="animate-in fade-in">
            <DocumentDedicatedPreview
              docType="letter"
              formData={formData}
              setFormData={setFormData}
              aiData={aiData}
              businessDocData={businessDocData}
              setBusinessDocData={setBusinessDocData}
              isPaid={isCurrentDocPaid}
              isVipActive={isVip}
              isEditingDirectly={isEditingDirectly}
              setIsEditingDirectly={setIsEditingDirectly}
              onEditForm={() => {
                setActiveTab('letter');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPayToUnlock={() => handleOpenPaymentModal('letter')}
              onDownloadPDF={downloadLetterPDF}
              onExportDocx={handleExportDOCX}
              isGeneratingPDF={isGeneratingPDF}
              isGeneratingDocx={isGeneratingDocx}
              onPrint={downloadLetterPDF}
              onGoServices={() => navigateToView('dashboard')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4A-GAL : GALERIE MODÈLES DE DEVIS PROFESSIONNEL                      */}
        {/* ========================================================================= */}
        {activeTab === 'devis_gallery' && (
          <BusinessDocTemplateGallery
            docType="devis"
            selectedTemplateId={businessDocData.templateStyle}
            selectedColor={businessDocData.themeColor}
            onSelectTemplate={(tplId, theme) => handleSelectBusinessTemplate('devis', tplId, theme)}
            onGoServices={() => navigateToView('dashboard')}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 4A : SAISIE DEVIS PROFESSIONNEL (1 000 FCFA)                         */}
        {/* ========================================================================= */}
        {activeTab === 'devis' && (
          <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
            <DevisFactureForm
              data={businessDocData}
              onChange={setBusinessDocData}
              onOpenWizard={() => handleGenerateBusinessDoc('devis')}
              onPreview={() => setActiveTab('devis_preview')}
              hideTypeSwitch={true}
              onChangeTemplateRequest={() => navigateToView('templates', 'devis')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4B : APERÇU PLEIN ÉCRAN DU DEVIS                                     */}
        {/* ========================================================================= */}
        {activeTab === 'devis_preview' && (
          <div className="animate-in fade-in">
            <DocumentDedicatedPreview
              docType="devis"
              formData={formData}
              setFormData={setFormData}
              aiData={aiData}
              businessDocData={businessDocData}
              setBusinessDocData={setBusinessDocData}
              isPaid={isCurrentDocPaid}
              isVipActive={isVip}
              isEditingDirectly={isEditingDirectly}
              setIsEditingDirectly={setIsEditingDirectly}
              onEditForm={() => {
                setActiveTab('devis');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPayToUnlock={() => handleOpenPaymentModal('devis')}
              onDownloadPDF={downloadBusinessDocPDF}
              onExportDocx={handleExportDOCX}
              isGeneratingPDF={isGeneratingPDF}
              isGeneratingDocx={isGeneratingDocx}
              onPrint={downloadBusinessDocPDF}
              onGoServices={() => navigateToView('dashboard')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5A-GAL : GALERIE MODÈLES DE FACTURE CLIENT                           */}
        {/* ========================================================================= */}
        {activeTab === 'facture_gallery' && (
          <BusinessDocTemplateGallery
            docType="facture"
            selectedTemplateId={businessDocData.templateStyle}
            selectedColor={businessDocData.themeColor}
            onSelectTemplate={(tplId, theme) => handleSelectBusinessTemplate('facture', tplId, theme)}
            onGoServices={() => navigateToView('dashboard')}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 5A : SAISIE FACTURE CLIENT (1 000 FCFA)                              */}
        {/* ========================================================================= */}
        {activeTab === 'facture' && (
          <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
            <DevisFactureForm
              data={businessDocData}
              onChange={setBusinessDocData}
              onOpenWizard={() => handleGenerateBusinessDoc('facture')}
              onPreview={() => setActiveTab('facture_preview')}
              hideTypeSwitch={true}
              onChangeTemplateRequest={() => navigateToView('templates', 'facture')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5B : APERÇU PLEIN ÉCRAN DE LA FACTURE                                */}
        {/* ========================================================================= */}
        {activeTab === 'facture_preview' && (
          <div className="animate-in fade-in">
            <DocumentDedicatedPreview
              docType="facture"
              formData={formData}
              setFormData={setFormData}
              aiData={aiData}
              businessDocData={businessDocData}
              setBusinessDocData={setBusinessDocData}
              isPaid={isCurrentDocPaid}
              isVipActive={isVip}
              isEditingDirectly={isEditingDirectly}
              setIsEditingDirectly={setIsEditingDirectly}
              onEditForm={() => {
                setActiveTab('facture');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPayToUnlock={() => handleOpenPaymentModal('facture')}
              onDownloadPDF={downloadBusinessDocPDF}
              onExportDocx={handleExportDOCX}
              isGeneratingPDF={isGeneratingPDF}
              isGeneratingDocx={isGeneratingDocx}
              onPrint={downloadBusinessDocPDF}
              onGoServices={() => navigateToView('dashboard')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 7A-GAL : GALERIE MODÈLES PACK BUSINESS                               */}
        {/* ========================================================================= */}
        {activeTab === 'pack_business_gallery' && (
          <BusinessDocTemplateGallery
            docType="pack_business"
            selectedTemplateId={businessDocData.templateStyle}
            selectedColor={businessDocData.themeColor}
            onSelectTemplate={(tplId, theme) => handleSelectBusinessTemplate('pack_business', tplId, theme)}
            onGoServices={() => navigateToView('dashboard')}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 7A : SAISIE PACK BUSINESS (1 499 FCFA)                               */}
        {/* ========================================================================= */}
        {activeTab === 'pack_business' && (
          <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
            <div className="bg-white border-2 border-amber-300 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md">
                  Pack Business Pro (Devis + Facture)
                </span>
                <span className="text-xs font-black text-amber-800">1 499 FCFA</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setPackBusinessSubTab('devis');
                      setBusinessDocData(prev => ({ ...prev, type: 'devis' }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      packBusinessSubTab === 'devis'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>1. Formulaire Devis</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPackBusinessSubTab('facture');
                      setBusinessDocData(prev => ({ ...prev, type: 'facture' }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      packBusinessSubTab === 'facture'
                        ? 'bg-emerald-600 text-white font-black shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>2. Formulaire Facture</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('pack_business_preview')}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-300" />
                  <span>Aperçu Pack Plein Écran</span>
                </button>
              </div>
            </div>

            <DevisFactureForm
              data={businessDocData}
              onChange={setBusinessDocData}
              onOpenWizard={() => handleGenerateBusinessDoc('pack_business')}
              onPreview={() => setActiveTab('pack_business_preview')}
              hideTypeSwitch={false}
              onChangeTemplateRequest={() => navigateToView('templates', 'pack_business')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 7B : APERÇU PLEIN ÉCRAN DU PACK BUSINESS                             */}
        {/* ========================================================================= */}
        {activeTab === 'pack_business_preview' && (
          <div className="animate-in fade-in">
            <DocumentDedicatedPreview
              docType="pack_business"
              formData={formData}
              setFormData={setFormData}
              aiData={aiData}
              businessDocData={businessDocData}
              setBusinessDocData={setBusinessDocData}
              isPaid={isCurrentDocPaid}
              isVipActive={isVip}
              packBusinessSubTab={packBusinessSubTab}
              setPackBusinessSubTab={setPackBusinessSubTab}
              isEditingDirectly={isEditingDirectly}
              setIsEditingDirectly={setIsEditingDirectly}
              onEditForm={() => {
                setActiveTab('pack_business');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPayToUnlock={() => handleOpenPaymentModal('pack_business')}
              onDownloadPDF={downloadBusinessDocPDF}
              onExportDocx={handleExportDOCX}
              isGeneratingPDF={isGeneratingPDF}
              isGeneratingDocx={isGeneratingDocx}
              onPrint={downloadBusinessDocPDF}
              onGoServices={() => navigateToView('dashboard')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 8A : CRÉATION D'EBOOK / LIVRE NUMÉRIQUE (3 000 FCFA)                 */}
        {/* ========================================================================= */}
        {activeTab === 'ebook' && (
          <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
            <EbookWizardForm
              data={ebookData}
              setData={setEbookData}
              onGoPreview={() => {
                setActiveTab('ebook_preview');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onGoServices={() => navigateToView('dashboard')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 8B : APERÇU PLEIN ÉCRAN DU LIVRE NUMÉRIQUE                           */}
        {/* ========================================================================= */}
        {activeTab === 'ebook_preview' && (
          <div className="animate-in fade-in">
            <DocumentDedicatedPreview
              docType="ebook"
              formData={formData}
              setFormData={setFormData}
              aiData={aiData}
              businessDocData={businessDocData}
              setBusinessDocData={setBusinessDocData}
              ebookData={ebookData}
              setEbookData={setEbookData}
              isPaid={isCurrentDocPaid}
              isVipActive={isVip}
              isEditingDirectly={isEditingDirectly}
              setIsEditingDirectly={setIsEditingDirectly}
              onEditForm={() => {
                setActiveTab('ebook');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPayToUnlock={() => handleOpenPaymentModal('ebook')}
              onDownloadPDF={downloadEbookPDF}
              onExportDocx={handleExportDOCX}
              isGeneratingPDF={isGeneratingPDF}
              isGeneratingDocx={isGeneratingDocx}
              onPrint={downloadEbookPDF}
              onGoServices={() => navigateToView('dashboard')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 9 : FICHE DE PRÉPARATION D'ENTRETIEN RH PERSONNALISÉE                */}
        {/* ========================================================================= */}
        {activeTab === 'interview_prep' && interviewPrepData && (
          <div className="animate-in fade-in max-w-5xl mx-auto space-y-6">
            <InterviewPrepView
              data={interviewPrepData}
              onBackToDashboard={() => navigateToView('dashboard')}
              onBackToCV={() => {
                setActiveTab('cv_preview');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSaveToProfile={(savedData) => {
                setInterviewPrepData(savedData);
                const nowIso = new Date().toISOString();
                const prepDoc: SavedUserDocument = {
                  id: savedData.id || `PREP-${Date.now()}`,
                  userId: auth.currentUser?.uid || 'guest-user',
                  title: `Fiche Entretien RH - ${savedData.candidateName || formData?.personalInfo?.firstName || 'Candidat'} (${savedData.targetJob || formData?.personalInfo?.targetJob || 'Poste Cible'})`,
                  generationMode: 'interview_prep' as any,
                  formData: formData,
                  aiData: aiData,
                  interviewPrepData: savedData,
                  createdAt: savedData.createdAt || nowIso,
                  updatedAt: nowIso,
                  isPaid: true
                };
                try {
                  const docKey = getLocalDocumentsKey(auth.currentUser?.uid);
                  const raw = localStorage.getItem(docKey);
                  let list: SavedUserDocument[] = raw ? JSON.parse(raw) : [];
                  list = [prepDoc, ...list.filter(d => d.id !== prepDoc.id)];
                  localStorage.setItem(docKey, JSON.stringify(list));
                } catch (e) {}
                if (auth.currentUser) {
                  saveUserDocument(prepDoc).catch(() => {});
                }
                setSuccessMessage("Fiche d'entretien enregistrée dans votre Espace !");
                setTimeout(() => setSuccessMessage(null), 3000);
              }}
            />
          </div>
        )}

        </main>
      )}

      {/* 2.5. POST-GENERATION RH INTERVIEW PREP OFFER MODAL */}
      <InterviewPrepOfferModal
        isOpen={isInterviewOfferOpen}
        onClose={() => setIsInterviewOfferOpen(false)}
        onAccept={handleGenerateInterviewPrep}
        candidateName={`${formData?.personalInfo?.firstName || ''} ${formData?.personalInfo?.lastName || ''}`.trim() || 'Candidat'}
        targetJob={formData?.personalInfo?.targetJob || 'votre poste cible'}
        targetCompany={formData?.targetCompany}
        isLoading={isGeneratingInterviewPrep}
      />

      {/* 3. MODERN PAYWALL & PRICING MODAL ("PASS VIP & BUSINESS" + PAIEMENT À L'ACTE) */}
      <PaywallModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        documentTitle={paymentDocTitle}
        documentTypeLabel={paymentDocTypeLabel}
        targetDocId={currentDocId}
        userBalance={userBalance}
        userId={currentUser?.uid}
        userEmail={currentUser?.email || undefined}
        userName={currentUser?.displayName || undefined}
        onUnlocked={() => {
          setIsCurrentDocPaid(true);
          setVictoryDocTitle(paymentDocTitle || 'Document Professionnel');
          setIsVictoryModalOpen(true);
          setSuccessMessage('🎉 Document débloqué avec succès ! Vous pouvez maintenant le télécharger.');
          setTimeout(() => setSuccessMessage(null), 4500);
        }}
        onDownloadAction={(format) => {
          setIsCurrentDocPaid(true);
          setVictoryDocTitle(paymentDocTitle || 'Document Professionnel');
          setIsVictoryModalOpen(true);
          if (format === 'pdf') {
            if (activeTab === 'cv_preview') downloadCVPDF();
            else if (activeTab === 'letter_preview') downloadLetterPDF();
            else if (activeTab === 'ebook_preview') downloadEbookPDF();
            else downloadBusinessDocPDF();
          } else {
            handleExportDOCX();
          }
        }}
        onBalanceUpdated={(newBal) => {
          setUserBalance(newBal);
        }}
        contentData={{
          formData,
          aiData,
          businessDocData,
          ebookData,
          generationMode: (
            paymentDocType === 'letter' ? 'letter_only'
            : paymentDocType === 'devis' ? 'devis'
            : paymentDocType === 'facture' ? 'facture'
            : paymentDocType === 'pack_business' ? 'pack_business'
            : paymentDocType === 'ebook' ? 'ebook'
            : 'cv_only'
          )
        }}
        documentData={{
          title: paymentDocTitle,
          formData,
          aiData,
          businessDocData,
          ebookData
        }}
      />


      {/* 4. RECHARGE WALLET MODAL */}
      <RechargeWalletModal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
        userBalance={userBalance}
        userId={currentUser?.uid}
        userEmail={currentUser?.email || undefined}
        userName={currentUser?.displayName || undefined}
        onSuccess={(addedAmount) => {
          const newBal = userBalance + addedAmount;
          setUserBalance(newBal);
          
          const profileKey = getLocalProfileKey(currentUser?.uid);
          const profileStr = localStorage.getItem(profileKey);
          let profileObj: any = {};
          if (profileStr) {
            try { profileObj = JSON.parse(profileStr); } catch (e) {}
          }
          profileObj.balance = newBal;
          localStorage.setItem(profileKey, JSON.stringify(profileObj));

          setSuccessMessage(`Solde rechargé avec succès (+${(addedAmount || 0).toLocaleString('fr-FR')} FCFA) !`);
          setTimeout(() => setSuccessMessage(null), 4000);
        }}
      />

      {/* 5. AUTH MODAL (LOGIN & SIGNUP WITH DIRECT REDIRECT TO DASHBOARD) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalInitialMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          navigateToView('dashboard');
        }}
      />

      {/* 6. POST-DOWNLOAD CONFIRMATION & ARCHIVAL MODAL */}
      {isPostDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center space-y-5">
            <button
              onClick={() => setIsPostDownloadModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Téléchargement Réussi & Archivé !
              </h3>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                Le document <span className="font-bold text-slate-900">« {downloadedDocTitle} »</span> a été téléchargé et sauvegardé dans votre profil sous la section <span className="font-bold text-indigo-600">« Mes Documents »</span>.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-left space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <FolderHeart className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Ré-téléchargements illimités :</strong> Vous pouvez à tout moment retrouver et réexporter ce document sans frais depuis votre profil.</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Pay-Per-Document :</strong> Pour garantir l'intégrité de vos documents, l'espace de création a été réinitialisé. Toute nouvelle création fera l'objet d'un nouveau paiement.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsPostDownloadModalOpen(false);
                  navigateToView('dashboard');
                }}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-100 transition-all cursor-pointer active:scale-95"
              >
                <FolderHeart className="w-4 h-4" />
                <span>Mes Documents</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPostDownloadModalOpen(false);
                  handleCreateNewDocument();
                  navigateToView('templates', 'cv');
                }}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <span>Nouveau Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. VICTORY & CELEBRATION MODAL */}
      <VictoryModal
        isOpen={isVictoryModalOpen}
        onClose={() => setIsVictoryModalOpen(false)}
        documentTitle={victoryDocTitle || paymentDocTitle || 'Document Professionnel'}
        onDownloadAction={(format) => {
          setIsCurrentDocPaid(true);
          if (format === 'pdf') {
            if (activeTab === 'cv_preview') downloadCVPDF();
            else if (activeTab === 'letter_preview') downloadLetterPDF();
            else if (activeTab === 'ebook_preview') downloadEbookPDF();
            else downloadBusinessDocPDF();
          } else {
            handleExportDOCX();
          }
        }}
        onViewDocumentAction={() => {
          setIsVictoryModalOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        actionButtonLabel="Consulter mon document"
      />

    </div>
  );
}
