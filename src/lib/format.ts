export function formatElapsed(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`
}

export function formatDistance(value: number) {
  return `${Math.round(value).toLocaleString('it-IT')} km`
}

export function formatSpeed(value: number) {
  return `${value.toFixed(2).replace('.', ',')} km/s`
}
