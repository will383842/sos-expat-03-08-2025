import React, { useState, useEffect, memo } from 'react';
import { 
  ArrowRight, Play, Shield, Globe, Users, Zap, DollarSign, 
  Check, Star, Quote, ChevronRight, Phone, Heart, Award,
  TrendingUp, Clock, MapPin, Sparkles, ChevronLeft
} from 'lucide-react';

// Note: Dans un vrai projet, vous importeriez le header depuis '../components/layout/header'
// Pour cette démo, le header sera inclus directement ou importé selon votre structure

// Types pour TypeScript
interface Testimonial {
  id: string;
  name: string;
  role: string;
  location: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  helpful: number;
}

interface Stat {
  value: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface Profile {
  id: string;
  name: string;
  role: string;
  specialty: string;
  location: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  responseTime: string;
  languages: string[];
  verified: boolean;
  online: boolean;
  price: string;
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

// Données des témoignages
const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    name: 'Marie Dubois',
    role: 'Expatriée',
    location: 'Tokyo, Japon',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b107?w=150&h=150&fit=crop&crop=face',
    rating: 5,
    comment: 'SOS Expats m\'a sauvé la vie lors de mon déménagement au Japon. L\'avocat spécialisé en droit du travail international que j\'ai trouvé via la plateforme m\'a aidé à négocier mon contrat et mes conditions. Service exceptionnel, réactif 24/7 !',
    date: '2024-12-15',
    verified: true,
    helpful: 47
  },
  {
    id: '2',
    name: 'Alexandre Martin',
    role: 'Entrepreneur',
    location: 'Singapour',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    rating: 5,
    comment: 'Incroyable ! J\'ai créé ma société à Singapour en moins de 2 semaines grâce à l\'expertise des consultants recommandés. La plateforme est intuitive, les professionnels sont vérifiés et ultra-compétents. Je recommande vivement !',
    date: '2024-12-10',
    verified: true,
    helpful: 32
  },
  {
    id: '3',
    name: 'Sophie Chen',
    role: 'Directrice Marketing',
    location: 'New York, USA',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    rating: 5,
    comment: 'Une urgence médicale à 3h du matin, et en 10 minutes j\'avais un avocat spécialisé en assurance santé internationale au téléphone. Problème résolu en 24h. Cette plateforme change vraiment la vie des expatriés !',
    date: '2024-12-08',
    verified: true,
    helpful: 63
  }
];

// Données des profils d'experts
const EXPERT_PROFILES: Profile[] = [
  {
    id: '1',
    name: 'Maître Sarah Dubois',
    role: 'Avocate',
    specialty: 'Droit du Travail International',
    location: 'Dubai, UAE',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face',
    rating: 4.9,
    reviewCount: 127,
    responseTime: '< 5 min',
    languages: ['Français', 'Anglais', 'Arabe'],
    verified: true,
    online: true,
    price: 'à partir de 89€/h'
  },
  {
    id: '2',
    name: 'Alexandre Martin',
    role: 'Consultant Fiscal',
    specialty: 'Fiscalité Internationale',
    location: 'Singapour',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    rating: 4.8,
    reviewCount: 93,
    responseTime: '< 10 min',
    languages: ['Français', 'Anglais', 'Mandarin'],
    verified: true,
    online: true,
    price: 'à partir de 120€/h'
  },
  {
    id: '3',
    name: 'Dr. Marie Chen',
    role: 'Consultante RH',
    specialty: 'Expatriation & Mobilité',
    location: 'New York, USA',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b107?w=150&h=150&fit=crop&crop=face',
    rating: 5.0,
    reviewCount: 156,
    responseTime: '< 3 min',
    languages: ['Français', 'Anglais'],
    verified: true,
    online: false,
    price: 'à partir de 95€/h'
  },
  {
    id: '4',
    name: 'Jean-Pierre Rousseau',
    role: 'Notaire',
    specialty: 'Immobilier International',
    location: 'Londres, UK',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    rating: 4.7,
    reviewCount: 84,
    responseTime: '< 15 min',
    languages: ['Français', 'Anglais'],
    verified: true,
    online: true,
    price: 'à partir de 150€/h'
  },
  {
    id: '5',
    name: 'Sophie Laurent',
    role: 'Experte Assurance',
    specialty: 'Assurance Santé Internationale',
    location: 'Tokyo, Japon',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    rating: 4.9,
    reviewCount: 112,
    responseTime: '< 7 min',
    languages: ['Français', 'Anglais', 'Japonais'],
    verified: true,
    online: true,
    price: 'à partir de 75€/h'
  }
];

// Plans de pricing
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

// Composant principal de la page d'accueil
const OptimizedHomePage: React.FC = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [currentProfile, setCurrentProfile] = useState(0);

  // Auto-rotation des témoignages
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Auto-rotation des profils
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentProfile((prev) => (prev + 1) % EXPERT_PROFILES.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  // Stats impressionnantes
  const stats: Stat[] = [
    {
      value: '15K+',
      label: 'Expatriés aidés',
      icon: <Users className="w-8 h-8" />,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      value: '2K+',
      label: 'Experts vérifiés',
      icon: <Shield className="w-8 h-8" />,
      color: 'from-green-500 to-emerald-500'
    },
    {
      value: '50+',
      label: 'Pays couverts',
      icon: <Globe className="w-8 h-8" />,
      color: 'from-purple-500 to-pink-500'
    },
    {
      value: '24/7',
      label: 'Support urgent',
      icon: <Clock className="w-8 h-8" />,
      color: 'from-orange-500 to-red-500'
    }
  ];

  const features = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Connexion Instantanée",
      description: "Trouvez un expert en moins de 5 minutes, 24h/24 et 7j/7",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Experts Vérifiés",
      description: "Tous nos professionnels sont certifiés et évalués par la communauté",
      color: "from-green-500 to-teal-500"
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Couverture Mondiale",
      description: "Plus de 50 pays couverts avec des experts locaux",
      color: "from-blue-500 to-purple-500"
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: "Tarifs Transparents",
      description: "Pas de frais cachés, consultations dès 29€",
      color: "from-pink-500 to-red-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header - Dans votre projet, remplacez par: <ModernHeader2025 /> */}
      <div className="h-20 bg-gray-900 flex items-center justify-center border-b border-white/10">
        <div className="text-white font-bold text-xl">
          📍 Emplacement du Header - Importez votre composant ModernHeader2025 ici
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10" />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20 mb-8">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-medium">Nouveau : Support IA 24/7</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>

            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
              <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                SOS pour
              </span>
              <br />
              <span className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                Expatriés
              </span>
            </h1>

            <p className="text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed">
              <strong className="text-white">Assistance juridique et administrative instantanée</strong> pour expatriés. 
              Trouvez un expert local en moins de 5 minutes, partout dans le monde.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <a
                href="/sos-appel"
                className="group relative overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-orange-500 hover:from-red-700 hover:via-red-600 hover:to-orange-600 text-white px-12 py-6 rounded-3xl font-black text-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-red-500/50 flex items-center space-x-4 border-2 border-red-400/50"
              >
                <Phone className="w-8 h-8 group-hover:animate-pulse" />
                <span>URGENCE 24/7</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 via-orange-500/30 to-red-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </a>

              <a
                href="/experts"
                className="group flex items-center space-x-3 px-10 py-6 rounded-3xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm font-bold text-lg"
              >
                <Play className="w-6 h-6" />
                <span>Voir les experts</span>
              </a>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="group text-center p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${stat.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-white">
                    {stat.icon}
                  </div>
                </div>
                <div className="text-4xl font-black text-white mb-2">{stat.value}</div>
                <div className="text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-gradient-to-b from-gray-950 to-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black text-white mb-6">
              Pourquoi choisir <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">SOS Expats</span> ?
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              La première plateforme mondiale d'assistance pour expatriés, conçue par des expatriés pour des expatriés.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <div className="relative z-10">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <div className="text-white">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Profile Carousel Section */}
      <section className="py-32 bg-gradient-to-b from-gray-950 via-red-950/20 to-gray-950 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm rounded-full px-6 py-3 border border-red-500/30 mb-8">
              <Shield className="w-5 h-5 text-red-400" />
              <span className="text-red-300 font-bold">Experts vérifiés • Disponibles 24/7</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>

            <h2 className="text-5xl font-black text-white mb-6">
              Nos <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">experts</span> à votre service
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Plus de 2 000 professionnels vérifiés dans 50+ pays, prêts à vous aider immédiatement
            </p>
          </div>

          {/* Profile Carousel */}
          <div className="relative max-w-6xl mx-auto">
            <div className="overflow-hidden rounded-3xl">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentProfile * 100}%)` }}
              >
                {EXPERT_PROFILES.map((profile) => (
                  <div key={profile.id} className="w-full flex-shrink-0 px-4">
                    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-8 relative overflow-hidden">
                      <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
                        {/* Avatar et Status */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={profile.avatar}
                            alt={profile.name}
                            className="w-32 h-32 rounded-3xl object-cover ring-4 ring-white/30"
                          />
                          
                          {/* Status Online */}
                          {profile.online && (
                            <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-xl text-xs font-bold flex items-center space-x-1 shadow-lg">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                              <span>En ligne</span>
                            </div>
                          )}

                          {/* Verified Badge */}
                          {profile.verified && (
                            <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Informations */}
                        <div className="flex-1 text-center md:text-left">
                          <div className="mb-4">
                            <h3 className="text-2xl font-bold text-white mb-2">{profile.name}</h3>
                            <div className="flex items-center justify-center md:justify-start space-x-2 text-red-400 font-medium mb-2">
                              <span>{profile.role}</span>
                              <span>•</span>
                              <span>{profile.specialty}</span>
                            </div>
                            <div className="flex items-center justify-center md:justify-start space-x-2 text-gray-400 text-sm">
                              <MapPin className="w-4 h-4" />
                              <span>{profile.location}</span>
                            </div>
                          </div>

                          {/* Rating et Reviews */}
                          <div className="flex items-center justify-center md:justify-start space-x-4 mb-4">
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-4 h-4 ${i < Math.floor(profile.rating) ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} 
                                />
                              ))}
                              <span className="text-white font-bold ml-2">{profile.rating}</span>
                            </div>
                            <div className="text-gray-400 text-sm">
                              ({profile.reviewCount} avis)
                            </div>
                          </div>

                          {/* Langues */}
                          <div className="flex items-center justify-center md:justify-start space-x-2 mb-4">
                            {profile.languages.map((lang, index) => (
                              <span 
                                key={index}
                                className="bg-white/10 text-gray-300 px-2 py-1 rounded-lg text-xs font-medium"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>

                          {/* Temps de réponse et Prix */}
                          <div className="flex items-center justify-center md:justify-start space-x-6 text-sm">
                            <div className="flex items-center space-x-2 text-green-400">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">{profile.responseTime}</span>
                            </div>
                            <div className="text-white font-bold">
                              {profile.price}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex flex-col space-y-3">
                          <button className="group bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-6 py-3 rounded-2xl font-bold transition-all duration-300 hover:scale-105 shadow-lg">
                            Contacter maintenant
                          </button>
                          <button className="group bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 px-6 py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105">
                            Voir le profil
                          </button>
                        </div>
                      </div>

                      {/* Background Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Dots */}
            <div className="flex items-center justify-center space-x-3 mt-8">
              {EXPERT_PROFILES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentProfile(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    currentProfile === index
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 scale-125'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={() => setCurrentProfile((prev) => (prev - 1 + EXPERT_PROFILES.length) % EXPERT_PROFILES.length)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-110 flex items-center justify-center text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={() => setCurrentProfile((prev) => (prev + 1) % EXPERT_PROFILES.length)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-110 flex items-center justify-center text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* CTA pour voir tous les experts */}
          <div className="text-center mt-12">
            <a
              href="/experts"
              className="group inline-flex items-center space-x-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 shadow-xl"
            >
              <Users className="w-6 h-6" />
              <span>Voir tous nos experts</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/3 w-64 h-64 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-full px-6 py-3 border border-green-500/30 mb-8">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-green-300 font-bold">Transparence totale • Pas de frais cachés</span>
              <Check className="w-5 h-5 text-green-400" />
            </div>

            <h2 className="text-5xl font-black text-white mb-6">
              Des <span className="bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">tarifs</span> adaptés à vos besoins
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Choisissez le plan qui correspond à votre situation d'expatrié. Changez ou annulez à tout moment.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {PRICING_PLANS.map((plan, index) => (
              <div
                key={index}
                className={`group relative p-8 rounded-3xl border transition-all duration-300 hover:scale-105 overflow-hidden ${
                  plan.popular
                    ? 'bg-gradient-to-br from-red-600/20 to-orange-600/20 border-red-500/50 shadow-2xl shadow-red-500/25 scale-110'
                    : 'bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      ⭐ Populaire
                    </div>
                  </div>
                )}

                <div className="relative z-10">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-black text-white">{plan.price}</span>
                      {plan.period && <span className="text-gray-400 ml-2">{plan.period}</span>}
                    </div>
                    <p className="text-gray-400">{plan.description}</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center flex-shrink-0`}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <button
                    className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg'
                        : `bg-gradient-to-r ${plan.color} hover:shadow-lg text-white`
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>

                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center space-x-6 bg-white/5 backdrop-blur-sm rounded-2xl px-8 py-4 border border-white/10">
              <div className="flex items-center space-x-2 text-green-400">
                <Shield className="w-5 h-5" />
                <span className="font-medium">Garantie 30 jours</span>
              </div>
              <div className="w-px h-6 bg-white/20" />
              <div className="flex items-center space-x-2 text-blue-400">
                <Globe className="w-5 h-5" />
                <span className="font-medium">Support mondial</span>
              </div>
              <div className="w-px h-6 bg-white/20" />
              <div className="flex items-center space-x-2 text-purple-400">
                <Zap className="w-5 h-5" />
                <span className="font-medium">Activation instantanée</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-32 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-full px-6 py-3 border border-yellow-500/30 mb-8">
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
              <span className="text-yellow-300 font-bold">4.9/5 • +2,500 avis</span>
              <Award className="w-5 h-5 text-yellow-400" />
            </div>

            <h2 className="text-5xl font-black text-white mb-6">
              Ce que disent nos <span className="bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">utilisateurs</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              Découvrez les témoignages authentiques de notre communauté d'expatriés satisfaits
            </p>

            {/* Lien vers la page testimonials */}
            <a
              href="http://localhost:5177/testimonials"
              className="group inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 font-bold transition-colors duration-300"
            >
              <span>Voir tous les avis</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
          </div>

          {/* Testimonials Carousel */}
          <div className="relative max-w-5xl mx-auto">
            <div className="overflow-hidden rounded-3xl">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
              >
                {TESTIMONIALS.map((testimonial) => (
                  <div key={testimonial.id} className="w-full flex-shrink-0 px-4">
                    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-8 md:p-12 relative overflow-hidden">
                      {/* Quote Icon */}
                      <div className="absolute top-8 right-8 opacity-20">
                        <Quote className="w-16 h-16 text-white" />
                      </div>

                      {/* Content */}
                      <div className="relative z-10">
                        {/* Rating */}
                        <div className="flex items-center space-x-1 mb-6">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                          ))}
                        </div>

                        {/* Comment */}
                        <blockquote className="text-xl md:text-2xl text-white leading-relaxed mb-8 font-medium">
                          "{testimonial.comment}"
                        </blockquote>

                        {/* Author Info */}
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <img
                              src={testimonial.avatar}
                              alt={testimonial.name}
                              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/30"
                            />
                            {testimonial.verified && (
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center border-2 border-gray-900">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center space-x-2">
                              <div className="font-bold text-white text-lg">{testimonial.name}</div>
                              {testimonial.verified && (
                                <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-xs font-bold">
                                  Vérifié
                                </div>
                              )}
                            </div>
                            <div className="text-gray-400 font-medium">{testimonial.role}</div>
                            <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                              <MapPin className="w-4 h-4" />
                              <span>{testimonial.location}</span>
                            </div>
                          </div>

                          <div className="ml-auto text-right">
                            <div className="flex items-center space-x-1 text-gray-400 text-sm">
                              <Heart className="w-4 h-4" />
                              <span>{testimonial.helpful} utiles</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(testimonial.date).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Background Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Dots */}
            <div className="flex items-center justify-center space-x-3 mt-8">
              {TESTIMONIALS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    currentTestimonial === index
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 scale-125'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={() => setCurrentTestimonial((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-110 flex items-center justify-center text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={() => setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-110 flex items-center justify-center text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                icon: <TrendingUp className="w-8 h-8" />, 
                title: "98% de satisfaction", 
                subtitle: "Taux de résolution" 
              },
              { 
                icon: <Clock className="w-8 h-8" />, 
                title: "< 5 minutes", 
                subtitle: "Temps de connexion moyen" 
              },
              { 
                icon: <Shield className="w-8 h-8" />, 
                title: "100% sécurisé", 
                subtitle: "Données cryptées" 
              }
            ].map((indicator, index) => (
              <div key={index} className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 mb-4">
                  <div className="text-white">{indicator.icon}</div>
                </div>
                <div className="text-2xl font-bold text-white mb-2">{indicator.title}</div>
                <div className="text-gray-400">{indicator.subtitle}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-8">
            Prêt à être aidé ?
          </h2>
          <p className="text-2xl text-white/90 mb-12 leading-relaxed">
            Rejoignez plus de <strong>15 000 expatriés</strong> qui font confiance à SOS Expats pour leurs démarches à l'étranger.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <a
              href="/register"
              className="group bg-white hover:bg-gray-100 text-red-600 px-12 py-6 rounded-3xl font-black text-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl flex items-center space-x-4"
            >
              <span>Commencer gratuitement</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
            </a>

            <a
              href="/sos-appel"
              className="group bg-transparent border-2 border-white hover:bg-white hover:text-red-600 text-white px-12 py-6 rounded-3xl font-bold text-xl transition-all duration-300 hover:scale-105 flex items-center space-x-4"
            >
              <Phone className="w-6 h-6" />
              <span>Urgence maintenant</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer - À décommenter quand disponible */}
      {/* <Footer /> */}
    </div>
  );
};

export default OptimizedHomePage;