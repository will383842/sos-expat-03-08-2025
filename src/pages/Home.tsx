// src/pages/Home.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Play, Shield, Globe, Users, Zap, DollarSign,
  Check, Star, Phone, Award, Clock, MapPin,
  Sparkles, ChevronLeft, ChevronRight as ChevronRightIcon, Briefcase, User
} from 'lucide-react';
import Layout from '../components/layout/Layout';
// import ModernProfileCard from '../components/home/ModernProfileCard';
import ProfilesCarousel from '../components/home/ProfileCarousel';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { usePricingConfig, detectUserCurrency, getEffectivePrice } from '@/services/pricingService';

/* ================================
   Types
   ================================ */
interface Stat {
  value: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}
interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  cta: string;
  color: string;
}

/* “Effective price” minimal local typing (compatible avec getEffectivePrice) */
type EffectivePrice = {
  price: { totalAmount: number };
  standard: { totalAmount: number };
  override?: { label?: string } | null;
};

/* ================================
   Global typing for analytics (no any)
   ================================ */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/* ================================
   Bouton PWA + hint sympa
   ================================ */
function PWAInstallIconWithHint({
  canInstall,
  onInstall
}: {
  canInstall: boolean;
  onInstall: () => void;
}) {
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const hideTimer = useRef<number | null>(null);

  const computeHint = () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1);
    const isAndroid = /Android/i.test(ua);
    const isDesktop = !isIOS && !isAndroid;

    const prefix = 'Votre navigateur ne permet pas l’installation automatique. ';
    if (isIOS) return prefix + 'Sur iPhone/iPad : Safari → « Partager » → « Sur l’écran d’accueil ».';
    if (isAndroid) return prefix + 'Sur Android : Chrome → menu ⋮ → « Installer l’application ».';
    if (isDesktop) return prefix + 'Sur ordinateur : Chrome/Edge → icône « Installer » dans la barre d’adresse.';
    return prefix + 'Essayez avec Chrome/Edge (ordinateur) ou Safari/Chrome (mobile).';
  };

  const reveal = (text?: string) => {
    if (hideTimer.current) { window.clearTimeout(hideTimer.current); hideTimer.current = null; }
    setHintText(text ?? computeHint());
    setShowHint(true);
  };
  const scheduleHide = (delay = 1600) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowHint(false), delay) as unknown as number;
  };

  const onClick = () => {
    if (canInstall) onInstall();
    else { reveal(); scheduleHide(2800); }
  };

  return (
    <div className="relative select-none">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => { reveal('L’application qui fait du bien !'); }}
        onMouseLeave={() => scheduleHide()}
        onTouchStart={() => { reveal('L’application qui fait du bien !'); scheduleHide(1400); }}
        className="ml-1 w-14 h-14 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/40 touch-manipulation"
        title="Installer l'application"
        aria-label="Installer l'application"
      >
        <img
          src="/icons/icon-512x512-maskable.png"
          alt="Icône appli SOS Expat"
          className={`${canInstall ? 'animate-bounce' : 'animate-pulse'} w-full h-full object-cover`}
        />
      </button>

      <div
        className={`absolute left-1/2 -translate-x-1/2 mt-3 w-[260px] sm:w-[320px] text-sm rounded-2xl shadow-2xl border transition-all duration-200 ${
          showHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
        } bg-white/95 backdrop-blur-xl border-gray-200 text-gray-900`}
        role="status"
      >
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/95 rotate-45 border-l border-t border-gray-200" />
        <div className="px-4 py-3">
          <div className="font-extrabold text-gray-900">L’application qui fait du bien !</div>
          {hintText && <div className="mt-1 leading-relaxed text-gray-700">{hintText}</div>}
        </div>
      </div>
    </div>
  );
}

/* ================================
   Données « Avis » (FR) + avatars humains + FALLBACK
   ================================ */
type TypeEchange = 'avocat' | 'expatrié';
interface Review {
  id: string;
  name: string;
  city: string;
  avatar: string;
  fallback: string;
  comment: string;
  typeEchange: TypeEchange;
}

const faceParams = '?auto=format&fit=crop&w=600&h=600&q=80&crop=faces&ixlib=rb-4.0.3';

const REVIEWS: Review[] = [
  {
    id: 'fr-man',
    name: 'Thomas Laurent',
    city: 'Lille, France',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e' + faceParams,
    fallback: 'https://i.pravatar.cc/600?img=12',
    typeEchange: 'avocat',
    comment:
      'Je redoutais d’appeler un avocat. Il a été cool, clair et ultra efficace : solution trouvée en 15 min grâce au droit local au Brésil.'
  },
  {
    id: 'us-woman',
    name: 'Emily Johnson',
    city: 'Austin, États-Unis',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1' + faceParams,
    fallback: 'https://i.pravatar.cc/600?img=47',
    typeEchange: 'expatrié',
    comment:
      'Nouvelle à Lyon, panique préfecture. Une expatriée m’a rappelée en quelques minutes, tout expliqué en FR/EN. Je me suis sentie accompagnée.'
  },
  {
    id: 'cn-man',
    name: 'Li Wei',
    city: 'Shanghai, Chine',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12' + faceParams,
    fallback: 'https://i.pravatar.cc/600?img=32',
    typeEchange: 'avocat',
    comment:
      'Assurance santé internationale : réglé dans la journée. L’avocat bilingue a tout clarifié au téléphone, documents à l’appui. Net et précis.'
  },
  {
    id: 'th-woman',
    name: 'Nok Suphansa',
    city: 'Bangkok, Thaïlande',
    avatar: 'https://images.unsplash.com/photo-1554151228-14d9def656e4' + faceParams,
    fallback: 'https://i.pravatar.cc/600?img=65',
    typeEchange: 'expatrié',
    comment:
      'Hospitalisation imprévue en voyage. Une expatriée m’a guidée pour les démarches et a servi d’interprète. Humain, rassurant, efficace.'
  },
  {
    id: 'ru-man',
    name: 'Ivan Petrov',
    city: 'Saint-Pétersbourg, Russie',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d' + faceParams,
    fallback: 'https://i.pravatar.cc/600?img=10',
    typeEchange: 'avocat',
    comment:
      'Achat à Lisbonne : l’avocat m’a rappelé, vérifié les clauses, orienté vers la bonne étude notariale. Rapide et sans surprise.'
  },
  {
    id: 'sn-woman',
    name: 'Awa Diop',
    city: 'Dakar, Sénégal',
    avatar: 'https://images.unsplash.com/photo-1544005316-00a74bdc7f77' + faceParams,
    fallback: 'https://i.pravatar.cc/600?img=68',
    typeEchange: 'expatrié',
    comment:
      'Visa Canada en rade. Une expatriée à Montréal m’a donné les bons justificatifs et les vrais délais. J’ai gagné des semaines.'
  }
];

/* ================================
   Slider d’avis — mobile first, swipe, auto
   (param "theme" pour clair/sombre)
   ================================ */
function ReviewsSlider({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setCurrent((p) => (p + 1) % REVIEWS.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [paused]);

  const goTo = (i: number) => setCurrent((i + REVIEWS.length) % REVIEWS.length);
  const prev = () => goTo(current - 1);
  const next = () => goTo(current + 1);

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx > 0) {
        prev();
      } else {
        next();
      }
    }
    touchStartX.current = null;
  };

  const labelType = (t: TypeEchange) =>
    t === 'avocat' ? 'Appel avec un avocat' : 'Appel avec un·e expatrié·e';

  // handler de fallback d’image
  const onImgError = (e: React.SyntheticEvent<HTMLImageElement>, fallback: string) => {
    const img = e.currentTarget;
    if (img.src !== fallback) {
      img.src = fallback;
    }
  };

  return (
    <div
      className="relative max-w-[980px] mx-auto select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* viewport */}
      <div className="overflow-hidden rounded-[28px]">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {REVIEWS.map((r, idx) => (
            <div key={r.id} className="w-full shrink-0 px-2 sm:px-4">
              <Link
                to="/testimonials"
                className={
                  isDark
                    ? 'block rounded-[28px] border border-white/15 bg-gradient-to-br from-white/8 to-white/5 backdrop-blur-xl p-6 sm:p-10 md:p-12 hover:border-white/25 hover:shadow-2xl transition-all duration-300'
                    : 'block rounded-[28px] border border-gray-200 bg-white p-6 sm:p-10 md:p-12 hover:shadow-2xl transition-all duration-300'
                }
                aria-label={`Voir les avis - ${r.name}`}
              >
                {/* bandeau type échange */}
                <div
                  className={
                    isDark
                      ? 'mb-5 sm:mb-6 inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white rounded-full px-3.5 py-2 text-xs sm:text-sm font-semibold backdrop-blur'
                      : 'mb-5 sm:mb-6 inline-flex items-center gap-2 bg-gray-100 border border-gray-200 text-gray-700 rounded-full px-3.5 py-2 text-xs sm:text-sm font-semibold'
                  }
                >
                  {r.typeEchange === 'avocat' ? <Briefcase size={14} /> : <User size={14} />}
                  {labelType(r.typeEchange)}
                </div>

                <div className="flex flex-col md:flex-row md:items-start items-center gap-5 sm:gap-7 md:gap-8 text-center md:text-left">
                  {/* Avatar + infos */}
                  <div className="flex flex-col items-center md:items-start">
                    <div className={`relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full p-[3px] ${isDark ? 'bg-gradient-to-br from-white/40 to-white/10' : 'bg-gradient-to-br from-gray-200 to-gray-100'} shadow`}>
                      <img
                        src={r.avatar}
                        alt={`Portrait de ${r.name}`}
                        className="w-full h-full rounded-full object-cover"
                        loading={idx === current ? 'eager' : 'lazy'}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(e) => onImgError(e, r.fallback)}
                      />
                    </div>
                    <div className="mt-3">
                      <div className={`font-extrabold ${isDark ? 'text-white' : 'text-gray-900'} text-lg sm:text-xl leading-tight`}>{r.name}</div>
                      <div className={`mt-0.5 inline-flex items-center gap-1 ${isDark ? 'text-gray-300/90' : 'text-gray-500'} text-xs sm:text-sm`}>
                        <MapPin size={16} />
                        <span>{r.city}</span>
                      </div>
                      <div className="mt-2 inline-flex gap-1" aria-label="Note 5 sur 5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={18} className="text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Texte */}
                  <blockquote className={`${isDark ? 'text-white/95' : 'text-gray-700'} text-base sm:text-lg md:text-xl leading-7 sm:leading-8 md:leading-9 max-w-[58ch]`}>
                    “{r.comment}”
                  </blockquote>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* flèches */}
      <button
        onClick={prev}
        className={
          isDark
            ? 'absolute left-1 sm:left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/20 hover:border-white/30 transition-all duration-300 flex items-center justify-center text-white active:scale-95'
            : 'absolute left-1 sm:left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 hover:bg-gray-200 rounded-full border border-gray-200 transition-all duration-300 flex items-center justify-center text-gray-700 active:scale-95'
        }
        aria-label="Précédent"
      >
        {/* FIX cssConflict: h-5 + h-6 → sm:h-6 */}
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      <button
        onClick={next}
        className={
          isDark
            ? 'absolute right-1 sm:right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/20 hover:border-white/30 transition-all duration-300 flex items-center justify-center text-white active:scale-95'
            : 'absolute right-1 sm:right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 hover:bg-gray-200 rounded-full border border-gray-200 transition-all duration-300 flex items-center justify-center text-gray-700 active:scale-95'
        }
        aria-label="Suivant"
      >
        {/* FIX cssConflict: h-5 + h-6 → sm:h-6 */}
        <ChevronRightIcon className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* points */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {REVIEWS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${current === i ? 'w-8 bg-gradient-to-r from-red-500 to-orange-500' : isDark ? 'w-2 bg-white/40 hover:bg-white/60' : 'w-2 bg-gray-300 hover:bg-gray-400'}`}
            aria-label={`Aller à l’avis ${i + 1}`}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="text-center mt-7 sm:mt-8">
        <Link
          to="/testimonials"
          className={`inline-flex items-center gap-2 ${isDark ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'} font-semibold transition-colors`}
        >
          <span>Voir tous les avis</span>
          <ChevronRightIcon className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}

/* ================================
   Plans de pricing (inchangé)
   ================================ */
const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Gratuit',
    price: '0€',
    period: 'par mois',
    description: 'Pour découvrir nos services',
    features: [
      'Accès à la liste des experts',
      'Recherche par spécialité',
      'Consultation des avis',
      'Chat communauté',
      'Support par email'
    ],
    cta: 'Commencer gratuitement',
    color: 'from-gray-600 to-gray-700'
  },
  {
    name: 'Essentiel',
    price: '29€',
    period: 'par mois',
    description: 'Pour les expatriés occasionnels',
    features: [
      'Tout du plan Gratuit',
      '2 consultations par mois',
      'Support prioritaire',
      'Accès mobile offline',
      'Notifications urgentes'
    ],
    cta: 'Choisir Essentiel',
    color: 'from-blue-600 to-blue-700'
  },
  {
    name: 'Premium',
    price: '79€',
    period: 'par mois',
    description: 'Pour les expatriés réguliers',
    features: [
      'Tout du plan Essentiel',
      'Consultations illimitées',
      'SOS 24/7 prioritaire',
      'Experts dédiés',
      'Documents juridiques',
      'Traduction certifiée'
    ],
    popular: true,
    cta: 'Choisir Premium',
    color: 'from-red-600 to-orange-600'
  },
  {
    name: 'Entreprise',
    price: 'Sur mesure',
    period: '',
    description: 'Pour les entreprises et familles',
    features: [
      'Tout du plan Premium',
      'Multi-utilisateurs',
      'Gestionnaire dédié',
      'Formation équipes',
      'API & intégrations',
      'Rapports analytics'
    ],
    cta: 'Nous contacter',
    color: 'from-purple-600 to-purple-700'
  }
];

/* ================================
   Page
   ================================ */
const OptimizedHomePage: React.FC = () => {
  const { install, canPrompt } = usePWAInstall();
  const canInstall = !!canPrompt;

  const stats: Stat[] = [
    { value: '15K+', label: 'Expatriés aidés',    icon: <Users className="w-8 h-8" />, color: 'from-blue-500 to-cyan-500' },
    { value: '2K+',  label: 'Experts vérifiés',    icon: <Shield className="w-8 h-8" />, color: 'from-green-500 to-emerald-500' },
    { value: '50+',  label: 'Pays couverts',       icon: <Globe className="w-8 h-8" />,  color: 'from-purple-500 to-pink-500' },
    { value: '24/7', label: 'Support urgent',      icon: <Clock className="w-8 h-8" />,  color: 'from-orange-500 to-red-500' }
  ];

  const features = [
    { icon: <Zap className="w-8 h-8" />,        title: 'Connexion instantanée', description: 'Un expert en moins de 5 minutes, 24h/24 et 7j/7.', color: 'from-yellow-500 to-orange-500' },
    { icon: <Shield className="w-8 h-8" />,     title: 'Experts vérifiés',      description: 'Des pros certifiés et notés par la communauté.', color: 'from-green-500 to-teal-500' },
    { icon: <Globe className="w-8 h-8" />,      title: 'Couverture mondiale',   description: '50+ pays, des experts locaux proches de vous.', color: 'from-blue-500 to-purple-500' },
    { icon: <DollarSign className="w-8 h-8" />, title: 'Tarifs transparents',   description: 'Aucun frais caché. Dès 29€ la consultation.', color: 'from-pink-500 to-red-500' }
  ];

  const onInstallClick = useCallback(() => { install(); }, [install]);

  // ======= Pricing dynamique =======
  const { pricing, loading: pricingLoading, error: pricingError } = usePricingConfig();

  const [selectedCurrency, setSelectedCurrency] = useState<'eur' | 'usd'>(() => {
    try {
      const saved = localStorage.getItem('preferredCurrency') as 'eur' | 'usd' | null;
      return saved && ['eur', 'usd'].includes(saved) ? saved : detectUserCurrency();
    } catch {
      return detectUserCurrency();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('preferredCurrency', selectedCurrency);
    } catch {
      /* ignore */
    }
  }, [selectedCurrency]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-950">
        {/* ================= HERO ================= */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              {/* Badge “Nouveau” + PWA */}
              <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full pl-6 pr-2 py-3 border border-white/20 mb-8 touch-manipulation">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-medium">
                  Nouveau — téléchargez l’appli <strong>SOS Expat d’Ulixai</strong> !
                </span>
                <PWAInstallIconWithHint canInstall={canInstall} onInstall={onInstallClick} />
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>

              <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
                <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                  SOS pour
                </span>
                <br />
                <span className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                  Expatriés & Voyageurs
                </span>
              </h1>

              {/* H2 - inchangé */}
              <h2 className="text-2xl md:text-3xl text-white font-semibold max-w-4xl mx-auto mb-3 leading-relaxed">
                Besoin d’aide, d’une solution, d’un coup de main immédiat ?
              </h2>
              {/* H3 - plus fun */}
              <h3 className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed">
                Un expert local vous répond en moins de 5&nbsp;minutes, partout sur la planète... Et dans votre langue !
              </h3>

              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                <a
                  href="/sos-appel"
                  className="group relative overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-orange-500 hover:from-red-700 hover:via-red-600 hover:to-orange-600 text-white px-12 py-6 rounded-3xl font-black text-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-red-500/50 flex items-center space-x-4 border-2 border-red-400/50 touch-manipulation"
                >
                  <Phone className="w-8 h-8 group-hover:animate-pulse" />
                  <span>URGENCE 24/7</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 via-orange-500/30 to-red-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </a>

                <a
                  href="/sos-appel"
                  className="group flex items-center space-x-3 px-10 py-6 rounded-3xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm font-bold text-lg touch-manipulation"
                >
                  <Play className="w-6 h-6" />
                  <span>Voir les experts</span>
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="group text-center p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 touch-manipulation"
                >
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${stat.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <div className="text-white">{stat.icon}</div>
                  </div>
                  <div className="text-4xl font-black text-white mb-2">{stat.value}</div>
                  <div className="text-gray-400 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= EXPERTS (fond clair) ================= */}
        <section className="py-28 bg-gradient-to-b from-white via-rose-50 to-white relative overflow-hidden touch-manipulation">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-red-400/10 to-orange-400/10 rounded-full blur-2xl" />
            <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-2xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-red-100 to-orange-100 backdrop-blur-sm rounded-full px-6 py-3 border border-red-200 mb-6">
                <Shield className="w-5 h-5 text-red-600" />
                <span className="text-red-700 font-bold">Avocats et Expatriés • Disponibles 24/7</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>

              {/* H2 - inchangé */}
              <h2 className="text-5xl font-black text-gray-900 mb-4">
                Nos <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">experts</span> à votre service
              </h2>
              {/* intro plus fun */}
              <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                Moins de 5&nbsp;minutes, et ça sonne : un expert décroche, où que vous soyez, dans votre langue.
              </p>
            </div>

            {/* Correction: suppression de la prop CardComponent non supportée */}
            <ProfilesCarousel />
          </div>
        </section>

        {/* ================= Tarifs (DÉPLACÉ AVANT "Pourquoi choisir") ================= */}
        <section className="py-32 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden" aria-labelledby="pricing-title">
          {/* Évite un avertissement si PRICING_PLANS référencé ailleurs */}
          {void PRICING_PLANS.length}

          {(() => {
            const DEFAULT_USD_RATE = 1.08 as const;

            const formatBothCurrencies = (value: number, currency: 'EUR' | 'USD'): string => {
              return new Intl.NumberFormat(currency === 'EUR' ? 'fr-FR' : 'en-US', {
                style: 'currency',
                currency,
                maximumFractionDigits: 0
              }).format(value);
            };

            interface OfferCardProps {
              badge: string;
              title: string;
              minutes: number;
              euroPrice: number; // utilisé pour le fallback statique
              usdOverride?: number;
              description: string;
              features: string[];
              usdRate?: number;
              accentGradient: string;
              icon: React.ReactNode;
              lightColor: string;
              borderColor: string;
              currency?: 'eur' | 'usd'; // mode statique “devise unique”
              /** Si fourni, on rend ce bloc au lieu du PriceBlock interne */
              renderPrice?: React.ReactNode;
            }

            const PriceBlock: React.FC<{
              euro: number;
              usdRate?: number;
              usdOverride?: number;
              minutes: number;
              currency?: 'eur' | 'usd';
            }> = ({ euro, usdRate, usdOverride, minutes, currency }) => {
              // Mode dynamique : on affiche uniquement la devise sélectionnée (fallback simple)
              if (currency) {
                const code = currency.toUpperCase() as 'EUR' | 'USD';
                const formatted = formatBothCurrencies(euro, code);
                return (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" aria-label="Tarifs et durée">
                    <div className="flex items-end gap-3">
                      <span className="text-5xl font-black text-gray-900 leading-none">{formatted}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white font-semibold">
                      <Clock className="w-4 h-4" />
                      <span>{minutes} minutes</span>
                    </div>
                  </div>
                );
              }

              // Mode statique : EUR principal + USD entre parenthèses
              const effectiveRate: number = typeof usdRate === 'number' ? usdRate : DEFAULT_USD_RATE;
              const usdValue = typeof usdOverride === 'number' ? usdOverride : Math.round(euro * effectiveRate);

              return (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" aria-label="Tarifs et durée">
                  <div className="flex items-end gap-3">
                    <span className="text-5xl font-black text-gray-900 leading-none">{formatBothCurrencies(euro, 'EUR')}</span>
                    <span className="text-2xl font-extrabold text-gray-700 leading-none">({formatBothCurrencies(usdValue, 'USD')})</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white font-semibold">
                    <Clock className="w-4 h-4" />
                    <span>{minutes} minutes</span>
                  </div>
                </div>
              );
            };

            const OfferCard: React.FC<OfferCardProps> = ({
              badge,
              title,
              minutes,
              euroPrice,
              usdOverride,
              description,
              features,
              usdRate,
              accentGradient,
              icon,
              lightColor,
              borderColor,
              currency,
              renderPrice
            }) => {
              return (
                <article
                  className={`group relative h-full flex flex-col p-8 rounded-3xl border ${borderColor} ${lightColor} transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] focus-within:scale-[1.02] overflow-hidden`}
                  aria-label={`${title} – ${minutes} minutes`}
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentGradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300`} />
                  <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-white/80 rounded-full px-4 py-2 text-gray-900 text-sm font-semibold">
                        {icon}
                        {badge}
                      </div>
                      <div className="text-sm text-gray-600">Appel en ~5 min</div>
                    </div>

                    <h3 className="text-2xl font-extrabold text-gray-900 mb-2">{title}</h3>
                    <p className="text-gray-700 mb-6 leading-relaxed">{description}</p>

                    {/* --- Prix : custom si fourni (effective price), sinon fallback --- */}
                    {renderPrice ?? (
                      <PriceBlock
                        euro={euroPrice}
                        usdRate={usdRate}
                        usdOverride={usdOverride}
                        minutes={minutes}
                        currency={currency}
                      />
                    )}

                    <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3" role="list" aria-label="Bénéfices inclus">
                      {features.map((f, i) => (
                        <li key={i} role="listitem" className="flex items-start gap-3">
                          <span className={`mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r ${accentGradient}`}>
                            <Check className="w-3 h-3 text-white" />
                          </span>
                          <span className="text-gray-800">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8 md:mt-auto">
                      <Link
                        to="/sos-appel"
                        className={`inline-flex items-center justify-center w-full px-6 py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ${`bg-gradient-to-r ${accentGradient}`} hover:scale-105`}
                        aria-label={`Réserver ma consultation – ${title}`}
                      >
                        Réserver ma consultation
                      </Link>
                    </div>
                  </div>
                </article>
              );
            };

            // Bénéfices (identiques)
            const expatBenefits: string[] = [
              'Retours d’expérience concrets',
              'Conseils logement, banque, santé, transport',
              'Infos à jour sur démarches et délais',
              'Astuces culturelles & pièges à éviter',
              'Réseau local (contacts utiles)',
              'Accompagnement bienveillant'
            ];
            const lawyerBenefits: string[] = [
              'Analyse rapide de votre situation',
              'Conseils juridiques personnalisés',
              'Confidentialité & sécurité garanties',
              'Réponse en < 5 minutes',
              'Expertise pays concerné',
              'Orientation vers les bonnes procédures'
            ];

            // Exemples (fusionnés)
            const expatExamples: string[] = [
              'Installation : logement, forfait mobile, banque',
              'Scolarité & assurances locales',
              'Préfecture / immigration : RDV & dossiers'
            ];
            const lawyerExamples: string[] = [
              'Contrat de travail : clauses à vérifier',
              'Conflit locatif / commercial — premiers réflexes',
              'Accident / hospitalisation : droits & démarches'
            ];
            const additionalExamples: string[] = [
              'Problèmes justice / police (droits & démarches)',
              'Trouver un job (CV local, entretiens, contrats)',
              'Rencontrer d’autres expatriés (réseau & entraide)'
            ];
            const combinedExamples: string[] = Array.from(
              new Set([...expatExamples, ...lawyerExamples, ...additionalExamples])
            );

            // --------- Fallback statique (ancien rendu) ----------
            const renderStaticPricing = (): JSX.Element => (
              <>
                <div className="relative z-10 max-w-7xl mx-auto px-6">
                  <div className="text-center mb-16">
                    <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-full px-6 py-3 border border-green-500/30 mb-6">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      <span className="text-green-300 font-bold">Transparence totale • Pas de frais cachés</span>
                      <Check className="w-5 h-5 text-green-400" />
                    </div>

                    {/* H2 - inchangé */}
                    <h2 id="pricing-title" className="text-5xl font-black text-white mb-4">
                      Des <span className="bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">tarifs</span> adaptés à vos besoins
                    </h2>
                    {/* intro plus fun */}
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                      Choisissez à qui vous voulez parler… <strong>un avocat</strong> ? <strong>Un expatrié</strong> ?
                    </p>
                  </div>

                  {/* Ordre demandé : Expatrié AVANT Avocat */}
                  <div className="grid gap-8 md:grid-cols-2 items-stretch">
                    <OfferCard
                      badge="Offre Expatrié"
                      title="1 échange avec un expatrié expérimenté"
                      minutes={30}
                      euroPrice={19}
                      usdOverride={25}
                      description="Des conseils concrets, locaux, et tout de suite."
                      features={expatBenefits}
                      accentGradient="from-blue-600 to-indigo-600"
                      icon={<User className="w-4 h-4" />}
                      lightColor="bg-blue-50"
                      borderColor="border-blue-200"
                    />
                    <OfferCard
                      badge="Offre Avocat"
                      title="1 consultation avec un avocat qualifié"
                      minutes={20}
                      euroPrice={49}
                      usdOverride={55}
                      description="Une réponse claire, exploitable, adaptée à votre cas."
                      features={lawyerBenefits}
                      accentGradient="from-red-600 to-red-700"
                      icon={<Briefcase className="w-4 h-4" />}
                      lightColor="bg-red-50"
                      borderColor="border-red-200"
                    />
                  </div>

                  {/* Bloc EXEMPLES commun */}
                  <div
                    className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm p-6 md:p-8"
                    role="region"
                    aria-labelledby="examples-title"
                  >
                    <div className="flex flex-col items-center gap-3 mb-6">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-green-500 to-blue-500">
                        <Sparkles className="text-white w-5 h-5" />
                      </div>
                      {/* H3 - plus fun */}
                      <h3 id="examples-title" className="text-xl md:text-2xl font-extrabold text-white">
                        Situations concrètes
                      </h3>
                      <p className="text-gray-300 text-sm md:text-base">
                        Un expert pour chaque besoin, point.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {combinedExamples.map((ex, i) => (
                        <div
                          key={i}
                          className="group flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </span>
                          <span className="text-white/90">{ex}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Garanties / points-clés */}
                  <div className="mt-14 text-center">
                    <div className="inline-flex items-center space-x-6 bg-white/5 backdrop-blur-sm rounded-2xl px-8 py-4 border border-white/10">
                      <div className="flex items-center space-x-2 text-green-400">
                        <Shield className="w-5 h-5" />
                        <span className="font-medium">Confidentialité & sécurité</span>
                      </div>
                      <div className="w-px h-6 bg-white/20" />
                      <div className="flex items-center space-x-2 text-blue-400">
                        <Globe className="w-5 h-5" />
                        <span className="font-medium">Experts dans 150+ pays</span>
                      </div>
                      <div className="w-px h-6 bg-white/20" />
                      <div className="flex items-center space-x-2 text-purple-400">
                        <Zap className="w-5 h-5" />
                        <span className="font-medium">Réservation instantanée — appel en 5 minutes</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );

            // --------- Rendu principal de la section pricing ----------
            return (
              <>
                <div className="absolute inset-0">
                  <div className="absolute top-0 left-1/3 w-64 h-64 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-6">
                  <div className="text-center mb-16">
                    <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-full px-6 py-3 border border-green-500/30 mb-6">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      <span className="text-green-300 font-bold">Transparence totale • Pas de frais cachés</span>
                      <Check className="w-5 h-5 text-green-400" />
                    </div>

                    {/* H2 - inchangé */}
                    <h2 id="pricing-title" className="text-5xl font-black text-white mb-4">
                      Des <span className="bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">tarifs</span> adaptés à vos besoins
                    </h2>
                    {/* intro plus fun */}
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                      Choisissez à qui vous voulez parler… <strong>un avocat</strong> ? <strong>Un expatrié</strong> ?
                    </p>
                  </div>

                  {/* --- Intégration dynamique --- */}
                  {pricingLoading ? (
                    <div className="text-center py-16">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4" />
                      <p className="text-white">Chargement des tarifs...</p>
                    </div>
                  ) : (pricingError || !pricing) ? (
                    renderStaticPricing()
                  ) : (
                    <>
                      {/* Sélecteur de devise */}
                      <div className="text-center mb-8">
                        <div className="inline-flex bg-white/10 rounded-full p-1 backdrop-blur-sm border border-white/20">
                          <button
                            onClick={() => setSelectedCurrency('eur')}
                            className={`px-6 py-2 rounded-full transition-all font-semibold ${
                              selectedCurrency === 'eur'
                                ? 'bg-white text-gray-900'
                                : 'text-white hover:bg-white/10'
                            }`}
                          >
                            🇪🇺 EUR
                          </button>
                          <button
                            onClick={() => setSelectedCurrency('usd')}
                            className={`px-6 py-2 rounded-full transition-all font-semibold ${
                              selectedCurrency === 'usd'
                                ? 'bg-white text-gray-900'
                                : 'text-white hover:bg-white/10'
                            }`}
                          >
                            🇺🇸 USD
                          </button>
                        </div>
                      </div>

                      {/* ==== Calcul “effective price” + symbole de devise ==== */}
                      {(() => {
                        const currency = selectedCurrency;
                        const currencySymbol = currency === 'eur' ? '€' : '$';

                        // Calculs demandés (exemple fourni pour lawyer)
                        const effLawyer = getEffectivePrice(pricing, 'lawyer', currency) as EffectivePrice;
                        const effExpat  = getEffectivePrice(pricing, 'expat',  currency) as EffectivePrice;

                        // Durées depuis la config (on garde la logique existante)
                        const minutesLawyer = pricing.lawyer[currency].duration;
                        const minutesExpat  = pricing.expat[currency].duration;

                        // Rendu du bloc d’affichage prix (reprend votre snippet)
                        const renderEffPrice = (eff: EffectivePrice, minutes: number) => (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" aria-label="Tarifs et durée">
                            <div className="flex items-end gap-2">
                              {eff.override ? (
                                <div className="flex items-end gap-2">
                                  <span className="line-through text-gray-500">
                                    {currencySymbol}{eff.standard.totalAmount.toFixed(2)}
                                  </span>
                                  <span className="text-2xl sm:text-5xl font-bold">
                                    {currencySymbol}{eff.price.totalAmount.toFixed(2)}
                                  </span>
                                  {eff.override?.label && (
                                    <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                      {eff.override.label}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-2xl sm:text-5xl font-bold">
                                  {currencySymbol}{eff.price.totalAmount.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white font-semibold">
                              <Clock className="w-4 h-4" />
                              <span>{minutes} minutes</span>
                            </div>
                          </div>
                        );

                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                            {/* Card Expatrié - Effective price */}
                            <OfferCard
                              badge="Offre Expatrié"
                              title="1 échange avec un expatrié expérimenté"
                              minutes={minutesExpat}
                              euroPrice={effExpat.price.totalAmount} // non utilisé grâce à renderPrice
                              description="Des conseils concrets, locaux, et tout de suite."
                              features={expatBenefits}
                              accentGradient="from-blue-600 to-indigo-600"
                              icon={<User className="w-4 h-4" />}
                              lightColor="bg-blue-50"
                              borderColor="border-blue-200"
                              renderPrice={renderEffPrice(effExpat, minutesExpat)}
                            />

                            {/* Card Avocat - Effective price */}
                            <OfferCard
                              badge="Offre Avocat"
                              title="1 consultation avec un avocat qualifié"
                              minutes={minutesLawyer}
                              euroPrice={effLawyer.price.totalAmount} // non utilisé grâce à renderPrice
                              description="Une réponse claire, exploitable, adaptée à votre cas."
                              features={lawyerBenefits}
                              accentGradient="from-red-600 to-red-700"
                              icon={<Briefcase className="w-4 h-4" />}
                              lightColor="bg-red-50"
                              borderColor="border-red-200"
                              renderPrice={renderEffPrice(effLawyer, minutesLawyer)}
                            />
                          </div>
                        );
                      })()}

                      {/* Indicateur source prix */}
                      <div className="text-center mt-6">
                        <span className="text-xs text-white/60 bg-white/10 px-3 py-1 rounded-full">
                          💰 Tarifs mis à jour depuis la console admin
                        </span>
                      </div>

                      {/* Bloc EXEMPLES commun */}
                      <div
                        className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm p-6 md:p-8"
                        role="region"
                        aria-labelledby="examples-title"
                      >
                        <div className="flex flex-col items-center gap-3 mb-6">
                          <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-green-500 to-blue-500">
                            <Sparkles className="text-white w-5 h-5" />
                          </div>
                          {/* H3 - plus fun */}
                          <h3 id="examples-title" className="text-xl md:text-2xl font-extrabold text-white">
                            Situations concrètes
                          </h3>
                          <p className="text-gray-300 text-sm md:text-base">
                            Un expert pour chaque besoin, point.
                          </p>
                        </div>

                        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                          {combinedExamples.map((ex, i) => (
                            <div
                              key={i}
                              className="group flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                            >
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </span>
                              <span className="text-white/90">{ex}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Garanties / points-clés */}
                      <div className="mt-14 text-center">
                        <div className="inline-flex items-center space-x-6 bg-white/5 backdrop-blur-sm rounded-2xl px-8 py-4 border border-white/10">
                          <div className="flex items-center space-x-2 text-green-400">
                            <Shield className="w-5 h-5" />
                            <span className="font-medium">Confidentialité & sécurité</span>
                          </div>
                          <div className="w-px h-6 bg-white/20" />
                          <div className="flex items-center space-x-2 text-blue-400">
                            <Globe className="w-5 h-5" />
                            <span className="font-medium">Experts dans 150+ pays</span>
                          </div>
                          <div className="w-px h-6 bg-white/20" />
                          <div className="flex items-center space-x-2 text-purple-400">
                            <Zap className="w-5 h-5" />
                            <span className="font-medium">Réservation instantanée — appel en 5 minutes</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </section>

        {/* ================= Pourquoi choisir (MODIFIÉ) ================= */}
        <section className="py-32 bg-gradient-to-b from-white to-gray-50" aria-labelledby="why-title">
          {void features.length}

          {(() => {
            interface AdvantageItem {
              id: string;
              title: string;
              tagline: string;
              caption: string;
              icon: React.ReactNode;
              gradient: string;
            }

            const advantages: AdvantageItem[] = [
              {
                id: 'speed-worldwide',
                title: 'Un expert en 5 minutes',
                tagline: 'Le service qui vous suit partout.',
                caption: 'Partout • 24/7 • < 5 min',
                icon: <Zap className="w-6 h-6" />,
                gradient: 'from-red-500 to-orange-500'
              },
              {
                id: 'coffee-fast',
                title: 'Avant que votre café refroidisse',
                tagline: 'Avocat ou expatrié, on vous connecte tout de suite.',
                caption: 'Priorité à l’urgence',
                icon: <Clock className="w-6 h-6" />,
                gradient: 'from-yellow-500 to-red-500'
              },
              {
                id: 'multi',
                title: 'Multilingue. Multidevise. Multicountry.',
                tagline: 'On s’adapte à vous — et c’est ultra-rapide.',
                caption: 'Langues • Devises • Pays',
                icon: <Globe className="w-6 h-6" />,
                gradient: 'from-blue-500 to-purple-500'
              }
            ];

            const AdvantageCard: React.FC<{ item: AdvantageItem }> = ({ item }) => {
              return (
                <article
                  className="group relative rounded-3xl border border-gray-200 bg-white p-8 sm:p-10 shadow-sm transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] focus-within:scale-[1.02] text-center"
                  aria-labelledby={`adv-title-${item.id}`}
                  tabIndex={0}
                >
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300 rounded-3xl`}
                    aria-hidden="true"
                  />
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative mb-6">
                      <div className={`mx-auto flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r ${item.gradient} text-white shadow-md`} aria-hidden="true">
                        {item.icon}
                      </div>
                    </div>

                    <h3
                      id={`adv-title-${item.id}`}
                      className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-snug"
                    >
                      {item.title}
                    </h3>

                    <p className="mt-3 text-gray-600 max-w-[36ch]">
                      {item.tagline}
                    </p>

                    <div className="mt-6 flex items-center justify-center">
                      <span className={`inline-flex rounded-full p-[1px] bg-gradient-to-r ${item.gradient}`}>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-gray-600">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-r ${item.gradient}`} />
                          {item.caption}
                        </span>
                      </span>
                    </div>
                  </div>
                </article>
              );
            };

            return (
              <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-12 sm:mb-16">
                  {/* H2 - inchangé */}
                  <h2 id="why-title" className="text-5xl font-black text-gray-900 mb-6">
                    Pourquoi choisir <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">SOS Expats</span> ?
                  </h2>
                  {/* intro plus fun */}
                  <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
                    Pensé pour aller vite, rester clair et vraiment vous accompagner — mobile d’abord.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {advantages.map((adv) => (
                    <AdvantageCard key={adv.id} item={adv} />
                  ))}
                </div>
              </div>
            );
          })()}
        </section>

        {/* ================= Rejoignez SOS Expat — FOND SOMBRE ================= */}
        <section className="py-28 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden" aria-labelledby="join-title">
          {(() => {
            interface JoinCardProps {
              label: string;
              title: string;
              benefits: string[];
              ctaLabel: string;
              ctaHref: string;
              icon: React.ReactNode;
              gradient: string;
            }

            const JoinCard: React.FC<JoinCardProps> = ({
              label,
              title,
              benefits,
              ctaLabel,
              ctaHref,
              icon,
              gradient
            }) => {
              return (
                <article
                  className="group relative h-full flex flex-col rounded-3xl border border-gray-200 bg-white p-8 sm:p-10 shadow-sm transition-all duration-300 hover:shadow-2xl"
                >
                  <div className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${gradient} opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-300`} />
                  <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 border text-gray-700 border-gray-200">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-white bg-gradient-to-r ${gradient}`}>
                          {icon}
                        </span>
                        <span className="text-sm font-semibold">{label}</span>
                      </div>
                    </div>

                    <h3 className="mt-6 text-2xl sm:text-3xl font-black text-gray-900">{title}</h3>

                    <ul className="mt-6 space-y-3" role="list" aria-label="Avantages">
                      {benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className={`mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-white bg-gradient-to-r ${gradient}`}>
                            <Check className="w-3 h-3" />
                          </span>
                          <span className="text-gray-700">{b}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8 md:mt-auto">
                      <a
                        href={ctaHref}
                        className={`group/cta inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white bg-gradient-to-r ${gradient} hover:scale-105 hover:text-white`}
                        aria-label={ctaLabel}
                      >
                        {ctaLabel}
                        <ArrowRight className="w-5 h-5" />
                      </a>
                      <p className="mt-3 text-sm text-gray-500">
                        Astuce : téléchargez l’appli <strong>SOS Expat d’Ulixai</strong> pour passer en ligne/hors ligne quand vous le souhaitez.
                      </p>
                    </div>
                  </div>
                </article>
              );
            };

            // H2 via variable — inchangé
            const joinTitle = 'Faites partie du réseau SOS Expat';
            const joinSubtitle =
              'Avocats ou expatriés : rejoignez-nous et transformez vos compétences en opportunités réelles.';

            const lawyerCard: JoinCardProps = {
              label: 'Avocat',
              title: 'Développez votre activité à l’international',
              benefits: [
                'Augmentez votre chiffre d’affaires avec des consultations de 20 minutes',
                'Paiement rapide : versement sous 24 h',
                'Mettez-vous en ligne/hors ligne quand vous voulez',
                'Visibilité mondiale, clients connectés en < 5 minutes',
                'Toutes langues, euros et dollars',
                'Répondez aux expats, voyageurs et vacanciers'
              ],
              ctaLabel: 'Je suis avocat',
              ctaHref: 'http://localhost:5173/register/lawyer',
              icon: <Briefcase className="w-3.5 h-3.5" />,
              gradient: 'from-red-600 to-orange-600'
            };

            const expatCard: JoinCardProps = {
              label: 'Expatrié',
              title: 'Partagez votre expérience où que vous soyez dans le monde',
              benefits: [
                'Mettez-vous en ligne ou hors ligne à tout moment (contrôle total)',
                'Quand vous recevez des appels, vous gagnez — paiement sous 24 h',
                '30 minutes par appel : des revenus à chaque échange',
                'Plus vous êtes en ligne, plus vos revenus explosent',
                'Clients partout dans le monde, toutes langues',
                'Euros et dollars acceptés',
                'Je veux aider : expats, voyageurs, vacanciers',
                'Inscrivez-vous et décrivez votre expérience & vos connaissances locales'
              ],
              ctaLabel: 'Je suis expatrié',
              ctaHref: 'http://localhost:5173/register/expat',
              icon: <User className="w-3.5 h-3.5" />,
              gradient: 'from-blue-600 to-indigo-600'
            };

            return (
              <div className="relative z-10 max-w-7xl mx-auto px-6">
                <div className="text-center mb-12 sm:mb-16">
                  <h2 id="join-title" className="text-4xl sm:text-5xl font-black text-white mb-4">
                    {joinTitle}
                  </h2>
                  <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto">
                    {joinSubtitle}
                  </p>
                </div>

                {/* Même hauteur des deux cartes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
                  <JoinCard {...expatCard} />
                  <JoinCard {...lawyerCard} />
                </div>
              </div>
            );
          })()}
        </section>

        {/* ================= AVIS (slider auto) — FOND CLAIR ================= */}
        <section className="py-28 sm:py-32 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -top-10 left-1/4 w-80 h-80 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 right-1/4 w-96 h-96 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 sm:mb-14">
              <span className="inline-flex rounded-full p-[1px] bg-gradient-to-r from-yellow-400 to-orange-400 shadow-md mb-5 sm:mb-6">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 sm:px-6 py-2.5 sm:py-3 border border-yellow-200/70 text-yellow-700">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-semibold">4,9/5 • +2 500 avis</span>
                  <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
              </span>

              {/* H2 - inchangé */}
              <h2 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
                Ce que disent nos <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">utilisateurs</span>
              </h2>
              {/* intro plus fun */}
              <p className="mt-3 sm:mt-4 text-base sm:text-xl text-gray-600 max-w-3xl mx-auto">
                Témoignages réels, situations variées — pour que chacun·e s’identifie.
              </p>
            </div>

            <ReviewsSlider theme="light" />
          </div>
        </section>

        {/* ================= CTA final — PRÊT À ÊTRE AIDÉ ================= */}
        <section className="py-32 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
          <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
            {/* H2 - inchangé */}
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6 md:mb-8">
              Prêt à être aidé ?
            </h2>
            {/* intro plus fun */}
            <p className="text-xl md:text-2xl text-white/95 mb-10 md:mb-12 leading-relaxed">
              Rejoignez plus de <strong>15&nbsp;000 expatriés</strong> qui nous font confiance pour avancer à l’étranger.
            </p>

            {/* Réassurance */}
            <div className="mb-10 flex flex-wrap items-center justify-center gap-3 text-white/90">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <Shield className="w-4 h-4" /> Sécurisé
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <Clock className="w-4 h-4" /> <span>Moins de 5&nbsp;minutes</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <Globe className="w-4 h-4" /> Mondial
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <a
                href="/register"
                className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-12 py-6 rounded-3xl font-black text-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl flex items-center gap-4 touch-manipulation"
              >
                <span>Commencer gratuitement</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform duration-300" />
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-black/5" />
              </a>

              <a
                href="/sos-appel"
                className="group relative overflow-hidden border-2 border-white bg-transparent text-white px-12 py-6 rounded-3xl font-bold text-xl transition-all duration-300 hover:scale-105 hover:bg-white/10 flex items-center gap-4 touch-manipulation"
              >
                <Phone className="w-6 h-6" />
                <span>Urgence maintenant</span>
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/30" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default OptimizedHomePage;
