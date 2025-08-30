import React, { useMemo } from 'react';
import { Users, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';

const ExpatCall: React.FC = () => {
  const { language } = useApp();
  const isFrench = language === 'fr';

  const expatAdvantages = useMemo(() => [
    {
      icon: Users,
      title: isFrench ? 'ExpÃ©rience vÃ©cue' : 'Lived experience',
      description: isFrench
        ? 'Conseils basÃ©s sur une expÃ©rience rÃ©elle d\'expatriation'
        : 'Advice based on real expatriation experience'
    },
    {
      icon: MapPin,
      title: isFrench ? 'Connaissance locale' : 'Local knowledge',
      description: isFrench
        ? 'Expertise pratique du pays et de ses spÃ©cificitÃ©s' 
        : 'Practical expertise of the country and its specificities'
    },
    {
      icon: Clock,
      title: isFrench ? 'DisponibilitÃ© Ã©tendue' : 'Extended availability',
      description: isFrench
        ? '30 minutes d\'Ã©change pour explorer votre situation'
        : '30 minutes of exchange to explore your situation' 
    }
  ], [isFrench]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-green-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-full p-4">
                <Users className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {isFrench ? 'Appel ExpatriÃ©' : 'Expat Call'}
            </h1>
            <p className="text-xl text-green-100 max-w-2xl mx-auto mb-8">
              {isFrench
                ? 'BÃ©nÃ©ficiez de l\'expÃ©rience d\'un expatriÃ© francophone qui a vÃ©cu les mÃªmes dÃ©fis que vous'
                : 'Benefit from the experience of a French-speaking expat who has faced the same challenges as you'
              }
            </p>
            <div className="bg-green-700 rounded-lg p-4 inline-block">
              <div className="text-3xl font-bold">â‚¬19</div>
              <div className="text-green-100">30 minutes</div>
            </div>
          </div>
        </div>
        
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              {isFrench ? 'Pourquoi choisir un expatriÃ© ?' : 'Why choose an expat?'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {expatAdvantages.map((advantage, index) => (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-green-100 rounded-full p-4">
                      <advantage.icon className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {advantage.title}
                  </h3>
                  <p className="text-gray-600">
                    {advantage.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Link
                to="/sos-appel?type=expat"
                className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 rounded-lg font-bold text-xl transition-colors"
              >
                {isFrench ? 'Consulter les expatriÃ©s disponibles' : 'See available expats'}
                <ArrowRight className="ml-2 inline-block" size={20} />
              </Link>
              <p className="mt-4 text-gray-600">
                {isFrench
                  ? 'Paiement sÃ©curisÃ© â€¢ Appel immÃ©diat â€¢ Satisfaction garantie'
                  : 'Secure payment â€¢ Immediate call â€¢ Satisfaction guaranteed'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExpatCall;

