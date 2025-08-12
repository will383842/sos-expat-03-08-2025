import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile' | 'book' | 'music' | 'video';
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  structuredData?: Record<string, unknown>;
  noindex?: boolean;
  alternateLanguages?: {
    lang: string;
    url: string;
  }[];
  keywords?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  locale?: string;
  siteName?: string;
  twitterSite?: string;
  twitterCreator?: string;
  // Props spécifiques pour les IA et crawlers avancés
  aiSummary?: string;
  contentType?: string;
  readingTime?: string;
  expertise?: string;
  trustworthiness?: string;
  contentQuality?: 'high' | 'medium' | 'low';
  lastReviewed?: string;
  citations?: string[];
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  canonicalUrl,
  ogImage = '/og-image.jpg',
  ogType = 'website',
  twitterCard = 'summary_large_image',
  structuredData,
  noindex = false,
  alternateLanguages = [],
  keywords,
  author,
  publishedTime,
  modifiedTime,
  locale = 'fr_FR',
  siteName = 'SOS Expat & Travelers',
  twitterSite,
  twitterCreator,
  // Props IA
  aiSummary,
  contentType,
  readingTime,
  expertise,
  trustworthiness,
  contentQuality,
  lastReviewed,
  citations = []
}) => {
  // Construction URL canonique sécurisée
  const buildCanonicalUrl = (): string => {
    if (canonicalUrl?.startsWith('http')) {
      return canonicalUrl;
    }
    
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      const path = canonicalUrl || window.location.pathname;
      return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    }
    
    // Fallback pour SSR
    return canonicalUrl ? `https://sosexpats.com${canonicalUrl}` : '';
  };

  const fullCanonicalUrl = buildCanonicalUrl();
  
  // Validation et nettoyage des données
  const cleanTitle = title?.trim() || '';
  const cleanDescription = description?.trim().substring(0, 160) || '';
  const fullOgImage = ogImage?.startsWith('http') ? ogImage : `https://sosexpats.com${ogImage}`;
  
  // Génération automatique de données structurées enrichies pour les IA
  const generateEnrichedStructuredData = () => {
    const baseData = structuredData || {};
    
    // Enrichissement automatique pour les IA
    const enrichedData = {
      '@context': 'https://schema.org',
      '@type': contentType || 'WebPage',
      name: cleanTitle,
      description: cleanDescription,
      url: fullCanonicalUrl,
      image: fullOgImage,
      author: author ? {
        '@type': 'Person',
        name: author
      } : undefined,
      datePublished: publishedTime,
      dateModified: modifiedTime || new Date().toISOString(),
      // Signaux pour les IA
      ...(aiSummary && { 'ai:summary': aiSummary }),
      ...(readingTime && { 'estimatedReadingTime': readingTime }),
      ...(expertise && { 'expertise': expertise }),
      ...(trustworthiness && { 'trustworthiness': trustworthiness }),
      ...(contentQuality && { 'contentQuality': contentQuality }),
      ...(lastReviewed && { 'dateReviewed': lastReviewed }),
      ...(citations.length > 0 && { 'citation': citations }),
      // Signaux E-A-T pour Google et IA
      'mainEntity': {
        '@type': 'Thing',
        'name': cleanTitle,
        'description': cleanDescription
      },
      // Métadonnées pour crawling IA
      'potentialAction': {
        '@type': 'ReadAction',
        'target': fullCanonicalUrl
      },
      ...baseData
    };
    
    // Nettoyage des valeurs undefined
    return JSON.parse(JSON.stringify(enrichedData));
  };

  return (
    <Helmet>
      {/* Meta de base */}
      <title>{cleanTitle}</title>
      <meta name="description" content={cleanDescription} />
      
      {keywords && <meta name="keywords" content={keywords} />}
      {author && <meta name="author" content={author} />}
      
      {/* Meta spécifiques pour les IA et ChatGPT */}
      {aiSummary && <meta name="summary" content={aiSummary} />}
      {readingTime && <meta name="reading-time" content={readingTime} />}
      {expertise && <meta name="expertise-level" content={expertise} />}
      {trustworthiness && <meta name="trustworthiness" content={trustworthiness} />}
      {contentQuality && <meta name="content-quality" content={contentQuality} />}
      {lastReviewed && <meta name="last-reviewed" content={lastReviewed} />}
      {contentType && <meta name="content-type" content={contentType} />}
      
      {/* Meta pour l'indexation sémantique par les IA */}
      <meta name="ai-crawlable" content="true" />
      <meta name="content-language" content={locale.split('_')[0]} />
      <meta name="document-state" content="dynamic" />
      
      {/* Citations pour la crédibilité IA */}
      {citations.length > 0 && (
        <meta name="citations" content={citations.join('; ')} />
      )}
      
      {/* Robots */}
      <meta 
        name="robots" 
        content={noindex ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"} 
      />
      <meta name="googlebot" content={noindex ? "noindex, nofollow" : "index, follow"} />
      
      {/* URL canonique */}
      {fullCanonicalUrl && <link rel="canonical" href={fullCanonicalUrl} />}

      {/* Open Graph / Facebook */}
      <meta property="og:title" content={cleanTitle} />
      <meta property="og:description" content={cleanDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      
      {fullCanonicalUrl && <meta property="og:url" content={fullCanonicalUrl} />}
      {fullOgImage && (
        <>
          <meta property="og:image" content={fullOgImage} />
          <meta property="og:image:alt" content={cleanTitle} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
        </>
      )}
      
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {author && <meta property="article:author" content={author} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={cleanTitle} />
      <meta name="twitter:description" content={cleanDescription} />
      {fullOgImage && <meta name="twitter:image" content={fullOgImage} />}
      {twitterSite && <meta name="twitter:site" content={twitterSite} />}
      {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}

      {/* Langues alternatives */}
      {alternateLanguages.map((alt) => (
        <link 
          key={alt.lang} 
          rel="alternate" 
          hrefLang={alt.lang} 
          href={alt.url}
        />
      ))}

      {/* Schema.org Structured Data enrichi pour IA */}
      <script type="application/ld+json">
        {JSON.stringify(generateEnrichedStructuredData(), null, 0)}
      </script>
      
      {/* Données supplémentaires pour l'IA en JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPageElement',
          'identifier': 'ai-metadata',
          'about': {
            '@type': 'Thing',
            'name': cleanTitle,
            'description': aiSummary || cleanDescription,
            'keywords': keywords?.split(',').map(k => k.trim()),
            'author': author,
            'dateCreated': publishedTime,
            'dateModified': modifiedTime,
            'inLanguage': locale.split('_')[0],
            'isAccessibleForFree': true,
            'usageInfo': 'This content is optimized for AI understanding and human readability'
          }
        }, null, 0)}
      </script>

      {/* Meta additionnels pour le SEO */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="theme-color" content="#ffffff" />
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    </Helmet>
  );
};

export default SEOHead;

