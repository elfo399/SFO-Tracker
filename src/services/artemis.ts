import { buildFallbackSnapshot } from '../data/fallbackMission'
import type { MissionSnapshot } from '../types/mission'

const configuredUrl =
  import.meta.env.VITE_ARTEMIS_DATA_URL?.trim() || '/api/artemis/snapshot'

type ExternalMissionSnapshot = {
  statusLine: string
  sourceLabel: string
  lastUpdatedLabel: string
  missionElapsedSeconds: number
  velocityKmS: number
  distanceFromEarthKm: number
  distanceToMoonKm: number
  spacecraftPosition: [number, number, number]
  moonPosition: [number, number, number]
  fullTrajectory?: [number, number, number][]
  completedTrajectory?: [number, number, number][]
}

function isVector(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((item) => typeof item === 'number')
  )
}

function isExternalSnapshot(value: unknown): value is ExternalMissionSnapshot {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.statusLine === 'string' &&
    typeof candidate.sourceLabel === 'string' &&
    typeof candidate.lastUpdatedLabel === 'string' &&
    typeof candidate.missionElapsedSeconds === 'number' &&
    typeof candidate.velocityKmS === 'number' &&
    typeof candidate.distanceFromEarthKm === 'number' &&
    typeof candidate.distanceToMoonKm === 'number' &&
    isVector(candidate.spacecraftPosition) &&
    isVector(candidate.moonPosition) &&
    (candidate.fullTrajectory === undefined ||
      (Array.isArray(candidate.fullTrajectory) &&
        candidate.fullTrajectory.every(isVector))) &&
    (candidate.completedTrajectory === undefined ||
      (Array.isArray(candidate.completedTrajectory) &&
        candidate.completedTrajectory.every(isVector)))
  )
}

export async function fetchArtemisSnapshot(): Promise<MissionSnapshot> {
  if (!configuredUrl) {
    return buildFallbackSnapshot()
  }

  const response = await fetch(configuredUrl, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Feed Artemis non raggiungibile (${response.status}).`)
  }

  const payload = await response.json()

  if (!isExternalSnapshot(payload)) {
    throw new Error('Feed Artemis con schema non valido.')
  }

  return {
    missionName: 'Artemis II',
    earthPosition: [0, 0, 0],
    milestones: buildFallbackSnapshot().milestones,
    fullTrajectory:
      payload.fullTrajectory ?? buildFallbackSnapshot().fullTrajectory,
    completedTrajectory:
      payload.completedTrajectory ?? buildFallbackSnapshot().completedTrajectory,
    ...payload,
  }
}
