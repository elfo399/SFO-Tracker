import express, { type Request, type Response } from 'express'
import { buildMissionSnapshot, getApod } from './lib/missionData.js'

const app = express()
const port = Number(process.env.PORT ?? 8787)
const serverVersion = 'parser-v2'

app.get('/api/health', (_request: Request, response: Response) => {
  response.json({ ok: true, version: serverVersion })
})

app.get('/api/artemis/snapshot', async (_request: Request, response: Response) => {
  try {
    response.json(await buildMissionSnapshot())
  } catch (error) {
    response.status(502).json({
      version: serverVersion,
      error: error instanceof Error ? error.message : 'Errore feed Artemis.',
    })
  }
})

app.get('/api/nasa/apod', async (_request: Request, response: Response) => {
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
