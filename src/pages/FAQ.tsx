import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Phone,
  Mail,
  MessageCircle,
  HelpCircle,
  CreditCard,
  Shield,
  Users,
  Globe,
  FileText,
  AlertTriangle,
  Settings
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import SEOHead from '../components/layout/SEOHead';
import { useApp } from '../contexts/AppContext';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
}

const FAQ: React.FC = () => {
  const { language } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const faqData: FAQItem[] = [
    // PAIEMENT ET FACTURATION
    {
      id: '1',
      category: 'payment',
      question: language === 'fr' ? 'Comment fonctionne le paiement ?' : 'How does payment work?',
      answer: language === 'fr'
        ? 'Pour les urgences immÃ©diates, utilisez notre service S.O.S Appel. Pour les autres demandes, passez par le formulaire de contact (onglet "Contact").'
        : 'For immediate emergencies, use our S.O.S Call service. For other requests, please use the contact form ("Contact" tab).',
      tags: ['paiement', 'stripe', 'prix', 'sÃ©curitÃ©', 'carte bancaire']
    },
    {
      id: '2',
      category: 'payment',
      question: language === 'fr' ? 'Puis-je payer en plusieurs fois ?' : 'Can I pay in installments?',
      answer: language === 'fr'
        ? 'Non, les paiements se font en une seule fois car nos services sont des consultations ponctuelles. Les tarifs sont accessibles : 19â‚¬ / $25 pour un expatriÃ© (30 min) et 49â‚¬ / $55 pour un avocat (20 min).'
        : 'No, payments are one-off as our services are single consultations. Pricing is accessible: â‚¬19 / $25 for an expat (30 min) and â‚¬49 / $55 for a lawyer (20 min).',
      tags: ['paiement', 'Ã©chelonnement', 'tarif', 'consultation']
    },
    {
      id: '3',
      category: 'billing',
      question: language === 'fr' ? 'Puis-je obtenir une facture ?' : 'Can I get an invoice?',
      answer: language === 'fr'
        ? "Oui, vous recevez automatiquement une facture PDF aprÃ¨s chaque appel, tÃ©lÃ©chargeable depuis votre tableau de bord. La facture contient les informations essentielles : service utilisÃ©, durÃ©e, prix et informations lÃ©gales complÃ¨tes."
        : 'Yes, you automatically receive a PDF invoice after each call, downloadable from your dashboard. The invoice includes essentials: service used, duration, price, and complete legal information.',
      tags: ['facture', 'pdf', 'tÃ©lÃ©chargement', 'comptabilitÃ©', 'assurance']
    },
    {
      id: '4',
      category: 'billing',
      question: language === 'fr' ? 'Quels sont les prix ?' : 'What are the prices?',
      answer: language === 'fr'
        ? 'Appel avec un avocat : 20 minutes pour 49â‚¬ / $55. Appel avec un expatriÃ© : 30 minutes pour 19â‚¬ / $25.'
        : 'Call with a lawyer: 20 minutes for â‚¬49 / $55. Call with an expat: 30 minutes for â‚¬19 / $25.',
      tags: ['prix', 'tarifs', 'avocat', 'expatriÃ©']
    },

    // APPELS ET DISPONIBILITÃ‰
    {
      id: '5',
      category: 'calls',
      question: language === 'fr' ? "Que se passe-t-il si l'expert n'est pas disponible ?" : 'What happens if the expert is not available?',
      answer: language === 'fr'
        ? "Si l'expert ne rÃ©pond pas aprÃ¨s 3 tentatives d'appel automatiques espacÃ©es de 2 minutes, un remboursement intÃ©gral est dÃ©clenchÃ© immÃ©diatement. Vous pouvez ensuite choisir un autre expert ou rÃ©essayer plus tard."
        : "If the expert doesn't answer after 3 automatic call attempts spaced 2 minutes apart, a full refund is issued immediately. You can then choose another expert or try again later.",
      tags: ['appel', 'disponibilitÃ©', 'remboursement', 'expert', 'automatique']
    },
    {
      id: '6',
      category: 'calls',
      question: language === 'fr' ? 'Combien de temps dure un appel ?' : 'How long does a call last?',
      answer: language === 'fr'
        ? "Les appels avec un avocat durent 20 minutes (49â‚¬ / $55). Les appels avec un expatriÃ© durent 30 minutes (19â‚¬ / $25). Un dÃ©compte visible affiche le temps restant."
        : 'Calls with a lawyer last 20 minutes (â‚¬49 / $55). Calls with an expat last 30 minutes (â‚¬19 / $25). A visible countdown shows the remaining time.',
      tags: ['durÃ©e', 'temps', 'avocat', 'expatriÃ©', 'dÃ©compte', 'tarif']
    },
    {
      id: '7',
      category: 'calls',
      question: language === 'fr' ? 'Puis-je prolonger un appel ?' : 'Can I extend a call?',
      answer: language === 'fr'
        ? "Non, les appels ont une durÃ©e fixe pour garantir l'Ã©quitÃ© tarifaire. Si vous avez besoin de plus de temps, vous pouvez programmer un nouvel appel immÃ©diatement aprÃ¨s."
        : 'No, calls have a fixed duration to ensure pricing fairness. If you need more time, you can schedule a new call immediately after.',
      tags: ['prolongation', 'durÃ©e', 'nouveau', 'appel', 'tarif', 'Ã©quitÃ©']
    },
    {
      id: '8',
      category: 'calls',
      question: language === 'fr' ? 'Les appels sont-ils enregistrÃ©s ?' : 'Are calls recorded?',
      answer: language === 'fr'
        ? "Non, aucun appel n'est enregistrÃ©. Seules les mÃ©tadonnÃ©es (durÃ©e, date, tarif) sont conservÃ©es pour la facturation."
        : 'No, calls are not recorded. Only metadata (duration, date, rate) is kept for billing.',
      tags: ['enregistrement', 'confidentialitÃ©', 'privÃ©', 'mÃ©tadonnÃ©es', 'sÃ©curitÃ©']
    },

    // COMPTE ET INSCRIPTION
    {
      id: '9',
      category: 'account',
      question: language === 'fr' ? 'Comment crÃ©er un compte ?' : 'How to create an account?',
      answer: language === 'fr'
        ? 'Cliquez sur "Sâ€™inscrire" et choisissez votre rÃ´le : Client, Avocat (diplÃ´me requis) ou ExpatriÃ© aidant (justificatif dâ€™identitÃ©). Lâ€™inscription client est gratuite et immÃ©diate. Les profils avocat/expatriÃ© nÃ©cessitent une validation manuelle sous 5 minutes.'
        : 'Click "Sign up" and choose your role: Client, Lawyer (degree required), or Expat helper (ID required). Client registration is free and immediate. Lawyer/expat profiles are manually validated within 5 minutes.',
      tags: ['inscription', 'compte', 'rÃ´le', 'gratuit', 'validation', 'diplÃ´me']
    },
    {
      id: '10',
      category: 'account',
      question: language === 'fr' ? 'Puis-je modifier mes informations personnelles ?' : 'Can I modify my personal information?',
      answer: language === 'fr'
        ? "Oui, vous pouvez modifier vos informations depuis votre tableau de bord : nom, prÃ©nom, tÃ©lÃ©phone, pays de rÃ©sidence, langue prÃ©fÃ©rÃ©e. Le numÃ©ro de tÃ©lÃ©phone est crucial pour recevoir les appels."
        : 'Yes, you can edit your information from your dashboard: name, phone, country of residence, preferred language. The phone number is crucial for receiving calls.',
      tags: ['modification', 'informations', 'tÃ©lÃ©phone', 'dashboard', 'profil']
    },
    {
      id: '11',
      category: 'account',
      question: language === 'fr' ? 'Comment supprimer mon compte ?' : 'How to delete my account?',
      answer: language === 'fr'
        ? 'Faites votre demande via le formulaire de contact. Nous la traiterons sous 48h conformÃ©ment Ã  la rÃ©glementation. Les donnÃ©es seront dÃ©finitivement supprimÃ©es, hors obligations lÃ©gales.'
        : 'Submit your request via the contact form. We will process it within 48 hours in accordance with regulations. Your data will be permanently deleted, except for any legal retention obligations.',
      tags: ['suppression', 'compte', 'rgpd', 'donnÃ©es', 'support', 'dÃ©finitif']
    },

    // EXPERTS ET VALIDATION
    {
      id: '12',
      category: 'experts',
      question: language === 'fr' ? 'Comment les experts sont-ils vÃ©rifiÃ©s ?' : 'How are experts verified?',
      answer: language === 'fr'
        ? "Tous nos experts sont vÃ©rifiÃ©s manuellement sous 5 minutes. Avocats : diplÃ´me, inscription au barreau, assurance RC pro. ExpatriÃ©s : preuve de rÃ©sidence (facture, bail) et expÃ©rience (â‰¥ 1 an). VÃ©rification d'identitÃ© obligatoire."
        : 'All experts are manually verified within 5 minutes. Lawyers: degree, bar admission, liability insurance. Expats: proof of residence (bill, lease) and experience (â‰¥ 1 year). Identity verification required.',
      tags: ['vÃ©rification', 'diplÃ´me', 'sÃ©curitÃ©', 'validation', 'barreau', 'assurance', 'rÃ©sidence']
    },
    {
      id: '13',
      category: 'experts',
      question: language === 'fr' ? 'Puis-je choisir mon expert ?' : 'Can I choose my expert?',
      answer: language === 'fr'
        ? "Oui, parcourez les profils, spÃ©cialitÃ©s, notes, avis et pays d'expertise. Si l'expert prÃ©fÃ©rÃ© n'est pas disponible, des alternatives similaires sont proposÃ©es."
        : 'Yes, browse profiles, specialties, ratings, reviews, and countries of expertise. If your preferred expert is unavailable, similar alternatives are suggested.',
      tags: ['choix', 'expert', 'profil', 'spÃ©cialitÃ©s', 'notes', 'avis', 'disponible']
    },
    {
      id: '14',
      category: 'experts',
      question: language === 'fr' ? 'Comment devenir expert sur la plateforme ?' : 'How to become an expert on the platform?',
      answer: language === 'fr'
        ? "Avocat : diplÃ´me de droit + barreau + 2 ans d'expÃ©rience min. ExpatriÃ© aidant : rÃ©sidence Ã  l'Ã©tranger + 1 an min d'expÃ©rience + piÃ¨ce d'identitÃ©. Inscription via les formulaires dÃ©diÃ©s, validation sous 5 minutes."
        : 'Lawyer: law degree + bar admission + 2 years min experience. Expat helper: residence abroad + 1 year min exp + ID. Register via the dedicated forms; validation within 5 minutes.',
      tags: ['devenir', 'expert', 'avocat', 'expatriÃ©', 'diplÃ´me', 'expÃ©rience', 'validation']
    },

    // TECHNIQUE ET SÃ‰CURITÃ‰
    {
      id: '15',
      category: 'technical',
      question: language === 'fr' ? 'Quels sont les problÃ¨mes techniques courants ?' : 'What are common technical issues?',
      answer: language === 'fr'
        ? "ProblÃ¨mes frÃ©quents : numÃ©ro de tÃ©lÃ©phone incorrect, appels bloquÃ©s par l'opÃ©rateur, connexion instable. Solutions : vÃ©rifiez votre numÃ©ro, autorisez temporairement les appels inconnus, utilisez le Wi-Fi. Support technique 24/7 via chat."
        : 'Common issues: wrong phone number, calls blocked by the carrier, unstable connection. Solutions: check your number, temporarily allow unknown calls, use Wi-Fi. 24/7 tech support via live chat.',
      tags: ['technique', 'connexion', 'tÃ©lÃ©phone', 'support', 'wifi', 'opÃ©rateur', 'chat']
    },
    {
      id: '16',
      category: 'technical',
      question: language === 'fr' ? "L'application fonctionne-t-elle sur mobile ?" : 'Does the app work on mobile?',
      answer: language === 'fr'
        ? 'Oui, la plateforme est 100% responsive. Rien Ã  tÃ©lÃ©charger : tout fonctionne dans votre navigateur (Chrome, Safari, Firefox). Interface tactile optimisÃ©e.'
        : 'Yes, the platform is 100% responsive. No download needed: everything runs in your browser (Chrome, Safari, Firefox). Touch interface optimized.',
      tags: ['mobile', 'responsive', 'application', 'navigateur', 'tactile', 'smartphone']
    },
    {
      id: '17',
      category: 'security',
      question: language === 'fr' ? 'Mes donnÃ©es sont-elles protÃ©gÃ©es ?' : 'Is my data protected?',
      answer: language === 'fr'
        ? "Oui, vos donnÃ©es sont chiffrÃ©es (AES-256) et stockÃ©es sur des serveurs sÃ©curisÃ©s en Europe. Authentification Ã  deux facteurs disponible. Nous ne vendons jamais vos informations personnelles. Seules les donnÃ©es nÃ©cessaires Ã  votre demande sont partagÃ©es avec l'expert choisi."
        : 'Yes, your data is encrypted (AES-256) and stored on secure servers in Europe. Two-factor authentication available. We never sell your personal information. Only the data necessary for your request is shared with the chosen expert.',
      tags: ['confidentialitÃ©', 'sÃ©curitÃ©', 'donnÃ©es', 'chiffrement', 'europe', '2fa']
    },

    // PAYS ET COUVERTURE
    {
      id: '18',
      category: 'countries',
      question: language === 'fr' ? 'Dans quels pays le service est-il disponible ?' : 'In which countries is the service available?',
      answer: language === 'fr'
        ? "Le service est disponible dans plus de 120 pays, sauf en France mÃ©tropolitaine. Europe (UK, Allemagne, Espagne, Italieâ€¦), AmÃ©rique du Nord (Canada, USA), Asie (ThaÃ¯lande, Singapour, Japonâ€¦), OcÃ©anie (Australie, Nouvelle-ZÃ©lande), etc."
        : 'The service is available in 120+ countries, except metropolitan France. Europe (UK, Germany, Spain, Italyâ€¦), North America (Canada, USA), Asia (Thailand, Singapore, Japanâ€¦), Oceania (Australia, New Zealand), etc.',
      tags: ['pays', 'international', 'couverture', 'france', 'europe', 'amÃ©rique', 'asie', 'ocÃ©anie']
    },
    {
      id: '19',
      category: 'countries',
      question: language === 'fr' ? "Pourquoi le service n'est-il pas disponible en France ?" : 'Why is the service not available in France?',
      answer: language === 'fr'
        ? "Pour des raisons rÃ©glementaires spÃ©cifiques au marchÃ© franÃ§ais. Nous travaillons activement Ã  l'ouverture. Le service reste disponible pour les FranÃ§ais expatriÃ©s."
        : 'Due to regulatory reasons specific to the French market. We are actively working on availability. The service remains available for French expats.',
      tags: ['france', 'rÃ©glementaire', 'mÃ©tropolitaine', 'expatriÃ©s', 'franÃ§ais', 'disponibilitÃ©']
    },

    // REMBOURSEMENT ET GARANTIES
    {
      id: '20',
      category: 'refund',
      question: language === 'fr' ? 'Comment obtenir un remboursement ?' : 'How to get a refund?',
      answer: language === 'fr'
        ? "Remboursement intÃ©gral immÃ©diat si l'expert ne rÃ©pond pas aprÃ¨s 3 tentatives. Pour d'autres cas (problÃ¨me technique, insatisfaction), faites une demande via le formulaire de contact dans les 24h suivant l'appel. Le crÃ©dit sur votre moyen de paiement peut prendre 3 Ã  5 jours ouvrÃ©s selon la banque."
        : "Immediate full refund if the expert doesn't answer after 3 attempts. For other cases (technical issue, dissatisfaction), submit a request via the contact form within 24 hours of the call. The credit may take 3â€“5 business days to appear depending on your bank.",
      tags: ['remboursement', 'automatique', 'support', 'satisfaction', 'technique', 'dÃ©lai']
    },
    {
      id: '21',
      category: 'refund',
      question: language === 'fr' ? 'Y a-t-il une garantie de satisfaction ?' : 'Is there a satisfaction guarantee?',
      answer: language === 'fr'
        ? "Oui, satisfaction 100%. Si vous n'Ãªtes pas satisfait, faites une demande via le formulaire de contact dans les 24h. Selon la situation : remboursement partiel/total ou nouvel appel gratuit avec un autre expert."
        : 'Yesâ€”100% satisfaction. If you are not satisfied, submit a request via the contact form within 24 hours. Depending on the case: partial/full refund or a free new call with another expert.',
      tags: ['garantie', 'satisfaction', 'remboursement', 'gratuit', 'nouvel', 'appel']
    },

    // LANGUES ET COMMUNICATION
    {
      id: '22',
      category: 'languages',
      question: language === 'fr' ? 'Dans quelles langues puis-je Ãªtre aidÃ© ?' : 'In which languages can I get help?',
      answer: language === 'fr'
        ? 'Principalement franÃ§ais et anglais. Certains experts parlent aussi espagnol, allemand, italien, portugais. Vous pouvez filtrer par langue parlÃ©e.'
        : 'Mainly French and English. Some experts also speak Spanish, German, Italian, Portuguese. You can filter by spoken language.',
      tags: ['langues', 'franÃ§ais', 'anglais', 'espagnol', 'allemand', 'italien', 'filtre']
    },

    // URGENCES ET DISPONIBILITÃ‰
    {
      id: '23',
      category: 'emergency',
      question: language === 'fr' ? 'Le service est-il vraiment disponible 24/7 ?' : 'Is the service really available 24/7?',
      answer: language === 'fr'
        ? 'Oui, la plateforme fonctionne 24h/24, 7j/7. La disponibilitÃ© varie selon les fuseaux horaires. En cas dâ€™urgence absolue, utilisez le bouton "S.O.S Appel" pour Ãªtre mis en relation avec le premier expert disponible.'
        : 'Yes, the platform runs 24/7. Availability varies by time zone. For absolute emergencies, use the "S.O.S Call" button to connect with the first available expert.',
      tags: ['24/7', 'urgence', 'fuseau', 'horaire', 'mondial', 'sos', 'disponible']
    },

    // SPÃ‰CIALITÃ‰S ET DOMAINES
    {
      id: '24',
      category: 'specialties',
      question: language === 'fr' ? 'Quels types de problÃ¨mes puis-je rÃ©soudre ?' : 'What types of problems can I solve?',
      answer: language === 'fr'
        ? "Avocats : immobilier, travail, famille, affaires, pÃ©nal, immigration, fiscalitÃ©. ExpatriÃ©s : dÃ©marches admin, logement, banque, santÃ©, Ã©ducation, transport, culture locale, emploi. Pas d'urgences mÃ©dicales : contactez les services d'urgence locaux."
        : 'Lawyers: real estate, labor, family, business, criminal, immigration, taxation. Expats: admin procedures, housing, banking, health, education, transport, local culture, jobs. No medical emergenciesâ€”contact local emergency services.',
      tags: ['spÃ©cialitÃ©s', 'droit', 'immobilier', 'travail', 'famille', 'administratif', 'logement', 'mÃ©dical']
    },

    // FACTURATION AVANCÃ‰E
    {
      id: '25',
      category: 'billing',
      question: language === 'fr' ? 'Puis-je obtenir un remboursement de mon assurance ?' : 'Can I get reimbursed by my insurance?',
      answer: language === 'fr'
        ? "Cela dÃ©pend de votre contrat. Nos factures PDF contiennent toutes les informations nÃ©cessaires (prestations dÃ©taillÃ©es, numÃ©ro SIRET). Certaines assurances expatriÃ©s remboursent les consultations juridiques. PrÃ©sentez notre facture type Ã  votre assureur."
        : 'It depends on your policy. Our PDF invoices include all required details (itemized services, SIRET number). Some expat insurances reimburse legal consultations. Present our standard invoice to your insurer.',
      tags: ['assurance', 'remboursement', 'facture', 'siret', 'expatriÃ©s', 'juridique', 'contrat']
    }
  ];

  const categories = [
    { id: 'all', name: language === 'fr' ? 'Toutes' : 'All', icon: HelpCircle, count: faqData.length },
    { id: 'payment', name: language === 'fr' ? 'Paiement' : 'Payment', icon: CreditCard, count: faqData.filter(item => item.category === 'payment').length },
    { id: 'calls', name: language === 'fr' ? 'Appels' : 'Calls', icon: Phone, count: faqData.filter(item => item.category === 'calls').length },
    { id: 'billing', name: language === 'fr' ? 'Facturation' : 'Billing', icon: FileText, count: faqData.filter(item => item.category === 'billing').length },
    { id: 'account', name: language === 'fr' ? 'Compte' : 'Account', icon: Users, count: faqData.filter(item => item.category === 'account').length },
    { id: 'experts', name: language === 'fr' ? 'Experts' : 'Experts', icon: Shield, count: faqData.filter(item => item.category === 'experts').length },
    { id: 'technical', name: language === 'fr' ? 'Technique' : 'Technical', icon: Settings, count: faqData.filter(item => item.category === 'technical').length },
    { id: 'security', name: language === 'fr' ? 'SÃ©curitÃ©' : 'Security', icon: Shield, count: faqData.filter(item => item.category === 'security').length },
    { id: 'countries', name: language === 'fr' ? 'Pays' : 'Countries', icon: Globe, count: faqData.filter(item => item.category === 'countries').length },
    { id: 'refund', name: language === 'fr' ? 'Remboursement' : 'Refund', icon: AlertTriangle, count: faqData.filter(item => item.category === 'refund').length },
    { id: 'languages', name: language === 'fr' ? 'Langues' : 'Languages', icon: MessageCircle, count: faqData.filter(item => item.category === 'languages').length },
    { id: 'emergency', name: language === 'fr' ? 'Urgences' : 'Emergency', icon: AlertTriangle, count: faqData.filter(item => item.category === 'emergency').length },
    { id: 'specialties', name: language === 'fr' ? 'SpÃ©cialitÃ©s' : 'Specialties', icon: HelpCircle, count: faqData.filter(item => item.category === 'specialties').length }
  ];

  const filteredFAQ = faqData.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      item.question.toLowerCase().includes(lowerSearch) ||
      item.answer.toLowerCase().includes(lowerSearch) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowerSearch));
    return matchesCategory && matchesSearch;
  });

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <Layout>
      <SEOHead
        title="Questions frÃ©quentes | SOS Expat & Travelers"
        description="Trouvez rapidement les rÃ©ponses Ã  vos questions sur SOS Expat & Travelers. Consultez notre FAQ pour des informations sur les paiements, les appels, les experts et plus encore."
        canonicalUrl="/faq"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqData.map(item => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer
            }
          }))
        }}
      />

      {/* HERO sombre, effet verre + dÃ©gradÃ©s */}
      <div className="min-h-screen bg-gray-950">
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10" />
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
            <span className="inline-flex rounded-full p-[1px] bg-gradient-to-r from-red-500 to-orange-500 mb-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 border border-white/15 backdrop-blur text-white">
                <HelpCircle className="w-4 h-4" />
                <strong className="font-semibold">
                  {language === 'fr' ? 'Centre dâ€™aide' : 'Help center'}
                </strong>
              </span>
            </span>

            <h1 className="text-4xl md:text-6xl font-black leading-tight text-white">
              {language === 'fr' ? 'Questions frÃ©quentes' : 'Frequently Asked Questions'}
            </h1>
            <p className="mt-3 md:mt-4 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              {language === 'fr'
                ? 'Trouvez rapidement des rÃ©ponses sur SOS Expat & Travelers'
                : 'Quickly find answers about SOS Expat & Travelers'}
            </p>

            {/* Barre de recherche */}
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                <input
                  type="text"
                  placeholder={language === 'fr' ? 'Rechercher dans la FAQâ€¦' : 'Search FAQâ€¦'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 text-white placeholder-gray-300 border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm shadow-xl"
                />
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10 group-focus-within:ring-white/30" />
              </div>
            </div>
          </div>
        </section>

        {/* CONTENU */}
        <section className="relative bg-gradient-to-b from-white to-gray-50">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-gradient-to-r from-red-400/10 to-orange-400/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* SIDEBAR catÃ©gories */}
              <aside className="lg:col-span-1">
                <div className="sticky top-6">
                  <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      {language === 'fr' ? 'CatÃ©gories' : 'Categories'}
                    </h3>
                    <div className="space-y-2">
                      {categories.map((category) => {
                        const Icon = category.icon;
                        const isActive = selectedCategory === category.id;
                        return (
                          <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all border ${
                              isActive
                                ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200 text-red-700 shadow-sm'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                            aria-pressed={isActive}
                          >
                            <span className="flex items-center gap-3">
                              <span
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${
                                  isActive
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                <Icon size={16} />
                              </span>
                              <span className="font-medium">{category.name}</span>
                            </span>
                            <span
                              className={`text-sm px-2 py-1 rounded-full ${
                                isActive ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {category.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {(searchTerm.trim().length > 0 || selectedCategory !== 'all') && (
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedCategory('all');
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 bg-gray-900 text-white font-semibold hover:opacity-90 transition"
                        >
                          {language === 'fr' ? 'RÃ©initialiser les filtres' : 'Reset filters'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </aside>

              {/* LISTE FAQ */}
              <main className="lg:col-span-3">
                <div className="space-y-4">
                  {filteredFAQ.map((item) => {
                    const isOpen = openItems.has(item.id);
                    const panelId = `faq-panel-${item.id}`;
                    const buttonId = `faq-button-${item.id}`;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-3xl border overflow-hidden transition-all ${
                          isOpen
                            ? 'border-red-200 bg-gradient-to-br from-red-50 to-orange-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <button
                          id={buttonId}
                          aria-controls={panelId}
                          aria-expanded={isOpen}
                          onClick={() => toggleItem(item.id)}
                          className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-white/60"
                        >
                          <div className="flex items-center gap-3 pr-4">
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${
                                isOpen
                                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              <HelpCircle size={18} />
                            </span>
                            <h3 className="text-lg md:text-xl font-bold text-gray-900">
                              {item.question}
                            </h3>
                          </div>

                          <span
                            className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${
                              isOpen
                                ? 'border-red-300 bg-white text-red-600 rotate-180'
                                : 'border-gray-200 bg-gray-50 text-gray-600'
                            }`}
                            aria-hidden="true"
                          >
                            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </span>
                        </button>

                        {isOpen && (
                          <div id={panelId} role="region" aria-labelledby={buttonId} className="px-6 pb-5">
                            <div className="border-t border-white/60 md:border-white/60 pt-4">
                              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                {item.answer}
                              </p>

                              {/* Tags */}
                              <div className="flex flex-wrap gap-2 mt-4">
                                {item.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex rounded-full p-[1px] bg-gradient-to-r from-red-500 to-orange-500"
                                  >
                                    <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">
                                      {tag}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredFAQ.length === 0 && (
                    <div className="text-center py-16 rounded-3xl border border-dashed border-gray-300 bg-white">
                      <div className="text-gray-600 text-lg mb-4">
                        {language === 'fr'
                          ? 'Aucune question trouvÃ©e pour ces critÃ¨res'
                          : 'No questions found for these criteria'}
                      </div>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCategory('all');
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 bg-gradient-to-r from-red-600 to-orange-500 text-white font-semibold hover:opacity-95 transition"
                      >
                        {language === 'fr' ? 'RÃ©initialiser les filtres' : 'Reset filters'}
                      </button>
                    </div>
                  )}
                </div>
              </main>
            </div>
          </div>
        </section>

        {/* CTA SUPPORT */}
        <section className="relative py-20 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/10" />
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
              {language === 'fr'
                ? 'Vous ne trouvez pas votre rÃ©ponse ?'
                : "Can't find your answer?"}
            </h2>
            <p className="text-lg md:text-xl text-white/95 mb-8">
              {language === 'fr'
                ? 'Notre Ã©quipe support est disponible 24/7 pour vous aider'
                : 'Our support team is available 24/7 to help you'}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
              >
                <Mail size={20} />
                <span>{language === 'fr' ? 'Formulaire de contact' : 'Contact form'}</span>
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5" />
              </a>

              <a
                href="/sos-appel"
                className="group relative overflow-hidden border-2 border-white bg-transparent text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:bg-white/10 flex items-center justify-center gap-2"
              >
                <Phone size={20} />
                <span>{language === 'fr' ? "Appel d'urgence" : 'Emergency call'}</span>
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/30" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default FAQ;
