'use client';

import { useEffect, useRef, useState } from 'react';

import { DEMO_WARNING_TEXT } from '@/components/weather/DemoWarning';

import { installGuideFor } from './installGuides';
import { closeModal, promptInstall } from './pwaStore';
import { usePwaState } from './usePwaInstall';

import styles from './InstallAppModal.module.css';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const TITLE_ID = 'pwa-install-modal-title';
const LEAD_ID = 'pwa-install-modal-lead';

export function InstallAppModal() {
  const { isModalOpen, canPrompt, platform } = usePwaState();
  const dialogRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      return undefined;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeModal();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Capture phase so the sheet host's own Escape handler never sees it first.
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      previouslyFocused?.focus();
    };
  }, [isModalOpen]);

  if (!isModalOpen) {
    return null;
  }

  const guide = installGuideFor(platform, canPrompt);

  const handleInstall = async () => {
    setBusy(true);
    await promptInstall();
    if (mounted.current) {
      setBusy(false);
    }
  };

  return (
    <div className={styles.overlay} data-testid="pwa-install-modal">
      <button
        type="button"
        className={styles.scrim}
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => closeModal()}
      />
      <div
        ref={dialogRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-describedby={LEAD_ID}
        tabIndex={-1}
      >
        <button
          type="button"
          className={styles.close}
          onClick={() => closeModal()}
          aria-label="Cerrar"
        >
          <span aria-hidden="true">×</span>
        </button>

        <p className={styles.eyebrow}>Meteorología Aeronáutica</p>
        <h2 id={TITLE_ID}>Instala Meteo Aero en tu dispositivo</h2>

        <ul className={styles.benefits}>
          <li>Acceso directo desde la pantalla de inicio, sin buscar el enlace.</li>
          <li>Se abre a pantalla completa, sin la barra del navegador.</li>
          <li>La última escena consultada queda disponible sin conexión.</li>
        </ul>

        <p className={styles.lead} id={LEAD_ID}>{guide.lead}</p>
        <ol className={styles.steps}>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        {/* The footer warning is covered while this is open, so it is repeated. */}
        <p className={styles.warning} role="note">{DEMO_WARNING_TEXT}</p>

        <div className={styles.actions}>
          {canPrompt ? (
            <>
              <button
                type="button"
                className={styles.primary}
                onClick={handleInstall}
                disabled={busy}
                data-testid="pwa-install-confirm"
              >
                {busy ? 'Abriendo el instalador…' : 'Instalar ahora'}
              </button>
              <button type="button" className={styles.secondary} onClick={() => closeModal()}>
                Ahora no
              </button>
            </>
          ) : (
            <button type="button" className={styles.primary} onClick={() => closeModal()}>
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
