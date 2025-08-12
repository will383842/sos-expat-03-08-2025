import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import Layout from '../layout/Layout';
import Button from '../common/Button';
import { useTranslation } from 'react-i18next';

interface FirebaseErrorLike {
  code?: string;
  message?: string;
}

interface FormState {
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}

const AuthForm: React.FC = () => {
  // i18n — appelé en haut, sans condition → pas d’erreur de hooks
  const { t } = useTranslation();

  const [formState, setFormState] = useState<FormState>({
    isLoading: false,
    isSuccess: false,
    error: null,
  });

  const [email, setEmail] = useState('');

  const errorMessages = useMemo(
    () => ({
      'auth/invalid-email': t('auth.errors.invalidEmail'),
      'auth/user-not-found': t('auth.errors.userNotFound'),
      'auth/too-many-requests': t('auth.errors.tooManyRequests'),
      'auth/network-request-failed': t('auth.errors.networkError'),
      default: t('auth.errors.generic'),
    }),
    [t]
  );

  const getErrorMessage = useCallback(
    (errorCode?: string): string =>
      (errorCode && (errorMessages as Record<string, string>)[errorCode]) || errorMessages.default,
    [errorMessages]
  );

  const isValidEmail = useCallback((val: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
    return emailRegex.test(val);
  }, []);

  const handlePasswordReset = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const trimmed = email.trim();

      if (!trimmed) {
        setFormState((prev) => ({ ...prev, error: t('auth.errors.emailRequired') }));
        return;
      }

      if (!isValidEmail(trimmed)) {
        setFormState((prev) => ({ ...prev, error: t('auth.errors.emailInvalid') }));
        return;
      }

      setFormState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await sendPasswordResetEmail(auth, trimmed);
        setFormState((prev) => ({ ...prev, isSuccess: true, isLoading: false }));
      } catch (err: unknown) {
        const fb = err as FirebaseErrorLike;
        setFormState((prev) => ({
          ...prev,
          error: getErrorMessage(fb.code),
          isLoading: false,
        }));
      }
    },
    [email, isValidEmail, getErrorMessage, t]
  );

  const ErrorDisplay: React.FC<{ error: string }> = ({ error }) => (
    <div className="bg-red-50 border border-red-200 rounded-md p-3 sm:p-4" role="alert">
      <div className="flex">
        <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" aria-hidden="true" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">{t('common.error')}</h3>
          <div className="mt-2 text-sm text-red-700">{error}</div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1 className="mt-6 text-center text-2xl sm:text-3xl font-bold text-gray-900">
            {t('auth.passwordReset.title')}
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.passwordReset.subtitle')}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-6 px-4 shadow sm:rounded-lg sm:py-8 sm:px-10">
            {formState.isSuccess ? (
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
                </div>
                <h2 className="mt-2 text-lg font-medium text-gray-900">
                  {t('auth.passwordReset.emailSent')}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {t('auth.passwordReset.emailSentDescription', { email })}
                </p>
                <div className="mt-6">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-red-600 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                  >
                    {t('auth.backToLogin')}
                  </Link>
                </div>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handlePasswordReset} noValidate>
                {formState.error && <ErrorDisplay error={formState.error} />}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    {t('auth.email')}
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      autoFocus
                      aria-invalid={formState.error ? 'true' : 'false'}
                      aria-describedby={formState.error ? 'email-error' : undefined}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (formState.error) {
                          setFormState((prev) => ({ ...prev, error: null }));
                        }
                      }}
                      className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 text-base sm:text-sm"
                      placeholder={t('auth.emailPlaceholder')}
                      disabled={formState.isLoading}
                    />
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    loading={formState.isLoading}
                    disabled={!email.trim() || formState.isLoading}
                    fullWidth
                    size="large"
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300"
                  >
                    {t('auth.passwordReset.sendLink')}
                  </Button>
                </div>

                <div className="flex items-center justify-center">
                  <Link
                    to="/login"
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded px-2 py-1"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t('auth.backToLogin')}
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AuthForm;


