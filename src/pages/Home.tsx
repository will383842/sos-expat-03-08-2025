import React, { useState, useEffect, memo } from 'react';
import { Phone, Globe, Shield, Clock, Star, MapPin, Users, ArrowRight, Play, ChevronRight, Sparkles, Heart, Zap, Award, Menu, X, User, UserPlus, AlertTriangle, CheckCircle } from 'lucide-react';

// Simulation des contextes et données
const useApp = () => ({ language: 'fr' });
const useAuth = () => ({ user: null, isLoading: false });

// Données diversifiées pour la plateforme internationale
const mockProviders = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    type: 'lawyer',
    country: 'Canada',
    languages: ['Français', 'Anglais'],
    rating: 4.9,
    reviewCount: 127,
    isOnline: true,
    timezone: 'UTC-5',
    price: 49,
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face',
    description: 'Avocate spécialisée en immigration et droit international. 8 ans d\'expérience.',
    certifications: ['Barreau du Québec', 'Droit International']
  },
  {
    id: '2',
    name: 'Ahmed El-Mansouri',
    type: 'expat',
    country: 'Émirats Arabes Unis',
    languages: ['Français', 'Arabe', 'Anglais'],
    rating: 4.8,
    reviewCount: 89,
    isOnline: true,
    timezone: 'UTC+4',
    price: 19,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    description: 'Entrepreneur français à Dubai depuis 7 ans. Expert en business et visa.',
    certifications: ['Chamber of Commerce Dubai']
  },
  {
    id: '3',
    name: 'Ana Rodriguez',
    type: 'lawyer',
    country: 'Espagne',
    languages: ['Français', 'Espagnol', 'Anglais'],
    rating: 4.9,
    reviewCount: 156,
    isOnline: false,
    timezone: 'UTC+1',
    price: 45,
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
    description: 'Avocate en droit européen et fiscal. Spécialiste résidence dorée.',
    certifications: ['Colegio de Abogados Madrid', 'EU Law']
  },
  {
    id: '4',
    name: 'Kenji Tanaka',
    type: 'expat',
    country: 'Japon',
    languages: ['Français', 'Japonais', 'Anglais'],
    rating: 4.7,
    reviewCount: 73,
    isOnline: true,
    timezone: 'UTC+9',
    price: 22,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    description: 'Entrepreneur tech à Tokyo depuis 5 ans. Expert visa travail.',
    certifications: ['JETRO Certified']
  },
  {
    id: '5',
    name: 'Dr. Fatima Al-Zahra',
    type: 'lawyer',
    country: 'Maroc',
    languages: ['Français', 'Arabe', 'Anglais'],
    rating: 4.8,
    reviewCount: 94,
    isOnline: true,
    timezone: 'UTC+1',
    price: 35,
    avatar: 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=150&h=150&fit=crop&crop=face',
    description: 'Avocate internationale. Spécialiste droit des affaires Maghreb.',
    certifications: ['Barreau de Casablanca', 'OHADA']
  },
  {
    id: '6',
    name: 'Liu Wei Chen',
    type: 'expat',
    country: 'Chine',
    languages: ['Français', 'Chinois', 'Anglais'],
    rating: 4.6,
    reviewCount: 61,
    isOnline: true,
    timezone: 'UTC+8',
    price: 25,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    description: 'Consultant business à Shanghai. Expert marché chinois.',
    certifications: ['China Business Council']
  }
];

const mockTestimonials = [
  {
    id: 1,
    name: 'Jean-Pierre L.',
    location: 'Expatrié en Australie',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&crop=face',
    comment: 'Service exceptionnel ! Problème de visa résolu en 10 minutes avec un expert local français.',
    verified: true
  },
  {
    id: 2,
    name: 'Amira K.',
    location: 'Expatriée au Maroc',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5e5?w=80&h=80&fit=crop&crop=face',
    comment: 'Interface intuitive, connexion immédiate. Exactement ce qu\'il me fallait à Casablanca.',
    verified: true
  },
  {
    id: 3,
    name: 'Marcus Thompson',
    location: 'Expatrié en Allemagne',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop&crop=face',
    comment: 'Avocat francophone excellent. Contrat de travail allemand résolu en 15 minutes.',
    verified: true
  }
];

// Header moderne avec urgence
const ModernHeader = memo(() => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigationItems = [
    { label: 'Accueil', href: '/', icon: '🏠' },
    { label: 'Nos Experts', href: '/sos-appel', icon: '👥' },
    { label: 'Témoignages', href: '/testimonials', icon: '💬' },
    { label: 'Comment ça marche', href: '/how-it-works', icon: '⚡' },
    { label: 'Tarifs', href: '/pricing', icon: '💎' }
  ];

  return (
    <>
      {/* Barre d'urgence */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-2 text-center text-sm font-medium">
        <div className="flex items-center justify-center space-x-2">
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          <span>🆘 URGENCE 24/7 - Assistance immédiate partout dans le monde</span>
          <AlertTriangle className="w-4 h-4 animate-pulse" />
        </div>
      </div>

      <header className={`fixed top-8 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-red-600/95 backdrop-blur-xl shadow-xl' 
          : 'bg-gradient-to-r from-red-600 to-red-500'
      }`}>
        {/* Desktop Header */}
        <div className="hidden lg:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              {/* Logo */}
              <div className="flex-shrink-0">
                <a href="/" className="group flex items-center">
                  <div className="transform group-hover:scale-105 transition-all duration-300">
                    <h1 className="font-bold text-xl text-white m-0">🆘 SOS Urgently</h1>
                    <p className="text-xs text-white/80 font-medium m-0">
                      Assistance mondiale 24/7
                    </p>
                  </div>
                </a>
              </div>

              {/* Navigation */}
              <nav className="flex items-center space-x-6">
                <a href="/" className="group flex flex-col items-center text-white/90 hover:text-white transition-all duration-300 hover:scale-105">
                  <span className="text-lg mb-1 group-hover:scale-110 transition-transform duration-300">🏠</span>
                  <span className="text-xs font-medium">Accueil</span>
                </a>
                <a href="/sos-appel" className="group flex flex-col items-center text-white/90 hover:text-white transition-all duration-300 hover:scale-105">
                  <span className="text-lg mb-1 group-hover:scale-110 transition-transform duration-300">👥</span>
                  <span className="text-xs font-medium">Nos Experts</span>
                </a>
                
                {/* Bouton SOS URGENCE - Plus proéminent */}
                <a 
                  href="/sos-appel" 
                  className="group mx-6 bg-gradient-to-r from-orange-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl flex items-center space-x-2 border-2 border-white/30 animate-pulse"
                >
                  <AlertTriangle className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                  <span>🆘 URGENCE</span>
                </a>

                <a href="/testimonials" className="group flex flex-col items-center text-white/90 hover:text-white transition-all duration-300 hover:scale-105">
                  <span className="text-lg mb-1 group-hover:scale-110 transition-transform duration-300">💬</span>
                  <span className="text-xs font-medium">Avis</span>
                </a>
                <a href="/pricing" className="group flex flex-col items-center text-white/90 hover:text-white transition-all duration-300 hover:scale-105">
                  <span className="text-lg mb-1 group-hover:scale-110 transition-transform duration-300">💎</span>
                  <span className="text-xs font-medium">Tarifs</span>
                </a>
              </nav>

              {/* Actions avec sélecteur de langue plus visible */}
              <div className="flex items-center space-x-3">
                {/* Sélecteur de langue amélioré */}
                <div className="flex items-center space-x-1 bg-white/20 px-3 py-2 rounded-lg">
                  <Globe className="w-4 h-4 text-white" />
                  <select className="bg-transparent text-white text-sm font-medium outline-none">
                    <option value="fr">🇫🇷 FR</option>
                    <option value="en">🇬🇧 EN</option>
                    <option value="es">🇪🇸 ES</option>
                    <option value="ar">🇸🇦 AR</option>
                    <option value="zh">🇨🇳 ZH</option>
                  </select>
                </div>
                
                <a href="/login" className="p-3 rounded-full hover:bg-white/10 transition-all duration-300">
                  <User className="w-5 h-5 text-white" />
                </a>
                <a href="/register" className="bg-white hover:bg-gray-50 text-red-600 p-3 rounded-full transition-all duration-300 hover:scale-110">
                  <UserPlus className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center">
              <div>
                <h1 className="font-bold text-lg text-white m-0">🆘 SOS Urgently</h1>
                <p className="text-xs text-white/80 m-0">Assistance 24/7</p>
              </div>
            </a>

            <div className="flex items-center space-x-3">
              <a 
                href="/sos-appel" 
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center space-x-1 animate-pulse"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>🆘</span>
              </a>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="p-3 rounded-lg text-white hover:bg-white/20 transition-all duration-300"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Menu Mobile */}
          {isMenuOpen && (
            <div className="bg-red-700 px-6 py-6 shadow-lg border-t border-red-500">
              <nav className="flex flex-col space-y-4">
                {navigationItems.map((item) => (
                  <a 
                    key={item.href} 
                    href={item.href} 
                    className="text-lg font-semibold text-white/90 hover:text-white px-4 py-3 rounded-lg hover:bg-white/10 transition-all duration-300 flex items-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="mr-3 text-xl">{item.icon}</span>
                    {item.label}
                  </a>
                ))}
                
                <div className="pt-6 border-t border-red-500 space-y-4">
                  <div className="text-center">
                    <select className="bg-white/20 text-white px-4 py-2 rounded-lg">
                      <option value="fr">🇫🇷 Français</option>
                      <option value="en">🇬🇧 English</option>
                      <option value="es">🇪🇸 Español</option>
                      <option value="ar">🇸🇦 العربية</option>
                      <option value="zh">🇨🇳 中文</option>
                    </select>
                  </div>
                  <a href="/login" className="w-full bg-white/15 backdrop-blur-xl text-white px-6 py-4 rounded-2xl hover:bg-white/25 transition-all duration-300 font-semibold border border-white/30 flex items-center justify-center">
                    <User className="w-5 h-5 mr-3" />
                    Connexion
                  </a>
                  <a href="/register" className="w-full bg-gradient-to-r from-white via-gray-50 to-white text-red-600 px-6 py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center">
                    <UserPlus className="w-5 h-5 mr-3" />
                    S'inscrire
                  </a>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
      
      <div className="h-28" />
    </>
  );
});

// Hero Section avec urgence et confiance
const HeroSection = memo(() => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    { icon: Globe, text: '120+ pays', subtext: 'Couverture mondiale' },
    { icon: Clock, text: 'moins de 5 min', subtext: 'Connexion rapide' },
    { icon: Shield, text: '24/7', subtext: 'Support continu' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-red-500 via-red-600 to-red-700 overflow-hidden">
      {/* Éléments décoratifs */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-40 right-20 w-24 h-24 bg-yellow-300/20 rounded-full blur-lg animate-bounce" />
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-pink-300/15 rounded-full blur-md animate-ping" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <div className="text-center">
          {/* Badge urgence */}
          <div className="inline-flex items-center px-6 py-3 bg-orange-500/90 backdrop-blur-sm rounded-full text-white text-sm font-bold mb-8 border border-white/30 animate-pulse">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-300" />
            🆘 Plateforme d'urgence #1 - Assistance mondiale instantanée
          </div>

          {/* Titre principal */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            <span className="block">Urgence à l'étranger ?</span>
            <span className="block bg-gradient-to-r from-yellow-300 via-orange-200 to-yellow-400 bg-clip-text text-transparent">
              Aide en 5 minutes !
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-red-100 mb-8 max-w-4xl mx-auto leading-relaxed">
            Connectez-vous instantanément avec des <strong className="text-white">avocats</strong> et <strong className="text-white">expatriés</strong> francophones vérifiés dans <strong className="text-yellow-300">120+ pays</strong>
          </p>

          {/* Badges de confiance */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="flex items-center bg-white/20 px-4 py-2 rounded-full">
              <Shield className="w-4 h-4 mr-2 text-green-400" />
              <span className="text-sm font-medium">✅ 100% Sécurisé</span>
            </div>
            <div className="flex items-center bg-white/20 px-4 py-2 rounded-full">
              <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
              <span className="text-sm font-medium">✅ Experts Certifiés</span>
            </div>
            <div className="flex items-center bg-white/20 px-4 py-2 rounded-full">
              <Clock className="w-4 h-4 mr-2 text-green-400" />
              <span className="text-sm font-medium">✅ Réponse en moins de 5min</span>
            </div>
          </div>

          {/* Statistiques animées */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index}
                  className={`group p-4 sm:p-6 rounded-2xl transition-all duration-500 cursor-pointer ${
                    activeFeature === index 
                      ? 'bg-white/25 scale-105 shadow-2xl' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center transition-all duration-300 ${
                    activeFeature === index ? 'bg-white text-red-600' : 'bg-white/20 text-white'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className={`text-2xl font-bold mb-1 transition-colors duration-300 ${
                    activeFeature === index ? 'text-white' : 'text-red-100'
                  }`}>
                    {feature.text}
                  </div>
                  <div className="text-sm text-red-200">
                    {feature.subtext}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Boutons CTA urgence */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <a 
              href="/sos-appel?type=lawyer"
              className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-600 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 border-white/30"
            >
              <div className="relative z-10 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                🆘 URGENCE MAINTENANT
              </div>
            </a>
            
            <a 
              href="/sos-appel?type=expat"
              className="group relative px-8 py-4 rounded-2xl font-bold text-lg text-white border-2 border-white/50 hover:border-white transition-all duration-300 hover:bg-white/10"
            >
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-300" />
                Conseil Expatrié
              </div>
            </a>
          </div>

          {/* Numéro d'urgence visible */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto mb-8">
            <h3 className="text-lg font-bold text-white mb-2">📞 Urgence Téléphone</h3>
            <p className="text-2xl font-bold text-yellow-300">+33 X XX XX XX XX</p>
            <p className="text-sm text-red-100">24/7 - Appel d'urgence gratuit</p>
          </div>

          <div className="flex flex-col items-center animate-bounce">
            <div className="text-white/70 text-sm mb-2">Découvrir nos experts</div>
            <ChevronRight className="w-6 h-6 text-white/70 rotate-90" />
          </div>
        </div>
      </div>
    </section>
  );
});

// Section Services avec prix internationaux
const ServicesSection = memo(() => {
  const services = [
    {
      id: 'lawyer',
      icon: Shield,
      title: '⚖️ Appel Avocat',
      price: '49€',
      priceUSD: '$52',
      duration: '20 min',
      description: 'Consultation juridique urgente avec avocat certifié international',
      features: ['Droit international', 'Urgences légales', 'Contrats & Visas', 'Conseil fiscal'],
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      urgent: true
    },
    {
      id: 'expat',
      icon: Heart,
      title: '🌍 Conseil Expatrié',
      price: '19€',
      priceUSD: '$21',
      duration: '30 min',
      description: 'Aide pratique d\'expatriés francophones expérimentés',
      features: ['Vie quotidienne', 'Démarches admin', 'Logement & Emploi', 'Culture locale'],
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      urgent: false
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-red-100 rounded-full text-red-600 text-sm font-medium mb-6">
            <Zap className="w-4 h-4 mr-2" />
            Services d'urgence 24/7
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Aide instantanée,
            <span className="text-red-600"> partout dans le monde</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Connectez-vous immédiatement avec des experts vérifiés dans votre langue
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.id} className="group relative">
                <div className={`relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 ${service.urgent ? 'ring-2 ring-orange-400' : ''}`}>
                  {service.urgent && (
                    <div className="absolute -top-3 left-6 bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-1 rounded-full text-xs font-bold animate-pulse">
                      🆘 URGENCE
                    </div>
                  )}

                  <div className={`inline-flex p-4 ${service.bgColor} rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-8 h-8 ${service.textColor}`} />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{service.title}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>

                  <ul className="space-y-3 mb-8">
                    {service.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-gray-700">
                        <div className={`w-2 h-2 rounded-full ${service.textColor.replace('text-', 'bg-')} mr-3`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-3xl font-bold text-gray-900">{service.price}</span>
                        <span className="text-lg text-gray-500">/ {service.priceUSD}</span>
                      </div>
                      <span className="text-gray-500 text-sm">{service.duration}</span>
                    </div>
                  </div>

                  <a 
                    href={service.id === 'lawyer' ? '/sos-appel?type=lawyer' : '/sos-appel?type=expat'}
                    className={`block w-full bg-gradient-to-r ${service.color} text-white py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all duration-300 hover:scale-105 text-center ${service.urgent ? 'animate-pulse' : ''}`}
                  >
                    {service.urgent ? '🆘 URGENCE - Choisir' : 'Choisir ce service'}
                  </a>
                </div>

                {service.id === 'lawyer' && (
                  <div className="absolute -top-4 -right-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    <Award className="w-4 h-4 inline mr-1" />
                    Populaire
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Garanties de sécurité */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            { icon: Shield, text: 'Experts Certifiés', desc: 'Vérification manuelle obligatoire' },
            { icon: Clock, text: 'Réponse moins de 5min', desc: 'Connexion garantie ou remboursé' },
            { icon: CheckCircle, text: 'Paiement Sécurisé', desc: 'SSL + Cryptage bancaire' },
            { icon: Globe, text: '120+ Pays', desc: 'Couverture mondiale 24/7' }
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="text-center p-6 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="inline-flex p-3 bg-green-100 rounded-xl mb-4">
                  <Icon className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">{item.text}</h4>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

// Profile Carousel avec diversité internationale
const ProfileCarousel = memo(() => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % mockProviders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (isOnline) => isOnline ? 'bg-green-400' : 'bg-gray-400';
  const getStatusText = (isOnline) => isOnline ? 'En ligne' : 'Hors ligne';

  return (
    <section className="py-20 bg-gradient-to-br from-red-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-red-100 rounded-full text-red-600 text-sm font-medium mb-6">
            <Users className="w-4 h-4 mr-2" />
            Nos experts internationaux
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Des professionnels certifiés
            <span className="text-red-600"> à votre écoute</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez nos experts vérifiés, disponibles dans plus de 120 pays et parlant votre langue
          </p>
        </div>

        {/* Carousel principal */}
        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockProviders.map((provider, index) => (
              <div 
                key={provider.id}
                className={`relative transform transition-all duration-700 ${
                  index === currentSlide ? 'scale-105 z-10' : 'scale-95 opacity-75'
                }`}
              >
                <div className="bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-gray-100">
                  {/* En-tête profil avec certifications */}
                  <div className="relative mb-6">
                    <img 
                      src={provider.avatar} 
                      alt={provider.name}
                      className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4"
                    />
                    
                    {/* Statut en ligne avec timezone */}
                    <div className={`absolute top-0 right-0 w-6 h-6 rounded-full border-4 border-white ${getStatusColor(provider.isOnline)}`} />
                    <div className="absolute top-6 right-0 bg-white rounded-lg px-2 py-1 text-xs font-medium text-gray-600 shadow-sm">
                      {provider.timezone}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 text-center mb-2">{provider.name}</h3>
                    
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mx-auto block w-fit ${
                      provider.type === 'lawyer' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {provider.type === 'lawyer' ? '⚖️ Avocat Certifié' : '🌍 Expert Expatrié'}
                    </div>
                  </div>

                  {/* Informations détaillées */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-600 font-medium">{provider.country}</span>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-4">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1 fill-current" />
                        <span className="font-medium">{provider.rating}</span>
                        <span className="text-gray-500 ml-1">({provider.reviewCount})</span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        provider.isOnline ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getStatusText(provider.isOnline)}
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm text-center leading-relaxed">
                      {provider.description}
                    </p>

                    {/* Certifications */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs font-semibold text-gray-700 mb-2">Certifications :</div>
                      <div className="flex flex-wrap gap-1">
                        {provider.certifications.map((cert, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            ✅ {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Langues parlées */}
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {provider.languages.map((lang, i) => (
                      <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-lg font-medium">
                        🗣️ {lang}
                      </span>
                    ))}
                  </div>

                  {/* Prix et CTA */}
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{provider.price}€</div>
                    <div className="text-sm text-gray-500">Par consultation</div>
                  </div>

                  <button className={`w-full py-3 rounded-2xl font-bold transition-all duration-300 ${
                    provider.isOnline 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg hover:scale-105'
                      : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  }`}>
                    {provider.isOnline ? '📞 Contacter maintenant' : '⏰ Hors ligne - Programmer'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Indicateurs de carousel */}
          <div className="flex justify-center mt-8 space-x-2">
            {mockProviders.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'bg-red-500 scale-125' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* CTA section */}
        <div className="text-center mt-16">
          <a 
            href="/sos-appel"
            className="inline-flex items-center bg-white text-red-600 px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all duration-300 hover:scale-105 border border-red-200"
          >
            👥 Voir tous nos experts ({mockProviders.length * 10}+ disponibles)
            <ArrowRight className="w-5 h-5 ml-2" />
          </a>
        </div>
      </div>
    </section>
  );
});

// Comment ça marche avec processus sécurisé
const HowItWorksSection = memo(() => {
  const steps = [
    {
      number: 1,
      icon: Phone,
      title: 'Choisissez votre expert',
      description: 'Sélectionnez un avocat ou expatrié selon votre urgence et votre pays',
      color: 'from-blue-500 to-blue-600'
    },
    {
      number: 2,
      icon: Shield,
      title: 'Connexion sécurisée en moins de 5min',
      description: 'Paiement sécurisé puis mise en relation automatique avec l\'expert disponible',
      color: 'from-green-500 to-green-600'
    },
    {
      number: 3,
      icon: CheckCircle,
      title: 'Résolvez votre problème',
      description: 'Échangez directement par téléphone et obtenez l\'aide dont vous avez besoin',
      color: 'from-purple-500 to-purple-600'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-blue-600 text-sm font-medium mb-6">
            <Zap className="w-4 h-4 mr-2" />
            Processus simple et sécurisé
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Comment nous vous aidons
            <span className="text-red-600"> en urgence ?</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Un processus en 3 étapes pour une aide rapide, sécurisée et efficace
          </p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-24 left-1/2 transform -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-blue-200 via-green-200 to-purple-200 rounded-full" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative text-center">
                  {index < steps.length - 1 && (
                    <div className="md:hidden absolute left-1/2 top-20 w-1 h-20 bg-gradient-to-b from-gray-200 to-transparent transform -translate-x-1/2" />
                  )}
                  
                  <div className="relative z-10 mx-auto mb-6">
                    <div className={`w-16 h-16 mx-auto bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-300`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white border-4 border-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-700">
                      {step.number}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-4">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center mt-16">
          <a 
            href="/sos-appel"
            className="inline-flex items-center bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            🆘 Commencer maintenant
            <ArrowRight className="w-5 h-5 ml-2" />
          </a>
        </div>
      </div>
    </section>
  );
});

// Testimonials avec vérification
const TestimonialsSection = memo(() => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % mockTestimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-yellow-100 rounded-full text-yellow-700 text-sm font-medium mb-6">
            <Star className="w-4 h-4 mr-2 fill-current" />
            Témoignages vérifiés
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Ils nous font confiance
            <span className="text-red-600"> dans le monde entier</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez les expériences de nos utilisateurs qui ont été aidés en urgence
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl p-8 md:p-12 shadow-xl">
            <div className="text-center">
              <div className="inline-flex p-4 bg-red-100 rounded-2xl mb-8">
                <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z"/>
                </svg>
              </div>

              <blockquote className="text-2xl md:text-3xl text-gray-900 font-medium mb-8 leading-relaxed">
                "{mockTestimonials[activeTestimonial].comment}"
              </blockquote>

              <div className="flex items-center justify-center">
                <img 
                  src={mockTestimonials[activeTestimonial].avatar}
                  alt={mockTestimonials[activeTestimonial].name}
                  className="w-16 h-16 rounded-2xl object-cover mr-4"
                />
                <div className="text-left">
                  <div className="flex items-center">
                    <div className="font-bold text-gray-900 text-lg mr-2">
                      {mockTestimonials[activeTestimonial].name}
                    </div>
                    {mockTestimonials[activeTestimonial].verified && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  <div className="text-gray-600">
                    {mockTestimonials[activeTestimonial].location}
                  </div>
                  <div className="flex items-center mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-8 space-x-2">
            {mockTestimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === activeTestimonial ? 'bg-red-500 scale-125' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Stats de confiance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto mt-16">
          {[
            { number: '10,000+', label: 'Personnes aidées', icon: '👥' },
            { number: '4.9/5', label: 'Note moyenne', icon: '⭐' },
            { number: '98%', label: 'Satisfaction client', icon: '❤️' }
          ].map((stat, index) => (
            <div key={index} className="text-center p-6 bg-gray-50 rounded-2xl">
              <div className="text-4xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

// CTA Final avec urgence
const CTASection = memo(() => {
  return (
    <section className="py-20 bg-gradient-to-br from-red-600 via-red-700 to-red-800 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-20 left-20 w-32 h-32 bg-yellow-300/20 rounded-full blur-xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center px-6 py-3 bg-orange-500/90 backdrop-blur-sm rounded-full text-white text-sm font-bold mb-8 animate-pulse">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-300" />
            🆘 URGENCE ? Ne restez pas seul !
          </div>

          <h2 className="text-4xl sm:text-6xl font-bold text-white mb-6">
            Votre aide arrive en
            <span className="block text-yellow-300">moins de 5 minutes</span>
          </h2>

          <p className="text-xl text-red-100 mb-12 leading-relaxed">
            Rejoignez des milliers de voyageurs et expatriés qui font confiance à SOS Urgently pour leurs urgences dans le monde entier
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <a 
              href="/sos-appel"
              className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-600 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 border-white/30"
            >
              <div className="relative z-10 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                🆘 URGENCE MAINTENANT
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </a>
            
            <a 
              href="/how-it-works"
              className="group flex items-center text-white text-lg font-medium hover:text-yellow-200 transition-colors duration-300"
            >
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-3 group-hover:bg-white/30 transition-colors duration-300">
                <Play className="w-5 h-5 ml-0.5" />
              </div>
              Comment ça marche ?
            </a>
          </div>

          {/* Numéro d'urgence */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto mb-12">
            <h3 className="text-lg font-bold text-white mb-2">📞 Numéro d'urgence gratuit</h3>
            <p className="text-3xl font-bold text-yellow-300">+33 X XX XX XX XX</p>
            <p className="text-sm text-red-100">24/7 - Assistance immédiate</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { number: '10,000+', label: 'Urgences résolues' },
              { number: '120+', label: 'Pays couverts' },
              { number: '24/7', label: 'Support continu' }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-red-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

// Composant principal
const ModernHome = () => {
  return (
    <div className="min-h-screen bg-white">
      <ModernHeader />
      <HeroSection />
      <ServicesSection />
      <ProfileCarousel />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection />
    </div>
  );
};

export default ModernHome;