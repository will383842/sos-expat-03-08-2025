import NotificationSettings from '../notifications/notificationsDashboardProviders/NotificationSettings';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Settings, 
  Phone, 
  FileText, 
  Bell, 
  Shield, 
  LogOut, 
  Edit, 
  CreditCard,
  Calendar,
  Globe,
  Mail,
  MessageSquare,
  Check,
  AlertTriangle,
  MapPin,
  Clock,
  ExternalLink,
  Star
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import AvailabilityToggle from '../components/dashboard/AvailabilityToggle';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { updateUserProfile, logAuditEvent } from '../utils/firestore';
import ImageUploader from '../components/common/ImageUploader';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  doc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import UserInvoices from '../components/dashboard/UserInvoices';
import DashboardMessages from '../components/dashboard/DashboardMessages';

// Types pour les données du dashboard
interface Call {
  id: string;
  clientId: string;
  providerId: string;
  providerName: string;
  clientName: string;
  serviceType: 'lawyer_call' | 'expat_call';
  title: string;
  description: string;
  duration: number;
  price: number;
  status: 'completed' | 'pending' | 'in_progress' | 'failed';
  createdAt: Date;
  startedAt: Date;
  endedAt: Date;
  clientRating?: number;
}

interface Invoice {
  id: string;
  callId: string;
  number: string;
  amount: number;
  date: Date;
  status: 'paid' | 'pending' | 'overdue';
  downloadUrl: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

interface ProfileData {
  email: string;
  phone: string;
  phoneCountryCode: string;
  currentCountry: string;
  profilePhoto: string;
  isOnline: boolean;
}

interface LanguageOption {
  value: string;
  label: string;
}

type TabType = 'profile' | 'calls' | 'messages' | 'reviews' | 'notifications' | 'invoices' | 'settings';
type CallStatus = 'completed' | 'pending' | 'in_progress' | 'failed';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, enhancedSettings, updateEnhancedSettings } = useApp();
  
  // États du composant
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentStatus, setCurrentStatus] = useState<boolean>(user?.isOnline ?? false);
  const [profileData, setProfileData] = useState<ProfileData>({
    email: '',
    phone: '',
    phoneCountryCode: '+33',
    currentCountry: '',
    profilePhoto: '',
    isOnline: true
  });
  const [showCustomLanguage, setShowCustomLanguage] = useState<boolean>(false);
  const [customLanguage, setCustomLanguage] = useState<string>('');
  const [calls, setCalls] = useState<Call[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Effet pour rediriger si non connecté
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Initialiser les données du profil depuis l'utilisateur
    setProfileData({
      email: user.email || '',
      phone: user.phone || '',
      phoneCountryCode: user.phoneCountryCode || '+33',
      currentCountry: user.currentCountry || '',
      profilePhoto: user.profilePhoto || '',
      isOnline: user.isOnline || true
    });

    // Charger les données utilisateur
    loadUserData();
  }, [user, navigate]);

  // Effet pour écouter les changements de statut en temps réel
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.id),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setCurrentStatus(data?.isOnline === true);
        }
      },
      (error) => {
        console.error('Erreur de synchronisation isOnline dans le dashboard :', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fonction de déconnexion
  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      // La navigation vers login sera gérée par l'AuthContext
    } catch (error) {
      console.error('Erreur lors de la déconnexion :', error);
      setErrorMessage(language === 'fr' ? 'Erreur lors de la déconnexion' : 'Error during logout');
    }
  };

  // Fonction pour annuler l'édition
  const handleCancelEdit = (): void => {
    if (!user) return;
    setProfileData({
      email: user.email || '',
      phone: user.phone || '',
      phoneCountryCode: user.phoneCountryCode || '+33',
      currentCountry: user.currentCountry || '',
      profilePhoto: user.profilePhoto || '',
      isOnline: user.isOnline || true
    });
    setIsEditing(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Fonction pour commencer l'édition
  const handleEditProfile = (): void => {
    setIsEditing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Fonction pour charger les données utilisateur
  const loadUserData = async (): Promise<void> => {
    if (!user) return;

    // Dans une vraie app, ces données seraient chargées depuis Firestore
    // Pour l'instant, on utilise des données fictives
    
    // Remettre les données du formulaire aux données utilisateur
    setProfileData({
      email: user?.email || '',
      phone: user?.phone || '',
      phoneCountryCode: user?.phoneCountryCode || '+33',
      currentCountry: user?.currentCountry || '',
      profilePhoto: user?.profilePhoto || '',
      isOnline: user?.isOnline || true
    });
    setIsEditing(false);
  };

  // Fonction pour sauvegarder le profil
  const handleSaveProfile = async (): Promise<void> => {
    if (!user) return;
    
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    
    try {
      // Mettre à jour le profil utilisateur dans Firestore
      await updateUserProfile(user.id, {
        email: profileData.email,
        phone: profileData.phone,
        phoneCountryCode: profileData.phoneCountryCode,
        currentCountry: profileData.currentCountry,
        profilePhoto: profileData.profilePhoto,
        isOnline: profileData.isOnline,
        updatedAt: new Date()
      });
      
      // Logger l'action
      await logAuditEvent(user.id, 'profile_updated', {
        updatedFields: JSON.stringify({
          email: profileData.email,
          phone: profileData.phone,
          phoneCountryCode: profileData.phoneCountryCode,
          currentCountry: profileData.currentCountry,
          profilePhoto: profileData.profilePhoto,
          isOnline: profileData.isOnline
        })
      });
      
      setSuccessMessage(language === 'fr' ? 'Profil mis à jour avec succès' : 'Profile updated successfully');
      setIsEditing(false);
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrorMessage(language === 'fr' ? 'Erreur lors de la mise à jour du profil' : 'Error updating profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour sauvegarder les paramètres
  const handleSaveSettings = async (): Promise<void> => {
    if (!user) return;
    
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    
    try {
      // Mettre à jour les paramètres dans Firestore
      await updateUserProfile(user.id, {
        enhancedSettings: enhancedSettings,
        updatedAt: new Date()
      });
      
      // Logger l'action
      await logAuditEvent(user.id, 'settings_updated', {
        settings: JSON.stringify(enhancedSettings)
      });
      
      setSuccessMessage(language === 'fr' ? 'Paramètres mis à jour avec succès' : 'Settings updated successfully');
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrorMessage(language === 'fr' ? 'Erreur lors de la mise à jour des paramètres' : 'Error updating settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour mettre à jour les paramètres de langue
  const updateLanguageSettings = (key: keyof typeof enhancedSettings.language, value: string): void => {
    updateEnhancedSettings({
      language: {
        ...enhancedSettings.language,
        [key]: value
      }
    });
  };

  // Fonction pour ajouter une langue secondaire personnalisée
  const handleAddSecondaryLanguage = (): void => {
    if (customLanguage && customLanguage.trim() !== '') {
      updateLanguageSettings('secondary', customLanguage);
      setCustomLanguage('');
      setShowCustomLanguage(false);
    }
  };

  // Fonction pour formater les dates
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Fonction pour formater la durée
  const formatDuration = (minutes: number): string => {
    return `${minutes} min`;
  };

  // Fonction pour formater le prix
  const formatPrice = (price: number): string => {
    return `${price.toFixed(2)} €`;
  };

  // Fonction pour obtenir le badge de statut
  const getStatusBadge = (status: CallStatus): JSX.Element => {
    const statusConfig = {
      completed: {
        className: 'px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium',
        text: language === 'fr' ? 'Terminé' : 'Completed'
      },
      pending: {
        className: 'px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium',
        text: language === 'fr' ? 'En attente' : 'Pending'
      },
      in_progress: {
        className: 'px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium',
        text: language === 'fr' ? 'En cours' : 'In progress'
      },
      failed: {
        className: 'px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium',
        text: language === 'fr' ? 'Échoué' : 'Failed'
      }
    };

    const config = statusConfig[status] || {
      className: 'px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium',
      text: status
    };

    return (
      <span className={config.className}>
        {config.text}
      </span>
    );
  };

  // Fonction helper pour rendre les champs de type array de façon sécurisée
  const renderArrayField = (
    items: string[] | undefined,
    colorClass: string,
    fallbackText: string
  ): JSX.Element => {
    if (items && items.length > 0) {
      return (
        <>
          {items.map((item: string, index: number) => (
            <span
              key={index}
              className={`px-2 py-1 ${colorClass} text-xs rounded-full`}
            >
              {item}
            </span>
          ))}
        </>
      );
    }
    return (
      <span className="text-sm text-gray-900">
        {fallbackText}
      </span>
    );
  };

  // Redirection si pas d'utilisateur
  if (!user) {
    return null; // Sera redirigé dans useEffect
  }

  // Options de langue pour le dropdown
  const languageOptions: LanguageOption[] = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'de', label: 'Deutsch' },
    { value: 'it', label: 'Italiano' },
    { value: 'pt', label: 'Português' },
    { value: 'ru', label: 'Русский' },
    { value: 'zh', label: '中文' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'ar', label: 'العربية' },
    { value: 'hi', label: 'हिन्दी' },
    { value: 'nl', label: 'Nederlands' },
    { value: 'sv', label: 'Svenska' },
    { value: 'no', label: 'Norsk' },
    { value: 'da', label: 'Dansk' },
    { value: 'fi', label: 'Suomi' },
    { value: 'pl', label: 'Polski' },
    { value: 'cs', label: 'Čeština' },
    { value: 'hu', label: 'Magyar' },
    { value: 'el', label: 'Ελληνικά' },
    { value: 'tr', label: 'Türkçe' },
    { value: 'he', label: 'עברית' },
    { value: 'th', label: 'ไทย' },
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'id', label: 'Bahasa Indonesia' },
    { value: 'ms', label: 'Bahasa Melayu' },
    { value: 'tl', label: 'Tagalog' },
    { value: 'sw', label: 'Kiswahili' },
    { value: 'other', label: 'Autre' }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-4">
                    {user.profilePhoto ? (
                      <img 
                        src={user.profilePhoto} 
                        alt={user.firstName} 
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-red-600" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {user.firstName} {user.lastName}
                      </h2>
                      <p className="text-gray-500">{user.email}</p>
                      <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'lawyer' 
                          ? 'bg-blue-100 text-blue-800' 
                          : user.role === 'expat'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role === 'lawyer' 
                          ? (language === 'fr' ? 'Avocat' : 'Lawyer')
                          : user.role === 'expat'
                            ? (language === 'fr' ? 'Expatrié' : 'Expat')
                            : (language === 'fr' ? 'Client' : 'Client')
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                <nav className="p-4">
                  <ul className="space-y-2">
                    <li>
                      <button
                        onClick={() => setActiveTab('profile')}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                          activeTab === 'profile'
                            ? 'bg-red-50 text-red-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <User className="mr-3 h-5 w-5" />
                        {language === 'fr' ? 'Mon profil' : 'My profile'}
                      </button>
                    </li>

                    <li>
                      <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                          activeTab === 'settings'
                            ? 'bg-red-50 text-red-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Settings className="mr-3 h-5 w-5" />
                        {language === 'fr' ? 'Paramètres' : 'Settings'}
                      </button>
                    </li>

                    <li>
                      <button
                        onClick={() => setActiveTab('calls')}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                          activeTab === 'calls'
                            ? 'bg-red-50 text-red-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Phone className="mr-3 h-5 w-5" />
                        {language === 'fr' ? 'Mes appels' : 'My calls'}
                      </button>
                    </li>

                    <li>
                      <button
                        onClick={() => setActiveTab('invoices')}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                          activeTab === 'invoices'
                            ? 'bg-red-50 text-red-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <FileText className="mr-3 h-5 w-5" />
                        {language === 'fr' ? 'Mes factures' : 'My invoices'}
                      </button>
                    </li>

                    <li>
                      <button
                        onClick={() => setActiveTab('reviews')}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                          activeTab === 'reviews'
                            ? 'bg-red-50 text-red-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Star className="mr-3 h-5 w-5" />
                        {language === 'fr' ? 'Mes avis' : 'My reviews'}
                      </button>
                    </li>

                    <li>
                      <button
                        onClick={() => setActiveTab('notifications')}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                          activeTab === 'notifications'
                            ? 'bg-red-50 text-red-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Bell className="mr-3 h-5 w-5" />
                        {language === 'fr' ? 'Notifications' : 'Notifications'}
                      </button>
                    </li>

                    <li>
                      <button
                        onClick={() => setActiveTab('messages')}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                          activeTab === 'messages'
                            ? 'bg-red-50 text-red-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <MessageSquare className="mr-3 h-5 w-5" />
                        {language === 'fr' ? 'Mes messages' : 'My messages'}
                      </button>
                    </li>

                    {user.role === 'admin' && (
                      <li>
                        <button
                          onClick={() => navigate('/admin/dashboard')}
                          className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          <Shield className="mr-3 h-5 w-5" />
                          {language === 'fr' ? 'Administration' : 'Admin panel'}
                        </button>
                      </li>
                    )}

                    <li>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        <LogOut className="mr-3 h-5 w-5" />
                        {language === 'fr' ? 'Déconnexion' : 'Logout'}
                      </button>
                    </li>
                  </ul>
                </nav>
                
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {language === 'fr' ? 'Statut de disponibilité' : 'Availability status'}
                  </h3>
                  {user && (user.role === 'lawyer' || user.role === 'expat') ? (
                    <AvailabilityToggle className="justify-center" />
                  ) : (
                    <p className="text-gray-500 text-center">
                      {language === 'fr' 
                        ? 'Statut disponible uniquement pour les prestataires' 
                        : 'Status available only for providers'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contenu Principal */}
            <div className="lg:col-span-3">
              {/* Onglet Profil */}
              {activeTab === 'profile' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {language === 'fr' ? 'Mon profil' : 'My profile'}
                    </h2>
                    {user.role === 'client' ? (
                      isEditing ? (
                        <div className="flex space-x-2">
                          <Button
                            onClick={handleCancelEdit}
                            variant="outline"
                            size="small"
                          >
                            {language === 'fr' ? 'Annuler' : 'Cancel'}
                          </Button>
                          <Button
                            onClick={handleSaveProfile}
                            loading={isLoading}
                            size="small"
                          >
                            {language === 'fr' ? 'Enregistrer' : 'Save'}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={handleEditProfile}
                          variant="outline"
                          size="small"
                        >
                          <Edit size={16} className="mr-2" />
                          {language === 'fr' ? 'Modifier' : 'Edit'}
                        </Button>
                      )
                    ) : (
                      <Button
                        onClick={() => navigate('/contact')}
                        variant="outline"
                        size="small"
                      >
                        <ExternalLink size={16} className="mr-2" />
                        {language === 'fr' ? 'Contacter le support' : 'Contact support'}
                      </Button>
                    )}
                  </div>
                  <div className="p-6">
                    {successMessage && (
                      <div className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-md p-4">
                        <div className="flex">
                          <Check className="h-5 w-5 text-green-400 mr-2" />
                          <span>{successMessage}</span>
                        </div>
                      </div>
                    )}
                    
                    {errorMessage && (
                      <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
                        <div className="flex">
                          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                          <span>{errorMessage}</span>
                        </div>
                      </div>
                    )}
                    
                    {user.role !== 'client' && (
                      <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-4">
                        <div className="flex">
                          <AlertTriangle className="h-5 w-5 text-blue-400 mr-2" />
                          <div>
                            <p className="font-medium">
                              {language === 'fr' 
                                ? 'Modification des informations personnelles' 
                                : 'Personal information modification'}
                            </p>
                            <p className="mt-1">
                              {language === 'fr'
                                ? 'Pour modifier vos informations personnelles, veuillez contacter notre équipe support.'
                                : 'To modify your personal information, please contact our support team.'}
                            </p>
                            <Button
                              onClick={() => navigate('/contact')}
                              className="mt-2"
                              size="small"
                            >
                              {language === 'fr' ? 'Contacter le support' : 'Contact support'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          {language === 'fr' ? 'Informations personnelles' : 'Personal information'}
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              {language === 'fr' ? 'Nom complet' : 'Full name'}
                            </p>
                            <p className="mt-1 text-sm text-gray-900">
                              {user.firstName} {user.lastName}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Email
                            </p>
                            {isEditing && user.role === 'client' ? (
                              <input
                                type="email"
                                value={profileData.email}
                                onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                            ) : (
                              <p className="mt-1 text-sm text-gray-900">
                                {user.email}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              {language === 'fr' ? 'Téléphone' : 'Phone'}
                            </p>
                            {isEditing && user.role === 'client' ? (
                              <div className="mt-1 flex space-x-2">
                                <select
                                  value={profileData.phoneCountryCode}
                                  onChange={(e) => setProfileData(prev => ({ ...prev, phoneCountryCode: e.target.value }))}
                                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                  <option value="+33">🇫🇷 +33</option>
                                  <option value="+1">🇺🇸 +1</option>
                                  <option value="+44">🇬🇧 +44</option>
                                  <option value="+49">🇩🇪 +49</option>
                                  <option value="+34">🇪🇸 +34</option>
                                  <option value="+39">🇮🇹 +39</option>
                                  <option value="+66">🇹🇭 +66</option>
                                  <option value="+61">🇦🇺 +61</option>
                                </select>
                                <input
                                  type="tel"
                                  value={profileData.phone}
                                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                  placeholder="612345678"
                                />
                              </div>
                            ) : (
                              <p className="mt-1 text-sm text-gray-900">
                                {user.phone ? `${user.phoneCountryCode} ${user.phone}` : (language === 'fr' ? 'Non renseigné' : 'Not provided')}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              {language === 'fr' ? 'Pays de résidence' : 'Country of residence'}
                            </p>
                            {isEditing && user.role === 'client' ? (
                              <input
                                type="text"
                                value={profileData.currentCountry}
                                onChange={(e) => setProfileData(prev => ({ ...prev, currentCountry: e.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="Ex: Canada, Thaïlande..."
                              />
                            ) : (
                              <p className="mt-1 text-sm text-gray-900">
                                {user.currentCountry || (language === 'fr' ? 'Non renseigné' : 'Not provided')}
                              </p>
                            )}
                          </div>
                          {user.role !== 'client' && (
                            <div>
                              <p className="text-sm font-medium text-gray-500">
                                {language === 'fr' ? 'Statut' : 'Status'}
                              </p>
                              <div className="mt-1 flex items-center">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  currentStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  <span className={`w-2 h-2 mr-2 rounded-full ${
                                    currentStatus ? 'bg-green-600' : 'bg-red-600'
                                  }`}></span>
                                  {currentStatus 
                                    ? (language === 'fr' ? 'En ligne' : 'Online')
                                    : (language === 'fr' ? 'Hors ligne' : 'Offline')
                                  }
                                </span>
                                <span className="ml-2 text-sm text-gray-500">
                                  {language === 'fr' 
                                    ? '(Modifiable dans la barre latérale)'
                                    : '(Editable in sidebar)'
                                  }
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          {language === 'fr' ? 'Photo de profil' : 'Profile photo'}
                        </h3>
                        {isEditing && user.role === 'client' ? (
                          <ImageUploader
                            onImageUploaded={(url: string) => setProfileData(prev => ({ ...prev, profilePhoto: url }))}
                            currentImage={profileData.profilePhoto}
                          />
                        ) : (
                          <div className="flex justify-center">
                            {user.profilePhoto ? (
                              <img 
                                src={user.profilePhoto} 
                                alt={user.firstName} 
                                className="w-32 h-32 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-32 h-32 bg-red-100 rounded-full flex items-center justify-center">
                                <User className="h-16 w-16 text-red-600" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {user.role !== 'client' && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          {language === 'fr' ? 'Informations professionnelles' : 'Professional information'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {user.role === 'lawyer' && (
                            <>
                              <div>
                                <p className="text-sm font-medium text-gray-500">
                                  {language === 'fr' ? 'Numéro au barreau' : 'Bar number'}
                                </p>
                                <p className="mt-1 text-sm text-gray-900">
                                  {user.barNumber || (language === 'fr' ? 'Non renseigné' : 'Not provided')}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">
                                  {language === 'fr' ? 'Années d\'expérience' : 'Years of experience'}
                                </p>
                                <p className="mt-1 text-sm text-gray-900">
                                  {user.yearsOfExperience || 0} {language === 'fr' ? 'ans' : 'years'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">
                                  {language === 'fr' ? 'Spécialités' : 'Specialties'}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {renderArrayField(
                                    user.specialties, 
                                    'bg-blue-100 text-blue-800',
                                    language === 'fr' ? 'Non renseigné' : 'Not provided'
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">
                                  {language === 'fr' ? 'Pays d\'intervention' : 'Countries of practice'}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {renderArrayField(
                                    user.practiceCountries, 
                                    'bg-blue-100 text-blue-800',
                                    language === 'fr' ? 'Non renseigné' : 'Not provided'
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                          {user.role === 'expat' && (
                            <>
                              <div>
                                <p className="text-sm font-medium text-gray-500">
                                  {language === 'fr' ? 'Pays de résidence' : 'Country of residence'}
                                </p>
                                <p className="mt-1 text-sm text-gray-900">
                                  {user.residenceCountry || (language === 'fr' ? 'Non renseigné' : 'Not provided')}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">
                                  {language === 'fr' ? 'Années d\'expatriation' : 'Years as expat'}
                                </p>
                                <p className="mt-1 text-sm text-gray-900">
                                  {user.yearsAsExpat || 0} {language === 'fr' ? 'ans' : 'years'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">
                                  {language === 'fr' ? 'Types d\'aide' : 'Help types'}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {renderArrayField(
                                    user.helpTypes, 
                                    'bg-green-100 text-green-800',
                                    language === 'fr' ? 'Non renseigné' : 'Not provided'
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">
                                  {language === 'fr' ? 'Pays d\'intervention' : 'Countries of intervention'}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {renderArrayField(
                                    user.interventionCountries, 
                                    'bg-green-100 text-green-800',
                                    language === 'fr' ? 'Non renseigné' : 'Not provided'
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              {language === 'fr' ? 'Langues parlées' : 'Languages spoken'}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {renderArrayField(
                                user.languages, 
                                'bg-red-100 text-red-800',
                                language === 'fr' ? 'Non renseigné' : 'Not provided'
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Onglet Paramètres */}
              {activeTab === 'settings' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {language === 'fr' ? 'Paramètres' : 'Settings'}
                    </h2>
                  </div>
                  <div className="p-6">
                    {successMessage && (
                      <div className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-md p-4">
                        <div className="flex">
                          <Check className="h-5 w-5 text-green-400 mr-2" />
                          <span>{successMessage}</span>
                        </div>
                      </div>
                    )}
                    
                    {errorMessage && (
                      <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
                        <div className="flex">
                          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                          <span>{errorMessage}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-8">
                      {/* Paramètres de langue */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <Globe className="mr-2 h-5 w-5 text-gray-500" />
                          {language === 'fr' ? 'Paramètres de langue' : 'Language settings'}
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              {language === 'fr' ? 'Langue principale' : 'Primary language'}
                            </p>
                            <div className="text-sm text-gray-900">
                              {user.preferredLanguage === 'fr' ? 'Français' : 'English'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {language === 'fr' 
                                ? 'La langue principale ne peut pas être modifiée' 
                                : 'Primary language cannot be changed'}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              {language === 'fr' ? 'Langue secondaire' : 'Secondary language'}
                            </p>
                            <div className="flex items-center space-x-2">
                              <select
                                value={enhancedSettings.language.secondary}
                                onChange={(e) => {
                                  if (e.target.value === 'other') {
                                    setShowCustomLanguage(true);
                                  } else {
                                    updateLanguageSettings('secondary', e.target.value);
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                              >
                                <option value="none">{language === 'fr' ? 'Aucune' : 'None'}</option>
                                {languageOptions.map((option: LanguageOption) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                                <option value="other">{language === 'fr' ? 'Autre' : 'Other'}</option>
                              </select>
                            </div>
                            
                            {showCustomLanguage && (
                              <div className="mt-2 flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={customLanguage}
                                  onChange={(e) => setCustomLanguage(e.target.value)}
                                  placeholder={language === 'fr' ? "Précisez la langue" : "Specify language"}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <Button
                                  onClick={handleAddSecondaryLanguage}
                                  size="small"
                                >
                                  {language === 'fr' ? 'Ajouter' : 'Add'}
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              {language === 'fr' ? 'Langue de communication préférée' : 'Preferred communication language'}
                            </p>
                            <select
                              value={enhancedSettings.language.preferredCommunication}
                              onChange={(e) => updateLanguageSettings('preferredCommunication', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              <option value="fr">Français</option>
                              <option value="en">English</option>
                              {enhancedSettings.language.secondary !== 'none' && 
                               enhancedSettings.language.secondary !== 'fr' && 
                               enhancedSettings.language.secondary !== 'en' && (
                                <option value={enhancedSettings.language.secondary}>
                                  {languageOptions.find((l: LanguageOption) => l.value === enhancedSettings.language.secondary)?.label || enhancedSettings.language.secondary}
                                </option>
                              )}
                            </select>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bouton de sauvegarde */}
                      <div className="pt-4 border-t border-gray-200">
                        <Button
                          onClick={handleSaveSettings}
                          loading={isLoading}
                          fullWidth
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {language === 'fr' ? 'Enregistrer les paramètres' : 'Save settings'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Appels */}
              {activeTab === 'calls' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {language === 'fr' ? 'Mes appels' : 'My calls'}
                    </h2>
                  </div>
                  <div className="p-6">
                    {calls.length > 0 ? (
                      <div className="space-y-4">
                        {calls.map((call: Call) => (
                          <div key={call.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium text-gray-900">{call.title}</h3>
                                <p className="text-sm text-gray-500">{call.description}</p>
                                <div className="mt-2 flex items-center space-x-4 text-sm">
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 text-gray-400 mr-1" />
                                    <span>{formatDuration(call.duration)}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <CreditCard className="w-4 h-4 text-gray-400 mr-1" />
                                    <span>{formatPrice(call.price)}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                                    <span>{formatDate(call.createdAt)}</span>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <p className="text-sm text-gray-700">
                                    {user.role === 'client' 
                                      ? `${language === 'fr' ? 'Prestataire' : 'Provider'}: ${call.providerName}`
                                      : `${language === 'fr' ? 'Client' : 'Client'}: ${call.clientName}`
                                    }
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-2">
                                {getStatusBadge(call.status)}
                                {call.status === 'completed' && user.role === 'client' && !call.clientRating && (
                                  <Button
                                    size="small"
                                    variant="outline"
                                  >
                                    {language === 'fr' ? 'Laisser un avis' : 'Leave a review'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        {language === 'fr' 
                          ? 'Vous n\'avez pas encore effectué d\'appels.' 
                          : 'You haven\'t made any calls yet.'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Onglet Messages */}
              {activeTab === 'messages' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {language === 'fr' ? 'Mes messages' : 'My messages'}
                    </h2>
                  </div>
                  <div className="p-6">
                    <DashboardMessages />
                  </div>
                </div>
              )}

              {/* Onglet Factures */}
              {activeTab === 'invoices' && (
                <UserInvoices />
              )}

              {/* Onglet Avis */}
              {activeTab === 'reviews' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {language === 'fr' ? 'Mes avis' : 'My reviews'}
                    </h2>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-500 text-center py-8">
                      {language === 'fr' 
                        ? 'Aucun avis pour le moment.' 
                        : 'No reviews yet.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Onglet Notifications */}
              {activeTab === 'notifications' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {language === 'fr' ? 'Notifications' : 'Notifications'}
                    </h2>
                  </div>
                  <div className="p-6">
                    {/* Paramètres de notification pour les prestataires */}
                    {(user?.role === 'lawyer' || user?.role === 'expat') && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {language === 'fr' ? 'Préférences de notifications' : 'Notification preferences'}
                        </h3>
                        <NotificationSettings />
                      </div>
                    )}
                    
                    {/* Historique des notifications */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {language === 'fr' ? 'Historique des notifications' : 'Notification history'}
                      </h3>
                      {notifications.length > 0 ? (
                        <div className="space-y-4">
                          {notifications.map((notification: Notification) => (
                            <div 
                              key={notification.id} 
                              className={`p-4 rounded-lg border ${notification.isRead ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
                            >
                              <div className="flex justify-between">
                                <h4 className="font-medium text-gray-900">{notification.title}</h4>
                                <span className="text-sm text-gray-500">{formatDate(notification.createdAt)}</span>
                              </div>
                              <p className="mt-1 text-gray-600">{notification.message}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          {language === 'fr' 
                            ? 'Vous n\'avez pas de notifications.' 
                            : 'You don\'t have any notifications.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;