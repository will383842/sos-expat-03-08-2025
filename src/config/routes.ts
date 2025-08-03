import React from 'react';

export interface RouteConfig {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<unknown>> | React.ComponentType<unknown>;
  protected?: boolean;
  role?: string;
  alias?: string; // Pour les routes multilingues
  preload?: boolean; // Pour le préchargement
  meta?: {
    title?: string;
    description?: string;
    lang: string;
    keywords?: string[];
  };
}

// Utilitaire pour créer des routes avec métadonnées SEO
export const createRouteWithMeta = (
  path: string,
  component: RouteConfig['component'],
  meta: RouteConfig['meta'],
  options?: Partial<RouteConfig>
): RouteConfig => ({
  path,
  component,
  meta,
  ...options,
});

// Métadonnées par défaut pour les pages principales
export const defaultMetadata = {
  home: {
    title: 'Consultation Juridique pour Expatriés Francophones',
    description: 'Service de consultation juridique spécialisé pour les expatriés francophones. Avocats qualifiés, conseils personnalisés.',
    lang: 'fr',
    keywords: ['consultation juridique', 'expatriés', 'avocats', 'conseil juridique', 'francophones']
  },
  login: {
    title: 'Connexion - Espace Client',
    description: 'Connectez-vous à votre espace personnel pour accéder à nos services de consultation juridique.',
    lang: 'fr',
    keywords: ['connexion', 'login', 'espace client']
  },
  pricing: {
    title: 'Tarifs - Consultation Juridique',
    description: 'Découvrez nos tarifs transparents pour les consultations juridiques. Plusieurs formules adaptées à vos besoins.',
    lang: 'fr',
    keywords: ['tarifs', 'prix', 'consultation', 'formules']
  },
  register: {
    title: 'Inscription - Rejoignez notre réseau',
    description: 'Inscrivez-vous comme client, avocat ou expatrié pour bénéficier de nos services juridiques.',
    lang: 'fr',
    keywords: ['inscription', 'register', 'compte', 'nouveau client']
  },
  dashboard: {
    title: 'Tableau de bord - Mon espace',
    description: 'Gérez vos consultations, rendez-vous et informations personnelles depuis votre tableau de bord.',
    lang: 'fr',
    keywords: ['dashboard', 'tableau de bord', 'espace personnel']
  },
  contact: {
    title: 'Contact - Nous contacter',
    description: 'Contactez notre équipe pour toute question sur nos services de consultation juridique.',
    lang: 'fr',
    keywords: ['contact', 'support', 'aide', 'questions']
  },
  faq: {
    title: 'FAQ - Questions fréquentes',
    description: 'Trouvez les réponses aux questions les plus fréquentes sur nos services juridiques.',
    lang: 'fr',
    keywords: ['FAQ', 'questions', 'aide', 'support']
  },
  testimonials: {
    title: 'Témoignages clients - Retours d\'expérience',
    description: 'Découvrez les témoignages de nos clients expatriés sur nos services de consultation juridique.',
    lang: 'fr',
    keywords: ['témoignages', 'avis clients', 'expériences', 'retours']
  },
  providers: {
    title: 'Nos Avocats - Réseau de professionnels',
    description: 'Découvrez notre réseau d\'avocats spécialisés dans l\'accompagnement des expatriés francophones.',
    lang: 'fr',
    keywords: ['avocats', 'professionnels', 'réseau', 'spécialistes']
  },
  howItWorks: {
    title: 'Comment ça marche - Guide d\'utilisation',
    description: 'Découvrez comment utiliser notre plateforme de consultation juridique en 3 étapes simples.',
    lang: 'fr',
    keywords: ['guide', 'utilisation', 'étapes', 'fonctionnement']
  }
};

// Générateur de routes avec gestion multilingue
export const createMultilingualRoute = (
  basePath: string,
  frPath: string,
  component: RouteConfig['component'],
  baseMeta: { title: string; description: string; keywords?: string[] },
  options?: Partial<RouteConfig>
): RouteConfig[] => [
  {
    path: basePath,
    component,
    meta: { ...baseMeta, lang: 'en' },
    ...options,
  },
  {
    path: frPath,
    component,
    meta: { ...baseMeta, lang: 'fr' },
    alias: basePath,
    ...options,
  }
];

// Utilitaire pour créer des routes protégées
export const createProtectedRoute = (
  path: string,
  component: RouteConfig['component'],
  role?: string,
  meta?: { title: string; description: string; lang: string; keywords?: string[] }
): RouteConfig => ({
  path,
  component,
  protected: true,
  role,
  meta,
});

// Utilitaire pour créer des routes admin
export const createAdminRoute = (
  path: string,
  component: RouteConfig['component'],
  meta?: { title: string; description: string; lang: string; keywords?: string[] }
): RouteConfig => createProtectedRoute(path, component, 'admin', meta);

// Validation des routes (utile en développement)
export const validateRoutes = (routes: RouteConfig[]): string[] => {
  const errors: string[] = [];
  const paths = new Set<string>();
  
  routes.forEach((route, index) => {
    // Vérifier les doublons
    if (paths.has(route.path)) {
      errors.push(`Route dupliquée détectée: ${route.path} (index ${index})`);
    }
    paths.add(route.path);
    
    // Vérifier les alias
    if (route.alias && paths.has(route.alias)) {
      errors.push(`Alias dupliqué détecté: ${route.alias} pour ${route.path} (index ${index})`);
    }
    if (route.alias) {
      paths.add(route.alias);
    }
    
    // Vérifier les routes protégées
    if (route.protected && !route.role && route.path.includes('/admin/')) {
      errors.push(`Route admin sans rôle spécifié: ${route.path} (index ${index})`);
    }
  });
  
  return errors;
};

// Types pour le système de routage
export interface RouteMetadata {
  title: string;
  description: string;
  lang: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
}

// Fonction helper pour générer les métadonnées complètes
export const generateFullMetadata = (
  base: RouteMetadata,
  siteName: string = 'Consultation Juridique Expatriés'
): RouteMetadata => ({
  ...base,
  title: `${base.title} | ${siteName}`,
  canonical: typeof window !== 'undefined' ? window.location.href : undefined,
});

// Export des utilitaires pour les tests
export const routeUtils = {
  createRouteWithMeta,
  createMultilingualRoute,
  createProtectedRoute,
  createAdminRoute,
  validateRoutes,
  generateFullMetadata,
};