import type { MapLayerDefinition, MissionRoute, MissionTelemetry, ScienceTarget } from '../types/mission'

export const demoMission = {
  id: 'DEMO-JZ-07',
  name: 'Jezero Traverse 07',
  sol: 18,
  missionTime: '14:32:18 LMST',
  site: 'Jezero Crater',
  crew: 'Astronaut R. Chen · EVA-02',
  habitat: 'HAB-01 · Demo origin',
  habitatPosition: [0, 0] as [number, number],
  coordinates: '18.4° N  /  77.5° E',
  crewId: 'CREW-01',
  objectives: [
    { id: 'OBJ-01', title: 'Document delta-front sediment layers', status: 'IN PROGRESS' as const },
    { id: 'OBJ-02', title: 'Collect paired regolith samples', status: 'PLANNED' as const },
    { id: 'OBJ-03', title: 'Survey abrasion-resistant outcrop', status: 'PLANNED' as const },
  ],
  timeline: [
    { time: '13:45', activity: 'EVA preparation', detail: 'Suit checks and airlock egress', status: 'COMPLETE' },
    { time: '14:10', activity: 'Traverse to delta margin', detail: 'Planned waypoint sequence', status: 'IN PROGRESS' },
    { time: '15:05', activity: 'Sediment observation', detail: 'Imaging and sample context notes', status: 'PLANNED' },
    { time: '16:20', activity: 'Return to habitat', detail: 'Simulated route return window', status: 'PLANNED' },
  ],
}

export const scienceTargets: ScienceTarget[] = [
  { id: 'ST-01', name: 'Delta Margin A', category: 'Sedimentary outcrop', localPosition: [5100, 2700], distanceKm: 5.8, risk: 'MODERATE', description: 'Proposed observation point for documenting layered delta-front material.', objective: 'Document sediment layers', status: 'IN PROGRESS' },
  { id: 'ST-02', name: 'Crater Rim Traverse', category: 'Regolith transect', localPosition: [-4200, 4700], distanceKm: 7.2, risk: 'ELEVATED', description: 'Proposed transect for paired surface and subsurface regolith observations.', objective: 'Collect paired samples', status: 'PLANNED' },
  { id: 'ST-03', name: 'Western Bench', category: 'Rock abrasion target', localPosition: [7000, -3600], distanceKm: 8.6, risk: 'LOW', description: 'Proposed waypoint to characterize a resistant outcrop in the demo terrain.', objective: 'Survey rock outcrop', status: 'PLANNED' },
]

export const missionRoutes: MissionRoute[] = [
  { id: 'ROUTE-A', name: 'Direct traverse', strategy: 'SHORTEST', distanceKm: 5.8, durationHours: 2.4, risk: 'MODERATE', terrainNote: 'Shorter demo route; terrain not validated.', waypoints: [[0, 0], [1700, 800], [3500, 1600], [5100, 2700]] },
  { id: 'ROUTE-B', name: 'Conservative traverse', strategy: 'SAFETY FIRST', distanceKm: 7.1, durationHours: 3.1, risk: 'LOW', terrainNote: 'Longer demo route with a wider offset from mock hazard polygons.', waypoints: [[0, 0], [900, -1200], [2800, -600], [3900, 900], [5100, 2700]] },
]

export const initialTelemetry: MissionTelemetry = {
  oxygenPercent: 82,
  batteryPercent: 76,
  elapsedSeconds: 38 * 60 + 24,
  distanceKm: 2.4,
  estimatedReturn: '16:20 LMST',
  terrainRisk: 'MODERATE',
}

export const initialLayers: MapLayerDefinition[] = [
  { id: 'optical', name: 'Optical imagery', status: 'PLACEHOLDER', visible: false },
  { id: 'elevation', name: 'Elevation', status: 'DEMO', visible: true },
  { id: 'slope', name: 'Terrain slope', status: 'DEMO', visible: false },
  { id: 'geology', name: 'Geological observations', status: 'PLACEHOLDER', visible: false },
  { id: 'hazards', name: 'Hazard zones', status: 'DEMO', visible: true },
  { id: 'route', name: 'Planned route', status: 'DEMO', visible: true },
]

export const environmentalContext = [
  { label: 'Surface temperature', value: '-63 °C · SIMULATED' },
  { label: 'Wind estimate', value: '4.8 m/s · SIMULATED' },
  { label: 'Pressure estimate', value: '718 Pa · SIMULATED' },
  { label: 'Terrain slope sample', value: '6.2° · DEMO' },
]