import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Users, MessageSquare } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';

// Type pour la langue
type Language = 'fr' | 'en';

const HowItWorksPage: React.FC = () => {
  // Utilisation du contexte App pour récupérer la langue
  const { language } = useApp();
  
  const pageData = {
    fr: {
      title: 'Comment ça marche',
      description: 'Découvrez comment obtenir de l\'aide juridique ou d\'expatriation en 3 étapes simples, rapides et sécurisées.',

      stepsTitle: '3 étapes simples',
      step1Title: 'Choisissez votre expert',
      step1Desc: 'Parcourez les profils de nos experts et sélectionnez celui qui correspond à vos besoins.',
      step2Title: 'Prenez rendez-vous',
      step2Desc: 'Réservez un créneau qui vous convient et décrivez votre situation.',
      step3Title: 'Obtenez votre aide',
      step3Desc: 'Recevez des conseils personnalisés et des solutions adaptées à votre situation.',
      ctaTitle: 'Prêt à commencer ?',
      ctaDesc: 'Obtenez l\'aide dont vous avez besoin en quelques minutes seulement.',
      ctaButton: 'Voir nos tarifs'
    },
    en: {
      title: 'How it works',
      description: 'Discover how to get legal or expat help in 3 simple, fast and secure steps.',

      stepsTitle: '3 simple steps',
      step1Title: 'Choose your expert',
      step1Desc: 'Browse our expert profiles and select the one that matches your needs.',
      step2Title: 'Book an appointment',
      step2Desc: 'Book a time slot that suits you and describe your situation.',
      step3Title: 'Get your help',
      step3Desc: 'Receive personalized advice and solutions tailored to your situation.',
      ctaTitle: 'Ready to get started?',
      ctaDesc: 'Get the help you need in just a few minutes.',
      ctaButton: 'View our pricing'
    }
  } as const;

  const data = pageData[language as keyof typeof pageData] || pageData.fr;

  // Définir le titre de la page
  React.useEffect(() => {
    document.title = data.title + ' - SOS Expats';
  }, [data.title]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">


        {/* Header avec fond rouge */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {data.title}
            </h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto">
              {data.description}
            </p>
          </div>
        </div>

        {/* Section principale - Comment ça marche */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {data.stepsTitle}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto">
              {/* Étape 1 */}
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform transition-all hover:scale-105 hover:shadow-2xl">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-red-600" />
                </div>
                <div className="bg-red-600 text-white text-lg font-bold rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-6">
                  1
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {data.step1Title}
                </h3>
                <p className="text-gray-600">
                  {data.step1Desc}
                </p>
              </div>

              {/* Étape 2 */}
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform transition-all hover:scale-105 hover:shadow-2xl">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-8 h-8 text-red-600" />
                </div>
                <div className="bg-red-600 text-white text-lg font-bold rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-6">
                  2
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {data.step2Title}
                </h3>
                <p className="text-gray-600">
                  {data.step2Desc}
                </p>
              </div>

              {/* Étape 3 */}
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform transition-all hover:scale-105 hover:shadow-2xl">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-red-600" />
                </div>
                <div className="bg-red-600 text-white text-lg font-bold rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-6">
                  3
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {data.step3Title}
                </h3>
                <p className="text-gray-600">
                  {data.step3Desc}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section avantages */}
        <div className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-12">
                {language === 'fr' ? 'Pourquoi choisir SOS Expats ?' : 'Why choose SOS Expats?'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {language === 'fr' ? 'Experts vérifiés' : 'Verified experts'}
                  </h3>
                  <p className="text-gray-600">
                    {language === 'fr' 
                      ? 'Tous nos experts sont certifiés et ont une expérience prouvée dans leur domaine.'
                      : 'All our experts are certified and have proven experience in their field.'
                    }
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {language === 'fr' ? 'Réponse rapide' : 'Quick response'}
                  </h3>
                  <p className="text-gray-600">
                    {language === 'fr' 
                      ? 'Obtenez une réponse dans les plus brefs délais, souvent le jour même.'
                      : 'Get an answer as soon as possible, often the same day.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-red-600 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              {data.ctaTitle}
            </h2>
            <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
              {data.ctaDesc}
            </p>
            <Link
              to="/tarifs"
              className="inline-flex items-center px-8 py-4 bg-white text-red-600 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-lg text-lg"
            >
              {data.ctaButton}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HowItWorksPage;