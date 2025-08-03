import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithGoogle, isLoading, error, user, authInitialized } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Obtenir l'URL de redirection une seule fois
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  // Gérer la redirection après connexion
  useEffect(() => {
    if (authInitialized && user) {
      console.log("Login - User already logged in, redirecting");
      
      // Gérer la redirection avec les données sauvegardées
      const savedProvider = sessionStorage.getItem('selectedProvider');
      const finalUrl = savedProvider && redirectUrl.includes('/booking-request/') 
        ? decodeURIComponent(redirectUrl)
        : decodeURIComponent(redirectUrl);
      
      // Utiliser setTimeout pour éviter les problèmes de rendu
      setTimeout(() => navigate(finalUrl, { replace: true }), 0);
    }
  }, [authInitialized, user, navigate, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(email, password);
      // La redirection sera gérée par l'useEffect
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      // La redirection sera gérée par l'useEffect
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  // Afficher le loader pendant le chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" color="red" />
      </div>
    );
  }

  const encodedRedirectUrl = encodeURIComponent(redirectUrl);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Connexion à votre compte
          </h2>
          
          <p className="mt-2 text-center text-sm text-gray-600">
            Ou{' '}
            <Link to={`/register?redirect=${encodedRedirectUrl}`} className="font-medium text-red-600 hover:text-red-500">
              créez un nouveau compte
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Erreur de connexion
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        {error}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Adresse email
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="votre@email.com"
                  />
                  <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Votre mot de passe"
                  />
                  <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Se souvenir de moi
                  </label>
                </div>

                <div className="text-sm">
                  <Link to="/password-reset" className="font-medium text-red-600 hover:text-red-500">
                    Mot de passe oublié ?
                  </Link>
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  loading={isLoading}
                  fullWidth
                  size="large"
                  className="bg-red-600 hover:bg-red-700"
                  disabled={!email || !password}
                >
                  <LogIn size={20} className="mr-2" />
                  Se connecter
                </Button>
              </div>

              <div className="mt-4">
                <Button
                  type="button"
                  onClick={handleGoogleLogin}
                  loading={isLoading}
                  fullWidth
                  size="large"
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Continuer avec Google
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Nouveau sur SOS Expats ?{' '}
                <Link to={`/register?redirect=${encodedRedirectUrl}`} className="font-medium text-red-600 hover:text-red-500">
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Login;