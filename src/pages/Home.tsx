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

const sections = [
  { Component: HeroSection, bg: "bg-gradient-to-b from-red-800 to-red-700" },
  { Component: ServicesSection, bg: "bg-white" },
  { Component: ProfileCarousel, bg: "bg-red-100" },
  { Component: HowItWorksSection, bg: "bg-white" },
  { Component: MapSection, bg: "bg-red-50" },
  { Component: TestimonialsSection, bg: "bg-rose-50" },
  { Component: CTASection, bg: "bg-gradient-to-br from-red-700 to-red-800" }
];

export default () => (
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