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

  // Auto-expand si contient un élément actif
  useEffect(() => {
    if (isActiveOrHasActiveChild && hasChildren) {
      setIsExpanded(true);
    }
  }, [isActiveOrHasActiveChild, hasChildren]);

  // Styles basés sur le niveau et l'état
  const getContainerStyles = () => {
    if (isRootLevel) {
      return "mb-1";
    }
    if (isSecondLevel) {
      return "ml-4 mb-0.5";
    }
    if (isThirdLevel) {
      return "ml-6 mb-0.5";
    }
    return "ml-2 mb-0.5";
  };

  const getButtonStyles = (isActive: boolean) => {
    const baseStyles = "w-full flex items-center justify-between rounded-md text-sm font-medium transition-all duration-200 group";
    
    if (isRootLevel) {
      if (isActive) {
        return `${baseStyles} px-3 py-2.5 bg-red-600 text-white shadow-sm`;
      }
      return `${baseStyles} px-3 py-2.5 text-gray-300 hover:bg-gray-800 hover:text-white`;
    }
    
    if (isSecondLevel) {
      if (isActive) {
        return `${baseStyles} px-3 py-2 bg-red-500 text-white shadow-sm`;
      }
      return `${baseStyles} px-3 py-2 text-gray-400 hover:bg-gray-700 hover:text-gray-200`;
    }
    
    if (isThirdLevel) {
      if (isActive) {
        return `${baseStyles} px-3 py-1.5 bg-red-400 text-white shadow-sm`;
      }
      return `${baseStyles} px-3 py-1.5 text-gray-500 hover:bg-gray-600 hover:text-gray-300`;
    }
    
    // Fallback pour niveaux plus profonds
    if (isActive) {
      return `${baseStyles} px-2 py-1.5 bg-red-300 text-white shadow-sm`;
    }
    return `${baseStyles} px-2 py-1.5 text-gray-500 hover:bg-gray-600 hover:text-gray-300`;
  };

  const getLinkStyles = (isActive: boolean) => {
    const baseStyles = "w-full flex items-center rounded-md text-sm transition-all duration-200 group text-left";
    
    if (isRootLevel) {
      if (isActive) {
        return `${baseStyles} px-3 py-2.5 bg-red-600 text-white shadow-sm border-l-4 border-red-400`;
      }
      return `${baseStyles} px-3 py-2.5 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-l-4 hover:border-red-500`;
    }
    
    if (isSecondLevel) {
      if (isActive) {
        return `${baseStyles} px-3 py-2 bg-red-500 text-white shadow-sm border-l-2 border-red-300`;
      }
      return `${baseStyles} px-3 py-2 text-gray-400 hover:bg-gray-700 hover:text-gray-200 hover:border-l-2 hover:border-red-400`;
    }
    
    if (isThirdLevel) {
      if (isActive) {
        return `${baseStyles} px-3 py-1.5 bg-red-400 text-white shadow-sm border-l border-red-200`;
      }
      return `${baseStyles} px-3 py-1.5 text-gray-500 hover:bg-gray-600 hover:text-gray-300 hover:border-l hover:border-red-300`;
    }
    
    // Fallback pour niveaux plus profonds
    if (isActive) {
      return `${baseStyles} px-2 py-1.5 bg-red-300 text-white shadow-sm`;
    }
    return `${baseStyles} px-2 py-1.5 text-gray-500 hover:bg-gray-600 hover:text-gray-300`;
  };

  const getIconSize = () => {
    if (isRootLevel) return 18;
    if (isSecondLevel) return 16;
    if (isThirdLevel) return 14;
    return 12;
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
    
    const badgeStyles = isRootLevel 
      ? "ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full font-medium"
      : "ml-auto px-1.5 py-0.5 text-xs bg-red-400 text-white rounded-full font-medium";
    
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
    const iconMargin = isRootLevel ? "mr-3" : isSecondLevel ? "mr-2.5" : "mr-2";
    
    if (node.icon) {
      return (
        <node.icon 
          size={iconSize} 
          className={`${iconMargin} flex-shrink-0 transition-colors duration-200`} 
        />
      );
    }
    
    // Icône par défaut pour les éléments sans icône (niveaux profonds)
    if (isThirdLevel || level > 2) {
      return (
        <Dot 
          size={iconSize} 
          className={`${iconMargin} flex-shrink-0 transition-colors duration-200`} 
        />
      );
    }
    
    return null;
  };

  // Rendu du chevron pour les éléments expandables
  const renderChevron = () => {
    if (!hasChildren || (isSidebarCollapsed && isRootLevel)) return null;
    
    const chevronSize = isRootLevel ? 16 : 14;
    
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
          className={getButtonStyles(isActiveOrHasActiveChild)}
          title={node.description}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Réduire' : 'Étendre'} ${node.label}`}
        >
          <div className="flex items-center min-w-0 flex-1">
            {renderIcon()}
            {renderLabel()}
            {renderBadge()}
          </div>
          {renderChevron()}
          {renderTooltip()}
        </button>

        {/* Enfants */}
        {isExpanded && !isSidebarCollapsed && (
          <div className={`mt-1 space-y-0.5 transition-all duration-200 ${
            isRootLevel ? 'border-l-2 border-gray-700 ml-4 pl-2' : ''
          }`}>
            {node.children!.map((child) => (
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

        {/* Menu contextuel pour sidebar collapsed */}
        {isSidebarCollapsed && isRootLevel && isExpanded && (
          <div className="absolute left-full top-0 ml-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-64">
            <div className="p-2 space-y-1">
              <div className="px-3 py-2 text-sm font-medium text-white border-b border-gray-700 mb-2">
                {node.label}
              </div>
              {node.children!.map((child) => (
                <SidebarItem 
                  key={child.id} 
                  node={child} 
                  level={1}
                  isSidebarCollapsed={false}
                  onItemClick={onItemClick}
                />
              ))}
            </div>
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

// Hook personnalisé pour gérer l'état de la sidebar
export const useSidebarState = (defaultCollapsed = false) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [activeItem, setActiveItem] = useState<MenuNode | null>(null);

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleItemClick = (node: MenuNode) => {
    setActiveItem(node);
    
    // Analytics ou logging si nécessaire
    if (process.env.NODE_ENV === 'development') {
      console.log('Menu item clicked:', node.id, node.label);
    }
  };

  return {
    isCollapsed,
    toggleCollapsed,
    activeItem,
    handleItemClick,
    setIsCollapsed
  };
};

// Composant wrapper pour la sidebar complète
export const AdminSidebar: React.FC<{
  menuItems: MenuNode[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onItemClick?: (node: MenuNode) => void;
  className?: string;
}> = ({ 
  menuItems, 
  isCollapsed = false, 
  onToggleCollapse,
  onItemClick,
  className = ""
}) => {
  return (
    <nav 
      className={`space-y-1 ${className}`} 
      aria-label="Menu principal d'administration"
      role="navigation"
    >
      {menuItems.map((node) => (
        <SidebarItem 
          key={node.id} 
          node={node} 
          level={0}
          isSidebarCollapsed={isCollapsed}
          onItemClick={onItemClick}
        />
      ))}
      
      {/* Toggle button pour mobile */}
      {onToggleCollapse && (
        <div className="pt-4 border-t border-gray-700">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
            aria-label={isCollapsed ? "Étendre le menu" : "Réduire le menu"}
          >
            {isCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronDown size={16} className="mr-2" />
                Réduire le menu
              </>
            )}
          </button>
        </div>
      )}
    </nav>
  );
};

export default SidebarItem;