// ========================================
// NationalitySelect.tsx — Multi-select of nationalities
// ========================================
import React, { useState, useMemo, useCallback } from 'react';
import Select, { MultiValue } from 'react-select';
import { nationalitiesData } from '@/data';
import { Locale, getDetectedBrowserLanguage, normalize, getLocalizedLabel, makeAdaptiveStyles, SharedOption } from './shared';

// Interface étendue avec la propriété isShared manquante
export interface NationalityOption extends SharedOption {
  isShared?: boolean;
}

interface NationalitySelectProps {
  value?: MultiValue<NationalityOption>;
  onChange: (selectedOptions: MultiValue<NationalityOption>) => void;
  providerLanguages?: string[];
  highlightShared?: boolean;
  locale?: Locale;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const NationalitySelect: React.FC<NationalitySelectProps> = React.memo(({
  value,
  onChange,
  providerLanguages = [],
  highlightShared = false,
  locale,
  placeholder,
  className = '',
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const currentLocale: Locale = useMemo(() => locale || getDetectedBrowserLanguage(), [locale]);

  const filtered = useMemo(() => {
    if (!inputValue) return nationalitiesData.filter(n => !n.disabled);
    const q = normalize(inputValue);
    return nationalitiesData.filter(n => !n.disabled && (
      // Correction: utiliser la bonne propriété selon la langue actuelle
      normalize(getLocalizedLabel(n, currentLocale, n.code)).includes(q) ||
      normalize(n.code).includes(q)
    ));
  }, [inputValue, currentLocale]);

  const options = useMemo<NationalityOption[]>(() => {
    return filtered.map(n => ({
      value: n.code,
      // Correction: utiliser la bonne propriété selon la langue actuelle
      label: getLocalizedLabel(n, currentLocale, n.code),
      isShared: highlightShared && providerLanguages.includes(n.code),
    }));
  }, [filtered, currentLocale, highlightShared, providerLanguages]);

  const sortedOptions = useMemo(() => {
    if (!highlightShared) return options;
    return [...options].sort((a, b) => (a.isShared === b.isShared) ? 0 : (a.isShared ? -1 : 1));
  }, [options, highlightShared]);

  const handleInputChange = useCallback((input: string) => {
    setInputValue(input);
    return input;
  }, []);

  // Correction: enlever le paramètre générique qui n'est pas attendu
  const styles = useMemo(() => makeAdaptiveStyles(!!highlightShared), [highlightShared]);
  
  // Fonction utilitaire pour le placeholder par défaut
  const defaultPlaceholder = useMemo(() => {
    return currentLocale === 'fr' ? 'Sélectionner des nationalités' : 'Select nationalities';
  }, [currentLocale]);

  const noOptionsMessage = useCallback(({ inputValue }: { inputValue: string }) => {
    return currentLocale === 'fr'
      ? (inputValue ? `Aucune nationalité trouvée pour "${inputValue}"` : 'Aucune nationalité disponible')
      : (inputValue ? `No nationality found for "${inputValue}"` : 'No nationalities available');
  }, [currentLocale]);

  return (
    <Select<NationalityOption, true>
      isMulti
      options={sortedOptions}
      onChange={onChange}
      onInputChange={handleInputChange}
      value={value}
      placeholder={placeholder || defaultPlaceholder}
      className={className}
      classNamePrefix="react-select"
      styles={styles}
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      blurInputOnSelect={false}
      isSearchable={true}
      isDisabled={disabled}
      noOptionsMessage={noOptionsMessage}
      filterOption={() => true}
    />
  );
});

NationalitySelect.displayName = 'NationalitySelect';
export default NationalitySelect;