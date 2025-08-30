// ========================================
// CountrySelect.tsx â€” Multi-select of countries (pattern-matched to MultiLanguageSelect)
// ========================================
import React, { useState, useMemo, useCallback } from 'react';
import Select, { MultiValue } from 'react-select';
import { countriesData } from '@/data';
import { Locale, getDetectedBrowserLanguage, normalize, getLocalizedLabel, defaultPlaceholderByLocale, makeAdaptiveStyles, SharedOption } from './shared';

export interface CountryOption extends SharedOption {}

interface CountrySelectProps {
  value?: MultiValue<CountryOption>;
  onChange: (selectedOptions: MultiValue<CountryOption>) => void;
  providerLanguages?: string[];
  highlightShared?: boolean;
  locale?: Locale;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const CountrySelect: React.FC<CountrySelectProps> = React.memo(({
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
    if (!inputValue) return countriesData;
    const q = normalize(inputValue);
    return countriesData.filter(c => {
      const label = getLocalizedLabel(c, currentLocale, c.code);
      const fields = [
        label,
        c.code,
        c.flag || ''
      ];
      return fields.some(f => normalize(f).includes(q));
    });
  }, [inputValue, currentLocale]);

  const options = useMemo<CountryOption[]>(() => {
    return filtered.map(c => ({
      value: c.code,
      label: `${c.flag ? c.flag + ' ' : ''}${getLocalizedLabel(c, currentLocale, c.code)}`,
      isShared: highlightShared && providerLanguages.includes(c.code),
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

  const styles = useMemo(() => makeAdaptiveStyles<CountryOption>(!!highlightShared), [highlightShared]);
  const defaultPlaceholder = useMemo(() => defaultPlaceholderByLocale[currentLocale], [currentLocale]);
  const noOptionsMessage = useCallback(({ inputValue }: { inputValue: string }) => {
    return currentLocale === 'fr'
      ? (inputValue ? `Aucun pays trouvÃ© pour "${inputValue}"` : 'Aucun pays disponible')
      : (inputValue ? `No country found for "${inputValue}"` : 'No countries available');
  }, [currentLocale]);

  return (
    <Select<CountryOption, true>
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

CountrySelect.displayName = 'CountrySelect';
export default CountrySelect;
