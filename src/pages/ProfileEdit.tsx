import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db, auth, storage } from '../config/firebase';
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/layout/Layout";
import Button from "../components/common/Button";
import {
  getAuth,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile
} from "firebase/auth";

type userData = {
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'client' | 'lawyer' | 'expat';
  phone?: string;
  phoneCode?: string;
  nationality?: string;
  country?: string;
  currentCountry?: string;
  languages?: string;
  photoURL?: string;
  barNumber?: string;
  experienceYears?: number;
  diplomaYear?: number;
  description?: string;
  specialties?: string;
  interventionCountries?: string;
  certifications?: string;
  expatYears?: number;
  expDescription?: string;
  whyHelp?: string;
  status?: string;
  language?: string;
};

type Passwords = {
  new: string;
  confirm: string;
  current: string;
};

type PhotoState = {
  file: File | null;
  preview: string | null;
};
// Configuration des constantes
const VALIDATION_RULES = {
  password: { minLength: 6 },
  phone: { pattern: /^[\+]?[\d\s\-\(\)]+$/ },
  email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
};

const UPLOAD_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp']
};

const ProfileEdit = () => {
  const navigate = useNavigate();
  const { user, authInitialized, refreshUser } = useAuth()
;
if (!authInitialized) {
  return (
    <Layout>
      <div className="text-center py-20 text-gray-600">
        Initialisation de la session utilisateur...
      </div>
    </Layout>
  );
}
  console.log("Utilisateur actuel :", user);
  // États principaux
  const [userData, setuserData] = useState<userData | null>(null);
const [formData, setFormData] = useState<Partial<userData & Passwords>>({});
const [passwords, setPasswords] = useState<Passwords>({
  new: "",
  confirm: "",
  current: ""
});
const [photo, setPhoto] = useState<PhotoState>({
  file: null,
  preview: null
});

  
  // États de l'interface
  const [loading, setLoading] = useState({
    initial: false,
    submitting: false
  });
  const [messages, setMessages] = useState({
    error: "",
    success: ""
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [hasDataError, setHasDataError] = useState(false);

  // Styles mémorisés
  const styles = useMemo(() => ({
    input: "w-full border border-gray-300 text-sm p-2 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all duration-200",
    inputError: "w-full border border-red-300 text-sm p-2 rounded-lg placeholder-red-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 bg-red-50 transition-all duration-200",
    disabled: "w-full border border-gray-300 text-sm p-2 rounded-lg bg-gray-100 cursor-not-allowed text-gray-400",
    sectionTitle: "text-lg font-semibold mt-6 mb-4 text-red-600 border-b border-red-200 pb-2"
  }), []);

  // Navigation sécurisée
  const navigateTo = useCallback((route: string) => {
  navigate(route);
}, [navigate]);

  // Validation des champs
  const validateField = useCallback((name: string, value: string) => {
    const errors: Partial<Record<string, string>> = {};
    
    switch (name) {
      case 'email':
        if (value && !VALIDATION_RULES.email.pattern.test(value)) {
          errors.email = "Format d'email invalide";
        }
        break;
      case 'phone':
        if (value && !VALIDATION_RULES.phone.pattern.test(value)) {
          errors.phone = "Numéro de téléphone invalide";
        }
        break;
      case 'newPassword':
        if (value && value.length < VALIDATION_RULES.password.minLength) {
          errors.newPassword = `Le mot de passe doit contenir au moins ${VALIDATION_RULES.password.minLength} caractères`;
        }
        break;
      case 'confirmPassword':
        if (value && value !== passwords.new) {
          errors.confirmPassword = "Les mots de passe ne correspondent pas";
        }
        break;
    }
    
    return errors;
  }, [passwords.new]);

  // Chargement des données utilisateur
 useEffect(() => {
  const fetchuserData = async () => {
    setLoading(prev => ({ ...prev, initial: true }));
    setHasDataError(false);

    try {
      const docRef = doc(db, "users", user.uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as userData;
        setuserData(data);
        setFormData(data);
      } else {
        setHasDataError(true);
      }
    } catch (error) {
      console.error("Erreur chargement utilisateur :", error);
      setHasDataError(true);
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  };

  fetchuserData();
}, [user]);



  // Gestion des changements de champs
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validation en temps réel
    const fieldError = validateField(name, value);
    setFieldErrors(prev => ({
      ...prev,
      ...fieldError,
      [name]: fieldError[name] || undefined
    }));
    
    // Effacer les messages globaux
    setMessages({ error: "", success: "" });
  }, [validateField]);

  // Gestion des mots de passe
  const handlePasswordChange = useCallback((field: keyof Passwords, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
    
    const fieldError = validateField(field === 'new' ? 'newPassword' : 'confirmPassword', value);
    setFieldErrors(prev => ({ ...prev, ...fieldError }));

    setMessages({ error: "", success: "" });
  }, [validateField]);

  // Validation et prévisualisation des photos
  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation du fichier
    if (!UPLOAD_CONFIG.acceptedTypes.includes(file.type)) {
      setMessages(prev => ({ ...prev, error: "Format de fichier non supporté. Utilisez JPEG, PNG ou WebP." }));
      return;
    }

    if (file.size > UPLOAD_CONFIG.maxSize) {
      setMessages(prev => ({ ...prev, error: "Fichier trop volumineux. Taille maximale: 5MB." }));
      return;
    }

    setPhoto({ file, preview: null });
    
    // Créer une prévisualisation
    const reader = new FileReader();
    reader.onload = (e) => {
  const result = e.target?.result;
  if (typeof result === 'string') {
    setPhoto(prev => ({ ...prev, preview: result }));
  }
};
    reader.readAsDataURL(file);
    
    setMessages({ error: "", success: "" });
  }, []);

  // Vérification de l'unicité de l'email
  const checkEmailUniqueness = useCallback(async (email) => {
    if (email === userData?.email) return true;
    
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (err) {
      console.error("Erreur lors de la vérification de l'email:", err);
      return false;
    }
  }, [userData?.email]);

  // Réauthentification de l'utilisateur
  const reaUthenticateuser = useCallback(async () => {
    if (!passwords.current) {
      throw new Error("Mot de passe actuel requis pour cette opération");
    }

    const credential = EmailAuthProvider.credential(user.email, passwords.current);
    await reauthenticateWithCredential(user, credential);
  }, [passwords.current, user]);

 // ✅ À METTRE À LA PLACE
const uploadPhoto = useCallback(async () => {
  if (!photo.file) return userData?.photoURL;

  try {
    // Supprimer l'ancienne photo si elle existe
    if (userData?.photoURL) {
      try {
        const oldRef = ref(storage, userData.photoURL);
        await deleteObject(oldRef);
      } catch (err) {
        console.warn("Ancienne photo non supprimée :", err);
      }
    }

    // Upload de la nouvelle photo
    const newRef = ref(storage, `profilePhotos/${user.uid}/${Date.now()}_${photo.file.name}`);
    const snapshot = await uploadBytes(newRef, photo.file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (err) {
    console.error("Erreur lors de l'upload de la photo :", err);
    throw err;
  }
}, [photo.file, user?.uid, userData?.photoURL]);




  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !user) return;

    setMessages({ error: "", success: "" });
    setLoading(prev => ({ ...prev, submitting: true }));

    try {
      // Validation finale
      const allErrors: Partial<Record<string, string>> = {};
      Object.entries(formData).forEach(([key, value]) => {
        const fieldError = validateField(key, String(value));
        Object.assign(allErrors, fieldError);
      });

      if (passwords.new) {
        const passwordErrors = validateField('newPassword', passwords.new);
        Object.assign(allErrors, passwordErrors);
        
        if (passwords.confirm !== passwords.new) {
          allErrors.confirmPassword = "Les mots de passe ne correspondent pas";
        }
      }

      if (Object.keys(allErrors).length > 0) {
        setFieldErrors(allErrors);
        setMessages(prev => ({ ...prev, error: "Veuillez corriger les erreurs dans le formulaire" }));
        return;
      }

      // Vérifier l'unicité de l'email
      if ((formData.email || "") !== (userData.email || "")) {
  const isEmailUnique = await checkEmailUniqueness(formData.email || "");
  if (!isEmailUnique) {
    setMessages(prev => ({ ...prev, error: "Cette adresse email est déjà utilisée par un autre utilisateur." }));
    return;
  }
}

      // Réauthentifier si nécessaire
      // Réauthentification si nécessaire
if ((formData.email && formData.email !== userData.email) || passwords.new) {
  await reaUthenticateuser(); // attention : le nom exact est celui de ta fonction définie plus haut
}



      // Mettre à jour le mot de passe
      if (passwords.new && passwords.new.length >= VALIDATION_RULES.password.minLength) {
        await updatePassword(user, passwords.new);
      }

      // Upload de la photo
     // Upload de la photo
const photoURL = await uploadPhoto();

// Mettre à jour aussi Firebase Auth
await updateProfile(user, { photoURL });


      // Mise à jour dans Firestore
const updateData = {
  ...formData,
  photoURL,
  updatedAt: new Date(),
};

// Met à jour le document dans "users"
await updateDoc(doc(db, "users", user.uid), updateData);
// Mise à jour du contexte utilisateur pour le Header
setUser((prevUser) => ({
  ...prevUser,
  photoURL: photoURL,
}));
// Met aussi à jour le document dans "sos_profiles" si ce n’est pas un client
if (user.role !== "client") {
  await updateDoc(doc(db, "sos_profiles", user.uid), {
    photoURL,
    updatedAt: new Date(),
  }).catch((err) => {
    console.warn("Erreur mise à jour sos_profiles :", err);
  });
}


      setMessages(prev => ({ ...prev, success: "Profil mis à jour avec succès !" }));
      setPasswords({ new: "", confirm: "", current: "" });
      setPhoto({ file: null, preview: photoURL });
      
      // Mettre à jour les données locales
      setuserData(prev => ({ ...(prev || {}), ...updateData }));


    } catch (err: unknown) {
      console.error("Erreur lors de la mise à jour:", err);
      
      // Messages d'erreur spécifiques
      let errorMessage = "Erreur lors de la mise à jour du profil";
      
      if (err.code === 'auth/wrong-password') {
        errorMessage = "Mot de passe actuel incorrect";
      } else if (err.code === 'auth/weak-password') {
        errorMessage = "Le nouveau mot de passe est trop faible";
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = "Cette adresse email est déjà utilisée";
      } else if (err.code === 'auth/requires-recent-login') {
        errorMessage = "Veuillez vous reconnecter pour effectuer cette opération";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setMessages(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  }, [userData, user, formData, passwords, photo, validateField, checkEmailUniqueness, reaUthenticateuser, uploadPhoto]);

  // Fonction pour obtenir le style d'input approprié
  const getInputStyle = useCallback((fieldName: string) => {
    return fieldErrors[fieldName] ? styles.inputError : styles.input;
  }, [fieldErrors, styles]);

  // Affichage du chargement
  if (loading.initial) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-20 px-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre profil...</p>
        </div>
      </Layout>
    );
  }

  // Gestion de l'erreur de données avec option de retry
  if (hasDataError && !userData) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-20 px-4 text-center">
          <p className="text-red-600 mb-4">Impossible de charger les données du profil.</p>
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
              Réessayer
            </Button>
            <Button onClick={() => navigateTo('/dashboard')} className="bg-gray-600 hover:bg-gray-700">
              Retour au tableau de bord
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Si pas de données mais pas d'erreur, on affiche quand même le formulaire avec des valeurs par défaut
  const displayData = userData || {
    email: user?.email || "",
    firstName: user?.displayName?.split(' ')[0] || "",
    lastName: user?.displayName?.split(' ')[1] || "",
    role: "client"
  };

  const { role } = displayData;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white shadow-lg rounded-xl p-8">
          <h1 className="text-3xl font-bold text-red-600 mb-8 text-center">
            Modifier mon profil
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo de profil */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                {photo.preview || userData?.photoURL ? (
  <img
    src={photo.preview || userData?.photoURL}
    alt="Photo de profil"
    className="w-24 h-24 rounded-full object-cover border-4 border-red-200"
  />
) : (
  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-red-200">
    <span className="text-gray-500 text-sm">Photo</span>
  </div>
)}

              </div>
              <div className="mt-4">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Photo de profil
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formats acceptés: JPEG, PNG, WebP (max 5MB)
                </p>
              </div>
            </div>

            {/* Informations personnelles */}
            <section>
              <h2 className={styles.sectionTitle}>Informations personnelles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  disabled
                  value={displayData.firstName || ""}
                  className={styles.disabled}
                  placeholder="Prénom"
                />
                <input
                  disabled
                  value={displayData.lastName || ""}
                  className={styles.disabled}
                  placeholder="Nom"
                />
                <div className="md:col-span-2">
                  <input
                    name="email"
                    type="email"
                    value={formData.email || displayData.email || ""}
                    onChange={handleChange}
                    className={getInputStyle('email')}
                    placeholder="Email"
                  />
                  {fieldErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Changement de mot de passe */}
            <section>
              <h2 className={styles.sectionTitle}>Sécurité</h2>
              <div className="space-y-4">
                {((formData.email !== displayData?.email) || passwords.new) && (
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => handlePasswordChange('current', e.target.value)}
                    className={styles.input}
                    placeholder="Mot de passe actuel (requis pour les modifications de sécurité)"
                  />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="password"
                      value={passwords.new}
                      onChange={(e) => handlePasswordChange('new', e.target.value)}
                      className={getInputStyle('newPassword')}
                      placeholder="Nouveau mot de passe (optionnel)"
                    />
                    {fieldErrors.newPassword && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.newPassword}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => handlePasswordChange('confirm', e.target.value)}
                      className={getInputStyle('confirmPassword')}
                      placeholder="Confirmer le nouveau mot de passe"
                      disabled={!passwords.new}
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Coordonnées */}
            <section>
              <h2 className={styles.sectionTitle}>Coordonnées</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  name="phoneCode"
                  value={formData.phoneCode || ""}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Indicatif (+33)"
                />
                <div className="md:col-span-2">
                  <input
                    name="phone"
                    value={formData.phone || ""}
                    onChange={handleChange}
                    className={getInputStyle('phone')}
                    placeholder="Numéro de téléphone"
                  />
                  {fieldErrors.phone && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Champs spécifiques par rôle */}
            {role === "lawyer" && (
              <section>
                <h2 className={styles.sectionTitle}>Détails professionnels</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      name="country"
                      value={formData.country || ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Pays de résidence"
                    />
                    <input
                      name="currentCountry"
                      value={formData.currentCountry || ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Pays actuel"
                    />
                    <input
                      name="barNumber"
                      value={formData.barNumber || ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Numéro de barreau"
                    />
                    <input
                      name="experienceYears"
                      type="number"
                      value={formData.experienceYears || ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Années d'expérience"
                    />
                  </div>
                  
                  <input
                    disabled
                    value={formData.diplomaYear || ""}
                    className={styles.disabled}
                    placeholder="Année du diplôme"
                  />
                  
                  <textarea
                    name="description"
                    value={formData.description || ""}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Description professionnelle"
                    rows={4}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      name="specialties"
                      value={formData.specialties || ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Spécialités (séparées par des virgules)"
                    />
                    <input
                      name="interventionCountries"
                      value={formData.interventionCountries || ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Pays d'intervention"
                    />
                  </div>
                  
                  <input
                    name="languages"
                    value={formData.languages || ""}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Langues parlées (séparées par des virgules)"
                  />
                  
                  <input
                    disabled
                    value={formData.certifications || ""}
                    className={styles.disabled}
                    placeholder="Certifications"
                  />
                </div>
              </section>
            )}

            {role === "expat" && (
              <section>
                <h2 className={styles.sectionTitle}>Informations sur votre expatriation</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      name="country"
                      value={formData.country || ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Pays de résidence"
                    />
                    <input
                      name="currentCountry"
                      value={formData.currentCountry || ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Pays actuel"
                    />
                    <input
                      name="interventionCountries"
                      value={formData.interventionCountries || ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Pays d'intervention"
                    />
                    <input
                      name="expatYears"
                      type="number"
                      value={formData.expatYears || ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Années d'expatriation"
                    />
                  </div>
                  
                  <textarea
                    name="expDescription"
                    value={formData.expDescription || ""}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Votre expérience d'expatriation"
                    rows={4}
                  />
                  
                  <textarea
                    name="whyHelp"
                    value={formData.whyHelp || ""}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Pourquoi souhaitez-vous aider d'autres expatriés ?"
                    rows={3}
                  />
                  
                  <input
                    name="languages"
                    value={formData.languages || ""}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Langues parlées (séparées par des virgules)"
                  />
                </div>
              </section>
            )}

            {role === "client" && (
              <section>
                <h2 className={styles.sectionTitle}>Informations complémentaires</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      disabled
                      value={formData.nationality || ""}
                      className={styles.disabled}
                      placeholder="Nationalité"
                    />
                    <input
                      name="country"
                      value={formData.country || ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Pays de résidence"
                    />
                    <input
                      name="status"
                      value={formData.status || ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Statut"
                    />
                    <input
                      name="language"
                      value={formData.language || ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Langue principale"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Messages de feedback */}
            {messages.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-semibold">Erreur</p>
                <p className="text-sm">{messages.error}</p>
              </div>
            )}
            
            {messages.success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <p className="font-semibold">Succès</p>
                <p className="text-sm">{messages.success}</p>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                disabled={loading.submitting || Object.keys(fieldErrors).some(key => fieldErrors[key])}
                className="flex-1 relative"
              >
                {loading.submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Mise à jour en cours...
                  </>
                ) : (
                  "Valider les modifications"
                )}
              </Button>
              
              <button
                type="button"
                onClick={() => navigateTo('/dashboard')}
                className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                disabled={loading.submitting}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default ProfileEdit;

