export type MissionMilestone = {
  label: string
  timeLabel: string
  status: 'complete' | 'active' | 'upcoming'
}

export type MissionSnapshot = {
  missionName: string
  statusLine: string
  sourceLabel: string
  lastUpdatedLabel: string
  missionElapsedSeconds: number
  velocityKmS: number
  distanceFromEarthKm: number
  distanceToMoonKm: number
  spacecraftPosition: [number, number, number]
  earthPosition: [number, number, number]
  moonPosition: [number, number, number]
  fullTrajectory: [number, number, number][]
  completedTrajectory: [number, number, number][]
  milestones: MissionMilestone[]
}
