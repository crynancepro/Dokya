import React, { useState, useEffect } from 'react';
import { CVFormData, AIOptimizedData, CandidateProfile, SavedUserDocument, BusinessDocData, EbookData } from './types';
import { SAMPLE_CV_DATA } from './data/sampleData';
import { SAMPLE_EBOOK_DATA } from './data/sampleEbookData';
import { Header } from './components/Header';
import { StepForm } from './components/StepForm';
import { LetterEditorForm } from './components/LetterEditorForm';
import { CandidateDashboard } from './components/CandidateDashboard';
import { PaymentModal } from './components/PaymentModal';
import { RechargeWalletModal } from './components/RechargeWalletModal';
import { DevisFactureForm } from './components/DevisFactureForm';
import { EbookWizardForm } from './components/EbookWizardForm';
import { DocumentDedicatedPreview } from './components/DocumentDedicatedPreview';
import { ServicesOverviewBanner } from './components/ServicesOverviewBanner';
import { CVTemplateGallery } from './components/CVTemplateGallery';
import { BusinessDocTemplateGallery } from './components/BusinessDocTemplateGallery';
import { LetterTemplateGallery } from './components/LetterTemplateGallery';
import { downloadElementAsPDF } from './lib/pdfUtils';
import { exportCVToDocx, exportLetterToDocx, exportBusinessDocToDocx, exportEbookToDocx } from './lib/exportUtils';
import { auth, saveUserDocument, saveTransactionRecord } from './lib/firebase';
import { generateCVWithGemini } from './lib/geminiService';

import { 
  CheckCircle2, User, ArrowRight,
  FileCheck, Receipt, Eye, FolderHeart, Sparkles, PlusCircle, X, ShieldCheck
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

interface AppProps {
  onOpenAdmin?: () => void;
}

export default function App({ onOpenAdmin }: AppProps = {}) {
  // CLEAN FORM STATE - NO LOCALSTORAGE PERSISTENCE FOR INPUT FIELDS
  const [formData, setFormData] = useState<CVFormData>(createEmptyCVFormData);
  const [businessDocData, setBusinessDocData] = useState<BusinessDocData>(() => createEmptyBusinessDocData('devis'));
  const [ebookData, setEbookData] = useState<EbookData>(createEmptyEbookData);
  const [aiData, setAiData] = useState<AIOptimizedData | null>(null);

  // Pay-per-document state strictly attached to the current document being crafted
  const [isCurrentDocPaid, setIsCurrentDocPaid] = useState<boolean>(false);
  const [currentDocId, setCurrentDocId] = useState<string>(() => `DOC-${Date.now()}`);

  // Post-download modal state
  const [isPostDownloadModalOpen, setIsPostDownloadModalOpen] = useState<boolean>(false);
  const [downloadedDocTitle, setDownloadedDocTitle] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clean any old stale form cache from browser on first mount
  useEffect(() => {
    try {
      localStorage.removeItem('cv_form_data');
      localStorage.removeItem('business_doc_data');
      localStorage.removeItem('ebook_data');
      localStorage.removeItem('cv_ai_data');
      localStorage.removeItem('senegal_cv_paid_docs');
    } catch (_e) {}
  }, []);

  // Main Active View: 'services' (Home), dedicated gallery views, form views, or preview views
  const [activeTab, setActiveTab] = useState<
    | 'services'
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
    | 'dashboard'
  >('services');

  // Pack specific sub-switchers
  const [packBusinessSubTab, setPackBusinessSubTab] = useState<'devis' | 'facture'>('devis');

  const [isEditingDirectly, setIsEditingDirectly] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState<boolean>(false);

  // User Wallet Balance
  const [userBalance, setUserBalance] = useState<number>(() => {
    const saved = localStorage.getItem('senegal_cv_user_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.balance === 'number') return parsed.balance;
      } catch (e) { /* ignore */ }
    }
    return 3000;
  });

  // Handle return from SenePay Hosted Checkout return URL
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const searchParams = new URLSearchParams(window.location.search);
      let status = searchParams.get('status');
      let reference = searchParams.get('reference') || searchParams.get('orderReference');
      let amountParam = Number(searchParams.get('amount') || 0);

      if (!status && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.substring(window.location.hash.indexOf('?') + 1);
        const hashParams = new URLSearchParams(hashQuery);
        status = hashParams.get('status') || status;
        reference = hashParams.get('reference') || hashParams.get('orderReference') || reference;
        amountParam = Number(hashParams.get('amount') || amountParam);
      }

      if (status === 'success' || (reference && status !== 'cancel')) {
        setIsCurrentDocPaid(true);

        if (reference?.startsWith('RECHARGE-') && amountParam > 0) {
          setUserBalance(prev => {
            const nextBal = prev + amountParam;
            try {
              const profile = JSON.parse(localStorage.getItem('senegal_cv_user_profile') || '{}');
              profile.balance = nextBal;
              localStorage.setItem('senegal_cv_user_profile', JSON.stringify(profile));
            } catch (_e) {}
            return nextBal;
          });
          setSuccessMessage(`Recharge de ${(amountParam).toLocaleString('fr-FR')} FCFA validée avec succès ! Votre solde est à jour.`);
        } else {
          setSuccessMessage('Paiement sécurisé validé avec succès ! Votre document est débloqué.');
        }

        setTimeout(() => setSuccessMessage(null), 6000);

        const cleanUrl = window.location.pathname + (window.location.hash.split('?')[0] || '');
        window.history.replaceState({}, document.title, cleanUrl);
      } else if (status === 'cancel') {
        setErrorMessage('Le paiement a été annulé. Vous pouvez réessayer ou utiliser votre solde.');
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } catch (_e) {}
  }, []);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentDocType, setPaymentDocType] = useState<'cv' | 'letter' | 'devis' | 'facture' | 'pack_business' | 'ebook'>('cv');
  const [paymentDocTitle, setPaymentDocTitle] = useState<string>('');
  const [paymentDocTypeLabel, setPaymentDocTypeLabel] = useState<string>('CV Pro ATS');
  const [paymentPrice, setPaymentPrice] = useState<number>(1000);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState<boolean>(false);

  // -------------------------------------------------------------
  // Open Payment Modal Handlers for each service
  // -------------------------------------------------------------
  const handleOpenPaymentModal = (docType: 'cv' | 'letter' | 'devis' | 'facture' | 'pack_business' | 'ebook') => {
    setPaymentDocType(docType);
    if (docType === 'cv') {
      const title = `${formData?.personalInfo?.firstName || ''} ${formData?.personalInfo?.lastName || ''} - CV Pro ATS`.trim();
      setPaymentDocTitle(title || 'Mon CV Pro ATS');
      setPaymentDocTypeLabel('CV Pro ATS');
      setPaymentPrice(1000);
    } else if (docType === 'letter') {
      const title = `${formData?.personalInfo?.firstName || ''} ${formData?.personalInfo?.lastName || ''} - Lettre de Motivation`.trim();
      setPaymentDocTitle(title || 'Ma Lettre de Motivation');
      setPaymentDocTypeLabel('Lettre de Motivation');
      setPaymentPrice(1000);
    } else if (docType === 'devis') {
      setPaymentDocTitle(`Devis Professionnel - ${businessDocData.docNumber}`);
      setPaymentDocTypeLabel('Devis Professionnel');
      setPaymentPrice(1000);
    } else if (docType === 'facture') {
      setPaymentDocTitle(`Facture Client - ${businessDocData.docNumber}`);
      setPaymentDocTypeLabel('Facture Client');
      setPaymentPrice(1000);
    } else if (docType === 'ebook') {
      setPaymentDocTitle(ebookData.title || 'Mon Livre Numérique');
      setPaymentDocTypeLabel('Livre Numérique (Ebook Pro)');
      setPaymentPrice(1500);
    } else {
      setPaymentDocTitle(`Pack Business (Devis + Facture) - ${businessDocData.docNumber}`);
      setPaymentDocTypeLabel('Pack Business (Devis + Facture)');
      setPaymentPrice(1499);
    }
    setIsPaymentModalOpen(true);
  };

  // Handle successful payment
  const handlePaymentSuccess = (method: 'wallet' | 'mobile_money' | 'free', tx?: any) => {
    // 1. Mark strictly current document as paid
    setIsCurrentDocPaid(true);

    // 2. If paid by wallet debit, update local balance & transaction logs
    if (method === 'wallet' && tx) {
      if (typeof tx.newBalance === 'number') {
        setUserBalance(tx.newBalance);
      } else {
        setUserBalance(prev => Math.max(0, prev - paymentPrice));
      }

      const savedProfileStr = localStorage.getItem('senegal_cv_user_profile');
      let profileObj: any = {};
      if (savedProfileStr) {
        try { profileObj = JSON.parse(savedProfileStr); } catch (e) {}
      }
      profileObj.balance = typeof tx.newBalance === 'number' ? tx.newBalance : Math.max(0, userBalance - paymentPrice);
      localStorage.setItem('senegal_cv_user_profile', JSON.stringify(profileObj));

      const savedTxList = localStorage.getItem('senegal_cv_transactions');
      let txs: any[] = [];
      if (savedTxList) {
        try { txs = JSON.parse(savedTxList); } catch (e) {}
      }
      txs.unshift(tx);
      localStorage.setItem('senegal_cv_transactions', JSON.stringify(txs));
      saveTransactionRecord(tx);
    }

    setSuccessMessage(`Document débloqué avec succès ! Vous pouvez maintenant le télécharger au format Word (.docx) et PDF (.pdf).`);
    setTimeout(() => setSuccessMessage(null), 6000);
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
      const savedDocsList = localStorage.getItem('senegal_cv_saved_documents');
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
      localStorage.setItem('senegal_cv_saved_documents', JSON.stringify(docs));
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
  // Service Selection Dispatcher from Home / Catalog (Gallery First Flow)
  // -------------------------------------------------------------
  const handleSelectService = (service: 'cv' | 'letter' | 'full_pack' | 'devis' | 'facture' | 'pack_business' | 'ebook' | 'dashboard') => {
    handleCreateNewDocument();

    if (service === 'cv' || service === 'full_pack') {
      setFormData(prev => ({ ...prev, generationMode: 'cv_only' }));
      setActiveTab('cv_gallery');
    } else if (service === 'letter') {
      setFormData(prev => ({ ...prev, generationMode: 'letter_only' }));
      setActiveTab('letter_gallery');
    } else if (service === 'devis') {
      setBusinessDocData(createEmptyBusinessDocData('devis'));
      setActiveTab('devis_gallery');
    } else if (service === 'facture') {
      setBusinessDocData(createEmptyBusinessDocData('facture'));
      setActiveTab('facture_gallery');
    } else if (service === 'pack_business') {
      setBusinessDocData(createEmptyBusinessDocData('devis'));
      setPackBusinessSubTab('devis');
      setActiveTab('pack_business_gallery');
    } else if (service === 'ebook') {
      setActiveTab('ebook');
    } else if (service === 'dashboard') {
      setActiveTab('dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load Sample Data (For demonstration, preserves user-selected template style & color)
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

  // Load Saved Document to Editor (Creates a fresh new draft requiring its own payment)
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

  // Main Submit Call using Gemini SDK directly
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

      // AUTOMATIC REDIRECTION TO ÉTAPE 2 : APERÇU PLEIN ÉCRAN
      if (activeTab === 'letter') {
        setActiveTab('letter_preview');
      } else {
        setActiveTab('cv_preview');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Erreur submission:', err);
      setErrorMessage(err.message || 'Une erreur est survenue lors de la communication avec l\'IA Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  // Business Doc Generation / Preview Trigger
  const handleGenerateBusinessDoc = (type: 'devis' | 'facture' | 'pack_business') => {
    setSuccessMessage("Document commercial mis à jour avec succès !");
    setTimeout(() => setSuccessMessage(null), 3000);
    if (type === 'devis') {
      setActiveTab('devis_preview');
    } else if (type === 'facture') {
      setActiveTab('facture_preview');
    } else {
      setActiveTab('pack_business_preview');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // PDF Download Handlers
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      
      {/* 1. DEDICATED OR PORTAL HEADER */}
      <Header
        currentView={activeTab}
        userBalance={userBalance}
        onLoadSample={handleLoadSample}
        onReset={handleReset}
        hasData={hasActiveData}
        onOpenDashboard={() => setActiveTab('dashboard')}
        onGoServices={() => {
          handleCreateNewDocument();
          setActiveTab('services');
        }}
        onOpenAdmin={onOpenAdmin}
        onOpenRecharge={() => setIsRechargeModalOpen(true)}
      />

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        
        {/* Success Alert Box */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold text-xs cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 hover:text-rose-800 font-bold text-xs cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1 : SERVICES CATALOG & HOME (DEFAULT)                                */}
        {/* ========================================================================= */}
        {activeTab === 'services' && (
          <ServicesOverviewBanner
            currentTab={activeTab}
            onSelectService={handleSelectService}
            onOpenRecharge={() => setIsRechargeModalOpen(true)}
            onLoadSample={() => {
              handleLoadSample();
              setActiveTab('cv');
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 2A-GAL : ÉTAPE 1 - GALERIE OBLIGATOIRE DES MODÈLES CV (50+ MODÈLES)  */}
        {/* ========================================================================= */}
        {activeTab === 'cv_gallery' && (
          <CVTemplateGallery
            selectedTemplateId={formData.templateStyle}
            selectedColor={formData.themeColor}
            onSelectTemplate={(templateId, color) => {
              setFormData(prev => ({
                ...prev,
                templateStyle: templateId as any,
                themeColor: color || prev.themeColor
              }));
              setActiveTab('cv');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoServices={() => {
              handleCreateNewDocument();
              setActiveTab('services');
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 2A : ÉTAPE 2 - FORMULAIRE DE SAISIE CV PRO ATS (1 000 FCFA)          */}
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
              onChangeTemplateRequest={() => {
                setActiveTab('cv_gallery');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2B : ÉTAPE 3 - APERÇU PLEIN ÉCRAN DÉDIÉ DU CV PRO ATS               */}
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
              onGoServices={() => {
                handleCreateNewDocument();
                setActiveTab('services');
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3A-GAL : ÉTAPE 1 - GALERIE MODÈLES DE LETTRE DE MOTIVATION           */}
        {/* ========================================================================= */}
        {activeTab === 'letter_gallery' && (
          <LetterTemplateGallery
            selectedStyleId={formData.templateStyle}
            selectedLetterType={formData.letterType}
            onSelectTemplate={(styleId, letterType) => {
              setFormData(prev => ({
                ...prev,
                templateStyle: styleId as any,
                letterType
              }));
              setActiveTab('letter');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoServices={() => {
              handleCreateNewDocument();
              setActiveTab('services');
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 3A : ÉTAPE 2 - SAISIE LETTRE DE MOTIVATION (1 000 FCFA)              */}
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
              onChangeTemplateRequest={() => {
                setActiveTab('letter_gallery');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3B : ÉTAPE 3 - APERÇU PLEIN ÉCRAN DÉDIÉ DE LA LETTRE                */}
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
              onGoServices={() => {
                handleCreateNewDocument();
                setActiveTab('services');
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4A-GAL : ÉTAPE 1 - GALERIE MODÈLES DE DEVIS PROFESSIONNEL            */}
        {/* ========================================================================= */}
        {activeTab === 'devis_gallery' && (
          <BusinessDocTemplateGallery
            docType="devis"
            selectedTemplateId={businessDocData.templateStyle}
            selectedColor={businessDocData.themeColor}
            onSelectTemplate={(templateId, color) => {
              setBusinessDocData(prev => ({
                ...prev,
                type: 'devis',
                templateStyle: templateId,
                themeColor: color || prev.themeColor
              }));
              setActiveTab('devis');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoServices={() => {
              handleCreateNewDocument();
              setActiveTab('services');
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 4A : ÉTAPE 2 - SAISIE DEVIS PROFESSIONNEL (1 000 FCFA)               */}
        {/* ========================================================================= */}
        {activeTab === 'devis' && (
          <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
            <DevisFactureForm
              data={businessDocData}
              onChange={setBusinessDocData}
              onOpenWizard={() => handleGenerateBusinessDoc('devis')}
              onPreview={() => setActiveTab('devis_preview')}
              hideTypeSwitch={true}
              onChangeTemplateRequest={() => {
                setActiveTab('devis_gallery');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4B : ÉTAPE 3 - APERÇU PLEIN ÉCRAN DÉDIÉ DU DEVIS                    */}
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
              onGoServices={() => {
                handleCreateNewDocument();
                setActiveTab('services');
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5A-GAL : ÉTAPE 1 - GALERIE MODÈLES DE FACTURE CLIENT                 */}
        {/* ========================================================================= */}
        {activeTab === 'facture_gallery' && (
          <BusinessDocTemplateGallery
            docType="facture"
            selectedTemplateId={businessDocData.templateStyle}
            selectedColor={businessDocData.themeColor}
            onSelectTemplate={(templateId, color) => {
              setBusinessDocData(prev => ({
                ...prev,
                type: 'facture',
                templateStyle: templateId,
                themeColor: color || prev.themeColor
              }));
              setActiveTab('facture');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoServices={() => {
              handleCreateNewDocument();
              setActiveTab('services');
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 5A : ÉTAPE 2 - SAISIE FACTURE CLIENT (1 000 FCFA)                    */}
        {/* ========================================================================= */}
        {activeTab === 'facture' && (
          <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
            <DevisFactureForm
              data={businessDocData}
              onChange={setBusinessDocData}
              onOpenWizard={() => handleGenerateBusinessDoc('facture')}
              onPreview={() => setActiveTab('facture_preview')}
              hideTypeSwitch={true}
              onChangeTemplateRequest={() => {
                setActiveTab('facture_gallery');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5B : ÉTAPE 3 - APERÇU PLEIN ÉCRAN DÉDIÉ DE LA FACTURE               */}
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
              onGoServices={() => {
                handleCreateNewDocument();
                setActiveTab('services');
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 7A-GAL : ÉTAPE 1 - GALERIE MODÈLES PACK BUSINESS                     */}
        {/* ========================================================================= */}
        {activeTab === 'pack_business_gallery' && (
          <BusinessDocTemplateGallery
            docType="pack_business"
            selectedTemplateId={businessDocData.templateStyle}
            selectedColor={businessDocData.themeColor}
            onSelectTemplate={(templateId, color) => {
              setBusinessDocData(prev => ({
                ...prev,
                templateStyle: templateId,
                themeColor: color || prev.themeColor
              }));
              setActiveTab('pack_business');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoServices={() => {
              handleCreateNewDocument();
              setActiveTab('services');
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 7A : ÉTAPE 2 - SAISIE PACK BUSINESS (1 499 FCFA)                     */}
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
              onChangeTemplateRequest={() => {
                setActiveTab('pack_business_gallery');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 7B : ÉTAPE 2 - APERÇU PLEIN ÉCRAN DÉDIÉ DU PACK BUSINESS             */}
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
              onGoServices={() => {
                handleCreateNewDocument();
                setActiveTab('services');
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 8A : ÉTAPE 1 - CRÉATION D'EBOOK / LIVRE NUMÉRIQUE (1 500 FCFA)       */}
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
              onGoServices={() => {
                handleCreateNewDocument();
                setActiveTab('services');
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 8B : ÉTAPE 2 - APERÇU PLEIN ÉCRAN DÉDIÉ DU LIVRE NUMÉRIQUE           */}
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
              onGoServices={() => {
                handleCreateNewDocument();
                setActiveTab('services');
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 9 : CANDIDATE DASHBOARD / ESPACE SÉCURISÉ                            */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in">
            <CandidateDashboard
              onApplyProfileToEditor={handleApplyProfileToEditor}
              onLoadDocumentToEditor={handleLoadDocumentToEditor}
              onOpenAdmin={onOpenAdmin}
            />
          </div>
        )}

      </main>

      {/* 3. NEW DIRECT 2-OPTION PAYMENT MODAL (WALLET vs MOBILE MONEY & CARTE) */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        documentTitle={paymentDocTitle}
        documentTypeLabel={paymentDocTypeLabel}
        price={paymentPrice}
        userBalance={userBalance}
        isAlreadyPaid={isCurrentDocPaid}
        onPaymentSuccess={handlePaymentSuccess}
        onOpenRechargeModal={() => {
          setIsPaymentModalOpen(false);
          setIsRechargeModalOpen(true);
        }}
      />

      {/* 4. RECHARGE WALLET MODAL */}
      <RechargeWalletModal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
        userBalance={userBalance}
        onSuccess={(addedAmount) => {
          const newBal = userBalance + addedAmount;
          setUserBalance(newBal);
          
          const profileStr = localStorage.getItem('senegal_cv_user_profile');
          let profileObj: any = {};
          if (profileStr) {
            try { profileObj = JSON.parse(profileStr); } catch (e) {}
          }
          profileObj.balance = newBal;
          localStorage.setItem('senegal_cv_user_profile', JSON.stringify(profileObj));

          setSuccessMessage(`Solde rechargé avec succès (+${(addedAmount || 0).toLocaleString('fr-FR')} FCFA) !`);
          setTimeout(() => setSuccessMessage(null), 4000);
        }}
      />

      {/* 5. POST-DOWNLOAD CONFIRMATION & ARCHIVAL MODAL */}
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
                  setActiveTab('dashboard');
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
                  setActiveTab('services');
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

    </div>
  );
}
