export interface ScienceTarget {
  id: string
  name: string
  category: string
  localPosition: [number, number]
  distanceKm: number
  risk: 'LOW' | 'MODERATE' | 'ELEVATED' | 'UNKNOWN'
  description: string
  objective: string
  status: 'PLANNED' | 'IN PROGRESS' | 'COMPLETE'
}

export interface MissionRoute {
  id: string
  name: string
  strategy: 'SHORTEST' | 'SAFETY FIRST'
  distanceKm: number
  durationHours: number
  risk: 'LOW' | 'MODERATE' | 'ELEVATED' | 'UNKNOWN'
  terrainNote: string
  waypoints: [number, number][]
}

export interface ApiPage<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface ApiSite {
  id: string
  slug: string
  name: string
  body: string
  description: string
  center_longitude_deg_east: number
  center_latitude_deg: number
  local_crs_name: string
  local_frame_description: string
  width_m: number
  height_m: number
  habitat_location: { x_m: number; y_m: number }
  data_origin: string
  is_demo: boolean
}

export interface ApiLayer {
  id: string
  site_id: string
  name: string
  slug: string
  layer_type: string
  data_origin: string
  processing_status: string
  dataset_version: string | null
  is_demo: boolean
  spatial_resolution_m: number | null
  units: string | null
  source_name: string | null
  description: string | null
}

export interface ApiScienceTarget {
  id: string
  site_id: string
  name: string
  description: string
  scientific_objective: string
  location: { x_m: number; y_m: number }
  estimated_activity_duration_min: number
  creation_source: string
  verification_status: string
  geological_context: string | null
  longitude_deg_east: number | null
  latitude_deg: number | null
}

export interface ApiHazard {
  id: string
  site_id: string
  name: string
  description: string
  zone_type: string
  risk_score: number
  is_blocking: boolean
  data_origin: string
  geometry: { coordinate_system: string; exterior: [number, number][] }
}

export interface ApiMission {
  id: string
  name: string
  description: string | null
  site_id: string
  status: string
  is_demo: boolean
  eva_duration_limit_min: number
  return_reserve_min: number
  science_targets: ApiScienceTarget[]
  start_location: { x_m: number; y_m: number } | null
  created_at: string
  updated_at: string
}

export type ApiRouteProfile = 'shorter_distance' | 'safety_first'

export interface ApiPlannedRoute {
  id: string | null
  mission_id: string | null
  profile: ApiRouteProfile
  status: string
  is_selected: boolean
  data_origin: string
  metrics: {
    distance_m: number
    total_time_s: number
    travel_time_s: number
    peak_risk: number
    mean_slope_deg: number
    max_slope_deg: number
  }
  geometry: {
    coordinate_system: string
    coordinates: [number, number][]
    point_count: number
  }
  warnings: string[]
}

export interface ApiRoutePlanResponse {
  mission_id: string | null
  site_id: string
  routes: ApiPlannedRoute[]
  warnings: string[]
  notes: string[]
}

export interface ApiSimulationState {
  id: string
  mission_id: string
  route_id: string
  status: string
  data_origin: string
  sim_elapsed_s: number
  oxygen_remaining_pct: number
  battery_remaining_pct: number
  distance_along_route_m: number
  total_route_distance_m: number
  estimated_return_time_s: number | null
  position: { x_m: number; y_m: number } | null
  risk_level: string
  current_risk_score: number
  warnings: string[]
  telemetry_count: number
}

export interface ApiTelemetry {
  id: string
  session_id: string
  sim_time_s: number
  oxygen_remaining_pct: number
  battery_remaining_pct: number
  distance_along_route_m: number
  estimated_return_time_s: number | null
  position: { x_m: number; y_m: number } | null
  risk_level: string
  warnings: string[]
}

export interface MissionTelemetry {
  oxygenPercent: number
  batteryPercent: number
  elapsedSeconds: number
  distanceKm: number
  estimatedReturn: string
  terrainRisk: 'LOW' | 'MODERATE' | 'ELEVATED'
}

export interface MapLayerDefinition {
  id: string
  name: string
  status: 'DEMO' | 'PLACEHOLDER' | 'AVAILABLE'
  visible: boolean
}