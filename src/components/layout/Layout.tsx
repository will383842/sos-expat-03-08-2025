import React, { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import InstallBanner from '../common/InstallBanner';

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  className?: string;
  role?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  showFooter = true,
  className = '',
  role = 'main'
}) => {
  const { authInitialized, isLoading } = useAuth();

  // Loading state pendant l'initialisation auth
  if (!authInitialized || isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50"
        role="status"
        aria-live="polite"
        aria-label="Chargement en cours"
      >
        <LoadingSpinner size="large" color="red" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 antialiased">
      {/* Skip link pour accessibilité */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Aller au contenu principal
      </a>

      <Header />

      <main
        id="main-content"
        className={`flex-1 focus:outline-none ${className}`}
        role={role}
        tabIndex={-1}
      >
        {children}
      </main>

      {showFooter && <Footer />}

      {/* Bandeau PWA global — bas-droite, laissé à gauche du bouton “remonter en haut” */}
      <InstallBanner
        offsetRightPx={88}                        // laisse la place au bouton scroll-to-top
        bottomPx={24}                             // aligné avec bottom-6
        zIndexClass="z-50"
        gradientClass="from-violet-600 to-fuchsia-600"
        closeForDays={30}                         // persistance après fermeture
      />
    </div>
  );
};

export default Layout;
