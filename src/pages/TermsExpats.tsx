import React from 'react';
import { Users, FileText, Globe } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

const TermsExpats: React.FC = () => {
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
        <div className="bg-green-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-full p-4">
                <Users className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {language === 'fr' ? 'CGU Expatriés' : 'Expat Terms'}
            </h1>
            <p className="text-xl text-green-100 max-w-2xl mx-auto">
              {language === 'fr'
                ? 'Conditions générales pour les expatriés aidants'
                : 'General terms for expat helpers'
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
                      <FileText className="w-6 h-6 text-green-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900">
                        {language === 'fr' ? 'Conditions d\'inscription' : 'Registration conditions'}
                      </h3>
                    </div>
                    <ul className="list-disc list-inside text-gray-600 space-y-2">
                      <li>
                        {language === 'fr'
                          ? 'Justificatif d\'identité valide'
                          : 'Valid identity document'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Preuve de résidence dans le pays d\'expertise'
                          : 'Proof of residence in the country of expertise'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Expérience d\'expatriation d\'au moins 1 an'
                          : 'Expatriation experience of at least 1 year'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Validation manuelle par notre équipe sous 5 minutes'
                          : 'Manual validation by our team within 5 minutes'
                        }
                      </li>
                    </ul>
                  </section>

                  <section>
                    <div className="flex items-center mb-4">
                      <Globe className="w-6 h-6 text-green-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900">
                        {language === 'fr' ? 'Obligations de service' : 'Service obligations'}
                      </h3>
                    </div>
                    <ul className="list-disc list-inside text-gray-600 space-y-2">
                      <li>
                        {language === 'fr'
                          ? 'Partager des conseils pratiques basés sur l\'expérience'
                          : 'Share practical advice based on experience'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Répondre aux appels dans les 30 secondes'
                          : 'Answer calls within 30 seconds'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Maintenir une attitude bienveillante et professionnelle'
                          : 'Maintain a caring and professional attitude'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Ne pas donner de conseils juridiques (réservés aux avocats)'
                          : 'Not provide legal advice (reserved for lawyers)'
                        }
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {language === 'fr' ? 'Rémunération' : 'Compensation'}
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      {language === 'fr'
                        ? 'Tarif: 19€ pour 30 minutes de conseil. Commission plateforme: 15%. Paiement via Stripe Connect sous 7 jours.'
                        : 'Rate: €19 for 30 minutes of advice. Platform commission: 15%. Payment via Stripe Connect within 7 days.'
                      }
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {language === 'fr' ? 'Types d\'aide autorisés' : 'Authorized types of help'}
                    </h3>
                    <ul className="list-disc list-inside text-gray-600 space-y-2">
                      <li>
                        {language === 'fr'
                          ? 'Conseils administratifs et démarches'
                          : 'Administrative advice and procedures'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Aide au logement et recherche d\'appartement'
                          : 'Housing help and apartment search'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Orientation culturelle et sociale'
                          : 'Cultural and social orientation'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Conseils pratiques du quotidien'
                          : 'Daily practical advice'
                        }
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {language === 'fr' ? 'Limitation de responsabilité' : 'Limitation of liability'}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {language === 'fr'
                        ? 'Les expatriés aidants partagent leur expérience personnelle et ne peuvent être tenus responsables des décisions prises par les clients sur la base de leurs conseils.'
                        : 'Expat helpers share their personal experience and cannot be held responsible for decisions made by clients based on their advice.'
                      }
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {language === 'fr' ? 'Contact' : 'Contact'}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {language === 'fr'
                        ? 'Pour toute question concernant ces conditions, contactez-nous à: expats@sos-expat.com'
                        : 'For any questions regarding these terms, contact us at: expats@sos-expat.com'
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

export default TermsExpats;

