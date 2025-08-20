// App.tsx
import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { useDeviceDetection } from './hooks/useDeviceDetection';
import { registerSW, measurePerformance } from './utils/performance';
import LoadingSpinner from './components/common/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoutesV2 from '@/components/admin/AdminRoutesV2';
import './App.css';

// --------------------------------------------
// Types
// --------------------------------------------
interface RouteConfig {
  path: string;
  component:
    | React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>
    | React.ComponentType<Record<string, unknown>>;
  protected?: boolean;
  role?: string;
  alias?: string;
  preload?: boolean;
}

// --------------------------------------------
// Lazy pages
// --------------------------------------------

// Accueil
const Home = lazy(() => import('./pages/Home'));

// Auth
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const RegisterExpat = lazy(() => import('./pages/RegisterExpat'));
const RegisterLawyer = lazy(() => import('./pages/RegisterLawyer'));
const RegisterClient = lazy(() => import('./pages/RegisterClient'));
const PasswordReset = lazy(() => import('./pages/PasswordReset'));

// Utilisateur
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProfileEdit = lazy(() => import('./pages/ProfileEdit'));
const DashboardMessages = lazy(() => import('@/components/dashboard/DashboardMessages'));

// Services
const SOSCall = lazy(() => import('./pages/SOSCall'));
const ExpatCall = lazy(() => import('./pages/ExpatCall'));
const CallCheckout = lazy(() => import('./pages/CallCheckout'));
const Checkout = lazy(() => import('./pages/Checkout'));
const BookingRequest = lazy(() => import('./pages/BookingRequest'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const ProviderProfile = lazy(() => import('./pages/ProviderProfile'));
const Providers = lazy(() => import('./pages/Providers'));
const Pricing = lazy(() => import('./pages/Pricing'));

// Pages d'info
const SEO = lazy(() => import('./pages/SEO'));
const ServiceStatus = lazy(() => import('./pages/ServiceStatus'));
const Consumers = lazy(() => import('./pages/Consumers'));
const Cookies = lazy(() => import('./pages/Cookies'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsExpats = lazy(() => import('./pages/TermsExpats'));
const TermsLawyers = lazy(() => import('./pages/TermsLawyers'));
const TermsClients = lazy(() => import('./pages/TermsClients'));
const TestimonialDetail = lazy(() => import('./pages/TestimonialDetail'));
const Testimonials = lazy(() => import('./pages/Testimonials'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Contact = lazy(() => import('./pages/Contact'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));

// --------------------------------------------
// Routes config
// --------------------------------------------

// Publiques (sans EmailVerification)
const routeConfigs: RouteConfig[] = [
  { path: '/', component: Home, preload: true },
  { path: '/login', component: Login, preload: true },
  { path: '/register', component: Register, preload: true },
  { path: '/register/client', component: RegisterClient },
  { path: '/register/lawyer', component: RegisterLawyer },
  { path: '/register/expat', component: RegisterExpat },
  { path: '/password-reset', component: PasswordReset },

  // Tarifs (alias FR/EN)
  { path: '/tarifs', component: Pricing, alias: '/pricing', preload: true },

  // Contact & aide
  { path: '/contact', component: Contact },
  { path: '/how-it-works', component: HowItWorks },
  { path: '/faq', component: FAQ },
  { path: '/centre-aide', component: HelpCenter },

  // Témoignages
  { path: '/testimonials', component: Testimonials, alias: '/temoignages' },
  { path: '/testimonials/:serviceType/:country/:year/:language/:id', component: TestimonialDetail },
  { path: '/temoignages/:serviceType/:country/:year/:language/:id', component: TestimonialDetail },

  // Légal / info (alias FR/EN)
  { path: '/terms-clients', component: TermsClients, alias: '/cgu-clients' },
  { path: '/terms-lawyers', component: TermsLawyers, alias: '/cgu-avocats' },
  { path: '/terms-expats', component: TermsExpats, alias: '/cgu-expatries' },
  { path: '/privacy-policy', component: PrivacyPolicy, alias: '/politique-confidentialite' },
  { path: '/cookies', component: Cookies },
  { path: '/consumers', component: Consumers, alias: '/consommateurs' },
  { path: '/statut-service', component: ServiceStatus },
  { path: '/seo', component: SEO, alias: '/referencement' },

  // Services d'appel
  { path: '/sos-appel', component: SOSCall },
  { path: '/appel-expatrie', component: ExpatCall },

  // Fournisseurs publics
  { path: '/providers', component: Providers },
  { path: '/provider/:id', component: ProviderProfile },
  { path: '/avocat/:country/:language/:nameId', component: ProviderProfile },
  { path: '/expatrie/:country/:language/:nameId', component: ProviderProfile },
];

// Protégées (utilisateur)
const protectedUserRoutes: RouteConfig[] = [
  { path: '/dashboard', component: Dashboard, protected: true },
  { path: '/profile/edit', component: ProfileEdit, protected: true },
  { path: '/call-checkout', component: CallCheckout, protected: true },
  { path: '/call-checkout/:providerId', component: CallCheckout, protected: true },
  { path: '/booking-request/:providerId', component: BookingRequest, protected: true },
  { path: '/checkout', component: Checkout, protected: true },
  { path: '/booking-request', component: BookingRequest, protected: true },
  { path: '/payment-success', component: PaymentSuccess, protected: true },
  { path: '/dashboard/messages', component: DashboardMessages, protected: true },
];

// --------------------------------------------
// SEO par défaut
// --------------------------------------------
const DefaultHelmet: React.FC<{ pathname: string }> = ({ pathname }) => {
  const getPageMetadata = (path: string) => {
    const metaMap: Record<string, { title: string; description: string; lang: string }> = {
      '/': {
        title: 'Accueil - Consultation Juridique Expatriés',
        description: 'Service de consultation juridique pour expatriés francophones',
        lang: 'fr',
      },
      '/login': {
        title: 'Connexion - Consultation Juridique',
        description: 'Connectez-vous à votre compte',
        lang: 'fr',
      },
      '/pricing': {
        title: 'Tarifs - Consultation Juridique',
        description: 'Découvrez nos tarifs de consultation',
        lang: 'fr',
      },
      '/tarifs': {
        title: 'Tarifs - Consultation Juridique',
        description: 'Découvrez nos tarifs de consultation',
        lang: 'fr',
      },
      '/testimonials': {
        title: 'Témoignages Clients - Consultation Juridique Expatriés',
        description:
          'Découvrez les témoignages de nos clients expatriés et avocats partout dans le monde',
        lang: 'fr',
      },
      '/temoignages': {
        title: 'Témoignages Clients - Consultation Juridique Expatriés',
        description:
          'Découvrez les témoignages de nos clients expatriés et avocats partout dans le monde',
        lang: 'fr',
      },
    };

    return (
      metaMap[path] || {
        title: 'Consultation Juridique Expatriés',
        description: 'Service de consultation juridique pour expatriés',
        lang: 'fr',
      }
    );
  };

  const metadata = getPageMetadata(pathname);
  return (
    <Helmet>
      <html lang={metadata.lang} />
      <title>{metadata.title}</title>
      <meta name="description" content={metadata.description} />
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      <meta name="theme-color" content="#000000" />
    </Helmet>
  );
};

// --------------------------------------------
// App
// --------------------------------------------
const App: React.FC = () => {
  const location = useLocation();
  const { isMobile } = useDeviceDetection();

  // SW + perf
  useEffect(() => {
    registerSW();
    measurePerformance();
  }, []);

  // Scroll top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Préchargement light
  useEffect(() => {
    if (!isMobile) {
      const preloadableRoutes = [...routeConfigs, ...protectedUserRoutes].filter((r) => r.preload);
      if (preloadableRoutes.length > 0) {
        setTimeout(() => {
          // Intentionnellement vide : certains bundlers n'exposent pas _payload
        }, 2000);
      }
    }
  }, [isMobile]);

  const renderRoute = (config: RouteConfig, index: number) => {
    const { path, component: Component, protected: isProtected, role, alias } = config;
    const routes = [path, ...(alias ? [alias] : [])];

    return routes.map((routePath, i) => (
      <Route
        key={`${index}-${i}-${routePath}`}
        path={routePath}
        element={
          isProtected ? (
            <ProtectedRoute allowedRoles={role}>
              <Component />
            </ProtectedRoute>
          ) : (
            <Component />
          )
        }
      />
    ));
  };

  return (
    <HelmetProvider>
      <div className={`App ${isMobile ? 'mobile-layout' : 'desktop-layout'}`}>
        <DefaultHelmet pathname={location.pathname} />
        <Suspense fallback={<LoadingSpinner size="large" color="red" />}>
          {/* Routes de l'app */}
          <Routes>
            {routeConfigs.map((cfg, i) => renderRoute(cfg, i))}
            {protectedUserRoutes.map((cfg, i) => renderRoute(cfg, i + 1000))}
            
            {/* Admin routes - Fix: Redirect /admin to /admin/dashboard */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/*" element={<AdminRoutesV2 />} />
          </Routes>

          {/* Routes admin gérées par AdminRoutesV2 */}
        </Suspense>
      </div>
    </HelmetProvider>
  );
};

export default App;