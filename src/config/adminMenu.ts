// src/config/adminMenu.ts
import {
  BarChart3,
  DollarSign,
  Users,
  Phone,
  Mail,
  Handshake,
  Building,
  Settings,
  TrendingUp,
  Shield,
  Globe,
  FileText,
  Database,
  Star,
  CreditCard,
  Calculator,
  PieChart,
  Receipt,
  Banknote,
  ArrowLeftRight,
  AlertCircle,
  RotateCcw,
  FileSpreadsheet,
  UserCheck,
  UserPlus,
  MessageSquare,
  Bell,
  Megaphone,
  Target,
  Truck,
  Ban,
  TestTube,
  PhoneCall,
  PlayCircle,
  Mic,
  Percent,
  Gift,
  Award,
  Briefcase,
  UsersIcon,
  FileSignature,
  CreditCard as CreditCardIcon,
  Archive,
  Cog,
  BarChart,
  Download,
  Zap
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AdminMenuItem = {
  id: string;
  label: string;
  path?: string;
  children?: AdminMenuItem[];
  icon?: LucideIcon;
  badge?: string;
  description?: string;
};

export const adminMenuTree: AdminMenuItem[] = [
  // ===== 📊 TABLEAU DE BORD =====
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    path: '/admin/dashboard',
    icon: BarChart3,
    description: 'Vue d\'ensemble et statistiques générales'
  },

  // ===== 💰 FINANCES & FACTURATION =====
  {
    id: 'finance',
    label: 'Finances & Facturation',
    icon: DollarSign,
    description: 'Gestion complète des finances et paiements',
    children: [
      {
        id: 'payments',
        label: 'Paiements',
        path: '/admin/finance/payments',
        icon: CreditCard,
        description: 'Suivi des paiements et transactions'
      },
      {
        id: 'invoices',
        label: 'Facturation',
        path: '/admin/finance/invoices',
        icon: Receipt,
        description: 'Génération et gestion des factures'
      },
      {
        id: 'taxes',
        label: 'TVA & Taxes',
        path: '/admin/finance/taxes',
        icon: Calculator,
        description: 'Gestion de la TVA et déclarations fiscales',
        children: [
          {
            id: 'tax-declarations',
            label: 'Déclarations TVA',
            path: '/admin/finance/taxes',
            icon: FileText
          },
          {
            id: 'tax-by-country',
            label: 'TVA par pays',
            path: '/admin/finance/taxes/by-country',
            icon: Globe
          }
        ]
      },
      {
        id: 'reconciliation',
        label: 'Rapprochement',
        path: '/admin/finance/reconciliation',
        icon: ArrowLeftRight,
        description: 'Rapprochement bancaire et comptable'
      },
      {
        id: 'disputes',
        label: 'Litiges (Disputes)',
        path: '/admin/finance/disputes',
        icon: AlertCircle,
        description: 'Gestion des litiges et contestations'
      },
      {
        id: 'refunds',
        label: 'Remboursements',
        path: '/admin/finance/refunds',
        icon: RotateCcw,
        description: 'Traitement des remboursements'
      },
      {
        id: 'payouts',
        label: 'Payouts prestataires',
        path: '/admin/finance/payouts',
        icon: Banknote,
        description: 'Paiements aux prestataires'
      },
      {
        id: 'reports',
        label: 'Rapports & Exports',
        path: '/admin/finance/exports',
        icon: FileSpreadsheet,
        description: 'Rapports financiers et exports'
      },
      {
        id: 'ledger',
        label: 'Grand livre',
        path: '/admin/finance/ledger',
        icon: Database,
        description: 'Comptabilité générale'
      }
    ]
  },

  // ===== 👥 UTILISATEURS & PRESTATAIRES =====
  {
    id: 'users',
    label: 'Utilisateurs & Prestataires',
    icon: Users,
    description: 'Gestion des utilisateurs et prestataires',
    children: [
      {
        id: 'users-list',
        label: 'Utilisateurs > Liste',
        path: '/admin/users/list',
        icon: UsersIcon,
        description: 'Liste complète des utilisateurs'
      },
      {
        id: 'providers-list',
        label: 'Prestataires > Liste',
        path: '/admin/users/providers',
        icon: UserCheck,
        description: 'Liste des prestataires actifs'
      },
      {
        id: 'validation-kyc',
        label: 'Validation & KYC',
        path: '/admin/approvals',
        icon: Shield,
        description: 'Validation des comptes et KYC'
      },
      {
        id: 'aaa-profiles',
        label: 'AAA Profiles',
        path: '/admin/aaaprofiles',
        icon: TestTube,
        description: 'Profils de test et démo'
      },
      {
        id: 'reviews-ratings',
        label: 'Avis & Notations',
        path: '/admin/reviews',
        icon: Star,
        description: 'Gestion des avis clients'
      }
    ]
  },

  // ===== 📞 APPELS & PLANIFICATION =====
  {
    id: 'calls',
    label: 'Appels & Planification',
    icon: Phone,
    description: 'Monitoring et sessions d\'appels',
    children: [
      {
        id: 'calls-monitor',
        label: 'Monitoring',
        path: '/admin/calls',
        icon: PhoneCall,
        description: 'Surveillance des appels en temps réel'
      },
      {
        id: 'calls-sessions',
        label: 'Sessions',
        path: '/admin/calls/sessions',
        icon: PlayCircle,
        description: 'Gestion des sessions d\'appels'
      },
      {
        id: 'calls-recordings',
        label: 'Enregistrements',
        path: '/admin/calls/recordings',
        icon: Mic,
        description: 'Archives des enregistrements'
      }
    ]
  },

  // ===== 💌 COMMUNICATIONS =====
  {
    id: 'communications',
    label: 'Communications',
    icon: Mail,
    description: 'Système de communication multi-canal',
    children: [
      {
        id: 'campaigns',
        label: 'Campagnes',
        path: '/admin/comms/campaigns',
        icon: Megaphone,
        description: 'Campagnes email et marketing'
      },
      {
        id: 'automations',
        label: 'Automations',
        path: '/admin/comms/automations',
        icon: Zap,
        description: 'Automatisation des communications'
      },
      {
        id: 'segments',
        label: 'Segments',
        path: '/admin/comms/segments',
        icon: Target,
        description: 'Segmentation des utilisateurs'
      },
      {
        id: 'templates',
        label: 'Templates',
        path: '/admin/comms/templates',
        icon: FileText, // Remplace l'icône inexistante "Template"
        description: 'Modèles d\'emails et messages'
      },
      {
        id: 'deliverability',
        label: 'Deliverability',
        path: '/admin/comms/deliverability',
        icon: Truck,
        description: 'Qualité de délivrance des emails'
      },
      {
        id: 'suppression',
        label: 'Suppression Lists',
        path: '/admin/comms/suppression',
        icon: Ban,
        description: 'Listes de suppression'
      },
      {
        id: 'ab-tests',
        label: 'A/B Tests',
        path: '/admin/comms/ab',
        icon: TestTube,
        description: 'Tests A/B pour les campagnes'
      },
      {
        id: 'messages-realtime',
        label: 'Messages (temps réel)',
        path: '/admin/comms/messages',
        icon: MessageSquare,
        description: 'Messages en temps réel'
      },
      {
        id: 'notification-logs',
        label: 'Logs de notif',
        path: '/admin/comms/notifications',
        icon: Bell,
        description: 'Historique des notifications'
      }
    ]
  },

  // ===== 🤝 AFFILIATION & AMBASSADEURS =====
  {
    id: 'affiliation',
    label: 'Affiliation & Ambassadeurs',
    icon: Handshake,
    description: 'Programme d\'affiliation et ambassadeurs',
    children: [
      {
        id: 'affiliates-list',
        label: 'Affiliés',
        path: '/admin/affiliates',
        icon: UserPlus,
        description: 'Liste des affiliés'
      },
      {
        id: 'commission-rules',
        label: 'Règles commission',
        path: '/admin/affiliates/commissions',
        icon: Percent,
        description: 'Configuration des commissions'
      },
      {
        id: 'affiliate-payouts',
        label: 'Payouts',
        path: '/admin/affiliates/payouts',
        icon: Gift,
        description: 'Paiements aux affiliés'
      },
      {
        id: 'ambassadors',
        label: 'Ambassadeurs',
        path: '/admin/ambassadors',
        icon: Award,
        description: 'Programme ambassadeurs'
      }
    ]
  },

  // ===== 🏢 ENTREPRISES (B2B) =====
  {
    id: 'b2b',
    label: 'Comptes Entreprise (B2B)',
    icon: Building,
    description: 'Gestion des comptes entreprise',
    children: [
      {
        id: 'b2b-accounts',
        label: 'Comptes',
        path: '/admin/b2b/accounts',
        icon: Briefcase,
        description: 'Comptes entreprise'
      },
      {
        id: 'b2b-members',
        label: 'Membres',
        path: '/admin/b2b/members',
        icon: Users,
        description: 'Membres des entreprises'
      },
      {
        id: 'b2b-pricing',
        label: 'Tarifs & Contrats',
        path: '/admin/b2b/pricing',
        icon: FileSignature,
        description: 'Tarification B2B et contrats'
      },
      {
        id: 'b2b-billing',
        label: 'Facturation',
        path: '/admin/b2b/billing',
        icon: CreditCardIcon,
        description: 'Facturation entreprise'
      },
      {
        id: 'b2b-invoices',
        label: 'Factures',
        path: '/admin/b2b/invoices',
        icon: Receipt,
        description: 'Factures B2B'
      },
      {
        id: 'b2b-reports',
        label: 'Rapports',
        path: '/admin/b2b/reports',
        icon: BarChart,
        description: 'Rapports B2B'
      }
    ]
  },

  // ===== ⚙️ CONFIGURATION & OUTILS =====
  {
    id: 'settings',
    label: 'Configuration & Outils',
    icon: Settings,
    description: 'Paramètres système et outils admin',
    children: [
      {
        id: 'pricing-management',
        label: 'Gestion des tarifs',
        path: '/admin/pricing',
        icon: DollarSign,
        description: 'Configuration des prix et commissions'
      },
      {
        id: 'countries-management',
        label: 'Pays disponibles',
        path: '/admin/countries',
        icon: Globe,
        description: 'Gestion des pays supportés'
      },
      {
        id: 'legal-documents',
        label: 'Documents légaux',
        path: '/admin/documents',
        icon: FileText,
        description: 'CGU, politique de confidentialité, etc.'
      },
      {
        id: 'system-backups',
        label: 'Sauvegardes',
        path: '/admin/backups',
        icon: Archive,
        description: 'Sauvegardes et restauration'
      },
      {
        id: 'system-settings',
        label: 'Paramètres système',
        path: '/admin/settings',
        icon: Cog,
        description: 'Configuration générale du système'
      }
    ]
  },

  // ===== 📊 RAPPORTS & ANALYTICS =====
  {
    id: 'analytics',
    label: 'Rapports & Analytics',
    icon: TrendingUp,
    description: 'Analytics et rapports détaillés',
    children: [
      {
        id: 'financial-reports',
        label: 'Rapports financiers',
        path: '/admin/reports/financial',
        icon: PieChart,
        description: 'Analytics financiers'
      },
      {
        id: 'user-analytics',
        label: 'Analytics utilisateurs',
        path: '/admin/reports/users',
        icon: Users,
        description: 'Comportement des utilisateurs'
      },
      {
        id: 'platform-performance',
        label: 'Performance plateforme',
        path: '/admin/reports/performance',
        icon: BarChart3,
        description: 'Métriques de performance'
      },
      {
        id: 'data-exports',
        label: 'Exports de données',
        path: '/admin/reports/exports',
        icon: Download,
        description: 'Export CSV, Excel, etc.'
      }
    ]
  }
];

// ===== UTILITAIRES =====

/**
 * Trouve un élément de menu par son ID (recherche récursive)
 */
export function findMenuItemById(id: string, items: AdminMenuItem[] = adminMenuTree): AdminMenuItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findMenuItemById(id, item.children);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Récupère tous les paths du menu (utile pour la validation des routes)
 */
export function getAllMenuPaths(items: AdminMenuItem[] = adminMenuTree): string[] {
  const paths: string[] = [];

  function traverse(menuItems: AdminMenuItem[]) {
    for (const item of menuItems) {
      if (item.path) {
        paths.push(item.path);
      }
      if (item.children) {
        traverse(item.children);
      }
    }
  }

  traverse(items);
  return paths;
}

/**
 * Construit le breadcrumb pour un path donné
 */
export function buildBreadcrumb(path: string, items: AdminMenuItem[] = adminMenuTree): AdminMenuItem[] {
  const breadcrumb: AdminMenuItem[] = [];

  function findPath(menuItems: AdminMenuItem[], currentPath: AdminMenuItem[]): boolean {
    for (const item of menuItems) {
      const newPath = [...currentPath, item];

      if (item.path === path) {
        breadcrumb.push(...newPath);
        return true;
      }

      if (item.children && findPath(item.children, newPath)) {
        return true;
      }
    }
    return false;
  }

  findPath(items, []);
  return breadcrumb;
}

/**
 * Vérifie si un utilisateur a accès à un élément de menu
 * (placeholder pour future gestion des permissions)
 */
export function hasMenuAccess(menuItem: AdminMenuItem, userRole: string = 'admin'): boolean {
  // Pour l'instant, tous les admins ont accès à tout
  // À terme, on pourrait ajouter des permissions plus granulaires
  return userRole === 'admin';
}

// Export par défaut
export default adminMenuTree;
