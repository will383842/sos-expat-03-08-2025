import React, { useEffect, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { useDeviceDetection } from './hooks/useDeviceDetection.ts';
import { registerSW, measurePerformance } from './utils/performance';
import './App.css';
import DashboardMessages from '@/components/dashboard/DashboardMessages';
import AdminClientMessages from "@/pages/admin/AdminClientMessages";



// Interface pour la configuration des routes
interface RouteConfig {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>> | React.ComponentType<Record<string, unknown>>;
  protected?: boolean;
  role?: string;
  alias?: string;
  preload?: boolean;
}

// Composants critiques (chargés immédiatement)
import Home from './pages/Home';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Lazy loading pour les pages moins critiques
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const RegisterExpat = React.lazy(() => import('./pages/RegisterExpat'));
const RegisterLawyer = React.lazy(() => import('./pages/RegisterLawyer'));
const RegisterClient = React.lazy(() => import('./pages/RegisterClient'));
const EmailVerification = React.lazy(() => import('./pages/EmailVerification'));
const PasswordReset = React.lazy(() => import('./pages/PasswordReset'));

// User pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ProfileEdit = React.lazy(() => import('./pages/ProfileEdit'));

// Service pages
const SOSCall = React.lazy(() => import('./pages/SOSCall'));
const ExpatCall = React.lazy(() => import('./pages/ExpatCall'));
const CallCheckout = React.lazy(() => import('./pages/CallCheckout'));
const Checkout = React.lazy(() => import('./pages/Checkout'));
const BookingRequest = React.lazy(() => import('./pages/BookingRequest'));
const PaymentSuccess = React.lazy(() => import('./pages/PaymentSuccess'));
const ProviderProfile = React.lazy(() => import('./pages/ProviderProfile'));
const Providers = React.lazy(() => import('./pages/Providers'));
const Pricing = React.lazy(() => import('./pages/Pricing'));

// Admin pages
const AdminLogin = React.lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminCalls = React.lazy(() => import('./pages/admin/AdminCalls'));
const AdminPayments = React.lazy(() => import('./pages/admin/AdminPayments'));
const AdminReviews = React.lazy(() => import('./pages/admin/AdminReviews'));
const AdminReports = React.lazy(() => import('./pages/admin/AdminReports'));
const AdminSettings = React.lazy(() => import('./pages/admin/AdminSettings'));
const AdminBackups = React.lazy(() => import('./pages/admin/AdminBackups'));
const AdminApprovals = React.lazy(() => import('./pages/admin/AdminApprovals'));
const AdminCountries = React.lazy(() => import('./pages/admin/AdminCountries'));
const AdminDocuments = React.lazy(() => import('./pages/admin/AdminDocuments'));
const AdminPromoCodes = React.lazy(() => import('./pages/admin/AdminPromoCodes'));
const AdminLegalDocuments = React.lazy(() => import('./pages/admin/AdminLegalDocuments'));
const AdminNotifications = React.lazy(() => import('./pages/admin/AdminNotifications'));

// Info pages
const SEO = React.lazy(() => import('./pages/SEO'));
const ServiceStatus = React.lazy(() => import('./pages/ServiceStatus'));
const Consumers = React.lazy(() => import('./pages/Consumers'));
const Cookies = React.lazy(() => import('./pages/Cookies'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsExpats = React.lazy(() => import('./pages/TermsExpats'));
const TermsLawyers = React.lazy(() => import('./pages/TermsLawyers'));
const TermsClients = React.lazy(() => import('./pages/TermsClients'));
const TestimonialDetail = React.lazy(() => import('./pages/TestimonialDetail'));
const Testimonials = React.lazy(() => import('./pages/Testimonials'));
const HelpCenter = React.lazy(() => import('./pages/HelpCenter'));
const FAQ = React.lazy(() => import('./pages/FAQ'));
const Contact = React.lazy(() => import('./pages/Contact'));
const HowItWorks = React.lazy(() => import('./pages/HowItWorks'));

// Configuration des routes
const routeConfigs: RouteConfig[] = [
  // Routes publiques
  { path: '/', component: Home, preload: true },
  { path: '/login', component: Login, preload: true },
  { path: '/register', component: Register, preload: true },
  { path: '/register/client', component: RegisterClient },
  { path: '/register/lawyer', component: RegisterLawyer },
  { path: '/register/expat', component: RegisterExpat },
  { path: '/password-reset', component: PasswordReset },
  { path: '/email-verification', component: EmailVerification },
  
  // Routes tarifaires (avec aliases FR/EN)
  { path: '/tarifs', component: Pricing, alias: '/pricing', preload: true },
  
  // Routes de contact et aide
  { path: '/contact', component: Contact },
  { path: '/how-it-works', component: HowItWorks },
  { path: '/faq', component: FAQ },
  { path: '/centre-aide', component: HelpCenter },
  
  // Routes témoignages (avec aliases FR/EN)
  { path: '/testimonials', component: Testimonials, alias: '/temoignages' },
  { path: '/testimonial/:type/:country/:language/:id', component: TestimonialDetail, alias: '/temoignage/:type/:country/:language/:id' },
  
  // Routes conditions (avec aliases FR/EN)
  { path: '/terms-clients', component: TermsClients, alias: '/cgu-clients' },
  { path: '/terms-lawyers', component: TermsLawyers, alias: '/cgu-avocats' },
  { path: '/terms-expats', component: TermsExpats, alias: '/cgu-expatries' },
  { path: '/privacy-policy', component: PrivacyPolicy, alias: '/politique-confidentialite' },
  { path: '/cookies', component: Cookies },
  { path: '/consumers', component: Consumers, alias: '/consommateurs' },
  { path: '/statut-service', component: ServiceStatus },
  { path: '/seo', component: SEO, alias: '/referencement' },
  
  // Routes services d'appel
  { path: '/sos-appel', component: SOSCall },
  { path: '/appel-expatrie', component: ExpatCall },
  
  // Routes fournisseurs publiques
  { path: '/providers', component: Providers },
  { path: '/provider/:id', component: ProviderProfile },
  { path: '/avocat/:country/:language/:nameId', component: ProviderProfile },
  { path: '/expatrie/:country/:language/:nameId', component: ProviderProfile },
];

// Routes protégées utilisateur
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

// Routes admin
const adminRoutes: RouteConfig[] = [
  { path: '/admin/login', component: AdminLogin },
  { path: '/admin/dashboard', component: AdminDashboard, protected: true, role: 'admin' },
  { path: '/admin/users', component: AdminUsers, protected: true, role: 'admin' },
  { path: '/admin/calls', component: AdminCalls, protected: true, role: 'admin' },
  { path: '/admin/messages-clients', component: AdminClientMessages, protected: true, role: 'admin' },
  { path: '/admin/payments', component: AdminPayments, protected: true, role: 'admin' },
  { path: '/admin/reviews', component: AdminReviews, protected: true, role: 'admin' },
  { path: '/admin/reports', component: AdminReports, protected: true, role: 'admin' },
  { path: '/admin/settings', component: AdminSettings, protected: true, role: 'admin' },
  { path: '/admin/backups', component: AdminBackups, protected: true, role: 'admin' },
  { path: '/admin/approvals', component: AdminApprovals, protected: true, role: 'admin' },
  { path: '/admin/countries', component: AdminCountries, protected: true, role: 'admin' },
  { path: '/admin/documents', component: AdminDocuments, protected: true, role: 'admin' },
  { path: '/admin/promo-codes', component: AdminPromoCodes, protected: true, role: 'admin' },
  { path: '/admin/legal-documents', component: AdminLegalDocuments, protected: true, role: 'admin' },
  { path: '/admin/notifications', component: AdminNotifications, protected: true, role: 'admin' },
];

// Composant de chargement adaptatif avec accessibilité
const LoadingSpinner: React.FC = () => {
  const { isMobile } = useDeviceDetection();
  
  return (
    <div className="flex justify-center items-center min-h-screen" role="status" aria-label="Chargement en cours">
      <div className={`loading-spinner ${isMobile ? 'mobile' : 'desktop'}`}>
        <div className="spinner-ring" aria-hidden="true"></div>
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    </div>
  );
};

// Composant pour les métadonnées par défaut
const DefaultHelmet: React.FC<{ pathname: string }> = ({ pathname }) => {
  const getPageMetadata = (path: string) => {
    const metaMap: Record<string, { title: string; description: string; lang: string }> = {
      '/': {
        title: 'Accueil - Consultation Juridique Expatriés',
        description: 'Service de consultation juridique pour expatriés francophones',
        lang: 'fr'
      },
      '/login': {
        title: 'Connexion - Consultation Juridique',
        description: 'Connectez-vous à votre compte',
        lang: 'fr'
      },
      '/pricing': {
        title: 'Tarifs - Consultation Juridique',
        description: 'Découvrez nos tarifs de consultation',
        lang: 'fr'
      },
      '/tarifs': {
        title: 'Tarifs - Consultation Juridique',
        description: 'Découvrez nos tarifs de consultation',
        lang: 'fr'
      },
      // Ajouter d'autres pages selon besoin
    };

    return metaMap[path] || {
      title: 'Consultation Juridique Expatriés',
      description: 'Service de consultation juridique pour expatriés',
      lang: 'fr'
    };
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

const App: React.FC = () => {
  const location = useLocation();
  const { isMobile } = useDeviceDetection();
  
  // Optimisations de performance
  useEffect(() => {
    // Enregistrer le Service Worker
    registerSW();
    // Mesurer les performances
    measurePerformance();
  }, []);
  
  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  // Préchargement des routes critiques
  useEffect(() => {
    if (!isMobile) {
      // Précharger les pages importantes sur desktop
      const preloadableRoutes = [...routeConfigs, ...protectedUserRoutes]
        .filter(route => route.preload);
      
      preloadableRoutes.forEach(route => {
        // Précharger après un délai pour ne pas impacter le chargement initial
        setTimeout(() => {
          if (route.component && typeof route.component === 'function' && 'load' in route.component) {
            // Pour les composants lazy
            const lazyComponent = route.component as React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>;
            if (typeof lazyComponent._payload === 'function') {
              lazyComponent._payload();
            }
          }
        }, 2000);
      });
    }
  }, [isMobile]);

  // Fonction pour créer les routes
  const renderRoute = (config: RouteConfig, index: number) => {
    const { path, component: Component, protected: isProtected, role, alias } = config;
    
    const routes = [path];
    if (alias) routes.push(alias);
    
    return routes.map((routePath, routeIndex) => (
      <Route
        key={`${index}-${routeIndex}-${routePath}`}
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
        
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Routes publiques */}
            {routeConfigs.map((config, index) => renderRoute(config, index))}
            
            {/* Routes protégées utilisateur */}
            {protectedUserRoutes.map((config, index) => renderRoute(config, index + 1000))}
            
            {/* Routes admin */}
            {adminRoutes.map((config, index) => renderRoute(config, index + 2000))}
          </Routes>
        </Suspense>
      </div>
    </HelmetProvider>
  ); 
};

export default App;