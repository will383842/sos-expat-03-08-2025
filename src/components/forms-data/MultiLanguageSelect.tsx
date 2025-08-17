// ========================================
// src/components/forms-data/MultiLanguageSelect.tsx - VERSION ADAPTATIVE
// ========================================

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Select, { MultiValue, StylesConfig } from 'react-select';
import {
  Language,
  getDetectedBrowserLanguage,
  searchLanguages as searchLanguagesMultilingual,
  getSortedLanguages,
  languagesData
} from '../../data/languages-spoken';

interface LanguageOption {
  value: string;
  label: string;
  isShared?: boolean;
}

interface MultiLanguageSelectProps {
  value?: MultiValue<LanguageOption>;
  onChange: (selectedOptions: MultiValue<LanguageOption>) => void;
  providerLanguages?: string[];
  highlightShared?: boolean;
  locale?: 'fr' | 'en';
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MultiLanguageSelect: React.FC<MultiLanguageSelectProps> = React.memo(({ 
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
  
  // 🎯 PRIORITÉ : locale prop > détection automatique
  const currentLocale = useMemo<'fr' | 'en'>(() => {
    // Si une locale est explicitement passée, l'utiliser
    if (locale) {
      return locale;
    }
    // Sinon détecter automatiquement
    return getDetectedBrowserLanguage() as 'fr' | 'en';
  }, [locale]);

  // Langues selon la locale
  const currentLanguages = useMemo(() => {
    return getSortedLanguages(languagesData);
  }, [currentLocale]);

  // Filtrage des langues
  const filteredLanguages = useMemo((): Language[] => {
    if (!inputValue) return currentLanguages;
    return searchLanguagesMultilingual(inputValue);
  }, [inputValue, currentLanguages, currentLocale]);

  // Options avec compatibilité
  const options = useMemo((): LanguageOption[] => {
    return filteredLanguages.map(lang => {
      const isShared = highlightShared && providerLanguages.includes(lang.code);
      
      return {
        value: lang.code,
        label: lang.name,
        isShared
      };
    });
  }, [filteredLanguages, highlightShared, providerLanguages]);

  // Trier les options (compatibles en premier)
  const sortedOptions = useMemo(() => {
    if (!highlightShared) return options;
    
    return [...options].sort((a, b) => {
      if (a.isShared && !b.isShared) return -1;
      if (!a.isShared && b.isShared) return 1;
      return 0;
    });
  }, [options, highlightShared]);

  // 🎯 STYLES COMPLÈTEMENT ADAPTATIFS - Hérite du parent
  const adaptiveStyles: StylesConfig<LanguageOption, true> = {
    control: (provided, state) => ({
      ...provided,
      // Réinitialiser tous les styles pour hériter du parent
    border: state.isFocused
      ? '2px solid var(--input-border-focus, #dc2626)' // rouge (équivalent focus:ring-red-500/border-red-600)
      : '2px solid var(--input-border, #e5e7eb)',       // gris-200
   backgroundColor: 'var(--input-bg, #ffffff)',
     boxShadow: 'none',
     minHeight: '3rem',    // approx. py-3
     height: 'auto',
     borderRadius: '0.75rem', // rounded-xl
     fontSize: 'inherit',
     fontFamily: 'inherit',
     color: 'inherit',
    cursor: 'inherit',
     padding: '0.5rem 0.75rem', // approx. px-3 py-2
     margin: '0',

      outline: 'none',
      // Supprimer les transitions pour éviter les conflits
      transition: 'none',
      '&:hover': {
        border: 'none',
        boxShadow: 'none'
      }
    }),
    
    valueContainer: (provided) => ({
      ...provided,
      padding: '0',
      margin: '0',
      flexWrap: 'wrap',
      gap: '0.5rem', // Espacement entre les pills
      minHeight: 'inherit'
    }),
    
    placeholder: (provided) => ({
      ...provided,
      // Hériter de la couleur et taille du parent
      color: 'inherit',
      fontSize: 'inherit',
      fontFamily: 'inherit',
      opacity: 0.5, // Juste un peu plus transparent
      margin: '0',
      position: 'absolute',
      left: '0',
      top: '50%',
      transform: 'translateY(-50%)'
    }),
    
    input: (provided) => ({
      ...provided,
      color: 'inherit',
      fontSize: 'inherit',
      fontFamily: 'inherit',
      margin: '0',
      padding: '0',
      border: 'none',
      outline: 'none',
      background: 'transparent'
    }),
    
    // Le menu utilise des styles standards mais adaptatifs
    menu: (provided) => ({
      ...provided,
      // Garder quelques styles pour la lisibilité
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem', // 12px
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      marginTop: '0.25rem',
      zIndex: 9999
    }),
    
    menuList: (provided) => ({
      ...provided,
      padding: '0.5rem',
      maxHeight: '200px'
    }),
    
    option: (provided, state) => {
      const { data } = state;
      return {
        ...provided,
        padding: '0.75rem 1rem',
        borderRadius: '0.5rem',
        margin: '0.125rem 0',
        cursor: 'pointer',
        fontSize: '0.875rem',
        backgroundColor: state.isFocused 
          ? (highlightShared && data.isShared ? '#f0fdf4' : '#f8fafc')
          : 'transparent',
        color: data.isShared ? '#374151' : '#6b7280',
        fontWeight: data.isShared ? '500' : '400',
        border: state.isFocused && highlightShared && data.isShared 
          ? '1px solid #10b981' 
          : 'none',
        '&:active': {
          backgroundColor: state.isFocused 
            ? (highlightShared && data.isShared ? '#f0fdf4' : '#f8fafc')
            : 'transparent'
        }
      };
    },
    
    // 🎨 PILLS ADAPTATIFS - Héritent du style de la page
    multiValue: (provided, state) => {
      const { data } = state;
      return {
        ...provided,
        // Base adaptative - hérite des variables CSS de la page
        backgroundColor: data.isShared ? 'var(--color-success-bg, #f0fdf4)' : 'var(--color-primary-bg, #eff6ff)',
        border: data.isShared ? '1px solid var(--color-success-border, #bbf7d0)' : '1px solid var(--color-primary-border, #dbeafe)',
        borderRadius: 'var(--border-radius-pill, 9999px)', // Par défaut très arrondi
        margin: '0.125rem',
        fontSize: 'var(--font-size-sm, 0.875rem)',
        fontWeight: 'var(--font-weight-medium, 500)',
        padding: '0',
        // Transition adaptative
        transition: 'var(--transition-all, all 0.2s ease)',
        '&:hover': {
          transform: 'var(--transform-hover, scale(1.05))',
          boxShadow: 'var(--shadow-hover, 0 2px 4px rgba(0,0,0,0.1))'
        }
      };
    },
    
    multiValueLabel: (provided, state) => {
      const { data } = state;
      return {
        ...provided,
        color: data.isShared ? 'var(--color-success-text, #166534)' : 'var(--color-primary-text, #1e40af)',
        padding: '0.375rem 0.75rem',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem'
      };
    },
    
    multiValueRemove: (provided, state) => {
      const { data } = state;
      return {
        ...provided,
        padding: '0.375rem',
        borderRadius: '0 var(--border-radius-pill, 9999px) var(--border-radius-pill, 9999px) 0',
        color: 'var(--color-text-muted, #6b7280)',
        backgroundColor: 'transparent',
        '&:hover': {
          backgroundColor: 'var(--color-danger-bg, #fef2f2)',
          color: 'var(--color-danger-text, #dc2626)'
        }
      };
    },
    
    indicatorSeparator: () => ({
      display: 'none'
    }),
    
    dropdownIndicator: (provided) => ({
      ...provided,
      color: 'inherit',
      opacity: 0.5,
      padding: '0.5rem',
      '&:hover': {
        opacity: 0.8
      }
    }),
    
    noOptionsMessage: (provided) => ({
      ...provided,
      fontSize: '0.875rem',
      color: '#6b7280',
      padding: '1rem'
    })
  };

  // Gestion de la recherche
  const handleInputChange = useCallback((input: string) => {
    setInputValue(input);
    return input;
  }, []);

  // Message "aucune option"
  const noOptionsMessage = useCallback(({ inputValue }: { inputValue: string }) => {
    if (currentLocale === 'fr') {
      return inputValue ? `Aucune langue trouvée pour "${inputValue}"` : "Aucune langue disponible";
    } else {
      return inputValue ? `No language found for "${inputValue}"` : "No languages available";
    }
  }, [currentLocale]);

  // Placeholder par défaut
  const defaultPlaceholder = useMemo(() => {
    return currentLocale === 'fr' ? "Rechercher et sélectionner..." : "Search and select...";
  }, [currentLocale]);

  return (
    <Select<LanguageOption, true>
      isMulti
      options={sortedOptions}
      onChange={onChange}
      onInputChange={handleInputChange}
      value={value}
      placeholder={placeholder || defaultPlaceholder}
      className={className}
      classNamePrefix="react-select"
      styles={adaptiveStyles}
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

MultiLanguageSelect.displayName = 'MultiLanguageSelect';

export default MultiLanguageSelect;
