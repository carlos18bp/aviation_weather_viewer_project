'use client';

import { useMemo, useState } from 'react';

import { DemoWarning } from '@/components/weather/DemoWarning';
import {
  PresentationMode,
  type PresentationModeProps,
} from '@/components/weather/PresentationMode';
import { SceneShare, type ClipboardWriter } from '@/components/weather/SceneShare';
import { Timeline } from '@/components/weather/Timeline';
import { DEMO_TIMESTAMPS } from '@/features/airports';

import { serializeViewerScene } from '../sceneCodec';
import { DEFAULT_VIEWER_SCENE } from '../sceneTypes';


export interface TemporalPresentationHarnessProps {
  clipboard?: ClipboardWriter | null;
  fullscreenRequest?: PresentationModeProps['fullscreenRequest'];
}

export function TemporalPresentationHarness({
  clipboard,
  fullscreenRequest,
}: TemporalPresentationHarnessProps) {
  const [presentationMode, setPresentationMode] = useState(false);
  const sceneUrl = useMemo(() => {
    const search = serializeViewerScene({
      ...DEFAULT_VIEWER_SCENE,
      viewport: { ...DEFAULT_VIEWER_SCENE.viewport },
      presentationMode,
    });
    return `https://demo.local/${search}`;
  }, [presentationMode]);

  return (
    <section aria-label="Harness temporal y de presentación">
      <div aria-label="Mapa meteorológico">Mapa</div>
      <div aria-label="UTC visible">06Z</div>
      <div aria-label="Capas meteorológicas">Viento</div>
      {!presentationMode && (
        <>
          <aside aria-label="Búsqueda aeroportuaria">Búsqueda</aside>
          <aside aria-label="Detalles secundarios">Detalles</aside>
          <aside aria-label="Ayudas de uso">Ayudas</aside>
        </>
      )}
      <Timeline
        timestamps={[...DEMO_TIMESTAMPS]}
        activeTimestamp={DEFAULT_VIEWER_SCENE.timestamp}
        isPlaying={false}
        isLoading={false}
        onSelect={() => undefined}
        onPrevious={() => undefined}
        onNext={() => undefined}
        onPlay={() => undefined}
        onPause={() => undefined}
      />
      <DemoWarning />
      <PresentationMode
        active={presentationMode}
        onChange={setPresentationMode}
        fullscreenRequest={fullscreenRequest}
      />
      <SceneShare url={sceneUrl} clipboard={clipboard} />
    </section>
  );
}
