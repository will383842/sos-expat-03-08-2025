import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Save, 
  Eye, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  List,
  Edit,
  Trash,
  Plus
} from 'lucide-react';
import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';

interface LegalDocument {
  id: string;
  title: string;
  content: string;
  type: 'terms' | 'privacy' | 'cookies' | 'refund' | 'legal' | 'other';
  language: 'fr' | 'en';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  version: string;
}

const documentTypes = [
  { value: 'terms', label: 'Conditions GÃ©nÃ©rales' },
  { value: 'privacy', label: 'Politique de ConfidentialitÃ©' },
  { value: 'cookies', label: 'Politique des Cookies' },
  { value: 'refund', label: 'Politique de Remboursement' },
  { value: 'legal', label: 'Mentions LÃ©gales' },
  { value: 'faq', label: 'FAQ' },
  { value: 'help', label: 'Centre d\'aide' },
  { value: 'consumers', label: 'Information Consommateurs' },
  { value: 'seo', label: 'RÃ©fÃ©rencement' },
  { value: 'other', label: 'Autre' }
];

const AdminLegalDocuments: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState<Partial<LegalDocument>>({
    title: '',
    content: '',
    type: 'terms',
    language: 'fr',
    isActive: true,
    version: '1.0'
  });
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    loadDocuments();
  }, [currentUser, navigate]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      
      const documentsQuery = query(
        collection(db, 'legal_documents'),
        orderBy('updatedAt', 'desc')
      );
      
      const documentsSnapshot = await getDocs(documentsQuery);
      
      // Process results
      const documentsData = documentsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        publishedAt: doc.data().publishedAt?.toDate()
      })) as LegalDocument[];
      
      // Update state
      setDocuments(documentsData);
      
    } catch (error) {
      console.error('Error loading legal documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = () => {
    setIsCreating(true);
    setFormData({
      title: '',
      content: '',
      type: 'terms',
      language: 'fr',
      isActive: true,
      version: '1.0'
    });
    setShowEditModal(true);
  };

  const handleEditDocument = (document: LegalDocument) => {
    setIsCreating(false);
    setSelectedDocument(document);
    setFormData({
      title: document.title,
      content: document.content,
      type: document.type,
      language: document.language,
      isActive: document.isActive,
      version: document.version
    });
    setShowEditModal(true);
  };

  const handlePreviewDocument = (document: LegalDocument) => {
    setSelectedDocument(document);
    setShowPreviewModal(true);
  };

  const handleDeleteDocument = (document: LegalDocument) => {
    setSelectedDocument(document);
    setShowDeleteModal(true);
  };

  const handleSaveDocument = async () => {
    try {
      setIsActionLoading(true);
      
      // Validate form
      if (!formData.title || !formData.content || !formData.type || !formData.language) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
      }
      
      if (isCreating) {
        // Create new document
        const docId = `${formData.type}_${formData.language}_${Date.now()}`;
        
        await setDoc(doc(db, 'legal_documents', docId), {
          title: formData.title,
          content: formData.content,
          type: formData.type,
          language: formData.language,
          isActive: formData.isActive,
          version: formData.version,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          publishedAt: formData.isActive ? serverTimestamp() : null
        });
        
        // Update local state
        const newDocument: LegalDocument = {
          id: docId,
          title: formData.title!,
          content: formData.content!,
          type: formData.type as 'terms' | 'privacy' | 'cookies' | 'refund' | 'legal' | 'other',
          language: formData.language as 'fr' | 'en',
          isActive: formData.isActive || false,
          version: formData.version || '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: formData.isActive ? new Date() : undefined
        };
        
        setDocuments(prev => [newDocument, ...prev]);
      } else if (selectedDocument) {
        // Update existing document
        await updateDoc(doc(db, 'legal_documents', selectedDocument.id), {
          title: formData.title,
          content: formData.content,
          type: formData.type,
          language: formData.language,
          isActive: formData.isActive,
          version: formData.version,
          updatedAt: serverTimestamp(),
          publishedAt: formData.isActive && !selectedDocument.publishedAt ? serverTimestamp() : selectedDocument.publishedAt
        });
        
        // Update local state
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === selectedDocument.id 
              ? { 
                  ...doc, 
                  title: formData.title || doc.title,
                  content: formData.content || doc.content,
                  type: (formData.type as 'terms' | 'privacy' | 'cookies' | 'refund' | 'legal' | 'other') || doc.type,
                  language: (formData.language as 'fr' | 'en') || doc.language,
                  isActive: formData.isActive !== undefined ? formData.isActive : doc.isActive,
                  version: formData.version || doc.version,
                  updatedAt: new Date(),
                  publishedAt: formData.isActive && !doc.publishedAt ? new Date() : doc.publishedAt
                }
              : doc
          )
        );
      }
      
      // Close modal
      setShowEditModal(false);
      setSelectedDocument(null);
      
      // Show success message
      alert(isCreating ? 'Document crÃ©Ã© avec succÃ¨s' : 'Document mis Ã  jour avec succÃ¨s');
      
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Erreur lors de l\'enregistrement du document');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDocument) return;
    
    try {
      setIsActionLoading(true);
      
      // Delete document
      await deleteDoc(doc(db, 'legal_documents', selectedDocument.id));
      
      // Update local state
      setDocuments(prev => prev.filter(doc => doc.id !== selectedDocument.id));
      
      // Close modal
      setShowDeleteModal(false);
      setSelectedDocument(null);
      
      // Show success message
      alert('Document supprimÃ© avec succÃ¨s');
      
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Erreur lors de la suppression du document');
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

  const getDocumentTypeName = (type: string) => {
    const docType = documentTypes.find(t => t.value === type);
    return docType ? docType.label : type;
  };

  return (
    <AdminLayout>
      <ErrorBoundary fallback={<div className="p-8 text-center">Une erreur est survenue lors du chargement des documents lÃ©gaux. Veuillez rÃ©essayer.</div>}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des documents lÃ©gaux</h1>
            <Button
              onClick={handleCreateDocument}
              className="bg-red-600 hover:bg-red-700"
            >
              <Plus size={18} className="mr-2" />
              Nouveau document
            </Button>
          </div>

          {/* Documents Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Titre
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Langue
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Version
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
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        </div>
                        <p className="mt-2">Chargement des documents...</p>
                      </td>
                    </tr>
                  ) : documents.length > 0 ? (
                    documents.map((document) => (
                      <tr key={document.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-gray-400 mr-2" />
                            <div className="text-sm font-medium text-gray-900">
                              {document.title}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getDocumentTypeName(document.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {document.language === 'fr' ? 'ðŸ‡«ðŸ‡· FranÃ§ais' : 'ðŸ‡¬ðŸ‡§ English'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {document.version}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {document.isActive ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center w-fit">
                              <CheckCircle size={12} className="mr-1" />
                              Actif
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium flex items-center w-fit">
                              <Clock size={12} className="mr-1" />
                              Inactif
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(document.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handlePreviewDocument(document)}
                              className="text-blue-600 hover:text-blue-800"
                              title="PrÃ©visualiser"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleEditDocument(document)}
                              className="text-green-600 hover:text-green-800"
                              title="Ã‰diter"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(document)}
                              className="text-red-600 hover:text-red-800"
                              title="Supprimer"
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        Aucun document trouvÃ©
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={isCreating ? "CrÃ©er un document lÃ©gal" : "Modifier un document lÃ©gal"}
          size="large"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Titre *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="ex: Conditions GÃ©nÃ©rales d'Utilisation"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Type de document *
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                  Langue *
                </label>
                <select
                  id="language"
                  value={formData.language}
                  onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value as 'fr' | 'en' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="fr">FranÃ§ais</option>
                  <option value="en">English</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
                  Version *
                </label>
                <input
                  id="version"
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="ex: 1.0"
                />
              </div>
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Contenu *
              </label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                placeholder="Contenu du document (supporte le format Markdown)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Vous pouvez utiliser le format Markdown pour la mise en forme.
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
                Document actif (publiÃ© sur le site)
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
                onClick={handleSaveDocument}
                className="bg-red-600 hover:bg-red-700"
                loading={isActionLoading}
              >
                <Save size={16} className="mr-2" />
                {isCreating ? 'CrÃ©er le document' : 'Enregistrer les modifications'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Preview Modal */}
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="PrÃ©visualisation du document"
          size="large"
        >
          {selectedDocument && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{selectedDocument.title}</h3>
                    <p className="text-sm text-gray-500">
                      {getDocumentTypeName(selectedDocument.type)} - Version {selectedDocument.version}
                    </p>
                  </div>
                  <div>
                    {selectedDocument.isActive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Actif
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                        Inactif
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-6 bg-white">
                  <div className="prose max-w-none">
                    {selectedDocument.content.split('\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowPreviewModal(false)}
                  variant="outline"
                >
                  Fermer
                </Button>
                <Button
                  onClick={() => {
                    setShowPreviewModal(false);
                    handleEditDocument(selectedDocument);
                  }}
                >
                  <Edit size={16} className="mr-2" />
                  Modifier
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
          {selectedDocument && (
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
                        Vous Ãªtes sur le point de supprimer dÃ©finitivement le document :
                        <br />
                        <strong>{selectedDocument.title}</strong>
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
                  onClick={handleConfirmDelete}
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

export default AdminLegalDocuments;

