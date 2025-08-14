import React, { useEffect, useMemo, useState } from 'react';
import { Cookie as CookieIcon, Settings, Eye, Shield, Check, Globe, Clock, Languages } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

const Cookies: React.FC = () => {
  const { language } = useApp();

  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = useState<'fr' | 'en'>(
    (language as 'fr' | 'en') || 'fr'
  );

  // Rester aligné avec la langue globale si elle change
  useEffect(() => {
    if (language) setSelectedLanguage(language as 'fr' | 'en');
  }, [language]);

  // Récupération Firestore (même logique métier)
  useEffect(() => {
    const fetchCookiesPolicy = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, 'legal_documents'),
          where('type', '==', 'cookies'),
          where('language', '==', selectedLanguage),
          where('isActive', '==', true),
          orderBy('updatedAt', 'desc'),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setContent((doc.data() as { content: string }).content);
        } else {
          setContent('');
        }
      } catch (error) {
        console.error('Error fetching cookies policy:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCookiesPolicy();
  }, [selectedLanguage]);

  // Traductions d'UI
  const translations = {
    fr: {
      title: 'Politique des Cookies',
      subtitle: 'Comment nous utilisons les cookies sur notre site',
      lastUpdated: 'Version 2.2 – Dernière mise à jour : 16 juin 2025',
      loading: 'Chargement...',
      features: [
        'Bannière de consentement',
        'Contrôle granulaire',
        'Respect RGPD',
        'Transparence totale',
      ],
      anchorTitle: 'Sommaire',
      contactCta: 'Nous contacter',
      editHint: 'Document éditable depuis la console admin',
    },
    en: {
      title: 'Cookie Policy',
      subtitle: 'How we use cookies on our site',
      lastUpdated: 'Version 2.2 – Last updated: 16 June 2025',
      loading: 'Loading...',
      features: [
        'Consent banner',
        'Granular control',
        'GDPR compliant',
        'Full transparency',
      ],
      anchorTitle: 'Overview',
      contactCta: 'Contact us',
      editHint: 'Document editable from the admin console',
    },
  };

  const t = translations[selectedLanguage];

  const handleLanguageChange = (newLang: 'fr' | 'en') => {
    setSelectedLanguage(newLang);
  };

  // -------- Parser Markdown (même logique que les autres pages) --------
  const parseMarkdownContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === '') continue;

      if (line.trim() === '---') {
        elements.push(<hr key={currentIndex++} className="my-8 border-t-2 border-gray-200" />);
        continue;
      }

      if (line.startsWith('# ')) {
        const title = line.substring(2).replace(/\*\*/g, '');
        elements.push(
          <h1
            key={currentIndex++}
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-orange-500 pb-4"
          >
            {title}
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
              key={currentIndex++}
              className="scroll-mt-28 text-xl sm:text-2xl font-bold text-gray-900 mt-10 mb-6 flex items-center gap-3"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white text-sm font-bold shadow-lg">
                {match[1]}
              </span>
              <span>{match[2].replace(/\*\*/g, '')}</span>
            </h2>
          );
        } else {
          elements.push(
            <h2 key={currentIndex++} className="text-xl sm:text-2xl font-bold text-gray-900 mt-10 mb-6">
              {title.replace(/\*\*/g, '')}
            </h2>
          );
        }
        continue;
      }

      if (line.startsWith('### ')) {
        const subtitle = line.substring(4).replace(/\*\*/g, '');
        elements.push(
          <h3 key={currentIndex++} className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-orange-500 pl-4">
            {subtitle}
          </h3>
        );
        continue;
      }

      const numberedMatch = line.match(/^(\d+\.\d+\.?)\s+(.*)$/);
      if (numberedMatch) {
        const number = numberedMatch[1];
        const inner = numberedMatch[2];
        const formatted = inner.replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="font-semibold text-gray-900">$1</strong>'
        );
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gray-50 border-l-4 border-orange-500 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors duration-200"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-orange-600 mr-2">{number}</span>
              <span dangerouslySetInnerHTML={{ __html: formatted }} />
            </p>
          </div>
        );
        continue;
      }

      // Bloc contact spécial (redirige vers http://localhost:5174/contact)
      if (
        line.toLowerCase().includes('contact') &&
        line.toLowerCase().includes('http://localhost:5174/contact')
      ) {
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-8 my-8 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold shadow-lg">
                !
              </span>
              {selectedLanguage === 'fr' ? 'Contact' : 'Contact'}
            </h3>
            <p className="text-gray-800 leading-relaxed mb-6 text-lg">{line}</p>
            <a
              href="http://localhost:5174/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <Globe className="w-5 h-5" />
              {selectedLanguage === 'fr' ? 'Formulaire de contact' : 'Contact form'}
            </a>
          </div>
        );
        continue;
      }

      if (line.startsWith('**') && line.endsWith('**')) {
        const boldText = line.slice(2, -2);
        elements.push(
          <div key={currentIndex++} className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200 rounded-2xl p-6 my-6">
            <p className="font-bold text-gray-900 text-lg">{boldText}</p>
          </div>
        );
        continue;
      }

      const formattedLine = line
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');
      elements.push(
        <p
          key={currentIndex++}
          className="mb-4 text-gray-800 leading-relaxed text-base"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    }

    return elements;
  };

  // ---------- Contenu par défaut (bilingue) ----------
  const defaultFr = `
# Politique des Cookies

**Version 2.2 – Dernière mise à jour : 16 juin 2025**

---

## 1. Qu’est-ce qu’un cookie ?

Un **cookie** est un petit fichier texte déposé sur votre terminal (ordinateur, mobile, tablette) lorsque vous visitez un site. Il permet au site de **reconnaître votre appareil**, de **mémoriser** vos préférences et d’**améliorer** votre expérience.

---

## 2. Pourquoi utilisons-nous des cookies ?

2.1. **Fonctionnement essentiel** : assurer l’authentification, la sécurité, la sélection de la langue et le maintien de votre session.  
2.2. **Mesure d’audience** : comprendre l’usage du site pour l’améliorer (pages visitées, temps passé, événements).  
2.3. **Performance** : optimiser la vitesse de chargement et la stabilité.  
2.4. **Communication** : permettre la téléphonie/visio et les notifications techniques.

---

## 3. Types de cookies

3.1. **Cookies essentiels** : strictement nécessaires au fonctionnement du site.  
3.2. **Cookies analytiques** : statistiques d’usage agrégées et anonymisées lorsque possible.  
3.3. **Cookies de performance** : amélioration de l’affichage, cache et distribution de contenu.

---

## 4. Base légale et durée

4.1. **Essentiels** : intérêt légitime (fournir le service demandé).  
4.2. **Anlaytiques/Performance** : **votre consentement** via la bannière.  
4.3. **Durées** : session (effacés à la fermeture) ou persistants (quelques heures à 13 mois max selon la finalité).

---

## 5. Gestion de votre consentement

5.1. Vous pouvez **accepter/refuser** les catégories non essentielles via notre **bannière de consentement**.  
5.2. Vous pouvez à tout moment **retirer votre consentement** depuis le lien « Préférences cookies » en bas de page.  
5.3. Paramétrez également votre **navigateur** pour bloquer/supprimer les cookies.

---

## 6. Cookies émis par des tiers

Nous pouvons utiliser des prestataires susceptibles de déposer leurs propres cookies : **Stripe** (paiement), **Twilio** (téléphonie), **Firebase** (auth/BDD/hébergement) et, selon activation, un outil d’**analyse d’audience**. Ces tiers sont susceptibles d’opérer **hors UE** ; des **garanties appropriées** sont mises en place lorsque requis.

---

## 7. Transferts internationaux

Lorsque des transferts de données s’opèrent hors de votre pays, nous nous assurons qu’ils reposent sur des **mécanismes de protection** reconnus (clauses contractuelles types, décision d’adéquation, etc.) lorsque la loi l’exige.

---

## 8. Vos droits

Conformément au droit applicable (ex. RGPD), vous disposez de droits d’**accès**, **rectification**, **effacement**, **opposition**, **limitation** et **portabilité** dans les conditions prévues par la loi. Vous pouvez exercer vos droits via notre **formulaire de contact** : http://localhost:5174/contact

---

## 9. Mise à jour de cette politique

Nous pouvons modifier cette politique pour refléter les évolutions réglementaires ou techniques. La version à jour est publiée sur cette page avec la **date de mise à jour**.

---

## 10. Contact

Pour toute question relative aux cookies ou à la protection des données, contactez-nous : **http://localhost:5174/contact**
`;

  const defaultEn = `
# Cookie Policy

**Version 2.2 – Last updated: 16 June 2025**

---

## 1. What is a cookie?

A **cookie** is a small text file stored on your device when visiting a website. It helps the site **recognise your device**, **remember** your preferences and **improve** your experience.

---

## 2. Why do we use cookies?

2.1. **Essential operation**: authentication, security, language preference, session continuity.  
2.2. **Analytics**: understanding how the site is used to improve it.  
2.3. **Performance**: optimising speed and stability.  
2.4. **Communication**: enabling telephony/video and technical notifications.

---

## 3. Types of cookies

3.1. **Essential cookies**: strictly necessary for the service you request.  
3.2. **Analytics cookies**: aggregated statistics, anonymised where possible.  
3.3. **Performance cookies**: caching/CDN and rendering improvements.

---

## 4. Legal basis and duration

4.1. **Essential**: legitimate interests (to deliver the service).  
4.2. **Analytics/Performance**: **your consent** via the banner.  
4.3. **Durations**: session or persistent (from a few hours up to 13 months, depending on purpose).

---

## 5. Managing your consent

5.1. You can **accept/decline** non-essential categories via our **consent banner**.  
5.2. You can **withdraw consent** at any time from the **cookie preferences** link in the footer.  
5.3. You may also use your **browser settings** to block/delete cookies.

---

## 6. Third-party cookies

We may rely on providers that can set their own cookies: **Stripe** (payments), **Twilio** (telephony), **Firebase** (auth/DB/hosting) and, if enabled, an **analytics** tool. These providers may operate **outside your country**; **appropriate safeguards** are applied where required.

---

## 7. International transfers

Where data transfers occur outside your country, we rely on **recognised safeguards** (e.g. standard contractual clauses or adequacy decisions) when required by law.

---

## 8. Your rights

Depending on applicable law (e.g., GDPR), you may have rights to **access**, **rectify**, **erase**, **object**, **restrict** and **port** data. You can exercise these via our **contact form**: http://localhost:5174/contact

---

## 9. Updates to this policy

We may update this policy to reflect regulatory or technical changes. The updated version is published on this page with the **last updated** date.

---

## 10. Contact

For any questions regarding cookies or data protection, please contact us: **http://localhost:5174/contact**
`;

  const defaultContent = selectedLanguage === 'fr' ? defaultFr : defaultEn;

  // Sommaire UI
  const anchorMap = useMemo(
    () => [
      { num: 1, label: selectedLanguage === 'fr' ? 'Qu’est-ce qu’un cookie ?' : 'What is a cookie?' },
      { num: 2, label: selectedLanguage === 'fr' ? "Pourquoi nous les utilisons" : 'Why we use them' },
      { num: 3, label: selectedLanguage === 'fr' ? 'Types de cookies' : 'Types of cookies' },
      { num: 4, label: selectedLanguage === 'fr' ? 'Base légale & durée' : 'Legal basis & duration' },
      { num: 5, label: selectedLanguage === 'fr' ? 'Gestion du consentement' : 'Managing consent' },
      { num: 6, label: selectedLanguage === 'fr' ? 'Cookies tiers' : 'Third-party cookies' },
      { num: 7, label: selectedLanguage === 'fr' ? 'Transferts internationaux' : 'International transfers' },
      { num: 8, label: selectedLanguage === 'fr' ? 'Vos droits' : 'Your rights' },
      { num: 9, label: selectedLanguage === 'fr' ? 'Mises à jour' : 'Updates' },
      { num: 10, label: selectedLanguage === 'fr' ? 'Contact' : 'Contact' },
    ],
    [selectedLanguage]
  );

  const body = content || defaultContent;

  return (
    <Layout>
      <main className="min-h-screen bg-gray-950">
        {/* HERO */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-amber-500/10" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6">
            {/* Badge + langues */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full pl-5 pr-4 py-2.5 border border-white/20 text-white">
                <Clock className="w-4 h-4 text-yellow-300" />
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
                  <CookieIcon className="w-12 h-12 text-white" />
                </div>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black mb-4 leading-tight">
                <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                  {t.title}
                </span>
              </h1>
              <p className="text-lg sm:text-2xl text-gray-300 max-w-3xl mx-auto">{t.subtitle}</p>

              {/* Points clés */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-white/90">
                {[
                  { icon: <Shield className="w-6 h-6" />, text: t.features[0], gradient: 'from-green-500 to-emerald-500' },
                  { icon: <Settings className="w-6 h-6" />, text: t.features[1], gradient: 'from-blue-500 to-indigo-500' },
                  { icon: <Eye className="w-6 h-6" />, text: t.features[2], gradient: 'from-yellow-500 to-orange-500' },
                  { icon: <Globe className="w-6 h-6" />, text: t.features[3], gradient: 'from-orange-500 to-red-500' },
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
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white font-bold border-2 border-orange-400/50 hover:scale-105 transition-all"
                >
                  <Globe className="w-5 h-5" />
                  <span>{t.contactCta}</span>
                </a>
              </div>
            </header>
          </div>
        </section>

        {/* Sommaire */}
        <section className="py-8 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                  <CookieIcon className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900">{t.anchorTitle}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {anchorMap.map((s) => (
                  <a
                    key={s.num}
                    href={`#section-${s.num}`}
                    className="group flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-900 text-white text-xs font-bold">
                      {s.num}
                    </span>
                    <span className="text-gray-700 group-hover:text-gray-900">{s.label}</span>
                  </a>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                {t.editHint}
              </p>
            </div>
          </div>
        </section>

        {/* Contenu principal */}
        <section className="py-10 sm:py-14 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-5xl mx-auto px-6">
            {isLoading ? (
              <div className="space-y-4" aria-live="polite" aria-busy="true">
                <div className="h-8 w-2/3 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-6 w-1/2 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-5 w-full bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-5 w-11/12 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-5 w-10/12 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-5 w-9/12 bg-gray-200 rounded-xl animate-pulse" />
              </div>
            ) : (
              <article className="prose max-w-none">
                <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm">
                  {parseMarkdownContent(content || defaultContent)}
                </div>
              </article>
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default Cookies;
