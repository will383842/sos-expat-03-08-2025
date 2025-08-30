import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Phone, CheckCircle, Clock, LucideIcon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface Step {
  number: number;
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  colorClass: string;
  bgColorClass: string;
  textColorClass: string;
  borderColorClass: string;
}

interface Translations {
  [key: string]: {
    pageTitle: string;
    pageDescription: string;
    breadcrumb: string;
    heroTitle: string;
    heroSubtitle: string;
    sectionTitle: string;
    sectionSubtitle: string;
    ctaTitle: string;
    ctaSubtitle: string;
    ctaButton: string;
    home: string;
    steps: {
      [key: string]: {
        title: string;
        description: string;
      };
    };
  };
}

const HowItWorksPage: React.FC = () => {
  const { language } = useApp();

  // Traductions complÃ¨tes pour la page
  const translations: Translations = {
    fr: {
      pageTitle: 'Comment Ã§a marche - Notre processus',
      pageDescription: 'DÃ©couvrez comment obtenir de l\'aide juridique ou d\'expatriation en 3 Ã©tapes simples, rapides et sÃ©curisÃ©es.',
      breadcrumb: 'Comment Ã§a marche',
      heroTitle: 'Comment Ã§a marche ?',
      heroSubtitle: 'DÃ©couvrez comment obtenir de l\'aide juridique ou d\'expatriation en 3 Ã©tapes simples, rapides et sÃ©curisÃ©es.',
      sectionTitle: 'Notre processus en 3 Ã©tapes',
      sectionSubtitle: 'Obtenez de l\'aide en 3 Ã©tapes simples, rapides et sÃ©curisÃ©es.',
      ctaTitle: 'PrÃªt Ã  commencer ?',
      ctaSubtitle: 'Obtenez l\'aide dont vous avez besoin en quelques minutes seulement.',
      ctaButton: 'Commencer maintenant',
      home: 'Accueil',
      steps: {
        choose: {
          title: 'Choisissez votre service',
          description: 'SÃ©lectionnez le type d\'aide dont vous avez besoin : avocat ou expatriÃ©.'
        },
        connect: {
          title: 'Connectez-vous',
          description: 'Nous vous mettons en relation avec un expert disponible en 5-10 minutes.'
        },
        help: {
          title: 'Obtenez de l\'aide',
          description: 'Parlez directement avec votre expert et obtenez les conseils dont vous avez besoin.'
        }
      }
    },
    en: {
      pageTitle: 'How it works - Our process',
      pageDescription: 'Discover how to get legal or expat help in 3 simple, fast and secure steps.',
      breadcrumb: 'How it works',
      heroTitle: 'How does it work?',
      heroSubtitle: 'Discover how to get legal or expat help in 3 simple, fast and secure steps.',
      sectionTitle: 'Our 3-step process',
      sectionSubtitle: 'Get help in 3 simple, fast and secure steps.',
      ctaTitle: 'Ready to get started?',
      ctaSubtitle: 'Get the help you need in just a few minutes.',
      ctaButton: 'Start now',
      home: 'Home',
      steps: {
        choose: {
          title: 'Choose your service',
          description: 'Select the type of help you need: lawyer or expat.'
        },
        connect: {
          title: 'Connect',
          description: 'We connect you with an available expert in 5-10 minutes.'
        },
        help: {
          title: 'Get help',
          description: 'Talk directly with your expert and get the advice you need.'
        }
      }
    }
  };

  const currentLang = language || 'fr';
  const t = translations[currentLang] || translations.fr;

  const steps: Step[] = [
    {
      number: 1,
      icon: Phone,
      titleKey: 'choose',
      descriptionKey: 'choose',
      colorClass: 'red',
      bgColorClass: 'bg-red-100',
      textColorClass: 'text-red-600',
      borderColorClass: 'border-red-200'
    },
    {
      number: 2,
      icon: Clock,
      titleKey: 'connect',
      descriptionKey: 'connect',
      colorClass: 'blue',
      bgColorClass: 'bg-blue-100',
      textColorClass: 'text-blue-600',
      borderColorClass: 'border-blue-200'
    },
    {
      number: 3,
      icon: CheckCircle,
      titleKey: 'help',
      descriptionKey: 'help',
      colorClass: 'green',
      bgColorClass: 'bg-green-100',
      textColorClass: 'text-green-600',
      borderColorClass: 'border-green-200'
    }
  ];

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{t.pageTitle}</title>
        <meta name="description" content={t.pageDescription} />
        <meta property="og:title" content={t.pageTitle} />
        <meta property="og:description" content={t.pageDescription} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${window.location.origin}/how-it-works`} />
      </Helmet>

      <main className="min-h-screen bg-gray-50">
        {/* Breadcrumb */}
        <nav className="bg-white border-b border-gray-200" aria-label="Breadcrumb">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-4">
              <a 
                href="/" 
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {t.home}
              </a>
              <span className="mx-2 text-gray-400">/</span>
              <span className="text-gray-900 font-medium">{t.breadcrumb}</span>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="bg-white py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {t.heroTitle}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t.heroSubtitle}
            </p>
          </div>
        </section>

        {/* Section Comment Ã§a marche */}
        <section 
          className="py-12 sm:py-16 lg:py-20 bg-white"
          aria-labelledby="how-it-works-section-title"
          role="region"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* En-tÃªte de section */}
            <header className="text-center mb-12 sm:mb-16">
              <h2 
                id="how-it-works-section-title"
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight"
              >
                {t.sectionTitle}
              </h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                {t.sectionSubtitle}
              </p>
            </header>

            {/* Contenu principal */}
            <div className="relative">
              {/* Ligne de connexion - visible uniquement sur desktop */}
              <div 
                className="hidden lg:block absolute top-20 left-1/2 transform -translate-x-1/2 w-4/5 h-0.5 bg-gray-200 z-0"
                aria-hidden="true"
              />
              
              {/* Grille des Ã©tapes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12 relative z-10">
                {steps.map((step) => {
                  const Icon = step.icon;
                  const stepData = t.steps[step.titleKey];
                  
                  return (
                    <article 
                      key={step.number}
                      className="flex flex-col items-center text-center group"
                    >
                      {/* IcÃ´ne avec numÃ©ro */}
                      <div className="relative mb-6 sm:mb-8">
                        <div 
                          className={`
                            w-14 h-14 sm:w-16 sm:h-16 
                            ${step.bgColorClass} 
                            rounded-full 
                            flex items-center justify-center 
                            border-2 ${step.borderColorClass}
                            transition-transform duration-200 
                            group-hover:scale-105
                            shadow-sm
                          `}
                          role="img"
                          aria-label={`Ã‰tape ${step.number}: ${stepData.title}`}
                        >
                          <Icon 
                            className={`w-6 h-6 sm:w-8 sm:h-8 ${step.textColorClass}`}
                            aria-hidden="true"
                          />
                        </div>
                        
                        {/* Badge numÃ©ro */}
                        <div 
                          className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm sm:text-lg font-bold shadow-md"
                          aria-hidden="true"
                        >
                          {step.number}
                        </div>
                      </div>

                      {/* Contenu textuel */}
                      <div className="space-y-3">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight">
                          {stepData.title}
                        </h3>
                        
                        <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xs mx-auto">
                          {stepData.description}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-red-600 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              {t.ctaTitle}
            </h2>
            <p className="text-lg text-red-100 mb-8 max-w-2xl mx-auto">
              {t.ctaSubtitle}
            </p>
            <a
              href="/contact"
              className="inline-flex items-center px-8 py-3 bg-white text-red-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-lg"
            >
              {t.ctaButton}
            </a>
          </div>
        </section>
      </main>
    </>
  );
};

export default HowItWorksPage;

