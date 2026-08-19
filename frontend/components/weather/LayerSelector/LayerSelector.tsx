'use client';

import type { WeatherLayerId } from '@/lib/weather/viewerTypes';

import styles from './LayerSelector.module.css';


export interface LayerSelectorProps {
  activeLayer: WeatherLayerId;
  disabled?: boolean;
  onSelect(layer: WeatherLayerId): void;
}

interface LayerOption {
  id: WeatherLayerId;
  label: string;
  unit: string;
}

const LAYER_OPTIONS: readonly LayerOption[] = [
  { id: 'temperature', label: 'Temperatura', unit: '°C' },
  { id: 'wind', label: 'Viento', unit: 'kt' },
];

function LayerIcon({ layer }: { layer: WeatherLayerId }) {
  if (layer === 'temperature') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M8 4.5a2 2 0 1 1 4 0v7.15a3.5 3.5 0 1 1-4 0V4.5Z" />
        <path d="M10 7v6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 7h9.5a2.5 2.5 0 1 0-2.2-3.7" />
      <path d="M3 10h12.5a2.5 2.5 0 1 1-2.2 3.7" />
      <path d="M3 13h5" />
    </svg>
  );
}

export function LayerSelector({
  activeLayer,
  disabled = false,
  onSelect,
}: LayerSelectorProps) {
  return (
    <section className={styles.selector} aria-label="Capa meteorológica">
      <p className={styles.kicker}>Capa activa</p>
      <div className={styles.options} role="group" aria-label="Selector de capa">
        {LAYER_OPTIONS.map((option) => {
          const isActive = option.id === activeLayer;

          return (
            <button
              key={option.id}
              type="button"
              className={styles.option}
              disabled={disabled}
              aria-pressed={isActive}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => {
                if (!isActive) {
                  onSelect(option.id);
                }
              }}
            >
              <LayerIcon layer={option.id} />
              <span>
                <strong>{option.label}</strong>
                <small>{option.unit}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
