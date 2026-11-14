import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { initialLayers, initialTelemetry } from '../data/demoMission'
import type { ApiMission, ApiSimulationState, MapLayerDefinition, MissionRoute } from '../types/mission'

interface MissionState {
  sidebarCollapsed: boolean
  selectedScienceId: string
  selectedCoordinate: string
  layers: MapLayerDefinition[]
  telemetryElapsedSeconds: number
  simulationRunning: boolean
  selectedRouteId: string
  routeGenerated: boolean
  currentMission: ApiMission | null
  savedRouteId: string | null
  simulation: ApiSimulationState | null
  toggleSidebar: () => void
  selectScience: (id: string) => void
  setCoordinate: (coordinate: string) => void
  toggleLayer: (id: string) => void
  setSimulationRunning: (running: boolean) => void
  resetSimulation: () => void
  tickSimulation: () => void
  selectRoute: (id: string) => void
  generateRoute: () => void
  setCurrentMission: (mission: ApiMission | null) => void
  setSavedRouteId: (routeId: string | null) => void
  setSimulation: (simulation: ApiSimulationState | null) => void
  updateSimulation: (simulation: ApiSimulationState) => void
  plannedRoutes: MissionRoute[]
  setPlannedRoutes: (routes: MissionRoute[]) => void
}

export const useMissionStore = create<MissionState>()(persist((set) => ({
  sidebarCollapsed: false,
  selectedScienceId: 'ST-01',
  selectedCoordinate: 'LOCAL GRID · 0 m E / 0 m N',
  layers: initialLayers,
  telemetryElapsedSeconds: initialTelemetry.elapsedSeconds,
  simulationRunning: false,
  selectedRouteId: 'ROUTE-A',
  routeGenerated: false,
  currentMission: null,
  savedRouteId: null,
  simulation: null,
  plannedRoutes: [],
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  selectScience: (id) => set({ selectedScienceId: id }),
  setCoordinate: (coordinate) => set({ selectedCoordinate: coordinate }),
  toggleLayer: (id) => set((state) => ({ layers: state.layers.map((layer) => layer.id === id ? { ...layer, visible: !layer.visible } : layer) })),
  setSimulationRunning: (running) => set({ simulationRunning: running }),
  resetSimulation: () => set({ telemetryElapsedSeconds: initialTelemetry.elapsedSeconds, simulationRunning: false }),
  tickSimulation: () => set((state) => ({ telemetryElapsedSeconds: state.telemetryElapsedSeconds + 1 })),
  selectRoute: (id) => set({ selectedRouteId: id }),
  generateRoute: () => set({ routeGenerated: true }),
  setCurrentMission: (currentMission) => set({ currentMission }),
  setSavedRouteId: (savedRouteId) => set({ savedRouteId }),
  setSimulation: (simulation) => set({ simulation, simulationRunning: simulation?.status.toLowerCase() === 'running' }),
  updateSimulation: (simulation) => set({ simulation, telemetryElapsedSeconds: simulation.sim_elapsed_s, simulationRunning: simulation.status.toLowerCase() === 'running' }),
  setPlannedRoutes: (plannedRoutes) => set({ plannedRoutes }),
}), {
  name: 'mars-nav-workflow',
  partialize: (state) => ({
    selectedScienceId: state.selectedScienceId,
    layers: state.layers,
    selectedRouteId: state.selectedRouteId,
    routeGenerated: state.routeGenerated,
    currentMission: state.currentMission,
    savedRouteId: state.savedRouteId,
    simulation: state.simulation,
    plannedRoutes: state.plannedRoutes,
    telemetryElapsedSeconds: state.telemetryElapsedSeconds,
    simulationRunning: state.simulationRunning,
  }),
}))