// src/hooks/usePWAInstall.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const LS_KEY = 'install_banner_closed_at';
const CLOSE_DAYS = 30;

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  // iOS Safari
  (navigator as any)?.standalone === true;

const daysSince = (ts: number) => (Date.now() - ts) / 86400000;

export function usePWAInstall() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(isStandalone());
  const closedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    closedAtRef.current = raw ? Number(raw) : null;
  }, []);

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const canPrompt = !!deferred && !installed;
  const recentlyClosed =
    closedAtRef.current != null && daysSince(closedAtRef.current) < CLOSE_DAYS;

  const shouldShowBanner = useMemo(
    () => !installed && !recentlyClosed,
    [installed, recentlyClosed]
  );

  const install = useCallback(async () => {
    if (!deferred) return { started: false as const };
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      return { started: true as const, choice };
    } catch {
      return { started: false as const };
    }
  }, [deferred]);

  const closeForAWhile = useCallback(() => {
    localStorage.setItem(LS_KEY, String(Date.now()));
    closedAtRef.current = Date.now();
  }, []);

  return { canPrompt, shouldShowBanner, install, installed, closeForAWhile };
}
