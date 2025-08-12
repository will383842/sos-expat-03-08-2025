import React from 'react';
import { Scale, Users, Clock, Shield, CheckCircle, Phone, Globe } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useNavigate } from 'react-router-dom';

const ServicesSection: React.FC = () => {
  const { language, services } = useApp();

  const serviceIcons = {
    lawyer_call: Scale,
    expat_call: Users
  };

  const serviceDescriptions = {
    lawyer_call: {
      fr: 'Consultation juridique urgente par téléphone avec un avocat certifié',
      en: 'Emergency legal consultation by phone with a certified lawyer'
    },
    expat_call: {
      fr: 'Conseil pratique d\'un expatrié francophone qui connaît le pays',
      en: 'Practical advice from a French-speaking expat who knows the country'
    }
  };

  // ✅ SUPPRESSION de handleServiceSelect - utiliser liens directs
  const features = [
    {
      icon: Phone,
      title: language === 'fr' ? 'Appel direct' : 'Direct call',
      description: language === 'fr' 
        ? 'Pas de messagerie, pas d\'attente. Un appel direct avec un expert.'
        : 'No messaging, no waiting. A direct call with an expert.'
    },
    {
      icon: Shield,
      title: language === 'fr' ? 'Experts vérifiés' : 'Verified experts',
      description: language === 'fr'
        ? 'Tous nos experts sont vérifiés manuellement par notre équipe.'
        : 'All our experts are manually verified by our team.'
    },
    {
      icon: CheckCircle,
      title: language === 'fr' ? 'Satisfaction garantie' : 'Satisfaction guaranteed',
      description: language === 'fr'
        ? 'Remboursement automatique si l\'expert ne répond pas.'
        : 'Automatic refund if the expert doesn\'t answer.'
    },
    {
      icon: Globe,
      title: language === 'fr' ? 'Couverture mondiale' : 'Worldwide coverage',
      description: language === 'fr'
        ? 'Plus de 120 pays couverts par nos experts.'
        : 'More than 120 countries covered by our experts.'
    }
  ];

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {language === 'fr' 
              ? 'Nos services d\'urgence'
              : 'Our emergency services'
            }
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {language === 'fr'
              ? 'Choisissez le service qui correspond à vos besoins et connectez-vous immédiatement avec un expert.'
              : 'Choose the service that fits your needs and connect immediately with an expert.'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto mb-20">
          {services.filter(service => service.isActive).map((service) => {
            const Icon = serviceIcons[service.type];
            const description = serviceDescriptions[service.type];
            const isLawyer = service.type === 'lawyer_call';
            
            return (
              <div
                key={service.id}
                className="bg-white border-2 border-red-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group"
              >
                <div className="flex flex-col items-center">
                  <div className={`${isLawyer ? 'bg-red-100' : 'bg-blue-100'} p-5 rounded-full mb-6 group-hover:${isLawyer ? 'bg-red-200' : 'bg-blue-200'} transition-colors`}>
                    <Icon size={40} className={`${isLawyer ? 'text-red-600' : 'text-blue-600'}`} />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {isLawyer 
                      ? (language === 'fr' ? 'Appel Avocat' : 'Lawyer Call')
                      : (language === 'fr' ? 'Appel Expatrié' : 'Expat Call')
                    }
                  </h3>
                  
                  <p className="text-gray-600 mb-6 text-center">
                    {description[language]}
                  </p>
                  
                  <div className="flex items-center justify-between w-full mb-6">
                    <div className={`text-3xl font-bold ${isLawyer ? 'text-red-600' : 'text-blue-600'}`}>
                      €{service.price}
                    </div>
                    <div className="flex items-center text-gray-500">
                      <Clock size={20} className="mr-2" />
                      <span className="text-lg">{service.duration} min</span>
                    </div>
                  </div>
                  
                  <a 
                    href={isLawyer ? '/sos-appel?type=lawyer' : '/sos-appel?type=expat'}
                    className={`w-full ${isLawyer ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-4 px-6 rounded-xl font-semibold text-lg transition-colors text-center block`}
                  >
                    {language === 'fr' ? 'Choisir ce service' : 'Choose this service'}
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* ✅ Features modernisées */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all border border-slate-100">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 rounded-full p-3">
                  <feature.icon className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;

