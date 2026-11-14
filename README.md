# MARS-NAV Mission Control

Responsive React + TypeScript dashboard for a simulated Jezero Crater exploration mission. Backend-seeded terrain and route results are synthetic prototype data; astronaut telemetry and manually proposed observations are simulated and are not operational guidance.

## Run locally

```sh
npm install
npm run dev
```

Build and type-check with `npm run build`; run Oxlint with `npm run lint`.
Set `VITE_API_BASE_URL` in `.env` to point at the FastAPI service. The current value is `http://localhost:8000`.

## Application structure

- `src/components/layout`: mission header, navigation, and shared layout
- `src/components/map`: OpenLayers Mars-local schematic map and layer controls
- `src/pages`: overview, explorer, planner, objectives, EVA, reports, and settings
- `src/data`: deterministic mock mission values, kept separate from UI
- `src/services/missionApi.ts`: typed FastAPI client for health, sites, layers, science targets, terrain, hazards, missions, route planning, observations, and EVA simulations
- `src/hooks/useMissionData.ts`: cached TanStack Query reads for site-level API resources
- `src/stores/missionStore.ts`: shared navigation, map, route, and simulation state
- `src/utils/marsProjection.ts`: local Jezero demo projection in metres

## Map and data limitations

The OpenLayers map uses the backend's site-local metric frame. The available elevation preview, hazard geometry, and route results are explicitly synthetic/demo records, not NASA imagery or verified mission products. Planned candidate layers remain disabled. The metric scale is meaningful only within the configured demo site frame; it is not operational navigation.

The frontend reads the backend at `/api/v1/health`, `/api/v1/sites`, `/api/v1/layers`, `/api/v1/science-targets`, `/api/v1/terrain/*`, `/api/v1/hazards`, and `/api/v1/missions`. Route planning creates a draft mission, requests both profiles, and saves the selected route. EVA clock advancement is an explicit backend request; it does not run as a client timer. Local mock examples remain available as clearly labeled display fallbacks when reads fail.

## Technology

React, TypeScript, Vite, Tailwind CSS v4, OpenLayers, Zustand, TanStack Query, React Router, Recharts, and Lucide React.
