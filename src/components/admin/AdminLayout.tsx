import React, { ReactNode, useState, useCallback, useMemo, useEffect } from 'react';
import type { ErrorInfo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, LogOut, Menu, X, Home, AlertTriangle, RefreshCw } from 'lucide-react';

import { adminMenuTree } from '../../config/adminMenu';
import SidebarItem from './sidebar/SidebarItem';

import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';
import ErrorBoundary from '../common/ErrorBoundary';
import { logError } from '../../utils/logging';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  console.log("🚨 AdminLayout render");

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isUpdatingProfiles, setIsUpdatingProfiles] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Détection mobile/desktop avec JavaScript - PAS CSS !
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/admin/login');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logError({
        origin: 'frontend',
        error: `Erreur de déconnexion admin: ${errorMessage}`,
        context: { component: 'AdminLayout', userId: user?.id },
      });
    }
  }, [logout, navigate, user?.id]);

  const handleUpdateProfiles = useCallback(async () => {
    const ok = window.confirm(
      'Êtes-vous sûr de vouloir mettre à jour tous les profils existants avec les nouveaux champs ?'
    );
    if (!ok) return;

    setIsUpdatingProfiles(true);
    setUpdateSuccess(null);
    try {
      if (user?.role !== 'admin') throw new Error('Permissions insuffisantes');

      const { updateExistingProfiles } = await import('../../utils/firestore');
      if (typeof updateExistingProfiles !== 'function') {
        throw new Error('Fonction de mise à jour non disponible');
      }
      const success = await updateExistingProfiles();
      setUpdateSuccess(success);
      setTimeout(() => setUpdateSuccess(null), 5000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logError({
        origin: 'frontend',
        error: `Erreur mise à jour profils: ${errorMessage}`,
        context: { component: 'AdminLayout', userId: user?.id },
      });
      setUpdateSuccess(false);
      setTimeout(() => setUpdateSuccess(null), 5000);
    } finally {
      setIsUpdatingProfiles(false);
    }
  }, [user?.id, user?.role]);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((s) => !s), []);
  const toggleMobileSidebar = useCallback(() => setIsMobileSidebarOpen((s) => !s), []);
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);

  const userInitials = useMemo(() => {
    const first = (user?.firstName || '').charAt(0);
    const last = (user?.lastName || '').charAt(0);
    return `${first}${last}`.toUpperCase();
  }, [user?.firstName, user?.lastName]);

  // Guards
  if (!user || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <Shield className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600 mb-4">Vous devez être administrateur pour accéder à cette page.</p>
          <Button onClick={() => navigate('/')}>Retour à l&apos;accueil</Button>
        </div>
      </div>
    );
  }

  const accountStatus = (user as any)?.status as 'banned' | 'pending' | undefined;
  if (accountStatus === 'banned' || accountStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertTriangle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Compte {accountStatus === 'banned' ? 'suspendu' : 'en attente'}
          </h1>
          <p className="text-gray-600 mb-4">
            {accountStatus === 'banned'
              ? 'Votre compte a été suspendu. Contactez le support.'
              : 'Votre compte est en cours de validation.'}
          </p>
          <Button onClick={handleLogout} variant="secondary">
            Se déconnecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error: Error, errorInfo: ErrorInfo) => {
        logError({
          origin: 'frontend',
          error: `AdminLayout error: ${error.message}`,
          context: { component: 'AdminLayout', componentStack: errorInfo.componentStack, userId: user?.id },
        });
      }}
    >
      <div className="h-screen flex overflow-hidden bg-gray-100">
        
        {/* MOBILE SIDEBAR - Condition JavaScript STRICTE */}
        {isMobile && isMobileSidebarOpen && (
          <div className="fixed inset-0 flex z-40">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={closeMobileSidebar}
              aria-hidden="true"
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-900">
              <div className="flex items-center justify-between h-16 px-4 bg-gray-800">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-red-600" />
                  <span className="ml-2 text-xl font-bold text-white">Admin SOS</span>
                </div>
                <button
                  onClick={closeMobileSidebar}
                  className="text-gray-400 hover:text-white p-2 -m-2 rounded-md"
                  aria-label="Fermer le menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <nav className="px-2 py-4 space-y-1">
                  {adminMenuTree.map((node) => (
                    <SidebarItem key={node.id} node={node} />
                  ))}

                  <div className="px-2 pt-3">
                    <Button
                      onClick={handleUpdateProfiles}
                      loading={isUpdatingProfiles}
                      disabled={isUpdatingProfiles}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <RefreshCw
                        size={16}
                        className={`mr-2 ${isUpdatingProfiles ? 'animate-spin' : ''}`}
                      />
                      Mettre à jour les profils
                    </Button>

                    {updateSuccess !== null && (
                      <div
                        className={`mt-2 text-xs p-2 rounded ${
                          updateSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                        role="alert"
                      >
                        {updateSuccess
                          ? 'Profils mis à jour avec succès'
                          : 'Erreur lors de la mise à jour des profils'}
                      </div>
                    )}
                  </div>
                </nav>
              </div>

              <div className="p-4 border-t border-gray-700">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DESKTOP SIDEBAR - Condition JavaScript STRICTE */}
        {!isMobile && (
          <div
            className={`flex flex-shrink-0 transition-all duration-300 ${
              isSidebarOpen ? 'w-64' : 'w-20'
            }`}
          >
            <div className="flex flex-col w-full">
              <div className="flex flex-col h-0 flex-1 bg-gray-900">
                <div className="flex items-center justify-between h-16 px-4 bg-gray-800">
                  <div className="flex items-center min-w-0">
                    <Shield className="h-8 w-8 text-red-600" />
                    {isSidebarOpen && (
                      <span className="ml-2 text-xl font-bold text-white truncate">Admin SOS</span>
                    )}
                  </div>
                  <button
                    onClick={toggleSidebar}
                    className="text-gray-400 hover:text-white p-2 -m-2 rounded-md"
                    aria-label={isSidebarOpen ? 'Réduire' : 'Étendre'}
                  >
                    <Menu className="h-6 w-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <nav className="px-2 py-4 space-y-1">
                    {adminMenuTree.map((node) => (
                      <SidebarItem key={node.id} node={node} isSidebarCollapsed={!isSidebarOpen} />
                    ))}

                    <div className="px-2 pt-3">
                      <Button
                        onClick={handleUpdateProfiles}
                        loading={isUpdatingProfiles}
                        disabled={isUpdatingProfiles}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <RefreshCw
                          size={16}
                          className={`mr-2 ${isUpdatingProfiles ? 'animate-spin' : ''}`}
                        />
                        {isSidebarOpen ? 'Mettre à jour les profils' : <span className="sr-only">Mettre à jour les profils</span>}
                      </Button>

                      {updateSuccess !== null && isSidebarOpen && (
                        <div
                          className={`mt-2 text-xs p-2 rounded ${
                            updateSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                          role="alert"
                        >
                          {updateSuccess
                            ? 'Profils mis à jour avec succès'
                            : 'Erreur lors de la mise à jour des profils'}
                        </div>
                      )}
                    </div>
                  </nav>
                </div>

                <div className="p-4 border-t border-gray-700">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    {isSidebarOpen ? <span>Déconnexion</span> : <span className="sr-only">Déconnexion</span>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          <header className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
            {isMobile && (
              <button
                onClick={toggleMobileSidebar}
                className="px-4 text-gray-500 hover:bg-gray-50"
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            )}
            <div className="flex-1 px-4 flex justify-between items-center">
              <nav className="flex items-center text-sm">
                <Link
                  to="/"
                  className="text-gray-500 hover:text-gray-700 p-1 -m-1 rounded-md"
                  aria-label="Retour à l'accueil"
                >
                  <Home className="h-5 w-5" />
                </Link>
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-900 font-medium">Administration</span>
              </nav>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700 hidden sm:block">
                  {user.firstName} {user.lastName}
                </span>
                <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center text-white font-medium text-sm">
                  {userInitials}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 relative overflow-y-auto focus:outline-none" role="main">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default AdminLayout;