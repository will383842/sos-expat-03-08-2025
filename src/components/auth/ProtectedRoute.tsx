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
  fallbackPath?: string; // Peut être surchargé par l'appelant
  showError?: boolean;
}

type AuthState = 'loading' | 'checking' | 'authorized' | 'unauthorized' | 'error' | 'banned';

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallbackPath,
  showError = false,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, isLoading, authInitialized, error: authError } = useAuth();

  const [authState, setAuthState] = useState<AuthState>('loading');
  const [error, setError] = useState<string | null>(null);

  // ⚠️ Fallback robuste : admin → /admin/login, sinon → /login
  const computedFallbackPath = useMemo(() => {
    if (fallbackPath) return fallbackPath;

    const isAdminRoute =
      (Array.isArray(allowedRoles) ? allowedRoles.includes('admin') : allowedRoles === 'admin') ||
      location.pathname.startsWith('/admin');

    return isAdminRoute ? '/admin/login' : '/login';
  }, [fallbackPath, allowedRoles, location.pathname]);

  const shouldCheckAuth = useMemo(
    () => authInitialized && !isLoading && !authError,
    [authInitialized, isLoading, authError]
  );

  const checkAuthorization = useCallback(async () => {
    if (!user) {
      setAuthState('unauthorized');
      return;
    }

    setAuthState('checking');
    setError(null);

    try {
      // Timeout anti-latence sur le check de ban
      const banned = await Promise.race([
        isUserBanned(user.id),
        new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
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
      // eslint-disable-next-line no-console
      console.error('Authorization check failed:', err);
      setError(err instanceof Error ? err.message : 'Authorization failed');
      setAuthState('error');
    }
  }, [user, allowedRoles]);

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

  const fullPath = useMemo(
    () => location.pathname + location.search + location.hash,
    [location]
  );

  const renderContent = () => {
    switch (authState) {
      case 'loading':
      case 'checking':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <LoadingSpinner size="large" color="blue" />
            <p className="mt-4 text-sm text-gray-600 text-center">
              {authState === 'loading' ? t('auth.initializing') : t('auth.verifyingAccess')}
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
            to={`${computedFallbackPath}?redirect=${encodeURIComponent(fullPath)}&error=auth_error`}
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
            to={`${computedFallbackPath}?redirect=${encodeURIComponent(fullPath)}`}
            replace
          />
        );

      case 'authorized':
        return <>{children}</>;

      default:
        return (
          <Navigate
            to={`${computedFallbackPath}?redirect=${encodeURIComponent(fullPath)}&error=unknown`}
            replace
          />
        );
    }
  };

  return <ErrorBoundary>{renderContent()}</ErrorBoundary>;
};

export default ProtectedRoute;
