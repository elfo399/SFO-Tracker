import { useState } from 'react'
import './App.css'
import { OrbitScene, type SceneFocusTarget } from './components/OrbitScene'
import { useApod } from './hooks/useApod'
import { useArtemisTracker } from './hooks/useArtemisTracker'
import { formatDistance, formatElapsed, formatSpeed } from './lib/format'

function App() {
  const { snapshot, loading, error } = useArtemisTracker()
  const { entry: apod, error: apodError } = useApod()
  const [focusTarget, setFocusTarget] = useState<SceneFocusTarget | null>(null)
  const [focusRequestId, setFocusRequestId] = useState(0)
  const isEstimatedTrajectory = snapshot.sourceLabel === 'Traiettoria stimata'
  const trackerNote = isEstimatedTrajectory
    ? 'La visualizzazione mostra una traiettoria stimata.'
    : 'Dati aggiornati periodicamente da fonti ufficiali.'

  const requestFocus = (target: SceneFocusTarget) => {
    setFocusTarget(target)
    setFocusRequestId((current) => current + 1)
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Artemis II live tracker</p>
          <h1>ArtemisView</h1>
          <p className="lede">
            Orion tra Terra e Luna con posizione, velocita, distanze e tappe
            principali in un unico colpo d&apos;occhio.
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
          <p>{trackerNote}</p>
          {loading ? <p>Aggiornamento dati in corso.</p> : null}
          {error ? (
            <p className="error-text">Aggiornamento temporaneamente non disponibile.</p>
          ) : null}
        </div>

        <article className="info-card apod-card sidebar-apod-card">
          <h2>NASA APOD</h2>
          {apod && apod.mediaType === 'image' ? (
            <div className="apod-media">
              <img
                className="apod-image"
                src={apod.hdurl ?? apod.url}
                alt={apod.title}
                loading="lazy"
              />
            </div>
          ) : null}
          <div className="apod-meta">
            <p className="apod-title">
              {apod ? `${apod.date} - ${apod.title}` : 'Caricamento APOD in corso.'}
            </p>
            {apod?.copyright ? <p className="apod-credit">{apod.copyright}</p> : null}
          </div>
          {apodError ? (
            <p className="error-text">
              Contenuto editoriale temporaneamente non disponibile.
            </p>
          ) : null}
        </article>
      </section>

      <section className="visual-panel">
        <div className="canvas-frame">
          <OrbitScene
            snapshot={snapshot}
            focusTarget={focusTarget}
            focusRequestId={focusRequestId}
          />

          <div className="focus-controls" aria-label="Controlli focus scena">
            <button
              type="button"
              className={focusTarget === 'earth' ? 'focus-button is-active' : 'focus-button'}
              onClick={() => requestFocus('earth')}
            >
              Terra
            </button>
            <button
              type="button"
              className={focusTarget === 'orion' ? 'focus-button is-active' : 'focus-button'}
              onClick={() => requestFocus('orion')}
            >
              Orion
            </button>
            <button
              type="button"
              className={focusTarget === 'moon' ? 'focus-button is-active' : 'focus-button'}
              onClick={() => requestFocus('moon')}
            >
              Luna
            </button>
          </div>
        </div>

        <div className="detail-strip">
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
        </div>
      </section>
    </main>
  )
}

export default App
