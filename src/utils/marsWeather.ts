import dem from '../data/jezeroDem.json'
import { localMetresToMars } from './marsProjection'

export interface MarsWeatherEstimate {
  temperatureC: number
  pressurePa: number
  windMs: number
  visibilityKm: number
  dustOpacity: number
  uvRisk: 'HIGH' | 'EXTREME'
  elevationM: number
  latitude: number
  longitude: number
  warnings: string[]
}

const [minX, minY, maxX, maxY] = dem.extent

function elevationAt([x, y]: [number, number]) {
  const column = Math.max(0, Math.min(dem.width - 1, Math.round((x - minX) / (maxX - minX) * (dem.width - 1))))
  const row = Math.max(0, Math.min(dem.height - 1, Math.round((maxY - y) / (maxY - minY) * (dem.height - 1))))
  return dem.elevations[row * dem.width + column] ?? -2500
}

export function estimateMarsWeather(position: [number, number], mode: 'walk' | 'rover' | 'air'): MarsWeatherEstimate {
  const [longitude, latitude] = localMetresToMars(position)
  const elevationM = elevationAt(position)
  const phase = position[0] / 4200 + position[1] / 5700
  const temperatureC = Math.round(-42 - Math.max(0, elevationM + 2400) * .006 + Math.sin(phase) * 5)
  const pressurePa = Math.round(735 * Math.exp(-(elevationM + 2500) / 10_800))
  const windMs = Math.max(1, Math.round((5.5 + Math.abs(Math.sin(phase * 1.7)) * 8) * 10) / 10)
  const dustOpacity = Math.round((.38 + Math.abs(Math.cos(phase * .7)) * .32) * 100) / 100
  const visibilityKm = Math.max(4, Math.round((28 - dustOpacity * 22 - windMs * .35) * 10) / 10)
  const warnings: string[] = []
  if (temperatureC < -55) warnings.push('Severe cold exposure')
  if (windMs >= 10) warnings.push(mode === 'air' ? 'Scout-flight wind caution' : 'Elevated blowing-dust risk')
  if (visibilityKm < 12) warnings.push('Reduced visual navigation range')
  if (mode === 'walk') warnings.push('Extreme UV and radiation exposure')
  return { temperatureC, pressurePa, windMs, visibilityKm, dustOpacity, uvRisk: 'EXTREME', elevationM, latitude, longitude, warnings }
}

export const weatherMethod = 'Location estimate · USGS DEM + Mars climate planning assumptions'
export const observationContext = 'Compare with delayed Perseverance MEDA observations from NASA PDS'
