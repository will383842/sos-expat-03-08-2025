import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorBoundary from '../common/ErrorBoundary';
import { checkUserRole, isUserBanned } from '../../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string | string[];
  fallbackPath?: string; // Si non fourni, auto en fonction de la langue
  showError?: boolean;
}

type AuthState = 'loading' | 'checking' | 'authorized' | 'unauthorized' | 'error' | 'banned';

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallbackPath,
  showError = false
}) => {
  const { t, i18n } = useTranslation();
  const { user, isLoading, authInitialized, error: authError } = useAuth();
  const location = useLocation();

  const [authState, setAuthState] = useState<AuthState>('loading');
  const [error, setError] = useState<string | null>(null);

  // Langue courante (SSR-safe)
  const lang = useMemo(() => {
    if (typeof window === 'undefined') return 'en';
    return i18n.language || navigator.language.split('-')[0] || 'en';
  }, [i18n.language]);

  // Chemin de fallback localisé
  const localizedFallbackPath = useMemo(() => {
    if (fallbackPath) return fallbackPath;
    return `/${lang}/admin/login`;
  }, [fallbackPath, lang]);

  // Détermine si on peut vérifier l'auth
  const shouldCheckAuth = useMemo(
    () => authInitialized && !isLoading && !authError,
    [authInitialized, isLoading, authError]
  );

  // Vérifie si utilisateur est autorisé
  const checkAuthorization = useCallback(async () => {
    if (!user) {
      setAuthState('unauthorized');
      return;
    }

    setAuthState('checking');
    setError(null);

    try {
      // Timeout anti-latence
      const banned = await Promise.race([
        isUserBanned(user.id),
        new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      if (banned) {
        setAuthState('banned');
        return;
      }

      if (allowedRoles) {
        const hasRole = checkUserRole(user, allowedRoles);
        setAuthState(hasRole ? 'authorized' : 'unauthorized');
      } else {
        setAuthState('authorized');
      }
    } catch (err) {
      console.error('Authorization check failed:', err);
      setError(err instanceof Error ? err.message : 'Authorization failed');
      setAuthState('error');
    }
  }, [user, allowedRoles]);

  // Déclenche la vérification
  useEffect(() => {
    if (shouldCheckAuth) {
      checkAuthorization();
    } else if (authError) {
      setAuthState('error');
      setError(t('auth.failed'));
    } else {
      setAuthState('loading');
    }
  }, [shouldCheckAuth, checkAuthorization, authError, t]);

  // Conserve tout le chemin + query + hash pour redirect après login
  const fullPath = useMemo(() => {
    return location.pathname + location.search + location.hash;
  }, [location]);

  // Rendu selon état
  const renderContent = () => {
    switch (authState) {
      case 'loading':
      case 'checking':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <LoadingSpinner size="large" color="blue" />
            <p className="mt-4 text-sm text-gray-600 text-center">
              {authState === 'loading'
                ? t('auth.initializing')
                : t('auth.verifyingAccess')}
            </p>
          </div>
        );

      case 'error':
        if (showError) {
          return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-600 mb-2">{t('auth.accessError')}</h2>
                <p className="text-gray-600 mb-4">{error || t('auth.unableVerify')}</p>
                <button
                  onClick={() => checkAuthorization()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  {t('common.retry')}
                </button>
              </div>
            </div>
          );
        }
        return (
          <Navigate
            to={`${localizedFallbackPath}?redirect=${encodeURIComponent(fullPath)}&error=auth_error`}
            replace
          />
        );

      case 'banned':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">{t('auth.accountSuspended')}</h2>
              <p className="text-gray-600">{t('auth.contactSupport')}</p>
            </div>
          </div>
        );

      case 'unauthorized':
        return (
          <Navigate
            to={`${localizedFallbackPath}?redirect=${encodeURIComponent(fullPath)}`}
            replace
          />
        );

      case 'authorized':
        return <>{children}</>;

      default:
        return (
          <Navigate
            to={`${localizedFallbackPath}?redirect=${encodeURIComponent(fullPath)}&error=unknown`}
            replace
          />
        );
    }
  };

  return <ErrorBoundary>{renderContent()}</ErrorBoundary>;
};

export default ProtectedRoute;
