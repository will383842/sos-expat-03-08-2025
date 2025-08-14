import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Eye, Lock, Users, Check, Globe, Clock, Languages } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

interface PrivacySection {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: keyof TranslationUnit;
  contentKey: keyof TranslationUnit;
}

type TranslationUnit = {
  title: string;
  subtitle: string;
  lastUpdated: string;
  dataCollection: string;
  dataProtection: string;
  dataSharing: string;
  yourRights: string;
  contact: string;
  dataCollectionContent: string;
  dataProtectionContent: string;
  dataSharingContent: string;
  rights: string[];
  contactContent: string;
  features: string[];
  contactCta: string;
  editHint: string;
};

type Translations = {
  fr: TranslationUnit;
  en: TranslationUnit;
};

const PrivacyPolicy: React.FC = () => {
  const { language } = useApp();

  // --- State (business logic preserved) ---
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Local toggle without changing global app language
  const [selectedLanguage, setSelectedLanguage] = useState<'fr' | 'en'>(
    (language as 'fr' | 'en') || 'fr'
  );
  useEffect(() => {
    if (language) setSelectedLanguage(language as 'fr' | 'en');
  }, [language]);

  // --- Static texts / i18n ---
  const texts: Translations = useMemo(
    () => ({
      fr: {
        title: 'Politique de confidentialité',
        subtitle: 'Votre vie privée est notre priorité',
        lastUpdated: 'Version 2.2 – Dernière mise à jour : 16 juin 2025',
        dataCollection: 'Collecte des données',
        dataProtection: 'Protection des données',
        dataSharing: 'Partage des données',
        yourRights: 'Vos droits',
        contact: 'Contact',
        dataCollectionContent:
          "Nous collectons uniquement les informations nécessaires pour fournir nos services d'assistance. Cela inclut vos informations de contact, des métadonnées techniques (appels, messagerie) et les détails indispensables à votre demande.",
        dataProtectionContent:
          "Vos données sont chiffrées en transit et au repos lorsque c'est possible et stockées de manière sécurisée. Des mesures techniques et organisationnelles sont mises en œuvre pour prévenir tout accès non autorisé.",
        dataSharingContent:
          "Nous ne vendons jamais vos données personnelles. Nous partageons uniquement les informations nécessaires avec des prestataires vérifiés (paiements, téléphonie, hébergement) pour fournir le service demandé.",
        rights: [
          "Droit d'accès à vos données",
          'Droit de rectification',
          "Droit à l'effacement (dans les limites légales)",
          'Droit à la portabilité',
          'Droit d’opposition et de limitation',
        ],
        contactContent:
          'Pour toute question ou pour exercer vos droits, utilisez le formulaire dédié ci-dessous.',
        features: ['Chiffrement', 'Transparence', 'Contrôle utilisateur', 'Pas de revente de données'],
        contactCta: 'Formulaire de contact',
        editHint: 'Document éditable depuis la console admin (FR/EN)',
      },
      en: {
        title: 'Privacy Policy',
        subtitle: 'Your privacy is our priority',
        lastUpdated: 'Version 2.2 – Last updated: 16 June 2025',
        dataCollection: 'Data Collection',
        dataProtection: 'Data Protection',
        dataSharing: 'Data Sharing',
        yourRights: 'Your Rights',
        contact: 'Contact',
        dataCollectionContent:
          'We collect only the information needed to deliver our assistance services. This includes your contact details, technical metadata (calls, messaging) and details strictly required for your request.',
        dataProtectionContent:
          'Your data is encrypted in transit and at rest where possible and stored securely. We apply technical and organizational measures to prevent unauthorized access.',
        dataSharingContent:
          "We never sell your personal data. We only share information necessary with vetted providers (payments, telephony, hosting) to deliver the requested service.",
        rights: [
          'Right of access',
          'Right to rectification',
          'Right to erasure (within legal limits)',
          'Right to data portability',
          'Right to object and restrict',
        ],
        contactContent:
          'For questions or to exercise your rights, please use the form below.',
        features: ['Encryption', 'Transparency', 'User control', 'No data resale'],
        contactCta: 'Contact form',
        editHint: 'Document editable from the admin console (EN/FR)',
      },
    }),
    []
  );

  const t = texts[selectedLanguage];

  const privacySections: PrivacySection[] = useMemo(
    () => [
      { icon: Eye, titleKey: 'dataCollection', contentKey: 'dataCollectionContent' },
      { icon: Lock, titleKey: 'dataProtection', contentKey: 'dataProtectionContent' },
      { icon: Users, titleKey: 'dataSharing', contentKey: 'dataSharingContent' },
    ],
    []
  );

  // --- Firestore fetch (unchanged business logic) ---
  useEffect(() => {
    const fetchPrivacyPolicy = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const q = query(
          collection(db, 'legal_documents'),
          where('type', '==', 'privacy'),
          where('language', '==', selectedLanguage),
          where('isActive', '==', true),
          orderBy('updatedAt', 'desc'),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const docData = doc.data() as { content?: string };
          setContent(docData.content || '');
        } else {
          setContent('');
        }
      } catch (err) {
        console.error('Error fetching privacy policy:', err);
        setError(selectedLanguage === 'fr' ? 'Échec du chargement' : 'Failed to load');
        setContent('');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrivacyPolicy();
  }, [selectedLanguage]);

  const handleLanguageChange = (newLang: 'fr' | 'en') => {
    setSelectedLanguage(newLang);
  };

  // ----- Markdown → UI (design only) -----
  const parseMarkdownContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let key = 0;

    for (const raw of lines) {
      const line = raw ?? '';
      if (!line.trim()) continue;

      if (line.trim() === '---') {
        elements.push(<hr key={key++} className="my-8 border-t-2 border-gray-200" />);
        continue;
      }

      if (line.startsWith('# ')) {
        elements.push(
          <h1
            key={key++}
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-blue-500 pb-4"
          >
            {line.substring(2).replace(/\*\*/g, '')}
          </h1>
        );
        continue;
      }

      if (line.startsWith('## ')) {
        const title = line.substring(3).trim();
        const match = title.match(/^(\d+)\.\s*(.*)$/);
        if (match) {
          elements.push(
            <h2
              id={`section-${match[1]}`}
              key={key++}
              className="scroll-mt-28 text-xl sm:text-2xl font-bold text-gray-900 mt-10 mb-6 flex items-center gap-3"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-lg">
                {match[1]}
              </span>
              <span>{match[2].replace(/\*\*/g, '')}</span>
            </h2>
          );
        } else {
          elements.push(
            <h2 key={key++} className="text-xl sm:text-2xl font-bold text-gray-900 mt-10 mb-6">
              {title.replace(/\*\*/g, '')}
            </h2>
          );
        }
        continue;
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={key++} className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-blue-500 pl-4">
            {line.substring(4).replace(/\*\*/g, '')}
          </h3>
        );
        continue;
      }

      // Numbered points (2.1, 3.2, etc.)
      const numbered = line.match(/^(\d+\.\d+\.?)\s+(.*)$/);
      if (numbered) {
        const num = numbered[1];
        const inner = numbered[2].replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="font-semibold text-gray-900">$1</strong>'
        );
        elements.push(
          <div
            key={key++}
            className="bg-gray-50 border-l-4 border-blue-500 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-blue-600 mr-2">{num}</span>
              <span dangerouslySetInnerHTML={{ __html: inner }} />
            </p>
          </div>
        );
        continue;
      }

      // SPECIAL: contact line -> nice card WITHOUT raw URL & without extra heading
      if (
        line.toLowerCase().includes('http://localhost:5174/contact') ||
        line.toLowerCase().includes('/contact')
      ) {
        elements.push(
          <div
            key={key++}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 sm:p-8 my-8 shadow-lg"
            role="group"
            aria-label="Contact"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
                <Globe className="w-5 h-5" />
              </span>
              <span className="font-semibold text-gray-900">{t.contact}</span>
            </div>
            <p className="text-gray-800 leading-relaxed mb-5">
              {t.contactContent}
            </p>
            <a
              href="http://localhost:5174/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 hover:shadow-lg"
            >
              <Globe className="w-5 h-5" />
              {t.contactCta}
            </a>
          </div>
        );
        continue;
      }

      if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(
          <div
            key={key++}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 my-6"
          >
            <p className="font-bold text-gray-900 text-lg">{line.slice(2, -2)}</p>
          </div>
        );
        continue;
      }

      const formatted = line
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');

      elements.push(
        <p key={key++} className="mb-4 text-gray-800 leading-relaxed text-base" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    }

    return elements;
  };

  // --- Default bilingual content (shown if no Firestore content) ---
  const defaultFr = `
# Politique de confidentialité

**${t.lastUpdated}**

---

## 1. ${t.dataCollection}
Nous collectons les **données strictement nécessaires** à la fourniture de nos services (coordonnées, métadonnées techniques, détails de la demande).

## 2. ${t.dataProtection}
Chiffrement **en transit** et **au repos** lorsque possible. Mesures techniques et organisationnelles renforcées.

## 3. ${t.dataSharing}
Aucun **commerce des données**. Partage limité à des prestataires **vérifiés** pour l'exécution du service.

## 4. ${t.yourRights}
- ${t.rights[0]}
- ${t.rights[1]}
- ${t.rights[2]}
- ${t.rights[3]}
- ${t.rights[4]}

---

## 5. ${t.contact}
http://localhost:5174/contact
`;

  const defaultEn = `
# ${t.title}

**${t.lastUpdated}**

---

## 1. ${t.dataCollection}
We only collect **strictly necessary** data to deliver our services (contact details, technical metadata, request details).

## 2. ${t.dataProtection}
Encryption **in transit** and **at rest** where possible. Strong technical and organizational safeguards.

## 3. ${t.dataSharing}
No **data resale**. Limited sharing with **vetted** processors to provide the service.

## 4. ${t.yourRights}
- ${t.rights[0]}
- ${t.rights[1]}
- ${t.rights[2]}
- ${t.rights[3]}
- ${t.rights[4]}

---

## 5. ${t.contact}
http://localhost:5174/contact
`;

  const defaultContent = selectedLanguage === 'fr' ? defaultFr : defaultEn;

  return (
    <Layout>
      <main className="min-h-screen bg-gray-950">
        {/* HERO */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-indigo-500/10" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6">
            {/* Top bar: last updated + language toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full pl-5 pr-4 py-2.5 border border-white/20 text-white">
                <Clock className="w-4 h-4 text-indigo-300" />
                <span className="text-sm font-semibold">{t.lastUpdated}</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-1">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('fr')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedLanguage === 'fr' ? 'bg-white text-gray-900' : 'text-white hover:bg-white/10'
                  }`}
                  aria-pressed={selectedLanguage === 'fr'}
                >
                  <Languages className="w-4 h-4" />
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedLanguage === 'en' ? 'bg-white text-gray-900' : 'text-white hover:bg-white/10'
                  }`}
                  aria-pressed={selectedLanguage === 'en'}
                >
                  <Languages className="w-4 h-4" />
                  EN
                </button>
              </div>
            </div>

            <header className="text-center">
              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <Shield className="w-12 h-12 text-white" />
                </div>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black mb-4 leading-tight">
                <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                  {t.title}
                </span>
              </h1>
              <p className="text-lg sm:text-2xl text-gray-300 max-w-3xl mx-auto">{t.subtitle}</p>

              {/* Feature chips */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-white/90">
                {[
                  { icon: <Lock className="w-6 h-6" />, text: t.features[0], gradient: 'from-emerald-500 to-green-500' },
                  { icon: <Check className="w-6 h-6" />, text: t.features[1], gradient: 'from-blue-500 to-indigo-500' },
                  { icon: <Users className="w-6 h-6" />, text: t.features[2], gradient: 'from-yellow-500 to-orange-500' },
                  { icon: <Globe className="w-6 h-6" />, text: t.features[3], gradient: 'from-purple-500 to-pink-500' },
                ].map((f, i) => (
                  <div
                    key={i}
                    className="group flex items-center gap-3 p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.01]"
                  >
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r ${f.gradient} text-white`}>{f.icon}</span>
                    <span className="font-semibold">{f.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-center">
                <a
                  href="http://localhost:5174/contact"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold border-2 border-blue-400/50 hover:scale-105 transition-all"
                >
                  <Globe className="w-5 h-5" />
                  <span>{t.contactCta}</span>
                </a>
              </div>
            </header>
          </div>
        </section>

        {/* CONTENT */}
        <section className="py-12 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <article className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm">
              {isLoading ? (
                <div className="space-y-4" aria-live="polite" aria-busy="true">
                  <div className="h-8 w-2/3 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-6 w-1/2 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-5 w-full bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-5 w-11/12 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-5 w-10/12 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-5 w-9/12 bg-gray-200 rounded-xl animate-pulse" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600 mb-4">{error}</p>
                  <p className="text-gray-600">{selectedLanguage === 'fr' ? 'Affichage du contenu par défaut' : 'Showing default content'}</p>
                </div>
              ) : (
                <div className="prose max-w-none">
                  {content ? (
                    <div>{parseMarkdownContent(content)}</div>
                  ) : (
                    <div>{parseMarkdownContent(defaultContent)}</div>
                  )}
                </div>
              )}

              {/* Hint admin */}
              <p className="mt-6 text-sm text-gray-500 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                {t.editHint}
              </p>
            </article>

            {/* Quick sections (static summary) */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {privacySections.map((section, idx) => {
                const Icon = section.icon;
                return (
                  <div key={idx} className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">
                      {t[section.titleKey] as string}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {t[section.contentKey] as string}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default PrivacyPolicy;
