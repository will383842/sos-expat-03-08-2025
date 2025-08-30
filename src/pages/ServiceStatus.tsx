import React, { memo, useMemo } from 'react';
import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';

// Types pour une meilleure sÃ©curitÃ© de type
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
  chipClass: string;
}

type StatusKey = 'operational' | 'degraded' | 'outage' | 'maintenance';

const ServiceStatus: React.FC = () => {
  const { language } = useApp();
  const isFrench = language === 'fr';

  // Configuration des services (logique conservÃ©e)
  const services: Service[] = useMemo(
    () => [
      {
        name: isFrench ? "Appels d'urgence" : 'Emergency calls',
        status: 'operational',
        uptime: '99.9%',
        lastIncident: null,
      },
      {
        name: isFrench ? 'SystÃ¨me de paiement' : 'Payment system',
        status: 'operational',
        uptime: '99.8%',
        lastIncident: null,
      },
      {
        name: isFrench ? 'Plateforme web' : 'Web platform',
        status: 'operational',
        uptime: '99.9%',
        lastIncident: null,
      },
      {
        name: isFrench ? 'API Twilio' : 'Twilio API',
        status: 'operational',
        uptime: '99.7%',
        lastIncident: null,
      },
    ],
    [isFrench]
  );

  // Configuration dâ€™affichage des statuts (logique conservÃ©e)
  const statusConfig: Record<StatusKey, StatusConfig> = useMemo(
    () => ({
      operational: {
        icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        text: isFrench ? 'OpÃ©rationnel' : 'Operational',
        colorClass: 'text-green-700',
        chipClass:
          'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200',
      },
      degraded: {
        icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
        text: isFrench ? 'DÃ©gradÃ©' : 'Degraded',
        colorClass: 'text-yellow-700',
        chipClass:
          'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border border-yellow-200',
      },
      outage: {
        icon: <XCircle className="w-5 h-5 text-red-500" />,
        text: isFrench ? 'Panne' : 'Outage',
        colorClass: 'text-red-700',
        chipClass:
          'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200',
      },
      maintenance: {
        icon: <Clock className="w-5 h-5 text-blue-500" />,
        text: isFrench ? 'Maintenance' : 'Maintenance',
        colorClass: 'text-blue-700',
        chipClass:
          'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200',
      },
    }),
    [isFrench]
  );

  // Textes statiques
  const texts = useMemo(
    () => ({
      title: isFrench ? 'Statut du service' : 'Service Status',
      subtitle: isFrench
        ? "Surveillez l'Ã©tat de nos services en temps rÃ©el"
        : 'Monitor the status of our services in real time',
      allOperational: isFrench ? 'Tous les systÃ¨mes opÃ©rationnels' : 'All systems operational',
      lastUpdated: isFrench ? 'DerniÃ¨re mise Ã  jour' : 'Last updated',
      serviceStatus: isFrench ? 'Ã‰tat des services' : 'Service status',
      uptime: isFrench ? 'disponibilitÃ©' : 'uptime',
      last30Days: isFrench ? '30 derniers jours' : 'Last 30 days',
      incidentHistory: isFrench ? 'Historique des incidents' : 'Incident history',
      noIncidents: isFrench
        ? 'Aucun incident signalÃ© au cours des 30 derniers jours'
        : 'No incidents reported in the last 30 days',
    }),
    [isFrench]
  );

  // Date formatÃ©e
  const formattedDate = useMemo(
    () => new Date().toLocaleString(isFrench ? 'fr-FR' : 'en-US'),
    [isFrench]
  );

  // Composant Ã©lÃ©ment de service (mÃ©morisÃ©)
  const ServiceItem = memo(({ service }: { service: Service }) => {
    const cfg = statusConfig[service.status];

    return (
      <div className="px-5 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-1 ${cfg.chipClass}`}
          >
            {cfg.icon}
            <span className="text-sm font-semibold">{cfg.text}</span>
          </span>
          <h4 className="font-semibold text-gray-900">{service.name}</h4>
        </div>

        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {service.uptime} {texts.uptime}
          </div>
          <div className="text-xs text-gray-500">{texts.last30Days}</div>
        </div>
      </div>
    );
  });
  ServiceItem.displayName = 'ServiceItem';

  return (
    <Layout>
      <div className="min-h-screen bg-gray-950">
        {/* HERO / Style alignÃ© Ã  la Home */}
        <section className="relative pt-20 pb-14 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-teal-500/20 to-green-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black mb-3 leading-tight">
              <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                {texts.title}
              </span>
            </h1>
            <p className="text-lg sm:text-2xl text-gray-300 max-w-3xl mx-auto">{texts.subtitle}</p>

            {/* Carte statut global */}
            <div className="mt-8 mx-auto max-w-2xl rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-5 text-white">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="inline-flex items-center gap-3">
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                  <span className="text-xl font-bold">{texts.allOperational}</span>
                </div>
                <div className="inline-flex items-center gap-2 text-sm px-3 py-1 rounded-full bg-white/10 border border-white/20">
                  <Clock className="w-4 h-4" />
                  <span>
                    {texts.lastUpdated}: {formattedDate}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTENU */}
        <main className="py-10 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            {/* Liste des services */}
            <section className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <header className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">{texts.serviceStatus}</h3>
              </header>
              <div className="divide-y divide-gray-200">
                {services.map((service, idx) => (
                  <ServiceItem key={`${service.name}-${idx}`} service={service} />
                ))}
              </div>
            </section>

            {/* Historique des incidents */}
            <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{texts.incidentHistory}</h3>
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">{texts.noIncidents}</p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default memo(ServiceStatus);
