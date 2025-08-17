// ========================================
// SpecialtySelect.tsx — Multi-select of lawyer specialties (grouped)
// ========================================
import React, { useState, useMemo, useCallback } from 'react';
import Select, { MultiValue, GroupBase } from 'react-select';
import { lawyerSpecialitiesData } from '@/data'; // index.ts re-exports the correct file
import { Locale, getDetectedBrowserLanguage, normalize, getLocalizedLabel, defaultPlaceholderByLocale, makeAdaptiveStyles, SharedOption } from './shared';

export interface SpecialtyOption extends SharedOption {}

interface SpecialtySelectProps {
  value?: MultiValue<SpecialtyOption>;
  onChange: (selectedOptions: MultiValue<SpecialtyOption>) => void;
  providerLanguages?: string[];
  highlightShared?: boolean;
  locale?: Locale;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

type GroupedOptions = {
  label: string;
  options: SpecialtyOption[];
};

const SpecialtySelect: React.FC<SpecialtySelectProps> = React.memo(({
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

  // Build grouped options with search filtering
  const groupedOptions = useMemo<GroupedOptions[]>(() => {
    const q = normalize(inputValue);
    return lawyerSpecialitiesData.map(group => {
      const glabel = getLocalizedLabel(group, currentLocale, group.groupName);
      const items = group.items
        .filter(item => {
          if (!q) return true;
          const ilabel = getLocalizedLabel(item, currentLocale, item.code);
          // match against item, group, and code
          return [ilabel, glabel, item.code].some(f => normalize(f).includes(q));
        })
        .map(item => {
          const ilabel = getLocalizedLabel(item, currentLocale, item.code);
          return {
            value: item.code,
            label: ilabel,
            isShared: highlightShared && providerLanguages.includes(item.code)
          } as SpecialtyOption;
        });

      return { label: glabel, options: items };
    }).filter(g => g.options.length > 0);
  }, [inputValue, currentLocale, highlightShared, providerLanguages]);

  // When highlightShared, sort within each group
  const sortedGroupedOptions = useMemo(() => {
    if (!highlightShared) return groupedOptions;
    return groupedOptions.map(g => ({
      ...g,
      options: [...g.options].sort((a, b) => (a.isShared === b.isShared) ? 0 : (a.isShared ? -1 : 1))
    }));
  }, [groupedOptions, highlightShared]);

  const handleInputChange = useCallback((input: string) => {
    setInputValue(input);
    return input;
  }, []);

  const styles = useMemo(() => makeAdaptiveStyles<SpecialtyOption>(!!highlightShared), [highlightShared]);
  const defaultPlaceholder = useMemo(() => defaultPlaceholderByLocale[currentLocale], [currentLocale]);
  const noOptionsMessage = useCallback(({ inputValue }: { inputValue: string }) => {
    return currentLocale === 'fr'
      ? (inputValue ? `Aucune spécialité trouvée pour "${inputValue}"` : 'Aucune spécialité disponible')
      : (inputValue ? `No specialty found for "${inputValue}"` : 'No specialties available');
  }, [currentLocale]);

  return (
    <Select<SpecialtyOption, true, GroupBase<SpecialtyOption>>
      isMulti
      options={sortedGroupedOptions}
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

SpecialtySelect.displayName = 'SpecialtySelect';
export default SpecialtySelect;

