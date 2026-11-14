import { demoMission, missionRoutes, scienceTargets } from '../data/demoMission'
import type { MissionRoute, ScienceTarget } from '../types/mission'

export interface MissionSite {
  id: string
  name: string
  coordinateLabel: string
  dataStatus: 'DEMO'
}

export interface RoutePlanRequest {
  originId: string
  destinationId: string
  strategy: 'SHORTEST' | 'SAFETY FIRST'
  maxDurationHours: number
}

export interface MissionRecord {
  id: string
  name: string
  sol: number
  status: 'SIMULATED'
}

export const missionApi = {
  async getSites(): Promise<MissionSite[]> {
    return [{ id: 'jezero-demo', name: demoMission.site, coordinateLabel: demoMission.coordinates, dataStatus: 'DEMO' }]
  },
  async getLayers() { return (await import('../data/demoMission')).initialLayers },
  async getScienceTargets(): Promise<ScienceTarget[]> { return scienceTargets },
  async planRoute(request: RoutePlanRequest): Promise<MissionRoute[]> {
    void request
    return missionRoutes
  },
  async createMission(): Promise<MissionRecord> {
    return { id: demoMission.id, name: demoMission.name, sol: demoMission.sol, status: 'SIMULATED' }
  },
  async getMission(id: string): Promise<MissionRecord> {
    return { id, name: demoMission.name, sol: demoMission.sol, status: 'SIMULATED' }
  },
  async createSimulation(): Promise<{ id: string; status: 'SIMULATED' }> {
    return { id: 'SIM-EVA-02', status: 'SIMULATED' }
  },
}