# Artemis Orbit Tracker

Webapp React + Vite + Three.js per seguire Artemis II in una scena 3D Terra-Luna con dati missione serviti da un backend locale.

## Stack

- frontend: Vite + React + `@react-three/fiber`
- backend locale: Express + `tsx`
- fonti dati: NASA Artemis II OEM, JPL Horizons, NASA APOD

## Prerequisiti

- Node.js 22+
- PowerShell o `cmd`

Controllo rapido:

```powershell
node -v
```

## Setup locale

1. Installa le dipendenze:

```powershell
npm.cmd install
```

2. Crea il file `.env`.

Se non esiste gia, copia `.env.example`:

```powershell
Copy-Item .env.example .env
```

Contenuto di default:

```env
NASA_API_KEY=DEMO_KEY
NASA_ARTEMIS_OEM_URL=https://www.nasa.gov/wp-content/uploads/2026/03/artemis-ii-oem-2026-04-03-to-ei.zip
ARTEMIS_LAUNCH_UTC=2026-04-01T22:24:00Z
```

`DEMO_KEY` basta per sviluppo, ma per un uso piu serio conviene una chiave NASA personale.

## Avvio in sviluppo

Avvia frontend e backend insieme:

```powershell
npm.cmd run dev
```

Il comando avvia:

- frontend Vite su `http://localhost:5173`
- backend API locale su `http://localhost:8787`

Il backend e in watch mode, quindi si riavvia automaticamente quando modifichi [server/index.ts](C:/Users/Alfon/Desktop/Workspace/SFO-Tracker/server/index.ts).

## URL utili

- app: `http://localhost:5173`
- health check backend via proxy Vite: `http://localhost:5173/api/health`
- health check backend diretto: `http://localhost:8787/api/health`
- snapshot missione: `http://localhost:5173/api/artemis/snapshot`
- APOD: `http://localhost:5173/api/nasa/apod`

Se tutto e aggiornato correttamente, `GET /api/health` restituisce anche la versione del backend.

## Build produzione

Build frontend:

```powershell
npm.cmd run build
```

Preview frontend buildata:

```powershell
npm.cmd run preview
```

Avvio backend senza watch:

```powershell
npm.cmd run server
```

## Come funziona

1. Il backend scarica l'OEM ufficiale di Artemis II da NASA.
2. Il backend interroga JPL Horizons per il vettore della Luna.
3. Il frontend chiama `/api/artemis/snapshot` e renderizza:
   la posizione attuale di Orion,
   la traiettoria completa,
   la traiettoria gia percorsa.
4. Il frontend chiama anche `/api/nasa/apod` per il contenuto editoriale.

## Troubleshooting

### `npm install` fallisce in PowerShell con `npm.ps1`

Usa:

```powershell
npm.cmd install
```

e per avviare:

```powershell
npm.cmd run dev
```

### Il backend non sembra aggiornarsi

Chiudi tutti i processi Node e riavvia:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
npm.cmd run dev
```

Poi controlla:

```text
http://localhost:5173/api/health
```

### `502 Bad Gateway` su `/api/artemis/snapshot`

Le cause tipiche sono:

- feed NASA temporaneamente non raggiungibile
- risposta JPL Horizons non valida
- backend locale non partito

Controlli minimi:

```text
http://localhost:5173/api/health
http://localhost:8787/api/health
```

### La scena 3D mostra solo parte della traiettoria

La versione attuale mostra:

- traiettoria completa
- tratto gia percorso
- tratto futuro tratteggiato

Se non li vedi, fai un hard refresh del browser dopo il riavvio del dev server.

## Fonti ufficiali

- NASA AROW: https://www.nasa.gov/trackartemis
- NASA Artemis II real-time / OEM: https://www.nasa.gov/missions/artemis/artemis-2/track-nasas-artemis-ii-mission-in-real-time/
- NASA APOD API: https://api.nasa.gov/
- JPL Horizons API docs: https://ssd-api.jpl.nasa.gov/doc/horizons.html

## Nota architetturale

JPL SSD non e adatto a essere chiamato direttamente dal browser per uso web pubblico a causa dei limiti CORS e delle policy di accesso. Per questo il progetto usa un backend/proxy locale.
