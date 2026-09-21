import type { Metadata } from 'next';
import React from 'react';
import '../src/index.css';

export const metadata: Metadata = {
  title: 'Dokya - CV Professionnels & Documents d’Affaires en Afrique',
  description: 'Générez des CV percutants, lettres de motivation, devis et factures optimisés par l’IA pour le marché africain.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased min-h-screen bg-slate-900 text-slate-100">
        {children}
      </body>
    </html>
  );
}
