import React, { useState, useEffect } from 'react';
import { CVFormData, AIOptimizedData, CandidateProfile, SavedUserDocument, BusinessDocData, EbookData } from './types';
import { SAMPLE_CV_DATA } from './data/sampleData';
import { SAMPLE_EBOOK_DATA } from './data/sampleEbookData';
import { Header } from './components/Header';
import { StepForm } from './components/StepForm';
import { LetterEditorForm } from './components/LetterEditorForm';
import { CVTemplate } from './components/CVTemplate';
import { CoverLetterTemplate } from './components/CoverLetterTemplate';
import { CandidateDashboard } from './components/CandidateDashboard';
import { PaymentModal } from './components/PaymentModal';
import { RechargeWalletModal } from './components/RechargeWalletModal';
import { DevisFactureForm } from './components/DevisFactureForm';
import { DevisFactureTemplate } from './components/DevisFactureTemplate';
import { EbookWizardForm } from './components/EbookWizardForm';
import { EbookTemplate } from './components/EbookTemplate';
import { DocumentDedicatedPreview } from './components/DocumentDedicatedPreview';
import { ServicesOverviewBanner } from './components/ServicesOverviewBanner';
import { downloadElementAsPDF } from './lib/pdfUtils';
import { exportCVToDocx, exportLetterToDocx, exportBusinessDocToDocx, exportEbookToDocx } from './lib/exportUtils';
import { fetchWithRetry, safeParseJsonResponse } from './utils/apiHelpers';
import { auth, saveUserDocument, saveTransactionRecord } from './lib/firebase';
import { generateCVWithGemini } from './lib/geminiService';

import { 
  FileText, Sparkles, Download, CheckCircle2, 
  MessageSquare, Loader2, User, ArrowRight, ArrowLeft,
  Receipt, FileCheck, Package, Check, Zap, Eye, Mail, BookOpen
} from 'lucide-react';

const INITIAL_BUSINESS_DOC: BusinessDocData = {
  type: 'devis',
  docNumber: `DEV-${new Date().getFullYear()}-001`,
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  validityDays: 30,
  issuer: {
    name: 'Mamadou Ndiaye',
    companyName: 'Teranga Digital Agency',
    ninea: '008945231 2V3',
    rc: 'SN.DKR.2023.B.1450',
    phone: '+221 77 123 45 67',
    email: 'contact@terangadigital.sn',
    address: 'Point E, Boulevard de l\'Est',
    city: 'Dakar',
    country: 'Sénégal'
  },
  client: {
    name: 'Moussa Diagne',
    companyName: 'Sahel Distribution SARL',
    phone: '+221 78 987 65 43',
    email: 'moussa.diagne@sahel-distrib.sn',
    address: 'Almadies Zone 4, Lot 12',
    city: 'Dakar',
    country: 'Sénégal'
  },
  items: [
    { id: '1', description: 'Conception et développement d\'un site web vitrine responsive (Next.js & Tailwind CSS)', quantity: 1, unitPrice: 350000, total: 350000 },
    { id: '2', description: 'Intégration du module de paiement Mobile Money (Wave & Orange Money)', quantity: 1, unitPrice: 150000, total: 150000 },
    { id: '3', description: 'Configuration hébergement Cloud sécurisé et adresses emails pros (1 an)', quantity: 1, unitPrice: 80000, total: 80000 }
  ],
  applyVat: true,
  vatRate: 18,
  discountPercent: 0,
  paymentInfo: {
    waveNumber: '+221 77 123 45 67',
    orangeMoneyNumber: '+221 77 123 45 67',
    bankName: 'CBAO Groupe Attijariwafa Bank Sénégal',
    ibanOrRib: 'SN08 SN01 2012 3456 7890 1234 56'
  },
  notes: 'Validité du devis : 30 jours à compter de la date d\'émission.\nAcompte de 50% à la commande, solde à la livraison.',
  currency: 'FCFA'
};

interface AppProps {
  onOpenAdmin?: () => void;
}

export default function App({ onOpenAdmin }: AppProps = {}) {
  const [formData, setFormData] = useState<CVFormData>(() => {
    const saved = localStorage.getItem('cv_form_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return SAMPLE_CV_DATA;
  });

  const [businessDocData, setBusinessDocData] = useState<BusinessDocData>(() => {
    const saved = localStorage.getItem('business_doc_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_BUSINESS_DOC;
  });

  const [ebookData, setEbookData] = useState<EbookData>(() => {
    const saved = localStorage.getItem('ebook_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return SAMPLE_EBOOK_DATA;
  });

  const [aiData, setAiData] = useState<AIOptimizedData | null>(() => {
    const saved = localStorage.getItem('cv_ai_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Main Active View: 'services' (Home), dedicated form views, or dedicated preview views
  const [activeTab, setActiveTab] = useState<
    | 'services'
    | 'cv'
    | 'cv_preview'
    | 'letter'
    | 'letter_preview'
    | 'devis'
    | 'devis_preview'
    | 'facture'
    | 'facture_preview'
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

  // Track Unlocked / Paid Documents
  const [paidDocTypes, setPaidDocTypes] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('senegal_cv_paid_docs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {};
  });

  // Save paid docs changes
  useEffect(() => {
    localStorage.setItem('senegal_cv_paid_docs', JSON.stringify(paidDocTypes));
  }, [paidDocTypes]);

  // Handle return from SenePay Hosted Checkout return URL (supports search & hash format)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const searchParams = new URLSearchParams(window.location.search);
      let status = searchParams.get('status');
      let reference = searchParams.get('reference') || searchParams.get('orderReference');
      let amountParam = Number(searchParams.get('amount') || 0);

      // Check hash params (e.g., /#editor?status=success&reference=DOKYA-...)
      if (!status && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.substring(window.location.hash.indexOf('?') + 1);
        const hashParams = new URLSearchParams(hashQuery);
        status = hashParams.get('status') || status;
        reference = hashParams.get('reference') || hashParams.get('orderReference') || reference;
        amountParam = Number(hashParams.get('amount') || amountParam);
      }

      if (status === 'success' || (reference && status !== 'cancel')) {
        // Unlock all document types or specific document
        setPaidDocTypes(prev => ({
          ...prev,
          cv: true,
          letter: true,
          devis: true,
          facture: true,
          pack_business: true
        }));

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
          setSuccessMessage('Paiement sécurisé validé avec succès ! Vos documents sont débloqués.');
        }

        setTimeout(() => setSuccessMessage(null), 6000);

        // Clean up URL query parameters without reloading
        const cleanUrl = window.location.pathname + (window.location.hash.split('?')[0] || '');
        window.history.replaceState({}, document.title, cleanUrl);
      } else if (status === 'cancel') {
        setErrorMessage('Le paiement a été annulé. Vous pouvez réessayer ou utiliser votre solde.');
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } catch (_e) {}
  }, []);

  // Payment Modal State (Replaced old 4-step wizard with clean 2-option modal)
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
    // 1. Mark current document as paid & unlocked
    setPaidDocTypes(prev => {
      const updated = { ...prev, [paymentDocType]: true };
      if (paymentDocType === 'pack_business') {
        updated['devis'] = true;
        updated['facture'] = true;
      }
      return updated;
    });

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

    // 3. Save generated doc metadata
    const savedDoc: SavedUserDocument = {
      id: `DOC-${Date.now()}`,
      userId: auth.currentUser?.uid || 'guest',
      title: paymentDocTitle || 'Document Dokya',
      formData,
      aiData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generationMode: formData.generationMode || 'cv_only',
      isPaid: true
    };

    const savedDocsList = localStorage.getItem('senegal_cv_saved_documents');
    let docs: any[] = [];
    if (savedDocsList) {
      try { docs = JSON.parse(savedDocsList); } catch (e) {}
    }
    docs.unshift(savedDoc);
    localStorage.setItem('senegal_cv_saved_documents', JSON.stringify(docs));
    saveUserDocument(savedDoc);

    setSuccessMessage(`Document débloqué avec succès ! Vous pouvez maintenant le télécharger au format Word (.docx) et PDF (.pdf) en haut de l'écran.`);
    setTimeout(() => setSuccessMessage(null), 6000);
  };

  // -------------------------------------------------------------
  // Service Selection Dispatcher from Home / Catalog
  // -------------------------------------------------------------
  const handleSelectService = (service: 'cv' | 'letter' | 'full_pack' | 'devis' | 'facture' | 'pack_business' | 'ebook' | 'dashboard') => {
    if (service === 'cv' || service === 'full_pack') {
      setFormData(prev => ({ ...prev, generationMode: 'cv_only' }));
      setActiveTab('cv');
    } else if (service === 'letter') {
      setFormData(prev => ({ ...prev, generationMode: 'letter_only' }));
      setActiveTab('letter');
    } else if (service === 'devis') {
      setBusinessDocData(prev => ({ ...prev, type: 'devis' }));
      setActiveTab('devis');
    } else if (service === 'facture') {
      setBusinessDocData(prev => ({ ...prev, type: 'facture' }));
      setActiveTab('facture');
    } else if (service === 'pack_business') {
      setBusinessDocData(prev => ({ ...prev, type: 'devis' }));
      setPackBusinessSubTab('devis');
      setActiveTab('pack_business');
    } else if (service === 'ebook') {
      setActiveTab('ebook');
    } else if (service === 'dashboard') {
      setActiveTab('dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auto-save form data
  useEffect(() => {
    localStorage.setItem('cv_form_data', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    localStorage.setItem('business_doc_data', JSON.stringify(businessDocData));
  }, [businessDocData]);

  useEffect(() => {
    localStorage.setItem('ebook_data', JSON.stringify(ebookData));
  }, [ebookData]);

  useEffect(() => {
    if (aiData) {
      localStorage.setItem('cv_ai_data', JSON.stringify(aiData));
    }
  }, [aiData]);

  // Load Sample Data
  const handleLoadSample = () => {
    setFormData(SAMPLE_CV_DATA);
    setErrorMessage(null);
    setSuccessMessage("Exemple professionnel chargé avec succès !");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Handle Form Reset
  const handleReset = () => {
    if (window.confirm('Voulez-vous vraiment effacer les informations du formulaire actif ?')) {
      if (activeTab === 'devis' || activeTab === 'facture' || activeTab === 'pack_business') {
        setBusinessDocData(INITIAL_BUSINESS_DOC);
      } else {
        const emptyForm: CVFormData = {
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
        };
        setFormData(emptyForm);
        setAiData(null);
        localStorage.removeItem('cv_ai_data');
      }
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
    setActiveTab('cv');
    setSuccessMessage("Document chargé dans l'Éditeur !");
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Main Submit Call using Gemini SDK directly (works seamlessly on Vercel SPA and Fullstack)
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
        setSuccessMessage("CV téléchargé au format PDF avec succès !");
      }
      setTimeout(() => setSuccessMessage(null), 4000);
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
        setSuccessMessage("Lettre de motivation téléchargée au format PDF avec succès !");
      }
      setTimeout(() => setSuccessMessage(null), 4000);
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
      setSuccessMessage(`${businessDocData.type === 'devis' ? 'Devis' : 'Facture'} téléchargé(e) avec succès en PDF HD !`);
      setTimeout(() => setSuccessMessage(null), 4000);
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
      setSuccessMessage("Livre Numérique (Ebook) téléchargé avec succès en PDF !");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error generating Ebook PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const downloadFullPackPDF = async () => {
    setIsGeneratingPDF(true);
    setErrorMessage(null);
    try {
      const fullName = `${formData?.personalInfo?.firstName || ''}_${formData?.personalInfo?.lastName || ''}`.trim() || 'Candidat';
      const cvFileName = `CV_${fullName.replace(/[\s\/\\]+/g, '_')}.pdf`;
      await downloadElementAsPDF('cv-preview', cvFileName);

      const letterFileName = `Lettre_Motivation_${fullName.replace(/[\s\/\\]+/g, '_')}.pdf`;
      await downloadElementAsPDF('letter-preview', letterFileName);

      setSuccessMessage("Pack Emploi (CV + Lettre) téléchargé au format PDF avec succès !");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erreur lors du téléchargement du Pack Complet:', err);
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
        setSuccessMessage("Lettre de motivation exportée au format Word (.docx) avec succès !");
      } else if (
        activeTab === 'devis' || activeTab === 'devis_preview' ||
        activeTab === 'facture' || activeTab === 'facture_preview' ||
        activeTab === 'pack_business' || activeTab === 'pack_business_preview'
      ) {
        await exportBusinessDocToDocx(businessDocData);
        setSuccessMessage(`${businessDocData.type === 'devis' ? 'Devis' : 'Facture'} exporté(e) au format Word (.docx) avec succès !`);
      } else if (activeTab === 'ebook' || activeTab === 'ebook_preview') {
        await exportEbookToDocx(ebookData);
        setSuccessMessage("Livre Numérique (Ebook) exporté au format Word (.docx) avec succès !");
      } else {
        await exportCVToDocx(formData, aiData);
        setSuccessMessage("CV exporté au format Word (.docx) avec succès !");
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error("Erreur lors de l'export DOCX:", err);
      setErrorMessage("Impossible de générer le fichier Word (.docx).");
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  const hasActiveData = (formData?.experiences?.length || 0) > 0 || !!formData?.personalInfo?.firstName || !!businessDocData?.issuer?.name;

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
        onGoServices={() => setActiveTab('services')}
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
        {/* VIEW 2A : ÉTAPE 1 - SAISIE CV PRO ATS (1 000 FCFA)                        */}
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
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2B : ÉTAPE 2 - APERÇU PLEIN ÉCRAN DÉDIÉ DU CV PRO ATS               */}
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
              isPaid={!!paidDocTypes['cv']}
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
              onGoServices={() => setActiveTab('services')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3A : ÉTAPE 1 - SAISIE LETTRE DE MOTIVATION (1 000 FCFA)              */}
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
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3B : ÉTAPE 2 - APERÇU PLEIN ÉCRAN DÉDIÉ DE LA LETTRE                */}
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
              isPaid={!!paidDocTypes['letter']}
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
              onGoServices={() => setActiveTab('services')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4A : ÉTAPE 1 - SAISIE DEVIS PROFESSIONNEL (1 000 FCFA)               */}
        {/* ========================================================================= */}
        {activeTab === 'devis' && (
          <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
            <DevisFactureForm
              data={businessDocData}
              onChange={setBusinessDocData}
              onOpenWizard={() => handleGenerateBusinessDoc('devis')}
              onPreview={() => setActiveTab('devis_preview')}
              hideTypeSwitch={true}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4B : ÉTAPE 2 - APERÇU PLEIN ÉCRAN DÉDIÉ DU DEVIS                    */}
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
              isPaid={!!paidDocTypes['devis']}
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
              onGoServices={() => setActiveTab('services')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5A : ÉTAPE 1 - SAISIE FACTURE CLIENT (1 000 FCFA)                    */}
        {/* ========================================================================= */}
        {activeTab === 'facture' && (
          <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
            <DevisFactureForm
              data={businessDocData}
              onChange={setBusinessDocData}
              onOpenWizard={() => handleGenerateBusinessDoc('facture')}
              onPreview={() => setActiveTab('facture_preview')}
              hideTypeSwitch={true}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5B : ÉTAPE 2 - APERÇU PLEIN ÉCRAN DÉDIÉ DE LA FACTURE               */}
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
              isPaid={!!paidDocTypes['facture']}
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
              onGoServices={() => setActiveTab('services')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 7A : ÉTAPE 1 - SAISIE PACK BUSINESS (1 499 FCFA)                     */}
        {/* ========================================================================= */}
        {activeTab === 'pack_business' && (
          <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
            {/* Pack Business Sub-Switcher Header */}
            <div className="bg-white border-2 border-amber-300 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md">
                  Pack Business Pro (Devis + Facture)
                </span>
                <span className="text-xs font-black text-amber-800">1 499 FCFA</span>
              </div>

              {/* Sub Tabs: Devis vs Facture */}
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

            {/* Saisie Devis & Facture Form */}
            <DevisFactureForm
              data={businessDocData}
              onChange={setBusinessDocData}
              onOpenWizard={() => handleGenerateBusinessDoc('pack_business')}
              onPreview={() => setActiveTab('pack_business_preview')}
              hideTypeSwitch={false}
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
              isPaid={!!paidDocTypes['pack_business']}
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
              onGoServices={() => setActiveTab('services')}
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
              onGoServices={() => setActiveTab('services')}
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
              isPaid={!!paidDocTypes['ebook']}
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
              onGoServices={() => setActiveTab('services')}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 8 : CANDIDATE DASHBOARD / ESPACE SÉCURISÉ                            */}
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
        isAlreadyPaid={!!paidDocTypes[paymentDocType]}
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

    </div>
  );
}
