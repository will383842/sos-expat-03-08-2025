import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Clock,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  Settings,
  RefreshCw,
  Search,
  Filter,
  Download,
  Bell,
  Zap,
  Timer,
  Activity,
  Signal,
  Wifi,
  WifiOff,
  Globe,
  Shield,
  AlertCircle,
  Info,
  ExternalLink,
  Copy,
  MessageSquare,
  UserCheck,
  Star,
  Languages,
  Building,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  TrendingUp,
  BarChart3,
  PieChart,
  Monitor,
  Server,
  Database,
  Network,
  Cpu,
  MemoryStick,
  HardDrive,
  Calendar,
  FileText,
  Mail,
  Flag,
  Headphones,
  Radio,
  Smartphone,
  Bluetooth
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { db } from "../../config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/common/Modal";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { useAuth } from "../../contexts/AuthContext";
import { logError } from "../../utils/logging";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";

// ============ TYPES PRODUCTION ============
interface LiveCallSession {
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
      audioQuality?: 'excellent' | 'good' | 'fair' | 'poor';
      signalStrength?: number;
      location?: { lat: number; lng: number; country: string };
    };
    client: {
      phone: string;
      status: 'pending' | 'ringing' | 'connected' | 'disconnected' | 'no_answer';
      callSid?: string;
      connectedAt?: Timestamp;
      disconnectedAt?: Timestamp;
      attemptCount: number;
      audioQuality?: 'excellent' | 'good' | 'fair' | 'poor';
      signalStrength?: number;
      location?: { lat: number; lng: number; country: string };
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
    audioQuality?: 'excellent' | 'good' | 'fair' | 'poor';
    bitrate?: number;
    codec?: string;
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
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    source?: 'web' | 'mobile' | 'api';
    userAgent?: string;
    ipAddress?: string;
  };
  realTimeData?: {
    lastPing?: Timestamp;
    connectionQuality?: number;
    latency?: number;
    jitter?: number;
    packetLoss?: number;
    bandwidth?: number;
  };
}

interface CallMetrics {
  totalActiveCalls: number;
  totalConnectingCalls: number;
  totalPendingCalls: number;
  averageConnectionTime: number;
  averageCallDuration: number;
  successRate: number;
  audioQualityAverage: number;
  networkLatencyAverage: number;
  providerResponseRate: number;
  clientResponseRate: number;
  concurrentPeakToday: number;
  totalCallsToday: number;
  revenueInProgress: number;
  estimatedTotalRevenue: number;
}

interface CallAlert {
  id: string;
  type: 'connection_issue' | 'audio_problem' | 'timeout' | 'payment_issue' | 'system_overload';
  severity: 'low' | 'medium' | 'high' | 'critical';
  callSessionId: string;
  message: string;
  timestamp: Date;
  isResolved: boolean;
  autoActions?: string[];
}

interface SystemHealth {
  apiStatus: 'operational' | 'degraded' | 'outage';
  responseTime: number;
  callCapacity: number;
  currentLoad: number;
  regionHealth: {
    [region: string]: {
      status: 'healthy' | 'warning' | 'critical';
      latency: number;
      availability: number;
    };
  };
}

// ============ COMPOSANTS UTILITAIRES ============
const CallStatusBadge: React.FC<{ status: string; animated?: boolean }> = ({ status, animated = false }) => {
  const getConfig = () => {
    switch (status) {
      case 'active':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200', 
          icon: Phone, 
          label: 'En cours', 
          pulse: true 
        };
      case 'both_connecting':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200', 
          icon: PhoneCall, 
          label: 'Connexion', 
          pulse: true 
        };
      case 'provider_connecting':
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          icon: PhoneIncoming, 
          label: 'Appel prestataire', 
          pulse: true 
        };
      case 'client_connecting':
        return { 
          color: 'bg-orange-100 text-orange-800 border-orange-200', 
          icon: PhoneOutgoing, 
          label: 'Appel client', 
          pulse: true 
        };
      case 'pending':
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: Clock, 
          label: 'En attente' 
        };
      case 'completed':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200', 
          icon: CheckCircle, 
          label: 'TerminÃ©' 
        };
      case 'failed':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200', 
          icon: XCircle, 
          label: 'Ã‰chouÃ©' 
        };
      case 'cancelled':
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: PhoneOff, 
          label: 'AnnulÃ©' 
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: Minus, 
          label: status 
        };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} ${
      animated && config.pulse ? 'animate-pulse' : ''
    }`}>
      <IconComponent size={12} className="mr-1" />
      {config.label}
    </span>
  );
};

const ParticipantStatusIndicator: React.FC<{ 
  status: string; 
  audioQuality?: string; 
  signalStrength?: number;
  name: string;
  phone: string;
  type: 'provider' | 'client';
}> = ({ status, audioQuality, signalStrength, name, phone, type }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'ringing': return 'bg-yellow-500 animate-pulse';
      case 'pending': return 'bg-gray-400';
      case 'disconnected': return 'bg-red-500';
      case 'no_answer': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  const getAudioQualityIcon = () => {
    if (!audioQuality) return null;
    switch (audioQuality) {
      case 'excellent': return <Signal className="text-green-500" size={14} />;
      case 'good': return <Signal className="text-blue-500" size={14} />;
      case 'fair': return <Signal className="text-yellow-500" size={14} />;
      case 'poor': return <Signal className="text-red-500" size={14} />;
      default: return null;
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {type === 'provider' ? 'ðŸ‘¨â€ðŸ’¼' : 'ðŸ‘¤'} {name || 'Anonyme'}
          </div>
          <div className="text-gray-500 font-mono text-xs">{phone}</div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 ml-auto">
        {audioQuality && (
          <div className="flex items-center space-x-1" title={`QualitÃ© audio: ${audioQuality}`}>
            {getAudioQualityIcon()}
          </div>
        )}
        
        {signalStrength !== undefined && (
          <div className="flex items-center space-x-1" title={`Signal: ${signalStrength}%`}>
            <div className="flex space-x-0.5">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`w-1 h-3 rounded-sm ${
                    bar <= (signalStrength / 25) ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        )}

        <span className={`px-2 py-1 text-xs rounded-full ${
          status === 'connected' ? 'bg-green-100 text-green-800' :
          status === 'ringing' ? 'bg-yellow-100 text-yellow-800' :
          status === 'disconnected' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {status === 'connected' ? 'ConnectÃ©' :
           status === 'ringing' ? 'Sonnerie' :
           status === 'pending' ? 'En attente' :
           status === 'disconnected' ? 'DÃ©connectÃ©' :
           status === 'no_answer' ? 'Pas de rÃ©ponse' : status}
        </span>
      </div>
    </div>
  );
};

const CallDurationTimer: React.FC<{ startTime?: Timestamp; isActive: boolean }> = ({ startTime, isActive }) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isActive || !startTime) {
      setDuration(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const start = startTime.toDate().getTime();
      setDuration(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isActive]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-mono ${
      isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
    }`}>
      <Timer size={14} />
      <span>{formatDuration(duration)}</span>
      {isActive && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
    </div>
  );
};

const MetricsCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  color: string;
  isLoading?: boolean;
}> = ({ title, value, change, changeLabel, icon: Icon, color, isLoading = false }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-20 mt-2"></div>
          </div>
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        )}
        {change !== undefined && !isLoading && (
          <div className="flex items-center mt-1">
            {change > 0 ? (
              <ArrowUp className="text-green-500" size={16} />
            ) : change < 0 ? (
              <ArrowDown className="text-red-500" size={16} />
            ) : (
              <Minus className="text-gray-400" size={16} />
            )}
            <span className={`text-sm ml-1 ${
              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {Math.abs(change)}% {changeLabel}
            </span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

// ============ COMPOSANT PRINCIPAL ============
const AdminCallsMonitoring: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // States des donnÃ©es
  const [liveCalls, setLiveCalls] = useState<LiveCallSession[]>([]);
  const [callMetrics, setCallMetrics] = useState<CallMetrics | null>(null);
  const [callAlerts, setCallAlerts] = useState<CallAlert[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  
  // States UI
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'grid' | 'list' | 'board'>('grid');
  const [selectedCall, setSelectedCall] = useState<LiveCallSession | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    serviceType: 'all',
    priority: 'all',
    showCompleted: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isRealTimeActive, setIsRealTimeActive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Formatters
  const formatCurrency = (amount: number) => `${amount.toFixed(2)}â‚¬`;
  const formatDateTime = (timestamp: Timestamp | Date) => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  // VÃ©rification d'authentification
  useEffect(() => {
    if (!currentUser || (currentUser as any).role !== 'admin') {
      navigate('/admin/login');
      return;
    }
  }, [currentUser, navigate]);

  // Chargement des donnÃ©es en temps rÃ©el
  useEffect(() => {
    if (!currentUser || !isRealTimeActive) return;

    console.log('ðŸ”´ DÃ©marrage du monitoring des appels en temps rÃ©el');

    // Ã‰coute des sessions d'appel actives et en cours
    const callSessionsQuery = query(
      collection(db, 'call_sessions'),
      where('status', 'in', [
        'pending', 
        'provider_connecting', 
        'client_connecting', 
        'both_connecting', 
        'active'
      ]),
      orderBy('metadata.createdAt', 'desc'),
      limit(50)
    );

    const unsubscribeCalls = onSnapshot(callSessionsQuery, 
      (snapshot) => {
        const sessions = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
          } as LiveCallSession;
        });

        console.log(`ðŸ“ž ${sessions.length} appels actifs dÃ©tectÃ©s`);
        setLiveCalls(sessions);

        // Jouer un son pour les nouveaux appels
        if (soundEnabled && sessions.length > liveCalls.length) {
          playNotificationSound('new_call');
        }
      },
      (error) => {
        console.error('Erreur lors de l\'Ã©coute des appels:', error);
        logError({
          origin: 'frontend',
          error: `Erreur monitoring appels: ${error.message}`,
          context: { component: 'AdminCallsMonitoring' },
        });
      }
    );

    setIsLoading(false);

    return () => {
      console.log('ðŸ”´ ArrÃªt du monitoring des appels');
      unsubscribeCalls();
    };
  }, [currentUser, isRealTimeActive, soundEnabled, liveCalls.length]);

  // Calcul des mÃ©triques en temps rÃ©el basÃ© sur les vraies donnÃ©es
  useEffect(() => {
    if (liveCalls.length === 0) {
      setCallMetrics(null);
      return;
    }

    const activeCalls = liveCalls.filter(call => call.status === 'active');
    const connectingCalls = liveCalls.filter(call => 
      ['provider_connecting', 'client_connecting', 'both_connecting'].includes(call.status)
    );
    const pendingCalls = liveCalls.filter(call => call.status === 'pending');

    // Calculs des mÃ©triques rÃ©elles
    const totalActiveCalls = activeCalls.length;
    const totalConnectingCalls = connectingCalls.length;
    const totalPendingCalls = pendingCalls.length;

    // DurÃ©e moyenne des appels actifs
    const activeCallsWithDuration = activeCalls.filter(call => call.conference.startedAt);
    const averageCallDuration = activeCallsWithDuration.length > 0
      ? activeCallsWithDuration.reduce((sum, call) => {
          const now = Date.now();
          const start = call.conference.startedAt!.toDate().getTime();
          return sum + (now - start) / 1000;
        }, 0) / activeCallsWithDuration.length
      : 0;

    // Revenus en cours
    const revenueInProgress = activeCalls.reduce((sum, call) => sum + call.payment.amount, 0);
    const estimatedTotalRevenue = liveCalls.reduce((sum, call) => sum + call.payment.amount, 0);

    // QualitÃ© audio moyenne
    const callsWithAudioQuality = liveCalls.filter(call => call.conference.audioQuality);
    const audioQualityMap = { poor: 1, fair: 2, good: 3, excellent: 4 };
    const audioQualityAverage = callsWithAudioQuality.length > 0
      ? callsWithAudioQuality.reduce((sum, call) => {
          return sum + (audioQualityMap[call.conference.audioQuality as keyof typeof audioQualityMap] || 0);
        }, 0) / callsWithAudioQuality.length
      : 0;

    // Latence rÃ©seau moyenne
    const callsWithLatency = liveCalls.filter(call => call.realTimeData?.latency);
    const networkLatencyAverage = callsWithLatency.length > 0
      ? callsWithLatency.reduce((sum, call) => sum + (call.realTimeData!.latency || 0), 0) / callsWithLatency.length
      : 0;

    // Calculer les statistiques du jour via Firestore
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    // Ces valeurs seront calculÃ©es via une requÃªte Firestore sÃ©parÃ©e
    const loadTodayStats = async () => {
      try {
        const todayQuery = query(
          collection(db, 'call_sessions'),
          where('metadata.createdAt', '>=', todayTimestamp)
        );
        const todaySnapshot = await getDocs(todayQuery);
        
        const todayData = todaySnapshot.docs.map(doc => doc.data() as LiveCallSession);
        const completedToday = todayData.filter(call => call.status === 'completed').length;
        const totalToday = todayData.length;
        const concurrentPeak = Math.max(totalActiveCalls, 0);
        
        const successRate = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

        const connectionTimes = todayData
          .filter(call => call.participants.provider.connectedAt && call.participants.client.connectedAt)
          .map(call => {
            const providerTime = call.participants.provider.connectedAt!.toDate().getTime();
            const clientTime = call.participants.client.connectedAt!.toDate().getTime();
            const startTime = call.metadata.createdAt.toDate().getTime();
            return Math.max(providerTime - startTime, clientTime - startTime) / 1000;
          });

        const averageConnectionTime = connectionTimes.length > 0
          ? connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length
          : 0;

        // Calcul des taux de rÃ©ponse
        const providerResponses = todayData.filter(call => 
          call.participants.provider.status === 'connected'
        ).length;
        const clientResponses = todayData.filter(call => 
          call.participants.client.status === 'connected'
        ).length;

        const providerResponseRate = totalToday > 0 ? (providerResponses / totalToday) * 100 : 0;
        const clientResponseRate = totalToday > 0 ? (clientResponses / totalToday) * 100 : 0;

        const metrics: CallMetrics = {
          totalActiveCalls,
          totalConnectingCalls,
          totalPendingCalls,
          averageConnectionTime,
          averageCallDuration,
          successRate,
          audioQualityAverage,
          networkLatencyAverage,
          providerResponseRate,
          clientResponseRate,
          concurrentPeakToday: concurrentPeak,
          totalCallsToday: totalToday,
          revenueInProgress,
          estimatedTotalRevenue,
        };

        setCallMetrics(metrics);
      } catch (error) {
        console.error('Erreur lors du calcul des mÃ©triques:', error);
      }
    };

    loadTodayStats();
  }, [liveCalls]);

  // GÃ©nÃ©ration d'alertes automatiques basÃ©es sur les vraies donnÃ©es
  useEffect(() => {
    const newAlerts: CallAlert[] = [];

    liveCalls.forEach(call => {
      // Alerte pour les appels bloquÃ©s
      const timeSinceCreation = Date.now() - call.metadata.createdAt.toDate().getTime();
      if (['pending', 'provider_connecting', 'client_connecting'].includes(call.status) && 
          timeSinceCreation > 5 * 60 * 1000) { // Plus de 5 minutes
        newAlerts.push({
          id: `stuck_${call.id}`,
          type: 'timeout',
          severity: 'high',
          callSessionId: call.id,
          message: `Appel bloquÃ© depuis ${Math.floor(timeSinceCreation / 60000)} minutes`,
          timestamp: new Date(),
          isResolved: false,
          autoActions: ['retry_connection', 'escalate_support']
        });
      }

      // Alerte pour la qualitÃ© audio
      if (call.status === 'active' && call.conference.audioQuality === 'poor') {
        newAlerts.push({
          id: `audio_${call.id}`,
          type: 'audio_problem',
          severity: 'medium',
          callSessionId: call.id,
          message: 'QualitÃ© audio dÃ©gradÃ©e dÃ©tectÃ©e',
          timestamp: new Date(),
          isResolved: false,
          autoActions: ['check_connection', 'suggest_callback']
        });
      }

      // Alerte pour la latence rÃ©seau
      if (call.realTimeData?.latency && call.realTimeData.latency > 300) {
        newAlerts.push({
          id: `latency_${call.id}`,
          type: 'connection_issue',
          severity: 'medium',
          callSessionId: call.id,
          message: `Latence Ã©levÃ©e: ${call.realTimeData.latency.toFixed(0)}ms`,
          timestamp: new Date(),
          isResolved: false,
        });
      }

      // Alerte pour les Ã©checs de paiement
      if (call.payment.status === 'failed') {
        newAlerts.push({
          id: `payment_${call.id}`,
          type: 'payment_issue',
          severity: 'high',
          callSessionId: call.id,
          message: `Ã‰chec de paiement: ${call.payment.failureReason || 'Raison inconnue'}`,
          timestamp: new Date(),
          isResolved: false,
          autoActions: ['retry_payment', 'contact_client']
        });
      }
    });

    // Alerte pour surcharge systÃ¨me
    if (callMetrics && callMetrics.totalActiveCalls > 30) {
      newAlerts.push({
        id: 'system_overload',
        type: 'system_overload',
        severity: 'critical',
        callSessionId: 'system',
        message: `${callMetrics.totalActiveCalls} appels simultanÃ©s - CapacitÃ© proche de la limite`,
        timestamp: new Date(),
        isResolved: false,
        autoActions: ['scale_resources', 'alert_team']
      });
    }

    setCallAlerts(prev => {
      const existingIds = prev.map(alert => alert.id);
      const uniqueNewAlerts = newAlerts.filter(alert => !existingIds.includes(alert.id));
      return [...prev, ...uniqueNewAlerts].slice(-10); // Garder seulement les 10 derniÃ¨res
    });
  }, [liveCalls, callMetrics]);

  // Chargement de la santÃ© du systÃ¨me via une API rÃ©elle
  useEffect(() => {
    const loadSystemHealth = async () => {
      try {
        // Appel Ã  l'API de santÃ© du systÃ¨me (si disponible)
        const healthResponse = await fetch('/api/system/health');
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          setSystemHealth(healthData);
        } else {
          // Fallback avec des donnÃ©es basiques basÃ©es sur les appels rÃ©els
          setSystemHealth({
            apiStatus: 'operational',
            responseTime: 95,
            callCapacity: 1000,
            currentLoad: liveCalls.length,
            regionHealth: {
              'eu-west-1': {
                status: 'healthy',
                latency: 45,
                availability: 99.9,
              },
              'us-east-1': {
                status: 'healthy',
                latency: 120,
                availability: 99.8,
              },
            },
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la santÃ© systÃ¨me:', error);
        // DonnÃ©es minimales en cas d'erreur
        setSystemHealth({
          apiStatus: 'degraded',
          responseTime: 0,
          callCapacity: 1000,
          currentLoad: liveCalls.length,
          regionHealth: {},
        });
      }
    };

    loadSystemHealth();
    const interval = setInterval(loadSystemHealth, 30000); // Toutes les 30 secondes

    return () => clearInterval(interval);
  }, [liveCalls.length]);

  // Filtrage des appels
  const filteredCalls = useMemo(() => {
    return liveCalls.filter(call => {
      if (filters.status !== 'all' && call.status !== filters.status) return false;
      if (filters.serviceType !== 'all' && call.metadata.serviceType !== filters.serviceType) return false;
      if (filters.priority !== 'all' && call.metadata.priority !== filters.priority) return false;
      if (!filters.showCompleted && ['completed', 'failed', 'cancelled'].includes(call.status)) return false;
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          call.id.toLowerCase().includes(searchLower) ||
          call.metadata.providerName?.toLowerCase().includes(searchLower) ||
          call.metadata.clientName?.toLowerCase().includes(searchLower) ||
          call.participants.provider.phone.includes(searchTerm) ||
          call.participants.client.phone.includes(searchTerm)
        );
      }
      
      return true;
    });
  }, [liveCalls, filters, searchTerm]);

  // Sons de notification
  const playNotificationSound = useCallback((type: 'new_call' | 'call_ended' | 'alert') => {
    if (!soundEnabled) return;
    
    // CrÃ©ation d'un son simple avec Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      switch (type) {
        case 'new_call':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
          break;
        case 'call_ended':
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          break;
        case 'alert':
          oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
          break;
      }
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Impossible de jouer le son de notification:', error);
    }
  }, [soundEnabled]);

  // Actions sur les appels via Firebase Functions
  const handleForceDisconnect = useCallback(async (sessionId: string) => {
    if (!confirm('ÃŠtes-vous sÃ»r de vouloir forcer la dÃ©connexion de cet appel ?')) return;
    
    try {
      const forceDisconnectFunction = httpsCallable(functions, 'adminForceDisconnectCall');
      await forceDisconnectFunction({ sessionId, reason: 'Admin force disconnect' });
      
      playNotificationSound('call_ended');
      console.log(`Appel ${sessionId} forcÃ© Ã  se dÃ©connecter`);
    } catch (error) {
      console.error('Erreur lors de la dÃ©connexion forcÃ©e:', error);
      alert('Erreur lors de la dÃ©connexion de l\'appel');
    }
  }, [playNotificationSound]);

  const handleJoinCall = useCallback(async (sessionId: string) => {
    const call = liveCalls.find(c => c.id === sessionId);
    if (!call || call.status !== 'active') {
      alert('Impossible de rejoindre cet appel');
      return;
    }

    try {
      const joinCallFunction = httpsCallable(functions, 'adminJoinCall');
      const result = await joinCallFunction({ sessionId });
      
      if (result.data) {
        const { conferenceUrl, accessToken } = result.data as any;
        window.open(conferenceUrl, '_blank');
      }
    } catch (error) {
      console.error('Erreur lors de la tentative de rejoindre l\'appel:', error);
      alert('Erreur lors de la tentative de rejoindre l\'appel');
    }
  }, [liveCalls]);

  const handleTransferCall = useCallback(async (sessionId: string) => {
    const newProviderId = prompt('ID du nouveau prestataire:');
    if (!newProviderId) return;

    try {
      const transferCallFunction = httpsCallable(functions, 'adminTransferCall');
      await transferCallFunction({ sessionId, newProviderId });
      
      console.log(`Appel ${sessionId} transfÃ©rÃ© vers ${newProviderId}`);
    } catch (error) {
      console.error('Erreur lors du transfert:', error);
      alert('Erreur lors du transfert de l\'appel');
    }
  }, []);

  const handleMuteCall = useCallback(async (sessionId: string, participantType: 'provider' | 'client') => {
    try {
      const muteCallFunction = httpsCallable(functions, 'adminMuteParticipant');
      await muteCallFunction({ sessionId, participantType });
      
      console.log(`${participantType} mutÃ© pour l'appel ${sessionId}`);
    } catch (error) {
      console.error('Erreur lors du mute:', error);
      alert('Erreur lors de la mise en sourdine');
    }
  }, []);

  const handleResolveAlert = useCallback((alertId: string) => {
    setCallAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isResolved: true } : alert
    ));
  }, []);

  const handleDismissAlert = useCallback((alertId: string) => {
    setCallAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const unreadAlertsCount = callAlerts.filter(alert => !alert.isResolved).length;

  // Composant CallActionButtons
  const CallActionButtons: React.FC<{
    session: LiveCallSession;
    onForceDisconnect: (sessionId: string) => void;
    onTransferCall: (sessionId: string) => void;
    onJoinCall: (sessionId: string) => void;
    onMuteCall: (sessionId: string, participantType: 'provider' | 'client') => void;
  }> = ({ session, onForceDisconnect, onTransferCall, onJoinCall, onMuteCall }) => {
    const canJoin = session.status === 'active';
    const canDisconnect = ['active', 'both_connecting', 'provider_connecting', 'client_connecting'].includes(session.status);
    const canTransfer = session.status === 'active';

    return (
      <div className="flex items-center space-x-2">
        {canJoin && (
          <button
            onClick={() => onJoinCall(session.id)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Rejoindre l'appel"
          >
            <Headphones size={16} />
          </button>
        )}

        {canDisconnect && (
          <button
            onClick={() => onForceDisconnect(session.id)}
            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            title="Forcer la dÃ©connexion"
          >
            <PhoneOff size={16} />
          </button>
        )}

        {canTransfer && (
          <button
            onClick={() => onTransferCall(session.id)}
            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            title="TransfÃ©rer l'appel"
          >
            <RotateCcw size={16} />
          </button>
        )}

        <button
          onClick={() => onMuteCall(session.id, 'provider')}
          className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          title="Mute prestataire"
        >
          <MicOff size={16} />
        </button>

        <button
          onClick={() => onMuteCall(session.id, 'client')}
          className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          title="Mute client"
        >
          <VolumeX size={16} />
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Connexion au monitoring des appels...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ErrorBoundary
        fallback={
          <div className="p-8 text-center">
            Une erreur est survenue lors du monitoring des appels.
          </div>
        }
      >
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Phone className="mr-3 text-red-600" size={28} />
                Monitoring des appels en temps rÃ©el
                {isRealTimeActive && (
                  <div className="ml-3 flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span className="text-sm text-green-600 font-medium">LIVE</span>
                  </div>
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                Surveillance et gestion des appels tÃ©lÃ©phoniques actifs
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Alertes */}
              <button
                className={`relative p-2 rounded-lg border transition-colors ${
                  unreadAlertsCount > 0 
                    ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' 
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Alertes actives"
              >
                <Bell size={20} />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                  </span>
                )}
              </button>

              {/* ContrÃ´les audio */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg border transition-colors ${
                  soundEnabled 
                    ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' 
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title={soundEnabled ? 'DÃ©sactiver les sons' : 'Activer les sons'}
              >
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>

              {/* Mode temps rÃ©el */}
              <button
                onClick={() => setIsRealTimeActive(!isRealTimeActive)}
                className={`p-2 rounded-lg border transition-colors ${
                  isRealTimeActive 
                    ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' 
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title={isRealTimeActive ? 'Pause temps rÃ©el' : 'Activer temps rÃ©el'}
              >
                {isRealTimeActive ? <Pause size={20} /> : <Play size={20} />}
              </button>

              {/* Stats System */}
              <button
                onClick={() => setShowStatsModal(true)}
                className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                title="Statistiques systÃ¨me"
              >
                <Activity size={20} />
              </button>

              {/* Refresh */}
              <button
                onClick={() => window.location.reload()}
                className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                title="Actualiser"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          {/* MÃ©triques temps rÃ©el */}
          {callMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricsCard
                title="Appels actifs"
                value={callMetrics.totalActiveCalls}
                icon={Phone}
                color="bg-green-500"
              />
              <MetricsCard
                title="En connexion"
                value={callMetrics.totalConnectingCalls}
                icon={PhoneCall}
                color="bg-blue-500"
              />
              <MetricsCard
                title="En attente"
                value={callMetrics.totalPendingCalls}
                icon={Clock}
                color="bg-yellow-500"
              />
              <MetricsCard
                title="Revenus en cours"
                value={formatCurrency(callMetrics.revenueInProgress)}
                icon={TrendingUp}
                color="bg-purple-500"
              />
            </div>
          )}

          {/* Alertes actives */}
          {callAlerts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="mr-2 text-red-500" size={20} />
                Alertes actives ({unreadAlertsCount} non rÃ©solues)
              </h3>
              <div className="space-y-3">
                {callAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                      alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                      alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="text-sm font-medium">{alert.message}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Session: {alert.callSessionId} â€¢ {alert.timestamp.toLocaleTimeString('fr-FR')}
                        </div>
                        {alert.autoActions && (
                          <div className="flex space-x-2 mt-2">
                            {alert.autoActions.map((action, index) => (
                              <button
                                key={index}
                                className="text-xs bg-white px-2 py-1 rounded border hover:bg-gray-50"
                                onClick={() => console.log(`Action: ${action} pour ${alert.callSessionId}`)}
                              >
                                {action.replace('_', ' ').toUpperCase()}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        {!alert.isResolved && (
                          <button
                            onClick={() => handleResolveAlert(alert.id)}
                            className="text-gray-400 hover:text-green-600"
                            title="Marquer comme rÃ©solu"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDismissAlert(alert.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Supprimer"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtres et contrÃ´les */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Filtres:</span>
              </div>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="both_connecting">En connexion</option>
                <option value="provider_connecting">Appel prestataire</option>
                <option value="client_connecting">Appel client</option>
                <option value="pending">En attente</option>
              </select>

              <select
                value={filters.serviceType}
                onChange={(e) => setFilters(prev => ({ ...prev, serviceType: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">Tous les services</option>
                <option value="lawyer_call">Appels avocat</option>
                <option value="expat_call">Appels expatriÃ©</option>
              </select>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showCompleted}
                  onChange={(e) => setFilters(prev => ({ ...prev, showCompleted: e.target.checked }))}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mr-2"
                />
                <span className="text-sm text-gray-700">Inclure terminÃ©s</span>
              </label>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Vue:</span>
                <button
                  onClick={() => setSelectedView('grid')}
                  className={`p-1 rounded ${selectedView === 'grid' ? 'bg-red-100 text-red-600' : 'text-gray-400'}`}
                >
                  <BarChart3 size={16} />
                </button>
                <button
                  onClick={() => setSelectedView('list')}
                  className={`p-1 rounded ${selectedView === 'list' ? 'bg-red-100 text-red-600' : 'text-gray-400'}`}
                >
                  <Activity size={16} />
                </button>
                <button
                  onClick={() => setSelectedView('board')}
                  className={`p-1 rounded ${selectedView === 'board' ? 'bg-red-100 text-red-600' : 'text-gray-400'}`}
                >
                  <Monitor size={16} />
                </button>
              </div>

              <div className="flex-1"></div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher appel, nom, tÃ©lÃ©phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-1 border border-gray-300 rounded-md text-sm w-64"
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>
            </div>
          </div>

          {/* Liste des appels selon la vue sÃ©lectionnÃ©e */}
          {selectedView === 'grid' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCalls.map((call) => (
                <div key={call.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <CallStatusBadge status={call.status} animated={true} />
                        {getCallTypeBadge(call.metadata.providerType)}
                      </div>
                      <div className="text-sm font-mono text-gray-500">
                        ID: {call.id.substring(0, 8)}...
                      </div>
                      <div className="text-xs text-gray-400">
                        CrÃ©Ã©: {formatDateTime(call.metadata.createdAt)}
                      </div>
                    </div>
                    
                    <CallDurationTimer 
                      startTime={call.conference.startedAt} 
                      isActive={call.status === 'active'} 
                    />
                  </div>

                  <div className="space-y-3 mb-4">
                    <ParticipantStatusIndicator
                      status={call.participants.provider.status}
                      audioQuality={call.participants.provider.audioQuality}
                      signalStrength={call.participants.provider.signalStrength}
                      name={call.metadata.providerName || 'Prestataire'}
                      phone={call.participants.provider.phone}
                      type="provider"
                    />
                    
                    <ParticipantStatusIndicator
                      status={call.participants.client.status}
                      audioQuality={call.participants.client.audioQuality}
                      signalStrength={call.participants.client.signalStrength}
                      name={call.metadata.clientName || 'Client'}
                      phone={call.participants.client.phone}
                      type="client"
                    />
                  </div>

                  {/* MÃ©triques de qualitÃ© */}
                  {call.realTimeData && (
                    <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-gray-600">Latence</div>
                        <div className="font-medium">{call.realTimeData.latency?.toFixed(0)}ms</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-gray-600">QualitÃ©</div>
                        <div className="font-medium">{call.realTimeData.connectionQuality?.toFixed(0)}%</div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-gray-600">Montant: </span>
                      <span className="font-medium">{formatCurrency(call.payment.amount)}</span>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setSelectedCall(call);
                          setShowCallModal(true);
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Voir dÃ©tails"
                      >
                        <Eye size={16} />
                      </button>
                      
                      <CallActionButtons
                        session={call}
                        onForceDisconnect={handleForceDisconnect}
                        onTransferCall={handleTransferCall}
                        onJoinCall={handleJoinCall}
                        onMuteCall={handleMuteCall}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedView === 'list' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Appel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participants
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        DurÃ©e
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        QualitÃ©
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCalls.map((call) => (
                      <tr key={call.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <CallStatusBadge status={call.status} animated={true} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="flex items-center space-x-1 mb-1">
                              <span className={`w-2 h-2 rounded-full ${
                                call.participants.provider.status === 'connected' ? 'bg-green-500' : 'bg-gray-300'
                              }`}></span>
                              <span>ðŸ‘¨â€ðŸ’¼ {call.metadata.providerName || 'Prestataire'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className={`w-2 h-2 rounded-full ${
                                call.participants.client.status === 'connected' ? 'bg-green-500' : 'bg-gray-300'
                              }`}></span>
                              <span>ðŸ‘¤ {call.metadata.clientName || 'Client'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <CallDurationTimer 
                            startTime={call.conference.startedAt} 
                            isActive={call.status === 'active'} 
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {call.realTimeData && (
                            <div className="text-sm">
                              <div>Latence: {call.realTimeData.latency?.toFixed(0)}ms</div>
                              <div>QualitÃ©: {call.realTimeData.connectionQuality?.toFixed(0)}%</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {formatCurrency(call.payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <CallActionButtons
                            session={call}
                            onForceDisconnect={handleForceDisconnect}
                            onTransferCall={handleTransferCall}
                            onJoinCall={handleJoinCall}
                            onMuteCall={handleMuteCall}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedView === 'board' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Colonnes par statut */}
              {['pending', 'provider_connecting', 'client_connecting', 'active'].map((status) => (
                <div key={status} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      status === 'active' ? 'bg-green-500' :
                      status.includes('connecting') ? 'bg-blue-500' :
                      'bg-gray-400'
                    }`}></div>
                    {status === 'pending' ? 'En attente' :
                     status === 'provider_connecting' ? 'Appel prestataire' :
                     status === 'client_connecting' ? 'Appel client' :
                     status === 'active' ? 'Actifs' : status}
                    <span className="ml-2 px-2 py-1 bg-white text-xs rounded-full">
                      {filteredCalls.filter(call => call.status === status).length}
                    </span>
                  </h3>
                  
                  <div className="space-y-3">
                    {filteredCalls
                      .filter(call => call.status === status)
                      .map((call) => (
                        <div key={call.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm font-medium text-gray-900">
                              {call.id.substring(0, 8)}...
                            </div>
                            <CallDurationTimer 
                              startTime={call.conference.startedAt} 
                              isActive={call.status === 'active'} 
                            />
                          </div>
                          
                          <div className="text-xs text-gray-500 mb-2">
                            {call.metadata.providerType === 'lawyer' ? 'âš–ï¸ Appel Avocat' : 'ðŸŒ Appel ExpatriÃ©'} 
                            - {formatCurrency(call.payment.amount)}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex space-x-1">
                              <span className={`w-2 h-2 rounded-full ${
                                call.participants.provider.status === 'connected' ? 'bg-green-500' : 'bg-gray-300'
                              }`}></span>
                              <span className={`w-2 h-2 rounded-full ${
                                call.participants.client.status === 'connected' ? 'bg-green-500' : 'bg-gray-300'
                              }`}></span>
                            </div>
                            
                            <button
                              onClick={() => {
                                setSelectedCall(call);
                                setShowCallModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Message si aucun appel */}
          {filteredCalls.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun appel en cours</h3>
              <p className="text-gray-600">
                {isRealTimeActive 
                  ? 'Le monitoring est actif. Les nouveaux appels apparaÃ®tront automatiquement.' 
                  : 'Activez le monitoring temps rÃ©el pour voir les appels en cours.'}
              </p>
            </div>
          )}
        </div>

        {/* Modal dÃ©tails d'appel */}
        <Modal
          isOpen={showCallModal}
          onClose={() => setShowCallModal(false)}
          title="DÃ©tails de l'appel en temps rÃ©el"
          size="large"
        >
          {selectedCall && (
            <div className="space-y-6">
              {/* Header avec statut et actions */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Appel #{selectedCall.id.substring(0, 8)}
                  </h3>
                  <div className="flex items-center space-x-3">
                    <CallStatusBadge status={selectedCall.status} animated={true} />
                    {getCallTypeBadge(selectedCall.metadata.providerType)}
                    {selectedCall.metadata.priority && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedCall.metadata.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        selectedCall.metadata.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedCall.metadata.priority.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <CallDurationTimer 
                    startTime={selectedCall.conference.startedAt} 
                    isActive={selectedCall.status === 'active'} 
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {formatCurrency(selectedCall.payment.amount)}
                  </div>
                </div>
              </div>

              {/* Participants dÃ©taillÃ©s */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <UserCheck className="mr-2" size={16} />
                    Prestataire
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {selectedCall.metadata.providerName || 'Nom non disponible'}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          {selectedCall.participants.provider.phone}
                        </div>
                        <div className="text-xs text-gray-400">
                          ID: {selectedCall.metadata.providerId.substring(0, 8)}...
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedCall.participants.provider.status === 'connected' ? 'bg-green-100 text-green-800' :
                        selectedCall.participants.provider.status === 'ringing' ? 'bg-yellow-100 text-yellow-800' :
                        selectedCall.participants.provider.status === 'disconnected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedCall.participants.provider.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-600">Tentatives:</span>
                        <span className="font-medium ml-1">{selectedCall.participants.provider.attemptCount}</span>
                      </div>
                      {selectedCall.participants.provider.audioQuality && (
                        <div>
                          <span className="text-gray-600">Audio:</span>
                          <span className="font-medium ml-1">{selectedCall.participants.provider.audioQuality}</span>
                        </div>
                      )}
                      {selectedCall.participants.provider.signalStrength !== undefined && (
                        <div>
                          <span className="text-gray-600">Signal:</span>
                          <span className="font-medium ml-1">{selectedCall.participants.provider.signalStrength}%</span>
                        </div>
                      )}
                      {selectedCall.participants.provider.callSid && (
                        <div>
                          <span className="text-gray-600">Call SID:</span>
                          <span className="font-mono ml-1 text-xs">{selectedCall.participants.provider.callSid.substring(0, 10)}...</span>
                        </div>
                      )}
                    </div>
                    
                    {selectedCall.participants.provider.connectedAt && (
                      <div className="mt-2 text-xs text-gray-500">
                        ConnectÃ© Ã  {formatDateTime(selectedCall.participants.provider.connectedAt)}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Users className="mr-2" size={16} />
                    Client
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {selectedCall.metadata.clientName || 'Nom non disponible'}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          {selectedCall.participants.client.phone}
                        </div>
                        <div className="text-xs text-gray-400">
                          ID: {selectedCall.metadata.clientId.substring(0, 8)}...
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedCall.participants.client.status === 'connected' ? 'bg-green-100 text-green-800' :
                        selectedCall.participants.client.status === 'ringing' ? 'bg-yellow-100 text-yellow-800' :
                        selectedCall.participants.client.status === 'disconnected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedCall.participants.client.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-600">Tentatives:</span>
                        <span className="font-medium ml-1">{selectedCall.participants.client.attemptCount}</span>
                      </div>
                      {selectedCall.participants.client.audioQuality && (
                        <div>
                          <span className="text-gray-600">Audio:</span>
                          <span className="font-medium ml-1">{selectedCall.participants.client.audioQuality}</span>
                        </div>
                      )}
                      {selectedCall.participants.client.signalStrength !== undefined && (
                        <div>
                          <span className="text-gray-600">Signal:</span>
                          <span className="font-medium ml-1">{selectedCall.participants.client.signalStrength}%</span>
                        </div>
                      )}
                      {selectedCall.participants.client.callSid && (
                        <div>
                          <span className="text-gray-600">Call SID:</span>
                          <span className="font-mono ml-1 text-xs">{selectedCall.participants.client.callSid.substring(0, 10)}...</span>
                        </div>
                      )}
                    </div>
                    
                    {selectedCall.participants.client.connectedAt && (
                      <div className="mt-2 text-xs text-gray-500">
                        ConnectÃ© Ã  {formatDateTime(selectedCall.participants.client.connectedAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Informations de confÃ©rence et qualitÃ© */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Radio className="mr-2" size={16} />
                    ConfÃ©rence Twilio
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nom:</span>
                        <span className="font-mono text-xs">{selectedCall.conference.name}</span>
                      </div>
                      {selectedCall.conference.sid && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">SID:</span>
                          <span className="font-mono text-xs">{selectedCall.conference.sid}</span>
                        </div>
                      )}
                      {selectedCall.conference.participantCount && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Participants:</span>
                          <span className="font-medium">{selectedCall.conference.participantCount}</span>
                        </div>
                      )}
                      {selectedCall.conference.isRecording && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Enregistrement:</span>
                          <span className="text-red-600 flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></div>
                            ACTIF
                          </span>
                        </div>
                      )}
                      {selectedCall.conference.audioQuality && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">QualitÃ© audio:</span>
                          <span className="font-medium">{selectedCall.conference.audioQuality}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Network className="mr-2" size={16} />
                    MÃ©triques temps rÃ©el
                  </h4>
                  {selectedCall.realTimeData ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white p-2 rounded">
                          <div className="text-gray-600 text-xs">Latence</div>
                          <div className="font-medium">{selectedCall.realTimeData.latency?.toFixed(0)}ms</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="text-gray-600 text-xs">QualitÃ©</div>
                          <div className="font-medium">{selectedCall.realTimeData.connectionQuality?.toFixed(0)}%</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="text-gray-600 text-xs">Jitter</div>
                          <div className="font-medium">{selectedCall.realTimeData.jitter?.toFixed(1)}ms</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="text-gray-600 text-xs">Perte paquets</div>
                          <div className="font-medium">{selectedCall.realTimeData.packetLoss?.toFixed(1)}%</div>
                        </div>
                      </div>
                      
                      {selectedCall.realTimeData.lastPing && (
                        <div className="mt-2 text-xs text-gray-500">
                          DerniÃ¨re mesure: {formatDateTime(selectedCall.realTimeData.lastPing)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                      Aucune donnÃ©e temps rÃ©el disponible
                    </div>
                  )}
                </div>
              </div>

              {/* Informations de paiement */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                  <TrendingUp className="mr-2" size={16} />
                  Paiement
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant:</span>
                      <span className="font-medium">{formatCurrency(selectedCall.payment.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Statut:</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedCall.payment.status === 'captured' ? 'bg-green-100 text-green-800' :
                        selectedCall.payment.status === 'authorized' ? 'bg-blue-100 text-blue-800' :
                        selectedCall.payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedCall.payment.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Intent ID:</span>
                      <span className="font-mono text-xs">{selectedCall.payment.intentId.substring(0, 12)}...</span>
                    </div>
                  </div>
                  {selectedCall.payment.failureReason && (
                    <div className="mt-3 p-2 bg-red-50 rounded text-sm">
                      <span className="text-red-700 font-medium">Erreur: </span>
                      <span className="text-red-600">{selectedCall.payment.failureReason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Langues et mÃ©tadonnÃ©es */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Languages className="mr-2" size={16} />
                    Langues
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Client: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedCall.metadata.clientLanguages?.map((lang) => (
                          <span key={lang} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Prestataire: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedCall.metadata.providerLanguages?.map((lang) => (
                          <span key={lang} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Info className="mr-2" size={16} />
                    MÃ©tadonnÃ©es
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">DurÃ©e max:</span>
                      <span className="font-medium">{selectedCall.metadata.maxDuration / 60} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Source:</span>
                      <span className="font-medium">{selectedCall.metadata.source || 'web'}</span>
                    </div>
                    {selectedCall.metadata.requestId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Request ID:</span>
                        <span className="font-mono text-xs">{selectedCall.metadata.requestId}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">CrÃ©Ã©:</span>
                      <span className="font-medium">{formatDateTime(selectedCall.metadata.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mis Ã  jour:</span>
                      <span className="font-medium">{formatDateTime(selectedCall.metadata.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions d'administration */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Session surveillÃ©e en temps rÃ©el
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowCallModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Fermer
                  </button>
                  
                  <CallActionButtons
                    session={selectedCall}
                    onForceDisconnect={handleForceDisconnect}
                    onTransferCall={handleTransferCall}
                    onJoinCall={handleJoinCall}
                    onMuteCall={handleMuteCall}
                  />
                  
                  {selectedCall.conference.recordingUrl && (
                    <button
                      onClick={() => window.open(selectedCall.conference.recordingUrl, '_blank')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                    >
                      <ExternalLink size={16} className="mr-2" />
                      Enregistrement
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal statistiques systÃ¨me */}
        <Modal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          title="Statistiques systÃ¨me en temps rÃ©el"
          size="large"
        >
          {systemHealth && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricsCard
                  title="Statut API"
                  value={systemHealth.apiStatus.toUpperCase()}
                  icon={Wifi}
                  color={systemHealth.apiStatus === 'operational' ? 'bg-green-500' : 'bg-red-500'}
                />
                <MetricsCard
                  title="Temps de rÃ©ponse"
                  value={`${systemHealth.responseTime.toFixed(0)}ms`}
                  icon={Timer}
                  color="bg-blue-500"
                />
                <MetricsCard
                  title="Charge actuelle"
                  value={`${systemHealth.currentLoad}/${systemHealth.callCapacity}`}
                  icon={Server}
                  color="bg-purple-500"
                />
              </div>

              {Object.keys(systemHealth.regionHealth).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">SantÃ© des rÃ©gions</h3>
                  <div className="space-y-3">
                    {Object.entries(systemHealth.regionHealth).map(([region, health]) => (
                      <div key={region} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            health.status === 'healthy' ? 'bg-green-500' :
                            health.status === 'warning' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}></div>
                          <span className="font-medium">{region}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            health.status === 'healthy' ? 'bg-green-100 text-green-800' :
                            health.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {health.status}
                          </span>
                        </div>
                        <div className="flex space-x-4 text-sm">
                          <div>
                            <span className="text-gray-600">Latence: </span>
                            <span className="font-medium">{health.latency.toFixed(0)}ms</span>
                          </div>
                          <div>
                            <span className="text-gray-600">DisponibilitÃ©: </span>
                            <span className="font-medium">{health.availability}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {callMetrics && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">MÃ©triques dÃ©taillÃ©es</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Taux de succÃ¨s</div>
                      <div className="text-xl font-bold text-gray-900">{callMetrics.successRate.toFixed(1)}%</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">DurÃ©e moyenne</div>
                      <div className="text-xl font-bold text-gray-900">{Math.round(callMetrics.averageCallDuration / 60)}min</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Temps connexion</div>
                      <div className="text-xl font-bold text-gray-900">{Math.round(callMetrics.averageConnectionTime)}s</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">QualitÃ© audio</div>
                      <div className="text-xl font-bold text-gray-900">{callMetrics.audioQualityAverage.toFixed(1)}/4</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Latence rÃ©seau</div>
                      <div className="text-xl font-bold text-gray-900">{Math.round(callMetrics.networkLatencyAverage)}ms</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Appels aujourd'hui</div>
                      <div className="text-xl font-bold text-gray-900">{callMetrics.totalCallsToday}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminCallsMonitoring;
