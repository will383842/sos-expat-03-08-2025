import React, { ReactNode, useState, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  Phone, 
  FileText, 
  CreditCard, 
  Settings, 
  Shield, 
  LogOut, 
  Menu, 
  X, 
  Home,
  Star,
  Globe,
  AlertTriangle,
  Database,
  Tag,
  BookOpen,
  RefreshCw,
  Bell
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';
import ErrorBoundary from '../common/ErrorBoundary';
import { logError } from '../../utils/logging';
import { Mail } from 'lucide-react';
interface AdminLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ariaLabel?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isUpdatingProfiles, setIsUpdatingProfiles] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<boolean | null>(null);

  // ✅ Tous les hooks AVANT les conditions
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/admin-login');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Erreur de déconnexion:', error);
      logError({
        origin: 'frontend',
        error: `Erreur de déconnexion admin: ${errorMessage}`,
        context: { component: 'AdminLayout', userId: user?.id }
      });
    }
  }, [logout, navigate, user?.id]);

  const handleUpdateProfiles = useCallback(async () => {
    const confirmMessage = 'Êtes-vous sûr de vouloir mettre à jour tous les profils existants avec les nouveaux champs ? Cette opération peut prendre du temps.';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsUpdatingProfiles(true);
    setUpdateSuccess(null);
    
    try {
      // Double vérification de sécurité
      if (user?.role !== 'admin') {
        throw new Error('Permissions insuffisantes');
      }
      
      const { updateExistingProfiles } = await import('../../utils/firestore');
      if (typeof updateExistingProfiles !== 'function') {
        throw new Error('Fonction de mise à jour non disponible');
      }
      
      const success = await updateExistingProfiles();
      setUpdateSuccess(success);
      
      // Auto-clear le message après 5 secondes
      setTimeout(() => setUpdateSuccess(null), 5000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Erreur lors de la mise à jour des profils:', error);
      logError({
        origin: 'frontend',
        error: `Erreur mise à jour profils: ${errorMessage}`,
        context: { component: 'AdminLayout', userId: user?.id }
      });
      setUpdateSuccess(false);
      
      // Auto-clear le message d'erreur après 5 secondes
      setTimeout(() => setUpdateSuccess(null), 5000);
    } finally {
      setIsUpdatingProfiles(false);
    }
  }, [user?.id, user?.role]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  // Configuration du menu avec i18n-ready
  const menuItems: MenuItem[] = useMemo(() => [
    { path: '/admin/dashboard', label: 'Tableau de bord', icon: BarChart3, ariaLabel: 'Accéder au tableau de bord' },
    { path: '/admin/users', label: 'Utilisateurs', icon: Users, ariaLabel: 'Gérer les utilisateurs' },
    { path: '/admin/aaa-profiles', label: 'Faux profils', icon: Shield, ariaLabel: 'Gérer les faux profils' },
    { path: '/admin/approvals', label: 'Validations', icon: Shield, ariaLabel: 'Gérer les validations' },
    { path: '/admin/calls', label: 'Appels', icon: Phone, ariaLabel: 'Gérer les appels' },
    { path: '/admin/payments', label: 'Paiements', icon: CreditCard, ariaLabel: 'Gérer les paiements' },
    { path: '/admin/reviews', label: 'Avis', icon: Star, ariaLabel: 'Gérer les avis' },
    { path: '/admin/contact-messages', label: 'Messages de contact', icon: Mail, ariaLabel: 'Gérer les messages contacts' },
    { path: '/admin/promo-codes', label: 'Codes Promo', icon: Tag, ariaLabel: 'Gérer les codes promo' },
    { path: '/admin/documents', label: 'Documents', icon: FileText, ariaLabel: 'Gérer les documents' },
    { path: '/admin/countries', label: 'Pays', icon: Globe, ariaLabel: 'Gérer les pays' },
    { path: '/admin/reports', label: 'Signalements', icon: AlertTriangle, ariaLabel: 'Gérer les signalements' },
    { path: '/admin/backups', label: 'Sauvegardes', icon: Database, ariaLabel: 'Gérer les sauvegardes' },
    { path: '/admin/settings', label: 'Paramètres', icon: Settings, ariaLabel: 'Accéder aux paramètres' },
    { path: '/admin/legal-documents', label: 'Documents légaux', icon: BookOpen, ariaLabel: 'Gérer les documents légaux' },
    { path: '/admin/notifications', label: 'Notifications', icon: Bell, ariaLabel: 'Gérer les notifications' },
  ], []);

  const renderMenuItem = useCallback((item: MenuItem, isMobile = false) => {
    const Icon = item.icon;
    const isItemActive = isActive(item.path);
    
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
          isItemActive
            ? 'bg-gray-800 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
        onClick={isMobile ? closeMobileSidebar : undefined}
        aria-label={item.ariaLabel || item.label}
        aria-current={isItemActive ? 'page' : undefined}
      >
        <Icon className="h-5 w-5 mr-3 flex-shrink-0" aria-hidden="true" />
        {(isMobile || isSidebarOpen) && (
          <span className="truncate">{item.label}</span>
        )}
      </Link>
    );
  }, [isActive, isSidebarOpen, closeMobileSidebar]);

  const renderUpdateProfilesButton = useCallback((isMobile = false) => (
    <div className="px-4 py-3">
      <Button
        onClick={handleUpdateProfiles}
        loading={isUpdatingProfiles}
        disabled={isUpdatingProfiles}
        className="w-full bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white transition-colors duration-200"
        aria-label="Mettre à jour tous les profils existants"
      >
        <RefreshCw 
          size={16} 
          className={`mr-2 ${isUpdatingProfiles ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        {(isMobile || isSidebarOpen) && 'Mettre à jour les profils'}
      </Button>
      
      {updateSuccess !== null && (
        <div 
          className={`mt-2 text-xs p-2 rounded transition-colors duration-200 ${
            updateSuccess 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}
          role="alert"
          aria-live="polite"
        >
          {updateSuccess 
            ? 'Profils mis à jour avec succès' 
            : 'Erreur lors de la mise à jour des profils'}
        </div>
      )}
    </div>
  ), [handleUpdateProfiles, isUpdatingProfiles, updateSuccess, isSidebarOpen]);

  const userInitials = useMemo(() => {
    return `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  }, [user?.firstName, user?.lastName]);

  // ✅ Vérifications de sécurité APRÈS tous les hooks
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <Shield className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Accès refusé
          </h1>
          <p className="text-gray-600 mb-4">
            Vous devez être administrateur pour accéder à cette page.
          </p>
          <Button onClick={() => navigate('/')}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  // Vérification si l'utilisateur est banni ou non vérifié
  if (user.status === 'banned' || user.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertTriangle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Compte {user.status === 'banned' ? 'suspendu' : 'en attente'}
          </h1>
          <p className="text-gray-600 mb-4">
            {user.status === 'banned' 
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
      onError={(error, errorInfo) => {
        logError({
          origin: 'frontend',
          error: `AdminLayout error: ${error.message}`,
          context: { 
            component: 'AdminLayout', 
            componentStack: errorInfo.componentStack,
            userId: user?.id 
          }
        });
      }}
    >
      <div className="h-screen flex overflow-hidden bg-gray-100">
        {/* Mobile sidebar */}
        <div className="lg:hidden">
          {isMobileSidebarOpen && (
            <div className="fixed inset-0 flex z-40">
              {/* Overlay */}
              <div 
                className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity"
                onClick={closeMobileSidebar}
                aria-hidden="true"
              />

              {/* Sidebar */}
              <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-900 transform transition-transform duration-300 ease-in-out">
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-4 bg-gray-800">
                  <div className="flex items-center">
                    <Shield className="h-8 w-8 text-red-600 flex-shrink-0" aria-hidden="true" />
                    <span className="ml-2 text-xl font-bold text-white">Admin SOS</span>
                  </div>
                  <button
                    onClick={closeMobileSidebar}
                    className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white p-2 -m-2 rounded-md transition-colors duration-200"
                    aria-label="Fermer le menu de navigation"
                  >
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto">
                  <nav className="px-2 py-4 space-y-1" role="navigation" aria-label="Menu principal">
                    {menuItems.map(item => renderMenuItem(item, true))}
                    {renderUpdateProfilesButton(true)}
                  </nav>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors duration-200"
                    aria-label="Se déconnecter de l'administration"
                  >
                    <LogOut className="h-5 w-5 mr-3 flex-shrink-0" aria-hidden="true" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        <div className={`hidden lg:flex lg:flex-shrink-0 transition-all duration-300 ${
          isSidebarOpen ? 'lg:w-64' : 'lg:w-20'
        }`}>
          <div className="flex flex-col w-full">
            <div className="flex flex-col h-0 flex-1 bg-gray-900">
              {/* Header */}
              <div className="flex items-center justify-between h-16 px-4 bg-gray-800">
                <div className="flex items-center min-w-0">
                  <Shield className="h-8 w-8 text-red-600 flex-shrink-0" aria-hidden="true" />
                  {isSidebarOpen && (
                    <span className="ml-2 text-xl font-bold text-white truncate">
                      Admin SOS
                    </span>
                  )}
                </div>
                <button
                  onClick={toggleSidebar}
                  className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white p-2 -m-2 rounded-md transition-colors duration-200"
                  aria-label={isSidebarOpen ? 'Réduire la barre latérale' : 'Étendre la barre latérale'}
                >
                  <Menu className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto">
                <nav className="px-2 py-4 space-y-1" role="navigation" aria-label="Menu principal">
                  {menuItems.map(item => renderMenuItem(item))}
                  {renderUpdateProfilesButton()}
                </nav>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-700">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors duration-200"
                  aria-label="Se déconnecter de l'administration"
                >
                  <LogOut className="h-5 w-5 mr-3 flex-shrink-0" aria-hidden="true" />
                  {isSidebarOpen && <span>Déconnexion</span>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          {/* Top bar */}
          <header className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
            <button
              onClick={toggleMobileSidebar}
              className="lg:hidden px-4 text-gray-500 focus:outline-none focus:bg-gray-100 focus:text-gray-600 hover:bg-gray-50 transition-colors duration-200"
              aria-label="Ouvrir le menu de navigation"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>

            <div className="flex-1 px-4 flex justify-between items-center">
              {/* Breadcrumb */}
              <nav className="flex items-center text-sm" aria-label="Fil d'Ariane">
                <Link 
                  to="/" 
                  className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md p-1 -m-1 transition-colors duration-200"
                  aria-label="Retour à l'accueil"
                >
                  <Home className="h-5 w-5" aria-hidden="true" />
                </Link>
                <span className="mx-2 text-gray-400" aria-hidden="true">/</span>
                <span className="text-gray-900 font-medium">Administration</span>
              </nav>

              {/* User info */}
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700 hidden sm:block">
                  {user.firstName} {user.lastName}
                </span>
                <div 
                  className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                  aria-label={`Profil de ${user.firstName} ${user.lastName}`}
                >
                  {userInitials}
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none" role="main">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default AdminLayout;

