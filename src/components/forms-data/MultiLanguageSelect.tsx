// ========================================
// src/components/forms-data/MultiLanguageSelect.tsx - VERSION MULTILINGUE CORRIGÉE
// ========================================

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Select, { MultiValue, StylesConfig, components, OptionProps } from 'react-select';
import Fuse from 'fuse.js';
import languages, { 
  Language, 
  getDetectedBrowserLanguage, 
  searchLanguages as searchLanguagesMultilingual,
  getSortedLanguages 
} from '../../data/Languages-spoken';

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
  locale?: 'fr' | 'en'; // Langue forcée depuis le contexte
  showLanguageToggle?: boolean;
}

// Composant personnalisé pour les options avec mise en évidence
const CustomOption: React.FC<OptionProps<LanguageOption, true>> = React.memo((props) => {
  const { data, isSelected } = props;
  
  return (
    <components.Option {...props}>
      <div className="flex items-center justify-between w-full">
        <span className={data.isShared ? 'font-medium' : ''}>
          {data.label}
        </span>
        {data.isShared && (
          <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full border border-green-200">
            ✓ Compatible
          </span>
        )}
      </div>
    </components.Option>
  );
});

CustomOption.displayName = 'CustomOption';

// Styles personnalisés pour react-select - mémorisé
const getCustomStyles = (highlightShared: boolean): StylesConfig<LanguageOption, true> => ({
  option: (provided, state) => {
    const { data } = state;
    let backgroundColor = provided.backgroundColor;
    let borderLeft = '';
    
    if (highlightShared && data.isShared) {
      if (state.isFocused) {
        backgroundColor = '#dcfce7'; // green-100 au hover
      } else {
        backgroundColor = '#f0fdf4'; // green-50 par défaut
      }
      borderLeft = '4px solid #22c55e'; // green-500
    }
    
    return {
      ...provided,
      backgroundColor,
      borderLeft,
      fontWeight: data.isShared ? '500' : '400',
      '&:hover': {
        backgroundColor: highlightShared && data.isShared ? '#dcfce7' : provided['&:hover']?.backgroundColor,
      }
    };
  },
  multiValue: (provided, state) => {
    const { data } = state;
    return {
      ...provided,
      backgroundColor: data.isShared ? '#dcfce7' : provided.backgroundColor,
      border: data.isShared ? '1px solid #22c55e' : '1px solid #d1d5db',
    };
  },
  multiValueLabel: (provided, state) => {
    const { data } = state;
    return {
      ...provided,
      color: data.isShared ? '#15803d' : provided.color,
      fontWeight: data.isShared ? '500' : '400',
    };
  },
});

const MultiLanguageSelect: React.FC<MultiLanguageSelectProps> = React.memo(({ 
  value, 
  onChange,
  providerLanguages = [],
  highlightShared = true,
  locale, // Langue reçue du contexte App
  showLanguageToggle = false
}) => {
  const [inputValue, setInputValue] = useState('');
  
  // 🔧 FIX: Utiliser d'abord la locale passée en prop, sinon détecter automatiquement
  const [currentLocale, setCurrentLocale] = useState<'fr' | 'en'>(
    locale || getDetectedBrowserLanguage()
  );
  
  // 🔧 FIX: Synchroniser avec la prop locale quand elle change
  useEffect(() => {
    if (locale) {
      setCurrentLocale(locale);
    }
  }, [locale]);

  // Mémoriser les langues selon la locale actuelle
  const currentLanguages = useMemo(() => {
    return getSortedLanguages(currentLocale);
  }, [currentLocale]);

  // Debug des langues chargées selon la locale
  useEffect(() => {
    console.log(`📚 Langues chargées (${currentLocale}):`, currentLanguages.length);
    console.log(`🌍 Langue détectée/forcée:`, currentLocale);
    console.log(`🎯 Langues du prestataire:`, providerLanguages.length);
    console.log(`📝 Exemple de langues chargées:`, currentLanguages.slice(0, 3).map(l => `${l.code}: ${l.name}`));
  }, [currentLanguages, currentLocale, providerLanguages]);

  // Filtrage multilingue des langues
  const filteredLanguages = useMemo((): Language[] => {
    if (!inputValue) return currentLanguages;
    
    return searchLanguagesMultilingual(inputValue, currentLocale);
  }, [inputValue, currentLanguages, currentLocale]);

  // Mémoriser les options avec la bonne locale
  const options = useMemo((): LanguageOption[] => {
    return filteredLanguages.map(lang => {
      const isShared = highlightShared && providerLanguages.includes(lang.code);
      
      return {
        value: lang.code,
        label: lang.name, // Déjà dans la bonne langue grâce à currentLanguages
        isShared
      };
    });
  }, [filteredLanguages, highlightShared, providerLanguages]);

  // Options triées (compatibles en premier)
  const sortedOptions = useMemo(() => {
    if (!highlightShared) return options;
    
    return [...options].sort((a, b) => {
      if (a.isShared && !b.isShared) return -1;
      if (!a.isShared && b.isShared) return 1;
      return 0;
    });
  }, [options, highlightShared]);

  // Styles mémorisés
  const customStyles = useMemo(() => getCustomStyles(highlightShared), [highlightShared]);

  // Callbacks mémorisés
  const handleInputChange = useCallback((input: string) => {
    setInputValue(input);
    return input;
  }, []);

  // Message "aucune option" adapté à la langue
  const noOptionsMessage = useCallback(({ inputValue }: { inputValue: string }) => {
    if (currentLocale === 'fr') {
      return inputValue ? `Aucune langue trouvée pour "${inputValue}"` : "Aucune langue disponible";
    } else {
      return inputValue ? `No language found for "${inputValue}"` : "No languages available";
    }
  }, [currentLocale]);

  // Placeholder adapté à la langue
  const placeholder = useMemo(() => {
    return currentLocale === 'fr' ? "Sélectionnez les langues" : "Select languages";
  }, [currentLocale]);

  // Statistiques
  const stats = useMemo(() => {
    if (!highlightShared || providerLanguages.length === 0) return null;
    
    const compatibleCount = sortedOptions.filter(opt => opt.isShared).length;
    const totalCount = sortedOptions.length;
    
    return { compatibleCount, totalCount };
  }, [highlightShared, providerLanguages.length, sortedOptions]);

  // Fonction pour changer de langue (uniquement si showLanguageToggle est true)
  const handleLocaleChange = useCallback((newLocale: 'fr' | 'en') => {
    setCurrentLocale(newLocale);
    setInputValue(''); // Reset search
    
    // Optionnel: sauvegarder la préférence
    localStorage.setItem('languageSelectLocale', newLocale);
  }, []);

  return (
    <div className="w-full">
      {/* Toggle de langue (affiché seulement si demandé) */}
      {showLanguageToggle && (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {currentLocale === 'fr' ? 'Affichage:' : 'Display:'}
          </span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => handleLocaleChange('fr')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                currentLocale === 'fr' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🇫🇷 Français
            </button>
            <button
              type="button"
              onClick={() => handleLocaleChange('en')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                currentLocale === 'en' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🇺🇸 English
            </button>
          </div>
        </div>
      )}

      {/* Légende pour les langues partagées */}
      {highlightShared && providerLanguages.length > 0 && (
        <div className="mb-2 flex items-center text-sm text-gray-600">
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 bg-green-100 border-l-4 border-green-500 mr-2"></div>
            <span>
              {currentLocale === 'fr' 
                ? 'Langues compatibles avec le prestataire' 
                : 'Languages compatible with provider'
              }
            </span>
          </div>
        </div>
      )}
      
      <Select<LanguageOption, true>
        isMulti
        options={sortedOptions}
        onChange={onChange}
        onInputChange={handleInputChange}
        value={value}
        placeholder={placeholder}
        className="w-full"
        components={{
          Option: CustomOption
        }}
        styles={customStyles}
        // Configuration pour améliorer l'UX
        closeMenuOnSelect={false}
        hideSelectedOptions={false}
        blurInputOnSelect={false}
        // Message personnalisé quand aucune option n'est trouvée
        noOptionsMessage={noOptionsMessage}
      />
      
      {/* Statistiques */}
      {stats && (
        <div className="mt-2 text-xs text-gray-500">
          {currentLocale === 'fr' 
            ? `${stats.compatibleCount} langue(s) compatible(s) sur ${stats.totalCount} disponible(s)`
            : `${stats.compatibleCount} compatible language(s) out of ${stats.totalCount} available`
          }
        </div>
      )}

     
    </div>
  );
});

MultiLanguageSelect.displayName = 'MultiLanguageSelect';

export default MultiLanguageSelect;