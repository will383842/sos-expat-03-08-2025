import React, { useState } from 'react';
import { Star, MapPin, ArrowLeft, ArrowRight, Quote } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const TestimonialsSection: React.FC = () => {
  const { language } = useApp();
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials = [
    {
      id: 1,
      name: 'Marie D.',
      location: language === 'fr' ? 'Expatriée en Thaïlande' : 'Expat in Thailand',
      rating: 5,
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      comment: language === 'fr'
        ? 'Service exceptionnel ! J\'ai pu parler à un avocat français depuis Bangkok en moins de 2 minutes. Très professionnel et rassurant dans ma situation d\'urgence.'
        : 'Exceptional service! I was able to speak to a French lawyer from Bangkok in less than 2 minutes. Very professional and reassuring in my emergency situation.'
    },
    {
      id: 2,
      name: 'Jean L.',
      location: language === 'fr' ? 'Expatrié en Espagne' : 'Expat in Spain',
      rating: 5,
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      comment: language === 'fr'
        ? 'Grâce à SOS Expats, j\'ai pu résoudre mon problème administratif en Espagne. L\'expatrié m\'a donné des conseils précieux basés sur son expérience personnelle. Je recommande vivement ce service à tous les français à l\'étranger !'
        : 'Thanks to SOS Expats, I was able to solve my administrative problem in Spain. The expat gave me valuable advice based on his personal experience. I highly recommend this service to all French people abroad!'
    },
    {
      id: 3,
      name: 'Sophie M.',
      location: language === 'fr' ? 'Expatriée au Canada' : 'Expat in Canada',
      rating: 5,
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      comment: language === 'fr'
        ? 'Interface très intuitive et service client réactif. L\'avocat était compétent et m\'a aidé à comprendre mes droits concernant mon contrat de travail au Canada. Je recommande vivement pour tous les expatriés.'
        : 'Very intuitive interface and responsive customer service. The lawyer was competent and helped me understand my rights regarding my employment contract in Canada. I highly recommend for all expats.'
    }
  ];

  const nextTestimonial = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block bg-red-100 p-3 rounded-full mb-4">
            <Quote className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {language === 'fr' ? 'Ce que disent nos clients' : 'What our clients say'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {language === 'fr'
              ? 'Découvrez les expériences de nos utilisateurs partout dans le monde.'
              : 'Discover the experiences of our users worldwide.'
            }
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Testimonial Carousel */}
          <div className="relative bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-12">
            <div className="absolute top-0 left-0 transform -translate-x-4 -translate-y-4">
              <Quote className="w-12 h-12 text-red-200" />
            </div>
            
            <div className="mb-8">
              <p className="text-xl text-gray-700 italic mb-6">
                "{testimonials[activeIndex].comment}"
              </p>
              
              <div className="flex items-center">
                <img
                  src={testimonials[activeIndex].avatar}
                  alt={testimonials[activeIndex].name}
                  className="w-14 h-14 rounded-full object-cover mr-4 border-2 border-red-200"
                />
                <div>
                  <h4 className="font-semibold text-lg text-gray-900">{testimonials[activeIndex].name}</h4>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin size={12} className="mr-1" />
                    {testimonials[activeIndex].location}
                  </div>
                  <div className="flex items-center mt-1">
                    {[...Array(testimonials[activeIndex].rating)].map((_, i) => (
                      <Star key={i} size={16} className="text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <button 
                onClick={prevTestimonial}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="Previous testimonial"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              
              {/* Dots */}
              <div className="flex space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`w-3 h-3 rounded-full ${
                      index === activeIndex ? 'bg-red-600' : 'bg-gray-300'
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
              
              <button 
                onClick={nextTestimonial}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="Next testimonial"
              >
                <ArrowRight size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          <div className="text-center">
            <a
              href="/testimonials"
              className="inline-block bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors shadow-md hover:shadow-lg"
            >
              {language === 'fr' ? 'Voir tous les témoignages' : 'View all testimonials'}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;