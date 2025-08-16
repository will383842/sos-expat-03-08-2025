import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  QueryOrderByConstraint,
  QueryLimitConstraint 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';

// Interfaces TypeScript
interface PromoCode {
  id: string;
  code: string;
  discount: number;
  isActive: boolean;
  expiryDate: Date;
  usageCount: number;
  maxUsage: number;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  uid: string;
  email: string;
  role: string;
}

interface QueryOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

const AdminPromoCodes: React.FC = () => {
  // States
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [orderByField, setOrderByField] = useState<QueryOrderBy>({
    field: 'createdAt',
    direction: 'desc'
  });
  const [limitCount, setLimitCount] = useState<number>(50);

  // Auth
  const { user } = useAuth() as { user: User | null };

  // Effects
  useEffect(() => {
    if (user) {
      fetchPromoCodes();
    }
  }, [user, orderByField, limitCount]);

  // Functions
  const fetchPromoCodes = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const constraints: (QueryOrderByConstraint | QueryLimitConstraint)[] = [
        orderBy(orderByField.field, orderByField.direction),
        limit(limitCount)
      ];

      const q = query(collection(db, 'promoCodes'), ...constraints);
      const querySnapshot = await getDocs(q);
      
      const codes: PromoCode[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        codes.push({
          id: doc.id,
          code: data.code || '',
          discount: data.discount || 0,
          isActive: data.isActive || false,
          expiryDate: data.expiryDate?.toDate() || new Date(),
          usageCount: data.usageCount || 0,
          maxUsage: data.maxUsage || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      setPromoCodes(codes);
    } catch (err) {
      console.error('Error fetching promo codes:', err);
      setError('Erreur lors du chargement des codes promo');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPromoCode = async (newPromoCode: Omit<PromoCode, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    try {
      const docRef = await addDoc(collection(db, 'promoCodes'), {
        ...newPromoCode,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Promo code added with ID:', docRef.id);
      await fetchPromoCodes(); // Refresh the list
    } catch (err) {
      console.error('Error adding promo code:', err);
      setError('Erreur lors de l\'ajout du code promo');
    }
  };

  const handleUpdatePromoCode = async (id: string, updates: Partial<PromoCode>): Promise<void> => {
    try {
      const promoCodeRef = doc(db, 'promoCodes', id);
      await updateDoc(promoCodeRef, {
        ...updates,
        updatedAt: new Date()
      });
      
      await fetchPromoCodes(); // Refresh the list
    } catch (err) {
      console.error('Error updating promo code:', err);
      setError('Erreur lors de la mise à jour du code promo');
    }
  };

  const handleDeletePromoCode = async (id: string): Promise<void> => {
    try {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer ce code promo ?')) {
        await deleteDoc(doc(db, 'promoCodes', id));
        await fetchPromoCodes(); // Refresh the list
      }
    } catch (err) {
      console.error('Error deleting promo code:', err);
      setError('Erreur lors de la suppression du code promo');
    }
  };

  const filteredPromoCodes = promoCodes.filter(promoCode =>
    promoCode.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOrderByChange = (field: string, direction: 'asc' | 'desc'): void => {
    setOrderByField({ field, direction });
  };

  // Render
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Veuillez vous connecter pour accéder à cette page.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Gestion des Codes Promo</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Search and Controls */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Rechercher un code promo..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={`${orderByField.field}-${orderByField.direction}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-');
              handleOrderByChange(field, direction as 'asc' | 'desc');
            }}
          >
            <option value="createdAt-desc">Date (Plus récent)</option>
            <option value="createdAt-asc">Date (Plus ancien)</option>
            <option value="code-asc">Code (A-Z)</option>
            <option value="code-desc">Code (Z-A)</option>
            <option value="discount-desc">Remise (Plus élevée)</option>
            <option value="discount-asc">Remise (Plus faible)</option>
          </select>

          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={limitCount}
            onChange={(e) => setLimitCount(Number(e.target.value))}
          >
            <option value={25}>25 résultats</option>
            <option value={50}>50 résultats</option>
            <option value={100}>100 résultats</option>
          </select>
        </div>

        {/* Promo Codes Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remise
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPromoCodes.map((promoCode) => (
                <tr key={promoCode.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {promoCode.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {promoCode.discount}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      promoCode.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {promoCode.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {promoCode.usageCount} / {promoCode.maxUsage}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {promoCode.expiryDate.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleUpdatePromoCode(promoCode.id, { isActive: !promoCode.isActive })}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      {promoCode.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={() => handleDeletePromoCode(promoCode.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPromoCodes.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Aucun code promo trouvé.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPromoCodes;