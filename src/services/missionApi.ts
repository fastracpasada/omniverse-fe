import type { ApiHazard, ApiLayer, ApiMission, ApiPage, ApiPlannedRoute, ApiRoutePlanResponse, ApiScienceTarget, ApiSimulationState, ApiSite, LocalPoint } from '../types/mission'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
export class MissionApiError extends Error {
  readonly status: number
  readonly code?: string
  constructor(message: string, status: number, code?: string) { super(message); this.name = 'MissionApiError'; this.status = status; this.code = code }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try { response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } }) }
  catch { throw new MissionApiError(`Cannot reach MARS-NAV API at ${API_BASE_URL}.`, 0, 'network_error') }
  const payload: unknown = (response.headers.get('content-type') ?? '').includes('application/json') ? await response.json() : null
  if (!response.ok) { const body = payload as { detail?: string; error?: { message?: string; code?: string } } | null; throw new MissionApiError(body?.error?.message ?? body?.detail ?? `API request failed (${response.status}).`, response.status, body?.error?.code) }
  return payload as T
}
function query(params: Record<string, string | number | undefined>) { const search = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') search.set(key, String(value)) }); return search.size ? `?${search}` : '' }
export interface MissionCreateRequest { name: string; site_id: string; description?: string; start_location?: LocalPoint; eva_duration_limit_min: number; return_reserve_min: number; science_target_ids: string[]; constraints: { max_slope_deg: number; block_unknown_terrain: boolean; preferred_profile: 'safety_first' | 'shorter_distance' } }
export interface RoutePlanRequest { mission_id?: string; site_id?: string; start?: LocalPoint; profiles: ('shorter_distance' | 'safety_first')[]; return_to_habitat: boolean; eva_duration_limit_min: number; return_reserve_min: number; destinations: Array<{ location?: LocalPoint; science_target_id?: string; label: string; activity_duration_min: number }> }
export const missionApi = {
  baseUrl: API_BASE_URL,
  getHealth: () => request<{ status: string; database: boolean }>('/api/v1/health'),
  getSites: () => request<ApiPage<ApiSite>>('/api/v1/sites?limit=25&offset=0'),
  getLayers: (siteId: string) => request<ApiPage<ApiLayer>>(`/api/v1/layers${query({ site_id: siteId, limit: 100, offset: 0 })}`),
  getLayerPreviewUrl: (id: string) => `${API_BASE_URL}/api/v1/layers/${encodeURIComponent(id)}/preview`,
  getTargets: (siteId: string) => request<ApiPage<ApiScienceTarget>>(`/api/v1/science-targets${query({ site_id: siteId, limit: 100, offset: 0 })}`),
  getHazards: (siteId: string) => request<ApiPage<ApiHazard>>(`/api/v1/hazards${query({ site_id: siteId, limit: 100, offset: 0 })}`),
  getTerrainMetadata: (siteId: string) => request<Record<string, unknown>>(`/api/v1/terrain/metadata${query({ site_id: siteId })}`),
  getTerrainSample: (siteId: string, point: LocalPoint) => request<Record<string, unknown>>(`/api/v1/terrain/sample${query({ site_id: siteId, x_m: point.x_m, y_m: point.y_m })}`),
  createMission: (body: MissionCreateRequest) => request<ApiMission>('/api/v1/missions', { method: 'POST', body: JSON.stringify(body) }),
  planRoutes: (body: RoutePlanRequest) => request<ApiRoutePlanResponse>('/api/v1/routes/plan', { method: 'POST', body: JSON.stringify(body) }),
  saveRoute: (missionId: string, profile: 'shorter_distance' | 'safety_first', duration: number) => request<ApiPlannedRoute>(`/api/v1/missions/${missionId}/routes`, { method: 'POST', body: JSON.stringify({ profile, select: true, eva_duration_limit_min: duration, return_to_habitat: true }) }),
  getMissions: (siteId: string) => request<ApiPage<ApiMission>>(`/api/v1/missions${query({ site_id: siteId, limit: 25, offset: 0 })}`),
  startSimulation: (routeId: string) => request<{ session: ApiSimulationState }>('/api/v1/simulations', { method: 'POST', body: JSON.stringify({ route_id: routeId, resource_model: { version: 'prototype-resources-v1', oxygen_use_pct_per_hour_moving: 12, oxygen_use_pct_per_hour_activity: 15, battery_use_pct_per_hour_moving: 8, battery_use_pct_per_hour_activity: 10, oxygen_warning_pct: 30, battery_warning_pct: 25, risk_warning_threshold: .6, risk_critical_threshold: .85 } }) }),
  getSimulation: (id: string) => request<ApiSimulationState>(`/api/v1/simulations/${id}/state`),
  pauseSimulation: (id: string) => request<ApiSimulationState>(`/api/v1/simulations/${id}/pause`, { method: 'POST' }),
  resumeSimulation: (id: string) => request<ApiSimulationState>(`/api/v1/simulations/${id}/resume`, { method: 'POST' }),
  advanceSimulation: async (id: string, seconds = 300) => (await request<{ session: ApiSimulationState }>(`/api/v1/simulations/${id}/advance`, { method: 'POST', body: JSON.stringify({ advance_by_s: seconds }) })).session,
  resetSimulation: (id: string) => request(`/api/v1/simulations/${id}/reset`, { method: 'POST' }),
}
export function apiTargetToScienceTarget(target: ApiScienceTarget, site: ApiSite): import('../types/mission').ScienceTarget { const position: [number, number] = [target.location.x_m, target.location.y_m]; return { id: target.id, name: target.name, category: target.geological_context ?? 'Backend science target', localPosition: position, coordinates: target.longitude_deg_east != null && target.latitude_deg != null ? [target.longitude_deg_east, target.latitude_deg] : undefined, distanceKm: Math.hypot(position[0] - site.habitat_location.x_m, position[1] - site.habitat_location.y_m) / 1000, risk: 'MODERATE', description: target.description, objective: target.scientific_objective, status: target.verification_status === 'verified' ? 'IN PROGRESS' : 'PLANNED', source: 'MISSION DEMO' } }
