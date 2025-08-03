import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import { collection, query, getDocs, doc, updateDoc, serverTimestamp, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import { Document } from '../../types';

const AdminDocuments: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin-login');
      return;
    }

    loadDocuments();
  }, [currentUser, navigate, selectedStatus, selectedType]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      
      // Exemple de documents pour le développement
      const mockDocuments: Document[] = [
        {
          id: 'doc1',
          userId: 'user123',
          type: 'identity',
          documentType: 'Carte d\'identité',
          filename: 'carte-identite.jpg',
          url: 'https://images.pexels.com/photos/2694434/pexels-photo-2694434.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
          mimeType: 'image/jpeg',
          fileSize: 1024000,
          status: 'pending',
          uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'doc2',
          userId: 'user456',
          type: 'diploma',
          documentType: 'Diplôme d\'avocat',
          filename: 'diplome-avocat.pdf',
          url: 'https://example.com/documents/diplome-avocat.pdf',
          mimeType: 'application/pdf',
          fileSize: 2048000,
          status: 'approved',
          uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          reviewedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          reviewNotes: 'Document vérifié et validé',
          verifiedBy: 'admin1'
        },
        {
          id: 'doc3',
          userId: 'user789',
          type: 'residence_proof',
          documentType: 'Justificatif de domicile',
          filename: 'facture-electricite.jpg',
          url: 'https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
          mimeType: 'image/jpeg',
          fileSize: 1536000,
          status: 'rejected',
          uploadedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          reviewedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
          reviewNotes: 'Document trop ancien (plus de 3 mois)',
          verifiedBy: 'admin2'
        }
      ];
      
      // Filtrer par statut et type si nécessaire
      let filteredDocuments = mockDocuments;
      if (selectedStatus !== 'all') {
        filteredDocuments = filteredDocuments.filter(doc => doc.status === selectedStatus);
      }
      if (selectedType !== 'all') {
        filteredDocuments = filteredDocuments.filter(doc => doc.type === selectedType);
      }
      
      // En production, on chargerait depuis Firestore
      // let documentsQuery = query(
      //   collection(db, 'documents'),
      //   orderBy('uploadedAt', 'desc'),
      //   limit(100)
      // );
      
      // // Apply status filter
      // if (selectedStatus !== 'all') {
      //   documentsQuery = query(
      //     collection(db, 'documents'),
      //     where('status', '==', selectedStatus),
      //     orderBy('uploadedAt', 'desc'),
      //     limit(100)
      //   );
      // }
      
      // // Apply type filter
      // if (selectedType !== 'all') {
      //   documentsQuery = query(
      //     collection(db, 'documents'),
      //     where('type', '==', selectedType),
      //     orderBy('uploadedAt', 'desc'),
      //     limit(100)
      //   );
      // }
      
      // // Apply both filters
      // if (selectedStatus !== 'all' && selectedType !== 'all') {
      //   documentsQuery = query(
      //     collection(db, 'documents'),
      //     where('status', '==', selectedStatus),
      //     where('type', '==', selectedType),
      //     orderBy('uploadedAt', 'desc'),
      //     limit(100)
      //   );
      // }
      
      // const documentsSnapshot = await getDocs(documentsQuery);
      
      // // Process results
      // const documentsData = documentsSnapshot.docs.map(doc => ({
      //   ...doc.data(),
      //   id: doc.id,
      //   uploadedAt: doc.data().uploadedAt?.toDate() || new Date(),
      //   reviewedAt: doc.data().reviewedAt?.toDate()
      // })) as Document[];
      
      // Update state
      setDocuments(filteredDocuments);
      
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setAdminNotes(document.reviewNotes || '');
    setShowDocumentModal(true);
  };

  const handleApproveDocument = async () => {
    if (!selectedDocument) return;
    
    try {
      setIsActionLoading(true);
      
      // En production, on mettrait à jour dans Firestore
      // await updateDoc(doc(db, 'documents', selectedDocument.id), {
      //   status: 'approved',
      //   reviewedAt: serverTimestamp(),
      //   reviewNotes: adminNotes,
      //   verifiedBy: currentUser?.id
      // });
      
      // Update local state
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === selectedDocument.id 
            ? { 
                ...doc, 
                status: 'approved', 
                reviewedAt: new Date(), 
                reviewNotes: adminNotes,
                verifiedBy: currentUser?.id
              }
            : doc
        )
      );
      
      // Close modal
      setShowDocumentModal(false);
      setSelectedDocument(null);
      
      // Show success message
      alert('Document approuvé avec succès');
      
    } catch (error) {
      console.error('Error approving document:', error);
      alert('Erreur lors de l\'approbation du document');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectDocument = async () => {
    if (!selectedDocument) return;
    
    try {
      setIsActionLoading(true);
      
      // En production, on mettrait à jour dans Firestore
      // await updateDoc(doc(db, 'documents', selectedDocument.id), {
      //   status: 'rejected',
      //   reviewedAt: serverTimestamp(),
      //   reviewNotes: adminNotes,
      //   verifiedBy: currentUser?.id
      // });
      
      // Update local state
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === selectedDocument.id 
            ? { 
                ...doc, 
                status: 'rejected', 
                reviewedAt: new Date(), 
                reviewNotes: adminNotes,
                verifiedBy: currentUser?.id
              }
            : doc
        )
      );
      
      // Close modal
      setShowDocumentModal(false);
      setSelectedDocument(null);
      
      // Show success message
      alert('Document rejeté avec succès');
      
    } catch (error) {
      console.error('Error rejecting document:', error);
      alert('Erreur lors du rejet du document');
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center">
            <CheckCircle size={12} className="mr-1" />
            Approuvé
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center">
            <XCircle size={12} className="mr-1" />
            Rejeté
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center">
            <Clock size={12} className="mr-1" />
            En attente
          </span>
        );
    }
  };

  const getDocumentTypeBadge = (type: string) => {
    switch (type) {
      case 'identity':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            Identité
          </span>
        );
      case 'diploma':
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
            Diplôme
          </span>
        );
      case 'certificate':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            Certificat
          </span>
        );
      case 'residence_proof':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            Justificatif de résidence
          </span>
        );
      case 'insurance':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            Assurance
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            {type}
          </span>
        );
    }
  };

  const filteredDocuments = documents.filter(document => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      document.documentType?.toLowerCase().includes(searchLower) ||
      document.filename?.toLowerCase().includes(searchLower) ||
      document.userId?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AdminLayout>
      <ErrorBoundary fallback={<div className="p-8 text-center">Une erreur est survenue lors du chargement des documents. Veuillez réessayer.</div>}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des documents</h1>
            <div className="flex items-center space-x-4">
              <form onSubmit={(e) => e.preventDefault()} className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un document..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </form>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvés</option>
                <option value="rejected">Rejetés</option>
              </select>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">Tous les types</option>
                <option value="identity">Identité</option>
                <option value="diploma">Diplôme</option>
                <option value="certificate">Certificat</option>
                <option value="residence_proof">Justificatif de résidence</option>
                <option value="insurance">Assurance</option>
              </select>
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date d'envoi
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
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
                        <p className="mt-2">Chargement des documents...</p>
                      </td>
                    </tr>
                  ) : filteredDocuments.length > 0 ? (
                    filteredDocuments.map((document) => (
                      <tr key={document.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {document.filename || document.documentType}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatFileSize(document.fileSize)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {document.userId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getDocumentTypeBadge(document.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(document.uploadedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(document.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewDocument(document)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Voir document"
                            >
                              <Eye size={18} />
                            </button>
                            {document.url && (
                              <a
                                href={document.url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-600 hover:text-gray-800"
                                title="Télécharger"
                              >
                                <Download size={18} />
                              </a>
                            )}
                            {document.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedDocument(document);
                                    setAdminNotes('');
                                    setShowDocumentModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-800"
                                  title="Approuver"
                                >
                                  <CheckCircle size={18} />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedDocument(document);
                                    setAdminNotes('');
                                    setShowDocumentModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                  title="Rejeter"
                                >
                                  <XCircle size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        Aucun document trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Document Viewer Modal */}
        <Modal
          isOpen={showDocumentModal}
          onClose={() => setShowDocumentModal(false)}
          title="Vérification du document"
          size="large"
        >
          {selectedDocument && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{selectedDocument.documentType}</h3>
                    <p className="text-sm text-gray-500">
                      Ajouté le {formatDate(selectedDocument.uploadedAt)}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(selectedDocument.status)}
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {selectedDocument.url ? (
                    <div className="aspect-w-16 aspect-h-9">
                      {selectedDocument.mimeType?.startsWith('image/') ? (
                        <img 
                          src={selectedDocument.url} 
                          alt={selectedDocument.documentType} 
                          className="object-contain w-full h-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-64 bg-gray-100">
                          <div className="text-center">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600">Aperçu non disponible</p>
                            <a 
                              href={selectedDocument.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 mt-2 inline-block"
                            >
                              Ouvrir le document
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 bg-gray-100">
                      <div className="text-center">
                        <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-2" />
                        <p className="text-gray-600">URL du document non disponible</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Informations du document</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{selectedDocument.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nom du fichier:</span>
                      <span className="font-medium">{selectedDocument.filename}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taille:</span>
                      <span className="font-medium">{formatFileSize(selectedDocument.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type MIME:</span>
                      <span className="font-medium">{selectedDocument.mimeType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Utilisateur:</span>
                      <span className="font-medium">{selectedDocument.userId}</span>
                    </div>
                    {selectedDocument.documentNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Numéro de document:</span>
                        <span className="font-medium">{selectedDocument.documentNumber}</span>
                      </div>
                    )}
                    {selectedDocument.issuedBy && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Émis par:</span>
                        <span className="font-medium">{selectedDocument.issuedBy}</span>
                      </div>
                    )}
                    {selectedDocument.issuedDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date d'émission:</span>
                        <span className="font-medium">{formatDate(new Date(selectedDocument.issuedDate))}</span>
                      </div>
                    )}
                    {selectedDocument.expiryDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date d'expiration:</span>
                        <span className="font-medium">{formatDate(new Date(selectedDocument.expiryDate))}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  {selectedDocument.status === 'pending' ? (
                    <>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Validation du document</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <div>
                          <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700 mb-1">
                            Notes de vérification
                          </label>
                          <textarea
                            id="adminNotes"
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Ajoutez des notes sur la vérification de ce document..."
                          />
                        </div>
                        
                        <div className="space-y-3 pt-4">
                          <Button
                            onClick={handleApproveDocument}
                            fullWidth
                            className="bg-green-600 hover:bg-green-700"
                            disabled={isActionLoading}
                          >
                            <CheckCircle size={16} className="mr-2" />
                            Approuver le document
                          </Button>
                          
                          <Button
                            onClick={handleRejectDocument}
                            fullWidth
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isActionLoading}
                          >
                            <XCircle size={16} className="mr-2" />
                            Rejeter le document
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Statut de vérification</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <div>
                          <div className="flex items-center mb-2">
                            {getStatusBadge(selectedDocument.status)}
                            {selectedDocument.reviewedAt && (
                              <span className="text-xs text-gray-500 ml-2">
                                le {formatDate(selectedDocument.reviewedAt)}
                              </span>
                            )}
                          </div>
                          
                          {selectedDocument.reviewNotes && (
                            <div className="mt-2">
                              <h5 className="text-sm font-medium text-gray-700 mb-1">Notes de vérification</h5>
                              <p className="text-sm text-gray-700 whitespace-pre-line">{selectedDocument.reviewNotes}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="pt-4">
                          <Button
                            onClick={() => window.open(`/admin/users?id=${selectedDocument.userId}`, '_blank')}
                            fullWidth
                            variant="outline"
                          >
                            <User size={16} className="mr-2" />
                            Voir profil utilisateur
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminDocuments;