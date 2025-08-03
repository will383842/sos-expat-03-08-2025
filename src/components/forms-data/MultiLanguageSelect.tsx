// ========================================
// src/components/forms-data/MultiLanguageSelect.tsx
// ========================================

import React, { useState } from 'react';
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

const fuse = new Fuse(languages, {
  keys: ['name'],
  threshold: 0.3,
});

// Composant personnalisé pour les options avec mise en évidence
const CustomOption: React.FC<OptionProps<LanguageOption, true>> = (props) => {
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
};

// Styles personnalisés pour react-select
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

const MultiLanguageSelect: React.FC<MultiLanguageSelectProps> = ({ 
  value, 
  onChange,
  providerLanguages = [],
  highlightShared = true
}) => {
  const [inputValue, setInputValue] = useState('');
  
  console.log("📚 Langues chargées :", languages);
  console.log("🎯 Langues du prestataire :", providerLanguages);

  const filteredLanguages: Language[] = inputValue 
    ? fuse.search(inputValue).map(res => res.item)
    : languages;

  // Création des options avec identification des langues partagées
  const options: LanguageOption[] = filteredLanguages.map(lang => {
    const isShared = highlightShared && providerLanguages.includes(lang.code);
    
    return {
      value: lang.code,
      label: lang.name,
      isShared
    };
  });

  // Tri des options : langues partagées en premier si la mise en évidence est activée
  const sortedOptions = highlightShared 
    ? [...options].sort((a, b) => {
        if (a.isShared && !b.isShared) return -1;
        if (!a.isShared && b.isShared) return 1;
        return 0;
      })
    : options;

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
        onInputChange={(input) => {
          setInputValue(input);
          return input;
        }}
        value={value}
        placeholder="Sélectionnez les langues"
        className="w-full"
        components={{
          Option: CustomOption
        }}
        styles={getCustomStyles(highlightShared)}
        // Configuration pour améliorer l'UX
        closeMenuOnSelect={false}
        hideSelectedOptions={false}
        blurInputOnSelect={false}
        // Message personnalisé quand aucune option n'est trouvée
        noOptionsMessage={({ inputValue }) => 
          inputValue ? `Aucune langue trouvée pour "${inputValue}"` : "Aucune langue disponible"
        }
      />
      
      {/* Statistiques optionnelles */}
      {highlightShared && providerLanguages.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {sortedOptions.filter(opt => opt.isShared).length} langue(s) compatible(s) 
          sur {sortedOptions.length} disponible(s)
        </div>
      )}
    </div>
  );
};

export default MultiLanguageSelect;