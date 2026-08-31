export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string; // e.g. Dakar, Thiès, Saint-Louis, Abidjan...
  country: string;
  targetJob: string;
  linkedin?: string;
  portfolio?: string;
  photoUrl?: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface Education {
  id: string;
  institution: string; // e.g., UCAD, ESP Dakar, BEM, ISM, INP-HB
  degree: string;
  fieldOfStudy: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description?: string;
}

export interface SkillCategory {
  category: string; // e.g. Technique, Logiciels, Soft Skills
  skills: string[];
}

export interface Language {
  name: string; // e.g. Français, Wolof, Anglais, Espagnol
  level: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Courant' | 'Bilingue / Maternelle';
}

export type GenerationMode = 'cv_only' | 'letter_only' | 'full_pack' | 'devis' | 'facture' | 'pack_business' | 'ebook' | 'pass_illimite';

export interface EbookCoverProposal {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  genreBadge?: string;
  tagline?: string;
  artStyle: 'photorealistic' | 'illustration' | 'minimalist' | 'abstract';
  artStyleLabel: string;
  paletteName: string;
  bgGradient: string;
  bgPattern?: 'grid' | 'dots' | 'radial' | 'minimal' | 'waves' | 'mesh' | 'gold_frame' | 'geometric' | 'stars' | 'watercolor' | 'marble';
  textColor: string;
  subtitleColor: string;
  accentColor: string;
  fontFamily: 'serif' | 'sans' | 'display' | 'mono';
  layoutVariant: 'centered' | 'editorial' | 'bold_modern' | 'split_frame' | 'minimalist_luxury' | 'geometric' | 'illustrated_storybook' | 'cinematic_poster';
  coverArtEmojiOrIcon?: string;
  artImageUrl?: string;
  imagePrompt?: string;
  artTexture?: 'linen' | 'leather' | 'marble' | 'parchment' | 'gold_foil' | 'slate' | 'cyber_grid' | 'watercolor_paper' | 'none';
  customImageUrl?: string;
}

export interface EbookBackCoverProposal {
  id: string;
  synopsis: string;
  authorBio: string;
  keyTakeaways: string[];
  quoteOrCallToAction: string;
  artStyle: 'photorealistic' | 'illustration' | 'minimalist' | 'abstract';
  artStyleLabel: string;
  paletteName?: string;
  isbnNumber?: string;
  barcodeDigits?: string;
  bgGradient: string;
  textColor: string;
  accentColor: string;
  layoutVariant: 'card_synopsis' | 'editorial_split' | 'minimal_quote' | 'author_focus' | 'illustrated_story' | 'cinematic_dark';
  artImageUrl?: string;
  imagePrompt?: string;
  artTexture?: 'linen' | 'leather' | 'marble' | 'parchment' | 'gold_foil' | 'slate' | 'cyber_grid' | 'watercolor_paper' | 'none';
  customImageUrl?: string;
}

export interface EbookTOCItem {
  id: string;
  chapterNumber: number;
  title: string;
  summary?: string;
}

export interface EbookChapter {
  id: string;
  chapterNumber: number;
  title: string;
  subtitle?: string;
  content: string;
  keyTakeaways?: string[];
  readingTimeMinutes?: number;
}

export interface EbookData {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  language: string; // 'Français' | 'Anglais' | 'Espagnol' | 'Arabe' | 'Allemand' | 'Italien' | 'Portugais' | 'Wolof'
  genre: string;
  targetAudience: string;
  tone: string;
  summaryOrPrompt: string;
  chapterCount: number;
  targetPageCount: number; // Nombre exact de pages que le livre doit contenir (ex: 5, 10, 15, 20, 30, 50, 100...)
  pageFormat: '6x9' | 'A5' | 'A4'; // 6x9 standard self-publishing
  fontFamily: 'serif' | 'sans' | 'garamond';
  fontSize: 'normal' | 'large' | 'compact';
  
  // Étape 1 : Couverture Avant (Front Cover)
  frontCover: {
    selectedIndex: number;
    proposals: EbookCoverProposal[];
    customPrompt: string;
    customImageUrl: string;
    mode: 'proposal' | 'custom_prompt' | 'uploaded';
  };

  // Étape 2 : Page de Fermeture (Quatrième de couverture / Back Cover)
  backCover: {
    selectedIndex: number;
    proposals: EbookBackCoverProposal[];
    customPrompt: string;
    customImageUrl: string;
    mode: 'proposal' | 'custom_prompt' | 'uploaded';
  };

  // Étape 3 : Rédaction & Structure
  tableOfContents: EbookTOCItem[];
  chapters: EbookChapter[];
  
  currentStep: 1 | 2 | 3;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessDocItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IssuerInfo {
  name: string;
  companyName: string;
  ninea?: string;
  rc?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  logoUrl?: string;
}

export interface ClientInfo {
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

export interface PaymentInfo {
  waveNumber?: string;
  orangeMoneyNumber?: string;
  freeMoneyNumber?: string;
  bankName?: string;
  ibanOrRib?: string;
  accountName?: string;
  paymentTerms?: string;
}

export type BusinessDocTemplateId = 
  | 'classique_ohada'
  | 'minimaliste_pro'
  | 'corporate_executif'
  | 'modern_clean'
  | 'compact_business'
  | 'freelance_creative'
  | 'deux_colonnes'
  | 'standard_international'
  | 'btp_service'
  | 'elegant_line';

export interface BusinessDocTemplateOption {
  id: BusinessDocTemplateId;
  name: string;
  description: string;
  badge?: string;
}

export interface BusinessDocData {
  type: 'devis' | 'facture';
  docNumber: string;
  issueDate: string;
  dueDate?: string;
  validityDays?: number;
  templateId?: BusinessDocTemplateId;
  issuer: IssuerInfo;
  client: ClientInfo;
  items: BusinessDocItem[];
  applyVat: boolean;
  vatRate: number; // 18% standard UEMOA
  discountPercent: number;
  depositAmount?: number; // Acompte versé en FCFA
  themeStyle?: 'indigo' | 'emerald' | 'amber' | 'slate';
  signatoryName?: string;
  signatoryRole?: string;
  signatureDate?: string;
  notes?: string;
  paymentInfo: PaymentInfo;
  currency: string; // 'FCFA'
  status?: 'brouillon' | 'envoye' | 'valide' | 'paye';
}

export type CoverLetterType = 
  | 'offre' // Réponse à une offre d'emploi
  | 'spontanee' // Candidature spontanée
  | 'stage' // Demande de stage / alternance
  | 'reconversion' // Reconversion professionnelle
  | 'recommandation'; // Recommandation / Réseau

export type LetterTone = 'Formelle' | 'Dynamique' | 'Convaincante' | 'Chaleureuse';

export interface CustomSection {
  id: string;
  title: string;
  content: string;
}

export interface FreeTextBlock {
  id: string;
  title?: string;
  text: string;
  style?: 'badge' | 'card' | 'banner' | 'quote' | 'simple';
  bgColor?: string;
  textColor?: string;
}

export interface CVFormData {
  generationMode?: GenerationMode; // 'full' (CV + Lettre) or 'letter_only' (Lettre de motivation seule)
  letterType?: CoverLetterType; // Type de lettre sélectionné
  targetCompany?: string; // Nom de l'entreprise cible
  letterInstructions?: string; // Contexte & Consignes particulières pour la lettre
  highlightsSummary?: string; // Résumé rapide des points forts / expériences (rétrocompatibilité)
  
  // Conditional fields
  diplomaOrSchool?: string; // Si Stage / Alternance: Diplôme préparé / École
  previousCareer?: string; // Si Reconversion: Ancien métier / Domaine d'origine
  referrerNameAndRole?: string; // Si Recommandation: Nom et rôle de la personne qui me recommande

  personalInfo: PersonalInfo;
  experiences: Experience[];
  education: Education[];
  skills: SkillCategory[];
  languages: Language[];
  hobbies?: string[];
  customSections?: CustomSection[];
  freeTextBlocks?: FreeTextBlock[];
  targetSector?: string;
  letterTone?: 'Formelle' | 'Dynamique' | 'Convaincante' | 'Chaleureuse';
  templateStyle?: TemplateStyle;
  themeColor?: string;

  // Visual & Manual Customization Tools (Canva-like)
  fontSize?: 'small' | 'normal' | 'large';
  spacing?: 'compact' | 'normal' | 'relaxed';
  fontFamily?: 'sans' | 'serif' | 'mono' | 'display';
  photoShape?: 'round' | 'square' | 'rounded' | 'ring';
  textAlign?: 'left' | 'center' | 'justify';
  sectionOrder?: string[]; // Custom order for sections
  hidePhoto?: boolean;
  hideSummary?: boolean;
  hideLanguages?: boolean;
  hideSkills?: boolean;
  hideEducation?: boolean;
  hideExperiences?: boolean;
}

export interface AIOptimizedData {
  profileSummary: string; // 3-line professional hook
  experiences: {
    id: string;
    optimizedDescription: string[];
  }[];
  suggestedKeywords: string[];
  hobbies?: string[]; // 3-4 smart, prestigious hobbies tailored to the role
  enrichedSkills?: SkillCategory[];
  coverLetter: {
    subject: string;
    greeting: string;
    opening: string;
    bodyParagraphs: string[];
    callToAction: string;
    closing: string;
  };
  interviewTips?: string[];
}

export type TemplateStyle = 
  // Modèles Sans Photo (1 à 30)
  | 'moderne' 
  | 'classique' 
  | 'elegant' 
  | 'creative' 
  | 'executive' 
  | 'minimal' 
  | 'tech' 
  | 'compact' 
  | 'prestige' 
  | 'startup'
  | 'swiss_grid'
  | 'nordic_clean'
  | 'monaco_banking'
  | 'tokyo_editorial'
  | 'bauhaus_modern'
  | 'legal_heritage'
  | 'silicon_dark'
  | 'atlantic_navy'
  | 'architect_blueprint'
  | 'eco_forest'
  | 'paris_couture'
  | 'amber_consulting'
  | 'cyber_security'
  | 'zenith_academic'
  | 'vanguard_split'
  | 'diplomatic_affairs'
  | 'financial_audit'
  | 'medical_research'
  | 'supply_chain'
  | 'ngo_humanitarian'

  // Modèles Avec Photo (31 à 50)
  | 'photo_executive'
  | 'photo_modern'
  | 'photo_creative'
  | 'photo_minimal'
  | 'photo_corporate'
  | 'photo_tech'
  | 'photo_sidebar'
  | 'photo_horizon'
  | 'photo_impact'
  | 'photo_medical'
  | 'photo_art_director'
  | 'photo_luxe_gold'
  | 'photo_scandinavian'
  | 'photo_silicon_exec'
  | 'photo_hospitality'
  | 'photo_aviation'
  | 'photo_media_press'
  | 'photo_energy_green'
  | 'photo_fintech_pro'
  | 'photo_quantum_ai';

export interface ThemeOption {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  bgClass: string;
  badgeBg: string;
}

export interface UserSubscription {
  planId: 'weekly' | 'monthly' | 'annual' | 'none';
  planName: string;
  status: 'active' | 'expired' | 'pending' | 'rejected' | 'none';
  startedAt?: string;
  expiresAt?: string;
  autoRenew?: boolean;
  pricePaid?: number;
  paymentMethod?: string;
  documentsGeneratedCount?: number;
  receiptImage?: string;
  transactionReference?: string;
  senderPhone?: string;
  countryCode?: string;
  countryName?: string;
  submittedAt?: string;
  adminValidationNote?: string;
}

export interface CandidateProfile {
  uid: string;
  email: string;
  personalInfo: PersonalInfo;
  experiences: Experience[];
  education: Education[];
  skills: SkillCategory[];
  languages: Language[];
  credits: number;
  balance: number; // Solde utilisateur en FCFA (ex: 3 000 FCFA)
  subscriptionStatus: 'free' | 'pro' | 'unlimited';
  subscription?: UserSubscription;
  updatedAt: string;
}

export interface SavedUserDocument {
  id: string;
  userId: string;
  title: string;
  generationMode: GenerationMode;
  createdAt: string;
  updatedAt: string;
  isPaid: boolean;
  formData: CVFormData;
  aiData: AIOptimizedData | null;
  businessDocData?: BusinessDocData;
  ebookData?: EbookData;
  interviewPrepData?: InterviewPrepData;
  selectedFormat?: string;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  type: 'recharge' | 'document_purchase' | 'subscription_purchase' | 'debit' | 'admin_adjustment';
  amount: number; // e.g. +3000 FCFA for recharge, -1000 FCFA for purchase
  expectedAmount?: number;
  extractedAmount?: number;
  currency: string;
  description: string;
  status: 'success' | 'COMPLETED' | 'pending' | 'cancel' | 'failed' | 'VALIDATED_BY_AI' | 'REJECTED_BY_AI' | 'MANUALLY_VALIDATED' | 'REJECTED_BY_ADMIN';
  aiStatus?: 'VALIDATED_BY_AI' | 'REJECTED_BY_AI' | 'MANUALLY_VALIDATED' | 'REJECTED_BY_ADMIN' | 'PENDING' | 'COMPLETED';
  createdAt: string;
  paymentMethod?: 'wallet' | 'wave' | 'orange_money' | 'free_money' | 'card' | 'receipt_ai' | 'admin_manual' | 'free';
  transactionId?: string;
  transactionReference?: string;
  receiptTimestamp?: string;
  rejectionReason?: string;
  rejectionCode?: string;
  receiptImage?: string;
  senderPhone?: string;
  countryCode?: string;
  countryName?: string;
  extractedData?: {
    recipient_phone?: string;
    recipient_name?: string;
    amount?: number;
    expectedAmount?: number;
    transaction_id?: string;
    date_time?: string;
    validation_reason?: string;
    details?: string;
    rawAiText?: string;
  };
  manuallyValidatedBy?: string;
  manuallyValidatedAt?: string;
  adminValidationNote?: string;
  newBalance?: number;
  documentTitle?: string;
  creditsAdded?: number;
  reason?: string;
  adminEmail?: string;
  purpose?: string;
}

export interface ReceiptVerificationResult {
  success: boolean;
  status?: 'COMPLETED' | 'REJECTED' | 'INVALID';
  method?: 'wave' | 'orange_money' | 'unknown';
  transactionId?: string;
  amount?: number;
  currency?: string;
  date?: string;
  senderPhone?: string;
  recipientNameOrPhone?: string;
  error?: string;
  errorCode?: 'INVALID_RECEIPT' | 'ALREADY_USED' | 'INSUFFICIENT_AMOUNT' | 'EXPIRED_RECEIPT' | 'INVALID_RECIPIENT' | 'AI_ERROR' | 'UNSUPPORTED_FORMAT';
  message?: string;
  newBalance?: number;
}


export interface AdminUserRecord {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  targetJob?: string;
  balance: number;
  credits: number;
  role: 'admin' | 'candidate';
  subscriptionStatus: 'free' | 'pro' | 'unlimited';
  status?: 'active' | 'suspended';
  suspendedReason?: string;
  documentsCount: number;
  ordersCount: number;
  unlockedDocsCount?: number;
  hasForceUnlockedDocs?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImpersonatedSession {
  adminEmail: string;
  targetUser: AdminUserRecord;
  startedAt: string;
  originalPath?: string;
}

export interface PlatformPricingConfig {
  cvOnlyPrice: number;       // 1000 FCFA
  letterOnlyPrice: number;   // 1000 FCFA
  fullPackPrice: number;     // 1399 FCFA (Pack Emploi CV + Lettre)
  devisPrice: number;        // 1000 FCFA
  facturePrice: number;      // 1000 FCFA
  businessPackPrice: number; // 1499 FCFA (Pack Business Devis + Facture)
  ebookPrice?: number;       // 1500 FCFA (Génération Ebook Complet)
  unlimitedPassPrice: number;// 3499 FCFA (Pass Illimité Mois)
  unlimitedPassMonthlyPrice?: number; // 3499 FCFA
  unlimitedPassAnnualPrice?: number;  // 39999 FCFA (Pass Illimité Annuel)
  recruiterSearchPrice: number; // 10000 FCFA
  currency: string;          // 'FCFA'
  updatedAt: string;
  updatedBy?: string;
}

export interface PromoCode {
  id: string;
  code: string;              // e.g. 'TERANGA20', 'PROMO1000'
  discountType: 'percentage' | 'fixed'; // percentage (e.g. 20%) or fixed (e.g. 500 FCFA)
  discountValue: number;     // 20 or 500
  minOrderAmount?: number;   // e.g. 1000 FCFA
  maxUsageLimit?: number;    // e.g. 100 uses
  currentUsageCount: number; // e.g. 14 uses
  active: boolean;
  expiresAt?: string;
  description: string;
  createdAt: string;
  createdBy?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  category: 'auth' | 'payment' | 'wallet' | 'document' | 'admin_action' | 'pricing' | 'promo' | 'security';
  action: string;
  actorEmail: string;
  actorRole: 'admin' | 'system' | 'candidate';
  targetUserEmail?: string;
  targetUserId?: string;
  details: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  status: 'success' | 'warning' | 'error';
}

export interface AdminKPIs {
  totalRevenue: number;
  totalCVsGenerated: number;
  totalUsersCount: number;
  totalTransactionsCount: number;
  totalCirculatingBalance: number;
  successPaymentRate: number;
  revenueByService: {
    cvOnly: number;
    letterOnly: number;
    fullPack: number;
    devis: number;
    facture: number;
    businessPack: number;
    unlimitedPass: number;
    walletRecharge: number;
  };
  dailyRevenueTrend: {
    date: string;
    label: string;
    revenue: number;
    transactionsCount: number;
    documentsCount: number;
  }[];
}

export interface AdminWalletAdjustmentPayload {
  userId: string;
  userEmail?: string;
  amount: number; // Positive number
  type: 'credit' | 'debit';
  reason: string;
  adminEmail?: string;
}

// ==========================================
// RH INTERVIEW PREPARATION (PRÉPARATION ENTRETIEN RH)
// ==========================================

export type InterviewQuestionCategory = 
  | 'technique'
  | 'comportementale'
  | 'motivation'
  | 'situationnelle'
  | 'leadership'
  | 'piege';

export interface InterviewQuestionItem {
  id: string;
  category: InterviewQuestionCategory | string;
  categoryLabel?: string;
  question: string;
  recruiterIntent: string; // Ce que le RH / recruteur cherche réellement à tester
  suggestedAnswer: string; // Réponse modèle structurée (Méthode STAR : Contexte, Action, Résultat chiffré)
  keyStrengthsToHighlight: string[]; // 2-4 points forts indispensables à placer
  pitfallsToAvoid: string; // Erreur classique ou piège à éviter absolument
}

export interface InterviewPrepData {
  id: string;
  candidateName: string;
  targetJob: string;
  targetCompany?: string;
  city?: string;
  country?: string;
  createdAt: string;
  pitch2Min: {
    hook: string; // 0-30s : Qui je suis, vision & accroche immédiate
    careerHighlights: string; // 30-90s : Réalisations majeures & compétences clés
    valueProposition: string; // 90-120s : Pourquoi vous, valeur ajoutée pour l'entreprise & conclusion
    fullText: string; // Texte intégral fluide prêt à être déclamé
  };
  questions: InterviewQuestionItem[];
  behavioralTips: string[]; // 4-6 conseils de posture, communication non-verbale & négociation
  suggestedQuestionsToAskRecruiter: string[]; // 4-5 questions stratégiques intelligentes à poser en fin d'entretien
  strengthsSummary?: string[]; // Synthèse des atouts majeurs détectés
}




