// src/components/home/ProfileCarousel.tsx - VERSION FINALE (lawyer = isApproved, expat = non banni, exclus admin)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, limit as fsLimit, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../../config/firebase';
import ModernProfileCard from './ModernProfileCard';
import type { Provider } from '@/types/provider';

const DEFAULT_AVATAR = '/default-avatar.png';

interface ProfileCarouselProps {
  className?: string;
  showStats?: boolean;
  pageSize?: number;
}

const MAX_VISIBLE = 20;
const ROTATE_INTERVAL_MS = 30000;
const ROTATE_COUNT = 8;

const ProfileCarousel: React.FC<ProfileCarouselProps> = ({
  className = "",
  showStats = false,
  pageSize = 12
}) => {
  const { language } = useApp();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [onlineProviders, setOnlineProviders] = useState<Provider[]>([]);
  const [visibleProviders, setVisibleProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotationIndex, setRotationIndex] = useState(0);

  const rotationTimer = useRef<NodeJS.Timeout | null>(null);
  const recentlyShown = useRef<Set<string>>(new Set());

  const isUserConnected = useMemo(() => !authLoading && !!user, [authLoading, user]);

  // SEO navigation
  const handleProfileClick = useCallback((provider: Provider) => {
    const typeSlug = provider.type === 'lawyer' ? 'avocat' : 'expatrie';
    const countrySlug = (provider.country || 'monde')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-');
    const nameSlug = provider.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-');

    const seoUrl = `/${typeSlug}/${countrySlug}/francais/${nameSlug}-${provider.id}`;
    try { sessionStorage.setItem('selectedProvider', JSON.stringify(provider)); } catch {}
    navigate(seoUrl, { state: { selectedProvider: provider, navigationSource: 'home_carousel' } });
  }, [navigate]);

  // Sélection intelligente pour la rotation
  const selectVisibleProviders = useCallback((all: Provider[]): Provider[] => {
    if (all.length === 0) return [];
    const online = all.filter(p => p.isOnline);
    const offline = all.filter(p => !p.isOnline);
    const shuffledOnline = online.sort(() => Math.random() - 0.5);
    const shuffledOffline = offline.sort(() => Math.random() - 0.5);
    const prioritized = [...shuffledOnline, ...shuffledOffline];
    const notRecent = prioritized.filter(p => !recentlyShown.current.has(p.id));

    let selected = notRecent.slice(0, MAX_VISIBLE);
    if (selected.length < MAX_VISIBLE) {
      const remaining = prioritized.filter(p => !selected.includes(p));
      selected = [...selected, ...remaining].slice(0, MAX_VISIBLE);
    }
    selected.forEach(p => recentlyShown.current.add(p.id));
    if (recentlyShown.current.size > 40) {
      const old = Array.from(recentlyShown.current).slice(0, 20);
      old.forEach(id => recentlyShown.current.delete(id));
    }
    return selected;
  }, []);

  // Chargement initial
  const loadInitialProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Requête large (compat) : on filtre finement côté client
      const sosProfilesQuery = query(
        collection(db, 'sos_profiles'),
        where('type', 'in', ['lawyer', 'expat']),
        fsLimit(50)
      );
      const snapshot = await getDocs(sosProfilesQuery);

      if (snapshot.empty) {
        setOnlineProviders([]);
        setVisibleProviders([]);
        return;
      }

      const items: Provider[] = [];

      for (const d of snapshot.docs) {
        try {
          const data = d.data() as any;
          const id = d.id;

          const fullName =
            data.fullName ||
            `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
            'Expert';

          const type: 'lawyer' | 'expat' | string =
            data.type === 'lawyer' || data.type === 'expat' ? data.type : 'expat';

          const country: string =
            data.currentPresenceCountry || data.country || data.currentCountry || 'Monde';

          let avatar: string = data.profilePhoto || data.photoURL || data.avatar || '';
          if (avatar && avatar.startsWith('user_uploads/')) {
            try { avatar = await getDownloadURL(ref(storage, avatar)); }
            catch { avatar = DEFAULT_AVATAR; }
          } else if (!avatar || !avatar.startsWith('http')) {
            avatar = DEFAULT_AVATAR;
          }

          // Détection admin réelle
          const rawRole = typeof data.role === 'string' ? data.role.toLowerCase() : undefined;
          const isAdmin = data.isAdmin === true || rawRole === 'admin';

          const provider: Provider = {
            id,
            name: fullName,
            type,
            country,
            languages: Array.isArray(data.languages) ? data.languages : ['Français'],
            specialties: Array.isArray(data.specialties) ? data.specialties : [],
            rating: typeof data.rating === 'number' && data.rating >= 0 && data.rating <= 5 ? data.rating : 4.5,
            reviewCount: typeof data.reviewCount === 'number' && data.reviewCount >= 0 ? data.reviewCount : 0,
            yearsOfExperience: typeof data.yearsOfExperience === 'number' ? data.yearsOfExperience : (data.yearsAsExpat || 0),
            isOnline: data.isOnline === true,
            avatar,
            profilePhoto: avatar,
            description: data.description || data.bio || '',
            price: typeof data.price === 'number' ? data.price : (type === 'lawyer' ? 49 : 19),
            duration: typeof data.duration === 'number' ? data.duration : (type === 'lawyer' ? 20 : 30),

            // Flags pertinents
            isApproved: data.isApproved === true,
            isVisible: data.isVisible !== false,
            isBanned: data.isBanned === true, // peut être undefined
            isActive: data.isActive !== false,
            isVerified: data.isVerified === true, // gardé pour compat éventuelle
            // ne pas injecter/écraser role
            // @ts-ignore trace interne non typée
            __isAdmin: isAdmin,
          } as Provider & { __isAdmin?: boolean };

          // Règle d'affichage (alignée sur "isApproved" pour les lawyers)
          const hasValidData = provider.name.trim() !== '' && provider.country.trim() !== '';
          const notBanned = data.isBanned !== true;
          const notAdmin = !(provider as any).__isAdmin;

          const okLawyer = provider.type === 'lawyer' && provider.isApproved === true;
          const okExpat = provider.type === 'expat';

          const shouldInclude = hasValidData && notBanned && notAdmin && (okLawyer || okExpat);

          if (shouldInclude) items.push(provider);
        } catch (e) {
          console.error('❌ Erreur transformation document:', d.id, e);
        }
      }

      setOnlineProviders(items.slice(0, pageSize));
      setVisibleProviders(selectVisibleProviders(items));
    } catch (err) {
      console.error('❌ Erreur ProfileCarousel:', err);
      setError(`Erreur de chargement: ${err instanceof Error ? err.message : 'inconnue'}`);
      setOnlineProviders([]);
      setVisibleProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, selectVisibleProviders]);

  // Rotation
  const rotateVisibleProviders = useCallback(() => {
    if (onlineProviders.length === 0) return;
    const keepCount = Math.max(0, MAX_VISIBLE - ROTATE_COUNT);
    const toKeep = visibleProviders.slice(0, keepCount);

    const available = onlineProviders.filter(p =>
      !toKeep.find(kept => kept.id === p.id) &&
      !recentlyShown.current.has(p.id)
    );

    let newOnes = available.slice(0, ROTATE_COUNT);
    if (newOnes.length < ROTATE_COUNT) {
      const fallback = onlineProviders.filter(p => !toKeep.find(kept => kept.id === p.id));
      newOnes = [...newOnes, ...fallback].slice(0, ROTATE_COUNT);
    }

    const rotated = [...toKeep, ...newOnes].sort(() => Math.random() - 0.5);
    setVisibleProviders(rotated.slice(0, MAX_VISIBLE));
    setRotationIndex(prev => prev + 1);
    newOnes.forEach(p => recentlyShown.current.add(p.id));
  }, [onlineProviders, visibleProviders]);

  // Temps réel: statut online sur les visibles
  const updateProviderOnlineStatus = useCallback((id: string, isOnline: boolean) => {
    setOnlineProviders(prev => prev.map(p => p.id === id ? { ...p, isOnline } : p));
    setVisibleProviders(prev => prev.map(p => p.id === id ? { ...p, isOnline } : p));
  }, []);

  const setupRealtimeListeners = useCallback(() => {
    if (visibleProviders.length === 0) return () => {};
    const unsubscribes: (() => void)[] = [];
    visibleProviders.forEach(p => {
      const refCol = collection(db, 'sos_profiles');
      const q = query(refCol, where('__name__', '==', p.id));
      const unsub = onSnapshot(q, (snap) => {
        snap.docChanges().forEach((chg) => {
          if (chg.type === 'modified') {
            const data = chg.doc.data() as any;
            const online = data.isOnline === true;
            if (online !== p.isOnline) updateProviderOnlineStatus(chg.doc.id, online);
          }
        });
      }, (e) => console.error(`Listener ${p.id} error:`, e));
      unsubscribes.push(unsub);
    });
    return () => unsubscribes.forEach(u => u());
  }, [visibleProviders, updateProviderOnlineStatus]);

  // Timers / Effects
  useEffect(() => {
    if (rotationTimer.current) clearInterval(rotationTimer.current);
    if (visibleProviders.length > 0 && onlineProviders.length > MAX_VISIBLE) {
      rotationTimer.current = setInterval(() => rotateVisibleProviders(), ROTATE_INTERVAL_MS);
    }
    return () => { if (rotationTimer.current) clearInterval(rotationTimer.current); };
  }, [rotateVisibleProviders, visibleProviders.length, onlineProviders.length]);

  useEffect(() => { loadInitialProviders(); }, [loadInitialProviders]);

  useEffect(() => {
    if (visibleProviders.length === 0) return;
    const cleanup = setupRealtimeListeners();
    return cleanup;
  }, [setupRealtimeListeners, visibleProviders.length]);

  // Stats
  const stats = useMemo(() => ({
    total: onlineProviders.length,
    online: onlineProviders.filter(p => p.isOnline).length,
    lawyers: onlineProviders.filter(p => p.type === 'lawyer').length,
    experts: onlineProviders.filter(p => p.type === 'expat').length
  }), [onlineProviders]);

  // UI states
  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <div className="w-8 h-8 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
        <span className="ml-3 text-gray-600">Chargement des experts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadInitialProviders}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const displayProviders = visibleProviders.length > 0 ? visibleProviders : onlineProviders;

  if (displayProviders.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun expert disponible</h3>
          <p className="text-gray-600 text-sm mb-4">Aucun profil n'a été trouvé dans la base de données Firebase.</p>
        </div>
      </div>
    );
  }

  const infiniteProviders = [...displayProviders, ...displayProviders, ...displayProviders];

  return (
    <div className={className}>
      {showStats && (
        <div className="mb-8 flex justify-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.online}</div>
            <div className="text-sm text-gray-600">En ligne</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.lawyers}</div>
            <div className="text-sm text-gray-600">Avocats</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.experts}</div>
            <div className="text-sm text-gray-600">Expats</div>
          </div>
        </div>
      )}

      {onlineProviders.length > MAX_VISIBLE && (
        <div className="flex justify-center mb-4">
          <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Rotation automatique • {displayProviders.filter(p => p.isOnline).length}/{displayProviders.length} en ligne
          </div>
        </div>
      )}

      {/* Mobile */}
      <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide md:hidden">
        {displayProviders.map((provider, index) => (
          <div key={`${provider.id}-${rotationIndex}`} className="flex-shrink-0 snap-start">
            <ModernProfileCard
              provider={provider}
              onProfileClick={handleProfileClick}
              isUserConnected={isUserConnected}
              index={index}
              language={language}
            />
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden md:flex gap-8 animate-infinite-scroll">
        {infiniteProviders.map((provider, index) => (
          <div key={`${provider.id}-${index}-${rotationIndex}`} className="flex-shrink-0">
            <ModernProfileCard
              provider={provider}
              onProfileClick={handleProfileClick}
              isUserConnected={isUserConnected}
              index={index % displayProviders.length}
              language={language}
            />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes infinite-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-infinite-scroll { animation: infinite-scroll 60s linear infinite; }
        .animate-infinite-scroll:hover { animation-play-state: paused; }
        .scrollbar-hide { scrollbar-width: none; -ms-overflow-style: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default React.memo(ProfileCarousel);
export type { Provider };
