// src/pages/Register.tsx
import React, { useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Scale, Users, UserCheck, ArrowRight, Star, Shield, Clock } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';

/* ============ Safe gtag (no any) ============ */
type GtagFunction = (...args: unknown[]) => void;
interface GtagWindow { gtag?: GtagFunction }
const getGtag = (): GtagFunction | undefined =>
  (typeof window !== 'undefined' ? (window as unknown as GtagWindow).gtag : undefined);

/* ============ i18n léger (FR/EN) ============ */
const useTranslation = () => {
  const { language } = useApp();
  const lang = (language as 'fr' | 'en') || 'fr';

  const dict: Record<string, Record<'fr' | 'en', string>> = {
    // Meta
    'meta.title': {
      fr: "Inscription - SOS Expats | Choisissez votre profil",
      en: 'Sign up - SOS Expats | Choose your profile',
    },
    'meta.description': {
      fr: "Rejoignez SOS Expats : choisissez un profil (Client, Avocat, Expatrie) pour acceder a nos services. 24/7, multi-langues.",
      en: 'Join SOS Expats: choose a profile (Client, Lawyer, Expat) to access our services. 24/7, multilingual.',
    },
    'og.title': {
      fr: 'Inscription SOS Expats - Choisissez votre profil',
      en: 'SOS Expats Sign up - Choose your profile',
    },
    'og.description': {
      fr: 'Plateforme d\'assistance aux expatries et conseils juridiques. 24/7.',
      en: 'Expat assistance & legal advisory platform. 24/7.',
    },

    // Header
    'register.title': { fr: 'Choisissez votre profil', en: 'Choose your profile' },
    'register.subtitle': { fr: 'Rejoignez notre communaute', en: 'Join our community' },
    'register.description': {
      fr: 'Choisissez votre profil pour vous inscrire sur la plateforme',
      en: 'Choose your profile to register on the platform',
    },
    'register.loginPrompt': {
      fr: 'connectez-vous a votre compte existant',
      en: 'sign in to your existing account',
    },
    'register.bookingMessage': {
      fr: 'Apres inscription, vous serez redirige pour finaliser votre reservation',
      en: 'After sign-up, you\'ll be redirected to finish your booking',
    },
    'register.needHelp': { fr: "Besoin d'aide ? ", en: 'Need help? ' },
    'register.contactUs': { fr: 'Contactez-nous', en: 'Contact us' },
    'register.termsAccept': { fr: 'En vous inscrivant, vous acceptez nos', en: 'By signing up, you agree to our' },
    'register.termsLink': { fr: "conditions d'utilisation", en: 'terms of use' },
    'register.secureData': { fr: 'Donnees securisees', en: 'Secure data' },
    'register.freeRegistration': { fr: 'Inscription gratuite', en: 'Free registration' },

    // Role titles/descriptions
    'role.client': { fr: 'Client', en: 'Client' },
    'role.lawyer': { fr: 'Avocat', en: 'Lawyer' },
    'role.expat':  { fr: 'Expatrié', en: 'Expat' },

    'role.client.desc': {
      fr: "Conseils et experts dans toutes les langues, dans le monde entier",
      en: 'Advice and experts in all languages, worldwide',
    },
    'role.lawyer.desc': {
      fr: 'Expert juridique international, toutes nationalités',
      en: 'International legal expert, all nationalities',
    },
    'role.expat.desc': {
      fr: "Partagez votre experience d'expatriation",
      en: 'Share your expatriation know-how',
    },

    // Role micro-CTA (revenus)
    'role.lawyer.cta': {
      fr: "Offrez vos conseils juridiques a des expatriés, voyageurs, vacanciers ou que vous soyez dans le monde et developpez votre chiffre d'affaires.",
      en: "Offer your legal expertise to expats, travelers, vacationers wherever you are in the world and grow your income.",
    },
    'role.expat.cta': {
      fr: "Aidez par telephone des expatriés, voyageurs, vacanciers ou que vous soyez dans le monde et gagnez des revenus.",
      en: "Help expats, travelers, vacationers by phone wherever you are in the world and earn income.",
    },

    // Role features
    'role.client.f1': { fr: 'Experts dans toutes les langues',    en: 'Experts in all languages' },
    'role.client.f2': { fr: 'Disponible 24/7 partout',             en: 'Available 24/7 worldwide' },
    'role.client.f3': { fr: 'Conseils juridiques rapides',         en: 'Fast legal guidance' },

    'role.lawyer.f1': { fr: 'Clients internationaux',              en: 'International clients' },
    'role.lawyer.f2': { fr: 'Consultations multilingues',          en: 'Multilingual consultations' },
    'role.lawyer.f3': { fr: 'Revenus flexibles',                   en: 'Flexible income' },

    'role.expat.f1':  { fr: 'Aide pratique terrain',               en: 'Hands-on help' },
    'role.expat.f2':  { fr: "Partage d'experience",                en: 'Experience sharing' },
    'role.expat.f3':  { fr: "Revenus d'entraide",                  en: 'Support-based earnings' },

    // Top badges (2)
    'badge.24_7': { fr: 'Disponible 24/7', en: 'Available 24/7' },
    'badge.multi': { fr: 'Multi-langues',  en: 'Multilingual'   },
  };

  const t = (key: string) => dict[key]?.[lang] ?? dict[key]?.fr ?? key;
  return { t, language: lang };
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { t, language } = useTranslation();

  const redirectUrl = searchParams.get('redirect');
  const encodedRedirectUrl = encodeURIComponent(redirectUrl || '/dashboard');

  const handleRoleSelect = useCallback(
    (role: 'client' | 'lawyer' | 'expat') => {
      const registerUrl = redirectUrl ? `/register/${role}?redirect=${encodedRedirectUrl}` : `/register/${role}`;
      // Analytics non bloquant
      const gtag = getGtag();
      if (gtag) gtag('event', 'register_role_select', { role, redirect: !!redirectUrl });
      navigate(registerUrl, { state: location.state });
    },
    [redirectUrl, encodedRedirectUrl, navigate, location.state]
  );

  const navigateToLogin = useCallback(() => {
    const loginUrl = redirectUrl ? `/login?redirect=${encodedRedirectUrl}` : '/login';
    navigate(loginUrl, { state: location.state });
  }, [redirectUrl, encodedRedirectUrl, navigate, location.state]);

  /* ============ Styles par rôle, avec FOND PASTEL ============ */
  const roles = useMemo(
    () => [
      {
        id: 'client' as const,
        title: t('role.client'),
        description: t('role.client.desc'),
        icon: UserCheck,
        border: 'border-blue-300',
        bg: 'bg-blue-50',
        iconWrap: 'from-blue-100 to-blue-200',
        iconColor: 'text-blue-600',
        dot: 'bg-blue-400',
        chipBg: 'bg-blue-100',
        chipText: 'text-blue-800',
        features: [t('role.client.f1'), t('role.client.f2'), t('role.client.f3')],
        cta: '', // pas de micro-CTA revenus pour Client
      },
      {
        id: 'lawyer' as const,
        title: t('role.lawyer'),
        description: t('role.lawyer.desc'),
        icon: Scale,
        border: 'border-purple-300',
        bg: 'bg-purple-50',
        iconWrap: 'from-purple-100 to-pink-100',
        iconColor: 'text-purple-600',
        dot: 'bg-purple-400',
        chipBg: 'bg-purple-100',
        chipText: 'text-purple-800',
        features: [t('role.lawyer.f1'), t('role.lawyer.f2'), t('role.lawyer.f3')],
        cta: t('role.lawyer.cta'),
      },
      {
        id: 'expat' as const,
        title: t('role.expat'),
        description: t('role.expat.desc'),
        icon: Users,
        border: 'border-emerald-300',
        bg: 'bg-emerald-50',
        iconWrap: 'from-emerald-100 to-green-100',
        iconColor: 'text-emerald-600',
        dot: 'bg-emerald-400',
        chipBg: 'bg-emerald-100',
        chipText: 'text-emerald-800',
        features: [t('role.expat.f1'), t('role.expat.f2'), t('role.expat.f3')],
        cta: t('role.expat.cta'),
      },
    ],
    [t]
  );

  /* ============ SEO & Social (i18n) ============ */
  useEffect(() => {
    const originalTitle = document.title;
    document.title = t('meta.title');

    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
      return el;
    };

    // Basics
    setMeta('description', t('meta.description'));
    setMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('language', language);
    // OpenGraph + Twitter
    setMeta('og:type', 'website', true);
    setMeta('og:title', t('og.title'), true);
    setMeta('og:description', t('og.description'), true);
    setMeta('og:url', window.location.href, true);
    setMeta('og:site_name', 'SOS Expats', true);
    setMeta('og:locale', language === 'en' ? 'en_US' : 'fr_FR', true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', t('og.title'));
    setMeta('twitter:description', t('og.description'));

    // Canonical + alternates
    const currentLangPath = language === 'en' ? 'en' : 'fr';
    const canonicalUrl = `${window.location.origin}/${currentLangPath}/register`;
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    // remove previous alternates
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(n => n.parentElement?.removeChild(n));
    const alternates: Record<string, string> = {
      fr: `${window.location.origin}/fr/register`,
      en: `${window.location.origin}/en/register`,
    };
    Object.entries(alternates).forEach(([langKey, url]) => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = langKey;
      link.href = url;
      document.head.appendChild(link);
    });
    const xDefault = document.createElement('link');
    xDefault.rel = 'alternate';
    xDefault.hreflang = 'x-default';
    xDefault.href = alternates.fr;
    document.head.appendChild(xDefault);

    // JSON-LD (IA-friendly)
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${canonicalUrl}#webpage`,
      name: t('meta.title'),
      description: t('meta.description'),
      url: canonicalUrl,
      inLanguage: language,
      isPartOf: { '@type': 'WebSite', '@id': `${window.location.origin}#website`, name: 'SOS Expats', url: window.location.origin },
      mainEntity: {
        '@type': 'Thing',
        name: t('register.title'),
        description: t('register.description'),
      },
      potentialAction: {
        '@type': 'RegisterAction',
        target: { '@type': 'EntryPoint', urlTemplate: canonicalUrl, actionPlatform: ['MobileWebApp', 'DesktopWebBrowser'] },
      },
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'structured-data-register';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // simple perf beacon
    const gtag = getGtag();
    if (gtag) gtag('event', 'register_page_view', { lang: language });

    return () => {
      document.title = originalTitle;
      document.getElementById('structured-data-register')?.remove();
    };
  }, [t, language]);

  return (
    <Layout>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex flex-col justify-center py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="sm:mx-auto sm:w-full sm:max-w-lg">
          <h1 className="mt-6 text-center text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight tracking-tight">
            {t('register.title')}
          </h1>

          <p className="mt-4 text-center text-sm sm:text-base text-gray-600 leading-relaxed max-w-md mx-auto">
            {language === 'fr' ? 'Ou ' : 'Or '}{' '}
            <button
              onClick={navigateToLogin}
              className="font-semibold text-red-600 hover:text-red-500 underline underline-offset-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-sm touch-manipulation"
              aria-label={language === 'fr' ? 'Se connecter à votre compte existant' : 'Sign in to your existing account'}
            >
              {t('register.loginPrompt')}
            </button>
          </p>

          {redirectUrl && redirectUrl.includes('/booking-request/') && (
            <div
              className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl shadow-sm"
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-start justify-center space-x-3">
                <Star className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <p className="text-sm text-blue-800 font-medium leading-relaxed text-center">{t('register.bookingMessage')}</p>
              </div>
            </div>
          )}
        </header>

        {/* Badges globaux (2) */}
        <div className="sm:mx-auto sm:w-full sm:max-w-xl mt-6">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
              <Clock className="w-3.5 h-3.5" /> {t('badge.24_7')}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
              <Users className="w-3.5 h-3.5" /> {t('badge.multi')}
            </span>
          </div>
        </div>

        {/* Cards */}
        <section className="mt-6 sm:mt-10 sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="bg-white/80 backdrop-blur-sm py-6 px-4 sm:py-8 sm:px-8 shadow-2xl rounded-2xl sm:rounded-3xl border border-gray-100">
            {/* Intro */}
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">{t('register.subtitle')}</h2>
              <p className="text-gray-600 text-sm leading-relaxed max-w-sm mx-auto">{t('register.description')}</p>
            </div>

            {/* Role cards — FOND PASTEL par carte */}
            <div className="space-y-4">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <article key={role.id} className="group relative">
                    <button
                      onClick={() => handleRoleSelect(role.id)}
                      className={[
                        'w-full text-left border-2 rounded-xl overflow-hidden',
                        'transition-all duration-300 hover:shadow-lg hover:scale-[1.005] active:scale-[0.99]',
                        'focus:outline-none focus:ring-4 focus:ring-black/5',
                        role.border,
                        role.bg,
                      ].join(' ')}
                      aria-label={`${language === 'fr' ? "S'inscrire en tant que" : 'Sign up as'} ${role.title}. ${role.description}`}
                    >
                      <div className="p-4 sm:p-6 flex items-center gap-4">
                        {/* Icône sur fond doux */}
                        <div className={`flex-shrink-0 p-3 sm:p-4 rounded-xl shadow-inner bg-gradient-to-br ${role.iconWrap}`}>
                          <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${role.iconColor}`} aria-hidden="true" />
                        </div>

                        {/* Texte */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-gray-900 text-lg sm:text-xl mb-0.5 text-center">{role.title}</h3>

                          {/* Description principale */}
                          <p className="text-xs sm:text-sm text-gray-800 leading-snug mb-2 line-clamp-2 break-words hyphens-none">
                            {role.description}
                          </p>

                          {/* Micro-CTA revenus (uniquement Avocat/Expatrié) */}
                          {role.cta && (
                            <p className="text-[11px] sm:text-xs text-gray-700 mb-2">
                              {role.cta}
                            </p>
                          )}

                          {/* Features — desktop list */}
                          <ul className="hidden sm:grid sm:grid-cols-3 sm:gap-2">
                            {role.features.map((f, idx) => (
                              <li key={idx} className="flex items-center text-xs text-gray-700">
                                <span className={`mr-2 inline-block w-1.5 h-1.5 rounded-full ${role.dot}`} />
                                <span className="truncate">{f}</span>
                              </li>
                            ))}
                          </ul>

                          {/* Features — mobile chips */}
                          <div className="sm:hidden flex flex-wrap gap-1.5">
                            {role.features.slice(0, 2).map((f, idx) => (
                              <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${role.chipBg} ${role.chipText} border-black/10`}>
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Flèche */}
                        <div className="ml-2 sm:ml-4 flex-shrink-0">
                          <ArrowRight size={20} className="text-gray-700 group-hover:translate-x-1 transition-transform duration-300" aria-hidden="true" />
                        </div>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>

            {/* Footer infos légales */}
            <footer className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-200">
              <div className="text-center space-y-3 sm:space-y-4">
                <p className="text-xs text-gray-600 leading-relaxed">
                  {t('register.termsAccept')}{' '}
                  <Link
                    to="/cgu-clients"
                    className="text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm"
                    rel="noopener"
                  >
                    {t('register.termsLink')}
                  </Link>
                </p>

                <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-green-500" aria-hidden="true" />
                    {t('register.secureData')}
                  </span>
                  <span className="w-px h-4 bg-gray-300" aria-hidden="true" />
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />
                    {t('register.freeRegistration')}
                  </span>
                </div>
              </div>
            </footer>
          </div>
        </section>

        {/* Help → lien vers /contact */}
        <aside className="mt-8 text-center">
          <p className="text-sm text-gray-600 leading-relaxed">
            {t('register.needHelp')}
            <Link
              to="/contact"
              className="text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm"
            >
              {t('register.contactUs')}
            </Link>
          </p>
        </aside>
      </main>
    </Layout>
  );
};

export default Register;