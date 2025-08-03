import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorBoundary from '../common/ErrorBoundary';
import { checkUserRole, isUserBanned } from '../../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string | string[];
  fallbackPath?: string;
  showError?: boolean;
}

type AuthState = 'loading' | 'checking' | 'authorized' | 'unauthorized' | 'error' | 'banned';

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children, 
  allowedRoles,
  fallbackPath = '/admin/login',
  showError = false
}) => {
  const { user, isLoading, authInitialized, error: authError } = useAuth();
  const location = useLocation();
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [error, setError] = useState<string | null>(null);

  // Mémoiser la logique de vérification pour éviter les recalculs
  const shouldCheckAuth = useMemo(() => 
    authInitialized && !isLoading && !authError, 
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
      // Vérification ban avec timeout et retry
      const banned = await Promise.race([
        isUserBanned(user.id),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);

      if (banned) {
        setAuthState('banned');
        return;
      }
        
      // Vérification du rôle
      if (allowedRoles) {
        const hasRole = checkUserRole(user, allowedRoles);
        setAuthState(hasRole ? 'authorized' : 'unauthorized');
      } else {
        setAuthState('authorized');
      }
    } catch (err) {
      console.error('Authorization check failed:', err);
      setError(err instanceof Error ? err.message : 'Authorization failed');
      
      // En cas d'erreur réseau, on peut choisir de laisser passer ou bloquer
      // Ici on bloque par sécurité, mais on pourrait avoir un mode dégradé
      setAuthState('error');
    }
  }, [user, allowedRoles]);

  useEffect(() => {
    if (shouldCheckAuth) {
      checkAuthorization();
    } else if (authError) {
      setAuthState('error');
      setError('Authentication failed');
    } else {
      // Si pas shouldCheckAuth et pas d'erreur, alors on est en loading
      setAuthState('loading');
    }
  }, [shouldCheckAuth, checkAuthorization, authError]);

  // Gestion des différents états
  const renderContent = () => {
    switch (authState) {
      case 'loading':
      case 'checking':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <LoadingSpinner size="large" color="blue" />
            <p className="mt-4 text-sm text-gray-600 text-center">
              {authState === 'loading' ? 'Initializing...' : 'Verifying access...'}
            </p>
          </div>
        );

      case 'error':
        if (showError) {
          return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-600 mb-2">Access Error</h2>
                <p className="text-gray-600 mb-4">{error || 'Unable to verify access'}</p>
                <button 
                  onClick={() => checkAuthorization()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          );
        }
        // Fallback: rediriger en cas d'erreur si showError = false
        return (
          <Navigate 
            to={`${fallbackPath}?redirect=${encodeURIComponent(location.pathname)}&error=auth_error`} 
            replace 
          />
        );

      case 'banned':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Account Suspended</h2>
              <p className="text-gray-600">Your account has been suspended. Please contact support.</p>
            </div>
          </div>
        );

      case 'unauthorized':
        return (
          <Navigate 
            to={`${fallbackPath}?redirect=${encodeURIComponent(location.pathname)}`} 
            replace 
          />
        );

      case 'authorized':
        return <>{children}</>;

      default:
        return (
          <Navigate 
            to={`${fallbackPath}?redirect=${encodeURIComponent(location.pathname)}&error=unknown`} 
            replace 
          />
        );
    }
  };

  return (
    <ErrorBoundary>
      {renderContent()}
    </ErrorBoundary>
  );
};

export default ProtectedRoute;