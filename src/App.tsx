import './App.css'
import { OrbitScene } from './components/OrbitScene'
import { useApod } from './hooks/useApod'
import { useArtemisTracker } from './hooks/useArtemisTracker'
import { formatDistance, formatElapsed, formatSpeed } from './lib/format'

function App() {
  const { snapshot, loading, error } = useArtemisTracker()
  const { entry: apod, error: apodError } = useApod()

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Artemis II Mission Tracker</p>
          <h1>Webapp 3D per seguire Orion tra Terra e Luna.</h1>
          <p className="lede">
            Il frontend ora legge un backend locale che interroga fonti
            ufficiali NASA e JPL. Se il feed live non e disponibile, il tracker
            torna su una traiettoria nominale di fallback.
          </p>
        </div>

        <div className="status-strip">
          <div>
            <span>Stato</span>
            <strong>{snapshot.statusLine}</strong>
          </div>
          <div>
            <span>Origine</span>
            <strong>{snapshot.sourceLabel}</strong>
          </div>
          <div>
            <span>Aggiornato</span>
            <strong>{snapshot.lastUpdatedLabel}</strong>
          </div>
        </div>

        <div className="metrics-grid">
          <article className="metric-card">
            <span>Mission Elapsed Time</span>
            <strong>{formatElapsed(snapshot.missionElapsedSeconds)}</strong>
          </article>
          <article className="metric-card">
            <span>Velocita</span>
            <strong>{formatSpeed(snapshot.velocityKmS)}</strong>
          </article>
          <article className="metric-card">
            <span>Distanza dalla Terra</span>
            <strong>{formatDistance(snapshot.distanceFromEarthKm)}</strong>
          </article>
          <article className="metric-card">
            <span>Distanza dalla Luna</span>
            <strong>{formatDistance(snapshot.distanceToMoonKm)}</strong>
          </article>
        </div>

        <div className="source-note">
          <p>
            Tracker ufficiale NASA: <a href="https://www.nasa.gov/trackartemis" target="_blank" rel="noreferrer">AROW</a>.
          </p>
          <p>
            Ephemeris ufficiale: <a href="https://www.nasa.gov/missions/artemis/artemis-2/track-nasas-artemis-ii-mission-in-real-time/" target="_blank" rel="noreferrer">download mission data</a>.
          </p>
          <p>
            Lancio Artemis II confermato da NASA il <strong>1 aprile 2026</strong>.
          </p>
          {loading ? <p>Polling dati in corso.</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </section>

      <section className="visual-panel">
        <div className="canvas-frame">
          <OrbitScene snapshot={snapshot} />
        </div>

        <div className="info-grid">
          <article className="info-card">
            <h2>Milestones</h2>
            <ul className="milestone-list">
              {snapshot.milestones.map((milestone) => (
                <li key={milestone.label} className={`milestone-${milestone.status}`}>
                  <span>{milestone.label}</span>
                  <strong>{milestone.timeLabel}</strong>
                </li>
              ))}
            </ul>
          </article>

          <article className="info-card">
            <h2>Data Pipeline</h2>
            <p>
              Il frontend legge <code>/api/artemis/snapshot</code>. Il server
              locale scarica l&apos;OEM ufficiale NASA di Artemis II e interroga
              JPL Horizons per il vettore della Luna.
            </p>
            <p>
              Questo evita CORS nel browser e tiene eventuali chiavi API fuori
              dal client.
            </p>
          </article>

          <article className="info-card">
            <h2>API Reali</h2>
            <p>
              Artemis snapshot: NASA OEM + JPL Horizons. Contenuto editoriale:
              NASA APOD tramite <code>/api/nasa/apod</code>.
            </p>
          </article>

          <article className="info-card apod-card">
            <h2>NASA APOD</h2>
            {apod && apod.mediaType === 'image' ? (
              <img className="apod-image" src={apod.url} alt={apod.title} />
            ) : null}
            <p>
              {apod ? `${apod.date} · ${apod.title}` : 'Caricamento APOD in corso.'}
            </p>
            {apod?.copyright ? <p>Copyright: {apod.copyright}</p> : null}
            {apodError ? <p className="error-text">{apodError}</p> : null}
          </article>
        </div>
      </section>
    </main>
  )
}

export default App
