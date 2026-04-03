import AdmZip from 'adm-zip'
import express from 'express'

type Vector3Tuple = [number, number, number]

type MissionSnapshotResponse = {
  statusLine: string
  sourceLabel: string
  lastUpdatedLabel: string
  missionElapsedSeconds: number
  velocityKmS: number
  distanceFromEarthKm: number
  distanceToMoonKm: number
  spacecraftPosition: Vector3Tuple
  moonPosition: Vector3Tuple
  fullTrajectory: Vector3Tuple[]
  completedTrajectory: Vector3Tuple[]
}

type ApodResponse = {
  title: string
  date: string
  explanation: string
  url: string
  hdurl?: string
  mediaType: 'image' | 'video'
  copyright?: string
}

type OemPoint = {
  timestamp: string
  epochMs: number
  positionKm: Vector3Tuple
  velocityKmS: Vector3Tuple
}

type MoonState = {
  positionKm: Vector3Tuple
  rangeKm: number
}

const app = express()
const port = Number(process.env.PORT ?? 8787)
const serverVersion = 'parser-v2'
const nasaApiKey = process.env.NASA_API_KEY ?? 'DEMO_KEY'
const oemUrl =
  process.env.NASA_ARTEMIS_OEM_URL ??
  'https://www.nasa.gov/wp-content/uploads/2026/03/artemis-ii-oem-2026-04-03-to-ei.zip'
const missionStartUtc =
  process.env.ARTEMIS_LAUNCH_UTC ?? '2026-04-01T22:24:00Z'
const sceneMoonUnits = 16
const sceneScaleKm = 384400 / sceneMoonUnits

let oemCache:
  | {
      fetchedAt: number
      points: OemPoint[]
    }
  | undefined

let moonCache:
  | {
      fetchedAt: number
      value: MoonState
    }
  | undefined

let apodCache:
  | {
      fetchedAt: number
      value: ApodResponse
    }
  | undefined

function parseOem(content: string) {
  const points = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d{4}-\d{2}-\d{2}T/.test(line))
    .map((line) => {
      const [timestamp, x, y, z, vx, vy, vz] = line.split(/\s+/)
      return {
        timestamp,
        epochMs: Date.parse(timestamp + 'Z'),
        positionKm: [Number(x), Number(y), Number(z)] as Vector3Tuple,
        velocityKmS: [Number(vx), Number(vy), Number(vz)] as Vector3Tuple,
      }
    })

  if (points.length === 0) {
    throw new Error('OEM NASA senza punti vettoriali.')
  }

  return points
}

async function getOemPoints() {
  if (oemCache && Date.now() - oemCache.fetchedAt < 15 * 60 * 1000) {
    return oemCache.points
  }

  const response = await fetch(oemUrl)
  if (!response.ok) {
    throw new Error(`Download OEM fallito (${response.status}).`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const archive = new AdmZip(buffer)
  const entry = archive
    .getEntries()
    .find((candidate) => candidate.entryName.toLowerCase().endsWith('.asc'))

  if (!entry) {
    throw new Error('Archivio OEM NASA senza file .asc.')
  }

  const content = archive.readAsText(entry, 'utf8')
  const points = parseOem(content)
  oemCache = {
    fetchedAt: Date.now(),
    points,
  }
  return points
}

function vectorLength(vector: Vector3Tuple) {
  return Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2)
}

function subtractVectors(left: Vector3Tuple, right: Vector3Tuple): Vector3Tuple {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]]
}

function scaleVector(vector: Vector3Tuple, factor: number): Vector3Tuple {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function statusLine(progress: number) {
  if (progress < 0.16) return 'Ascesa iniziale e allontanamento dalla Terra'
  if (progress < 0.48) return 'Trasferimento translunare'
  if (progress < 0.63) return 'Sorvolo lunare'
  if (progress < 0.94) return 'Rientro verso la Terra'
  return 'Rientro atmosferico imminente'
}

function parseHorizonsVector(result: string) {
  if (/Bad dates/i.test(result)) {
    throw new Error(`JPL Horizons ha rifiutato la query: ${result.trim()}`)
  }

  const sectionMatch = /\$\$SOE([\s\S]*?)\$\$EOE/.exec(result)
  const section = sectionMatch?.[1] ?? result
  const lines = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const xLine = lines.find((line) => line.startsWith('X ='))
  const rgLine = lines.find((line) => line.includes('RG='))

  if (xLine && rgLine) {
    const xyzMatch =
      /X\s*=\s*([-\d.E+]+)\s+Y\s*=\s*([-\d.E+]+)\s+Z\s*=\s*([-\d.E+]+)/.exec(
        xLine,
      )
    const rgMatch = /RG\s*=\s*([-\d.E+]+)/.exec(rgLine)

    if (xyzMatch && rgMatch) {
      return {
        positionKm: [
          Number(xyzMatch[1]),
          Number(xyzMatch[2]),
          Number(xyzMatch[3]),
        ] as Vector3Tuple,
        rangeKm: Number(rgMatch[1]),
      }
    }
  }

  const match =
    /\$\$SOE[\s\S]*?X\s*=\s*([-\d.E+]+)\s*Y\s*=\s*([-\d.E+]+)\s*Z\s*=\s*([-\d.E+]+)[\s\S]*?RG\s*=\s*([-\d.E+]+)/.exec(
      result,
    )

  if (match) {
    return {
      positionKm: [
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
      ] as Vector3Tuple,
      rangeKm: Number(match[4]),
    }
  }

  const excerpt = lines.slice(0, 8).join(' | ').slice(0, 280)
  throw new Error(
    `Risposta JPL Horizons senza vettore utilizzabile. Estratto: ${excerpt || 'vuoto'}`,
  )
}

async function getMoonState(now: Date) {
  if (moonCache && Date.now() - moonCache.fetchedAt < 60 * 1000) {
    return moonCache.value
  }

  const startTime = now.toISOString().slice(0, 16).replace('T', ' ')
  const stopTime = new Date(now.getTime() + 60 * 1000)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ')
  const url =
    'https://ssd.jpl.nasa.gov/api/horizons.api?' +
    new URLSearchParams({
      format: 'json',
      COMMAND: "'301'",
      OBJ_DATA: 'NO',
      MAKE_EPHEM: 'YES',
      EPHEM_TYPE: 'VECTORS',
      CENTER: "'500@399'",
      START_TIME: `'${startTime}'`,
      STOP_TIME: `'${stopTime}'`,
      STEP_SIZE: "'1 min'",
      OUT_UNITS: "'KM-S'",
      VEC_TABLE: "'3'",
      REF_SYSTEM: "'J2000'",
      REF_PLANE: "'FRAME'",
    })

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`JPL Horizons non raggiungibile (${response.status}).`)
  }

  const payload = (await response.json()) as { result?: string; message?: string }
  const rawResult = payload.result ?? payload.message
  if (!rawResult) {
    throw new Error('Risposta JPL Horizons senza campo result/message.')
  }

  const value = parseHorizonsVector(rawResult)
  moonCache = {
    fetchedAt: Date.now(),
    value,
  }
  return value
}

function findNearestPoint(points: OemPoint[], now: Date) {
  const target = now.getTime()
  let nearest = points[0]

  for (const point of points) {
    if (point.epochMs <= target) {
      nearest = point
      continue
    }
    break
  }

  return nearest
}

function toSceneTrajectory(points: OemPoint[]) {
  return points.map((point) =>
    scaleVector(point.positionKm, 1 / sceneScaleKm),
  )
}

async function buildMissionSnapshot(): Promise<MissionSnapshotResponse> {
  const now = new Date()
  const [points, moonState] = await Promise.all([getOemPoints(), getMoonState(now)])
  const current = findNearestPoint(points, now)
  const launchMs = Date.parse(missionStartUtc)
  const usableStopMs = points.at(-1)?.epochMs ?? now.getTime()
  const progress = clamp(
    (now.getTime() - launchMs) / Math.max(usableStopMs - launchMs, 1),
    0,
    1,
  )

  const spacecraftPosition = scaleVector(current.positionKm, 1 / sceneScaleKm)
  const moonPosition = scaleVector(moonState.positionKm, 1 / sceneScaleKm)
  const distanceToMoonKm = vectorLength(
    subtractVectors(current.positionKm, moonState.positionKm),
  )
  const currentPointIndex = points.findIndex(
    (point) => point.epochMs === current.epochMs,
  )
  const completedPoints =
    currentPointIndex >= 0 ? points.slice(0, currentPointIndex + 1) : [current]

  return {
    statusLine: statusLine(progress),
    sourceLabel: 'NASA OEM + JPL Horizons',
    lastUpdatedLabel: now.toLocaleString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }),
    missionElapsedSeconds: Math.max(
      0,
      Math.floor((now.getTime() - launchMs) / 1000),
    ),
    velocityKmS: vectorLength(current.velocityKmS),
    distanceFromEarthKm: vectorLength(current.positionKm),
    distanceToMoonKm,
    spacecraftPosition,
    moonPosition,
    fullTrajectory: toSceneTrajectory(points),
    completedTrajectory: toSceneTrajectory(completedPoints),
  }
}

async function getApod() {
  if (apodCache && Date.now() - apodCache.fetchedAt < 60 * 60 * 1000) {
    return apodCache.value
  }

  const response = await fetch(
    `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(nasaApiKey)}`,
  )

  if (!response.ok) {
    throw new Error(`NASA APOD non raggiungibile (${response.status}).`)
  }

  const payload = (await response.json()) as Record<string, unknown>
  const value: ApodResponse = {
    title: String(payload.title ?? 'NASA APOD'),
    date: String(payload.date ?? ''),
    explanation: String(payload.explanation ?? ''),
    url: String(payload.url ?? ''),
    hdurl: typeof payload.hdurl === 'string' ? payload.hdurl : undefined,
    mediaType: payload.media_type === 'video' ? 'video' : 'image',
    copyright:
      typeof payload.copyright === 'string' ? payload.copyright : undefined,
  }

  apodCache = {
    fetchedAt: Date.now(),
    value,
  }
  return value
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, version: serverVersion })
})

app.get('/api/artemis/snapshot', async (_request, response) => {
  try {
    response.json(await buildMissionSnapshot())
  } catch (error) {
    response.status(502).json({
      version: serverVersion,
      error: error instanceof Error ? error.message : 'Errore feed Artemis.',
    })
  }
})

app.get('/api/nasa/apod', async (_request, response) => {
  try {
    response.json(await getApod())
  } catch (error) {
    response.status(502).json({
      version: serverVersion,
      error: error instanceof Error ? error.message : 'Errore APOD.',
    })
  }
})

app.listen(port, () => {
  console.log(`Artemis API server listening on http://localhost:${port}`)
})
