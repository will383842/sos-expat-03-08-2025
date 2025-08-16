import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db, auth, storage } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/layout/Layout";
import Button from "../components/common/Button";
import {
  updateEmail as fbUpdateEmail,
  updatePassword as fbUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile as fbUpdateProfile,
  User as FirebaseUser,
} from "firebase/auth";

/** --- Types --- */
type Role = "client" | "lawyer" | "expat";

type UserData = {
  email: string;
  firstName?: string;
  lastName?: string;
  role: Role;
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

type FieldErrorKey =
  | keyof UserData
  | "email"
  | "phone"
  | "newPassword"
  | "confirmPassword"
  | "current";

type FieldErrors = Partial<Record<FieldErrorKey, string>>;

/** --- Constantes --- */
const VALIDATION_RULES = {
  password: { minLength: 6 },
  // pas besoin d'escapes inutiles dans un character class
  phone: { pattern: /^[+\d\s()-]+$/ },
  email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
};

const UPLOAD_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
};

const ProfileEdit: React.FC = () => {
  const navigate = useNavigate();
  const { user: ctxUser, authInitialized, refreshUser } = useAuth();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [formData, setFormData] = useState<Partial<UserData & Passwords>>({});
  const [passwords, setPasswords] = useState<Passwords>({ new: "", confirm: "", current: "" });
  const [photo, setPhoto] = useState<PhotoState>({ file: null, preview: null });

  const [loading, setLoading] = useState({ initial: false, submitting: false });
  const [messages, setMessages] = useState({ error: "", success: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [hasDataError, setHasDataError] = useState(false);

  const styles = useMemo(
    () => ({
      input:
        "w-full border border-gray-300 text-sm p-2 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all duration-200",
      inputError:
        "w-full border border-red-300 text-sm p-2 rounded-lg placeholder-red-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 bg-red-50 transition-all duration-200",
      disabled:
        "w-full border border-gray-300 text-sm p-2 rounded-lg bg-gray-100 cursor-not-allowed text-gray-400",
      sectionTitle: "text-lg font-semibold mt-6 mb-4 text-red-600 border-b border-red-200 pb-2",
    }),
    []
  );

  const navigateTo = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

  const validateField = useCallback(
    (name: FieldErrorKey, value: string): FieldErrors => {
      const errors: FieldErrors = {};
      switch (name) {
        case "email":
          if (value && !VALIDATION_RULES.email.pattern.test(value)) {
            errors.email = "Format d'email invalide";
          }
          break;
        case "phone":
          if (value && !VALIDATION_RULES.phone.pattern.test(value)) {
            errors.phone = "Numéro de téléphone invalide";
          }
          break;
        case "newPassword":
          if (value && value.length < VALIDATION_RULES.password.minLength) {
            errors.newPassword = `Le mot de passe doit contenir au moins ${VALIDATION_RULES.password.minLength} caractères`;
          }
          break;
        case "confirmPassword":
          if (value && value !== passwords.new) {
            errors.confirmPassword = "Les mots de passe ne correspondent pas";
          }
          break;
        default:
          break;
      }
      return errors;
    },
    [passwords.new]
  );

  /** Chargement des données */
  useEffect(() => {
    const load = async () => {
      if (!authInitialized) return;
      if (!ctxUser?.uid) return;

      setLoading((p) => ({ ...p, initial: true }));
      setHasDataError(false);

      try {
        const snap = await getDoc(doc(db, "users", ctxUser.uid));
        if (!snap.exists()) {
          setHasDataError(true);
          return;
        }
        const data = snap.data() as UserData;
        setUserData(data);
        setFormData(data);
      } catch (e) {
        console.error("Erreur chargement utilisateur :", e);
        setHasDataError(true);
      } finally {
        setLoading((p) => ({ ...p, initial: false }));
      }
    };
    load();
  }, [authInitialized, ctxUser?.uid]);

  /** Handlers */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;

      // convertit les type="number" vers number
      const parsed: string | number =
        (e.target as HTMLInputElement).type === "number" && value !== ""
          ? Number(value)
          : value;

      setFormData((prev) => ({ ...prev, [name]: parsed as never }));

      const fieldError = validateField(name as FieldErrorKey, String(value));
      setFieldErrors((prev) => ({
        ...prev,
        ...fieldError,
        [name]: fieldError[name as FieldErrorKey],
      }));

      setMessages({ error: "", success: "" });
    },
    [validateField]
  );

  const handlePasswordChange = useCallback(
    (field: keyof Passwords, value: string) => {
      setPasswords((prev) => ({ ...prev, [field]: value }));
      const which: FieldErrorKey = field === "new" ? "newPassword" : "confirmPassword";
      setFieldErrors((prev) => ({ ...prev, ...validateField(which, value) }));
      setMessages({ error: "", success: "" });
    },
    [validateField]
  );

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!UPLOAD_CONFIG.acceptedTypes.includes(file.type)) {
      setMessages((p) => ({ ...p, error: "Format de fichier non supporté. Utilisez JPEG, PNG ou WebP." }));
      return;
    }
    if (file.size > UPLOAD_CONFIG.maxSize) {
      setMessages((p) => ({ ...p, error: "Fichier trop volumineux. Taille maximale: 5MB." }));
      return;
    }

    setPhoto({ file, preview: null });
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        setPhoto((prev) => ({ ...prev, preview: result }));
      }
    };
    reader.readAsDataURL(file);
    setMessages({ error: "", success: "" });
  }, []);

  const checkEmailUniqueness = useCallback(
    async (email: string) => {
      if (email === userData?.email) return true;
      try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const r = await getDocs(q);
        return r.empty;
      } catch (e) {
        console.error("Erreur lors de la vérification de l'email:", e);
        return false;
      }
    },
    [userData?.email]
  );

  const reauthenticateUser = useCallback(async () => {
    const current = auth.currentUser;
    if (!current?.email) throw new Error("Email utilisateur non disponible");
    if (!passwords.current) throw new Error("Mot de passe actuel requis pour cette opération");

    const cred = EmailAuthProvider.credential(current.email, passwords.current);
    await reauthenticateWithCredential(current as FirebaseUser, cred);
  }, [passwords.current]);

  const uploadPhoto = useCallback(async (): Promise<string | undefined> => {
    if (!photo.file) return userData?.photoURL;

    try {
      if (userData?.photoURL && userData.photoURL !== "/default-avatar.png") {
        try {
          await deleteObject(ref(storage, userData.photoURL));
        } catch (err) {
          console.warn("Ancienne photo non supprimée :", err);
        }
      }

      const current = auth.currentUser;
      if (!current?.uid) throw new Error("ID utilisateur non disponible");

      const newRef = ref(storage, `profilePhotos/${current.uid}/${Date.now()}_${photo.file.name}`);
      const snapshot = await uploadBytes(newRef, photo.file);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch (err) {
      console.error("Erreur lors de l'upload de la photo :", err);
      throw err;
    }
  }, [photo.file, userData?.photoURL]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!ctxUser?.uid) return;

      setMessages({ error: "", success: "" });
      setLoading((p) => ({ ...p, submitting: true }));

      try {
        // Validation finale
        const allErrors: FieldErrors = {};
        Object.entries(formData).forEach(([key, value]) => {
          const fe = validateField(key as FieldErrorKey, String(value ?? ""));
          Object.assign(allErrors, fe);
        });

        if (passwords.new) {
          Object.assign(allErrors, validateField("newPassword", passwords.new));
          if (passwords.confirm !== passwords.new) {
            allErrors.confirmPassword = "Les mots de passe ne correspondent pas";
          }
        }

        if (Object.keys(allErrors).length > 0) {
          setFieldErrors(allErrors);
          setMessages((p) => ({ ...p, error: "Veuillez corriger les erreurs dans le formulaire" }));
          return;
        }

        // Unicité email
        if ((formData.email || "") !== (userData?.email || "")) {
          const unique = await checkEmailUniqueness(formData.email || "");
          if (!unique) {
            setMessages((p) => ({
              ...p,
              error: "Cette adresse email est déjà utilisée par un autre utilisateur.",
            }));
            return;
          }
        }

        const current = auth.currentUser;
        if (!current) throw new Error("Session Auth inexistante");

        // Réauth si changement email ou mdp
        if ((formData.email && formData.email !== userData?.email) || passwords.new) {
          await reauthenticateUser();
        }

        // Update password
        if (passwords.new && passwords.new.length >= VALIDATION_RULES.password.minLength) {
          await fbUpdatePassword(current as FirebaseUser, passwords.new);
        }

        // Update email (si changé)
        if (formData.email && formData.email !== current.email) {
          await fbUpdateEmail(current as FirebaseUser, formData.email);
        }

        // Photo
        const photoURL = await uploadPhoto();

        // Update profil Auth (photo uniquement ici)
        if (photoURL && photoURL !== current.photoURL) {
          await fbUpdateProfile(current as FirebaseUser, { photoURL });
        }

        // Firestore
        const updateData: Partial<UserData> & { updatedAt: Date; photoURL?: string } = {
          ...formData,
          photoURL,
          updatedAt: new Date(),
        };

        await updateDoc(doc(db, "users", ctxUser.uid), updateData);

        if (refreshUser) refreshUser();

        if ((userData?.role ?? "client") !== "client") {
          await updateDoc(doc(db, "sos_profiles", ctxUser.uid), {
            photoURL,
            updatedAt: new Date(),
          }).catch((err) => console.warn("Erreur mise à jour sos_profiles :", err));
        }

        setMessages((p) => ({ ...p, success: "Profil mis à jour avec succès !" }));
        setPasswords({ new: "", confirm: "", current: "" });
        setPhoto({ file: null, preview: photoURL ?? null });
        setUserData((prev) => ({ ...(prev ?? ({} as UserData)), ...(updateData as UserData) }));
      } catch (err) {
        console.error("Erreur lors de la mise à jour:", err);
        let errorMessage = "Erreur lors de la mise à jour du profil";

        if (err && typeof err === "object" && "code" in err) {
          const code = (err as { code: string }).code;
          switch (code) {
            case "auth/wrong-password":
              errorMessage = "Mot de passe actuel incorrect";
              break;
            case "auth/weak-password":
              errorMessage = "Le nouveau mot de passe est trop faible";
              break;
            case "auth/email-already-in-use":
              errorMessage = "Cette adresse email est déjà utilisée";
              break;
            case "auth/requires-recent-login":
              errorMessage = "Veuillez vous reconnecter pour effectuer cette opération";
              break;
            default:
              if ("message" in err && typeof (err as { message?: string }).message === "string") {
                const m = (err as { message: string }).message;
                if (m.includes("majuscule") || m.includes("minuscule") || m.includes("chiffre")) {
                  errorMessage = "Le mot de passe doit contenir au moins 6 caractères";
                }
              }
              break;
          }
        }

        setMessages((p) => ({ ...p, error: errorMessage }));
      } finally {
        setLoading((p) => ({ ...p, submitting: false }));
      }
    },
    [
      ctxUser?.uid,
      formData,
      passwords,
      userData?.email,
      userData?.role,
      validateField,
      checkEmailUniqueness,
      reauthenticateUser,
      uploadPhoto,
      refreshUser,
    ]
  );

  const getInputStyle = useCallback(
    (fieldName: FieldErrorKey) => (fieldErrors[fieldName] ? styles.inputError : styles.input),
    [fieldErrors, styles]
  );

  /** --- Rendus --- */
  if (!authInitialized) {
    return (
      <Layout>
        <div className="text-center py-20 text-gray-600">Initialisation de la session utilisateur...</div>
      </Layout>
    );
  }

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

  if (hasDataError && !userData) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-20 px-4 text-center">
          <p className="text-red-600 mb-4">Impossible de charger les données du profil.</p>
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
              Réessayer
            </Button>
            <Button onClick={() => navigateTo("/dashboard")} className="bg-gray-600 hover:bg-gray-700">
              Retour au tableau de bord
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const displayData: UserData = userData || {
    email: auth.currentUser?.email || "",
    firstName: auth.currentUser?.displayName?.split(" ")[0] || "",
    lastName: auth.currentUser?.displayName?.split(" ")[1] || "",
    role: "client",
  };

  const { role } = displayData;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white shadow-lg rounded-xl p-8">
          <h1 className="text-3xl font-bold text-red-600 mb-8 text-center">Modifier mon profil</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo de profil */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                {photo.preview || userData?.photoURL ? (
                  <img
                    src={photo.preview || userData?.photoURL || "/default-avatar.png"}
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
                <label className="block mb-2 text-sm font-medium text-gray-700">Photo de profil</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">Formats acceptés: JPEG, PNG, WebP (max 5MB)</p>
              </div>
            </div>

            {/* Informations personnelles */}
            <section>
              <h2 className={styles.sectionTitle}>Informations personnelles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input disabled value={displayData.firstName || ""} className={styles.disabled} placeholder="Prénom" />
                <input disabled value={displayData.lastName || ""} className={styles.disabled} placeholder="Nom" />
                <div className="md:col-span-2">
                  <input
                    name="email"
                    type="email"
                    value={formData.email ?? displayData.email ?? ""}
                    onChange={handleChange}
                    className={getInputStyle("email")}
                    placeholder="Email"
                  />
                  {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
                </div>
              </div>
            </section>

            {/* Sécurité */}
            <section>
              <h2 className={styles.sectionTitle}>Sécurité</h2>
              <div className="space-y-4">
                {((formData.email ?? displayData.email) !== displayData.email || passwords.new) && (
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => handlePasswordChange("current", e.target.value)}
                    className={styles.input}
                    placeholder="Mot de passe actuel (requis pour les modifications de sécurité)"
                  />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="password"
                      value={passwords.new}
                      onChange={(e) => handlePasswordChange("new", e.target.value)}
                      className={getInputStyle("newPassword")}
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
                      onChange={(e) => handlePasswordChange("confirm", e.target.value)}
                      className={getInputStyle("confirmPassword")}
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
                  value={String(formData.phoneCode ?? "")}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Indicatif (+33)"
                />
                <div className="md:col-span-2">
                  <input
                    name="phone"
                    value={String(formData.phone ?? "")}
                    onChange={handleChange}
                    className={getInputStyle("phone")}
                    placeholder="Numéro de téléphone"
                  />
                  {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>}
                </div>
              </div>
            </section>

            {/* Spécifique par rôle */}
            {role === "lawyer" && (
              <section>
                <h2 className={styles.sectionTitle}>Détails professionnels</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      name="country"
                      value={String(formData.country ?? "")}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Pays de résidence"
                    />
                    <input
                      name="currentCountry"
                      value={String(formData.currentCountry ?? "")}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Pays actuel"
                    />
                    <input
                      name="barNumber"
                      value={String(formData.barNumber ?? "")}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Numéro de barreau"
                    />
                    <input
                      name="experienceYears"
                      type="number"
                      value={formData.experienceYears ?? ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Années d'expérience"
                    />
                  </div>

                  <input
                    disabled
                    value={String(formData.diplomaYear ?? "")}
                    className={styles.disabled}
                    placeholder="Année du diplôme"
                  />

                  <textarea
                    name="description"
                    value={String(formData.description ?? "")}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Description professionnelle"
                    rows={4}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      name="specialties"
                      value={String(formData.specialties ?? "")}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Spécialités (séparées par des virgules)"
                    />
                    <input
                      name="interventionCountries"
                      value={String(formData.interventionCountries ?? "")}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Pays d'intervention"
                    />
                  </div>

                  <input
                    name="languages"
                    value={String(formData.languages ?? "")}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Langues parlées (séparées par des virgules)"
                  />

                  <input
                    disabled
                    value={String(formData.certifications ?? "")}
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
                      value={String(formData.country ?? "")}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Pays de résidence"
                    />
                    <input
                      name="currentCountry"
                      value={String(formData.currentCountry ?? "")}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Pays actuel"
                    />
                    <input
                      name="interventionCountries"
                      value={String(formData.interventionCountries ?? "")}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Pays d'intervention"
                    />
                    <input
                      name="expatYears"
                      type="number"
                      value={formData.expatYears ?? ""}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Années d'expatriation"
                    />
                  </div>

                  <textarea
                    name="expDescription"
                    value={String(formData.expDescription ?? "")}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Votre expérience d'expatriation"
                    rows={4}
                  />

                  <textarea
                    name="whyHelp"
                    value={String(formData.whyHelp ?? "")}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Pourquoi souhaitez-vous aider d'autres expatriés ?"
                    rows={3}
                  />

                  <input
                    name="languages"
                    value={String(formData.languages ?? "")}
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
                      value={String(formData.nationality ?? "")}
                      className={styles.disabled}
                      placeholder="Nationalité"
                    />
                    <input
                      name="country"
                      value={String(formData.country ?? "")}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Pays de résidence"
                    />
                    <input
                      name="status"
                      value={String(formData.status ?? "")}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Statut"
                    />
                    <input
                      name="language"
                      value={String(formData.language ?? "")}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Langue principale"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Feedback */}
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

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                disabled={
                  loading.submitting || (Object.keys(fieldErrors) as FieldErrorKey[]).some((k) => Boolean(fieldErrors[k]))
                }
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
                onClick={() => navigateTo("/dashboard")}
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
