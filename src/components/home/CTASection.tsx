import React from 'react';
import { Phone, ArrowRight, Shield, Clock, Globe, Users, Rocket, Smartphone, Home, Zap, CheckCircle, Award, ShieldCheck, Star } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

// ? SOSIcon du code home.tsx
const SOSIcon: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ 
  className = "", 
  size = "md" 
}) => {
  const sizeClasses = {
    sm: "p-2 text-sm w-8 h-8",
    md: "p-3 text-lg w-12 h-12", 
    lg: "p-4 text-xl w-16 h-16",
    xl: "p-6 text-2xl w-20 h-20"
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-rose-600 rounded-2xl blur-md opacity-70" />
      <div className={`relative bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl shadow-2xl flex items-center justify-center ${sizeClasses[size]}`}>
        <span className="text-white font-black">??</span>
      </div>
    </div>
  );
};

const CTASection: React.FC = () => {
  const { language } = useApp();
  
  return (
    <section className="py-20 sm:py-32 bg-gradient-to-br from-red-700 to-red-800 relative overflow-hidden">
      {/* ? Background effects du code home.tsx */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(239,68,68,0.3)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(244,63,94,0.2)_0%,transparent_70%)]" />
      </div>

      {/* ? Éléments flottants du code home.tsx */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${20 + Math.random() * 30}s`
            }}
          >
            <div className="w-1 h-1 sm:w-2 sm:h-2 bg-gradient-to-r from-red-300 to-rose-300 rounded-full" />
          </div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-8 sm:p-12 lg:p-16">
          <div className="flex justify-center mb-6 sm:mb-8">
            <SOSIcon size="xl" className="animate-glow" />
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black mb-4 sm:mb-6">
            <span className="text-white block">
              {language === 'fr' ? 'Prêt pour' : 'Ready for'}
            </span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-rose-300 to-pink-300">
              {language === 'fr' ? 'l\'excellence ?' : 'excellence?'}
            </span>
          </h2>
          
          <p className="text-lg sm:text-xl lg:text-2xl text-white/80 mb-8 sm:mb-12 leading-relaxed max-w-3xl mx-auto">
            {language === 'fr'
              ? 'Rejoignez l\'élite des expatriés qui ont choisi la tranquillité d\'esprit.'
              : 'Join the elite of expats who have chosen peace of mind.'
            }
            <span className="block mt-2 text-base sm:text-lg text-white/60">
              {language === 'fr'
                ? 'Votre prochaine urgence sera votre dernière inquiétude.'
                : 'Your next emergency will be your last worry.'
              }
            </span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-8 sm:mb-12">
            <a
              href="/sos-appel"
              className="group px-8 sm:px-10 py-4 sm:py-5 bg-white text-red-600 font-bold rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all text-base sm:text-lg"
            >
              <span className="flex items-center justify-center gap-3">
                <Rocket className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="whitespace-nowrap">
                  {language === 'fr' ? 'Commencer maintenant' : 'Start now'}
                </span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-white/70 text-sm sm:text-base">
            <span className="flex items-center gap-2 hover:text-white transition-colors">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
              {language === 'fr' ? 'Sans engagement' : 'No commitment'}
            </span>
            <span className="flex items-center gap-2 hover:text-white transition-colors">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              {language === 'fr' ? '100% sécurisé' : '100% secure'}
            </span>
            <span className="flex items-center gap-2 hover:text-white transition-colors">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
              {language === 'fr' ? 'Activation instantanée' : 'Instant activation'}
            </span>
          </div>

          <div className="mt-8 sm:mt-12 grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto">
            {[
              { icon: Award, text: language === 'fr' ? 'N°1 des expatriés' : '#1 for expats' },
              { icon: ShieldCheck, text: language === 'fr' ? 'Données protégées' : 'Data protected' },
              { icon: Star, text: '4.9/5 étoiles' }
            ].map((item, i) => (
              <div key={i} className="text-center group hover:scale-105 transition-transform">
                <item.icon className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-red-300 group-hover:text-white transition-colors" />
                <div className="text-white/80 text-xs sm:text-sm font-medium group-hover:text-white transition-colors">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ? Styles CSS du code home.tsx */}
      <style>{`
        @keyframes float {
%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(1deg); }
        }
        @keyframes glow {
%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.6); }
        }
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        .animate-glow {
          animation: glow 3s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};

export default CTASection;



