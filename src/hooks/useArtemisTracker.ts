import { useEffect, useState } from 'react'
import { buildFallbackSnapshot } from '../data/fallbackMission'
import { fetchArtemisSnapshot } from '../services/artemis'
import type { MissionSnapshot } from '../types/mission'

const POLLING_MS = 30000

export function useArtemisTracker() {
  const [snapshot, setSnapshot] = useState<MissionSnapshot>(() => buildFallbackSnapshot())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const next = await fetchArtemisSnapshot()
        if (!mounted) return
        setSnapshot(next)
        setError(null)
      } catch (loadError) {
        if (!mounted) return
        setSnapshot(buildFallbackSnapshot())
        setError(loadError instanceof Error ? loadError.message : 'Errore nel caricamento del feed.')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()
    const timer = window.setInterval(load, POLLING_MS)

    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [])

  return { snapshot, loading, error }
}
