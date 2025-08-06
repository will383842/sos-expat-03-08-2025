import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, Star, MapPin, Search, Filter, ChevronDown } from 'lucide-react';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/layout/Layout';
import SEOHead from '../components/layout/SEOHead';
import { useApp } from '../contexts/AppContext';
import { getCountryCoordinates } from '../utils/countryCoordinates';

interface Provider {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  type: 'lawyer' | 'expat';
  country: string;
  languages: string[];
  reviewCount: number;
  yearsOfExperience: number;
  rating: number;
  price: number;
  isOnline: boolean;
  avatar: string;
  specialties: string[];
  description: string;
  duration?: number;
  isActive?: boolean;
  isVisible?: boolean;
  isApproved?: boolean;
  hasValidCountry?: boolean;
  isBanned?: boolean;
}

const SOSCall: React.FC = () => {
  const { language } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<'all' | 'lawyer' | 'expat'>(
    searchParams.get('type') === 'lawyer' ? 'lawyer' : 
    searchParams.get('type') === 'expat' ? 'expat' : 'all'
  );
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [customCountry, setCustomCountry] = useState<string>('');
  const [customLanguage, setCustomLanguage] = useState<string>('');
  const [showCustomCountry, setShowCustomCountry] = useState<boolean>(false);
  const [showCustomLanguage, setShowCustomLanguage] = useState<boolean>(false);
  const [onlineOnly, setOnlineOnly] = useState<boolean>(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState<boolean>(true);
  const [realProviders, setRealProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);

  const getLanguageLabel = (lang: string): string => {
    const languageMap: { [key: string]: string } = {
      'Français': 'Français',
      'French': 'Français',
      'Anglais': 'Anglais',
      'English': 'Anglais',
      'Espagnol': 'Espagnol',
      'Spanish': 'Espagnol',
      'Español': 'Espagnol',
      'Allemand': 'Allemand',
      'German': 'Allemand',
      'Deutsch': 'Allemand',
      'Italien': 'Italien',
      'Italian': 'Italien',
      'Italiano': 'Italien',
      'Portugais': 'Portugais',
      'Portuguese': 'Portugais',
      'Português': 'Portugais',
      'Russe': 'Russe',
      'Russian': 'Russe',
      'Русский': 'Russe',
      'Chinois': 'Chinois',
      'Chinese': 'Chinois',
      '中文': 'Chinois',
      'Japonais': 'Japonais',
      'Japanese': 'Japonais',
      '日本語': 'Japonais',
      'Coréen': 'Coréen',
      'Korean': 'Coréen',
      '한국어': 'Coréen',
      'Arabe': 'Arabe',
      'Arabic': 'Arabe',
      'العربية': 'Arabe',
      'Hindi': 'Hindi',
      'हिन्दी': 'Hindi',
      'Thaï': 'Thaï',
      'Thai': 'Thaï',
      'ไทย': 'Thaï'
    };
    
    return languageMap[lang] || lang;
  };

  const countryOptions = [
    'Afghanistan', 'Afrique du Sud', 'Albanie', 'Algérie', 'Allemagne', 'Andorre', 'Angola',
    'Arabie Saoudite', 'Argentine', 'Arménie', 'Australie', 'Autriche', 'Azerbaïdjan',
    'Bahamas', 'Bahreïn', 'Bangladesh', 'Barbade', 'Belgique', 'Belize', 'Bénin',
    'Bhoutan', 'Biélorussie', 'Birmanie', 'Bolivie', 'Bosnie-Herzégovine', 'Botswana',
    'Brésil', 'Brunei', 'Bulgarie', 'Burkina Faso', 'Burundi', 'Cambodge', 'Cameroun',
    'Canada', 'Cap-Vert', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Comores',
    'Congo', 'Corée du Nord', 'Corée du Sud', 'Costa Rica', 'Côte d\'Ivoire', 'Croatie', 'Cuba',
    'Danemark', 'Djibouti', 'Dominique', 'Égypte', 'Émirats arabes unis', 'Équateur', 'Érythrée',
    'Espagne', 'Estonie', 'États-Unis', 'Éthiopie', 'Fidji', 'Finlande', 'France',
    'Gabon', 'Gambie', 'Géorgie', 'Ghana', 'Grèce', 'Grenade', 'Guatemala', 'Guinée',
    'Guinée-Bissau', 'Guinée équatoriale', 'Guyana', 'Haïti', 'Honduras', 'Hongrie',
    'Îles Cook', 'Îles Marshall', 'Îles Salomon', 'Inde', 'Indonésie', 'Irak', 'Iran',
    'Irlande', 'Islande', 'Israël', 'Italie', 'Jamaïque', 'Japon', 'Jordanie',
    'Kazakhstan', 'Kenya', 'Kirghizistan', 'Kiribati', 'Koweït', 'Laos', 'Lesotho',
    'Lettonie', 'Liban', 'Liberia', 'Libye', 'Liechtenstein', 'Lituanie', 'Luxembourg',
    'Macédoine du Nord', 'Madagascar', 'Malaisie', 'Malawi', 'Maldives', 'Mali', 'Malte',
    'Maroc', 'Maurice', 'Mauritanie', 'Mexique', 'Micronésie', 'Moldavie', 'Monaco',
    'Mongolie', 'Monténégro', 'Mozambique', 'Namibie', 'Nauru', 'Népal', 'Nicaragua',
    'Niger', 'Nigeria', 'Niue', 'Norvège', 'Nouvelle-Zélande', 'Oman', 'Ouganda',
    'Ouzbékistan', 'Pakistan', 'Palaos', 'Palestine', 'Panama', 'Papouasie-Nouvelle-Guinée',
    'Paraguay', 'Pays-Bas', 'Pérou', 'Philippines', 'Pologne', 'Portugal', 'Qatar',
    'République centrafricaine', 'République démocratique du Congo', 'République dominicaine',
    'République tchèque', 'Roumanie', 'Royaume-Uni', 'Russie', 'Rwanda', 'Saint-Kitts-et-Nevis',
    'Saint-Marin', 'Saint-Vincent-et-les-Grenadines', 'Sainte-Lucie', 'Salvador', 'Samoa',
    'São Tomé-et-Principe', 'Sénégal', 'Serbie', 'Seychelles', 'Sierra Leone', 'Singapour',
    'Slovaquie', 'Slovénie', 'Somalie', 'Soudan', 'Soudan du Sud', 'Sri Lanka', 'Suède',
    'Suisse', 'Suriname', 'Syrie', 'Tadjikistan', 'Tanzanie', 'Tchad', 'Thaïlande',
    'Timor oriental', 'Togo', 'Tonga', 'Trinité-et-Tobago', 'Tunisie', 'Turkménistan',
    'Turquie', 'Tuvalu', 'Ukraine', 'Uruguay', 'Vanuatu', 'Vatican', 'Venezuela',
    'Vietnam', 'Yémen', 'Zambie', 'Zimbabwe'
  ];

  const languageOptions = [
    'Afrikaans', 'Albanais', 'Allemand', 'Amharique', 'Anglais', 'Arabe', 'Arménien',
    'Azéri', 'Basque', 'Bengali', 'Biélorusse', 'Birman', 'Bosniaque', 'Bulgare',
    'Catalan', 'Chinois', 'Coréen', 'Croate', 'Danois', 'Espagnol', 'Estonien',
    'Finnois', 'Français', 'Géorgien', 'Grec', 'Gujarati', 'Hébreu', 'Hindi',
    'Hongrois', 'Indonésien', 'Irlandais', 'Islandais', 'Italien', 'Japonais',
    'Kannada', 'Kazakh', 'Khmer', 'Kirghize', 'Letton', 'Lituanien', 'Luxembourgeois',
    'Macédonien', 'Malais', 'Malayalam', 'Maltais', 'Marathi', 'Mongol', 'Néerlandais',
    'Népalais', 'Norvégien', 'Ourdou', 'Ouzbek', 'Pachto', 'Persan', 'Polonais',
    'Portugais', 'Punjabi', 'Roumain', 'Russe', 'Serbe', 'Singhalais', 'Slovaque',
    'Slovène', 'Suédois', 'Swahili', 'Tadjik', 'Tamoul', 'Tchèque', 'Telugu',
    'Thaï', 'Tibétain', 'Turc', 'Turkmen', 'Ukrainien', 'Vietnamien', 'Gallois'
  ];
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get('type');
    if (typeParam === 'lawyer' || typeParam === 'expat') {
      setSelectedType(typeParam);
      setSearchParams({ type: typeParam });
    }
    
    const sosProfilesQuery = query(
      collection(db, 'sos_profiles'),
      limit(100)
    );

    const unsubscribe = onSnapshot(sosProfilesQuery, (snapshot) => {
      if (snapshot.empty) {
        setRealProviders([]);
        setFilteredProviders([]);
        setIsLoadingProviders(false);
        return;
      }
      
      const allProfiles = snapshot.docs.map(doc => {
        const data = doc.data();
        const fullName = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Expert';
        const type = data.type || 'expat';
        
        const isApproved = data.isApproved !== false;
        const isActive = data.isActive !== false;
        const isOnline = data.isOnline === true;
        const isVisible = data.isVisible !== false;
        
        const presenceCountry = data.currentPresenceCountry || data.country || '';
        const hasValidCountry = presenceCountry && getCountryCoordinates(presenceCountry) !== null;
        
        return {
          id: doc.id,
          name: fullName,
          firstName: data.firstName,
          lastName: data.lastName,
          type,
          country: presenceCountry,
          languages: data.languages || ['Français'],
          specialties: data.specialties || [],
          rating: typeof data.rating === 'number' ? data.rating : 4.5,
          reviewCount: data.reviewCount || 0,
          yearsOfExperience: data.yearsOfExperience || data.yearsAsExpat || 0,
          isOnline: isOnline,
          isActive: isActive,
          isVisible: isVisible,
          isApproved: isApproved,
          hasValidCountry: hasValidCountry,
          isBanned: data.isBanned || false,
          description: data.bio || '',
          price: data.price || (type === 'lawyer' ? 49 : 19),
          duration: data.duration,
          avatar: data.profilePhoto || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=2'
        };
      });

      const filteredRoles = ['lawyer', 'expat'];
      const onlyProviders = allProfiles.filter(profile => filteredRoles.includes(profile.type));

      const activeProfiles = onlyProviders.filter(profile => {
        const notBanned = profile.isBanned !== true;
        const hasBasicInfo = profile.name && profile.name.trim() !== '';
        const hasValidCountry = profile.country && profile.country.trim() !== '';
        const isVisible = profile.isVisible !== false;
        
        const isApprovedLawyer = profile.type !== 'lawyer' || profile.isApproved !== false;

        return notBanned && hasBasicInfo && hasValidCountry && isVisible && isApprovedLawyer;
      });

      setRealProviders(activeProfiles);
      setFilteredProviders(activeProfiles);
      setIsLoadingProviders(false);
    }, (error) => {
      console.error('Erreur lors de l\'écoute des profils:', error);
      setRealProviders([]);
      setFilteredProviders([]);
      setIsLoadingProviders(false);
    });

    return () => {
      unsubscribe();
    };
  }, [setSearchParams]);

  useEffect(() => {
    if (realProviders.length === 0) return;
    
    let filtered = realProviders.filter(provider => {
      const matchesType = selectedType === 'all' || provider.type === selectedType;
      
      const matchesCountry = selectedCountry === 'all' || 
        provider.country === selectedCountry ||
        (selectedCountry === 'Autre' && customCountry && provider.country.toLowerCase().includes(customCountry.toLowerCase()));
         
      const matchesLanguage = selectedLanguage === 'all' || 
        (provider.languages && provider.languages.some(lang => 
          lang === selectedLanguage
        )) ||
        (selectedLanguage === 'Autre' && customLanguage && provider.languages && provider.languages.some(lang =>
          lang.toLowerCase().includes(customLanguage.toLowerCase())
        ));
        
      const matchesStatus = !onlineOnly || provider.isOnline;
      
      return matchesType && matchesCountry && matchesLanguage && matchesStatus;
    });
    
    filtered.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
      }
      
      if (selectedCountry !== 'all') {
        const aCountryMatch = a.country === selectedCountry;
        const bCountryMatch = b.country === selectedCountry;
        if (aCountryMatch !== bCountryMatch) {
          return aCountryMatch ? -1 : 1;
        }
      }
      
      return b.rating - a.rating;
    });
    
    setFilteredProviders(filtered);
  }, [realProviders, selectedType, selectedCountry, selectedLanguage, customCountry, customLanguage, onlineOnly]);

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    setShowCustomCountry(value === 'Autre');
    if (value !== 'Autre') {
      setCustomCountry('');
    }
  };

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    setShowCustomLanguage(value === 'Autre');
    if (value !== 'Autre') {
      setCustomLanguage('');
    }
  };

  // ✅ CORRECTION PRINCIPALE : Navigation vers le profil au lieu du paiement
  const handleProviderClick = (provider: Provider) => {
    console.log('🔗 Navigation vers le profil de:', provider.name);
    
    // Générer URL SEO standardisée
    const typeSlug = provider.type === 'lawyer' ? 'avocat' : 'expatrie';
    const countrySlug = provider.country.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
    const nameSlug = provider.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
    
    const seoUrl = `/${typeSlug}/${countrySlug}/francais/${nameSlug}-${provider.id}`;
    
    console.log('🔗 URL générée:', seoUrl);
    
    // Sauvegarder les données du provider
    try {
      sessionStorage.setItem('selectedProvider', JSON.stringify(provider));
    } catch (error) {
      console.warn('⚠️ Erreur sessionStorage:', error);
    }
    
    // ✅ TOUJOURS naviguer vers le profil (suppression de la logique agressive)
    navigate(seoUrl, { 
      state: { 
        selectedProvider: provider,
        navigationSource: 'sos_call'
      }
    });
  };

  const truncateText = (text: string, maxLength: number): { text: string; isTruncated: boolean } => {
    if (text.length <= maxLength) {
      return { text, isTruncated: false };
    }
    return { text: text.substring(0, maxLength) + '...', isTruncated: true };
  };

  return (
    <Layout>
      <SEOHead
        title={`${selectedType === 'lawyer' ? 'Avocats' : selectedType === 'expat' ? 'Expatriés' : 'Experts'} disponibles | SOS Expat & Travelers`}
        description={`Trouvez un ${selectedType === 'lawyer' ? 'avocat' : selectedType === 'expat' ? 'expatrié' : 'expert'} vérifié disponible immédiatement. Consultation en ligne 24h/24, 7j/7 dans plus de 120 pays.`}
        canonicalUrl="/sos-appel"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": `SOS Experts ${selectedType === 'lawyer' ? 'Juridiques' : 'Expatriation'}`,
          "provider": {
            "@type": "Organization",
            "name": "SOS Expat & Travelers",
            "url": "https://sosexpat.com"
          },
          "serviceType": selectedType === 'lawyer' ? "Legal Consultation" : "Expat Assistance",
          "areaServed": {
            "@type": "Country",
            "name": selectedCountry !== 'all' ? selectedCountry : "Worldwide"
          },
          "description": `Service de consultation ${selectedType === 'lawyer' ? 'juridique' : 'expatriation'} en ligne disponible 24h/24`,
          "availableChannel": {
            "@type": "ServiceChannel",
            "serviceType": "Online Video Call",
            "availableLanguage": selectedLanguage !== 'all' ? selectedLanguage : ["French", "English", "Spanish"]
          }
        }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <section role="banner" className="relative overflow-hidden bg-gradient-to-r from-red-600 via-red-700 to-red-800">
          <div className="absolute inset-0 bg-black/10" aria-hidden="true"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-full mb-6 sm:mb-8" aria-hidden="true">
                <Phone className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6 tracking-tight">
                S.O.S Appel d'urgence
              </h1>
              
              <p className="text-lg sm:text-xl lg:text-2xl text-red-100 max-w-3xl mx-auto mb-8 sm:mb-10 font-medium">
                Obtenez une aide immédiate d'un expert vérifié en moins de 5 minutes
              </p>
            </div>
          </div>
        </section>

        <main className="py-8 sm:py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6 sm:mb-8">
                {selectedType === 'lawyer' ? 'Avocats disponibles' : selectedType === 'expat' ? 'Expatriés disponibles' : 'Experts disponibles'}
              </h2>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100/60 p-4 sm:p-6 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="expert-type" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Type
                    </label>
                    <div className="relative">
                      <select
                        id="expert-type"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as 'all' | 'lawyer' | 'expat')}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none text-sm"
                      >
                        <option value="all">Tous</option>
                        <option value="lawyer">Avocats</option>
                        <option value="expat">Expatriés</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" aria-hidden="true" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="country-filter" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Pays
                    </label>
                    <div className="relative">
                      <select
                        id="country-filter"
                        value={selectedCountry}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none text-sm"
                      >
                        <option value="all">Tous les pays</option>
                        {countryOptions.map(country => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                        <option value="Autre">Autre</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" aria-hidden="true" />
                    </div>
                    {showCustomCountry && (
                      <input
                        type="text"
                        placeholder="Nom du pays"
                        value={customCountry}
                        onChange={(e) => setCustomCountry(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm mt-2"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="language-filter" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Langue
                    </label>
                    <div className="relative">
                      <select
                        id="language-filter"
                        value={selectedLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none text-sm"
                      >
                        <option value="all">Toutes</option>
                        {languageOptions.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                        <option value="Autre">Autre</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" aria-hidden="true" />
                    </div>
                    {showCustomLanguage && (
                      <input
                        type="text"
                        placeholder="Langue"
                        value={customLanguage}
                        onChange={(e) => setCustomLanguage(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm mt-2"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Statut
                    </label>
                    <div className="flex items-center h-10">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={onlineOnly}
                          onChange={(e) => setOnlineOnly(e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-white border-gray-300 rounded focus:ring-red-500 focus:ring-2 mr-2"
                        />
                        <span className="text-sm text-gray-700">En ligne seulement</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-transparent">
                      Action
                    </label>
                    <button
                      onClick={() => {
                        setSelectedType('all');
                        setSelectedCountry('all');
                        setSelectedLanguage('all');
                        setCustomCountry('');
                        setCustomLanguage('');
                        setShowCustomCountry(false);
                        setShowCustomLanguage(false);
                        setOnlineOnly(false);
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm font-medium h-10"
                    >
                      Réinitialiser
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-center text-xs text-gray-500">
                  {filteredProviders.filter(p => p.isOnline).length} en ligne • {filteredProviders.length} au total
                </div>
              </div>
            </div>
            
            {isLoadingProviders ? (
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 sm:gap-6 lg:hidden" style={{ width: 'max-content' }}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={`loading-mobile-${index}`} className="flex-shrink-0 w-80 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                      <div className="aspect-[3/4] bg-gray-200"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={`loading-desktop-${index}`} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                      <div className="aspect-[3/4] bg-gray-200"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredProviders.length > 0 ? (
              <>
                <div className="overflow-x-auto pb-4 lg:hidden">
                  <div className="flex gap-4 sm:gap-6" style={{ width: 'max-content' }}>
                    {filteredProviders.map((provider) => {
                      const { text: truncatedDescription, isTruncated } = truncateText(provider.description, 80);
                      
                      return (
                        <article
                          key={provider.id}
                          className={`flex-shrink-0 w-80 group bg-white rounded-3xl shadow-lg overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 backdrop-blur-sm cursor-pointer border-[3px] ${
                            provider.isOnline 
                              ? 'border-green-500 shadow-green-500/20 hover:border-green-600 hover:shadow-green-600/30' 
                              : 'border-red-500 shadow-red-500/20 hover:border-red-600 hover:shadow-red-600/30'
                          }`}
                          onClick={() => handleProviderClick(provider)}
                          itemScope
                          itemType="https://schema.org/Person"
                        >
                          <div className="relative aspect-[3/4] overflow-hidden">
                            <img
                              src={provider.avatar}
                              alt={`${provider.name} - ${provider.type === 'lawyer' ? 'Avocat' : 'Expatrié'}`}
                              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                              itemProp="image"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = '/default-avatar.png';
                              }}
                            />
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 group-hover:from-black/20 transition-all duration-500"></div>
                            
                            <div className="absolute top-4 left-4">
                              <div className={`px-4 py-2 rounded-2xl text-sm font-bold backdrop-blur-xl ${
                                provider.type === 'lawyer' 
                                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30' 
                                  : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/30'
                              }`}>
                                {provider.type === 'lawyer' ? '⚖️ Avocat' : '🌍 Expatrié'}
                              </div>
                            </div>
                            
                            <div className="absolute top-4 right-4">
                              <div className="bg-white/95 backdrop-blur-xl px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                <span className="text-sm font-bold text-gray-900">{provider.rating.toFixed(1)}</span>
                              </div>
                            </div>

                            <div className="absolute bottom-4 right-4">
                              <div className={`w-5 h-5 rounded-full shadow-xl border-2 border-white ${
                                provider.isOnline 
                                  ? 'bg-green-500 shadow-green-500/60 animate-pulse' 
                                  : 'bg-red-500 shadow-red-500/60'
                              }`}></div>
                            </div>
                          </div>
                          
                          <div className="p-6 flex flex-col h-80">
                            <div className="mb-4">
                              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-red-600 transition-colors" itemProp="name">
                                {provider.name}
                              </h3>
                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>{provider.yearsOfExperience} ans d'expérience</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-yellow-500">★</span>
                                  <span className="font-medium">({provider.reviewCount})</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4 flex-1">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm">🗣️</span>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-700">Langues parlées</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {provider.languages.slice(0, 3).map((lang, index) => (
                                    <span
                                      key={index}
                                      className="px-3 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 text-sm font-medium rounded-full border border-blue-200/50"
                                    >
                                      {getLanguageLabel(lang)}
                                    </span>
                                  ))}
                                  {provider.languages.length > 3 && (
                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                                      +{provider.languages.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                    <MapPin className="w-3.5 h-3.5 text-green-600" />
                                  </div>
                                  <span className="text-sm font-semibold text-gray-700">Pays d'intervention</span>
                                </div>
                                <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-50 to-green-100 text-green-700 text-sm font-medium rounded-full border border-green-200/50">
                                  🌍 {provider.country}
                                </div>
                              </div>

                              {provider.description && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                                      <span className="text-sm">📋</span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700">Présentation</span>
                                  </div>
                                  <p className="text-sm text-gray-600 leading-relaxed" itemProp="description">
                                    {truncatedDescription}
                                  </p>
                                  {isTruncated && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleProviderClick(provider);
                                      }}
                                      className="text-sm text-red-600 hover:text-red-700 font-medium mt-1 hover:underline transition-colors inline-flex items-center gap-1"
                                    >
                                      Lire la suite
                                      <span className="text-xs">→</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="mt-auto pt-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProviderClick(provider);
                                }}
                                className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-white transition-all duration-300 transform active:scale-[0.98] shadow-xl ${
                                  provider.type === 'lawyer' 
                                    ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:to-blue-900 shadow-blue-500/30 hover:shadow-blue-500/50' 
                                    : 'bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 hover:from-purple-700 hover:to-purple-900 shadow-purple-500/30 hover:shadow-purple-500/50'
                                } hover:shadow-2xl`}
                              >
                                <span className="text-xl">👤</span>
                                <span>Voir le profil</span>
                              </button>
                            </div>
                          </div>
                          
                          <div className="sr-only">
                            <span itemProp="jobTitle">{provider.type === 'lawyer' ? 'Avocat' : 'Consultant expatriation'}</span>
                            <span itemProp="workLocation">{provider.country}</span>
                            <span itemProp="knowsLanguage">{provider.languages.join(', ')}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProviders.map((provider) => {
                    const { text: truncatedDescription, isTruncated } = truncateText(provider.description, 100);
                    
                    return (
                      <article
                        key={provider.id}
                        className={`group bg-white rounded-3xl shadow-lg overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 backdrop-blur-sm cursor-pointer border-[3px] ${
                          provider.isOnline 
                            ? 'border-green-500 shadow-green-500/20 hover:border-green-600 hover:shadow-green-600/30' 
                            : 'border-red-500 shadow-red-500/20 hover:border-red-600 hover:shadow-red-600/30'
                        }`}
                        onClick={() => handleProviderClick(provider)}
                        itemScope
                        itemType="https://schema.org/Person"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden">
                          <img
                            src={provider.avatar}
                            alt={`${provider.name} - ${provider.type === 'lawyer' ? 'Avocat' : 'Expatrié'}`}
                            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                            itemProp="image"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = '/default-avatar.png';
                            }}
                          />
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 group-hover:from-black/20 transition-all duration-500"></div>
                          
                          <div className="absolute top-4 left-4">
                            <div className={`px-4 py-2 rounded-2xl text-sm font-bold backdrop-blur-xl ${
                              provider.type === 'lawyer' 
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30' 
                                : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/30'
                            }`}>
                              {provider.type === 'lawyer' ? '⚖️ Avocat' : '🌍 Expatrié'}
                            </div>
                          </div>
                          
                          <div className="absolute top-4 right-4">
                            <div className="bg-white/95 backdrop-blur-xl px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-bold text-gray-900">{provider.rating.toFixed(1)}</span>
                            </div>
                          </div>

                          <div className="absolute bottom-4 right-4">
                            <div className={`w-5 h-5 rounded-full shadow-xl border-2 border-white ${
                              provider.isOnline 
                                ? 'bg-green-500 shadow-green-500/60 animate-pulse' 
                                : 'bg-red-500 shadow-red-500/60'
                            }`}></div>
                          </div>
                        </div>
                        
                        <div className="p-6 flex flex-col h-80">
                          <div className="mb-4">
                            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-red-600 transition-colors" itemProp="name">
                              {provider.name}
                            </h3>
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>{provider.yearsOfExperience} ans d'expérience</span>
                              <div className="flex items-center gap-1">
                                <span className="text-yellow-500">★</span>
                                <span className="font-medium">({provider.reviewCount})</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4 flex-1">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm">🗣️</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-700">Langues parlées</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {provider.languages.slice(0, 2).map((lang, index) => (
                                  <span
                                    key={index}
                                    className="px-3 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 text-sm font-medium rounded-full border border-blue-200/50"
                                  >
                                    {getLanguageLabel(lang)}
                                  </span>
                                ))}
                                {provider.languages.length > 2 && (
                                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                                    +{provider.languages.length - 2}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                  <MapPin className="w-3.5 h-3.5 text-green-600" />
                                </div>
                                <span className="text-sm font-semibold text-gray-700">Pays d'intervention</span>
                              </div>
                              <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-50 to-green-100 text-green-700 text-sm font-medium rounded-full border border-green-200/50">
                                🌍 {provider.country}
                              </div>
                            </div>

                            {provider.description && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm">📋</span>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-700">Présentation</span>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed" itemProp="description">
                                  {truncatedDescription}
                                </p>
                                {isTruncated && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleProviderClick(provider);
                                    }}
                                    className="text-sm text-red-600 hover:text-red-700 font-medium mt-1 hover:underline transition-colors inline-flex items-center gap-1"
                                  >
                                    Lire la suite
                                    <span className="text-xs">→</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="mt-auto pt-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProviderClick(provider);
                              }}
                              className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-white transition-all duration-300 transform active:scale-[0.98] shadow-xl ${
                                provider.type === 'lawyer' 
                                  ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:to-blue-900 shadow-blue-500/30 hover:shadow-blue-500/50' 
                                  : 'bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 hover:from-purple-700 hover:to-purple-900 shadow-purple-500/30 hover:shadow-purple-500/50'
                              } hover:shadow-2xl`}
                            >
                              <span className="text-xl">👤</span>
                              <span>Voir le profil</span>
                            </button>
                          </div>
                        </div>
                        
                        <div className="sr-only">
                          <span itemProp="jobTitle">{provider.type === 'lawyer' ? 'Avocat' : 'Consultant expatriation'}</span>
                          <span itemProp="workLocation">{provider.country}</span>
                          <span itemProp="knowsLanguage">{provider.languages.join(', ')}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Aucun expert trouvé
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Aucun expert ne correspond à vos critères de recherche actuels.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedType('all');
                      setSelectedCountry('all');
                      setSelectedLanguage('all');
                      setCustomCountry('');
                      setCustomLanguage('');
                      setShowCustomCountry(false);
                      setShowCustomLanguage(false);
                      setOnlineOnly(false);
                    }}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-xl transition-colors"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              </div>
            )}

            <section className="text-center mt-12 sm:mt-16">
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-3xl p-8 sm:p-12">
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  Besoin d'aide immédiate ?
                </h3>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                  Plus de 200 experts vérifiés disponibles dans 120+ pays pour vous accompagner
                </p>
                <button
                  onClick={() => navigate('/sos-appel')}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl shadow-red-500/25 hover:shadow-2xl hover:shadow-red-500/30 hover:-translate-y-0.5"
                >
                  <Phone className="w-5 h-5" />
                  Trouver un expert
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default SOSCall;