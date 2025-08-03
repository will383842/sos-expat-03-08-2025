import React, { useEffect, useState } from 'react';
import { Cookie, Settings, Eye, Shield } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

const Cookies: React.FC = () => {
  const { language } = useApp();
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCookiesPolicy = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, 'legal_documents'),
          where('type', '==', 'cookies'),
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
        console.error('Error fetching cookies policy:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCookiesPolicy();
  }, [language]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-orange-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-full p-4">
                <Cookie className="w-12 h-12 text-orange-600" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {language === 'fr' ? 'Politique des Cookies' : 'Cookie Policy'}
            </h1>
            <p className="text-xl text-orange-100 max-w-2xl mx-auto">
              {language === 'fr'
                ? 'Comment nous utilisons les cookies sur notre site'
                : 'How we use cookies on our site'
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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
                        <Eye className="w-6 h-6 text-orange-600 mr-3" />
                        <h3 className="text-xl font-semibold text-gray-900">
                          {language === 'fr' ? 'Qu\'est-ce qu\'un cookie ?' : 'What is a cookie?'}
                        </h3>
                      </div>
                      <p className="text-gray-600 leading-relaxed">
                        {language === 'fr'
                          ? 'Un cookie est un petit fichier texte stocké sur votre appareil lorsque vous visitez notre site web. Les cookies nous aident à améliorer votre expérience utilisateur et à fournir nos services.'
                          : 'A cookie is a small text file stored on your device when you visit our website. Cookies help us improve your user experience and provide our services.'
                        }
                      </p>
                    </section>

                    <section>
                      <div className="flex items-center mb-4">
                        <Settings className="w-6 h-6 text-orange-600 mr-3" />
                        <h3 className="text-xl font-semibold text-gray-900">
                          {language === 'fr' ? 'Types de cookies utilisés' : 'Types of cookies used'}
                        </h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            {language === 'fr' ? 'Cookies essentiels' : 'Essential cookies'}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {language === 'fr'
                              ? 'Nécessaires au fonctionnement du site (authentification, sécurité, préférences de langue)'
                              : 'Necessary for site functionality (authentication, security, language preferences)'
                            }
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            {language === 'fr' ? 'Cookies analytiques' : 'Analytics cookies'}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {language === 'fr'
                              ? 'Nous aident à comprendre comment vous utilisez notre site pour l\'améliorer'
                              : 'Help us understand how you use our site to improve it'
                            }
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            {language === 'fr' ? 'Cookies de performance' : 'Performance cookies'}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {language === 'fr'
                              ? 'Optimisent les performances et la vitesse de chargement du site'
                              : 'Optimize site performance and loading speed'
                            }
                          </p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <div className="flex items-center mb-4">
                        <Shield className="w-6 h-6 text-orange-600 mr-3" />
                        <h3 className="text-xl font-semibold text-gray-900">
                          {language === 'fr' ? 'Gestion des cookies' : 'Cookie management'}
                        </h3>
                      </div>
                      <p className="text-gray-600 leading-relaxed mb-4">
                        {language === 'fr'
                          ? 'Vous pouvez contrôler et gérer les cookies de plusieurs façons:'
                          : 'You can control and manage cookies in several ways:'
                        }
                      </p>
                      <ul className="list-disc list-inside text-gray-600 space-y-2">
                        <li>
                          {language === 'fr'
                            ? 'Paramètres de votre navigateur web'
                            : 'Your web browser settings'
                          }
                        </li>
                        <li>
                          {language === 'fr'
                            ? 'Bannière de consentement sur notre site'
                            : 'Consent banner on our site'
                          }
                        </li>
                        <li>
                          {language === 'fr'
                            ? 'Outils de gestion des préférences'
                            : 'Preference management tools'
                          }
                        </li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        {language === 'fr' ? 'Cookies tiers' : 'Third-party cookies'}
                      </h3>
                      <p className="text-gray-600 leading-relaxed mb-4">
                        {language === 'fr'
                          ? 'Nous utilisons des services tiers qui peuvent placer leurs propres cookies:'
                          : 'We use third-party services that may place their own cookies:'
                        }
                      </p>
                      <ul className="list-disc list-inside text-gray-600 space-y-2">
                        <li>Stripe (paiements sécurisés)</li>
                        <li>Twilio (appels téléphoniques)</li>
                        <li>Firebase (authentification et base de données)</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        {language === 'fr' ? 'Contact' : 'Contact'}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {language === 'fr'
                          ? 'Pour toute question concernant notre utilisation des cookies, contactez-nous à: privacy@sos-expat.com'
                          : 'For any questions regarding our use of cookies, contact us at: privacy@sos-expat.com'
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

export default Cookies;