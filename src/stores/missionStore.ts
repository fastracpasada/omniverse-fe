import { create } from 'zustand'
import { initialLayers, initialTelemetry } from '../data/demoMission'
import type { ApiMission, ApiPlannedRoute, ApiSimulationState, MapLayerDefinition } from '../types/mission'
import type { ScienceTarget } from '../types/mission'

interface MissionState {
  missionConfig: MissionConfig
  travelMode: 'walk' | 'rover' | 'air'
  routeProfile: 'safe' | 'fast'
  colorMode: 'dark' | 'light' | 'system'
  textSize: 'compact' | 'default' | 'large'
  sidebarCollapsed: boolean
  selectedScienceId: string
  customDestination: ScienceTarget | null
  routeOrigin: ScienceTarget
  selectedCoordinate: string
  layers: MapLayerDefinition[]
  telemetryElapsedSeconds: number
  simulationRunning: boolean
  selectedRouteId: string
  routeGenerated: boolean
  currentMission: ApiMission | null
  backendRoutes: ApiPlannedRoute[]
  savedRouteId: string | null
  simulation: ApiSimulationState | null
  toggleSidebar: () => void
  selectScience: (id: string) => void
  setCustomDestination: (target: ScienceTarget) => void
  setRouteOrigin: (target: ScienceTarget) => void
  setCoordinate: (coordinate: string) => void
  toggleLayer: (id: string) => void
  setSimulationRunning: (running: boolean) => void
  resetSimulation: () => void
  tickSimulation: () => void
  selectRoute: (id: string) => void
  generateRoute: () => void
  setColorMode: (mode: 'dark' | 'light' | 'system') => void
  setTextSize: (size: 'compact' | 'default' | 'large') => void
  setTravelMode: (mode: 'walk' | 'rover' | 'air') => void
  setRouteProfile: (profile: 'safe' | 'fast') => void
  setCurrentMission: (mission: ApiMission | null) => void
  setBackendRoutes: (routes: ApiPlannedRoute[]) => void
  setSavedRouteId: (id: string | null) => void
  setSimulation: (simulation: ApiSimulationState | null) => void
  updateMissionConfig: (updates: Partial<MissionConfig>) => void
}

export interface MissionConfig {
  missionTitle: string
  scienceObjective: string
  successCriteria: string
  crewOneName: string
  crewOneRole: string
  crewTwoName: string
  crewTwoRole: string
}

const defaultMissionConfig: MissionConfig = {
  missionTitle: 'Jezero Delta Sediment Expedition',
  scienceObjective: "Reconstruct Jezero's ancient river-to-lake environment",
  successCriteria: 'Context imagery and two paired samples returned with complete custody records',
  crewOneName: 'R. Chen',
  crewOneRole: 'Science lead and sample acquisition',
  crewTwoName: 'A. Okafor',
  crewTwoRole: 'Navigation, imagery, and sample custody',
}

function loadMissionConfig() {
  try { return { ...defaultMissionConfig, ...JSON.parse(localStorage.getItem('mars-nav-mission-config') ?? '{}') } }
  catch { return defaultMissionConfig }
}

export const useMissionStore = create<MissionState>((set) => ({
  missionConfig: loadMissionConfig(),
  travelMode: 'rover',
  routeProfile: 'safe',
  colorMode: 'dark',
  textSize: 'default',
  sidebarCollapsed: false,
  selectedScienceId: localStorage.getItem('mars-nav-primary-target') ?? 'NASA-05',
  customDestination: null,
  routeOrigin: { id: 'habitat', name: 'HAB-01 Habitat', category: 'Mission habitat', localPosition: [0, 0], distanceKm: 0, risk: 'LOW', description: 'Primary mission habitat and default route origin.', objective: 'Depart from habitat', status: 'PLANNED', source: 'MISSION DEMO' },
  selectedCoordinate: 'LOCAL GRID · 0 m E / 0 m N',
  layers: initialLayers,
  telemetryElapsedSeconds: initialTelemetry.elapsedSeconds,
  simulationRunning: false,
  selectedRouteId: 'ROUTE-A',
  routeGenerated: false,
  currentMission: null,
  backendRoutes: [],
  savedRouteId: null,
  simulation: null,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  selectScience: (id) => { localStorage.setItem('mars-nav-primary-target', id); set({ selectedScienceId: id, customDestination: null }) },
  setCustomDestination: (customDestination) => set({ customDestination, selectedScienceId: customDestination.id }),
  setRouteOrigin: (routeOrigin) => set({ routeOrigin }),
  setCoordinate: (coordinate) => set({ selectedCoordinate: coordinate }),
  toggleLayer: (id) => set((state) => ({ layers: state.layers.map((layer) => layer.id === id ? { ...layer, visible: !layer.visible } : layer) })),
  setSimulationRunning: (running) => set({ simulationRunning: running }),
  resetSimulation: () => set({ telemetryElapsedSeconds: initialTelemetry.elapsedSeconds, simulationRunning: false }),
  tickSimulation: () => set((state) => ({ telemetryElapsedSeconds: state.telemetryElapsedSeconds + 1 })),
  selectRoute: (id) => set({ selectedRouteId: id }),
  generateRoute: () => set({ routeGenerated: true }),
  setColorMode: (colorMode) => set({ colorMode }),
  setTextSize: (textSize) => set({ textSize }),
  setTravelMode: (travelMode) => set({ travelMode }),
  setRouteProfile: (routeProfile) => set({ routeProfile }),
  setCurrentMission: (currentMission) => set({ currentMission }),
  setBackendRoutes: (backendRoutes) => set({ backendRoutes }),
  setSavedRouteId: (savedRouteId) => set({ savedRouteId }),
  setSimulation: (simulation) => set({ simulation }),
  updateMissionConfig: (updates) => set((state) => {
    const missionConfig = { ...state.missionConfig, ...updates }
    localStorage.setItem('mars-nav-mission-config', JSON.stringify(missionConfig))
    return { missionConfig }
  }),
}))
