'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './PresentationMode.module.css';


type FullscreenStatus = 'active' | 'unavailable' | null;

export interface PresentationModeProps {
  active: boolean;
  onChange(active: boolean): void;
  fullscreenRequest?: (() => Promise<void>) | null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.matches('input, textarea, select, [contenteditable=""], [contenteditable="true"]')
    || target.isContentEditable;
}

function requestDocumentFullscreen(): Promise<void> {
  const element = document.documentElement;
  if (typeof element.requestFullscreen !== 'function') {
    return Promise.reject(new Error('Fullscreen API unavailable.'));
  }
  return element.requestFullscreen();
}

export function PresentationMode({
  active,
  onChange,
  fullscreenRequest,
}: PresentationModeProps) {
  const [fullscreenStatus, setFullscreenStatus] = useState<FullscreenStatus>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented
        || event.repeat
        || event.ctrlKey
        || event.metaKey
        || event.altKey
        || event.key.toLowerCase() !== 'p'
        || isTypingTarget(event.target)
      ) {
        return;
      }
      event.preventDefault();
      onChange(!active);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, onChange]);

  const handleFullscreen = async () => {
    const request = fullscreenRequest === undefined
      ? requestDocumentFullscreen
      : fullscreenRequest;
    if (request === null) {
      setFullscreenStatus('unavailable');
      return;
    }

    try {
      await request();
      if (mounted.current) {
        setFullscreenStatus('active');
      }
    } catch {
      if (mounted.current) {
        setFullscreenStatus('unavailable');
      }
    }
  };

  return (
    <section
      className={styles.controls}
      role="group"
      aria-label="Modo presentación"
      data-presentation-active={active ? 'true' : 'false'}
    >
      <button
        type="button"
        className={styles.primaryAction}
        aria-pressed={active}
        onClick={() => onChange(!active)}
      >
        {active ? 'Salir de presentación' : 'Modo presentación'}
        <span aria-hidden="true">P</span>
      </button>
      {active && (
        <button
          type="button"
          className={styles.secondaryAction}
          onClick={handleFullscreen}
        >
          Pantalla completa
        </button>
      )}
      {fullscreenStatus === 'active' && (
        <p className={styles.status} role="status">Pantalla completa solicitada.</p>
      )}
      {fullscreenStatus === 'unavailable' && (
        <p className={styles.status} role="status">
          Pantalla completa no disponible; el modo presentación interno sigue activo.
        </p>
      )}
    </section>
  );
}
