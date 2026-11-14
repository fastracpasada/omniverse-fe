import type { ApiSite, ScienceTarget } from '../types/mission'

function locationKey(target: ScienceTarget) {
  return target.name.toLowerCase().replace(/\b(target|site|location)\b/g, '').replace(/[^a-z0-9]/g, '')
}

export function mergeMissionTargets(backend: ScienceTarget[], denzLocations: ScienceTarget[]) {
  const merged = [...backend]
  const keys = new Set(backend.map(locationKey))
  for (const location of denzLocations) {
    const key = locationKey(location)
    if (!keys.has(key)) { merged.push(location); keys.add(key) }
  }
  return merged
}

export function isInsideBackendCoverage(target: ScienceTarget, site?: ApiSite) {
  if (!site) return false
  return Math.abs(target.localPosition[0]) <= site.width_m / 2 && Math.abs(target.localPosition[1]) <= site.height_m / 2
}
