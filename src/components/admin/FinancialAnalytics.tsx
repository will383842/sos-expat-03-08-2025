import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Calendar, Users, Percent, Download, Filter } from 'lucide-react';
import Button from '../common/Button';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  platformFee: number;
  providerAmount: number;
  status: string;
  serviceType: string;
  createdAt: Date;
  clientId: string;
  providerId: string;
}

interface AnalyticsData {
  totalRevenue: number;
  totalPlatformFees: number;
  totalProviderPayouts: number;
  paymentCount: number;
  avgTransactionValue: number;
  conversionRate: number;
  revenueByDay: Array<{ date: string; revenue: number; fees: number; count: number }>;
  revenueByService: Array<{ name: string; value: number; percentage: number }>;
  revenueByCurrency: Array<{ currency: string; amount: number; percentage: number }>;
  monthlyGrowth: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const FinancialAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedCurrency, setSelectedCurrency] = useState<'all' | 'eur' | 'usd'>('all');

  useEffect(() => {
    loadPaymentsData();
  }, [timeframe, selectedCurrency]);

  const loadPaymentsData = async () => {
    try {
      setLoading(true);
      
      // Calculer la date de début selon le timeframe
      const now = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Query Firebase
      let paymentsQuery = query(
        collection(db, 'payments'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('status', 'in', ['captured', 'succeeded']),
        orderBy('createdAt', 'desc')
      );

      if (selectedCurrency !== 'all') {
        paymentsQuery = query(
          collection(db, 'payments'),
          where('createdAt', '>=', Timestamp.fromDate(startDate)),
          where('currency', '==', selectedCurrency),
          where('status', 'in', ['captured', 'succeeded']),
          orderBy('createdAt', 'desc')
        );
      }

      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      const paymentsData: Payment[] = paymentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          amount: data.amount || 0,
          currency: data.currency || 'eur',
          platformFee: data.platformFee || data.commissionAmount || 0,
          providerAmount: data.providerAmount || 0,
          status: data.status || '',
          serviceType: data.serviceType || 'unknown',
          createdAt: data.createdAt?.toDate() || new Date(),
          clientId: data.clientId || '',
          providerId: data.providerId || ''
        };
      });

      setPayments(paymentsData);
      calculateAnalytics(paymentsData);
      
    } catch (error) {
      console.error('Erreur chargement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (paymentsData: Payment[]) => {
    if (paymentsData.length === 0) {
      setAnalytics({
        totalRevenue: 0,
        totalPlatformFees: 0,
        totalProviderPayouts: 0,
        paymentCount: 0,
        avgTransactionValue: 0,
        conversionRate: 0,
        revenueByDay: [],
        revenueByService: [],
        revenueByCurrency: [],
        monthlyGrowth: 0
      });
      return;
    }

    // Calculs de base
    const totalRevenue = paymentsData.reduce((sum, p) => sum + p.amount, 0);
    const totalPlatformFees = paymentsData.reduce((sum, p) => sum + p.platformFee, 0);
    const totalProviderPayouts = paymentsData.reduce((sum, p) => sum + p.providerAmount, 0);
    const paymentCount = paymentsData.length;
    const avgTransactionValue = totalRevenue / paymentCount;

    // Revenus par jour
    const revenueByDay: Array<{ date: string; revenue: number; fees: number; count: number }> = [];
    const dayMap = new Map<string, { revenue: number; fees: number; count: number }>();

    paymentsData.forEach(payment => {
      const dateKey = payment.createdAt.toISOString().split('T')[0];
      const existing = dayMap.get(dateKey) || { revenue: 0, fees: 0, count: 0 };
      
      dayMap.set(dateKey, {
        revenue: existing.revenue + payment.amount,
        fees: existing.fees + payment.platformFee,
        count: existing.count + 1
      });
    });

    // Trier par date
    Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, data]) => {
        revenueByDay.push({
          date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          ...data
        });
      });

    // Revenus par type de service
    const serviceMap = new Map<string, number>();
    paymentsData.forEach(payment => {
      const service = payment.serviceType === 'lawyer_call' ? 'Appels Avocat' : 'Appels Expatrié';
      serviceMap.set(service, (serviceMap.get(service) || 0) + payment.amount);
    });

    const revenueByService = Array.from(serviceMap.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: (value / totalRevenue) * 100
    }));

    // Revenus par devise
    const currencyMap = new Map<string, number>();
    paymentsData.forEach(payment => {
      const currency = payment.currency.toUpperCase();
      currencyMap.set(currency, (currencyMap.get(currency) || 0) + payment.amount);
    });

    const revenueByCurrency = Array.from(currencyMap.entries()).map(([currency, amount]) => ({
      currency,
      amount,
      percentage: (amount / totalRevenue) * 100
    }));

    // Calcul de croissance mensuelle (simplifié)
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const lastMonthRevenue = paymentsData
      .filter(p => p.createdAt >= lastMonth && p.createdAt < currentMonth)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const currentMonthRevenue = paymentsData
      .filter(p => p.createdAt >= currentMonth)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const monthlyGrowth = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    setAnalytics({
      totalRevenue,
      totalPlatformFees,
      totalProviderPayouts,
      paymentCount,
      avgTransactionValue,
      conversionRate: 85, // Placeholder - vous pouvez calculer depuis vos données
      revenueByDay,
      revenueByService,
      revenueByCurrency,
      monthlyGrowth
    });
  };

  const exportData = () => {
    if (!analytics || payments.length === 0) return;

    const csvData = payments.map(p => ({
      Date: p.createdAt.toLocaleDateString('fr-FR'),
      Montant: p.amount,
      Devise: p.currency.toUpperCase(),
      'Frais Plateforme': p.platformFee,
      'Rémunération Prestataire': p.providerAmount,
      'Type Service': p.serviceType === 'lawyer_call' ? 'Avocat' : 'Expatrié',
      Statut: p.status
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Calcul des analytics...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center text-gray-600">
        Aucune donnée disponible pour la période sélectionnée
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec filtres */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="w-7 h-7 mr-2 text-blue-600" />
            Analytics Financiers
          </h2>
          <p className="text-gray-600 mt-1">
            Analyse détaillée des revenus et performances
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
            <option value="1y">1 an</option>
          </select>
          
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes devises</option>
            <option value="eur">EUR seulement</option>
            <option value="usd">USD seulement</option>
          </select>
          
          <Button
            onClick={exportData}
            variant="outline"
            className="flex items-center"
          >
            <Download size={16} className="mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Revenus Totaux</p>
              <p className="text-3xl font-bold">
                {analytics.totalRevenue.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: selectedCurrency === 'usd' ? 'USD' : 'EUR'
                })}
              </p>
              <p className="text-blue-100 text-sm">
                {analytics.monthlyGrowth > 0 ? '+' : ''}{analytics.monthlyGrowth.toFixed(1)}% vs mois dernier
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Frais Plateforme</p>
              <p className="text-3xl font-bold">
                {analytics.totalPlatformFees.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: selectedCurrency === 'usd' ? 'USD' : 'EUR'
                })}
              </p>
              <p className="text-green-100 text-sm">
                {((analytics.totalPlatformFees / analytics.totalRevenue) * 100).toFixed(1)}% du total
              </p>
            </div>
            <Percent className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Nb. Transactions</p>
              <p className="text-3xl font-bold">{analytics.paymentCount}</p>
              <p className="text-purple-100 text-sm">
                Moy: {analytics.avgTransactionValue.toFixed(0)}€
              </p>
            </div>
            <Calendar className="w-12 h-12 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Rémun. Prestataires</p>
              <p className="text-3xl font-bold">
                {analytics.totalProviderPayouts.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: selectedCurrency === 'usd' ? 'USD' : 'EUR'
                })}
              </p>
              <p className="text-orange-100 text-sm">
                {((analytics.totalProviderPayouts / analytics.totalRevenue) * 100).toFixed(1)}% du total
              </p>
            </div>
            <Users className="w-12 h-12 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution des revenus */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des Revenus</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(0)}€`,
                    name === 'revenue' ? 'Revenus' : 'Frais'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="fees" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Répartition par service */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Service</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.revenueByService}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.revenueByService.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value.toFixed(0)}€`, 'Revenus']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tableau détaillé des revenus par devise */}
      {analytics.revenueByCurrency.length > 1 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Devise</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.revenueByCurrency.map((currency, index) => (
              <div key={currency.currency} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="font-medium">{currency.currency}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">
                    {currency.amount.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: currency.currency
                    })}
                  </div>
                  <div className="text-sm text-gray-600">
                    {currency.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tableau des transactions récentes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Transactions Récentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frais SOS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prestataire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Devise
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.slice(0, 10).map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.createdAt.toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payment.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {payment.platformFee.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.providerAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      payment.serviceType === 'lawyer_call'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {payment.serviceType === 'lawyer_call' ? 'Avocat' : 'Expatrié'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.currency.toUpperCase()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};