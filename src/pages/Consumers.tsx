import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Shield, AlertTriangle, Phone, Check, Globe, Clock, Languages } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

const Consumers: React.FC = () => {
  const { language } = useApp();

  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = useState<'fr' | 'en'>(
    (language as 'fr' | 'en') || 'fr'
  );

  // Rester synchronisé avec la langue globale de l'app
  useEffect(() => {
    if (language) setSelectedLanguage(language as 'fr' | 'en');
  }, [language]);

  // Logique métier Firestore conservée (type: 'legal')
  useEffect(() => {
    const fetchConsumerInfo = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, 'legal_documents'),
          where('type', '==', 'legal'),
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
        console.error('Error fetching consumer info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConsumerInfo();
  }, [selectedLanguage]);

  const translations = {
    fr: {
      title: 'Information Consommateurs',
      subtitle: 'Vos droits et protections – Plateforme internationale',
      lastUpdated: 'Version 2.2 – Dernière mise à jour : 16 juin 2025',
      loading: 'Chargement...',
      features: ['Remboursement auto', 'Prix EUR & USD', 'Droits consommateurs', 'Support 24/7'],
      anchorTitle: 'Sommaire',
      contactCta: 'Nous contacter',
      editHint: 'Document éditable depuis la console admin',
      sections: {
        rights: 'Vos droits de consommateur',
        refunds: 'Politique de remboursement',
        prices: 'Transparence des prix (EUR / USD)',
        mediation: 'Médiation et réclamations',
        support: 'Service client',
        contact: 'Contact',
      },
    },
    en: {
      title: 'Consumer Information',
      subtitle: 'Your rights and protections — International platform',
      lastUpdated: 'Version 2.2 – Last updated: 16 June 2025',
      loading: 'Loading...',
      features: ['Auto refund', 'Prices in EUR & USD', 'Consumer rights', '24/7 support'],
      anchorTitle: 'Overview',
      contactCta: 'Contact us',
      editHint: 'Document editable from the admin console',
      sections: {
        rights: 'Your consumer rights',
        refunds: 'Refund policy',
        prices: 'Price transparency (EUR / USD)',
        mediation: 'Mediation and complaints',
        support: 'Customer service',
        contact: 'Contact',
      },
    },
  };

  const t = translations[selectedLanguage];

  const handleLanguageChange = (newLang: 'fr' | 'en') => {
    setSelectedLanguage(newLang);
  };

  // Parser Markdown (UI only, ne modifie pas le contenu)
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
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-purple-500 pb-4"
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
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-bold shadow-lg">
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
          <h3 key={currentIndex++} className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-purple-500 pl-4">
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
            className="bg-gray-50 border-l-4 border-purple-500 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors duration-200"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-purple-600 mr-2">{number}</span>
              <span dangerouslySetInnerHTML={{ __html: formatted }} />
            </p>
          </div>
        );
        continue;
      }

      // Bloc contact spécial (détection d'URL)
      if (line.toLowerCase().includes('http://localhost:5174/contact')) {
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border-2 border-purple-200 rounded-2xl p-8 my-8 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold shadow-lg">
                !
              </span>
              {selectedLanguage === 'fr' ? 'Contact' : 'Contact'}
            </h3>
            <p className="text-gray-800 leading-relaxed mb-6 text-lg">{line}</p>
            <a
              href="http://localhost:5174/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
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
          <div key={currentIndex++} className="bg-gradient-to-r from-fuchsia-50 to-purple-50 border border-purple-200 rounded-2xl p-6 my-6">
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

  // --------- Contenu par défaut (FR/EN) ----------
  const defaultFr = `
# Information Consommateurs (Global)

**Version 2.2 – Dernière mise à jour : 16 juin 2025**

---

## 1. Vos droits de consommateur

1.1. **Information claire** sur les services, tarifs et conditions.  
1.2. **Droit de rétractation** selon la loi impérative locale lorsque applicable (voir conditions de mise en œuvre auprès du prestataire et de la Plateforme).  
1.3. **Protection** contre les pratiques commerciales déloyales et trompeuses.  
1.4. **Accès** à un service client réactif via le **formulaire de contact**.

---

## 2. Politique de remboursement

2.1. **Remboursement automatique** : si votre expert ne répond pas après **3 tentatives** d’appel dans la fenêtre prévue, la réservation est **annulée** et vous êtes **remboursé intégralement**.  
2.2. **Autres cas** : contactez le support **dans les 24h** suivant l’appel via le **formulaire de contact** pour étude de votre demande.

---

## 3. Transparence des prix (EUR / USD)

3.1. **Appel Avocat** : **49 € (EUR)** / **$49 (USD)** pour **20 minutes** (prix TTC).  
3.2. **Appel Expatrié Aidant** : **19 € (EUR)** / **$19 (USD)** pour **30 minutes** (prix TTC).  
3.3. **Aucun frais caché** ; le prix affiché inclut, le cas échéant, les frais techniques de mise en relation.  
3.4. Les montants en **USD** peuvent être affichés et réglés **au choix du Client** ; des **frais/taux de conversion** du prestataire de paiement peuvent s’appliquer le cas échéant.

---

## 4. Médiation et réclamations

4.1. **Support via formulaire** : http://localhost:5174/contact  
4.2. **Médiation consommation** : vous pouvez saisir le médiateur compétent selon votre pays.  
4.3. **Plateforme européenne de RLL** : utilisation possible du règlement en ligne des litiges (ODR).

---

## 5. Service client (international)

5.1. **Horaires** : 24/7  
5.2. **Temps de réponse** : sous 24h  
5.3. **Contact** : utilisez le **formulaire** dédié : http://localhost:5174/contact

---

## 6. Contact

Formulaire (support & demandes légales) : http://localhost:5174/contact
`;

  const defaultEn = `
# Consumer Information (Global)

**Version 2.2 – Last updated: 16 June 2025**

---

## 1. Your consumer rights

1.1. **Clear information** about services, prices and conditions.  
1.2. **Withdrawal right** where mandatory local law applies (see implementation conditions with the provider and the Platform).  
1.3. **Protection** against unfair or misleading commercial practices.  
1.4. **Access** to responsive customer service via the **contact form**.

---

## 2. Refund policy

2.1. **Automatic refund**: if your expert does not answer after **3 call attempts** within the expected window, the booking is **cancelled** and you receive a **full refund**.  
2.2. **Other situations**: contact support **within 24h** after the call via the **contact form** so we can review your request.

---

## 3. Price transparency (EUR / USD)

3.1. **Lawyer call**: **€49 (EUR)** / **$49 (USD)** for **20 minutes** (tax included).  
3.2. **Expat Helper call**: **€19 (EUR)** / **$19 (USD)** for **30 minutes** (tax included).  
3.3. **No hidden fees**; the displayed price includes, where applicable, the technical connection fee.  
3.4. **USD** amounts can be displayed and charged at **checkout**; **FX rates/fees** from the payment processor may apply.

---

## 4. Mediation and complaints

4.1. **Support via contact form**: http://localhost:5174/contact  
4.2. **Consumer mediation**: you may contact the competent mediator in your country.  
4.3. **EU ODR platform**: you may use the online dispute resolution mechanism.

---

## 5. Customer service (international)

5.1. **Hours**: 24/7  
5.2. **Response time**: within 24h  
5.3. **Contact**: please use the **contact form**: http://localhost:5174/contact

---

## 6. Contact

Contact form (support & legal requests): http://localhost:5174/contact
`;

  const defaultContent = selectedLanguage === 'fr' ? defaultFr : defaultEn;

  // Sommaire
  const anchorMap = useMemo(
    () => [
      { num: 1, label: t.sections.rights },
      { num: 2, label: t.sections.refunds },
      { num: 3, label: t.sections.prices },
      { num: 4, label: t.sections.mediation },
      { num: 5, label: t.sections.support },
      { num: 6, label: t.sections.contact },
    ],
    [t.sections]
  );

  const body = content || defaultContent;

  return (
    <Layout>
      <main className="min-h-screen bg-gray-950">
        {/* HERO */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-fuchsia-500/10" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6">
            {/* Badge + langues */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full pl-5 pr-4 py-2.5 border border-white/20 text-white">
                <Clock className="w-4 h-4 text-fuchsia-300" />
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
                  <ShoppingCart className="w-12 h-12 text-white" />
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
                  { icon: <AlertTriangle className="w-6 h-6" />, text: t.features[0], gradient: 'from-emerald-500 to-green-500' },
                  { icon: <Shield className="w-6 h-6" />, text: t.features[1], gradient: 'from-blue-500 to-indigo-500' },
                  { icon: <Check className="w-6 h-6" />, text: t.features[2], gradient: 'from-yellow-500 to-orange-500' },
                  { icon: <Phone className="w-6 h-6" />, text: t.features[3], gradient: 'from-purple-500 to-fuchsia-500' },
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
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white font-bold border-2 border-purple-400/50 hover:scale-105 transition-all"
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
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white">
                  <ShoppingCart className="w-5 h-5" />
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

                {/* Cartes prix (EUR / USD) visibles même si contenu provient d'admin, pour clarifier l'international */}
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedLanguage === 'fr' ? 'Appel Avocat' : 'Lawyer Call'}
                    </h3>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-extrabold text-gray-900">49€</span>
                      <span className="text-gray-500 font-medium">EUR</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-3xl font-extrabold text-gray-900">$49</span>
                      <span className="text-gray-500 font-medium">USD</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {selectedLanguage === 'fr' ? 'pour 20 min' : 'for 20 min'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {selectedLanguage === 'fr'
                        ? 'Affichage et paiement possibles en EUR ou USD selon votre choix.'
                        : 'Display and payment available in EUR or USD at your choice.'}
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedLanguage === 'fr' ? 'Appel Expatrié Aidant' : 'Expat Helper Call'}
                    </h3>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-extrabold text-gray-900">19€</span>
                      <span className="text-gray-500 font-medium">EUR</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-3xl font-extrabold text-gray-900">$19</span>
                      <span className="text-gray-500 font-medium">USD</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {selectedLanguage === 'fr' ? 'pour 30 min' : 'for 30 min'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {selectedLanguage === 'fr'
                        ? 'Montants affichés à titre indicatif ; le taux/frais de conversion du prestataire de paiement peuvent s’appliquer.'
                        : 'Amounts are indicative; payment processor FX rates/fees may apply.'}
                    </p>
                  </div>
                </div>

                {/* Bloc service client sans email, bouton vers contact */}
                <div id="section-5" className="mt-12 rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm">
                  <h2 className="text-2xl font-black text-gray-900 mb-4">
                    {t.sections.support}
                  </h2>
                  <p className="text-gray-700">
                    {selectedLanguage === 'fr'
                      ? 'Horaires : 24/7 • Temps de réponse : sous 24h. Pour toute demande, utilisez notre formulaire.'
                      : 'Hours: 24/7 • Response time: within 24h. For any request, please use our contact form.'}
                  </p>
                  <a
                    href="http://localhost:5174/contact"
                    className="mt-6 inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white font-bold border-2 border-purple-400/50 hover:scale-105 transition-all"
                  >
                    <Globe className="w-5 h-5" />
                    {t.contactCta}
                  </a>
                </div>
              </article>
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default Consumers;
