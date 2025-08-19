// src/components/forms-data/index.ts
export { default as MultiLanguageSelect } from './MultiLanguageSelect';
export { default as CountrySelect } from './CountrySelect';
export { default as NationalitySelect } from './NationalitySelect';
export { default as PhoneInput } from './PhoneInput';
export { default as WhatsAppInput } from './WhatsAppInput';
export { default as SpecialtySelect } from './SpecialtySelect';
export { default as ExpatHelpSelect } from './ExpatHelpSelect';

// ---- Données (depuis src/data) ----
import LANGUAGE_OPTIONS_DEFAULT from '../../data/languages-spoken';
import LAWYER_SPECIALTIES_DEFAULT from '../../data/lawyer-specialties';
import EXPAT_HELP_TYPES_DEFAULT from '../../data/expat-help-types';

// on ré-exporte sous des noms stables
export const LANGUAGE_OPTIONS = LANGUAGE_OPTIONS_DEFAULT;
export const LAWYER_SPECIALTIES = LAWYER_SPECIALTIES_DEFAULT;
export const EXPAT_HELP_TYPES = EXPAT_HELP_TYPES_DEFAULT;
