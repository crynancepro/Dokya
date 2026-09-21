'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const RootApp = dynamic(() => import('../src/RootApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Chargement de Dokya...</p>
      </div>
    </div>
  )
});

export default function ClientApp() {
  return <RootApp />;
}
