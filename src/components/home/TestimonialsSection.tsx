import React, { useState } from 'react';
import { Star, MapPin, ArrowLeft, ArrowRight, Quote, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const TestimonialsSection: React.FC = () => {
  const { language } = useApp();
  const [activeIndex, setActiveIndex] = useState(0);

  // ✅ GARDER les données test comme demandé
  const testimonials = [
    {
      id: 1,
      name: 'Marie D.',
      location: language === 'fr' ? 'Expatriée en Thaïlande' : 'Expat in Thailand',
      rating: 5,
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      comment: language === 'fr'
        ? 'Service exceptionnel ! J\'ai pu parler à un avocat français depuis Bangkok en moins de 2 minutes. Très professionnel et rassurant dans ma situation d\'urgence.'
        : 'Exceptional service! I was able to speak to a French lawyer from Bangkok in less than 2 minutes. Very professional and reassuring in my emergency situation.',
      impact: '5000€ économisés',
      verified: true,
      date: '2024-03-15',
      expertType: 'Avocat spécialisé'
    },
    {
      id: 2,
      name: 'Jean L.',
      location: language === 'fr' ? 'Expatrié en Espagne' : 'Expat in Spain',
      rating: 5,
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      comment: language === 'fr'
        ? 'Grâce à SOS Expats, j\'ai pu résoudre mon problème administratif en Espagne. L\'expatrié m\'a donné des conseils précieux basés sur son expérience personnelle. Je recommande vivement ce service à tous les français à l\'étranger !'
        : 'Thanks to SOS Expats, I was able to solve my administrative problem in Spain. The expat gave me valuable advice based on his personal experience. I highly recommend this service to all French people abroad!',
      impact: 'Visa obtenu en 3 jours',
      verified: true,
      date: '2024-03-10',
      expertType: 'Expert Fiscal'
    },
    {
      id: 3,
      name: 'Sophie M.',
      location: language === 'fr' ? 'Expatriée au Canada' : 'Expat in Canada',
      rating: 5,
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      comment: language === 'fr'
        ? 'Interface très intuitive et service client réactif. L\'avocat était compétent et m\'a aidé à comprendre mes droits concernant mon contrat de travail au Canada. Je recommande vivement pour tous les expatriés.'
        : 'Very intuitive interface and responsive customer service. The lawyer was competent and helped me understand my rights regarding my employment contract in Canada. I highly recommend for all expats.',
      impact: 'Urgence résolue en 20min',
      verified: true,
      date: '2024-03-08',
      expertType: 'Médecin urgentiste'
    }
  ];

  const nextTestimonial = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-16 sm:py-24 bg-rose-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-slate-900 mb-4">
            Ils nous font confiance
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            {language === 'fr'
              ? 'Découvrez les expériences de nos utilisateurs partout dans le monde.'
              : 'Discover the experiences of our users worldwide.'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl border border-slate-100 hover:border-red-200 transition-all hover:-translate-y-2 group">
              {/* Header avec rating et vérification */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                {testimonial.verified && (
                  <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium border border-blue-200">
                    <CheckCircle className="h-3 w-3" />
                    Vérifié
                  </div>
                )}
              </div>
              
              {/* Contenu du témoignage */}
              <p className="text-slate-700 mb-4 leading-relaxed text-sm sm:text-base line-clamp-4">
                "{testimonial.comment}"
              </p>
              
              {/* Impact */}
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium border border-emerald-200">
                  <TrendingUp className="h-3 w-3" />
                  {testimonial.impact}
                </div>
              </div>

              {/* Type d'expert */}
              <div className="mb-4">
                <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs">
                  <Users className="h-3 w-3" />
                  {testimonial.expertType}
                </span>
              </div>
              
              {/* Auteur */}
              <div>
                <p className="font-bold text-slate-900 text-sm sm:text-base">{testimonial.name}</p>
                <p className="text-slate-600 text-xs sm:text-sm flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {testimonial.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;