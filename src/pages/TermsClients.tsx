import React from 'react';
import { FileText, Users, Shield } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

const TermsClients: React.FC = () => {
  const { language } = useApp();
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, 'legal_documents'),
          where('type', '==', 'terms'),
          where('language', '==', language),
          where('isActive', '==', true),
          orderBy('updatedAt', 'desc'),
          limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setContent(doc.data().content);
        }
      } catch (error) {
        console.error('Error fetching terms:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTerms();
  }, [language]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-red-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-full p-4">
                <FileText className="w-12 h-12 text-red-600" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {language === 'fr' ? 'CGU Clients' : 'Client Terms'}
            </h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto">
              {language === 'fr'
                ? 'Conditions générales d\'utilisation pour les clients'
                : 'General terms of use for clients'
              }
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                </div>
              ) : content ? (
                <div className="prose max-w-none">
                  {content.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <div className="prose max-w-none">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {language === 'fr' ? 'Dernière mise à jour: 1er janvier 2025' : 'Last updated: January 1, 2025'}
                </h2>

                <div className="space-y-8">
                  <section>
                    <div className="flex items-center mb-4">
                      <Users className="w-6 h-6 text-red-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900">
                        {language === 'fr' ? 'Services proposés' : 'Services offered'}
                      </h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      {language === 'fr'
                        ? 'SOS Expat & Travelers propose des services d\'assistance d\'urgence par téléphone pour les expatriés et voyageurs francophones:'
                        : 'SOS Expat & Travelers offers emergency phone assistance services for French-speaking expats and travelers:'
                      }
                    </p>
                    <ul className="list-disc list-inside text-gray-600 space-y-2">
                      <li>
                        {language === 'fr'
                          ? 'Appels avec avocats certifiés (20 minutes - 49€)'
                          : 'Calls with certified lawyers (20 minutes - €49)'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Appels avec expatriés aidants (30 minutes - 19€)'
                          : 'Calls with expat helpers (30 minutes - €19)'
                        }
                      </li>
                    </ul>
                  </section>

                  <section>
                    <div className="flex items-center mb-4">
                      <Shield className="w-6 h-6 text-red-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900">
                        {language === 'fr' ? 'Obligations du client' : 'Client obligations'}
                      </h3>
                    </div>
                    <ul className="list-disc list-inside text-gray-600 space-y-2">
                      <li>
                        {language === 'fr'
                          ? 'Fournir des informations exactes lors de l\'inscription'
                          : 'Provide accurate information during registration'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Respecter les prestataires et utiliser le service de manière appropriée'
                          : 'Respect providers and use the service appropriately'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Payer les services utilisés selon les tarifs en vigueur'
                          : 'Pay for services used according to current rates'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Ne pas utiliser le service pour des activités illégales'
                          : 'Not use the service for illegal activities'
                        }
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {language === 'fr' ? 'Paiement et remboursement' : 'Payment and refund'}
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      {language === 'fr'
                        ? 'Les paiements sont traités de manière sécurisée via Stripe. En cas d\'indisponibilité du prestataire après 3 tentatives d\'appel, un remboursement automatique est effectué.'
                        : 'Payments are processed securely via Stripe. In case of provider unavailability after 3 call attempts, an automatic refund is made.'
                      }
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {language === 'fr' ? 'Limitation de responsabilité' : 'Limitation of liability'}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {language === 'fr'
                        ? 'SOS Expat & Travelers agit en tant qu\'intermédiaire entre les clients et les prestataires. Nous ne sommes pas responsables du contenu des conseils fournis par les prestataires.'
                        : 'SOS Expat & Travelers acts as an intermediary between clients and providers. We are not responsible for the content of advice provided by providers.'
                      }
                    </p>
                    <p className="mt-4 text-gray-600 leading-relaxed">
                      {language === 'fr'
                        ? 'En cas de non-réponse du client après 3 tentatives d\'appel, le paiement sera encaissé par la plateforme.'
                        : 'In case of no response from the client after 3 call attempts, the payment will be processed by the platform.'
                      }
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {language === 'fr' ? 'Contact' : 'Contact'}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {language === 'fr'
                        ? 'Pour toute question concernant ces conditions, contactez-nous à: legal@sos-expat.com'
                        : 'For any questions regarding these terms, contact us at: legal@sos-expat.com'
                      }
                    </p>
                  </section>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TermsClients;

