import React, { useEffect, useState } from 'react';
import { ShoppingCart, Shield, AlertTriangle, Phone } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

const Consumers: React.FC = () => {
  const { language } = useApp();
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConsumerInfo = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, 'legal_documents'),
          where('type', '==', 'legal'),
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
        console.error('Error fetching consumer info:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConsumerInfo();
  }, [language]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-purple-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-full p-4">
                <ShoppingCart className="w-12 h-12 text-purple-600" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {language === 'fr' ? 'Information Consommateurs' : 'Consumer Information'}
            </h1>
            <p className="text-xl text-purple-100 max-w-2xl mx-auto">
              {language === 'fr'
                ? 'Vos droits et protections en tant que consommateur'
                : 'Your rights and protections as a consumer'
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              ) : content ? (
                <div className="prose max-w-none">
                  {content.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <div className="prose max-w-none">
                  <div className="space-y-8">
                    <section>
                      <div className="flex items-center mb-4">
                        <Shield className="w-6 h-6 text-purple-600 mr-3" />
                        <h3 className="text-xl font-semibold text-gray-900">
                          {language === 'fr' ? 'Vos droits de consommateur' : 'Your consumer rights'}
                        </h3>
                      </div>
                      <ul className="list-disc list-inside text-gray-600 space-y-2">
                        <li>
                          {language === 'fr'
                            ? 'Droit à l\'information claire sur les services et tarifs'
                            : 'Right to clear information about services and rates'
                          }
                        </li>
                        <li>
                          {language === 'fr'
                            ? 'Droit de rétractation dans les conditions légales'
                            : 'Right of withdrawal under legal conditions'
                          }
                        </li>
                        <li>
                          {language === 'fr'
                            ? 'Protection contre les pratiques commerciales déloyales'
                            : 'Protection against unfair commercial practices'
                          }
                        </li>
                        <li>
                          {language === 'fr'
                            ? 'Accès à un service client réactif'
                            : 'Access to responsive customer service'
                          }
                        </li>
                      </ul>
                    </section>

                    <section>
                      <div className="flex items-center mb-4">
                        <AlertTriangle className="w-6 h-6 text-purple-600 mr-3" />
                        <h3 className="text-xl font-semibold text-gray-900">
                          {language === 'fr' ? 'Politique de remboursement' : 'Refund policy'}
                        </h3>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-purple-900 mb-2">
                          {language === 'fr' ? 'Remboursement automatique' : 'Automatic refund'}
                        </h4>
                        <p className="text-purple-800 text-sm">
                          {language === 'fr'
                            ? 'Si votre expert ne répond pas après 3 tentatives d\'appel, vous êtes automatiquement remboursé intégralement.'
                            : 'If your expert doesn\'t answer after 3 call attempts, you are automatically fully refunded.'
                          }
                        </p>
                      </div>
                      <p className="text-gray-600 leading-relaxed">
                        {language === 'fr'
                          ? 'Pour les autres cas, contactez notre service client dans les 24h suivant votre appel pour étudier votre demande de remboursement.'
                          : 'For other cases, contact our customer service within 24 hours of your call to review your refund request.'
                        }
                      </p>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        {language === 'fr' ? 'Transparence des prix' : 'Price transparency'}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-red-50 rounded-lg p-4">
                          <h4 className="font-semibold text-red-900 mb-2">
                            {language === 'fr' ? 'Appel Avocat' : 'Lawyer Call'}
                          </h4>
                          <p className="text-red-800 text-sm">
                            49€ {language === 'fr' ? 'pour 20 minutes' : 'for 20 minutes'}
                          </p>
                          <p className="text-red-700 text-xs mt-1">
                            {language === 'fr' ? 'Prix TTC, aucun frais caché' : 'All-inclusive price, no hidden fees'}
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                          <h4 className="font-semibold text-green-900 mb-2">
                            {language === 'fr' ? 'Appel Expatrié' : 'Expat Call'}
                          </h4>
                          <p className="text-green-800 text-sm">
                            19€ {language === 'fr' ? 'pour 30 minutes' : 'for 30 minutes'}
                          </p>
                          <p className="text-green-700 text-xs mt-1">
                            {language === 'fr' ? 'Prix TTC, aucun frais caché' : 'All-inclusive price, no hidden fees'}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        {language === 'fr' ? 'Médiation et réclamations' : 'Mediation and complaints'}
                      </h3>
                      <p className="text-gray-600 leading-relaxed mb-4">
                        {language === 'fr'
                          ? 'En cas de litige, vous pouvez:'
                          : 'In case of dispute, you can:'
                        }
                      </p>
                      <ul className="list-disc list-inside text-gray-600 space-y-2">
                        <li>
                          {language === 'fr'
                            ? 'Contacter notre service client: support@sosexpats.com'
                            : 'Contact our customer service: support@sosexpats.com'
                          }
                        </li>
                        <li>
                          {language === 'fr'
                            ? 'Saisir le médiateur de la consommation compétent'
                            : 'Contact the competent consumer mediator'
                          }
                        </li>
                        <li>
                          {language === 'fr'
                            ? 'Utiliser la plateforme européenne de règlement des litiges en ligne'
                            : 'Use the European online dispute resolution platform'
                          }
                        </li>
                      </ul>
                    </section>

                    <section>
                      <div className="flex items-center mb-4">
                        <Phone className="w-6 h-6 text-purple-600 mr-3" />
                        <h3 className="text-xl font-semibold text-gray-900">
                          {language === 'fr' ? 'Service client' : 'Customer service'}
                        </h3>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-600 mb-2">
                          <strong>Email:</strong> support@sosexpats.com
                        </p>
                        <p className="text-gray-600 mb-2">
                          <strong>
                            {language === 'fr' ? 'Horaires:' : 'Hours:'}
                          </strong> 24/7
                        </p>
                        <p className="text-gray-600">
                          <strong>
                            {language === 'fr' ? 'Temps de réponse:' : 'Response time:'}
                          </strong> {language === 'fr' ? 'Sous 24h' : 'Within 24h'}
                        </p>
                      </div>
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

export default Consumers;

