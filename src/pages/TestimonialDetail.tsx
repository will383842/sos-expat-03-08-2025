import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, Calendar, ArrowLeft, Share2, Facebook, Mail } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';

interface TestimonialData {
  id: string;
  name: string;
  type: 'avocat' | 'expatrie';
  country: string;
  language: 'francophone' | 'anglophone';
  rating: number;
  date: string;
  title: string;
  fullContent: string;
  avatar: string;
  verified: boolean;
  serviceUsed: string;
  duration: string;
  helpType: string[];
}

// Données optimisées pour la production
const TESTIMONIALS_DATA: Record<string, TestimonialData> = {
  '1': {
    id: '1',
    name: 'Marie D.',
    type: 'avocat',
    country: 'thailande',
    language: 'francophone',
    rating: 5,
    date: '2024-12-15',
    title: 'Aide juridique exceptionnelle en Thaïlande',
    fullContent: `Service exceptionnel ! J'ai pu parler à un avocat français depuis Bangkok en moins de 2 minutes. Très professionnel et rassurant dans ma situation d'urgence.

L'avocat m'a donné des conseils précis sur mon problème de visa et m'a orienté vers les bonnes démarches. Il connaissait parfaitement la législation thaïlandaise et française, ce qui m'a permis d'éviter des erreurs coûteuses.

Le service client est réactif et la plateforme très intuitive. J'ai reçu ma facture PDF immédiatement après l'appel, ce qui est parfait pour mes remboursements d'assurance.

Je recommande vivement SOS Expat & Travelers pour tous les expatriés qui ont besoin d'aide juridique urgente. C'est un service qui peut vraiment vous sauver dans des situations compliquées à l'étranger.

La qualité du conseil était au niveau d'un cabinet d'avocat traditionnel, mais avec la rapidité et la praticité d'un service en ligne moderne. Parfait pour les urgences !`,
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    verified: true,
    serviceUsed: 'Appel Avocat',
    duration: '20 minutes',
    helpType: ['Droit des visas', 'Droit de l\'immigration', 'Conseil juridique']
  },
  '2': {
    id: '2',
    name: 'Jean L.',
    type: 'expatrie',
    country: 'espagne',
    language: 'francophone',
    rating: 5,
    date: '2024-11-20',
    title: 'Conseils pratiques pour mon installation à Madrid',
    fullContent: `Grâce à SOS Expats, j'ai pu résoudre mon problème administratif en Espagne. L'expatrié m'a donné des conseils précieux basés sur son expérience personnelle. Je recommande vivement ce service à tous les français à l'étranger !
    
L'expatrié connaissait parfaitement les démarches administratives locales et m'a guidé pas à pas. Il m'a même envoyé des liens utiles après notre appel.

Le rapport qualité-prix est imbattable. Pour seulement 19€, j'ai économisé des semaines de recherches et de stress. La plateforme est très facile à utiliser, même pour les personnes peu à l'aise avec la technologie.

Je n'hésiterai pas à faire appel à leurs services à nouveau si j'ai d'autres questions sur la vie en Espagne. Un grand merci à toute l'équipe SOS Expats !`,
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    verified: true,
    serviceUsed: 'Appel Expatrié',
    duration: '30 minutes',
    helpType: ['Démarches administratives', 'Installation', 'Logement']
  },
  '3': {
    id: '3',
    name: 'Sophie M.',
    type: 'avocat',
    country: 'canada',
    language: 'francophone',
    rating: 4,
    date: '2024-10-05',
    title: 'Consultation juridique pour mon contrat de travail au Canada',
    fullContent: `Interface très intuitive et service client réactif. L'avocat était compétent et m'a aidé à comprendre mes droits concernant mon contrat de travail au Canada. Je recommande vivement pour tous les expatriés.
    
L'avocat a pris le temps d'examiner les clauses problématiques de mon contrat et m'a expliqué les spécificités du droit du travail canadien. Ses conseils m'ont permis de négocier de meilleures conditions avec mon employeur.

Le service de prise de rendez-vous est très flexible, j'ai pu avoir ma consultation le jour même. La qualité de l'appel était excellente, sans problèmes techniques.

Je garde précieusement le contact pour mes futures questions juridiques au Canada.`,
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    verified: true,
    serviceUsed: 'Appel Avocat',
    duration: '20 minutes',
    helpType: ['Droit du travail', 'Contrats', 'Négociation']
  }
};

const TestimonialDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useApp();

  // Mémoisation des données du témoignage
  const testimonialData = useMemo(() => {
    return TESTIMONIALS_DATA[id || '1'] || TESTIMONIALS_DATA['1'];
  }, [id]);

  // Mémoisation du formatage de date
  const formattedDate = useMemo(() => {
    const date = new Date(testimonialData.date);
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [testimonialData.date, language]);

  // Mémoisation des étoiles
  const stars = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={20}
        className={i < testimonialData.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
      />
    ));
  }, [testimonialData.rating]);

  // Fonction de partage optimisée
  const handleShare = (platform: string) => {
    const currentUrl = window.location.href;
    const title = `${testimonialData.name} a sollicité un ${testimonialData.type === 'avocat' ? 'avocat' : 'expatrié'} - ${testimonialData.title}`;
    const description = `${testimonialData.fullContent.substring(0, 100)}...`;
    
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}&quote=${encodeURIComponent(`${title}\n\n${description}`)}`,
      email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description}\n\n${currentUrl}`)}`
    };

    if (platform === 'copy') {
      navigator.clipboard?.writeText(currentUrl).then(() => {
        alert(language === 'fr' ? 'Lien copié !' : 'Link copied!');
      }).catch(() => {
        // Fallback pour les navigateurs non supportés
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

  // Textes optimisés selon la langue
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
      viewAllTestimonials: 'Voir tous les témoignages'
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
      viewAllTestimonials: 'View all testimonials'
    }
  };

  const t = texts[language === 'fr' ? 'fr' : 'en'];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header optimisé */}
        <header className="bg-gradient-to-r from-red-600 to-red-700 text-white py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => navigate('/testimonials')}
              className="flex items-center space-x-2 text-red-100 hover:text-white mb-6 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded-md p-1"
              aria-label={t.backToTestimonials}
            >
              <ArrowLeft size={20} />
              <span>{t.backToTestimonials}</span>
            </button>
            
            <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
              <img
                src={testimonialData.avatar}
                alt={`${testimonialData.name} avatar`}
                className="w-20 h-20 rounded-full object-cover border-4 border-white/20 mx-auto sm:mx-0"
                loading="lazy"
              />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                  <h1 className="text-2xl font-bold">{testimonialData.name}</h1>
                  {testimonialData.verified && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full inline-block">
                      ✓ {t.verified}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-red-100 mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    testimonialData.type === 'avocat' 
                      ? 'bg-red-500/20 text-red-100'
                      : 'bg-green-500/20 text-green-100'
                  }`}>
                    {testimonialData.type === 'avocat' ? t.solicitedLawyer : t.solicitedExpat}
                  </span>
                  <div className="flex items-center justify-center sm:justify-start space-x-1">
                    <MapPin size={16} />
                    <span className="capitalize">{testimonialData.country}</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start space-x-1">
                    <Calendar size={16} />
                    <span>{formattedDate}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <div className="flex">{stars}</div>
                  <span className="text-red-100">({testimonialData.rating}/5)</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contenu principal */}
            <article className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
                  {testimonialData.title}
                </h2>
                
                <div className="prose prose-lg max-w-none">
                  {testimonialData.fullContent.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-gray-700 leading-relaxed mb-4 last:mb-0">
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>

                {/* Section de partage */}
                <div className="border-t border-gray-200 pt-6 mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t.shareTestimonial}
                  </h3>
                  <div className="flex space-x-3">
                    {[
                      { platform: 'facebook', icon: Facebook, title: 'Partager sur Facebook', bg: 'bg-blue-600 hover:bg-blue-700' },
                      { platform: 'email', icon: Mail, title: 'Partager par email', bg: 'bg-gray-600 hover:bg-gray-700' },
                      { platform: 'copy', icon: Share2, title: 'Copier le lien', bg: 'bg-green-600 hover:bg-green-700' }
                    ].map(({ platform, icon: Icon, title, bg }) => (
                      <button
                        key={platform}
                        onClick={() => handleShare(platform)}
                        className={`${bg} text-white p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
                        title={title}
                        aria-label={title}
                      >
                        <Icon size={20} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t.serviceDetails}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500 block">{t.serviceUsed}</span>
                    <div className="font-medium text-gray-900 mt-1">
                      {testimonialData.serviceUsed}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-500 block">{t.duration}</span>
                    <div className="font-medium text-gray-900 mt-1">
                      {testimonialData.duration}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-500 block">{t.helpType}</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {testimonialData.helpType.map((type, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
                <h3 className="text-lg font-semibold mb-3">{t.needHelp}</h3>
                <p className="text-red-100 mb-4 text-sm">
                  {t.helpDescription}
                </p>
                <a
                  href="/sos-appel"
                  className="bg-white text-red-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition-colors inline-block w-full text-center focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  {t.findExpert}
                </a>
              </div>
            </aside>
          </div>
        </main>

        {/* Témoignages connexes */}
        <section className="bg-white py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              {t.otherTestimonials}
            </h3>
            
            <div className="text-center">
              <a
                href="/testimonials"
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {t.viewAllTestimonials}
              </a>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default TestimonialDetail;

