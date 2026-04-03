import { useEffect, useState } from 'react'
import { fetchApod } from '../services/apod'
import type { ApodEntry } from '../types/apod'

export function useApod() {
  const [entry, setEntry] = useState<ApodEntry | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    fetchApod()
      .then((next) => {
        if (!mounted) return
        setEntry(next)
        setError(null)
      })
      .catch((loadError) => {
        if (!mounted) return
        setError(loadError instanceof Error ? loadError.message : 'Errore APOD.')
      })

    return () => {
      mounted = false
    }
  }, [])

  return { entry, error }
}
