// ========================================
// WhatsAppInput.tsx â€” Country dial code select + WhatsApp number input
// ========================================
import React, { useMemo, useState, useCallback } from 'react';
import Select from 'react-select';
import { phoneCodesData } from '@/data';
import { Locale, getDetectedBrowserLanguage, normalize, getLocalizedLabel, makeAdaptiveStyles, SharedOption } from './shared';

export interface WhatsAppValue {
  countryCode?: string | null;
  phoneCode?: string | null;
  number: string;
}

// Interface avec toutes les propriÃ©tÃ©s requises
export interface DialOption extends SharedOption {
  phoneCode: string;
  isShared?: boolean;
}

interface WhatsAppInputProps {
  value?: WhatsAppValue;
  onChange: (val: WhatsAppValue) => void;
  providerLanguages?: string[];
  highlightShared?: boolean;
  locale?: Locale;
  placeholder?: string; // placeholder for the select
  className?: string;
  disabled?: boolean;
}

const WhatsAppInput: React.FC<WhatsAppInputProps> = React.memo(({
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
    if (!inputValue) return phoneCodesData.filter(r => !r.disabled);
    const q = normalize(inputValue);
    return phoneCodesData.filter(r => !r.disabled).filter(r => {
      // Correction: utiliser la bonne propriÃ©tÃ© selon la langue actuelle
      const label = getLocalizedLabel(r, currentLocale, r.code);
      return [label, r.code, r.phoneCode].some(f => normalize(f).includes(q));
    });
  }, [inputValue, currentLocale]);

  const options = useMemo<DialOption[]>(() => {
    return filtered.map(r => ({
      value: r.code,
      // Correction: utiliser la bonne propriÃ©tÃ© selon la langue actuelle
      label: `${getLocalizedLabel(r, currentLocale, r.code)} (${r.phoneCode})`,
      isShared: highlightShared && providerLanguages.includes(r.code),
      phoneCode: r.phoneCode
    }));
  }, [filtered, currentLocale, highlightShared, providerLanguages]);

  const sortedOptions = useMemo(() => {
    if (!highlightShared) return options;
    return [...options].sort((a, b) => (a.isShared === b.isShared) ? 0 : (a.isShared ? -1 : 1));
  }, [options, highlightShared]);

  const selected = useMemo(() => {
    if (!value?.countryCode) return null;
    const found = options.find(o => o.value === value.countryCode);
    // Correction: retourner l'objet complet avec toutes les propriÃ©tÃ©s requises
    return found ? { 
      value: found.value, 
      label: found.label, 
      isShared: found.isShared,
      phoneCode: found.phoneCode 
    } : null;
  }, [options, value?.countryCode]);

  const handleSelectChange = useCallback((opt: any) => {
    const chosen = options.find(o => o.value === opt?.value);
    const phoneCode = chosen?.phoneCode || null;
    onChange({ number: value?.number || '', countryCode: opt?.value || null, phoneCode });
  }, [onChange, options, value?.number]);

  const handleNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const number = e.target.value.replace(/[^\d\s().+\-]/g, '');
    onChange({ number, countryCode: value?.countryCode || null, phoneCode: value?.phoneCode || null });
  }, [onChange, value?.countryCode, value?.phoneCode]);

  const handleInputChange = useCallback((input: string) => {
    setInputValue(input);
    return input;
  }, []);

  // Correction: enlever le paramÃ¨tre gÃ©nÃ©rique qui n'est pas attendu
  const styles = useMemo(() => makeAdaptiveStyles(!!highlightShared), [highlightShared]);

  const numberPlaceholder = currentLocale === 'fr' ? 'NumÃ©ro WhatsApp' : 'WhatsApp number';
  const selectPlaceholder = placeholder || (currentLocale === 'fr' ? 'Indicatif' : 'Dial code');

  return (
    <div className={className} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <div style={{ minWidth: '12rem', flex: '0 0 auto' }}>
        <Select<DialOption, false>
          isMulti={false}
          options={sortedOptions}
          onChange={handleSelectChange}
          onInputChange={handleInputChange}
          value={selected}
          placeholder={selectPlaceholder}
          classNamePrefix="react-select"
          styles={styles}
          closeMenuOnSelect={true}
          hideSelectedOptions={false}
          blurInputOnSelect={false}
          isSearchable={true}
          isDisabled={disabled}
          noOptionsMessage={({ inputValue }) => currentLocale === 'fr'
            ? (inputValue ? `Aucun indicatif trouvÃ© pour "${inputValue}"` : 'Aucun indicatif disponible')
            : (inputValue ? `No dial code found for "${inputValue}"` : 'No dial codes available')
          }
          filterOption={() => true}
        />
      </div>
      <input
        type="tel"
        inputMode="tel"
        pattern="[0-9()+\-.\s]*"
        value={value?.number || ''}
        onChange={handleNumberChange}
        placeholder={numberPlaceholder}
        disabled={disabled}
        style={{
          flex: '1 1 auto',
          border: 'none',
          background: 'transparent',
          outline: 'none',
          font: 'inherit',
          padding: 0,
          margin: 0
        }}
        aria-label={numberPlaceholder}
      />
    </div>
  );
});

WhatsAppInput.displayName = 'WhatsAppInput';
export default WhatsAppInput;
