import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Users,
  Shield,
  Check,
  Globe,
  Clock,
  Languages,
  Sparkles,
  CreditCard,
  Phone,
  DollarSign,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

const TermsClients: React.FC = () => {
  const { language } = useApp();

  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = useState<'fr' | 'en'>(
    (language as 'fr' | 'en') || 'fr'
  );

  // Reste aligné avec la langue globale si elle change
  useEffect(() => {
    if (language) setSelectedLanguage(language as 'fr' | 'en');
  }, [language]);

  // Récupération du dernier document actif depuis Firestore (type: "terms")
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, 'legal_documents'),
          where('type', '==', 'terms'),
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

  // Traductions UI
  const translations = {
    fr: {
      title: 'CGU Clients',
      subtitle: "Conditions générales d'utilisation pour les clients",
      lastUpdated: 'Version 2.2 – Dernière mise à jour : 16 juin 2025',
      loading: 'Chargement...',
      languageToggle: 'Changer de langue',
      keyFeatures: 'Points clés',
      features: [
        'Paiement sécurisé',
        'Remboursement si pas de mise en relation',
        '3 tentatives d’appel',
        'Prestataires vérifiés',
      ],
      anchorTitle: 'Sommaire',
      editHint: 'Document éditable depuis la console admin',
      heroBadge: 'Nouveau — Conditions mises à jour',
      contactUs: 'Nous contacter',
      contactForm: 'Formulaire de contact',
      readyToUse: 'Prêt à utiliser SOS Expat ?',
      readySubtitle:
        'Réservez un appel avec un avocat ou un aidant en quelques minutes, partout dans le monde.',
      seeHowItWorks: 'Voir comment ça marche',
    },
    en: {
      title: 'Client Terms',
      subtitle: 'General terms of use for customers',
      lastUpdated: 'Version 2.2 – Last updated: 16 June 2025',
      loading: 'Loading...',
      languageToggle: 'Switch language',
      keyFeatures: 'Key features',
      features: [
        'Secure payment',
        'Refund if no connection',
        '3 call attempts',
        'Verified providers',
      ],
      anchorTitle: 'Overview',
      editHint: 'Document editable from the admin console',
      heroBadge: 'New — Terms updated',
      contactUs: 'Contact us',
      contactForm: 'Contact Form',
      readyToUse: 'Ready to use SOS Expat?',
      readySubtitle:
        'Book a call with a lawyer or a helper in minutes, anywhere in the world.',
      seeHowItWorks: 'See how it works',
    },
  };

  const t = translations[selectedLanguage];

  const handleLanguageChange = (newLang: 'fr' | 'en') => {
    setSelectedLanguage(newLang);
  };

  // ------- Parser Markdown (aligné avec TermsExpats / TermsLawyers) -------
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

      // H2 (avec numéro optionnel)
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
        const subtitle = line.substring(4).replace(/\*\*/g, '');
        elements.push(
          <h3 key={currentIndex++} className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-blue-500 pl-4">
            {subtitle}
          </h3>
        );
        continue;
      }

      // Points numérotés 1.1 / 2.4 / …
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

      // Ligne entièrement en gras
      if (line.startsWith('**') && line.endsWith('**')) {
        const boldText = line.slice(2, -2);
        elements.push(
          <div key={currentIndex++} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 my-6">
            <p className="font-bold text-gray-900 text-lg">{boldText}</p>
          </div>
        );
        continue;
      }

      // Bloc contact spécial
      if (
        line.toLowerCase().includes('contact form') ||
        line.toLowerCase().includes('formulaire de contact') ||
        line.toLowerCase().includes('http://localhost:5174/contact')
      ) {
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-8 my-8 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold shadow-lg">
                15
              </span>
              {selectedLanguage === 'fr' ? 'Contact' : 'Contact'}
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
              {t.contactForm}
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

  // --------- Contenu par défaut (bilingue, selon la langue) ----------
  const defaultFr = `
# Conditions Générales – Clients (Global)

**SOS Expat d’Ulixai OÜ** (la « Plateforme », « SOS », « nous »)

**Version 2.2 – Dernière mise à jour : 16 juin 2025**

---

## 1. Objet et champ d’application

1.1. Les présentes conditions générales (« CGV ») régissent l’utilisation de la Plateforme par toute personne physique ou morale qui crée un compte client et réserve un service via la Plateforme (le « Client »).

1.2. **Rôle d’Ulixai.** SOS Expat est une plateforme de mise en relation : (i) avec des avocats indépendants (« Avocats »), et/ou (ii) avec des expatriés aidants indépendants (« Aidants »). Ulixai n’est pas un cabinet d’avocats, ne fournit aucun conseil juridique, médical, fiscal ou réglementé, et n’est pas partie au contrat de prestation conclu entre le Client et le prestataire (Avocat/Aidant).

1.3. **Acceptation électronique (click-wrap).** En cochant la case d’acceptation et/ou en utilisant la Plateforme, le Client accepte les présentes CGV (signature électronique). SOS peut conserver des preuves techniques (horodatage, identifiants).

1.4. **Modifications.** Nous pouvons mettre à jour les CGV et/ou les tarifs/frais avec effet prospectif par publication sur la Plateforme. La poursuite d’usage vaut acceptation.

---

## 2. Comptes, éligibilité et usage

2.1. **Âge et capacité.** Le Client déclare avoir 18 ans révolus et la capacité juridique. Pour les personnes morales, l’utilisateur déclare être habilité à engager la société.

2.2. **Exactitude des informations.** Les informations fournies (identité, moyens de contact, pays, objet de la demande) doivent être exactes et à jour.

2.3. **Usage conforme.** Le Client s’interdit toute utilisation illicite ou abusive (fraude, contenu illégal, harcèlement, atteinte aux droits de tiers, détournement des flux de paiement, etc.). Aucun usage pour des situations médicales ou vitales d’urgence ; SOS n’est pas un service d’urgence.

2.4. **Disponibilité.** La Plateforme est fournie « en l’état » : aucune disponibilité ininterrompue n’est garantie (maintenance, incidents, force majeure).

---

## 3. Nature des services réservables

3.1. **Appels avec Avocats.** Consultations courtes d’orientation (par ex. 20 minutes). L’Avocat demeure seul responsable de ses conseils et du respect de sa déontologie/lois locales.

3.2. **Appels avec Aidants.** Aide non réglementée (orientation pratique, traduction informelle, contacts locaux…). Aucun conseil juridique/médical/réglementé sans licence locale adéquate.

3.3. **Aucune garantie.** Nous ne garantissons ni l’issue, ni la qualité, ni l’adéquation à un besoin particulier, ni la disponibilité des prestataires.

---

## 4. Prix, devises et frais de mise en relation

4.1. **Affichage des prix.** Le prix total affiché au moment de la réservation inclut : (i) la rémunération du prestataire (Avocat/Aidant) fixée selon l’offre présentée, et (ii) les frais de mise en relation dus à SOS (forfait).

4.2. **Frais de mise en relation (forfait).** 19 € (EUR) ou 25 $ (USD) par mise en relation (hors taxes), intégrés dans le prix total. SOS peut modifier ce forfait et/ou publier des barèmes locaux par pays/devise avec effet prospectif.

4.3. **Devises & conversion.** Les prix peuvent être proposés en plusieurs devises. Des frais/taux de change du prestataire de paiement peuvent s’appliquer.

4.4. **Taxes.** Les prix affichés incluent, le cas échéant, la TVA ou taxes applicables sur les frais de mise en relation. Les Prestataires demeurent responsables de leurs propres obligations fiscales.

---

## 5. Réservation, appel et tentatives de contact

5.1. **Définition de « mise en relation ».** Est réputée intervenue : (a) la transmission des coordonnées Client–Prestataire, et/ou (b) l’ouverture par la Plateforme d’un canal d’appel/messagerie/visio, et/ou (c) l’acceptation par le Prestataire d’une demande du Client.

5.2. **Tentatives d’appel.** En cas d’appel immédiat : la Plateforme effectue jusqu’à trois (3) tentatives sur une fenêtre d’environ 15 minutes (sauf indication différente in-app).

5.3. **Indisponibilité du prestataire.** Si aucune mise en relation n’a pu être réalisée après les tentatives, la réservation est annulée et le Client est remboursé intégralement du prix total payé.

5.4. **Non-réponse du Client.** Si la mise en relation a eu lieu (au sens 5.1) mais que le Client n’aboutit pas à un échange effectif (non-réponse, occupation, refus, arrêt prématuré), le paiement demeure dû et non remboursable.

5.5. **Qualité de la communication.** Le Client doit se trouver en zone de couverture suffisante et utiliser un équipement compatible. SOS n’est pas responsable des coupures/réseaux tiers.

---

## 6. Droit de rétractation (consommateurs) & exécution immédiate

6.1. **Information.** Si le Client est consommateur et la loi impérative locale prévoit un droit de rétractation, celui-ci peut s’exercer dans les délais légaux sauf si le Client demande l’exécution immédiate du service.

6.2. **Renonciation.** En réservant un appel immédiat ou programmé avant l’expiration du délai légal, le Client demande l’exécution immédiate et reconnaît que, une fois la prestation pleinement exécutée, il perd son droit de rétractation. En cas d’exécution partielle avant rétractation, le Client doit payer la partie déjà fournie et les frais de mise en relation, non remboursables.

6.3. **Formalisme.** La Plateforme recueille l’acceptation explicite de ces points lors de la réservation, lorsque requis.

---

## 7. Paiement, sécurité, rétrofacturations

7.1. **Paiement unique & répartition.** Le Client règle un paiement unique via la Plateforme couvrant (i) la part Prestataire et (ii) les frais de mise en relation. SOS (ou son prestataire de paiement) encaisse, déduit ses frais, puis reverse le solde au Prestataire.

7.2. **Sécurité.** Les paiements transitent par des prestataires de paiement tiers. Des contrôles KYC/LCB-FT peuvent s’appliquer.

7.3. **Rétrofacturations/contestation.** En cas de litige de paiement, SOS peut transmettre au prestataire de paiement les données strictement nécessaires et suspendre des services/paiements liés.

7.4. **Compensation.** Si un remboursement est accordé au Client, la part correspondante est prélevée sur le prestataire concerné ; SOS peut compenser sur ses paiements futurs.

---

## 8. Annulations et remboursements

8.1. **Général.** Sauf dispositions légales impératives :
- les frais de mise en relation sont non remboursables dès la mise en relation (5.1) ;
- la part Prestataire est non remboursable une fois la prestation commencée, sauf geste commercial du Prestataire.

8.2. **Annulation par le Client avant mise en relation.** Remboursement intégral.

8.3. **Annulation par le Prestataire.** Remboursement intégral. SOS peut proposer un re-routing vers un autre prestataire disponible.

8.4. **Cas techniques imputables à SOS.** Remboursement ou re-crédit à la discrétion de SOS, dans la mesure permise par la loi.

---

## 9. Comportements, sécurité et contenus

9.1. **Respect.** Le Client s’engage à un comportement respectueux, à ne pas enregistrer ni diffuser l’échange sans consentement légalement requis, et à ne pas solliciter d’actes illégaux.

9.2. **Contenus fournis.** Les informations transmises doivent être loyales, exactes et licites. Le Client garantit SOS et le Prestataire contre toute réclamation liée à des contenus illégaux qu’il fournirait.

9.3. **Signalement.** Tout abus peut être signalé via le formulaire de contact.

---

## 10. Données personnelles

10.1. **Rôles.** Pour les données strictement nécessaires à la mise en relation, SOS et le Prestataire agissent chacun en responsable de traitement pour leurs finalités propres.

10.2. **Bases & finalités.** Exécution du contrat (réservation), intérêts légitimes (sécurité, prévention de la fraude, amélioration), compliance (LCB-FT/sanctions) et consentement si requis.

10.3. **Transferts internationaux** possibles avec garanties appropriées.

10.4. **Droits & contact.** Exercice via le formulaire de contact de la Plateforme.

10.5. **Sécurité.** Mesures techniques/organisationnelles raisonnables ; notification des violations requises par la loi.

---

## 11. Propriété intellectuelle

La Plateforme, ses marques, logos, bases de données et contenus sont protégés. Aucun droit n’est cédé au Client. L’usage est strictement limité à un accès personnel conformément aux CGV.

---

## 12. Responsabilité

12.1. **Prestataires indépendants.** Le Client reconnaît que les Avocats et Aidants sont indépendants. SOS n’est pas responsable des conseils/services fournis ni de leur résultat.

12.2. **Limitations.** Dans la mesure permise par la loi, la responsabilité de SOS pour un dommage direct prouvé est limitée au prix total payé par le Client pour la réservation concernée. SOS n’est pas responsable des dommages indirects/spéciaux/consécutifs (perte de chance, de profits, d’image, etc.), dans la mesure permise.

12.3. **Aucune garantie.** SOS ne garantit pas la disponibilité continue de la Plateforme ni l’absence d’erreurs.

---

## 13. Droit applicable, règlement des litiges et tribunaux compétents

13.1. **Droit matériel.** Pour chaque service couvrant un pays donné, la relation SOS–Client est régie par les lois du pays d’intervention sans priver le Client consommateur de ses droits impératifs de résidence. À titre supplétif, le droit estonien régit l’interprétation/validité des CGV et toute question non régie par ce droit local.

13.2. **Arbitrage CCI (option consommateur) / obligatoire non-consommateur.**
- **Client non-consommateur (B2B)** : arbitrage CCI obligatoire, siège : Tallinn (Estonie), langue : français, droit matériel selon 13.1, procédure confidentielle.
- **Client consommateur** : option de recourir à l’arbitrage CCI (mêmes modalités) ou aux juridictions compétentes en vertu des lois impératives applicables.

13.3. **Compétence des tribunaux estoniens (Tallinn).** Pour toute demande non arbitrable, l’exécution des sentences ou les mesures urgentes, compétence exclusive des tribunaux d’Estonie (Tallinn), sans préjudice des droits impératifs du consommateur.

13.4. **Renonciation aux actions collectives (dans la mesure permise).** Toute action collective/de groupe/représentative est exclue, sauf si la loi impérative du lieu de résidence du consommateur en dispose autrement.

---

## 14. Résiliation/suspension et divers

14.1. **Suspension.** SOS peut suspendre/fermer le compte en cas de fraude, non-conformité, abus ou risque juridique.

14.2. **Intégralité.** Les CGV constituent l’accord complet entre SOS et le Client pour l’usage de la Plateforme.

14.3. **Langues.** Des traductions peuvent être fournies ; le français prévaut pour l’interprétation.

14.4. **Nullité partielle.** Si une stipulation est nulle/inapplicable, le reste demeure en vigueur ; elle pourra être remplacée par une clause valide d’effet équivalent.

14.5. **Non-renonciation.** Le fait de ne pas exercer un droit n’emporte pas renonciation.

---

## 15. Contact

**Formulaire de contact (support & demandes légales)** : **http://localhost:5174/contact**
`;

  const defaultEn = `
# General Terms – Customers (Global)

**SOS Expat by Ulixai OÜ** (the “Platform”, “SOS”, “we”)

**Version 2.2 – Last updated: 16 June 2025**

---

## 1. Purpose and Scope

These Terms govern the use of the Platform by any person or entity creating a customer account and booking a service (the “Customer”). **SOS Expat is a matchmaking platform** connecting Customers with independent **Lawyers** and independent **Helpers**. Ulixai is **not a law firm** and provides no legal/medical/tax/regulated advice and is **not** a party to the Customer–Provider contract.

---

## 2. Accounts, Eligibility and Use

- **18+ and legal capacity.** Corporate users warrant authority.
- **Accurate information** must be provided and kept up to date.
- **No illegal/abusive use**; the Platform is **not** an emergency service.
- **Availability** is “as is.”

---

## 3. Bookable Services

Short legal orientation calls with Lawyers (e.g., 20 minutes) and non-regulated assistance with Helpers. **No guarantees** as to outcome/quality/availability.

---

## 4. Prices, Currencies and Connection Fee

The **total price** shown includes (i) the Provider’s remuneration and (ii) SOS’s **flat Connection Fee**. **Connection Fee:** **EUR 19** or **USD 25** per Connection (excl. taxes), subject to change and/or local schedules with prospective effect. **FX and payment processor charges** may apply. Taxes included where required on the Connection Fee; Providers are responsible for their own taxes.

---

## 5. Booking, Calling and Attempts

A **Connection** occurs upon exchanging contact details and/or opening a call/message/video channel and/or Provider acceptance. Up to **three (3) attempts** within ~15 minutes for immediate calls. **If no Connection** after attempts, **full refund**. If a Connection occurred but the Customer fails to engage (no answer/refusal/early termination), **payment remains due** and non-refundable.

---

## 6. Withdrawal Right (Consumers) & Immediate Performance

Where mandatory local law grants a withdrawal right, it may apply unless the Customer requests **immediate performance**. By booking an immediate or near-term call, the Customer requests immediate performance and acknowledges that once **fully performed**, the withdrawal right is lost; if **partially performed** before withdrawal, the Customer must pay for the part performed and the **non-refundable Connection Fee**. The Platform collects **explicit consent** where required.

---

## 7. Payment, Security, Chargebacks

**Single payment & split:** Customer pays one amount covering the Provider’s share and the Connection Fee. SOS (or its processor) **collects**, **deducts** its Fee, and **remits** the remainder to the Provider. Payments via third-party processors; **AML/KYC** may apply. In case of **chargeback/dispute**, SOS may share strictly necessary data with the processor and suspend related services/payouts. **Set-off:** refunds to Customers are borne by the Provider’s share; SOS may offset against future payouts.

---

## 8. Cancellations and Refunds

Unless mandatory law provides otherwise: the **Connection Fee is non-refundable** once a Connection occurs; the Provider’s share is non-refundable once performance starts, save goodwill by the Provider. **Before Connection:** full refund. **Provider cancellation:** full refund. **Platform-fault technical cases:** refund or credit at SOS’s discretion to the extent permitted by law.

---

## 9. Conduct, Safety and Content

Respectful behaviour; no unlawful recording/distribution; no solicitation of illegal acts. Customer information must be lawful, accurate and fair. Abuse can be reported via the contact form.

---

## 10. Data Protection

Separate controllers: **SOS** and the **Provider** each process personal data for their own purposes (contract performance, security/fraud prevention/service improvement, AML/sanctions, consent where applicable). **International transfers** with safeguards where required. **Rights & contact** via the contact form. Security measures; breach notifications as required.

---

## 11. IP

Platform IP remains with Ulixai; Customer receives a **personal, limited** right of access.

---

## 12. Liability

Providers are **independent**; SOS is not liable for their services/results. To the maximum extent permitted, SOS’s **liability cap** for proven direct damage is the **total price paid** for the relevant booking; **no indirect/special/consequential damages**, where permitted.

---

## 13. Governing Law, Disputes and Courts

**Substantive law:** for each country covered by the service, the laws of the **Country of Intervention** govern the SOS–Customer relationship without prejudice to the Customer’s mandatory consumer rights at residence. **Supplementary:** Estonian law governs interpretation/validity and any matter not governed by local law. **ICC arbitration:** mandatory for **non-consumers** (seat: Tallinn, Estonia; language: French; confidential). **Consumers** may opt-in to ICC arbitration or use courts available under mandatory law. **Estonian courts (Tallinn)** have exclusive jurisdiction for non-arbitrable claims, award enforcement and urgent measures, subject to consumer mandatory rights. **Class/collective actions are waived** to the extent permitted by law.

---

## 14. Termination/Suspension and Miscellaneous

We may suspend/close accounts for fraud, non-compliance, abuse or legal risk. **French prevails** for interpretation. **Severability** and **no-waiver** apply. Notices by posting/in-app or via contact form.

---

## 15. Contact

**Contact form (support & legal requests):** **http://localhost:5174/contact**
`;

  const defaultContent = selectedLanguage === 'fr' ? defaultFr : defaultEn;

  // Sommaire (UI)
  const anchorMap = useMemo(
    () => [
      { num: 1, label: selectedLanguage === 'fr' ? 'Objet et champ d’application' : 'Purpose and Scope' },
      { num: 2, label: selectedLanguage === 'fr' ? 'Comptes & usage' : 'Accounts & Use' },
      { num: 3, label: selectedLanguage === 'fr' ? 'Services réservables' : 'Bookable Services' },
      { num: 4, label: selectedLanguage === 'fr' ? 'Prix & frais' : 'Prices & Fees' },
      { num: 5, label: selectedLanguage === 'fr' ? 'Réservation & appels' : 'Booking & Calls' },
      { num: 6, label: selectedLanguage === 'fr' ? 'Rétractation' : 'Withdrawal Right' },
      { num: 7, label: selectedLanguage === 'fr' ? 'Paiement & sécurité' : 'Payment & Security' },
      { num: 8, label: selectedLanguage === 'fr' ? 'Annulations & remboursements' : 'Cancellations & Refunds' },
      { num: 9, label: selectedLanguage === 'fr' ? 'Comportements & contenus' : 'Conduct & Content' },
      { num: 10, label: selectedLanguage === 'fr' ? 'Données personnelles' : 'Data Protection' },
      { num: 11, label: selectedLanguage === 'fr' ? 'Propriété intellectuelle' : 'Intellectual Property' },
      { num: 12, label: selectedLanguage === 'fr' ? 'Responsabilité' : 'Liability' },
      { num: 13, label: selectedLanguage === 'fr' ? 'Droit applicable & litiges' : 'Governing Law & Disputes' },
      { num: 14, label: selectedLanguage === 'fr' ? 'Résiliation & divers' : 'Termination & Misc.' },
      { num: 15, label: selectedLanguage === 'fr' ? 'Contact' : 'Contact' },
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
                  <FileText className="w-12 h-12 text-white" />
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
                  { icon: <CreditCard className="w-6 h-6" />, text: t.features[0], gradient: 'from-green-500 to-emerald-500' },
                  { icon: <Shield className="w-6 h-6" />, text: t.features[1], gradient: 'from-blue-500 to-indigo-500' },
                  { icon: <Phone className="w-6 h-6" />, text: t.features[2], gradient: 'from-yellow-500 to-orange-500' },
                  { icon: <Users className="w-6 h-6" />, text: t.features[3], gradient: 'from-red-500 to-orange-500' },
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

              <div className="mt-8 flex items-center justify-center gap-4">
                <a
                  href="http://localhost:5174/contact"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white font-bold border-2 border-red-400/50 hover:scale-105 transition-all"
                >
                  <Globe className="w-5 h-5" />
                  <span>{t.contactUs}</span>
                </a>
                <Link
                  to="/"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/50 transition-all duration-300 backdrop-blur-sm font-semibold"
                >
                  <Shield className="w-5 h-5" />
                  <span>{t.seeHowItWorks}</span>
                </Link>
              </div>
            </header>
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
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">{t.readyToUse}</h2>
            <p className="text-lg sm:text-2xl text-white/95 mb-10 leading-relaxed">{t.readySubtitle}</p>

            <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-white/90">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <Clock className="w-4 h-4" /> <span>3 {selectedLanguage === 'fr' ? 'tentatives' : 'attempts'}</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <DollarSign className="w-4 h-4" /> <span>EUR 19 / USD 25</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <Globe className="w-4 h-4" /> Global
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <a
                href="http://localhost:5174/contact"
                className="group relative overflow-hidden border-2 border-white bg-transparent text-white px-10 py-5 rounded-3xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:bg-white/10 flex items-center gap-3"
              >
                <Globe className="w-5 h-5" />
                <span>{t.contactUs}</span>
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/30" />
              </a>
              <Link
                to="/"
                className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-10 py-5 rounded-3xl font-black text-lg transition-all duration-300 hover:scale-110 hover:shadow-2xl flex items-center gap-3"
              >
                <Shield className="w-5 h-5" />
                <span>{t.seeHowItWorks}</span>
                {/* Pas de flèche ici */}
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-black/5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default TermsClients;
