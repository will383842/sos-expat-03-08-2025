// App.tsx
import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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

// Admin (de base)
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminPricing = lazy(() => import('./pages/admin/AdminPricing'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCalls = lazy(() => import('./pages/admin/AdminCalls'));
const AdminClientMessages = lazy(() => import('@/pages/admin/AdminClientMessages'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminBackups = lazy(() => import('./pages/admin/AdminBackups'));
const AdminApprovals = lazy(() => import('./pages/admin/AdminApprovals'));
const AdminCountries = lazy(() => import('./pages/admin/AdminCountries'));
const AdminDocuments = lazy(() => import('./pages/admin/AdminDocuments'));
const AdminPromoCodes = lazy(() => import('./pages/admin/AdminPromoCodes'));
const AdminLegalDocuments = lazy(() => import('./pages/admin/AdminLegalDocuments'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));

// --------------------------------------------
// AJOUTS : Admin avancé
// --------------------------------------------

// Finance avancée
const AdminFinanceReconciliation = lazy(() => import('./pages/admin/AdminFinanceReconciliation'));
const AdminFinanceDisputes       = lazy(() => import('./pages/admin/AdminFinanceDisputes'));
const AdminFinanceRefunds        = lazy(() => import('./pages/admin/AdminFinanceRefunds'));
const AdminFinanceLedger         = lazy(() => import('./pages/admin/AdminFinanceLedger'));

// Comms avancées
const AdminCommsCampaigns        = lazy(() => import('./pages/admin/AdminCommsCampaigns'));
const AdminCommsCampaignEditor   = lazy(() => import('./pages/admin/AdminCommsCampaignEditor'));
const AdminCommsCampaignOverview = lazy(() => import('./pages/admin/AdminCommsCampaignOverview'));
const AdminCommsSegments         = lazy(() => import('./pages/admin/AdminCommsSegments'));
const AdminCommsAutomations      = lazy(() => import('./pages/admin/AdminCommsAutomations'));
const AdminCommsTemplates        = lazy(() => import('./pages/admin/AdminCommsTemplates'));
const AdminCommsDeliverability   = lazy(() => import('./pages/admin/AdminCommsDeliverability'));
const AdminCommsSuppression      = lazy(() => import('./pages/admin/AdminCommsSuppression'));
const AdminCommsABTests          = lazy(() => import('./pages/admin/AdminCommsABTests'));

// Affiliés / Ambassadeurs
const AdminAffiliatesList        = lazy(() => import('./pages/admin/AdminAffiliatesList'));
const AdminAffiliateDetail       = lazy(() => import('./pages/admin/AdminAffiliateDetail'));
const AdminCommissionRules       = lazy(() => import('./pages/admin/AdminCommissionRules'));
const AdminAffiliatePayouts      = lazy(() => import('./pages/admin/AdminAffiliatePayouts'));
const AdminAmbassadorsList       = lazy(() => import('./pages/admin/AdminAmbassadorsList'));
const AdminAmbassadorDetail      = lazy(() => import('./pages/admin/AdminAmbassadorDetail'));

// B2B
const AdminB2BAccounts           = lazy(() => import('./pages/admin/AdminB2BAccounts'));
const AdminB2BMembers            = lazy(() => import('./pages/admin/AdminB2BMembers'));
const AdminB2BPricing            = lazy(() => import('./pages/admin/AdminB2BPricing'));
const AdminB2BBilling            = lazy(() => import('./pages/admin/AdminB2BBilling'));
const AdminB2BInvoices           = lazy(() => import('./pages/admin/AdminB2BInvoices'));
const AdminB2BReports            = lazy(() => import('./pages/admin/AdminB2BReports'));

// (alias AAAPROFILES si tu as déjà une page)
const AdminAaaProfiles           = lazy(() => import('./pages/admin/AdminAaaProfiles'));

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

// Admin (y compris avancé)
const adminRoutes: RouteConfig[] = [
  // Base
  { path: '/admin/login', component: AdminLogin },
  { path: '/admin/dashboard', component: AdminDashboard, protected: true, role: 'admin' },
  { path: '/admin/pricing', component: AdminPricing, protected: true, role: 'admin' },
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

  // Finance avancée
  { path: '/admin/finance/reconciliation', component: AdminFinanceReconciliation, protected: true, role: 'admin' },
  { path: '/admin/finance/disputes',       component: AdminFinanceDisputes,       protected: true, role: 'admin' },
  { path: '/admin/finance/refunds',        component: AdminFinanceRefunds,        protected: true, role: 'admin' },
  { path: '/admin/finance/ledger',         component: AdminFinanceLedger,         protected: true, role: 'admin' },

  // Comms avancées
  { path: '/admin/comms/campaigns',        component: AdminCommsCampaigns,        protected: true, role: 'admin' },
  { path: '/admin/comms/campaigns/new',    component: AdminCommsCampaignEditor,   protected: true, role: 'admin' },
  { path: '/admin/comms/campaigns/:id',    component: AdminCommsCampaignOverview, protected: true, role: 'admin' },
  { path: '/admin/comms/segments',         component: AdminCommsSegments,         protected: true, role: 'admin' },
  { path: '/admin/comms/automations',      component: AdminCommsAutomations,      protected: true, role: 'admin' },
  { path: '/admin/comms/templates',        component: AdminCommsTemplates,        protected: true, role: 'admin' },
  { path: '/admin/comms/deliverability',   component: AdminCommsDeliverability,   protected: true, role: 'admin' },
  { path: '/admin/comms/suppression',      component: AdminCommsSuppression,      protected: true, role: 'admin' },
  { path: '/admin/comms/ab',               component: AdminCommsABTests,          protected: true, role: 'admin' },

  // Affiliés / Ambassadeurs
  { path: '/admin/affiliates',             component: AdminAffiliatesList,        protected: true, role: 'admin' },
  { path: '/admin/affiliates/:id',         component: AdminAffiliateDetail,       protected: true, role: 'admin' },
  { path: '/admin/affiliates/commissions', component: AdminCommissionRules,       protected: true, role: 'admin' },
  { path: '/admin/affiliates/payouts',     component: AdminAffiliatePayouts,      protected: true, role: 'admin' },
  { path: '/admin/ambassadors',            component: AdminAmbassadorsList,       protected: true, role: 'admin' },
  { path: '/admin/ambassadors/:id',        component: AdminAmbassadorDetail,      protected: true, role: 'admin' },

  // B2B
  { path: '/admin/b2b/accounts',           component: AdminB2BAccounts,           protected: true, role: 'admin' },
  { path: '/admin/b2b/members',            component: AdminB2BMembers,            protected: true, role: 'admin' },
  { path: '/admin/b2b/pricing',            component: AdminB2BPricing,            protected: true, role: 'admin' },
  { path: '/admin/b2b/billing',            component: AdminB2BBilling,            protected: true, role: 'admin' },
  { path: '/admin/b2b/invoices',           component: AdminB2BInvoices,           protected: true, role: 'admin' },
  { path: '/admin/b2b/reports',            component: AdminB2BReports,            protected: true, role: 'admin' },

  // AAA Profiles (alias)
  { path: '/admin/aaaprofiles',            component: AdminAaaProfiles,           protected: true, role: 'admin', alias: '/admin/aaa-profiles' },
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
          {/* Routes de l’app */}
          <Routes>
            {routeConfigs.map((cfg, i) => renderRoute(cfg, i))}
            {protectedUserRoutes.map((cfg, i) => renderRoute(cfg, i + 1000))}
            {adminRoutes.map((cfg, i) => renderRoute(cfg, i + 2000))}
          </Routes>

          {/* Alias / compléments admin V2 */}
          <AdminRoutesV2 />
        </Suspense>
      </div>
    </HelmetProvider>
  );
};

export default App;
