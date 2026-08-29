import React, { useState, useEffect } from 'react';
import { 
  User, FileText, CreditCard, Sparkles, Plus, Trash2, Edit3, Save, 
  CheckCircle2, Download, Eye, ExternalLink, RefreshCw, AlertCircle, 
  Briefcase, GraduationCap, Award, Globe, Phone, Mail, MapPin, Linkedin, 
  Check, ArrowRight, ShieldCheck, Zap, X, Wallet, History, Menu, Crown,
  Search, Filter, Wand2, Receipt, BookOpen, Clock, Package, UserCircle2, FileCheck, LogOut, BookmarkCheck
} from 'lucide-react';
import { 
  CandidateProfile, SavedUserDocument, CVFormData, Experience, Education, 
  SkillCategory, Language, PersonalInfo, TransactionRecord, UserSubscription,
  InterviewPrepData
} from '../types';
import { 
  fetchUserProfile, saveCandidateProfile, fetchUserDocuments, 
  deleteUserDocument, fetchUserOrders, saveOrderRecord, OrderRecord,
  saveTransactionRecord, fetchUserTransactions
} from '../lib/firebase';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { DokyaSidebar, SidebarTab, calculateProfileCompletion } from './DokyaSidebar';
import { PricingOffersView } from './PricingOffersView';
import { MySubscriptionView } from './MySubscriptionView';
import { SubscriptionModal } from './SubscriptionModal';
import { RechargeWalletModal } from './RechargeWalletModal';
import { PaymentModal } from './PaymentModal';
import { downloadElementAsPDF } from '../lib/pdfUtils';
import { exportCVToDocx, exportLetterToDocx, exportBusinessDocToDocx, exportEbookToDocx } from '../lib/exportUtils';
import { CVTemplate } from './CVTemplate';
import { CoverLetterTemplate } from './CoverLetterTemplate';
import { DevisFactureTemplate } from './DevisFactureTemplate';
import { EbookTemplate } from './EbookTemplate';
import { isAdminEmail } from '../lib/adminAuth';

interface CandidateDashboardProps {
  onLoadDocumentToEditor: (formData: CVFormData, aiData: any) => void;
  onApplyProfileToEditor: (profile: CandidateProfile) => void;
  onSelectService?: (service: 'cv' | 'letter' | 'full_pack' | 'devis' | 'facture' | 'pack_business' | 'ebook' | 'gallery') => void;
  onClose?: () => void;
  onOpenAdmin?: () => void;
  onSignOut?: () => void;
  initialTab?: SidebarTab | string;
  onOpenInterviewPrepDocument?: (prepData: InterviewPrepData) => void;
}

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  onLoadDocumentToEditor,
  onApplyProfileToEditor,
  onSelectService,
  onClose,
  onOpenAdmin,
  onSignOut,
  initialTab = 'dashboard_home',
  onOpenInterviewPrepDocument
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab | string>(initialTab);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Recharge, Payment & Subscription Modals
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [downloadPaymentDoc, setDownloadPaymentDoc] = useState<SavedUserDocument | null>(null);
  const [subscriptionModalConfig, setSubscriptionModalConfig] = useState<{
    isOpen: boolean;
    planId: 'weekly' | 'monthly' | 'annual';
    planTitle: string;
    price: number;
  }>({
    isOpen: false,
    planId: 'monthly',
    planTitle: 'Pass VIP Mensuel',
    price: 5000
  });

  // Filter & Search state for Documents tab
  const [docFilterType, setDocFilterType] = useState<string>('all');
  const [docSearchQuery, setDocSearchQuery] = useState<string>('');

  // Profile state
  const [profile, setProfile] = useState<CandidateProfile>(() => {
    const saved = localStorage.getItem('senegal_cv_user_profile');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (typeof parsed.balance !== 'number') parsed.balance = 3000;
        if (!parsed.personalInfo) {
          parsed.personalInfo = {
            firstName: '',
            lastName: '',
            email: parsed.email || user?.email || '',
            phone: '',
            address: '',
            city: 'Dakar',
            country: 'Sénégal',
            targetJob: '',
            linkedin: '',
            portfolio: ''
          };
        }
        if (!parsed.experiences) parsed.experiences = [];
        if (!parsed.education) parsed.education = [];
        if (!parsed.skills) parsed.skills = [];
        if (!parsed.languages) parsed.languages = [];
        return parsed;
      } catch (e) { /* ignore */ }
    }
    return {
      uid: user?.uid || 'guest',
      email: user?.email || '',
      personalInfo: {
        firstName: '',
        lastName: '',
        email: user?.email || '',
        phone: '',
        address: '',
        city: 'Dakar',
        country: 'Sénégal',
        targetJob: '',
        linkedin: '',
        portfolio: ''
      },
      experiences: [],
      education: [],
      skills: [{ category: 'Compétences Principales', skills: ['Gestion de projet', 'Analyse de données'] }],
      languages: [{ name: 'Français', level: 'Bilingue / Maternelle' }],
      credits: 2,
      balance: 3000,
      subscriptionStatus: 'free',
      updatedAt: new Date().toISOString()
    };
  });

  // Saved documents
  const [documents, setDocuments] = useState<SavedUserDocument[]>(() => {
    const saved = localStorage.getItem('senegal_cv_saved_documents');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [];
  });

  // Transactions History
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => {
    const saved = localStorage.getItem('senegal_cv_transactions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      {
        id: 'TX-INIT-001',
        userId: user?.uid || 'guest',
        type: 'recharge',
        amount: 3000,
        currency: 'XOF',
        description: 'Offre de bienvenue - Solde Initial Dokya Wallet',
        status: 'success',
        createdAt: new Date().toISOString(),
        paymentMethod: 'wallet',
        newBalance: 3000
      }
    ];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preview Document Modal
  const [previewDoc, setPreviewDoc] = useState<SavedUserDocument | null>(null);
  const [previewTab, setPreviewTab] = useState<'cv' | 'letter'>('cv');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Listen to auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setIsLoading(true);
        try {
          const remoteProfile = await fetchUserProfile(u.uid);
          if (remoteProfile) {
            const mergedProfile = {
              ...remoteProfile,
              personalInfo: {
                firstName: '',
                lastName: '',
                email: u.email || '',
                phone: '',
                address: '',
                city: 'Dakar',
                country: 'Sénégal',
                targetJob: '',
                linkedin: '',
                portfolio: '',
                ...(remoteProfile.personalInfo || {})
              },
              experiences: remoteProfile.experiences || [],
              education: remoteProfile.education || [],
              skills: remoteProfile.skills || [],
              languages: remoteProfile.languages || [],
              balance: typeof remoteProfile.balance === 'number' ? remoteProfile.balance : 3000
            };
            setProfile(mergedProfile);
            localStorage.setItem('senegal_cv_user_profile', JSON.stringify(mergedProfile));
          }

          const remoteDocs = await fetchUserDocuments(u.uid);
          if (remoteDocs && remoteDocs.length > 0) {
            setDocuments(remoteDocs);
            localStorage.setItem('senegal_cv_saved_documents', JSON.stringify(remoteDocs));
          }

          const remoteTxs = await fetchUserTransactions(u.uid);
          if (remoteTxs && remoteTxs.length > 0) {
            setTransactions(remoteTxs);
            localStorage.setItem('senegal_cv_transactions', JSON.stringify(remoteTxs));
          }
        } catch (e) {
          console.warn('Dashboard sync error:', e);
        } finally {
          setIsLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle Tab Selection from Sidebar
  const handleSelectTab = (tab: SidebarTab | string) => {
    if (tab === 'gen_cv') {
      if (onSelectService) onSelectService('cv');
      else onApplyProfileToEditor(profile);
      return;
    }
    if (tab === 'gen_letter') {
      if (onSelectService) onSelectService('letter');
      return;
    }
    if (tab === 'gen_business') {
      if (onSelectService) onSelectService('devis');
      return;
    }
    if (tab === 'gen_ebook') {
      if (onSelectService) onSelectService('ebook');
      return;
    }

    setActiveSidebarTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle wallet recharge completion
  const handleRechargeSuccess = async (addedAmount: number, tx: TransactionRecord) => {
    const newBalance = (profile.balance ?? 0) + addedAmount;
    const updatedProfile: CandidateProfile = {
      ...profile,
      balance: newBalance,
      updatedAt: new Date().toISOString()
    };
    setProfile(updatedProfile);
    localStorage.setItem('senegal_cv_user_profile', JSON.stringify(updatedProfile));

    const updatedTxs = [tx, ...transactions];
    setTransactions(updatedTxs);
    localStorage.setItem('senegal_cv_transactions', JSON.stringify(updatedTxs));

    if (user) {
      await saveCandidateProfile(updatedProfile);
      await saveTransactionRecord(tx);
    }
  };

  // Handle subscription activation
  const handleSubscriptionSuccess = async (newSub: UserSubscription, method: 'wallet' | 'mobile_money' | 'card') => {
    let newBal = profile.balance ?? 0;
    if (method === 'wallet' && newSub.pricePaid) {
      newBal = Math.max(0, newBal - newSub.pricePaid);
    }

    const isPending = newSub.status === 'pending';

    const updatedProfile: CandidateProfile = {
      ...profile,
      balance: newBal,
      subscriptionStatus: isPending ? 'pending' : 'unlimited',
      subscription: newSub,
      updatedAt: new Date().toISOString()
    };

    setProfile(updatedProfile);
    localStorage.setItem('senegal_cv_user_profile', JSON.stringify(updatedProfile));

    const tx: TransactionRecord = {
      id: newSub.transactionReference || `TX-SUB-${Date.now()}`,
      userId: user?.uid || 'guest',
      userEmail: user?.email || profile.email,
      userName: `${profile.personalInfo?.firstName || ''} ${profile.personalInfo?.lastName || ''}`.trim() || undefined,
      type: 'subscription_purchase',
      amount: -(newSub.pricePaid || 0),
      currency: 'XOF',
      description: `Souscription ${newSub.planName}${isPending ? ' (En attente de validation)' : ''}`,
      status: isPending ? 'pending' : 'VALIDATED_BY_AI',
      aiStatus: isPending ? 'PENDING' : 'VALIDATED_BY_AI',
      createdAt: new Date().toISOString(),
      paymentMethod: (newSub.paymentMethod as any) || (method === 'wallet' ? 'wallet' : 'wave'),
      newBalance: newBal,
      senderPhone: newSub.senderPhone,
      receiptImage: newSub.receiptImage
    };

    const updatedTxs = [tx, ...transactions];
    setTransactions(updatedTxs);
    localStorage.setItem('senegal_cv_transactions', JSON.stringify(updatedTxs));

    if (user) {
      await saveCandidateProfile(updatedProfile);
      await saveTransactionRecord(tx);
    }

    setActiveSidebarTab('subscription');
  };

  // Save Candidate Profile
  const handleSaveProfile = async () => {
    setIsLoading(true);
    setSaveSuccess(false);
    setErrorMessage(null);
    try {
      const updatedProfile = {
        ...profile,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('senegal_cv_user_profile', JSON.stringify(updatedProfile));
      if (user) {
        await saveCandidateProfile(updatedProfile);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setErrorMessage("Erreur lors de l'enregistrement de votre profil.");
    } finally {
      setIsLoading(false);
    }
  };

  // Personal Info Form changes
  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setProfile(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value
      }
    }));
  };

  // Experience changes
  const handleAddExperience = () => {
    const newExp: Experience = {
      id: `exp-${Date.now()}`,
      company: '',
      position: '',
      location: 'Dakar',
      startDate: '',
      endDate: '',
      current: false,
      description: ''
    };
    setProfile(prev => ({ ...prev, experiences: [...prev.experiences, newExp] }));
  };

  const handleUpdateExperience = (id: string, field: keyof Experience, value: any) => {
    setProfile(prev => ({
      ...prev,
      experiences: prev.experiences.map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
    }));
  };

  const handleDeleteExperience = (id: string) => {
    setProfile(prev => ({
      ...prev,
      experiences: prev.experiences.filter(exp => exp.id !== id)
    }));
  };

  // Education changes
  const handleAddEducation = () => {
    const newEdu: Education = {
      id: `edu-${Date.now()}`,
      institution: '',
      degree: '',
      fieldOfStudy: '',
      location: 'Dakar',
      startDate: '',
      endDate: '',
      current: false
    };
    setProfile(prev => ({ ...prev, education: [...prev.education, newEdu] }));
  };

  const handleUpdateEducation = (id: string, field: keyof Education, value: any) => {
    setProfile(prev => ({
      ...prev,
      education: prev.education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu)
    }));
  };

  const handleDeleteEducation = (id: string) => {
    setProfile(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  };

  // Delete saved document
  const handleDeleteDoc = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer définitivement ce document de votre historique ?')) {
      const updated = documents.filter(d => d.id !== id);
      setDocuments(updated);
      localStorage.setItem('senegal_cv_saved_documents', JSON.stringify(updated));
      if (user && user.uid !== 'guest') {
        await deleteUserDocument(id);
      }
      if (previewDoc && previewDoc.id === id) {
        setPreviewDoc(null);
      }
    }
  };

  // Download PDF from Preview modal
  const handleModalDownloadPDF = async () => {
    if (!previewDoc) return;
    setIsExportingPDF(true);
    try {
      const elementId = previewDoc.generationMode === 'devis' || previewDoc.generationMode === 'facture' || previewDoc.generationMode === 'pack_business'
        ? 'modal-business-preview'
        : previewDoc.generationMode === 'ebook'
        ? 'modal-ebook-preview'
        : previewTab === 'cv' ? 'modal-cv-preview' : 'modal-letter-preview';
      
      const fileName = `${previewDoc.title || 'document-dokya'}.pdf`.replace(/\s+/g, '_');
      await downloadElementAsPDF(elementId, fileName);
    } catch (e) {
      console.error('PDF export error:', e);
      window.print();
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Download DOCX from Preview modal
  const handleModalDownloadDocx = async () => {
    if (!previewDoc) return;
    setIsExportingDocx(true);
    try {
      if (previewDoc.generationMode === 'letter_only') {
        await exportLetterToDocx(previewDoc.formData, previewDoc.aiData);
      } else if (previewDoc.generationMode === 'devis' || previewDoc.generationMode === 'facture' || previewDoc.generationMode === 'pack_business') {
        await exportBusinessDocToDocx(previewDoc.businessDocData || (previewDoc.formData as any));
      } else if (previewDoc.generationMode === 'ebook' && previewDoc.ebookData) {
        await exportEbookToDocx(previewDoc.ebookData);
      } else {
        await exportCVToDocx(previewDoc.formData, previewDoc.aiData);
      }
    } catch (e) {
      console.error('DOCX export error:', e);
      alert("Erreur lors de l'export Word (.docx)");
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Direct Card DOCX export
  const handleDirectCardDocx = async (docItem: SavedUserDocument) => {
    try {
      if (docItem.generationMode === 'letter_only') {
        await exportLetterToDocx(docItem.formData, docItem.aiData);
      } else if (docItem.generationMode === 'devis' || docItem.generationMode === 'facture' || docItem.generationMode === 'pack_business') {
        await exportBusinessDocToDocx(docItem.businessDocData || (docItem.formData as any));
      } else if (docItem.generationMode === 'ebook' && docItem.ebookData) {
        await exportEbookToDocx(docItem.ebookData);
      } else {
        await exportCVToDocx(docItem.formData, docItem.aiData);
      }
    } catch (e) {
      console.error('Error generating card docx:', e);
    }
  };

  // Filtered documents list
  const filteredDocuments = documents.filter(docItem => {
    const matchesType = docFilterType === 'all' || 
      (docFilterType === 'cv' && (docItem.generationMode === 'cv_only' || docItem.generationMode === 'full_pack')) ||
      (docFilterType === 'letter' && docItem.generationMode === 'letter_only') ||
      (docFilterType === 'entretiens' && ((docItem.generationMode as any) === 'interview_prep' || !!docItem.interviewPrepData)) ||
      (docFilterType === 'business' && (docItem.generationMode === 'devis' || docItem.generationMode === 'facture' || docItem.generationMode === 'pack_business')) ||
      (docFilterType === 'ebook' && docItem.generationMode === 'ebook');

    const matchesQuery = !docSearchQuery || 
      (docItem.title?.toLowerCase().includes(docSearchQuery.toLowerCase())) ||
      (docItem.formData?.personalInfo?.firstName?.toLowerCase().includes(docSearchQuery.toLowerCase())) ||
      (docItem.formData?.personalInfo?.lastName?.toLowerCase().includes(docSearchQuery.toLowerCase())) ||
      (docItem.formData?.personalInfo?.targetJob?.toLowerCase().includes(docSearchQuery.toLowerCase()));

    return matchesType && matchesQuery;
  });

  const completionPercentage = calculateProfileCompletion(profile);
  const isSubscriptionActive = profile?.subscription?.status === 'active' && (
    !profile.subscription.expiresAt || new Date(profile.subscription.expiresAt).getTime() > Date.now()
  );

  return (
    <div id="dokya-dashboard-shell" className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      
      {/* 1. NATIVE DOKYA AI SIDEBAR */}
      <DokyaSidebar
        activeTab={activeSidebarTab}
        onSelectTab={handleSelectTab}
        profile={profile}
        documentsCount={documents.length}
        userBalance={profile.balance ?? 3000}
        onOpenRecharge={() => setIsRechargeModalOpen(true)}
        onOpenAdmin={onOpenAdmin}
        onSignOut={onSignOut ? onSignOut : async () => {
          await signOut(auth);
        }}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 md:pl-72 flex flex-col min-w-0">
        
        {/* Top Floating App Bar */}
        <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 md:hidden hover:text-white transition-colors cursor-pointer"
              title="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white capitalize">
                  {activeSidebarTab === 'dashboard_home' || activeSidebarTab === 'dashboard' ? 'Tableau de bord'
                    : activeSidebarTab === 'documents' ? 'Mes Documents Générés'
                    : activeSidebarTab === 'entretiens' ? 'Mes Fiches de Préparation d\'Entretien RH'
                    : activeSidebarTab === 'tarifs' ? 'Tarifs & Offres'
                    : activeSidebarTab === 'subscription' ? 'Mon Abonnement & Privilèges VIP'
                    : activeSidebarTab === 'profile' ? 'Mon Profil & Paramètres'
                    : activeSidebarTab === 'wallet' ? 'Mon Portefeuille Wallet'
                    : activeSidebarTab === 'transactions' ? 'Historique des Opérations'
                    : 'Espace Dokya AI'}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>SaaS Pro</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Dokya AI • Suite Bureautique & Recrutement UEMOA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Balance indicator */}
            <div 
              onClick={() => setIsRechargeModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner cursor-pointer transition-colors"
              title="Cliquez pour recharger votre solde"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-black text-emerald-400">
                {(profile.balance ?? 3000).toLocaleString('fr-FR')} <span className="text-[10px] text-emerald-300">FCFA</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-md hidden lg:inline">
                + Recharger
              </span>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={onSignOut ? onSignOut : async () => {
                await signOut(auth);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 text-slate-400 hover:text-rose-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-8">
          
          {/* ========================================================================= */}
          {/* TAB 1: TABLEAU DE BORD (DASHBOARD HOME)                                   */}
          {/* ========================================================================= */}
          {(activeSidebarTab === 'dashboard_home' || activeSidebarTab === 'dashboard') && (
            <div className="space-y-8 animate-in fade-in">
              
              {/* Welcome Hero Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Espace Candidat & Bureautique IA</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      Bienvenue, <span className="text-indigo-400">{profile?.personalInfo?.firstName || profile?.email?.split('@')[0] || 'Candidat Pro'}</span> !
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
                      Créez vos CVs certifiés ATS, Lettres percutantes, Factures & Devis conformes UEMOA et Livres numériques en quelques clics grâce à l'IA Dokya.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectTab('tarifs')}
                      className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Crown className="w-4 h-4" />
                      <span>Tarifs & Pass VIP</span>
                    </button>
                  </div>
                </div>

                {/* Profile Completion Strip */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between text-xs pr-4">
                      <span className="text-slate-300 font-bold flex items-center gap-1.5">
                        <UserCircle2 className="w-4 h-4 text-indigo-400" />
                        <span>Complétion de votre profil candidat & professionnel</span>
                      </span>
                      <span className={`font-black ${completionPercentage >= 80 ? 'text-emerald-400' : completionPercentage >= 50 ? 'text-amber-400' : 'text-indigo-400'}`}>
                        {completionPercentage}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          completionPercentage >= 80 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                            : completionPercentage >= 50
                            ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                            : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                        }`}
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                  </div>

                  {completionPercentage < 100 && (
                    <button
                      type="button"
                      onClick={() => handleSelectTab('profile')}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
                    >
                      Compléter mon profil →
                    </button>
                  )}
                </div>
              </div>

              {/* 4 STAT CARDS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Stat 1: Solde Dokya Wallet */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Solde Wallet</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xl font-black text-emerald-400">
                      {(profile.balance ?? 3000).toLocaleString('fr-FR')} <span className="text-xs font-normal text-emerald-300">FCFA</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsRechargeModalOpen(true)}
                      className="text-[11px] font-black text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      + Recharger
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Paiement instantané Mobile Money</p>
                </div>

                {/* Stat 2: Mes Documents */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Mes Documents</span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xl font-black text-white">
                      {documents.length} <span className="text-xs font-normal text-slate-400">{documents.length > 1 ? 'fichiers' : 'fichier'}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('documents')}
                      className="text-[11px] font-black text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      Voir tout →
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Archivage PDF & Word HD</p>
                </div>

                {/* Stat 3: Formule / Statut */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Statut Compte</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Crown className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-black text-amber-400">
                      {profile?.subscription?.status === 'active' ? '👑 Pass VIP Actif' : 'Paiement à l\'acte'}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('tarifs')}
                      className="text-[11px] font-black text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      {profile?.subscription?.status === 'active' ? 'Gérer' : 'Activer'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Téléchargements & IA illimités</p>
                </div>

                {/* Stat 4: Score Profil ATS */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Score Profil ATS</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xl font-black text-blue-400">
                      {Math.max(65, completionPercentage)}%
                    </p>
                    <span className="text-[10px] font-bold text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded">
                      Standard RH
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">Optimisé pour filtres de recrutement</p>
                </div>

              </div>

              {/* 5 REAL DOKYA AI GENERATOR CARDS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-amber-400" />
                    <span>Générateurs Dokya AI (Catalogue Officiel & Accès Direct)</span>
                  </h3>
                  <span className="text-xs text-slate-400">5 services certifiés</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {/* Card 1: CV ATS */}
                  <div 
                    onClick={() => handleSelectTab('gen_cv')}
                    className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/60 p-5 space-y-3 transition-all cursor-pointer hover:-translate-y-1 shadow-lg group flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                          1 000 FCFA
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors">
                          CV ATS Professionnel
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          50+ modèles certifiés optimisés pour passer les filtres de recrutement.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center text-xs font-bold text-indigo-400 gap-1">
                      <span>Lancer la création</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Card 2: Lettre */}
                  <div 
                    onClick={() => handleSelectTab('gen_letter')}
                    className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/60 p-5 space-y-3 transition-all cursor-pointer hover:-translate-y-1 shadow-lg group flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                          <Mail className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                          1 000 FCFA
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">
                          Lettre de Motivation IA
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          Rédaction persuasive sur-mesure adaptée à votre entreprise cible.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center text-xs font-bold text-blue-400 gap-1">
                      <span>Rédiger ma lettre</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Card 3: Facture */}
                  <div 
                    onClick={() => {
                      if (onSelectService) onSelectService('facture');
                      else handleSelectTab('gen_business');
                    }}
                    className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 p-5 space-y-3 transition-all cursor-pointer hover:-translate-y-1 shadow-lg group flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <Receipt className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          1 000 FCFA
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                          Facture Client UEMOA
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          Conforme OHADA, TVA et mentions légales sénégalaises.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center text-xs font-bold text-emerald-400 gap-1">
                      <span>Éditer facture</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Card 4: Devis Pro */}
                  <div 
                    onClick={() => {
                      if (onSelectService) onSelectService('devis');
                      else handleSelectTab('gen_business');
                    }}
                    className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-teal-500/60 p-5 space-y-3 transition-all cursor-pointer hover:-translate-y-1 shadow-lg group flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
                          1 000 FCFA
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-teal-400 transition-colors">
                          Devis Commercial Pro
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          Chiffrage clair, conditions de vente et signature client.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center text-xs font-bold text-teal-400 gap-1">
                      <span>Éditer devis</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Card 5: Ebook */}
                  <div 
                    onClick={() => {
                      if (onSelectService) onSelectService('ebook');
                      else handleSelectTab('gen_ebook');
                    }}
                    className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/60 p-5 space-y-3 transition-all cursor-pointer hover:-translate-y-1 shadow-lg group flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                          3 000 FCFA
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-purple-400 transition-colors">
                          Ebook & Rapport Pro AI
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          Création de livre complet avec chapitres et couvertures 3D.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center text-xs font-bold text-purple-400 gap-1">
                      <span>Générer un livre</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>

              {/* RECENT DOCUMENTS SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Documents Récents ({documents.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('documents')}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    Voir tout l'historique →
                  </button>
                </div>

                {documents.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                    <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">Vous n'avez pas encore généré de document.</p>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('gen_cv')}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-md cursor-pointer hover:bg-indigo-500"
                    >
                      Créer mon premier CV ATS
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.slice(0, 3).map((docItem) => (
                      <div
                        key={docItem.id}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-md hover:border-slate-700 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-bold text-indigo-400 uppercase tracking-wider">
                              {docItem.generationMode === 'letter_only' ? 'Lettre'
                                : docItem.generationMode === 'devis' ? 'Devis'
                                : docItem.generationMode === 'facture' ? 'Facture'
                                : docItem.generationMode === 'ebook' ? 'Ebook'
                                : 'CV Pro ATS'}
                            </span>
                            <span>{new Date(docItem.createdAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white line-clamp-1">{docItem.title}</h4>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewDoc(docItem);
                                setPreviewTab(docItem.generationMode === 'letter_only' ? 'letter' : 'cv');
                                setTimeout(handleModalDownloadPDF, 100);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
                              title="Télécharger PDF"
                            >
                              PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDirectCardDocx(docItem)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer"
                              title="Télécharger Word"
                            >
                              Word
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setPreviewDoc(docItem);
                              setPreviewTab(docItem.generationMode === 'letter_only' ? 'letter' : 'cv');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Aperçu"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PAYMENT & SECURITY REASSURANCE STRIP */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Paiement sécurisé UEMOA garanti : Wave, Orange Money, Free Money & Cartes Bancaires.</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">Wave</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-orange-400 font-bold">Orange Money</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-teal-400 font-bold">Free Money</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-bold">Visa / MC</span>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: MES DOCUMENTS (HISTORY & DOWNLOADS)                                 */}
          {/* ========================================================================= */}
          {activeSidebarTab === 'documents' && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Header & Filter bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <span>Répertoire de Mes Documents ({documents.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tous vos CVs, Lettres, Factures, Devis et Ebooks générés et archivés en haute définition.
                  </p>
                </div>

                {/* Search input */}
                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Rechercher un document..."
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {[
                  { id: 'all', label: `Tous (${documents.length})` },
                  { id: 'cv', label: 'CVs ATS' },
                  { id: 'letter', label: 'Lettres de Motivation' },
                  { id: 'entretiens', label: 'Entretiens RH' },
                  { id: 'business', label: 'Factures & Devis' },
                  { id: 'ebook', label: 'Ebooks & Livres' }
                ].map(pill => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setDocFilterType(pill.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      docFilterType === pill.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Document Cards Grid */}
              {filteredDocuments.length === 0 ? (
                <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Aucun document trouvé</h4>
                    <p className="text-xs text-slate-400 mt-1">Créez votre premier document avec l'un de nos générateurs.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('gen_cv')}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-md cursor-pointer hover:bg-indigo-500"
                  >
                    Générer un Document →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredDocuments.map(docItem => {
                    const isInterviewDoc = !!docItem.interviewPrepData || (docItem.generationMode as any) === 'interview_prep';
                    return (
                    <div
                      key={docItem.id}
                      className={`bg-slate-900 border ${isInterviewDoc ? 'border-indigo-500/40 hover:border-indigo-500/70' : 'border-slate-800 hover:border-slate-700'} rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xl transition-all`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md ${
                            isInterviewDoc
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            {isInterviewDoc ? 'Coaching Entretien RH'
                              : docItem.generationMode === 'letter_only' ? 'Lettre de Motivation'
                              : docItem.generationMode === 'devis' ? 'Devis Pro'
                              : docItem.generationMode === 'facture' ? 'Facture Client'
                              : docItem.generationMode === 'ebook' ? 'Ebook Pro AI'
                              : 'CV Pro ATS'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(docItem.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-white line-clamp-1">{docItem.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {docItem.formData?.personalInfo?.targetJob || docItem.businessDocData?.issuer?.companyName || docItem.ebookData?.author || 'Document Dokya'}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                        {isInterviewDoc ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenInterviewPrepDocument) {
                                const prepData: InterviewPrepData = docItem.interviewPrepData || {
                                  id: docItem.id,
                                  candidateName: `${docItem.formData?.personalInfo?.firstName || ''} ${docItem.formData?.personalInfo?.lastName || ''}`.trim() || 'Candidat Pro',
                                  targetJob: docItem.formData?.personalInfo?.targetJob || 'Poste Cible',
                                  targetCompany: docItem.formData?.targetCompany || '',
                                  createdAt: docItem.createdAt,
                                  pitch2Min: {
                                    hook: `Madame, Monsieur, fort d'un parcours dynamique en tant que ${docItem.formData?.personalInfo?.targetJob || 'professionnel'}, j'ai développé une solide expertise technique et managériale.`,
                                    careerHighlights: `Au fil de mes expériences, j'ai piloté des projets stratégiques et optimisé des processus clés.`,
                                    valueProposition: `Aujourd'hui, je souhaite mettre ma rigueur et mon dynamisme au service de vos objectifs.`,
                                    fullText: `Bonjour, je suis ${docItem.formData?.personalInfo?.firstName || 'Candidat'} ${docItem.formData?.personalInfo?.lastName || ''}. Fort d'une expérience confirmée dans le domaine de ${docItem.formData?.personalInfo?.targetJob || 'mon secteur'}, j'ai consolidé une expertise reconnue dans la gestion opérationnelle et le travail en équipe.`
                                  },
                                  questions: [],
                                  behavioralTips: [],
                                  questionsToAskRecruiter: []
                                };
                                onOpenInterviewPrepDocument(prepData);
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Réviser l'Entretien 🎯</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {/* PDF */}
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewDoc(docItem);
                                setPreviewTab(docItem.generationMode === 'letter_only' ? 'letter' : 'cv');
                                setTimeout(handleModalDownloadPDF, 150);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                              title="Télécharger PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>

                            {/* Word */}
                            <button
                              type="button"
                              onClick={() => handleDirectCardDocx(docItem)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                              title="Télécharger Word (.docx)"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Word</span>
                            </button>

                            {/* Preview */}
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewDoc(docItem);
                                setPreviewTab(docItem.generationMode === 'letter_only' ? 'letter' : 'cv');
                              }}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Aperçu Grand Format"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          {!isInterviewDoc && (
                            <button
                              type="button"
                              onClick={() => onLoadDocumentToEditor(docItem.formData, docItem.aiData)}
                              className="p-2 rounded-xl text-indigo-400 hover:bg-indigo-950/40 transition-colors cursor-pointer"
                              title="Modifier dans l'éditeur"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(docItem.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: ENTRETIENS (INTERVIEW PREPARATION & COACHING REPOSITORY)              */}
          {/* ========================================================================= */}
          {activeSidebarTab === 'entretiens' && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>Fiches de Préparation à l'Entretien RH</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Accédez à tout moment à vos pitchs de 2 min, vos questions pièges décryptées et vos réponses modèles STAR.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectTab('gen_cv')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer self-start md:self-auto flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouveau CV / Coaching RH</span>
                </button>
              </div>

              {/* Information Banner */}
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
                  <BookmarkCheck className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-white">Espace de Révision 100% Persistant</p>
                  <p className="text-slate-300 leading-relaxed">
                    Vos fiches d'entretien sont sauvegardées automatiquement dans votre compte Dokya AI. Vous pouvez les réviser tranquillement sur votre téléphone ou ordinateur avant chaque entretien d'embauche, sans téléchargement préalable.
                  </p>
                </div>
              </div>

              {/* List of Interview Prep Documents */}
              {(() => {
                const interviewDocs = documents.filter(d => !!d.interviewPrepData || (d.generationMode as any) === 'interview_prep' || d.generationMode === 'cv_only' || d.generationMode === 'full_pack');

                if (interviewDocs.length === 0) {
                  return (
                    <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
                      <Sparkles className="w-12 h-12 text-slate-600 mx-auto" />
                      <div>
                        <h4 className="text-sm font-bold text-white">Aucune fiche d'entretien enregistrée</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Créez votre CV avec l'IA pour débloquer automatiquement votre préparation personnalisée.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectTab('gen_cv')}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-md cursor-pointer hover:bg-indigo-500"
                      >
                        Générer un CV & Coaching RH →
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {interviewDocs.map((docItem) => {
                      const prep: InterviewPrepData = docItem.interviewPrepData || {
                        id: `PREP-${docItem.id}`,
                        candidateName: `${docItem.formData?.personalInfo?.firstName || ''} ${docItem.formData?.personalInfo?.lastName || ''}`.trim() || 'Candidat Pro',
                        targetJob: docItem.formData?.personalInfo?.targetJob || 'Poste Cible',
                        targetCompany: docItem.formData?.targetCompany || '',
                        createdAt: docItem.createdAt,
                        pitch2Min: {
                          hook: `Madame, Monsieur, fort d'un parcours dynamique en tant que ${docItem.formData?.personalInfo?.targetJob || 'professionnel'}, j'ai développé une solide expertise technique.`,
                          careerHighlights: `Au fil de mes expériences, j'ai piloté des missions stratégiques et optimisé des processus clés.`,
                          valueProposition: `Aujourd'hui, je souhaite mettre ma rigueur et mes compétences au service de votre croissance.`,
                          fullText: `Bonjour, je suis ${docItem.formData?.personalInfo?.firstName || 'Candidat'} ${docItem.formData?.personalInfo?.lastName || ''}. Passionné par le domaine de ${docItem.formData?.personalInfo?.targetJob || 'mon secteur'}, j'ai consolidé une expertise reconnue dans la gestion de projets et la coordination d'équipe.`
                        },
                        questions: [
                          {
                            id: 'q-demo-1',
                            category: 'motivation',
                            categoryLabel: 'Motivation & Projet',
                            question: `Pourquoi postulez-vous pour ce poste de ${docItem.formData?.personalInfo?.targetJob || 'ce poste'} ?`,
                            recruiterIntent: 'Vérifier la cohérence de vos objectifs professionnels et votre compréhension des enjeux.',
                            suggestedAnswer: `Votre structure offre des défis stimulants en phase avec mon expertise. Je souhaite apporter une contribution concrète et rapide dès ma prise de fonction.`,
                            keyStrengthsToHighlight: ['Motivation ciblée', 'Proactivité', 'Esprit d\'équipe'],
                            pitfallsToAvoid: 'Donner une réponse vague ou centrée uniquement sur les avantages personnels.'
                          }
                        ],
                        behavioralTips: [
                          'Adoptez une posture ouverte et souriante dès l\'accueil.',
                          'Structurez vos exemples selon la méthode STAR (Situation, Tâche, Action, Résultat).',
                          'Prenez 2 secondes de réflexion avant de répondre aux questions complexes.'
                        ],
                        questionsToAskRecruiter: [
                          'Quelles seront les priorités stratégiques des 3 premiers mois pour ce poste ?',
                          'Comment est organisée l\'équipe au quotidien ?'
                        ]
                      };

                      return (
                        <div
                          key={docItem.id}
                          className="bg-slate-900 border border-slate-800 hover:border-indigo-500/60 rounded-3xl p-6 flex flex-col justify-between space-y-5 shadow-xl transition-all"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-amber-300" />
                                <span>Coaching RH Prêt</span>
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {new Date(docItem.createdAt).toLocaleDateString('fr-FR')}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-base font-black text-white">
                                {prep.candidateName || docItem.title}
                              </h4>
                              <p className="text-xs font-semibold text-indigo-300 mt-0.5">
                                {prep.targetJob || docItem.formData?.personalInfo?.targetJob || 'Poste Cible'}
                                {prep.targetCompany ? ` • ${prep.targetCompany}` : ''}
                              </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2">
                                <p className="text-[10px] text-slate-400">Pitch Chrono</p>
                                <p className="text-xs font-bold text-white">2 min</p>
                              </div>
                              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2">
                                <p className="text-[10px] text-slate-400">Questions</p>
                                <p className="text-xs font-bold text-white">{prep.questions?.length || 5}+ Q/R</p>
                              </div>
                              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2">
                                <p className="text-[10px] text-slate-400">Méthode</p>
                                <p className="text-xs font-bold text-emerald-400">STAR</p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenInterviewPrepDocument) {
                                  onOpenInterviewPrepDocument(prep);
                                }
                              }}
                              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                            >
                              <Sparkles className="w-4 h-4 text-amber-300" />
                              <span>Réviser mon Entretien 🎯</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(docItem.id)}
                              className="p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Supprimer la fiche"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: TARIFS & OFFRES (PRICING & OFFERS PAGE)                            */}
          {/* ========================================================================= */}
          {activeSidebarTab === 'tarifs' && (
            <PricingOffersView
              userBalance={profile.balance ?? 3000}
              profile={profile}
              onSelectService={(srv) => {
                if (onSelectService) onSelectService(srv);
                else handleSelectTab(`gen_${srv}`);
              }}
              onSubscribePlan={(plan, price, title) => {
                setSubscriptionModalConfig({
                  isOpen: true,
                  planId: plan,
                  planTitle: title,
                  price: price
                });
              }}
              onOpenRecharge={() => setIsRechargeModalOpen(true)}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB 4: MON ABONNEMENT (ACTIVE SUBSCRIPTION TRACKER)                       */}
          {/* ========================================================================= */}
          {activeSidebarTab === 'subscription' && (
            <MySubscriptionView
              profile={profile}
              documents={documents}
              onGoToPricing={() => handleSelectTab('tarifs')}
              onSubscribePlan={(plan, price, title) => {
                setSubscriptionModalConfig({
                  isOpen: true,
                  planId: plan,
                  planTitle: title,
                  price: price
                });
              }}
              onOpenRecharge={() => setIsRechargeModalOpen(true)}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB 5: MON PROFIL & PARAMETRES                                            */}
          {/* ========================================================================= */}
          {activeSidebarTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Save floating bar */}
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white">Informations Personnelles & Parcours Professionnel</h3>
                  <p className="text-xs text-slate-400">Remplissez ces informations une fois pour toutes pour gagner du temps lors des créations de CV et Lettres.</p>
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-75"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer mon Profil</span>
                </button>
              </div>

              {saveSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Profil Candidat enregistré avec succès !</span>
                </div>
              )}

              {/* Form Section: Personal Info */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm border-b border-slate-800 pb-3">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>Coordonnées & Titre Professionnel</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Prénom *</label>
                    <input
                      type="text"
                      placeholder="Mamadou"
                      value={profile?.personalInfo?.firstName || ''}
                      onChange={(e) => handlePersonalInfoChange('firstName', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Nom de famille *</label>
                    <input
                      type="text"
                      placeholder="Diallo"
                      value={profile?.personalInfo?.lastName || ''}
                      onChange={(e) => handlePersonalInfoChange('lastName', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Poste / Métier Cible *</label>
                    <input
                      type="text"
                      placeholder="Chef de Projet Digital"
                      value={profile?.personalInfo?.targetJob || ''}
                      onChange={(e) => handlePersonalInfoChange('targetJob', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Email *</label>
                    <input
                      type="email"
                      placeholder="mamadou.diallo@email.com"
                      value={profile?.personalInfo?.email || profile?.email || ''}
                      onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Téléphone *</label>
                    <input
                      type="tel"
                      placeholder="+221 77 123 45 67"
                      value={profile?.personalInfo?.phone || ''}
                      onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Ville / Région</label>
                    <input
                      type="text"
                      placeholder="Dakar, Sénégal"
                      value={profile?.personalInfo?.city || ''}
                      onChange={(e) => handlePersonalInfoChange('city', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Form Section: Experiences */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                    <span>Expériences Professionnelles ({profile.experiences.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddExperience}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter Expérience</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {profile.experiences.map((exp, idx) => (
                    <div key={exp.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400">Expérience #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteExperience(exp.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Intitulé du poste"
                          value={exp.position}
                          onChange={(e) => handleUpdateExperience(exp.id, 'position', e.target.value)}
                          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Entreprise"
                          value={exp.company}
                          onChange={(e) => handleUpdateExperience(exp.id, 'company', e.target.value)}
                          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Période (ex: 2022 - Présent)"
                          value={exp.startDate}
                          onChange={(e) => handleUpdateExperience(exp.id, 'startDate', e.target.value)}
                          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                        />
                      </div>

                      <textarea
                        placeholder="Missions et réalisations clés..."
                        value={exp.description}
                        onChange={(e) => handleUpdateExperience(exp.id, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: MON SOLDE WALLET & RECHARGES                                       */}
          {/* ========================================================================= */}
          {activeSidebarTab === 'wallet' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-800/60 rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Compte Dokya Wallet
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      Solde Disponible : <span className="text-emerald-400">{(profile.balance ?? 3000).toLocaleString('fr-FR')} FCFA</span>
                    </h3>
                    <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                      Utilisez votre solde pour débloquer vos documents en 1 clic ou activer un Pass VIP.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRechargeModalOpen(true)}
                    className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-black shadow-xl shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2 shrink-0 active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Recharger Mon Solde</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: HISTORIQUE DES TRANSACTIONS                                        */}
          {/* ========================================================================= */}
          {activeSidebarTab === 'transactions' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                      <History className="w-5 h-5 text-emerald-400" />
                      <span>Historique de vos Opérations ({transactions.length})</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Retrouvez le détail de toutes vos recharges de solde et achats de documents.
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400">Solde Actuel</span>
                    <p className="text-lg font-black text-emerald-400">{(profile.balance ?? 3000).toLocaleString('fr-FR')} FCFA</p>
                  </div>
                </div>

                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="text-[11px] uppercase bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Référence</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Montant</th>
                        <th className="p-3 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-slate-400">{tx.id}</td>
                          <td className="p-3 font-medium">{new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              tx.type === 'recharge' 
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                                : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            }`}>
                              {tx.type === 'recharge' ? 'Recharge Solde' : 'Achat Document'}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-white">{tx.description}</td>
                          <td className={`p-3 text-right font-black ${
                            (Number(tx.amount) || 0) > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {(Number(tx.amount) || 0) > 0 ? `+${(Number(tx.amount) || 0).toLocaleString('fr-FR')}` : (Number(tx.amount) || 0).toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Validé
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODALS: PREVIEW, RECHARGE, SUBSCRIPTION & DOWNLOAD PAYMENT                */}
      {/* ========================================================================= */}

      {/* 1. DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Top Bar */}
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">{previewDoc.title || 'Prévisualisation du Document'}</h3>
                <p className="text-xs text-slate-400">Généré le {new Date(previewDoc.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>

              <div className="flex items-center gap-2">
                {onOpenInterviewPrepDocument && (previewDoc.generationMode === 'cv_only' || previewDoc.generationMode === 'full') && (
                  <button
                    type="button"
                    onClick={() => {
                      const prepData: InterviewPrepData = previewDoc.interviewPrepData || {
                        id: `PREP-${previewDoc.id || Date.now()}`,
                        candidateName: `${previewDoc.formData?.personalInfo?.firstName || ''} ${previewDoc.formData?.personalInfo?.lastName || ''}`.trim() || 'Candidat Pro',
                        targetJob: previewDoc.formData?.personalInfo?.targetJob || 'Poste Cible',
                        targetCompany: previewDoc.formData?.targetCompany || 'Entreprise Cible',
                        createdAt: new Date().toISOString(),
                        pitch2Min: {
                          hook: `Madame, Monsieur, fort d'un parcours dynamique et polyvalent en tant que ${previewDoc.formData?.personalInfo?.targetJob || 'professionnel'}, j'ai développé une solide expertise technique et managériale.`,
                          careerHighlights: `Au fil de mes expériences, j'ai piloté des projets stratégiques, encadré des équipes et optimisé des processus clés pour accroître significativement la performance opérationnelle.`,
                          valueProposition: `Aujourd'hui, je souhaite mettre ma réactivité, mon sens aigu de l'organisation et mon leadership au service des objectifs ambitieux de votre entreprise.`,
                          fullText: `Bonjour, je suis ${previewDoc.formData?.personalInfo?.firstName || 'Candidat'} ${previewDoc.formData?.personalInfo?.lastName || ''}. Titulaire d'une solide expérience dans le domaine de ${previewDoc.formData?.personalInfo?.targetJob || 'mon secteur'}, j'ai consolidé une expertise reconnue dans la gestion de projets et la coordination opérationnelle. Mon approche allie rigueur méthodique, force de proposition et esprit collaboratif. Rejoindre vos équipes représente l'opportunité idéale d'apporter une valeur ajoutée concrète et mesurable.`
                        },
                        questions: [
                          {
                            id: 'q-modal-1',
                            category: 'motivation',
                            categoryLabel: 'Motivation & Projet',
                            question: `Pourquoi souhaitez-vous rejoindre notre entreprise pour le poste de ${previewDoc.formData?.personalInfo?.targetJob || 'ce poste'} ?`,
                            recruiterIntent: 'Vérifier l\'intérêt réel, la connaissance de l\'entreprise et la cohérence du projet professionnel.',
                            suggestedAnswer: `Votre entreprise se distingue par son dynamisme et son exigence d'excellence. Mon expertise en gestion et mon orientation résultats me permettront de m'intégrer rapidement et de contribuer dès le premier jour à vos priorités stratégiques.`,
                            keyStrengthsToHighlight: ['Connaissance de l\'entreprise', 'Valeur ajoutée immédiate', 'Alignement des valeurs'],
                            pitfallsToAvoid: 'Donner une réponse générique interchangeable avec n\'importe quelle autre entreprise.'
                          },
                          {
                            id: 'q-modal-2',
                            category: 'comportementale',
                            categoryLabel: 'Méthode STAR - Résolution de Problème',
                            question: 'Pouvez-vous me décrire une situation où vous avez surmonté un défi complexe ?',
                            recruiterIntent: 'Évaluer votre capacité de résilience, de sang-froid et votre rigueur d\'analyse face aux imprévus.',
                            suggestedAnswer: `Face à un délai critique et des contraintes imprévues, j'ai restructuré les priorités d'action, mobilisé les parties prenantes et instauré un suivi quotidien serré. Cette coordination a permis de livrer le projet dans les temps tout en garantissant une qualité optimale.`,
                            keyStrengthsToHighlight: ['Leadership', 'Pragmatisme', 'Gestion du stress'],
                            pitfallsToAvoid: 'Rejeter la faute sur les collègues ou rester trop vague sur les actions personnelles.'
                          }
                        ],
                        behavioralTips: [
                          'Maintenez un contact visuel franc et chaleureux avec chacun de vos interlocuteurs.',
                          'Structurez systématiquement vos réponses selon la logique Situation, Tâche, Action, Résultat (STAR).',
                          'Parlez d\'une voix posée en marquant de courtes pauses pour valoriser vos propos clés.'
                        ],
                        questionsToAskRecruiter: [
                          'Quels sont les trois premiers défis prioritaires attendus pour la personne qui prendra ce poste ?',
                          'Comment définiriez-vous la culture interne et la dynamique de travail au sein de votre équipe ?',
                          'Quelles sont les perspectives d\'évolution à moyen terme associées à cette opportunité ?'
                        ],
                        profileStrengths: [
                          'Excellente capacité d\'adaptation opérationnelle',
                          'Sens éprouvé de l\'organisation et du respect des délais',
                          'Communication fluide et leadership d\'équipe'
                        ]
                      };
                      setPreviewDoc(null);
                      onOpenInterviewPrepDocument(prepData);
                    }}
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Ouvrir la Fiche d'Entretien RH associée"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span className="hidden sm:inline">Coaching Entretien RH</span>
                  </button>
                )}

                <button
                  onClick={handleModalDownloadPDF}
                  disabled={isExportingPDF}
                  type="button"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>

                <button
                  onClick={handleModalDownloadDocx}
                  disabled={isExportingDocx}
                  type="button"
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Word</span>
                </button>

                <button
                  onClick={() => setPreviewDoc(null)}
                  type="button"
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Preview */}
            <div className="p-4 overflow-y-auto flex-1 bg-slate-950 flex justify-center">
              <div className="bg-white text-slate-900 rounded-xl shadow-2xl p-4 sm:p-8 w-full max-w-3xl overflow-x-auto">
                {previewDoc.generationMode === 'devis' || previewDoc.generationMode === 'facture' || previewDoc.generationMode === 'pack_business' ? (
                  <div id="modal-business-preview" className="w-full">
                    <DevisFactureTemplate data={previewDoc.businessDocData || (previewDoc.formData as any)} />
                  </div>
                ) : previewDoc.generationMode === 'ebook' && previewDoc.ebookData ? (
                  <div id="modal-ebook-preview" className="w-full">
                    <EbookTemplate data={previewDoc.ebookData} unlocked={true} />
                  </div>
                ) : previewTab === 'cv' ? (
                  <div id="modal-cv-preview">
                    <CVTemplate formData={previewDoc.formData} aiData={previewDoc.aiData} unlocked={true} />
                  </div>
                ) : (
                  <div id="modal-letter-preview">
                    <CoverLetterTemplate formData={previewDoc.formData} aiData={previewDoc.aiData} />
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. RECHARGE WALLET MODAL */}
      <RechargeWalletModal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
        currentBalance={profile.balance ?? 3000}
        userId={user?.uid || profile.uid}
        userEmail={user?.email || profile.email}
        userName={`${profile.personalInfo?.firstName || ''} ${profile.personalInfo?.lastName || ''}`.trim()}
        onRechargeSuccess={handleRechargeSuccess}
      />

      {/* 3. SUBSCRIPTION MODAL */}
      <SubscriptionModal
        isOpen={subscriptionModalConfig.isOpen}
        onClose={() => setSubscriptionModalConfig(prev => ({ ...prev, isOpen: false }))}
        planId={subscriptionModalConfig.planId}
        planTitle={subscriptionModalConfig.planTitle}
        price={subscriptionModalConfig.price}
        userBalance={profile.balance ?? 3000}
        userId={user?.uid || profile.uid}
        userEmail={user?.email || profile.email}
        userName={`${profile.personalInfo?.firstName || ''} ${profile.personalInfo?.lastName || ''}`.trim()}
        onSuccess={handleSubscriptionSuccess}
        onOpenRecharge={() => {
          setSubscriptionModalConfig(prev => ({ ...prev, isOpen: false }));
          setIsRechargeModalOpen(true);
        }}
      />

    </div>
  );
};
