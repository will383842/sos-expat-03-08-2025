import React from 'react';
import { Scale, FileText, Shield } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

const TermsLawyers: React.FC = () => {
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
        <div className="bg-blue-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-full p-4">
                <Scale className="w-12 h-12 text-blue-600" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {language === 'fr' ? 'CGU Avocats' : 'Lawyer Terms'}
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              {language === 'fr'
                ? 'Conditions générales pour les avocats prestataires'
                : 'General terms for lawyer providers'
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                      <FileText className="w-6 h-6 text-blue-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900">
                        {language === 'fr' ? 'Conditions d\'inscription' : 'Registration conditions'}
                      </h3>
                    </div>
                    <ul className="list-disc list-inside text-gray-600 space-y-2">
                      <li>
                        {language === 'fr'
                          ? 'Diplôme d\'avocat valide et en cours de validité'
                          : 'Valid and current law degree'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Inscription au barreau dans au moins un pays'
                          : 'Bar admission in at least one country'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Justificatifs d\'identité et de qualification'
                          : 'Identity and qualification documents'
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
                      <Shield className="w-6 h-6 text-blue-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900">
                        {language === 'fr' ? 'Obligations professionnelles' : 'Professional obligations'}
                      </h3>
                    </div>
                    <ul className="list-disc list-inside text-gray-600 space-y-2">
                      <li>
                        {language === 'fr'
                          ? 'Respecter le secret professionnel et la déontologie'
                          : 'Respect professional secrecy and ethics'
                        }
                      </li>
                      <li>
                        {language === 'fr'
                          ? 'Fournir des conseils juridiques de qualité'
                          : 'Provide quality legal advice'
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
                          ? 'Maintenir une disponibilité cohérente avec le statut affiché'
                          : 'Maintain availability consistent with displayed status'
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
                        ? 'Tarif: 49€ pour 20 minutes de consultation. Commission plateforme: 15%. Paiement via Stripe Connect sous 7 jours.'
                        : 'Rate: €49 for 20 minutes of consultation. Platform commission: 15%. Payment via Stripe Connect within 7 days.'
                      }
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {language === 'fr' ? 'Responsabilité professionnelle' : 'Professional liability'}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {language === 'fr'
                        ? 'Chaque avocat est responsable de ses conseils et doit disposer d\'une assurance responsabilité civile professionnelle valide.'
                        : 'Each lawyer is responsible for their advice and must have valid professional liability insurance.'
                      }
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {language === 'fr' ? 'Suspension et résiliation' : 'Suspension and termination'}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {language === 'fr'
                        ? 'SOS Expat & Travelers se réserve le droit de suspendre ou résilier un compte en cas de manquement aux obligations professionnelles.'
                        : 'SOS Expat & Travelers reserves the right to suspend or terminate an account in case of breach of professional obligations.'
                      }
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {language === 'fr' ? 'Contact' : 'Contact'}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {language === 'fr'
                        ? 'Pour toute question concernant ces conditions, contactez-nous à: lawyers@sos-expat.com'
                        : 'For any questions regarding these terms, contact us at: lawyers@sos-expat.com'
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

export default TermsLawyers;