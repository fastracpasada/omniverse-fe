import type {
  ApiHazard,
  ApiLayer,
  ApiMission,
  ApiPage,
  ApiPlannedRoute,
  ApiRoutePlanResponse,
  ApiScienceTarget,
  ApiSite,
  ApiSimulationState,
  ApiTelemetry,
} from '../types/mission'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

export class MissionApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'MissionApiError'
    this.status = status
    this.code = code
  }
}

export interface MissionCreateRequest {
  name: string
  site_id: string
  description?: string
  eva_duration_limit_min: number
  return_reserve_min: number
  science_target_ids: string[]
  constraints: {
    max_slope_deg: number
    block_unknown_terrain: boolean
    preferred_profile: 'safety_first' | 'shorter_distance'
  }
}

export interface RoutePlanRequest {
  mission_id: string
  profiles: ['shorter_distance', 'safety_first']
  return_to_habitat: true
  eva_duration_limit_min: number
  return_reserve_min: number
  destinations?: (
    | { location: { x_m: number; y_m: number }; label: string; activity_duration_min: number; science_target_id?: never }
    | { science_target_id: string; label: string; activity_duration_min: number; location?: never }
  )[]
}

export interface SaveRouteRequest {
  profile: 'shorter_distance' | 'safety_first'
  select: true
  eva_duration_limit_min: number
  return_to_habitat: true
}

export interface SimulationStartRequest {
  route_id: string
  resource_model: {
    version: string
    oxygen_use_pct_per_hour_moving: number
    oxygen_use_pct_per_hour_activity: number
    battery_use_pct_per_hour_moving: number
    battery_use_pct_per_hour_activity: number
    oxygen_warning_pct: number
    battery_warning_pct: number
    risk_warning_threshold: number
    risk_critical_threshold: number
  }
}

interface ApiErrorBody {
  error?: { code?: string; message?: string }
  detail?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    })
  } catch {
    throw new MissionApiError(`Cannot reach MARS-NAV API at ${API_BASE_URL}. Check the backend and CORS configuration.`, 0, 'network_error')
  }

  const contentType = response.headers.get('content-type') ?? ''
  const payload: unknown = contentType.includes('application/json') ? await response.json() : null
  if (!response.ok) {
    const body = payload as ApiErrorBody | null
    throw new MissionApiError(body?.error?.message ?? body?.detail ?? `API request failed (${response.status}).`, response.status, body?.error?.code)
  }
  return payload as T
}

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value))
  })
  const serialized = search.toString()
  return serialized ? `?${serialized}` : ''
}

export const missionApi = {
  baseUrl: API_BASE_URL,
  getHealth: () => request<{ status: string; database: boolean }>('/api/v1/health'),
  getSites: (limit = 25, offset = 0) => request<ApiPage<ApiSite>>(`/api/v1/sites${query({ limit, offset })}`),
  getSite: (siteId: string) => request<ApiSite>(`/api/v1/sites/${encodeURIComponent(siteId)}`),
  getLayers: (siteId: string, limit = 100, offset = 0) => request<ApiPage<ApiLayer>>(`/api/v1/layers${query({ site_id: siteId, limit, offset })}`),
  getLayer: (layerId: string) => request<ApiLayer>(`/api/v1/layers/${encodeURIComponent(layerId)}`),
  getLayerPreviewUrl: (layerId: string) => `${API_BASE_URL}/api/v1/layers/${encodeURIComponent(layerId)}/preview`,
  getScienceTargets: (siteId: string, limit = 25, offset = 0) => request<ApiPage<ApiScienceTarget>>(`/api/v1/science-targets${query({ site_id: siteId, limit, offset })}`),
  getScienceTarget: (targetId: string) => request<ApiScienceTarget>(`/api/v1/science-targets/${encodeURIComponent(targetId)}`),
  createScienceTarget: (body: { site_id: string; name: string; description: string; scientific_objective: string; location: { x_m: number; y_m: number }; estimated_activity_duration_min: number }) => request<ApiScienceTarget>('/api/v1/science-targets', { method: 'POST', body: JSON.stringify(body) }),
  getHazards: (siteId: string, limit = 100, offset = 0) => request<ApiPage<ApiHazard>>(`/api/v1/hazards${query({ site_id: siteId, limit, offset })}`),
  getTerrainMetadata: (siteId: string) => request<Record<string, unknown>>(`/api/v1/terrain/metadata${query({ site_id: siteId })}`),
  getTerrainSample: (siteId: string, x: number, y: number) => request<Record<string, unknown>>(`/api/v1/terrain/sample${query({ site_id: siteId, x_m: x, y_m: y })}`),
  createMission: (body: MissionCreateRequest) => request<ApiMission>('/api/v1/missions', { method: 'POST', body: JSON.stringify(body) }),
  getMissions: (limit = 25, offset = 0, siteId?: string) => request<ApiPage<ApiMission>>(`/api/v1/missions${query({ limit, offset, site_id: siteId })}`),
  getMission: (missionId: string) => request<ApiMission>(`/api/v1/missions/${encodeURIComponent(missionId)}`),
  updateMission: (missionId: string, body: { description?: string; status?: string }) => request<ApiMission>(`/api/v1/missions/${encodeURIComponent(missionId)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteMission: (missionId: string) => request<void>(`/api/v1/missions/${encodeURIComponent(missionId)}`, { method: 'DELETE' }),
  planRoutes: (body: RoutePlanRequest) => request<ApiRoutePlanResponse>('/api/v1/routes/plan', { method: 'POST', body: JSON.stringify(body) }),
  saveMissionRoute: (missionId: string, body: SaveRouteRequest) => request<ApiPlannedRoute>(`/api/v1/missions/${encodeURIComponent(missionId)}/routes`, { method: 'POST', body: JSON.stringify(body) }),
  getMissionRoutes: (missionId: string, limit = 25, offset = 0) => request<ApiPage<ApiPlannedRoute>>(`/api/v1/missions/${encodeURIComponent(missionId)}/routes${query({ limit, offset })}`),
  getRoute: (routeId: string) => request<ApiPlannedRoute>(`/api/v1/routes/${encodeURIComponent(routeId)}`),
  createObservation: (body: { site_id: string; target_id: string; mission_id: string; observation_type: string; title: string; notes: string; measurements: Record<string, unknown> }) => request<Record<string, unknown>>('/api/v1/observations', { method: 'POST', body: JSON.stringify(body) }),
  getObservations: (siteId: string, limit = 25, offset = 0) => request<ApiPage<Record<string, unknown>>>(`/api/v1/observations${query({ site_id: siteId, limit, offset })}`),
  startSimulation: (body: SimulationStartRequest) => request<{ message: string; mission_status: string; session: ApiSimulationState }>('/api/v1/simulations', { method: 'POST', body: JSON.stringify(body) }),
  getSimulation: (simulationId: string) => request<ApiSimulationState>(`/api/v1/simulations/${encodeURIComponent(simulationId)}/state`),
  advanceSimulation: async (simulationId: string, seconds: number) => {
    const response = await request<{ session: ApiSimulationState; telemetry: ApiTelemetry; advanced_by_s: number; completed: boolean }>(`/api/v1/simulations/${encodeURIComponent(simulationId)}/advance`, { method: 'POST', body: JSON.stringify({ advance_by_s: seconds }) })
    return response.session
  },
  pauseSimulation: (simulationId: string) => request<ApiSimulationState>(`/api/v1/simulations/${encodeURIComponent(simulationId)}/pause`, { method: 'POST' }),
  resumeSimulation: (simulationId: string) => request<ApiSimulationState>(`/api/v1/simulations/${encodeURIComponent(simulationId)}/resume`, { method: 'POST' }),
  resetSimulation: (simulationId: string) => request<Record<string, unknown>>(`/api/v1/simulations/${encodeURIComponent(simulationId)}/reset`, { method: 'POST' }),
  getTelemetry: (simulationId: string, limit = 100, offset = 0) => request<ApiPage<ApiTelemetry>>(`/api/v1/simulations/${encodeURIComponent(simulationId)}/telemetry${query({ limit, offset })}`),
}

export function toScienceTarget(target: ApiScienceTarget, site?: ApiSite): import('../types/mission').ScienceTarget {
  const originX = site?.habitat_location.x_m ?? 0
  const originY = site?.habitat_location.y_m ?? 0
  const distanceKm = Math.hypot(target.location.x_m - originX, target.location.y_m - originY) / 1000
  return {
    id: target.id,
    name: target.name,
    category: target.geological_context ?? 'Proposed observation point',
    localPosition: [target.location.x_m, target.location.y_m],
    distanceKm,
    risk: 'UNKNOWN',
    description: target.description,
    objective: target.scientific_objective,
    status: target.verification_status === 'verified' ? 'IN PROGRESS' : 'PLANNED',
  }
}

export function toMissionRoute(route: ApiPlannedRoute): import('../types/mission').MissionRoute {
  return {
    id: route.id ?? route.profile,
    name: route.profile === 'safety_first' ? 'Safety-first route' : 'Shorter-distance route',
    strategy: route.profile === 'safety_first' ? 'SAFETY FIRST' : 'SHORTEST',
    distanceKm: route.metrics.distance_m / 1000,
    durationHours: route.metrics.total_time_s / 3600,
    risk: 'UNKNOWN',
    terrainNote: `Peak prototype risk score ${route.metrics.peak_risk.toFixed(2)} · mean slope ${route.metrics.mean_slope_deg.toFixed(1)}° · ${route.warnings.join(' ') || `${route.data_origin} route geometry; not a safety certification.`}`,
    waypoints: route.geometry.coordinates,
  }
}