import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, CheckCheck, Trash2, Package, FileText, 
  Coins, ShoppingBag, AlertTriangle, Sparkles, 
  CheckCircle2, ExternalLink, X, Crown, Wallet,
  Info, ArrowRight
} from 'lucide-react';
import { DokyaNotification } from '../types';
import { 
  subscribeToUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  createNotification,
  auth 
} from '../lib/firebase';

interface NotificationBellProps {
  userId?: string;
  onNavigateTab?: (tab: string) => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  userId,
  onNavigateTab,
  className = ''
}) => {
  const [notifications, setNotifications] = useState<DokyaNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const effectiveUid = userId || auth.currentUser?.uid || 'guest';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Subscribe to notifications in real-time from Firestore & local storage
  useEffect(() => {
    if (!effectiveUid) return;

    const unsub = subscribeToUserNotifications(effectiveUid, (list) => {
      if (!list || list.length === 0) {
        // Seed default starter notifications if user has none
        const starterNotifs: DokyaNotification[] = [
          {
            id: `starter_wallet_${effectiveUid}`,
            userId: effectiveUid,
            title: 'Dokya Wallet Prêt',
            message: 'Votre portefeuille Dokya Wallet est configuré. Vous pouvez recharger votre solde en FCFA via Wave & Mobile Money.',
            type: 'recharge',
            read: false,
            tabTarget: 'dashboard_home',
            createdAt: new Date().toISOString()
          },
          {
            id: `starter_docs_${effectiveUid}`,
            userId: effectiveUid,
            title: 'Générateurs Dokya AI Actifs',
            message: 'Créez vos CV ATS, Lettres percutantes, Devis & Factures UEMOA et Livres numériques certifiés.',
            type: 'document',
            read: false,
            tabTarget: 'gen_cv',
            createdAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: `starter_vip_${effectiveUid}`,
            userId: effectiveUid,
            title: 'Pass VIP & Formules Dokya',
            message: 'Profitez de téléchargements illimités sans filigrane et d\'un accès prioritaire à toutes les fonctionnalités avec le Pass VIP.',
            type: 'subscription',
            read: false,
            tabTarget: 'tarifs',
            createdAt: new Date(Date.now() - 7200000).toISOString()
          }
        ];
        setNotifications(starterNotifs);
        try {
          localStorage.setItem(`dokya_notifications_${effectiveUid}`, JSON.stringify(starterNotifs));
        } catch {}
      } else {
        setNotifications(list);
      }
    });

    return () => {
      unsub();
    };
  }, [effectiveUid]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  const handleMarkAsRead = async (notifId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await markNotificationAsRead(notifId, effectiveUid);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    if (!effectiveUid) return;
    await markAllNotificationsAsRead(effectiveUid);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDelete = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notifId, effectiveUid);
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  const handleItemClick = async (notif: DokyaNotification) => {
    if (!notif.read) {
      await handleMarkAsRead(notif.id);
    }
    if (notif.tabTarget && onNavigateTab) {
      onNavigateTab(notif.tabTarget);
      setIsOpen(false);
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const getIcon = (type?: string) => {
    switch (type) {
      case 'recharge':
        return <Wallet className="w-4 h-4 text-emerald-400" />;
      case 'commission':
      case 'coins':
        return <Coins className="w-4 h-4 text-emerald-400" />;
      case 'document':
      case 'invoice':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'subscription':
      case 'vip':
        return <Crown className="w-4 h-4 text-amber-400" />;
      case 'stock':
        return <Package className="w-4 h-4 text-amber-400" />;
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-sky-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'system':
      case 'info':
      default:
        return <Sparkles className="w-4 h-4 text-indigo-400" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 2) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      if (diffDays === 1) return 'Hier';
      if (diffDays < 7) return `Il y a ${diffDays} j`;
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        id="dokya-notification-bell"
        type="button"
        onClick={handleToggle}
        className="relative p-2 sm:p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs active:scale-95 focus:outline-hidden"
        title="Notifications Dokya"
        aria-label="Centre de notifications"
      >
        <Bell className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform ${unreadCount > 0 ? 'text-amber-400' : 'text-slate-300'}`} />
        
        {/* Dynamic Red Badge with unread count */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-slate-950 shadow-md animate-in zoom-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-indigo-400" />
                <span>Notifications In-App</span>
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Tout lire</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          {notifications.length > 0 && (
            <div className="px-3 py-1.5 border-b border-slate-800/60 bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Toutes ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('unread')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    filter === 'unread' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Non lues ({unreadCount})
                </button>
              </div>

              <span className="text-[10px] text-slate-500">
                Temps réel
              </span>
            </div>
          )}

          {/* List of Notifications */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500">
                  <Bell className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-300">
                    {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Vous recevrez ici les confirmations de rechargement, de création de documents et les alertes d'abonnement.
                  </p>
                </div>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 relative group ${
                    notif.read ? 'bg-slate-900 hover:bg-slate-800/70' : 'bg-slate-850/90 hover:bg-slate-800/90'
                  }`}
                >
                  {/* Unread indicator dot */}
                  {!notif.read && (
                    <span className="absolute left-1.5 top-5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
                  )}

                  {/* Type Icon */}
                  <div className="p-2 rounded-xl bg-slate-800/90 shrink-0 border border-slate-700/60 mt-0.5 shadow-xs">
                    {getIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs truncate ${notif.read ? 'font-semibold text-slate-300' : 'font-extrabold text-white'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                        {formatTimestamp(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug break-words">
                      {notif.message}
                    </p>

                    {notif.tabTarget && (
                      <div className="pt-0.5 flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300">
                        <span>Accéder</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(notif.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition-opacity cursor-pointer self-start"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between px-3 text-[10px] text-slate-500">
            <span>Dokya Notifications</span>
            <span className="text-emerald-400 font-semibold">● Synchronisé</span>
          </div>

        </div>
      )}
    </div>
  );
};
