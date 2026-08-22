import React, { useState, useEffect } from 'react';
import Page from '../app/page';
import App from './App';
import { AdminDashboard } from './components/AdminDashboard';
import { ImpersonationBanner } from './components/ImpersonationBanner';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { isAdminEmail, PRIMARY_ADMIN_EMAIL } from './lib/adminAuth';

export const RootApp: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [currentView, setCurrentView] = useState<'landing' | 'editor' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      const initialUser = auth.currentUser;
      if (initialUser?.email && isAdminEmail(initialUser.email)) return 'admin';
      if (hash === '#admin' || pathname === '/admin') {
        if (initialUser?.email && isAdminEmail(initialUser.email)) return 'admin';
      }
      if (hash === '#editor') return 'editor';
    }
    return 'landing';
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u?.email && isAdminEmail(u.email)) {
        // Direct automatic redirection to personal admin interface upon login
        setCurrentView('admin');
        if (typeof window !== 'undefined') {
          window.location.hash = 'admin';
        }
      } else if (!u && currentView === 'admin') {
        // If logged out from admin, return to landing
        setCurrentView('landing');
        if (typeof window !== 'undefined') {
          window.location.hash = '';
        }
      }
    });
    return () => unsub();
  }, [currentView]);

  // Listen to hash changes for direct URL navigation (#admin, #editor, #landing)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#admin') {
        setCurrentView('admin');
      } else if (hash === '#editor') {
        setCurrentView('editor');
      } else if (hash === '#landing' || hash === '' || hash === '#') {
        setCurrentView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view: 'landing' | 'editor' | 'admin') => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      window.location.hash = view === 'landing' ? '' : view;
    }
  };

  // View: Admin Dashboard
  if (currentView === 'admin') {
    return (
      <AdminDashboard 
        onBackHome={() => navigateTo('landing')} 
        onOpenEditor={() => navigateTo('editor')} 
      />
    );
  }

  // View: Document Editor Workspace
  if (currentView === 'editor') {
    return (
      <div className="relative">
        <ImpersonationBanner 
          onExitImpersonation={() => navigateTo('admin')}
          onNavigateToEditor={() => navigateTo('editor')}
        />
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs font-semibold print:hidden shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-slate-100">Espace de Travail & Éditeurs (CV, Lettre, Devis, Facture)</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdminEmail(user?.email) && (
              <button
                type="button"
                onClick={() => navigateTo('admin')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Dashboard Admin</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigateTo('landing')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white transition-all cursor-pointer font-bold border border-slate-700 active:scale-95 flex items-center gap-1.5"
            >
              <span>← Retour à la Page d'Accueil</span>
            </button>
          </div>
        </div>
        <App onOpenAdmin={() => navigateTo('admin')} />
      </div>
    );
  }

  // View: Landing Page
  return (
    <div className="relative">
      <ImpersonationBanner 
        onExitImpersonation={() => navigateTo('admin')}
        onNavigateToEditor={() => navigateTo('editor')}
      />
      <Page 
        onOpenEditor={() => navigateTo('editor')} 
        onOpenAdmin={() => navigateTo('admin')} 
      />
    </div>
  );
};

export default RootApp;

