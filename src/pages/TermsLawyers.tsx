import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale,
  FileText,
  Shield,
  Check,
  Globe,
  Clock,
  ArrowRight,
  Briefcase,
  DollarSign,
  Users,
  Languages,
  Sparkles,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * TermsLawyers
 * - Logique mÃ©tier conservÃ©e : Firestore (legal_documents / terms_lawyers), sÃ©lection de langue locale.
 * - Design harmonisÃ© avec Home / TermsExpats (gradients, chips, sommaire, cartes).
 * - 100% Ã©ditable depuis lâ€™admin ; fallback FR/EN intÃ©grÃ©.
 * - Aucune utilisation de `any`.
 */

const TermsLawyers: React.FC = () => {
  const { language } = useApp();

  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = useState<'fr' | 'en'>(
    (language as 'fr' | 'en') || 'fr'
  );

  // Rester alignÃ© avec la langue globale si elle change
  useEffect(() => {
    if (language) setSelectedLanguage(language as 'fr' | 'en');
  }, [language]);

  // Fetch dernier document actif
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, 'legal_documents'),
          where('type', '==', 'terms_lawyers'),
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
      title: 'CGU Avocats',
      subtitle: "Conditions gÃ©nÃ©rales d'utilisation pour les avocats prestataires",
      lastUpdated: 'Version 2.2 â€“ DerniÃ¨re mise Ã  jour : 16 juin 2025',
      loading: 'Chargement...',
      joinNetwork: 'Rejoindre le rÃ©seau',
      trustedByExperts: 'DÃ©jÃ  2K+ avocats nous font confiance',
      keyFeatures: 'Points clÃ©s',
      features: [
        'Paiement garanti sous 7 jours',
        'Support technique 24/7',
        'Interface mobile optimisÃ©e',
        'Clients vÃ©rifiÃ©s',
      ],
      languageToggle: 'Changer de langue',
      sections: {
        definitions: 'DÃ©finitions',
        scope: 'Objet, champ et acceptation',
        status: "Statut de l'Avocat â€“ IndÃ©pendance et conformitÃ©",
        account: 'CrÃ©ation de compte, vÃ©rifications et sÃ©curitÃ©',
        rules: "RÃ¨gles d'usage â€“ Conflits, confidentialitÃ©, non-contournement",
        relationship: 'Relation Avocatâ€“Utilisateur (hors Plateforme)',
        fees: 'Frais, paiement unique et taxes',
        payments: 'Paiements â€“ KYC/LCB-FT â€“ Sanctions',
        data: 'DonnÃ©es personnelles (cadre global)',
        ip: 'PropriÃ©tÃ© intellectuelle',
        liability: 'Garanties, responsabilitÃ© et indemnisation',
        law: 'Droit applicable â€“ Arbitrage â€“ Juridiction estonienne',
        misc: 'Divers',
        contact: 'Contact',
      },
      readyToJoin: 'PrÃªt Ã  rejoindre SOS Expat ?',
      readySubtitle: "DÃ©veloppez votre activitÃ© Ã  l'international et aidez des milliers d'expatriÃ©s.",
      startNow: 'Commencer maintenant',
      contactUs: 'Nous contacter',
      anchorTitle: 'Sommaire',
      editHint: 'Document Ã©ditable depuis la console admin',
      heroBadge: 'Nouveau â€” Conditions mises Ã  jour',
      ctaHero: 'Rejoindre les avocats',
      contactForm: 'Formulaire de contact',
    },
    en: {
      title: 'Lawyer Terms',
      subtitle: 'Terms of Use for lawyer providers',
      lastUpdated: 'Version 2.2 â€“ Last updated: 16 June 2025',
      loading: 'Loading...',
      joinNetwork: 'Join the network',
      trustedByExperts: 'Already 2K+ lawyers trust us',
      keyFeatures: 'Key features',
      features: [
        'Guaranteed payment within 7 days',
        '24/7 technical support',
        'Mobile-optimized interface',
        'Verified clients',
      ],
      languageToggle: 'Switch language',
      sections: {
        definitions: 'Definitions',
        scope: 'Purpose, Scope and Acceptance',
        status: 'Lawyer Status â€“ Independence and Compliance',
        account: 'Account, Checks and Security',
        rules: 'Use Rules â€“ Conflicts, Confidentiality, No Circumvention',
        relationship: 'Lawyerâ€“User Relationship (Off-Platform)',
        fees: 'Fees, Single Payment and Taxes',
        payments: 'Payments â€“ AML/KYC â€“ Sanctions',
        data: 'Data Protection (Global Framework)',
        ip: 'Intellectual Property',
        liability: 'Warranties, Liability and Indemnity',
        law: 'Governing Law â€“ ICC Arbitration â€“ Estonian Courts',
        misc: 'Miscellaneous',
        contact: 'Contact',
      },
      readyToJoin: 'Ready to join SOS Expat?',
      readySubtitle: 'Develop your international practice and help thousands of expats.',
      startNow: 'Start now',
      contactUs: 'Contact us',
      anchorTitle: 'Overview',
      editHint: 'Document editable from the admin console',
      heroBadge: 'New â€” Terms updated',
      ctaHero: 'Join as a lawyer',
      contactForm: 'Contact Form',
    },
  };

  const t = translations[selectedLanguage];

  const handleLanguageChange = (newLang: 'fr' | 'en') => {
    setSelectedLanguage(newLang); // Changement local (nâ€™affecte pas la langue globale)
  };

  // --- Parser Markdown (mÃªmes rÃ¨gles que TermsExpats) ---
  const parseMarkdownContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === '') continue;

      // SÃ©parateur
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
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-red-500 pb-4"
          >
            {title}
          </h1>
        );
        continue;
      }

      // H2 (avec numÃ©ro optionnel au dÃ©but)
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
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-bold shadow-lg">
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

      // H3
      if (line.startsWith('### ')) {
        const title = line.substring(4).replace(/\*\*/g, '');
        elements.push(
          <h3 key={currentIndex++} className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-blue-500 pl-4">
            {title}
          </h3>
        );
        continue;
      }

      // Points numÃ©rotÃ©s 2.1 / 3.2 â€¦
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
            className="bg-gray-50 border-l-4 border-red-500 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors duration-200"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-red-600 mr-2">{number}</span>
              <span dangerouslySetInnerHTML={{ __html: formatted }} />
            </p>
          </div>
        );
        continue;
      }

      // Ligne full bold
      if (line.startsWith('**') && line.endsWith('**')) {
        const boldText = line.slice(2, -2);
        elements.push(
          <div key={currentIndex++} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 my-6">
            <p className="font-bold text-gray-900 text-lg">{boldText}</p>
          </div>
        );
        continue;
      }

      // Bloc Contact dÃ©diÃ©
      if (line.includes('Pour toute question') || line.includes('Contact form') || line.includes('For any questions')) {
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-8 my-8 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold shadow-lg">
                14
              </span>
              Contact
            </h3>
            <p className="text-gray-800 leading-relaxed mb-6 text-lg">{line}</p>
            <a
              href="http://localhost:5174/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
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

      // Paragraphe normal
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

  // --- Contenu par dÃ©faut (sÃ©parÃ© FR / EN) ---
  const defaultFr = `
# Conditions GÃ©nÃ©rales d'Utilisation â€“ Avocats (Global)

**SOS Expat d'Ulixai OÃœ** (la Â« **Plateforme** Â», Â« **SOS** Â», Â« **nous** Â»)

**Version 2.2 â€“ DerniÃ¨re mise Ã  jour : 16 juin 2025**

---

## 1. DÃ©finitions

**Application / Site / Plateforme** : services numÃ©riques exploitÃ©s par **Ulixai OÃœ** permettant la mise en relation entre des utilisateurs (les Â« **Utilisateurs** Â») et des avocats (les Â« **Avocats** Â»).

**Mise en relation** : l'introduction technique/opÃ©rationnelle rÃ©alisÃ©e par la Plateforme entre un Utilisateur et un Avocat, matÃ©rialisÃ©e par (i) la transmission de coordonnÃ©es, (ii) l'ouverture d'un canal de communication (appel, message, visio), ou (iii) l'acceptation par l'Avocat d'une demande Ã©mise via la Plateforme.

**Pays d'Intervention** : la juridiction principalement visÃ©e par la RequÃªte au moment de la Mise en relation. Ã€ dÃ©faut, le pays de rÃ©sidence de l'Utilisateur au moment de la demande ; en cas de pluralitÃ©, la juridiction la plus Ã©troitement liÃ©e Ã  l'objet de la RequÃªte.

**Frais de Mise en relation** : frais dus Ã  SOS pour chaque Mise en relation (art. 7) : **19 â‚¬** si payÃ©s en **EUR** ou **25 $ USD** si payÃ©s en **USD**, Ã©tant prÃ©cisÃ© qu'Ulixai peut modifier ces montants et/ou publier des barÃ¨mes locaux par pays/devise, avec effet prospectif.

**RequÃªte** : la situation/projet juridique exposÃ© par l'Utilisateur.

**Prestataire(s) de paiement** : services tiers utilisÃ©s pour percevoir le paiement unique de l'Utilisateur et rÃ©partir les fonds.

---

## 2. Objet, champ et acceptation

2.1. Les prÃ©sentes CGU rÃ©gissent l'accÃ¨s et l'utilisation de la Plateforme par les Avocats.

2.2. Ulixai agit uniquement en tant qu'intermÃ©diaire technique de mise en relation. Ulixai n'exerce pas la profession d'avocat, ne fournit pas de conseil juridique et n'est pas partie Ã  la relation Avocat-Utilisateur.

2.3. **Acceptation Ã©lectronique (click-wrap).** L'Avocat accepte les CGU en cochant la case dÃ©diÃ©e lors de l'inscription et/ou en utilisant la Plateforme. Cet acte vaut signature Ã©lectronique et consentement contractuel. SOS peut conserver des journaux de preuve (horodatage, identifiants techniques).

2.4. **Modifications.** SOS peut mettre Ã  jour les CGU et/ou le barÃ¨me des frais (par pays/devise) Ã  tout moment, avec effet prospectif aprÃ¨s publication sur la Plateforme. L'usage continu vaut acceptation.

2.5. DurÃ©e : indÃ©terminÃ©e.

---

## 3. Statut de l'Avocat â€“ IndÃ©pendance et conformitÃ©

3.1. L'Avocat agit en professionnel indÃ©pendant ; aucune relation d'emploi, mandat, agence, partenariat ou coentreprise n'est crÃ©Ã©e avec Ulixai.

3.2. L'Avocat est seul responsable : (i) de ses diplÃ´mes, titres, inscriptions au barreau/Ã©quivalents et autorisations d'exercer ; (ii) de son assurance responsabilitÃ© civile professionnelle en vigueur et adaptÃ©e aux Pays d'Intervention ; (iii) du respect des lois et rÃ¨gles professionnelles locales (dÃ©ontologie, publicitÃ©/dÃ©marchage, conflits d'intÃ©rÃªts, secret professionnel, LCB-FT/KYC, fiscalitÃ©, protection des consommateurs, etc.).

3.3. Ulixai ne supervise pas et n'Ã©value pas le contenu ni la qualitÃ© des conseils de l'Avocat et n'endosse aucune responsabilitÃ© Ã  ce titre.

3.4. **CapacitÃ© professionnelle (B2B).** L'Avocat dÃ©clare agir exclusivement Ã  des fins professionnelles. Les rÃ©gimes protecteurs des consommateurs ne s'appliquent pas Ã  la relation Ulixaiâ€“Avocat.

---

## 4. CrÃ©ation de compte, vÃ©rifications et sÃ©curitÃ©

4.1. Conditions : droit d'exercer valide dans au moins une juridiction, justificatifs d'identitÃ© et de qualification, assurance RCP en cours de validitÃ©.

4.2. Processus : crÃ©ation de compte, fourniture des documents, validation manuelle pouvant inclure un entretien visio et des contrÃ´les KYC/LCB-FT via des Prestataires.

4.3. Exactitude & mise Ã  jour : l'Avocat garantit l'exactitude/actualitÃ© des informations ; un (1) compte par Avocat.

4.4. SÃ©curitÃ© : l'Avocat protÃ¨ge ses identifiants ; toute activitÃ© via le compte est rÃ©putÃ©e effectuÃ©e par lui ; signalement immÃ©diat de toute compromission.

---

## 5. RÃ¨gles d'usage â€“ Conflits, confidentialitÃ©, non-contournement

5.1. **Conflits d'intÃ©rÃªts.** L'Avocat effectue un screening appropriÃ© avant tout conseil. En cas de conflit, il se retire et en informe l'Utilisateur.

5.2. **Secret professionnel & confidentialitÃ©.** L'Avocat respecte la confidentialitÃ©/secret professionnel selon le droit applicable du Pays d'Intervention. Les Ã©changes ne sont pas enregistrÃ©s par SOS, sauf obligations lÃ©gales.

5.3. **Non-contournement.** Ulixai ne perÃ§oit aucune commission sur les honoraires. Chaque nouvelle Mise en relation avec un nouvel Utilisateur via la Plateforme donne lieu aux Frais de Mise en relation. Il est interdit de contourner la Plateforme pour Ã©viter ces frais lors d'une nouvelle introduction.

5.4. **Comportements interdits.** Usurpation d'identitÃ©/titre, contenus illicites, manipulation, collusion/boycott visant Ã  nuire Ã  la Plateforme, violation de lois sur sanctions/export, ou toute activitÃ© illÃ©gale.

5.5. **DisponibilitÃ©.** La Plateforme est fournie Â« en l'Ã©tat Â» ; aucune disponibilitÃ© ininterrompue n'est garantie (maintenance, incidents, force majeure). L'accÃ¨s peut Ãªtre restreint si la loi l'impose.

---

## 6. Relation Avocatâ€“Utilisateur (hors Plateforme)

6.1. AprÃ¨s la Mise en relation, l'Avocat et l'Utilisateur peuvent contractualiser hors Plateforme (Ulixai n'intervient pas dans la fixation ni l'encaissement des honoraires, sauf mÃ©canisme de paiement unique dÃ©crit ci-dessous).

6.2. L'Avocat remet ses conventions d'honoraires selon le droit local, collecte/reverse les taxes applicables et respecte les rÃ¨gles locales (publicitÃ©, dÃ©marchage, conflits d'intÃ©rÃªts, consommateurs).

6.3. Ulixai n'est pas responsable de la qualitÃ©, de l'exactitude ou du rÃ©sultat des conseils de l'Avocat.

---

## 7. Frais, paiement unique et taxes

7.1. **Frais de Mise en relation (forfait).** 19 â‚¬ (EUR) ou 25 $ (USD) par Mise en relation, hors taxes et hors frais du Prestataire de paiement. Ulixai peut modifier ces montants et/ou publier des barÃ¨mes locaux par pays/devise, avec effet prospectif.

7.2. **Paiement unique et rÃ©partition.** L'Utilisateur effectue un paiement unique via la Plateforme couvrant (i) les honoraires de l'Avocat (tels que convenus entre l'Avocat et l'Utilisateur) et (ii) les Frais de Mise en relation d'Ulixai. Ulixai (ou son Prestataire) encaisse ce paiement, dÃ©duit ses Frais de Mise en relation, puis reverse le solde Ã  l'Avocat. L'Avocat autorise Ulixai Ã  procÃ©der Ã  ces dÃ©ductions et rÃ©partitions.

7.3. **ExigibilitÃ© & non-remboursement.** Les Frais de Mise en relation sont dus dÃ¨s la Mise en relation et sont non remboursables (sauf geste commercial discrÃ©tionnaire d'Ulixai en cas d'Ã©chec exclusivement imputable Ã  la Plateforme et dans la mesure permise par la loi).

7.4. **Remboursement Ã  l'Utilisateur.** Si un remboursement est accordÃ© Ã  l'Utilisateur, il est imputÃ© sur la part de l'Avocat : Ulixai peut retenir/compenser le montant correspondant sur les versements futurs de l'Avocat, ou en demander le remboursement si aucun versement n'est Ã  venir. Aucun remboursement des Frais de Mise en relation n'est dÃ», sauf dÃ©cision discrÃ©tionnaire d'Ulixai.

7.5. **Devises & conversion.** Plusieurs devises peuvent Ãªtre proposÃ©es ; des taux/frais de conversion du Prestataire peuvent s'appliquer.

7.6. **Taxes.** L'Avocat demeure responsable de ses obligations fiscales. Ulixai collecte et reverse, lorsque requis, la TVA/Ã©quivalent local sur les Frais de Mise en relation.

7.7. **Compensation.** Ulixai peut compenser tout montant que l'Avocat lui doit (au titre d'un remboursement Utilisateur ou autre) avec toute somme due Ã  l'Avocat.

---

## 8. Paiements â€“ KYC/LCB-FT â€“ Sanctions

8.1. Les paiements sont traitÃ©s par des Prestataires tiers. L'Avocat accepte leurs conditions et processus KYC/LCB-FT.

8.2. Ulixai peut diffÃ©rer, retenir ou annuler des paiements en cas de soupÃ§on de fraude, de non-conformitÃ© ou d'injonction lÃ©gale.

8.3. L'accÃ¨s peut Ãªtre restreint dans des territoires soumis Ã  sanctions/embargos si la loi l'exige. L'Avocat dÃ©clare ne figurer sur aucune liste de sanctions et respecter les contrÃ´les export applicables.

---

## 9. DonnÃ©es personnelles (cadre global)

9.1. **RÃ´les.** Pour les donnÃ©es des Utilisateurs reÃ§ues aux fins de Mise en relation, Ulixai et l'Avocat agissent chacun en responsable de traitement pour leurs finalitÃ©s respectives.

9.2. **Bases & finalitÃ©s.** ExÃ©cution du contrat (Mise en relation), intÃ©rÃªts lÃ©gitimes (sÃ©curitÃ©, prÃ©vention de la fraude, amÃ©lioration), conformitÃ© lÃ©gale (LCB-FT, sanctions), et, le cas Ã©chÃ©ant, consentement.

9.3. **Transferts internationaux** avec garanties appropriÃ©es lorsque requis.

9.4. **Droits & contact.** Exercice des droits via le formulaire de contact de la Plateforme.

9.5. **SÃ©curitÃ©.** Mesures techniques/organisationnelles raisonnables ; notification des violations selon les lois applicables.

9.6. L'Avocat traite les donnÃ©es reÃ§ues conformÃ©ment au droit du Pays d'Intervention et Ã  sa dÃ©ontologie (secret professionnel).

---

## 10. PropriÃ©tÃ© intellectuelle

La Plateforme, ses marques, logos, bases de donnÃ©es et contenus sont protÃ©gÃ©s. Aucun droit n'est cÃ©dÃ© Ã  l'Avocat, hormis un droit personnel, non exclusif, non transfÃ©rable d'accÃ¨s pendant la durÃ©e des CGU. Les contenus fournis par l'Avocat (profil, photo, descriptifs) font l'objet d'une licence mondiale, non exclusive en faveur d'Ulixai pour l'hÃ©bergement et l'affichage dans la Plateforme.

---

## 11. Garanties, responsabilitÃ© et indemnisation

11.1. Aucune garantie quant aux services juridiques ; Ulixai n'assure ni l'issue, ni la qualitÃ©, ni le volume d'affaires.

11.2. Plateforme Â« en l'Ã©tat Â» ; aucune garantie d'accessibilitÃ© continue.

11.3. **Limitation de responsabilitÃ©** : dans la mesure permise, la responsabilitÃ© totale d'Ulixai envers l'Avocat est limitÃ©e aux dommages directs et ne peut excÃ©der le total des Frais de Mise en relation perÃ§us par Ulixai au titre de la transaction Ã  l'origine de la rÃ©clamation.

11.4. **Exclusions** : aucun dommage indirect/consÃ©cutif/spÃ©cial/punitif (perte de profits, clientÃ¨le, rÃ©putation, etc.).

11.5. **Indemnisation** : l'Avocat indemnise et garantit Ulixai (et ses affiliÃ©s, dirigeants, employÃ©s, agents) contre toute rÃ©clamation/prÃ©judice/frais (dont honoraires d'avocat) liÃ©s Ã  (i) ses manquements aux CGU/lois, (ii) ses contenus, (iii) ses conseils/omissions.

11.6. Aucune reprÃ©sentation : rien n'emporte mandat, emploi, partenariat ou coentreprise entre Ulixai et l'Avocat.

11.7. **Survie** : les articles 5, 7, 8, 9, 10, 11, 12 et 13 survivent Ã  la rÃ©siliation.

---

## 12. Droit applicable â€“ Arbitrage â€“ Juridiction estonienne â€“ Actions collectives

12.1. **Droit matÃ©riel** : pour chaque Mise en relation, la relation Ulixaiâ€“Avocat est rÃ©gie par les lois du Pays d'Intervention, sous rÃ©serve des rÃ¨gles d'ordre public locales et des normes internationales impÃ©ratives. **Ã€ titre supplÃ©tif et pour l'interprÃ©tation/validitÃ© des prÃ©sentes CGU ainsi que pour toute question non rÃ©gie par le droit du Pays d'Intervention, le droit estonien s'applique.**

12.2. **Arbitrage CCI obligatoire** : tout litige Ulixai/Avocat est rÃ©solu dÃ©finitivement selon le RÃ¨glement d'Arbitrage de la CCI. **SiÃ¨ge : Tallinn (Estonie)**. **Langue : franÃ§ais**. Le tribunal applique le droit matÃ©riel dÃ©fini Ã  l'art. 12.1. ProcÃ©dure confidentielle.

12.3. **Renonciation aux actions collectives** : dans la mesure permise, toute action collective/de groupe/reprÃ©sentative est exclue ; rÃ©clamations individuelles uniquement.

12.4. **CompÃ©tence exclusive des tribunaux d'Estonie** : pour toute demande non arbitrable et pour l'exÃ©cution des sentences ou mesures urgentes, les **tribunaux estoniens** (compÃ©tents Ã  Tallinn) ont **compÃ©tence exclusive**. L'Avocat renonce Ã  toute objection de forum ou de non-convenance.

---

## 13. Divers

13.1. **Cession** : Ulixai peut cÃ©der les CGU Ã  une entitÃ© de son groupe ou Ã  un successeur ; l'Avocat ne peut cÃ©der sans accord Ã©crit d'Ulixai.

13.2. **IntÃ©gralitÃ©** : les CGU constituent l'accord complet et remplacent tout accord antÃ©rieur relatif au mÃªme objet.

13.3. **Notifications** : par publication sur la Plateforme, notification in-app ou via le formulaire de contact.

13.4. **InterprÃ©tation** : les intitulÃ©s sont indicatifs. Aucune rÃ¨gle contra proferentem.

13.5. **Langues** : des traductions peuvent Ãªtre fournies ; l'anglais prÃ©vaut pour l'interprÃ©tation.

13.6. **NullitÃ© partielle** : si une stipulation est nulle/inapplicable, le reste demeure en vigueur ; remplacement par une stipulation valide d'effet Ã©quivalent lorsque possible.

13.7. **Non-renonciation** : l'absence d'exercice d'un droit n'emporte pas renonciation.

---

## 14. Contact

Pour toute question ou demande lÃ©gale : **http://localhost:5174/contact**
`;

  const defaultEn = `
# Terms of Use â€“ Lawyers (Global)

**SOS Expat by Ulixai OÃœ** (the "**Platform**", "**SOS**", "**we**")

**Version 2.2 â€“ Last updated: 16 June 2025**

---

## 1. Definitions

"Connection" means the technical/operational introduction enabling contact (sharing details and/or initiating a call/message/video). "Country of Intervention" means the jurisdiction primarily targeted by the User's Request at the time of Connection; if multiple, the most closely connected jurisdiction. "Connection Fee" means **EUR 19** (if paid in EUR) or **USD 25** (if paid in USD), subject to future changes and/or local schedules by country/currency with prospective effect.

---

## 2. Purpose, Scope and Acceptance

Ulixai acts **solely as a technical intermediary**. Ulixai does not provide legal advice and is not a party to Lawyerâ€“User engagements. **Click-wrap acceptance** constitutes electronic signature and consent; SOS may keep technical evidence. SOS may update these Terms and/or fee schedules with prospective effect upon posting. Term: open-ended.

---

## 3. Lawyer Status â€“ Independence and Compliance

The Lawyer acts as an independent professional. No employment, mandate, agency, partnership or joint venture is created. The Lawyer is solely responsible for (i) qualifications, admissions and licenses, (ii) professional liability insurance adequate for all intended Countries of Intervention, (iii) local law and professional rules (ethics, advertising/solicitation, conflicts, confidentiality, AML/KYC, tax, consumer protection, etc.). Ulixai does not supervise or assess the Lawyer's advice.

**Professional capacity (B2B).** The Lawyer confirms they act **exclusively for professional purposes**. Consumer protection regimes do not apply to the Ulixaiâ€“Lawyer relationship.

---

## 4. Account, Checks and Security

Valid right to practice in at least one jurisdiction; identity/qualification documents; manual review (which may include video and AML/KYC checks). Accuracy and updates are the Lawyer's duty; one account per Lawyer. Keep credentials secure and report compromise immediately.

---

## 5. Use Rules â€“ Conflicts, Confidentiality, No Circumvention

**Conflicts.** Screen for conflicts before any advice; withdraw and inform the User if a conflict exists. **Confidentiality.** Maintain privilege and confidentiality under the Country of Intervention's law. **No circumvention.** Ulixai takes no commission on legal fees. Each new Connection with a new User via the Platform triggers the Connection Fee. Avoiding the Platform to evade fees on a new introduction is prohibited. **Prohibited conduct** includes identity fraud, illegal content, manipulation, collusion/boycott, sanctions/export breaches, or any unlawful activity. **Availability** is "as is"; access may be restricted where required by law.

---

## 6. Lawyerâ€“User Relationship (Off-Platform)

After the Connection, parties may contract **off-Platform**. Ulixai does not set or collect the Lawyer's fees (except via the single-payment mechanism below). The Lawyer provides local fee agreements, handles taxes, and complies with local rules.

---

## 7. Fees, Single Payment and Taxes

**Flat Connection Fee.** EUR 19 or USD 25 per Connection, exclusive of taxes and payment processor charges. Ulixai may change amounts and/or publish local schedules by country/currency with prospective effect.

**Single payment & split.** The User makes **one payment** via the Platform covering (i) the Lawyer's fee (as agreed) and (ii) Ulixai's Connection Fee. Ulixai (or its processor) collects, **deducts** its Fee, then **remits** the remainder to the Lawyer, who **authorizes** such deductions and allocations.

**Due & non-refundable.** The Connection Fee is **earned upon** Connection and **non-refundable** (subject to Ulixai's discretionary goodwill **to the extent permitted by law** in case of Platform-only failure).

**User refund.** If granted, refunds are **borne by the Lawyer's share**: Ulixai may **withhold/offset** against future payouts or request reimbursement if none are due.

**FX & taxes.** Processor FX rates/fees may apply; the Lawyer is responsible for all applicable taxes; Ulixai collects/remits VAT or local equivalent on the Connection Fee where required. **Set-off** authorized.

---

## 8. Payments â€“ AML/KYC â€“ Sanctions

Payments are processed by third-party providers. The Lawyer agrees to their terms and AML/KYC procedures. Ulixai may delay, withhold or cancel payouts in case of suspected fraud, non-compliance, or legal order. Access may be restricted in sanctioned territories where required by law. The Lawyer warrants it is not on sanctions lists and complies with export controls.

---

## 9. Data Protection (Global Framework)

**Roles.** For User data received for Connection, **Ulixai and the Lawyer** each act as an **independent controller** for their own purposes. **Legal bases & purposes** include contract performance (Connection), legitimate interests (security, fraud prevention, service improvement), legal compliance (AML, sanctions), and consent where applicable. **International transfers** may occur with appropriate safeguards where required. **Rights & contact** via the Platform contact form. **Security** measures apply; data breaches are notified as required. The Lawyer processes data under the Country of Intervention's law and professional secrecy.

---

## 10. Intellectual Property

The Platform, trademarks, logos, databases and contents are protected. No rights are assigned to the Lawyer beyond a personal, non-exclusive, non-transferable right to access during these Terms. Lawyer-provided content (profile, photo, descriptions) is licensed to Ulixai on a **worldwide, non-exclusive** basis for hosting and display on the Platform.

---

## 11. Warranties, Liability and Indemnity

No warranty for legal outcomes, quality, volume or Users' reliability. Platform is provided "as is." **Liability cap**: to the fullest extent permitted, Ulixai's total liability to the Lawyer is limited to **direct damages** and **shall not exceed** the total **Connection Fees** received by Ulixai for the **transaction** giving rise to the claim. No indirect/consequential/special/punitive damages. **Indemnity**: the Lawyer shall indemnify and hold harmless Ulixai (and affiliates, officers, employees, agents) from claims/costs (including reasonable attorneys' fees) arising from (i) breach of these Terms/laws, (ii) Lawyer content, (iii) Lawyer services or omissions. No agency/employment/partnership/JV is created. **Survival**: Sections 5, 7, 8, 9, 10, 11, 12 and 13 survive termination.

---

## 12. Governing Law â€“ ICC Arbitration â€“ Estonian Courts â€“ Class Actions

**Substantive law:** for each Connection, the **laws of the Country of Intervention** govern the Ulixaiâ€“Lawyer relationship, subject to mandatory local rules and peremptory international norms.

**Mandatory ICC arbitration** for any Ulixaiâ€“Lawyer dispute. **Seat: Tallinn (Estonia). Language: French.** Tribunal applies the **substantive law** defined above. Proceedings are **confidential**.

**Class/collective actions are waived** to the extent permitted by law.

**Exclusive jurisdiction of Estonian courts** (Tallinn) for **non-arbitrable** claims, enforcement of awards and urgent measures; the Lawyer waives objections to venue/forum non conveniens.

---

## 13. Miscellaneous

**Assignment**: Ulixai may assign these Terms to a group entity or successor; the Lawyer may not assign without Ulixai's consent. **Entire Agreement**: these Terms supersede prior understandings. **Notices**: by posting on the Platform, in-app, or via the contact form. **Interpretation**: headings are for convenience; no **contra proferentem**. **Languages**: translations may be provided; **French prevails** for interpretation. **Severability**: invalid terms are replaced by valid ones of equivalent effect. **No waiver**: failure to enforce is not a waiver.

---

## 14. Contact

**Contact form (support & legal requests)**: **http://localhost:5174/contact**
`;

  const defaultContent = selectedLanguage === 'fr' ? defaultFr : defaultEn;

  // Sections du sommaire (UI)
  const anchorMap = useMemo(
    () => [
      { num: 1, label: t.sections.definitions },
      { num: 2, label: t.sections.scope },
      { num: 3, label: t.sections.status },
      { num: 4, label: t.sections.account },
      { num: 5, label: t.sections.rules },
      { num: 6, label: t.sections.relationship },
      { num: 7, label: t.sections.fees },
      { num: 8, label: t.sections.payments },
      { num: 9, label: t.sections.data },
      { num: 10, label: t.sections.ip },
      { num: 11, label: t.sections.liability },
      { num: 12, label: t.sections.law },
      { num: 13, label: t.sections.misc },
      { num: 14, label: t.sections.contact },
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
              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <Scale className="w-12 h-12 text-white" />
                </div>
              </div>

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
                  <Users className="w-4 h-4" /> <span>{t.trustedByExperts}</span>
                </span>
                {/* Aucune note/avis affichÃ©s */}
              </div>

              <div className="mt-8 flex items-center justify-center gap-4">
                <Link
                  to="/register/lawyer"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm font-semibold"
                >
                  <Briefcase className="w-5 h-5" />
                  <span>{t.ctaHero}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="http://localhost:5174/contact"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white font-bold border-2 border-red-400/50 hover:scale-105 transition-all"
                >
                  <Globe className="w-5 h-5" />
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
                { icon: <Users className="w-6 h-6" />, text: t.features[3], gradient: 'from-red-500 to-orange-500' },
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
                  <FileText className="w-5 h-5" />
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
                <Globe className="w-4 h-4" /> Global
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <Link
                to="/register/lawyer"
                className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-10 py-5 rounded-3xl font-black text-lg transition-all duration-300 hover:scale-110 hover:shadow-2xl flex items-center gap-3"
              >
                <Briefcase className="w-5 h-5" />
                <span>{t.startNow}</span>
                {/* FlÃ¨che retirÃ©e sur ce CTA comme demandÃ© */}
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-black/5" />
              </Link>

              <a
                href="http://localhost:5174/contact"
                className="group relative overflow-hidden border-2 border-white bg-transparent text-white px-10 py-5 rounded-3xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:bg-white/10 flex items-center gap-3"
              >
                <Globe className="w-5 h-5" />
                <span>{t.contactUs}</span>
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/30" />
              </a>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default TermsLawyers;
