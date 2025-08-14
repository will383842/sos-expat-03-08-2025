import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, Calendar, ArrowLeft, Share2, Facebook, Mail, Briefcase, User, Check, Clock, Shield, Globe, ChevronRight as ChevronRightIcon } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';

interface TestimonialData {
  id: string;
  name: string;
  type: 'lawyer' | 'expat';
  country: string;
  language: 'francophone' | 'anglophone';
  rating: number;
  date: string;
  title: {
    fr: string;
    en: string;
  };
  fullContent: {
    fr: string;
    en: string;
  };
  avatar: string;
  verified: boolean;
  serviceUsed: {
    fr: string;
    en: string;
  };
  duration: string;
  helpType: {
    fr: string[];
    en: string[];
  };
  year: number;
}

// ✅ DONNÉES HARMONISÉES AVEC TESTIMONIALS.TSX
const TESTIMONIALS_DATA: Record<string, TestimonialData> = {
  '1': {
    id: '1',
    name: 'Aisha M.',
    type: 'expat',
    country: 'thailande',
    language: 'francophone',
    rating: 5,
    date: '2024-12-15',
    year: 2024,
    title: {
      fr: 'Aide exceptionnelle pour installation en Thaïlande',
      en: 'Exceptional help for relocation to Thailand'
    },
    fullContent: {
      fr: `Incroyable ! En 3 minutes j'avais un expatrié français au bout du fil depuis Bangkok. Il m'a expliqué toute la procédure visa Thaïlandais, les pièges à éviter et m'a même donné les contacts de son agent immobilier. Service qui change la vie !

L'expatrié connaissait parfaitement les démarches administratives locales et m'a guidé pas à pas. Il connaissait tous les bons plans et m'a évité des mois de galère administrative.

Le service client est réactif et la plateforme très intuitive. Le rapport qualité-prix est imbattable et la réactivité impressionnante.

Je recommande vivement SOS Expat & Travelers pour tous les expatriés qui ont besoin d'aide pratique urgente. C'est un service qui peut vraiment vous sauver dans des situations compliquées à l'étranger.

La qualité du conseil était exceptionnelle, avec la rapidité et la praticité d'un service en ligne moderne. Parfait pour les installations à l'étranger !`,
      en: `Incredible! In 3 minutes I had a French expat on the phone from Bangkok. He explained the entire Thai visa procedure, pitfalls to avoid and even gave me his real estate agent's contacts. Life-changing service!

The expat knew the local administrative procedures perfectly and guided me step by step. He knew all the good tips and saved me months of administrative hassle.

Customer service is responsive and the platform very intuitive. The value for money is unbeatable and the responsiveness impressive.

I highly recommend SOS Expat & Travelers for all expats who need urgent practical help. It's a service that can really save you in complicated situations abroad.

The quality of advice was exceptional, with the speed and practicality of a modern online service. Perfect for relocations abroad!`
    },
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b74193d4?auto=format&fit=crop&w=400&h=400&q=80',
    verified: true,
    serviceUsed: {
      fr: 'Appel Expatrié',
      en: 'Expat Call'
    },
    duration: '20 minutes',
    helpType: {
      fr: ['Installation', 'Visa', 'Logement', 'Conseils pratiques'],
      en: ['Relocation', 'Visa', 'Housing', 'Practical advice']
    }
  },
  '2': {
    id: '2',
    name: 'Chen L.',
    type: 'expat',
    country: 'canada',
    language: 'francophone',
    rating: 5,
    date: '2024-11-20',
    year: 2024,
    title: {
      fr: 'Installation réussie à Vancouver',
      en: 'Successful relocation to Vancouver'
    },
    fullContent: {
      fr: `Génial ! L'expatrié m'a aidé avec mon installation à Vancouver. Banque, logement, assurance santé, transport... tout en 30 minutes ! Il connaissait tous les bons plans et m'a évité des mois de galère administrative.

L'expatrié connaissait parfaitement les démarches administratives locales et m'a guidé pas à pas. Il m'a même envoyé des liens utiles après notre appel.

Le rapport qualité-prix est imbattable. Pour seulement 19€, j'ai économisé des semaines de recherches et de stress. La plateforme est très facile à utiliser, même pour les personnes peu à l'aise avec la technologie.

Je n'hésiterai pas à faire appel à leurs services à nouveau si j'ai d'autres questions sur la vie au Canada. Un grand merci à toute l'équipe SOS Expats !`,
      en: `Great! The expat helped me with my installation in Vancouver. Banking, housing, health insurance, transport... everything in 30 minutes! He knew all the good tips and saved me months of administrative hassle.

The expat knew the local administrative procedures perfectly and guided me step by step. He even sent me useful links after our call.

The value for money is unbeatable. For only €19, I saved weeks of research and stress. The platform is very easy to use, even for people who are not comfortable with technology.

I won't hesitate to use their services again if I have other questions about life in Canada. A big thank you to the entire SOS Expats team!`
    },
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80',
    verified: true,
    serviceUsed: {
      fr: 'Appel Expatrié',
      en: 'Expat Call'
    },
    duration: '30 minutes',
    helpType: {
      fr: ['Démarches administratives', 'Installation', 'Logement', 'Banque'],
      en: ['Administrative procedures', 'Relocation', 'Housing', 'Banking']
    }
  },
  '10': {
    id: '10',
    name: 'James P.',
    type: 'lawyer',
    country: 'royaume-uni',
    language: 'francophone',
    rating: 5,
    date: '2024-12-12',
    year: 2024,
    title: {
      fr: 'Aide juridique exceptionnelle à Londres',
      en: 'Exceptional legal help in London'
    },
    fullContent: {
      fr: `Avocat exceptionnel ! Depuis Londres, problème urgent avec mon propriétaire. L'avocat m'a expliqué mes droits en droit anglais, les démarches à suivre et m'a orienté vers un solicitor local. Précis et efficace !

L'avocat connaissait parfaitement le droit immobilier britannique et m'a donné des conseils précis pour résoudre mon conflit avec le propriétaire. Il m'a expliqué toutes mes options légales de manière claire et professionnelle.

Le service de prise de rendez-vous est très flexible, j'ai pu avoir ma consultation le jour même. La qualité de l'appel était excellente, sans problèmes techniques.

Je recommande vivement ce service pour tous les expatriés qui ont besoin d'aide juridique urgente au Royaume-Uni. Un gain de temps et d'argent considérable !

La qualité du conseil était au niveau d'un cabinet d'avocat traditionnel, mais avec la rapidité et la praticité d'un service en ligne moderne. Parfait pour les urgences juridiques !`,
      en: `Exceptional lawyer! From London, urgent problem with my landlord. The lawyer explained my rights under English law, the steps to follow and directed me to a local solicitor. Precise and efficient!

The lawyer knew British property law perfectly and gave me precise advice to resolve my conflict with the landlord. He explained all my legal options clearly and professionally.

The appointment booking service is very flexible, I was able to have my consultation the same day. The call quality was excellent, without technical problems.

I highly recommend this service for all expats who need urgent legal help in the UK. Considerable time and money savings!

The quality of advice was at the level of a traditional law firm, but with the speed and practicality of a modern online service. Perfect for legal emergencies!`
    },
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80',
    verified: true,
    serviceUsed: {
      fr: 'Appel Avocat',
      en: 'Lawyer Call'
    },
    duration: '25 minutes',
    helpType: {
      fr: ['Droit immobilier', 'Droit des baux', 'Conseil juridique', 'Contentieux'],
      en: ['Property law', 'Tenancy law', 'Legal advice', 'Litigation']
    }
  },
  '13': {
    id: '13',
    name: 'Maria G.',
    type: 'lawyer',
    country: 'etats-unis',
    language: 'francophone',
    rating: 5,
    date: '2024-12-01',
    year: 2024,
    title: {
      fr: 'Problème visa résolu aux États-Unis',
      en: 'Visa problem solved in the United States'
    },
    fullContent: {
      fr: `Avocat brillant ! Problème de visa aux États-Unis, il m'a expliqué toutes les procédures d'immigration, les risques et solutions. Grâce à lui, j'ai évité l'expulsion !

L'avocat spécialisé en droit de l'immigration américaine m'a donné des conseils précis et m'a orienté vers les bonnes démarches. Il connaissait parfaitement la législation américaine et française.

Le service client est réactif et la plateforme très intuitive. J'ai reçu un suivi détaillé après l'appel avec tous les documents nécessaires.

Je recommande vivement SOS Expat & Travelers pour tous les expatriés qui ont des problèmes juridiques urgents. C'est un service qui peut vraiment vous sauver dans des situations critiques.

La qualité du conseil était exceptionnelle, avec une expertise pointue en droit de l'immigration. Service indispensable pour les expatriés !`,
      en: `Brilliant lawyer! Visa problem in the United States, he explained all immigration procedures, risks and solutions. Thanks to him, I avoided deportation!

The lawyer specialized in American immigration law gave me precise advice and directed me to the right procedures. He knew American and French legislation perfectly.

Customer service is responsive and the platform very intuitive. I received detailed follow-up after the call with all necessary documents.

I highly recommend SOS Expat & Travelers for all expats who have urgent legal problems. It's a service that can really save you in critical situations.

The quality of advice was exceptional, with sharp expertise in immigration law. Indispensable service for expats!`
    },
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&h=400&q=80',
    verified: true,
    serviceUsed: {
      fr: 'Appel Avocat',
      en: 'Lawyer Call'
    },
    duration: '35 minutes',
    helpType: {
      fr: ['Droit de l\'immigration', 'Visa', 'Procédures administratives', 'Droit américain'],
      en: ['Immigration law', 'Visa', 'Administrative procedures', 'American law']
    }
  }
};

// Country translations / Traductions des pays
const COUNTRY_TRANSLATIONS: Record<string, { fr: string; en: string }> = {
  'thailande': { fr: 'Thaïlande', en: 'Thailand' },
  'espagne': { fr: 'Espagne', en: 'Spain' },
  'canada': { fr: 'Canada', en: 'Canada' },
  'france': { fr: 'France', en: 'France' },
  'allemagne': { fr: 'Allemagne', en: 'Germany' },
  'italie': { fr: 'Italie', en: 'Italy' },
  'portugal': { fr: 'Portugal', en: 'Portugal' },
  'belgique': { fr: 'Belgique', en: 'Belgium' },
  'suisse': { fr: 'Suisse', en: 'Switzerland' },
  'royaume-uni': { fr: 'Royaume-Uni', en: 'United Kingdom' },
  'etats-unis': { fr: 'États-Unis', en: 'United States' },
  'australie': { fr: 'Australie', en: 'Australia' },
  'japon': { fr: 'Japon', en: 'Japan' },
  'bresil': { fr: 'Brésil', en: 'Brazil' },
  'mexique': { fr: 'Mexique', en: 'Mexico' },
  'argentine': { fr: 'Argentine', en: 'Argentina' },
  'chili': { fr: 'Chili', en: 'Chile' },
  'colombie': { fr: 'Colombie', en: 'Colombia' },
  'perou': { fr: 'Pérou', en: 'Peru' },
  'maroc': { fr: 'Maroc', en: 'Morocco' },
  'tunisie': { fr: 'Tunisie', en: 'Tunisia' },
  'senegal': { fr: 'Sénégal', en: 'Senegal' },
  'cote-divoire': { fr: 'Côte d\'Ivoire', en: 'Ivory Coast' },
  'vietnam': { fr: 'Vietnam', en: 'Vietnam' },
  'cambodge': { fr: 'Cambodge', en: 'Cambodia' },
  'inde': { fr: 'Inde', en: 'India' },
  'chine': { fr: 'Chine', en: 'China' },
  'singapour': { fr: 'Singapour', en: 'Singapore' },
  'malaisie': { fr: 'Malaisie', en: 'Malaysia' },
  'indonesie': { fr: 'Indonésie', en: 'Indonesia' },
  'philippines': { fr: 'Philippines', en: 'Philippines' },
  'coree-du-sud': { fr: 'Corée du Sud', en: 'South Korea' },
  'nouvelle-zelande': { fr: 'Nouvelle-Zélande', en: 'New Zealand' },
  'afrique-du-sud': { fr: 'Afrique du Sud', en: 'South Africa' },
  'emirats-arabes-unis': { fr: 'Émirats Arabes Unis', en: 'United Arab Emirates' },
  'qatar': { fr: 'Qatar', en: 'Qatar' },
  'arabie-saoudite': { fr: 'Arabie Saoudite', en: 'Saudi Arabia' },
  'turquie': { fr: 'Turquie', en: 'Turkey' },
  'grece': { fr: 'Grèce', en: 'Greece' },
  'croatie': { fr: 'Croatie', en: 'Croatia' },
  'pologne': { fr: 'Pologne', en: 'Poland' },
  'republique-tcheque': { fr: 'République Tchèque', en: 'Czech Republic' },
  'hongrie': { fr: 'Hongrie', en: 'Hungary' },
  'roumanie': { fr: 'Roumanie', en: 'Romania' },
  'bulgarie': { fr: 'Bulgarie', en: 'Bulgaria' },
  'russie': { fr: 'Russie', en: 'Russia' },
  'ukraine': { fr: 'Ukraine', en: 'Ukraine' },
  'norvege': { fr: 'Norvège', en: 'Norway' },
  'suede': { fr: 'Suède', en: 'Sweden' },
  'danemark': { fr: 'Danemark', en: 'Denmark' },
  'finlande': { fr: 'Finlande', en: 'Finland' },
  'islande': { fr: 'Islande', en: 'Iceland' },
  'irlande': { fr: 'Irlande', en: 'Ireland' },
  'pays-bas': { fr: 'Pays-Bas', en: 'Netherlands' },
  'luxembourg': { fr: 'Luxembourg', en: 'Luxembourg' },
  'autriche': { fr: 'Autriche', en: 'Austria' }
};

const TestimonialDetail: React.FC = () => {
  // ✅ USEPARAMS CORRIGÉ AVEC LA NOUVELLE STRUCTURE URL
  const { serviceType, country, year, language: urlLanguage, id } = useParams<{
    serviceType: string;
    country: string;
    year: string;
    language: string;
    id: string;
  }>();
  
  const navigate = useNavigate();
  const { language } = useApp();

  // ✅ FALLBACK SUR ID SI PAS TROUVÉ
  const testimonialData = useMemo(() => {
    const data = TESTIMONIALS_DATA[id || '1'];
    if (!data) {
      // Fallback sur le premier témoignage disponible
      return TESTIMONIALS_DATA['1'];
    }
    return data;
  }, [id]);

  // Memoization of date formatting / Mémoisation du formatage de date
  const formattedDate = useMemo(() => {
    const date = new Date(testimonialData.date);
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [testimonialData.date, language]);

  // Memoization of stars / Mémoisation des étoiles
  const stars = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={20}
        className={i < testimonialData.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
      />
    ));
  }, [testimonialData.rating]);

  // Get country translation / Obtenir la traduction du pays
  const getCountryName = (countryKey: string): string => {
    const translation = COUNTRY_TRANSLATIONS[countryKey];
    if (translation) {
      return language === 'fr' ? translation.fr : translation.en;
    }
    return countryKey.charAt(0).toUpperCase() + countryKey.slice(1);
  };

  // Optimized share function / Fonction de partage optimisée
  const handleShare = (platform: string) => {
    const currentUrl = window.location.href;
    const titleText = language === 'fr' 
      ? `${testimonialData.name} a sollicité un ${testimonialData.type === 'lawyer' ? 'avocat' : 'expatrié'} - ${testimonialData.title.fr}`
      : `${testimonialData.name} consulted a ${testimonialData.type === 'lawyer' ? 'lawyer' : 'expat'} - ${testimonialData.title.en}`;
    const contentText = language === 'fr' ? testimonialData.fullContent.fr : testimonialData.fullContent.en;
    const description = `${contentText.substring(0, 100)}...`;
    
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}&quote=${encodeURIComponent(`${titleText}\n\n${description}`)}`,
      email: `mailto:?subject=${encodeURIComponent(titleText)}&body=${encodeURIComponent(`${description}\n\n${currentUrl}`)}`
    };

    if (platform === 'copy') {
      navigator.clipboard?.writeText(currentUrl).then(() => {
        alert(language === 'fr' ? 'Lien copié !' : 'Link copied!');
      }).catch(() => {
        // Fallback for unsupported browsers / Fallback pour les navigateurs non supportés
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert(language === 'fr' ? 'Lien copié !' : 'Link copied!');
      });
    } else if (shareUrls[platform as keyof typeof shareUrls]) {
      if (platform === 'email') {
        window.location.href = shareUrls[platform as keyof typeof shareUrls];
      } else {
        window.open(shareUrls[platform as keyof typeof shareUrls], '_blank', 'noopener,noreferrer');
      }
    }
  };

  // Optimized texts according to language / Textes optimisés selon la langue
  const texts = {
    fr: {
      backToTestimonials: 'Retour aux témoignages',
      verified: 'Vérifié',
      solicitedLawyer: 'A sollicité un avocat',
      solicitedExpat: 'A sollicité un expatrié',
      shareTestimonial: 'Partager ce témoignage',
      serviceDetails: 'Détails du service',
      serviceUsed: 'Service utilisé',
      duration: 'Durée',
      helpType: 'Type d\'aide',
      needHelp: 'Besoin d\'aide aussi ?',
      helpDescription: 'Obtenez de l\'aide d\'un expert vérifié en moins de 5 minutes',
      findExpert: 'Trouver un expert',
      otherTestimonials: 'Autres témoignages',
      viewAllTestimonials: 'Voir tous les témoignages',
      shareOnFacebook: 'Partager sur Facebook',
      shareByEmail: 'Partager par email',
      copyLink: 'Copier le lien',
      secured: 'Sécurisé',
      lessThan5Min: 'Moins de 5 min',
      worldwide: 'Mondial',
      reviews: 'avis',
      minutesAbbrev: 'minutes',
      testimonialPageTitle: 'Témoignage de',
      testimonialPageDescription: 'Découvrez l\'expérience de nos utilisateurs avec nos experts avocats et expatriés. Conseils juridiques et pratiques pour expatriés.',
      lawyerConsultation: 'Consultation d\'avocat',
      expatConsultation: 'Consultation d\'expatrié',
      readTestimonial: 'Lire le témoignage de',
      userExperience: 'Expérience utilisateur',
      expertAdvice: 'Conseils d\'expert',
      customerSatisfaction: 'Satisfaction client',
      internationalSupport: 'Support international',
      starsOutOf5: 'étoiles sur 5'
    },
    en: {
      backToTestimonials: 'Back to testimonials',
      verified: 'Verified',
      solicitedLawyer: 'Consulted a lawyer',
      solicitedExpat: 'Consulted an expat',
      shareTestimonial: 'Share this testimonial',
      serviceDetails: 'Service details',
      serviceUsed: 'Service used',
      duration: 'Duration',
      helpType: 'Help type',
      needHelp: 'Need help too?',
      helpDescription: 'Get help from a verified expert in less than 5 minutes',
      findExpert: 'Find an expert',
      otherTestimonials: 'Other testimonials',
      viewAllTestimonials: 'View all testimonials',
      shareOnFacebook: 'Share on Facebook',
      shareByEmail: 'Share by email',
      copyLink: 'Copy link',
      secured: 'Secured',
      lessThan5Min: 'Less than 5 min',
      worldwide: 'Worldwide',
      reviews: 'reviews',
      minutesAbbrev: 'minutes',
      testimonialPageTitle: 'Testimonial from',
      testimonialPageDescription: 'Discover the experience of our users with our expert lawyers and expats. Legal and practical advice for expats.',
      lawyerConsultation: 'Lawyer consultation',
      expatConsultation: 'Expat consultation',
      readTestimonial: 'Read testimonial from',
      userExperience: 'User experience',
      expertAdvice: 'Expert advice',
      customerSatisfaction: 'Customer satisfaction',
      internationalSupport: 'International support',
      starsOutOf5: 'stars out of 5'
    }
  };

  const t = texts[language === 'fr' ? 'fr' : 'en'];

  // SEO Meta data / Données méta SEO
  const currentTitle = language === 'fr' ? testimonialData.title.fr : testimonialData.title.en;
  const currentContent = language === 'fr' ? testimonialData.fullContent.fr : testimonialData.fullContent.en;
  const pageTitle = `${t.testimonialPageTitle} ${testimonialData.name} - ${currentTitle}`;
  const pageDescription = `${t.testimonialPageDescription} ${currentContent.substring(0, 160)}...`;
  const countryName = getCountryName(testimonialData.country);

  // Set page title for SEO / Définir le titre de la page pour le SEO
  React.useEffect(() => {
    document.title = pageTitle;
    
    // Set meta description / Définir la méta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', pageDescription);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = pageDescription;
      document.head.appendChild(meta);
    }

    // Set Open Graph meta tags / Définir les méta tags Open Graph
    const setOrCreateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (meta) {
        meta.setAttribute('content', content);
      } else {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    };

    setOrCreateMeta('og:title', pageTitle);
    setOrCreateMeta('og:description', pageDescription);
    setOrCreateMeta('og:type', 'article');
    setOrCreateMeta('og:url', window.location.href);
    setOrCreateMeta('og:image', testimonialData.avatar);
    
    // Set structured data for better SEO / Définir les données structurées pour un meilleur SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Review",
      "itemReviewed": {
        "@type": "Service",
        "name": language === 'fr' ? "SOS Expat & Travelers" : "SOS Expat & Travelers",
        "description": language === 'fr' 
          ? "Service de consultation juridique et pratique pour expatriés" 
          : "Legal and practical consultation service for expats"
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": testimonialData.rating,
        "bestRating": 5
      },
      "author": {
        "@type": "Person",
        "name": testimonialData.name
      },
      "reviewBody": currentContent,
      "datePublished": testimonialData.date,
      "publisher": {
        "@type": "Organization",
        "name": "SOS Expat & Travelers"
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // Cleanup function / Fonction de nettoyage
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [pageTitle, pageDescription, testimonialData, currentContent, language]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Modern header with gradient and visual effects / Header moderne avec gradient et effets visuels */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10"></div>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <button
              onClick={() => navigate('/testimonials')}
              className="group flex items-center space-x-3 text-white/80 hover:text-white mb-8 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-xl p-3 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20"
              aria-label={t.backToTestimonials}
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-300" />
              <span className="font-semibold">{t.backToTestimonials}</span>
            </button>
            
            <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8 space-y-6 lg:space-y-0">
              {/* Avatar with modern design / Avatar avec design moderne */}
              <div className="flex-shrink-0 mx-auto lg:mx-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-white/20 rounded-3xl blur-xl"></div>
                  <div className="relative w-32 h-32 rounded-3xl overflow-hidden border-4 border-white/30 shadow-2xl">
                    <img
                      src={testimonialData.avatar}
                      alt={`${t.readTestimonial} ${testimonialData.name}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 text-center lg:text-left">
                {/* Modern exchange type badge / Badge type d'échange moderne */}
                <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white">
                  {testimonialData.type === 'lawyer' ? 
                    <Briefcase size={16} className="text-red-400" /> : 
                    <User size={16} className="text-blue-400" />
                  }
                  <span className="font-semibold text-sm">
                    {testimonialData.type === 'lawyer' ? t.solicitedLawyer : t.solicitedExpat}
                  </span>
                </div>
                
                <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-4 mb-4">
                  <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight">{testimonialData.name}</h1>
                  {testimonialData.verified && (
                    <span className="inline-flex items-center gap-2 bg-green-500/20 border border-green-400/30 text-green-300 text-sm px-3 py-1.5 rounded-full backdrop-blur-sm">
                      <Shield size={14} />
                      {t.verified}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-6 text-white/80 mb-6">
                  <div className="flex items-center justify-center lg:justify-start space-x-2">
                    <MapPin size={18} className="text-blue-400" />
                    <span className="font-medium">{countryName}</span>
                  </div>
                  <div className="flex items-center justify-center lg:justify-start space-x-2">
                    <Calendar size={18} className="text-purple-400" />
                    <span className="font-medium">{formattedDate}</span>
                  </div>
                  <div className="flex items-center justify-center lg:justify-start space-x-2">
                    <Clock size={18} className="text-orange-400" />
                    <span className="font-medium">{testimonialData.duration}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
                  <div className="flex" role="img" aria-label={`${testimonialData.rating} ${t.starsOutOf5}`}>
                    {stars}
                  </div>
                  <span className="text-white/90 font-semibold">({testimonialData.rating}/5)</span>
                </div>

                <h2 className="text-2xl lg:text-3xl font-bold text-white/95 leading-relaxed">
                  {language === 'fr' ? testimonialData.title.fr : testimonialData.title.en}
                </h2>
              </div>
            </div>
          </div>
        </section>

        {/* Main content with modern design / Contenu principal avec design moderne */}
        <main className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Main content / Contenu principal */}
            <article className="xl:col-span-2">
              <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
                {/* Subtle gradient effect / Effet de gradient subtil */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/30 pointer-events-none"></div>
                
                <div className="relative z-10 p-8 lg:p-12">
                  <div className="prose prose-lg max-w-none">
                    {(language === 'fr' ? testimonialData.fullContent.fr : testimonialData.fullContent.en)
                      .split('\n\n')
                      .map((paragraph, index) => (
                        <p key={index} className="text-gray-700 leading-8 mb-6 last:mb-0 text-lg">
                          {paragraph.trim()}
                        </p>
                      ))}
                  </div>

                  {/* Modern sharing section / Section de partage moderne */}
                  <div className="border-t border-gray-200 pt-8 mt-12">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                      <Share2 size={24} className="text-blue-500" />
                      {t.shareTestimonial}
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { platform: 'facebook', icon: Facebook, title: t.shareOnFacebook, bg: 'bg-blue-600 hover:bg-blue-700' },
                        { platform: 'email', icon: Mail, title: t.shareByEmail, bg: 'bg-gray-600 hover:bg-gray-700' },
                        { platform: 'copy', icon: Share2, title: t.copyLink, bg: 'bg-green-600 hover:bg-green-700' }
                      ].map(({ platform, icon: Icon, title, bg }) => (
                        <button
                          key={platform}
                          onClick={() => handleShare(platform)}
                          className={`group flex items-center gap-3 ${bg} text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
                          title={title}
                          aria-label={title}
                        >
                          <Icon size={20} />
                          <span className="hidden sm:inline">{title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* Modern sidebar / Sidebar moderne */}
            <aside className="xl:col-span-1 space-y-8">
              {/* Service details with modern design / Détails du service avec design moderne */}
              <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white pointer-events-none"></div>
                
                <div className="relative z-10 p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${testimonialData.type === 'lawyer' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                      {testimonialData.type === 'lawyer' ? <Briefcase size={20} /> : <User size={20} />}
                    </div>
                    {t.serviceDetails}
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-sm text-gray-500 block font-medium mb-1">{t.serviceUsed}</span>
                      <div className="font-bold text-gray-900 text-lg">
                        {language === 'fr' ? testimonialData.serviceUsed.fr : testimonialData.serviceUsed.en}
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-sm text-gray-500 block font-medium mb-1">{t.duration}</span>
                      <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        <Clock size={18} className="text-orange-500" />
                        {testimonialData.duration}
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-sm text-gray-500 block font-medium mb-3">{t.helpType}</span>
                      <div className="flex flex-wrap gap-2">
                        {(language === 'fr' ? testimonialData.helpType.fr : testimonialData.helpType.en).map((type, index) => (
                          <span
                            key={index}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                              testimonialData.type === 'lawyer' 
                                ? 'bg-red-100 text-red-700 border border-red-200' 
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modern CTA / CTA moderne */}
              <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 pointer-events-none"></div>
                
                <div className="relative z-10 p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 text-white mb-4 shadow-lg">
                    <Shield size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{t.needHelp}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {t.helpDescription}
                  </p>
                  
                  {/* Reassurance points / Points de réassurance */}
                  <div className="flex flex-wrap justify-center gap-3 mb-6 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
                      <Check size={14} />
                      {t.secured}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-blue-600 font-medium">
                      <Clock size={14} />
                      {t.lessThan5Min}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-purple-600 font-medium">
                      <Globe size={14} />
                      {t.worldwide}
                    </span>
                  </div>

                  <a
                    href="/sos-appel"
                    className="group inline-flex items-center justify-center w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-lg hover:from-red-700 hover:to-orange-700 transition-all duration-300 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    {t.findExpert}
                    <ChevronRightIcon size={20} className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* Related testimonials section with modern design / Section témoignages connexes avec design moderne */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10"></div>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20 mb-6">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-bold">4,9/5 • +2 500 {t.reviews}</span>
            </div>

            <h3 className="text-4xl lg:text-5xl font-black text-white mb-4">
              {t.otherTestimonials}
            </h3>
            <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
              {language === 'fr' 
                ? 'Découvrez d\'autres témoignages d\'expatriés et voyageurs qui ont fait confiance à nos experts.'
                : 'Discover other testimonials from expats and travelers who trusted our experts.'
              }
            </p>
            
            <a
              href="/testimonials"
              className="group inline-flex items-center gap-3 bg-white text-gray-900 hover:bg-gray-100 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {t.viewAllTestimonials}
              <ChevronRightIcon size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
            </a>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default TestimonialDetail;