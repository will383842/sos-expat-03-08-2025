// ========================================
// src/data/expat-help-types.ts — Types d'aide pour expatriés
// - Liste plate (catégories), ordre métier conservé
// - 10 langues (initialisées en FR; à traduire si besoin)
// - Codes stables (UPPER_SNAKE)
// - "AUTRE_PRECISER" a un flag requiresDetails = true
// ========================================

export interface ExpatHelpType {
  code: string;
  labelFr: string; labelEn: string; labelEs: string; labelDe: string; labelPt: string;
  labelZh: string; labelAr: string; labelRu: string; labelIt: string; labelNl: string;
  requiresDetails?: boolean; // ex: pour "Autre (précisez)"
  priority?: number;
  disabled?: boolean;
}

export const expatHelpTypesData: ExpatHelpType[] = [
  { code: "INSTALLATION", labelFr: "S'installer", labelEn: "S'installer", labelEs: "S'installer", labelDe: "S'installer", labelPt: "S'installer", labelZh: "S'installer", labelAr: "S'installer", labelRu: "S'installer", labelIt: "S'installer", labelNl: "S'installer" },
  { code: "DEMARCHES_ADMINISTRATIVES", labelFr: "Démarches administratives", labelEn: "Démarches administratives", labelEs: "Démarches administratives", labelDe: "Démarches administratives", labelPt: "Démarches administratives", labelZh: "Démarches administratives", labelAr: "Démarches administratives", labelRu: "Démarches administratives", labelIt: "Démarches administratives", labelNl: "Démarches administratives" },
  { code: "RECHERCHE_LOGEMENT", labelFr: "Recherche de logement", labelEn: "Recherche de logement", labelEs: "Recherche de logement", labelDe: "Recherche de logement", labelPt: "Recherche de logement", labelZh: "Recherche de logement", labelAr: "Recherche de logement", labelRu: "Recherche de logement", labelIt: "Recherche de logement", labelNl: "Recherche de logement" },
  { code: "OUVERTURE_COMPTE_BANCAIRE", labelFr: "Ouverture de compte bancaire", labelEn: "Ouverture de compte bancaire", labelEs: "Ouverture de compte bancaire", labelDe: "Ouverture de compte bancaire", labelPt: "Ouverture de compte bancaire", labelZh: "Ouverture de compte bancaire", labelAr: "Ouverture de compte bancaire", labelRu: "Ouverture de compte bancaire", labelIt: "Ouverture de compte bancaire", labelNl: "Ouverture de compte bancaire" },
  { code: "SYSTEME_SANTE", labelFr: "Système de santé", labelEn: "Système de santé", labelEs: "Système de santé", labelDe: "Système de santé", labelPt: "Système de santé", labelZh: "Système de santé", labelAr: "Système de santé", labelRu: "Système de santé", labelIt: "Système de santé", labelNl: "Système de santé" },
  { code: "EDUCATION_ECOLES", labelFr: "Éducation et écoles", labelEn: "Éducation et écoles", labelEs: "Éducation et écoles", labelDe: "Éducation et écoles", labelPt: "Éducation et écoles", labelZh: "Éducation et écoles", labelAr: "Éducation et écoles", labelRu: "Éducation et écoles", labelIt: "Éducation et écoles", labelNl: "Éducation et écoles" },
  { code: "TRANSPORT", labelFr: "Transport", labelEn: "Transport", labelEs: "Transport", labelDe: "Transport", labelPt: "Transport", labelZh: "Transport", labelAr: "Transport", labelRu: "Transport", labelIt: "Transport", labelNl: "Transport" },
  { code: "RECHERCHE_EMPLOI", labelFr: "Recherche d'emploi", labelEn: "Recherche d'emploi", labelEs: "Recherche d'emploi", labelDe: "Recherche d'emploi", labelPt: "Recherche d'emploi", labelZh: "Recherche d'emploi", labelAr: "Recherche d'emploi", labelRu: "Recherche d'emploi", labelIt: "Recherche d'emploi", labelNl: "Recherche d'emploi" },
  { code: "CREATION_ENTREPRISE", labelFr: "Création d'entreprise", labelEn: "Création d'entreprise", labelEs: "Création d'entreprise", labelDe: "Création d'entreprise", labelPt: "Création d'entreprise", labelZh: "Création d'entreprise", labelAr: "Création d'entreprise", labelRu: "Création d'entreprise", labelIt: "Création d'entreprise", labelNl: "Création d'entreprise" },
  { code: "FISCALITE_LOCALE", labelFr: "Fiscalité locale", labelEn: "Fiscalité locale", labelEs: "Fiscalité locale", labelDe: "Fiscalité locale", labelPt: "Fiscalité locale", labelZh: "Fiscalité locale", labelAr: "Fiscalité locale", labelRu: "Fiscalité locale", labelIt: "Fiscalité locale", labelNl: "Fiscalité locale" },
  { code: "CULTURE_INTEGRATION", labelFr: "Culture et intégration", labelEn: "Culture et intégration", labelEs: "Culture et intégration", labelDe: "Culture et intégration", labelPt: "Culture et intégration", labelZh: "Culture et intégration", labelAr: "Culture et intégration", labelRu: "Culture et intégration", labelIt: "Culture et intégration", labelNl: "Culture et intégration" },
  { code: "VISA_IMMIGRATION", labelFr: "Visa et immigration", labelEn: "Visa et immigration", labelEs: "Visa et immigration", labelDe: "Visa et immigration", labelPt: "Visa et immigration", labelZh: "Visa et immigration", labelAr: "Visa et immigration", labelRu: "Visa et immigration", labelIt: "Visa et immigration", labelNl: "Visa et immigration" },
  { code: "ASSURANCES", labelFr: "Assurances", labelEn: "Assurances", labelEs: "Assurances", labelDe: "Assurances", labelPt: "Assurances", labelZh: "Assurances", labelAr: "Assurances", labelRu: "Assurances", labelIt: "Assurances", labelNl: "Assurances" },
  { code: "TELEPHONE_INTERNET", labelFr: "Téléphone et internet", labelEn: "Téléphone et internet", labelEs: "Téléphone et internet", labelDe: "Téléphone et internet", labelPt: "Téléphone et internet", labelZh: "Téléphone et internet", labelAr: "Téléphone et internet", labelRu: "Téléphone et internet", labelIt: "Téléphone et internet", labelNl: "Téléphone et internet" },
  { code: "ALIMENTATION_COURSES", labelFr: "Alimentation et courses", labelEn: "Alimentation et courses", labelEs: "Alimentation et courses", labelDe: "Alimentation et courses", labelPt: "Alimentation et courses", labelZh: "Alimentation et courses", labelAr: "Alimentation et courses", labelRu: "Alimentation et courses", labelIt: "Alimentation et courses", labelNl: "Alimentation et courses" },
  { code: "LOISIRS_SORTIES", labelFr: "Loisirs et sorties", labelEn: "Loisirs et sorties", labelEs: "Loisirs et sorties", labelDe: "Loisirs et sorties", labelPt: "Loisirs et sorties", labelZh: "Loisirs et sorties", labelAr: "Loisirs et sorties", labelRu: "Loisirs et sorties", labelIt: "Loisirs et sorties", labelNl: "Loisirs et sorties" },
  { code: "SPORTS_ACTIVITES", labelFr: "Sports et activités", labelEn: "Sports et activités", labelEs: "Sports et activités", labelDe: "Sports et activités", labelPt: "Sports et activités", labelZh: "Sports et activités", labelAr: "Sports et activités", labelRu: "Sports et activités", labelIt: "Sports et activités", labelNl: "Sports et activités" },
  { code: "SECURITE", labelFr: "Sécurité", labelEn: "Sécurité", labelEs: "Sécurité", labelDe: "Sécurité", labelPt: "Sécurité", labelZh: "Sécurité", labelAr: "Sécurité", labelRu: "Sécurité", labelIt: "Sécurité", labelNl: "Sécurité" },
  { code: "URGENCES", labelFr: "Urgences", labelEn: "Urgences", labelEs: "Urgences", labelDe: "Urgences", labelPt: "Urgences", labelZh: "Urgences", labelAr: "Urgences", labelRu: "Urgences", labelIt: "Urgences", labelNl: "Urgences" },
  { code: "PROBLEMES_ARGENT", labelFr: "Problèmes d'argent", labelEn: "Problèmes d'argent", labelEs: "Problèmes d'argent", labelDe: "Problèmes d'argent", labelPt: "Problèmes d'argent", labelZh: "Problèmes d'argent", labelAr: "Problèmes d'argent", labelRu: "Problèmes d'argent", labelIt: "Problèmes d'argent", labelNl: "Problèmes d'argent" },
  { code: "PROBLEMES_RELATIONNELS", labelFr: "Problèmes relationnels", labelEn: "Problèmes relationnels", labelEs: "Problèmes relationnels", labelDe: "Problèmes relationnels", labelPt: "Problèmes relationnels", labelZh: "Problèmes relationnels", labelAr: "Problèmes relationnels", labelRu: "Problèmes relationnels", labelIt: "Problèmes relationnels", labelNl: "Problèmes relationnels" },
  { code: "PROBLEMES_DIVERS", labelFr: "Problèmes divers", labelEn: "Problèmes divers", labelEs: "Problèmes divers", labelDe: "Problèmes divers", labelPt: "Problèmes divers", labelZh: "Problèmes divers", labelAr: "Problèmes divers", labelRu: "Problèmes divers", labelIt: "Problèmes divers", labelNl: "Problèmes divers" },
  { code: "PARTIR_OU_RENTRER", labelFr: "Partir ou rentrer", labelEn: "Partir ou rentrer", labelEs: "Partir ou rentrer", labelDe: "Partir ou rentrer", labelPt: "Partir ou rentrer", labelZh: "Partir ou rentrer", labelAr: "Partir ou rentrer", labelRu: "Partir ou rentrer", labelIt: "Partir ou rentrer", labelNl: "Partir ou rentrer" },
  { code: "AUTRE_PRECISER", labelFr: "Autre (précisez)", labelEn: "Autre (précisez)", labelEs: "Autre (précisez)", labelDe: "Autre (précisez)", labelPt: "Autre (précisez)", labelZh: "Autre (précisez)", labelAr: "Autre (précisez)", labelRu: "Autre (précisez)", labelIt: "Autre (précisez)", labelNl: "Autre (précisez)", requiresDetails: true },
];

// Helpers
export type ExpatHelpTypeCode = typeof expatHelpTypesData[number]['code'];

export const getExpatHelpType = (code: ExpatHelpTypeCode) =>
  expatHelpTypesData.find(t => t.code === code) ?? null;

export const EXPAT_HELP_TYPES_STATS = {
  total: expatHelpTypesData.filter(t => !t.disabled).length,
  requiresDetails: expatHelpTypesData.filter(t => t.requiresDetails && !t.disabled).map(t => t.code)
} as const;

