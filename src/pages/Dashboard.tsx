// src/pages/Dashboard.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Mail,
  MessageSquare,
  Check,
  AlertTriangle,
  Clock,
  Star,
  Bookmark
} from 'lucide-react';

import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import AvailabilityToggle from '../components/dashboard/AvailabilityToggle';
import NotificationSettings from '../notifications/notificationsDashboardProviders/NotificationSettings';
import UserInvoices from '../components/dashboard/UserInvoices';
import DashboardMessages from '../components/dashboard/DashboardMessages';
import ImageUploader from '../components/common/ImageUploader';
import MultiLanguageSelect from '../components/forms-data/MultiLanguageSelect';

import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { updateUserProfile, logAuditEvent } from '../utils/firestore';

import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { updateEmail as fbUpdateEmail, updateProfile as fbUpdateProfile } from 'firebase/auth';

// ===============================
// 🎨 DESIGN TOKENS (UI only — aucune incidence métier)
// ===============================
const UI = {
  card:
    'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  sectionTitle: 'text-lg font-semibold text-gray-900 dark:text-gray-100',
  text: 'text-gray-700 dark:text-gray-200',
  textMuted: 'text-gray-500 dark:text-gray-400',
  radiusSm: 'rounded-lg',
  radiusFull: 'rounded-full'
} as const;

const ROLE = {
  admin: {
    header: 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white',
    chip: 'bg-amber-100 text-amber-700 border border-amber-200'
  },
  lawyer: {
    header: 'bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white',
    chip: 'bg-red-100 text-red-700 border border-red-200'
  },
  expat: {
    header: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white',
    chip: 'bg-indigo-100 text-indigo-700 border border-indigo-200'
  },
  client: {
    header: 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white',
    chip: 'bg-purple-100 text-purple-700 border border-purple-200'
  },
  defaultHeader: 'bg-gradient-to-r from-red-500 via-orange-500 to-purple-600 text-white'
} as const;

type RoleKey = 'admin' | 'lawyer' | 'expat' | 'client';
const getHeaderClassForRole = (role?: string): string => {
  if (role === 'admin') return ROLE.admin.header;
  if (role === 'lawyer') return ROLE.lawyer.header;
  if (role === 'expat') return ROLE.expat.header;
  if (role === 'client') return ROLE.client.header;
  return ROLE.defaultHeader;
};
const getChipClassForRole = (role?: string): string => {
  if (role === 'admin') return ROLE.admin.chip;
  if (role === 'lawyer') return ROLE.lawyer.chip;
  if (role === 'expat') return ROLE.expat.chip;
  if (role === 'client') return ROLE.client.chip;
  return 'bg-white/20';
};

// ===============================
// Types
// ===============================
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

interface NotificationItem {
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
  whatsappNumber?: string;
  whatsappCountryCode?: string;
  currentCountry: string;
  currentPresenceCountry?: string;
  residenceCountry?: string;
  profilePhoto: string;
  isOnline: boolean;

  // commun
  preferredLanguage?: 'fr' | 'en';
  languages?: string[];
  bio?: string;

  // lawyer
  yearsOfExperience?: number;
  specialties?: string[];
  practiceCountries?: string[];
  graduationYear?: number;
  educations?: string[];
  barNumber?: string;

  // expat
  helpTypes?: string[];
  yearsAsExpat?: number;
  interventionCountries?: string[];
}

type TabType =
  | 'profile'
  | 'settings'
  | 'calls'
  | 'invoices'
  | 'reviews'
  | 'notifications'
  | 'messages'
  | 'favorites';

type CallStatus = 'completed' | 'pending' | 'in_progress' | 'failed';

// ===============================
// Sous-composants UI (logique inchangée, styles modernisés)
// ===============================
const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'number';
}> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-red-500 transition"
    />
  </div>
);

const ChipInput: React.FC<{
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className }) => {
  const [input, setInput] = useState<string>('');
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (value.includes(v)) {
      setInput('');
      return;
    }
    onChange([...value, v]);
    setInput('');
  };
  const remove = (i: number) => {
    const next = [...value];
    next.splice(i, 1);
    onChange(next);
  };
  return (
    <div className={className ?? ''}>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100 dark:bg-white/10 dark:text-white dark:border-white/10"
          >
            {v}
            <button
              type="button"
              className="hover:opacity-80"
              onClick={() => remove(i)}
              aria-label={`Supprimer ${v}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
        />
        <Button type="button" onClick={add} size="small" title="Ajouter">
          Ajouter
        </Button>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{value || '—'}</p>
  </div>
);

const PillsRow: React.FC<{ label: string; items: string[]; color: 'blue' | 'green' | 'red' }> = ({
  label,
  items,
  color
}) => {
  const colorMap: Record<'blue' | 'green' | 'red', string> = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300'
  };
  return (
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {(items || []).length > 0 ? (
          items.map((it, i) => (
            <span key={`${it}-${i}`} className={`px-2 py-1 ${colorMap[color]} text-xs rounded-full`}>
              {it}
            </span>
          ))
        ) : (
          <span className="text-sm text-gray-900 dark:text-gray-100">—</span>
        )}
      </div>
    </div>
  );
};

const Alert: React.FC<{ type: 'success' | 'error'; message: string }> = ({ type, message }) => {
  const cfg =
    type === 'success'
      ? {
          bg: 'bg-green-50 dark:bg-green-500/10',
          border: 'border-green-200 dark:border-green-500/20',
          text: 'text-green-800 dark:text-green-200',
          icon: <Check className="h-5 w-5 mr-2" />
        }
      : {
          bg: 'bg-red-50 dark:bg-red-500/10',
          border: 'border-red-200 dark:border-red-500/20',
          text: 'text-red-800 dark:text-red-200',
          icon: <AlertTriangle className="h-5 w-5 mr-2" />
        };
  return (
    <div
      className={`mb-2 ${cfg.bg} ${cfg.border} ${cfg.text} rounded-xl p-4 shadow-sm transition`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        {cfg.icon}
        <span>{message}</span>
      </div>
    </div>
  );
};

// ===============================
// Composant principal
// ===============================
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, firebaseUser, logout, refreshUser } = useAuth();
  const { language } = useApp();

  // UI & feedback
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // data
  const [currentStatus, setCurrentStatus] = useState<boolean>(user?.isOnline ?? false);
  const [calls, setCalls] = useState<Call[]>([]);
  const [invoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [favorites, setFavorites] = useState<
    Array<{ id: string; type: 'lawyer' | 'expat'; name: string; country?: string; photo?: string }>
  >([]);

  // Profil (édition) pré-rempli
  const baseProfile: ProfileData = useMemo(
    () => ({
      email: user?.email || '',
      phone: (user as { phone?: string })?.phone || '',
      phoneCountryCode: (user as { phoneCountryCode?: string })?.phoneCountryCode || '+33',
      whatsappNumber: (user as { whatsappNumber?: string })?.whatsappNumber || '',
      whatsappCountryCode: (user as { whatsappCountryCode?: string })?.whatsappCountryCode || '+33',
      currentCountry: (user as { currentCountry?: string })?.currentCountry || '',
      currentPresenceCountry: (user as { currentPresenceCountry?: string })?.currentPresenceCountry || '',
      residenceCountry: (user as { residenceCountry?: string })?.residenceCountry || '',
      profilePhoto: user?.profilePhoto || user?.photoURL || '',
      isOnline: user?.isOnline ?? true,
      preferredLanguage: (user as { preferredLanguage?: 'fr' | 'en' })?.preferredLanguage || 'fr',
      languages: (user as { languages?: string[] })?.languages || [],
      bio: (user as { bio?: string })?.bio || '',
      yearsOfExperience: (user as { yearsOfExperience?: number })?.yearsOfExperience ?? 0,
      specialties: (user as { specialties?: string[] })?.specialties || [],
      practiceCountries: (user as { practiceCountries?: string[] })?.practiceCountries || [],
      graduationYear: (user as { graduationYear?: number })?.graduationYear || new Date().getFullYear() - 5,
      educations: (user as { educations?: string[] })?.educations || [],
      barNumber: (user as { barNumber?: string })?.barNumber || '',
      helpTypes: (user as { helpTypes?: string[] })?.helpTypes || [],
      yearsAsExpat: (user as { yearsAsExpat?: number })?.yearsAsExpat ?? 0,
      interventionCountries: (user as { interventionCountries?: string[] })?.interventionCountries || []
    }),
    [user]
  );
  const [profileData, setProfileData] = useState<ProfileData>(baseProfile);

  // Langues (sélecteur identique aux formulaires)
  const [selectedLanguages, setSelectedLanguages] = useState<Array<{ value: string; label: string }>>(
    (baseProfile.languages || []).map((l) => ({ value: l, label: l }))
  );

  // Redirect si pas loggé
  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);


  // Status en temps réel (priorité = sos_profiles, fallback = users)
  useEffect(() => {
    if (!user?.id) return;

    const sosRef = doc(db, 'sos_profiles', user.id);
    const userRef = doc(db, 'users', user.id);

    let unsubUsers: null | (() => void) = null;

    const unsubSos = onSnapshot(
      sosRef,
      (snap) => {
        if (snap.exists()) {
          if (unsubUsers) {
            unsubUsers();
            unsubUsers = null;
          }
          const data = snap.data() as { isOnline?: boolean };
          setCurrentStatus(data?.isOnline === true);
        } else {
          if (!unsubUsers) {
            unsubUsers = onSnapshot(
              userRef,
              (s) => {
                if (s.exists()) {
                  const udata = s.data() as { isOnline?: boolean };
                  setCurrentStatus(udata?.isOnline === true);
                }
              },
              () => {
                /* silent */
              }
            );
          }
        }
      },
      () => {
        /* silent */
      }
    );

    return () => {
      unsubSos();
      if (unsubUsers) unsubUsers();
    };
  }, [user?.id]);

  // Favoris
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const q = query(collection(db, 'users', user.id, 'favorites'), orderBy('createdAt', 'desc'), limit(20));
        const snap = await getDocs(q);
        const items: Array<{ id: string; type: 'lawyer' | 'expat'; name: string; country?: string; photo?: string }> = [];
        snap.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          items.push({
            id: d.id,
            type: (data.type as 'lawyer' | 'expat') || 'lawyer',
            name: String(data.name || ''),
            country: (data.country as string) || '',
            photo: (data.photo as string) || ''
          });
        });
        setFavorites(items);
      } catch {
        /* silent */
      }
    })();
  }, [user?.id]);

  // Historique notifications (optionnel – placeholder)
  useEffect(() => {
    setNotifications([]);
  }, []);

  // Appels (placeholder lisible – garde tes fetch si tu en as)
  useEffect(() => {
    setCalls([]);
  }, []);

  // Helpers
  const formatDate = (date: Date): string =>
    new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);

  const formatDuration = (minutes: number): string => `${minutes} min`;
  const formatPrice = (price: number): string => `${price.toFixed(2)} €`;

  const getStatusBadge = (status: CallStatus): JSX.Element => {
    const statusConfig: Record<CallStatus, { className: string; text: string }> = {
      completed: {
        className:
          'px-2 py-1 bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300 rounded-full text-xs font-medium',
        text: language === 'fr' ? 'Terminé' : 'Completed'
      },
      pending: {
        className:
          'px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300 rounded-full text-xs font-medium',
        text: language === 'fr' ? 'En attente' : 'Pending'
      },
      in_progress: {
        className:
          'px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 rounded-full text-xs font-medium',
        text: language === 'fr' ? 'En cours' : 'In progress'
      },
      failed: {
        className:
          'px-2 py-1 bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300 rounded-full text-xs font-medium',
        text: language === 'fr' ? 'Échoué' : 'Failed'
      }
    };
    const config = statusConfig[status];
    return <span className={config.className}>{config.text}</span>;
  };

  // Palette alignée Home (fallback si rôle non défini)
  const headerGradient = getHeaderClassForRole(user?.role);
  const softCard = UI.card;

  // ===============================
  // PHOTO : persistance immédiate (users + sos_profiles + Auth)
  // ===============================
  const handleInstantPhotoPersist = useCallback(
    async (url: string) => {
      if (!user) return;
      try {
        // users/{uid}
        await updateDoc(doc(db, 'users', user.id), {
          profilePhoto: url,
          photoURL: url,
          avatar: url,
          updatedAt: serverTimestamp()
        });

        // sos_profiles/{uid} si prestataire
        if (user.role === 'lawyer' || user.role === 'expat') {
          await updateDoc(doc(db, 'sos_profiles', user.id), {
            profilePhoto: url,
            photoURL: url,
            avatar: url,
            updatedAt: serverTimestamp()
          }).catch(() => {});
        }

        // Auth photoURL
        if (auth.currentUser) {
          await fbUpdateProfile(auth.currentUser, { photoURL: url }).catch(() => {});
        }

        // MAJ UI immédiate
        setProfileData((prev) => ({ ...prev, profilePhoto: url }));

        await logAuditEvent(user.id, 'profile_photo_updated', { newUrl: url });
        await refreshUser?.(); // propage vers sidebar / profil

        setSuccessMessage(language === 'fr' ? 'Photo mise à jour ✅' : 'Photo updated ✅');
        setTimeout(() => setSuccessMessage(null), 2000);
      } catch (e) {
        setErrorMessage(
          language === 'fr' ? 'Erreur lors de la mise à jour de la photo' : 'Error updating photo'
        );
        setTimeout(() => setErrorMessage(null), 2500);
      }
    },
    [user, refreshUser, language]
  );

  // ===============================
  // Sauvegarde des paramètres
  // ===============================
  const saveSettings = async (): Promise<void> => {
    if (!user) return;

    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      // langues depuis le MultiLanguageSelect
      const languagesFromSelect = selectedLanguages.map((o) => o.value);

      const payload: Record<string, unknown> = {
        email: profileData.email.trim().toLowerCase(),
        phone: profileData.phone || '',
        phoneCountryCode: profileData.phoneCountryCode || '+33',
        whatsappNumber: profileData.whatsappNumber || '',
        whatsappCountryCode: profileData.whatsappCountryCode || '+33',
        currentCountry: profileData.currentCountry || '',
        currentPresenceCountry: profileData.currentPresenceCountry || '',
        residenceCountry: profileData.residenceCountry || '',
        preferredLanguage: profileData.preferredLanguage || 'fr',
        languages: languagesFromSelect,
        bio: profileData.bio || '',
        profilePhoto: profileData.profilePhoto || '',
        photoURL: profileData.profilePhoto || '',
        avatar: profileData.profilePhoto || '',
        updatedAt: new Date()
      };

      if (user.role === 'lawyer') {
        Object.assign(payload, {
          practiceCountries: profileData.practiceCountries || [],
          yearsOfExperience:
            typeof profileData.yearsOfExperience === 'number' ? profileData.yearsOfExperience : 0,
          specialties: profileData.specialties || [],
          graduationYear:
            typeof profileData.graduationYear === 'number'
              ? profileData.graduationYear
              : new Date().getFullYear() - 5,
          educations: profileData.educations || [],
          barNumber: profileData.barNumber || ''
        });
      } else if (user.role === 'expat') {
        Object.assign(payload, {
          helpTypes: profileData.helpTypes || [],
          yearsAsExpat:
            typeof profileData.yearsAsExpat === 'number' ? profileData.yearsAsExpat : 0,
          interventionCountries: profileData.interventionCountries || []
        });
      }

      // Si changement d'email => met à jour l'identifiant Auth
      const emailChanged =
        user.email.trim().toLowerCase() !== profileData.email.trim().toLowerCase();
      if (emailChanged && firebaseUser) {
        try {
          await fbUpdateEmail(firebaseUser, profileData.email.trim().toLowerCase());
        } catch {
          throw new Error(
            language === 'fr'
              ? "Impossible de changer l’email (reconnexion récente requise). Déconnectez-vous puis reconnectez-vous et réessayez."
              : 'Cannot change email (recent login required). Please sign out/in and try again.'
          );
        }
      }

      // update Firestore user
      await updateUserProfile(user.id, payload);

      // sync SOS profile
      if (user.role === 'lawyer' || user.role === 'expat') {
        await updateDoc(doc(db, 'sos_profiles', user.id), {
          profilePhoto: payload.profilePhoto,
          photoURL: payload.photoURL,
          avatar: payload.avatar,
          email: payload.email,
          phone: payload.phone,
          phoneCountryCode: payload.phoneCountryCode,
          languages: payload.languages,
          country:
            user.role === 'lawyer'
              ? profileData.currentCountry || ''
              : profileData.residenceCountry || profileData.currentCountry || '',
          description: payload.bio,
          specialties:
            user.role === 'lawyer'
              ? (payload as { specialties?: string[] }).specialties || []
              : (payload as { helpTypes?: string[] }).helpTypes || [],
          yearsOfExperience:
            user.role === 'lawyer'
              ? (payload as { yearsOfExperience?: number }).yearsOfExperience || 0
              : (payload as { yearsAsExpat?: number }).yearsAsExpat || 0,
          interventionCountries:
            user.role === 'lawyer'
              ? (payload as { practiceCountries?: string[] }).practiceCountries || []
              : (payload as { interventionCountries?: string[] }).interventionCountries || [],
          updatedAt: serverTimestamp()
        }).catch(() => {});
      }

      await logAuditEvent(user.id, 'settings_updated', {
        settings: JSON.stringify(payload)
      });
      await refreshUser?.();

      setSuccessMessage(language === 'fr' ? 'Paramètres mis à jour ✔️' : 'Settings updated ✔️');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (error) {
      setErrorMessage(
        language === 'fr' ? 'Erreur lors de la mise à jour des paramètres' : 'Error updating settings'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Logout sans écran blanc
  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  }, [logout, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        {language === 'fr' ? 'Redirection…' : 'Redirecting…'}
      </div>
    );
  }

  // ===============================
  // Rendu
  // ===============================
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-rose-50/40 to-white dark:from-gray-950 dark:via-gray-950 dark:to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* SIDEBAR GAUCHE */}
            <div className="lg:col-span-1">
              <div className={`${softCard} overflow-hidden`}>
                <div className={`p-6 ${headerGradient}`}>
                  <div className="flex items-center space-x-4">
                    {user.profilePhoto ? (
                      <img
                        src={`${user.profilePhoto}?v=${(user.updatedAt as Date | undefined)?.valueOf?.() || Date.now()}`}
                        alt={user.firstName}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-white/80"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-white" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-extrabold leading-tight">
                        {user.firstName} {user.lastName}
                      </h2>
                      <p className="text-white/90 text-sm flex items-center gap-1" title={user.email}>
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </p>
                      <span className={`inline-block mt-2 px-2.5 py-1 ${UI.radiusFull} text-xs font-semibold bg-white/20`}>
                        {user.role === 'lawyer'
                          ? language === 'fr'
                            ? 'Avocat'
                            : 'Lawyer'
                          : user.role === 'expat'
                          ? language === 'fr'
                            ? 'Expatrié'
                            : 'Expat'
                          : user.role === 'admin'
                          ? 'Admin'
                          : language === 'fr'
                          ? 'Client'
                          : 'Client'}
                      </span>
                    </div>
                  </div>
                </div>

                <nav className="p-4">
                  <ul className="space-y-2">
                    {[
                      { key: 'profile', icon: <User className="mr-3 h-5 w-5" />, fr: 'Mon profil', en: 'My profile' },
                      { key: 'settings', icon: <Settings className="mr-3 h-5 w-5" />, fr: 'Paramètres', en: 'Settings' },
                      { key: 'calls', icon: <Phone className="mr-3 h-5 w-5" />, fr: 'Mes appels', en: 'My calls' },
                      { key: 'invoices', icon: <FileText className="mr-3 h-5 w-5" />, fr: 'Mes factures', en: 'My invoices' },
                      { key: 'reviews', icon: <Star className="mr-3 h-5 w-5" />, fr: 'Mes avis', en: 'My reviews' },
                      { key: 'notifications', icon: <Bell className="mr-3 h-5 w-5" />, fr: 'Notifications', en: 'Notifications' },
                      { key: 'messages', icon: <MessageSquare className="mr-3 h-5 w-5" />, fr: 'Mes messages', en: 'My messages' },
                      { key: 'favorites', icon: <Bookmark className="mr-3 h-5 w-5" />, fr: 'Mes favoris', en: 'My favorites' }
                    ].map((item) => (
                      <li key={item.key}>
                        <button
                          onClick={() => setActiveTab(item.key as TabType)}
                          className={`group relative w-full flex items-center px-4 py-2 text-sm font-medium ${UI.radiusSm} transition-all
                            ${activeTab === (item.key as TabType)
                              ? 'bg-gradient-to-r from-red-50 to-orange-50 text-red-700 dark:from-white/5 dark:to-white/10 dark:text-white'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'}
                          `}
                          title={language === 'fr' ? item.fr : item.en}
                        >
                          {/* Barre active à gauche (UI only) */}
                          <span
                            className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 ${
                              activeTab === item.key
                                ? 'bg-gradient-to-b from-red-500 to-orange-500 dark:from-red-500 dark:to-orange-500'
                                : 'bg-transparent'
                            } ${UI.radiusSm}`}
                          />
                          {item.icon}
                          {language === 'fr' ? item.fr : item.en}
                          {activeTab === (item.key as TabType) && (
                            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-white/10 dark:text-white">
                              Actif
                            </span>
                          )}
                        </button>
                      </li>
                    ))}

                    {user.role === 'admin' && (
                      <li>
                        <button
                          onClick={() => navigate('/admin/dashboard')}
                          className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <Shield className="mr-3 h-5 w-5" />
                          {language === 'fr' ? 'Administration' : 'Admin panel'}
                        </button>
                      </li>
                    )}

                    <li>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        <LogOut className="mr-3 h-5 w-5" />
                        {language === 'fr' ? 'Déconnexion' : 'Logout'}
                      </button>
                    </li>
                  </ul>
                </nav>

                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {language === 'fr' ? 'Statut de disponibilité' : 'Availability status'}
                  </h3>
                  {user && (user.role === 'lawyer' || user.role === 'expat') ? (
                    <AvailabilityToggle className="justify-center" />
                  ) : (
                    <p className={`${UI.textMuted} text-center`}>
                      {language === 'fr'
                        ? 'Statut disponible uniquement pour les prestataires'
                        : 'Status available only for providers'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* CONTENU PRINCIPAL */}
            <div className="lg:col-span-3 space-y-8">
              {/* PROFIL — lecture seule */}
              {activeTab === 'profile' && (
                <div className={`${softCard} overflow-hidden`}>
                  <div className={`px-6 py-4 ${headerGradient} flex justify-between items-center`}>
                    <h2 className="text-xl font-semibold">
                      {language === 'fr' ? 'Mon profil' : 'My profile'}
                    </h2>
                    <Button
                      onClick={() => setActiveTab('settings')}
                      variant="outline"
                      size="small"
                      className="bg-white text-gray-800 hover:bg-gray-50"
                    >
                      <Edit size={16} className="mr-2" />
                      {language === 'fr' ? 'Modifier' : 'Edit'}
                    </Button>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className={`${UI.sectionTitle} mb-4`}>
                          {language === 'fr' ? 'Informations personnelles' : 'Personal information'}
                        </h3>
                        <div className="space-y-4">
                          <InfoRow
                            label={language === 'fr' ? 'Nom complet' : 'Full name'}
                            value={`${user.firstName} ${user.lastName}`}
                          />
                          <InfoRow label="Email" value={user.email} />
                          {(user as { phone?: string }).phone && (
                            <InfoRow
                              label={language === 'fr' ? 'Téléphone' : 'Phone'}
                              value={`${(user as { phoneCountryCode?: string }).phoneCountryCode || '+33'} ${(user as { phone?: string }).phone}`}
                            />
                          )}
                          {user.role !== 'client' && (
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {language === 'fr' ? 'Statut' : 'Status'}
                              </p>
                              <div className="mt-1 flex items-center">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    currentStatus
                                      ? 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300'
                                      : 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300'
                                  }`}
                                >
                                  <span
                                    className={`w-2 h-2 mr-2 rounded-full ${
                                      currentStatus ? 'bg-green-600' : 'bg-red-600'
                                    }`}
                                  />
                                  {currentStatus
                                    ? language === 'fr'
                                      ? 'En ligne'
                                      : 'Online'
                                    : language === 'fr'
                                    ? 'Hors ligne'
                                    : 'Offline'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className={`${UI.sectionTitle} mb-4`}>
                          {language === 'fr' ? 'Photo & bio' : 'Photo & bio'}
                        </h3>
                        <div className="flex items-start gap-6">
                          {user.profilePhoto ? (
                            <img
                              src={`${user.profilePhoto}?v=${(user.updatedAt as Date | undefined)?.valueOf?.() || Date.now()}`}
                              alt={user.firstName}
                              className="w-32 h-32 rounded-full object-cover border border-white/30 dark:border-white/10"
                            />
                          ) : (
                            <div className="w-32 h-32 bg-red-100 dark:bg-white/10 rounded-full flex items-center justify-center">
                              <User className="h-16 w-16 text-red-600 dark:text-white/70" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className={`${UI.text} whitespace-pre-wrap`}>
                              {(user as { bio?: string }).bio ||
                                (language === 'fr' ? 'Aucune description.' : 'No description.')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {user.role !== 'client' && (
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
                        <h3 className={`${UI.sectionTitle} mb-4`}>
                          {language === 'fr' ? 'Informations professionnelles' : 'Professional information'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {user.role === 'lawyer' && (
                            <>
                              <InfoRow
                                label={language === 'fr' ? "Années d'expérience" : 'Years of experience'}
                                value={`${(user as { yearsOfExperience?: number }).yearsOfExperience ?? 0} ${
                                  language === 'fr' ? 'ans' : 'years'
                                }`}
                              />
                              <PillsRow
                                label={language === 'fr' ? 'Spécialités' : 'Specialties'}
                                items={(user as { specialties?: string[] }).specialties || []}
                                color="blue"
                              />
                              <PillsRow
                                label={language === 'fr' ? "Pays d'intervention" : 'Countries of practice'}
                                items={(user as { practiceCountries?: string[] }).practiceCountries || []}
                                color="blue"
                              />
                              <InfoRow
                                label={language === 'fr' ? 'Année de diplôme' : 'Graduation year'}
                                value={`${(user as { graduationYear?: number }).graduationYear || ''}`}
                              />
                            </>
                          )}
                          {user.role === 'expat' && (
                            <>
                              <InfoRow
                                label={language === 'fr' ? 'Pays de résidence' : 'Country of residence'}
                                value={(user as { residenceCountry?: string }).residenceCountry || ''}
                              />
                              <InfoRow
                                label={language === 'fr' ? "Années d'expatriation" : 'Years as expat'}
                                value={`${(user as { yearsAsExpat?: number }).yearsAsExpat ?? 0} ${
                                  language === 'fr' ? 'ans' : 'years'
                                }`}
                              />
                              <PillsRow
                                label={language === 'fr' ? "Types d'aide" : 'Help types'}
                                items={(user as { helpTypes?: string[] }).helpTypes || []}
                                color="green"
                              />
                              <PillsRow
                                label={language === 'fr' ? "Pays d'intervention" : 'Countries of intervention'}
                                items={(user as { interventionCountries?: string[] }).interventionCountries || []}
                                color="green"
                              />
                            </>
                          )}
                          <PillsRow
                            label={language === 'fr' ? 'Langues parlées' : 'Languages spoken'}
                            items={(user as { languages?: string[] }).languages || []}
                            color="red"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PARAMÈTRES — édition complète */}
              {activeTab === 'settings' && (
                <div className={`${softCard} overflow-hidden`}>
                  <div className={`px-6 py-4 ${headerGradient}`}>
                    <h2 className="text-xl font-semibold">
                      {language === 'fr' ? 'Paramètres' : 'Settings'}
                    </h2>
                  </div>

                  <div className="p-6 space-y-6">
                    {successMessage && <Alert type="success" message={successMessage} />}
                    {errorMessage && <Alert type="error" message={errorMessage} />}

                    {/* Photo de profil : mise à jour immédiate */}
                    <section>
                      <h3 className={`${UI.sectionTitle} mb-2`}>
                        {language === 'fr' ? 'Photo de profil' : 'Profile photo'}
                      </h3>
                      <div className="flex items-center gap-6">
                        {profileData.profilePhoto ? (
                          <img
                            src={`${profileData.profilePhoto}?v=${Date.now()}`}
                            alt="preview"
                            className="w-24 h-24 rounded-full object-cover border border-white/30 dark:border-white/10"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-red-100 dark:bg-white/10 rounded-full flex items-center justify-center">
                            <User className="h-10 w-10 text-red-600 dark:text-white/70" />
                          </div>
                        )}
                        <ImageUploader
                          currentImage={profileData.profilePhoto}
                          uploadPath={`profilePhotos/${user.id}`}
                          locale={language === 'fr' ? 'fr' : 'en'}
                          onImageUploaded={handleInstantPhotoPersist}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {language === 'fr'
                          ? 'La nouvelle photo remplace immédiatement l’ancienne dans tout le dashboard.'
                          : 'The new photo replaces the old one immediately across the dashboard.'}
                      </p>
                    </section>

                    {/* Commun à tous les rôles */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field
                        label="Email"
                        value={profileData.email}
                        onChange={(v) => setProfileData((p) => ({ ...p, email: v }))}
                        type="email"
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {language === 'fr' ? 'Téléphone' : 'Phone'}
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={profileData.phoneCountryCode}
                            onChange={(e) =>
                              setProfileData((p) => ({ ...p, phoneCountryCode: e.target.value }))
                            }
                            className="w-28 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="+33">🇫🇷 +33</option>
                            <option value="+1">🇺🇸 +1</option>
                            <option value="+44">🇬🇧 +44</option>
                            <option value="+49">🇩🇪 +49</option>
                            <option value="+34">🇪🇸 +34</option>
                            <option value="+39">🇮🇹 +39</option>
                          </select>
                          <input
                            value={profileData.phone}
                            onChange={(e) => setProfileData((p) => ({ ...p, phone: e.target.value }))}
                            className="flex-1 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="612345678"
                          />
                        </div>
                      </div>

                      <Field
                        label={language === 'fr' ? 'Pays de résidence' : 'Country of residence'}
                        value={profileData.residenceCountry || profileData.currentCountry}
                        onChange={(v) =>
                          setProfileData((p) => ({
                            ...p,
                            residenceCountry: v,
                            currentCountry: p.currentCountry || v
                          }))
                        }
                      />

                      <Field
                        label={
                          language === 'fr'
                            ? 'Pays où vous êtes actuellement'
                            : 'Current presence country'
                        }
                        value={profileData.currentPresenceCountry || ''}
                        onChange={(v) =>
                          setProfileData((p) => ({
                            ...p,
                            currentPresenceCountry: v
                          }))
                        }
                      />

                      {/* WhatsApp */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          WhatsApp
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={profileData.whatsappCountryCode || '+33'}
                            onChange={(e) =>
                              setProfileData((p) => ({ ...p, whatsappCountryCode: e.target.value }))
                            }
                            className="w-28 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="+33">🇫🇷 +33</option>
                            <option value="+1">🇺🇸 +1</option>
                            <option value="+44">🇬🇧 +44</option>
                            <option value="+49">🇩🇪 +49</option>
                            <option value="+34">🇪🇸 +34</option>
                            <option value="+39">🇮🇹 +39</option>
                          </select>
                          <input
                            value={profileData.whatsappNumber || ''}
                            onChange={(e) =>
                              setProfileData((p) => ({ ...p, whatsappNumber: e.target.value }))
                            }
                            className="flex-1 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="612345678"
                          />
                        </div>
                      </div>

                      {/* Langues — même sélecteur que l’inscription */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {language === 'fr' ? 'Langues parlées' : 'Languages spoken'}
                        </label>
                        <MultiLanguageSelect
                          value={selectedLanguages}
                          onChange={(opts) => {
                            const normalized = (opts || []).map((o) => ({ value: o.value, label: o.label }));
                            setSelectedLanguages(normalized);
                            setProfileData((p) => ({ ...p, languages: normalized.map((o) => o.value) }));
                          }}
                          providerLanguages={[]}
                          highlightShared
                          locale={language === 'fr' ? 'fr' : 'en'}
                          placeholder={
                            language === 'fr'
                              ? 'Rechercher et sélectionner les langues...'
                              : 'Search and select languages...'
                          }
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {language === 'fr' ? 'Description / Bio' : 'Description / Bio'}
                        </label>
                        <textarea
                          value={profileData.bio || ''}
                          onChange={(e) => setProfileData((p) => ({ ...p, bio: e.target.value }))}
                          rows={5}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder={
                            language === 'fr' ? 'Votre bio professionnelle…' : 'Your professional bio…'
                          }
                        />
                      </div>
                    </section>

                    {/* Rôle : Lawyer */}
                    {user.role === 'lawyer' && (
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field
                          label={language === 'fr' ? "Années d'expérience" : 'Years of experience'}
                          type="number"
                          value={String(profileData.yearsOfExperience ?? 0)}
                          onChange={(v) =>
                            setProfileData((p) => ({ ...p, yearsOfExperience: Number(v || 0) }))
                          }
                        />
                        <Field
                          label={language === 'fr' ? 'Année de diplôme' : 'Graduation year'}
                          type="number"
                          value={String(profileData.graduationYear || new Date().getFullYear() - 5)}
                          onChange={(v) =>
                            setProfileData((p) => ({
                              ...p,
                              graduationYear: Number(v || new Date().getFullYear() - 5)
                            }))
                          }
                        />
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {language === 'fr' ? 'Spécialités' : 'Specialties'}
                          </label>
                          <ChipInput
                            value={profileData.specialties || []}
                            onChange={(next) => setProfileData((p) => ({ ...p, specialties: next }))}
                            placeholder={language === 'fr' ? 'Ajoutez une spécialité' : 'Add a specialty'}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {language === 'fr' ? "Pays d'intervention" : 'Countries of practice'}
                          </label>
                          <ChipInput
                            value={profileData.practiceCountries || []}
                            onChange={(next) =>
                              setProfileData((p) => ({ ...p, practiceCountries: next }))
                            }
                            placeholder={language === 'fr' ? 'Ajoutez un pays' : 'Add a country'}
                          />
                        </div>
                        <Field
                          label={
                            language === 'fr' ? 'Numéro au barreau (optionnel)' : 'Bar number (optional)'
                          }
                          value={profileData.barNumber || ''}
                          onChange={(v) => setProfileData((p) => ({ ...p, barNumber: v }))}
                        />
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {language === 'fr' ? 'Formations' : 'Educations'}
                          </label>
                          <ChipInput
                            value={profileData.educations || []}
                            onChange={(next) => setProfileData((p) => ({ ...p, educations: next }))}
                            placeholder={language === 'fr' ? 'Ajoutez une formation' : 'Add an education'}
                          />
                        </div>
                      </section>
                    )}

                    {/* Rôle : Expat */}
                    {user.role === 'expat' && (
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field
                          label={language === 'fr' ? "Années d'expatriation" : 'Years as expat'}
                          type="number"
                          value={String(profileData.yearsAsExpat ?? 0)}
                          onChange={(v) =>
                            setProfileData((p) => ({ ...p, yearsAsExpat: Number(v || 0) }))
                          }
                        />
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {language === 'fr' ? "Types d'aide" : 'Help types'}
                          </label>
                          <ChipInput
                            value={profileData.helpTypes || []}
                            onChange={(next) => setProfileData((p) => ({ ...p, helpTypes: next }))}
                            placeholder={language === 'fr' ? 'Ajoutez un type' : 'Add a type'}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {language === 'fr' ? "Pays d'intervention" : 'Countries of intervention'}
                          </label>
                          <ChipInput
                            value={profileData.interventionCountries || []}
                            onChange={(next) =>
                              setProfileData((p) => ({ ...p, interventionCountries: next }))
                            }
                            placeholder={language === 'fr' ? 'Ajoutez un pays' : 'Add a country'}
                          />
                        </div>
                      </section>
                    )}

                    {/* Sauvegarde */}
                    <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                      <Button
                        onClick={saveSettings}
                        loading={isLoading}
                        fullWidth
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {language === 'fr' ? 'Enregistrer les paramètres' : 'Save settings'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* APPELS */}
              {activeTab === 'calls' && (
                <div className={`${softCard} overflow-hidden`}>
                  <div className={`px-6 py-4 ${headerGradient}`}>
                    <h2 className="text-xl font-semibold">
                      {language === 'fr' ? 'Mes appels' : 'My calls'}
                    </h2>
                  </div>
                  <div className="p-6">
                    {calls.length > 0 ? (
                      <div className="space-y-4">
                        {calls.map((call) => (
                          <div
                            key={call.id}
                            className="border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:bg-gray-50/60 dark:hover:bg-white/[0.04] transition"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">{call.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{call.description}</p>
                                <div className="mt-2 flex items-center space-x-4 text-sm">
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 text-gray-400 mr-1" />
                                    <span className={UI.text}>{formatDuration(call.duration)}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <CreditCard className="w-4 h-4 text-gray-400 mr-1" />
                                    <span className={UI.text}>{formatPrice(call.price)}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                                    <span className={UI.text}>{formatDate(call.createdAt)}</span>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <p className={`${UI.text} text-sm`}>
                                    {user.role === 'client'
                                      ? `${language === 'fr' ? 'Prestataire' : 'Provider'}: ${call.providerName}`
                                      : `${language === 'fr' ? 'Client' : 'Client'}: ${call.clientName}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-2">
                                {getStatusBadge(call.status)}
                                {call.status === 'completed' &&
                                  user.role === 'client' &&
                                  !call.clientRating && (
                                    <Button size="small" variant="outline">
                                      {language === 'fr' ? 'Laisser un avis' : 'Leave a review'}
                                    </Button>
                                  )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`${UI.textMuted} text-center py-8`}>
                        {language === 'fr'
                          ? "Vous n'avez pas encore effectué d'appels."
                          : "You haven't made any calls yet."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* MESSAGES */}
              {activeTab === 'messages' && (
                <div className={`${softCard} overflow-hidden`}>
                  <div className={`px-6 py-4 ${headerGradient}`}>
                    <h2 className="text-xl font-semibold">
                      {language === 'fr' ? 'Mes messages' : 'My messages'}
                    </h2>
                  </div>
                  <div className="p-6">
                    <DashboardMessages />
                  </div>
                </div>
              )}

              {/* FACTURES */}
              {activeTab === 'invoices' && <UserInvoices />}

              {/* AVIS */}
              {activeTab === 'reviews' && (
                <div className={`${softCard} overflow-hidden`}>
                  <div className={`px-6 py-4 ${headerGradient}`}>
                    <h2 className="text-xl font-semibold">
                      {language === 'fr' ? 'Mes avis' : 'My reviews'}
                    </h2>
                  </div>
                  <div className="p-6">
                    <p className={`${UI.textMuted} text-center py-8`}>
                      {language === 'fr' ? 'Aucun avis pour le moment.' : 'No reviews yet.'}
                    </p>
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <div className={`${softCard} overflow-hidden`}>
                  <div className={`px-6 py-4 ${headerGradient}`}>
                    <h2 className="text-xl font-semibold">
                      {language === 'fr' ? 'Notifications' : 'Notifications'}
                    </h2>
                  </div>
                  <div className="p-6">
                    {(user?.role === 'lawyer' || user?.role === 'expat') && (
                      <div className="mb-8">
                        <h3 className={`${UI.sectionTitle} mb-4`}>
                          {language === 'fr' ? 'Préférences de notifications' : 'Notification preferences'}
                        </h3>
                        <NotificationSettings />
                      </div>
                    )}

                    <div>
                      <h3 className={`${UI.sectionTitle} mb-4`}>
                        {language === 'fr' ? 'Historique des notifications' : 'Notification history'}
                      </h3>
                      {notifications.length > 0 ? (
                        <div className="space-y-4">
                          {notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`p-4 rounded-lg border ${
                                n.isRead
                                  ? 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10'
                                  : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
                              }`}
                            >
                              <div className="flex justify-between">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">{n.title}</h4>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(n.createdAt)}</span>
                              </div>
                              <p className="mt-1 text-gray-600 dark:text-gray-300">{n.message}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={`${UI.textMuted} text-center py-8`}>
                          {language === 'fr'
                            ? "Vous n'avez pas de notifications."
                            : "You don't have any notifications."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* FAVORIS */}
              {activeTab === 'favorites' && (
                <div className={`${softCard} overflow-hidden`}>
                  <div className={`px-6 py-4 ${headerGradient}`}>
                    <h2 className="text-xl font-semibold">
                      {language === 'fr' ? 'Mes favoris' : 'My favorites'}
                    </h2>
                  </div>
                  <div className="p-6">
                    {favorites.length > 0 ? (
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {favorites.map((f) => (
                          <li
                            key={f.id}
                            className="border border-gray-200 dark:border-white/10 rounded-lg p-4 flex items-center gap-3 hover:bg-gray-50/60 dark:hover:bg-white/[0.04] transition"
                          >
                            <img
                              src={(f.photo || '/default-avatar.png') + `?v=${Date.now()}`}
                              alt={f.name}
                              className="w-12 h-12 rounded-full object-cover border border-white/30 dark:border-white/10"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-gray-100">{f.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {f.type === 'lawyer'
                                  ? language === 'fr'
                                    ? 'Avocat'
                                    : 'Lawyer'
                                  : language === 'fr'
                                  ? 'Expatrié'
                                  : 'Expat'}
                                {f.country ? ` • ${f.country}` : ''}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={`${UI.textMuted} text-center py-12`}>
                        {language === 'fr' ? 'Aucun favori pour le moment.' : 'No favorites yet.'}
                      </p>
                    )}
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
