import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Scale, 
  Globe, 
  Flag, 
  Check, 
  AlertCircle,
  Loader,
  RefreshCw,
  Image,
  Save,
  User,
  AlertTriangle,
  Edit,
  Eye,
  Trash,
  EyeOff,
  Phone,
  Mail,
  MapPin,
  Star,
  Plus,
  Search,
  Filter,
  List,
  Settings,
  Upload,
  X
} from 'lucide-react';
import { collection, addDoc, setDoc, doc, serverTimestamp, getDocs, query, where, updateDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../contexts/AuthContext';

// Noms français pour la génération
const frenchFirstNames = {
  male: ['Jean', 'Pierre', 'Michel', 'Philippe', 'Thomas', 'Nicolas', 'François', 'Laurent', 'Éric', 'David', 'Stéphane', 'Olivier', 'Christophe', 'Frédéric', 'Patrick', 'Antoine', 'Julien', 'Alexandre', 'Sébastien', 'Vincent', 'Maxime', 'Romain', 'Florian', 'Guillaume', 'Kévin'],
  female: ['Marie', 'Sophie', 'Catherine', 'Isabelle', 'Anne', 'Nathalie', 'Sylvie', 'Céline', 'Julie', 'Valérie', 'Christine', 'Sandrine', 'Caroline', 'Stéphanie', 'Émilie', 'Aurélie', 'Camille', 'Laure', 'Virginie', 'Delphine', 'Manon', 'Clara', 'Léa', 'Emma', 'Chloé']
};

const frenchLastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Lefevre', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez'];

// Tous les pays du monde
const worldCountries = [
  'Afghanistan', 'Afrique du Sud', 'Albanie', 'Algérie', 'Allemagne', 'Andorre', 'Angola', 'Antigua-et-Barbuda',
  'Arabie Saoudite', 'Argentine', 'Arménie', 'Australie', 'Autriche', 'Azerbaïdjan', 'Bahamas', 'Bahreïn',
  'Bangladesh', 'Barbade', 'Belgique', 'Belize', 'Bénin', 'Bhoutan', 'Biélorussie', 'Birmanie', 'Bolivie',
  'Bosnie-Herzégovine', 'Botswana', 'Brésil', 'Brunei', 'Bulgarie', 'Burkina Faso', 'Burundi', 'Cambodge',
  'Cameroun', 'Canada', 'Cap-Vert', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Comores', 'Congo', 'Corée du Nord',
  'Corée du Sud', 'Costa Rica', 'Côte d\'Ivoire', 'Croatie', 'Cuba', 'Danemark', 'Djibouti', 'Dominique',
  'Égypte', 'Émirats arabes unis', 'Équateur', 'Érythrée', 'Espagne', 'Estonie', 'États-Unis', 'Éthiopie',
  'Fidji', 'Finlande', 'France', 'Gabon', 'Gambie', 'Géorgie', 'Ghana', 'Grèce', 'Grenade', 'Guatemala', 'Guinée',
  'Guinée-Bissau', 'Guinée équatoriale', 'Guyana', 'Haïti', 'Honduras', 'Hongrie', 'Îles Cook', 'Îles Marshall',
  'Inde', 'Indonésie', 'Irak', 'Iran', 'Irlande', 'Islande', 'Israël', 'Italie', 'Jamaïque', 'Japon',
  'Jordanie', 'Kazakhstan', 'Kenya', 'Kirghizistan', 'Kiribati', 'Koweït', 'Laos', 'Lesotho', 'Lettonie',
  'Liban', 'Liberia', 'Libye', 'Liechtenstein', 'Lituanie', 'Luxembourg', 'Macédoine du Nord', 'Madagascar',
  'Malaisie', 'Malawi', 'Maldives', 'Mali', 'Malte', 'Maroc', 'Maurice', 'Mauritanie', 'Mexique', 'Micronésie',
  'Moldavie', 'Monaco', 'Mongolie', 'Monténégro', 'Mozambique', 'Namibie', 'Nauru', 'Népal', 'Nicaragua',
  'Niger', 'Nigeria', 'Niue', 'Norvège', 'Nouvelle-Zélande', 'Oman', 'Ouganda', 'Ouzbékistan', 'Pakistan',
  'Palaos', 'Palestine', 'Panama', 'Papouasie-Nouvelle-Guinée', 'Paraguay', 'Pays-Bas', 'Pérou', 'Philippines',
  'Pologne', 'Portugal', 'Qatar', 'République centrafricaine', 'République démocratique du Congo',
  'République dominicaine', 'République tchèque', 'Roumanie', 'Royaume-Uni', 'Russie', 'Rwanda',
  'Saint-Christophe-et-Niévès', 'Saint-Marin', 'Saint-Vincent-et-les-Grenadines', 'Sainte-Lucie',
  'Salomon', 'Salvador', 'Samoa', 'São Tomé-et-Principe', 'Sénégal', 'Serbie', 'Seychelles', 'Sierra Leone',
  'Singapour', 'Slovaquie', 'Slovénie', 'Somalie', 'Soudan', 'Soudan du Sud', 'Sri Lanka', 'Suède', 'Suisse',
  'Suriname', 'Syrie', 'Tadjikistan', 'Tanzanie', 'Tchad', 'Thaïlande', 'Timor oriental', 'Togo', 'Tonga',
  'Trinité-et-Tobago', 'Tunisie', 'Turkménistan', 'Turquie', 'Tuvalu', 'Ukraine', 'Uruguay', 'Vanuatu',
  'Vatican', 'Venezuela', 'Vietnam', 'Yémen', 'Zambie', 'Zimbabwe'
];

// Langues du monde
const worldLanguages = [
  'Français', 'Anglais', 'Espagnol', 'Allemand', 'Italien', 'Portugais', 'Russe', 'Chinois', 'Japonais', 'Coréen',
  'Arabe', 'Hindi', 'Bengali', 'Néerlandais', 'Suédois', 'Norvégien', 'Danois', 'Finnois', 'Polonais', 'Tchèque',
  'Hongrois', 'Grec', 'Turc', 'Hébreu', 'Thaï', 'Vietnamien', 'Indonésien', 'Malais', 'Tagalog', 'Swahili',
  'Ukrainien', 'Roumain', 'Bulgare', 'Croate', 'Serbe', 'Slovaque', 'Slovène', 'Lituanien', 'Letton', 'Estonien',
  'Catalan', 'Basque', 'Galicien', 'Irlandais', 'Gallois', 'Écossais', 'Islandais', 'Maltais', 'Luxembourgeois'
];

// Photos professionnelles d'avocats (hommes)
const lawyerPhotosM = [
  'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/2182975/pexels-photo-2182975.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2'
];

// Photos professionnelles d'avocates (femmes)
const lawyerPhotosF = [
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2'
];

// Photos d'expatriés (hommes) - plus décontractées
const expatPhotosM = [
  'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1300402/pexels-photo-1300402.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1484794/pexels-photo-1484794.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1542085/pexels-photo-1542085.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2'
];

// Photos d'expatriées (femmes) - plus décontractées
const expatPhotosF = [
  'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1542085/pexels-photo-1542085.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  'https://images.pexels.com/photos/1300402/pexels-photo-1300402.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2'
];

interface AaaProfile {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  type: 'lawyer' | 'expat';
  country: string;
  languages: string[];
  specialties: string[];
  rating: number;
  reviewCount: number;
  yearsOfExperience: number;
  profilePhoto: string;
  description: string;
  isOnline: boolean;
  isVisible: boolean;
  isCallable: boolean;
  createdAt: Date;
  price: number;
  duration: number;
}

interface AaaProfilesFormData {
  count: number;
  roleDistribution: {
    lawyer: number;
    expat: number;
  };
  genderDistribution: {
    male: number;
    female: number;
  };
  countries: string[];
  languages: string[];
  minExperience: number;
  maxExperience: number;
  minAge: number;
  maxAge: number;
  allowRealCalls: boolean;
  isTestProfile: boolean;
  customPhoneNumber: string;
  useCustomPhone: boolean;
}

const AdminAaaProfiles: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'generate' | 'manage'>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Gestion des profils existants
  const [existingProfiles, setExistingProfiles] = useState<AaaProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<AaaProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<AaaProfile>>({});
  const [newProfilePhoto, setNewProfilePhoto] = useState<string>('');
  
  const [formData, setFormData] = useState<AaaProfilesFormData>({
    count: 10,
    roleDistribution: {
      lawyer: 50,
      expat: 50
    },
    genderDistribution: {
      male: 50,
      female: 50
    },
    countries: ['Canada', 'Thaïlande', 'Australie', 'Espagne', 'Allemagne'],
    languages: ['Français', 'Anglais'],
    minExperience: 2,
    maxExperience: 15,
    minAge: 28,
    maxAge: 65,
    allowRealCalls: false,
    isTestProfile: true,
    customPhoneNumber: '+33743331201',
    useCustomPhone: true
  });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    
    if (activeTab === 'manage') {
      loadExistingProfiles();
    }
  }, [currentUser, navigate, activeTab]);

  const loadExistingProfiles = async () => {
    try {
      setIsLoadingProfiles(true);
      
      // Requête simplifiée pour éviter les problèmes d'index
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const allUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      // Filtrer côté client pour les profils de test
      const profiles = allUsers
        .filter(profile => profile.isTestProfile === true)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setExistingProfiles(profiles);
    } catch (error) {
      console.error('Error loading existing profiles:', error);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const handleCountryToggle = (country: string) => {
    setFormData(prev => ({
      ...prev,
      countries: prev.countries.includes(country)
        ? prev.countries.filter(c => c !== country)
        : [...prev.countries, country]
    }));
  };

  const handleLanguageToggle = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const generateFrenchName = (gender: 'male' | 'female') => {
    const firstName = frenchFirstNames[gender][Math.floor(Math.random() * frenchFirstNames[gender].length)];
    const lastName = frenchLastNames[Math.floor(Math.random() * frenchLastNames.length)];
    return { firstName, lastName };
  };

  const generateFrenchEmail = (firstName: string, lastName: string) => {
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
  };

  const getProfilePhoto = (role: 'lawyer' | 'expat', gender: 'male' | 'female') => {
    let photoArray;
    
    if (role === 'lawyer') {
      photoArray = gender === 'male' ? lawyerPhotosM : lawyerPhotosF;
    } else {
      photoArray = gender === 'male' ? expatPhotosM : expatPhotosF;
    }
    
    return photoArray[Math.floor(Math.random() * photoArray.length)];
  };

  const generateAaaProfiles = async () => {
    try {
      setIsGenerating(true);
      setGeneratedCount(0);
      setSuccess(null);
      setError(null);
      
      const { count, roleDistribution, genderDistribution, countries, languages, minExperience, maxExperience, customPhoneNumber, useCustomPhone } = formData;
      
      // Validation
      if (count <= 0) {
        setError('Le nombre de profils doit être supérieur à 0');
        return;
      }
      
      if (countries.length === 0) {
        setError('Veuillez sélectionner au moins un pays');
        return;
      }
      
      if (languages.length === 0) {
        setError('Veuillez sélectionner au moins une langue');
        return;
      }
      
      // Calculer les nombres
      const lawyerCount = Math.round((roleDistribution.lawyer / 100) * count);
      const expatCount = count - lawyerCount;
      const maleCount = Math.round((genderDistribution.male / 100) * count);
      const femaleCount = count - maleCount;
      
      let malesGenerated = 0;
      let femalesGenerated = 0;
      let lawyersGenerated = 0;
      let expatsGenerated = 0;
      
      for (let i = 0; i < count; i++) {
        try {
          // Déterminer le genre
          let gender: 'male' | 'female';
          if (malesGenerated < maleCount) {
            gender = 'male';
            malesGenerated++;
          } else {
            gender = 'female';
            femalesGenerated++;
          }
          
          // Déterminer le rôle
          let role: 'lawyer' | 'expat';
          if (lawyersGenerated < lawyerCount) {
            role = 'lawyer';
            lawyersGenerated++;
          } else {
            role = 'expat';
            expatsGenerated++;
          }
          
          await generateProfile(role, gender, countries, languages, minExperience, maxExperience, customPhoneNumber, useCustomPhone);
          setGeneratedCount(i + 1);
        } catch (error) {
          console.error(`Error generating profile ${i+1}:`, error);
        }
      }
      
      setSuccess(`${count} profils générés avec succès (${lawyerCount} avocats, ${expatCount} expatriés)`);
      
      // Recharger la liste si on est sur l'onglet gestion
      if (activeTab === 'manage') {
        loadExistingProfiles();
      }
    } catch (error) {
      console.error('Error generating aaa profiles:', error);
      setError(`Erreur lors de la génération des profils: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateProfile = async (
    role: 'lawyer' | 'expat',
    gender: 'male' | 'female',
    countries: string[],
    languages: string[],
    minExperience: number,
    maxExperience: number,
    customPhoneNumber: string,
    useCustomPhone: boolean
  ) => {
    const { firstName, lastName } = generateFrenchName(gender);
    const email = generateFrenchEmail(firstName, lastName);
    const phone = useCustomPhone ? customPhoneNumber : '+33743331201';
    
    const country = countries[Math.floor(Math.random() * countries.length)];
    const experience = Math.floor(Math.random() * (maxExperience - minExperience + 1)) + minExperience;
    
    // Générer une photo professionnelle
    const profilePhoto = getProfilePhoto(role, gender);
    
    // Générer des langues aléatoirement (toujours inclure le français)
    const selectedLanguages = ['Français'];
    const otherLanguages = languages.filter(l => l !== 'Français');
    const numLanguages = Math.floor(Math.random() * Math.min(3, otherLanguages.length)) + 1;
    
    for (let i = 0; i < numLanguages; i++) {
      const randomLang = otherLanguages[Math.floor(Math.random() * otherLanguages.length)];
      if (!selectedLanguages.includes(randomLang)) {
        selectedLanguages.push(randomLang);
      }
    }
    
    // Générer une note entre 4.0 et 5.0
    const rating = 4.0 + Math.random() * 1.0;
    
    // Générer un nombre d'avis entre 3 et 15
    const reviewCount = Math.floor(Math.random() * 13) + 3;
    
    const userData = {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email,
      phone: formData.customPhone || '+33743331201',
      phoneCountryCode: '+33',
      currentCountry: country,
      country,
      preferredLanguage: 'fr',
      languages: selectedLanguages,
      profilePhoto,
      avatar: profilePhoto,
      isTestProfile: true,
      isActive: true,
      isApproved: true,
      isVerified: true,
      isOnline: false, // Par défaut hors ligne
      isVisible: true,
      isVisibleOnMap: true,
      isCallable: formData.allowRealCalls,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      role,
      uid: `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      isSOS: role !== 'client',
      points: 0,
      affiliateCode: `TEST${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      referralBy: null,
      bio: '',
      hourlyRate: role === 'lawyer' ? 49 : 19,
      responseTime: '< 5 minutes',
      availability: 'available',
      totalCalls: Math.floor(Math.random() * 50),
      totalEarnings: 0,
      averageRating: rating,
      rating: rating,
      reviewCount: reviewCount,
      mapLocation: {
        lat: 20 + Math.random() * 40,
        lng: -30 + Math.random() * 60
      }
    };
    
    // Données spécifiques au rôle
    if (role === 'lawyer') {
      const lawyerSpecialties = [
        'Droit de l\'immigration', 'Droit du travail', 'Droit immobilier', 
        'Droit des affaires', 'Droit de la famille', 'Droit pénal', 
        'Droit fiscal', 'Droit international', 'Droit des contrats'
      ];
      
      const numSpecialties = Math.floor(Math.random() * 3) + 2;
      const specialties = [];
      
      for (let i = 0; i < numSpecialties; i++) {
        const randomSpecialty = lawyerSpecialties[Math.floor(Math.random() * lawyerSpecialties.length)];
        if (!specialties.includes(randomSpecialty)) {
          specialties.push(randomSpecialty);
        }
      }
      
      const bio = `Avocat${gender === 'female' ? 'e' : ''} spécialisé${gender === 'female' ? 'e' : ''} en ${specialties.join(' et ')} avec ${experience} ans d'expérience. Je vous accompagne dans vos démarches juridiques en ${country} et vous aide à résoudre vos problèmes légaux rapidement et efficacement.`;
      
      Object.assign(userData, {
        bio,
        specialties,
        practiceCountries: [country],
        yearsOfExperience: experience,
        barNumber: `BAR${Math.floor(Math.random() * 100000)}`,
        lawSchool: `Université de ${country}`,
        graduationYear: new Date().getFullYear() - experience - 5,
        certifications: ['Certification Barreau'],
        needsVerification: false,
        verificationStatus: 'approved'
      });
    } else {
      const expatSpecialties = [
        'Démarches administratives', 'Recherche de logement', 'Ouverture de compte bancaire',
        'Système de santé', 'Éducation et écoles', 'Transport', 'Recherche d\'emploi',
        'Création d\'entreprise', 'Fiscalité locale', 'Culture et intégration'
      ];
      
      const numSpecialties = Math.floor(Math.random() * 3) + 2;
      const helpTypes = [];
      
      for (let i = 0; i < numSpecialties; i++) {
        const randomSpecialty = expatSpecialties[Math.floor(Math.random() * expatSpecialties.length)];
        if (!helpTypes.includes(randomSpecialty)) {
          helpTypes.push(randomSpecialty);
        }
      }
      
      const bio = `Expatrié${gender === 'female' ? 'e' : ''} en ${country} depuis ${experience} ans. Je vous aide dans vos démarches d'installation, notamment pour ${helpTypes.join(', ')}. J'ai une excellente connaissance du terrain et je parle ${selectedLanguages.join(', ')}.`;
      
      Object.assign(userData, {
        bio,
        helpTypes,
        specialties: helpTypes,
        residenceCountry: country,
        yearsAsExpat: experience,
        yearsOfExperience: experience,
        previousCountries: [],
        motivation: `Aider les nouveaux arrivants à s'intégrer facilement en ${country}`,
        needsVerification: false,
        verificationStatus: 'approved'
      });
    }
    
    const userId = `test_${role}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Sauvegarder dans Firestore
    try {
      await setDoc(doc(db, 'users', userId), {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      });
      
      // Créer le profil SOS
      await setDoc(doc(db, 'sos_profiles', userId), {
        ...userData,
        uid: userId,
        type: role,
        fullName: `${firstName} ${lastName}`,
        slug: `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${userId.substring(0, 6)}`,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: formData.customPhone || '+33743331201',
        phoneCountryCode: '+33',
        languages: selectedLanguages,
        country: selectedCountries[Math.floor(Math.random() * selectedCountries.length)],
        profilePhoto: profilePhoto,
        avatar: profilePhoto,
        isTestProfile: true,
        isActive: true,
        isApproved: role === 'client',
        isVisible: true,
        isVisibleOnMap: true,
        isVisible: true,
        isVisibleOnMap: true,
        isVerified: Math.random() > 0.3,
        isOnline: false, // Par défaut hors ligne
        isVisible: true,
        isVisibleOnMap: true,
        rating: parseFloat((4.0 + Math.random() * 1.0).toFixed(2)),
        reviewCount: Math.floor(Math.random() * 13) + 3,
        yearsOfExperience: experience,
        hourlyRate: role === 'lawyer' ? 49 : 19,
        responseTime: '< 5 minutes',
        availability: 'available',
        totalCalls: Math.floor(Math.random() * 50),
        totalEarnings: 0,
        profileCompleted: true,
        createdByAdmin: true,
        isCallable: false, // Par défaut, pas d'appels réels
        phone: formData.customPhone || '+33743331201',
        isVisible: true,
        isVisibleOnMap: true,
        isApproved: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Créer des avis factices
      for (let i = 0; i < reviewCount; i++) {
        const reviewRating = 4 + Math.random();
        const reviewTexts = [
          'Excellent service, très professionnel et efficace.',
          'Conseils précieux et aide rapide. Je recommande vivement.',
          'Très satisfait de la consultation, expert compétent.',
          'Service de qualité, réponse rapide à mes questions.',
          'Parfait pour résoudre mon problème rapidement.'
        ];
        
        await addDoc(collection(db, 'reviews'), {
          providerId: userId,
          clientId: `aaa_client_${Date.now()}_${i}`,
          clientName: `Client ${i + 1}`,
          clientCountry: country,
          rating: reviewRating,
          comment: reviewTexts[Math.floor(Math.random() * reviewTexts.length)],
          isPublic: true,
          status: 'published',
          serviceType: role === 'lawyer' ? 'lawyer_call' : 'expat_call',
          createdAt: serverTimestamp(),
          helpfulVotes: Math.floor(Math.random() * 10)
        });
      }
      
      console.log('Profil créé avec succès:', userId);
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
    
    return userId;
  };

  const handleEditProfile = (profile: AaaProfile) => {
    setSelectedProfile(profile);
    setEditFormData({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      phoneCountryCode: profile.phoneCountryCode,
      country: profile.country,
      languages: profile.languages,
      specialties: profile.specialties,
      description: profile.description,
      isOnline: profile.isOnline,
      isVisible: profile.isVisible,
      isCallable: profile.isCallable,
      rating: profile.rating,
      reviewCount: profile.reviewCount,
      yearsOfExperience: profile.yearsOfExperience
    });
    setNewProfilePhoto(profile.profilePhoto);
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedProfile) return;
    
    try {
      setIsLoading(true);
      
      const updateData = {
        ...editFormData,
        fullName: `${editFormData.firstName} ${editFormData.lastName}`,
        profilePhoto: newProfilePhoto,
        avatar: newProfilePhoto,
        updatedAt: serverTimestamp()
      };
      
      // Mettre à jour le document utilisateur
      await updateDoc(doc(db, 'users', selectedProfile.id), updateData);
      
      // Mettre à jour le profil SOS
      await updateDoc(doc(db, 'sos_profiles', selectedProfile.id), updateData);
      
      setShowEditModal(false);
      setSelectedProfile(null);
      loadExistingProfiles();
      
      alert('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erreur lors de la mise à jour du profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;
    
    try {
      setIsLoading(true);
      
      // Supprimer le profil SOS
      await deleteDoc(doc(db, 'sos_profiles', selectedProfile.id));
      
      // Supprimer l'utilisateur
      await deleteDoc(doc(db, 'users', selectedProfile.id));
      
      setShowDeleteModal(false);
      setSelectedProfile(null);
      loadExistingProfiles();
      
      alert('Profil supprimé avec succès');
    } catch (error) {
      console.error('Error deleting profile:', error);
      alert('Erreur lors de la suppression du profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVisibility = async (profileId: string, currentVisibility: boolean) => {
    try {
      const newVisibility = !currentVisibility;
      
      await updateDoc(doc(db, 'users', profileId), {
        isVisible: newVisibility,
        isVisibleOnMap: newVisibility,
        updatedAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'sos_profiles', profileId), {
        isVisible: newVisibility,
        isVisibleOnMap: newVisibility,
        updatedAt: serverTimestamp()
      });
      
      loadExistingProfiles();
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  const handleToggleOnline = async (profileId: string, currentOnline: boolean) => {
    const profile = existingProfiles.find(p => p.id === profileId);
    
    // Vérifier si le profil a un numéro de téléphone pour être en ligne
    if (!currentOnline && (!profile?.phone || profile.phone === '')) {
      alert('Ce profil doit avoir un numéro de téléphone pour être mis en ligne');
      return;
    }
    
    try {
      const newOnline = !currentOnline;
      
      await updateDoc(doc(db, 'users', profileId), {
        isOnline: newOnline,
        availability: newOnline ? 'available' : 'offline',
        updatedAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'sos_profiles', profileId), {
        isOnline: newOnline,
        availability: newOnline ? 'available' : 'offline',
        updatedAt: serverTimestamp()
      });
      
      loadExistingProfiles();
    } catch (error) {
      console.error('Error toggling online status:', error);
    }
  };
  
  const handleBulkToggleOnline = async (online: boolean) => {
    if (selectedProfiles.length === 0) {
      alert('Veuillez sélectionner au moins un profil');
      return;
    }
    
    // Vérifier les numéros de téléphone si on veut mettre en ligne
    if (online) {
      const profilesWithoutPhone = selectedProfiles.filter(id => {
        const profile = existingProfiles.find(p => p.id === id);
        return !profile?.phone || profile.phone === '';
      });
      
      if (profilesWithoutPhone.length > 0) {
        alert(`${profilesWithoutPhone.length} profil(s) n'ont pas de numéro de téléphone et ne peuvent pas être mis en ligne`);
        return;
      }
    }
    
    try {
      for (const profileId of selectedProfiles) {
        await updateDoc(doc(db, 'users', profileId), {
          isOnline: online,
          availability: online ? 'available' : 'offline',
          updatedAt: serverTimestamp()
        });
        
        await updateDoc(doc(db, 'sos_profiles', profileId), {
          isOnline: online,
          availability: online ? 'available' : 'offline',
          updatedAt: serverTimestamp()
        });
      }
      
      // Recharger les profils
      await loadExistingProfiles();
      setSelectedProfiles([]);
      
      alert(`${selectedProfiles.length} profil(s) ${online ? 'mis en ligne' : 'mis hors ligne'} avec succès`);
    } catch (error) {
      console.error('Error bulk toggling online status:', error);
      alert('Erreur lors de la modification du statut');
    }
  };
  
  const handleSelectProfile = (profileId: string) => {
    setSelectedProfiles(prev => 
      prev.includes(profileId) 
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };
  
  const handleSelectAll = () => {
    const filteredIds = filteredProfiles.map(p => p.id);
    setSelectedProfiles(prev => 
      prev.length === filteredIds.length ? [] : filteredIds
    );
  };

  const filteredProfiles = existingProfiles.filter(profile =>
    profile.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Gestion des profils de test</h1>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('generate')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'generate'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserPlus className="inline-block w-5 h-5 mr-2" />
              Générer des profils
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manage'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <List className="inline-block w-5 h-5 mr-2" />
              Gérer les profils ({existingProfiles.length})
            </button>
          </nav>
        </div>

        {activeTab === 'generate' ? (
          /* Onglet Génération */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Paramètres de génération</h2>
                
                <div className="space-y-6">
                  <div>
                    <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de profils à générer
                    </label>
                    <input
                      id="count"
                      name="count"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.count}
                      onChange={(e) => setFormData(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Distribution des rôles</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Avocats</span>
                            <span>{formData.roleDistribution.lawyer}%</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={formData.roleDistribution.lawyer}
                            onChange={(e) => {
                              const lawyerValue = Number(e.target.value);
                              setFormData(prev => ({
                                ...prev,
                                roleDistribution: {
                                  lawyer: lawyerValue,
                                  expat: 100 - lawyerValue
                                }
                              }));
                            }}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Expatriés</span>
                            <span>{formData.roleDistribution.expat}%</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={formData.roleDistribution.expat}
                            onChange={(e) => {
                              const expatValue = Number(e.target.value);
                              setFormData(prev => ({
                                ...prev,
                                roleDistribution: {
                                  lawyer: 100 - expatValue,
                                  expat: expatValue
                                }
                              }));
                            }}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Distribution des genres</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Hommes</span>
                            <span>{formData.genderDistribution.male}%</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={formData.genderDistribution.male}
                            onChange={(e) => {
                              const maleValue = Number(e.target.value);
                              setFormData(prev => ({
                                ...prev,
                                genderDistribution: {
                                  male: maleValue,
                                  female: 100 - maleValue
                                }
                              }));
                            }}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Femmes</span>
                            <span>{formData.genderDistribution.female}%</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={formData.genderDistribution.female}
                            onChange={(e) => {
                              const femaleValue = Number(e.target.value);
                              setFormData(prev => ({
                                ...prev,
                                genderDistribution: {
                                  male: 100 - femaleValue,
                                  female: femaleValue
                                }
                              }));
                            }}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sélection des pays */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Pays d'intervention ({formData.countries.length} sélectionnés)
                    </h3>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {worldCountries.map(country => (
                          <label key={country} className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              checked={formData.countries.includes(country)}
                              onChange={() => handleCountryToggle(country)}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mr-2"
                            />
                            {country}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Sélection des langues */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Langues parlées ({formData.languages.length} sélectionnées)
                    </h3>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {worldLanguages.map(language => (
                          <label key={language} className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              checked={formData.languages.includes(language)}
                              onChange={() => handleLanguageToggle(language)}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mr-2"
                            />
                            {language}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Numéro de téléphone personnalisé */}
                  <div>
                    <div className="flex items-center mb-3">
                      <input
                        id="useCustomPhone"
                        type="checkbox"
                        checked={formData.useCustomPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, useCustomPhone: e.target.checked }))}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor="useCustomPhone" className="ml-2 text-sm font-medium text-gray-700">
                        Utiliser un numéro de téléphone personnalisé
                      </label>
                    </div>
                    {formData.useCustomPhone && (
                      <input
                        type="text"
                        placeholder="+33743331201"
                        value={formData.customPhoneNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, customPhoneNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Expérience (années)</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Minimum</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={formData.minExperience}
                            onChange={(e) => setFormData(prev => ({ ...prev, minExperience: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Maximum</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={formData.maxExperience}
                            onChange={(e) => setFormData(prev => ({ ...prev, maxExperience: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Âge</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Minimum</label>
                          <input
                            type="number"
                            min="18"
                            max="80"
                            value={formData.minAge}
                            onChange={(e) => setFormData(prev => ({ ...prev, minAge: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Maximum</label>
                          <input
                            type="number"
                            min="18"
                            max="80"
                            value={formData.maxAge}
                            onChange={(e) => setFormData(prev => ({ ...prev, maxAge: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="allowRealCalls"
                      type="checkbox"
                      checked={formData.allowRealCalls}
                      onChange={(e) => setFormData(prev => ({ ...prev, allowRealCalls: e.target.checked }))}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allowRealCalls" className="ml-2 block text-sm text-gray-700">
                      Autoriser les appels réels pour ces profils
                    </label>
                  </div>
                  
                  <div className="pt-4">
                    <Button
                      onClick={generateAaaProfiles}
                      loading={isGenerating}
                      disabled={isGenerating}
                      className="bg-red-600 hover:bg-red-700"
                      fullWidth
                    >
                      {isGenerating ? (
                        <>
                          <Loader className="animate-spin mr-2" size={20} />
                          Génération en cours ({generatedCount}/{formData.count})
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2" size={20} />
                          Générer {formData.count} profils
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                          <div className="mt-2 text-sm text-red-700">{error}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {success && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="flex">
                        <Check className="h-5 w-5 text-green-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">Succès</h3>
                          <div className="mt-2 text-sm text-green-700">{success}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Préréglages */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Préréglages rapides</h2>
                
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setFormData({
                        ...formData,
                        count: 20,
                        roleDistribution: { lawyer: 100, expat: 0 },
                        genderDistribution: { male: 0, female: 100 },
                        countries: ['Thaïlande'],
                        languages: ['Français', 'Anglais', 'Thaï']
                      });
                    }}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-3 px-4 rounded-lg border border-blue-200 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Scale className="w-5 h-5 mr-2" />
                      <span>20 avocates en Thaïlande</span>
                    </div>
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      setFormData({
                        ...formData,
                        count: 50,
                        roleDistribution: { lawyer: 0, expat: 100 },
                        genderDistribution: { male: 50, female: 50 },
                        countries: ['Thaïlande', 'Vietnam', 'Cambodge', 'Malaisie', 'Singapour', 'Indonésie'],
                        languages: ['Français', 'Anglais']
                      });
                    }}
                    className="w-full bg-green-50 hover:bg-green-100 text-green-700 font-medium py-3 px-4 rounded-lg border border-green-200 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      <span>50 expatriés en Asie du Sud-Est</span>
                    </div>
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      setFormData({
                        ...formData,
                        count: 40,
                        roleDistribution: { lawyer: 50, expat: 50 },
                        genderDistribution: { male: 50, female: 50 },
                        countries: ['Espagne', 'Portugal', 'Italie', 'Grèce'],
                        languages: ['Français', 'Anglais', 'Espagnol', 'Italien']
                      });
                    }}
                    className="w-full bg-yellow-50 hover:bg-yellow-100 text-yellow-700 font-medium py-3 px-4 rounded-lg border border-yellow-200 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Flag className="w-5 h-5 mr-2" />
                      <span>40 profils en Europe du Sud</span>
                    </div>
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Onglet Gestion */
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Profils existants ({filteredProfiles.length})
              </h3>
              <div className="flex items-center space-x-4">
                {selectedProfiles.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleBulkToggleOnline(true)}
                      size="small"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Mettre en ligne ({selectedProfiles.length})
                    </Button>
                    <Button
                      onClick={() => handleBulkToggleOnline(false)}
                      size="small"
                      className="bg-gray-600 hover:bg-gray-700"
                    >
                      Mettre hors ligne ({selectedProfiles.length})
                    </Button>
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Rechercher un profil..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                </div>
                <Button onClick={loadExistingProfiles} size="small">
                  <RefreshCw size={16} className="mr-2" />
                  Actualiser
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedProfiles.length === filteredProfiles.length && filteredProfiles.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profil
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pays
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Note
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Téléphone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Créé le
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoadingProfiles ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 text-center">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                          </div>
                          <p className="mt-2 text-gray-500">Chargement des profils...</p>
                        </td>
                      </tr>
                    ) : filteredProfiles.length > 0 ? (
                      filteredProfiles.map((profile) => (
                        <tr key={profile.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedProfiles.includes(profile.id)}
                              onChange={() => handleSelectProfile(profile.id)}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img
                                src={profile.profilePhoto}
                                alt={profile.fullName}
                                className="h-10 w-10 rounded-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/default-avatar.png';
                                }}
                              />
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {profile.fullName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {profile.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              profile.type === 'lawyer' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {profile.type === 'lawyer' ? 'Avocat' : 'Expatrié'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {profile.country}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  className={i < Math.floor(profile.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                                />
                              ))}
                              <span className="ml-1">{(profile.rating || 0).toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {profile.phone || 'Non défini'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                profile.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {profile.isOnline ? 'En ligne' : 'Hors ligne'}
                              </span>
                              {!profile.isVisible && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                  Masqué
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(profile.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  // Créer un slug unique pour ce profil
                                  const slug = profile.slug || `${profile.firstName}-${profile.lastName}-${profile.id.substring(0, 6)}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
                                  const countrySlug = (profile.country || 'france').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
                                  const roleSlug = profile.role === 'lawyer' ? 'avocat' : 'expatrie';
                                  const mainLanguage = profile.languages && profile.languages.length > 0 ? 
                                    profile.languages[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-') : 
                                    'francais';
                                  
                                  const url = `/${roleSlug}/${countrySlug}/${mainLanguage}/${slug}`;
                                  window.open(url, '_blank');
                                }}
                                className="text-blue-600 hover:text-blue-800"
                                title="Voir le profil public"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                onClick={() => handleEditProfile(profile)}
                                className="text-green-600 hover:text-green-800"
                                title="Modifier"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleToggleOnline(profile.id, profile.isOnline)}
                                className={`${profile.isOnline ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                                title={profile.isOnline ? 'Mettre hors ligne' : 'Mettre en ligne'}
                                disabled={!profile.isOnline && (!profile.phone || profile.phone === '')}
                              >
                                {profile.isOnline ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                              <button
                                onClick={() => handleToggleVisibility(profile.id, profile.isVisible)}
                                className={`${profile.isVisible ? 'text-yellow-600 hover:text-yellow-800' : 'text-gray-600 hover:text-gray-800'}`}
                                title={profile.isVisible ? 'Masquer' : 'Afficher'}
                              >
                                {profile.isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProfile(profile);
                                  setShowDeleteModal(true);
                                }}
                                className="text-red-600 hover:text-red-800"
                                title="Supprimer"
                              >
                                <Trash size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                          Aucun profil de test trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'édition */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Modifier le profil"
          size="large"
        >
          {selectedProfile && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={editFormData.firstName || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={editFormData.lastName || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="+33743331201"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Obligatoire pour mettre le profil en ligne
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo de profil
                </label>
                <div className="flex items-center space-x-4">
                  <img
                    src={newProfilePhoto}
                    alt="Photo actuelle"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <input
                      type="url"
                      placeholder="URL de la nouvelle photo"
                      value={newProfilePhoto}
                      onChange={(e) => setNewProfilePhoto(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Utilisez une URL d'image haute qualité (400x400 recommandé)
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note (4.0 - 5.0)
                  </label>
                  <input
                    type="number"
                    min="4.0"
                    max="5.0"
                    step="0.1"
                    value={editFormData.rating || 4.5}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre d'avis
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="15"
                    value={editFormData.reviewCount || 5}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, reviewCount: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Années d'expérience
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editFormData.yearsOfExperience || 5}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, yearsOfExperience: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editFormData.isOnline && editFormData.phone !== ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, isOnline: e.target.checked && prev.phone !== '' }))}
                    disabled={editFormData.phone === ''}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    En ligne {editFormData.phone === '' && '(nécessite un téléphone)'}
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editFormData.isVisible || false}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, isVisible: e.target.checked }))}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Visible</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editFormData.isCallable || false}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, isCallable: e.target.checked }))}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Appels réels autorisés</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  onClick={() => setShowEditModal(false)}
                  variant="outline"
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  className="bg-green-600 hover:bg-green-700"
                  loading={isLoading}
                >
                  <Save size={16} className="mr-2" />
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal de suppression */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Confirmer la suppression"
          size="small"
        >
          {selectedProfile && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Attention : Cette action est irréversible
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>
                        Vous êtes sur le point de supprimer définitivement le profil :
                        <br />
                        <strong>{selectedProfile.fullName}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowDeleteModal(false)}
                  variant="outline"
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleDeleteProfile}
                  className="bg-red-600 hover:bg-red-700"
                  loading={isLoading}
                >
                  Confirmer la suppression
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default AdminAaaProfiles;

