import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Phone, Mail, MessageCircle, HelpCircle, CreditCard, Shield, Users, Globe, Clock, FileText, AlertTriangle, Settings } from 'lucide-react';
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
        ? 'Pour les urgences immédiates, utilisez notre service S.O.S Appel. Pour les autres cas, contactez notre support à support@sos-expat.com. Nous répondons sous 24h.'
        : 'For immediate emergencies, use our S.O.S Call service. For other cases, contact our support at support@sos-expat.com. We respond within 24h.',
      tags: ['paiement', 'stripe', 'prix', 'sécurité', 'carte bancaire']
    },
    {
      id: '2',
      category: 'payment',
      question: language === 'fr' ? 'Puis-je payer en plusieurs fois ?' : 'Can I pay in installments?',
      answer: language === 'fr'
        ? 'Non, les paiements se font en une seule fois car nos services sont des consultations ponctuelles. Cependant, les tarifs sont volontairement accessibles : 19€ pour un expatrié et 49€ pour un avocat.'
        : 'No, payments are made in one go as our services are one-time consultations. However, rates are deliberately affordable: €19 for an expat and €49 for a lawyer.',
      tags: ['paiement', 'échelonnement', 'tarif', 'consultation']
    },
    {
      id: '3',
      category: 'billing',
      question: language === 'fr' ? 'Puis-je obtenir une facture ?' : 'Can I get an invoice?',
      answer: language === 'fr'
        ? 'Oui, vous recevez automatiquement une facture PDF après chaque appel, téléchargeable depuis votre tableau de bord. La facture contient tous les détails : service utilisé, durée, prix, TVA applicable, et informations légales complètes. Parfait pour vos remboursements d\'assurance ou déclarations fiscales.'
        : 'Yes, you automatically receive a PDF invoice after each call, downloadable from your dashboard. The invoice contains all details: service used, duration, price, applicable VAT, and complete legal information. Perfect for insurance reimbursements or tax declarations.',
      tags: ['facture', 'pdf', 'téléchargement', 'comptabilité', 'tva', 'assurance']
    },
    {
      id: '4',
      category: 'billing',
      question: language === 'fr' ? 'La TVA est-elle incluse dans les prix ?' : 'Is VAT included in prices?',
      answer: language === 'fr'
        ? 'Oui, tous nos prix sont TTC (toutes taxes comprises). 49€ TTC pour un avocat, 19€ TTC pour un expatrié. Aucun supplément ne sera ajouté lors du paiement.'
        : 'Yes, all our prices are inclusive of VAT. €49 including VAT for a lawyer, €19 including VAT for an expat. No additional charges will be added during payment.',
      tags: ['tva', 'prix', 'ttc', 'taxes', 'supplément']
    },

    // APPELS ET DISPONIBILITÉ
    {
      id: '5',
      category: 'calls',
      question: language === 'fr' ? 'Que se passe-t-il si l\'expert n\'est pas disponible ?' : 'What happens if the expert is not available?',
      answer: language === 'fr'
        ? 'Si l\'expert ne répond pas après 3 tentatives d\'appel automatiques espacées de 2 minutes, vous êtes automatiquement remboursé intégralement sous 24h. Vous pouvez ensuite choisir un autre expert ou réessayer plus tard. Notre système garantit votre satisfaction à 100%.'
        : 'If the expert doesn\'t answer after 3 automatic call attempts spaced 2 minutes apart, you are automatically fully refunded within 24 hours. You can then choose another expert or try again later. Our system guarantees 100% satisfaction.',
      tags: ['appel', 'disponibilité', 'remboursement', 'expert', 'automatique']
    },
    {
      id: '6',
      category: 'calls',
      question: language === 'fr' ? 'Combien de temps dure un appel ?' : 'How long does a call last?',
      answer: language === 'fr'
        ? 'Les appels avec un avocat durent exactement 20 minutes pour 49€. Les appels avec un expatrié durent 30 minutes pour 19€. Le temps est affiché en temps réel pendant l\'appel avec un décompte visible. Vous pouvez raccrocher avant la fin si votre problème est résolu, mais le tarif reste le même.'
        : 'Calls with a lawyer last exactly 20 minutes for €49. Calls with an expat last 30 minutes for €19. Time is displayed in real-time during the call with a visible countdown. You can hang up early if your problem is solved, but the rate remains the same.',
      tags: ['durée', 'temps', 'avocat', 'expatrié', 'décompte', 'tarif']
    },
    {
      id: '7',
      category: 'calls',
      question: language === 'fr' ? 'Puis-je prolonger un appel ?' : 'Can I extend a call?',
      answer: language === 'fr'
        ? 'Non, les appels ont une durée fixe pour garantir l\'équité tarifaire. Si vous avez besoin de plus de temps, vous pouvez programmer un nouvel appel immédiatement après. Nos experts sont formés pour optimiser le temps et vous donner les conseils essentiels dans la durée impartie.'
        : 'No, calls have a fixed duration to ensure pricing fairness. If you need more time, you can schedule a new call immediately after. Our experts are trained to optimize time and give you essential advice within the allotted time.',
      tags: ['prolongation', 'durée', 'nouveau', 'appel', 'tarif', 'équité']
    },
    {
      id: '8',
      category: 'calls',
      question: language === 'fr' ? 'Les appels sont-ils enregistrés ?' : 'Are calls recorded?',
      answer: language === 'fr'
        ? 'Non, aucun appel n\'est enregistré pour garantir la confidentialité totale de vos échanges. Seules les métadonnées (durée, date, tarif) sont conservées pour la facturation. Vos conversations restent strictement privées entre vous et l\'expert.'
        : 'No, no calls are recorded to guarantee complete confidentiality of your exchanges. Only metadata (duration, date, rate) is kept for billing. Your conversations remain strictly private between you and the expert.',
      tags: ['enregistrement', 'confidentialité', 'privé', 'métadonnées', 'sécurité']
    },

    // COMPTE ET INSCRIPTION
    {
      id: '9',
      category: 'account',
      question: language === 'fr' ? 'Comment créer un compte ?' : 'How to create an account?',
      answer: language === 'fr'
        ? 'Cliquez sur "S\'inscrire" et choisissez votre rôle : Client (pour obtenir de l\'aide), Avocat (avec diplôme requis), ou Expatrié aidant (avec justificatif d\'identité). L\'inscription client est gratuite et immédiate. Les profils avocat/expatrié nécessitent une validation manuelle sous 5 minutes.'
        : 'Click "Sign up" and choose your role: Client (to get help), Lawyer (degree required), or Expat helper (ID required). Client registration is free and immediate. Lawyer/expat profiles require manual validation within 5 minutes.',
      tags: ['inscription', 'compte', 'rôle', 'gratuit', 'validation', 'diplôme']
    },
    {
      id: '10',
      category: 'account',
      question: language === 'fr' ? 'Puis-je modifier mes informations personnelles ?' : 'Can I modify my personal information?',
      answer: language === 'fr'
        ? 'Oui, vous pouvez modifier vos informations depuis votre tableau de bord : nom, prénom, téléphone, pays de résidence, langue préférée. Attention : le numéro de téléphone est crucial pour recevoir les appels, vérifiez qu\'il soit correct.'
        : 'Yes, you can modify your information from your dashboard: name, first name, phone, country of residence, preferred language. Warning: the phone number is crucial for receiving calls, make sure it\'s correct.',
      tags: ['modification', 'informations', 'téléphone', 'dashboard', 'profil']
    },
    {
      id: '11',
      category: 'account',
      question: language === 'fr' ? 'Comment supprimer mon compte ?' : 'How to delete my account?',
      answer: language === 'fr'
        ? 'Contactez notre support à support@sos-expat.com pour supprimer votre compte. Nous traiterons votre demande sous 48h conformément au RGPD. Vos données seront définitivement supprimées, sauf obligations légales de conservation.'
        : 'Contact our support at support@sos-expat.com to delete your account. We will process your request within 48 hours in accordance with GDPR. Your data will be permanently deleted, except legal retention obligations.',
      tags: ['suppression', 'compte', 'rgpd', 'données', 'support', 'définitif']
    },

    // EXPERTS ET VALIDATION
    {
      id: '12',
      category: 'experts',
      question: language === 'fr' ? 'Comment les experts sont-ils vérifiés ?' : 'How are experts verified?',
      answer: language === 'fr'
        ? 'Tous nos experts sont vérifiés manuellement par notre équipe sous 5 minutes. Les avocats doivent fournir leur diplôme, justificatifs d\'inscription au barreau, et assurance responsabilité civile. Les expatriés doivent prouver leur résidence (facture, bail) et expérience dans le pays (minimum 1 an). Vérification d\'identité obligatoire pour tous.'
        : 'All our experts are manually verified by our team within 5 minutes. Lawyers must provide their degree, bar admission documents, and professional liability insurance. Expats must prove their residence (bill, lease) and experience in the country (minimum 1 year). Identity verification mandatory for all.',
      tags: ['vérification', 'diplôme', 'sécurité', 'validation', 'barreau', 'assurance', 'résidence']
    },
    {
      id: '13',
      category: 'experts',
      question: language === 'fr' ? 'Puis-je choisir mon expert ?' : 'Can I choose my expert?',
      answer: language === 'fr'
        ? 'Oui, vous pouvez parcourir tous les profils d\'experts disponibles, voir leurs spécialités, notes, avis clients, et pays d\'expertise. Vous choisissez librement qui vous souhaitez appeler. Si votre expert préféré n\'est pas disponible, le système vous propose des alternatives similaires.'
        : 'Yes, you can browse all available expert profiles, see their specialties, ratings, client reviews, and countries of expertise. You freely choose who you want to call. If your preferred expert is not available, the system suggests similar alternatives.',
      tags: ['choix', 'expert', 'profil', 'spécialités', 'notes', 'avis', 'disponible']
    },
    {
      id: '14',
      category: 'experts',
      question: language === 'fr' ? 'Comment devenir expert sur la plateforme ?' : 'How to become an expert on the platform?',
      answer: language === 'fr'
        ? 'Pour devenir avocat : diplôme de droit + inscription au barreau + 2 ans d\'expérience minimum. Pour devenir expatrié aidant : justificatif de résidence à l\'étranger + 1 an d\'expérience d\'expatriation minimum + pièce d\'identité. Inscription via les formulaires dédiés, validation sous 5 minutes.'
        : 'To become a lawyer: law degree + bar admission + 2 years minimum experience. To become an expat helper: proof of residence abroad + 1 year minimum expat experience + ID document. Registration via dedicated forms, validation within 5 minutes.',
      tags: ['devenir', 'expert', 'avocat', 'expatrié', 'diplôme', 'expérience', 'validation']
    },

    // TECHNIQUE ET SÉCURITÉ
    {
      id: '15',
      category: 'technical',
      question: language === 'fr' ? 'Quels sont les problèmes techniques courants ?' : 'What are common technical issues?',
      answer: language === 'fr'
        ? 'Problèmes fréquents : numéro de téléphone incorrect, appels bloqués par l\'opérateur, connexion internet instable. Solutions : vérifiez votre numéro dans le profil, autorisez les appels inconnus temporairement, utilisez le WiFi. Notre support technique est disponible 24/7 via chat en direct.'
        : 'Common issues: incorrect phone number, calls blocked by operator, unstable internet connection. Solutions: check your number in profile, temporarily allow unknown calls, use WiFi. Our technical support is available 24/7 via live chat.',
      tags: ['technique', 'connexion', 'téléphone', 'support', 'wifi', 'opérateur', 'chat']
    },
    {
      id: '16',
      category: 'technical',
      question: language === 'fr' ? 'L\'application fonctionne-t-elle sur mobile ?' : 'Does the app work on mobile?',
      answer: language === 'fr'
        ? 'Oui, notre plateforme est 100% responsive et optimisée pour mobile. Aucune application à télécharger, tout fonctionne depuis votre navigateur web (Chrome, Safari, Firefox). Interface tactile optimisée pour smartphone et tablette.'
        : 'Yes, our platform is 100% responsive and mobile optimized. No app to download, everything works from your web browser (Chrome, Safari, Firefox). Touch interface optimized for smartphone and tablet.',
      tags: ['mobile', 'responsive', 'application', 'navigateur', 'tactile', 'smartphone']
    },
    {
      id: '17',
      category: 'security',
      question: language === 'fr' ? 'Mes données sont-elles protégées ?' : 'Is my data protected?',
      answer: language === 'fr'
        ? 'Oui, toutes vos données sont chiffrées AES-256 et protégées selon les standards RGPD. Serveurs sécurisés en Europe, authentification à deux facteurs disponible. Nous ne vendons jamais vos informations personnelles. Seules les données nécessaires à votre demande d\'aide sont partagées avec l\'expert choisi.'
        : 'Yes, all your data is AES-256 encrypted and protected according to GDPR standards. Secure servers in Europe, two-factor authentication available. We never sell your personal information. Only data necessary for your help request is shared with the chosen expert.',
      tags: ['confidentialité', 'rgpd', 'sécurité', 'données', 'chiffrement', 'europe', '2fa']
    },

    // PAYS ET COUVERTURE
    {
      id: '18',
      category: 'countries',
      question: language === 'fr' ? 'Dans quels pays le service est-il disponible ?' : 'In which countries is the service available?',
      answer: language === 'fr'
        ? 'Notre service est disponible dans plus de 120 pays, SAUF en France métropolitaine. Nous couvrons l\'Europe (UK, Allemagne, Espagne, Italie...), l\'Amérique du Nord (Canada, USA), l\'Asie (Thaïlande, Singapour, Japon...), l\'Océanie (Australie, Nouvelle-Zélande), et de nombreux autres pays. Consultez la liste complète sur notre page prestataires.'
        : 'Our service is available in over 120 countries, EXCEPT metropolitan France. We cover Europe (UK, Germany, Spain, Italy...), North America (Canada, USA), Asia (Thailand, Singapore, Japan...), Oceania (Australia, New Zealand), and many other countries. Check the complete list on our providers page.',
      tags: ['pays', 'international', 'couverture', 'france', 'europe', 'amérique', 'asie', 'océanie']
    },
    {
      id: '19',
      category: 'countries',
      question: language === 'fr' ? 'Pourquoi le service n\'est-il pas disponible en France ?' : 'Why is the service not available in France?',
      answer: language === 'fr'
        ? 'Le service n\'est pas encore opérationnel en France métropolitaine pour des raisons réglementaires spécifiques au marché français. Nous travaillons activement sur cette disponibilité. Le service reste disponible pour les Français expatriés dans le monde entier.'
        : 'The service is not yet operational in metropolitan France due to regulatory reasons specific to the French market. We are actively working on this availability. The service remains available for French expats worldwide.',
      tags: ['france', 'réglementaire', 'métropolitaine', 'expatriés', 'français', 'disponibilité']
    },

    // REMBOURSEMENT ET GARANTIES
    {
      id: '20',
      category: 'refund',
      question: language === 'fr' ? 'Comment obtenir un remboursement ?' : 'How to get a refund?',
      answer: language === 'fr'
        ? 'Remboursement automatique si l\'expert ne répond pas après 3 tentatives. Pour d\'autres cas (problème technique, insatisfaction), contactez notre support dans les 24h suivant l\'appel via support@sosexpats.com. Nous étudions chaque demande individuellement et privilégions toujours la satisfaction client. Remboursement sous 3-5 jours ouvrés.'
        : 'Automatic refund if the expert doesn\'t answer after 3 attempts. For other cases (technical problem, dissatisfaction), contact our support within 24 hours of the call via support@sosexpats.com. We review each request individually and always prioritize customer satisfaction. Refund within 3-5 business days.',
      tags: ['remboursement', 'automatique', 'support', 'satisfaction', 'technique', 'délai']
    },
    {
      id: '21',
      category: 'refund',
      question: language === 'fr' ? 'Y a-t-il une garantie de satisfaction ?' : 'Is there a satisfaction guarantee?',
      answer: language === 'fr'
        ? 'Oui, nous garantissons votre satisfaction à 100%. Si vous n\'êtes pas satisfait de votre consultation, contactez-nous sous 24h avec les détails. Nous proposons un remboursement partiel ou total selon la situation, ou un nouvel appel gratuit avec un autre expert.'
        : 'Yes, we guarantee 100% satisfaction. If you are not satisfied with your consultation, contact us within 24 hours with details. We offer partial or full refund depending on the situation, or a free new call with another expert.',
      tags: ['garantie', 'satisfaction', '100%', 'remboursement', 'gratuit', 'nouvel', 'appel']
    },

    // LANGUES ET COMMUNICATION
    {
      id: '22',
      category: 'languages',
      question: language === 'fr' ? 'Dans quelles langues puis-je être aidé ?' : 'In which languages can I get help?',
      answer: language === 'fr'
        ? 'Nos experts parlent principalement français et anglais. Certains parlent aussi espagnol, allemand, italien, portugais selon leur profil. Vous pouvez filtrer les experts par langue parlée sur notre page prestataires. La plateforme elle-même est disponible en français et anglais.'
        : 'Our experts mainly speak French and English. Some also speak Spanish, German, Italian, Portuguese depending on their profile. You can filter experts by spoken language on our providers page. The platform itself is available in French and English.',
      tags: ['langues', 'français', 'anglais', 'espagnol', 'allemand', 'italien', 'filtre']
    },

    // URGENCES ET DISPONIBILITÉ
    {
      id: '23',
      category: 'emergency',
      question: language === 'fr' ? 'Le service est-il vraiment disponible 24/7 ?' : 'Is the service really available 24/7?',
      answer: language === 'fr'
        ? 'Oui, la plateforme fonctionne 24h/24, 7j/7. Cependant, la disponibilité des experts varie selon les fuseaux horaires et leurs horaires personnels. Nous avons des experts dans le monde entier pour couvrir un maximum de créneaux. En cas d\'urgence absolue, utilisez le bouton "S.O.S Appel" pour être mis en relation avec le premier expert disponible.'
        : 'Yes, the platform operates 24/7. However, expert availability varies according to time zones and their personal schedules. We have experts worldwide to cover maximum time slots. In case of absolute emergency, use the "S.O.S Call" button to be connected with the first available expert.',
      tags: ['24/7', 'urgence', 'fuseau', 'horaire', 'mondial', 'sos', 'disponible']
    },

    // SPÉCIALITÉS ET DOMAINES
    {
      id: '24',
      category: 'specialties',
      question: language === 'fr' ? 'Quels types de problèmes puis-je résoudre ?' : 'What types of problems can I solve?',
      answer: language === 'fr'
        ? 'Avocats : droit immobilier, droit du travail, droit de la famille, droit des affaires, droit pénal, immigration, fiscalité. Expatriés : démarches administratives, recherche logement, banque, santé, éducation, transport, culture locale, emploi. Nous ne traitons pas les urgences médicales - contactez les services d\'urgence locaux.'
        : 'Lawyers: real estate law, labor law, family law, business law, criminal law, immigration, taxation. Expats: administrative procedures, housing search, banking, health, education, transport, local culture, employment. We do not handle medical emergencies - contact local emergency services.',
      tags: ['spécialités', 'droit', 'immobilier', 'travail', 'famille', 'administratif', 'logement', 'médical']
    },

    // FACTURATION AVANCÉE
    {
      id: '25',
      category: 'billing',
      question: language === 'fr' ? 'Puis-je obtenir un remboursement de mon assurance ?' : 'Can I get reimbursed by my insurance?',
      answer: language === 'fr'
        ? 'Cela dépend de votre contrat d\'assurance. Nos factures PDF contiennent toutes les informations nécessaires : prestations détaillées, TVA, numéro SIRET. Certaines assurances expatriés remboursent les consultations juridiques. Vérifiez avec votre assureur en présentant notre facture type.'
        : 'It depends on your insurance contract. Our PDF invoices contain all necessary information: detailed services, VAT, SIRET number. Some expat insurances reimburse legal consultations. Check with your insurer by presenting our sample invoice.',
      tags: ['assurance', 'remboursement', 'facture', 'siret', 'expatriés', 'juridique', 'contrat']
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
    { id: 'security', name: language === 'fr' ? 'Sécurité' : 'Security', icon: Shield, count: faqData.filter(item => item.category === 'security').length },
    { id: 'countries', name: language === 'fr' ? 'Pays' : 'Countries', icon: Globe, count: faqData.filter(item => item.category === 'countries').length },
    { id: 'refund', name: language === 'fr' ? 'Remboursement' : 'Refund', icon: AlertTriangle, count: faqData.filter(item => item.category === 'refund').length },
    { id: 'languages', name: language === 'fr' ? 'Langues' : 'Languages', icon: MessageCircle, count: faqData.filter(item => item.category === 'languages').length },
    { id: 'emergency', name: language === 'fr' ? 'Urgences' : 'Emergency', icon: AlertTriangle, count: faqData.filter(item => item.category === 'emergency').length },
    { id: 'specialties', name: language === 'fr' ? 'Spécialités' : 'Specialties', icon: HelpCircle, count: faqData.filter(item => item.category === 'specialties').length }
  ];

  const filteredFAQ = faqData.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
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
        title="Questions fréquentes | SOS Expat & Travelers"
        description="Trouvez rapidement les réponses à vos questions sur SOS Expat & Travelers. Consultez notre FAQ pour des informations sur les paiements, les appels, les experts et plus encore."
        canonicalUrl="/faq"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqData.map(item => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": item.answer
            }
          }))
        }}
      />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {language === 'fr' ? 'Questions fréquentes' : 'Frequently Asked Questions'}
            </h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto mb-8">
              {language === 'fr'
                ? 'Trouvez rapidement les réponses à vos questions sur SOS Expat & Travelers'
                : 'Quickly find answers to your questions about SOS Expat & Travelers'
              }
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={language === 'fr' ? 'Rechercher dans la FAQ...' : 'Search FAQ...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-red-300 shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Categories Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {language === 'fr' ? 'Catégories' : 'Categories'}
                </h3>
                <div className="space-y-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                          selectedCategory === category.id
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon size={18} />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          selectedCategory === category.id
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {category.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FAQ Content */}
            <div className="lg:col-span-3">
              <div className="space-y-4">
                {filteredFAQ.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 pr-4">
                        {item.question}
                      </h3>
                      {openItems.has(item.id) ? (
                        <ChevronUp className="text-red-500 flex-shrink-0" size={20} />
                      ) : (
                        <ChevronDown className="text-gray-500 flex-shrink-0" size={20} />
                      )}
                    </button>
                    
                    {openItems.has(item.id) && (
                      <div className="px-6 pb-4">
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                            {item.answer}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-4">
                            {item.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {filteredFAQ.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-500 text-lg mb-4">
                      {language === 'fr' 
                        ? 'Aucune question trouvée pour ces critères'
                        : 'No questions found for these criteria'
                      }
                    </div>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('all');
                      }}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      {language === 'fr' ? 'Réinitialiser les filtres' : 'Reset filters'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              {language === 'fr' 
                ? 'Vous ne trouvez pas votre réponse ?'
                : 'Can\'t find your answer?'
              }
            </h2>
            <p className="text-xl text-red-100 mb-8">
              {language === 'fr'
                ? 'Notre équipe support est disponible 24/7 pour vous aider'
                : 'Our support team is available 24/7 to help you'
              }
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="bg-white text-red-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <Mail size={20} />
                <span>{language === 'fr' ? 'Nous contacter' : 'Contact us'}</span>
              </a>
              
              <a
                href="/sos-appel"
                className="bg-red-800 hover:bg-red-900 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <Phone size={20} />
                <span>{language === 'fr' ? 'Appel d\'urgence' : 'Emergency call'}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FAQ;

