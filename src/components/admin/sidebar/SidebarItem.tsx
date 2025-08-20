// src/components/admin/sidebar/SidebarItem.tsx
import React, { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, Dot } from "lucide-react";

export interface MenuNode {
  id: string;
  label: string;
  path?: string;
  children?: MenuNode[];
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  description?: string;
}

interface SidebarItemProps {
  node: MenuNode;
  level?: number;
  isSidebarCollapsed?: boolean;
  onItemClick?: (node: MenuNode) => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  node, 
  level = 0, 
  isSidebarCollapsed = false,
  onItemClick 
}) => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const hasChildren = node.children && node.children.length > 0;
  const isRootLevel = level === 0;
  const isSecondLevel = level === 1;
  const isThirdLevel = level === 2;

  // DEBUG: Tracer les rendus
  console.log(`🔍 SidebarItem rendu: ${node.label} (level: ${level}, collapsed: ${isSidebarCollapsed})`);

  // Vérifier si cet élément ou un de ses enfants est actif
  const isActiveOrHasActiveChild = useMemo(() => {
    if (node.path && location.pathname === node.path) {
      return true;
    }
    
    if (hasChildren) {
      const checkActiveInChildren = (children: MenuNode[]): boolean => {
        return children.some(child => {
          if (child.path && location.pathname === child.path) {
            return true;
          }
          if (child.children) {
            return checkActiveInChildren(child.children);
          }
          return false;
        });
      };
      return checkActiveInChildren(node.children!);
    }
    
    return false;
  }, [node, location.pathname, hasChildren]);

  // Vérifier si c'est exactement cette page qui est active (pas un enfant)
  const isExactlyActive = node.path && location.pathname === node.path;

  // Auto-expand si contient un élément actif
  useEffect(() => {
    if (isActiveOrHasActiveChild && hasChildren) {
      setIsExpanded(true);
    }
  }, [isActiveOrHasActiveChild, hasChildren]);

  // Styles basés sur le niveau et l'état
  const getContainerStyles = () => {
    if (isRootLevel) {
      return "mb-2";
    }
    if (isSecondLevel) {
      return "ml-6 mb-1";
    }
    if (isThirdLevel) {
      return "ml-10 mb-1";
    }
    return "ml-12 mb-1";
  };

  const getButtonStyles = () => {
    const baseStyles = "w-full flex items-center justify-between rounded-md text-sm transition-all duration-200 group";
    
    if (isRootLevel) {
      // Onglets principaux : TOUJOURS surlignés en gris - FORCE avec !important
      const textColor = isExactlyActive ? "!text-gray-900" : "!text-gray-700";
      return `${baseStyles} px-3 py-3 font-semibold ${textColor} !bg-gray-300 hover:!bg-gray-400`;
    }
    
    if (isSecondLevel) {
      // Sous-onglets : transparents, seulement texte rouge si actif
      const textColor = isExactlyActive ? "!text-red-400" : "!text-gray-300 hover:!text-gray-100";
      return `${baseStyles} px-3 py-2.5 font-medium ${textColor} !bg-transparent hover:!bg-transparent`;
    }
    
    if (isThirdLevel) {
      // Sous-sous-onglets : transparents, seulement texte rouge si actif
      const textColor = isExactlyActive ? "!text-red-400" : "!text-gray-400 hover:!text-gray-200";
      return `${baseStyles} px-3 py-2 font-normal ${textColor} !bg-transparent hover:!bg-transparent`;
    }
    
    // Fallback pour niveaux plus profonds
    const textColor = isExactlyActive ? "!text-red-400" : "!text-gray-500 hover:!text-gray-300";
    return `${baseStyles} px-2 py-1.5 font-normal ${textColor} !bg-transparent hover:!bg-transparent`;
  };

  const getLinkStyles = (isActive: boolean) => {
    const baseStyles = "w-full flex items-center rounded-md text-sm transition-all duration-200 group text-left";
    
    if (isRootLevel) {
      // Onglets principaux : TOUJOURS surlignés en gris - FORCE avec !important
      const textColor = isActive ? "!text-gray-900" : "!text-gray-700";
      return `${baseStyles} px-3 py-3 font-semibold ${textColor} !bg-gray-300 hover:!bg-gray-400`;
    }
    
    if (isSecondLevel) {
      // Sous-onglets : transparents, seulement texte rouge si actif
      const textColor = isActive ? "!text-red-400" : "!text-gray-300 hover:!text-gray-100";
      return `${baseStyles} px-3 py-2.5 font-medium ${textColor} !bg-transparent hover:!bg-transparent`;
    }
    
    if (isThirdLevel) {
      // Sous-sous-onglets : transparents, seulement texte rouge si actif
      const textColor = isActive ? "!text-red-400" : "!text-gray-400 hover:!text-gray-200";
      return `${baseStyles} px-3 py-2 font-normal ${textColor} !bg-transparent hover:!bg-transparent`;
    }
    
    // Fallback pour niveaux plus profonds
    const textColor = isActive ? "!text-red-400" : "!text-gray-500 hover:!text-gray-300";
    return `${baseStyles} px-2 py-1.5 font-normal ${textColor} !bg-transparent hover:!bg-transparent`;
  };

  const getIconSize = () => {
    if (isRootLevel) return 20;
    if (isSecondLevel) return 18;
    if (isThirdLevel) return 16;
    return 14;
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    
    if (onItemClick) {
      onItemClick(node);
    }
  };

  const handleItemClick = () => {
    if (onItemClick) {
      onItemClick(node);
    }
  };

  // Rendu du badge si présent
  const renderBadge = () => {
    if (!node.badge) return null;
    
    const badgeStyles = "ml-2 px-2 py-0.5 text-xs bg-gray-600 text-gray-200 rounded-full font-medium";
    
    return (
      <span className={badgeStyles}>
        {node.badge}
      </span>
    );
  };

  // Rendu de l'icône
  const renderIcon = () => {
    if (isSidebarCollapsed && !isRootLevel) return null;
    
    const iconSize = getIconSize();
    const iconMargin = isRootLevel ? "mr-3" : isSecondLevel ? "mr-3" : "mr-2";
    
    if (node.icon) {
      return (
        <node.icon 
          size={iconSize} 
          className={`${iconMargin} flex-shrink-0 transition-colors duration-200 ${
            isRootLevel 
              ? (isExactlyActive ? '!text-gray-900' : '!text-gray-700')
              : (isExactlyActive ? '!text-red-400' : '')
          }`} 
        />
      );
    }
    
    // Icône par défaut pour les éléments sans icône (niveaux profonds)
    if (isThirdLevel || level > 2) {
      return (
        <Dot 
          size={iconSize} 
          className={`${iconMargin} flex-shrink-0 transition-colors duration-200 ${
            isRootLevel 
              ? (isExactlyActive ? 'text-gray-900' : 'text-gray-700')
              : (isExactlyActive ? 'text-red-400' : '')
          }`} 
        />
      );
    }
    
    return null;
  };

  // Rendu du chevron pour les éléments expandables
  const renderChevron = () => {
    if (!hasChildren || (isSidebarCollapsed && isRootLevel)) return null;
    
    const chevronSize = isRootLevel ? 18 : 16;
    
    return (
      <div className="ml-auto flex-shrink-0 transition-transform duration-200">
        {isExpanded ? (
          <ChevronDown size={chevronSize} className="transition-transform duration-200" />
        ) : (
          <ChevronRight size={chevronSize} className="transition-transform duration-200" />
        )}
      </div>
    );
  };

  // Rendu du label avec gestion de la troncature
  const renderLabel = () => {
    if (isSidebarCollapsed && isRootLevel) {
      return (
        <span className="sr-only">
          {node.label}
        </span>
      );
    }
    
    return (
      <span className="truncate">
        {node.label}
      </span>
    );
  };

  // Rendu du tooltip pour sidebar collapsed
  const renderTooltip = () => {
    if (!isSidebarCollapsed || !isRootLevel) return null;
    
    return (
      <div className="invisible group-hover:visible absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
        {node.label}
        {node.description && (
          <div className="text-gray-300 text-xs mt-1">
            {node.description}
          </div>
        )}
      </div>
    );
  };

  // Si c'est un groupe avec enfants
  if (hasChildren) {
    return (
      <div className={getContainerStyles()}>
        {/* Header du groupe */}
        <button
          onClick={handleToggleExpand}
          className={getButtonStyles()}
          title={node.description}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Réduire' : 'Étendre'} ${node.label}`}
        >
          <div className="flex items-center min-w-0 flex-1">
            {renderIcon()}
            <span className={`truncate ${
              isRootLevel 
                ? (isExactlyActive ? 'text-gray-900' : 'text-gray-700')
                : (isExactlyActive ? 'text-red-400' : '')
            }`}>
              {node.label}
            </span>
            {renderBadge()}
          </div>
          {renderChevron()}
          {renderTooltip()}
        </button>

        {/* Enfants - ATTENTION: Condition stricte pour éviter double rendu */}
        {isExpanded && !isSidebarCollapsed && node.children && (
          <div className="mt-2 space-y-1 transition-all duration-200">
            {node.children.map((child) => (
              <SidebarItem 
                key={child.id} 
                node={child} 
                level={level + 1}
                isSidebarCollapsed={isSidebarCollapsed}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Si c'est un lien terminal
  return (
    <div className={getContainerStyles()}>
      <NavLink
        to={node.path || "#"}
        className={({ isActive }) => getLinkStyles(isActive)}
        onClick={handleItemClick}
        title={node.description}
        aria-label={node.label}
      >
        <div className="flex items-center min-w-0 flex-1">
          {renderIcon()}
          {renderLabel()}
          {renderBadge()}
        </div>
        {renderTooltip()}
      </NavLink>
    </div>
  );
};

export default SidebarItem;