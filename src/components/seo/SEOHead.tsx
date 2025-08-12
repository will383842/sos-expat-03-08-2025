import React from 'react';
import { Helmet } from 'react-helmet-async';
import { RouteMetadata } from '../config/routes';

interface SEOHeadProps {
  metadata: RouteMetadata;
  siteName?: string;
  siteUrl?: string;
  defaultImage?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  metadata,
  siteName = 'Consultation Juridique Expatriés',
  siteUrl = 'https://votre-site.com',
  defaultImage = '/images/og-default.jpg'
}) => {
  const {
    title,
    description,
    lang,
    keywords = [],
    canonical,
    ogImage
  } = metadata;

  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const fullCanonical = canonical || (typeof window !== 'undefined' ? window.location.href : '');
  const fullOgImage = ogImage || `${siteUrl}${defaultImage}`;

  return (
    <Helmet>
      {/* Langue du document */}
      <html lang={lang} />
      
      {/* Métadonnées de base */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      
      {/* Canonical URL */}
      {fullCanonical && <link rel="canonical" href={fullCanonical} />}
      
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={lang === 'fr' ? 'fr_FR' : 'en_US'} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />
      
      {/* Métadonnées techniques */}
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      <meta name="theme-color" content="#1f2937" />
      <meta name="robots" content="index, follow" />
      
      {/* Liens alternatifs pour le multilingue */}
      {lang === 'fr' && (
        <>
          <link rel="alternate" hrefLang="en" href={fullCanonical.replace('/fr/', '/en/')} />
          <link rel="alternate" hrefLang="fr" href={fullCanonical} />
          <link rel="alternate" hrefLang="x-default" href={fullCanonical} />
        </>
      )}
      
      {/* Préconnexions pour optimiser les performances */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Structured Data (JSON-LD) pour les pages de service */}
      {(title.includes('Consultation') || title.includes('Avocat')) && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            "name": siteName,
            "description": description,
            "url": siteUrl,
            "serviceType": "Legal Services",
            "areaServed": {
              "@type": "Country",
              "name": "France"
            },
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Services juridiques",
              "itemListElement": [
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Consultation juridique",
                    "description": "Consultation personnalisée avec des avocats spécialisés"
                  }
                }
              ]
            }
          })}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;

// Hook personnalisé pour utiliser les métadonnées dans les composants
export const useSEO = (metadata: RouteMetadata) => {
  React.useEffect(() => {
    // Mise à jour du titre dans le document pour les SPA
    document.title = metadata.title;
    
    // Mise à jour de la description
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute('content', metadata.description);
    }
  }, [metadata.title, metadata.description]);
};

// Composant wrapper pour les pages avec métadonnées automatiques
interface PageWithSEOProps {
  metadata: RouteMetadata;
  children: React.ReactNode;
  className?: string;
}

export const PageWithSEO: React.FC<PageWithSEOProps> = ({ 
  metadata, 
  children, 
  className = '' 
}) => {
  useSEO(metadata);
  
  return (
    <div className={className}>
      <SEOHead metadata={metadata} />
      {children}
    </div>
  );
};

