import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  Shield,
  Globe,
  Clock,
  ArrowRight,
  Heart,
  UserCheck,
  DollarSign,
  Languages,
  Sparkles,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Important :
 * - Logique mÃ©tier conservÃ©e (Firestore, parsing, sÃ©lection langue via useApp).
 * - Design refondu pour matcher Home (gradients, cards, badges, CTA), mobile-first.
 * - 100% Ã©ditable depuis l'admin (collection `legal_documents`).
 * - Aucun `any`.
 */

const TermsExpats: React.FC = () => {
  const { language } = useApp();

  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = useState<'fr' | 'en'>(
    (language as 'fr' | 'en') || 'fr'
  );

  useEffect(() => {
    if (language) {
      setSelectedLanguage(language as 'fr' | 'en');
    }
  }, [language]);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, 'legal_documents'),
          where('type', '==', 'terms_expats'),
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
        console.error('Error fetching terms:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTerms();
  }, [selectedLanguage]);

  const translations = {
    fr: {
      title: 'CGU ExpatriÃ©s Aidants',
      subtitle: "Conditions gÃ©nÃ©rales d'utilisation pour les expatriÃ©s aidants",
      lastUpdated: 'Version 2.2 â€“ DerniÃ¨re mise Ã  jour : 16 juin 2025',
      loading: 'Chargement...',
      joinNetwork: 'Rejoindre le rÃ©seau',
      trustedByHelpers: 'DÃ©jÃ  1K+ expatriÃ©s aidants nous font confiance',
      keyFeatures: 'Points clÃ©s',
      features: [
        'Paiement garanti sous 7 jours',
        'Support technique 24/7',
        'Interface mobile optimisÃ©e',
        'Utilisateurs vÃ©rifiÃ©s',
      ],
      languageToggle: 'Changer de langue',
      sections: {
        definitions: 'DÃ©finitions',
        scope: 'Objet, champ et acceptation',
        status: "Statut de l'ExpatriÃ© Aidant â€“ ConformitÃ© et responsabilitÃ©s",
        account: 'Compte, vÃ©rifications et sÃ©curitÃ©',
        rules: 'RÃ¨gles dâ€™usage â€“ QualitÃ©, interdits, non-contournement',
        relationship: 'Relation Aidantâ€“Utilisateur (hors Plateforme)',
        fees: 'Frais, paiement unique et taxes',
        data: 'DonnÃ©es personnelles (cadre global)',
        ip: 'PropriÃ©tÃ© intellectuelle',
        liability: 'Garanties, responsabilitÃ© et indemnisation',
        law: 'Droit applicable â€“ Arbitrage â€“ Juridiction estonienne',
        misc: 'Divers',
        contact: 'Contact',
      },
      readyToJoin: 'PrÃªt Ã  rejoindre SOS Expat ?',
      readySubtitle: 'Aidez des expatriÃ©s et dÃ©veloppez votre activitÃ© de conseil.',
      startNow: 'Commencer maintenant',
      contactUs: 'Nous contacter',
      anchorTitle: 'Sommaire',
      editHint: 'Document Ã©ditable depuis la console admin',
      ctaHero: 'Voir les experts',
      heroBadge: 'Nouveau â€” Conditions mises Ã  jour',
      contactForm: 'Formulaire de contact',
    },
    en: {
      title: 'Expat Helper Terms',
      subtitle: 'Terms of Use for expatriate helpers',
      lastUpdated: 'Version 2.2 â€“ Last updated: 16 June 2025',
      loading: 'Loading...',
      joinNetwork: 'Join the network',
      trustedByHelpers: 'Already 1K+ expat helpers trust us',
      keyFeatures: 'Key features',
      features: [
        'Guaranteed payment within 7 days',
        '24/7 technical support',
        'Mobile-optimized interface',
        'Verified users',
      ],
      languageToggle: 'Switch language',
      sections: {
        definitions: 'Definitions',
        scope: 'Purpose, Scope and Acceptance',
        status: 'Helper Status â€“ Compliance and Responsibilities',
        account: 'Account, Checks and Security',
        rules: 'Use Rules â€“ Quality, Prohibited Conduct, No Circumvention',
        relationship: 'Helperâ€“User Relationship (Off-Platform)',
        fees: 'Fees, Single Payment and Taxes',
        data: 'Data Protection (Global Framework)',
        ip: 'Intellectual Property',
        liability: 'Warranties, Liability and Indemnity',
        law: 'Governing Law â€“ ICC Arbitration â€“ Estonian Courts',
        misc: 'Miscellaneous',
        contact: 'Contact',
      },
      readyToJoin: 'Ready to join SOS Expat?',
      readySubtitle: 'Help expats and develop your consulting activity.',
      startNow: 'Start now',
      contactUs: 'Contact us',
      anchorTitle: 'Overview',
      editHint: 'Document editable from the admin console',
      ctaHero: 'See experts',
      heroBadge: 'New â€” Terms updated',
      contactForm: 'Contact Form',
    },
  };

  const t = translations[selectedLanguage];

  const handleLanguageChange = (newLang: 'fr' | 'en') => {
    setSelectedLanguage(newLang);
  };

  // Parser Markdown (logique dâ€™origine conservÃ©e)
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

      // H1
      if (line.startsWith('# ')) {
        const title = line.substring(2).replace(/\*\*/g, '');
        elements.push(
          <h1
            key={currentIndex++}
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-green-500 pb-4"
          >
            {title}
          </h1>
        );
        continue;
      }

      // H2 (+ id pour ancre)
      if (line.startsWith('## ')) {
        const title = line.substring(3).trim();
        const match = title.match(/^(\d+)\.\s*(.*)$/);
        if (match) {
          const sectionNumber = match[1];
          const sectionTitle = match[2].replace(/\*\*/g, '');
          elements.push(
            <h2
              id={`section-${sectionNumber}`}
              key={currentIndex++}
              className="scroll-mt-28 text-xl sm:text-2xl font-bold text-gray-900 mt-10 mb-6 flex items-center gap-3"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-bold shadow-lg">
                {sectionNumber}
              </span>
              <span>{sectionTitle}</span>
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

      // H3
      if (line.startsWith('### ')) {
        const title = line.substring(4).replace(/\*\*/g, '');
        elements.push(
          <h3 key={currentIndex++} className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-green-500 pl-4">
            {title}
          </h3>
        );
        continue;
      }

      // 2.1 / 3.2 â€¦
      const numberedMatch = line.match(/^(\d+\.\d+\.?)\s+(.*)$/);
      if (numberedMatch) {
        const number = numberedMatch[1];
        const numberContent = numberedMatch[2];
        const formattedContent = numberContent.replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="font-semibold text-gray-900">$1</strong>'
        );

        elements.push(
          <div
            key={currentIndex++}
            className="bg-gray-50 border-l-4 border-green-500 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors duration-200"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-green-600 mr-2">{number}</span>
              <span dangerouslySetInnerHTML={{ __html: formattedContent }} />
            </p>
          </div>
        );
        continue;
      }

      // Ligne entiÃ¨rement en gras
      if (line.startsWith('**') && line.endsWith('**')) {
        const boldText = line.slice(2, -2);
        elements.push(
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 my-6" key={currentIndex++}>
            <p className="font-bold text-gray-900 text-lg">{boldText}</p>
          </div>
        );
        continue;
      }

      // Bloc Contact
      if (line.includes('Pour toute question') || line.includes('For any questions')) {
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-8 my-8 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold shadow-lg">
                13
              </span>
              Contact
            </h3>
            <p className="text-gray-800 leading-relaxed mb-6 text-lg">{line}</p>
            <a
              href="http://localhost:5174/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              {selectedLanguage === 'fr' ? 'Formulaire de contact' : 'Contact Form'}
            </a>
          </div>
        );
        continue;
      }

      // Paragraphe
      if (line.trim()) {
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
    }

    return elements;
  };

  // Contenu par dÃ©faut FR (une seule paire de ** pour Ã©viter le parsing foireux)
  const defaultFr = `
# Conditions GÃ©nÃ©rales d'Utilisation â€“ ExpatriÃ©s Aidants (Global)

**SOS Expat d'Ulixai OÃœ** (la Â« **Plateforme** Â», Â« **SOS** Â», Â« **nous** Â»)

**Version 2.2 â€“ DerniÃ¨re mise Ã  jour : 16 juin 2025**

---

## 1. DÃ©finitions

**ExpatriÃ© Aidant** (Â« **Aidant** Â») : toute personne inscrite sur la Plateforme pour proposer, Ã  titre indÃ©pendant, des services d'assistance non juridiques et non mÃ©dicaux Ã  des Utilisateurs (orientation, dÃ©marches pratiques, accompagnement, traduction informelle, mise en relation locale, etc.).

**Utilisateur** : toute personne utilisant la Plateforme pour contacter un Aidant.

**Mise en relation** : l'introduction technique/opÃ©rationnelle rÃ©alisÃ©e par la Plateforme entre un Utilisateur et un Aidant (transmission de coordonnÃ©es et/ou ouverture d'un canal de communication et/ou acceptation par l'Aidant d'une demande Ã©mise via la Plateforme).

**Pays d'Intervention** : la juridiction principalement visÃ©e par la demande de l'Utilisateur au moment de la Mise en relation ; Ã  dÃ©faut, le pays de rÃ©sidence de l'Utilisateur Ã  la date de la demande.

**Frais de Mise en relation** : frais fixes dus Ã  SOS par Mise en relation (art. 7) : **19 â‚¬** si paiement en **EUR** ou **25 $ USD** si paiement en **USD**, susceptibles d'Ã©volution et/ou de **barÃ¨mes locaux** par pays/devise, avec effet prospectif.

**Prestataire(s) de paiement** : services tiers traitant les encaissements et la rÃ©partition des fonds.

---

## 2. Objet, champ et acceptation

2.1. Les prÃ©sentes CGU rÃ©gissent l'accÃ¨s et l'utilisation de la Plateforme par les Aidants.

2.2. **Ulixai agit exclusivement comme intermÃ©diaire technique de Mise en relation.** Ulixai n'est pas employeur, mandataire ou partenaire des Aidants, ne fournit aucun conseil juridique, mÃ©dical, fiscal, comptable ou rÃ©glementÃ©, et n'est pas partie aux contrats entre Aidants et Utilisateurs.

2.3. **Acceptation Ã©lectronique (click-wrap).** L'inscription et/ou l'usage de la Plateforme valent acceptation des CGU, signature Ã©lectronique et consentement contractuel. SOS peut conserver des preuves techniques (horodatage, identifiants).

2.4. **Modifications.** SOS peut mettre Ã  jour les CGU et/ou les barÃ¨mes de frais (par pays/devise) avec **effet prospectif** par publication sur la Plateforme. L'usage continu vaut acceptation.

2.5. **CapacitÃ© professionnelle (B2B).** L'Aidant dÃ©clare agir **exclusivement Ã  des fins professionnelles** ; les rÃ©gimes de protection des consommateurs ne s'appliquent pas Ã  la relation Ulixaiâ€“Aidant.

---

## 3. Statut de l'Aidant â€“ ConformitÃ©, autorisations et responsabilitÃ©s

3.1. **IndÃ©pendance.** L'Aidant agit en **professionnel indÃ©pendant** ; aucun lien d'emploi, mandat, agence, partenariat ou coentreprise n'est crÃ©Ã© avec Ulixai.

3.2. **Autorisation de travail & statut d'immigration.** L'Aidant est **seul responsable** d'obtenir et de maintenir **toutes autorisations** requises dans chaque Pays d'Intervention (visa, permis de travail, enregistrement d'activitÃ©/auto-entreprise, assurances, licences locales, etc.). Ulixai **ne vÃ©rifie pas** ces autorisations et **n'assume aucune responsabilitÃ©** Ã  ce titre.

3.3. **Services non rÃ©glementÃ©s.** L'Aidant s'engage Ã  **ne pas fournir de services rÃ©glementÃ©s** (ex. conseil juridique, mÃ©dical, financier, d'expert-comptable, d'agent immobilier, etc.) **sans** dÃ©tenir les **autorisations/licences** nÃ©cessaires **et** sans se conformer pleinement aux lois locales. Ã€ dÃ©faut, il s'abstient de tels services et redirige l'Utilisateur vers un professionnel dÃ»ment habilitÃ© (ex. avocat inscrit).

3.4. **ConformitÃ© gÃ©nÃ©rale.** L'Aidant respecte les lois/rÃ¨glements applicables (consommation, e-commerce, publicitÃ©/dÃ©marchage, concurrence loyale, LCB-FT/KYC le cas Ã©chÃ©ant, fiscalitÃ©, protection des donnÃ©es, sanctions/export, sÃ©curitÃ© des personnes).

3.5. **Assurances.** L'Aidant dÃ©clare disposer des assurances nÃ©cessaires (responsabilitÃ© civile pro, le cas Ã©chÃ©ant) couvrant ses activitÃ©s et territoires d'intervention.

3.6. **ConfidentialitÃ©.** L'Aidant protÃ¨ge les informations des Utilisateurs et s'abstient de les divulguer, sauf obligation lÃ©gale ou consentement.

---

## 4. Compte, vÃ©rifications et sÃ©curitÃ©

4.1. **Inscription.** Un (1) compte par Aidant ; informations exactes, complÃ¨tes et Ã  jour (identitÃ©, moyens de contact, description des services, zones d'intervention, etc.).

4.2. **VÃ©rifications.** Ulixai peut procÃ©der Ã  des contrÃ´les raisonnables (identitÃ©, cohÃ©rence du profil, screenings sanctions/KYC via Prestataires) et refuser/suspendre/retirer l'accÃ¨s pour motif de sÃ©curitÃ©, conformitÃ© ou qualitÃ© de service.

4.3. **SÃ©curitÃ© des accÃ¨s.** L'Aidant protÃ¨ge ses identifiants. Toute activitÃ© via le compte est rÃ©putÃ©e effectuÃ©e par lui.

---

## 5. RÃ¨gles d'usage â€“ QualitÃ©, interdits, non-contournement

5.1. **QualitÃ© & description fidÃ¨le.** L'Aidant dÃ©crit ses services de faÃ§on exacte, sans promesse de rÃ©sultat. Il ne prÃ©sente **aucune fausse qualitÃ©** (ex. profession rÃ©glementÃ©e non dÃ©tenue).

5.2. **Interdits.** Contenus illicites, discriminatoires ou trompeurs ; pratiques dÃ©loyales ; collecte ou usage abusif de donnÃ©es ; contournement/ingÃ©nierie inverse de la Plateforme ; collusion/boycott visant Ã  nuire ; violations sanctions/export ; toute activitÃ© illÃ©gale.

5.3. **Non-contournement.** Chaque **nouvelle Mise en relation** avec un **nouvel Utilisateur** via la Plateforme donne lieu aux **Frais de Mise en relation** (art. 7). Il est **interdit** d'Ã©viter ces frais en contournant la Plateforme pour une nouvelle introduction.

5.4. **DisponibilitÃ©.** La Plateforme est fournie **Â« en l'Ã©tat Â»** ; aucune disponibilitÃ© ininterrompue n'est garantie (maintenance, incidents, force majeure). L'accÃ¨s peut Ãªtre restreint si la loi l'exige.

---

## 6. Relation Aidantâ€“Utilisateur (hors Plateforme)

6.1. AprÃ¨s la Mise en relation, l'Aidant et l'Utilisateur peuvent contractualiser **hors Plateforme**. Les **honoraires** et modalitÃ©s sont fixÃ©s librement par eux, dans le respect des lois locales.

6.2. L'Aidant remet des **conditions/confirmations de service** conformes au droit local, gÃ¨re sa **facturation** et ses **obligations fiscales**.

6.3. Ulixai **n'est pas responsable** de la qualitÃ©, de l'exactitude ou du rÃ©sultat des services de l'Aidant, ni des engagements pris entre l'Aidant et l'Utilisateur.

---

## 7. Frais, paiement unique et taxes

7.1. **Frais de Mise en relation (forfait).** **19 â‚¬ (EUR)** **ou** **25 $ (USD)** **par Mise en relation**, hors taxes et hors frais du Prestataire de paiement. Ulixai peut modifier ces montants et/ou publier des **barÃ¨mes locaux** par pays/devise, avec effet prospectif.

7.2. **Paiement unique & rÃ©partition.** L'Utilisateur effectue **un paiement unique** via la Plateforme couvrant (i) la **rÃ©munÃ©ration de l'Aidant** (telle que convenue) et (ii) les **Frais de Mise en relation** d'Ulixai. Ulixai (ou son Prestataire) encaisse, **dÃ©duit** ses frais, puis **reverse** le solde Ã  l'Aidant. L'Aidant **autorise** ces dÃ©ductions et rÃ©partitions.

7.3. **ExigibilitÃ© & non-remboursement.** Les Frais de Mise en relation sont **dus dÃ¨s** la Mise en relation et sont **non remboursables** (sauf geste commercial discrÃ©tionnaire d'Ulixai en cas d'Ã©chec exclusivement imputable Ã  la Plateforme et **dans la mesure permise par la loi**).

7.4. **Remboursements Utilisateur.** Si un remboursement est accordÃ© Ã  l'Utilisateur, il est **imputÃ© sur la part de l'Aidant** : Ulixai peut **retenir/compenser** le montant correspondant sur les versements futurs de l'Aidant ou en demander le remboursement si aucun versement n'est Ã  venir. **Aucun remboursement** des Frais de Mise en relation n'est dÃ», sauf dÃ©cision discrÃ©tionnaire d'Ulixai.

7.5. **Devises & conversion.** Plusieurs devises peuvent Ãªtre proposÃ©es ; des taux/frais de conversion du Prestataire peuvent s'appliquer.

7.6. **Taxes.** L'Aidant demeure responsable de **toutes taxes** applicables (TVA, impÃ´t sur le revenu, sÃ©curitÃ© sociale, etc.). Ulixai collecte/reverse, lorsque requis, la TVA/Ã©quivalent local sur les Frais de Mise en relation.

7.7. **Compensation.** Ulixai peut compenser toute somme due par l'Aidant avec toute somme payable Ã  l'Aidant.

---

## 8. DonnÃ©es personnelles (cadre global)

8.1. **RÃ´les.** Pour les donnÃ©es d'Utilisateurs reÃ§ues aux fins de Mise en relation, **Ulixai et l'Aidant** agissent **chacun** en **responsable de traitement** pour leurs propres finalitÃ©s.

8.2. **Bases & finalitÃ©s.** ExÃ©cution du contrat (Mise en relation), intÃ©rÃªts lÃ©gitimes (sÃ©curitÃ©, prÃ©vention de la fraude, amÃ©lioration), conformitÃ© lÃ©gale (LCB-FT, sanctions), et consentement lorsque requis.

8.3. **Transferts internationaux** avec **garanties appropriÃ©es** lorsque requis.

8.4. **Droits & contact.** Exercice via le **formulaire de contact** de la Plateforme.

8.5. **SÃ©curitÃ©.** Mesures techniques/organisationnelles raisonnables ; notification des violations selon les lois applicables.

8.6. L'Aidant traite les donnÃ©es conformÃ©ment au droit du **Pays d'Intervention**.

---

## 9. PropriÃ©tÃ© intellectuelle

La Plateforme, ses marques, logos, bases de donnÃ©es et contenus sont protÃ©gÃ©s. Aucun droit n'est cÃ©dÃ© Ã  l'Aidant, hormis un droit **personnel, non exclusif, non transfÃ©rable** d'accÃ¨s pendant la durÃ©e des CGU. Les contenus fournis par l'Aidant font l'objet d'une **licence mondiale, non exclusive** au profit d'Ulixai pour l'hÃ©bergement et l'affichage dans la Plateforme.

---

## 10. Garanties, responsabilitÃ© et indemnisation

10.1. **Aucune garantie** quant aux rÃ©sultats/qualitÃ©/volume d'affaires ; la Plateforme est fournie **Â« en l'Ã©tat Â»**.

10.2. **Limitation de responsabilitÃ©** : dans la mesure permise, la responsabilitÃ© totale d'Ulixai envers l'Aidant est limitÃ©e aux **dommages directs** et **ne peut excÃ©der** le total des **Frais de Mise en relation** perÃ§us par Ulixai au titre de la **transaction** Ã  l'origine de la rÃ©clamation.

10.3. **Exclusions** : aucun dommage indirect/consÃ©cutif/spÃ©cial/punitif (perte de profits, d'opportunitÃ©s, de clientÃ¨le, atteinte Ã  la rÃ©putation, coÃ»ts de remplacement, etc.).

10.4. **Indemnisation** : l'Aidant **indemnise et garantit** Ulixai (ainsi que ses affiliÃ©s, dirigeants, employÃ©s, agents) contre toute rÃ©clamation, perte, dommage, pÃ©nalitÃ© et frais (dont honoraires d'avocat) liÃ©s Ã  (i) son manquement aux CGU/lois, (ii) ses contenus, (iii) ses services/omissions, (iv) l'absence d'autorisations de travail/immigration/licences.

10.5. **Aucune reprÃ©sentation.** Rien n'emporte mandat, emploi, partenariat ou coentreprise entre Ulixai et l'Aidant.

10.6. **Survie.** Les art. 5, 7, 8, 9, 10, 11 et 12 survivent Ã  la rÃ©siliation.

---

## 11. Droit applicable â€“ Arbitrage â€“ Juridiction estonienne â€“ Actions collectives

11.1. **Droit matÃ©riel** : pour chaque Mise en relation, la relation **Ulixaiâ€“Aidant** est rÃ©gie par les **lois du Pays d'Intervention**, sous rÃ©serve des rÃ¨gles d'ordre public locales et des normes internationales impÃ©ratives. **Ã€ titre supplÃ©tif et pour l'interprÃ©tation/validitÃ© des prÃ©sentes CGU ainsi que pour toute question non rÃ©gie par le droit du Pays d'Intervention, le droit estonien s'applique.**

11.2. **Arbitrage CCI obligatoire** : tout litige Ulixai/Aidant est rÃ©solu **dÃ©finitivement** selon le RÃ¨glement d'Arbitrage de la **CCI**. **SiÃ¨ge : Tallinn (Estonie)**. **Langue : franÃ§ais.** Le tribunal applique le **droit matÃ©riel** dÃ©fini Ã  l'art. 11.1. ProcÃ©dure **confidentielle**.

11.3. **Renonciation aux actions collectives** : dans la mesure permise, toute action **collective/de groupe/reprÃ©sentative** est exclue ; rÃ©clamations **individuelles uniquement**.

11.4. **CompÃ©tence exclusive des tribunaux d'Estonie** : pour toute demande **non arbitrable**, l'**exÃ©cution** des sentences ou les **mesures urgentes**, les tribunaux estoniens (compÃ©tents Ã  Tallinn) ont compÃ©tence **exclusive**. L'Aidant renonce Ã  toute objection de forum/non-convenance.

---

## 12. Divers

12.1. **Cession.** Ulixai peut cÃ©der les CGU Ã  une entitÃ© de son groupe ou Ã  un successeur ; l'Aidant ne peut cÃ©der sans accord Ã©crit d'Ulixai.

12.2. **IntÃ©gralitÃ©.** Les CGU constituent l'accord complet et remplacent tout accord antÃ©rieur relatif au mÃªme objet.

12.3. **Notifications.** Par publication sur la Plateforme, notification in-app ou via le **formulaire de contact**.

12.4. **InterprÃ©tation.** Les intitulÃ©s sont indicatifs. Aucune rÃ¨gle **contra proferentem**.

12.5. **Langues.** Des traductions peuvent Ãªtre fournies ; **le franÃ§ais prÃ©vaut** pour l'interprÃ©tation.

12.6. **NullitÃ© partielle.** Si une stipulation est nulle/inapplicable, le reste demeure en vigueur ; remplaÃ§able par une stipulation valide d'effet Ã©quivalent lorsque possible.

12.7. **Non-renonciation.** L'absence d'exercice d'un droit n'emporte pas renonciation.

---

## 13. Contact

Pour toute question ou demande lÃ©gale, contactez-nous :
`;

  // Contenu par dÃ©faut EN (une seule paire de **)
  const defaultEn = `
# Terms of Use â€“ Expatriate Helpers (Global)

**SOS Expat by Ulixai OÃœ** (the "**Platform**", "**SOS**", "**we**")

**Version 2.2 â€“ Last updated: 16 June 2025**

---

## 1. Definitions

**Helper** means any person registered on the Platform to offer, independently, non-legal and non-medical assistance services to Users (orientation, practical errands, informal translation, local introductions, etc.).

**User** means any person using the Platform to contact a Helper.

**Connection** means the technical/operational introduction enabling contact (sharing details and/or initiating a call/message/video and/or acceptance by the Helper).

**Country of Intervention** means the jurisdiction primarily targeted by the User's request at the time of Connection.

**Connection Fee** means **EUR 19** (if paid in EUR) or **USD 25** (if paid in USD), subject to change and/or **local schedules** by country/currency with prospective effect.

**Payment Processors** are third-party services handling collections and payouts.

---

## 2. Purpose, Scope and Acceptance

Ulixai acts **solely as a technical intermediary** and is neither an employer, agent nor partner of Helpers; Ulixai provides no legal, medical, tax, accounting or other regulated advice and is not a party to Helperâ€“User contracts.

**Click-wrap acceptance** constitutes electronic signature and consent. SOS may update these Terms and/or fee schedules with **prospective effect** upon posting.

**Professional capacity (B2B)**: the Helper acts exclusively for professional purposes; consumer protection regimes do not apply to the Ulixaiâ€“Helper relationship.

---

## 3. Helper Status â€“ Compliance, Authorizations and Responsibilities

**Independence.** The Helper acts as an independent professional.

**Work authorization & immigration.** The Helper is **solely responsible** for obtaining/maintaining **all permits/visas and business registrations** required in each Country of Intervention. Ulixai **does not verify** such authorizations and **assumes no liability** for them.

**Regulated services.** The Helper shall **not** provide regulated services (e.g., legal, medical, financial, accounting, real-estate brokerage, etc.) **unless duly licensed/authorized** and fully compliant with local law; otherwise the Helper must refrain and redirect the User to an appropriately licensed professional.

**General compliance.** The Helper complies with applicable laws (consumer, e-commerce, advertising/solicitation, fair competition, AML/KYC where relevant, tax, data protection, sanctions/export, personal safety).

**Insurance.** The Helper maintains appropriate insurance.

**Confidentiality.** The Helper safeguards User information.

---

## 4. Account, Checks and Security

One account per Helper; accurate, complete and up-to-date profile. Ulixai may conduct reasonable checks (ID, profile consistency, sanctions/KYC screenings via processors) and may refuse/suspend/withdraw access for security, compliance or quality reasons. Keep credentials secure; activity via the account is deemed that of the Helper.

---

## 5. Use Rules â€“ Quality, Prohibited Conduct, No Circumvention

Accurate description; no false professional status; no promises of outcome.

**Prohibited:** unlawful/discriminatory/deceptive content; unfair practices; abusive data use; reverse-engineering; collusion/boycott; sanctions/export breaches; any unlawful activity.

**No circumvention:** **each new Connection with a new User** via the Platform triggers the **Connection Fee**; avoiding the Platform to evade fees on a new introduction is prohibited.

**Availability:** Platform is provided **"as is."**

---

## 6. Helperâ€“User Relationship (Off-Platform)

After Connection, parties may contract **off-Platform**. The Helper provides local service confirmations/terms, invoices, and handles taxes. Ulixai is **not responsible** for the Helper's services or commitments.

---

## 7. Fees, Single Payment and Taxes

**Flat Connection Fee.** **EUR 19 / USD 25** per Connection, exclusive of taxes and processor charges; Ulixai may change amounts and/or publish **local schedules** by country/currency with prospective effect.

**Single payment & split.** User pays **one amount** via the Platform covering (i) the Helper's remuneration (as agreed) and (ii) Ulixai's Connection Fee. Ulixai (or its processor) collects, **deducts** its Fee, then **remits** the remainder to the Helper, who **authorizes** such deductions.

**Due & non-refundable.** The Connection Fee is **earned upon** Connection and **non-refundable** (subject to Ulixai's discretionary goodwill **to the extent permitted by law** in case of Platform-only failure).

**User refunds.** If granted, refunds are **borne by the Helper's share**: Ulixai may **withhold/offset** against future payouts or request reimbursement if none are due.

**FX** and **taxes**: processor FX rates/fees may apply; Helper is responsible for all applicable taxes; Ulixai collects/remits VAT or local equivalent on the Connection Fee where required.

**Set-off** authorized.

---

## 8. Data Protection (Global Framework)

**Roles.** For User data received for Connection, **Ulixai and the Helper** each act as an **independent controller** for their own purposes.

**Legal bases/purposes:** contract performance, legitimate interests (security/fraud prevention/service improvement), legal compliance (AML/sanctions), and consent where applicable.

**International transfers** may occur with appropriate safeguards where required.

**Rights & contact** via the Platform contact form.

**Security** measures apply; breaches are notified as required. The Helper processes data under the Country of Intervention's law.

---

## 9. Intellectual Property

Platform IP remains with Ulixai. The Helper receives a **personal, non-exclusive, non-transferable** right to access during these Terms. Helper content is licensed to Ulixai on a **worldwide, non-exclusive** basis for hosting and display.

---

## 10. Warranties, Liability and Indemnity

No warranty for outcomes/quality/volume; Platform **"as is."**

**Liability cap:** to the fullest extent permitted, Ulixai's total liability to the Helper is limited to **direct damages** and **shall not exceed** the total **Connection Fees** received by Ulixai for the **transaction** giving rise to the claim.

**No indirect/consequential/special/punitive damages.**

**Indemnity:** the Helper shall **indemnify and hold harmless** Ulixai (and affiliates, officers, employees, agents) against claims/losses/costs (including reasonable attorneys' fees) arising from (i) breach of these Terms/laws, (ii) Helper content, (iii) Helper services/omissions, (iv) lack of work authorization/immigration/licensing.

---

## 11. Governing Law â€“ ICC Arbitration â€“ Estonian Courts â€“ Class Actions

**Substantive law:** for each Connection, the **laws of the Country of Intervention** govern the Ulixaiâ€“Helper relationship, subject to mandatory local rules and peremptory international norms.

**Mandatory ICC arbitration** for any Ulixaiâ€“Helper dispute. **Seat: Tallinn (Estonia). Language: French.** Tribunal applies the **substantive law** defined above. Proceedings are **confidential**.

**Class/collective actions are waived** to the extent permitted by law.

**Exclusive jurisdiction of Estonian courts** (Tallinn) for **non-arbitrable** claims, enforcement of awards and urgent measures; the Helper waives objections to venue/forum non conveniens.

---

## 12. Miscellaneous

**Assignment**: Ulixai may assign these Terms to a group entity or successor; the Helper may not assign without Ulixai's consent.

**Entire Agreement**: these Terms supersede prior understandings.

**Notices**: by posting on the Platform, in-app, or via the contact form.

**Interpretation**: headings are for convenience; no **contra proferentem**.

**Languages**: translations may be provided; **French prevails** for interpretation.

**Severability**: invalid terms replaced by valid ones of equivalent effect.

**No waiver**: failure to enforce is not a waiver.

---

## 13. Contact

For any questions or legal requests, contact us:
`;

  // Fallback de contenu par langue
  const defaultContent: string = selectedLanguage === 'fr' ? defaultFr : defaultEn;

  // Ancrage UI
  const anchorMap = useMemo(
    () => [
      { num: 1, label: t.sections.definitions },
      { num: 2, label: t.sections.scope },
      { num: 3, label: t.sections.status },
      { num: 4, label: t.sections.account },
      { num: 5, label: t.sections.rules },
      { num: 6, label: t.sections.relationship },
      { num: 7, label: t.sections.fees },
      { num: 8, label: t.sections.data },
      { num: 9, label: t.sections.ip },
      { num: 10, label: t.sections.liability },
      { num: 11, label: t.sections.law },
      { num: 12, label: t.sections.misc },
      { num: 13, label: t.sections.contact },
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
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6">
            {/* Badge + langues */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full pl-5 pr-4 py-2.5 border border-white/20 text-white">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-semibold">{t.heroBadge}</span>
                <span className="mx-1 text-white/40">â€¢</span>
                <span className="text-sm text-white/90">{t.lastUpdated}</span>
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
              <h1 className="text-4xl sm:text-6xl font-black mb-4 leading-tight">
                <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                  {t.title}
                </span>
              </h1>
              <p className="text-lg sm:text-2xl text-gray-300 max-w-3xl mx-auto">{t.subtitle}</p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-white/90">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                  <Shield className="w-4 h-4" /> <span>{t.keyFeatures}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                  <Users className="w-4 h-4" /> <span>{t.trustedByHelpers}</span>
                </span>
                {/* Avis retirÃ©s sur demande */}
              </div>

              <div className="mt-8 flex items-center justify-center gap-4">
                <Link
                  to="/sos-appel"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm font-semibold"
                >
                  <FileText className="w-5 h-5" />
                  <span>{t.ctaHero}</span>
                </Link>
                <a
                  href="http://localhost:5174/contact"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white font-bold border-2 border-red-400/50 hover:scale-105 transition-all"
                >
                  <Heart className="w-5 h-5" />
                  <span>{t.contactUs}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </header>
          </div>
        </section>

        {/* Bandeau points clÃ©s */}
        <section className="py-10 bg-gray-950">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: <DollarSign className="w-6 h-6" />, text: t.features[0], gradient: 'from-green-500 to-emerald-500' },
                { icon: <Clock className="w-6 h-6" />, text: t.features[1], gradient: 'from-yellow-500 to-orange-500' },
                { icon: <Globe className="w-6 h-6" />, text: t.features[2], gradient: 'from-blue-500 to-purple-500' },
                { icon: <UserCheck className="w-6 h-6" />, text: t.features[3], gradient: 'from-red-500 to-orange-500' },
              ].map((f, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-3 p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.01]"
                >
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r ${f.gradient} text-white`}>
                    {f.icon}
                  </span>
                  <span className="text-white/90 font-semibold">{f.text}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-400 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {t.editHint}
            </p>
          </div>
        </section>

        {/* Sommaire */}
        <section className="py-8 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white">
                  <Globe className="w-5 h-5" />
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
                  {parseMarkdownContent(body)}
                </div>
              </article>
            )}
          </div>
        </section>

        {/* Bandeau final */}
        <section className="py-20 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
          <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">{t.readyToJoin}</h2>
            <p className="text-lg sm:text-2xl text-white/95 mb-10 leading-relaxed">{t.readySubtitle}</p>

            <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-white/90">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <Shield className="w-4 h-4" /> SÃ©curisÃ©
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <Clock className="w-4 h-4" /> <span>Moins de 5&nbsp;minutes</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <Globe className="w-4 h-4" /> Mondial
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <Link
                to="/register"
                className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-10 py-5 rounded-3xl font-black text-lg transition-all duration-300 hover:scale-110 hover:shadow-2xl flex items-center gap-3"
              >
                <span>{t.startNow}</span>
                {/* FlÃ¨che retirÃ©e sur demande */}
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-black/5" />
              </Link>

              <a
                href="http://localhost:5174/contact"
                className="group relative overflow-hidden border-2 border-white bg-transparent text-white px-10 py-5 rounded-3xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:bg-white/10 flex items-center gap-3"
              >
                <Heart className="w-5 h-5" />
                <span>{t.contactUs}</span>
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/30" />
              </a>
            </div>

            {/* Ligne avis retirÃ©e */}
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default TermsExpats;
