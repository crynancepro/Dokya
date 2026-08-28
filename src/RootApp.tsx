import React, { useState, useEffect } from 'react';
import App from './App';
import { AdminDashboard } from './components/AdminDashboard';
import { ImpersonationBanner } from './components/ImpersonationBanner';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { isAdminEmail } from './lib/adminAuth';

export const RootApp: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [currentView, setCurrentView] = useState<'editor' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      const initialUser = auth.currentUser;
      if (initialUser?.email && isAdminEmail(initialUser.email)) return 'admin';
      if (hash === '#admin' || pathname === '/admin') {
        if (initialUser?.email && isAdminEmail(initialUser.email)) return 'admin';
      }
    }
    return 'editor';
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u?.email && isAdminEmail(u.email)) {
        setCurrentView('admin');
        if (typeof window !== 'undefined') {
          window.location.hash = 'admin';
        }
      } else if (!u && currentView === 'admin') {
        setCurrentView('editor');
        if (typeof window !== 'undefined') {
          window.location.hash = '';
        }
      }
    });
    return () => unsub();
  }, [currentView]);

  // Listen to hash changes (#admin, #editor)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('editor');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view: 'editor' | 'admin') => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      window.location.hash = view === 'admin' ? 'admin' : '';
    }
  };

  // View: Admin Dashboard
  if (currentView === 'admin') {
    return (
      <AdminDashboard 
        onBackHome={() => navigateTo('editor')} 
        onOpenEditor={() => navigateTo('editor')} 
      />
    );
  }

  // View: Main Dokya AI App (CV ATS, Letters, Factures, Devis, Ebooks, Dashboard)
  return (
    <div className="relative min-h-screen bg-slate-950">
      <ImpersonationBanner 
        onExitImpersonation={() => navigateTo('admin')}
        onNavigateToEditor={() => navigateTo('editor')}
      />
      <App onOpenAdmin={() => navigateTo('admin')} />
    </div>
  );
};

export default RootApp;
