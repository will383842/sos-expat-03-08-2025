import React, { useEffect, useState, useMemo } from 'react';
import { Shield, Eye, Lock, Users } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

interface PrivacySection {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  contentKey: string;
}

const PrivacyPolicy: React.FC = () => {
  const { language } = useApp();
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFrench = language === 'fr';

  // Textes statiques optimisés
  const texts = useMemo(() => ({
    fr: {
      title: 'Politique de confidentialité',
      subtitle: 'Votre vie privée est notre priorité',
      lastUpdated: 'Dernière mise à jour: 1er janvier 2025',
      dataCollection: 'Collecte des données',
      dataProtection: 'Protection des données',
      dataSharing: 'Partage des données',
      yourRights: 'Vos droits',
      contact: 'Contact',
      dataCollectionContent: 'Nous collectons uniquement les informations nécessaires pour fournir nos services d\'assistance d\'urgence. Cela inclut vos informations de contact, votre localisation géographique, et les détails de vos demandes d\'aide.',
      dataProtectionContent: 'Toutes vos données sont chiffrées et stockées de manière sécurisée. Nous utilisons les dernières technologies de sécurité pour protéger vos informations personnelles contre tout accès non autorisé.',
      dataSharingContent: 'Nous ne vendons jamais vos données personnelles. Nous partageons uniquement les informations nécessaires avec nos prestataires vérifiés pour vous fournir l\'assistance demandée.',
      rights: [
        'Droit d\'accès à vos données personnelles',
        'Droit de rectification de vos informations',
        'Droit à l\'effacement de vos données',
        'Droit à la portabilité de vos données'
      ],
      contactContent: 'Pour toute question concernant cette politique de confidentialité, contactez-nous à: privacy@sos-expat.com'
    },
    en: {
      title: 'Privacy Policy',
      subtitle: 'Your privacy is our priority',
      lastUpdated: 'Last updated: January 1, 2025',
      dataCollection: 'Data Collection',
      dataProtection: 'Data Protection',
      dataSharing: 'Data Sharing',
      yourRights: 'Your Rights',
      contact: 'Contact',
      dataCollectionContent: 'We only collect information necessary to provide our emergency assistance services. This includes your contact information, geographic location, and details of your help requests.',
      dataProtectionContent: 'All your data is encrypted and stored securely. We use the latest security technologies to protect your personal information from unauthorized access.',
      dataSharingContent: 'We never sell your personal data. We only share necessary information with our verified providers to give you the assistance you requested.',
      rights: [
        'Right to access your personal data',
        'Right to rectify your information',
        'Right to erasure of your data',
        'Right to data portability'
      ],
      contactContent: 'For any questions regarding this privacy policy, contact us at: privacy@sos-expat.com'
    }
  }), []);

  const currentTexts = texts[isFrench ? 'fr' : 'en'];

  // Sections de la politique de confidentialité
  const privacySections: PrivacySection[] = useMemo(() => [
    {
      icon: Eye,
      titleKey: 'dataCollection',
      contentKey: 'dataCollectionContent'
    },
    {
      icon: Lock,
      titleKey: 'dataProtection',
      contentKey: 'dataProtectionContent'
    },
    {
      icon: Users,
      titleKey: 'dataSharing',
      contentKey: 'dataSharingContent'
    }
  ], []);

  useEffect(() => {
    const fetchPrivacyPolicy = async () => {
      if (!db) {
        setError('Database connection not available');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const q = query(
          collection(db, 'legal_documents'),
          where('type', '==', 'privacy'),
          where('language', '==', language),
          where('isActive', '==', true),
          orderBy('updatedAt', 'desc'),
          limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const docData = doc.data();
          setContent(docData.content || '');
        } else {
          setContent('');
        }
      } catch (error) {
        console.error('Error fetching privacy policy:', error);
        setError('Failed to load privacy policy');
        setContent('');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPrivacyPolicy();
  }, [language]);

  const renderSection = (section: PrivacySection, index: number) => {
    const IconComponent = section.icon;
    
    return (
      <section key={index}>
        <div className="flex items-center mb-4">
          <IconComponent className="w-6 h-6 text-blue-600 mr-3" />
          <h3 className="text-xl font-semibold text-gray-900">
            {currentTexts[section.titleKey as keyof typeof currentTexts]}
          </h3>
        </div>
        <p className="text-gray-600 leading-relaxed">
          {currentTexts[section.contentKey as keyof typeof currentTexts]}
        </p>
      </section>
    );
  };

  const renderLoadingState = () => (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  const renderErrorState = () => (
    <div className="text-center py-12">
      <p className="text-red-600 mb-4">{error}</p>
      <p className="text-gray-600">
        {isFrench ? 'Affichage de la politique par défaut' : 'Showing default policy'}
      </p>
    </div>
  );

  const renderDynamicContent = () => {
    if (!content) return null;
    
    return (
      <div className="prose max-w-none">
        {content.split('\n').filter(p => p.trim()).map((paragraph, index) => (
          <p key={index} className="mb-4">{paragraph}</p>
        ))}
      </div>
    );
  };

  const renderDefaultContent = () => (
    <div className="prose max-w-none">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {currentTexts.lastUpdated}
      </h2>

      <div className="space-y-8">
        {privacySections.map(renderSection)}
        
        <section>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {currentTexts.yourRights}
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            {currentTexts.rights.map((right, index) => (
              <li key={index}>{right}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {currentTexts.contact}
          </h3>
          <p className="text-gray-600 leading-relaxed">
            {currentTexts.contactContent}
          </p>
        </section>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header optimisé */}
        <header className="bg-blue-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-full p-4">
                <Shield className="w-12 h-12 text-blue-600" aria-hidden="true" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {currentTexts.title}
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              {currentTexts.subtitle}
            </p>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <article className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              {isLoading && renderLoadingState()}
              {error && !isLoading && renderErrorState()}
              {!isLoading && !error && (
                <>
                  {renderDynamicContent()}
                  {!content && renderDefaultContent()}
                </>
              )}
            </article>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;