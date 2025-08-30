// ========================================
// ExpatHelpSelect.tsx â€” Multi-select of expat help types (flat)
// ========================================
import React, { useState, useMemo, useCallback } from 'react';
import Select, { MultiValue } from 'react-select';
import { expatHelpTypesData } from '@/data';
import { Locale, getDetectedBrowserLanguage, normalize, getLocalizedLabel, defaultPlaceholderByLocale, makeAdaptiveStyles, SharedOption } from './shared';

export interface ExpatHelpOption extends SharedOption {}

interface ExpatHelpSelectProps {
  value?: MultiValue<ExpatHelpOption>;
  onChange: (selectedOptions: MultiValue<ExpatHelpOption>) => void;
  providerLanguages?: string[];
  highlightShared?: boolean;
  locale?: Locale;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const ExpatHelpSelect: React.FC<ExpatHelpSelectProps> = React.memo(({
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
    if (!inputValue) return expatHelpTypesData.filter(t => !t.disabled);
    const q = normalize(inputValue);
    return expatHelpTypesData.filter(t => !t.disabled).filter(t => {
      const label = getLocalizedLabel(t, currentLocale, t.code);
      return [label, t.code].some(f => normalize(f).includes(q));
    });
  }, [inputValue, currentLocale]);

  const options = useMemo<ExpatHelpOption[]>(() => {
    return filtered.map(t => ({
      value: t.code,
      label: getLocalizedLabel(t, currentLocale, t.code),
      isShared: highlightShared && providerLanguages.includes(t.code),
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

  const styles = useMemo(() => makeAdaptiveStyles<ExpatHelpOption>(!!highlightShared), [highlightShared]);
  const defaultPlaceholder = useMemo(() => defaultPlaceholderByLocale[currentLocale], [currentLocale]);
  const noOptionsMessage = useCallback(({ inputValue }: { inputValue: string }) => {
    return currentLocale === 'fr'
      ? (inputValue ? `Aucune catÃ©gorie trouvÃ©e pour "${inputValue}"` : 'Aucune catÃ©gorie disponible')
      : (inputValue ? `No category found for "${inputValue}"` : 'No categories available');
  }, [currentLocale]);

  return (
    <Select<ExpatHelpOption, true>
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

ExpatHelpSelect.displayName = 'ExpatHelpSelect';
export default ExpatHelpSelect;
