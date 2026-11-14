export interface ScienceTarget {
  id: string
  name: string
  category: string
  localPosition: [number, number]
  distanceKm: number
  risk: 'LOW' | 'MODERATE' | 'ELEVATED'
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
  risk: 'LOW' | 'MODERATE' | 'ELEVATED'
  terrainNote: string
  waypoints: [number, number][]
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