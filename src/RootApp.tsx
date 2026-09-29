import React, { useState, useEffect } from 'react';
import App from './App';
import { AdminDashboard } from './components/AdminDashboard';
import { ImpersonationBanner } from './components/ImpersonationBanner';
import { PublicProductPage } from './components/store/PublicProductPage';
import { PublicStorePage } from './components/store/PublicStorePage';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { isAdminEmail } from './lib/adminAuth';

type AppViewMode = 'editor' | 'admin' | 'public_product' | 'public_store';

function parseRoute(): { view: AppViewMode; slug?: string; username?: string } {
  if (typeof window === 'undefined') return { view: 'editor' };

  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);

  // Check query params (?p=... or ?b=...)
  if (searchParams.get('p')) {
    return { view: 'public_product', slug: searchParams.get('p') || '' };
  }
  if (searchParams.get('b')) {
    return { view: 'public_store', username: searchParams.get('b') || '' };
  }

  // Check pathname: /p/[slug]
  const productPathMatch = pathname.match(/^\/p\/([^\/]+)/);
  if (productPathMatch) {
    return { view: 'public_product', slug: productPathMatch[1] };
  }

  // Check pathname: /b/[username]
  const storePathMatch = pathname.match(/^\/b\/([^\/]+)/);
  if (storePathMatch) {
    return { view: 'public_store', username: storePathMatch[1] };
  }

  // Check hash: #/p/[slug] or #p/[slug]
  const productHashMatch = hash.match(/^#\/?p\/([^\/]+)/);
  if (productHashMatch) {
    return { view: 'public_product', slug: productHashMatch[1] };
  }

  // Check hash: #/b/[username] or #b/[username]
  const storeHashMatch = hash.match(/^#\/?b\/([^\/]+)/);
  if (storeHashMatch) {
    return { view: 'public_store', username: storeHashMatch[1] };
  }

  // Check admin
  const initialUser = auth.currentUser;
  if (hash.startsWith('#admin') || pathname.startsWith('/admin')) {
    if (initialUser?.email && isAdminEmail(initialUser.email)) {
      return { view: 'admin' };
    }
  }

  if (initialUser?.email && isAdminEmail(initialUser.email)) {
    return { view: 'admin' };
  }

  return { view: 'editor' };
}

export const RootApp: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [routeState, setRouteState] = useState<{
    view: AppViewMode;
    slug?: string;
    username?: string;
  }>(() => parseRoute());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      const parsed = parseRoute();
      if (parsed.view === 'public_product' || parsed.view === 'public_store') {
        // Keep public pages active
        return;
      }
      if (u?.email && isAdminEmail(u.email)) {
        setRouteState({ view: 'admin' });
        if (typeof window !== 'undefined') {
          window.location.hash = 'admin';
        }
      } else if (!u && routeState.view === 'admin') {
        setRouteState({ view: 'editor' });
        if (typeof window !== 'undefined') {
          window.location.hash = '';
        }
      }
    });
    return () => unsub();
  }, [routeState.view]);

  // Listen to hash and popstate changes
  useEffect(() => {
    const handleUrlChange = () => {
      setRouteState(parseRoute());
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const navigateTo = (view: AppViewMode, param?: string) => {
    if (view === 'public_product') {
      setRouteState({ view: 'public_product', slug: param });
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', `/p/${param || ''}`);
      }
    } else if (view === 'public_store') {
      setRouteState({ view: 'public_store', username: param });
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', `/b/${param || ''}`);
      }
    } else if (view === 'admin') {
      setRouteState({ view: 'admin' });
      if (typeof window !== 'undefined') {
        window.location.hash = 'admin';
      }
    } else {
      setRouteState({ view: 'editor' });
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/');
        window.location.hash = '';
      }
    }
  };

  // View: Public Product Page (dokya.site/p/[slug])
  if (routeState.view === 'public_product' && routeState.slug) {
    return (
      <PublicProductPage 
        slug={routeState.slug} 
        onBackToApp={() => navigateTo('editor')}
        onOpenStore={(username) => navigateTo('public_store', username)}
      />
    );
  }

  // View: Public Store Showcase (dokya.site/b/[username])
  if (routeState.view === 'public_store' && routeState.username) {
    return (
      <PublicStorePage 
        username={routeState.username}
        onOpenProduct={(slug) => navigateTo('public_product', slug)}
        onBackToApp={() => navigateTo('editor')}
      />
    );
  }

  // View: Admin Dashboard
  if (routeState.view === 'admin') {
    return (
      <AdminDashboard 
        onBackHome={() => navigateTo('editor')} 
        onOpenEditor={() => navigateTo('editor')} 
      />
    );
  }

  // View: Main Dokya AI App (CV ATS, Letters, Factures, Devis, Ebooks, Dashboard, Store)
  return (
    <div className="relative min-h-screen bg-slate-950">
      <ImpersonationBanner 
        onExitImpersonation={() => navigateTo('admin')}
        onNavigateToEditor={() => navigateTo('editor')}
      />
      <App 
        onOpenAdmin={() => navigateTo('admin')} 
        onOpenPublicProduct={(slug) => navigateTo('public_product', slug)}
        onOpenPublicStore={(username) => navigateTo('public_store', username)}
      />
    </div>
  );
};

export default RootApp;
