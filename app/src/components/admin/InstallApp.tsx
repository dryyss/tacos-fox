'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

interface InstallPrompt extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

/* « Installer l'application » sur la tablette cuisine : icône sur l'écran d'accueil, ouverture en
   plein écran directement sur les commandes. Android et Chrome : invite du navigateur.
   iPad et iPhone : pas d'invite possible, on explique « Partager > Sur l'écran d'accueil ». */
export function InstallApp() {
  const toast = useToast();
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return; // déjà installée
    const ua = navigator.userAgent;
    setIos(/iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1));
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPrompt); };
    const onInstalled = () => { setPrompt(null); toast('Application installée : ouvrez « TF Cuisine » depuis l’écran d’accueil'); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, [toast]);

  if (prompt) {
    return (
      <button className="btn btn--sm btn--ghost" onClick={async () => { await prompt.prompt(); const r = await prompt.userChoice; if (r.outcome === 'accepted') setPrompt(null); }}>
        Installer l’application
      </button>
    );
  }
  if (ios) {
    return (
      <button className="btn btn--sm btn--ghost" onClick={() => toast('Sur iPad : touchez Partager puis « Sur l’écran d’accueil »')}>
        Installer l’application
      </button>
    );
  }
  return null;
}
