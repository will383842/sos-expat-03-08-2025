import React, { useState } from 'react';
import { Search, Phone, Mail, Book, Users, CreditCard, HelpCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  readTime: number;
  content: string;
}

const HelpCenter: React.FC = () => {
  const { language } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isLoading] = useState(false);

  // --- Articles (couverture mondiale + toutes langues, prix 19â‚¬ / 25$ et 49â‚¬ / 55$ partout) ---
  const articles: Article[] = [
    // Appels d'urgence
    {
      id: '1',
      title: language === 'fr'
        ? "Appel d'urgence : comment Ã§a marche"
        : 'Emergency call: how it works',
      excerpt: language === 'fr'
        ? 'Mise en relation immÃ©diate avec un avocat ou un expatriÃ© â€” couverture mondiale'
        : 'Instant match with a lawyer or an expat â€” worldwide coverage',
      category: 'emergency_calls',
      tags: ['sos', 'urgence', 'mise en relation', 'international'],
      readTime: 3,
      content: language === 'fr'
        ? `# Appel d'urgence : comment Ã§a marche

Notre plateforme est **une solution de mise en relation internationale** (couverture mondiale, selon disponibilitÃ© des appels et paiements). Nous ne sommes **pas** un cabinet ; les **experts sont indÃ©pendants**.

## Ã‰tape 1 â€” Choisissez le type d'aide
- **Avocat** : 49â‚¬ / 55$ â€” 20 min
- **ExpatriÃ©** : 19â‚¬ / 25$ â€” 30 min

## Ã‰tape 2 â€” DÃ©crivez votre situation
En quelques lignes pour Ãªtre aidÃ© efficacement.

## Ã‰tape 3 â€” Paiement sÃ©curisÃ© (Stripe)
Vous n'Ãªtes dÃ©bitÃ© **qu'aprÃ¨s la confirmation** de l'appel.

## Ã‰tape 4 â€” Mise en relation automatique
Vous recevez un appel **sous 5 minutes** en moyenne.

**Langue** : vous pouvez Ãªtre aidÃ© **dans toute langue parlÃ©e par au moins un expert** (avocat ou expatriÃ©).`
        : `# Emergency call: how it works

We are **an international matchmaking platform** (worldwide coverage, where calls and payments are possible). We are **not** a law firm; experts are **independent**.

## Step 1 â€” Pick the help type
- **Lawyer**: â‚¬49 / $55 â€” 20 min
- **Expat**: â‚¬19 / $25 â€” 30 min

## Step 2 â€” Describe your situation
A short summary helps the expert assist you efficiently.

## Step 3 â€” Secure payment (Stripe)
You are charged **only after the call is confirmed**.

## Step 4 â€” Automatic connection
You typically receive a call **within 5 minutes**.

**Language**: you can get help **in any language spoken by at least one expert** (lawyer or expat).`
    },

    {
      id: '2',
      title: language === 'fr'
        ? "Si l'expert ne rÃ©pond pas"
        : "If the expert doesn't answer",
      excerpt: language === 'fr'
        ? 'Remboursement automatique et immÃ©diat, puis alternatives'
        : 'Automatic and immediate refund, plus alternatives',
      category: 'emergency_calls',
      tags: ['remboursement', 'immÃ©diat', 'disponibilitÃ©'],
      readTime: 2,
      content: language === 'fr'
        ? `# Si l'expert ne rÃ©pond pas

## Remboursement immÃ©diat
AprÃ¨s **3 tentatives d'appel** espacÃ©es de 2 minutes, vous Ãªtes **automatiquement remboursÃ© immÃ©diatement** via Stripe.

## Alternatives
1. **Choisir un autre expert** tout de suite
2. **RÃ©essayer plus tard** avec le mÃªme expert
3. **Contacter le support** si besoin

*Note : pas de "garantie satisfaction" commerciale. Nous appliquons une **politique de remboursement immÃ©diat** en cas de non-rÃ©ponse.*`
        : `# If the expert doesn't answer

## Immediate refund
After **3 call attempts** spaced 2 minutes apart, you are **automatically refunded immediately** via Stripe.

## Alternatives
1. **Pick another expert** right away
2. **Try again later** with the same expert
3. **Contact support** if needed

*Note: No commercial "satisfaction guarantee". We apply an **immediate refund** policy if there is no answer.*`
    },

    // Compte utilisateur / International
    {
      id: '3',
      title: language === 'fr'
        ? 'Langues et disponibilitÃ©'
        : 'Languages & availability',
      excerpt: language === 'fr'
        ? 'Aide possible dans toute langue parlÃ©e par un expert â€” couverture mondiale'
        : 'Help in any language spoken by an expert â€” worldwide coverage',
      category: 'user_account',
      tags: ['langues', 'monde', 'international'],
      readTime: 3,
      content: language === 'fr'
        ? `# Langues et disponibilitÃ©

- **Couverture mondiale** : nos experts sont rÃ©partis sur tous les continents.
- **Langues** : si un **avocat** ou un **expatriÃ©** parle une langue, **elle est disponible** sur la plateforme.
- Vous pouvez filtrer/choisir un expert selon **sa langue**, **son pays**, ou **sa spÃ©cialitÃ©**.
- Si votre langue n'apparaÃ®t pas, contactez le support : nous vous prÃ©venons dÃ¨s qu'un expert correspondant est disponible.`
        : `# Languages & availability

- **Worldwide coverage**: experts are located across all continents.
- **Languages**: if a **lawyer** or an **expat** speaks a language, **itâ€™s available** on the platform.
- You can filter/select an expert by **language**, **country**, or **specialty**.
- If your language isnâ€™t listed, contact support: weâ€™ll notify you once a matching expert is available.`
    },

    {
      id: '4',
      title: language === 'fr'
        ? 'Qui sont les experts ?'
        : 'Who are the experts?',
      excerpt: language === 'fr'
        ? "Professionnels et expatriÃ©s expÃ©rimentÃ©s, **indÃ©pendants** â€” la plateforme organise la mise en relation"
        : 'Professionals and experienced expats, **independent** â€” the platform handles matchmaking',
      category: 'user_account',
      tags: ['experts', 'indÃ©pendants', 'mise en relation'],
      readTime: 3,
      content: language === 'fr'
        ? `# Qui sont les experts ?

- **IndÃ©pendants** : avocats et expatriÃ©s ne sont **pas nos employÃ©s**.
- **VÃ©rifications** : nous rÃ©alisons des contrÃ´les documentaires et de profil.
- **RÃ´les** : l'expert est responsable de ses conseils ; la **plateforme** gÃ¨re la **mise en relation**, le **routage des appels**, le **paiement sÃ©curisÃ©** et l'**assistance**.`
        : `# Who are the experts?

- **Independent**: lawyers and expats are **not our employees**.
- **Checks**: we run document and profile verifications.
- **Roles**: the expert is responsible for their advice; the **platform** manages **matchmaking**, **call routing**, **secure payments**, and **support**.`
    },

    // Paiements
    {
      id: '5',
      title: language === 'fr'
        ? 'Frais de mise en relation et tarifs'
        : 'Matchmaking fee & pricing',
      excerpt: language === 'fr'
        ? 'Aucune commission â€” un **frais de mise en relation** inclus dans un prix fixe'
        : 'No commissions â€” a **matchmaking fee** included in a fixed price',
      category: 'payments',
      tags: ['tarifs', 'frais', 'mise en relation', 'prix fixes'],
      readTime: 3,
      content: language === 'fr'
        ? `# Frais de mise en relation et tarifs

- **Pas de commission** : nous ne prenons pas de commission sur votre Ã©change.
- Un **frais de mise en relation** est **inclus** dans le **prix fixe** :
  - **Avocat** : 49â‚¬ / 55$ (20 min)
  - **ExpatriÃ©** : 19â‚¬ / 25$ (30 min)
- **Aucun frais cachÃ©**. Le frais de mise en relation couvre l'**infrastructure**, le **paiement sÃ©curisÃ©**, le **support**, et la **mise en relation internationale**.`
        : `# Matchmaking fee & pricing

- **No commissions**: we do not take a commission on your conversation.
- A **matchmaking fee** is **included** in the **fixed price**:
  - **Lawyer**: â‚¬49 / $55 (20 min)
  - **Expat**: â‚¬19 / $25 (30 min)
- **No hidden fees**. The matchmaking fee covers **infrastructure**, **secure payments**, **support**, and **international matchmaking**.`
    },

    {
      id: '6',
      title: language === 'fr'
        ? 'Paiement et sÃ©curitÃ©'
        : 'Payment & security',
      excerpt: language === 'fr'
        ? 'Stripe, chiffrement, aucune donnÃ©e bancaire stockÃ©e, facture automatique'
        : 'Stripe, encryption, no card data stored, automatic invoice',
      category: 'payments',
      tags: ['stripe', 'sÃ©curitÃ©', 'facture'],
      readTime: 3,
      content: language === 'fr'
        ? `# Paiement et sÃ©curitÃ©

## Moyens de paiement
- Visa, Mastercard, American Express
- Apple Pay, Google Pay
- Cartes de dÃ©bit/crÃ©dit internationales

## SÃ©curitÃ©
- Paiements via **Stripe**
- Chiffrement **SSL 256-bit**
- **Aucune donnÃ©e bancaire stockÃ©e** chez nous

## Facturation
- **Facture PDF automatique** dans votre dashboard
- Montants affichÃ©s en **â‚¬ et $**`
        : `# Payment & security

## Payment methods
- Visa, Mastercard, American Express
- Apple Pay, Google Pay
- International debit/credit cards

## Security
- Payments via **Stripe**
- **256-bit SSL** encryption
- **No card data stored** with us

## Billing
- **Automatic PDF invoice** in your dashboard
- Prices shown in **â‚¬ and $**`
    },

    // Guides pratiques internationaux
    {
      id: '7',
      title: language === 'fr'
        ? 'Couverture mondiale'
        : 'Worldwide coverage',
      excerpt: language === 'fr'
        ? "Fonctionne dans la plupart des pays du monde â€” pensez au fuseau horaire et au numÃ©ro international"
        : 'Works in most countries worldwide â€” mind time zones and international numbers',
      category: 'practical_guides',
      tags: ['monde', 'fuseaux horaires', 'international'],
      readTime: 4,
      content: language === 'fr'
        ? `# Couverture mondiale

- Disponible **dans le monde entier** (lÃ  oÃ¹ les appels tÃ©lÃ©phoniques et paiements sont possibles).
- VÃ©rifiez votre **numÃ©ro de tÃ©lÃ©phone** (inclure l'**indicatif international**).
- Tenez compte du **fuseau horaire** de l'expert.
- En cas de restrictions d'itinÃ©rance/VoIP, privilÃ©giez un numÃ©ro joignable ou contactez le support.`
        : `# Worldwide coverage

- Available **worldwide** (where phone calls and payments are possible).
- Ensure your **phone number** includes the **international prefix**.
- Consider the expertâ€™s **time zone**.
- If roaming/VoIP is restricted, use a reachable number or contact support.`
    },

    {
      id: '8',
      title: language === 'fr'
        ? 'Conseils pour un appel rÃ©ussi'
        : 'Tips for a successful call',
      excerpt: language === 'fr'
        ? 'PrÃ©parez un bref rÃ©sumÃ©, gardez votre tÃ©lÃ©phone disponible, choisissez la langue'
        : 'Prepare a short summary, keep your phone available, pick the right language',
      category: 'practical_guides',
      tags: ['conseils', 'qualitÃ©', 'prÃ©paration'],
      readTime: 3,
      content: language === 'fr'
        ? `# Conseils pour un appel rÃ©ussi

- PrÃ©parez un **rÃ©sumÃ© clair** de votre situation.
- Choisissez la **langue** qui vous convient avec l'expert (toutes langues possibles si un expert la parle).
- Assurez-vous d'Ãªtre dans un **endroit calme** et d'avoir une **bonne rÃ©ception**.
- Laissez votre **tÃ©lÃ©phone disponible** juste aprÃ¨s le paiement.`
        : `# Tips for a successful call

- Prepare a **clear summary** of your situation.
- Pick the **language** that fits you and your expert (any language if an expert speaks it).
- Stay in a **quiet place** with **good reception**.
- Keep your **phone available** right after payment.`
    },

    // ====== Questions diverses (FAQ Ã©tendue) ======
    {
      id: '9',
      title: language === 'fr'
        ? 'Puis-je choisir un expert prÃ©cis ?'
        : 'Can I pick a specific expert?',
      excerpt: language === 'fr'
        ? 'Oui. Filtrez par langue, pays, spÃ©cialitÃ© et disponibilitÃ©s.'
        : 'Yes. Filter by language, country, specialty, and availability.',
      category: 'general_faq',
      tags: ['choisir', 'expert', 'filtre'],
      readTime: 2,
      content: language === 'fr'
        ? `# Puis-je choisir un expert prÃ©cis ?

Oui. Utilisez les filtres (**langue**, **pays**, **spÃ©cialitÃ©**) et sÃ©lectionnez l'expert qui vous convient. Si l'expert ne rÃ©pond pas, vous Ãªtes **remboursÃ© immÃ©diatement** et pouvez en choisir un autre.`
        : `# Can I pick a specific expert?

Yes. Use filters (**language**, **country**, **specialty**) to select the expert you want. If the expert doesnâ€™t answer, you get an **immediate refund** and can pick another.`
    },

    {
      id: '10',
      title: language === 'fr'
        ? "Puis-je reprogrammer ou annuler avant lâ€™appel ?"
        : 'Can I reschedule or cancel before the call?',
      excerpt: language === 'fr'
        ? 'Annulation avant connexion : remboursement immÃ©diat.'
        : 'Cancel before connection: immediate refund.',
      category: 'general_faq',
      tags: ['annulation', 'reprogrammation', 'remboursement'],
      readTime: 2,
      content: language === 'fr'
        ? `# Puis-je reprogrammer ou annuler avant lâ€™appel ?

Oui. Tant que l'appel n'est pas Ã©tabli, vous pouvez **annuler** et Ãªtes **remboursÃ© immÃ©diatement**. Pour reprogrammer, lancez une nouvelle mise en relation au crÃ©neau souhaitÃ©.`
        : `# Can I reschedule or cancel before the call?

Yes. As long as the call hasnâ€™t started, you can **cancel** and get an **immediate refund**. To reschedule, simply start a new match at your preferred time.`
    },

    {
      id: '11',
      title: language === 'fr'
        ? 'Que se passe-t-il si mon numÃ©ro est incorrect ?'
        : 'What if my phone number is wrong?',
      excerpt: language === 'fr'
        ? 'Corrigez le numÃ©ro dans votre profil et relancez la mise en relation.'
        : 'Update your number in profile and restart matchmaking.',
      category: 'general_faq',
      tags: ['numÃ©ro', 'profil', 'appel'],
      readTime: 2,
      content: language === 'fr'
        ? `# Que se passe-t-il si mon numÃ©ro est incorrect ?

Mettez Ã  jour votre **numÃ©ro de tÃ©lÃ©phone** dans votre profil (avec l'**indicatif pays**) puis relancez la mise en relation.`
        : `# What if my phone number is wrong?

Update your **phone number** in your profile (with the **country code**) and start the matchmaking again.`
    },

    {
      id: '12',
      title: language === 'fr'
        ? "Est-ce un service d'urgence officiel ?"
        : 'Is this an official emergency service?',
      excerpt: language === 'fr'
        ? 'Non. Plateforme de mise en relation avec des experts indÃ©pendants.'
        : 'No. We are a matchmaking platform with independent experts.',
      category: 'general_faq',
      tags: ['urgence', 'disclaimer', 'indÃ©pendants'],
      readTime: 2,
      content: language === 'fr'
        ? `# Est-ce un service d'urgence officiel ?

Non. Nous sommes une **plateforme de mise en relation** internationale. Les experts sont **indÃ©pendants**. En cas de danger immÃ©diat, contactez les **services d'urgence locaux** de votre pays.`
        : `# Is this an official emergency service?

No. We are an **international matchmaking platform**. Experts are **independent**. In immediate danger, call your **local emergency services**.`
    },

    {
      id: '13',
      title: language === 'fr'
        ? 'Prolongez-vous les appels ?'
        : 'Can I extend the call?',
      excerpt: language === 'fr'
        ? 'Actuellement : durÃ©es fixes. Pour prolonger, refaites une mise en relation.'
        : 'Currently fixed durations. To extend, start a new match.',
      category: 'general_faq',
      tags: ['durÃ©e', 'extension', 'appel'],
      readTime: 2,
      content: language === 'fr'
        ? `# Prolongez-vous les appels ?

Les appels sont **Ã  durÃ©e fixe** (Avocat 20 min, ExpatriÃ© 30 min). Pour prolonger, lancez **une nouvelle mise en relation** aprÃ¨s l'appel.`
        : `# Can I extend the call?

Calls have **fixed durations** (Lawyer 20 min, Expat 30 min). To extend, **start a new matchmaking** after the call.`
    },

    {
      id: '14',
      title: language === 'fr'
        ? 'ConfidentialitÃ© de lâ€™Ã©change'
        : 'Privacy of your conversation',
      excerpt: language === 'fr'
        ? 'Les experts sont tenus Ã  la confidentialitÃ© selon leurs rÃ¨gles locales.'
        : 'Experts follow confidentiality rules under their local regulations.',
      category: 'general_faq',
      tags: ['confidentialitÃ©', 'vie privÃ©e', 'donnÃ©es'],
      readTime: 3,
      content: language === 'fr'
        ? `# ConfidentialitÃ© de lâ€™Ã©change

Les experts appliquent les **rÃ¨gles de confidentialitÃ©** et de **dÃ©ontologie** propres Ã  leur pays et Ã  leur profession. Ne partagez pas d'informations sensibles si vous n'Ãªtes pas Ã  l'aise.`
        : `# Privacy of your conversation

Experts follow **confidentiality** and **professional conduct** rules applicable in their country and profession. Avoid sharing sensitive information if youâ€™re not comfortable.`
    },

    {
      id: '15',
      title: language === 'fr'
        ? 'AprÃ¨s le paiement, que reÃ§ois-je ?'
        : 'What do I receive after payment?',
      excerpt: language === 'fr'
        ? 'Appel en quelques minutes + facture PDF dans le dashboard.'
        : 'A call within minutes + a PDF invoice in your dashboard.',
      category: 'general_faq',
      tags: ['facture', 'rÃ©capitulatif', 'dashboard'],
      readTime: 2,
      content: language === 'fr'
        ? `# AprÃ¨s le paiement, que reÃ§ois-je ?

- Un **appel** dans les minutes qui suivent.
- Une **facture PDF automatique** dans votre **dashboard**.
- Un **rÃ©capitulatif** de lâ€™Ã©change peut Ãªtre partagÃ© par lâ€™expert sâ€™il le souhaite.`
        : `# What do I receive after payment?

- A **call** within minutes.
- An **automatic PDF invoice** in your **dashboard**.
- The expert may share a **summary** of the conversation if they choose to.`
    },

    {
      id: '16',
      title: language === 'fr'
        ? 'Dans quelles langues puis-je Ãªtre aidÃ© ?'
        : 'Which languages are available?',
      excerpt: language === 'fr'
        ? 'Toutes les langues parlÃ©es par au moins un expert sur la plateforme.'
        : 'Any language that at least one expert on the platform speaks.',
      category: 'general_faq',
      tags: ['langues', 'international', 'disponibilitÃ©'],
      readTime: 2,
      content: language === 'fr'
        ? `# Dans quelles langues puis-je Ãªtre aidÃ© ?

**Toutes les langues** parlÃ©es par **au moins un** avocat ou expatriÃ© sont disponibles. Filtrez la **langue** de lâ€™expert lors de la recherche.`
        : `# Which languages are available?

**Any language** spoken by **at least one** lawyer or expat is available. Filter by the expertâ€™s **language** when searching.`
    },

    // Nouvelles Q/R pour couverture mondiale explicite
    {
      id: '17',
      title: language === 'fr'
        ? 'Est-ce disponible dans mon pays ?'
        : 'Is it available in my country?',
      excerpt: language === 'fr'
        ? 'Oui, nous couvrons le monde entier (selon faisabilitÃ© appels/paiements).'
        : 'Yes, we cover the whole world (where calls/payments are feasible).',
      category: 'general_faq',
      tags: ['pays', 'monde', 'couverture'],
      readTime: 2,
      content: language === 'fr'
        ? `# Est-ce disponible dans mon pays ?

Oui, la **couverture est mondiale**. Dans certains pays, des restrictions tÃ©lÃ©com/paiement peuvent s'appliquer. Si une mise en relation ne peut pas Ãªtre finalisÃ©e, vous Ãªtes **remboursÃ© immÃ©diatement**.`
        : `# Is it available in my country?

Yes, **coverage is worldwide**. In some countries, telecom/payment restrictions may apply. If a match cannot be completed, you receive an **immediate refund**.`
    },
    {
      id: '18',
      title: language === 'fr'
        ? 'Et les langues rares ?'
        : 'What about rare languages?',
      excerpt: language === 'fr'
        ? "Si un expert parle votre langue, c'est disponible ; sinon, on vous notifie dÃ¨s qu'il y en a un."
        : 'If an expert speaks your language, itâ€™s available; otherwise we notify you when one is.',
      category: 'general_faq',
      tags: ['langues rares', 'notification', 'disponibilitÃ©'],
      readTime: 2,
      content: language === 'fr'
        ? `# Et les langues rares ?

DÃ¨s quâ€™un **expert** (avocat/expatriÃ©) parlant votre langue est disponible, vous pouvez Ãªtre mis en relation. Sinon, **contactez le support** pour Ãªtre **notifiÃ©** dÃ¨s quâ€™un expert correspondant rejoint la plateforme.`
        : `# What about rare languages?

As soon as an **expert** (lawyer/expat) speaking your language is available, you can be matched. Otherwise, **contact support** to be **notified** when a matching expert joins the platform.`
    }
  ];

  // --- CatÃ©gories (avec FAQ gÃ©nÃ©rale) ---
  const categories = [
    {
      id: 'all',
      name: language === 'fr' ? 'Toutes les catÃ©gories' : 'All categories',
      icon: Book,
      count: articles.length
    },
    {
      id: 'emergency_calls',
      name: language === 'fr' ? "Appels d'urgence" : 'Emergency calls',
      icon: Phone,
      count: articles.filter((a) => a.category === 'emergency_calls').length
    },
    {
      id: 'user_account',
      name: language === 'fr' ? 'Compte utilisateur' : 'User account',
      icon: Users,
      count: articles.filter((a) => a.category === 'user_account').length
    },
    {
      id: 'payments',
      name: language === 'fr' ? 'Paiements' : 'Payments',
      icon: CreditCard,
      count: articles.filter((a) => a.category === 'payments').length
    },
    {
      id: 'practical_guides',
      name: language === 'fr' ? 'Guides pratiques' : 'Practical guides',
      icon: Book,
      count: articles.filter((a) => a.category === 'practical_guides').length
    },
    {
      id: 'general_faq',
      name: language === 'fr' ? 'Questions diverses' : 'General FAQ',
      icon: HelpCircle,
      count: articles.filter((a) => a.category === 'general_faq').length
    }
  ];

  // --- Filtrage (inchangÃ©) ---
  const filteredArticles = articles.filter((article) => {
    const matchesCategory =
      selectedCategory === 'all' || article.category === selectedCategory;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      article.title.toLowerCase().includes(q) ||
      article.excerpt.toLowerCase().includes(q) ||
      article.tags.some((tag) => tag.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  // --- Handlers (inchangÃ©s) ---
  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchTerm('');
    setSelectedArticle(null);
  };

  const handleArticleClick = (article: Article) => {
    setSelectedArticle(article);
  };

  const handleBackToList = () => {
    setSelectedArticle(null);
  };

  // --- Helper rendu markdown lÃ©ger (prÃ©sentation uniquement) ---
  const mdToHtml = (md: string): string => {
    // Ã‰chapper le HTML brut
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Titres
    html = html
      .replace(/^### (.*)$/gm, '<h3 class="mt-6 mb-2 text-xl font-extrabold">$1</h3>')
      .replace(/^## (.*)$/gm, '<h2 class="mt-8 mb-3 text-2xl font-black">$1</h2>')
      .replace(/^# (.*)$/gm, '<h1 class="mt-10 mb-4 text-3xl md:text-4xl font-black">$1</h1>');

    // Gras
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Listes
    html = html
      .replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>')
      .replace(/^-\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(
      /(?:^|\n)((?:<li>.*<\/li>\n?)+)/g,
      (_m, list: string) => `<ul class="list-disc pl-6 my-4 space-y-1">${list}</ul>`
    );

    // Paragraphes
    html = html.replace(
      /^(?!<h\d|<ul|<\/ul>|<li>|<\/li>|\s*$)(.+)$/gm,
      '<p class="leading-relaxed text-gray-700">$1</p>'
    );

    return html;
  };

  // ======================= Vue article dÃ©taillÃ© =======================
  if (selectedArticle) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
          {/* Hero compact */}
          <div className="relative pt-16 pb-10">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10" />
            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <button
                onClick={handleBackToList}
                className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors font-semibold"
                aria-label={language === 'fr' ? 'Retour aux articles' : 'Back to articles'}
              >
                <span className="text-white/70">â†</span>
                <span>{language === 'fr' ? 'Retour aux articles' : 'Back to articles'}</span>
              </button>
            </div>
          </div>

          {/* Carte contenu */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <article className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-10 text-white shadow-2xl">
              <div className="mb-6">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                  {selectedArticle.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                    â± {selectedArticle.readTime}{' '}
                    {language === 'fr' ? 'min de lecture' : 'min read'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedArticle.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: mdToHtml(selectedArticle.content) }}
              />
            </article>
          </div>
        </div>
      </Layout>
    );
  }

  // ======================= Vue liste =======================
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* HERO */}
        <header className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-4xl md:text-6xl font-black mb-4">
              {language === 'fr' ? "Centre d'aide" : 'Help Center'}
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-8">
              {language === 'fr'
                ? 'Trouvez rapidement des rÃ©ponses et des guides internationaux.'
                : 'Quickly find international answers and guides.'}
            </p>

            {/* Barre de recherche */}
            <div className="max-w-2xl mx-auto">
              <div className="relative group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60"
                  size={20}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    language === 'fr'
                      ? "Rechercher dans l'aide..."
                      : 'Search help...'
                  }
                  aria-label={
                    language === 'fr'
                      ? "Champ de recherche du centre d'aide"
                      : 'Help center search field'
                  }
                  className="w-full pl-12 pr-4 py-4 rounded-2xl text-base md:text-lg bg-white/10 border border-white/20 placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-md transition-shadow shadow-[0_0_0_0_rgba(0,0,0,0)] focus:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar catÃ©gories */}
            <aside className="lg:col-span-1">
              <div className="sticky top-6 rounded-3xl bg-white border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {language === 'fr' ? 'CatÃ©gories' : 'Categories'}
                </h3>
                <div className="space-y-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isActive = selectedCategory === category.id;
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryClick(category.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-transparent'
                        }`}
                        aria-pressed={isActive}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                              isActive
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <Icon size={18} />
                          </span>
                          <span className="font-medium">{category.name}</span>
                        </span>
                        <span
                          className={`text-sm px-2 py-1 rounded-full ${
                            isActive
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {category.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Liste dâ€™articles */}
            <section className="lg:col-span-3">
              {isLoading ? (
                <div className="text-center py-16">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-b-0 border-red-600" />
                  <p className="mt-4 text-gray-500">
                    {language === 'fr'
                      ? 'Chargement des articles...'
                      : 'Loading articles...'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                      {selectedCategory === 'all'
                        ? language === 'fr'
                          ? 'Tous les articles'
                          : 'All articles'
                        : categories.find((c) => c.id === selectedCategory)?.name}
                    </h2>
                    <p className="text-gray-600">
                      {filteredArticles.length}{' '}
                      {language === 'fr' ? 'article(s) trouvÃ©(s)' : 'article(s) found'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredArticles.map((article) => (
                      <article
                        key={article.id}
                        onClick={() => handleArticleClick(article)}
                        className="group cursor-pointer rounded-3xl border border-gray-200 bg-white p-6 hover:shadow-xl transition-all hover:scale-[1.01]"
                        aria-label={article.title}
                      >
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {article.excerpt}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {article.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                            â± {article.readTime}{' '}
                            {language === 'fr' ? 'min de lecture' : 'min read'}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>

                  {filteredArticles.length === 0 && (
                    <div className="text-center py-16">
                      <div className="text-gray-600 text-lg mb-4">
                        {language === 'fr'
                          ? 'Aucun article trouvÃ© pour ces critÃ¨res'
                          : 'No articles found for these criteria'}
                      </div>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCategory('all');
                        }}
                        className="inline-flex items-center gap-2 font-semibold text-blue-700 hover:text-blue-800"
                      >
                        â†»{' '}
                        {language === 'fr'
                          ? 'RÃ©initialiser la recherche'
                          : 'Reset search'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </main>

        {/* Contact Support */}
        <section className="relative bg-gradient-to-r from-red-600 via-red-500 to-orange-500 py-16">
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
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
                className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-8 py-3 rounded-2xl font-semibold transition-all hover:scale-105 border-2 border-white"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  <Mail size={20} />
                  <span>{language === 'fr' ? 'Nous contacter' : 'Contact us'}</span>
                </span>
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5" />
              </a>

              <a
                href="/sos-appel"
                className="group relative overflow-hidden border-2 border-white bg-transparent text-white px-8 py-3 rounded-2xl font-semibold transition-all hover:scale-105 hover:bg-white/10"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  <Phone size={20} />
                  <span>
                    {language === 'fr' ? "Appel d'urgence" : 'Emergency call'}
                  </span>
                </span>
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/30" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default HelpCenter;
