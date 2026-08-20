'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import {
  normalizeAirportSearchQuery,
  searchAirports,
  type AirportFeature,
  type AirportFeatureCollection,
  type DemoAirportIcao,
} from '@/features/airports';
import type { DemoRoute, RouteAnalysis } from '@/features/route';

import styles from './RoutePlanner.module.css';


export interface RoutePlannerProps {
  airports: AirportFeatureCollection;
  route: DemoRoute | null;
  analysis: RouteAnalysis | null;
  loading: boolean;
  error: string | null;
  onChange(route: DemoRoute | null): void;
  onRetry(): void;
}

interface RouteDraft {
  originIcao: DemoAirportIcao | null;
  destinationIcao: DemoAirportIcao | null;
}

interface LocalRouteDraft {
  externalRouteKey: string | null;
  value: RouteDraft;
}

interface SelectionErrorState {
  externalRouteKey: string | null;
  message: string;
}

interface SearchDraft {
  selectedAirport: DemoAirportIcao | null;
  query: string;
}

interface RouteAirportSelectorProps {
  label: string;
  airports: AirportFeatureCollection;
  selectedAirport: DemoAirportIcao | null;
  disabled: boolean;
  onSelect(icaoCode: DemoAirportIcao): void;
}

function selectedQuery(selectedAirport: DemoAirportIcao | null): string {
  return selectedAirport ?? '';
}

function RouteAirportSelector({
  label,
  airports,
  selectedAirport,
  disabled,
  onSelect,
}: RouteAirportSelectorProps) {
  const componentId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [queryDraft, setQueryDraft] = useState<SearchDraft | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = queryDraft?.selectedAirport === selectedAirport
    ? queryDraft.query
    : selectedQuery(selectedAirport);
  const normalizedQuery = normalizeAirportSearchQuery(query);
  const results = useMemo(() => searchAirports(airports, query), [airports, query]);
  const listboxId = `${componentId}-results`;
  const showResults = !disabled && isOpen && normalizedQuery !== '';
  const activeOptionId = activeIndex >= 0 && activeIndex < results.length
    ? `${componentId}-option-${results[activeIndex].properties.icao_code}`
    : undefined;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setQueryDraft(null);
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [selectedAirport]);

  const selectAirport = (airport: AirportFeature) => {
    const icaoCode = airport.properties.icao_code;
    setQueryDraft(null);
    setIsOpen(false);
    setActiveIndex(-1);
    onSelect(icaoCode);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setQueryDraft(null);
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (normalizedQuery === '' || results.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((currentIndex) => {
        if (currentIndex < 0) {
          return offset > 0 ? 0 : results.length - 1;
        }
        return (currentIndex + offset + results.length) % results.length;
      });
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      selectAirport(results[activeIndex >= 0 ? activeIndex : 0]);
    }
  };

  return (
    <div ref={rootRef} className={styles.selector}>
      <label htmlFor={`${componentId}-input`}>{label}</label>
      <input
        id={`${componentId}-input`}
        type="search"
        role="combobox"
        autoComplete="off"
        value={query}
        disabled={disabled}
        placeholder="ICAO, IATA, nombre o ciudad"
        aria-autocomplete="list"
        aria-expanded={showResults}
        aria-controls={listboxId}
        aria-activedescendant={showResults ? activeOptionId : undefined}
        onFocus={() => {
          setQueryDraft({ selectedAirport, query });
          setIsOpen(normalizedQuery !== '');
        }}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQueryDraft({ selectedAirport, query: nextQuery });
          setIsOpen(normalizeAirportSearchQuery(nextQuery) !== '');
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
      />

      {showResults && results.length > 0 && (
        <div id={listboxId} className={styles.results} role="listbox">
          {results.map((airport, index) => {
            const { properties } = airport;
            return (
              <button
                id={`${componentId}-option-${properties.icao_code}`}
                key={properties.icao_code}
                type="button"
                role="option"
                aria-selected={properties.icao_code === selectedAirport}
                data-active={index === activeIndex ? 'true' : 'false'}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectAirport(airport)}
              >
                <span className={styles.codes}>
                  <strong>{properties.icao_code}</strong>
                  <span>{properties.iata_code}</span>
                </span>
                <span className={styles.identity}>
                  <strong>{properties.name}</strong>
                  <span>{properties.city}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {showResults && results.length === 0 && (
        <p className={styles.noResults}>No hay aeropuertos en este demo</p>
      )}
    </div>
  );
}

function draftFromRoute(route: DemoRoute | null): RouteDraft {
  return {
    originIcao: route?.originIcao ?? null,
    destinationIcao: route?.destinationIcao ?? null,
  };
}

function routeKey(route: DemoRoute | null): string | null {
  return route ? `${route.originIcao}-${route.destinationIcao}` : null;
}

export function RoutePlanner({
  airports,
  route,
  analysis,
  loading,
  error,
  onChange,
  onRetry,
}: RoutePlannerProps) {
  const externalRouteKey = routeKey(route);
  const [localDraft, setLocalDraft] = useState<LocalRouteDraft>(() => ({
    externalRouteKey,
    value: draftFromRoute(route),
  }));
  const [selectionErrorState, setSelectionErrorState] = (
    useState<SelectionErrorState | null>(null)
  );
  const draft = localDraft.externalRouteKey === externalRouteKey
    ? localDraft.value
    : draftFromRoute(route);
  const selectionError = selectionErrorState?.externalRouteKey === externalRouteKey
    ? selectionErrorState.message
    : null;

  const setDraft = (value: RouteDraft) => {
    setLocalDraft({ externalRouteKey, value });
  };

  const setSelectionError = (message: string | null) => {
    setSelectionErrorState(message ? { externalRouteKey, message } : null);
  };

  const selectEndpoint = (
    endpoint: 'originIcao' | 'destinationIcao',
    icaoCode: DemoAirportIcao,
  ) => {
    const counterpart = endpoint === 'originIcao'
      ? draft.destinationIcao
      : draft.originIcao;
    if (icaoCode === counterpart) {
      setSelectionError('Origen y destino deben ser diferentes.');
      return;
    }
    const nextDraft = { ...draft, [endpoint]: icaoCode };
    setDraft(nextDraft);
    setSelectionError(null);
    if (nextDraft.originIcao && nextDraft.destinationIcao) {
      onChange({
        originIcao: nextDraft.originIcao,
        destinationIcao: nextDraft.destinationIcao,
      });
    }
  };

  const hasCompleteDraft = draft.originIcao !== null && draft.destinationIcao !== null;
  const hasAnySelection = draft.originIcao !== null || draft.destinationIcao !== null;

  return (
    <section className={styles.panel} aria-labelledby="route-planner-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Ruta y viento relativo</p>
          <h2 id="route-planner-title">Historia aeronáutica</h2>
        </div>
        {analysis && (
          <span className={styles.sampleCount}>{analysis.samples.length} muestras</span>
        )}
      </header>

      <div className={styles.selectors}>
        <RouteAirportSelector
          label="Origen"
          airports={airports}
          selectedAirport={draft.originIcao}
          disabled={loading}
          onSelect={(icaoCode) => selectEndpoint('originIcao', icaoCode)}
        />
        <RouteAirportSelector
          label="Destino"
          airports={airports}
          selectedAirport={draft.destinationIcao}
          disabled={loading}
          onSelect={(icaoCode) => selectEndpoint('destinationIcao', icaoCode)}
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          disabled={!hasCompleteDraft || loading}
          onClick={() => {
            if (!draft.originIcao || !draft.destinationIcao) {
              return;
            }
            const inverted = {
              originIcao: draft.destinationIcao,
              destinationIcao: draft.originIcao,
            };
            setDraft(inverted);
            setSelectionError(null);
            onChange(inverted);
          }}
        >
          Invertir
        </button>
        <button
          type="button"
          disabled={!hasAnySelection && route === null}
          onClick={() => {
            setDraft(draftFromRoute(null));
            setSelectionError(null);
            onChange(null);
          }}
        >
          Limpiar
        </button>
      </div>

      {loading && <p className={styles.status} role="status">Analizando ruta…</p>}
      {selectionError && <p className={styles.validation} role="alert">{selectionError}</p>}
      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" disabled={loading} onClick={onRetry}>Reintentar</button>
        </div>
      )}

      <p className={styles.disclaimer}>
        Análisis simulado — no usar para planificación de vuelo
      </p>
    </section>
  );
}
