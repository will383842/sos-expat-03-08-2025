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
 * - Logique métier conservée : Firestore (legal_documents / terms_lawyers), sélection de langue locale.
 * - Design harmonisé avec Home / TermsExpats (gradients, chips, sommaire, cartes).
 * - 100% éditable depuis l’admin ; fallback FR/EN intégré.
 * - Aucune utilisation de `any`.
 */

const TermsLawyers: React.FC = () => {
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
      subtitle: "Conditions générales d'utilisation pour les avocats prestataires",
      lastUpdated: 'Version 2.2 – Dernière mise à jour : 16 juin 2025',
      loading: 'Chargement...',
      joinNetwork: 'Rejoindre le réseau',
      trustedByExperts: 'Déjà 2K+ avocats nous font confiance',
      keyFeatures: 'Points clés',
      features: [
        'Paiement garanti sous 7 jours',
        'Support technique 24/7',
        'Interface mobile optimisée',
        'Clients vérifiés',
      ],
      languageToggle: 'Changer de langue',
      sections: {
        definitions: 'Définitions',
        scope: 'Objet, champ et acceptation',
        status: "Statut de l'Avocat – Indépendance et conformité",
        account: 'Création de compte, vérifications et sécurité',
        rules: "Règles d'usage – Conflits, confidentialité, non-contournement",
        relationship: 'Relation Avocat–Utilisateur (hors Plateforme)',
        fees: 'Frais, paiement unique et taxes',
        payments: 'Paiements – KYC/LCB-FT – Sanctions',
        data: 'Données personnelles (cadre global)',
        ip: 'Propriété intellectuelle',
        liability: 'Garanties, responsabilité et indemnisation',
        law: 'Droit applicable – Arbitrage – Juridiction estonienne',
        misc: 'Divers',
        contact: 'Contact',
      },
      readyToJoin: 'Prêt à rejoindre SOS Expat ?',
      readySubtitle: "Développez votre activité à l'international et aidez des milliers d'expatriés.",
      startNow: 'Commencer maintenant',
      contactUs: 'Nous contacter',
      anchorTitle: 'Sommaire',
      editHint: 'Document éditable depuis la console admin',
      heroBadge: 'Nouveau — Conditions mises à jour',
      ctaHero: 'Rejoindre les avocats',
      contactForm: 'Formulaire de contact',
    },
    en: {
      title: 'Lawyer Terms',
      subtitle: 'Terms of Use for lawyer providers',
      lastUpdated: 'Version 2.2 – Last updated: 16 June 2025',
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
        status: 'Lawyer Status – Independence and Compliance',
        account: 'Account, Checks and Security',
        rules: 'Use Rules – Conflicts, Confidentiality, No Circumvention',
        relationship: 'Lawyer–User Relationship (Off-Platform)',
        fees: 'Fees, Single Payment and Taxes',
        payments: 'Payments – AML/KYC – Sanctions',
        data: 'Data Protection (Global Framework)',
        ip: 'Intellectual Property',
        liability: 'Warranties, Liability and Indemnity',
        law: 'Governing Law – ICC Arbitration – Estonian Courts',
        misc: 'Miscellaneous',
        contact: 'Contact',
      },
      readyToJoin: 'Ready to join SOS Expat?',
      readySubtitle: 'Develop your international practice and help thousands of expats.',
      startNow: 'Start now',
      contactUs: 'Contact us',
      anchorTitle: 'Overview',
      editHint: 'Document editable from the admin console',
      heroBadge: 'New — Terms updated',
      ctaHero: 'Join as a lawyer',
      contactForm: 'Contact Form',
    },
  };

  const t = translations[selectedLanguage];

  const handleLanguageChange = (newLang: 'fr' | 'en') => {
    setSelectedLanguage(newLang); // Changement local (n’affecte pas la langue globale)
  };

  // --- Parser Markdown (mêmes règles que TermsExpats) ---
  const parseMarkdownContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === '') continue;

      // Séparateur
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

      // H2 (avec numéro optionnel au début)
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

      // Points numérotés 2.1 / 3.2 …
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

      // Bloc Contact dédié
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

  // --- Contenu par défaut (séparé FR / EN) ---
  const defaultFr = `
# Conditions Générales d'Utilisation – Avocats (Global)

**SOS Expat d'Ulixai OÜ** (la « **Plateforme** », « **SOS** », « **nous** »)

**Version 2.2 – Dernière mise à jour : 16 juin 2025**

---

## 1. Définitions

**Application / Site / Plateforme** : services numériques exploités par **Ulixai OÜ** permettant la mise en relation entre des utilisateurs (les « **Utilisateurs** ») et des avocats (les « **Avocats** »).

**Mise en relation** : l'introduction technique/opérationnelle réalisée par la Plateforme entre un Utilisateur et un Avocat, matérialisée par (i) la transmission de coordonnées, (ii) l'ouverture d'un canal de communication (appel, message, visio), ou (iii) l'acceptation par l'Avocat d'une demande émise via la Plateforme.

**Pays d'Intervention** : la juridiction principalement visée par la Requête au moment de la Mise en relation. À défaut, le pays de résidence de l'Utilisateur au moment de la demande ; en cas de pluralité, la juridiction la plus étroitement liée à l'objet de la Requête.

**Frais de Mise en relation** : frais dus à SOS pour chaque Mise en relation (art. 7) : **19 €** si payés en **EUR** ou **25 $ USD** si payés en **USD**, étant précisé qu'Ulixai peut modifier ces montants et/ou publier des barèmes locaux par pays/devise, avec effet prospectif.

**Requête** : la situation/projet juridique exposé par l'Utilisateur.

**Prestataire(s) de paiement** : services tiers utilisés pour percevoir le paiement unique de l'Utilisateur et répartir les fonds.

---

## 2. Objet, champ et acceptation

2.1. Les présentes CGU régissent l'accès et l'utilisation de la Plateforme par les Avocats.

2.2. Ulixai agit uniquement en tant qu'intermédiaire technique de mise en relation. Ulixai n'exerce pas la profession d'avocat, ne fournit pas de conseil juridique et n'est pas partie à la relation Avocat-Utilisateur.

2.3. **Acceptation électronique (click-wrap).** L'Avocat accepte les CGU en cochant la case dédiée lors de l'inscription et/ou en utilisant la Plateforme. Cet acte vaut signature électronique et consentement contractuel. SOS peut conserver des journaux de preuve (horodatage, identifiants techniques).

2.4. **Modifications.** SOS peut mettre à jour les CGU et/ou le barème des frais (par pays/devise) à tout moment, avec effet prospectif après publication sur la Plateforme. L'usage continu vaut acceptation.

2.5. Durée : indéterminée.

---

## 3. Statut de l'Avocat – Indépendance et conformité

3.1. L'Avocat agit en professionnel indépendant ; aucune relation d'emploi, mandat, agence, partenariat ou coentreprise n'est créée avec Ulixai.

3.2. L'Avocat est seul responsable : (i) de ses diplômes, titres, inscriptions au barreau/équivalents et autorisations d'exercer ; (ii) de son assurance responsabilité civile professionnelle en vigueur et adaptée aux Pays d'Intervention ; (iii) du respect des lois et règles professionnelles locales (déontologie, publicité/démarchage, conflits d'intérêts, secret professionnel, LCB-FT/KYC, fiscalité, protection des consommateurs, etc.).

3.3. Ulixai ne supervise pas et n'évalue pas le contenu ni la qualité des conseils de l'Avocat et n'endosse aucune responsabilité à ce titre.

3.4. **Capacité professionnelle (B2B).** L'Avocat déclare agir exclusivement à des fins professionnelles. Les régimes protecteurs des consommateurs ne s'appliquent pas à la relation Ulixai–Avocat.

---

## 4. Création de compte, vérifications et sécurité

4.1. Conditions : droit d'exercer valide dans au moins une juridiction, justificatifs d'identité et de qualification, assurance RCP en cours de validité.

4.2. Processus : création de compte, fourniture des documents, validation manuelle pouvant inclure un entretien visio et des contrôles KYC/LCB-FT via des Prestataires.

4.3. Exactitude & mise à jour : l'Avocat garantit l'exactitude/actualité des informations ; un (1) compte par Avocat.

4.4. Sécurité : l'Avocat protège ses identifiants ; toute activité via le compte est réputée effectuée par lui ; signalement immédiat de toute compromission.

---

## 5. Règles d'usage – Conflits, confidentialité, non-contournement

5.1. **Conflits d'intérêts.** L'Avocat effectue un screening approprié avant tout conseil. En cas de conflit, il se retire et en informe l'Utilisateur.

5.2. **Secret professionnel & confidentialité.** L'Avocat respecte la confidentialité/secret professionnel selon le droit applicable du Pays d'Intervention. Les échanges ne sont pas enregistrés par SOS, sauf obligations légales.

5.3. **Non-contournement.** Ulixai ne perçoit aucune commission sur les honoraires. Chaque nouvelle Mise en relation avec un nouvel Utilisateur via la Plateforme donne lieu aux Frais de Mise en relation. Il est interdit de contourner la Plateforme pour éviter ces frais lors d'une nouvelle introduction.

5.4. **Comportements interdits.** Usurpation d'identité/titre, contenus illicites, manipulation, collusion/boycott visant à nuire à la Plateforme, violation de lois sur sanctions/export, ou toute activité illégale.

5.5. **Disponibilité.** La Plateforme est fournie « en l'état » ; aucune disponibilité ininterrompue n'est garantie (maintenance, incidents, force majeure). L'accès peut être restreint si la loi l'impose.

---

## 6. Relation Avocat–Utilisateur (hors Plateforme)

6.1. Après la Mise en relation, l'Avocat et l'Utilisateur peuvent contractualiser hors Plateforme (Ulixai n'intervient pas dans la fixation ni l'encaissement des honoraires, sauf mécanisme de paiement unique décrit ci-dessous).

6.2. L'Avocat remet ses conventions d'honoraires selon le droit local, collecte/reverse les taxes applicables et respecte les règles locales (publicité, démarchage, conflits d'intérêts, consommateurs).

6.3. Ulixai n'est pas responsable de la qualité, de l'exactitude ou du résultat des conseils de l'Avocat.

---

## 7. Frais, paiement unique et taxes

7.1. **Frais de Mise en relation (forfait).** 19 € (EUR) ou 25 $ (USD) par Mise en relation, hors taxes et hors frais du Prestataire de paiement. Ulixai peut modifier ces montants et/ou publier des barèmes locaux par pays/devise, avec effet prospectif.

7.2. **Paiement unique et répartition.** L'Utilisateur effectue un paiement unique via la Plateforme couvrant (i) les honoraires de l'Avocat (tels que convenus entre l'Avocat et l'Utilisateur) et (ii) les Frais de Mise en relation d'Ulixai. Ulixai (ou son Prestataire) encaisse ce paiement, déduit ses Frais de Mise en relation, puis reverse le solde à l'Avocat. L'Avocat autorise Ulixai à procéder à ces déductions et répartitions.

7.3. **Exigibilité & non-remboursement.** Les Frais de Mise en relation sont dus dès la Mise en relation et sont non remboursables (sauf geste commercial discrétionnaire d'Ulixai en cas d'échec exclusivement imputable à la Plateforme et dans la mesure permise par la loi).

7.4. **Remboursement à l'Utilisateur.** Si un remboursement est accordé à l'Utilisateur, il est imputé sur la part de l'Avocat : Ulixai peut retenir/compenser le montant correspondant sur les versements futurs de l'Avocat, ou en demander le remboursement si aucun versement n'est à venir. Aucun remboursement des Frais de Mise en relation n'est dû, sauf décision discrétionnaire d'Ulixai.

7.5. **Devises & conversion.** Plusieurs devises peuvent être proposées ; des taux/frais de conversion du Prestataire peuvent s'appliquer.

7.6. **Taxes.** L'Avocat demeure responsable de ses obligations fiscales. Ulixai collecte et reverse, lorsque requis, la TVA/équivalent local sur les Frais de Mise en relation.

7.7. **Compensation.** Ulixai peut compenser tout montant que l'Avocat lui doit (au titre d'un remboursement Utilisateur ou autre) avec toute somme due à l'Avocat.

---

## 8. Paiements – KYC/LCB-FT – Sanctions

8.1. Les paiements sont traités par des Prestataires tiers. L'Avocat accepte leurs conditions et processus KYC/LCB-FT.

8.2. Ulixai peut différer, retenir ou annuler des paiements en cas de soupçon de fraude, de non-conformité ou d'injonction légale.

8.3. L'accès peut être restreint dans des territoires soumis à sanctions/embargos si la loi l'exige. L'Avocat déclare ne figurer sur aucune liste de sanctions et respecter les contrôles export applicables.

---

## 9. Données personnelles (cadre global)

9.1. **Rôles.** Pour les données des Utilisateurs reçues aux fins de Mise en relation, Ulixai et l'Avocat agissent chacun en responsable de traitement pour leurs finalités respectives.

9.2. **Bases & finalités.** Exécution du contrat (Mise en relation), intérêts légitimes (sécurité, prévention de la fraude, amélioration), conformité légale (LCB-FT, sanctions), et, le cas échéant, consentement.

9.3. **Transferts internationaux** avec garanties appropriées lorsque requis.

9.4. **Droits & contact.** Exercice des droits via le formulaire de contact de la Plateforme.

9.5. **Sécurité.** Mesures techniques/organisationnelles raisonnables ; notification des violations selon les lois applicables.

9.6. L'Avocat traite les données reçues conformément au droit du Pays d'Intervention et à sa déontologie (secret professionnel).

---

## 10. Propriété intellectuelle

La Plateforme, ses marques, logos, bases de données et contenus sont protégés. Aucun droit n'est cédé à l'Avocat, hormis un droit personnel, non exclusif, non transférable d'accès pendant la durée des CGU. Les contenus fournis par l'Avocat (profil, photo, descriptifs) font l'objet d'une licence mondiale, non exclusive en faveur d'Ulixai pour l'hébergement et l'affichage dans la Plateforme.

---

## 11. Garanties, responsabilité et indemnisation

11.1. Aucune garantie quant aux services juridiques ; Ulixai n'assure ni l'issue, ni la qualité, ni le volume d'affaires.

11.2. Plateforme « en l'état » ; aucune garantie d'accessibilité continue.

11.3. **Limitation de responsabilité** : dans la mesure permise, la responsabilité totale d'Ulixai envers l'Avocat est limitée aux dommages directs et ne peut excéder le total des Frais de Mise en relation perçus par Ulixai au titre de la transaction à l'origine de la réclamation.

11.4. **Exclusions** : aucun dommage indirect/consécutif/spécial/punitif (perte de profits, clientèle, réputation, etc.).

11.5. **Indemnisation** : l'Avocat indemnise et garantit Ulixai (et ses affiliés, dirigeants, employés, agents) contre toute réclamation/préjudice/frais (dont honoraires d'avocat) liés à (i) ses manquements aux CGU/lois, (ii) ses contenus, (iii) ses conseils/omissions.

11.6. Aucune représentation : rien n'emporte mandat, emploi, partenariat ou coentreprise entre Ulixai et l'Avocat.

11.7. **Survie** : les articles 5, 7, 8, 9, 10, 11, 12 et 13 survivent à la résiliation.

---

## 12. Droit applicable – Arbitrage – Juridiction estonienne – Actions collectives

12.1. **Droit matériel** : pour chaque Mise en relation, la relation Ulixai–Avocat est régie par les lois du Pays d'Intervention, sous réserve des règles d'ordre public locales et des normes internationales impératives. **À titre supplétif et pour l'interprétation/validité des présentes CGU ainsi que pour toute question non régie par le droit du Pays d'Intervention, le droit estonien s'applique.**

12.2. **Arbitrage CCI obligatoire** : tout litige Ulixai/Avocat est résolu définitivement selon le Règlement d'Arbitrage de la CCI. **Siège : Tallinn (Estonie)**. **Langue : français**. Le tribunal applique le droit matériel défini à l'art. 12.1. Procédure confidentielle.

12.3. **Renonciation aux actions collectives** : dans la mesure permise, toute action collective/de groupe/représentative est exclue ; réclamations individuelles uniquement.

12.4. **Compétence exclusive des tribunaux d'Estonie** : pour toute demande non arbitrable et pour l'exécution des sentences ou mesures urgentes, les **tribunaux estoniens** (compétents à Tallinn) ont **compétence exclusive**. L'Avocat renonce à toute objection de forum ou de non-convenance.

---

## 13. Divers

13.1. **Cession** : Ulixai peut céder les CGU à une entité de son groupe ou à un successeur ; l'Avocat ne peut céder sans accord écrit d'Ulixai.

13.2. **Intégralité** : les CGU constituent l'accord complet et remplacent tout accord antérieur relatif au même objet.

13.3. **Notifications** : par publication sur la Plateforme, notification in-app ou via le formulaire de contact.

13.4. **Interprétation** : les intitulés sont indicatifs. Aucune règle contra proferentem.

13.5. **Langues** : des traductions peuvent être fournies ; l'anglais prévaut pour l'interprétation.

13.6. **Nullité partielle** : si une stipulation est nulle/inapplicable, le reste demeure en vigueur ; remplacement par une stipulation valide d'effet équivalent lorsque possible.

13.7. **Non-renonciation** : l'absence d'exercice d'un droit n'emporte pas renonciation.

---

## 14. Contact

Pour toute question ou demande légale : **http://localhost:5174/contact**
`;

  const defaultEn = `
# Terms of Use – Lawyers (Global)

**SOS Expat by Ulixai OÜ** (the "**Platform**", "**SOS**", "**we**")

**Version 2.2 – Last updated: 16 June 2025**

---

## 1. Definitions

"Connection" means the technical/operational introduction enabling contact (sharing details and/or initiating a call/message/video). "Country of Intervention" means the jurisdiction primarily targeted by the User's Request at the time of Connection; if multiple, the most closely connected jurisdiction. "Connection Fee" means **EUR 19** (if paid in EUR) or **USD 25** (if paid in USD), subject to future changes and/or local schedules by country/currency with prospective effect.

---

## 2. Purpose, Scope and Acceptance

Ulixai acts **solely as a technical intermediary**. Ulixai does not provide legal advice and is not a party to Lawyer–User engagements. **Click-wrap acceptance** constitutes electronic signature and consent; SOS may keep technical evidence. SOS may update these Terms and/or fee schedules with prospective effect upon posting. Term: open-ended.

---

## 3. Lawyer Status – Independence and Compliance

The Lawyer acts as an independent professional. No employment, mandate, agency, partnership or joint venture is created. The Lawyer is solely responsible for (i) qualifications, admissions and licenses, (ii) professional liability insurance adequate for all intended Countries of Intervention, (iii) local law and professional rules (ethics, advertising/solicitation, conflicts, confidentiality, AML/KYC, tax, consumer protection, etc.). Ulixai does not supervise or assess the Lawyer's advice.

**Professional capacity (B2B).** The Lawyer confirms they act **exclusively for professional purposes**. Consumer protection regimes do not apply to the Ulixai–Lawyer relationship.

---

## 4. Account, Checks and Security

Valid right to practice in at least one jurisdiction; identity/qualification documents; manual review (which may include video and AML/KYC checks). Accuracy and updates are the Lawyer's duty; one account per Lawyer. Keep credentials secure and report compromise immediately.

---

## 5. Use Rules – Conflicts, Confidentiality, No Circumvention

**Conflicts.** Screen for conflicts before any advice; withdraw and inform the User if a conflict exists. **Confidentiality.** Maintain privilege and confidentiality under the Country of Intervention's law. **No circumvention.** Ulixai takes no commission on legal fees. Each new Connection with a new User via the Platform triggers the Connection Fee. Avoiding the Platform to evade fees on a new introduction is prohibited. **Prohibited conduct** includes identity fraud, illegal content, manipulation, collusion/boycott, sanctions/export breaches, or any unlawful activity. **Availability** is "as is"; access may be restricted where required by law.

---

## 6. Lawyer–User Relationship (Off-Platform)

After the Connection, parties may contract **off-Platform**. Ulixai does not set or collect the Lawyer's fees (except via the single-payment mechanism below). The Lawyer provides local fee agreements, handles taxes, and complies with local rules.

---

## 7. Fees, Single Payment and Taxes

**Flat Connection Fee.** EUR 19 or USD 25 per Connection, exclusive of taxes and payment processor charges. Ulixai may change amounts and/or publish local schedules by country/currency with prospective effect.

**Single payment & split.** The User makes **one payment** via the Platform covering (i) the Lawyer's fee (as agreed) and (ii) Ulixai's Connection Fee. Ulixai (or its processor) collects, **deducts** its Fee, then **remits** the remainder to the Lawyer, who **authorizes** such deductions and allocations.

**Due & non-refundable.** The Connection Fee is **earned upon** Connection and **non-refundable** (subject to Ulixai's discretionary goodwill **to the extent permitted by law** in case of Platform-only failure).

**User refund.** If granted, refunds are **borne by the Lawyer's share**: Ulixai may **withhold/offset** against future payouts or request reimbursement if none are due.

**FX & taxes.** Processor FX rates/fees may apply; the Lawyer is responsible for all applicable taxes; Ulixai collects/remits VAT or local equivalent on the Connection Fee where required. **Set-off** authorized.

---

## 8. Payments – AML/KYC – Sanctions

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

## 12. Governing Law – ICC Arbitration – Estonian Courts – Class Actions

**Substantive law:** for each Connection, the **laws of the Country of Intervention** govern the Ulixai–Lawyer relationship, subject to mandatory local rules and peremptory international norms.

**Mandatory ICC arbitration** for any Ulixai–Lawyer dispute. **Seat: Tallinn (Estonia). Language: French.** Tribunal applies the **substantive law** defined above. Proceedings are **confidential**.

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
                <span className="mx-1 text-white/40">•</span>
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
                {/* Aucune note/avis affichés */}
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

        {/* Bandeau points clés */}
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
                <Shield className="w-4 h-4" /> Sécurisé
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
                {/* Flèche retirée sur ce CTA comme demandé */}
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
