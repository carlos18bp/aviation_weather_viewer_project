'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './SceneShare.module.css';


type CopyStatus = 'copied' | 'manual' | null;

interface CopyFeedback {
  url: string;
  status: Exclude<CopyStatus, null>;
}

export interface ClipboardWriter {
  writeText(value: string): Promise<void>;
}

export interface SceneShareProps {
  url: string;
  clipboard?: ClipboardWriter | null;
}

function browserClipboard(): ClipboardWriter | null {
  return typeof navigator !== 'undefined' && navigator.clipboard
    ? navigator.clipboard
    : null;
}

export function SceneShare({ url, clipboard }: SceneShareProps) {
  const [feedback, setFeedback] = useState<CopyFeedback | null>(null);
  const manualInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const copyStatus: CopyStatus = feedback?.url === url ? feedback.status : null;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (copyStatus === 'manual') {
      manualInput.current?.focus();
      manualInput.current?.select();
    }
  }, [copyStatus]);

  const handleCopy = async () => {
    const writer = clipboard === undefined ? browserClipboard() : clipboard;
    if (writer === null) {
      setFeedback({ url, status: 'manual' });
      return;
    }

    try {
      await writer.writeText(url);
      if (mounted.current) {
        setFeedback({ url, status: 'copied' });
      }
    } catch {
      if (mounted.current) {
        setFeedback({ url, status: 'manual' });
      }
    }
  };

  return (
    <section className={styles.share} aria-label="Compartir escena">
      <button type="button" onClick={handleCopy}>Copiar enlace de escena</button>
      {copyStatus === 'copied' && (
        <p role="status">Enlace de escena copiado.</p>
      )}
      {copyStatus === 'manual' && (
        <div className={styles.manualCopy}>
          <label htmlFor="viewer-scene-share-url">Copia manualmente este enlace</label>
          <input
            ref={manualInput}
            id="viewer-scene-share-url"
            type="text"
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
          />
          <p role="status">La copia automática no está disponible.</p>
        </div>
      )}
    </section>
  );
}
