import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { logError } from '../../utils/logging';
import { Tabs, Tab } from "../../components/ui/tabs"; 

// Importation des composants des pages (à créer)
import CampaignsPage from "./CampaignsPage";
import TemplatesManager from "./TemplatesManager";
import SendToContact from "./SendToContact";
import SendToOne from "./SendToOne";
import SendToRoles from "./SendToRoles";
import SendToSelection from "./SendToSelection";
import LogsPage from "./LogsPage";
import EmailPreviewModal from "./EmailPreviewModal";

const AdminEmailsPage: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Vérification de l'authentification et du rôle admin
  useEffect(() => {
    if (user) {
      setIsLoading(false);
    }
  }, [user]);

  // Check authentication
  if (!user) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </AdminLayout>
    );
  }

  // Check admin role
  if (user?.role !== 'admin') {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Accès non autorisé
            </h1>
            <p className="text-gray-600">
              Vous devez être administrateur pour accéder à cette page.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ErrorBoundary
        onError={(error: Error, errorInfo: React.ErrorInfo) => {
          logError({
            origin: 'frontend',
            userId: user?.id,
            error: error.message,
            context: {
              component: 'AdminEmailsPage',
              componentStack: errorInfo.componentStack
            }
          });
        }}
      >
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    📬 Gestion des Emails
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Centre de contrôle pour toutes les communications par email
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Tabs defaultValue="campaigns" className="w-full">
              <Tab value="campaigns" label="📆 Campagnes programmées">
                <CampaignsPage />
              </Tab>
              <Tab value="templates" label="🧱 Templates d'emails">
                <TemplatesManager />
              </Tab>
              <Tab value="contact" label="✉️ Répondre à un message de contact">
                <SendToContact />
              </Tab>
              <Tab value="sendOne" label="👤 Envoi individuel">
                <SendToOne />
              </Tab>
              <Tab value="sendRole" label="👥 Envoi par rôle">
                <SendToRoles />
              </Tab>
              <Tab value="sendSelection" label="✅ Envoi ciblé manuel">
                <SendToSelection />
              </Tab>
              <Tab value="logs" label="🕓 Historique des envois">
                <LogsPage />
              </Tab>
            </Tabs>

            {/* Aperçu HTML/MJML à activer globalement si nécessaire */}
            <EmailPreviewModal />
          </div>
        </div>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminEmailsPage;

