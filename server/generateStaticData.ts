import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildFallbackSnapshot } from '../src/data/fallbackMission.ts'
import {
  buildMissionSnapshot,
  getApod,
  type ApodResponse,
  type MissionSnapshotResponse,
} from './lib/missionData.js'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const dataDirectory = resolve(projectRoot, 'public', 'data')
const snapshotPath = resolve(dataDirectory, 'artemis-snapshot.json')
const apodPath = resolve(dataDirectory, 'apod.json')

function toExternalSnapshot(): MissionSnapshotResponse {
  const fallback = buildFallbackSnapshot()

  return {
    statusLine: fallback.statusLine,
    sourceLabel: fallback.sourceLabel,
    lastUpdatedLabel: fallback.lastUpdatedLabel,
    missionElapsedSeconds: fallback.missionElapsedSeconds,
    velocityKmS: fallback.velocityKmS,
    distanceFromEarthKm: fallback.distanceFromEarthKm,
    distanceToMoonKm: fallback.distanceToMoonKm,
    spacecraftPosition: fallback.spacecraftPosition,
    moonPosition: fallback.moonPosition,
    fullTrajectory: fallback.fullTrajectory,
    completedTrajectory: fallback.completedTrajectory,
  }
}

const defaultApodFallback: ApodResponse = {
  title: 'NASA APOD non disponibile',
  date: new Date().toISOString().slice(0, 10),
  explanation: 'Contenuto editoriale temporaneamente non disponibile nel deploy statico.',
  url: '',
  mediaType: 'video',
}

async function readJsonIfPresent<T>(path: string) {
  try {
    const content = await readFile(path, 'utf8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value) + '\n', 'utf8')
}

async function resolveSnapshot() {
  try {
    const snapshot = await buildMissionSnapshot()
    console.log('Static snapshot Artemis generato da NASA/JPL.')
    return snapshot
  } catch (error) {
    const existing = await readJsonIfPresent<MissionSnapshotResponse>(snapshotPath)
    if (existing) {
      console.warn(
        `Feed Artemis non disponibile, riuso il file esistente: ${
          error instanceof Error ? error.message : 'errore sconosciuto'
        }`,
      )
      return existing
    }

    console.warn(
      `Feed Artemis non disponibile, uso il fallback locale: ${
        error instanceof Error ? error.message : 'errore sconosciuto'
      }`,
    )
    return toExternalSnapshot()
  }
}

async function resolveApod() {
  try {
    const apod = await getApod()
    console.log('Static APOD generato da NASA.')
    return apod
  } catch (error) {
    const existing = await readJsonIfPresent<ApodResponse>(apodPath)
    if (existing) {
      console.warn(
        `APOD non disponibile, riuso il file esistente: ${
          error instanceof Error ? error.message : 'errore sconosciuto'
        }`,
      )
      return existing
    }

    console.warn(
      `APOD non disponibile, uso il fallback locale: ${
        error instanceof Error ? error.message : 'errore sconosciuto'
      }`,
    )
    return defaultApodFallback
  }
}

async function main() {
  const [snapshot, apod] = await Promise.all([resolveSnapshot(), resolveApod()])

  await writeJson(snapshotPath, snapshot)
  await writeJson(apodPath, apod)

  console.log(`Static data scritti in ${dataDirectory}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
