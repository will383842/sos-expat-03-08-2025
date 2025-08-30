import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, 
  Search, 
  Plus, 
  Edit, 
  Trash, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Flag,
  Save
} from 'lucide-react';
import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';

interface Country {
  id: string;
  name: string;
  code: string;
  flag: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminCountries: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [formData, setFormData] = useState<Partial<Country>>({
    name: '',
    code: '',
    flag: '',
    isActive: true
  });
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    loadCountries();
  }, [currentUser, navigate]);

  const loadCountries = async () => {
    try {
      setIsLoading(true);
      
      // Exemple de pays pour le dÃ©veloppement
      const mockCountries: Country[] = [
        {
          id: 'fr',
          name: 'France',
          code: 'FR',
          flag: 'https://flagcdn.com/w40/fr.png',
          isActive: false, // DÃ©sactivÃ© car service non disponible en France
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'ca',
          name: 'Canada',
          code: 'CA',
          flag: 'https://flagcdn.com/w40/ca.png',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'th',
          name: 'ThaÃ¯lande',
          code: 'TH',
          flag: 'https://flagcdn.com/w40/th.png',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'es',
          name: 'Espagne',
          code: 'ES',
          flag: 'https://flagcdn.com/w40/es.png',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'au',
          name: 'Australie',
          code: 'AU',
          flag: 'https://flagcdn.com/w40/au.png',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // En production, on chargerait depuis Firestore
      // const countriesQuery = query(
      //   collection(db, 'countries'),
      //   orderBy('name', 'asc')
      // );
      
      // const countriesSnapshot = await getDocs(countriesQuery);
      
      // // Process results
      // const countriesData = countriesSnapshot.docs.map(doc => ({
      //   ...doc.data(),
      //   id: doc.id,
      //   createdAt: doc.data().createdAt?.toDate() || new Date(),
      //   updatedAt: doc.data().updatedAt?.toDate() || new Date()
      // })) as Country[];
      
      // Update state
      setCountries(mockCountries);
      
    } catch (error) {
      console.error('Error loading countries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCountry = async () => {
    try {
      setIsActionLoading(true);
      
      // Validate form
      if (!formData.name || !formData.code) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
      }
      
      // Create new country
      const countryId = formData.code.toLowerCase();
      
      // En production, on sauvegarderait dans Firestore
      // await setDoc(doc(db, 'countries', countryId), {
      //   name: formData.name,
      //   code: formData.code.toUpperCase(),
      //   flag: formData.flag || `https://flagcdn.com/w40/${formData.code.toLowerCase()}.png`,
      //   isActive: formData.isActive || true,
      //   createdAt: serverTimestamp(),
      //   updatedAt: serverTimestamp()
      // });
      
      // Update local state
      const newCountry: Country = {
        id: countryId,
        name: formData.name,
        code: formData.code.toUpperCase(),
        flag: formData.flag || `https://flagcdn.com/w40/${formData.code.toLowerCase()}.png`,
        isActive: formData.isActive || true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setCountries(prev => [...prev, newCountry].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Reset form and close modal
      setFormData({
        name: '',
        code: '',
        flag: '',
        isActive: true
      });
      setShowAddModal(false);
      
      // Show success message
      alert('Pays ajoutÃ© avec succÃ¨s');
      
    } catch (error) {
      console.error('Error adding country:', error);
      alert('Erreur lors de l\'ajout du pays');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEditCountry = async () => {
    if (!selectedCountry) return;
    
    try {
      setIsActionLoading(true);
      
      // Validate form
      if (!formData.name || !formData.code) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
      }
      
      // En production, on mettrait Ã  jour dans Firestore
      // await updateDoc(doc(db, 'countries', selectedCountry.id), {
      //   name: formData.name,
      //   code: formData.code.toUpperCase(),
      //   flag: formData.flag || `https://flagcdn.com/w40/${formData.code.toLowerCase()}.png`,
      //   isActive: formData.isActive,
      //   updatedAt: serverTimestamp()
      // });
      
      // Update local state
      const updatedCountry: Country = {
        ...selectedCountry,
        name: formData.name,
        code: formData.code.toUpperCase(),
        flag: formData.flag || `https://flagcdn.com/w40/${formData.code.toLowerCase()}.png`,
        isActive: formData.isActive || false,
        updatedAt: new Date()
      };
      
      setCountries(prev => 
        prev.map(country => 
          country.id === selectedCountry.id ? updatedCountry : country
        ).sort((a, b) => a.name.localeCompare(b.name))
      );
      
      // Reset form and close modal
      setSelectedCountry(null);
      setShowEditModal(false);
      
      // Show success message
      alert('Pays mis Ã  jour avec succÃ¨s');
      
    } catch (error) {
      console.error('Error updating country:', error);
      alert('Erreur lors de la mise Ã  jour du pays');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteCountry = async () => {
    if (!selectedCountry) return;
    
    try {
      setIsActionLoading(true);
      
      // En production, on supprimerait dans Firestore
      // await deleteDoc(doc(db, 'countries', selectedCountry.id));
      
      // Update local state
      setCountries(prev => prev.filter(country => country.id !== selectedCountry.id));
      
      // Reset form and close modal
      setSelectedCountry(null);
      setShowDeleteModal(false);
      
      // Show success message
      alert('Pays supprimÃ© avec succÃ¨s');
      
    } catch (error) {
      console.error('Error deleting country:', error);
      alert('Erreur lors de la suppression du pays');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleActive = async (countryId: string, isActive: boolean) => {
    try {
      setIsActionLoading(true);
      
      // En production, on mettrait Ã  jour dans Firestore
      // await updateDoc(doc(db, 'countries', countryId), {
      //   isActive: !isActive,
      //   updatedAt: serverTimestamp()
      // });
      
      // Update local state
      setCountries(prev => 
        prev.map(country => 
          country.id === countryId 
            ? { ...country, isActive: !isActive, updatedAt: new Date() }
            : country
        )
      );
      
      // Show success message
      alert(`Pays ${!isActive ? 'activÃ©' : 'dÃ©sactivÃ©'} avec succÃ¨s`);
      
    } catch (error) {
      console.error('Error toggling country status:', error);
      alert('Erreur lors de la mise Ã  jour du statut du pays');
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredCountries = countries.filter(country => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      country.name.toLowerCase().includes(searchLower) ||
      country.code.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AdminLayout>
      <ErrorBoundary fallback={<div className="p-8 text-center">Une erreur est survenue lors du chargement des pays. Veuillez rÃ©essayer.</div>}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des pays</h1>
            <div className="flex items-center space-x-4">
              <form onSubmit={(e) => e.preventDefault()} className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un pays..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </form>
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus size={18} className="mr-2" />
                Ajouter un pays
              </Button>
            </div>
          </div>

          {/* Countries Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pays
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Drapeau
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DerniÃ¨re mise Ã  jour
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        </div>
                        <p className="mt-2">Chargement des pays...</p>
                      </td>
                    </tr>
                  ) : filteredCountries.length > 0 ? (
                    filteredCountries.map((country) => (
                      <tr key={country.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {country.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {country.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {country.flag ? (
                            <img 
                              src={country.flag} 
                              alt={`Drapeau ${country.name}`} 
                              className="h-6 w-auto"
                            />
                          ) : (
                            <span className="text-gray-400">Non disponible</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {country.isActive ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center w-fit">
                              <CheckCircle size={12} className="mr-1" />
                              Actif
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center w-fit">
                              <XCircle size={12} className="mr-1" />
                              Inactif
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(country.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedCountry(country);
                                setFormData({
                                  name: country.name,
                                  code: country.code,
                                  flag: country.flag,
                                  isActive: country.isActive
                                });
                                setShowEditModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="Modifier"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleToggleActive(country.id, country.isActive)}
                              className={`${country.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                              title={country.isActive ? 'DÃ©sactiver' : 'Activer'}
                              disabled={isActionLoading}
                            >
                              {country.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCountry(country);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-800"
                              title="Supprimer"
                              disabled={isActionLoading}
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        Aucun pays trouvÃ©
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add Country Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Ajouter un pays"
          size="medium"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nom du pays *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="ex: France"
              />
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Code ISO (2 lettres) *
              </label>
              <input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="ex: FR"
                maxLength={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Code ISO 3166-1 alpha-2 (2 lettres)
              </p>
            </div>

            <div>
              <label htmlFor="flag" className="block text-sm font-medium text-gray-700 mb-1">
                URL du drapeau
              </label>
              <input
                id="flag"
                type="text"
                value={formData.flag}
                onChange={(e) => setFormData(prev => ({ ...prev, flag: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="https://flagcdn.com/w40/fr.png"
              />
              <p className="text-xs text-gray-500 mt-1">
                Laissez vide pour utiliser l'URL par dÃ©faut basÃ©e sur le code ISO
              </p>
            </div>

            <div className="flex items-center">
              <input
                id="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Activer immÃ©diatement
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={() => setShowAddModal(false)}
                variant="outline"
                disabled={isActionLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleAddCountry}
                className="bg-red-600 hover:bg-red-700"
                loading={isActionLoading}
              >
                Ajouter le pays
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Country Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Modifier le pays"
          size="medium"
        >
          {selectedCountry && (
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du pays *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label htmlFor="edit-code" className="block text-sm font-medium text-gray-700 mb-1">
                  Code ISO (2 lettres) *
                </label>
                <input
                  id="edit-code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  maxLength={2}
                />
              </div>

              <div>
                <label htmlFor="edit-flag" className="block text-sm font-medium text-gray-700 mb-1">
                  URL du drapeau
                </label>
                <input
                  id="edit-flag"
                  type="text"
                  value={formData.flag}
                  onChange={(e) => setFormData(prev => ({ ...prev, flag: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                {formData.flag && (
                  <div className="mt-2">
                    <img 
                      src={formData.flag} 
                      alt={`Drapeau ${formData.name}`} 
                      className="h-8 w-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://flagcdn.com/w40/${formData.code?.toLowerCase()}.png`;
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <input
                  id="edit-isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="edit-isActive" className="ml-2 block text-sm text-gray-700">
                  Pays actif
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  onClick={() => setShowEditModal(false)}
                  variant="outline"
                  disabled={isActionLoading}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleEditCountry}
                  className="bg-blue-600 hover:bg-blue-700"
                  loading={isActionLoading}
                >
                  Mettre Ã  jour
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Confirmer la suppression"
          size="small"
        >
          {selectedCountry && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Attention : Cette action est irrÃ©versible
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>
                        Vous Ãªtes sur le point de supprimer dÃ©finitivement le pays :
                        <br />
                        <strong>{selectedCountry.name}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowDeleteModal(false)}
                  variant="outline"
                  disabled={isActionLoading}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleDeleteCountry}
                  className="bg-red-600 hover:bg-red-700"
                  loading={isActionLoading}
                >
                  Confirmer la suppression
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminCountries;

