# MARS-NAV Mission Control

Responsive React + TypeScript habitat-planning prototype for a two-person Jezero Crater science traverse. The team-defined objective is to document western-delta sedimentary structures and collect paired samples while the interface compares routes, terrain, resources, and return margins. It is a planning demonstration, not operational guidance.

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
- `src/pages`: integrated science-trip planner with map-layer controls, team-selected objectives, operations statistics, and settings
- `src/data`: deterministic mock mission values, kept separate from UI
- `src/services/missionApi.ts`: typed FastAPI client for health, sites, layers, science targets, terrain, hazards, missions, route planning, observations, and EVA simulations
- `src/hooks/useMissionData.ts`: cached TanStack Query reads for site-level API resources
- `src/stores/missionStore.ts`: shared navigation, map, route, and simulation state
- `src/utils/marsProjection.ts`: local Jezero demo projection in metres

## Map and data status

- **Optical observation:** NASA Mars Trek MRO CTX Jezero mosaic, loaded through its WMTS endpoint.
- **Topographic/derived:** a local USGS CTX DEM extract represented on a 250 m planning grid; elevation, slope inspection, and surface routing are derived from it.
- **Thermophysical observation:** Mars Global Surveyor TES global thermal inertia, loaded independently through NASA Mars Trek WMTS.
- **Atmospheric context:** location-aware planning estimates informed by published Perseverance MEDA observation context. These are not live measurements or forecasts.
- **Surface context:** NASA Perseverance Mastcam-Z image PIA24485, credited in the interface.
- **Modeled only:** hazard polygons, communications availability, suit/rover consumption, habitat placement, and some science markers. They are visually labeled and must not be interpreted as surveyed products.

The OpenLayers map uses a Mars geographic display projection plus a dedicated local metric planning frame. Named mission-area markers are approximate unless supplied and verified by the backend. The backend service boundary supports sites, layer metadata, targets, hazards, route plans, missions, and simulations; the frontend retains clearly labeled local fallbacks when it is unavailable.

All surface routes use one shared safety configuration: 15° maximum slope, a 2 km walking recommendation limit, a minimum 60-minute return reserve, and the Low/Medium/High classifications shown in the interface.

The frontend reads backend resources for health, sites, layer metadata, science targets, terrain, hazards, missions, route planning, observations, and EVA simulations. Backend-seeded terrain, hazard, route, and telemetry records may be synthetic demo data and are labeled accordingly. Local fallbacks remain available when reads fail; neither backend nor local prototype results are operational navigation guidance.

## Technology

React, TypeScript, Vite, Tailwind CSS v4, OpenLayers, Zustand, TanStack Query, React Router, Recharts, and Lucide React.
