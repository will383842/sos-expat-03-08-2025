import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { 
  Phone, 
  ArrowRight, 
  Shield, 
  Clock, 
  Globe, 
  Users, 
  Star, 
  CheckCircle,
  MapPin,
  Zap,
  AlertTriangle,
  Award,
  MessageCircle
} from 'lucide-react';

// Composant de fallback pour le chargement
const SectionLoader: React.FC<{ height?: string }> = ({ height = 'h-96' }) => (
  <div className={`${height} flex items-center justify-center bg-gray-50 rounded-2xl animate-pulse`}>
    <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Composant Stats en temps réel
const StatsSection: React.FC = () => {
  const [stats, setStats] = useState({
    experts: 0,
    countries: 0,
    consultations: 0,
    satisfaction: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Animation des chiffres
  const animateNumber = useCallback((target: number, setter: (value: number) => void) => {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setter(target);
        clearInterval(timer);
      } else {
        setter(Math.floor(current));
      }
    }, 20);
    return timer;
  }, []);

  useEffect(() => {
    // Simulation du chargement des vraies données
    const loadStats = async () => {
      try {
        // Ici vous pourriez charger les vraies données depuis Firestore
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const realStats = {
          experts: 150,
          countries: 120,
          consultations: 2400,
          satisfaction: 98
        };

        // Animation des chiffres
        animateNumber(realStats.experts, (value) => 
          setStats(prev => ({ ...prev, experts: value }))
        );
        setTimeout(() => {
          animateNumber(realStats.countries, (value) => 
            setStats(prev => ({ ...prev, countries: value }))
          );
        }, 200);
        setTimeout(() => {
          animateNumber(realStats.consultations, (value) => 
            setStats(prev => ({ ...prev, consultations: value }))
          );
        }, 400);
        setTimeout(() => {
          animateNumber(realStats.satisfaction, (value) => 
            setStats(prev => ({ ...prev, satisfaction: value }))
          );
        }, 600);

        setIsLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des stats:', error);
        setIsLoading(false);
      }
    };

    loadStats();
  }, [animateNumber]);

  const statsData = [
    {
      icon: <Users className="w-8 h-8 text-emerald-600" />,
      value: stats.experts,
      suffix: '+',
      label: 'Experts vérifiés',
      color: 'from-emerald-500 to-teal-600'
    },
    {
      icon: <Globe className="w-8 h-8 text-blue-600" />,
      value: stats.countries,
      suffix: '+',
      label: 'Pays couverts',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      icon: <MessageCircle className="w-8 h-8 text-purple-600" />,
      value: stats.consultations,
      suffix: '+',
      label: 'Consultations réalisées',
      color: 'from-purple-500 to-pink-600'
    },
    {
      icon: <Award className="w-8 h-8 text-yellow-600" />,
      value: stats.satisfaction,
      suffix: '%',
      label: 'Taux de satisfaction',
      color: 'from-yellow-500 to-orange-600'
    }
  ];

  if (isLoading) {
    return <SectionLoader height="h-64" />;
  }

  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            SOS Expats en chiffres
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 transform hover:scale-105 transition-all duration-300 hover:shadow-xl"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} mb-4 shadow-lg`}>
                  {stat.icon}
                </div>
                <div className="text-4xl font-black text-gray-900 mb-2">
                  {stat.value.toLocaleString()}{stat.suffix}
                </div>
                <div className="text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Hero Section moderne
const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
                           radial-gradient(circle at 75% 75%, white 2px, transparent 2px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          {/* Badge d'urgence */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Disponible 24h/24 • 7j/7</span>
          </div>

          {/* Titre principal */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-8 tracking-tight">
            <span className="block">Besoin d'aide à</span>
            <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              l'étranger ?
            </span>
          </h1>

          {/* Sous-titre */}
          <p className="text-xl sm:text-2xl md:text-3xl text-red-100 mb-12 max-w-4xl mx-auto font-light leading-relaxed">
            Connectez-vous en moins de <span className="font-bold text-yellow-300">5 minutes</span> avec un expert vérifié
          </p>

          {/* Stats rapides */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-2xl font-bold">120+</div>
              <div className="text-red-100 text-sm">Pays couverts</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-2xl font-bold">5min</div>
              <div className="text-red-100 text-sm">Temps de réponse</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-red-100 text-sm">Disponibilité</div>
            </div>
          </div>

          {/* Boutons CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="group bg-white text-red-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-red-50 transform hover:scale-105 transition-all duration-300 shadow-2xl flex items-center gap-3 min-w-[280px] justify-center">
              <AlertTriangle className="w-6 h-6 group-hover:animate-pulse" />
              SOS Appel Urgent
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button className="group border-2 border-white text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:text-red-600 transform hover:scale-105 transition-all duration-300 flex items-center gap-3 min-w-[280px] justify-center">
              <Users className="w-6 h-6" />
              Voir les experts
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Note de confiance */}
          <p className="mt-8 text-red-200 text-sm">
            ✓ Plus de 2000 expatriés nous font déjà confiance
          </p>
        </div>
      </div>

      {/* Indicateur de scroll */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

// Services Section
const ServicesSection: React.FC = () => {
  const services = [
    {
      id: 'lawyer',
      title: 'Appel Avocat',
      description: 'Consultation juridique urgente avec un avocat certifié',
      price: 49,
      duration: 20,
      icon: '⚖️',
      color: 'from-blue-600 to-indigo-700',
      features: ['Avocat certifié', 'Conseil juridique', 'Réponse immédiate']
    },
    {
      id: 'expat',
      title: 'Appel Expatrié',
      description: 'Conseil pratique d\'un expatrié francophone expérimenté',
      price: 19,
      duration: 30,
      icon: '🌍',
      color: 'from-emerald-600 to-green-700',
      features: ['Expert expatrié', 'Conseil pratique', 'Expérience terrain']
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Nos services d'urgence
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choisissez le service qui correspond à vos besoins et connectez-vous immédiatement avec un expert
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {services.map((service) => (
            <div
              key={service.id}
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer relative overflow-hidden"
            >
              {/* Background gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
              
              <div className="relative z-10">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${service.color} text-white text-3xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    {service.icon}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {service.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-6">
                    {service.description}
                  </p>
                  
                  <div className="flex items-center justify-center gap-8 mb-6">
                    <div className="text-center">
                      <div className={`text-4xl font-black bg-gradient-to-r ${service.color} bg-clip-text text-transparent`}>
                        €{service.price}
                      </div>
                      <div className="text-sm text-gray-500">par consultation</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-700 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        {service.duration}min
                      </div>
                      <div className="text-sm text-gray-500">durée</div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    {service.features.map((feature, index) => (
                      <div key={index} className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  
                  <button className={`w-full bg-gradient-to-r ${service.color} text-white py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-3`}>
                    <Phone className="w-5 h-5" />
                    Choisir ce service
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Section de confiance et sécurité
const TrustSection: React.FC = () => {
  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Sécurité garantie',
      description: 'Tous nos experts sont vérifiés et certifiés. Paiement sécurisé et remboursement automatique.',
      color: 'from-green-500 to-emerald-600'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Disponibilité 24/7',
      description: 'Service disponible 24h/24 et 7j/7 dans plus de 120 pays à travers le monde.',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: 'Satisfaction garantie',
      description: '98% de taux de satisfaction client. Remboursement intégral si non satisfait.',
      color: 'from-purple-500 to-pink-600'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Réponse rapide',
      description: 'Mise en relation en moins de 5 minutes avec un expert qualifié et disponible.',
      color: 'from-yellow-500 to-orange-600'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Pourquoi nous faire confiance ?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Votre sécurité et satisfaction sont nos priorités absolues
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="text-center group bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:scale-105"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Comment ça marche
const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      number: 1,
      title: 'Choisissez votre service',
      description: 'Sélectionnez le type d\'aide dont vous avez besoin : avocat ou expatrié.',
      icon: <Phone className="w-8 h-8" />,
      color: 'from-red-500 to-red-600'
    },
    {
      number: 2,
      title: 'Connectez-vous',
      description: 'Nous vous mettons en relation avec un expert disponible en 5-10 minutes.',
      icon: <Users className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600'
    },
    {
      number: 3,
      title: 'Obtenez de l\'aide',
      description: 'Parlez directement avec votre expert et obtenez les conseils dont vous avez besoin.',
      icon: <CheckCircle className="w-8 h-8" />,
      color: 'from-green-500 to-green-600'
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Obtenez de l'aide en 3 étapes simples, rapides et sécurisées
          </p>
        </div>

        <div className="relative">
          {/* Ligne de connexion */}
          <div className="hidden lg:block absolute top-20 left-1/2 transform -translate-x-1/2 w-4/5 h-0.5 bg-gray-200 z-0"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {steps.map((step, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-8">
                  <div className={`w-20 h-20 bg-gradient-to-br ${step.color} rounded-full flex items-center justify-center text-white mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-xl`}>
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
                    {step.number}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {step.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Témoignages
const TestimonialsSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials = [
    {
      id: 1,
      name: 'Marie D.',
      location: 'Expatriée en Thaïlande',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      comment: 'Service exceptionnel ! J\'ai pu parler à un avocat français depuis Bangkok en moins de 2 minutes. Très professionnel et rassurant dans ma situation d\'urgence.'
    },
    {
      id: 2,
      name: 'Jean L.',
      location: 'Expatrié en Espagne',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      comment: 'Grâce à SOS Expats, j\'ai pu résoudre mon problème administratif en Espagne. L\'expatrié m\'a donné des conseils précieux basés sur son expérience personnelle.'
    },
    {
      id: 3,
      name: 'Sophie M.',
      location: 'Expatriée au Canada',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      comment: 'Interface très intuitive et service client réactif. L\'avocat était compétent et m\'a aidé à comprendre mes droits concernant mon contrat de travail au Canada.'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ce que disent nos clients
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez les expériences de nos utilisateurs partout dans le monde
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-br-3xl flex items-center justify-center">
              <span className="text-white text-2xl">"</span>
            </div>
            
            <div className="pt-8">
              <p className="text-xl text-gray-700 italic mb-8 leading-relaxed">
                "{testimonials[activeIndex].comment}"
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <img
                    src={testimonials[activeIndex].avatar}
                    alt={testimonials[activeIndex].name}
                    className="w-16 h-16 rounded-full object-cover mr-4 border-4 border-red-100"
                  />
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">{testimonials[activeIndex].name}</h4>
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      {testimonials[activeIndex].location}
                    </div>
                    <div className="flex items-center">
                      {[...Array(testimonials[activeIndex].rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveIndex(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === activeIndex ? 'bg-red-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// CTA Final
const FinalCTA: React.FC = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
                           radial-gradient(circle at 75% 75%, white 2px, transparent 2px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">
          Prêt à obtenir de l'aide ?
        </h2>
        <p className="text-xl md:text-2xl text-red-100 mb-12 max-w-3xl mx-auto">
          Rejoignez des milliers d'expatriés qui nous font confiance
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button className="group bg-white text-red-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-red-50 transform hover:scale-105 transition-all duration-300 shadow-2xl flex items-center gap-3 min-w-[280px] justify-center">
            <Phone className="w-6 h-6" />
            Commencer maintenant
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 text-red-100">
            <Shield className="w-6 h-6" />
            <span>Paiement sécurisé</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-red-100">
            <Clock className="w-6 h-6" />
            <span>Réponse en 5 minutes</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-red-100">
            <CheckCircle className="w-6 h-6" />
            <span>Satisfaction garantie</span>
          </div>
        </div>
      </div>
    </section>
  );
};

// Composant principal Home
const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* Statistiques */}
      <StatsSection />

      {/* Services */}
      <ServicesSection />

      {/* Section de confiance */}
      <TrustSection />

      {/* Comment ça marche */}
      <HowItWorksSection />

      {/* Témoignages */}
      <TestimonialsSection />

      {/* CTA Final */}
      <FinalCTA />
    </div>
  );
};

export default Home;