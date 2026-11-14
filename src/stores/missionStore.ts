import { create } from 'zustand'
import { initialLayers, initialTelemetry } from '../data/demoMission'
import type { MapLayerDefinition } from '../types/mission'

interface MissionState {
  sidebarCollapsed: boolean
  selectedScienceId: string
  selectedCoordinate: string
  layers: MapLayerDefinition[]
  telemetryElapsedSeconds: number
  simulationRunning: boolean
  selectedRouteId: string
  routeGenerated: boolean
  toggleSidebar: () => void
  selectScience: (id: string) => void
  setCoordinate: (coordinate: string) => void
  toggleLayer: (id: string) => void
  setSimulationRunning: (running: boolean) => void
  resetSimulation: () => void
  tickSimulation: () => void
  selectRoute: (id: string) => void
  generateRoute: () => void
}

export const useMissionStore = create<MissionState>((set) => ({
  sidebarCollapsed: false,
  selectedScienceId: 'ST-01',
  selectedCoordinate: 'LOCAL GRID · 0 m E / 0 m N',
  layers: initialLayers,
  telemetryElapsedSeconds: initialTelemetry.elapsedSeconds,
  simulationRunning: false,
  selectedRouteId: 'ROUTE-A',
  routeGenerated: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  selectScience: (id) => set({ selectedScienceId: id }),
  setCoordinate: (coordinate) => set({ selectedCoordinate: coordinate }),
  toggleLayer: (id) => set((state) => ({ layers: state.layers.map((layer) => layer.id === id ? { ...layer, visible: !layer.visible } : layer) })),
  setSimulationRunning: (running) => set({ simulationRunning: running }),
  resetSimulation: () => set({ telemetryElapsedSeconds: initialTelemetry.elapsedSeconds, simulationRunning: false }),
  tickSimulation: () => set((state) => ({ telemetryElapsedSeconds: state.telemetryElapsedSeconds + 1 })),
  selectRoute: (id) => set({ selectedRouteId: id }),
  generateRoute: () => set({ routeGenerated: true }),
}))