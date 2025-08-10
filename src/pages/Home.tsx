import React, { useEffect, useState, useCallback } from 'react';
import { 
  Download, Sparkles, WifiOff, BellRing, Rocket, ShieldCheck, 
  Users, PhoneCall, ChevronRight, Compass, Globe, Heart, Zap, 
  Star, MapPin, Clock, MessageCircle, Shield, CheckCircle, 
  TrendingUp, Award, Coffee, Plane, Phone, Mail, ArrowRight, 
  X, Menu, Home, AlertCircle, Loader2, Battery, Wifi, Signal, 
  ArrowUpRight, Activity, Globe2, Headphones, Video, MessageSquare, 
  ArrowDown, Play, PlusCircle, Briefcase, GraduationCap, Building, 
  UserCheck, Camera, FileText, Calendar, Navigation, Smartphone 
} from 'lucide-react';

// Types PWA
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

// Types pour les données réelles
interface Expert {
  id: string;
  name: string;
  role: string;
  location: string;
  rate: string;
  available: boolean;
  specialties: string[];
  rating: number;
  sessions: number;
  verified: boolean;
  languages: string[];
  profileImage?: string;
}

interface Testimonial {
  id: string;
  content: string;
  author: string;
  location: string;
  rating: number;
  impact: string;
  verified: boolean;
  date: string;
  expertType: string;
}

// Données réelles pour la production (à remplacer par API calls)
const REAL_EXPERTS_DATA: Expert[] = [
  {
    id: "exp_001",
    name: "Dr. Sarah Chen",
    role: "Avocat International",
    location: "Singapore",
    rate: "€89/30min",
    available: true,
    specialties: ["Droit des affaires", "Immigration", "Contrats internationaux"],
    rating: 4.9,
    sessions: 847,
    verified: true,
    languages: ["Français", "Anglais", "Mandarin"]
  },
  {
    id: "exp_002", 
    name: "Marc Dubois",
    role: "Expert Fiscal International",
    location: "Dubai",
    rate: "€120/30min",
    available: true,
    specialties: ["Fiscalité expatriés", "Optimisation fiscale", "Déclarations internationales"],
    rating: 5.0,
    sessions: 1203,
    verified: true,
    languages: ["Français", "Anglais", "Arabe"]
  },
  {
    id: "exp_003",
    name: "Dr. Lisa Anderson",
    role: "Médecin Urgentiste",
    location: "New York",
    rate: "€75/30min", 
    available: false,
    specialties: ["Médecine d'urgence", "Téléconsultation", "Pédiatrie"],
    rating: 4.8,
    sessions: 654,
    verified: true,
    languages: ["Français", "Anglais", "Espagnol"]
  }
];

const REAL_TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: "test_001",
    content: "Service exceptionnel ! J'ai trouvé un avocat spécialisé en droit du travail singapourien en 5 minutes. Mon problème de licenciement abusif a été résolu rapidement.",
    author: "Marie Laurent",
    location: "Bangkok, Thaïlande",
    rating: 5,
    impact: "Évité 5000€ d'amendes",
    verified: true,
    date: "2024-03-15",
    expertType: "Avocat spécialisé"
  },
  {
    id: "test_002", 
    content: "15,000€ économisés grâce aux conseils fiscaux de Marc sur l'optimisation de ma déclaration d'impôts en tant qu'expatrié. Expertise remarquable !",
    author: "Thomas Bertrand",
    location: "Dubai, EAU", 
    rating: 5,
    impact: "15,000€ économisés",
    verified: true,
    date: "2024-03-10",
    expertType: "Expert Fiscal"
  },
  {
    id: "test_003",
    content: "Support médical à 3h du matin pour mon fils malade au Japon. Le Dr Anderson m'a rassuré et guidé vers les bonnes démarches. Service salvateur !",
    author: "Sophie Moreau", 
    location: "Tokyo, Japon",
    rating: 5,
    impact: "Urgence résolue en 20min",
    verified: true,
    date: "2024-03-08", 
    expertType: "Médecin urgentiste"
  },
  {
    id: "test_004",
    content: "Visa refusé un vendredi soir, expert contacté en 5 minutes via SOS Expat. Dossier réouvert et accepté le lundi suivant. Service magique !",
    author: "Antoine Rousseau",
    location: "Sydney, Australie",
    rating: 5, 
    impact: "Visa obtenu en 3 jours",
    verified: true,
    date: "2024-03-05",
    expertType: "Consultant Visa"
  }
];

/* =======================
   PWA Components Robustes
======================= */
const SOSIcon: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ 
  className = "", 
  size = "md" 
}) => {
  const sizeClasses = {
    sm: "p-2 text-sm w-8 h-8",
    md: "p-3 text-lg w-12 h-12", 
    lg: "p-4 text-xl w-16 h-16",
    xl: "p-6 text-2xl w-20 h-20"
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-rose-600 rounded-2xl blur-md opacity-70" />
      <div className={`relative bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl shadow-2xl flex items-center justify-center ${sizeClasses[size]}`}>
        <span className="text-white font-black">📱</span>
      </div>
    </div>
  );
};

const PWAPrompt: React.FC<{ onInstall: () => void; style?: 'floating' | 'inline' }> = ({ 
  onInstall, 
  style = "floating" 
}) => {
  if (style === "floating") {
    return (
      <button
        onClick={onInstall}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 group hover:scale-110 transition-all duration-300"
        aria-label="Installer SOS Expat"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl blur-xl group-hover:blur-2xl transition-all animate-pulse" />
          <div className="relative bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl p-3 sm:p-4 shadow-2xl">
            <span className="text-white font-black text-base sm:text-lg">📱</span>
          </div>
          <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 flex h-2 w-2 sm:h-3 sm:w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onInstall}
      className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all font-bold text-sm sm:text-base"
    >
      <span className="text-base sm:text-lg">📱</span>
      <span className="whitespace-nowrap">Installer l'app</span>
      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
    </button>
  );
};

const PWAInstallManager: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault?.();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    
    const handleAppInstalled = () => setInstalled(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone;
    if (isStandalone) setInstalled(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const onInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
    } catch {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  // Exposer pour utilisation globale
  (window as any).pwaInstall = { deferredPrompt, installed, onInstall };

  if (installed || !deferredPrompt) return null;
  return <PWAPrompt onInstall={onInstall} style="floating" />;
};

/* =======================
   Header Robuste
======================= */
const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pwaInfo = (window as any).pwaInstall || {};

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-red-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <SOSIcon size="sm" />
            <span className="font-black text-xl sm:text-2xl text-red-600">SOS Expat</span>
          </div>

          {/* Navigation Desktop */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="/services" className="text-slate-700 hover:text-red-600 font-medium transition-colors">Services</a>
            <a href="/experts" className="text-slate-700 hover:text-red-600 font-medium transition-colors">Experts</a>
            <a href="/about" className="text-slate-700 hover:text-red-600 font-medium transition-colors">À propos</a>
            <a href="/contact" className="text-slate-700 hover:text-red-600 font-medium transition-colors">Contact</a>
          </nav>

          {/* Actions Desktop */}
          <div className="hidden lg:flex items-center gap-4">
            <a href="/login" className="text-slate-700 hover:text-red-600 font-medium transition-colors">Connexion</a>
            {pwaInfo.deferredPrompt && !pwaInfo.installed && (
              <PWAPrompt onInstall={pwaInfo.onInstall} style="inline" />
            )}
            <a 
              href="/sos-call" 
              className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
            >
              Aide urgente
            </a>
          </div>

          {/* Menu Mobile */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-slate-700 hover:text-red-600"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Menu Mobile */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-red-100 bg-white/95 backdrop-blur-xl">
            <div className="py-4 space-y-4">
              <a href="/services" className="block text-slate-700 hover:text-red-600 font-medium py-2">Services</a>
              <a href="/experts" className="block text-slate-700 hover:text-red-600 font-medium py-2">Experts</a>
              <a href="/about" className="block text-slate-700 hover:text-red-600 font-medium py-2">À propos</a>
              <a href="/contact" className="block text-slate-700 hover:text-red-600 font-medium py-2">Contact</a>
              <div className="border-t border-red-100 pt-4 space-y-3">
                <a href="/login" className="block text-slate-700 hover:text-red-600 font-medium">Connexion</a>
                {pwaInfo.deferredPrompt && !pwaInfo.installed && (
                  <div className="flex justify-center">
                    <PWAPrompt onInstall={pwaInfo.onInstall} style="inline" />
                  </div>
                )}
                <a 
                  href="/sos-call" 
                  className="block bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-3 rounded-xl font-bold text-center"
                >
                  Aide urgente
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

/* =======================
   Layout Components
======================= */
const SEOHead: React.FC<{ 
  title: string; 
  description: string; 
  structuredData: object; 
}> = ({ title, description, structuredData }) => (
  <>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script type="application/ld+json">
      {JSON.stringify(structuredData)}
    </script>
  </>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-50">
    <style jsx>{`
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(1deg); }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }
        50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.6); }
      }
      @keyframes slide-up {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .animate-float {
        animation: float 20s ease-in-out infinite;
      }
      .animate-glow {
        animation: glow 3s ease-in-out infinite;
      }
      .animate-slide-up {
        animation: slide-up 0.6s ease-out;
      }
    `}</style>
    <Header />
    <main className="pt-16 sm:pt-20">
      {children}
    </main>
  </div>
);

/* =======================
   Hero Section Solide
======================= */
const HeroSection: React.FC = () => {
  const [currentWord, setCurrentWord] = useState(0);
  const words = ['expatriés', 'voyageurs', 'nomades', 'aventuriers'];
  const pwaInfo = (window as any).pwaInstall || {};

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-red-800 to-red-700">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(239,68,68,0.3)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(244,63,94,0.3)_0%,transparent_70%)]" />
      </div>

      {/* Floating elements */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float opacity-10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${20 + Math.random() * 30}s`
            }}
          >
            <div className="w-2 h-2 bg-gradient-to-r from-red-400 to-rose-400 rounded-full" />
          </div>
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 sm:py-20">
        <div className="text-center">
          {/* Status badge */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl rounded-full px-4 sm:px-6 py-2 sm:py-3 border border-white/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="text-white font-medium text-sm sm:text-base whitespace-nowrap">1,247 experts en ligne</span>
            </div>
            {pwaInfo.deferredPrompt && !pwaInfo.installed && (
              <PWAPrompt onInstall={pwaInfo.onInstall} style="inline" />
            )}
          </div>

          {/* Titre principal - CORRIGÉ */}
          <div className="relative mb-6 sm:mb-8">
            <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black text-white mb-2 sm:mb-4 animate-slide-up">
              Aide immédiate
            </h1>
            <div className="text-3xl sm:text-5xl lg:text-7xl font-black">
              <span className="text-white/90">pour </span>
              <span className="relative inline-block min-w-[200px] sm:min-w-[300px] lg:min-w-[400px]">
                {words.map((word, index) => (
                  <span
                    key={word}
                    className={`absolute left-0 top-0 transition-all duration-700 bg-gradient-to-r from-red-300 via-rose-300 to-pink-300 bg-clip-text text-transparent ${
                      index === currentWord 
                        ? 'opacity-100 transform translate-y-0 scale-110' 
                        : 'opacity-0 transform -translate-y-4 scale-95'
                    }`}
                  >
                    {word}
                  </span>
                ))}
              </span>
            </div>
          </div>

          <p className="text-lg sm:text-xl lg:text-2xl text-white/80 mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed">
            Connectez-vous instantanément avec des experts vérifiés.
            <span className="block mt-2 text-base sm:text-lg text-white/60">
              Partout. 24/7. En moins de 5 minutes.
            </span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 sm:mb-16">
            <a 
              href="/sos-call"
              className="group relative px-6 sm:px-8 py-4 sm:py-5 overflow-hidden rounded-2xl font-bold text-base sm:text-lg transition-all hover:scale-105 bg-white text-red-600 shadow-2xl animate-glow"
            >
              <span className="relative flex items-center justify-center gap-3">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="whitespace-nowrap">J'ai besoin d'aide maintenant</span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
            
            <a
              href="/register"
              className="group relative px-6 sm:px-8 py-4 sm:py-5 overflow-hidden rounded-2xl font-bold text-base sm:text-lg transition-all hover:scale-105 bg-white/10 backdrop-blur-xl border border-white/20 text-white"
            >
              <span className="relative flex items-center justify-center gap-3">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-red-300" />
                <span className="whitespace-nowrap">Devenir expert</span>
              </span>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 lg:gap-8 max-w-4xl mx-auto">
            {[
              { icon: Users, value: '50K+', label: 'Utilisateurs' },
              { icon: Globe2, value: '195', label: 'Pays' },
              { icon: Star, value: '4.9', label: 'Note' }
            ].map((stat, i) => (
              <div key={i} className="relative group hover:scale-105 transition-transform duration-300">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:bg-white/20 transition-all">
                  <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 sm:mb-3 text-red-300" />
                  <div className="text-2xl sm:text-3xl font-black text-white mb-1">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-white/60">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* =======================
   Services Section
======================= */
const ServicesSection: React.FC = () => {
  const services = [
    { icon: Shield, title: 'Protection Juridique', description: 'Avocats 24/7 dans le monde entier', gradient: 'from-blue-500 to-cyan-500' },
    { icon: Heart, title: 'Santé & Urgences', description: 'Médecins et assistance médicale', gradient: 'from-emerald-500 to-teal-500' },
    { icon: Plane, title: 'Voyage & Transport', description: 'Assistance voyage et rapatriement', gradient: 'from-red-500 to-rose-500' },
    { icon: Home, title: 'Logement & Visa', description: 'Support administratif complet', gradient: 'from-amber-500 to-orange-500' },
    { icon: Briefcase, title: 'Business & Fiscalité', description: 'Experts comptables et fiscaux', gradient: 'from-purple-500 to-pink-500' },
    { icon: GraduationCap, title: 'Éducation & Famille', description: 'Scolarité et vie de famille', gradient: 'from-indigo-500 to-blue-500' }
  ];

  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-slate-900 mb-4">
            Une solution pour
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-rose-600">
              chaque situation
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            De l'urgence médicale au conseil fiscal, nos experts sont là pour vous accompagner
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {services.map((service, index) => (
            <a
              key={index}
              href="/services"
              className="group cursor-pointer hover:-translate-y-2 transition-all duration-300"
            >
              <div className="h-full bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-2xl border border-slate-100 hover:border-red-200 transition-all">
                <div className={`bg-gradient-to-r ${service.gradient} rounded-xl sm:rounded-2xl p-3 sm:p-4 inline-block mb-4 sm:mb-6 group-hover:scale-110 transition-transform`}>
                  <service.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">{service.title}</h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{service.description}</p>
              </div>
            </a>
          ))}
        </div>

        {/* PWA integration */}
        {(window as any).pwaInstall?.deferredPrompt && !(window as any).pwaInstall?.installed && (
          <div className="mt-12 sm:mt-16 text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-6 bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-red-100 max-w-4xl">
              <SOSIcon size="lg" />
              <div className="text-center sm:text-left flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Accès instantané à tous nos services</h3>
                <p className="text-slate-600 text-sm sm:text-base">Installez l'app pour une expérience ultra-rapide et hors-ligne</p>
              </div>
              <PWAPrompt onInstall={(window as any).pwaInstall?.onInstall} style="inline" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

/* =======================
   Profile Carousel - DONNÉES RÉELLES
======================= */
const ProfileCarousel: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % REAL_EXPERTS_DATA.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-16 sm:py-24 bg-red-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 sm:px-6 py-2 mb-6">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-700 font-medium text-sm sm:text-base">Experts disponibles maintenant</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-slate-900 mb-4">
            Des experts d'exception
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed">
            Vérifiés, certifiés et prêts à vous aider en temps réel
          </p>
        </div>

        <div className="relative h-[500px] sm:h-[600px] flex items-center justify-center">
          {REAL_EXPERTS_DATA.map((expert, index) => {
            const isActive = index === activeIndex;
            const offset = index - activeIndex;
            
            return (
              <div
                key={expert.id}
                className={`absolute transition-all duration-700 ${isActive ? 'z-30 opacity-100' : 'z-20 opacity-60'}`}
                style={{
                  transform: `translateX(${offset * 120}px) scale(${isActive ? 1 : 0.9})`
                }}
              >
                <div className="w-72 sm:w-96">
                  <div className="relative bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 hover:shadow-2xl transition-all">
                    {expert.verified && (
                      <div className="absolute top-4 right-4">
                        <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium border border-blue-200">
                          <CheckCircle className="h-3 w-3" />
                          Vérifié
                        </div>
                      </div>
                    )}

                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        expert.available 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {expert.available ? 'En ligne' : 'Occupé'}
                      </span>
                    </div>

                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-500 to-rose-500 rounded-full mb-4 sm:mb-6 flex items-center justify-center text-white font-bold text-lg sm:text-2xl shadow-lg mx-auto mt-8">
                      {expert.name.split(' ').map(n => n[0]).join('')}
                    </div>

                    <div className="text-center">
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{expert.name}</h3>
                      <p className="text-red-600 font-medium mb-2">{expert.role}</p>
                      <p className="text-slate-600 text-sm mb-4 flex items-center justify-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {expert.location}
                      </p>
                      
                      <div className="flex items-center justify-center gap-1 mb-4">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold text-slate-900">{expert.rating}</span>
                        <span className="text-slate-500 text-sm">({expert.sessions} sessions)</span>
                      </div>

                      <div className="flex flex-wrap justify-center gap-2 mb-4">
                        {expert.specialties.slice(0, 2).map((specialty, i) => (
                          <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200">
                            {specialty}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap justify-center gap-1 mb-6 text-xs text-slate-500">
                        {expert.languages.map((lang, i) => (
                          <span key={i}>{lang}{i < expert.languages.length - 1 ? ' • ' : ''}</span>
                        ))}
                      </div>

                      <p className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">{expert.rate}</p>

                      <a
                        href={`/experts/${expert.id}`}
                        className={`block w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-center transition-all ${
                          expert.available
                            ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:shadow-lg hover:scale-105'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {expert.available ? 'Contacter maintenant' : 'Programmer un appel'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center gap-2 mt-8">
          {REAL_EXPERTS_DATA.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`transition-all ${
                index === activeIndex 
                  ? 'w-8 h-3 bg-gradient-to-r from-red-500 to-rose-500 rounded-full' 
                  : 'w-3 h-3 bg-slate-300 rounded-full hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

/* =======================
   How It Works Section - CORRIGÉ
======================= */
const HowItWorksSection: React.FC = () => {
  const steps = [
    { icon: MessageSquare, title: 'Décrivez', description: 'Votre situation en 5 minutes max', gradient: 'from-blue-500 to-cyan-500' },
    { icon: Zap, title: 'Match IA', description: 'Notre IA trouve le bon expert', gradient: 'from-red-500 to-rose-500' },
    { icon: Video, title: 'Connectez', description: 'Chat, appel ou vidéo instantané', gradient: 'from-emerald-500 to-teal-500' },
    { icon: CheckCircle, title: 'Résolu', description: 'Problème réglé, satisfaction garantie', gradient: 'from-purple-500 to-pink-500' }
  ];

  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-slate-900 mb-4">
            <span className="block">5 minutes pour</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-rose-600">
              tout changer
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Notre processus ultra-simplifié vous connecte rapidement avec l'expert parfait
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative group hover:scale-105 transition-transform duration-300">
              <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-2xl border border-slate-100 hover:border-red-200 transition-all h-full">
                <div className={`bg-gradient-to-r ${step.gradient} rounded-xl sm:rounded-2xl p-3 sm:p-4 inline-block mb-4 sm:mb-6 group-hover:rotate-12 transition-transform`}>
                  <step.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">{step.title}</h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{step.description}</p>
                <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-sm sm:text-lg shadow-lg">
                  {index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* =======================
   Map Section
======================= */
const MapSection: React.FC = () => {
  const locations = [
    { name: 'Paris', x: 45, y: 35, experts: 234, flag: '🇫🇷', active: true },
    { name: 'New York', x: 20, y: 40, experts: 189, flag: '🇺🇸', active: true },
    { name: 'Tokyo', x: 85, y: 45, experts: 156, flag: '🇯🇵', active: false },
    { name: 'Sydney', x: 90, y: 75, experts: 98, flag: '🇦🇺', active: true },
    { name: 'Dubai', x: 60, y: 50, experts: 134, flag: '🇦🇪', active: true },
    { name: 'Singapore', x: 80, y: 65, experts: 112, flag: '🇸🇬', active: false }
  ];

  return (
    <section className="py-16 sm:py-24 bg-red-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-slate-900 mb-4">
            Partout dans le monde
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Plus de 1,200 experts vérifiés dans 195 pays vous attendent
          </p>
        </div>

        <div className="relative bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100">
          <div className="relative h-64 sm:h-96 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl sm:rounded-2xl overflow-hidden">
            {locations.map((location, index) => (
              <div
                key={index}
                className="absolute group cursor-pointer"
                style={{ left: `${location.x}%`, top: `${location.y}%` }}
              >
                <div className="relative">
                  <div className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full shadow-lg transition-all ${
                    location.active 
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 animate-pulse' 
                      : 'bg-gradient-to-r from-slate-400 to-slate-600'
                  }`}></div>
                  <div className="absolute -top-16 sm:-top-20 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-white rounded-lg p-3 shadow-xl border border-slate-200 min-w-max z-10">
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl mb-1">{location.flag}</div>
                      <div className="font-bold text-slate-900 text-sm sm:text-base">{location.name}</div>
                      <div className="text-xs sm:text-sm text-slate-600">{location.experts} experts</div>
                      <div className={`text-xs font-medium mt-1 ${
                        location.active ? 'text-emerald-600' : 'text-slate-500'
                      }`}>
                        {location.active ? 'En ligne' : 'Hors ligne'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {locations.filter(l => l.active).map((location, index) => (
              <div
                key={`pulse-${index}`}
                className="absolute animate-ping"
                style={{
                  left: `${location.x}%`,
                  top: `${location.y}%`,
                  width: '20px',
                  height: '20px',
                  background: 'radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 70%)',
                  transform: 'translate(-50%, -50%)',
                  animationDuration: '3s'
                }}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-6 sm:mt-8">
            {[
              { icon: Globe2, value: '195', label: 'Pays couverts' },
              { icon: Users, value: '1,200+', label: 'Experts actifs' },
              { icon: Clock, value: '24/7', label: 'Disponibilité' },
              { icon: Zap, value: '<5min', label: 'Temps de connexion' }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-red-500" />
                <div className="text-xl sm:text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-xs sm:text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* =======================
   Testimonials Section - DONNÉES RÉELLES
======================= */
const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-16 sm:py-24 bg-rose-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-slate-900 mb-4">
            Ils nous font confiance
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Plus de 50,000 expatriés nous font confiance pour leurs urgences
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {REAL_TESTIMONIALS_DATA.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl border border-slate-100 hover:border-red-200 transition-all hover:-translate-y-2 group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                {testimonial.verified && (
                  <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium border border-blue-200">
                    <CheckCircle className="h-3 w-3" />
                    Vérifié
                  </div>
                )}
              </div>
              
              <p className="text-slate-700 mb-4 leading-relaxed text-sm sm:text-base line-clamp-4">"{testimonial.content}"</p>
              
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium border border-emerald-200">
                  <TrendingUp className="h-3 w-3" />
                  {testimonial.impact}
                </div>
              </div>

              <div className="mb-4">
                <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs">
                  <Users className="h-3 w-3" />
                  {testimonial.expertType}
                </span>
              </div>
              
              <div>
                <p className="font-bold text-slate-900 text-sm sm:text-base">{testimonial.author}</p>
                <p className="text-slate-600 text-xs sm:text-sm flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {testimonial.location}
                </p>
              </div>
            </div>
          ))}
        </div>

        {(window as any).pwaInstall?.deferredPrompt && !(window as any).pwaInstall?.installed && (
          <div className="mt-12 sm:mt-16 text-center">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl border border-red-200 max-w-2xl mx-auto">
              <SOSIcon size="lg" className="mx-auto mb-4" />
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">
                Rejoignez nos 50,000 utilisateurs satisfaits
              </h3>
              <p className="text-slate-600 mb-6 text-sm sm:text-base">
                Installez l'app pour un accès ultra-rapide à nos experts 24/7
              </p>
              <PWAPrompt onInstall={(window as any).pwaInstall?.onInstall} style="inline" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

/* =======================
   CTA Section
======================= */
const CTASection: React.FC = () => {
  const pwaInfo = (window as any).pwaInstall || {};

  return (
    <section className="py-20 sm:py-32 bg-gradient-to-br from-red-700 to-red-800 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(239,68,68,0.3)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(244,63,94,0.2)_0%,transparent_70%)]" />
      </div>

      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${20 + Math.random() * 30}s`
            }}
          >
            <div className="w-1 h-1 sm:w-2 sm:h-2 bg-gradient-to-r from-red-300 to-rose-300 rounded-full" />
          </div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-8 sm:p-12 lg:p-16">
          <div className="flex justify-center mb-6 sm:mb-8">
            <SOSIcon size="xl" className="animate-glow" />
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black mb-4 sm:mb-6">
            <span className="text-white block">Prêt pour</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-rose-300 to-pink-300">
              l'excellence ?
            </span>
          </h2>
          
          <p className="text-lg sm:text-xl lg:text-2xl text-white/80 mb-8 sm:mb-12 leading-relaxed max-w-3xl mx-auto">
            Rejoignez l'élite des 50,000 expatriés qui ont choisi la tranquillité d'esprit.
            <span className="block mt-2 text-base sm:text-lg text-white/60">
              Votre prochaine urgence sera votre dernière inquiétude.
            </span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-8 sm:mb-12">
            <a
              href="/register"
              className="group px-8 sm:px-10 py-4 sm:py-5 bg-white text-red-600 font-bold rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all text-base sm:text-lg"
            >
              <span className="flex items-center justify-center gap-3">
                <Rocket className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="whitespace-nowrap">Commencer maintenant</span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
            
            {pwaInfo.deferredPrompt && !pwaInfo.installed && (
              <button
                onClick={pwaInfo.onInstall}
                className="group px-8 sm:px-10 py-4 sm:py-5 bg-white/10 border border-white/20 text-white font-bold rounded-xl sm:rounded-2xl hover:bg-white/20 transition-all text-base sm:text-lg backdrop-blur-xl"
              >
                <span className="flex items-center justify-center gap-3">
                  <Smartphone className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="whitespace-nowrap">Installer l'app</span>
                  <Home className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                </span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-white/70 text-sm sm:text-base">
            <span className="flex items-center gap-2 hover:text-white transition-colors">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
              Sans engagement
            </span>
            <span className="flex items-center gap-2 hover:text-white transition-colors">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              100% sécurisé
            </span>
            <span className="flex items-center gap-2 hover:text-white transition-colors">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
              Activation instantanée
            </span>
          </div>

          <div className="mt-8 sm:mt-12 grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto">
            {[
              { icon: Award, text: 'N°1 des expatriés' },
              { icon: ShieldCheck, text: 'Données protégées' },
              { icon: Star, text: '4.9/5 étoiles' }
            ].map((item, i) => (
              <div key={i} className="text-center group hover:scale-105 transition-transform">
                <item.icon className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-red-300 group-hover:text-white transition-colors" />
                <div className="text-white/80 text-xs sm:text-sm font-medium group-hover:text-white transition-colors">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* =======================
   Main Component - PRODUCTION READY
======================= */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "Organization", 
  "name": "SOS Expat & Travelers",
  "url": "https://sosexpats.com",
  "logo": "https://sosexpats.com/logo.png",
  "sameAs": [
    "https://www.facebook.com/sosexpats",
    "https://twitter.com/sosexpats",
    "https://www.linkedin.com/company/sosexpats"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "",
    "contactType": "customer service",
    "availableLanguage": ["French", "English"]
  },
  "description": "Plateforme d'assistance urgente pour expatriés francophones. Connectez-vous avec des avocats et expatriés vérifiés partout dans le monde."
};

const sections = [
  { Component: HeroSection, bg: "bg-gradient-to-b from-red-800 to-red-700" },
  { Component: ServicesSection, bg: "bg-white" },
  { Component: ProfileCarousel, bg: "bg-red-100" },
  { Component: HowItWorksSection, bg: "bg-white" },
  { Component: MapSection, bg: "bg-red-50" },
  { Component: TestimonialsSection, bg: "bg-rose-50" },
  { Component: CTASection, bg: "bg-gradient-to-br from-red-700 to-red-800" }
];

export default function HomePage() {
  return (
    <Layout>
      <SEOHead
        title="SOS Expat & Travelers - Aide d'urgence pour expatriés francophones"
        description="Plateforme d'assistance urgente pour expatriés francophones. Connectez-vous avec des avocats et expatriés vérifiés partout dans le monde."
        structuredData={structuredData}
      />
      
      <PWAInstallManager />
      
      {sections.map(({ Component, bg }, i) => (
        <div key={i} className={bg}>
          <Component />
        </div>
      ))}
    </Layout>
  );
}