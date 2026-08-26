import React, { useState, useEffect } from 'react';
import { 
  User, FileText, CreditCard, Sparkles, Plus, Trash2, Edit3, Save, 
  CheckCircle2, Download, Eye, ExternalLink, RefreshCw, AlertCircle, 
  Briefcase, GraduationCap, Award, Globe, Phone, Mail, MapPin, Linkedin, 
  Check, ArrowRight, ShieldCheck, Zap, X, Wallet, History
} from 'lucide-react';
import { 
  CandidateProfile, SavedUserDocument, CVFormData, Experience, Education, 
  SkillCategory, Language, PersonalInfo, TransactionRecord 
} from '../types';
import { 
  fetchUserProfile, saveCandidateProfile, fetchUserDocuments, 
  deleteUserDocument, fetchUserOrders, saveOrderRecord, OrderRecord,
  saveTransactionRecord, fetchUserTransactions
} from '../lib/firebase';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
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
  onClose?: () => void;
  onOpenAdmin?: () => void;
}

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  onLoadDocumentToEditor,
  onApplyProfileToEditor,
  onClose,
  onOpenAdmin
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'wallet' | 'transactions'>('profile');
  
  // Recharge & Payment Modals
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [downloadPaymentDoc, setDownloadPaymentDoc] = useState<SavedUserDocument | null>(null);

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

  // Orders / Legacy SenePay Records
  const [orders, setOrders] = useState<OrderRecord[]>(() => {
    const saved = localStorage.getItem('senegal_cv_orders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [];
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
          } else {
            setProfile(prev => ({
              ...prev,
              uid: u.uid,
              email: u.email || prev.email,
              personalInfo: {
                firstName: '',
                lastName: '',
                phone: '',
                address: '',
                city: 'Dakar',
                country: 'Sénégal',
                targetJob: '',
                linkedin: '',
                portfolio: '',
                ...(prev?.personalInfo || {}),
                email: u.email || prev?.personalInfo?.email || ''
              }
            }));
          }

          const remoteDocs = await fetchUserDocuments(u.uid);
          if (remoteDocs && remoteDocs.length > 0) {
            setDocuments(remoteDocs);
            localStorage.setItem('senegal_cv_saved_documents', JSON.stringify(remoteDocs));
          }

          const remoteOrders = await fetchUserOrders(u.uid);
          if (remoteOrders && remoteOrders.length > 0) {
            setOrders(remoteOrders);
            localStorage.setItem('senegal_cv_orders', JSON.stringify(remoteOrders));
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

  // Handle document purchase download
  const handleDownloadConfirm = async (
    docItem: SavedUserDocument, 
    paymentMethod: 'wallet' | 'mobile_money' | 'senepay' | 'free', 
    tx?: TransactionRecord
  ) => {
    if (tx) {
      if (typeof tx.newBalance === 'number') {
        const updatedProfile = { ...profile, balance: tx.newBalance };
        setProfile(updatedProfile);
        localStorage.setItem('senegal_cv_user_profile', JSON.stringify(updatedProfile));
        if (user) await saveCandidateProfile(updatedProfile);
      }
      const updatedTxs = [tx, ...transactions];
      setTransactions(updatedTxs);
      localStorage.setItem('senegal_cv_transactions', JSON.stringify(updatedTxs));
      if (user) await saveTransactionRecord(tx);
    }

    // Mark doc as paid locally
    const updatedDocs = documents.map(d => d.id === docItem.id ? { ...d, isPaid: true } : d);
    setDocuments(updatedDocs);
    localStorage.setItem('senegal_cv_saved_documents', JSON.stringify(updatedDocs));

    // Open preview and download
    setPreviewDoc(docItem);
  };

  // Save profile
  const handleSaveProfile = async () => {
    setIsLoading(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    const updatedProfile: CandidateProfile = {
      ...profile,
      uid: user?.uid || profile.uid || 'guest',
      email: user?.email || profile.email || '',
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('senegal_cv_user_profile', JSON.stringify(updatedProfile));
    setProfile(updatedProfile);

    if (user) {
      const ok = await saveCandidateProfile(updatedProfile);
      if (!ok) {
        setErrorMessage('Sauvegardé localement. Connexion Firebase temporairement indisponible.');
      }
    }

    setSaveSuccess(true);
    setIsLoading(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Delete Document
  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce document de votre espace ?')) return;

    const newDocs = documents.filter(d => d.id !== docId);
    setDocuments(newDocs);
    localStorage.setItem('senegal_cv_saved_documents', JSON.stringify(newDocs));

    if (user) {
      await deleteUserDocument(docId);
    }
  };

  // Profile Form Handlers
  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setProfile(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value
      }
    }));
  };

  // Experience handlers
  const addExperience = () => {
    const newExp: Experience = {
      id: Date.now().toString(),
      position: '',
      company: '',
      location: 'Dakar',
      startDate: '2022',
      endDate: 'Présent',
      current: true,
      description: ''
    };
    setProfile(prev => ({
      ...prev,
      experiences: [newExp, ...prev.experiences]
    }));
  };

  const updateExperience = (id: string, field: keyof Experience, value: any) => {
    setProfile(prev => ({
      ...prev,
      experiences: prev.experiences.map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  const removeExperience = (id: string) => {
    setProfile(prev => ({
      ...prev,
      experiences: prev.experiences.filter(e => e.id !== id)
    }));
  };

  // Education handlers
  const addEducation = () => {
    const newEdu: Education = {
      id: Date.now().toString(),
      degree: '',
      institution: '',
      fieldOfStudy: '',
      location: 'Dakar',
      startDate: '2019',
      endDate: '2022',
      current: false,
      description: ''
    };
    setProfile(prev => ({
      ...prev,
      education: [newEdu, ...prev.education]
    }));
  };

  const updateEducation = (id: string, field: keyof Education, value: any) => {
    setProfile(prev => ({
      ...prev,
      education: prev.education.map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  const removeEducation = (id: string) => {
    setProfile(prev => ({
      ...prev,
      education: prev.education.filter(e => e.id !== id)
    }));
  };

  // Skills handlers
  const addSkillCategory = () => {
    setProfile(prev => ({
      ...prev,
      skills: [...prev.skills, { category: 'Nouvelle Catégorie', skills: ['Compétence 1'] }]
    }));
  };

  const updateSkillCategoryName = (index: number, name: string) => {
    const updated = [...profile.skills];
    updated[index].category = name;
    setProfile(prev => ({ ...prev, skills: updated }));
  };

  const updateSkillsString = (index: number, str: string) => {
    const updated = [...profile.skills];
    updated[index].skills = str.split(',').map(s => s.trim()).filter(Boolean);
    setProfile(prev => ({ ...prev, skills: updated }));
  };

  const removeSkillCategory = (index: number) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  // Language handlers
  const addLanguage = () => {
    setProfile(prev => ({
      ...prev,
      languages: [...prev.languages, { name: 'Anglais', level: 'Intermédiaire' }]
    }));
  };

  const updateLanguage = (index: number, field: keyof Language, value: any) => {
    const updated = [...profile.languages];
    updated[index] = { ...updated[index], [field]: value };
    setProfile(prev => ({ ...prev, languages: updated }));
  };

  const removeLanguage = (index: number) => {
    setProfile(prev => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index)
    }));
  };

  // Manual Credit Recharge Simulator / Action
  const handleSimulateRecharge = async (credits: number, price: number, desc: string) => {
    const newCredits = profile.credits + credits;
    const updatedProfile: CandidateProfile = {
      ...profile,
      credits: newCredits,
      subscriptionStatus: newCredits > 10 ? 'pro' : profile.subscriptionStatus
    };
    setProfile(updatedProfile);
    localStorage.setItem('senegal_cv_user_profile', JSON.stringify(updatedProfile));

    const newOrder: OrderRecord = {
      id: `RECHARGE-${Date.now()}`,
      userId: user?.uid || 'guest',
      mode: 'credit_recharge',
      price: price,
      createdAt: new Date().toISOString(),
      paymentStatus: 'success',
      creditsAdded: credits,
      transactionId: `SP-TX-${Math.floor(Math.random()*899999 + 100000)}`
    };

    const newOrders = [newOrder, ...orders];
    setOrders(newOrders);
    localStorage.setItem('senegal_cv_orders', JSON.stringify(newOrders));

    if (user) {
      await saveCandidateProfile(updatedProfile);
      await saveOrderRecord(newOrder);
    }
  };

  // Download PDF from Preview Modal
  const handleModalDownloadPDF = async () => {
    if (!previewDoc) return;
    setIsExportingPDF(true);
    try {
      if (previewDoc.generationMode === 'devis' || previewDoc.generationMode === 'facture' || previewDoc.generationMode === 'pack_business') {
        const elementId = 'modal-business-preview';
        const docNum = previewDoc.businessDocData?.docNumber || 'Document_Pro';
        await downloadElementAsPDF(elementId, `${docNum}.pdf`);
      } else if (previewDoc.generationMode === 'ebook') {
        const elementId = 'modal-ebook-preview';
        const title = previewDoc.ebookData?.title || 'Ebook_Pro';
        await downloadElementAsPDF(elementId, `${title.replace(/[\s\/\\]+/g, '_')}.pdf`);
      } else {
        const elementId = previewTab === 'cv' ? 'modal-cv-preview' : 'modal-letter-preview';
        const fullName = `${previewDoc?.formData?.personalInfo?.firstName || ''}_${previewDoc?.formData?.personalInfo?.lastName || ''}`.trim() || 'Document';
        const fileName = `${previewTab === 'cv' ? 'CV' : 'Lettre'}_${fullName.replace(/[\s\/\\]+/g, '_')}.pdf`;
        await downloadElementAsPDF(elementId, fileName);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Download Word from Preview Modal
  const handleModalDownloadDocx = async () => {
    if (!previewDoc) return;
    setIsExportingDocx(true);
    try {
      if (previewDoc.generationMode === 'devis' || previewDoc.generationMode === 'facture' || previewDoc.generationMode === 'pack_business') {
        if (previewDoc.businessDocData) {
          await exportBusinessDocToDocx(previewDoc.businessDocData);
        }
      } else if (previewDoc.generationMode === 'ebook' && previewDoc.ebookData) {
        await exportEbookToDocx(previewDoc.ebookData);
      } else {
        if (previewTab === 'cv') {
          await exportCVToDocx(previewDoc.formData, previewDoc.aiData);
        } else {
          await exportLetterToDocx(previewDoc.formData, previewDoc.aiData);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Direct Download DOCX from document card
  const handleDirectCardDocx = async (docItem: SavedUserDocument) => {
    setIsExportingDocx(true);
    try {
      if (docItem.generationMode === 'letter_only') {
        await exportLetterToDocx(docItem.formData, docItem.aiData);
      } else if (docItem.generationMode === 'devis' || docItem.generationMode === 'facture' || docItem.generationMode === 'pack_business') {
        if (docItem.businessDocData) {
          await exportBusinessDocToDocx(docItem.businessDocData);
        }
      } else if (docItem.generationMode === 'ebook' && docItem.ebookData) {
        await exportEbookToDocx(docItem.ebookData);
      } else {
        await exportCVToDocx(docItem.formData, docItem.aiData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingDocx(false);
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen p-3 sm:p-6 md:p-8 animate-fadeIn">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-violet-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-600/30 ring-4 ring-indigo-500/20 shrink-0">
              {profile?.personalInfo?.firstName ? profile.personalInfo.firstName.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Espace Candidat <span className="text-indigo-400">Pro</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Compte Dokya Actif
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {user ? `Connecté avec ${user.email}` : 'Profil Local - Connectez-vous pour synchroniser sur le Cloud'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
            <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2 rounded-2xl text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Solde Wallet</p>
              <p className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>{(profile.balance ?? 3000).toLocaleString('fr-FR')} FCFA</span>
              </p>
            </div>

            {isAdminEmail(user?.email) && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                type="button"
                className="px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
                title="Accéder au Tableau de Bord Administrateur"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Dashboard Admin</span>
              </button>
            )}

            <button
              onClick={() => setIsRechargeModalOpen(true)}
              type="button"
              className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Recharger Solde</span>
            </button>

            <button
              onClick={() => onApplyProfileToEditor(profile)}
              type="button"
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Créer un CV</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                type="button"
                className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                title="Fermer le tableau de bord"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            type="button"
            className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Mon Profil Pro</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            type="button"
            className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'documents'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Mes Documents ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            type="button"
            className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'wallet'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800/60 text-emerald-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Mon Solde ({(profile.balance ?? 3000).toLocaleString('fr-FR')} FCFA)</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            type="button"
            className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historique ({transactions.length})</span>
          </button>
        </div>

        {/* Status Messages */}
        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs font-semibold flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Profil Candidat enregistré avec succès ! Vos données seront pré-remplies lors des prochaines générations.</span>
            </div>
            <button
              onClick={() => onApplyProfileToEditor(profile)}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all"
            >
              Générer mon CV
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: MON PROFIL PRO */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            
            {/* Save floating bar */}
            <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700/80 p-4 rounded-2xl">
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

            {/* Form Section: Personal Info */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm border-b border-slate-700/60 pb-3">
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Nom *</label>
                  <input
                    type="text"
                    placeholder="Ndiaye"
                    value={profile?.personalInfo?.lastName || ''}
                    onChange={(e) => handlePersonalInfoChange('lastName', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Titre Professionnel *</label>
                  <input
                    type="text"
                    placeholder="Chef de Projet Digital / Comptable Senior"
                    value={profile?.personalInfo?.targetJob || ''}
                    onChange={(e) => handlePersonalInfoChange('targetJob', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Téléphone *</label>
                  <input
                    type="text"
                    placeholder="+221 77 123 45 67"
                    value={profile?.personalInfo?.phone || ''}
                    onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">E-mail *</label>
                  <input
                    type="email"
                    placeholder="mamadou.ndiaye@gmail.com"
                    value={profile?.personalInfo?.email || ''}
                    onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Adresse / Quartier</label>
                  <input
                    type="text"
                    placeholder="Mermoz Pyrotechnie, Villa 12"
                    value={profile?.personalInfo?.address || ''}
                    onChange={(e) => handlePersonalInfoChange('address', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Ville</label>
                  <input
                    type="text"
                    placeholder="Dakar"
                    value={profile?.personalInfo?.city || ''}
                    onChange={(e) => handlePersonalInfoChange('city', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Pays</label>
                  <input
                    type="text"
                    placeholder="Sénégal"
                    value={profile?.personalInfo?.country || ''}
                    onChange={(e) => handlePersonalInfoChange('country', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Profil LinkedIn</label>
                  <input
                    type="text"
                    placeholder="linkedin.com/in/mamadou-ndiaye"
                    value={profile.personalInfo.linkedin || ''}
                    onChange={(e) => handlePersonalInfoChange('linkedin', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Form Section: Experiences */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <Briefcase className="w-4 h-4 text-indigo-400" />
                  <span>Expériences Professionnelles ({profile.experiences.length})</span>
                </div>
                <button
                  onClick={addExperience}
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-indigo-500/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une expérience</span>
                </button>
              </div>

              {profile.experiences.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">Aucune expérience enregistrée. Cliquez sur le bouton pour en ajouter une.</p>
              ) : (
                <div className="space-y-4">
                  {profile.experiences.map((exp, idx) => (
                    <div key={exp.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 space-y-3 relative group">
                      <button
                        onClick={() => removeExperience(exp.id)}
                        type="button"
                        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-all"
                        title="Supprimer cette expérience"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-300">Intitulé du poste</label>
                          <input
                            type="text"
                            placeholder="Chef de Projet / Analyste"
                            value={exp.position}
                            onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-300">Entreprise / Organisation</label>
                          <input
                            type="text"
                            placeholder="Sonatel / Orange Sénégal"
                            value={exp.company}
                            onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-300">Lieu</label>
                          <input
                            type="text"
                            placeholder="Dakar, Sénégal"
                            value={exp.location}
                            onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-300">Date de début</label>
                          <input
                            type="text"
                            placeholder="Janv 2021"
                            value={exp.startDate}
                            onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-300">Date de fin</label>
                          <input
                            type="text"
                            placeholder="Présent"
                            value={exp.endDate}
                            onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300">Missions & Réalisations clés</label>
                        <textarea
                          rows={2}
                          placeholder="- Gestion d'une équipe de 5 développeurs&#10;- Augmentation du Chiffre d'Affaires de 25%&#10;- Coordination des projets digitaux"
                          value={exp.description}
                          onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs leading-relaxed resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Section: Education */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  <span>Formations & Diplômes ({profile.education.length})</span>
                </div>
                <button
                  onClick={addEducation}
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-indigo-500/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un diplôme</span>
                </button>
              </div>

              {profile.education.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">Aucun diplôme enregistré. Cliquez sur le bouton pour en ajouter un.</p>
              ) : (
                <div className="space-y-4">
                  {profile.education.map((edu) => (
                    <div key={edu.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 space-y-3 relative">
                      <button
                        onClick={() => removeEducation(edu.id)}
                        type="button"
                        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-300">Diplôme obtenu</label>
                          <input
                            type="text"
                            placeholder="Master en Informatique / Licence Pro"
                            value={edu.degree}
                            onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-300">Établissement / École</label>
                          <input
                            type="text"
                            placeholder="ESP Dakar / UCAD / BEM Dakar"
                            value={edu.institution}
                            onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-300">Années (début - fin)</label>
                          <input
                            type="text"
                            placeholder="2018 - 2021"
                            value={`${edu.startDate} - ${edu.endDate}`}
                            onChange={(e) => {
                              const parts = e.target.value.split('-');
                              updateEducation(edu.id, 'startDate', parts[0]?.trim() || '');
                              updateEducation(edu.id, 'endDate', parts[1]?.trim() || '');
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Section: Skills & Languages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Skills */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                    <Award className="w-4 h-4 text-indigo-400" />
                    <span>Compétences ({profile.skills.length})</span>
                  </div>
                  <button
                    onClick={addSkillCategory}
                    type="button"
                    className="px-2.5 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 text-xs font-bold transition-all flex items-center gap-1 border border-indigo-500/30"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ajouter catégorie</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {profile.skills.map((cat, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 space-y-2 relative">
                      <button
                        onClick={() => removeSkillCategory(idx)}
                        type="button"
                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="text"
                        value={cat.category}
                        onChange={(e) => updateSkillCategoryName(idx, e.target.value)}
                        className="w-full font-bold text-xs bg-transparent text-indigo-300 border-b border-slate-700 focus:outline-none py-1"
                        placeholder="Nom de catégorie"
                      />

                      <textarea
                        rows={2}
                        value={cat.skills.join(', ')}
                        onChange={(e) => updateSkillsString(idx, e.target.value)}
                        placeholder="Ex: React, Node.js, SQL, Analyse de données (séparées par des virgules)"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span>Langues Parlées ({profile.languages.length})</span>
                  </div>
                  <button
                    onClick={addLanguage}
                    type="button"
                    className="px-2.5 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 text-xs font-bold transition-all flex items-center gap-1 border border-indigo-500/30"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ajouter langue</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {profile.languages.map((lang, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-700/80">
                      <input
                        type="text"
                        value={lang.name}
                        onChange={(e) => updateLanguage(idx, 'name', e.target.value)}
                        placeholder="Français / Wolof / Anglais"
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                      />
                      <select
                        value={lang.level}
                        onChange={(e) => updateLanguage(idx, 'level', e.target.value as any)}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 text-xs font-semibold"
                      >
                        <option value="Débutant">Débutant</option>
                        <option value="Intermédiaire">Intermédiaire</option>
                        <option value="Avancé">Avancé</option>
                        <option value="Courant">Courant</option>
                        <option value="Bilingue / Maternelle">Bilingue / Maternelle</option>
                      </select>
                      <button
                        onClick={() => removeLanguage(idx)}
                        type="button"
                        className="p-1.5 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom Save Action */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveProfile}
                disabled={isLoading}
                type="button"
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-black shadow-xl shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <Save className="w-5 h-5" />
                <span>Enregistrer mon Profil Candidat</span>
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: MES DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-800/60 border border-slate-700/60 p-5 rounded-3xl">
              <div>
                <h3 className="text-base font-bold text-white">Historique de vos CVs & Lettres de Motivation</h3>
                <p className="text-xs text-slate-400">Accédez rapidement à tous vos documents générés, prévisualisez-les et téléchargez-les au format PDF ou Word.</p>
              </div>
              <button
                onClick={() => onApplyProfileToEditor(profile)}
                type="button"
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Créer un nouveau document</span>
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-800/30 border border-slate-800 rounded-3xl space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-200">Aucun document dans votre historique</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Générez votre premier CV ATS ou votre lettre de motivation pour qu'ils soient automatiquement conservés dans votre Espace Candidat.
                  </p>
                </div>
                <button
                  onClick={() => onApplyProfileToEditor(profile)}
                  type="button"
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
                >
                  Lancer le Générateur IA
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((docItem) => (
                  <div key={docItem.id} className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 hover:border-indigo-500/50 transition-all shadow-lg flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-3 py-1 rounded-full bg-indigo-950 text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider border border-indigo-800/50">
                            {docItem.generationMode === 'full_pack' ? 'Pack Complet CV + Lettre' : docItem.generationMode === 'letter_only' ? 'Lettre de Motivation' : docItem.generationMode === 'devis' ? 'Devis Pro' : docItem.generationMode === 'facture' ? 'Facture Client' : docItem.generationMode === 'pack_business' ? 'Pack Business' : docItem.generationMode === 'ebook' ? 'Livre Numérique' : 'CV Pro ATS'}
                          </span>
                          {docItem.isPaid ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Payé & Débloqué
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Non payé
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(docItem.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white line-clamp-1">
                        {docItem.title || `${docItem.formData?.personalInfo?.firstName || ''} ${docItem.formData?.personalInfo?.lastName || ''} - ${docItem.formData?.personalInfo?.targetJob || ''}`.trim() || 'Document Dokya'}
                      </h4>

                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>Poste / Titre : {docItem.formData?.personalInfo?.targetJob || docItem.businessDocData?.issuer?.companyName || docItem.ebookData?.title || 'Non spécifié'}</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {docItem.isPaid ? (
                          <>
                            {/* Direct PDF download from card */}
                            <button
                              onClick={() => {
                                setPreviewDoc(docItem);
                                setPreviewTab(docItem.generationMode === 'letter_only' ? 'letter' : 'cv');
                                setTimeout(handleModalDownloadPDF, 150);
                              }}
                              type="button"
                              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                              title="Télécharger directement en PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>

                            {/* Direct Word download from card */}
                            <button
                              onClick={() => handleDirectCardDocx(docItem)}
                              type="button"
                              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                              title="Télécharger directement en Word (.docx)"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Word (.docx)</span>
                            </button>

                            {/* Preview */}
                            <button
                              onClick={() => {
                                setPreviewDoc(docItem);
                                setPreviewTab(docItem.generationMode === 'letter_only' ? 'letter' : 'cv');
                              }}
                              type="button"
                              className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Voir l'aperçu du document"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-300" />
                              <span>Aperçu</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDownloadPaymentDoc(docItem)}
                            type="button"
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Débloquer (1 000 FCFA)</span>
                          </button>
                        )}

                        <button
                          onClick={() => onLoadDocumentToEditor(docItem.formData, docItem.aiData)}
                          type="button"
                          className="px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-indigo-500/30 cursor-pointer"
                          title="Modifier dans l'éditeur (créera un nouveau document)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteDoc(docItem.id)}
                        type="button"
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 3: MON SOLDE WALLET */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            
            {/* Wallet Overview Header */}
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
                    Utilisez votre solde FCFA pour télécharger vos CVs et Lettres en 1 clic. Chaque téléchargement déduit 1 000 FCFA de votre solde.
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

        {/* TAB 4: HISTORIQUE DES TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-400" />
                    <span>Historique de vos Opérations & Transactions ({transactions.length})</span>
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

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 italic">
                  Aucune transaction enregistrée pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="text-[11px] uppercase bg-slate-900/80 text-slate-400 font-bold border-b border-slate-700">
                      <tr>
                        <th className="p-3">Référence</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Montant</th>
                        <th className="p-3 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-slate-400">{tx.id}</td>
                          <td className="p-3 font-medium">{new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
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
              )}
            </div>
          </div>
        )}

      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Top Bar */}
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">{previewDoc.title || 'Prévisualisation du Document'}</h3>
                <p className="text-xs text-slate-400">Généré le {new Date(previewDoc.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-slate-900 p-1 rounded-xl flex items-center border border-slate-700">
                  <button
                    onClick={() => setPreviewTab('cv')}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      previewTab === 'cv' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    CV
                  </button>
                  <button
                    onClick={() => setPreviewTab('letter')}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      previewTab === 'letter' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Lettre
                  </button>
                </div>

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

      {/* RECHARGE WALLET MODAL */}
      <RechargeWalletModal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
        currentBalance={profile.balance ?? 3000}
        onRechargeSuccess={handleRechargeSuccess}
      />

      {/* DIRECT 2-OPTION PAYMENT MODAL */}
      {downloadPaymentDoc && (
        <PaymentModal
          isOpen={!!downloadPaymentDoc}
          onClose={() => setDownloadPaymentDoc(null)}
          documentTitle={downloadPaymentDoc.title || `${downloadPaymentDoc.formData?.personalInfo?.firstName || ''} ${downloadPaymentDoc.formData?.personalInfo?.lastName || ''} - Document Dokya`.trim() || 'Document Dokya'}
          documentTypeLabel={downloadPaymentDoc.generationMode === 'full_pack' ? 'Pack CV + Lettre' : downloadPaymentDoc.generationMode === 'letter_only' ? 'Lettre de Motivation' : 'CV Pro ATS'}
          price={1000}
          userBalance={profile.balance ?? 3000}
          isAlreadyPaid={downloadPaymentDoc.isPaid}
          onPaymentSuccess={(_method, tx) => {
            handleDownloadConfirm(downloadPaymentDoc, 'wallet', tx);
            setDownloadPaymentDoc(null);
          }}
          onOpenRechargeModal={() => setIsRechargeModalOpen(true)}
        />
      )}

    </div>
  );
};
