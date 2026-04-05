import type { ApodEntry } from '../types/apod'

const configuredUrl =
  import.meta.env.VITE_APOD_DATA_URL?.trim() ||
  (import.meta.env.DEV ? '/api/nasa/apod' : `${import.meta.env.BASE_URL}data/apod.json`)

function isApodEntry(value: unknown): value is ApodEntry {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.date === 'string' &&
    typeof candidate.explanation === 'string' &&
    typeof candidate.url === 'string' &&
    (candidate.hdurl === undefined || typeof candidate.hdurl === 'string') &&
    (candidate.copyright === undefined || typeof candidate.copyright === 'string') &&
    (candidate.mediaType === 'image' || candidate.mediaType === 'video')
  )
}

export async function fetchApod(): Promise<ApodEntry | null> {
  const response = await fetch(configuredUrl, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`APOD non raggiungibile (${response.status}).`)
  }

  const payload = await response.json()

  if (!isApodEntry(payload)) {
    throw new Error('Risposta APOD con schema non valido.')
  }

  return payload
}
