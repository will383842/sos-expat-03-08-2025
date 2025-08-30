import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  TrendingUp, 
  Globe, 
  Target, 
  BarChart3, 
  CheckCircle, 
  ArrowUp,
  FileText,
  Zap,
  AlertCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

// Types TypeScript simplifiÃ©s
interface SEOMetric {
  id: string;
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'stable';
  description?: string;
}

interface KeywordGroup {
  id: string;
  title: string;
  keywords: Array<{
    term: string;
    volume: number;
    difficulty: number;
    position: number;
    url?: string;
  }>;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  totalVolume: number;
}

interface OptimizedPage {
  id: string;
  url: string;
  description: string;
  traffic: {
    value: number;
    change: number;
  };
  keywords: {
    count: number;
    topPositions: number;
  };
  performance: {
    loadTime: number;
    coreWebVitals: 'good' | 'needs-improvement' | 'poor';
  };
  lastUpdated: string;
}

type TabType = 'keywords' | 'pages' | 'content' | 'technical' | 'analytics';

// Service SEO simulÃ©
const SEOService = {
  getMetrics: async (): Promise<SEOMetric[]> => {
    // Simulation d'une API
    return [
      { id: '1', label: 'Organic Traffic', value: '45,231', change: '+12%', trend: 'up', description: 'Monthly visitors' },
      { id: '2', label: 'Keywords Ranking', value: '1,284', change: '+5%', trend: 'up', description: 'Top 100 positions' },
      { id: '3', label: 'Avg. Position', value: '8.4', change: '-2.1', trend: 'up', description: 'Average ranking' },
      { id: '4', label: 'Click Rate', value: '3.2%', change: '+0.4%', trend: 'up', description: 'CTR improvement' }
    ];
  },
  
  getKeywordGroups: async (): Promise<KeywordGroup[]> => {
    return [
      {
        id: '1',
        title: 'Legal Services',
        keywords: [
          { term: 'immigration lawyer', volume: 8900, difficulty: 85, position: 3 },
          { term: 'visa consultant', volume: 5400, difficulty: 72, position: 7 },
          { term: 'legal advice', volume: 12000, difficulty: 68, position: 5 }
        ],
        color: 'text-blue-700',
        bgColor: 'bg-blue-50 border-blue-200',
        icon: <Target className="w-5 h-5 text-blue-600" />,
        totalVolume: 26300
      },
      {
        id: '2',
        title: 'Expat Services',
        keywords: [
          { term: 'expat guide', volume: 3200, difficulty: 45, position: 2 },
          { term: 'moving abroad', volume: 6700, difficulty: 52, position: 4 },
          { term: 'international relocation', volume: 2100, difficulty: 38, position: 6 }
        ],
        color: 'text-green-700',
        bgColor: 'bg-green-50 border-green-200',
        icon: <Globe className="w-5 h-5 text-green-600" />,
        totalVolume: 12000
      }
    ];
  },
  
  getOptimizedPages: async (): Promise<OptimizedPage[]> => {
    return [
      {
        id: '1',
        url: '/immigration-services',
        description: 'Complete immigration legal services for expats and international clients',
        traffic: { value: 12450, change: 18 },
        keywords: { count: 67, topPositions: 23 },
        performance: { loadTime: 2.1, coreWebVitals: 'good' },
        lastUpdated: '2025-01-15'
      },
      {
        id: '2',
        url: '/visa-consultation',
        description: 'Professional visa consultation and application assistance',
        traffic: { value: 8230, change: 12 },
        keywords: { count: 45, topPositions: 18 },
        performance: { loadTime: 1.8, coreWebVitals: 'good' },
        lastUpdated: '2025-01-10'
      }
    ];
  }
};

// Composant principal
const SEO: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('keywords');
  const [metrics, setMetrics] = useState<SEOMetric[]>([]);
  const [keywordGroups, setKeywordGroups] = useState<KeywordGroup[]>([]);
  const [optimizedPages, setOptimizedPages] = useState<OptimizedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Chargement des donnÃ©es
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [metricsData, keywordsData, pagesData] = await Promise.all([
          SEOService.getMetrics(),
          SEOService.getKeywordGroups(),
          SEOService.getOptimizedPages()
        ]);
        
        setMetrics(metricsData);
        setKeywordGroups(keywordsData);
        setOptimizedPages(pagesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Gestion du changement d'onglet
  const handleTabChange = useCallback((newTab: TabType) => {
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [activeTab]);

  // Gestion du refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const metricsData = await SEOService.getMetrics();
      setMetrics(metricsData);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du refresh');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Composant onglet
  const TabButton: React.FC<{ 
    id: TabType;
    label: string; 
    icon: React.ReactNode;
    isActive: boolean;
  }> = ({ id, label, icon, isActive }) => (
    <button
      onClick={() => handleTabChange(id)}
      className={`flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        isActive
          ? 'bg-indigo-600 text-white shadow-lg transform scale-105'
          : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md'
      }`}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );

  // Composant mÃ©trique
  const MetricCard: React.FC<{ metric: SEOMetric }> = ({ metric }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900 text-sm">{metric.label}</h4>
        <div className="flex items-center">
          {metric.trend === 'up' && <ArrowUp className="w-4 h-4 text-green-500" />}
          {metric.trend === 'down' && <ArrowUp className="w-4 h-4 text-red-500 rotate-180" />}
        </div>
      </div>
      <div className="text-2xl font-bold text-indigo-600 mb-1">{metric.value}</div>
      <div className={`text-sm ${
        metric.trend === 'up' ? 'text-green-600' : metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
      }`}>
        {metric.change}
      </div>
      {metric.description && (
        <p className="text-xs text-gray-500 mt-2">{metric.description}</p>
      )}
    </div>
  );

  // Ã‰tats de chargement et d'erreur
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement des donnÃ©es SEO...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erreur de chargement</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            RÃ©essayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-full p-6 border border-white/20">
                <Search className="w-16 h-16 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Optimisation SEO
            </h1>
            <p className="text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
              Tableau de bord complet pour optimiser votre visibilitÃ© en ligne
            </p>
            
            {/* Actions */}
            <div className="mt-8 flex justify-center items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Actualisation...' : 'Actualiser'}
              </button>
              
              <div className="text-sm text-indigo-200">
                DerniÃ¨re mise Ã  jour: {lastRefresh.toLocaleTimeString('fr-FR')}
              </div>
            </div>
          </div>

          {/* MÃ©triques */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-3">
            <TabButton 
              id="keywords" 
              label="Mots-clÃ©s" 
              icon={<Target className="w-4 h-4" />}
              isActive={activeTab === 'keywords'}
            />
            <TabButton 
              id="pages" 
              label="Pages" 
              icon={<Globe className="w-4 h-4" />}
              isActive={activeTab === 'pages'}
            />
            <TabButton 
              id="content" 
              label="Contenu" 
              icon={<FileText className="w-4 h-4" />}
              isActive={activeTab === 'content'}
            />
            <TabButton 
              id="technical" 
              label="Technique" 
              icon={<Zap className="w-4 h-4" />}
              isActive={activeTab === 'technical'}
            />
            <TabButton 
              id="analytics" 
              label="Analytics" 
              icon={<BarChart3 className="w-4 h-4" />}
              isActive={activeTab === 'analytics'}
            />
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Onglet Mots-clÃ©s */}
          {activeTab === 'keywords' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">Groupes de Mots-clÃ©s</h2>
                <div className="text-sm text-gray-500">
                  {keywordGroups.reduce((acc, group) => acc + group.totalVolume, 0).toLocaleString()} 
                  {' '}recherches mensuelles
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {keywordGroups.map((group) => (
                  <div key={group.id} className={`rounded-lg border-2 p-6 ${group.bgColor} hover:shadow-lg transition-shadow`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        {group.icon}
                        <h3 className={`text-xl font-semibold ml-3 ${group.color}`}>
                          {group.title}
                        </h3>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-600">
                          {group.totalVolume.toLocaleString()} recherches
                        </div>
                        <div className="text-xs text-gray-500">
                          {group.keywords.length} termes
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {group.keywords.map((keyword, kIndex) => (
                        <div key={kIndex} className="flex items-center justify-between bg-white/80 rounded px-3 py-2 hover:bg-white transition-colors">
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${group.color}`}>
                              "{keyword.term}"
                            </span>
                            {keyword.url && (
                              <a 
                                href={keyword.url} 
                                className="ml-2 text-xs text-indigo-600 hover:text-indigo-800"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-3 h-3 inline" />
                              </a>
                            )}
                          </div>
                          <div className="text-right text-xs">
                            <div className="text-gray-600">
                              {keyword.volume.toLocaleString()}/mois
                            </div>
                            <div className={`${keyword.position <= 3 ? 'text-green-600' : keyword.position <= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                              #{keyword.position}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Onglet Pages */}
          {activeTab === 'pages' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-gray-900">Pages OptimisÃ©es</h2>
              
              <div className="grid grid-cols-1 gap-6">
                {optimizedPages.map((page) => (
                  <div key={page.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-4 mb-3">
                          <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono text-indigo-600">
                            {page.url}
                          </code>
                          <div className="flex items-center space-x-4">
                            <span className={`text-sm font-semibold flex items-center ${
                              page.traffic.change > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              <TrendingUp className="w-4 h-4 mr-1" />
                              {page.traffic.change > 0 ? '+' : ''}{page.traffic.change}%
                            </span>
                            <span className="text-sm text-blue-600 font-semibold">
                              {page.keywords.count} mots-clÃ©s
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              page.performance.coreWebVitals === 'good' 
                                ? 'bg-green-100 text-green-800' 
                                : page.performance.coreWebVitals === 'needs-improvement'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {page.performance.loadTime}s
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-600 mb-2">{page.description}</p>
                        <div className="text-xs text-gray-500">
                          DerniÃ¨re mise Ã  jour: {new Date(page.lastUpdated).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="mt-4 lg:mt-0 lg:ml-6">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Autres onglets */}
          {activeTab === 'content' && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">StratÃ©gie de Contenu</h3>
              <p className="text-gray-500">Cette section sera dÃ©veloppÃ©e prochainement.</p>
            </div>
          )}

          {activeTab === 'technical' && (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Optimisations Techniques</h3>
              <p className="text-gray-500">Cette section sera dÃ©veloppÃ©e prochainement.</p>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics AvancÃ©es</h3>
              <p className="text-gray-500">Cette section sera dÃ©veloppÃ©e prochainement.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default SEO;

