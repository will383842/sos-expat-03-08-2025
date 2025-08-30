// src/components/common/InstallBanner.tsx
import React, { useMemo, useState } from 'react';
import { X, Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

/**
 * Bandeau PWA â€” bas droite, persistant, dÃ©gradÃ© violet
 * - S'affiche SEULEMENT si: canInstall === true ET isInstalled === false ET pas fermÃ© rÃ©cemment
 * - Ã€ inclure UNE FOIS dans le Layout (global)
 */
interface InstallBannerProps {
  /** Espace Ã  droite pour laisser la place au bouton "remonter en haut" (px) */
  offsetRightPx?: number;
  /** DÃ©calage vertical depuis le bas (px) */
  bottomPx?: number;
  /** z-index Tailwind */
  zIndexClass?: string;
  /** Classe gradient Tailwind */
  gradientClass?: string;
  /** Nombre de jours de masquage aprÃ¨s fermeture */
  closeForDays?: number;
  /** Classes supplÃ©mentaires */
  className?: string;
}

const InstallBanner: React.FC<InstallBannerProps> = ({
  offsetRightPx = 88,                        // ~ right-6 du ScrollToTop (24px) + bouton ~56-60px + marge
  bottomPx = 24,                             // bottom-6
  zIndexClass = 'z-50',
  gradientClass = 'from-violet-600 to-fuchsia-600',
  closeForDays = 30,
  className = '',
}) => {
  const { canPrompt: canInstall, installed: isInstalled, install, closeForAWhile } = usePWAInstall();
  const [closedNow, setClosedNow] = useState(false);

  const shouldShow = useMemo(() => {
    return canInstall && !isInstalled && !closedNow;
  }, [canInstall, isInstalled, closedNow]);

  if (!shouldShow) return null;

  const handleInstall = async () => {
    try { await install(); } catch {}
  };

  const handleClose = () => {
    try { closeForAWhile(); } catch {}
    setClosedNow(true); // masque immÃ©diatement
  };

  return (
    <div
      className={`fixed ${zIndexClass} pointer-events-auto ${className}`}
      style={{ right: offsetRightPx, bottom: bottomPx }}
      role="dialog"
      aria-label="Installer lâ€™application"
    >
      <div className="relative max-w-[360px] sm:max-w-[420px] rounded-2xl shadow-2xl border border-white/20 overflow-hidden backdrop-blur-xl">
        {/* Couche dÃ©corative â€” ne doit PAS capter les clics */}
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${gradientClass} opacity-95`} />

        {/* Contenu cliquable */}
        <div className="relative p-4 pr-12 text-white">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <div className="font-extrabold text-white leading-tight">Installez lâ€™app SOS Expat</div>
              <p className="text-white/90 text-sm mt-1">
                AccÃ¨s rapide, notifications, mode hors ligne â€” lâ€™app qui fait du bien !
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstall}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl font-bold bg-white text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  Installer
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-white/80 hover:text-white underline decoration-2 underline-offset-4 text-sm font-semibold"
                  aria-label={`Fermer pendant ${closeForDays} jours`}
                  title={`Fermer pendant ${closeForDays} jours`}
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>

          {/* Croix de fermeture */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-2.5 right-2.5 p-2 rounded-md hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Fermer le bandeau dâ€™installation"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallBanner;
