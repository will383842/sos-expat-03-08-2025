// ========================================
// src/components/forms-data/MultiLanguageSelect.tsx
// ========================================

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Select, { MultiValue, StylesConfig, components, OptionProps } from 'react-select';
import Fuse from 'fuse.js';
import languages, { Language } from '../../data/Languages-spoken';

interface LanguageOption {
  value: string;
  label: string;
  isShared?: boolean; // Nouvelle propriété pour identifier les langues partagées
}

interface MultiLanguageSelectProps {
  value?: MultiValue<LanguageOption>;
  onChange: (selectedOptions: MultiValue<LanguageOption>) => void;
  providerLanguages?: string[]; // Langues du prestataire pour comparaison
  highlightShared?: boolean; // Option pour activer/désactiver la mise en évidence
}

// 🔧 FIX: Créer fuse en dehors du composant pour éviter les re-créations
const fuse = new Fuse(languages, {
  keys: ['name'],
  threshold: 0.3,
});

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
  highlightShared = true
}) => {
  const [inputValue, setInputValue] = useState('');
  
  // 🔧 FIX: Déplacer les logs dans useEffect pour éviter les logs à chaque rendu
  useEffect(() => {
    console.log("📚 Langues chargées :", languages.length);
  }, []); // Une seule fois au montage

  useEffect(() => {
    console.log("🎯 Langues du prestataire :", providerLanguages.length);
  }, [providerLanguages]); // Seulement quand providerLanguages change

  // 🔧 FIX: Mémoriser les langues filtrées pour éviter les re-calculs
  const filteredLanguages = useMemo((): Language[] => {
    if (!inputValue) return languages;
    return fuse.search(inputValue).map(res => res.item);
  }, [inputValue]);

  // 🔧 FIX: Mémoriser les options pour éviter les re-créations
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

  // 🔧 FIX: Mémoriser les options triées
  const sortedOptions = useMemo(() => {
    if (!highlightShared) return options;
    
    return [...options].sort((a, b) => {
      if (a.isShared && !b.isShared) return -1;
      if (!a.isShared && b.isShared) return 1;
      return 0;
    });
  }, [options, highlightShared]);

  // 🔧 FIX: Mémoriser les styles pour éviter les re-créations
  const customStyles = useMemo(() => getCustomStyles(highlightShared), [highlightShared]);

  // 🔧 FIX: Callback mémorisé pour onInputChange
  const handleInputChange = useCallback((input: string) => {
    setInputValue(input);
    return input;
  }, []);

  // 🔧 FIX: Callback mémorisé pour noOptionsMessage
  const noOptionsMessage = useCallback(({ inputValue }: { inputValue: string }) => 
    inputValue ? `Aucune langue trouvée pour "${inputValue}"` : "Aucune langue disponible"
  , []);

  // 🔧 FIX: Mémoriser les statistiques
  const stats = useMemo(() => {
    if (!highlightShared || providerLanguages.length === 0) return null;
    
    const compatibleCount = sortedOptions.filter(opt => opt.isShared).length;
    const totalCount = sortedOptions.length;
    
    return { compatibleCount, totalCount };
  }, [highlightShared, providerLanguages.length, sortedOptions]);

  return (
    <div className="w-full">
      {/* Légende pour les langues partagées */}
      {highlightShared && providerLanguages.length > 0 && (
        <div className="mb-2 flex items-center text-sm text-gray-600">
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 bg-green-100 border-l-4 border-green-500 mr-2"></div>
            <span>Langues compatibles avec le prestataire</span>
          </div>
        </div>
      )}
      
      <Select<LanguageOption, true>
        isMulti
        options={sortedOptions}
        onChange={onChange}
        onInputChange={handleInputChange}
        value={value}
        placeholder="Sélectionnez les langues"
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
      
      {/* Statistiques optionnelles */}
      {stats && (
        <div className="mt-2 text-xs text-gray-500">
          {stats.compatibleCount} langue(s) compatible(s) 
          sur {stats.totalCount} disponible(s)
        </div>
      )}
    </div>
  );
});

MultiLanguageSelect.displayName = 'MultiLanguageSelect';

export default MultiLanguageSelect;