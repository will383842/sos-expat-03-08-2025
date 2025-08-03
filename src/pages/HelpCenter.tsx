import React, { useState } from 'react';
import { Search, Phone, Mail, MessageCircle, Book, Users, FileText, CreditCard, Shield, Settings, AlertTriangle, Globe } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);

  const articles: Article[] = [
    // Appels d'urgence
    {
      id: '1',
      title: language === 'fr' ? 'Comment passer un appel d\'urgence' : 'How to make an emergency call',
      excerpt: language === 'fr' ? 'Guide complet pour utiliser le bouton S.O.S et être mis en relation rapidement' : 'Complete guide to use the S.O.S button and get connected quickly',
      category: 'emergency_calls',
      tags: ['sos', 'urgence', 'appel', 'aide'],
      readTime: 3,
      content: language === 'fr' ? `
# Comment passer un appel d'urgence

## Étape 1 : Cliquez sur le bouton S.O.S
Le bouton rouge "S.O.S Appel" est disponible sur toutes les pages du site. Il vous connecte immédiatement avec le premier expert disponible.

## Étape 2 : Choisissez votre type d'aide
- **Avocat** : Pour des questions juridiques urgentes (49€ - 20 min)
- **Expatrié** : Pour des conseils pratiques d'expatriation (19€ - 30 min)

## Étape 3 : Décrivez votre situation
Expliquez brièvement votre problème pour que l'expert puisse vous aider efficacement.

## Étape 4 : Paiement sécurisé
Le paiement se fait via Stripe. Vous n'êtes débité qu'après confirmation de l'appel.

## Étape 5 : Connexion automatique
Vous recevez un appel dans les 5 minutes suivant le paiement.

**Important** : Assurez-vous que votre numéro de téléphone est correct dans votre profil.
      ` : `
# How to make an emergency call

## Step 1: Click the S.O.S button
The red "S.O.S Call" button is available on all pages of the site. It immediately connects you with the first available expert.

## Step 2: Choose your type of help
- **Lawyer**: For urgent legal questions (€49 - 20 min)
- **Expat**: For practical expatriation advice (€19 - 30 min)

## Step 3: Describe your situation
Briefly explain your problem so the expert can help you effectively.

## Step 4: Secure payment
Payment is made via Stripe. You are only charged after call confirmation.

## Step 5: Automatic connection
You receive a call within 5 minutes of payment.

**Important**: Make sure your phone number is correct in your profile.
      `
    },
    {
      id: '2',
      title: language === 'fr' ? 'Que faire si l\'expert ne répond pas' : 'What to do if the expert doesn\'t answer',
      excerpt: language === 'fr' ? 'Procédure automatique de remboursement et alternatives disponibles' : 'Automatic refund procedure and available alternatives',
      category: 'emergency_calls',
      tags: ['expert', 'disponibilité', 'remboursement'],
      readTime: 2,
      content: language === 'fr' ? `
# Que faire si l'expert ne répond pas

## Système automatique
Si l'expert ne répond pas après **3 tentatives d'appel** espacées de 2 minutes, vous êtes **automatiquement remboursé** sous 24h.

## Alternatives disponibles
1. **Choisir un autre expert** immédiatement
2. **Réessayer plus tard** avec le même expert
3. **Contacter le support** pour assistance

## Garantie 100%
Nous garantissons votre satisfaction. Si vous n'êtes pas satisfait, contactez-nous dans les 24h.

## Temps de réponse
- **Remboursement automatique** : 24h maximum
- **Support client** : Réponse sous 2h
      ` : `
# What to do if the expert doesn't answer

## Automatic system
If the expert doesn't answer after **3 call attempts** spaced 2 minutes apart, you are **automatically refunded** within 24h.

## Available alternatives
1. **Choose another expert** immediately
2. **Try again later** with the same expert
3. **Contact support** for assistance

## 100% guarantee
We guarantee your satisfaction. If you're not satisfied, contact us within 24h.

## Response times
- **Automatic refund**: 24h maximum
- **Customer support**: Response within 2h
      `
    },
    {
      id: '3',
      title: language === 'fr' ? 'Choisir entre avocat et expatrié' : 'Choose between lawyer and expat',
      excerpt: language === 'fr' ? 'Comprendre les différences et choisir le bon type d\'aide' : 'Understand the differences and choose the right type of help',
      category: 'emergency_calls',
      tags: ['avocat', 'expatrié', 'choix', 'conseil'],
      readTime: 4,
      content: language === 'fr' ? `
# Choisir entre avocat et expatrié

## Appel Avocat (49€ - 20 min)
**Quand choisir :**
- Questions juridiques complexes
- Problèmes de visa ou immigration
- Litiges ou conflits
- Conseils légaux officiels

**Avantages :**
- Expertise juridique certifiée
- Conseils officiels et fiables
- Connaissance des lois locales

## Appel Expatrié (19€ - 30 min)
**Quand choisir :**
- Conseils pratiques du quotidien
- Démarches administratives
- Recherche de logement
- Intégration culturelle

**Avantages :**
- Expérience vécue
- Conseils pratiques
- Prix accessible
- Plus de temps d'échange

## Comment décider ?
- **Urgence légale** → Avocat
- **Conseil pratique** → Expatrié
- **Budget serré** → Expatrié
- **Expertise officielle** → Avocat
      ` : `
# Choose between lawyer and expat

## Lawyer Call (€49 - 20 min)
**When to choose:**
- Complex legal questions
- Visa or immigration issues
- Disputes or conflicts
- Official legal advice

**Advantages:**
- Certified legal expertise
- Official and reliable advice
- Knowledge of local laws

## Expat Call (€19 - 30 min)
**When to choose:**
- Practical daily advice
- Administrative procedures
- Housing search
- Cultural integration

**Advantages:**
- Lived experience
- Practical advice
- Affordable price
- More exchange time

## How to decide?
- **Legal emergency** → Lawyer
- **Practical advice** → Expat
- **Tight budget** → Expat
- **Official expertise** → Lawyer
      `
    },

    // Compte utilisateur
    {
      id: '4',
      title: language === 'fr' ? 'Créer et gérer votre compte' : 'Create and manage your account',
      excerpt: language === 'fr' ? 'Inscription, validation et gestion de votre profil utilisateur' : 'Registration, validation and management of your user profile',
      category: 'user_account',
      tags: ['inscription', 'profil', 'validation'],
      readTime: 5,
      content: language === 'fr' ? `
# Créer et gérer votre compte

## Types de comptes
1. **Client** : Approuvé automatiquement
2. **Avocat** : Validation manuelle sous 5 minutes
3. **Expatrié aidant** : Validation manuelle sous 5 minutes

## Inscription Client
- Gratuite et immédiate
- Accès direct aux services
- Aucun document requis

## Inscription Avocat
- Diplôme d'avocat requis
- Justificatifs d'inscription au barreau
- Validation par notre équipe

## Inscription Expatrié
- Justificatif de résidence à l'étranger
- Minimum 1 an d'expérience d'expatriation
- Pièce d'identité valide

## Gestion du profil
- Modifier vos informations personnelles
- Changer votre numéro de téléphone
- Mettre à jour vos préférences
      ` : `
# Create and manage your account

## Account types
1. **Client**: Automatically approved
2. **Lawyer**: Manual validation within 5 minutes
3. **Expat helper**: Manual validation within 5 minutes

## Client registration
- Free and immediate
- Direct access to services
- No documents required

## Lawyer registration
- Law degree required
- Bar admission documents
- Validation by our team

## Expat registration
- Proof of residence abroad
- Minimum 1 year expat experience
- Valid ID document

## Profile management
- Modify your personal information
- Change your phone number
- Update your preferences
      `
    },

    // Paiements
    {
      id: '5',
      title: language === 'fr' ? 'Méthodes de paiement et sécurité' : 'Payment methods and security',
      excerpt: language === 'fr' ? 'Cartes acceptées, sécurité des transactions et facturation' : 'Accepted cards, transaction security and billing',
      category: 'payments',
      tags: ['paiement', 'carte', 'sécurité', 'stripe'],
      readTime: 3,
      content: language === 'fr' ? `
# Méthodes de paiement et sécurité

## Cartes acceptées
- Visa, Mastercard, American Express
- Cartes de débit et crédit
- Cartes internationales
- Apple Pay et Google Pay

## Sécurité
- Paiements sécurisés par **Stripe**
- Chiffrement SSL 256-bit
- Aucune donnée bancaire stockée
- Conformité PCI DSS

## Facturation
- Facture PDF automatique
- TVA incluse dans tous les prix
- Téléchargement depuis votre dashboard
- Parfait pour remboursements d'assurance

## Tarifs fixes
- **Avocat** : 49€ TTC (20 min)
- **Expatrié** : 19€ TTC (30 min)
- Aucun frais caché
      ` : `
# Payment methods and security

## Accepted cards
- Visa, Mastercard, American Express
- Debit and credit cards
- International cards
- Apple Pay and Google Pay

## Security
- Payments secured by **Stripe**
- 256-bit SSL encryption
- No banking data stored
- PCI DSS compliance

## Billing
- Automatic PDF invoice
- VAT included in all prices
- Download from your dashboard
- Perfect for insurance reimbursements

## Fixed rates
- **Lawyer**: €49 incl. VAT (20 min)
- **Expat**: €19 incl. VAT (30 min)
- No hidden fees
      `
    },

    // Guides pratiques
    {
      id: '6',
      title: language === 'fr' ? 'Guide de l\'expatriation réussie' : 'Successful expatriation guide',
      excerpt: language === 'fr' ? 'Conseils essentiels pour réussir votre expatriation' : 'Essential tips for successful expatriation',
      category: 'practical_guides',
      tags: ['expatriation', 'conseils', 'guide', 'international'],
      readTime: 10,
      content: language === 'fr' ? `
# Guide de l'expatriation réussie

## Avant le départ
1. **Recherche du pays**
   - Climat et géographie
   - Système politique et économique
   - Culture et traditions locales

2. **Démarches administratives**
   - Visa et permis de travail
   - Assurance santé internationale
   - Déclarations fiscales

3. **Préparation financière**
   - Budget d'installation
   - Ouverture de compte bancaire
   - Transferts d'argent internationaux

## Première installation
1. **Logement temporaire**
   - Hôtel ou Airbnb
   - Recherche de logement permanent
   - Quartiers recommandés

2. **Démarches prioritaires**
   - Numéro de sécurité sociale
   - Permis de conduire local
   - Inscription consulaire

## Intégration réussie
1. **Apprentissage de la langue**
   - Cours de langue locale
   - Applications mobiles
   - Immersion culturelle

2. **Réseau social**
   - Communautés d'expatriés
   - Activités locales
   - Associations professionnelles

## Conseils d'experts
- Gardez toujours des copies de vos documents
- Souscrivez une assurance complète
- Restez en contact avec votre consulat
- Préparez un budget d'urgence
      ` : `
# Successful expatriation guide

## Before departure
1. **Country research**
   - Climate and geography
   - Political and economic system
   - Local culture and traditions

2. **Administrative procedures**
   - Visa and work permit
   - International health insurance
   - Tax declarations

3. **Financial preparation**
   - Installation budget
   - Bank account opening
   - International money transfers

## First installation
1. **Temporary housing**
   - Hotel or Airbnb
   - Permanent housing search
   - Recommended neighborhoods

2. **Priority procedures**
   - Social security number
   - Local driving license
   - Consular registration

## Successful integration
1. **Language learning**
   - Local language courses
   - Mobile applications
   - Cultural immersion

2. **Social network**
   - Expat communities
   - Local activities
   - Professional associations

## Expert advice
- Always keep copies of your documents
- Subscribe to comprehensive insurance
- Stay in contact with your consulate
- Prepare an emergency budget
      `
    }
  ];

  const categories = [
    { 
      id: 'all', 
      name: language === 'fr' ? 'Toutes les catégories' : 'All categories', 
      icon: Book, 
      count: articles.length 
    },
    { 
      id: 'emergency_calls', 
      name: language === 'fr' ? 'Appels d\'urgence' : 'Emergency calls', 
      icon: Phone, 
      count: articles.filter(a => a.category === 'emergency_calls').length 
    },
    { 
      id: 'user_account', 
      name: language === 'fr' ? 'Compte utilisateur' : 'User account', 
      icon: Users, 
      count: articles.filter(a => a.category === 'user_account').length 
    },
    { 
      id: 'payments', 
      name: language === 'fr' ? 'Paiements' : 'Payments', 
      icon: CreditCard, 
      count: articles.filter(a => a.category === 'payments').length 
    },
    { 
      id: 'practical_guides', 
      name: language === 'fr' ? 'Guides pratiques' : 'Practical guides', 
      icon: Book, 
      count: articles.filter(a => a.category === 'practical_guides').length 
    }
  ];

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

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

  // Vue article détaillé
  if (selectedArticle) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <button
              onClick={handleBackToList}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors"
            >
              <span>←</span>
              <span>{language === 'fr' ? 'Retour aux articles' : 'Back to articles'}</span>
            </button>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {selectedArticle.title}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{selectedArticle.readTime} min {language === 'fr' ? 'de lecture' : 'read'}</span>
                  <div className="flex space-x-2">
                    {selectedArticle.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ 
                  __html: selectedArticle.content.replace(/\n/g, '<br>').replace(/## /g, '<h2>').replace(/# /g, '<h1>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                }} />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {language === 'fr' ? 'Centre d\'aide' : 'Help Center'}
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              {language === 'fr'
                ? 'Trouvez rapidement les réponses à vos questions et guides pratiques'
                : 'Quickly find answers to your questions and practical guides'
              }
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={language === 'fr' ? 'Rechercher dans l\'aide...' : 'Search help...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-lg"
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
                        onClick={() => handleCategoryClick(category.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                          selectedCategory === category.id
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon size={18} />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          selectedCategory === category.id
                            ? 'bg-blue-100 text-blue-700'
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

            {/* Articles Content */}
            <div className="lg:col-span-3">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Chargement des articles...</p>
                </div>
              ) : (
              <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedCategory === 'all' 
                    ? (language === 'fr' ? 'Tous les articles' : 'All articles')
                    : categories.find(c => c.id === selectedCategory)?.name
                  }
                </h2>
                <p className="text-gray-600">
                  {filteredArticles.length} {language === 'fr' ? 'article(s) trouvé(s)' : 'article(s) found'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredArticles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => handleArticleClick(article)}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h3>
                    
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {article.tags.slice(0, 2).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">
                        {article.readTime} min {language === 'fr' ? 'de lecture' : 'read'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {filteredArticles.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">
                    {language === 'fr' 
                      ? 'Aucun article trouvé pour ces critères'
                      : 'No articles found for these criteria'
                    }
                  </div>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {language === 'fr' ? 'Réinitialiser la recherche' : 'Reset search'}
                  </button>
                </div>
              )}
              </>
              )}
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              {language === 'fr' 
                ? 'Vous ne trouvez pas votre réponse ?'
                : 'Can\'t find your answer?'
              }
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              {language === 'fr'
                ? 'Notre équipe support est disponible 24/7 pour vous aider'
                : 'Our support team is available 24/7 to help you'
              }
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <Mail size={20} />
                <span>{language === 'fr' ? 'Nous contacter' : 'Contact us'}</span>
              </a>
              
              <a
                href="/sos-appel"
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
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

export default HelpCenter;