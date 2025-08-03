import React from 'react';
import { Phone, ArrowRight, Shield, Clock, Globe, Users } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Link, useNavigate } from 'react-router-dom';

const CTASection: React.FC = () => {
  const { language } = useApp();


  return (
    <section className="py-20 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {language === 'fr' 
                ? 'Prêt à obtenir de l\'aide ?'
                : 'Ready to get help?'
              }
            </h2>
            
            <p className="text-xl text-red-100 mb-8">
              {language === 'fr'
                ? 'Rejoignez des milliers d\'expatriés qui font confiance à SOS Expats pour leurs urgences juridiques et pratiques à l\'étranger.'
                : 'Join thousands of expats who trust SOS Expats for their legal and practical emergencies abroad.'
              }
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start">
                <div className="bg-red-600 p-2 rounded-full mr-3 flex-shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {language === 'fr' ? 'Sécurité garantie' : 'Guaranteed security'}
                  </h3>
                  <p className="text-red-100">
                    {language === 'fr'
                      ? 'Paiement sécurisé, remboursement automatique si non disponible'
                      : 'Secure payment, automatic refund if unavailable'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-red-600 p-2 rounded-full mr-3 flex-shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {language === 'fr' ? 'Rapidité d\'intervention' : 'Fast intervention'}
                  </h3>
                  <p className="text-red-100">
                    {language === 'fr'
                      ? 'Mise en relation en moins de 5 minutes, 24h/24 et 7j/7'
                      : 'Connection in less than 5 minutes, 24/7'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-red-600 p-2 rounded-full mr-3 flex-shrink-0">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {language === 'fr' ? 'Couverture mondiale' : 'Worldwide coverage'}
                  </h3>
                  <p className="text-red-100">
                    {language === 'fr'
                      ? 'Plus de 120 pays couverts par nos experts'
                      : 'More than 120 countries covered by our experts'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => window.location.href = '/sos-appel'}
              className="bg-white text-red-700 hover:bg-gray-100 px-8 py-4 rounded-xl font-semibold transition-colors flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Phone size={20} />
              <span>
                {language === 'fr' ? 'Commencer maintenant' : 'Start now'}
              </span>
              <ArrowRight size={20} />
            </button>
          </div>
          
          <div className="hidden lg:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 transform rotate-3 shadow-xl">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 -rotate-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                    <Phone className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Appel Avocat</h3>
                    <p className="text-red-100">Consultation juridique urgente</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold">49€</span>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm">20 minutes</span>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mt-6 rotate-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Conseil Expat</h3>
                    <p className="text-red-100">Conseil pratique d'expatriation</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold">19€</span>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm">30 minutes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;