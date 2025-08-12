import React, { useEffect, useState } from 'react';
import { X, Phone, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';

interface Props { className?: string }

/**
 * Nouvelle bannière (remplace totalement l'ancienne bannière PWA).
 * - Disparaît si l'utilisateur clique sur ✕ (stockée dans localStorage 30 jours)
 * - i18n simple via useApp().language
 * - Responsive + accessible
 */
const TopAnnouncementBanner: React.FC<Props> = ({ className = '' }) => {
  const { language } = useApp();
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const ts = localStorage.getItem('sos_banner_closed_at');
    if (ts) {
      const days = (Date.now() - Number(ts)) / (1000 * 60 * 60 * 24);
      if (days < 30) setClosed(true);
    }
  }, []);

  if (closed) return null;

  const t = {
    fr: {
      title: "SOS Expat — Assistance 24/7",
      subtitle: "Besoin d'une aide immédiate ? Contactez-nous maintenant.",
      call: "Appeler",
      chat: "WhatsApp"
    },
    en: {
      title: "SOS Expat — 24/7 Assistance",
      subtitle: "Need help right now? Contact us.",
      call: "Call",
      chat: "WhatsApp"
    }
  } as const;

  const L = language === 'fr' ? t.fr : t.en;

  return (
    <div role="region" aria-label={L.title} className={`w-full rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg ${className}`}>
      <div className="px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <p className="text-sm sm:text-base font-semibold leading-tight">{L.title}</p>
          <p className="text-xs sm:text-sm opacity-90">{L.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link to="/sos-appel" className="inline-flex items-center gap-2 bg-white text-red-600 font-semibold px-3 sm:px-4 py-2 rounded-lg shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/60">
            <Phone className="w-4 h-4" aria-hidden />
            <span className="text-sm sm:text-base">{L.call}</span>
          </Link>
          <Link to="/whatsapp" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 font-semibold px-3 sm:px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/60">
            <MessageCircle className="w-4 h-4" aria-hidden />
            <span className="text-sm sm:text-base">{L.chat}</span>
          </Link>
          <button aria-label="Fermer la bannière" onClick={() => { localStorage.setItem('sos_banner_closed_at', String(Date.now())); setClosed(true); }} className="ml-1 p-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/60">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopAnnouncementBanner;