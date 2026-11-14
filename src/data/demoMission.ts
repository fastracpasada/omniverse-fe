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
  { id: 'ST-00A', name: 'Habitat Ridge', category: 'Navigation checkpoint', localPosition: [650, 420], distanceKm: 0.8, risk: 'LOW', description: 'Nearby ridge used for suit checks, navigation practice, and short surface observations.', objective: 'Verify local navigation markers', status: 'PLANNED' },
  { id: 'ST-00B', name: 'East Sample Cache', category: 'Sample cache', localPosition: [1450, -350], distanceKm: 1.6, risk: 'MODERATE', description: 'Short traverse to inspect and document the simulated sample cache.', objective: 'Inspect sample cache', status: 'PLANNED' },
  { id: 'ST-01', name: 'Delta Margin A', category: 'Sedimentary outcrop', localPosition: [5100, 2700], distanceKm: 5.8, risk: 'MODERATE', description: 'Observation point for documenting layered delta-front material.', objective: 'Document sediment layers', status: 'IN PROGRESS' },
  { id: 'ST-02', name: 'Crater Rim Traverse', category: 'Regolith transect', localPosition: [-4200, 4700], distanceKm: 7.2, risk: 'ELEVATED', description: 'Transect for paired surface and subsurface regolith observations.', objective: 'Collect paired samples', status: 'PLANNED' },
  { id: 'ST-03', name: 'Western Bench', category: 'Rock abrasion target', localPosition: [7000, -3600], distanceKm: 8.6, risk: 'LOW', description: 'Waypoint to characterize a resistant outcrop in the demo terrain.', objective: 'Survey rock outcrop', status: 'PLANNED' },
  { id: 'NASA-01', name: 'Octavia E. Butler Landing Site', category: 'Mars 2020 landing area', localPosition: [2200, -900], distanceKm: 2.4, risk: 'MODERATE', description: 'Approximate map reference for the Perseverance landing area. Not a surveyed navigation waypoint.', objective: 'Review landing-area context', status: 'PLANNED', source: 'NASA MISSION AREA' },
  { id: 'NASA-02', name: 'Séítah', category: 'Crater floor region', localPosition: [-2500, -1800], distanceKm: 3.1, risk: 'ELEVATED', description: 'Approximate regional reference associated with the Mars 2020 crater-floor campaign.', objective: 'Review regional terrain', status: 'PLANNED', source: 'NASA MISSION AREA' },
  { id: 'NASA-03', name: 'Artuby Ridge', category: 'Crater floor ridge', localPosition: [-900, -3100], distanceKm: 3.3, risk: 'MODERATE', description: 'Approximate campaign-area reference; placement is for contextual exploration only.', objective: 'Review ridge context', status: 'PLANNED', source: 'NASA MISSION AREA' },
  { id: 'NASA-04', name: 'Kodiak Butte', category: 'Delta remnant', localPosition: [-5200, 1800], distanceKm: 5.5, risk: 'ELEVATED', description: 'Approximate reference to the isolated delta remnant observed by Perseverance.', objective: 'Inspect delta geology context', status: 'PLANNED', source: 'NASA MISSION AREA' },
  { id: 'NASA-05', name: 'Three Forks', category: 'Delta-front campaign area', localPosition: [-6500, 2800], distanceKm: 7.1, risk: 'MODERATE', description: 'Approximate Mars 2020 campaign-area reference near the delta front.', objective: 'Review delta-front context', status: 'PLANNED', source: 'NASA MISSION AREA' },
  { id: 'NASA-06', name: 'Delta Front Campaign Area', category: 'Mars 2020 campaign area', localPosition: [-7400, 3900], distanceKm: 8.4, risk: 'ELEVATED', description: 'Approximate regional marker derived from public NASA mission maps, not a precise route endpoint.', objective: 'Explore campaign context', status: 'PLANNED', source: 'NASA MISSION AREA' },
  { id: 'NASA-07', name: 'Crater Floor Campaign Area', category: 'Mars 2020 campaign area', localPosition: [500, -3600], distanceKm: 3.7, risk: 'MODERATE', description: 'Approximate regional marker for the Perseverance crater-floor science campaign.', objective: 'Explore campaign context', status: 'PLANNED', source: 'NASA MISSION AREA' },
  { id: 'NASA-08', name: 'Jezero Western Delta', category: 'Delta geological region', localPosition: [-9000, 4500], distanceKm: 10.1, risk: 'ELEVATED', description: 'Broad contextual marker for Jezero’s western fan delta; not a validated landing or traverse point.', objective: 'Review delta morphology', status: 'PLANNED', source: 'NASA MISSION AREA' },
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
  { id: 'optical', name: 'Optical imagery', status: 'AVAILABLE', visible: true },
  { id: 'elevation', name: 'Elevation', status: 'AVAILABLE', visible: false },
  { id: 'slope', name: 'Terrain slope', status: 'AVAILABLE', visible: false },
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
