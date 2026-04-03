export type ApodEntry = {
  title: string
  date: string
  explanation: string
  url: string
  hdurl?: string
  mediaType: 'image' | 'video'
  copyright?: string
}
