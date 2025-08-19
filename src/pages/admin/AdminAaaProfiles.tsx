import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Scale,
  Flag,
  Check,
  AlertCircle,
  Loader,
  RefreshCw,
  Save,
  AlertTriangle,
  Edit,
  Eye,
  Trash,
  EyeOff,
  Star,
  Search,
  List,
  Upload,
  Calendar,
  Settings
} from 'lucide-react';
import {
  collection,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../contexts/AuthContext';

// ---------- DATA IMPORTS (depuis ton zip) ----------
/**
 * IMPORTANT:
 * - countries: tes pays => dans ta capture l'export s’appelle "countriesData"
 * - languages: dans ton zip "languages-spoken" exporte par défaut => on importe le default
 * - specialties: on passe par un index pour éviter les erreurs de chemin
 *   crée (si pas déjà) src/components/forms-data/index.ts qui ré-exporte les constantes
 */
import { countriesData } from '../../data/countries';
import LANGUAGE_OPTIONS from '../../data/languages-spoken';
// crée / vérifie cet index : export { default as LAWYER_SPECIALTIES } from './lawyer-specialties'; export { default as EXPAT_HELP_TYPES } from './expat-help-types';
import { LAWYER_SPECIALTIES, EXPAT_HELP_TYPES } from '../../components/forms-data';

// ---------- PHOTOS ----------
// Les photos sont alimentées depuis un fichier dédié (tu vas le créer juste après):
// src/data/profile-photos.ts  => export const PROFILE_PHOTOS: AaaPhoto[] = [...]
import { PROFILE_PHOTOS } from '../../data/profile-photos';

// ---------- TYPES ----------
type Role = 'lawyer' | 'expat';
type Gender = 'male' | 'female';

interface AaaProfile {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  type: Role;
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
  price?: number;
  duration?: number;
  slug?: string;
  role?: Role; // pour compat compat avec anciens champs
}

interface GenerationForm {
  count: number;
  roleDistribution: { lawyer: number; expat: number };
  genderDistribution: { male: number; female: number };
  countries: string[];
  languages: string[]; // options choisies (Français/Anglais plus probables)
  minExperience: number;
  maxExperience: number;
  minAge: number;
  maxAge: number;
  allowRealCalls: boolean;
  isTestProfile: boolean;
  customPhoneNumber: string;
  useCustomPhone: boolean;
}

// Photo catalogue item (dans src/data/profile-photos.ts)
export interface AaaPhoto {
  url: string;
  role: Role;          // 'lawyer' | 'expat'
  gender: Gender;      // 'male' | 'female'
  countries?: string[]; // optionnel: liste de pays compatibles
  weight?: number;     // optionnel: pondération (par défaut 1)
}

// ---------- UTILS ----------
const slugify = (input: string): string =>
  input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// 95% des cas: [4.0, 5.0], 5% des cas: [3.0, 3.9]
const randomRating = (): number => {
  const r = Math.random();
  if (r < 0.95) return parseFloat((4 + Math.random()).toFixed(2));
  return parseFloat((3 + Math.random() * 0.9).toFixed(2));
};

// 5..30 avis
const randomReviewCount = (): number => randomInt(5, 30);

// Chance plus forte pour FR/EN quand disponibles dans LANGUAGE_OPTIONS
const pickLanguages = (selected: string[]): string[] => {
  const pool = [...selected];
  const result = new Set<string>();

  // On pousse Français + Anglais si présents dans les options
  const pushIf = (lang: string) => {
    const found = pool.find(
      (l) => l.toLowerCase() === lang.toLowerCase()
    );
    if (found) result.add(found);
  };

  pushIf('Français');
  pushIf('Anglais');

  const maxExtra = Math.min(3, pool.length);
  const addCount = randomInt(0, maxExtra);
  for (let i = 0; i < addCount; i++) {
    const cand = pool[randomInt(0, pool.length - 1)];
    result.add(cand);
  }
  return Array.from(result);
};

const namesFR = {
  male: ['Jean','Pierre','Michel','Philippe','Thomas','Nicolas','François','Laurent','Éric','David','Stéphane','Olivier','Christophe','Frédéric','Patrick','Antoine','Julien','Alexandre','Sébastien','Vincent','Maxime','Romain','Florian','Guillaume','Kévin'],
  female: ['Marie','Sophie','Catherine','Isabelle','Anne','Nathalie','Sylvie','Céline','Julie','Valérie','Christine','Sandrine','Caroline','Stéphanie','Émilie','Aurélie','Camille','Laure','Virginie','Delphine','Manon','Clara','Léa','Emma','Chloé'],
};
const lastNamesFR = ['Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau','Simon','Laurent','Lefebvre','Michel','Garcia','David','Bertrand','Roux','Vincent','Fournier','Morel','Girard','André','Lefevre','Mercier','Dupont','Lambert','Bonnet','François','Martinez'];

const genName = (gender: Gender) => {
  const f = namesFR[gender][randomInt(0, namesFR[gender].length - 1)];
  const l = lastNamesFR[randomInt(0, lastNamesFR.length - 1)];
  return { firstName: f, lastName: l, fullName: `${f} ${l}` };
};

const genEmail = (firstName: string, lastName: string) =>
  `${slugify(firstName)}.${slugify(lastName)}@example.com`;

// ---------- PHOTO LIBRARY (one-time use) ----------
/**
 * On garde une collection Firestore "assets_profile_photos".
 * Chaque doc: { url, role, gender, countries:[], weight, inUse, usedBy, usedAt }
 *
 * - Au 1er lancement, tu peux "seeder" à partir du fichier src/data/profile-photos.ts
 *   en cliquant sur "Importer les photos (catalogue)" ci-dessous.
 * - Lors de la génération d’un profil, on "claim" une photo compatible via Transaction.
 */
const ASSETS_COLL = 'assets_profile_photos';

interface PhotoDoc {
  url: string;
  role: Role;
  gender: Gender;
  countries?: string[];
  weight?: number;
  inUse: boolean;
  usedBy?: string;
  usedAt?: any;
}

async function seedPhotoLibraryFromCatalog(): Promise<number> {
  const collRef = collection(db, ASSETS_COLL);
  const snap = await getDocs(collRef);
  if (!snap.empty) return 0; // déjà seedé

  // on insère tous les éléments du catalogue
  let inserted = 0;
  for (const p of PROFILE_PHOTOS) {
    await addDoc(collRef, {
      url: p.url,
      role: p.role,
      gender: p.gender,
      countries: p.countries || [],
      weight: p.weight || 1,
      inUse: false,
      usedBy: null,
      usedAt: null,
      createdAt: serverTimestamp(),
    });
    inserted++;
  }
  return inserted;
}

async function claimPhoto(role: Role, gender: Gender, country: string): Promise<string> {
  // On prend une photo non utilisée, compatible role/gender/pays
  // puis on la lock via transaction
  const collRef = collection(db, ASSETS_COLL);
  const q1 = query(collRef, where('role', '==', role), where('gender', '==', gender), where('inUse', '==', false));
  const snap = await getDocs(q1);

  const candidates: { id: string; data: PhotoDoc }[] = [];
  snap.forEach((d) => {
    const data = d.data() as PhotoDoc;
    if (!data.countries || data.countries.length === 0 || data.countries.includes(country)) {
      candidates.push({ id: d.id, data });
    }
  });

  if (candidates.length === 0) {
    // aucun match strict => on retente sans filtrer le pays
    const q2 = query(collRef, where('role', '==', role), where('gender', '==', gender), where('inUse', '==', false));
    const snap2 = await getDocs(q2);
    const all: { id: string; data: PhotoDoc }[] = [];
    snap2.forEach((d) => all.push({ id: d.id, data: d.data() as PhotoDoc }));
    if (all.length === 0) throw new Error('Aucune photo disponible: ajoute des images dans la bibliothèque.');
    // on prend au hasard
    const picked = all[randomInt(0, all.length - 1)];
    await runTransaction(db, async (tx) => {
      const refDoc = doc(db, ASSETS_COLL, picked.id);
      tx.update(refDoc, { inUse: true, usedAt: serverTimestamp() });
    });
    return picked.data.url;
  }

  // pondération par weight (si définie)
  const weighted: { id: string; data: PhotoDoc }[] = [];
  for (const c of candidates) {
    const w = Math.max(1, c.data.weight || 1);
    for (let i = 0; i < w; i++) weighted.push(c);
  }
  const chosen = weighted[randomInt(0, weighted.length - 1)];

  await runTransaction(db, async (tx) => {
    const refDoc = doc(db, ASSETS_COLL, chosen.id);
    tx.update(refDoc, { inUse: true, usedAt: serverTimestamp() });
  });
  return chosen.data.url;
}

// ---------- UI COMPONENT ----------
const AdminAaaProfiles: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'generate' | 'manage' | 'photos' | 'planner'>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [existingProfiles, setExistingProfiles] = useState<AaaProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<AaaProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newProfilePhoto, setNewProfilePhoto] = useState<string>('');
  const [editFormData, setEditFormData] = useState<Partial<AaaProfile>>({});

  const [formData, setFormData] = useState<GenerationForm>({
    count: 10,
    roleDistribution: { lawyer: 50, expat: 50 },
    genderDistribution: { male: 50, female: 50 },
    countries: ['Canada', 'Thaïlande', 'Australie', 'Espagne', 'Allemagne'],
    languages: ['Français', 'Anglais'],
    minExperience: 2,
    maxExperience: 15,
    minAge: 28,
    maxAge: 65,
    allowRealCalls: false,
    isTestProfile: true,
    customPhoneNumber: '+33743331201',
    useCustomPhone: true,
  });

  // Planner (génération programmée côté UI)
  const [planner, setPlanner] = useState({
    enabled: false,
    dailyCount: 20,
    regionCountries: ['Thaïlande', 'Vietnam', 'Cambodge'],
    role: 'expat' as Role,
    genderBias: { male: 50, female: 50 },
    languages: ['Français', 'Anglais'],
  });

  // Guard
  useEffect(() => {
    if (!currentUser || (currentUser as any).role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    if (activeTab === 'manage') loadExistingProfiles().catch(() => {});
  }, [currentUser, navigate, activeTab]);

  // --------- LOAD EXISTING ----------
  const loadExistingProfiles = async () => {
    try {
      setIsLoadingProfiles(true);
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const all = snapshot.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        } as AaaProfile;
      });

      const profiles = all
        .filter((p) => p.isTestProfile === true)
        .sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));

      setExistingProfiles(profiles);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  // --------- HANDLERS ----------
  const handleCountryToggle = (country: string) => {
    setFormData((prev) => ({
      ...prev,
      countries: prev.countries.includes(country)
        ? prev.countries.filter((c) => c !== country)
        : [...prev.countries, country],
    }));
  };

  const handleLanguageToggle = (language: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter((l) => l !== language)
        : [...prev.languages, language],
    }));
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

  const filteredProfiles = useMemo(
    () =>
      existingProfiles.filter(
        (p) =>
          p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.country?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [existingProfiles, searchTerm]
  );

  // --------- GENERATION CORE ----------
  const generateAaaProfiles = async () => {
    try {
      setIsGenerating(true);
      setGeneratedCount(0);
      setSuccess(null);
      setError(null);

      const {
        count,
        roleDistribution,
        genderDistribution,
        countries,
        languages,
        minExperience,
        maxExperience,
        customPhoneNumber,
        useCustomPhone,
      } = formData;

      if (count <= 0) return setError('Le nombre de profils doit être supérieur à 0');
      if (countries.length === 0) return setError('Veuillez sélectionner au moins un pays');
      if (languages.length === 0) return setError('Veuillez sélectionner au moins une langue');

      const lawyerCount = Math.round((roleDistribution.lawyer / 100) * count);
      const expatCount = count - lawyerCount;
      const maleCount = Math.round((genderDistribution.male / 100) * count);
      const femaleCount = count - maleCount;

      let malesGenerated = 0;
      let lawyersGenerated = 0;

      for (let i = 0; i < count; i++) {
        const gender: Gender = malesGenerated < maleCount ? 'male' : 'female';
        if (gender === 'male') malesGenerated++;

        const role: Role = lawyersGenerated < lawyerCount ? 'lawyer' : 'expat';
        if (role === 'lawyer') lawyersGenerated++;

        await generateOne(role, gender, countries, languages, minExperience, maxExperience, customPhoneNumber, useCustomPhone);
        setGeneratedCount((n) => n + 1);
      }

      setSuccess(`${count} profils créés avec succès (${lawyerCount} avocats, ${expatCount} expatriés).`);
      if (activeTab === 'manage') loadExistingProfiles();
    } catch (e: any) {
      console.error(e);
      setError(`Erreur de génération: ${e.message || 'inconnue'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateOne = async (
    role: Role,
    gender: Gender,
    countries: string[],
    languages: string[],
    minExperience: number,
    maxExperience: number,
    customPhoneNumber: string,
    useCustomPhone: boolean
  ): Promise<string> => {
    const { firstName, lastName, fullName } = genName(gender);
    const email = genEmail(firstName, lastName);
    const country = countries[randomInt(0, countries.length - 1)];
    const experience = randomInt(minExperience, maxExperience);
    const phone = useCustomPhone ? customPhoneNumber : '+33743331201';
    const selectedLanguages = pickLanguages(languages);

    // Photo unique (depuis la bibliothèque Firestore)
    const profilePhoto = await claimPhoto(role, gender, country);

    const rating = randomRating();
    const reviewCount = randomReviewCount();

    const uid = `aaa_${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const slug = `${slugify(firstName)}-${slugify(lastName)}-${uid.slice(-6)}`;
    const hourlyRate = role === 'lawyer' ? 49 : 19;

    // base user
    const baseUser: any = {
      uid,
      firstName,
      lastName,
      fullName,
      email,
      phone,
      phoneCountryCode: '+33',
      country,
      currentCountry: country,
      preferredLanguage: 'fr',
      languages: selectedLanguages,
      profilePhoto,
      avatar: profilePhoto,
      isTestProfile: true,
      isActive: true,
      isApproved: true,
      isVerified: true,
      isOnline: false,
      isVisible: true,
      isVisibleOnMap: true,
      isCallable: formData.allowRealCalls,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      role,
      isSOS: true,
      points: 0,
      affiliateCode: `AAA${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      referralBy: null,
      bio: '',
      hourlyRate,
      responseTime: '< 5 minutes',
      availability: 'available',
      totalCalls: randomInt(0, 50),
      totalEarnings: 0,
      averageRating: rating,
      rating,
      reviewCount,
      mapLocation: {
        lat: 20 + Math.random() * 40,
        lng: -30 + Math.random() * 60,
      },
    };

    // role-specific
    if (role === 'lawyer') {
      const specialties: string[] = [];
      const count = randomInt(2, 4);
      while (specialties.length < count) {
        const s = LAWYER_SPECIALTIES[randomInt(0, LAWYER_SPECIALTIES.length - 1)];
        if (!specialties.includes(s)) specialties.push(s);
      }
      const bio = `Avocat${gender === 'female' ? 'e' : ''} en ${country} spécialisé${gender === 'female' ? 'e' : ''} en ${specialties.join(', ')} (${experience} ans). J’accompagne les expatriés francophones.`;

      Object.assign(baseUser, {
        bio,
        specialties,
        practiceCountries: [country],
        yearsOfExperience: experience,
        barNumber: `BAR${randomInt(10000, 99999)}`,
        lawSchool: `Université de ${country}`,
        graduationYear: new Date().getFullYear() - experience - 5,
        certifications: ['Certification Barreau'],
        needsVerification: false,
        verificationStatus: 'approved',
      });
    } else {
      const help: string[] = [];
      const count = randomInt(2, 4);
      while (help.length < count) {
        const s = EXPAT_HELP_TYPES[randomInt(0, EXPAT_HELP_TYPES.length - 1)];
        if (!help.includes(s)) help.push(s);
      }
      const bio = `Expatrié${gender === 'female' ? 'e' : ''} en ${country} depuis ${experience} ans. Aide sur ${help.join(', ')}.`;

      Object.assign(baseUser, {
        bio,
        helpTypes: help,
        specialties: help,
        residenceCountry: country,
        yearsAsExpat: experience,
        yearsOfExperience: experience,
        previousCountries: [],
        motivation: `Faciliter l’installation en ${country}`,
        needsVerification: false,
        verificationStatus: 'approved',
      });
    }

    // write user
    await setDoc(doc(db, 'users', uid), baseUser);

    // provider profile (public)
    const providerProfile = {
      ...baseUser,
      uid,
      type: role,
      fullName,
      slug,
      createdByAdmin: true,
      profileCompleted: true,
    };
    await setDoc(doc(db, 'sos_profiles', uid), providerProfile);

    // UI cards (carousel + card) – champs simples et dérivés
    const card = {
      id: uid,
      uid,
      title: fullName,
      subtitle: role === 'lawyer' ? 'Avocat' : 'Expatrié',
      country,
      photo: profilePhoto,
      rating,
      reviewCount,
      languages: selectedLanguages,
      specialties: providerProfile.specialties || [],
      href: `/${role === 'lawyer' ? 'avocat' : 'expatrie'}/${slugify(country)}/${slugify(selectedLanguages[0] || 'francais')}/${slug}`,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'ui_profile_cards', uid), card);
    await setDoc(doc(db, 'ui_profile_carousel', uid), card);

    // reviews
    const reviewPhrases = [
      'Très pro et efficace.',
      'Conseils précieux, réponse rapide.',
      'Je recommande vivement.',
      'Service de qualité.',
      'Parfait pour résoudre mon problème.',
    ];
    const reviewsToCreate = reviewCount;
    for (let i = 0; i < reviewsToCreate; i++) {
      const r = randomRating(); // encore dans [3..5] avec faible proba de 3.x
      await addDoc(collection(db, 'reviews'), {
        providerId: uid,
        clientId: `aaa_client_${Date.now()}_${i}`,
        clientName: `Client ${i + 1}`,
        clientCountry: country,
        rating: r,
        comment: reviewPhrases[randomInt(0, reviewPhrases.length - 1)],
        isPublic: true,
        status: 'published',
        serviceType: role === 'lawyer' ? 'lawyer_call' : 'expat_call',
        createdAt: serverTimestamp(),
        helpfulVotes: randomInt(0, 10),
      });
    }

    return uid;
  };

  // --------- EDIT / DELETE / TOGGLES ----------
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
      yearsOfExperience: profile.yearsOfExperience,
    });
    setNewProfilePhoto(profile.profilePhoto);
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedProfile) return;
    try {
      setIsLoading(true);
      const updateData: any = {
        ...editFormData,
        fullName: `${editFormData.firstName} ${editFormData.lastName}`.trim(),
        profilePhoto: newProfilePhoto,
        avatar: newProfilePhoto,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, 'users', selectedProfile.id), updateData);
      await updateDoc(doc(db, 'sos_profiles', selectedProfile.id), updateData);
      setShowEditModal(false);
      setSelectedProfile(null);
      await loadExistingProfiles();
      alert('Profil mis à jour avec succès');
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la mise à jour du profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;
    try {
      setIsLoading(true);
      await deleteDoc(doc(db, 'sos_profiles', selectedProfile.id));
      await deleteDoc(doc(db, 'users', selectedProfile.id));
      setShowDeleteModal(false);
      setSelectedProfile(null);
      await loadExistingProfiles();
      alert('Profil supprimé');
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la suppression');
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
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'sos_profiles', profileId), {
        isVisible: newVisibility,
        isVisibleOnMap: newVisibility,
        updatedAt: serverTimestamp(),
      });
      await loadExistingProfiles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleOnline = async (profileId: string, currentOnline: boolean) => {
    const profile = existingProfiles.find((p) => p.id === profileId);
    if (!currentOnline && (!profile?.phone || profile.phone === '')) {
      alert('Téléphone requis pour mettre en ligne');
      return;
    }
    try {
      const newOnline = !currentOnline;
      await updateDoc(doc(db, 'users', profileId), {
        isOnline: newOnline,
        availability: newOnline ? 'available' : 'offline',
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'sos_profiles', profileId), {
        isOnline: newOnline,
        availability: newOnline ? 'available' : 'offline',
        updatedAt: serverTimestamp(),
      });
      await loadExistingProfiles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkToggleOnline = async (online: boolean) => {
    if (selectedProfiles.length === 0) {
      alert('Sélectionnez au moins un profil');
      return;
    }
    if (online) {
      const missing = selectedProfiles.filter((id) => {
        const p = existingProfiles.find((x) => x.id === id);
        return !p?.phone;
      });
      if (missing.length > 0) {
        alert(`${missing.length} profil(s) sans téléphone`);
        return;
      }
    }
    try {
      for (const id of selectedProfiles) {
        await updateDoc(doc(db, 'users', id), {
          isOnline: online,
          availability: online ? 'available' : 'offline',
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'sos_profiles', id), {
          isOnline: online,
          availability: online ? 'available' : 'offline',
          updatedAt: serverTimestamp(),
        });
      }
      await loadExistingProfiles();
      setSelectedProfiles([]);
      alert(`${selectedProfiles.length} profil(s) ${online ? 'en ligne' : 'hors ligne'}`);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la modification du statut');
    }
  };

  const handleSelectProfile = (id: string) => {
    setSelectedProfiles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const ids = filteredProfiles.map((p) => p.id);
    setSelectedProfiles((prev) => (prev.length === ids.length ? [] : ids));
  };

  // --------- PHOTOS: import ZIP/lot + rename SEO + push Storage + index Firestore ----------
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [photoMeta, setPhotoMeta] = useState<{ role: Role; gender: Gender; countries: string[] }>({
    role: 'lawyer',
    gender: 'male',
    countries: [],
  });

  const seoName = (fileName: string, role: Role, gender: Gender, countries: string[]) => {
    const base = fileName.replace(/\.[^.]+$/, ''); // sans extension
    const ext = fileName.split('.').pop() || 'jpg';
    const token = Math.random().toString(36).slice(2, 6);
    const region = countries.length ? countries.slice(0, 3).map(slugify).join('-') : 'global';
    return `${slugify(base)}-${role}-${gender}-${region}-${token}.${ext}`;
  };

  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingPhotos(true);
    try {
      let added = 0;
      for (const f of Array.from(files)) {
        // renommage SEO
        const newName = seoName(f.name, photoMeta.role, photoMeta.gender, photoMeta.countries);
        const storageRef = ref(storage, `profile-photos/${newName}`);
        await uploadBytes(storageRef, f, { cacheControl: 'public,max-age=31536000,immutable' });
        const url = await getDownloadURL(storageRef);

        await addDoc(collection(db, ASSETS_COLL), {
          url,
          role: photoMeta.role,
          gender: photoMeta.gender,
          countries: photoMeta.countries,
          weight: 1,
          inUse: false,
          usedBy: null,
          usedAt: null,
          createdAt: serverTimestamp(),
        });
        added++;
      }
      alert(`${added} photo(s) ajoutée(s) à la bibliothèque`);
    } catch (e) {
      console.error(e);
      alert('Erreur import photos');
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  // --------- RENDER ----------
  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Gestion des profils AAA</h1>
          <div className="flex gap-2">
            <Button onClick={() => setActiveTab('generate')} variant={activeTab === 'generate' ? 'default' : 'outline'}>
              <UserPlus className="mr-2" size={18} /> Générer
            </Button>
            <Button onClick={() => setActiveTab('manage')} variant={activeTab === 'manage' ? 'default' : 'outline'}>
              <List className="mr-2" size={18} /> Gérer ({existingProfiles.length})
            </Button>
            <Button onClick={() => setActiveTab('photos')} variant={activeTab === 'photos' ? 'default' : 'outline'}>
              <Upload className="mr-2" size={18} /> Photos
            </Button>
            <Button onClick={() => setActiveTab('planner')} variant={activeTab === 'planner' ? 'default' : 'outline'}>
              <Calendar className="mr-2" size={18} /> Planification
            </Button>
          </div>
        </div>

        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Paramètres de génération</h2>
                <div className="space-y-6">
                  {/* Count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de profils</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={formData.count}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((p) => ({ ...p, count: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  {/* Role & Gender sliders */}
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
                            min={0}
                            max={100}
                            step={5}
                            value={formData.roleDistribution.lawyer}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const v = Number(e.target.value);
                              setFormData((p) => ({ ...p, roleDistribution: { lawyer: v, expat: 100 - v } }));
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
                            min={0}
                            max={100}
                            step={5}
                            value={formData.roleDistribution.expat}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const v = Number(e.target.value);
                              setFormData((p) => ({ ...p, roleDistribution: { lawyer: 100 - v, expat: v } }));
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
                            min={0}
                            max={100}
                            step={5}
                            value={formData.genderDistribution.male}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const v = Number(e.target.value);
                              setFormData((p) => ({ ...p, genderDistribution: { male: v, female: 100 - v } }));
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
                            min={0}
                            max={100}
                            step={5}
                            value={formData.genderDistribution.female}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const v = Number(e.target.value);
                              setFormData((p) => ({ ...p, genderDistribution: { male: 100 - v, female: v } }));
                            }}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Countries */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Pays d'intervention ({formData.countries.length} sélectionnés)
                    </h3>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {countriesData.map((country: string) => (
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

                  {/* Languages */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Langues parlées ({formData.languages.length} sélectionnées)
                    </h3>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {(LANGUAGE_OPTIONS as string[]).map((l) => (
                          <label key={l} className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              checked={formData.languages.includes(l)}
                              onChange={() => handleLanguageToggle(l)}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mr-2"
                            />
                            {l}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <div className="flex items-center mb-3">
                      <input
                        id="useCustomPhone"
                        type="checkbox"
                        checked={formData.useCustomPhone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((p) => ({ ...p, useCustomPhone: e.target.checked }))
                        }
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor="useCustomPhone" className="ml-2 text-sm font-medium text-gray-700">
                        Utiliser un numéro de téléphone personnalisé
                      </label>
                    </div>
                    {formData.useCustomPhone && (
                      <>
                        <input
                          type="text"
                          placeholder="+33743331201"
                          value={formData.customPhoneNumber}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((p) => ({ ...p, customPhoneNumber: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Utilise une URL d'image haute qualité (&ge; 400×400)
                        </p>
                      </>
                    )}
                  </div>

                  {/* Experience / Age */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Expérience (années)</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Minimum</label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={formData.minExperience}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData((p) => ({ ...p, minExperience: Number(e.target.value) }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Maximum</label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={formData.maxExperience}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData((p) => ({ ...p, maxExperience: Number(e.target.value) }))
                            }
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
                            min={18}
                            max={80}
                            value={formData.minAge}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData((p) => ({ ...p, minAge: Number(e.target.value) }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Maximum</label>
                          <input
                            type="number"
                            min={18}
                            max={80}
                            value={formData.maxAge}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData((p) => ({ ...p, maxAge: Number(e.target.value) }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Allow Calls */}
                  <div className="flex items-center">
                    <input
                      id="allowRealCalls"
                      type="checkbox"
                      checked={formData.allowRealCalls}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((p) => ({ ...p, allowRealCalls: e.target.checked }))
                      }
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allowRealCalls" className="ml-2 block text-sm text-gray-700">
                      Autoriser les appels réels
                    </label>
                  </div>

                  {/* Action */}
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

            {/* Presets */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Préréglages rapides</h2>

                <div className="space-y-4">
                  <button
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        count: 20,
                        roleDistribution: { lawyer: 100, expat: 0 },
                        genderDistribution: { male: 0, female: 100 },
                        countries: ['Thaïlande'],
                        languages: ['Français', 'Anglais', 'Thaï'],
                      }))
                    }
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-3 px-4 rounded-lg border border-blue-200 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Scale className="w-5 h-5 mr-2" />
                      <span>20 avocates en Thaïlande</span>
                    </div>
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        count: 50,
                        roleDistribution: { lawyer: 0, expat: 100 },
                        genderDistribution: { male: 50, female: 50 },
                        countries: ['Thaïlande', 'Vietnam', 'Cambodge', 'Malaisie', 'Singapour', 'Indonésie'],
                        languages: ['Français', 'Anglais'],
                      }))
                    }
                    className="w-full bg-green-50 hover:bg-green-100 text-green-700 font-medium py-3 px-4 rounded-lg border border-green-200 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      <span>50 expatriés Asie du Sud-Est</span>
                    </div>
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        count: 40,
                        roleDistribution: { lawyer: 50, expat: 50 },
                        genderDistribution: { male: 50, female: 50 },
                        countries: ['Espagne', 'Portugal', 'Italie', 'Grèce'],
                        languages: ['Français', 'Anglais', 'Espagnol', 'Italien'],
                      }))
                    }
                    className="w-full bg-yellow-50 hover:bg-yellow-100 text-yellow-700 font-medium py-3 px-4 rounded-lg border border-yellow-200 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Flag className="w-5 h-5 mr-2" />
                      <span>40 profils Europe du Sud</span>
                    </div>
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Profils existants ({filteredProfiles.length})</h3>
              <div className="flex items-center space-x-4">
                {selectedProfiles.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Button onClick={() => handleBulkToggleOnline(true)} size="small" className="bg-green-600 hover:bg-green-700">
                      Mettre en ligne ({selectedProfiles.length})
                    </Button>
                    <Button onClick={() => handleBulkToggleOnline(false)} size="small" className="bg-gray-600 hover:bg-gray-700">
                      Mettre hors ligne ({selectedProfiles.length})
                    </Button>
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Rechercher un profil..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedProfiles.length === filteredProfiles.length && filteredProfiles.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profil</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pays</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Créé le</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoadingProfiles ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 text-center">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                          </div>
                          <p className="mt-2 text-gray-500">Chargement…</p>
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
                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                  (e.target as HTMLImageElement).src = '/default-avatar.png';
                                }}
                              />
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{profile.fullName}</div>
                                <div className="text-sm text-gray-500">{profile.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                (profile.type || profile.role) === 'lawyer'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {(profile.type || profile.role) === 'lawyer' ? 'Avocat' : 'Expatrié'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.country}</td>
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
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  profile.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {profile.isOnline ? 'En ligne' : 'Hors ligne'}
                              </span>
                              {!profile.isVisible && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Masqué</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {profile.createdAt ? formatDate(new Date(profile.createdAt)) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  const slug = (profile.slug ||
                                    `${slugify(profile.firstName)}-${slugify(profile.lastName)}-${profile.id.substring(0, 6)}`) as string;
                                  const countrySlug = slugify(profile.country || 'france');
                                  const roleSlug = (profile.type || profile.role) === 'lawyer' ? 'avocat' : 'expatrie';
                                  const mainLang = slugify((profile.languages?.[0] || 'francais'));
                                  const url = `/${roleSlug}/${countrySlug}/${mainLang}/${slug}`;
                                  window.open(url, '_blank');
                                }}
                                className="text-blue-600 hover:text-blue-800"
                                title="Voir le profil public"
                              >
                                <Eye size={18} />
                              </button>
                              <button onClick={() => handleEditProfile(profile)} className="text-green-600 hover:text-green-800" title="Modifier">
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
                          Aucun profil trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Bibliothèque de photos</h2>
              <p className="text-sm text-gray-600 mb-4">
                1) Clique sur <b>Importer le catalogue</b> pour créer les entrées Firestore à partir du fichier
                <code className="mx-1 px-1 rounded bg-gray-100">src/data/profile-photos.ts</code>.
                <br />
                2) Ajoute autant d’images que tu veux via l’upload ci-dessous (renommage SEO &amp; cache).
              </p>
              <div className="flex gap-3 mb-6">
                <Button
                  onClick={async () => {
                    const inserted = await seedPhotoLibraryFromCatalog();
                    alert(inserted === 0 ? 'La bibliothèque existe déjà.' : `${inserted} photos importées depuis le catalogue.`);
                  }}
                >
                  Importer le catalogue
                </Button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                    <select
                      value={photoMeta.role}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setPhotoMeta((p) => ({ ...p, role: e.target.value as Role }))
                      }
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="lawyer">Avocat</option>
                      <option value="expat">Expatrié</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                    <select
                      value={photoMeta.gender}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setPhotoMeta((p) => ({ ...p, gender: e.target.value as Gender }))
                      }
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="male">Homme</option>
                      <option value="female">Femme</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pays ciblés (optionnel)</label>
                    <select
                      multiple
                      value={photoMeta.countries}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setPhotoMeta((p) => ({
                          ...p,
                          countries: Array.from(e.target.selectedOptions).map((o) => o.value),
                        }))
                      }
                      className="w-full px-3 py-2 border rounded min-h-[42px]"
                    >
                      {countriesData.map((c: string) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Laisse vide pour “global”.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Uploader des images</label>
                  <input type="file" accept="image/*" multiple onChange={(e) => handleUploadPhotos(e.target.files)} />
                  <p className="text-xs text-gray-500 mt-2">
                    Les fichiers seront renommés (role-genre-pays-slug-xxxx.ext), mis en cache CDN et indexés en base.
                  </p>
                </div>

                {isUploadingPhotos && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
                    Téléversement en cours…
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Bonnes pratiques</h2>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
                <li>Résolution conseillée : 800×800 (affichage net, recadrage carré possible).</li>
                <li>Noms descriptifs (SEO) générés automatiquement.</li>
                <li>Chaque photo est marquée <i>inUse</i> au moment de sa première attribution (unicité garantie).</li>
                <li>Tu peux fournir des images DALL·E et libres de droits : renseigne bien rôle/genre/pays.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'planner' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Planification (génération assistée)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activer un plan</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={planner.enabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPlanner((p) => ({ ...p, enabled: e.target.checked }))
                    }
                  />
                  <span className="text-sm text-gray-600">Actif</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profils / jour</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={planner.dailyCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPlanner((p) => ({ ...p, dailyCount: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select
                  value={planner.role}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setPlanner((p) => ({ ...p, role: e.target.value as Role }))
                  }
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="lawyer">Avocat</option>
                  <option value="expat">Expatrié</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pays (région)</label>
                <select
                  multiple
                  value={planner.regionCountries}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setPlanner((p) => ({
                      ...p,
                      regionCountries: Array.from(e.target.selectedOptions).map((o) => o.value),
                    }))
                  }
                  className="w-full px-3 py-2 border rounded min-h-[120px]"
                >
                  {countriesData.map((c: string) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Langues</label>
                <select
                  multiple
                  value={planner.languages}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setPlanner((p) => ({
                      ...p,
                      languages: Array.from(e.target.selectedOptions).map((o) => o.value),
                    }))
                  }
                  className="w-full px-3 py-2 border rounded min-h-[120px]"
                >
                  {(LANGUAGE_OPTIONS as string[]).map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Français/Anglais seront privilégiés automatiquement si présents.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hommes (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={planner.genderBias.male}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPlanner((p) => ({ ...p, genderBias: { male: Number(e.target.value), female: 100 - Number(e.target.value) } }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Femmes (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={planner.genderBias.female}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPlanner((p) => ({ ...p, genderBias: { female: Number(e.target.value), male: 100 - Number(e.target.value) } }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={async () => {
                    if (!planner.enabled) return alert('Active le plan d’abord');
                    // On exécute la génération "aujourd’hui" avec les paramètres du planner
                    const maleCount = Math.round((planner.genderBias.male / 100) * planner.dailyCount);
                    const femaleCount = planner.dailyCount - maleCount;
                    let m = 0;
                    for (let i = 0; i < planner.dailyCount; i++) {
                      const gender: Gender = m < maleCount ? 'male' : 'female';
                      if (gender === 'male') m++;
                      await generateOne(
                        planner.role,
                        gender,
                        planner.regionCountries,
                        planner.languages,
                        2,
                        15,
                        formData.customPhoneNumber,
                        formData.useCustomPhone
                      );
                    }
                    alert(`${planner.dailyCount} profils générés via le plan du jour`);
                  }}
                >
                  Lancer la génération du jour
                </Button>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              Pour une exécution automatique quotidienne, ajoute une Cloud Function/CRON qui appelle un endpoint admin
              et réutilise cette logique côté serveur.
            </p>
          </div>
        )}

        {/* MODAL EDIT */}
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Modifier le profil" size="large">
          {selectedProfile && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={editFormData.firstName || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((p) => ({ ...p, firstName: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={editFormData.lastName || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((p) => ({ ...p, lastName: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((p) => ({ ...p, email: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={editFormData.phone || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((p) => ({ ...p, phone: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="+33743331201"
                  />
                  <p className="text-xs text-gray-500 mt-1">Obligatoire pour "En ligne".</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo de profil (URL)</label>
                <div className="flex items-center space-x-4">
                  <img src={newProfilePhoto} alt="Photo actuelle" className="w-16 h-16 rounded-full object-cover" />
                  <div className="flex-1">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newProfilePhoto}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProfilePhoto(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Utilise une image nette (≥ 400×400)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (3.0 - 5.0)</label>
                  <input
                    type="number"
                    min={3}
                    max={5}
                    step={0.1}
                    value={editFormData.rating || 4.5}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((p) => ({ ...p, rating: parseFloat(e.target.value) }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'avis</label>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={editFormData.reviewCount || 5}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((p) => ({ ...p, reviewCount: parseInt(e.target.value, 10) }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Années d'expérience</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editFormData.yearsOfExperience || 5}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((p) => ({ ...p, yearsOfExperience: parseInt(e.target.value, 10) }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!!(editFormData.isOnline && editFormData.phone)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((p) => ({ ...p, isOnline: e.target.checked && !!p.phone }))
                    }
                    disabled={!editFormData.phone}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">En ligne</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!!editFormData.isVisible}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((p) => ({ ...p, isVisible: e.target.checked }))
                    }
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Visible</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!!editFormData.isCallable}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((p) => ({ ...p, isCallable: e.target.checked }))
                    }
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Appels réels autorisés</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button onClick={() => setShowEditModal(false)} variant="outline" disabled={isLoading}>
                  Annuler
                </Button>
                <Button onClick={handleSaveProfile} className="bg-green-600 hover:bg-green-700" loading={isLoading}>
                  <Save size={16} className="mr-2" />
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* MODAL DELETE */}
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirmer la suppression" size="small">
          {selectedProfile && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Action irréversible</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>
                        Supprimer définitivement :
                        <br />
                        <strong>{selectedProfile.fullName}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button onClick={() => setShowDeleteModal(false)} variant="outline" disabled={isLoading}>
                  Annuler
                </Button>
                <Button onClick={handleDeleteProfile} className="bg-red-600 hover:bg-red-700" loading={isLoading}>
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
