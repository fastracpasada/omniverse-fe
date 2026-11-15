export const SAFETY_LIMITS = {
  surfaceMaxSlopeDeg: 15,
  walkingMaxDistanceKm: 2,
  routeDistance: { lowMaxKm: 2, mediumMaxKm: 8 },
  wind: { lowMaxMs: 5, mediumMaxMs: 10 },
  returnReserve: { highRiskBelowMin: 60, mediumRiskBelowMin: 90 },
  evaLimitMinutes: 360,
} as const

export function distanceRisk(distanceKm: number) {
  if (distanceKm <= SAFETY_LIMITS.routeDistance.lowMaxKm) return 'LOW' as const
  if (distanceKm <= SAFETY_LIMITS.routeDistance.mediumMaxKm) return 'MODERATE' as const
  return 'ELEVATED' as const
}

export function slopeRisk(slopeDeg: number) {
  if (slopeDeg <= 5) return 'LOW' as const
  if (slopeDeg <= 10) return 'MODERATE' as const
  if (slopeDeg <= SAFETY_LIMITS.surfaceMaxSlopeDeg) return 'ELEVATED' as const
  return 'EXCLUDED' as const
}
