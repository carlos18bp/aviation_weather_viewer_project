const WARNING = 'DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL';

export default function HomePage() {
  return (
    <main className="viewer-shell">
      <header className="viewer-header">
        <div>
          <p className="viewer-eyebrow">Demo Colombia · escenario 2026-01-15</p>
          <h1>Meteorología Aeronáutica · Demo ProjectApp</h1>
        </div>
        <div className="viewer-time" aria-label="Hora seleccionada">
          <span>UTC / ZULU</span>
          <strong>06Z</strong>
          <span className="viewer-static-label">Vista inicial</span>
        </div>
      </header>

      <section className="viewer-stage" aria-label="Composición del futuro visor meteorológico">
        <aside className="viewer-panel viewer-airport-panel">
          <p className="viewer-panel-kicker">Panel aeroportuario</p>
          <h2>Información de estación</h2>
          <div className="viewer-placeholder-lines" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p>Disponible en una fase posterior.</p>
        </aside>

        <div className="viewer-map-placeholder">
          <div className="viewer-reticle" aria-hidden="true" />
          <p className="viewer-panel-kicker">Área principal del visor</p>
          <h2>Mapa de Colombia</h2>
          <p>Base visual preparada</p>
          <small>El mapa se incorpora en la Fase 01.</small>
        </div>

        <aside className="viewer-panel viewer-layers-panel">
          <div>
            <p className="viewer-panel-kicker">Capas</p>
            <h2>Meteorología</h2>
            <ul>
              <li><span className="viewer-layer-dot viewer-layer-dot-wind" />Viento</li>
              <li><span className="viewer-layer-dot viewer-layer-dot-temperature" />Temperatura</li>
            </ul>
          </div>
          <div className="viewer-legend">
            <p className="viewer-panel-kicker">Leyenda</p>
            <div className="viewer-legend-bar" aria-hidden="true" />
            <span>Escala visual pendiente</span>
          </div>
        </aside>
      </section>

      <footer className="viewer-footer">
        <p className="viewer-warning">{WARNING}</p>
        <div className="viewer-controls" aria-label="Espacio reservado para controles y línea de tiempo">
          <span>Controles</span>
          <div className="viewer-control-markers" aria-hidden="true">
            <i />
            <i />
            <i className="is-current" />
            <i />
            <i />
            <i />
          </div>
          <span>Timeline · próxima fase</span>
        </div>
      </footer>
    </main>
  );
}
