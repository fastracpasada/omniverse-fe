# MARS-NAV Mission Control

Responsive React + TypeScript dashboard prototype for a simulated Jezero Crater exploration mission. Astronaut telemetry, environmental values, routes, terrain features, targets, and reports are demo content and are not operational guidance.

## Run locally

```sh
npm install
npm run dev
```

Build and type-check with `npm run build`; run Oxlint with `npm run lint`.

## Application structure

- `src/components/layout`: mission header, navigation, and shared layout
- `src/components/map`: OpenLayers Mars-local schematic map and layer controls
- `src/pages`: overview, explorer, planner, objectives, EVA, reports, and settings
- `src/data`: deterministic mock mission values, kept separate from UI
- `src/services/missionApi.ts`: typed local service boundary for sites, layers, targets, route planning, missions, and simulations
- `src/stores/missionStore.ts`: shared navigation, map, route, and simulation state
- `src/utils/marsProjection.ts`: local Jezero demo projection in metres

## Map and data limitations

The OpenLayers map uses a dedicated local metric projection and schematic vectors only. It does not use Earth Web Mercator, OpenStreetMap, NASA imagery, or verified elevation/geology products. Placeholder layer controls remain disabled until a data source is configured. The visible scale is meaningful only in the local demo grid; it does not represent a validated site georeference.

The service module currently returns local mock data and performs no network requests. It is the integration boundary for the planned `/api/v1/sites`, `/api/v1/layers`, `/api/v1/science-targets`, `/api/v1/routes/plan`, `/api/v1/missions`, `/api/v1/missions/{id}`, and `/api/v1/simulations` endpoints.

## Technology

React, TypeScript, Vite, Tailwind CSS v4, OpenLayers, Zustand, TanStack Query, React Router, Recharts, and Lucide React.
