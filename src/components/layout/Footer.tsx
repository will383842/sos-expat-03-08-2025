import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Phone, MapPin, Facebook, Twitter, Linkedin, ArrowUp, LucideIcon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

type LegalLink = {
  label: string;
  href: string;
  order?: number;
};
type ContactInfo = {
  icon: LucideIcon;
  text: string;
  href?: string;
  ariaLabel: string;
};
type FooterSection = {
  title: string;
  links: LegalLink[];
};

const IS_DEV = import.meta.env.MODE !== 'production';
const SOCIAL = {
  fb: (import.meta.env.VITE_FACEBOOK_URL as string | undefined) || '',
  tw: (import.meta.env.VITE_TWITTER_URL as string | undefined) || '',
  li: (import.meta.env.VITE_LINKEDIN_URL as string | undefined) || ''
};

// Petite utilitaire: normalise fr/en à partir du navigateur
const detectBrowserLang = (): 'fr' | 'en' => {
  if (typeof navigator === 'undefined') return 'fr';
  const raw = (navigator.language || (navigator as any).userLanguage || 'fr').toLowerCase();
  if (raw.startsWith('fr')) return 'fr';
  return 'en';
};

const Footer: React.FC = () => {
  const { language: ctxLang } = useApp();
  const resolvedLang: 'fr' | 'en' = (ctxLang === 'fr' || ctxLang === 'en') ? ctxLang : detectBrowserLang();

  const [legalLinks, setLegalLinks] = useState<LegalLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTop, setShowTop] = useState(false);

  // ---------- i18n minimal & future-proof ----------
  const t = useCallback((key: string): string => {
    const translations: Record<'fr' | 'en', Record<string, string>> = {
      fr: {
        'footer.services.title': 'Services',
        'footer.services.sosCall': 'S.O.S Appel',
        'footer.services.expatCall': 'Appel expatrié',
        'footer.services.pricing': 'Tarifs',
        'footer.services.experts': 'Nos experts',
        'footer.services.testimonials': 'Témoignages',
        'footer.support.title': 'Support',
        'footer.support.contact': 'Contact',
        'footer.support.helpCenter': 'Centre d\'aide',
        'footer.support.serviceStatus': 'Statut du service',
        'footer.contact.title': 'Contact',
        'footer.contact.emailAria': 'Envoyer un email',
        'footer.contact.presence': 'Présence internationale dans plus de 120 pays',
        'footer.contact.locationAria': 'Notre présence internationale',
        'footer.contact.callUs': 'Contactez-nous',
        'footer.contact.phoneAria': 'Nous contacter',
        'footer.social.facebookAria': 'Suivez-nous sur Facebook',
        'footer.social.twitterAria': 'Suivez-nous sur Twitter',
        'footer.social.linkedinAria': 'Suivez-nous sur LinkedIn',
        'footer.social.ariaLabel': 'Réseaux sociaux',
        'footer.company.description': 'Plateforme d\'appel d\'urgence connectant les expatriés francophones avec des avocats et conseillers vérifiés partout dans le monde.',
        'footer.services.navAria': 'Navigation des services',
        'footer.support.navAria': 'Navigation du support',
        'footer.ariaLabel': 'Pied de page du site',
        'footer.legal.privacy': 'Politique de confidentialité',
        'footer.legal.termsClients': 'CGU Clients',
        'footer.legal.termsLawyers': 'CGU Avocats',
        'footer.legal.termsExpats': 'CGU Expatriés',
        'footer.legal.consumers': 'Consommateurs',
        'footer.legal.seo': 'Référencement',
        'footer.legal.navAria': 'Liens légaux',
        'footer.copyright': 'Tous droits réservés.',
        'common.loading': 'Chargement...'
      },
      en: {
        'footer.services.title': 'Services',
        'footer.services.sosCall': 'S.O.S Call',
        'footer.services.expatCall': 'Expat Call',
        'footer.services.pricing': 'Pricing',
        'footer.services.experts': 'Our Experts',
        'footer.services.testimonials': 'Testimonials',
        'footer.support.title': 'Support',
        'footer.support.contact': 'Contact',
        'footer.support.helpCenter': 'Help Center',
        'footer.support.serviceStatus': 'Service Status',
        'footer.contact.title': 'Contact',
        'footer.contact.emailAria': 'Send an email',
        'footer.contact.presence': 'International presence in over 120 countries',
        'footer.contact.locationAria': 'Our international presence',
        'footer.contact.callUs': 'Contact us',
        'footer.contact.phoneAria': 'Contact us',
        'footer.social.facebookAria': 'Follow us on Facebook',
        'footer.social.twitterAria': 'Follow us on Twitter',
        'footer.social.linkedinAria': 'Follow us on LinkedIn',
        'footer.social.ariaLabel': 'Social media',
        'footer.company.description': 'Emergency call platform connecting French-speaking expats with verified lawyers and advisors worldwide.',
        'footer.services.navAria': 'Services navigation',
        'footer.support.navAria': 'Support navigation',
        'footer.ariaLabel': 'Site footer',
        'footer.legal.privacy': 'Privacy Policy',
        'footer.legal.termsClients': 'Terms of Service',
        'footer.legal.termsLawyers': 'Lawyer Terms',
        'footer.legal.termsExpats': 'Expat Terms',
        'footer.legal.consumers': 'Consumers',
        'footer.legal.seo': 'SEO',
        'footer.legal.navAria': 'Legal links',
        'footer.copyright': 'All rights reserved.',
        'common.loading': 'Loading...'
      }
    };
    return translations[resolvedLang][key] || translations.fr[key] || key;
  }, [resolvedLang]);

  // ---------- Liens légaux par défaut (fallback) ----------
  const defaultLegalLinks = useMemo<LegalLink[]>(() => ([
    { label: t('footer.legal.privacy'), href: '/politique-confidentialite', order: 10 },
    { label: t('footer.legal.termsClients'), href: '/cgu-clients', order: 20 },
    { label: t('footer.legal.termsLawyers'), href: '/cgu-avocats', order: 30 },
    { label: t('footer.legal.termsExpats'), href: '/cgu-expatries', order: 40 },
    { label: 'Cookies', href: '/cookies', order: 50 },
    { label: t('footer.legal.consumers'), href: '/consommateurs', order: 60 }
  ]), [t]);

  // ---------- Sections ----------
  const footerSections = useMemo<Record<string, FooterSection>>(() => ({
    services: {
      title: t('footer.services.title'),
      links: [
        { label: t('footer.services.sosCall'), href: '/sos-appel' },
        { label: t('footer.services.expatCall'), href: '/appel-expatrie' },
        { label: t('footer.services.pricing'), href: '/tarifs' },
        { label: t('footer.services.experts'), href: '/nos-experts' },
        { label: t('footer.services.testimonials'), href: '/temoignages' }
      ]
    },
    support: {
      title: t('footer.support.title'),
      links: [
        { label: 'FAQ', href: '/faq' },
        { label: t('footer.support.contact'), href: '/contact' },
        { label: t('footer.support.helpCenter'), href: '/centre-aide' },
        { label: t('footer.support.serviceStatus'), href: '/statut-service' }
      ]
    }
  }), [t]);

  const contactInfo = useMemo<ContactInfo[]>(() => ([
    {
      icon: MapPin,
      text: t('footer.contact.presence'),
      ariaLabel: t('footer.contact.locationAria')
    },
    {
      icon: Phone,
      text: t('footer.contact.callUs'),
      href: '/contact',
      ariaLabel: t('footer.contact.phoneAria')
    }
  ]), [t]);

  const socialLinks = useMemo(() => ([
    {
      icon: Facebook,
      href: SOCIAL.fb || '#',
      ariaLabel: t('footer.social.facebookAria'),
      name: 'Facebook'
    },
    {
      icon: Twitter,
      href: SOCIAL.tw || '#',
      ariaLabel: t('footer.social.twitterAria'),
      name: 'Twitter'
    },
    {
      icon: Linkedin,
      href: SOCIAL.li || '#',
      ariaLabel: t('footer.social.linkedinAria'),
      name: 'LinkedIn'
    }
  ]), [t]);

  // ---------- Chargement des liens légaux depuis Firestore (avec cache + fallback) ----------
  useEffect(() => {
    let isMounted = true;

    const CACHE_KEY = `legal_links_${resolvedLang}`;
    const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

    const readCache = (): LegalLink[] | null => {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL_MS) return null;
        return data as LegalLink[];
      } catch {
        return null;
      }
    };

    const writeCache = (data: LegalLink[]) => {
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
      } catch { /* ignore */ }
    };

    const loadLegalDocuments = async () => {
      // cache d'abord
      const cached = readCache();
      if (cached && cached.length) {
        setLegalLinks(cached);
        setIsLoading(false);
      }

      try {
        if (!db) {
          if (IS_DEV) console.log('[Footer] Firebase indisponible, fallback par défaut');
          if (isMounted && !cached) {
            setLegalLinks(defaultLegalLinks);
            setIsLoading(false);
          }
          return;
        }

        setIsLoading(!cached);

        // Supporte language OU locale dans ta collection
        const col = collection(db, 'legal_documents');
        const qLang = query(col, where('language', '==', resolvedLang), where('isActive', '==', true));
        const qLocale = query(col, where('locale', '==', resolvedLang), where('isActive', '==', true));

        // On tente d'abord language, sinon locale
        let snapshot = await getDocs(qLang);
        if (snapshot.empty) snapshot = await getDocs(qLocale);

        if (!isMounted) return;

        if (snapshot.empty) {
          if (IS_DEV) console.log('[Footer] Aucun doc légal en base, fallback');
          if (!cached) setLegalLinks(defaultLegalLinks);
          writeCache(defaultLegalLinks);
        } else {
          const items: LegalLink[] = snapshot.docs
            .map((d) => {
              const data = d.data() as Record<string, unknown>;
              const title = String((data.title || data.type || 'Document') ?? 'Document');
              const order = typeof data.order === 'number' ? (data.order as number) : 999;

              // priorité au slug/path si fourni (meilleure SEO et stabilité URL)
              const slug = typeof data.slug === 'string' ? data.slug : undefined;
              const path = typeof data.path === 'string' ? data.path : undefined;
              const type = typeof data.type === 'string' ? data.type : '';

              const href =
                path ? path :
                slug ? `/${slug}` :
                type === 'terms' ? '/cgu-clients' :
                type === 'privacy' ? '/politique-confidentialite' :
                type === 'cookies' ? '/cookies' :
                type === 'legal' ? '/consommateurs' :
                type === 'faq' ? '/faq' :
                type === 'help' ? '/centre-aide' :
                type === 'seo' ? '/referencement' :
                `/${type || 'legal'}`;

              return { label: title, href, order };
            })
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

          setLegalLinks(items);
          writeCache(items);
        }
      } catch (err) {
        console.error('[Footer] Erreur Firestore legal_documents:', err);
        if (!isMounted && cached) return;
        if (!cached) setLegalLinks(defaultLegalLinks);
        writeCache(defaultLegalLinks);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadLegalDocuments();
    return () => { isMounted = false; };
  }, [resolvedLang, defaultLegalLinks]);

  // ---------- UX: bouton scroll to top (mobile, safe-area) ----------
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setShowTop(window.scrollY > 160);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    if ('scrollTo' in window) {
      const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }, []);

  // ---------- SEO/IA: JSON-LD Organization (aide référencement & IA) ----------
  const jsonLd = useMemo(() => {
    const sameAs: string[] = [SOCIAL.fb, SOCIAL.tw, SOCIAL.li].filter(Boolean);
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'SOS Urgently',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://sos-urgently.example',
      logo: typeof window !== 'undefined' ? `${window.location.origin}/logo.svg` : undefined,
      description: t('footer.company.description'),
      sameAs,
      contactPoint: [{
        '@type': 'ContactPoint',
        contactType: 'customer support',
        areaServed: ['FR', 'EN'],
        availableLanguage: ['French', 'English'],
      }]
    };
  }, [t]);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <footer
      className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white overflow-hidden"
      role="contentinfo"
      aria-label={t('footer.ariaLabel')}
    >
      {/* JSON-LD for SEO / AI */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-red-500/5 to-red-500/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent" />

      {/* Scroll to top button */}
      {showTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 z-50 p-3 bg-gradient-to-r from-red-500 to-red-600 
                    text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 
                    focus:scale-110 transition-all duration-300 focus:outline-none 
                    focus:ring-2 focus:ring-red-500/50
                    touch-manipulation active:scale-95"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
          aria-label="Remonter en haut de la page"
        >
          <ArrowUp size={20} aria-hidden />
        </button>
      )}

      <div className="relative backdrop-blur-xl bg-white/5 border-b border-white/10 py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* GRID : mobile-first */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
            {/* Col 1: Brand + Social */}
            <div className="sm:col-span-2 lg:col-span-1 space-y-4 sm:space-y-6">
              <div className="group">
                <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
                    <div className="relative bg-gradient-to-r from-red-500 to-red-600 p-2.5 rounded-xl">
                      <Phone className="text-white" size={18} aria-hidden />
                    </div>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    SOS Urgently
                  </span>
                </div>

                <p className="text-gray-300/90 leading-relaxed text-sm sm:text-base mb-6 sm:mb-8">
                  {t('footer.company.description')}
                </p>
              </div>

              <div className="flex items-center space-x-3 sm:space-x-4" role="list" aria-label={t('footer.social.ariaLabel')}>
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href || '#'}
                    className="group relative p-2.5 sm:p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 
                               hover:bg-white/10 hover:border-white/20 hover:scale-105 
                               focus:bg-white/10 focus:border-white/20 focus:scale-105 
                               transition-all duration-300 focus:outline-none focus:ring-2 
                               focus:ring-red-500/50
                               touch-manipulation active:scale-95"
                    aria-label={social.ariaLabel}
                    target={social.href.startsWith('http') ? '_blank' : undefined}
                    rel={social.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    <social.icon
                      size={16}
                      className="text-gray-300 group-hover:text-white transition-colors duration-300"
                      aria-hidden
                    />
                  </a>
                ))}
              </div>
            </div>

            {/* Col 2: Services */}
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-base sm:text-lg font-semibold text-white relative">
                <span className="relative z-10">{footerSections.services.title}</span>
                <div className="absolute -bottom-1 left-0 w-6 sm:w-8 h-0.5 bg-gradient-to-r from-red-500 to-red-600" />
              </h3>
              <nav aria-label={t('footer.services.navAria')}>
                <ul className="space-y-2 sm:space-y-3">
                  {footerSections.services.links.map((link, index) => (
                    <li key={index}>
                      <Link
                        to={link.href}
                        className="group flex items-center text-gray-300/90 hover:text-white 
                                   focus:text-white transition-all duration-300 text-sm sm:text-base 
                                   focus:outline-none py-1.5 px-2 -mx-2 rounded-lg 
                                   hover:bg-white/5 focus:bg-white/5 touch-manipulation"
                      >
                        <span className="w-1.5 h-1.5 bg-gray-600 rounded-full mr-3 
                                       group-hover:bg-red-400 group-focus:bg-red-400 
                                       transition-colors duration-300" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            {/* Col 3: Support */}
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-base sm:text-lg font-semibold text-white relative">
                <span className="relative z-10">{footerSections.support.title}</span>
                <div className="absolute -bottom-1 left-0 w-6 sm:w-8 h-0.5 bg-gradient-to-r from-red-500 to-red-600" />
              </h3>
              <nav aria-label={t('footer.support.navAria')}>
                <ul className="space-y-2 sm:space-y-3">
                  {footerSections.support.links.map((link, index) => (
                    <li key={index}>
                      <Link
                        to={link.href}
                        className="group flex items-center text-gray-300/90 hover:text-white 
                                   focus:text-white transition-all duration-300 text-sm sm:text-base 
                                   focus:outline-none py-1.5 px-2 -mx-2 rounded-lg 
                                   hover:bg-white/5 focus:bg-white/5 touch-manipulation"
                      >
                        <span className="w-1.5 h-1.5 bg-gray-600 rounded-full mr-3 
                                       group-hover:bg-red-400 group-focus:bg-red-400 
                                       transition-colors duration-300" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            {/* Col 4: Contact */}
            <div className="sm:col-span-2 lg:col-span-1 space-y-4 sm:space-y-6">
              <h3 className="text-base sm:text-lg font-semibold text-white relative">
                <span className="relative z-10">{t('footer.contact.title')}</span>
                <div className="absolute -bottom-1 left-0 w-6 sm:w-8 h-0.5 bg-gradient-to-r from-red-500 to-red-600" />
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                {contactInfo.map((item, index) => (
                  <li key={index} className="group">
                    <div className="flex items-start space-x-3 p-2 sm:p-2.5 rounded-lg transition-all duration-300 
                                    hover:bg-white/5 focus-within:bg-white/5">
                      <div className="flex-shrink-0 p-1.5 rounded-lg bg-white/5 border border-white/10 
                                      group-hover:bg-white/10 group-hover:border-white/20 
                                      transition-all duration-300">
                        <item.icon size={14} className="text-red-400" aria-hidden />
                      </div>
                      {item.href ? (
                        <Link
                          to={item.href}
                          className="text-gray-300/90 hover:text-white focus:text-white 
                                     transition-colors duration-300 text-sm sm:text-base 
                                     focus:outline-none leading-relaxed touch-manipulation"
                          aria-label={item.ariaLabel}
                        >
                          {item.text}
                        </Link>
                      ) : (
                        <span className="text-gray-300/90 text-sm sm:text-base leading-relaxed">
                          {item.text}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative backdrop-blur-xl bg-black/20 py-4 sm:py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
            <div className="text-gray-400/90 text-xs sm:text-sm text-center sm:text-left">
              © {currentYear} SOS Urgently. {t('footer.copyright')}
            </div>

            <nav
              className="flex flex-wrap justify-center sm:justify-end gap-1 text-xs sm:text-sm"
              aria-label={t('footer.legal.navAria')}
            >
              {isLoading ? (
                <div className="text-gray-400 animate-pulse flex items-center space-x-2" aria-live="polite">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" />
                  <span>{t('common.loading')}</span>
                </div>
              ) : (
                legalLinks.map((link, index) => (
                  <React.Fragment key={`${link.href}-${index}`}>
                    <Link
                      to={link.href}
                      className="text-gray-400/90 hover:text-white focus:text-white 
                                 transition-colors duration-300 focus:outline-none 
                                 px-2 sm:px-3 py-2 rounded-lg hover:bg-white/5 focus:bg-white/5
                                 touch-manipulation"
                    >
                      {link.label}
                    </Link>
                    {index < legalLinks.length - 1 && (
                      <span className="text-gray-600 select-none" aria-hidden>•</span>
                    )}
                  </React.Fragment>
                ))
              )}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


