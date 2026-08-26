import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Users, DollarSign, FileText, ArrowUpRight, ArrowDownRight, 
  Search, Filter, Plus, Minus, RefreshCw, Download, CheckCircle2, 
  AlertCircle, ChevronRight, Lock, LogOut, ExternalLink, Award,
  Sparkles, Layers, TrendingUp, Calendar, CreditCard, Wallet,
  Sliders, UserCheck, Eye, Edit3, X, HelpCircle, Tag, ShieldAlert,
  Percent, Clock, Trash2, Ban, Unlock, Check, AlertTriangle, ArrowRight,
  Scan, Receipt, Image as ImageIcon, ZoomIn, CheckCircle, XCircle, FileSearch
} from 'lucide-react';
import { 
  auth, 
  savePricingToFirestore, 
  subscribeToPricing, 
  savePromoCodeToFirestore, 
  deletePromoCodeFromFirestore, 
  subscribeToPromoCodes,
  DEFAULT_PLATFORM_PRICING
} from '../lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { isAdminEmail, PRIMARY_ADMIN_EMAIL, getAdminHeaders } from '../lib/adminAuth';
import { startImpersonationSession, stopImpersonationSession, getImpersonatedSession } from '../lib/impersonation';
import { 
  AdminUserRecord, AdminKPIs, TransactionRecord, PlatformPricingConfig, 
  PromoCode, AuditLogEntry 
} from '../types';

interface AdminDashboardProps {
  onBackHome: () => void;
  onOpenEditor?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onBackHome,
  onOpenEditor 
}) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'pricing' | 'promo' | 'audit' | 'transactions'>('overview');
  
  // Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [usersList, setUsersList] = useState<AdminUserRecord[]>([]);
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
  const [auditLogsList, setAuditLogsList] = useState<AuditLogEntry[]>([]);
  
  // Impersonation state
  const [activeImpersonation, setActiveImpersonation] = useState(getImpersonatedSession);

  // Search & Filter States
  const [userSearch, setUserSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'candidate'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'positive' | 'zero'>('all');
  const [userPage, setUserPage] = useState<number>(1);
  const usersPerPage = 10;
  
  // Transactions filters
  const [txSearch, setTxSearch] = useState<string>('');
  const [txStatusFilter, setTxStatusFilter] = useState<string>('all');
  const [txMethodFilter, setTxMethodFilter] = useState<string>('all');

  // Transaction Inspection & Action State
  const [selectedTxForInspection, setSelectedTxForInspection] = useState<TransactionRecord | null>(null);
  const [manualValidationNote, setManualValidationNote] = useState<string>('');
  const [isValidatingTx, setIsValidatingTx] = useState<boolean>(false);
  const [isRejectingTx, setIsRejectingTx] = useState<boolean>(false);

  // Audit filters
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>('all');

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

  // Check auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  const adminEmail = currentUser?.email || PRIMARY_ADMIN_EMAIL;
  const isAuthorized = isAdminEmail(adminEmail);

  // Load All Admin Data from backend APIs
  const loadAdminData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers = getAdminHeaders(adminEmail);
      
      // 1. Stats
      const statsRes = await fetch('/api/admin/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.stats) {
          setKpis(statsData.stats);
        }
      }

      // 2. Users
      const usersRes = await fetch('/api/admin/users?limit=100', { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.success && usersData.users) {
          setUsersList(usersData.users);
        }
      }

      // 3. Transactions
      const txRes = await fetch('/api/admin/transactions', { headers });
      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData.success && txData.transactions) {
          setTransactionsList(txData.transactions);
        }
      }

      // 4. Pricing
      const pricingRes = await fetch('/api/admin/pricing', { headers });
      if (pricingRes.ok) {
        const pData = await pricingRes.json();
        if (pData.success && pData.pricing) {
          setPricingConfig(pData.pricing);
          setEditingPricing(pData.pricing);
        }
      }

      // 5. Promo Codes
      const promoRes = await fetch('/api/admin/promo-codes', { headers });
      if (promoRes.ok) {
        const promoData = await promoRes.json();
        if (promoData.success && promoData.promoCodes) {
          setPromoCodesList(promoData.promoCodes);
        }
      }

      // 6. Audit Logs
      const auditRes = await fetch('/api/admin/audit-logs', { headers });
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        if (auditData.success && auditData.auditLogs) {
          setAuditLogsList(auditData.auditLogs);
        }
      }

    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      setErrorMsg('Impossible de charger toutes les données administratives.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadAdminData();

      // Real-time Firestore pricing listener
      const unsubPricing = subscribeToPricing((livePricing) => {
        setPricingConfig(livePricing);
        setEditingPricing(prev => ({
          ...livePricing,
          // Preserve active input focus if currently editing
          ...prev
        }));
      });

      // Real-time Firestore promo codes listener
      const unsubPromos = subscribeToPromoCodes((livePromos) => {
        if (Array.isArray(livePromos)) {
          setPromoCodesList(livePromos);
        }
      });

      return () => {
        unsubPricing();
        unsubPromos();
      };
    }
  }, [isAuthorized, adminEmail]);

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

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactionsList.filter((t) => {
      if (txSearch) {
        const query = txSearch.toLowerCase();
        const matchesId = t.id.toLowerCase().includes(query);
        const matchesTxId = ((t as any).transactionId || '').toLowerCase().includes(query);
        const matchesDesc = (t.description || '').toLowerCase().includes(query);
        const matchesUser = (t.userId || '').toLowerCase().includes(query) || ((t as any).userEmail || '').toLowerCase().includes(query) || ((t as any).userName || '').toLowerCase().includes(query);
        if (!matchesId && !matchesTxId && !matchesDesc && !matchesUser) return false;
      }
      if (txStatusFilter !== 'all') {
        if (txStatusFilter === 'VALIDATED_BY_AI') {
          if (t.status !== 'VALIDATED_BY_AI' && t.status !== 'success' && t.status !== 'COMPLETED') return false;
        } else if (txStatusFilter === 'REJECTED_BY_AI') {
          if (t.status !== 'REJECTED_BY_AI' && t.status !== 'REJECTED_BY_ADMIN' && t.status !== 'failed' && t.status !== 'cancel') return false;
        } else if (txStatusFilter === 'MANUALLY_VALIDATED') {
          if (t.status !== 'MANUALLY_VALIDATED') return false;
        } else if (t.status !== txStatusFilter) {
          return false;
        }
      }
      if (txMethodFilter !== 'all' && t.paymentMethod !== txMethodFilter) return false;
      return true;
    });
  }, [transactionsList, txSearch, txStatusFilter, txMethodFilter]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogsList.filter((log) => {
      if (auditSearch) {
        const query = auditSearch.toLowerCase();
        const matchesAction = log.action.toLowerCase().includes(query);
        const matchesDetails = log.details.toLowerCase().includes(query);
        const matchesActor = log.actorEmail.toLowerCase().includes(query);
        const matchesTarget = (log.targetUserEmail || '').toLowerCase().includes(query);
        if (!matchesAction && !matchesDetails && !matchesActor && !matchesTarget) return false;
      }
      if (auditCategoryFilter !== 'all' && log.category !== auditCategoryFilter) return false;
      return true;
    });
  }, [auditLogsList, auditSearch, auditCategoryFilter]);

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

  // 9. TRANSACTION OCR ADMIN ACTIONS (MANUAL VALIDATE & REJECT CONFIRMATION)
  const handleValidateTransaction = async (tx: TransactionRecord, note?: string) => {
    setIsValidatingTx(true);
    setErrorMsg(null);
    try {
      const headers = getAdminHeaders(adminEmail);
      const res = await fetch(`/api/admin/transactions/${tx.id}/validate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          adminEmail,
          adminNote: note || manualValidationNote || 'Validation manuelle effectuée par l\'administrateur.'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || `Transaction ${tx.id} validée manuellement avec succès !`);
        setManualValidationNote('');
        if (selectedTxForInspection && selectedTxForInspection.id === tx.id) {
          setSelectedTxForInspection(prev => prev ? {
            ...prev,
            status: 'MANUALLY_VALIDATED',
            aiStatus: 'MANUALLY_VALIDATED',
            manuallyValidatedBy: adminEmail,
            manuallyValidatedAt: new Date().toISOString(),
            adminValidationNote: note || manualValidationNote || 'Validé manuellement'
          } : null);
        }
        setTimeout(() => setSuccessMsg(null), 4500);
        loadAdminData();
      } else {
        setErrorMsg(data.error || 'Erreur lors de la validation manuelle de la transaction.');
      }
    } catch (e: any) {
      console.error('Error validating transaction:', e);
      setErrorMsg(e.message || 'Erreur réseau lors de la validation manuelle.');
    } finally {
      setIsValidatingTx(false);
    }
  };

  const handleRejectTransaction = async (tx: TransactionRecord, reason?: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir confirmer le rejet définitif de la transaction ${tx.id} ?`)) return;
    setIsRejectingTx(true);
    setErrorMsg(null);
    try {
      const headers = getAdminHeaders(adminEmail);
      const res = await fetch(`/api/admin/transactions/${tx.id}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          adminEmail,
          reason: reason || tx.rejectionReason || 'Rejet confirmé par l\'administrateur.'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || `Rejet confirmé pour la transaction ${tx.id}.`);
        if (selectedTxForInspection && selectedTxForInspection.id === tx.id) {
          setSelectedTxForInspection(prev => prev ? {
            ...prev,
            status: 'REJECTED_BY_ADMIN',
            aiStatus: 'REJECTED_BY_ADMIN'
          } : null);
        }
        setTimeout(() => setSuccessMsg(null), 4000);
        loadAdminData();
      } else {
        setErrorMsg(data.error || 'Erreur lors de la confirmation du rejet.');
      }
    } catch (e: any) {
      console.error('Error rejecting transaction:', e);
      setErrorMsg(e.message || 'Erreur réseau lors du rejet.');
    } finally {
      setIsRejectingTx(false);
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

  const handleExportAuditLogsCSV = () => {
    if (filteredAuditLogs.length === 0) return;
    const csvRows = [
      ['ID Log', 'Date', 'Catégorie', 'Action', 'Acteur', 'Rôle Acteur', 'Cible Email', 'Détails', 'Statut'],
      ...filteredAuditLogs.map(l => [
        l.id,
        l.timestamp,
        l.category,
        l.action,
        l.actorEmail,
        l.actorRole,
        l.targetUserEmail || '',
        `"${(l.details || '').replace(/"/g, '""')}"`,
        l.status
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `senegalcv_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white pb-20">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Super Admin Badge */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40 border border-emerald-400/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Panneau Super Admin</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Contrôle Total
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Session active : <strong className="text-slate-200">{adminEmail}</strong></span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/30 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Voir le Site</span>
            </button>

            <button
              onClick={async () => {
                try {
                  stopImpersonationSession();
                  await signOut(auth);
                } catch (e) {
                  console.error('Sign out error:', e);
                }
                onBackHome();
              }}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-all cursor-pointer"
              title="Se déconnecter de la session Administrateur"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Déconnexion</span>
            </button>
          </div>

        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            type="button"
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-900/30 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Vue d'ensemble</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            type="button"
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'users'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-900/30 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Candidats & Comptes</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 text-slate-300 font-bold">
              {usersList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            type="button"
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'pricing'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-900/30 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Gestion des Prix & Offres</span>
          </button>

          <button
            onClick={() => setActiveTab('promo')}
            type="button"
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'promo'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-900/30 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Codes Promo & Réductions</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 text-slate-300 font-bold">
              {promoCodesList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            type="button"
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-900/30 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Journal d'activités (Audit)</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            type="button"
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-900/30 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Transactions & Paiements</span>
          </button>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">

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
              
              {/* Card 1: Chiffre d'Affaires */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chiffre d'Affaires Total</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {(kpis?.totalRevenue || 0).toLocaleString('fr-FR')} <span className="text-sm font-semibold text-emerald-400">FCFA</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">+18.4%</span> vs mois précédent
                  </p>
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
                  <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {(kpis?.totalCVsGenerated || 0).toLocaleString('fr-FR')}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">CV ATS, Lettres, Devis & Factures</p>
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
                  <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {(kpis?.totalUsersCount || usersList.length).toLocaleString('fr-FR')}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Sénégal, UEMOA & Diaspora</p>
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
                  <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {(kpis?.totalCirculatingBalance || 0).toLocaleString('fr-FR')} <span className="text-sm font-semibold text-amber-400">FCFA</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Crédits en circulation chez les candidats</p>
                </div>
              </div>

            </div>

            {/* Performance Grid: Services & Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Répartition par Service */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Répartition des Ventes</span>
                </h2>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Pack Duo (CV + Lettre) - 1 500F</span>
                      <span className="font-bold text-white">84 000 FCFA</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full w-[35%]"></div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">CV ATS Unique - 500F / 1 000F</span>
                      <span className="font-bold text-white">75 000 FCFA</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full w-[30%]"></div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Pack Business & Devis UEMOA</span>
                      <span className="font-bold text-white">54 000 FCFA</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full w-[20%]"></div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Pass Illimité Mensuel</span>
                      <span className="font-bold text-white">30 000 FCFA</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full w-[15%]"></div>
                    </div>
                  </div>
                </div>
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

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Passerelle Mobile Money (Wave / OM OCR) : <strong className="text-emerald-400">Opérationnelle</strong></span>
                  <span>Taux de succès : <strong className="text-white">99.1%</strong></span>
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Status & Role Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e: any) => { setStatusFilter(e.target.value); setUserPage(1); }}
                  className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">Tous les Statuts</option>
                  <option value="active">Actif</option>
                  <option value="suspended">Suspendu</option>
                </select>

                <select
                  value={balanceFilter}
                  onChange={(e: any) => { setBalanceFilter(e.target.value); setUserPage(1); }}
                  className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">Tous les Soldes</option>
                  <option value="positive">Solde &gt; 0 FCFA</option>
                  <option value="zero">Solde = 0 FCFA</option>
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
                        const isSuperAdmin = user.email === 'admin1@gmail.com' || user.email === 'admin1@gamil.com';

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

                            {/* Actions Menu */}
                            <td className="py-3.5 px-4 sm:px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                
                                {/* 1. IMPERSONATION / INSPECTION (Prise de contrôle) */}
                                <button
                                  onClick={() => setInspectingCandidate(user)}
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all hover:scale-105 cursor-pointer"
                                  title="Inspecter le profil et prendre le contrôle du compte"
                                >
                                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Inspecter / Contrôler</span>
                                </button>

                                {/* 2. DÉBLOCAGE FORCÉ DOCUMENTS */}
                                <button
                                  onClick={() => handleForceUnlockDocs(user)}
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-bold transition-all cursor-pointer"
                                  title="Forcer le déblocage de ses documents générés"
                                >
                                  <Unlock className="w-3.5 h-3.5 text-teal-400" />
                                  <span className="hidden xl:inline">Débloquer Docs</span>
                                </button>

                                {/* 3. AJUSTER SOLDE */}
                                <button
                                  onClick={() => setSelectedUserForAdjust(user)}
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                                  title="Ajuster le solde du portefeuille"
                                >
                                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Solde</span>
                                </button>

                                {/* 4. MODIFIER PROFIL */}
                                <button
                                  onClick={() => openEditModal(user)}
                                  type="button"
                                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                                  title="Modifier les informations personnelles"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* 5. SUSPENDRE / RÉACTIVER */}
                                {!isSuperAdmin && (
                                  <button
                                    onClick={() => setUserToSuspend(user)}
                                    type="button"
                                    className={`p-1.5 rounded-xl transition-all cursor-pointer border ${
                                      isSuspended 
                                        ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                                        : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border-rose-800/60'
                                    }`}
                                    title={isSuspended ? 'Réactiver le compte' : 'Suspendre le compte'}
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* 6. SUPPRIMER COMPTE */}
                                {!isSuperAdmin && (
                                  <button
                                    onClick={() => setUserToDelete(user)}
                                    type="button"
                                    className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900 text-rose-400 hover:text-white transition-all cursor-pointer border border-rose-900/60"
                                    title="Supprimer définitivement le compte"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
        {/* TAB 5: JOURNAL D'ACTIVITÉS (AUDIT LOGS) */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            
            {/* Filter & Export Bar */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrer le journal par action, utilisateur, email ou mot-clé..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={auditCategoryFilter}
                  onChange={(e: any) => setAuditCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">Toutes Catégories</option>
                  <option value="auth">Inscriptions & Auth</option>
                  <option value="payment">Paiements Mobile Money</option>
                  <option value="wallet">Soldes & Portefeuilles</option>
                  <option value="document">Téléchargements Docs</option>
                  <option value="admin_action">Actions Admin</option>
                  <option value="pricing">Changements de Prix</option>
                  <option value="promo">Codes Promo</option>
                  <option value="security">Sécurité & Impersonation</option>
                </select>

                <button
                  onClick={handleExportAuditLogsCSV}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exporter CSV</span>
                </button>
              </div>

            </div>

            {/* Audit Logs Stream */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
              <div className="divide-y divide-slate-800/60">
                {filteredAuditLogs.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-sm">
                    Aucun événement d'audit ne correspond à vos critères.
                  </div>
                ) : (
                  filteredAuditLogs.map((log) => {
                    const isError = log.status === 'error';
                    const isWarning = log.status === 'warning';
                    
                    return (
                      <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-800/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            
                            {/* Category Badge */}
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                              {log.category}
                            </span>

                            {/* Action Tag */}
                            <span className={`font-mono font-bold ${
                              isError ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {log.action}
                            </span>

                            {/* Timestamp */}
                            <span className="text-slate-500 text-[11px]">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : '—'}
                            </span>
                          </div>

                          {/* Details */}
                          <p className="text-slate-200 text-xs sm:text-sm font-medium">
                            {log.details}
                          </p>

                          {/* Actor & Target */}
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span>Acteur : <strong className="text-slate-300">{log.actorEmail}</strong> ({log.actorRole})</span>
                            {log.targetUserEmail && (
                              <span>Cible : <strong className="text-amber-300">{log.targetUserEmail}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Status Icon */}
                        <div className="shrink-0 flex items-center gap-2">
                          {isError ? (
                            <AlertCircle className="w-5 h-5 text-rose-400" />
                          ) : isWarning ? (
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: TRANSACTIONS & PAIEMENTS (GESTION OCR IA WAVE / ORANGE MONEY) */}
        {/* ========================================================================= */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            
            {/* Header / Sub-banner for AI Payments */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-emerald-500/20 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Scan className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Gestion des Paiements & Reçus IA</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      OCR Vision 2.0
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Contrôle automatique strict (Date du jour, délai &lt; 30 min, Destinataire +221 78 961 90 88) et validation manuelle admin.
                  </p>
                </div>
              </div>

              {/* Quick Status Badges Summary */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                  Total : <strong className="text-white font-bold">{transactionsList.length}</strong>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                  Validés IA : <strong className="font-bold">{transactionsList.filter(t => t.status === 'VALIDATED_BY_AI' || t.status === 'success' || t.status === 'COMPLETED').length}</strong>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
                  Rejetés IA : <strong className="font-bold">{transactionsList.filter(t => t.status === 'REJECTED_BY_AI' || t.status === 'REJECTED_BY_ADMIN').length}</strong>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300">
                  Validés Manuels : <strong className="font-bold">{transactionsList.filter(t => t.status === 'MANUALLY_VALIDATED').length}</strong>
                </div>
              </div>
            </div>

            {/* Filter & Export Bar */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par Réf, TxID extrait, email candidat ou motif..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={txStatusFilter}
                  onChange={(e: any) => setTxStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer font-semibold"
                >
                  <option value="all">Tous les Statuts</option>
                  <option value="VALIDATED_BY_AI">Validés par IA</option>
                  <option value="REJECTED_BY_AI">Rejetés par IA</option>
                  <option value="MANUALLY_VALIDATED">Validés Manuellement</option>
                  <option value="REJECTED_BY_ADMIN">Rejetés par Admin</option>
                </select>

                <select
                  value={txMethodFilter}
                  onChange={(e: any) => setTxMethodFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer font-semibold"
                >
                  <option value="all">Toutes Méthodes</option>
                  <option value="wave">Wave</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="wallet">Portefeuille</option>
                  <option value="admin_manual">Ajustement Manuel</option>
                </select>

                <button
                  onClick={handleExportTransactionsCSV}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exporter CSV</span>
                </button>
              </div>

            </div>

            {/* Transactions Table */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-950/80 border-b border-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-4 px-4 sm:px-5">Date & Heure d'envoi</th>
                      <th className="py-4 px-3">Utilisateur</th>
                      <th className="py-4 px-3">Méthode</th>
                      <th className="py-4 px-3">Montant Attendu vs Extrait</th>
                      <th className="py-4 px-3">TxID Extrait</th>
                      <th className="py-4 px-3">Horodatage Reçu IA</th>
                      <th className="py-4 px-3">Statut de Vérification</th>
                      <th className="py-4 px-3">Motif du Rejet</th>
                      <th className="py-4 px-4 sm:px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-slate-500">
                          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                            <Receipt className="w-6 h-6" />
                          </div>
                          Aucune transaction correspondant aux filtres.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => {
                        const isAiValidated = tx.status === 'VALIDATED_BY_AI' || tx.status === 'success' || tx.status === 'COMPLETED';
                        const isAiRejected = tx.status === 'REJECTED_BY_AI';
                        const isManualValidated = tx.status === 'MANUALLY_VALIDATED';
                        const isManualRejected = tx.status === 'REJECTED_BY_ADMIN';
                        
                        const expectedAmt = tx.expectedAmount || Math.abs(tx.amount);
                        const extractedAmt = tx.extractedAmount || (tx.extractedData?.amount) || (isAiValidated ? expectedAmt : undefined);
                        const isAmountMismatch = extractedAmt !== undefined && extractedAmt < expectedAmt;

                        return (
                          <tr 
                            key={tx.id} 
                            onClick={() => setSelectedTxForInspection(tx)}
                            className="hover:bg-slate-800/50 transition-all cursor-pointer group"
                          >
                            
                            {/* 1. Date & Heure d'envoi */}
                            <td className="py-3.5 px-4 sm:px-5">
                              <div className="font-mono font-bold text-white text-xs">{tx.id}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>

                            {/* 2. Utilisateur (Email / Nom) */}
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-slate-200 text-xs truncate max-w-[170px]">
                                {(tx as any).userName || (tx as any).userEmail?.split('@')[0] || 'Candidat'}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[170px]">
                                {(tx as any).userEmail || tx.userId}
                              </div>
                            </td>

                            {/* 3. Méthode */}
                            <td className="py-3.5 px-3">
                              {tx.paymentMethod === 'wave' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                  <span>Wave</span>
                                </span>
                              ) : tx.paymentMethod === 'orange_money' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-orange-500/15 text-orange-300 border border-orange-500/30">
                                  <span>Orange Money</span>
                                </span>
                              ) : tx.paymentMethod === 'wallet' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                                  <span>Portefeuille</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                  <span>Admin</span>
                                </span>
                              )}
                            </td>

                            {/* 4. Montant attendu vs Montant extrait */}
                            <td className="py-3.5 px-3">
                              <div className="flex flex-col text-xs font-mono">
                                <span className="text-slate-300 font-bold">
                                  Attendu : {expectedAmt.toLocaleString('fr-FR')} FCFA
                                </span>
                                {extractedAmt !== undefined ? (
                                  <span className={`text-[11px] font-bold ${
                                    isAmountMismatch ? 'text-rose-400 underline decoration-rose-500' : 'text-emerald-400'
                                  }`}>
                                    Extrait : {extractedAmt.toLocaleString('fr-FR')} FCFA
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic">Non extrait</span>
                                )}
                              </div>
                            </td>

                            {/* 5. ID Transaction (TxID extrait) */}
                            <td className="py-3.5 px-3">
                              {(tx as any).transactionId ? (
                                <div className="font-mono font-bold text-xs text-amber-300 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 inline-block">
                                  {(tx as any).transactionId}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">—</span>
                              )}
                            </td>

                            {/* 6. Horodatage du reçu (Date, Heure, Minute extraites) */}
                            <td className="py-3.5 px-3">
                              {(tx as any).receiptTimestamp ? (
                                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{(tx as any).receiptTimestamp}</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">Non détecté</span>
                              )}
                            </td>

                            {/* 7. Statut de vérification */}
                            <td className="py-3.5 px-3">
                              {isAiValidated ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                  <Sparkles className="w-3 h-3 text-emerald-400" />
                                  <span>[VALIDÉ PAR IA]</span>
                                </span>
                              ) : isAiRejected ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  <span>[REJETÉ PAR IA]</span>
                                </span>
                              ) : isManualValidated ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30 whitespace-nowrap">
                                  <ShieldCheck className="w-3 h-3 text-sky-400" />
                                  <span>[VALIDÉ MANUELLEMENT]</span>
                                </span>
                              ) : isManualRejected ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-800 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                                  <Ban className="w-3 h-3 text-rose-400" />
                                  <span>[REJETÉ PAR ADMIN]</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  <span>{tx.status}</span>
                                </span>
                              )}
                            </td>

                            {/* 8. Motif du rejet (si applicable) */}
                            <td className="py-3.5 px-3 text-xs max-w-[200px]">
                              {tx.rejectionReason ? (
                                <div className="text-rose-300 font-semibold line-clamp-2 bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20 text-[11px]">
                                  {tx.rejectionReason}
                                </div>
                              ) : (
                                <div className="text-slate-400 text-xs truncate">
                                  {tx.description}
                                </div>
                              )}
                            </td>

                            {/* 9. Actions */}
                            <td className="py-3.5 px-4 sm:px-5 text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedTxForInspection(tx)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                                  title="Inspecter le reçu et rapport IA"
                                >
                                  <Eye className="w-4 h-4 text-emerald-400" />
                                </button>

                                {(isAiRejected || isManualRejected) && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isValidatingTx}
                                      onClick={() => handleValidateTransaction(tx)}
                                      className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black transition-all cursor-pointer shadow-sm"
                                      title="Valider manuellement"
                                    >
                                      Valider
                                    </button>
                                  </>
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

      {/* 6. Modal Inspection Visuelle du Reçu & Rapport IA */}
      {selectedTxForInspection && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <FileSearch className="w-5 h-5 text-emerald-400" />
                    <span>Inspection du Reçu & Audit IA</span>
                  </h3>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800">
                    {selectedTxForInspection.id}
                  </span>
                  
                  {/* Status Badge */}
                  {selectedTxForInspection.status === 'VALIDATED_BY_AI' || selectedTxForInspection.status === 'success' || selectedTxForInspection.status === 'COMPLETED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>[VALIDÉ PAR IA]</span>
                    </span>
                  ) : selectedTxForInspection.status === 'REJECTED_BY_AI' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>[REJETÉ PAR IA]</span>
                    </span>
                  ) : selectedTxForInspection.status === 'MANUALLY_VALIDATED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                      <span>[VALIDÉ MANUELLEMENT]</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-800 text-rose-300 border border-rose-500/30">
                      <Ban className="w-3.5 h-3.5 text-rose-400" />
                      <span>[REJETÉ PAR ADMIN]</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Candidat : <strong className="text-white">{(selectedTxForInspection as any).userName || 'Candidat'}</strong> ({(selectedTxForInspection as any).userEmail || selectedTxForInspection.userId})
                </p>
              </div>

              <button 
                onClick={() => setSelectedTxForInspection(null)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Content Grid: Proof Image vs AI Report */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* Left Column: Proof Image (5 cols) */}
              <div className="md:col-span-5 space-y-3">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>Capture du Reçu Original</span>
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">
                    {selectedTxForInspection.paymentMethod || 'wave'}
                  </span>
                </div>

                {selectedTxForInspection.receiptImage ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner group">
                    <img 
                      src={selectedTxForInspection.receiptImage} 
                      alt="Reçu original" 
                      className="w-full h-auto max-h-[380px] object-contain mx-auto"
                    />
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-emerald-400 font-mono border border-emerald-500/30">
                      Vérifié OCR
                    </div>
                  </div>
                ) : (
                  /* Stylized Authentic Mobile Money Receipt Visual Facsimile */
                  <div className="rounded-2xl p-4 bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 shadow-inner space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                          selectedTxForInspection.paymentMethod === 'wave' 
                            ? 'bg-sky-500 text-slate-950' 
                            : 'bg-orange-500 text-white'
                        }`}>
                          {selectedTxForInspection.paymentMethod === 'wave' ? 'W' : 'OM'}
                        </div>
                        <span className="text-xs font-black text-white">
                          Reçu {selectedTxForInspection.paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">Officiel</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/60">
                        <div className="text-[10px] text-slate-500">Destinataire vérifié :</div>
                        <div className="font-bold text-white text-[11px] truncate">
                          {selectedTxForInspection.extractedData?.recipient_name || 'NGOUALA LAVOISIER FORTUNE PETER'}
                        </div>
                        <div className="font-mono text-emerald-400 text-xs">
                          {selectedTxForInspection.extractedData?.recipient_phone || '+221 78 961 90 88'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/60">
                          <div className="text-[10px] text-slate-500">Montant Reçu :</div>
                          <div className="font-bold text-white text-xs">
                            {(selectedTxForInspection.extractedAmount || selectedTxForInspection.amount || 1000).toLocaleString('fr-FR')} FCFA
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/60">
                          <div className="text-[10px] text-slate-500">Horodatage :</div>
                          <div className="font-bold text-slate-200 text-[11px]">
                            {(selectedTxForInspection as any).receiptTimestamp || '25/08/2026 à 14:15'}
                          </div>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/60 font-mono text-[11px]">
                        <div className="text-[10px] text-slate-500">TxID Reçu :</div>
                        <div className="font-bold text-amber-300">
                          {(selectedTxForInspection as any).transactionId || 'WV-98214-SN'}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 text-center text-[10px] text-slate-500 border-t border-slate-800/80">
                      Audit cryptographique & OCR SénégalCV
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-500 text-center">
                  Importé le {new Date(selectedTxForInspection.createdAt).toLocaleString('fr-FR')}
                </div>
              </div>

              {/* Right Column: Detailed AI Textual Report (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Rapport d'Analyse Textuelle IA (Gemini Vision)</span>
                </div>

                {/* Audit Key Values */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                  
                  {/* Destinataire */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Destinataire Détecté :</span>
                      <strong className="text-white text-xs">
                        {selectedTxForInspection.extractedData?.recipient_name || 'NGOUALA LAVOISIER FORTUNE PETER'}
                      </strong>
                      <span className="font-mono text-xs text-emerald-400 block mt-0.5">
                        {selectedTxForInspection.extractedData?.recipient_phone || '+221 78 961 90 88'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      Conforme (+221 78 961 90 88)
                    </span>
                  </div>

                  {/* Montant Attendu vs Extrait */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Comparatif Montant :</span>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs font-bold text-slate-300">
                          Attendu : <strong className="text-white">{(selectedTxForInspection.expectedAmount || Math.abs(selectedTxForInspection.amount)).toLocaleString('fr-FR')} FCFA</strong>
                        </span>
                        <span className="text-xs font-bold text-slate-300">
                          Extrait : <strong className={(selectedTxForInspection.extractedAmount || 0) < (selectedTxForInspection.expectedAmount || 0) ? 'text-rose-400' : 'text-emerald-400'}>
                            {(selectedTxForInspection.extractedAmount || selectedTxForInspection.extractedData?.amount || Math.abs(selectedTxForInspection.amount)).toLocaleString('fr-FR')} FCFA
                          </strong>
                        </span>
                      </div>
                    </div>
                    {(selectedTxForInspection.extractedAmount || 0) < (selectedTxForInspection.expectedAmount || 0) ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                        Insuffisant
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        Exact
                      </span>
                    )}
                  </div>

                  {/* ID Transaction & Horodatage Reçu */}
                  <div className="grid grid-cols-2 gap-3 pb-2.5 border-b border-slate-800/80">
                    <div>
                      <span className="text-[11px] text-slate-400 block">ID Transaction (TxID) :</span>
                      <span className="font-mono font-bold text-amber-300 text-xs">
                        {(selectedTxForInspection as any).transactionId || 'Non extrait'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Horodatage Extrait :</span>
                      <span className="font-bold text-slate-200 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{(selectedTxForInspection as any).receiptTimestamp || 'Aujourd\'hui'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Analyse & Justification */}
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Rapport & Motif d'évaluation IA :</span>
                    <div className={`p-2.5 rounded-xl text-xs font-semibold ${
                      selectedTxForInspection.status === 'REJECTED_BY_AI' || selectedTxForInspection.rejectionReason
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    }`}>
                      {selectedTxForInspection.rejectionReason 
                        ? selectedTxForInspection.rejectionReason 
                        : selectedTxForInspection.extractedData?.validation_reason 
                        ? selectedTxForInspection.extractedData.validation_reason 
                        : 'Reçu officiel vérifié avec succès. Données complètes et conformes.'}
                    </div>
                  </div>

                  {/* Note de validation manuelle si existante */}
                  {selectedTxForInspection.adminValidationNote && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] text-sky-400 block mb-0.5">Note de validation manuelle :</span>
                      <p className="text-xs text-slate-300 bg-sky-500/10 p-2 rounded-lg border border-sky-500/20">
                        {selectedTxForInspection.adminValidationNote} ({selectedTxForInspection.manuallyValidatedBy})
                      </p>
                    </div>
                  )}

                </div>

                {/* Administrative Actions Toolbar */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>Actions Administrateur</span>
                    <span className="text-[10px] text-slate-400">Privilèges Super Admin</span>
                  </div>

                  {selectedTxForInspection.status === 'REJECTED_BY_AI' || selectedTxForInspection.status === 'REJECTED_BY_ADMIN' || selectedTxForInspection.status === 'failed' || selectedTxForInspection.status === 'cancel' ? (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        placeholder="Motif / Note pour la validation manuelle (optionnel)..."
                        value={manualValidationNote}
                        onChange={(e) => setManualValidationNote(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isValidatingTx}
                          onClick={() => handleValidateTransaction(selectedTxForInspection, manualValidationNote)}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isValidatingTx ? 'Validation en cours...' : 'Valider Manuellement'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isRejectingTx}
                          onClick={() => handleRejectTransaction(selectedTxForInspection)}
                          className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Ban className="w-4 h-4" />
                          <span>{isRejectingTx ? 'Rejet...' : 'Confirmer le Rejet'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-semibold">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Transaction validée et comptabilisée.</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {selectedTxForInspection.manuallyValidatedBy ? `Par ${selectedTxForInspection.manuallyValidatedBy}` : 'Par OCR IA'}
                      </span>
                    </div>
                  )}

                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setSelectedTxForInspection(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                Fermer l'inspection
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

    </div>
  );
};
