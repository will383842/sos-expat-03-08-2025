// src/pages/admin/AdminPricing.tsx
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Settings, 
  TrendingUp, 
  ChevronDown, 
  ChevronRight,
  Activity,
  Zap,
  Shield,
  AlertCircle
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { PricingManagement } from '../../components/admin/PricingManagement';
import { FinancialAnalytics } from '../../components/admin/FinancialAnalytics';
import PricingMigrationPanel from '../../components/admin/PricingMigrationPanel';

// Types pour les donnÃ©es rÃ©elles
interface FinancialStats {
  monthlyRevenue: number;
  totalCommissions: number;
  activeTransactions: number;
  conversionRate: number;
  changes: {
    revenue: number;
    commissions: number;
    transactions: number;
    conversion: number;
  };
}

interface LastModifications {
  pricing: string;
  commissions: string;
  analytics: string;
}

interface SystemStatus {
  api: 'online' | 'offline' | 'maintenance';
  database: 'optimal' | 'slow' | 'error';
  cache: 'active' | 'inactive';
  lastCheck: string;
}

const AdminPricing: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['pricing']));
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'analytics' | 'maintenance'>('overview');
  
  // Ã‰tats pour les donnÃ©es rÃ©elles
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [lastModifications, setLastModifications] = useState<LastModifications | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonctions pour rÃ©cupÃ©rer les donnÃ©es mockÃ©es temporairement
  const fetchFinancialStats = async (): Promise<FinancialStats> => {
    // DonnÃ©es mockÃ©es temporaires
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          monthlyRevenue: 45680.50,
          totalCommissions: 12340.25,
          activeTransactions: 156,
          conversionRate: 68.5,
          changes: {
            revenue: 12.3,
            commissions: 8.7,
            transactions: 15.2,
            conversion: -2.1
          }
        });
      }, 500);
    });
  };

  const fetchLastModifications = async (): Promise<LastModifications> => {
    // DonnÃ©es mockÃ©es temporaires
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          pricing: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Il y a 2h
          commissions: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Hier
          analytics: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // Il y a 3h
        });
      }, 300);
    });
  };

  const fetchSystemStatus = async (): Promise<SystemStatus> => {
    // DonnÃ©es mockÃ©es temporaires
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          api: 'online',
          database: 'optimal',
          cache: 'active',
          lastCheck: new Date().toISOString()
        });
      }, 200);
    });
  };

  // Chargement initial des donnÃ©es
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [stats, modifications, status] = await Promise.all([
          fetchFinancialStats(),
          fetchLastModifications(),
          fetchSystemStatus()
        ]);
        
        setFinancialStats(stats);
        setLastModifications(modifications);
        setSystemStatus(status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Actualisation automatique toutes les 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fonction utilitaire pour formater les montants
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Fonction utilitaire pour formater les pourcentages
  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Fonction utilitaire pour formater les dates
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) {
      return `Il y a ${minutes} min`;
    } else if (hours < 24) {
      return `Il y a ${hours}h`;
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return `Il y a ${days} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // GÃ©nÃ©ration dynamique des statistiques
  const generateQuickStats = () => {
    if (!financialStats) return [];

    return [
      { 
        label: 'Revenus du mois', 
        value: formatCurrency(financialStats.monthlyRevenue), 
        change: formatPercentage(financialStats.changes.revenue), 
        trend: financialStats.changes.revenue >= 0 ? 'up' : 'down', 
        icon: DollarSign,
        color: 'text-emerald-600 bg-emerald-50'
      },
      { 
        label: 'Commissions totales', 
        value: formatCurrency(financialStats.totalCommissions), 
        change: formatPercentage(financialStats.changes.commissions), 
        trend: financialStats.changes.commissions >= 0 ? 'up' : 'down', 
        icon: TrendingUp,
        color: 'text-blue-600 bg-blue-50'
      },
      { 
        label: 'Transactions actives', 
        value: financialStats.activeTransactions.toLocaleString('fr-FR'), 
        change: formatPercentage(financialStats.changes.transactions), 
        trend: financialStats.changes.transactions >= 0 ? 'up' : 'down', 
        icon: Activity,
        color: 'text-purple-600 bg-purple-50'
      },
      { 
        label: 'Taux de conversion', 
        value: `${financialStats.conversionRate.toFixed(1)}%`, 
        change: formatPercentage(financialStats.changes.conversion), 
        trend: financialStats.changes.conversion >= 0 ? 'up' : 'down', 
        icon: Zap,
        color: 'text-orange-600 bg-orange-50'
      }
    ];
  };

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: Activity },
    { id: 'config', label: 'Configuration', icon: Settings },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'maintenance', label: 'Maintenance', icon: Shield }
  ];

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Chargement...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800 font-medium">Erreur de chargement</span>
          </div>
          <p className="text-red-700 mt-2">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
          >
            Actualiser
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        const quickStats = generateQuickStats();
        
        return (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickStats.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div key={index} className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-lg ${stat.color}`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <span className={`text-sm font-medium ${
                        stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                      <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* System Status */}
            <div className={`rounded-xl border p-6 ${
              systemStatus?.api === 'online' 
                ? 'bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-100' 
                : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-100'
            }`}>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    systemStatus?.api === 'online' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}>
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {systemStatus?.api === 'online' ? 'SystÃ¨me OpÃ©rationnel' : 'ProblÃ¨me SystÃ¨me'}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    {systemStatus?.api === 'online' 
                      ? `Tous les services fonctionnent normalement. DerniÃ¨re vÃ©rification: ${formatRelativeTime(systemStatus.lastCheck)}.`
                      : 'Des problÃ¨mes ont Ã©tÃ© dÃ©tectÃ©s. Contactez le support technique.'
                    }
                  </p>
                  <div className="flex items-center space-x-4 mt-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      systemStatus?.api === 'online' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      API: {systemStatus?.api === 'online' ? 'En ligne' : 'Hors ligne'}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      systemStatus?.database === 'optimal' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      Base de donnÃ©es: {systemStatus?.database === 'optimal' ? 'Optimale' : 'ProblÃ¨me'}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      systemStatus?.cache === 'active' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      Cache: {systemStatus?.cache === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'config':
        return <PricingManagement />;

      case 'analytics':
        return <FinancialAnalytics />;

      case 'maintenance':
        return <PricingMigrationPanel />;

      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        {/* Enhanced Header */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-6 space-y-4 lg:space-y-0">
              <div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      Gestion FinanciÃ¨re
                    </h1>
                    <p className="text-gray-600 mt-1 text-sm">
                      Pilotage centralisÃ© de votre systÃ¨me de pricing et analytics
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Last Modifications & Quick Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6">
                <div className="text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">DerniÃ¨re modification :</span>
                  </div>
                  <div className="mt-1 space-y-1">
                    <div className="text-xs text-gray-600">
                      <span className="font-semibold text-emerald-600">Tarifs:</span> {lastModifications ? formatRelativeTime(lastModifications.pricing) : 'Il y a 2h'}
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-semibold text-blue-600">Commissions:</span> {lastModifications ? formatRelativeTime(lastModifications.commissions) : 'Hier'}
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-semibold text-purple-600">Analytics:</span> {lastModifications ? formatRelativeTime(lastModifications.analytics) : 'Il y a 3h'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button className="inline-flex items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Alertes
                  </button>
                  <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-blue-700 transition-all duration-200 shadow-sm">
                    <Zap className="w-4 h-4 mr-2" />
                    Actions Rapides
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Enhanced Navigation Tabs */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
            <div className="border-b border-gray-100">
              <nav className="flex space-x-0" aria-label="Tabs">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`group relative min-w-0 flex-1 overflow-hidden py-4 px-6 text-sm font-medium text-center hover:bg-gray-50 focus:z-10 transition-all duration-200 ${
                        isActive
                          ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <IconComponent className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="truncate">{tab.label}</span>
                      </div>
                      {isActive && (
                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPricing;
