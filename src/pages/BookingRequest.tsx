import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Euro, Shield, CheckCircle, AlertCircle, Phone, MessageCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext'; // 🔧 AJOUT: Import du contexte App
import { createBookingRequest } from '../utils/firestore';
import { logLanguageMismatch } from '../services/analytics';
import { Link } from 'react-router-dom';
import MultiLanguageSelect from '../components/forms-data/MultiLanguageSelect';
import { Language } from '../data/Languages-spoken';
import languages from '../data/Languages-spoken';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { Provider, normalizeProvider } from '../types/Provider';

const countries = [
  'Afghanistan',
  'Afrique du Sud',
  'Albanie',
  'Algérie',
  'Allemagne',
  'Andorre',
  'Angola',
  'Antigua-et-Barbuda',
  'Arabie saoudite',
  'Argentine',
  'Arménie',
  'Australie',
  'Autriche',
  'Azerbaïdjan',
  'Bahamas',
  'Bahreïn',
  'Bangladesh',
  'Barbade',
  'Belgique',
  'Belize',
  'Bénin',
  'Bhoutan',
  'Biélorussie',
  'Birmanie',
  'Bolivie',
  'Bosnie-Herzégovine',
  'Botswana',
  'Brésil',
  'Brunei',
  'Bulgarie',
  'Burkina Faso',
  'Burundi',
  'Cambodge',
  'Cameroun',
  'Canada',
  'Cap-Vert',
  'Chili',
  'Chine',
  'Chypre',
  'Colombie',
  'Comores',
  'Congo',
  'Congo (RDC)',
  'Corée du Nord',
  'Corée du Sud',
  'Costa Rica',
  'Côte d\'Ivoire',
  'Croatie',
  'Cuba',
  'Danemark',
  'Djibouti',
  'Dominique',
  'Égypte',
  'Émirats arabes unis',
  'Équateur',
  'Érythrée',
  'Espagne',
  'Estonie',
  'États-Unis',
  'Éthiopie',
  'Fidji',
  'Finlande',
  'France',
  'Gabon',
  'Gambie',
  'Géorgie',
  'Ghana',
  'Grèce',
  'Grenade',
  'Guatemala',
  'Guinée',
  'Guinée-Bissau',
  'Guinée équatoriale',
  'Guyana',
  'Haïti',
  'Honduras',
  'Hongrie',
  'Îles Cook',
  'Îles Marshall',
  'Îles Salomon',
  'Inde',
  'Indonésie',
  'Irak',
  'Iran',
  'Irlande',
  'Islande',
  'Israël',
  'Italie',
  'Jamaïque',
  'Japon',
  'Jordanie',
  'Kazakhstan',
  'Kenya',
  'Kirghizistan',
  'Kiribati',
  'Koweït',
  'Laos',
  'Lesotho',
  'Lettonie',
  'Liban',
  'Liberia',
  'Libye',
  'Liechtenstein',
  'Lituanie',
  'Luxembourg',
  'Macédoine du Nord',
  'Madagascar',
  'Malaisie',
  'Malawi',
  'Maldives',
  'Mali',
  'Malte',
  'Maroc',
  'Maurice',
  'Mauritanie',
  'Mexique',
  'Micronésie',
  'Moldavie',
  'Monaco',
  'Mongolie',
  'Monténégro',
  'Mozambique',
  'Namibie',
  'Nauru',
  'Népal',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'Norvège',
  'Nouvelle-Zélande',
  'Oman',
  'Ouganda',
  'Ouzbékistan',
  'Pakistan',
  'Palaos',
  'Palestine',
  'Panama',
  'Papouasie-Nouvelle-Guinée',
  'Paraguay',
  'Pays-Bas',
  'Pérou',
  'Philippines',
  'Pologne',
  'Portugal',
  'Qatar',
  'République centrafricaine',
  'République dominicaine',
  'République tchèque',
  'Roumanie',
  'Royaume-Uni',
  'Russie',
  'Rwanda',
  'Saint-Christophe-et-Niévès',
  'Saint-Marin',
  'Saint-Vincent-et-les-Grenadines',
  'Sainte-Lucie',
  'Salvador',
  'Samoa',
  'São Tomé-et-Principe',
  'Sénégal',
  'Serbie',
  'Seychelles',
  'Sierra Leone',
  'Singapour',
  'Slovaquie',
  'Slovénie',
  'Somalie',
  'Soudan',
  'Soudan du Sud',
  'Sri Lanka',
  'Suède',
  'Suisse',
  'Suriname',
  'Syrie',
  'Tadjikistan',
  'Tanzanie',
  'Tchad',
  'Thaïlande',
  'Timor oriental',
  'Togo',
  'Tonga',
  'Trinité-et-Tobago',
  'Tunisie',
  'Turkménistan',
  'Turquie',
  'Tuvalu',
  'Ukraine',
  'Uruguay',
  'Vanuatu',
  'Vatican',
  'Venezuela',
  'Vietnam',
  'Yémen',
  'Zambie',
  'Zimbabwe'
];

interface NotificationData {
  type: string;
  providerId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  emailSubject?: string;
  emailHtml?: string;
  smsMessage?: string;
  whatsappMessage?: string;
}

interface BookingRequestData {
  clientPhone: string;
  clientId?: string;
  clientName: string;
  clientFirstName: string;
  clientLastName: string;
  clientNationality: string;
  clientCurrentCountry: string;
  clientWhatsapp: string;
  providerId: string;
  providerName: string;
  providerType: string;
  providerCountry: string;
  providerAvatar: string;
  providerRating?: number;
  providerReviewCount?: number;
  providerLanguages?: string[];
  providerSpecialties?: string[];
  title: string;
  description: string;
  clientLanguages: string[];
  clientLanguagesDetails: Array<{ code: string; name: string }>;
  price: number;
  duration: number;
  status: string;
  createdAt: Date;
  ip: string;
  userAgent: string;
  providerEmail?: string;
  providerPhone?: string;
}

// 🔧 INTERFACES STANDARDISÉES POUR LE PASSAGE DE DONNÉES
interface StandardizedServiceData {
  title: string;
  description: string;
  clientDetails: {
    firstName: string;
    lastName: string;
    nationality: string;
    currentCountry: string;
    phone: string;
    whatsapp?: string;
    languages: string[];
    languagesDetails: Array<{ code: string; name: string }>;
  };
  serviceInfo: {
    type: 'lawyer_call' | 'expat_call';
    price: number;
    duration: number;
    requestId?: string;
  };
  metadata: {
    ip: string;
    userAgent: string;
    createdAt: Date;
  };
}

interface StandardizedProviderData {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  type: 'lawyer' | 'expat';
  country: string;
  avatar: string;
  price: number;
  duration: number;
  rating?: number;
  reviewCount?: number;
  languages?: string[];
  languagesSpoken?: string[];
  specialties?: string[];
  currentCountry?: string;
  email?: string;
  phone?: string;
}

const BookingRequest: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useApp(); // 🔧 AJOUT: Récupération de la langue du contexte
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    phoneCountryCode: '+33',
    phoneNumber: '',
    acceptTerms: false,
    firstName: '',
    lastName: '',
    nationality: '',
    currentCountry: '',
    whatsappNumber: '',
    whatsappCountryCode: '+33',
    autrePays: '',    
  });
  
  const [languagesSpoken, setLanguagesSpoken] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [hasLanguageMatchRealTime, setHasLanguageMatchRealTime] = useState(true);
  
  const inputClass = (fieldName: string) =>
    `w-full px-3 py-3 border rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none transition-all duration-200 text-base ${
      fieldErrors[fieldName]
        ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50'
        : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400'
    }`;

  // Rediriger vers login si non connecté
  useEffect(() => {
    if (!authLoading && !user) {
      const currentUrl = `/booking-request/${providerId}`;
      navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`, { replace: true });
    }
  }, [user, authLoading, providerId, navigate]);

  // Récupérer les données du prestataire depuis sessionStorage
  const getProviderData = (): Provider | null => {
    try {
      const savedProvider = sessionStorage.getItem('selectedProvider');
      if (savedProvider) {
        const providerData = JSON.parse(savedProvider);
        if (providerData.id === providerId) {
          return normalizeProvider(providerData);
        }
      }
    } catch (error) {
      console.error('Error parsing saved provider data:', error);
    }
    return null;
  };
  
  const provider = getProviderData();

  // useEffect pour vérifier le matching en temps réel
  useEffect(() => {
    if (!provider || (!provider.languages && !provider.languagesSpoken)) {
      setHasLanguageMatchRealTime(true);
      return;
    }

    if (languagesSpoken.length === 0) {
      setHasLanguageMatchRealTime(false);
      return;
    }

    const providerLanguages = provider.languages || provider.languagesSpoken || [];
    const clientLanguageCodes = languagesSpoken.map(lang => lang.code);
    const hasMatch = providerLanguages.some(providerLang => 
      clientLanguageCodes.includes(providerLang)
    );
    
    setHasLanguageMatchRealTime(hasMatch);
  }, [languagesSpoken, provider]);

  // Validation du formulaire
  const isFormValid = useMemo(() => {
    const basicValidation = (
      formData.firstName.trim().length > 0 &&
      formData.lastName.trim().length > 0 &&
      formData.title.trim().length >= 10 &&
      formData.description.trim().length >= 50 &&
      formData.phoneNumber.trim().length >= 6 &&
      formData.nationality.trim().length > 0 &&
      formData.currentCountry.trim().length > 0 &&
      languagesSpoken.length > 0 &&
      formData.acceptTerms &&
      (formData.currentCountry !== 'Autre' || formData.autrePays.trim().length > 0)
    );
    
    return basicValidation && hasLanguageMatchRealTime;
  }, [
    formData.firstName,
    formData.lastName,
    formData.title,
    formData.description,
    formData.phoneNumber,
    formData.nationality,
    formData.currentCountry,
    languagesSpoken,
    formData.acceptTerms,
    formData.autrePays,
    hasLanguageMatchRealTime
  ]);

  // Progress calculation for UX
  const formProgress = useMemo(() => {
    const fields = [
      formData.firstName.trim().length > 0,
      formData.lastName.trim().length > 0,
      formData.title.trim().length >= 10,
      formData.description.trim().length >= 50,
      formData.phoneNumber.trim().length >= 6,
      formData.nationality.trim().length > 0,
      formData.currentCountry.trim().length > 0,
      languagesSpoken.length > 0,
      formData.acceptTerms,
      (formData.currentCountry !== 'Autre' || formData.autrePays.trim().length > 0),
      hasLanguageMatchRealTime
    ];
    
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [
    formData.firstName,
    formData.lastName,
    formData.title,
    formData.description,
    formData.phoneNumber,
    formData.nationality,
    formData.currentCountry,
    languagesSpoken,
    formData.acceptTerms,
    formData.autrePays,
    hasLanguageMatchRealTime
  ]);

  // Si pas de provider, rediriger vers la liste
  useEffect(() => {
    if (!authLoading && !provider) {
      navigate('/');
    }
  }, [provider, authLoading, navigate]);

  if (!provider) {
    return null;
  }

  const isLawyer = provider.type === 'lawyer';

  const sanitizeInput = (input: string): string => {
    return input
      .replace(/[<>]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      let sanitizedValue = value;
      if (name === 'phoneNumber' || name === 'whatsappNumber') {
        sanitizedValue = value.replace(/[^\d\s+()-]/g, '');
      } else {
        sanitizedValue = sanitizeInput(value);
      }
      
      setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    }
    
    if (formError) {
      setFormError('');
    }
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // 🔧 FIX: Fonction améliorée pour notifier le prestataire avec debug détaillé
  const notifyProviderOfRequest = async (providerId: string, requestData: BookingRequestData): Promise<{ success: boolean; result?: unknown; error?: unknown }> => {
    console.log('🔍 [DEBUG] === DÉBUT NOTIFICATION PRESTATAIRE ===');
    console.log('🔍 [DEBUG] Provider ID:', providerId);
    console.log('🔍 [DEBUG] Request Data Keys:', Object.keys(requestData));
    console.log('🔍 [DEBUG] Provider Email:', requestData.providerEmail);
    console.log('🔍 [DEBUG] Provider Phone:', requestData.providerPhone);
    console.log('🔍 [DEBUG] Client Info:', {
      name: `${requestData.clientFirstName} ${requestData.clientLastName}`,
      phone: requestData.clientPhone,
      country: requestData.clientCurrentCountry
    });

    try {
      if (!requestData.providerEmail && !requestData.providerPhone) {
        console.warn('⚠️ [DEBUG] Aucun contact disponible pour le prestataire');
        return { success: false, error: 'Aucun contact disponible pour le prestataire' };
      }

      if (!requestData.title || requestData.title.trim().length === 0) {
        console.error('❌ [DEBUG] Titre manquant dans la demande');
        return { success: false, error: 'Titre de la demande manquant' };
      }

      if (!requestData.description || requestData.description.trim().length === 0) {
        console.error('❌ [DEBUG] Description manquante dans la demande');
        return { success: false, error: 'Description de la demande manquante' };
      }

      console.log('✅ [DEBUG] Validation des données réussie');

      const notificationData: NotificationData = {
        type: 'provider_booking_request',
        providerId: providerId,
        recipientName: requestData.providerName || 'Prestataire',
        emailSubject: `SOS Expat - Nouvelle demande: ${requestData.title.substring(0, 50)}`,
        
        emailHtml: `
<h2>Nouvelle demande de consultation</h2>
<p><strong>Client:</strong> ${requestData.clientFirstName} ${requestData.clientLastName}</p>
<p><strong>Nationalité:</strong> ${requestData.clientNationality}</p>
<p><strong>Pays:</strong> ${requestData.clientCurrentCountry}</p>
<p><strong>Téléphone:</strong> ${requestData.clientPhone}</p>
<p><strong>Titre:</strong> ${requestData.title}</p>
<p><strong>Description:</strong> ${requestData.description}</p>
<hr>
<p>Connectez-vous à votre espace prestataire pour répondre.</p>
        `.trim(),

        smsMessage: `SOS Expat: Nouvelle demande de ${requestData.clientFirstName}. Titre: "${requestData.title.substring(0, 30)}...". Consultez votre espace.`,

        whatsappMessage: `🔔 SOS Expat: Nouvelle demande de ${requestData.clientFirstName} ${requestData.clientLastName}.\n\nTitre: "${requestData.title}"\nPays: ${requestData.clientCurrentCountry}\n\nConsultez votre espace prestataire.`
      };

      if (requestData.providerEmail && requestData.providerEmail.includes('@')) {
        notificationData.recipientEmail = requestData.providerEmail;
        console.log('✅ [DEBUG] Email ajouté:', requestData.providerEmail);
      } else {
        console.warn('⚠️ [DEBUG] Email invalide ou manquant, notification par email ignorée');
      }

      if (requestData.providerPhone && requestData.providerPhone.length > 5) {
        notificationData.recipientPhone = requestData.providerPhone;
        console.log('✅ [DEBUG] Téléphone ajouté:', requestData.providerPhone);
      } else {
        console.warn('⚠️ [DEBUG] Téléphone invalide ou manquant, notification SMS/WhatsApp ignorée');
      }

      console.log('📤 [DEBUG] Données finales à envoyer:', {
        type: notificationData.type,
        hasEmail: !!notificationData.recipientEmail,
        hasPhone: !!notificationData.recipientPhone,
        emailSubject: notificationData.emailSubject,
        htmlLength: notificationData.emailHtml?.length || 0,
        smsLength: notificationData.smsMessage?.length || 0
      });

      console.log('🔗 [DEBUG] Test de connectivité Firebase Functions...');
      if (!functions) {
        throw new Error('Firebase Functions non initialisé');
      }

      const sendNotification = httpsCallable(functions, 'sendEmail');
      console.log('✅ [DEBUG] Fonction sendEmail récupérée avec succès');

      console.log('🚀 [DEBUG] Envoi de la notification...');
      const result = await sendNotification(notificationData);
      
      console.log('✅ [DEBUG] Réponse reçue:', {
        hasData: !!result.data,
        dataType: typeof result.data,
        dataKeys: result.data ? Object.keys(result.data) : 'N/A'
      });
      
      console.log('✅ [DEBUG] Notification prestataire envoyée avec succès');
      return { success: true, result };
      
    } catch (error: unknown) {
      console.error('❌ [DEBUG] === ERREUR DÉTAILLÉE NOTIFICATION ===');
      console.error('❌ [DEBUG] Type d\'erreur:', typeof error);
      console.error('❌ [DEBUG] Erreur complète:', error);
      
      if (error && typeof error === 'object') {
        const errorObj = error as any;
        console.error('❌ [DEBUG] Propriétés d\'erreur:', Object.keys(errorObj));
        console.error('❌ [DEBUG] Code d\'erreur:', errorObj.code);
        console.error('❌ [DEBUG] Message d\'erreur:', errorObj.message);
        console.error('❌ [DEBUG] Détails d\'erreur:', errorObj.details);
        console.error('❌ [DEBUG] Stack trace:', errorObj.stack);
        
        if (errorObj.code) {
          switch (errorObj.code) {
            case 'functions/invalid-argument':
              console.error('❌ [DEBUG] Erreur: Arguments invalides envoyés à la fonction');
              break;
            case 'functions/unauthenticated':
              console.error('❌ [DEBUG] Erreur: Utilisateur non authentifié');
              break;
            case 'functions/permission-denied':
              console.error('❌ [DEBUG] Erreur: Permissions insuffisantes');
              break;
            case 'functions/not-found':
              console.error('❌ [DEBUG] Erreur: Fonction Cloud non trouvée');
              break;
            case 'functions/internal':
              console.error('❌ [DEBUG] Erreur: Erreur interne du serveur');
              break;
            case 'functions/unavailable':
              console.error('❌ [DEBUG] Erreur: Service temporairement indisponible');
              break;
            default:
              console.error('❌ [DEBUG] Erreur: Code d\'erreur non reconnu:', errorObj.code);
          }
        }
      }
      
      console.error('❌ [DEBUG] Context:', {
        providerId,
        clientName: `${requestData.clientFirstName} ${requestData.clientLastName}`,
        title: requestData.title,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
      
      return { success: false, error };
    }
  };

  // 🔧 FONCTION STANDARDISÉE POUR PRÉPARER LES DONNÉES
  const prepareStandardizedData = (
    formData: typeof formData, 
    provider: Provider, 
    user: { id?: string; firstName?: string; lastName?: string } | null
  ): {
    selectedProvider: StandardizedProviderData;
    serviceData: StandardizedServiceData;
    bookingRequest: BookingRequestData;
  } => {
    
    const selectedProvider: StandardizedProviderData = {
      id: provider.id,
      name: provider.name,
      firstName: provider.firstName,
      lastName: provider.lastName,
      type: provider.type,
      country: provider.country,
      avatar: provider.avatar,
      price: provider.price,
      duration: provider.duration,
      rating: provider.rating,
      reviewCount: provider.reviewCount,
      languages: provider.languages,
      languagesSpoken: provider.languagesSpoken,
      specialties: provider.specialties,
      currentCountry: provider.currentCountry,
      email: provider.email,
      phone: provider.phone
    };

    const serviceData: StandardizedServiceData = {
      title: sanitizeInput(formData.title),
      description: sanitizeInput(formData.description),
      clientDetails: {
        firstName: sanitizeInput(formData.firstName),
        lastName: sanitizeInput(formData.lastName),
        nationality: sanitizeInput(formData.nationality),
        currentCountry: sanitizeInput(
          formData.currentCountry === 'Autre' ? formData.autrePays : formData.currentCountry
        ),
        phone: `${formData.phoneCountryCode}${formData.phoneNumber.replace(/\s+/g, '')}`,
        whatsapp: formData.whatsappNumber ? `${formData.whatsappCountryCode}${formData.whatsappNumber.replace(/\s+/g, '')}` : undefined,
        languages: languagesSpoken.map(lang => lang.code),
        languagesDetails: languagesSpoken.map(lang => ({
          code: lang.code,
          name: lang.name
        }))
      },
      serviceInfo: {
        type: provider.type === 'lawyer' ? 'lawyer_call' : 'expat_call',
        price: provider.price,
        duration: provider.duration,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      metadata: {
        ip: window.location.hostname,
        userAgent: navigator.userAgent,
        createdAt: new Date()
      }
    };

    const bookingRequest: BookingRequestData = {
      clientPhone: serviceData.clientDetails.phone,
      clientId: user?.id,
      clientName: `${serviceData.clientDetails.firstName} ${serviceData.clientDetails.lastName}`,
      clientFirstName: serviceData.clientDetails.firstName,
      clientLastName: serviceData.clientDetails.lastName,
      clientNationality: serviceData.clientDetails.nationality,
      clientCurrentCountry: serviceData.clientDetails.currentCountry,
      clientWhatsapp: serviceData.clientDetails.whatsapp || '',
      providerId: selectedProvider.id,
      providerName: selectedProvider.name,
      providerType: selectedProvider.type,
      providerCountry: selectedProvider.country,
      providerAvatar: selectedProvider.avatar,
      providerRating: selectedProvider.rating,
      providerReviewCount: selectedProvider.reviewCount,
      providerLanguages: selectedProvider.languages,
      providerSpecialties: selectedProvider.specialties,
      title: serviceData.title,
      description: serviceData.description,
      clientLanguages: serviceData.clientDetails.languages,
      clientLanguagesDetails: serviceData.clientDetails.languagesDetails,
      price: serviceData.serviceInfo.price,
      duration: serviceData.serviceInfo.duration,
      status: 'pending',
      createdAt: serviceData.metadata.createdAt,
      ip: serviceData.metadata.ip,
      userAgent: serviceData.metadata.userAgent,
      providerEmail: selectedProvider.email,
      providerPhone: selectedProvider.phone
    };

    return {
      selectedProvider,
      serviceData,
      bookingRequest
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasLanguageMatchRealTime) {
      try {
        await logLanguageMismatch({
          clientLanguages: languagesSpoken.map(lang => lang.code),
          customLanguage: undefined,
          providerId: provider?.id || '',
          providerLanguages: provider?.languages || provider?.languagesSpoken || [],
          formData: {
            title: formData.title,
            description: formData.description,
            nationality: formData.nationality,
            currentCountry: formData.currentCountry === 'Autre' ? formData.autrePays : formData.currentCountry
          },
          source: 'booking_request_form'
        });
        console.log('📊 Incompatibilité linguistique loggée pour analyse');
      } catch (logError) {
        console.error('❌ Erreur lors du logging de l\'incompatibilité linguistique:', logError);
      }
      
      setFormError("Vous devez partager au moins une langue avec le prestataire.");
      return;
    }
    
    // Validation du formulaire
    const validateForm = () => {
      const errors: Record<string, string> = {};
      const globalErrors: string[] = [];
      let isValid = true;

      if (!formData.firstName.trim()) {
        errors.firstName = 'Prénom requis';
        globalErrors.push('– Prénom requis');
        isValid = false;
      }

      if (!formData.lastName.trim()) {
        errors.lastName = 'Nom requis';
        globalErrors.push('– Nom requis');
        isValid = false;
      }

      if (formData.title.trim().length < 10) {
        errors.title = 'Le titre doit contenir au moins 10 caractères';
        globalErrors.push('– Titre trop court (min. 10 caractères)');
        isValid = false;
      }

      if (formData.description.trim().length < 50) {
        errors.description = 'La description doit contenir au moins 50 caractères';
        globalErrors.push('– Description trop courte (min. 50 caractères)');
        isValid = false;
      }

      if (!formData.nationality.trim()) {
        errors.nationality = 'Nationalité requise';
        globalErrors.push('– Nationalité requise');
        isValid = false;
      }

      if (!formData.currentCountry.trim()) {
        errors.currentCountry = 'Pays requis';
        globalErrors.push('– Pays d\'intervention requis');
        isValid = false;
      }

      if (formData.currentCountry === 'Autre' && !formData.autrePays.trim()) {
        errors.autrePays = 'Pays requis';
        globalErrors.push('– Veuillez préciser votre pays');
        isValid = false;
      }

      if (languagesSpoken.length === 0) {
        errors.languages = 'Sélectionnez au moins une langue';
        globalErrors.push('– Sélectionnez au moins une langue');
        isValid = false;
      }

      if (formData.phoneNumber.trim().length < 6) {
        errors.phoneNumber = 'Numéro de téléphone invalide';
        globalErrors.push('– Numéro de téléphone invalide');
        isValid = false;
      }

      if (!formData.acceptTerms) {
        globalErrors.push('– Vous devez accepter les conditions');
        isValid = false;
      }

      if (!hasLanguageMatchRealTime) {
        globalErrors.push('– Aucune langue en commun avec le prestataire');
        isValid = false;
      }

      setFieldErrors(errors);

      if (!isValid) {
        setFormErrors(globalErrors);
        return false;
      } else {
        setFormErrors([]);
        return true;
      }
    };

    if (!validateForm()) {
      // Scroll vers la première erreur
      setTimeout(() => {
        const firstError = document.querySelector('.error-field, [data-error="true"]');
        if (firstError) {
          firstError.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
      return;
    }

    setIsLoading(true);

    try {
      // 🔧 PRÉPARATION DES DONNÉES STANDARDISÉES
      const { selectedProvider, serviceData, bookingRequest } = prepareStandardizedData(formData, provider, user);

      console.log('🚀 Données standardisées préparées:', {
        selectedProvider: selectedProvider.id,
        serviceData: serviceData.title,
        price: serviceData.serviceInfo.price
      });

      // Sauvegarder la demande dans Firestore
      if (user) {
        try {
          await createBookingRequest(bookingRequest);
          console.log('✅ Demande de réservation sauvegardée dans Firestore');
        } catch (error) {
          console.error('❌ Erreur lors de la sauvegarde:', error);
        }
      }

      // 🔧 SAUVEGARDE DANS SESSIONSTORAGE POUR CALL-CHECKOUT (DONNÉES COHÉRENTES)
      try {
        const commissionAmount = Math.round(serviceData.serviceInfo.price * 0.20 * 100) / 100;
        const providerAmount = Math.round(serviceData.serviceInfo.price * 0.80 * 100) / 100;

        sessionStorage.setItem('selectedProvider', JSON.stringify(selectedProvider));
        sessionStorage.setItem('serviceData', JSON.stringify({
          providerId: selectedProvider.id,
          serviceType: serviceData.serviceInfo.type,
          providerRole: selectedProvider.type,
          amount: serviceData.serviceInfo.price,
          duration: serviceData.serviceInfo.duration,
          clientPhone: serviceData.clientDetails.phone,
          commissionAmount: commissionAmount,
          providerAmount: providerAmount
        }));
        
        console.log('💾 Données sauvegardées dans sessionStorage pour call-checkout');
      } catch (storageError) {
        console.warn('⚠️ Erreur sessionStorage (non bloquant):', storageError);
      }

      // 🔧 FIX: Envoyer la notification au prestataire avec debug amélioré (non bloquant)
      console.log('📧 [DEBUG] Tentative d\'envoi de notification au prestataire...');
      try {
        const notificationResult = await notifyProviderOfRequest(provider.id, bookingRequest);
        if (notificationResult.success) {
          console.log('✅ [DEBUG] Notification prestataire envoyée avec succès');
        } else {
          console.warn('⚠️ [DEBUG] Échec de notification prestataire (non bloquant):', notificationResult.error);
        }
      } catch (notificationError) {
        console.warn("⚠️ [DEBUG] Erreur de notification prestataire (non bloquant):", notificationError);
      }

      // 🔧 NAVIGATION VERS CALL-CHECKOUT AVEC PROVIDER ID
      console.log(`🧭 Navigation vers call-checkout/${providerId}...`);
      
      navigate(`/call-checkout/${providerId}`);
      
    } catch (error) {
      console.error('❌ Erreur lors de la soumission:', error);
      setFormError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const countryCodeOptions = [
    { code: '+33', flag: '🇫🇷', country: 'FR' },
    { code: '+1', flag: '🇺🇸', country: 'US' },
    { code: '+44', flag: '🇬🇧', country: 'GB' },
    { code: '+49', flag: '🇩🇪', country: 'DE' },
    { code: '+34', flag: '🇪🇸', country: 'ES' },
    { code: '+39', flag: '🇮🇹', country: 'IT' },
    { code: '+66', flag: '🇹🇭', country: 'TH' },
    { code: '+61', flag: '🇦🇺', country: 'AU' },
    { code: '+81', flag: '🇯🇵', country: 'JP' },
    { code: '+86', flag: '🇨🇳', country: 'CN' }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 py-4 px-4 sm:py-8">
        <div className="max-w-3xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progression</span>
              <span className="text-sm font-medium text-blue-600">{formProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${formProgress}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-red-600 px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(`/provider/${provider.id}`)}
                  className="text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                  aria-label="Retour"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    Décrivez votre demande
                  </h1>
                  <p className="text-white/80 text-sm mt-1">
                    Partagez les détails de votre situation
                  </p>
                </div>
              </div>
            </div>

            {/* Provider Info */}
            <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-blue-400 flex items-center justify-center bg-white shadow-lg flex-shrink-0">
                    {provider?.avatar ? (
                      <img
                        src={provider.avatar}
                        alt={`Photo de ${provider.name}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = '/default-avatar.png';
                        }}
                      />
                    ) : (
                      <img
                        src="/default-avatar.png"
                        alt="Avatar par défaut"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                      {provider?.name || "Nom du prestataire"}
                    </h3>

                    <div className="mt-2 sm:mt-3 text-sm text-gray-700 space-y-2">
                      <div>
                        <span
                          className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                            isLawyer
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-green-100 text-green-800 border border-green-200"
                          }`}
                        >
                          {isLawyer ? "⚖️ Avocat" : "🌍 Expatrié aidant"}
                        </span>
                      </div>

                      <div className="text-xs sm:text-sm">
                        <span className="font-medium">📍</span>
                        <span className="ml-1">{provider.country}</span>
                      </div>

                      {provider?.languages && Array.isArray(provider.languages) && provider.languages.length > 0 && (
                        <div className="flex items-start">
                          <span className="font-medium text-xs sm:text-sm">🗣️</span>
                          <div className="ml-2 flex flex-wrap gap-1">
                            {provider.languages
                              .slice(0, 3)
                              .map((code) => {
                                const lang = languages.find((l) => l.code === code);
                                return lang ? lang.name : code;
                              })
                              .map((langName, index) => (
                                <span key={index} className="inline-block px-1 py-0.5 bg-blue-100 text-blue-800 text-xs rounded border border-blue-200">
                                  {langName}
                                </span>
                              ))}
                            {provider.languages.length > 3 && (
                              <span className="text-xs text-gray-500">+{provider.languages.length - 3}</span>
                            )}
                          </div>
                        </div>
                      )}                    
                    </div>
                  </div>
                </div>

                <div className="text-center sm:text-right bg-white rounded-xl p-3 sm:p-4 shadow-lg border border-gray-200 w-full sm:w-auto">
                  {/* 🔧 FIX: Correction de l'affichage du prix */}
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                    €{provider?.price ? provider.price.toFixed(2) : "--"}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {provider?.duration ? `${provider.duration} min` : "--"}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    💳 Paiement sécurisé
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6 sm:space-y-8" noValidate>
              {formErrors.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="font-medium text-red-800">Veuillez corriger les erreurs suivantes :</p>
                      <ul className="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
                        {formErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {formError && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="font-medium text-red-800">{formError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Section Informations personnelles */}
              <div className="bg-gradient-to-r from-blue-50 to-red-50 rounded-xl p-4 sm:p-6 border border-blue-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  👤 Informations personnelles
                </h3>
                
                <div className="space-y-4 sm:space-y-6">
                  {/* Prénom et Nom */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                        Prénom <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={`${inputClass('firstName')} ${fieldErrors.firstName ? 'error-field' : ''}`}
                        data-error={!!fieldErrors.firstName}
                        placeholder="Votre prénom"
                      />
                      {fieldErrors.firstName && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <AlertCircle size={16} className="mr-1 flex-shrink-0" />
                          {fieldErrors.firstName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                        Nom <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={`${inputClass('lastName')} ${fieldErrors.lastName ? 'error-field' : ''}`}
                        data-error={!!fieldErrors.lastName}
                        placeholder="Votre nom"
                      />
                      {fieldErrors.lastName && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <AlertCircle size={16} className="mr-1 flex-shrink-0" />
                          {fieldErrors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Nationalité */}
                  <div>
                    <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-2">
                      Nationalité <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="nationality"
                      name="nationality"
                      type="text"
                      required
                      value={formData.nationality}
                      onChange={handleInputChange}
                      className={`${inputClass('nationality')} ${fieldErrors.nationality ? 'error-field' : ''}`}
                      data-error={!!fieldErrors.nationality}
                      placeholder="Ex: Française, Américaine..."
                    />
                    {fieldErrors.nationality && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle size={16} className="mr-1 flex-shrink-0" />
                        {fieldErrors.nationality}
                      </p>
                    )}
                  </div>

                  {/* Pays d'intervention */}
                  <div>
                    <label htmlFor="currentCountry" className="block text-sm font-medium text-gray-700 mb-2">
                      Pays d'intervention <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="currentCountry"
                      name="currentCountry"
                      required
                      value={formData.currentCountry}
                      onChange={handleInputChange}
                      className={`${inputClass('currentCountry')} ${fieldErrors.currentCountry ? 'error-field' : ''}`}
                      data-error={!!fieldErrors.currentCountry}
                    >
                      <option value="">-- Sélectionnez un pays --</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                      <option value="Autre">Autre</option>
                    </select>
                    {fieldErrors.currentCountry && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle size={16} className="mr-1 flex-shrink-0" />
                        {fieldErrors.currentCountry}
                      </p>
                    )}

                    {formData.currentCountry === 'Autre' && (
                      <div className="mt-3">
                        <input
                          id="autrePays"
                          name="autrePays"
                          type="text"
                          required
                          value={formData.autrePays}
                          onChange={handleInputChange}
                          className={`${inputClass('autrePays')} ${fieldErrors.autrePays ? 'error-field' : ''}`}
                          data-error={!!fieldErrors.autrePays}
                          placeholder="Précisez votre pays"
                        />
                        {fieldErrors.autrePays && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertCircle size={16} className="mr-1 flex-shrink-0" />
                            {fieldErrors.autrePays}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section Votre demande */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 sm:p-6 border border-green-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  📝 Votre demande
                </h3>

                {/* Titre */}
                <div className="mb-6">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Titre de votre demande <span className="text-red-500">*</span>
                    <span className={`ml-2 text-xs font-medium ${formData.title.length >= 10 ? 'text-green-600' : 'text-orange-600'}`}>
                      {formData.title.length}/10
                    </span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className={`${inputClass('title')} ${fieldErrors.title ? 'error-field' : ''}`}
                    data-error={!!fieldErrors.title}
                    placeholder="Ex: Question sur visa de travail au Canada"
                  />
                  {fieldErrors.title && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle size={16} className="mr-1 flex-shrink-0" />
                      {fieldErrors.title}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description détaillée <span className="text-red-500">*</span>
                    <span className={`ml-2 text-xs font-medium ${formData.description.length >= 50 ? 'text-green-600' : 'text-orange-600'}`}>
                      {formData.description.length}/50
                    </span>
                    <span className="text-gray-500 text-xs ml-2">
                      💡 Plus c'est détaillé, meilleure sera la réponse !
                    </span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    required
                    value={formData.description}
                    onChange={handleInputChange}
                    className={`resize-none ${inputClass('description')} ${fieldErrors.description ? 'error-field' : ''}`}
                    data-error={!!fieldErrors.description}
                    placeholder="Décrivez votre situation en détail : contexte, questions spécifiques, objectifs, délais, contraintes particulières..."
                  />
                  {fieldErrors.description && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle size={16} className="mr-1 flex-shrink-0" />
                      {fieldErrors.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Section Langues */}
              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-4 sm:p-6 border border-red-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  🗣️ Langues de communication
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Langues que vous parlez <span className="text-red-500">*</span>
                  </label>
                  <div className={`${fieldErrors.languages ? 'error-field' : ''}`} data-error={!!fieldErrors.languages}>
                    {/* 🔧 FIX: Passage de la langue du contexte au composant */}
                    <MultiLanguageSelect
                      value={languagesSpoken.map(lang => ({ value: lang.code, label: lang.name }))}
                      onChange={(selectedOptions) => {
                        const selectedLangs = selectedOptions
                          .map(option => languages.find(lang => lang.code === option.value))
                          .filter(Boolean) as Language[];
                        setLanguagesSpoken(selectedLangs);
                      }}
                      providerLanguages={provider?.languages || provider?.languagesSpoken || []}
                      highlightShared={true}
                      locale={language} // 🔧 FIX: Passage de la langue du contexte
                      showLanguageToggle={false} // Masqué car la langue vient du header
                    />
                  </div>
                  {fieldErrors.languages && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle size={16} className="mr-1 flex-shrink-0" />
                      {fieldErrors.languages}
                    </p>
                  )}

                  {/* Affichage des langues sélectionnées avec séparation */}
                  {languagesSpoken.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {/* Langues compatibles */}
                      {(() => {
                        const providerLanguages = provider?.languages || provider?.languagesSpoken || [];
                        const compatibleLangs = languagesSpoken.filter(lang => 
                          providerLanguages.includes(lang.code)
                        );
                        const incompatibleLangs = languagesSpoken.filter(lang => 
                          !providerLanguages.includes(lang.code)
                        );

                        return (
                          <>
                            {compatibleLangs.length > 0 && (
                              <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded-lg">
                                <div className="flex">
                                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                                  <div className="ml-3">
                                    <p className="text-green-700 font-medium mb-2">
                                      ✅ Langues compatibles avec le prestataire :
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {compatibleLangs.map((lang) => (
                                        <span
                                          key={lang.code}
                                          className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full border border-green-200"
                                        >
                                          🌐 {lang.name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {incompatibleLangs.length > 0 && (
                              <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
                                <div className="flex">
                                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                                  <div className="ml-3">
                                    <p className="text-red-700 font-medium mb-2">
                                      ⚠️ Langues non compatibles :
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {incompatibleLangs.map((lang) => (
                                        <span
                                          key={lang.code}
                                          className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full border border-red-200"
                                        >
                                          🌐 {lang.name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Message global de compatibilité */}
                  {languagesSpoken.length > 0 && !hasLanguageMatchRealTime && (
                    <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="ml-3">
                          <p className="text-red-700 font-medium">
                            🚫 Communication impossible
                          </p>
                          <p className="text-red-600 text-sm mt-1">
                            Vous devez sélectionner au moins une langue que le prestataire parle pour pouvoir continuer.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section Contact */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 sm:p-6 border border-orange-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  📱 Informations de contact
                </h3>

                {/* Numéro de téléphone */}
                <div className="mb-6">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone size={16} className="inline mr-1" />
                    Numéro de téléphone <span className="text-red-500">*</span>
                  </label>
                  <div className="flex space-x-2">
                    <select
                      id="phoneCountryCode"
                      name="phoneCountryCode"
                      value={formData.phoneCountryCode}
                      onChange={handleInputChange}
                      className={`${inputClass('phoneNumber')} w-20 sm:w-24 text-sm`}
                    >
                      {countryCodeOptions.map(({ code, flag }) => (
                        <option key={code} value={code}>
                          {flag} {code}
                        </option>
                      ))}
                    </select>
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      required
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      className={`flex-1 ${inputClass('phoneNumber')} ${fieldErrors.phoneNumber ? 'error-field' : ''}`}
                      data-error={!!fieldErrors.phoneNumber}
                      placeholder="612 345 678"
                      maxLength={20}
                    />
                  </div>
                  {fieldErrors.phoneNumber && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle size={16} className="mr-1 flex-shrink-0" />
                      {fieldErrors.phoneNumber}
                    </p>
                  )}
                  <div className="mt-2 text-sm text-gray-600">
                    ⏱️ <strong>Important :</strong> Vous serez appelé(e) dans les 5 minutes après paiement
                  </div>
                </div>

                {/* WhatsApp */}
                <div>
                  <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageCircle size={16} className="inline mr-1" />
                    Numéro WhatsApp (optionnel)
                  </label>
                  <div className="flex space-x-2">
                    <select
                      id="whatsappCountryCode"
                      name="whatsappCountryCode"
                      value={formData.whatsappCountryCode}
                      onChange={handleInputChange}
                      className={`${inputClass('whatsappNumber')} w-20 sm:w-24 text-sm`}
                    >
                      {countryCodeOptions.map(({ code, flag }) => (
                        <option key={code} value={code}>
                          {flag} {code}
                        </option>
                      ))}
                    </select>
                    <input
                      id="whatsappNumber"
                      name="whatsappNumber"
                      type="tel"
                      value={formData.whatsappNumber}
                      onChange={handleInputChange}
                      className={`flex-1 ${inputClass('whatsappNumber')}`}
                      placeholder="612 345 678"
                      maxLength={20}
                    />
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    💬 Pour recevoir les mises à jour en temps réel
                  </div>
                </div>
              </div>

              {/* CGU */}
              <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-200">
                <div className="flex items-start space-x-3">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={handleInputChange}
                    className="h-5 w-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                    required
                  />
                  <label htmlFor="acceptTerms" className="text-sm text-gray-700 leading-relaxed">
                    J'accepte les <Link to="/cgu-clients" className="text-blue-600 hover:text-blue-700 underline font-medium">conditions générales d'utilisation</Link> et confirme que les informations fournies sont exactes. <span className="text-red-500">*</span>
                  </label>
                </div>
              </div>

              {/* Récapitulatif consultation */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 sm:p-6 text-white">
                <div className="flex items-start space-x-4">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-200 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-lg mb-3">
                      🚀 Récapitulatif de votre consultation
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <span className="font-medium">⏱️ Durée :</span>
                          <span className="ml-2">{provider?.duration || '--'} minutes</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">💰 Prix :</span>
                          {/* 🔧 FIX: Correction de l'affichage du prix dans le récapitulatif */}
                          <span className="ml-2 text-xl font-bold">{provider?.price ? provider.price.toFixed(2) : '--'}€</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <span className="font-medium">📞 Appel :</span>
                          <span className="ml-2">Dans les 5 minutes</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">🔒 Paiement :</span>
                          <span className="ml-2">100% sécurisé</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-white/10 rounded-lg">
                      <p className="text-sm">
                        <strong>💯 Garantie satisfait ou remboursé :</strong> Si l'expert n'est pas disponible, vous êtes automatiquement remboursé.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  loading={isLoading}
                  fullWidth
                  size="large"
                  className={`
                    ${isFormValid 
                      ? 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 transform hover:scale-[1.02] shadow-lg hover:shadow-xl' 
                      : 'bg-gray-400 cursor-not-allowed'
                    } 
                    text-white font-bold py-4 px-6 sm:px-8 rounded-xl transition-all duration-300 ease-out text-base sm:text-lg
                  `}
                  disabled={!isFormValid || isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Traitement en cours...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Euro size={20} className="mr-2 sm:mr-3" />
                      <span>
                        {/* 🔧 FIX: Correction de l'affichage du prix dans le bouton */}
                        {isFormValid 
                          ? `Continuer vers le paiement (${provider?.price ? provider.price.toFixed(2) : '--'}€)` 
                          : `Veuillez compléter le formulaire (${formProgress}%)`
                        }
                      </span>
                    </div>
                  )}
                </Button>

                {/* Debug info pour comprendre pourquoi le bouton est désactivé */}
                {!isFormValid && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm font-medium mb-2">
                      🔍 Éléments manquants pour activer le bouton :
                    </p>
                    <div className="grid grid-cols-1 gap-1 text-xs text-yellow-700">
                      {formData.firstName.trim().length === 0 && <div>• Prénom requis</div>}
                      {formData.lastName.trim().length === 0 && <div>• Nom requis</div>}
                      {formData.title.trim().length < 10 && <div>• Titre trop court (min. 10 car.)</div>}
                      {formData.description.trim().length < 50 && <div>• Description trop courte (min. 50 car.)</div>}
                      {formData.phoneNumber.trim().length < 6 && <div>• Numéro de téléphone invalide</div>}
                      {formData.nationality.trim().length === 0 && <div>• Nationalité requise</div>}
                      {formData.currentCountry.trim().length === 0 && <div>• Pays d'intervention requis</div>}
                      {formData.currentCountry === 'Autre' && formData.autrePays.trim().length === 0 && <div>• Précisez votre pays</div>}
                      {languagesSpoken.length === 0 && <div>• Aucune langue sélectionnée</div>}
                      {!formData.acceptTerms && <div>• Conditions non acceptées</div>}
                      {!hasLanguageMatchRealTime && <div>• Aucune langue en commun avec le prestataire</div>}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center pt-4">
                <p className="text-xs text-gray-500">
                  🔒 En continuant, vous acceptez nos conditions générales de vente • Paiement 100% sécurisé
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BookingRequest;