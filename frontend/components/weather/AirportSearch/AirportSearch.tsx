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

import styles from './AirportSearch.module.css';


export interface AirportSearchProps {
  airports: AirportFeatureCollection;
  selectedAirport: DemoAirportIcao | null;
  disabled?: boolean;
  onSelectAirport(icaoCode: DemoAirportIcao): void;
}

interface SearchDraft {
  selectedAirport: DemoAirportIcao | null;
  query: string;
}

function selectionQuery(selectedAirport: DemoAirportIcao | null): string {
  return selectedAirport ?? '';
}

export function AirportSearch({
  airports,
  selectedAirport,
  disabled = false,
  onSelectAirport,
}: AirportSearchProps) {
  const componentId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<SearchDraft | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = draft?.selectedAirport === selectedAirport
    ? draft.query
    : selectionQuery(selectedAirport);
  const normalizedQuery = normalizeAirportSearchQuery(query);
  const results = useMemo(
    () => searchAirports(airports, query),
    [airports, query],
  );
  const listboxId = `${componentId}-results`;
  const activeOptionId = activeIndex >= 0 && activeIndex < results.length
    ? `${componentId}-option-${results[activeIndex].properties.icao_code}`
    : undefined;
  const showResults = !disabled && isOpen && normalizedQuery !== '';

  const closeAndRestoreSelection = () => {
    setIsOpen(false);
    setActiveIndex(-1);
    setDraft(null);
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
      setActiveIndex(-1);
      setDraft(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const selectAirport = (airport: AirportFeature) => {
    const icaoCode = airport.properties.icao_code;
    setDraft(null);
    setIsOpen(false);
    setActiveIndex(-1);
    onSelectAirport(icaoCode);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === 'Escape') {
      if (isOpen || query !== selectionQuery(selectedAirport)) {
        event.preventDefault();
        closeAndRestoreSelection();
      }
      return;
    }

    if (normalizedQuery === '' || results.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((currentIndex) => (
        currentIndex < 0 ? 0 : (currentIndex + 1) % results.length
      ));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((currentIndex) => (
        currentIndex < 0
          ? results.length - 1
          : (currentIndex - 1 + results.length) % results.length
      ));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      selectAirport(results[activeIndex >= 0 ? activeIndex : 0]);
    }
  };

  let resultsAnnouncement = '';
  if (normalizedQuery !== '') {
    resultsAnnouncement = results.length === 0
      ? 'No hay aeropuertos en este demo.'
      : `${results.length} ${results.length === 1 ? 'aeropuerto disponible' : 'aeropuertos disponibles'}.`;
  }

  return (
    <section ref={rootRef} className={styles.search} aria-label="Búsqueda aeroportuaria">
      <label htmlFor={`${componentId}-input`} className={styles.label}>
        Buscar aeropuerto
      </label>
      <div className={styles.inputShell}>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.25" />
          <path d="m12.5 12.5 4 4" />
        </svg>
        <input
          id={`${componentId}-input`}
          type="search"
          value={query}
          disabled={disabled}
          placeholder="ICAO, IATA, nombre o ciudad"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls={listboxId}
          aria-activedescendant={showResults ? activeOptionId : undefined}
          onFocus={() => {
            setDraft({ selectedAirport, query });
            setIsOpen(normalizedQuery !== '');
          }}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setDraft({ selectedAirport, query: nextQuery });
            setIsOpen(normalizeAirportSearchQuery(nextQuery) !== '');
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>

      <span className={styles.srOnly} role="status" aria-live="polite">
        {resultsAnnouncement}
      </span>

      {showResults && results.length > 0 && (
        <div id={listboxId} className={styles.results} role="listbox">
          {results.map((airport, index) => {
            const { properties } = airport;
            const isActive = index === activeIndex;
            const isSelected = properties.icao_code === selectedAirport;

            return (
              <button
                id={`${componentId}-option-${properties.icao_code}`}
                key={properties.icao_code}
                type="button"
                className={styles.result}
                role="option"
                aria-selected={isSelected}
                data-active={isActive ? 'true' : 'false'}
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
    </section>
  );
}
