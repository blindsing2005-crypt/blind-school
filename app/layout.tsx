import './globals.css';
import type { Metadata } from 'next';
import Sidebar from './components/Sidebar';
import MobileMenu from './components/MobileMenu';
import AuthGuard from './components/AuthGuard';
import TopBar from './components/TopBar';

export const metadata: Metadata = {
  title: 'BLIND SCHOOL — Gestion scolaire',
  description: 'Application de gestion scolaire complète',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-slate-50 text-slate-800 antialiased">
        <AuthGuard>
          <Sidebar />
          <MobileMenu />
          <TopBar />
          <main className="min-h-screen pt-14 lg:pl-64 lg:pt-16">
            {children}
          </main>
        </AuthGuard>
      </body>
    </html>
  );
}