import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Users, MessageSquare } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';

const HowItWorksPage: React.FC = () => {
  // Utilisation du contexte App pour récupérer la langue
  const { language } = useApp();
  
  const pageData = {
    fr: {
      title: 'Comment ça marche',
      subtitle: 'La recette secrète pour ne plus jamais galérer à l\'étranger',
      description: 'Découvrez comment obtenir de l\'aide juridique ou d\'expatriation en 3 étapes simples, rapides et sécurisées.',

      stepsTitle: '3 étapes pour arrêter de stresser',
      step1Title: 'Choisissez votre sauveur',
      step1Desc: 'Parcourez les profils de nos experts et trouvez votre match parfait (comme sur Tinder, mais pour les galères administratives !)',
      step2Title: 'Réservez un appel téléphonique',
      step2Desc: 'Réservez un créneau qui vous convient et décrivez votre situation.',
      step3Title: 'Recevez la solution miracle',
      step3Desc: 'Obtenez des conseils sur-mesure qui vont transformer votre calvaire en promenade de santé. Promis !',
      
      whyUsTitle: 'Pourquoi choisir SOS Expats ?',
      whyUsSubtitle: 'Parce qu\'on a vécu les mêmes galères que vous !',
      
      verifiedTitle: 'Experts vérifiés',
      verifiedDesc: 'Tous nos experts sont certifiés et ont survécu aux mêmes épreuves que vous. Ils connaissent la musique !',
      
      fastTitle: 'Réponse ultra-rapide',
      fastDesc: 'Plus rapide qu\'un delivery de sushi ! Souvent une réponse le jour même, parfois en quelques minutes.',
      
      ctaTitle: 'Prêt à arrêter de galérer ?',
      ctaSubtitle: 'Rejoignez la communauté des expats heureux !',
      ctaDesc: 'Plus de 25 000 expatriés nous font confiance pour leurs galères du quotidien. Et vous, qu\'attendez-vous ?',
      ctaButton: 'Je veux mes tarifs !'
    },
    en: {
      title: 'How it works',
      subtitle: 'The secret recipe to never struggle abroad again',
      description: 'Discover how to get legal or expat help in 3 simple, fast and secure steps.',

      stepsTitle: '3 steps to stop stressing',
      step1Title: 'Choose your lifesaver',
      step1Desc: 'Browse our expert profiles and find your perfect match (like Tinder, but for administrative nightmares!)',
      step2Title: 'Book a phone call',
      step2Desc: 'Book a time slot that suits you and describe your situation.',
      step3Title: 'Get the miracle solution',
      step3Desc: 'Receive tailor-made advice that will turn your ordeal into a walk in the park. Promise!',
      
      whyUsTitle: 'Why choose SOS Expats?',
      whyUsSubtitle: 'Because we\'ve been through the same struggles as you!',
      
      verifiedTitle: 'Verified experts',
      verifiedDesc: 'All our experts are certified and have survived the same ordeals as you. They know the drill!',
      
      fastTitle: 'Ultra-fast response',
      fastDesc: 'Faster than sushi delivery! Often a response the same day, sometimes within minutes.',
      
      ctaTitle: 'Ready to stop struggling?',
      ctaSubtitle: 'Join the community of happy expats!',
      ctaDesc: 'More than 25,000 expats trust us with their daily struggles. What are you waiting for?',
      ctaButton: 'I want my pricing!'
    }
  } as const;

  const data = pageData[language as keyof typeof pageData] || pageData.fr;

  // Définir le titre de la page
  React.useEffect(() => {
    document.title = data.title + ' - SOS Expats';
  }, [data.title]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-950">
        {/* Header avec style moderne comme la home */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-transparent to-blue-500/20" />
          
          {/* Effets visuels */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/30 to-orange-500/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-yellow-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-500" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
            <h1 className="text-6xl md:text-8xl font-black mb-4 leading-tight">
              <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                Comment
              </span>
              <br />
              <span className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                ça marche
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              {data.description}
            </p>
          </div>
        </section>

        {/* Section des étapes avec tailles corrigées */}
        <section className="py-28 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-red-400/10 to-orange-400/10 rounded-full blur-2xl" />
            <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-2xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
                <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  {data.stepsTitle}
                </span>
              </h2>
            </div>

            {/* Grille corrigée avec tailles harmonieuses */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
              {/* Étape 1 */}
              <div className="group relative">
                <div className="relative p-10 rounded-3xl bg-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-4 border border-gray-100 h-[450px] flex flex-col">
                  <div className="absolute -top-6 -right-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-16 h-16 flex items-center justify-center font-black text-2xl shadow-lg">
                    1
                  </div>
                  
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-black text-gray-900 mb-4 text-center">
                    {data.step1Title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-center mb-6 flex-grow">
                    {data.step1Desc}
                  </p>
                  
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-4 py-2 rounded-full text-sm font-bold">
                      <Users className="w-4 h-4" />
                      30 secondes chrono !
                    </div>
                  </div>
                </div>
              </div>

              {/* Étape 2 */}
              <div className="group relative">
                <div className="relative p-10 rounded-3xl bg-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-4 border border-gray-100 h-[450px] flex flex-col">
                  <div className="absolute -top-6 -right-6 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full w-16 h-16 flex items-center justify-center font-black text-2xl shadow-lg">
                    2
                  </div>
                  
                  <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <MessageSquare className="w-10 h-10 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-black text-gray-900 mb-4 text-center">
                    {data.step2Title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-center mb-6 flex-grow">
                    {data.step2Desc}
                  </p>
                  
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-teal-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold">
                      <MessageSquare className="w-4 h-4" />
                      Soyez rappelé dans moins de 5 minutes !
                    </div>
                  </div>
                </div>
              </div>

              {/* Étape 3 */}
              <div className="group relative">
                <div className="relative p-10 rounded-3xl bg-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-4 border border-gray-100 h-[450px] flex flex-col">
                  <div className="absolute -top-6 -right-6 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full w-16 h-16 flex items-center justify-center font-black text-2xl shadow-lg">
                    3
                  </div>
                  
                  <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-black text-gray-900 mb-4 text-center">
                    {data.step3Title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-center mb-6 flex-grow">
                    {data.step3Desc}
                  </p>
                  
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 px-4 py-2 rounded-full text-sm font-bold">
                      <CheckCircle className="w-4 h-4" />
                      Mission accomplie !
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section avantages */}
        <section className="py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center mb-20">
              <h2 className="text-5xl font-black text-gray-900 mb-6">
                <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  {data.whyUsTitle}
                </span>
              </h2>
              <p className="text-xl text-gray-600 font-bold">
                {data.whyUsSubtitle}
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="group relative">
                <div className="p-12 rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 hover:border-green-300 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 mb-6 text-center">
                    {data.verifiedTitle}
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-center text-lg">
                    {data.verifiedDesc}
                  </p>
                  
                  <div className="mt-8 text-center">
                    <div className="inline-flex items-center gap-2 bg-green-200 text-green-800 px-4 py-2 rounded-full text-sm font-bold">
                      <CheckCircle className="w-4 h-4" />
                      100% vérifiés
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="group relative">
                <div className="p-12 rounded-3xl bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 hover:border-blue-300 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <MessageSquare className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 mb-6 text-center">
                    {data.fastTitle}
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-center text-lg">
                    {data.fastDesc}
                  </p>
                  
                  <div className="mt-8 text-center">
                    <div className="inline-flex items-center gap-2 bg-blue-200 text-blue-800 px-4 py-2 rounded-full text-sm font-bold">
                      <MessageSquare className="w-4 h-4" />
                      Réponse express
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action final */}
        <section className="py-32 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
          
          {/* Effets visuels */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight">
              {data.ctaTitle}
            </h2>
            
            <p className="text-2xl md:text-3xl text-white/95 mb-12 max-w-4xl mx-auto leading-relaxed font-bold">
              {data.ctaDesc}
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
              <Link
                to="/tarifs"
                className="group relative overflow-hidden bg-white hover:bg-gray-100 text-red-600 px-12 py-6 rounded-3xl font-black text-2xl transition-all duration-300 hover:scale-110 hover:shadow-2xl flex items-center space-x-4 border-2 border-white/50"
              >
                <span>{data.ctaButton}</span>
              </Link>

              <Link
                to="/sos-appel"
                className="group bg-transparent border-2 border-white hover:bg-white hover:text-red-600 text-white px-12 py-6 rounded-3xl font-bold text-xl transition-all duration-300 hover:scale-105 flex items-center space-x-4"
              >
                <span>Urgence maintenant</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default HowItWorksPage;