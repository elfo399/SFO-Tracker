import { CatmullRomCurve3, Vector3 } from 'three'
import type { MissionSnapshot } from '../types/mission'

const MISSION_START = new Date('2026-04-01T22:24:00Z')
const MISSION_DURATION_SECONDS = 10 * 24 * 60 * 60
const KM_PER_SCENE_UNIT = 24000

const controlPoints = [
  new Vector3(2.8, 0.2, 0),
  new Vector3(5, 2.5, 1.4),
  new Vector3(9.5, 2.2, 2.8),
  new Vector3(14.2, 1.1, 0.8),
  new Vector3(18.5, 2.6, -1.8),
  new Vector3(15.8, 1.4, -4.4),
  new Vector3(8.2, -1.6, -2.4),
  new Vector3(3.2, -0.2, -0.4),
]

const path = new CatmullRomCurve3(controlPoints, false, 'centripetal')
const fullTrail = path.getPoints(180).map((point) => point.toArray() as [number, number, number])

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function currentStatus(progress: number) {
  if (progress < 0.16) return 'Ascesa iniziale e allontanamento dalla Terra'
  if (progress < 0.48) return 'Trasferimento translunare'
  if (progress < 0.63) return 'Sorvolo lunare'
  if (progress < 0.94) return 'Rientro verso la Terra'
  return 'Rientro atmosferico imminente'
}

function progressToMilestones(progress: number) {
  return [
    {
      label: 'Lancio',
      timeLabel: '01 Apr 2026 22:24 UTC',
      status: progress >= 0 ? 'complete' : 'upcoming',
    },
    {
      label: 'Outbound Burn',
      timeLabel: 'T+4h',
      status: progress >= 0.04 ? 'complete' : progress >= 0.02 ? 'active' : 'upcoming',
    },
    {
      label: 'Closest Moon Pass',
      timeLabel: 'T+4.8d',
      status: progress >= 0.56 ? 'complete' : progress >= 0.48 ? 'active' : 'upcoming',
    },
    {
      label: 'Return Coast',
      timeLabel: 'T+6.2d',
      status: progress >= 0.68 ? 'complete' : progress >= 0.62 ? 'active' : 'upcoming',
    },
    {
      label: 'Pacific Splashdown',
      timeLabel: 'T+10d',
      status: progress >= 0.97 ? 'active' : 'upcoming',
    },
  ] as MissionSnapshot['milestones']
}

export function buildFallbackSnapshot(now = new Date()): MissionSnapshot {
  const elapsedSeconds = clamp(
    Math.floor((now.getTime() - MISSION_START.getTime()) / 1000),
    0,
    MISSION_DURATION_SECONDS,
  )
  const progress = clamp(elapsedSeconds / MISSION_DURATION_SECONDS, 0, 1)
  const sampleIndex = Math.round(progress * (fullTrail.length - 1))
  const spacecraftPosition = fullTrail[sampleIndex]
  const moonPosition: [number, number, number] = [16, 1.4, 0]

  const distanceFromEarthKm =
    Math.sqrt(
      spacecraftPosition[0] ** 2 +
        spacecraftPosition[1] ** 2 +
        spacecraftPosition[2] ** 2,
    ) * KM_PER_SCENE_UNIT

  const distanceToMoonKm =
    Math.sqrt(
      (spacecraftPosition[0] - moonPosition[0]) ** 2 +
        (spacecraftPosition[1] - moonPosition[1]) ** 2 +
        (spacecraftPosition[2] - moonPosition[2]) ** 2,
    ) * KM_PER_SCENE_UNIT

  const velocityKmS = 10.7 - Math.sin(progress * Math.PI) * 6.4

  return {
    missionName: 'Artemis II',
    statusLine: currentStatus(progress),
    sourceLabel: 'Fallback nominale',
    lastUpdatedLabel: now.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }),
    missionElapsedSeconds: elapsedSeconds,
    velocityKmS,
    distanceFromEarthKm,
    distanceToMoonKm,
    spacecraftPosition,
    earthPosition: [0, 0, 0],
    moonPosition,
    fullTrajectory: fullTrail,
    completedTrajectory: fullTrail.slice(0, sampleIndex + 1),
    milestones: progressToMilestones(progress),
  }
}
