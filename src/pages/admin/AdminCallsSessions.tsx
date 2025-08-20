import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  Clock,
  Users,
  Search,
  Download,
  Eye,
  PlayCircle,
  StopCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Timer,
  Volume2,
  FileText,
  BarChart3,
  ArrowUpDown,
  Copy
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  Timestamp,
  startAfter,
  DocumentSnapshot
} from "firebase/firestore";
import { db } from "../../config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { useAuth } from "../../contexts/AuthContext";
import { logError } from "../../utils/logging";

// ============ TYPES ============
interface CallSession {
  id: string;
  status: 'pending' | 'provider_connecting' | 'client_connecting' | 'both_connecting' | 'active' | 'completed' | 'failed' | 'cancelled';
  participants: {
    provider: {
      phone: string;
      status: 'pending' | 'ringing' | 'connected' | 'disconnected' | 'no_answer';
      callSid?: string;
      connectedAt?: Timestamp;
      disconnectedAt?: Timestamp;
      attemptCount: number;
    };
    client: {
      phone: string;
      status: 'pending' | 'ringing' | 'connected' | 'disconnected' | 'no_answer';
      callSid?: string;
      connectedAt?: Timestamp;
      disconnectedAt?: Timestamp;
      attemptCount: number;
    };
  };
  conference: {
    sid?: string;
    name: string;
    startedAt?: Timestamp;
    endedAt?: Timestamp;
    duration?: number;
    isRecording?: boolean;
    recordingUrl?: string;
    recordingSid?: string;
    participantCount?: number;
  };
  payment: {
    intentId: string;
    status: 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';
    amount: number;
    capturedAt?: Timestamp;
    refundedAt?: Timestamp;
    failureReason?: string;
  };
  metadata: {
    providerId: string;
    clientId: string;
    providerName?: string;
    clientName?: string;
    serviceType: 'lawyer_call' | 'expat_call';
    providerType: 'lawyer' | 'expat';
    maxDuration: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    requestId?: string;
    clientLanguages?: string[];
    providerLanguages?: string[];
  };
}

interface SessionFilters {
  status: string;
  serviceType: string;
  dateRange: string;
  paymentStatus: string;
  providerType: string;
}

interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  failedSessions: number;
  cancelledSessions: number;
  totalRevenue: number;
  averageDuration: number;
  successRate: number;
  totalDuration: number;
}

// ============ COMPOSANTS UTILITAIRES ============
const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  const getConfig = () => {
    switch (status) {
      case 'completed':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Terminé' };
      case 'failed':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'Échoué' };
      case 'cancelled':
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: StopCircle, label: 'Annulé' };
      case 'active':
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: PlayCircle, label: 'Actif' };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'En attente' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertTriangle, label: status };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const iconSize = size === 'sm' ? 12 : 14;
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';

  return (
    <span className={`inline-flex items-center ${padding} rounded-full ${textSize} font-medium border ${config.color}`}>
      <IconComponent size={iconSize} className="mr-1" />
      {config.label}
    </span>
  );
};

const PaymentStatusBadge: React.FC<{ status: string; amount: number }> = ({ status, amount }) => {
  const getConfig = () => {
    switch (status) {
      case 'captured':
        return { color: 'bg-green-100 text-green-800', label: 'Capturé' };
      case 'authorized':
        return { color: 'bg-blue-100 text-blue-800', label: 'Autorisé' };
      case 'refunded':
        return { color: 'bg-orange-100 text-orange-800', label: 'Remboursé' };
      case 'failed':
        return { color: 'bg-red-100 text-red-800', label: 'Échoué' };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', label: 'En attente' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: status };
    }
  };

  const config = getConfig();

  return (
    <div className="text-center">
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <DollarSign size={12} className="mr-1" />
        {config.label}
      </span>
      <div className="text-sm font-medium text-gray-900 mt-1">
        {amount.toFixed(2)}€
      </div>
    </div>
  );
};

const DurationDisplay: React.FC<{ 
  duration?: number; 
  startTime?: Timestamp; 
  endTime?: Timestamp; 
}> = ({ duration, startTime, endTime }) => {
  const calculateDuration = () => {
    if (duration) return duration;
    if (startTime && endTime) {
      return (endTime.toDate().getTime() - startTime.toDate().getTime()) / 1000;
    }
    return 0;
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const totalDuration = calculateDuration();

  return (
    <div className="flex items-center text-sm">
      <Timer size={14} className="mr-1 text-gray-400" />
      <span className="font-medium">
        {formatDuration(totalDuration)}
      </span>
    </div>
  );
};

const ParticipantInfo: React.FC<{
  participant: CallSession['participants']['provider'] | CallSession['participants']['client'];
  name?: string;
  type: 'provider' | 'client';
}> = ({ participant, name, type }) => {
  const getStatusColor = () => {
    switch (participant.status) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-red-600';
      case 'ringing': return 'text-blue-600';
      case 'no_answer': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-shrink-0">
        {type === 'provider' ? '👨‍💼' : '👤'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 truncate">
          {name || (type === 'provider' ? 'Prestataire' : 'Client')}
        </div>
        <div className="text-xs text-gray-500 font-mono">
          {participant.phone}
        </div>
        <div className={`text-xs font-medium ${getStatusColor()}`}>
          {participant.status === 'connected' ? 'Connecté' :
           participant.status === 'disconnected' ? 'Déconnecté' :
           participant.status === 'ringing' ? 'Sonnerie' :
           participant.status === 'no_answer' ? 'Pas de réponse' :
           'En attente'}
        </div>
      </div>
      {participant.attemptCount > 1 && (
        <div className="text-xs text-orange-600 bg-orange-50 px-1 rounded">
          {participant.attemptCount} essais
        </div>
      )}
    </div>
  );
};

// ============ COMPOSANT PRINCIPAL ============
const AdminCallsSessions: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // States des données
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // States UI
  const [selectedSession, setSelectedSession] = useState<CallSession | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'duration' | 'amount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<SessionFilters>({
    status: 'all',
    serviceType: 'all',
    dateRange: '7d',
    paymentStatus: 'all',
    providerType: 'all'
  });

  const ITEMS_PER_PAGE = 25;

  // Vérification d'authentification
  useEffect(() => {
    if (!currentUser || (currentUser as any).role !== 'admin') {
      navigate('/admin/login');
      return;
    }
  }, [currentUser, navigate]);

  // Chargement initial des sessions
  useEffect(() => {
    loadSessions(true);
  }, [filters, sortBy, sortOrder]);

  // Calcul des statistiques
  useEffect(() => {
    if (sessions.length > 0) {
      calculateStats();
    }
  }, [sessions]);

  const buildQuery = (isInitial: boolean = true) => {
    let baseQuery = collection(db, 'call_sessions');
    const constraints: any[] = [];

    // Filtres de statut
    if (filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }

    // Filtres de type de service
    if (filters.serviceType !== 'all') {
      constraints.push(where('metadata.serviceType', '==', filters.serviceType));
    }

    // Filtres de type de prestataire
    if (filters.providerType !== 'all') {
      constraints.push(where('metadata.providerType', '==', filters.providerType));
    }

    // Filtres de statut de paiement
    if (filters.paymentStatus !== 'all') {
      constraints.push(where('payment.status', '==', filters.paymentStatus));
    }

    // Filtres de date
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (filters.dateRange) {
        case '1d':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      constraints.push(where('metadata.createdAt', '>=', Timestamp.fromDate(startDate)));
    }

    // Tri
    const orderByField = sortBy === 'createdAt' ? 'metadata.createdAt' : 
                        sortBy === 'duration' ? 'conference.duration' :
                        'payment.amount';
    
    constraints.push(orderBy(orderByField, sortOrder));

    // Limite
    constraints.push(limit(ITEMS_PER_PAGE));

    // Pagination
    if (!isInitial && lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    return query(baseQuery, ...constraints);
  };

  const loadSessions = async (isInitial: boolean = true) => {
    try {
      if (isInitial) {
        setLoading(true);
        setSessions([]);
        setLastDoc(null);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const sessionsQuery = buildQuery(isInitial);
      const snapshot = await getDocs(sessionsQuery);

      if (snapshot.empty) {
        setHasMore(false);
        return;
      }

      const newSessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CallSession));

      if (isInitial) {
        setSessions(newSessions);
      } else {
        setSessions(prev => [...prev, ...newSessions]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);

    } catch (error) {
      console.error('Erreur lors du chargement des sessions:', error);
      logError({
        origin: 'frontend',
        error: `Erreur chargement sessions: ${error instanceof Error ? error.message : 'Unknown'}`,
        context: { component: 'AdminCallsSessions' },
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const calculateStats = async () => {
    try {
      // Calculer les stats sur toutes les sessions (pas seulement celles affichées)
      const allSessionsQuery = query(
        collection(db, 'call_sessions'),
        where('metadata.createdAt', '>=', getDateRangeStart())
      );
      
      const allSnapshot = await getDocs(allSessionsQuery);
      const allSessions = allSnapshot.docs.map(doc => doc.data() as CallSession);

      const completed = allSessions.filter(s => s.status === 'completed');
      const failed = allSessions.filter(s => s.status === 'failed');
      const cancelled = allSessions.filter(s => s.status === 'cancelled');

      const totalRevenue = allSessions
        .filter(s => s.payment.status === 'captured')
        .reduce((sum, s) => sum + s.payment.amount, 0);

      const completedWithDuration = completed.filter(s => s.conference.duration);
      const totalDuration = completedWithDuration.reduce((sum, s) => sum + (s.conference.duration || 0), 0);
      const averageDuration = completedWithDuration.length > 0 ? totalDuration / completedWithDuration.length : 0;

      const successRate = allSessions.length > 0 ? (completed.length / allSessions.length) * 100 : 0;

      setSessionStats({
        totalSessions: allSessions.length,
        completedSessions: completed.length,
        failedSessions: failed.length,
        cancelledSessions: cancelled.length,
        totalRevenue,
        averageDuration,
        successRate,
        totalDuration
      });

    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
    }
  };

  const getDateRangeStart = () => {
    const now = new Date();
    switch (filters.dateRange) {
      case '1d': return Timestamp.fromDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      case '7d': return Timestamp.fromDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      case '30d': return Timestamp.fromDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      case '90d': return Timestamp.fromDate(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));
      default: return Timestamp.fromDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    }
  };

  // Filtrage des sessions pour la recherche
  const filteredSessions = useMemo(() => {
    if (!searchTerm) return sessions;

    const searchLower = searchTerm.toLowerCase();
    return sessions.filter(session => 
      session.id.toLowerCase().includes(searchLower) ||
      session.metadata.providerName?.toLowerCase().includes(searchLower) ||
      session.metadata.clientName?.toLowerCase().includes(searchLower) ||
      session.participants.provider.phone.includes(searchTerm) ||
      session.participants.client.phone.includes(searchTerm) ||
      session.payment.intentId.toLowerCase().includes(searchLower)
    );
  }, [sessions, searchTerm]);

  // Actions
  const handleRefresh = useCallback(() => {
    loadSessions(true);
  }, []);

  const handleExportCSV = useCallback(() => {
    if (sessions.length === 0) return;

    const csvData = sessions.map(session => ({
      'Session ID': session.id,
      'Statut': session.status,
      'Type Service': session.metadata.serviceType,
      'Type Prestataire': session.metadata.providerType,
      'Prestataire': session.metadata.providerName || 'N/A',
      'Client': session.metadata.clientName || 'N/A',
      'Téléphone Prestataire': session.participants.provider.phone,
      'Téléphone Client': session.participants.client.phone,
      'Durée (s)': session.conference.duration || 0,
      'Montant (€)': session.payment.amount,
      'Statut Paiement': session.payment.status,
      'Date Création': session.metadata.createdAt.toDate().toLocaleString('fr-FR'),
      'Date Début': session.conference.startedAt?.toDate().toLocaleString('fr-FR') || 'N/A',
      'Date Fin': session.conference.endedAt?.toDate().toLocaleString('fr-FR') || 'N/A',
      'Tentatives Prestataire': session.participants.provider.attemptCount,
      'Tentatives Client': session.participants.client.attemptCount,
      'URL Enregistrement': session.conference.recordingUrl || 'N/A'
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sessions_appels_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [sessions]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  }, []);

  const formatDateTime = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de l'historique des sessions...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ErrorBoundary>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Clock className="w-7 h-7 mr-2 text-blue-600" />
                Historique des Sessions d'Appels
              </h1>
              <p className="text-gray-600 mt-1">
                Consultation et analyse des sessions d'appels passées
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {sessionStats && (
                <Button
                  onClick={() => setShowStatsModal(true)}
                  variant="outline"
                  className="flex items-center"
                >
                  <BarChart3 size={16} className="mr-2" />
                  Statistiques
                </Button>
              )}
              
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="flex items-center"
                disabled={sessions.length === 0}
              >
                <Download size={16} className="mr-2" />
                Exporter CSV
              </Button>
              
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="flex items-center"
              >
                <RefreshCw size={16} className="mr-2" />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Statistiques rapides */}
          {sessionStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                    <p className="text-2xl font-bold text-gray-900">{sessionStats.totalSessions}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Taux de Succès</p>
                    <p className="text-2xl font-bold text-gray-900">{sessionStats.successRate.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Revenus Total</p>
                    <p className="text-2xl font-bold text-gray-900">{sessionStats.totalRevenue.toFixed(2)}€</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Durée Moyenne</p>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(sessionStats.averageDuration / 60)}min</p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-100">
                    <Timer className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filtres et contrôles */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prestataire</label>
                <select
                  value={filters.providerType}
                  onChange={(e) => setFilters(prev => ({ ...prev, providerType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tous types</option>
                  <option value="lawyer">Avocat</option>
                  <option value="expat">Expatrié</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="1d">Dernières 24h</option>
                  <option value="7d">7 derniers jours</option>
                  <option value="30d">30 derniers jours</option>
                  <option value="90d">90 derniers jours</option>
                  <option value="all">Toutes les périodes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tri</label>
                <div className="flex space-x-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="createdAt">Date création</option>
                    <option value="duration">Durée</option>
                    <option value="amount">Montant</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    title={`Tri ${sortOrder === 'asc' ? 'croissant' : 'décroissant'}`}
                  >
                    <ArrowUpDown size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Rechercher par ID session, nom, téléphone, Intent ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>
              
              <div className="text-sm text-gray-600">
                {filteredSessions.length} session{filteredSessions.length > 1 ? 's' : ''} trouvée{filteredSessions.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Table des sessions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durée
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paiement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 font-mono">
                            {session.id.substring(0, 12)}...
                          </div>
                          <div className="text-xs text-gray-500">
                            {session.metadata.serviceType === 'lawyer_call' ? '⚖️ Avocat' : '🌍 Expatrié'}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={session.status} />
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <ParticipantInfo
                            participant={session.participants.provider}
                            name={session.metadata.providerName}
                            type="provider"
                          />
                          <ParticipantInfo
                            participant={session.participants.client}
                            name={session.metadata.clientName}
                            type="client"
                          />
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <DurationDisplay
                          duration={session.conference.duration}
                          startTime={session.conference.startedAt}
                          endTime={session.conference.endedAt}
                        />
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PaymentStatusBadge
                          status={session.payment.status}
                          amount={session.payment.amount}
                        />
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDateTime(session.metadata.createdAt)}
                        </div>
                        {session.conference.startedAt && (
                          <div className="text-xs text-gray-500">
                            Démarré: {formatDateTime(session.conference.startedAt)}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedSession(session);
                              setShowDetailModal(true);
                            }}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Voir détails"
                          >
                            <Eye size={16} />
                          </button>
                          
                          <button
                            onClick={() => copyToClipboard(session.id)}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                            title="Copier ID"
                          >
                            <Copy size={16} />
                          </button>
                          
                          {session.conference.recordingUrl && (
                            <button
                              onClick={() => window.open(session.conference.recordingUrl, '_blank')}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                              title="Écouter enregistrement"
                            >
                              <Volume2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Message si aucune session */}
            {filteredSessions.length === 0 && (
              <div className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune session trouvée</h3>
                <p className="text-gray-600">
                  Aucune session ne correspond aux critères de recherche sélectionnés.
                </p>
              </div>
            )}

            {/* Bouton charger plus */}
            {hasMore && filteredSessions.length > 0 && (
              <div className="border-t border-gray-200 px-6 py-4 text-center">
                <Button
                  onClick={() => loadSessions(false)}
                  loading={loadingMore}
                  variant="outline"
                  className="w-full"
                >
                  {loadingMore ? 'Chargement...' : `Charger ${ITEMS_PER_PAGE} sessions de plus`}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Modal détails de session */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="Détails de la session"
          size="large"
        >
          {selectedSession && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Session #{selectedSession.id}
                  </h3>
                  <div className="flex items-center space-x-3">
                    <StatusBadge status={selectedSession.status} size="md" />
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      selectedSession.metadata.serviceType === 'lawyer_call'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedSession.metadata.serviceType === 'lawyer_call' ? '⚖️ Appel Avocat' : '🌍 Appel Expatrié'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <DurationDisplay
                    duration={selectedSession.conference.duration}
                    startTime={selectedSession.conference.startedAt}
                    endTime={selectedSession.conference.endedAt}
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {selectedSession.payment.amount.toFixed(2)}€
                  </div>
                </div>
              </div>

              {/* Détails participants */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Users className="mr-2" size={16} />
                    Prestataire
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">Nom:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.metadata.providerName || 'Non disponible'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">ID:</span>
                      <span className="text-sm font-mono ml-2">{selectedSession.metadata.providerId.substring(0, 12)}...</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Téléphone:</span>
                      <span className="text-sm font-mono ml-2">{selectedSession.participants.provider.phone}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Statut:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.participants.provider.status}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Tentatives:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.participants.provider.attemptCount}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Users className="mr-2" size={16} />
                    Client
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">Nom:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.metadata.clientName || 'Non disponible'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">ID:</span>
                      <span className="text-sm font-mono ml-2">{selectedSession.metadata.clientId.substring(0, 12)}...</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Téléphone:</span>
                      <span className="text-sm font-mono ml-2">{selectedSession.participants.client.phone}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Statut:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.participants.client.status}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Tentatives:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.participants.client.attemptCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Paiement et métadonnées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <DollarSign className="mr-2" size={16} />
                    Paiement
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">Montant:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.payment.amount.toFixed(2)}€</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Statut:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.payment.status}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Intent ID:</span>
                      <span className="text-sm font-mono ml-2">{selectedSession.payment.intentId}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <FileText className="mr-2" size={16} />
                    Métadonnées
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">Type:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.metadata.providerType}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Durée max:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.metadata.maxDuration / 60} min</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Créée:</span>
                      <span className="text-sm font-medium ml-2">{formatDateTime(selectedSession.metadata.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <Button
                    onClick={() => copyToClipboard(selectedSession.id)}
                    variant="outline"
                    className="flex items-center"
                  >
                    <Copy size={16} className="mr-2" />
                    Copier ID
                  </Button>
                  
                  {selectedSession.conference.recordingUrl && (
                    <Button
                      onClick={() => window.open(selectedSession.conference.recordingUrl, '_blank')}
                      variant="outline"
                      className="flex items-center"
                    >
                      <ExternalLink size={16} className="mr-2" />
                      Enregistrement
                    </Button>
                  )}
                </div>
                
                <Button
                  onClick={() => setShowDetailModal(false)}
                  variant="primary"
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal statistiques */}
        <Modal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          title="Statistiques détaillées"
          size="large"
        >
          {sessionStats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{sessionStats.totalSessions}</div>
                  <div className="text-sm text-blue-800">Sessions Total</div>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-2">{sessionStats.completedSessions}</div>
                  <div className="text-sm text-green-800">Sessions Réussies</div>
                </div>
                <div className="text-center p-6 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-600 mb-2">{sessionStats.failedSessions}</div>
                  <div className="text-sm text-red-800">Sessions Échouées</div>
                </div>
              </div>

              <div className="text-center">
                <Button
                  onClick={() => setShowStatsModal(false)}
                  variant="primary"
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminCallsSessions;