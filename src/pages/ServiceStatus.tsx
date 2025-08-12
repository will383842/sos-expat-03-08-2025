import React, { memo, useMemo } from 'react';
import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';

// Types pour une meilleure sécurité de type
interface Service {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  uptime: string;
  lastIncident: string | null;
}

interface StatusConfig {
  icon: React.ReactNode;
  text: string;
  colorClass: string;
}

const ServiceStatus: React.FC = () => {
  const { language } = useApp();
  const isFrench = language === 'fr';

  // Configuration des services - optimisée avec useMemo
  const services: Service[] = useMemo(() => [
    {
      name: isFrench ? 'Appels d\'urgence' : 'Emergency calls',
      status: 'operational',
      uptime: '99.9%',
      lastIncident: null
    },
    {
      name: isFrench ? 'Système de paiement' : 'Payment system',
      status: 'operational',
      uptime: '99.8%',
      lastIncident: null
    },
    {
      name: isFrench ? 'Plateforme web' : 'Web platform',
      status: 'operational',
      uptime: '99.9%',
      lastIncident: null
    },
    {
      name: isFrench ? 'API Twilio' : 'Twilio API',
      status: 'operational',
      uptime: '99.7%',
      lastIncident: null
    }
  ], [isFrench]);

  // Configuration des statuts - optimisée avec useMemo
  const statusConfig = useMemo((): Record<string, StatusConfig> => ({
    operational: {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      text: isFrench ? 'Opérationnel' : 'Operational',
      colorClass: 'text-green-600'
    },
    degraded: {
      icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
      text: isFrench ? 'Dégradé' : 'Degraded',
      colorClass: 'text-yellow-600'
    },
    outage: {
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      text: isFrench ? 'Panne' : 'Outage',
      colorClass: 'text-red-600'
    },
    maintenance: {
      icon: <Clock className="w-5 h-5 text-blue-500" />,
      text: isFrench ? 'Maintenance' : 'Maintenance',
      colorClass: 'text-blue-600'
    }
  }), [isFrench]);

  // Textes statiques optimisés
  const texts = useMemo(() => ({
    title: isFrench ? 'Statut du service' : 'Service Status',
    subtitle: isFrench 
      ? 'Surveillez l\'état de nos services en temps réel' 
      : 'Monitor the status of our services in real time',
    allOperational: isFrench 
      ? 'Tous les systèmes opérationnels' 
      : 'All systems operational',
    lastUpdated: isFrench ? 'Dernière mise à jour: ' : 'Last updated: ',
    serviceStatus: isFrench ? 'État des services' : 'Service status',
    uptime: isFrench ? 'disponibilité' : 'uptime',
    last30Days: isFrench ? '30 derniers jours' : 'Last 30 days',
    incidentHistory: isFrench ? 'Historique des incidents' : 'Incident history',
    noIncidents: isFrench 
      ? 'Aucun incident signalé au cours des 30 derniers jours' 
      : 'No incidents reported in the last 30 days'
  }), [isFrench]);

  // Date formatée selon la locale
  const formattedDate = useMemo(() => {
    return new Date().toLocaleString(isFrench ? 'fr-FR' : 'en-US');
  }, [isFrench]);

  // Composant Service mémorisé pour éviter les re-renders inutiles
  const ServiceItem = memo(({ service }: { service: Service }) => {
    const config = statusConfig[service.status] || statusConfig.operational;
    
    return (
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {config.icon}
          <div>
            <h4 className="font-medium text-gray-900">{service.name}</h4>
            <p className={`text-sm font-medium ${config.colorClass}`}>
              {config.text}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {service.uptime} {texts.uptime}
          </div>
          <div className="text-xs text-gray-500">
            {texts.last30Days}
          </div>
        </div>
      </div>
    );
  });

  ServiceItem.displayName = 'ServiceItem';

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-green-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-full p-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {texts.title}
            </h1>
            <p className="text-xl text-green-100 max-w-2xl mx-auto">
              {texts.subtitle}
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Overall Status */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-center space-x-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {texts.allOperational}
                </h2>
              </div>
              <p className="text-center text-gray-600 mt-2">
                {texts.lastUpdated}{formattedDate}
              </p>
            </section>

            {/* Services List */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <header className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {texts.serviceStatus}
                </h3>
              </header>
              
              <div className="divide-y divide-gray-200">
                {services.map((service, index) => (
                  <ServiceItem key={`${service.name}-${index}`} service={service} />
                ))}
              </div>
            </section>

            {/* Incident History */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 mt-8 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {texts.incidentHistory}
              </h3>
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">
                  {texts.noIncidents}
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default memo(ServiceStatus);

