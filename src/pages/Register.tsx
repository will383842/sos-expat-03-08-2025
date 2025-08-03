import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scale, Users, UserCheck, ArrowRight } from 'lucide-react';
import Layout from '../components/layout/Layout';

const Register: React.FC = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role: string) => {
    navigate(`/register/${role}`);
  };

  const roles = [
    {
      id: 'client',
      title: 'Client',
      description: "Je cherche de l'aide juridique ou des conseils d'expatriation",
      icon: UserCheck,
      colorClass: 'blue'
    },
    {
      id: 'lawyer',
      title: 'Avocat',
      description: 'Je suis avocat et je veux aider des expatriés francophones',
      icon: Scale,
      colorClass: 'purple'
    },
    {
      id: 'expat',
      title: 'Expatrié Aidant',
      description: 'Je suis expatrié et je veux partager mon expérience',
      icon: Users,
      colorClass: 'green'
    }
  ];

  const getColorClasses = (color: string) => ({
    hover: `hover:bg-${color}-50 hover:border-${color}-500`,
    iconBg: `bg-${color}-100`,
    iconColor: `text-${color}-600`,
    arrowColor: `text-${color}-600`
  });

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Choisissez votre profil
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ou{' '}
            <Link to="/login" className="font-medium text-red-600 hover:text-red-500">
              connectez-vous à votre compte existant
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 space-y-6">
            <div className="text-center mb-6">
              <p className="text-gray-600">
                Choisissez votre profil pour vous inscrire sur la plateforme
              </p>
            </div>
            
            {roles.map((role) => {
              const IconComponent = role.icon;
              const colors = getColorClasses(role.colorClass);
              
              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className={`w-full flex items-center justify-between p-4 border border-gray-300 rounded-lg ${colors.hover} transition-colors`}
                >
                  <div className="flex items-center">
                    <div className={`${colors.iconBg} p-3 rounded-full`}>
                      <IconComponent className={`h-6 w-6 ${colors.iconColor}`} />
                    </div>
                    <div className="ml-4 text-left">
                      <h3 className="font-semibold text-gray-900">{role.title}</h3>
                      <p className="text-sm text-gray-500">{role.description}</p>
                    </div>
                  </div>
                  <div className={colors.arrowColor}>
                    <ArrowRight size={20} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Register;