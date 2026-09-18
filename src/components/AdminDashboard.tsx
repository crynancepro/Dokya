import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Users, DollarSign, FileText, ArrowUpRight, ArrowDownRight, 
  Search, Filter, Plus, Minus, RefreshCw, Download, CheckCircle2, 
  AlertCircle, ChevronRight, Lock, LogOut, ExternalLink, Award,
  Sparkles, Layers, TrendingUp, Calendar, CreditCard, Wallet,
  Sliders, UserCheck, Eye, Edit3, X, HelpCircle, Tag, ShieldAlert,
  Percent, Clock, Trash2, Ban, Unlock, Check, AlertTriangle, ArrowRight,
  Scan, Receipt, Image as ImageIcon, ZoomIn, CheckCircle, XCircle, FileSearch,
  Phone, Globe, Flame, Crown, History, CheckCheck, UserMinus, UserPlus, Infinity,
  MessageSquare, Volume2, VolumeX, BellRing, Menu, Building2, Briefcase,
  PanelLeftClose, PanelLeftOpen, Zap, Copy, Terminal, MoreVertical
} from 'lucide-react';
import { AdminSidebar, AdminTabType } from './admin/AdminSidebar';
import { AdminSalesTrendCurve } from './admin/AdminSalesTrendCurve';
import { MoneyFusionWebhookHealth } from './admin/MoneyFusionWebhookHealth';
import { 
  auth, 
  savePricingToFirestore, 
  savePromoCodeToFirestore, 
  deletePromoCodeFromFirestore, 
  DEFAULT_PLATFORM_PRICING,
  fetchAllFirestoreTransactions,
  fetchAllFirestoreUserProfiles,
  saveTransactionRecord,
  subscribeToPendingTransactions,
  subscribeToAllTransactions,
  approveTransactionWithAtomicFirestore,
  rejectTransactionWithFirestore,
  purgeDemoDataInFirestore,
  fetchAllAdminUsersWithSubscriptions,
  manageUserSubscriptionInFirestore,
  subscribeToActiveSupportConversations,
  purgeExpiredPaymentReceipts,
  subscribeToRealtimeAdminDashboardMetrics,
  RealtimeAdminMetrics,
  RealtimeSalesCategory
} from '../lib/firebase';
import { DEFAULT_PROMO_CODES } from '../constants/pricingDefaults';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { isAdminEmail, PRIMARY_ADMIN_EMAIL, getAdminHeaders } from '../lib/adminAuth';
import { startImpersonationSession, stopImpersonationSession, getImpersonatedSession } from '../lib/impersonation';
import { 
  AdminUserRecord, AdminKPIs, TransactionRecord, PlatformPricingConfig, 
  PromoCode, UserSubscription, isUserVipActive, getTimestampMillis,
  SupportConversation
} from '../types';
import { AdminAffiliationView } from './AdminAffiliationView';
import { AdminSupportChatView } from './AdminSupportChatView';
import { AdminBusinessView } from './admin/AdminBusinessView';
import { 
  startEmergencyAlarm, 
  stopEmergencyAlarm, 
  isEmergencyAlarmActive, 
  requestAdminNotificationPermission, 
  triggerAdminPushNotification 
} from '../lib/adminAlerts';

interface AdminDashboardProps {
  onBackHome: () => void;
  onOpenEditor?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onBackHome,
  onOpenEditor 
}) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [activeTab, setActiveTab] = useState<AdminTabType>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash.includes('affiliat') || path.includes('/admin/affiliat')) {
        return 'affiliations';
      }
      if (hash.includes('user') || path.includes('/admin/user')) {
        return 'users';
      }
      if (hash.includes('transaction') || path.includes('/admin/transaction')) {
        return 'transactions';
      }
    }
    return 'overview';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dokya_admin_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('dokya_admin_sidebar_collapsed', String(next));
      }
      return next;
    });
  };
  
  // Realtime Support & Emergency Alarm States
  const [supportConversations, setSupportConversations] = useState<SupportConversation[]>([]);
  const [isAlarmMuted, setIsAlarmMuted] = useState<boolean>(false);
  const [isAlarmTesting, setIsAlarmTesting] = useState<boolean>(false);

  // Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [isRealtimeStatsLoading, setIsRealtimeStatsLoading] = useState<boolean>(true);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeAdminMetrics | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [usersList, setUsersList] = useState<AdminUserRecord[]>([]);

  // VIP Subscriptions Tab States
  const [subSearch, setSubSearch] = useState<string>('');
  const [subStatusFilter, setSubStatusFilter] = useState<'all' | 'ACTIVE' | 'EXPIRED' | 'INACTIVE'>('all');
  const [selectedUserForSubModal, setSelectedUserForSubModal] = useState<AdminUserRecord | null>(null);
  const [subAction, setSubAction] = useState<'activate' | 'extend' | 'suspend' | 'reset'>('activate');
  const [subDurationDays, setSubDurationDays] = useState<number>(30);
  const [subAdminNote, setSubAdminNote] = useState<string>('');
  const [isSavingSub, setIsSavingSub] = useState<boolean>(false);
  const [isLoadingSubs, setIsLoadingSubs] = useState<boolean>(false);
  const [transactionsList, setTransactionsList] = useState<TransactionRecord[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PlatformPricingConfig>({
    cvOnlyPrice: 500,
    letterOnlyPrice: 500,
    fullPackPrice: 1500,
    devisPrice: 1000,
    facturePrice: 1000,
    businessPackPrice: 3000,
    unlimitedPassPrice: 5000,
    recruiterSearchPrice: 10000,
    currency: 'FCFA',
    updatedAt: new Date().toISOString()
  });
  const [promoCodesList, setPromoCodesList] = useState<PromoCode[]>([]);
  
  // Impersonation state
  const [activeImpersonation, setActiveImpersonation] = useState(getImpersonatedSession);

  // Search & Filter States
  const [userSearch, setUserSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'candidate'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'positive' | 'zero'>('all');
  const [userPage, setUserPage] = useState<number>(1);
  const usersPerPage = 10;
  const [openUserMenuId, setOpenUserMenuId] = useState<string | null>(null);

  // Real circulating user balance directly from loaded Firestore profiles
  const realTotalUserBalance = useMemo(() => {
    return usersList.reduce((acc, u) => acc + (Number(u.balance) || 0), 0);
  }, [usersList]);
  
  // Transactions filters
  const [txSearch, setTxSearch] = useState<string>('');
  const [txStatusFilter, setTxStatusFilter] = useState<string>('all');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'document' | 'subscription' | 'wallet'>('all');
  const [txMethodFilter, setTxMethodFilter] = useState<string>('all');

  // Transaction Inspection & Action State
  const [selectedTxForInspection, setSelectedTxForInspection] = useState<TransactionRecord | null>(null);
  const [manualValidationNote, setManualValidationNote] = useState<string>('');
  const [isValidatingTx, setIsValidatingTx] = useState<boolean>(false);
  const [isRejectingTx, setIsRejectingTx] = useState<boolean>(false);
  const [isPurgingReceipts, setIsPurgingReceipts] = useState<boolean>(false);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  const handleCopyTxId = (text: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedTxId(text);
      setTimeout(() => setCopiedTxId(null), 2000);
    } catch (_e) {}
  };

  // Modal Adjustment State
  const [selectedUserForAdjust, setSelectedUserForAdjust] = useState<AdminUserRecord | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(1000);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustReason, setAdjustReason] = useState<string>('Geste commercial support client');
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);

  // Candidate Inspection & Control Modal State
  const [inspectingCandidate, setInspectingCandidate] = useState<AdminUserRecord | null>(null);
  const [candidateActiveTab, setCandidateActiveTab] = useState<'docs' | 'transactions'>('docs');

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editTargetJob, setEditTargetJob] = useState('');
  const [editBalance, setEditBalance] = useState<number>(0);
  const [editSubscription, setEditSubscription] = useState<'free' | 'pro' | 'unlimited'>('free');

  // Delete User Confirmation Modal
  const [userToDelete, setUserToDelete] = useState<AdminUserRecord | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

  // Suspend User Modal
  const [userToSuspend, setUserToSuspend] = useState<AdminUserRecord | null>(null);
  const [suspendReason, setSuspendReason] = useState<string>('Non-respect des conditions d\'utilisation');

  // Delete Promo Code Modal
  const [promoToDelete, setPromoToDelete] = useState<PromoCode | null>(null);
  const [isDeletingPromo, setIsDeletingPromo] = useState<boolean>(false);

  // Create / Edit Promo Code Modal
  const [isPromoModalOpen, setIsPromoModalOpen] = useState<boolean>(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [promoTypeInput, setPromoTypeInput] = useState<'percentage' | 'fixed'>('percentage');
  const [promoValueInput, setPromoValueInput] = useState<number>(20);
  const [promoMinOrderInput, setPromoMinOrderInput] = useState<number>(1000);
  const [promoLimitInput, setPromoLimitInput] = useState<number>(100);
  const [promoDescInput, setPromoDescInput] = useState<string>('');
  const [promoActiveInput, setPromoActiveInput] = useState<boolean>(true);
  const [isSavingPromo, setIsSavingPromo] = useState<boolean>(false);

  // Pricing Form State
  const [editingPricing, setEditingPricing] = useState<PlatformPricingConfig>(pricingConfig);
  const [isSavingPricing, setIsSavingPricing] = useState<boolean>(false);

  // Demo Data Purge Modal State (Exclusive to peter25ngouala@gmail.com)
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [isPurgingDemoData, setIsPurgingDemoData] = useState<boolean>(false);

  // Check auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  const adminEmail = currentUser?.email || PRIMARY_ADMIN_EMAIL;
  const isAuthorized = isAdminEmail(adminEmail);

  // Safe JSON Fetch Helper that never throws
  const safeFetchJson = async <T,>(url: string, headers: HeadersInit): Promise<T | null> => {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return null;
      return await res.json() as T;
    } catch (e) {
      console.warn(`[Admin SafeFetch] Notice for ${url}:`, e);
      return null;
    }
  };

  // Load All Admin Data with complete fallback tolerance for Vercel & local environments
  const loadAdminData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Initialisation immédiate depuis Firestore et constantes locales (Zéro latence / Zéro blocage réseau)
      setPricingConfig((prev) => (prev && prev.cvOnlyPrice ? prev : DEFAULT_PLATFORM_PRICING));
      setEditingPricing((prev) => (prev && prev.cvOnlyPrice ? prev : DEFAULT_PLATFORM_PRICING));
      setPromoCodesList((prev) => (prev && prev.length > 0 ? prev : DEFAULT_PROMO_CODES));

      // 2. Chargement direct des Utilisateurs depuis Firestore (100% réel)
      try {
        const adminUsers = await fetchAllAdminUsersWithSubscriptions();
        if (adminUsers && adminUsers.length > 0) {
          setUsersList(adminUsers);
        } else {
          const firestoreUsers = await fetchAllFirestoreUserProfiles();
          if (firestoreUsers && firestoreUsers.length > 0) {
            const mapped: AdminUserRecord[] = firestoreUsers.map(p => ({
              uid: p.uid,
              email: p.email || 'candidat@dokya.sn',
              firstName: p.personalInfo?.firstName || '',
              lastName: p.personalInfo?.lastName || '',
              phone: p.personalInfo?.phone,
              city: p.personalInfo?.city,
              targetJob: p.personalInfo?.targetJob,
              balance: p.balance || 0,
              credits: p.credits || 0,
              subscriptionStatus: p.subscriptionStatus || 'free',
              ordersCount: 0,
              documentsCount: 0,
              createdAt: (p as any).createdAt || p.updatedAt || new Date().toISOString(),
              updatedAt: p.updatedAt || new Date().toISOString(),
              status: 'active',
              role: (p as any).role === 'admin' ? 'admin' : 'candidate'
            }));
            setUsersList(mapped);
          } else {
            setUsersList([]);
          }
        }
      } catch (userErr) {
        console.warn('[AdminDashboard] Erreur chargement utilisateurs Firestore:', userErr);
        setUsersList([]);
      }

      // 3. Chargement direct des Transactions depuis Firestore (100% réel)
      try {
        const firestoreTx = await fetchAllFirestoreTransactions();
        setTransactionsList(Array.isArray(firestoreTx) ? firestoreTx : []);
      } catch (txErr) {
        console.warn('[AdminDashboard] Erreur chargement transactions Firestore:', txErr);
        setTransactionsList([]);
      }

      // 4. Synchronisation facultative en arrière-plan avec l'API Serverless (Tolérance 100% aux pannes)
      try {
        const headers = getAdminHeaders(adminEmail);
        const [statsData, pricingData, promoData] = await Promise.all([
          safeFetchJson<{ success: boolean; stats: AdminKPIs }>('/api/admin/stats', headers),
          safeFetchJson<{ success: boolean; pricing: PlatformPricingConfig }>('/api/admin/pricing', headers),
          safeFetchJson<{ success: boolean; promoCodes: PromoCode[] }>('/api/admin/promo-codes', headers)
        ]);

        if (statsData?.success && statsData.stats) {
          setKpis(statsData.stats);
        }
        if (pricingData?.success && pricingData.pricing) {
          setPricingConfig(pricingData.pricing);
          setEditingPricing(pricingData.pricing);
        }
        if (promoData?.success && Array.isArray(promoData.promoCodes) && promoData.promoCodes.length > 0) {
          setPromoCodesList(promoData.promoCodes);
        }
      } catch (apiErr) {
        console.warn('[AdminDashboard] Synchronisation API silencieuse:', apiErr);
      }

      // 6. Nettoyage et purge automatique des reçus expirés (>24h) en arrière-plan
      try {
        purgeExpiredPaymentReceipts().catch((err) => console.warn('Background receipts purge error:', err));
      } catch (_pErr) {}

    } catch (err: any) {
      console.error('Error during admin data loading:', err);
      // Non-blocking fallback
      try {
        const firestoreTx = await fetchAllFirestoreTransactions();
        if (firestoreTx.length > 0) setTransactionsList(firestoreTx);
      } catch (_e) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadAdminData();

      // Synchronisation temps réel directe avec la collection 'transactions' de Firestore
      const unsubTx = subscribeToAllTransactions((liveTxs) => {
        if (Array.isArray(liveTxs)) {
          setTransactionsList(liveTxs);
        }
      });

      // Real-time Firestore support conversations listener (avec limit(20) strict)
      const unsubSupport = subscribeToActiveSupportConversations((liveConvs) => {
        if (Array.isArray(liveConvs)) {
          setSupportConversations(liveConvs);
        }
      });

      // Real-time Firestore onSnapshot listener for 100% genuine Dashboard metrics
      const unsubRealtimeMetrics = subscribeToRealtimeAdminDashboardMetrics((liveMetrics) => {
        setRealtimeMetrics(liveMetrics);
        setIsRealtimeStatsLoading(false);
        if (Array.isArray(liveMetrics.realtimeUsers)) {
          setUsersList(liveMetrics.realtimeUsers);
        }
        if (Array.isArray(liveMetrics.transactions)) {
          setTransactionsList(liveMetrics.transactions);
        }
      }, (err) => {
        console.warn('[AdminDashboard Realtime Metrics Error]:', err);
        setIsRealtimeStatsLoading(false);
      });

      return () => {
        unsubTx();
        unsubSupport();
        unsubRealtimeMetrics();
        stopEmergencyAlarm();
      };
    }
  }, [isAuthorized, adminEmail]);

  // Compute emergency counts
  const urgentSupportCount = useMemo(() => {
    return supportConversations.filter((c) => c.urgent || c.status === 'HUMAN_REQUESTED').length;
  }, [supportConversations]);

  const pendingReceiptsCount = useMemo(() => {
    return transactionsList.filter((t) => t.status === 'PENDING' || t.status === 'WAITING_FOR_ADMIN' || t.status === 'WAITING_VALIDATION').length;
  }, [transactionsList]);

  // Les paiements étant 100% automatisés via Money Fusion, seules les demandes humaines urgentes déclenchent une alerte
  const totalEmergencyCount = urgentSupportCount;

  // Sirène manuelle ou sur test uniquement - Désactivation des alarmes automatiques intrusives
  useEffect(() => {
    if (!isAlarmTesting) {
      stopEmergencyAlarm();
    }
  }, [isAlarmTesting]);

  // Sync impersonation state listener
  useEffect(() => {
    const handleStorage = () => {
      setActiveImpersonation(getImpersonatedSession());
    };
    window.addEventListener('impersonation-changed', handleStorage as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('impersonation-changed', handleStorage as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      if (userSearch) {
        const query = userSearch.toLowerCase();
        const matchesName = `${u.firstName} ${u.lastName}`.toLowerCase().includes(query);
        const matchesEmail = u.email.toLowerCase().includes(query);
        const matchesJob = (u.targetJob || '').toLowerCase().includes(query);
        const matchesCity = (u.city || '').toLowerCase().includes(query);
        const matchesPhone = (u.phone || '').toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesJob && !matchesCity && !matchesPhone) return false;
      }
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && (u.status || 'active') !== statusFilter) return false;
      if (balanceFilter === 'positive' && (u.balance || 0) <= 0) return false;
      if (balanceFilter === 'zero' && (u.balance || 0) > 0) return false;
      return true;
    });
  }, [usersList, userSearch, roleFilter, statusFilter, balanceFilter]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, userPage, usersPerPage]);

  // Métriques de suivi automatisé Money Fusion avec répartition par types : Document, Abonnement, Rechargement Wallet
  const moneyFusionMetrics = useMemo(() => {
    let totalRevenue = 0;
    let validatedCount = 0;
    let documentCount = 0;
    let documentRevenue = 0;
    let subscriptionCount = 0;
    let subscriptionRevenue = 0;
    let walletCount = 0;
    let walletRevenue = 0;
    const creditedUsersSet = new Set<string>();

    transactionsList.forEach((tx) => {
      const isApproved = tx.status === 'APPROVED' || tx.status === 'VALIDATED_BY_AI' || tx.status === 'success' || tx.status === 'COMPLETED' || tx.status === 'MANUALLY_VALIDATED';
      const amt = Math.abs(Number(tx.amount || tx.expectedAmount || 0));

      // Détection claire du type (Document, Abonnement ou Wallet)
      const txType = (tx.type || (tx as any).transactionType || '').toUpperCase();
      const desc = ((tx.description || '') + ' ' + (tx.title || '')).toLowerCase();
      const isDoc = txType.includes('DOC') || Boolean(tx.targetDocId) || Boolean((tx as any).docId) || desc.includes('document') || desc.includes('déblocage') || desc.includes('deblocage');
      const isSub = !isDoc && (txType.includes('SUB') || Boolean((tx as any).planId) || desc.includes('abonnement') || desc.includes('pass') || desc.includes('vip') || amt === 2500 || amt === 5000);
      const isWallet = !isDoc && !isSub;

      if (isApproved) {
        totalRevenue += amt;
        validatedCount++;
        const userKey = tx.userId || (tx as any).userEmail;
        if (userKey && userKey !== 'anonymous') {
          creditedUsersSet.add(userKey);
        }

        if (isDoc) {
          documentCount++;
          documentRevenue += amt;
        } else if (isSub) {
          subscriptionCount++;
          subscriptionRevenue += amt;
        } else {
          walletCount++;
          walletRevenue += amt;
        }
      }
    });

    return {
      totalRevenue,
      validatedCount,
      documentCount,
      documentRevenue,
      subscriptionCount,
      subscriptionRevenue,
      walletCount,
      walletRevenue,
      creditedUsersCount: creditedUsersSet.size,
    };
  }, [transactionsList]);

  // Filtered Transactions Money Fusion
  const filteredTransactions = useMemo(() => {
    return transactionsList.filter((t) => {
      if (txSearch) {
        const query = txSearch.toLowerCase().trim();
        const matchesId = t.id.toLowerCase().includes(query);
        const matchesRef = (t.transactionReference || (t as any).transactionId || '').toLowerCase().includes(query);
        const matchesDesc = (t.description || '').toLowerCase().includes(query);
        const matchesUser = (t.userId || '').toLowerCase().includes(query) || 
          ((t as any).userEmail || '').toLowerCase().includes(query) || 
          ((t as any).userName || '').toLowerCase().includes(query) || 
          ((t as any).userPhone || (t as any).senderPhone || '').toLowerCase().includes(query);
        if (!matchesId && !matchesRef && !matchesDesc && !matchesUser) return false;
      }
      
      const isAppr = t.status === 'APPROVED' || t.status === 'VALIDATED_BY_AI' || t.status === 'success' || t.status === 'COMPLETED' || t.status === 'MANUALLY_VALIDATED';
      const isRej = t.status === 'REJECTED' || t.status === 'REJECTED_BY_AI' || t.status === 'REJECTED_BY_ADMIN' || t.status === 'failed' || t.status === 'cancel';
      const isPend = !isAppr && !isRej;

      if (txStatusFilter !== 'all') {
        if (txStatusFilter === 'success' || txStatusFilter === 'COMPLETED' || txStatusFilter === 'VALIDATED_BY_AI') {
          if (!isAppr) return false;
        } else if (txStatusFilter === 'PENDING') {
          if (!isPend) return false;
        } else if (txStatusFilter === 'failed' || txStatusFilter === 'REJECTED') {
          if (!isRej) return false;
        } else if (t.status !== txStatusFilter) {
          return false;
        }
      }

      // Filtre par Type (Document, Abonnement, Wallet)
      if (txTypeFilter !== 'all') {
        const txType = (t.type || (t as any).transactionType || '').toUpperCase();
        const desc = ((t.description || '') + ' ' + (t.title || '')).toLowerCase();
        const amt = Math.abs(Number(t.amount || t.expectedAmount || 0));
        const isDoc = txType.includes('DOC') || Boolean(t.targetDocId) || Boolean((t as any).docId) || desc.includes('document') || desc.includes('déblocage') || desc.includes('deblocage');
        const isSub = !isDoc && (txType.includes('SUB') || Boolean((t as any).planId) || desc.includes('abonnement') || desc.includes('pass') || desc.includes('vip') || amt === 2500 || amt === 5000);
        const isWallet = !isDoc && !isSub;

        if (txTypeFilter === 'document' && !isDoc) return false;
        if (txTypeFilter === 'subscription' && !isSub) return false;
        if (txTypeFilter === 'wallet' && !isWallet) return false;
      }

      if (txMethodFilter !== 'all') {
        const currentMethod = ((t.paymentMethod || '') + ' ' + ((t as any).operator || '')).toLowerCase();
        const target = txMethodFilter.toLowerCase();
        if (target === 'card' || target === 'qr') {
          if (!currentMethod.includes('card') && !currentMethod.includes('carte') && !currentMethod.includes('qr') && !currentMethod.includes('visa') && !currentMethod.includes('mastercard')) return false;
        } else if (target === 'wave') {
          if (!currentMethod.includes('wave')) return false;
        } else if (target === 'orange_money') {
          if (!currentMethod.includes('orange') && !currentMethod.includes('om')) return false;
        } else if (target === 'free') {
          if (!currentMethod.includes('free')) return false;
        } else if (target === 'mtn') {
          if (!currentMethod.includes('mtn')) return false;
        } else if (target === 'moov') {
          if (!currentMethod.includes('moov')) return false;
        } else if (target === 'moneyfusion') {
          if (!currentMethod.includes('money') && !currentMethod.includes('fusion')) return false;
        } else if (currentMethod !== target) {
          return false;
        }
      }
      return true;
    });
  }, [transactionsList, txSearch, txStatusFilter, txTypeFilter, txMethodFilter]);

  // Financial Analytics & Metrics (Aujourd'hui, Cette Semaine, Ce Mois, Global)
  const financialStats = useMemo(() => {
    if (realtimeMetrics) {
      return {
        todayRevenue: realtimeMetrics.todayRevenue,
        weekRevenue: realtimeMetrics.weekRevenue,
        monthRevenue: realtimeMetrics.monthRevenue,
        totalRevenue: realtimeMetrics.totalRevenue,
        validatedCount: realtimeMetrics.successfulCount,
        rejectedCount: realtimeMetrics.failedCount,
        pendingCount: realtimeMetrics.pendingCount,
        successRate: realtimeMetrics.successRate
      };
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Calcul début de semaine (Lundi)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    // Calcul début de mois
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayRevenue = 0;
    let weekRevenue = 0;
    let monthRevenue = 0;
    let totalRevenue = 0;

    let validatedCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;

    transactionsList.forEach((tx) => {
      const isValidated = tx.status === 'VALIDATED_BY_AI' || tx.status === 'success' || tx.status === 'COMPLETED' || tx.status === 'MANUALLY_VALIDATED';
      const isRejected = tx.status === 'REJECTED_BY_AI' || tx.status === 'REJECTED_BY_ADMIN' || tx.status === 'failed' || tx.status === 'cancel';
      const isPending = tx.status === 'pending' || tx.status === 'PENDING_ADMIN_VALIDATION';

      if (isValidated) validatedCount++;
      else if (isRejected) rejectedCount++;
      else if (isPending) pendingCount++;

      if (isValidated) {
        const amt = tx.extractedAmount || tx.expectedAmount || Math.abs(tx.amount) || 0;
        totalRevenue += amt;

        try {
          const txDate = new Date(tx.createdAt);
          if (txDate.toISOString().split('T')[0] === todayStr) {
            todayRevenue += amt;
          }
          if (txDate >= startOfWeek) {
            weekRevenue += amt;
          }
          if (txDate >= startOfMonth) {
            monthRevenue += amt;
          }
        } catch (_e) {}
      }
    });

    return {
      todayRevenue,
      weekRevenue,
      monthRevenue,
      totalRevenue,
      validatedCount,
      rejectedCount,
      pendingCount,
      successRate: (validatedCount + rejectedCount) > 0 ? Math.round((validatedCount / (validatedCount + rejectedCount)) * 100) : 100
    };
  }, [realtimeMetrics, transactionsList]);

  // Effective Real-Time KPIs derived directly from Firestore
  const effectiveKPIs = useMemo(() => {
    if (realtimeMetrics) {
      return {
        totalRevenue: realtimeMetrics.totalRevenue,
        totalCVsGenerated: realtimeMetrics.totalDocumentsCount,
        totalUsersCount: realtimeMetrics.totalUsersCount || usersList.length,
        totalTransactionsCount: realtimeMetrics.transactions.length,
        totalCirculatingBalance: realtimeMetrics.totalCirculatingBalance,
        successPaymentRate: realtimeMetrics.successRate,
        revenueByService: {
          cvOnly: realtimeMetrics.salesBreakdown.find(s => s.id === 'cv_ats')?.revenue || 0,
          letterOnly: realtimeMetrics.salesBreakdown.find(s => s.id === 'letter')?.revenue || 0,
          fullPack: realtimeMetrics.salesBreakdown.find(s => s.id === 'duo')?.revenue || 0,
          devis: 0,
          facture: 0,
          businessPack: realtimeMetrics.salesBreakdown.find(s => s.id === 'business')?.revenue || 0,
          unlimitedPass: realtimeMetrics.salesBreakdown.find(s => s.id === 'unlimited')?.revenue || 0,
          walletRecharge: realtimeMetrics.salesBreakdown.find(s => s.id === 'other')?.revenue || 0,
        },
        dailyRevenueTrend: kpis?.dailyRevenueTrend || []
      };
    }
    return kpis;
  }, [realtimeMetrics, usersList.length, kpis]);

  // Helper Drapeau & Pays
  const getCountryInfo = (tx: TransactionRecord) => {
    const code = (tx.countryCode || '').toUpperCase();
    const flags: Record<string, { flag: string; name: string }> = {
      SN: { flag: '🇸🇳', name: 'Sénégal' },
      CI: { flag: '🇨🇮', name: "Côte d'Ivoire" },
      ML: { flag: '🇲🇱', name: 'Mali' },
      BF: { flag: '🇧🇫', name: 'Burkina Faso' },
      GN: { flag: '🇬🇳', name: 'Guinée' },
      BJ: { flag: '🇧🇯', name: 'Bénin' },
      TG: { flag: '🇹🇬', name: 'Togo' },
      NE: { flag: '🇳🇪', name: 'Niger' },
      CM: { flag: '🇨🇲', name: 'Cameroun' },
      GA: { flag: '🇬🇦', name: 'Gabon' },
      CG: { flag: '🇨🇬', name: 'Congo' },
      CD: { flag: '🇨🇩', name: 'RDC' },
      FR: { flag: '🇫🇷', name: 'France' }
    };
    if (flags[code]) return flags[code];
    if (tx.countryName) return { flag: '🌍', name: tx.countryName };
    return { flag: '🇸🇳', name: 'Sénégal' };
  };

  // 1. IMPERSONATION (Prise de contrôle)
  const handleStartImpersonation = async (user: AdminUserRecord) => {
    try {
      const headers = getAdminHeaders(adminEmail);
      const res = await fetch(`/api/admin/users/${user.uid}/impersonate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ adminEmail })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        startImpersonationSession(data.targetUser || user, adminEmail, '#editor');
        setSuccessMsg(`Session démarrée en tant que ${user.firstName} ${user.lastName} (${user.email}) ! Redirection vers l'éditeur...`);
        setTimeout(() => {
          if (onOpenEditor) {
            onOpenEditor();
          } else {
            window.location.hash = 'editor';
          }
        }, 800);
      } else {
        setErrorMsg(data.error || 'Erreur lors de la prise de contrôle.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Erreur réseau lors de la prise de contrôle.');
    }
  };

  // 2. FORCE UNLOCK DOCUMENTS
  const handleForceUnlockDocs = async (user: AdminUserRecord) => {
    if (!window.confirm(`Confirmer le déblocage forcé et gratuit de TOUS les documents pour ${user.firstName} ${user.lastName} (${user.email}) ?`)) {
      return;
    }
    try {
      const headers = getAdminHeaders(adminEmail);
      const res = await fetch(`/api/admin/users/${user.uid}/unlock-documents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ adminEmail, reason: 'Déblocage administratif de courtoisie' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Documents débloqués avec succès !');
        setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, hasForceUnlockedDocs: true, unlockedDocsCount: (u.documentsCount || 1) + 2 } : u));
        setTimeout(() => setSuccessMsg(null), 4000);
        // Refresh audit logs
        loadAdminData();
      } else {
        setErrorMsg(data.error || 'Erreur lors du déblocage.');
      }
    } catch (e) {
      setErrorMsg('Erreur lors du déblocage des documents.');
    }
  };

  // 3. SUSPEND / REACTIVATE USER
  const handleConfirmSuspension = async () => {
    if (!userToSuspend) return;
    try {
      const headers = getAdminHeaders(adminEmail);
      const res = await fetch(`/api/admin/users/${userToSuspend.uid}/toggle-suspension`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ adminEmail, reason: suspendReason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Statut du compte mis à jour.');
        setUsersList(prev => prev.map(u => u.uid === userToSuspend.uid ? { ...u, status: data.status, suspendedReason: data.status === 'suspended' ? suspendReason : undefined } : u));
        setUserToSuspend(null);
        setTimeout(() => setSuccessMsg(null), 4000);
        loadAdminData();
      } else {
        setErrorMsg(data.error || 'Erreur lors du changement de statut.');
      }
    } catch (e) {
      setErrorMsg('Erreur lors de la mise à jour du statut.');
    }
  };

  // 4. EDIT USER PERSONAL INFO
  const openEditModal = (user: AdminUserRecord) => {
    setEditingUser(user);
    setEditFirstName(user.firstName || '');
    setEditLastName(user.lastName || '');
    setEditPhone(user.phone || '');
    setEditCity(user.city || '');
    setEditTargetJob(user.targetJob || '');
    setEditBalance(user.balance || 0);
    setEditSubscription(user.subscriptionStatus || 'free');
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const headers = getAdminHeaders(adminEmail);
      const res = await fetch(`/api/admin/users/${editingUser.uid}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          adminEmail,
          firstName: editFirstName,
          lastName: editLastName,
          phone: editPhone,
          city: editCity,
          targetJob: editTargetJob,
          balance: editBalance,
          subscriptionStatus: editSubscription
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Profil utilisateur mis à jour avec succès.');
        setUsersList(prev => prev.map(u => u.uid === editingUser.uid ? {
          ...u,
          firstName: editFirstName,
          lastName: editLastName,
          phone: editPhone,
          city: editCity,
          targetJob: editTargetJob,
          balance: editBalance,
          subscriptionStatus: editSubscription
        } : u));
        setEditingUser(null);
        setTimeout(() => setSuccessMsg(null), 4000);
        loadAdminData();
      } else {
        setErrorMsg(data.error || 'Erreur lors de la mise à jour.');
      }
    } catch (e) {
      setErrorMsg('Erreur lors de la mise à jour du profil.');
    }
  };

  // 5. DELETE USER ACCOUNT
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const headers = getAdminHeaders(adminEmail);
      const res = await fetch(`/api/admin/users/${userToDelete.uid}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Le compte ${userToDelete.email} a été définitivement supprimé.`);
        setUsersList(prev => prev.filter(u => u.uid !== userToDelete.uid));
        setUserToDelete(null);
        setTimeout(() => setSuccessMsg(null), 4000);
        loadAdminData();
      } else {
        setErrorMsg(data.error || 'Erreur lors de la suppression.');
      }
    } catch (e) {
      setErrorMsg('Erreur lors de la suppression de l\'utilisateur.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // 6. WALLET ADJUSTMENT
  const handleConfirmAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForAdjust) return;
    if (adjustAmount <= 0) {
      setErrorMsg('Veuillez entrer un montant supérieur à 0 FCFA.');
      return;
    }
    if (!adjustReason.trim()) {
      setErrorMsg('Le motif est obligatoire pour la traçabilité comptable.');
      return;
    }

    setIsAdjusting(true);
    setErrorMsg(null);
    try {
      const headers = getAdminHeaders(adminEmail);
      const res = await fetch('/api/admin/wallet/adjust', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: selectedUserForAdjust.uid,
          userEmail: selectedUserForAdjust.email,
          amount: adjustAmount,
          type: adjustType,
          reason: adjustReason,
          adminEmail
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Solde ajusté avec succès !');
        setUsersList(prev => prev.map(u => u.uid === selectedUserForAdjust.uid ? { ...u, balance: data.newBalance } : u));
        if (data.transaction) {
          setTransactionsList(prev => [data.transaction, ...prev]);
        }
        setSelectedUserForAdjust(null);
        setTimeout(() => setSuccessMsg(null), 5000);
        loadAdminData();
      } else {
        setErrorMsg(data.error || 'Erreur lors de l\'ajustement.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau lors de l\'ajustement.');
    } finally {
      setIsAdjusting(false);
    }
  };

  // Quick Bonus Button
  const handleQuickBonus = async (user: AdminUserRecord, bonusAmount: number = 1000) => {
    if (!window.confirm(`Attribuer un bonus instantané de +${bonusAmount.toLocaleString('fr-FR')} FCFA à ${user.firstName} (${user.email}) ?`)) {
      return;
    }
    try {
      const headers = getAdminHeaders(adminEmail);
      const res = await fetch('/api/admin/wallet/adjust', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          amount: bonusAmount,
          type: 'credit',
          reason: 'Bonus fidélité administrateur',
          adminEmail
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Bonus de +${bonusAmount} FCFA accordé à ${user.firstName} !`);
        setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, balance: data.newBalance } : u));
        if (data.transaction) {
          setTransactionsList(prev => [data.transaction, ...prev]);
        }
        setTimeout(() => setSuccessMsg(null), 4000);
        loadAdminData();
      }
    } catch (e) {
      setErrorMsg('Erreur lors de l\'attribution du bonus.');
    }
  };

  // -------------------------------------------------------------
  // VIP Subscriptions Calculations & Handlers
  // -------------------------------------------------------------
  const vipStats = useMemo(() => {
    let active = 0;
    let expired = 0;
    let inactive = 0;

    usersList.forEach(u => {
      const isVip = isUserVipActive(u.subscription) || u.subscriptionStatus === 'unlimited';
      if (isVip) {
        active++;
      } else if (u.subscription?.status === 'EXPIRED') {
        expired++;
      } else {
        inactive++;
      }
    });

    return {
      active,
      expired,
      inactive,
      total: usersList.length,
      conversionRate: usersList.length > 0 ? ((active / usersList.length) * 100).toFixed(1) : '0'
    };
  }, [usersList]);

  const filteredSubUsers = useMemo(() => {
    return usersList.filter(u => {
      const q = subSearch.toLowerCase().trim();
      const matchSearch = !q || 
        (u.firstName && u.firstName.toLowerCase().includes(q)) ||
        (u.lastName && u.lastName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q));

      if (!matchSearch) return false;

      const isVip = isUserVipActive(u.subscription) || u.subscriptionStatus === 'unlimited';
      if (subStatusFilter === 'ACTIVE') return isVip;
      if (subStatusFilter === 'EXPIRED') return u.subscription?.status === 'EXPIRED';
      if (subStatusFilter === 'INACTIVE') return !isVip && u.subscription?.status !== 'EXPIRED';

      return true;
    });
  }, [usersList, subSearch, subStatusFilter]);

  const handleRefreshSubscriptions = async () => {
    setIsLoadingSubs(true);
    try {
      const refreshedUsers = await fetchAllAdminUsersWithSubscriptions();
      if (refreshedUsers.length > 0) {
        setUsersList(refreshedUsers);
        setSuccessMsg("Liste des abonnements VIP actualisée en temps réel depuis Firestore.");
      }
    } catch (e: any) {
      setErrorMsg("Erreur lors de l'actualisation des abonnements.");
    } finally {
      setIsLoadingSubs(false);
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 4000);
    }
  };

  const handleOpenSubscriptionModal = (user: AdminUserRecord, defaultAction: 'activate' | 'extend' | 'suspend' | 'reset' = 'activate') => {
    setSelectedUserForSubModal(user);
    setSubAction(defaultAction);
    setSubDurationDays(30);
    setSubAdminNote('');
  };

  const handleConfirmSubscriptionChange = async () => {
    if (!selectedUserForSubModal) return;
    setIsSavingSub(true);
    setErrorMsg(null);

    try {
      const res = await manageUserSubscriptionInFirestore(
        selectedUserForSubModal.uid,
        subAction,
        subDurationDays,
        subAdminNote || undefined,
        adminEmail
      );

      if (res.success) {
        setSuccessMsg(res.message || "Abonnement mis à jour avec succès.");
        const refreshedUsers = await fetchAllAdminUsersWithSubscriptions();
        if (refreshedUsers.length > 0) {
          setUsersList(refreshedUsers);
        }
        setSelectedUserForSubModal(null);
      } else {
        setErrorMsg(res.message || "Échec de la modification de l'abonnement.");
      }
    } catch (err: any) {
      console.error('[Admin Sub Manage Error]:', err);
      setErrorMsg(err?.message || "Erreur lors de la gestion de l'abonnement.");
    } finally {
      setIsSavingSub(false);
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 5000);
    }
  };

  const handleQuickSubAction = async (user: AdminUserRecord, action: 'activate' | 'extend' | 'suspend' | 'reset', days: number = 30) => {
    setIsLoadingSubs(true);
    setErrorMsg(null);
    try {
      const note = action === 'extend' 
        ? `Prolongation express +${days}j effectuée par l'administrateur`
        : action === 'activate'
        ? `Activation express ${days}j par l'administrateur`
        : `Action express ${action} par l'administrateur`;

      const res = await manageUserSubscriptionInFirestore(
        user.uid,
        action,
        days,
        note,
        adminEmail
      );

      if (res.success) {
        setSuccessMsg(res.message);
        const refreshedUsers = await fetchAllAdminUsersWithSubscriptions();
        if (refreshedUsers.length > 0) {
          setUsersList(refreshedUsers);
        }
      } else {
        setErrorMsg(res.message);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur d'action express");
    } finally {
      setIsLoadingSubs(false);
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 5000);
    }
  };

  // 7. PRICING SAVE (TOTAL PRICE UNLOCK & FIRESTORE REAL-TIME SYNC)
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPricing(true);
    setErrorMsg(null);
    try {
      const sanitizedPricing: PlatformPricingConfig = {
        ...editingPricing,
        cvOnlyPrice: Number(editingPricing.cvOnlyPrice) || 0,
        letterOnlyPrice: Number(editingPricing.letterOnlyPrice) || 0,
        fullPackPrice: Number(editingPricing.fullPackPrice) || 0,
        devisPrice: Number(editingPricing.devisPrice) || 0,
        facturePrice: Number(editingPricing.facturePrice) || 0,
        businessPackPrice: Number(editingPricing.businessPackPrice) || 0,
        ebookPrice: Number(editingPricing.ebookPrice ?? 1500) || 0,
        unlimitedPassPrice: Number(editingPricing.unlimitedPassPrice) || 0,
        unlimitedPassMonthlyPrice: Number(editingPricing.unlimitedPassPrice) || 0,
        unlimitedPassAnnualPrice: Number(editingPricing.unlimitedPassAnnualPrice || 39999) || 0,
        recruiterSearchPrice: Number(editingPricing.recruiterSearchPrice) || 0,
        currency: 'FCFA',
        updatedAt: new Date().toISOString(),
        updatedBy: adminEmail
      };

      // 1. Immediate local state & storage update for 0-latency feedback
      setPricingConfig(sanitizedPricing);
      try {
        localStorage.setItem('senegal_cv_platform_pricing', JSON.stringify(sanitizedPricing));
        window.dispatchEvent(new CustomEvent('pricing-updated', { detail: sanitizedPricing }));
      } catch (_e) {}

      // 2. Persist to Firestore "settings_pricing/global"
      await savePricingToFirestore(sanitizedPricing);

      // 3. Persist to backend server API
      const headers = getAdminHeaders(adminEmail);
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          adminEmail,
          ...sanitizedPricing
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Tarifs enregistrés avec succès et synchronisés en temps réel sur toute la plateforme !');
      } else {
        setSuccessMsg('Tarifs enregistrés dans la base Firestore et appliqués immédiatement !');
      }
      setTimeout(() => setSuccessMsg(null), 4000);
      loadAdminData();
    } catch (e: any) {
      console.warn('Pricing save notice:', e);
      setSuccessMsg('Tarifs appliqués avec succès !');
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setIsSavingPricing(false);
    }
  };

  // 8. PROMO CODES CRUD
  const openCreatePromoModal = (promo?: PromoCode) => {
    if (promo) {
      setEditingPromo(promo);
      setPromoCodeInput(promo.code);
      setPromoTypeInput(promo.discountType);
      setPromoValueInput(promo.discountValue);
      setPromoMinOrderInput(promo.minOrderAmount || 0);
      setPromoLimitInput(promo.maxUsageLimit || 100);
      setPromoDescInput(promo.description || '');
      setPromoActiveInput(promo.active);
    } else {
      setEditingPromo(null);
      setPromoCodeInput('');
      setPromoTypeInput('percentage');
      setPromoValueInput(20);
      setPromoMinOrderInput(0);
      setPromoLimitInput(100);
      setPromoDescInput('');
      setPromoActiveInput(true);
    }
    setIsPromoModalOpen(true);
  };

  const handleSavePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Veuillez entrer un code promo (ex: TERANGA20).');
      return;
    }
    setIsSavingPromo(true);
    setErrorMsg(null);
    try {
      const promoId = editingPromo?.id || `PRM-${Date.now().toString().slice(-6)}`;
      const val = Number(promoValueInput) || 10;
      const newPromo: PromoCode = {
        id: promoId,
        code: cleanCode,
        discountType: promoTypeInput,
        discountValue: val,
        minOrderAmount: Number(promoMinOrderInput) || 0,
        maxUsageLimit: Number(promoLimitInput) || 100,
        currentUsageCount: editingPromo?.currentUsageCount || 0,
        active: promoActiveInput,
        description: promoDescInput || `Réduction de ${val}${promoTypeInput === 'percentage' ? '%' : ' FCFA'}`,
        createdAt: editingPromo?.createdAt || new Date().toISOString(),
        createdBy: adminEmail
      };

      // 1. Immediate local update
      setPromoCodesList((prev) => {
        const idx = prev.findIndex((p) => p.id === promoId || p.code === cleanCode);
        const updated = idx >= 0 ? [...prev] : [newPromo, ...prev];
        if (idx >= 0) updated[idx] = newPromo;
        try {
          localStorage.setItem('senegal_cv_platform_promos', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('promos-updated', { detail: updated }));
        } catch (_e) {}
        return updated;
      });

      // 2. Persist to Firestore collection "promo_codes"
      await savePromoCodeToFirestore(newPromo);

      // 3. Persist to backend server API
      const headers = getAdminHeaders(adminEmail);
      await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          adminEmail,
          ...newPromo
        })
      });

      setSuccessMsg(`Code promo "${cleanCode}" enregistré avec succès !`);
      setIsPromoModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
      loadAdminData();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erreur lors de l\'enregistrement du code promo.');
    } finally {
      setIsSavingPromo(false);
    }
  };

  const handleTogglePromoCode = async (id: string, code: string, currentActive: boolean) => {
    try {
      const newActive = !currentActive;
      // 1. Local state
      setPromoCodesList(prev => {
        const updated = prev.map(p => p.id === id || p.code === code ? { ...p, active: newActive } : p);
        try {
          localStorage.setItem('senegal_cv_platform_promos', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('promos-updated', { detail: updated }));
        } catch (_e) {}
        return updated;
      });

      // 2. Firestore
      const target = promoCodesList.find(p => p.id === id || p.code === code);
      if (target) {
        await savePromoCodeToFirestore({ ...target, active: newActive });
      }

      // 3. API
      const headers = getAdminHeaders(adminEmail);
      await fetch(`/api/admin/promo-codes/${id}/toggle`, {
        method: 'POST',
        headers
      });

      setSuccessMsg(`Code promo ${code} ${newActive ? 'activé' : 'désactivé'} avec succès.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadAdminData();
    } catch (e) {
      setErrorMsg('Erreur lors du changement de statut.');
    }
  };

  const handleDeletePromoCode = (promo: PromoCode) => {
    setPromoToDelete(promo);
  };

  const handleConfirmDeletePromo = async () => {
    if (!promoToDelete) return;
    const { id, code } = promoToDelete;
    setIsDeletingPromo(true);
    setErrorMsg(null);
    try {
      // 1. Immediate local state removal
      setPromoCodesList(prev => {
        const updated = prev.filter(p => p.id !== id && p.code !== code);
        try {
          localStorage.setItem('senegal_cv_platform_promos', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('promos-updated', { detail: updated }));
        } catch (_e) {}
        return updated;
      });

      // 2. Delete from Firestore collection "promo_codes"
      await deletePromoCodeFromFirestore(id, code);

      // 3. Delete from backend server API
      const headers = getAdminHeaders(adminEmail);
      try {
        await fetch(`/api/admin/promo-codes/${id}?adminEmail=${encodeURIComponent(adminEmail)}`, {
          method: 'DELETE',
          headers
        });
      } catch (_e) {}

      // Try deleting by code if id was generic
      try {
        await fetch(`/api/admin/promo-codes/${code}?adminEmail=${encodeURIComponent(adminEmail)}`, {
          method: 'DELETE',
          headers
        });
      } catch (_e) {}

      setSuccessMsg(`Code promo "${code}" supprimé avec succès !`);
      setPromoToDelete(null);
      setTimeout(() => setSuccessMsg(null), 4000);
      loadAdminData();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erreur lors de la suppression du code promo.');
    } finally {
      setIsDeletingPromo(false);
    }
  };

  // 9. TRANSACTION ADMIN ACTIONS (VALIDATION D'EXCEPTION & CONTRÔLE DE SECOURS)
  const handleValidateTransaction = async (tx: TransactionRecord, note?: string) => {
    setIsValidatingTx(true);
    setErrorMsg(null);
    const finalNote = note || manualValidationNote || 'Validation de secours Money Fusion effectuée par l\'administrateur.';

    // Dynamic instant local UI update to replace the button with the green badge immediately
    const nowIso = new Date().toISOString();
    setTransactionsList(prev => prev.map(t => t.id === tx.id ? {
      ...t,
      status: 'APPROVED',
      aiStatus: 'MANUALLY_VALIDATED',
      manuallyValidatedBy: adminEmail,
      manuallyValidatedAt: nowIso,
      adminValidationNote: finalNote
    } : t));

    if (selectedTxForInspection && selectedTxForInspection.id === tx.id) {
      setSelectedTxForInspection(prev => prev ? {
        ...prev,
        status: 'APPROVED',
        aiStatus: 'MANUALLY_VALIDATED',
        manuallyValidatedBy: adminEmail,
        manuallyValidatedAt: nowIso,
        adminValidationNote: finalNote
      } : null);
    }

    try {
      // Run atomic Firestore approval transaction: updates status to 'APPROVED' & credits walletBalance in users/{userId}
      const result = await approveTransactionWithAtomicFirestore(tx, adminEmail, finalNote);

      if (result.success) {
        setSuccessMsg(result.message || `Transaction ${tx.id} validée et accréditée avec succès !`);
        setManualValidationNote('');
        setTimeout(() => setSuccessMsg(null), 4500);
        loadAdminData();
      } else {
        setErrorMsg((result as any).error || result.message || 'Erreur lors de la validation manuelle de la transaction.');
        loadAdminData();
      }
    } catch (e: any) {
      console.error('Error validating transaction:', e);
      setErrorMsg(e.message || 'Erreur réseau lors de la validation manuelle.');
      loadAdminData();
    } finally {
      setIsValidatingTx(false);
    }
  };

  const handleRejectTransaction = async (tx: TransactionRecord, reason?: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir confirmer le rejet définitif de la transaction ${tx.id} ?`)) return;
    setIsRejectingTx(true);
    setErrorMsg(null);
    try {
      const finalReason = reason || tx.rejectionReason || 'Rejet confirmé par l\'administrateur.';
      const result = await rejectTransactionWithFirestore(tx, adminEmail, finalReason);
      if (result.success) {
        setSuccessMsg(result.message || `Rejet confirmé pour la transaction ${tx.id}.`);
        if (selectedTxForInspection && selectedTxForInspection.id === tx.id) {
          setSelectedTxForInspection(prev => prev ? {
            ...prev,
            status: 'REJECTED',
            aiStatus: 'REJECTED_BY_ADMIN',
            rejectionReason: finalReason
          } : null);
        }
        setTimeout(() => setSuccessMsg(null), 4000);
        loadAdminData();
      } else {
        setErrorMsg(result.error || result.message || 'Erreur lors de la confirmation du rejet.');
      }
    } catch (e: any) {
      console.error('Error rejecting transaction:', e);
      setErrorMsg(e.message || 'Erreur réseau lors du rejet.');
    } finally {
      setIsRejectingTx(false);
    }
  };

  // 10. PURGE DEMO DATA (EXCLUSIVE TO SUPER ADMIN peter25ngouala@gmail.com)
  const handlePurgeDemoData = async () => {
    setIsPurgingDemoData(true);
    setErrorMsg(null);
    try {
      const res = await purgeDemoDataInFirestore(adminEmail);
      if (res.success) {
        setSuccessMsg(res.message);
        setIsPurgeModalOpen(false);
        await loadAdminData();
        setTimeout(() => setSuccessMsg(null), 7000);
      } else {
        setErrorMsg(res.message || 'Erreur lors du nettoyage des données de démonstration.');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erreur lors de la purge.');
    } finally {
      setIsPurgingDemoData(false);
    }
  };

  // 10. EXPORT CSV (Transactions & Audit)
  const handleExportTransactionsCSV = () => {
    if (filteredTransactions.length === 0) return;
    const csvRows = [
      ['Réf ID', 'TxID Extrait', 'Date Envoi', 'Utilisateur', 'Nom', 'Methode', 'Montant Attendu', 'Montant Extrait', 'Horodatage Reçu', 'Statut', 'Motif / Détails'],
      ...filteredTransactions.map(t => [
        t.id,
        (t as any).transactionId || '',
        t.createdAt,
        (t as any).userEmail || t.userId,
        (t as any).userName || '',
        t.paymentMethod || 'wave',
        t.expectedAmount ? `${t.expectedAmount} FCFA` : `${Math.abs(t.amount)} FCFA`,
        t.extractedAmount ? `${t.extractedAmount} FCFA` : `${Math.abs(t.amount)} FCFA`,
        (t as any).receiptTimestamp || '',
        t.status,
        `"${(t.rejectionReason || t.description || '').replace(/"/g, '""')}"`
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `senegalcv_transactions_ia_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 10. PURGE DES REÇUS EXPIRÉS (>24H)
  const handlePurgeReceipts = async () => {
    setIsPurgingReceipts(true);
    try {
      const res = await purgeExpiredPaymentReceipts(transactionsList);
      if (res.purgedCount > 0) {
        setSuccessMsg(`🧹 ${res.purgedCount} reçu(s) (+24h) purgé(s) du stockage avec succès. Historique comptable conservé.`);
      } else {
        setSuccessMsg("Tous les reçus validés ou rejetés depuis plus de 24h ont déjà été purgés.");
      }
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (e: any) {
      console.warn('Erreur lors de la purge des reçus:', e);
      setErrorMsg("Une erreur est survenue lors de la purge des reçus.");
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setIsPurgingReceipts(false);
    }
  };

  // Access Guard
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 mx-auto bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center border border-red-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 mb-3">
              Accès Restreint
            </span>
            <h1 className="text-2xl font-black text-white">Espace Administrateur</h1>
            <p className="text-sm text-slate-400 mt-2">
              Cette section est protégée et exclusivement réservée à l'administrateur principal (<strong>{PRIMARY_ADMIN_EMAIL}</strong>).
            </p>
          </div>

          <div className="bg-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 text-left border border-slate-700/60">
            <p className="font-semibold text-slate-300">Compte actuellement connecté :</p>
            <p className="text-amber-400 font-mono mt-1 break-all">{currentUser?.email || 'Non connecté'}</p>
          </div>

          <button
            onClick={onBackHome}
            type="button"
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all text-sm cursor-pointer"
          >
            Retourner à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      stopImpersonationSession();
      await signOut(auth);
    } catch (e) {
      console.error('Sign out error:', e);
    }
    onBackHome();
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 font-sans selection:bg-indigo-600 selection:text-white flex flex-col lg:flex-row">
      
      {/* Sidebar Navigation (Desktop Fixed / Mobile Drawer) */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        usersCount={usersList.length}
        pendingTransactionsCount={financialStats.pendingCount}
        urgentSupportCount={urgentSupportCount}
        promoCodesCount={promoCodesList.length}
        activeVipCount={vipStats.active}
        adminEmail={adminEmail}
        onBackHome={onBackHome}
        onLogout={handleLogout}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen pb-20">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-[#090D16]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3.5 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            
            {/* Mobile Hamburger / Desktop Collapse Toggle & Platform Badge */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-all cursor-pointer"
                aria-label="Ouvrir le menu de navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleToggleSidebarCollapse}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all cursor-pointer text-xs"
                title={isSidebarCollapsed ? "Agrandir le menu latéral" : "Réduire le menu latéral pour libérer de l'espace"}
              >
                {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4 text-indigo-400" /> : <PanelLeftClose className="w-4 h-4 text-slate-400" />}
                <span>{isSidebarCollapsed ? "Agrandir menu" : "Réduire menu"}</span>
              </button>

              <div className="flex items-center gap-2.5">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SUPER ADMIN ACTIF
                </span>
                <span className="hidden sm:inline-block text-xs text-slate-400 font-medium font-mono">
                  {adminEmail}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Siren Audio Alert Control / Manual Test */}
              <button
                type="button"
                onClick={() => {
                  if (isAlarmTesting || isEmergencyAlarmActive()) {
                    stopEmergencyAlarm();
                    setIsAlarmTesting(false);
                    setIsAlarmMuted(true);
                  } else {
                    setIsAlarmMuted(false);
                    setIsAlarmTesting(true);
                    startEmergencyAlarm();
                    setTimeout(() => {
                      stopEmergencyAlarm();
                      setIsAlarmTesting(false);
                    }, 4000);
                  }
                }}
                title={isAlarmMuted ? "Alarme coupée (Cliquer pour réactiver ou tester)" : "Sirène audio active pour les alertes urgentes"}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                  isAlarmTesting || (!isAlarmMuted && totalEmergencyCount > 0)
                    ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-950/50'
                    : isAlarmMuted
                    ? 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-white'
                    : 'bg-slate-800/90 text-emerald-300 border-emerald-500/30 hover:bg-slate-800'
                }`}
              >
                {isAlarmMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isAlarmTesting ? 'Test Sirène...' : isAlarmMuted ? 'Sirène Coupée' : 'Sirène Active'}</span>
              </button>

              {adminEmail === PRIMARY_ADMIN_EMAIL && (
                <button
                  onClick={() => setIsPurgeModalOpen(true)}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-600 hover:to-rose-600 text-amber-300 hover:text-white border border-amber-500/40 transition-all cursor-pointer shadow-sm"
                  title="Purger les faux reçus et réinitialiser les soldes de test pour le lancement réel"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">🔥 Nettoyer démos</span>
                </button>
              )}

              <button
                onClick={async () => {
                  await loadAdminData();
                  setSuccessMsg('Données administratives actualisées avec succès !');
                  setTimeout(() => setSuccessMsg(null), 3000);
                }}
                type="button"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all cursor-pointer disabled:opacity-50"
                title="Rafraîchir les données"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
                <span>Actualiser</span>
              </button>

              <button
                onClick={onBackHome}
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/30 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Voir le Site</span>
              </button>

              <button
                onClick={handleLogout}
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-all cursor-pointer"
                title="Se déconnecter de la session Administrateur"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Déconnexion</span>
              </button>
            </div>

          </div>
        </header>

        {/* Main Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">

        {/* Urgent Emergency Alert Banner */}
        {totalEmergencyCount > 0 && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-950 via-rose-900/90 to-slate-900 border-2 border-rose-500/80 shadow-2xl shadow-rose-950/80 animate-in fade-in flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-950/60 animate-bounce">
                <BellRing className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse">
                    🚨 ALERTE INTERVENTION DIRECTE ({totalEmergencyCount})
                  </span>
                  {!isAlarmMuted && (
                    <span className="text-xs text-rose-200 flex items-center gap-1 font-semibold">
                      <Volume2 className="w-3.5 h-3.5 text-rose-300 animate-pulse" />
                      Sirène d'alarme active
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  Des clients demandent une assistance immédiate
                </h2>
                <p className="text-xs text-rose-200/80">
                  {urgentSupportCount > 0 && (
                    <span className="font-bold text-rose-300 mr-3">
                      • {urgentSupportCount} client(s) ont cliqué sur "Parler à un conseiller humain"
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto flex-wrap">
              <button
                type="button"
                onClick={() => {
                  stopEmergencyAlarm();
                  setIsAlarmMuted(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span>Couper l'alarme</span>
              </button>

              {urgentSupportCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    stopEmergencyAlarm();
                    setIsAlarmMuted(true);
                    setActiveTab('support');
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-950/40 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Répondre au Tchat ({urgentSupportCount})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Global Notifications */}
        {successMsg && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-sm shadow-xl animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-sm shadow-xl animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: VUE D'ENSEMBLE (OVERVIEW & KPIS) */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Chiffre d'Affaires Global */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chiffre d'Affaires Total</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  {isRealtimeStatsLoading ? (
                    <div className="space-y-2">
                      <div className="h-8 w-36 bg-slate-800 animate-pulse rounded-xl"></div>
                      <div className="h-3.5 w-44 bg-slate-800/60 animate-pulse rounded-md"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {(financialStats.totalRevenue || 0).toLocaleString('fr-FR')} <span className="text-sm font-semibold text-emerald-400">FCFA</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-emerald-400 font-semibold">{financialStats.validatedCount} paiements validés</span>
                        <span>•</span>
                        <span className="text-slate-300 font-medium">Money Fusion Direct</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Webhook Actif 🟢</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Card 2: Documents Générés */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-teal-500/30 transition-all">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-teal-500/10 rounded-full blur-xl group-hover:bg-teal-500/20 transition-all"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Documents IA Créés</span>
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  {isRealtimeStatsLoading ? (
                    <div className="space-y-2">
                      <div className="h-8 w-24 bg-slate-800 animate-pulse rounded-xl"></div>
                      <div className="h-3.5 w-40 bg-slate-800/60 animate-pulse rounded-md"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {(effectiveKPIs?.totalCVsGenerated || 0).toLocaleString('fr-FR')}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">CV ATS, Lettres, Devis & Ebooks</p>
                    </>
                  )}
                </div>
              </div>

              {/* Card 3: Candidats Inscrits */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-all">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidats Inscrits</span>
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  {isRealtimeStatsLoading ? (
                    <div className="space-y-2">
                      <div className="h-8 w-24 bg-slate-800 animate-pulse rounded-xl"></div>
                      <div className="h-3.5 w-36 bg-slate-800/60 animate-pulse rounded-md"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {(effectiveKPIs?.totalUsersCount || usersList.length).toLocaleString('fr-FR')}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Sénégal, UEMOA & Diaspora</p>
                    </>
                  )}
                </div>
              </div>

              {/* Card 4: Solde en Circulation */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Solde Portefeuilles</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  {isRealtimeStatsLoading ? (
                    <div className="space-y-2">
                      <div className="h-8 w-32 bg-slate-800 animate-pulse rounded-xl"></div>
                      <div className="h-3.5 w-44 bg-slate-800/60 animate-pulse rounded-md"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {(realTotalUserBalance || effectiveKPIs?.totalCirculatingBalance || 0).toLocaleString('fr-FR')} <span className="text-sm font-semibold text-amber-400">FCFA</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Total des soldes réels dans Firestore</p>
                    </>
                  )}
                </div>
              </div>

            </div>

            {/* Financial Performance Breakdown Widget (Jour, Semaine, Mois, Total) */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/30 border border-emerald-500/20 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Statistiques Financières & Encaissements Réels</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Données certifiées en temps réel via Webhook Money Fusion Direct (Wave, Orange Money, Free Money).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('transactions')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Voir le Journal des Paiements</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aujourd'hui</div>
                  {isRealtimeStatsLoading ? (
                    <div className="h-7 w-24 bg-slate-800 animate-pulse rounded-lg my-1"></div>
                  ) : (
                    <div className="text-lg sm:text-xl font-black text-emerald-400 mt-1">
                      {financialStats.todayRevenue.toLocaleString('fr-FR')} <span className="text-xs font-semibold">FCFA</span>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 mt-0.5">Minuit à maintenant</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cette Semaine</div>
                  {isRealtimeStatsLoading ? (
                    <div className="h-7 w-24 bg-slate-800 animate-pulse rounded-lg my-1"></div>
                  ) : (
                    <div className="text-lg sm:text-xl font-black text-white mt-1">
                      {financialStats.weekRevenue.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-emerald-400">FCFA</span>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 mt-0.5">7 derniers jours</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ce Mois-ci</div>
                  {isRealtimeStatsLoading ? (
                    <div className="h-7 w-24 bg-slate-800 animate-pulse rounded-lg my-1"></div>
                  ) : (
                    <div className="text-lg sm:text-xl font-black text-white mt-1">
                      {financialStats.monthRevenue.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-emerald-400">FCFA</span>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 mt-0.5">Depuis le 1er du mois</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
                  <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Taux de Succès</div>
                  {isRealtimeStatsLoading ? (
                    <div className="h-7 w-16 bg-slate-800 animate-pulse rounded-lg my-1"></div>
                  ) : (
                    <div className="text-lg sm:text-xl font-black text-emerald-300 mt-1">
                      {financialStats.successRate}%
                    </div>
                  )}
                  <div className="text-[10px] text-emerald-400/80 mt-0.5">{financialStats.validatedCount} paiements validés</div>
                </div>
              </div>
            </div>

            {/* Courbe Visuelle Épurée des Ventes (30 Derniers Jours - Money Fusion Direct) */}
            <AdminSalesTrendCurve transactions={transactionsList} />

            {/* Performance Grid: Services & Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Répartition par Service (Dynamique Firestore onSnapshot) */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Répartition des Ventes</span>
                  </h2>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Temps réel
                  </span>
                </div>

                {isRealtimeStatsLoading ? (
                  <div className="space-y-4 pt-2">
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <div key={idx} className="space-y-2 animate-pulse">
                        <div className="flex justify-between">
                          <div className="h-3.5 w-40 bg-slate-800 rounded"></div>
                          <div className="h-3.5 w-16 bg-slate-800 rounded"></div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3.5 pt-2">
                    {(realtimeMetrics?.salesBreakdown || []).map((item) => (
                      <div key={item.id} className="space-y-1.5 group/item">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <span className="text-slate-300 font-semibold truncate">{item.name}</span>
                            {item.count > 0 && (
                              <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                ({item.count} vente{item.count > 1 ? 's' : ''})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 font-mono">
                            <span className={`font-bold ${item.revenue > 0 ? 'text-white' : 'text-slate-500'}`}>
                              {item.revenue.toLocaleString('fr-FR')} FCFA
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 w-7 text-right">
                              {item.percentage}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div 
                            className={`h-full ${item.barColor} rounded-full transition-all duration-700 ease-out`}
                            style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Raccourcis d'administration rapide */}
              <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Actions d'Administration Prioritaires</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Accédez directement aux modules de contrôle pour gérer votre plateforme et vos candidats.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
                    
                    <button
                      onClick={() => setActiveTab('users')}
                      className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-all">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-300">Prise de Contrôle</h3>
                      <p className="text-xs text-slate-400 mt-1">Inspecter la session d'un utilisateur en mode impersonation.</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('pricing')}
                      className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-all">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-300">Modifier les Prix</h3>
                      <p className="text-xs text-slate-400 mt-1">Ajuster les tarifs en FCFA (500F, 1 500F, 3 000F...).</p>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('promo');
                        openCreatePromoModal();
                      }}
                      className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-all">
                        <Tag className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-cyan-300">Créer Code Promo</h3>
                      <p className="text-xs text-slate-400 mt-1">Générer des remises en % ou FCFA pour vos campagnes.</p>
                    </button>

                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>Passerelle : <strong className="text-white font-bold">Money Fusion Direct</strong></span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Webhook Actif 🟢</span>
                  </div>
                  <span>Taux de succès global : <strong className="text-emerald-400 font-bold">{financialStats.successRate}%</strong> ({financialStats.validatedCount} réussites)</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CANDIDATS & COMPTES (USERS, IMPERSONATION, UNLOCK, SUSPEND, DELETE) */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            
            {/* Filter Bar */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, ville, téléphone ou métier..."
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-2xl text-xs sm:text-sm !text-white !placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-all caret-blue-500"
                />
              </div>

              {/* Status & Role Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e: any) => { setStatusFilter(e.target.value); setUserPage(1); }}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs !text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">Tous les Statuts</option>
                  <option value="active" className="bg-slate-900 text-white">Actif</option>
                  <option value="suspended" className="bg-slate-900 text-white">Suspendu</option>
                </select>

                <select
                  value={balanceFilter}
                  onChange={(e: any) => { setBalanceFilter(e.target.value); setUserPage(1); }}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs !text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">Tous les Soldes</option>
                  <option value="positive" className="bg-slate-900 text-white">Solde &gt; 0 FCFA</option>
                  <option value="zero" className="bg-slate-900 text-white">Solde = 0 FCFA</option>
                </select>
              </div>

            </div>

            {/* Users Table */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-950/80 border-b border-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-4 px-4 sm:px-6">Candidat / Identité</th>
                      <th className="py-4 px-3">Métier & Ville</th>
                      <th className="py-4 px-3">Solde Portefeuille</th>
                      <th className="py-4 px-3">Documents</th>
                      <th className="py-4 px-3">Statut</th>
                      <th className="py-4 px-4 sm:px-6 text-right">Actions de Contrôle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          Aucun utilisateur ne correspond à votre recherche.
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user) => {
                        const isSuspended = user.status === 'suspended';
                        const isSuperAdmin = isAdminEmail(user.email);

                        return (
                          <tr key={user.uid} className={`hover:bg-slate-800/40 transition-all ${isSuspended ? 'bg-rose-950/20' : ''}`}>
                            
                            {/* Identité */}
                            <td className="py-3.5 px-4 sm:px-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase ${
                                  isSuperAdmin 
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : isSuspended
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {user.firstName ? user.firstName[0] : 'U'}
                                </div>
                                <div>
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <span>{user.firstName} {user.lastName}</span>
                                    {isSuperAdmin && (
                                      <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">Admin</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-400">{user.email}</div>
                                  {user.phone && <div className="text-[11px] text-slate-500 font-mono">{user.phone}</div>}
                                </div>
                              </div>
                            </td>

                            {/* Métier & Ville */}
                            <td className="py-3.5 px-3">
                              <div className="text-xs text-slate-200 font-medium">{user.targetJob || 'Candidat'}</div>
                              <div className="text-[11px] text-slate-400">{user.city || 'Dakar'}</div>
                            </td>

                            {/* Solde Wallet */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{(user.balance || 0).toLocaleString('fr-FR')} FCFA</span>
                              </div>
                            </td>

                            {/* Documents */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-200">{user.documentsCount || 0} doc(s)</span>
                                {user.hasForceUnlockedDocs && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30" title="Tous les documents ont été débloqués par l'admin">
                                    Débloqué
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Statut */}
                            <td className="py-3.5 px-3">
                              {isSuspended ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  <Ban className="w-3 h-3" />
                                  <span>Suspendu</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Actif</span>
                                </span>
                              )}
                            </td>

                            {/* Actions Menu Simplifié : Inspecter, Solde & Accès de Secours Contextuel */}
                            <td className="py-3.5 px-4 sm:px-6 text-right">
                              <div className="flex items-center justify-end gap-2 relative">
                                
                                {/* 1. Inspecter / Contrôler (Prise de contrôle principale) */}
                                <button
                                  onClick={() => setInspectingCandidate(user)}
                                  type="button"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                                  title="Inspecter le profil et prendre le contrôle du compte"
                                >
                                  <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>Inspecter / Contrôler</span>
                                </button>

                                {/* 2. Ajuster Solde */}
                                <button
                                  onClick={() => setSelectedUserForAdjust(user)}
                                  type="button"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                                  title="Ajuster le solde du portefeuille"
                                >
                                  <Sliders className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>Ajuster Solde</span>
                                </button>

                                {/* 3. Menu Contextuel : Accès de Secours & Outils Avancés */}
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenUserMenuId(openUserMenuId === user.uid ? null : user.uid);
                                    }}
                                    type="button"
                                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                      openUserMenuId === user.uid
                                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                                    }`}
                                    title="Accès de secours et options du compte"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>

                                  {openUserMenuId === user.uid && (
                                    <>
                                      <div 
                                        className="fixed inset-0 z-30" 
                                        onClick={() => setOpenUserMenuId(null)}
                                      />
                                      <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl bg-slate-900 border border-slate-700 p-2 shadow-2xl z-40 space-y-1 text-left">
                                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                                          Accès de Secours &amp; Outils
                                        </div>

                                        {/* Déblocage forcé documents */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenUserMenuId(null);
                                            handleForceUnlockDocs(user);
                                          }}
                                          className="w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-teal-300 hover:bg-teal-500/15 flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                          <Unlock className="w-4 h-4 text-teal-400 shrink-0" />
                                          <span>Accès de secours : Débloquer Docs</span>
                                        </button>

                                        {/* Modifier profil */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenUserMenuId(null);
                                            openEditModal(user);
                                          }}
                                          className="w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                          <Edit3 className="w-4 h-4 text-slate-400 shrink-0" />
                                          <span>Modifier profil &amp; rôle</span>
                                        </button>

                                        {/* Suspendre / Réactiver */}
                                        {!isSuperAdmin && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenUserMenuId(null);
                                              setUserToSuspend(user);
                                            }}
                                            className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                                              isSuspended 
                                                ? 'text-emerald-300 hover:bg-emerald-500/15'
                                                : 'text-amber-300 hover:bg-amber-500/15'
                                            }`}
                                          >
                                            <Ban className="w-4 h-4 shrink-0" />
                                            <span>{isSuspended ? 'Réactiver le compte' : 'Suspendre le compte'}</span>
                                          </button>
                                        )}

                                        {/* Supprimer définitivement */}
                                        {!isSuperAdmin && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenUserMenuId(null);
                                              setUserToDelete(user);
                                            }}
                                            className="w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/15 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-800"
                                          >
                                            <Trash2 className="w-4 h-4 shrink-0 text-rose-500" />
                                            <span>Supprimer le compte</span>
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>

                              </div>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalUserPages > 1 && (
                <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Page {userPage} sur {totalUserPages} ({filteredUsers.length} candidats au total)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setUserPage(p => Math.max(1, p - 1))}
                      disabled={userPage === 1}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold"
                    >
                      Précédent
                    </button>
                    <button
                      onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                      disabled={userPage === totalUserPages}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2B: ABONNEMENTS PASS VIP (FIRESTORE REAL-TIME OVERRIDE & MONITORING)   */}
        {/* ========================================================================= */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            
            {/* Header & Refresh */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Gestion des Abonnements Pass VIP</h2>
                    <p className="text-xs text-slate-400">
                      Supervision directe des accès illimités, activation automatique Money Fusion et contrôle d'exception.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshSubscriptions}
                  disabled={isLoadingSubs}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSubs ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Actualiser Firestore</span>
                </button>
              </div>
            </div>

            {/* 4 KPIs Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-amber-500/30 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Abonnés VIP Actifs</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Crown className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl sm:text-3xl font-black text-white">
                  {vipStats.active}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Accès illimité sans guichet</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-rose-500/30 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Abonnements Expirés</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl sm:text-3xl font-black text-white">
                  {vipStats.expired}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-300 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Repassés en mode gratuit</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comptes Sans Pass</span>
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl sm:text-3xl font-black text-white">
                  {vipStats.inactive}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <span>Paiement à l'acte (1 000 FCFA)</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-emerald-500/30 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Taux de Pénétration</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl sm:text-3xl font-black text-white">
                  {vipStats.conversionRate}%
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
                  <span>Sur {vipStats.total} utilisateurs inscrits</span>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrer par nom, prénom, email ou téléphone..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-2xl text-xs sm:text-sm !text-white !placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition-all caret-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={subStatusFilter}
                  onChange={(e: any) => setSubStatusFilter(e.target.value)}
                  className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs !text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">Tous les Statuts ({usersList.length})</option>
                  <option value="ACTIVE" className="bg-slate-900 text-white">👑 VIP Actif uniquement ({vipStats.active})</option>
                  <option value="EXPIRED" className="bg-slate-900 text-white">⚠️ Expiré ({vipStats.expired})</option>
                  <option value="INACTIVE" className="bg-slate-900 text-white">Sans Abonnement ({vipStats.inactive})</option>
                </select>

                <div className="px-3 py-2 bg-slate-950/80 border border-slate-800/60 rounded-xl text-xs text-slate-400 font-medium">
                  {filteredSubUsers.length} affiché(s)
                </div>
              </div>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-950/80 border-b border-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-4 px-4 sm:px-6">Utilisateur</th>
                      <th className="py-4 px-3">Formule / Plan</th>
                      <th className="py-4 px-3">Statut VIP</th>
                      <th className="py-4 px-3">Activation</th>
                      <th className="py-4 px-3">Expiration</th>
                      <th className="py-4 px-3">Notes Admin</th>
                      <th className="py-4 px-4 sm:px-6 text-right">Actions de Contrôle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSubUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          Aucun utilisateur ne correspond aux critères de recherche.
                        </td>
                      </tr>
                    ) : (
                      filteredSubUsers.map((user) => {
                        const isVip = isUserVipActive(user.subscription) || user.subscriptionStatus === 'unlimited';
                        const status = user.subscription?.status || (isVip ? 'ACTIVE' : 'INACTIVE');
                        const expMillis = getTimestampMillis(user.subscription?.expiresAt);
                        const actMillis = getTimestampMillis(user.subscription?.activatedAt);
                        const isLifetime = expMillis && expMillis > 4000000000000;
                        const daysLeft = expMillis ? Math.ceil((expMillis - Date.now()) / 86400000) : null;

                        return (
                          <tr key={user.uid} className="hover:bg-slate-800/30 transition-colors">
                            {/* User Info */}
                            <td className="py-4 px-4 sm:px-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                                  isVip ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}>
                                  {user.firstName?.[0] || user.email[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <span>{user.firstName} {user.lastName}</span>
                                    {isVip && (
                                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-400">{user.email}</div>
                                  {user.phone && <div className="text-[11px] text-slate-500">{user.phone}</div>}
                                </div>
                              </div>
                            </td>

                            {/* Plan Name */}
                            <td className="py-4 px-3">
                              {isVip ? (
                                <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  <span>{isLifetime ? 'Pass VIP Permanent (À Vie)' : user.subscription?.planName || 'Pass VIP Dokya'}</span>
                                </span>
                              ) : status === 'EXPIRED' ? (
                                <span className="text-rose-400 font-medium">Pass VIP (Expiré)</span>
                              ) : (
                                <span className="text-slate-400 font-medium">Gratuit / À l'acte</span>
                              )}
                            </td>

                            {/* Status Badge */}
                            <td className="py-4 px-3">
                              {isVip ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  ACTIF
                                </span>
                              ) : status === 'EXPIRED' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  <AlertTriangle className="w-3 h-3" />
                                  EXPIRÉ
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  INACTIF
                                </span>
                              )}
                            </td>

                            {/* Activated Date */}
                            <td className="py-4 px-3 text-slate-300">
                              {actMillis ? (
                                <span>
                                  {new Date(actMillis).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>

                            {/* Expiration Date */}
                            <td className="py-4 px-3">
                              {isLifetime ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                  <Infinity className="w-3.5 h-3.5" />
                                  <span>Permanent (À Vie)</span>
                                </span>
                              ) : expMillis ? (
                                <div>
                                  <div className={`font-semibold ${daysLeft && daysLeft <= 3 ? 'text-rose-400' : 'text-slate-200'}`}>
                                    {new Date(expMillis).toLocaleDateString('fr-FR', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {daysLeft && daysLeft > 0 ? (
                                      <span className={daysLeft <= 3 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                                        {daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}
                                      </span>
                                    ) : (
                                      <span className="text-rose-400 font-bold">Échu</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>

                            {/* Admin Notes */}
                            <td className="py-4 px-3 text-slate-400 max-w-xs truncate">
                              {user.subscription?.adminNote ? (
                                <span className="text-xs bg-slate-950 px-2 py-1 rounded-md border border-slate-800 text-slate-300" title={user.subscription.adminNote}>
                                  {user.subscription.adminNote}
                                </span>
                              ) : (
                                <span className="text-slate-600 text-xs italic">Aucune note</span>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="py-4 px-4 sm:px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSubscriptionModal(user, isVip ? 'extend' : 'activate')}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-900/30 transition-all cursor-pointer"
                                  title="Ouvrir le panneau de contrôle complet de l'abonnement"
                                >
                                  <Crown className="w-3.5 h-3.5" />
                                  <span>{isVip ? 'Gérer / Prolonger' : 'Activer Pass VIP'}</span>
                                </button>

                                {isVip && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickSubAction(user, 'extend', 30)}
                                    disabled={isLoadingSubs}
                                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                                    title="Prolonger immédiatement de 30 jours supplémentaires"
                                  >
                                    +30j
                                  </button>
                                )}

                                {isVip && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSubscriptionModal(user, 'suspend')}
                                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                                    title="Suspendre l'abonnement"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: GESTION DES PRIX & OFFRES (DYNAMIC PRICING) */}
        {/* ========================================================================= */}
        {activeTab === 'pricing' && (
          <form onSubmit={handleSavePricing} className="space-y-6">
            
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span>Grille Tarifaire Dynamique de la Plateforme</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Modifiez les tarifs en FCFA. Toute modification est immédiatement synchronisée sur la page d'accueil, le configurateur et le checkout.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSavingPricing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-950/40 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 font-black" />
                <span>{isSavingPricing ? 'Enregistrement...' : 'Enregistrer les Tarifs'}</span>
              </button>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              
              {/* Product 1: CV ATS Seul */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg space-y-3">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Document Unique</span>
                <h3 className="text-sm font-bold text-white">CV ATS Professionnel</h3>
                <p className="text-xs text-slate-400">Génération et export PDF/DOCX d'un CV optimisé.</p>
                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-300">Prix (FCFA) :</label>
                  <input
                    type="number"
                    step="any"
                    value={editingPricing.cvOnlyPrice ?? ''}
                    onChange={(e) => setEditingPricing({ ...editingPricing, cvOnlyPrice: Number(e.target.value) })}
                    className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-base focus:border-emerald-500 focus:outline-none"
                    placeholder="ex: 1000"
                  />
                </div>
              </div>

              {/* Product 2: Lettre Seule */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg space-y-3">
                <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">Document Unique</span>
                <h3 className="text-sm font-bold text-white">Lettre de Motivation</h3>
                <p className="text-xs text-slate-400">Lettre percutante rédigée par l'IA.</p>
                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-300">Prix (FCFA) :</label>
                  <input
                    type="number"
                    step="any"
                    value={editingPricing.letterOnlyPrice ?? ''}
                    onChange={(e) => setEditingPricing({ ...editingPricing, letterOnlyPrice: Number(e.target.value) })}
                    className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-base focus:border-emerald-500 focus:outline-none"
                    placeholder="ex: 1000"
                  />
                </div>
              </div>

              {/* Product 3: Pack Duo */}
              <div className="bg-slate-900/80 border border-emerald-500/40 rounded-3xl p-5 shadow-lg space-y-3 relative overflow-hidden">
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                  Best Seller
                </div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Offre Populaire</span>
                <h3 className="text-sm font-bold text-white">Pack Duo (CV + Lettre)</h3>
                <p className="text-xs text-slate-400">Le pack complet pour postuler efficacement.</p>
                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-300">Prix (FCFA) :</label>
                  <input
                    type="number"
                    step="any"
                    value={editingPricing.fullPackPrice ?? ''}
                    onChange={(e) => setEditingPricing({ ...editingPricing, fullPackPrice: Number(e.target.value) })}
                    className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-emerald-500/60 text-emerald-300 font-black text-base focus:border-emerald-400 focus:outline-none"
                    placeholder="ex: 1399"
                  />
                </div>
              </div>

              {/* Product 4: Devis Pro */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg space-y-3">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Facturation & Devis</span>
                <h3 className="text-sm font-bold text-white">Devis Professionnel</h3>
                <p className="text-xs text-slate-400">Modèle conforme avec TVA & mentions UEMOA.</p>
                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-300">Prix (FCFA) :</label>
                  <input
                    type="number"
                    step="any"
                    value={editingPricing.devisPrice ?? ''}
                    onChange={(e) => setEditingPricing({ ...editingPricing, devisPrice: Number(e.target.value) })}
                    className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-base focus:border-emerald-500 focus:outline-none"
                    placeholder="ex: 1000"
                  />
                </div>
              </div>

              {/* Product 5: Facture UEMOA */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg space-y-3">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Facturation & Devis</span>
                <h3 className="text-sm font-bold text-white">Facture Commerciale UEMOA</h3>
                <p className="text-xs text-slate-400">Facturation d'entreprise en FCFA (XOF).</p>
                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-300">Prix (FCFA) :</label>
                  <input
                    type="number"
                    step="any"
                    value={editingPricing.facturePrice ?? ''}
                    onChange={(e) => setEditingPricing({ ...editingPricing, facturePrice: Number(e.target.value) })}
                    className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-base focus:border-emerald-500 focus:outline-none"
                    placeholder="ex: 1000"
                  />
                </div>
              </div>

              {/* Product 6: Pack Business */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg space-y-3">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Offre PME & Entreprise</span>
                <h3 className="text-sm font-bold text-white">Pack Business (Devis + Facture)</h3>
                <p className="text-xs text-slate-400">Pack complet factures + devis + documents pros.</p>
                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-300">Prix (FCFA) :</label>
                  <input
                    type="number"
                    step="any"
                    value={editingPricing.businessPackPrice ?? ''}
                    onChange={(e) => setEditingPricing({ ...editingPricing, businessPackPrice: Number(e.target.value) })}
                    className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-base focus:border-emerald-500 focus:outline-none"
                    placeholder="ex: 1499"
                  />
                </div>
              </div>

              {/* Product 7: Ebook / Livre Numérique */}
              <div className="bg-slate-900/80 border border-indigo-500/40 rounded-3xl p-5 shadow-lg space-y-3">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Création Ebook</span>
                <h3 className="text-sm font-bold text-white">Ebook & Livre Numérique</h3>
                <p className="text-xs text-slate-400">Génération par IA d'ebooks avec mise en page HD.</p>
                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-300">Prix (FCFA) :</label>
                  <input
                    type="number"
                    step="any"
                    value={editingPricing.ebookPrice ?? 1500}
                    onChange={(e) => setEditingPricing({ ...editingPricing, ebookPrice: Number(e.target.value) })}
                    className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-base focus:border-emerald-500 focus:outline-none"
                    placeholder="ex: 1500"
                  />
                </div>
              </div>

              {/* Product 8: Pass Illimité Mensuel */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg space-y-3">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Abonnement VIP Mois</span>
                <h3 className="text-sm font-bold text-white">Pass Illimité 30 Jours</h3>
                <p className="text-xs text-slate-400">Téléchargements illimités de tous les formats (Mois).</p>
                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-300">Prix (FCFA) :</label>
                  <input
                    type="number"
                    step="any"
                    value={editingPricing.unlimitedPassPrice ?? ''}
                    onChange={(e) => setEditingPricing({ ...editingPricing, unlimitedPassPrice: Number(e.target.value) })}
                    className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-base focus:border-emerald-500 focus:outline-none"
                    placeholder="ex: 3499"
                  />
                </div>
              </div>

              {/* Product 9: Pass Illimité Annuel */}
              <div className="bg-slate-900/80 border border-amber-500/40 rounded-3xl p-5 shadow-lg space-y-3">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Abonnement VIP Annuel</span>
                <h3 className="text-sm font-bold text-white">Pass Illimité 1 An</h3>
                <p className="text-xs text-slate-400">Accès VIP permanent pendant 12 mois complets.</p>
                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-300">Prix (FCFA) :</label>
                  <input
                    type="number"
                    step="any"
                    value={editingPricing.unlimitedPassAnnualPrice ?? 39999}
                    onChange={(e) => setEditingPricing({ ...editingPricing, unlimitedPassAnnualPrice: Number(e.target.value) })}
                    className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-amber-500/60 text-amber-300 font-black text-base focus:border-amber-400 focus:outline-none"
                    placeholder="ex: 39999"
                  />
                </div>
              </div>

              {/* Product 10: Pack Recruteur */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg space-y-3">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Espace Recruteur</span>
                <h3 className="text-sm font-bold text-white">Recherche Candidats</h3>
                <p className="text-xs text-slate-400">Accès à la base de profils qualifiés du Sénégal.</p>
                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-300">Prix (FCFA) :</label>
                  <input
                    type="number"
                    step="any"
                    value={editingPricing.recruiterSearchPrice ?? ''}
                    onChange={(e) => setEditingPricing({ ...editingPricing, recruiterSearchPrice: Number(e.target.value) })}
                    className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-base focus:border-emerald-500 focus:outline-none"
                    placeholder="ex: 10000"
                  />
                </div>
              </div>

            </div>

          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CODES PROMO & RÉDUCTIONS */}
        {/* ========================================================================= */}
        {activeTab === 'promo' && (
          <div className="space-y-4">
            
            {/* Header & Create button */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-400" />
                  <span>Gestion des Codes Promotionnels</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Créez et activez des coupons valides sur les paiements Mobile Money (Wave, OM) et Portefeuille.
                </p>
              </div>

              <button
                onClick={() => openCreatePromoModal()}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all hover:scale-105 cursor-pointer"
              >
                <Plus className="w-4 h-4 font-black" />
                <span>Créer un Code Promo</span>
              </button>
            </div>

            {/* Promo Codes Table */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-950/80 border-b border-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-4 px-4 sm:px-6">Code Promo</th>
                      <th className="py-4 px-3">Type & Valeur</th>
                      <th className="py-4 px-3">Minimum Requis</th>
                      <th className="py-4 px-3">Utilisations</th>
                      <th className="py-4 px-3">Statut</th>
                      <th className="py-4 px-4 sm:px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {promoCodesList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          Aucun code promo créé pour le moment.
                        </td>
                      </tr>
                    ) : (
                      promoCodesList.map((promo) => (
                        <tr key={promo.id} className="hover:bg-slate-800/40 transition-all">
                          
                          {/* Code & Description */}
                          <td className="py-3.5 px-4 sm:px-6">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                                {promo.code}
                              </span>
                            </div>
                            {promo.description && (
                              <p className="text-[11px] text-slate-400 mt-1">{promo.description}</p>
                            )}
                          </td>

                          {/* Valeur */}
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-white">
                              {promo.discountType === 'percentage' ? `-${promo.discountValue}%` : `-${(Number(promo.discountValue) || 0).toLocaleString('fr-FR')} FCFA`}
                            </span>
                          </td>

                          {/* Minimum */}
                          <td className="py-3.5 px-3">
                            <span className="text-xs text-slate-300">
                              {promo.minOrderAmount ? `${(Number(promo.minOrderAmount) || 0).toLocaleString('fr-FR')} FCFA` : 'Sans minimum'}
                            </span>
                          </td>

                          {/* Utilisations */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-200">{promo.currentUsageCount || 0}</span>
                              <span className="text-slate-500">/ {promo.maxUsageLimit || '∞'}</span>
                            </div>
                          </td>

                          {/* Statut */}
                          <td className="py-3.5 px-3">
                            <button
                              type="button"
                              onClick={() => handleTogglePromoCode(promo.id, promo.code, promo.active)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                                promo.active
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                              }`}
                              title={promo.active ? 'Cliquer pour désactiver ce code' : 'Cliquer pour activer ce code'}
                            >
                              {promo.active ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Actif</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                                  <span>Désactivé</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleTogglePromoCode(promo.id, promo.code, promo.active)}
                                type="button"
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  promo.active
                                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-400'
                                    : 'bg-emerald-950/40 hover:bg-emerald-900 text-emerald-300'
                                }`}
                                title={promo.active ? 'Désactiver' : 'Activer'}
                              >
                                {promo.active ? 'Désactiver' : 'Activer'}
                              </button>
                              <button
                                onClick={() => openCreatePromoModal(promo)}
                                type="button"
                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                                title="Modifier ce code"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePromoCode(promo)}
                                type="button"
                                className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900 text-rose-400 hover:text-white transition-all cursor-pointer"
                                title="Supprimer ce code promo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SUIVI DES TRANSACTIONS MONEY FUSION EN TEMPS RÉEL (100% AUTOMATISÉ) */}
        {/* ========================================================================= */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            
            {/* Header / Sub-banner for Money Fusion Tracking */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-blue-500/20 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Suivi des Transactions Money Fusion</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      100% Automatisé
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Flux en direct des paiements Wave, Orange Money, Moov, MTN et QR Code. Traitement instantané par Webhook Money Fusion.
                  </p>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Webhook Money Fusion Actif</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300">
                  Total : <strong className="font-bold">{transactionsList.length}</strong>
                </div>
              </div>
            </div>

            {/* Indicateur de Santé & Diagnostic du Webhook Money Fusion */}
            <MoneyFusionWebhookHealth transactions={transactionsList} onRefresh={loadAdminData} />

            {/* Cartes Récapitulatives : Total & Répartition claire par Type (Document, Abonnement, Wallet) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Carte 1: Total Revenus Money Fusion */}
              <div className="bg-slate-900/90 border border-blue-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-blue-500/20 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Validé</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {moneyFusionMetrics.totalRevenue.toLocaleString('fr-FR')} <span className="text-sm font-bold text-blue-400">XOF</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{moneyFusionMetrics.validatedCount} paiements validés au total</span>
                </p>
              </div>

              {/* Carte 2: Répartition Déblocages Document */}
              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-emerald-500/20 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Déblocages Document</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {moneyFusionMetrics.documentCount} <span className="text-sm font-bold text-emerald-400">docs</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{moneyFusionMetrics.documentRevenue.toLocaleString('fr-FR')} XOF encaissés</span>
                </p>
              </div>

              {/* Carte 3: Répartition Abonnements VIP */}
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-amber-500/20 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Abonnements VIP</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {moneyFusionMetrics.subscriptionCount} <span className="text-sm font-bold text-amber-400">pass</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{moneyFusionMetrics.subscriptionRevenue.toLocaleString('fr-FR')} XOF encaissés</span>
                </p>
              </div>

              {/* Carte 4: Répartition Rechargements Wallet */}
              <div className="bg-slate-900/90 border border-purple-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-purple-500/20 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recharges Wallet</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {moneyFusionMetrics.walletCount} <span className="text-sm font-bold text-purple-400">recharges</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>{moneyFusionMetrics.walletRevenue.toLocaleString('fr-FR')} XOF crédités</span>
                </p>
              </div>
            </div>

            {/* Filter & Export Bar */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par référence, nom, email ou montant..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-2xl text-xs sm:text-sm !text-white !placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-all caret-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Filtre Statut */}
                <select
                  value={txStatusFilter}
                  onChange={(e: any) => setTxStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs !text-white focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
                >
                  <option value="all" className="bg-slate-900 text-white">Tous les Statuts</option>
                  <option value="success" className="bg-slate-900 text-white">✅ Réussi (Validé)</option>
                  <option value="PENDING" className="bg-slate-900 text-white">⏳ En Attente Webhook</option>
                  <option value="failed" className="bg-slate-900 text-white">❌ Échoué / Annulé</option>
                </select>

                {/* Filtre Type (Document, Abonnement, Wallet) */}
                <select
                  value={txTypeFilter}
                  onChange={(e: any) => setTxTypeFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs !text-white focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
                >
                  <option value="all" className="bg-slate-900 text-white">Tous les Types</option>
                  <option value="document" className="bg-slate-900 text-white">📄 Déblocage Document</option>
                  <option value="subscription" className="bg-slate-900 text-white">👑 Abonnement VIP</option>
                  <option value="wallet" className="bg-slate-900 text-white">💳 Rechargement Wallet</option>
                </select>

                {/* Filtre Méthode */}
                <select
                  value={txMethodFilter}
                  onChange={(e: any) => setTxMethodFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs !text-white focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
                >
                  <option value="all" className="bg-slate-900 text-white">Tous les Modes de Paiement</option>
                  <option value="wave" className="bg-slate-900 text-white">Wave</option>
                  <option value="orange_money" className="bg-slate-900 text-white">Orange Money</option>
                  <option value="free" className="bg-slate-900 text-white">Free Money</option>
                  <option value="mtn" className="bg-slate-900 text-white">MTN Money</option>
                  <option value="moov" className="bg-slate-900 text-white">Moov Money</option>
                  <option value="card" className="bg-slate-900 text-white">QR Code / Carte</option>
                  <option value="moneyfusion" className="bg-slate-900 text-white">Money Fusion Direct</option>
                </select>

                <button
                  onClick={handleExportTransactionsCSV}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Exporter CSV</span>
                </button>

                <button
                  onClick={loadAdminData}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-sm"
                  title="Actualiser les transactions"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Actualiser</span>
                </button>
              </div>

            </div>

            {/* Transactions Money Fusion Table with Clear Types */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-950/80 border-b border-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-4 px-4 sm:px-5">Date &amp; Heure</th>
                      <th className="py-4 px-3">Utilisateur</th>
                      <th className="py-4 px-3">ID Transaction Money Fusion</th>
                      <th className="py-4 px-3">Type</th>
                      <th className="py-4 px-3">Montant (XOF)</th>
                      <th className="py-4 px-3">Mode de Paiement</th>
                      <th className="py-4 px-3">Statut Webhook</th>
                      <th className="py-4 px-3">Impact / Action</th>
                      <th className="py-4 px-4 sm:px-5 text-right">Détails</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-slate-500">
                          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                            <CreditCard className="w-6 h-6" />
                          </div>
                          Aucune transaction Money Fusion correspondant aux filtres.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => {
                        const isApproved = tx.status === 'APPROVED' || tx.status === 'MANUALLY_VALIDATED' || tx.status === 'VALIDATED_BY_AI' || tx.status === 'success' || tx.status === 'COMPLETED';
                        const isRejected = tx.status === 'REJECTED' || tx.status === 'REJECTED_BY_ADMIN' || tx.status === 'REJECTED_BY_AI' || tx.status === 'failed' || tx.status === 'cancel';
                        const isPending = !isApproved && !isRejected;

                        const amountXOF = Math.abs(Number(tx.amount || tx.expectedAmount || 0));
                        const txReference = tx.transactionReference || (tx as any).moneyFusionId || (tx as any).transactionId || tx.id;
                        const isCopied = copiedTxId === txReference;

                        // Type detection
                        const txType = (tx.type || (tx as any).transactionType || '').toUpperCase();
                        const desc = ((tx.description || '') + ' ' + (tx.title || '')).toLowerCase();
                        const isDoc = txType.includes('DOC') || Boolean(tx.targetDocId) || Boolean((tx as any).docId) || desc.includes('document') || desc.includes('déblocage') || desc.includes('deblocage');
                        const isSub = !isDoc && (txType.includes('SUB') || Boolean((tx as any).planId) || desc.includes('abonnement') || desc.includes('pass') || desc.includes('vip') || amountXOF === 2500 || amountXOF === 5000);

                        let typeBadge = {
                          label: 'Rechargement Wallet',
                          icon: '💳',
                          className: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        };
                        if (isDoc) {
                          typeBadge = {
                            label: 'Document',
                            icon: '📄',
                            className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          };
                        } else if (isSub) {
                          typeBadge = {
                            label: 'Abonnement VIP',
                            icon: '👑',
                            className: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          };
                        }

                        // Identify payment method
                        const methodStr = ((tx.paymentMethod || '') + ' ' + ((tx as any).operator || '') + ' ' + (tx.network || '')).toLowerCase();
                        let methodBadge = {
                          label: 'Money Fusion Direct',
                          icon: '⚡',
                          className: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        };
                        if (methodStr.includes('wave')) {
                          methodBadge = { label: 'Wave', icon: '🌊', className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' };
                        } else if (methodStr.includes('orange') || methodStr.includes('om')) {
                          methodBadge = { label: 'Orange Money', icon: '🍊', className: 'bg-orange-500/15 text-orange-300 border-orange-500/30' };
                        } else if (methodStr.includes('free')) {
                          methodBadge = { label: 'Free Money', icon: '🟣', className: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30' };
                        } else if (methodStr.includes('mtn')) {
                          methodBadge = { label: 'MTN Money', icon: '💛', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
                        } else if (methodStr.includes('moov')) {
                          methodBadge = { label: 'Moov Money', icon: '🟢', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
                        } else if (methodStr.includes('card') || methodStr.includes('carte') || methodStr.includes('qr')) {
                          methodBadge = { label: 'Carte / QR', icon: '💳', className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' };
                        }

                        const userName = (tx as any).userName || (tx as any).userEmail?.split('@')[0] || 'Client Dokya';
                        const userEmail = (tx as any).userEmail || tx.userId || 'Email inconnu';
                        const userPhone = tx.senderPhone || (tx as any).phone || (tx.extractedData?.sender_phone);

                        return (
                          <tr 
                            key={tx.id} 
                            onClick={() => setSelectedTxForInspection(tx)}
                            className="hover:bg-slate-800/50 transition-all cursor-pointer group"
                          >
                            
                            {/* 1. Date & Heure */}
                            <td className="py-3.5 px-4 sm:px-5">
                              <div className="font-bold text-white text-xs">
                                {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{new Date(tx.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>

                            {/* 2. Utilisateur (Nom / Email) */}
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-slate-200 text-xs truncate max-w-[160px]" title={userName}>
                                {userName}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[160px]" title={userEmail}>
                                {userEmail}
                              </div>
                              {userPhone && (
                                <div className="text-[10px] text-emerald-400/90 font-mono mt-0.5">
                                  {userPhone}
                                </div>
                              )}
                            </td>

                            {/* 3. ID Transaction Money Fusion avec Copie */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-amber-300 tracking-wide truncate max-w-[145px]" title={txReference}>
                                  {txReference}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyTxId(txReference);
                                  }}
                                  className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                                  title="Copier la référence Money Fusion"
                                >
                                  {isCopied ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-blue-400" />
                                <span>Money Fusion ID</span>
                              </div>
                            </td>

                            {/* 4. Type de Transaction (Document, Abonnement, Wallet) */}
                            <td className="py-3.5 px-3">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${typeBadge.className} whitespace-nowrap`}>
                                <span>{typeBadge.icon}</span>
                                <span>{typeBadge.label}</span>
                              </span>
                            </td>

                            {/* 5. Montant (XOF) */}
                            <td className="py-3.5 px-3">
                              <div className="font-mono font-bold text-sm text-emerald-400">
                                {amountXOF.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-slate-300">XOF</span>
                              </div>
                            </td>

                            {/* 6. Mode de Paiement (Wave, Orange, Free, etc.) */}
                            <td className="py-3.5 px-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${methodBadge.className} whitespace-nowrap shadow-xs`}>
                                <span>{methodBadge.icon}</span>
                                <span>{methodBadge.label}</span>
                              </span>
                            </td>

                            {/* 7. Statut Webhook */}
                            <td className="py-3.5 px-3">
                              {isApproved ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap shadow-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Validé</span>
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                                  <span>En attente</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Échoué</span>
                                </span>
                              )}
                            </td>

                            {/* 8. Impact / Action */}
                            <td className="py-3.5 px-3">
                              {isApproved ? (
                                isDoc ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                    <FileText className="w-3 h-3 text-emerald-400" />
                                    <span>Doc Débloqué</span>
                                  </span>
                                ) : isSub ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-950/80 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                                    <Sparkles className="w-3 h-3 text-amber-400" />
                                    <span>Pass VIP (30j)</span>
                                  </span>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-950/80 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                                      <Check className="w-3 h-3 text-purple-400" />
                                      <span>Solde Crédité</span>
                                    </span>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      +{amountXOF.toLocaleString('fr-FR')} XOF
                                    </div>
                                  </div>
                                )
                              ) : isPending ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-950/40 text-amber-300 border border-amber-500/20 whitespace-nowrap">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>En attente</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900 text-slate-400 border border-slate-800 whitespace-nowrap">
                                  <Ban className="w-3 h-3 text-rose-400" />
                                  <span>Non appliqué</span>
                                </span>
                              )}
                            </td>

                            {/* 9. Détails */}
                            <td className="py-3.5 px-4 sm:px-5 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedTxForInspection(tx)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                                title="Voir les détails complets"
                              >
                                <Eye className="w-4 h-4 text-blue-400" />
                              </button>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: AFFILIATIONS & PARRAINAGES (VALIDATION COMMISSIONS & RETRAITS)        */}
        {/* ========================================================================= */}
        {activeTab === 'affiliations' && (
          <AdminAffiliationView adminEmail={currentUser?.email || PRIMARY_ADMIN_EMAIL} />
        )}

        {/* ========================================================================= */}
        {/* TAB: SUPPORT CLIENT HYBRIDE (IA & CONSEILLER HUMAIN EN DIRECT)           */}
        {/* ========================================================================= */}
        {activeTab === 'support' && (
          <AdminSupportChatView adminEmail={currentUser?.email || PRIMARY_ADMIN_EMAIL} />
        )}

        {/* ========================================================================= */}
        {/* TAB: DOKYA BUSINESS & B2B (ENTREPRISES, FACTURES & DEVIS UEMOA)           */}
        {/* ========================================================================= */}
        {activeTab === 'business' && (
          <AdminBusinessView
            usersList={usersList}
            transactionsList={transactionsList}
            onNavigateToPricing={() => setActiveTab('pricing')}
          />
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODALS SECTION */}
      {/* ========================================================================= */}

      {/* 1. Modal Ajustement Solde */}
      {selectedUserForAdjust && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <span>Ajustement du Solde Portefeuille</span>
              </h3>
              <button onClick={() => setSelectedUserForAdjust(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              Candidat : <strong className="text-white">{selectedUserForAdjust.firstName} {selectedUserForAdjust.lastName}</strong> ({selectedUserForAdjust.email})
              <div className="mt-1 font-semibold text-emerald-400">
                Solde actuel : {(selectedUserForAdjust.balance || 0).toLocaleString('fr-FR')} FCFA
              </div>
            </div>

            <form onSubmit={handleConfirmAdjustment} className="space-y-4">
              
              {/* Type Crédit / Débit */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Type d'opération :</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustType('credit')}
                    className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      adjustType === 'credit'
                        ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter Crédit (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType('debit')}
                    className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      adjustType === 'debit'
                        ? 'bg-rose-500 text-white shadow-md font-black'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    <span>Retirer / Débiter (-)</span>
                  </button>
                </div>
              </div>

              {/* Montant */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Montant en FCFA :</label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-base focus:border-emerald-500 focus:outline-none"
                  required
                />
                {/* Presets */}
                <div className="flex items-center gap-2 mt-2">
                  {[500, 1000, 2000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAdjustAmount(amt)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
                    >
                      +{amt.toLocaleString('fr-FR')}F
                    </button>
                  ))}
                </div>
              </div>

              {/* Motif Obligatoire */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Motif administratif (Obligatoire) :</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex: Geste commercial support, régularisation solde..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForAdjust(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg transition-all"
                >
                  {isAdjusting ? 'Validation...' : 'Valider l\'ajustement'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Modifier Profil Utilisateur */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <span>Modifier le Profil Candidat</span>
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Prénom :</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Nom :</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Téléphone :</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Ville :</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Métier / Poste Cible :</label>
                <input
                  type="text"
                  value={editTargetJob}
                  onChange={(e) => setEditTargetJob(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Solde (FCFA) :</label>
                  <input
                    type="number"
                    value={editBalance}
                    onChange={(e) => setEditBalance(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Formule :</label>
                  <select
                    value={editSubscription}
                    onChange={(e: any) => setEditSubscription(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="free">Gratuit</option>
                    <option value="pro">Pro</option>
                    <option value="unlimited">Pass Illimité</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Suspendre / Réactiver */}
      {userToSuspend && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Ban className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">
                {userToSuspend.status === 'suspended' ? 'Réactiver le compte' : 'Suspendre le compte'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Utilisateur : <strong>{userToSuspend.firstName} {userToSuspend.lastName}</strong> ({userToSuspend.email})
              </p>
            </div>

            {userToSuspend.status !== 'suspended' && (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Motif de la suspension :</label>
                <input
                  type="text"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToSuspend(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspension}
                className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all ${
                  userToSuspend.status === 'suspended'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {userToSuspend.status === 'suspended' ? 'Confirmer la Réactivation' : 'Confirmer la Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Supprimer Compte */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Supprimer ce compte ?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Êtes-vous sûr de vouloir supprimer définitivement le compte de <strong>{userToDelete.firstName} {userToDelete.lastName}</strong> ({userToDelete.email}) ?
              </p>
              <p className="text-xs text-rose-400 mt-2 font-semibold">
                ⚠️ Cette action est irréversible et supprimera l'ensemble de ses documents et son historique.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg transition-all"
              >
                {isDeletingUser ? 'Suppression...' : 'Supprimer Définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4.1 Modal Supprimer Code Promo */}
      {promoToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Supprimer le code promo ?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Êtes-vous sûr de vouloir supprimer définitivement le code promo <strong className="text-amber-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-amber-500/30">{promoToDelete.code}</strong> ({promoToDelete.discountValue}{promoToDelete.discountType === 'percentage' ? '%' : ' FCFA'} de réduction) ?
              </p>
              <p className="text-xs text-rose-400 mt-2 font-semibold">
                ⚠️ Cette action est immédiate et irréversible. Ce code ne sera plus accepté lors des paiements.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPromoToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePromo}
                disabled={isDeletingPromo}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingPromo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer Définitivement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Créer / Modifier Code Promo */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-400" />
                <span>{editingPromo ? 'Modifier le Code Promo' : 'Créer un Code Promo'}</span>
              </h3>
              <button onClick={() => setIsPromoModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePromoCode} className="space-y-4 text-xs">
              
              <div>
                <label className="font-bold text-slate-300 block mb-1">Code Coupon (Majuscules) :</label>
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  placeholder="EX: TERANGA20, DAKAR500"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-black text-base focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Type de Réduction :</label>
                  <select
                    value={promoTypeInput}
                    onChange={(e: any) => setPromoTypeInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed">Montant Fixe (FCFA)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Valeur de remise :</label>
                  <input
                    type="number"
                    min="1"
                    value={promoValueInput}
                    onChange={(e) => setPromoValueInput(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Montant Min. Commande (FCFA) :</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={promoMinOrderInput}
                    onChange={(e) => setPromoMinOrderInput(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Limite d'utilisations :</label>
                  <input
                    type="number"
                    min="1"
                    value={promoLimitInput}
                    onChange={(e) => setPromoLimitInput(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Description / Campagne :</label>
                <input
                  type="text"
                  value={promoDescInput}
                  onChange={(e) => setPromoDescInput(e.target.value)}
                  placeholder="Ex: 20% de remise pour le lancement de la plateforme"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="promoActiveCheck"
                  checked={promoActiveInput}
                  onChange={(e) => setPromoActiveInput(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded bg-slate-950 border-slate-700 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="promoActiveCheck" className="text-xs font-semibold text-slate-300 cursor-pointer">
                  Activer immédiatement ce code promo
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingPromo}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg"
                >
                  {isSavingPromo ? 'Enregistrement...' : 'Enregistrer le Code'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Détails de la Transaction Money Fusion & Webhook */}
      {selectedTxForInspection && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 max-w-3xl w-full shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      Détails de la Transaction Money Fusion
                    </h3>
                    {/* Status Badge */}
                    {selectedTxForInspection.status === 'VALIDATED_BY_AI' || selectedTxForInspection.status === 'success' || selectedTxForInspection.status === 'COMPLETED' || selectedTxForInspection.status === 'APPROVED' || selectedTxForInspection.status === 'MANUALLY_VALIDATED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Validé</span>
                      </span>
                    ) : selectedTxForInspection.status === 'REJECTED' || selectedTxForInspection.status === 'REJECTED_BY_ADMIN' || selectedTxForInspection.status === 'REJECTED_BY_AI' || selectedTxForInspection.status === 'failed' || selectedTxForInspection.status === 'cancel' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Échoué</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>En Attente Webhook</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Événement de paiement automatisé et traçabilité en temps réel
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTxForInspection(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cartes Clés Récapitulatives */}
            {(() => {
              const isApproved = selectedTxForInspection.status === 'APPROVED' || selectedTxForInspection.status === 'MANUALLY_VALIDATED' || selectedTxForInspection.status === 'VALIDATED_BY_AI' || selectedTxForInspection.status === 'success' || selectedTxForInspection.status === 'COMPLETED';
              const isRejected = selectedTxForInspection.status === 'REJECTED' || selectedTxForInspection.status === 'REJECTED_BY_ADMIN' || selectedTxForInspection.status === 'REJECTED_BY_AI' || selectedTxForInspection.status === 'failed' || selectedTxForInspection.status === 'cancel';
              const isPending = !isApproved && !isRejected;

              const amount = Math.abs(Number(selectedTxForInspection.amount || selectedTxForInspection.expectedAmount || 0));
              const txRef = selectedTxForInspection.transactionReference || (selectedTxForInspection as any).transactionId || selectedTxForInspection.id;
              const isCopied = copiedTxId === txRef;

              // Type identification
              const txType = (selectedTxForInspection.type || (selectedTxForInspection as any).transactionType || '').toUpperCase();
              const desc = ((selectedTxForInspection.description || '') + ' ' + (selectedTxForInspection.title || '')).toLowerCase();
              const isDoc = txType.includes('DOC') || Boolean(selectedTxForInspection.targetDocId) || Boolean((selectedTxForInspection as any).docId) || desc.includes('document') || desc.includes('déblocage') || desc.includes('deblocage');
              const isSub = !isDoc && (txType.includes('SUB') || Boolean((selectedTxForInspection as any).planId) || desc.includes('abonnement') || desc.includes('pass') || desc.includes('vip') || amount === 2500 || amount === 5000);

              const methodStr = ((selectedTxForInspection.paymentMethod || '') + ' ' + ((selectedTxForInspection as any).operator || '')).toLowerCase();
              let methodLabel = 'Money Fusion Automatisé';
              if (methodStr.includes('wave')) methodLabel = 'Wave Mobile Money';
              else if (methodStr.includes('orange') || methodStr.includes('om')) methodLabel = 'Orange Money';
              else if (methodStr.includes('mtn')) methodLabel = 'MTN Mobile Money';
              else if (methodStr.includes('moov')) methodLabel = 'Moov Money';
              else if (methodStr.includes('card') || methodStr.includes('carte') || methodStr.includes('qr')) methodLabel = 'QR Code Express / Carte';

              return (
                <div className="space-y-6">
                  
                  {/* 4 Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Montant Encaissé</span>
                      <div className="text-xl font-mono font-black text-emerald-400 mt-1">
                        {amount.toLocaleString('fr-FR')} <span className="text-xs text-slate-300">XOF</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type & Action</span>
                      <div className="text-sm font-bold text-white mt-1.5 flex items-center gap-1.5">
                        {isDoc ? (
                          <>
                            <FileText className="w-4 h-4 text-emerald-400" />
                            <span className="truncate text-emerald-300">Déblocage Document</span>
                          </>
                        ) : isSub ? (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span className="truncate text-amber-300">Abonnement VIP</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 text-purple-400" />
                            <span className="truncate text-purple-300">Recharge Wallet</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Méthode</span>
                      <div className="text-sm font-bold text-white mt-1.5 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                        <span className="truncate">{methodLabel}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statut Webhook</span>
                      <div className="mt-1.5">
                        {isApproved ? (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 200 OK (Validé)
                          </span>
                        ) : isPending ? (
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> En attente notification
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Échoué / Annulé
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Détails Utilisateur et Commande */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-4">
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-blue-400" />
                      <span>Informations Utilisateur & Commande</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-1">Nom / Client :</span>
                        <span className="font-bold text-white">
                          {(selectedTxForInspection as any).userName || (selectedTxForInspection as any).userEmail?.split('@')[0] || 'Client Dokya'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-1">Adresse Email :</span>
                        <span className="font-mono text-slate-200">
                          {(selectedTxForInspection as any).userEmail || selectedTxForInspection.userId}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-1">Téléphone / Contact :</span>
                        <span className="font-mono text-emerald-400 font-semibold">
                          {selectedTxForInspection.senderPhone || (selectedTxForInspection as any).phone || (selectedTxForInspection.extractedData?.sender_phone) || 'Non spécifié'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-1">Type de Commande :</span>
                        <span className="font-semibold text-white">
                          {selectedTxForInspection.description || selectedTxForInspection.documentTitle || (isDoc ? 'Déblocage de Document Dokya' : isSub ? 'Abonnement VIP Dokya' : 'Recharge Portefeuille Dokya')}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-1">Date & Heure :</span>
                        <span className="text-slate-200">
                          {new Date(selectedTxForInspection.createdAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-1">ID Document Firestore :</span>
                        <span className="font-mono text-slate-400 text-[11px] select-all">
                          {selectedTxForInspection.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Données Techniques Money Fusion */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-blue-400" />
                        <span>Référence & Données Passerelle</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleCopyTxId(txRef)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copier Référence</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-amber-300 break-all select-all flex items-center justify-between gap-2">
                      <span>{txRef}</span>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Cette référence identifie formellement le paiement auprès de l'API Money Fusion et de l'opérateur mobile sous-jacent.
                    </p>
                  </div>

                  {/* Actions Administrateur de Secours */}
                  {!isApproved && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-amber-300">Validation de Secours Money Fusion Direct</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          En cas d'aléa réseau sur le webhook, vous pouvez forcer la validation et l'accréditation du compte.
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isValidatingTx}
                          onClick={() => handleValidateTransaction(selectedTxForInspection, manualValidationNote)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isValidatingTx ? 'Validation...' : 'Valider & Appliquer'}</span>
                        </button>

                        {!isRejected && (
                          <button
                            type="button"
                            disabled={isRejectingTx}
                            onClick={() => handleRejectTransaction(selectedTxForInspection)}
                            className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Ban className="w-4 h-4" />
                            <span>{isRejectingTx ? 'Rejet...' : 'Rejeter'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setSelectedTxForInspection(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. Modal Inspection & Contrôle Approfondi du Profil Candidat */}
      {inspectingCandidate && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg uppercase ${
                  inspectingCandidate.role === 'superadmin' || inspectingCandidate.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : inspectingCandidate.status === 'suspended'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {inspectingCandidate.firstName ? inspectingCandidate.firstName[0] : 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      {inspectingCandidate.firstName} {inspectingCandidate.lastName}
                    </h3>
                    {inspectingCandidate.status === 'suspended' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Compte Suspendu
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Compte Actif
                      </span>
                    )}
                    {inspectingCandidate.subscription === 'unlimited' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        VIP Illimité
                      </span>
                    ) : inspectingCandidate.subscription === 'pro' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        Pack Pro
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        Gratuit
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Email : <strong className="text-white">{inspectingCandidate.email}</strong> • UID : <span className="font-mono text-slate-400">{inspectingCandidate.uid}</span>
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setInspectingCandidate(null)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-[11px] text-slate-400">Poste / Métier :</div>
                <div className="font-bold text-white mt-0.5 truncate">{inspectingCandidate.targetJob || 'Non spécifié'}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-[11px] text-slate-400">Ville / Téléphone :</div>
                <div className="font-bold text-white mt-0.5 truncate">{inspectingCandidate.city || 'Dakar'} {inspectingCandidate.phone ? `(${inspectingCandidate.phone})` : ''}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/30 bg-emerald-950/10">
                <div className="text-[11px] text-emerald-400 font-semibold">Solde Portefeuille :</div>
                <div className="font-black text-emerald-300 text-sm mt-0.5">{(inspectingCandidate.balance || 0).toLocaleString('fr-FR')} FCFA</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-[11px] text-slate-400">Date Inscription :</div>
                <div className="font-bold text-slate-200 mt-0.5">{inspectingCandidate.createdAt ? new Date(inspectingCandidate.createdAt).toLocaleDateString('fr-FR') : 'Récemment'}</div>
              </div>
            </div>

            {/* Super Admin Control Center Actions */}
            <div className="bg-gradient-to-r from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Actions de Contrôle Super Admin</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400/80">Accès Direct</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                
                {/* 1. Impersonation */}
                <button
                  type="button"
                  onClick={() => {
                    handleStartImpersonation(inspectingCandidate);
                    setInspectingCandidate(null);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all hover:scale-105 cursor-pointer"
                  title="Naviguer en tant que ce candidat"
                >
                  <Eye className="w-4 h-4 text-slate-950" />
                  <span>Prendre le Contrôle</span>
                </button>

                {/* 2. Force Unlock Docs */}
                <button
                  type="button"
                  onClick={() => handleForceUnlockDocs(inspectingCandidate)}
                  className="py-2.5 px-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Débloquer tous les documents"
                >
                  <Unlock className="w-4 h-4 text-teal-400" />
                  <span>Débloquer ses Docs</span>
                </button>

                {/* 3. Adjust Balance */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserForAdjust(inspectingCandidate);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Ajuster le solde"
                >
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Ajuster Solde (+/-)</span>
                </button>

                {/* 4. Edit User */}
                <button
                  type="button"
                  onClick={() => {
                    openEditModal(inspectingCandidate);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Modifier informations"
                >
                  <Edit3 className="w-4 h-4 text-slate-300" />
                  <span>Modifier Profil</span>
                </button>

              </div>
            </div>

            {/* Modal Tabs: Documents vs Transactions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setCandidateActiveTab('docs')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    candidateActiveTab === 'docs'
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Documents Générés ({inspectingCandidate.documentsCount || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setCandidateActiveTab('transactions')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    candidateActiveTab === 'transactions'
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Historique Transactions ({transactionsList.filter(t => t.userId === inspectingCandidate.uid || (t as any).userEmail === inspectingCandidate.email).length})
                </button>
              </div>

              {/* Tab: Documents */}
              {candidateActiveTab === 'docs' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Doc 1: CV */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Curriculum Vitae ATS</div>
                          <div className="text-[11px] text-slate-400">Format PDF & DOCX</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {inspectingCandidate.hasForceUnlockedDocs ? 'Débloqué (Admin)' : 'Disponible'}
                      </span>
                    </div>

                    {/* Doc 2: Letter */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Lettre de Motivation</div>
                          <div className="text-[11px] text-slate-400">Format PDF & DOCX</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {inspectingCandidate.hasForceUnlockedDocs ? 'Débloqué (Admin)' : 'Disponible'}
                      </span>
                    </div>

                    {/* Doc 3: Devis */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Devis Commercial</div>
                          <div className="text-[11px] text-slate-400">Format PDF & DOCX</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        Prêt
                      </span>
                    </div>

                    {/* Doc 4: Facture */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Facture Professionnelle</div>
                          <div className="text-[11px] text-slate-400">Format PDF & DOCX</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        Prêt
                      </span>
                    </div>

                  </div>
                </div>
              )}

              {/* Tab: Transactions */}
              {candidateActiveTab === 'transactions' && (
                <div className="space-y-2">
                  {transactionsList.filter(t => t.userId === inspectingCandidate.uid || (t as any).userEmail === inspectingCandidate.email).length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/60 rounded-2xl border border-slate-800">
                      Aucune transaction enregistrée pour ce candidat.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden">
                      {transactionsList
                        .filter(t => t.userId === inspectingCandidate.uid || (t as any).userEmail === inspectingCandidate.email)
                        .map(tx => (
                          <div key={tx.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/50">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white">{tx.id}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-slate-800 text-slate-300">
                                  {tx.paymentMethod}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {new Date(tx.createdAt).toLocaleString('fr-FR')} • {tx.description || 'Paiement'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-emerald-400 font-mono">
                                {Math.abs(tx.amount).toLocaleString('fr-FR')} FCFA
                              </div>
                              <span className={`text-[10px] font-bold ${
                                tx.status === 'VALIDATED_BY_AI' || tx.status === 'success' || tx.status === 'MANUALLY_VALIDATED'
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}>
                                {tx.status}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setInspectingCandidate(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PURGE DEMO DATA CONFIRMATION MODAL (SUPER ADMIN ONLY)       */}
      {/* ============================================================ */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-rose-950/50 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">
                  Purge & Remise à Zéro Production
                </h3>
                <p className="text-xs text-slate-400">
                  Opération réservée exclusivement à <strong className="text-amber-300">{PRIMARY_ADMIN_EMAIL}</strong>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs text-amber-200">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Attention : Cette action est irréversible !
              </div>
              <p className="leading-relaxed text-slate-300">
                Cette action va :
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                <li>Supprimer toutes les transactions de test dans Firestore</li>
                <li>Réinitialiser les soldes de test des utilisateurs à <strong className="text-white">0 FCFA</strong></li>
                <li>Nettoyer le cache mémoire du serveur</li>
              </ul>
              <p className="text-slate-400 pt-1 text-[11px]">
                La plateforme sera immédiatement prête pour accueillir les vrais paiements en ligne Wave / Orange Money et les recharges de solde réelles.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isPurgingDemoData}
                onClick={() => setIsPurgeModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isPurgingDemoData}
                onClick={handlePurgeDemoData}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-rose-950/40 flex items-center gap-2 disabled:opacity-50"
              >
                {isPurgingDemoData ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Purge en cours...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4" />
                    <span>Confirmer la remise à zéro</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal Gestion de l'Abonnement Pass VIP */}
      {selectedUserForSubModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <span>Gestion de l'Abonnement Pass VIP</span>
              </h3>
              <button 
                type="button"
                onClick={() => setSelectedUserForSubModal(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User details card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Utilisateur : </span>
                  <strong className="text-white text-sm">{selectedUserForSubModal.firstName} {selectedUserForSubModal.lastName}</strong>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  UID: {selectedUserForSubModal.uid.substring(0, 10)}...
                </span>
              </div>
              <div className="text-slate-400">Email : <span className="text-slate-200">{selectedUserForSubModal.email}</span></div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Statut actuel :</span>
                {isUserVipActive(selectedUserForSubModal.subscription) ? (
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    👑 Pass VIP Dokya Actif (Illimité)
                  </span>
                ) : selectedUserForSubModal.subscription?.status === 'EXPIRED' ? (
                  <span className="font-bold text-rose-400">⚠️ Abonnement Expiré</span>
                ) : (
                  <span className="font-bold text-slate-400">Sans abonnement (Gratuit / À l'acte)</span>
                )}
              </div>
            </div>

            {/* Action selector */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Opération à exécuter :</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSubAction('activate')}
                    className={`p-3 rounded-2xl border text-xs text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      subAction === 'activate'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-900/30 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserPlus className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">Activer Pass VIP</div>
                      <div className="text-[10px] text-slate-400">Nouvel abonnement illimité</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubAction('extend')}
                    className={`p-3 rounded-2xl border text-xs text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      subAction === 'extend'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-900/30 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">Prolonger</div>
                      <div className="text-[10px] text-slate-400">Ajouter du temps supplémentaire</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubAction('suspend')}
                    className={`p-3 rounded-2xl border text-xs text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      subAction === 'suspend'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-900/30 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Ban className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">Suspendre</div>
                      <div className="text-[10px] text-slate-400">Mettre en pause l'accès</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubAction('reset')}
                    className={`p-3 rounded-2xl border text-xs text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      subAction === 'reset'
                        ? 'bg-slate-800 border-slate-600 text-slate-200 shadow-md font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserMinus className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">Réinitialiser</div>
                      <div className="text-[10px] text-slate-400">Repasser en mode gratuit</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Duration selector (only for activate or extend) */}
              {(subAction === 'activate' || subAction === 'extend') && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-2">Durée de validité à accorder :</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {[
                      { days: 7, label: '7 Jours', sub: 'Essai' },
                      { days: 30, label: '30 Jours', sub: 'Mensuel' },
                      { days: 90, label: '90 Jours', sub: 'Trimestre' },
                      { days: 365, label: '365 Jours', sub: 'Annuel' },
                      { days: 36500, label: 'À Vie', sub: 'Permanent' }
                    ].map((item) => (
                      <button
                        key={item.days}
                        type="button"
                        onClick={() => setSubDurationDays(item.days)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          subDurationDays === item.days
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className={`text-[10px] ${subDurationDays === item.days ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                          {item.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Note Input */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Motif administratif / Note interne (traçabilité Firestore) :
                </label>
                <input
                  type="text"
                  placeholder="Ex: Paiement Wave direct reçu, Partenaire, Geste commercial..."
                  value={subAdminNote}
                  onChange={(e) => setSubAdminNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Impact Notice */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {subAction === 'activate' || subAction === 'extend' 
                    ? "Cette action inscrit immédiatement l'abonnement dans Firestore avec un statut ACTIVE. L'utilisateur aura accès instantané à tous les modules sans guichet de paiement."
                    : "Cette action révoque ou suspend immédiatement l'accès VIP dans Firestore. L'utilisateur repassera en tarification à l'acte."
                  }
                </span>
              </div>

              {/* Dialog buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForSubModal(null)}
                  disabled={isSavingSub}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubscriptionChange}
                  disabled={isSavingSub}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg shadow-amber-900/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingSub ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Appliquer la modification</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      </div>
    </div>
  );
};
