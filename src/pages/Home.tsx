import React from 'react';
import Layout from '../components/layout/Layout';
import SEOHead from '../components/layout/SEOHead';
import HeroSection from '../components/home/HeroSection';
import ServicesSection from '../components/home/ServicesSection';
import MapSection from '../components/home/MapSection';
import HowItWorksSection from '../components/home/HowItWorksSection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import CTASection from '../components/home/CTASection';
import ProfileCarousel from '../components/home/ProfileCarousel';
import { ArrowRight, Sparkles, Globe, Users, Zap } from 'lucide-react';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "SOS Expat & Travelers",
  "url": "https://sosexpats.com",
  "logo": "https://sosexpats.com/logo.png",
  "sameAs": [
    "https://www.facebook.com/sosexpats",
    "https://twitter.com/sosexpats",
    "https://www.linkedin.com/company/sosexpats"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "",
    "contactType": "customer service",
    "availableLanguage": ["French", "English"]
  },
  "description": "Plateforme d'assistance urgente pour expatriés francophones. Connectez-vous avec des avocats et expatriés vérifiés partout dans le monde."
};

// Section ProfileCarousel avec design moderne 2026
const ExpertsSection: React.FC = () => {
  return (
    <section className="py-20 sm:py-32 relative overflow-hidden">
      {/* Background futuriste */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
      
      {/* Effets de fond animés */}
      <div className="absolute inset-0 hidden sm:block">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Particules flottantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
        {[...Array(20)].map((_, i) => (
          <Sparkles
            key={i}
            className="absolute text-white/10 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              fontSize: `${Math.random() * 20 + 10}px`
            }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-4">
        {/* Header de la section */}
        <header className="text-center mb-20">
          {/* Badge de présentation */}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 mb-8">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-semibold">Experts vérifiés</span>
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </div>
          
          {/* Titre principal */}
          <h2 className="text-6xl sm:text-8xl font-black mb-8">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Experts disponibles
            </span>
          </h2>
          
          {/* Sous-titre */}
          <p className="text-xl sm:text-2xl text-white/80 max-w-4xl mx-auto mb-12 leading-relaxed">
            Connectez-vous instantanément avec nos experts vérifiés partout dans le monde
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-white/80">
            <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>En ligne</span>
            <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>Hors ligne</span>
          </div>
        </header>
        
        {/* ProfileCarousel avec stats */}
        <ProfileCarousel 
          className="mb-20"
          showStats={true}
          pageSize={12}
        />
        
        {/* CTA Section */}
        <div className="text-center">
          <a 
            href="/sos-appel"
            className="group inline-flex items-center gap-4 px-10 py-6 rounded-3xl font-black text-xl transition-all duration-700 hover:scale-105 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-2xl hover:shadow-blue-500/25 backdrop-blur-xl border border-white/20 relative overflow-hidden"
          >
            {/* Effet de brillance */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <Globe className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12 relative z-10" />
            <span className="relative z-10">Voir tous les experts</span>
            <ArrowRight className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-2 relative z-10" />
            
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl" />
          </a>

          {/* Message de soutien */}
          <p className="text-white/60 text-sm mt-6 max-w-md mx-auto">
            Disponibles 24h/24, 7j/7 pour vous accompagner dans vos démarches à l'étranger
          </p>
        </div>
      </div>

      {/* Styles pour la section */}
      <style>{`
        /* Optimisations GPU */
        .group:hover,
        [class*="transition-"],
        [class*="duration-"] {
          will-change: transform;
          transform: translateZ(0);
        }
        
        /* Glassmorphism avancé */
        .backdrop-blur-xl {
          backdrop-filter: blur(24px) saturate(180%) brightness(110%);
        }
        
        /* Effet de glow personnalisé */
        .shadow-blue-500\/25 {
          box-shadow: 0 25px 50px -12px rgba(59, 130, 246, 0.25);
        }
        
        /* Animation de particules */
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        /* Désactivation pour les utilisateurs préférant moins d'animations */
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse,
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </section>
  );
};

// Configuration des sections avec la nouvelle ExpertsSection
const sections = [
  { Component: HeroSection, bg: "bg-gradient-to-b from-red-800 to-red-700" },
  { Component: ExpertsSection, bg: "bg-transparent" }, // Experts juste sous le héros
  { Component: ServicesSection, bg: "bg-white" },
  { Component: HowItWorksSection, bg: "bg-white" },
  { Component: MapSection, bg: "bg-red-50" },
  { Component: TestimonialsSection, bg: "bg-rose-50" },
  { Component: CTASection, bg: "bg-gradient-to-br from-red-700 to-red-800" }
];

// Page Home principale
const HomePage: React.FC = () => (
  <Layout>
    <SEOHead
      title="SOS Expat & Travelers - Aide d'urgence pour expatriés francophones"
      description="Plateforme d'assistance urgente pour expatriés francophones. Connectez-vous avec des avocats et expatriés vérifiés partout dans le monde."
      structuredData={structuredData}
    />
    {sections.map(({ Component, bg }, i) => (
      <div key={i} className={bg}>
        <Component />
      </div>
    ))}
  </Layout>
);

export default HomePage;