import dem from '../data/jezeroDem.json'

export type SurfaceMode = 'walk' | 'rover'
export type RouteProfile = 'safe' | 'fast'
export type TerrainPoint = [number, number]
type Point = TerrainPoint

export interface TerrainRouteResult {
  status: 'ok' | 'no_route' | 'outside_coverage'
  points: Point[]
  distanceM: number
  elevationGainM: number
  maximumSlopeDeg: number
  averageSlopeDeg: number
  reason?: string
}

const { width, height, extent, elevations } = dem
const [minX, minY, maxX, maxY] = extent
const stepX = (maxX - minX) / (width - 1)
const stepY = (maxY - minY) / (height - 1)
const hazard: Point[] = [[1700, 3500], [3600, 4400], [5000, 3000], [4100, 1700], [2400, 1900]]

function pointInPolygon([x, y]: Point) {
  let inside = false
  for (let i = 0, j = hazard.length - 1; i < hazard.length; j = i++) {
    const [xi, yi] = hazard[i]
    const [xj, yj] = hazard[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function gridPoint(index: number): Point {
  const col = index % width
  const row = Math.floor(index / width)
  return [minX + col * stepX, maxY - row * stepY]
}

function gridIndex([x, y]: Point) {
  const col = Math.max(0, Math.min(width - 1, Math.round((x - minX) / stepX)))
  const row = Math.max(0, Math.min(height - 1, Math.round((maxY - y) / stepY)))
  return row * width + col
}

export function isWithinTerrainCoverage([x, y]: Point) { return x >= minX && x <= maxX && y >= minY && y <= maxY }

export function inspectTerrain(point: Point) {
  if (!isWithinTerrainCoverage(point)) return null
  const index = gridIndex(point)
  const elevationM = elevations[index]
  if (elevationM == null) return null
  const row = Math.floor(index / width)
  const col = index % width
  let maximumSlopeDeg = 0
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nc = col + dx; const nr = row + dy
    if (nc < 0 || nr < 0 || nc >= width || nr >= height) continue
    const neighbor = elevations[nr * width + nc]
    if (neighbor == null) continue
    maximumSlopeDeg = Math.max(maximumSlopeDeg, Math.atan2(Math.abs(neighbor - elevationM), Math.hypot(dx * stepX, dy * stepY)) * 180 / Math.PI)
  }
  return { elevationM, slopeDeg: maximumSlopeDeg, classification: maximumSlopeDeg <= 5 ? 'LOW' : maximumSlopeDeg <= 10 ? 'MODERATE' : maximumSlopeDeg <= 15 ? 'HIGH' : 'EXCLUDED' }
}

class MinHeap {
  values: Array<[number, number]> = []
  push(item: [number, number]) { this.values.push(item); let i = this.values.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.values[p][0] <= item[0]) break; this.values[i] = this.values[p]; i = p } this.values[i] = item }
  pop() { if (!this.values.length) return undefined; const root = this.values[0]; const last = this.values.pop()!; if (this.values.length) { let i = 0; while (true) { let child = i * 2 + 1; if (child >= this.values.length) break; if (child + 1 < this.values.length && this.values[child + 1][0] < this.values[child][0]) child++; if (this.values[child][0] >= last[0]) break; this.values[i] = this.values[child]; i = child } this.values[i] = last } return root }
}

export function planTerrainRoute(origin: Point, destination: Point, mode: SurfaceMode, profile: RouteProfile): TerrainRouteResult {
  if (!isWithinTerrainCoverage(origin) || !isWithinTerrainCoverage(destination)) return emptyResult('outside_coverage', 'One or both endpoints are outside the processed DEM coverage.')
  const start = gridIndex(origin)
  const goal = gridIndex(destination)
  if (start === goal) return { status: 'ok', points: [origin, destination], distanceM: Math.hypot(destination[0] - origin[0], destination[1] - origin[1]), elevationGainM: 0, maximumSlopeDeg: 0, averageSlopeDeg: 0 }
  if (elevations[start] == null || elevations[goal] == null) return emptyResult('no_route', 'An endpoint is located on terrain with no elevation data.')
  const costs = new Float64Array(width * height).fill(Infinity)
  const previous = new Int32Array(width * height).fill(-1)
  const queue = new MinHeap()
  costs[start] = 0
  queue.push([0, start])
  const maxSlope = mode === 'walk' ? 24 : 16
  const slopeWeight = profile === 'fast' ? .2 : mode === 'walk' ? 3.2 : 7
  const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]

  while (queue.values.length) {
    const current = queue.pop()!
    const index = current[1]
    if (index === goal) break
    const row = Math.floor(index / width)
    const col = index % width
    for (const [dx, dy] of directions) {
      const nc = col + dx
      const nr = row + dy
      if (nc < 0 || nr < 0 || nc >= width || nr >= height) continue
      const next = nr * width + nc
      const distance = Math.hypot(dx * stepX, dy * stepY)
      if (elevations[next] == null || elevations[index] == null) continue
      const elevationDelta = Math.abs(elevations[next] - elevations[index])
      const slope = Math.atan2(elevationDelta, distance) * 180 / Math.PI
      const point = gridPoint(next)
      if (slope > maxSlope || pointInPolygon(point)) continue
      const hazardBuffer = profile === 'fast' ? 1 : Math.hypot(point[0] - 3350, point[1] - 3000) < (mode === 'rover' ? 2600 : 1900) ? 2.5 : 1
      const moveCost = distance * (1 + (slope / maxSlope) ** 2 * slopeWeight) * hazardBuffer
      const nextCost = costs[index] + moveCost
      if (nextCost >= costs[next]) continue
      costs[next] = nextCost
      previous[next] = index
      const heuristic = Math.hypot(point[0] - destination[0], point[1] - destination[1])
      queue.push([nextCost + heuristic, next])
    }
  }

  if (previous[goal] < 0) return emptyResult('no_route', `No ${mode} route satisfies the slope and hazard constraints.`)
  const path: Point[] = [destination]
  for (let index = goal; index !== start;) { index = previous[index]; path.push(gridPoint(index)) }
  path.reverse()
  path[0] = origin
  return routeMetrics(simplify(path, 80), path)
}

export function terrainRoute(origin: Point, destination: Point, mode: SurfaceMode, profile: RouteProfile = 'safe'): Point[] { return planTerrainRoute(origin, destination, mode, profile).points }

function emptyResult(status: 'no_route' | 'outside_coverage', reason: string): TerrainRouteResult { return { status, points: [], distanceM: 0, elevationGainM: 0, maximumSlopeDeg: 0, averageSlopeDeg: 0, reason } }

function routeMetrics(points: Point[], sampledPoints: Point[] = points): TerrainRouteResult {
  let distanceM = 0; let elevationGainM = 0; let maximumSlopeDeg = 0; let slopeTotal = 0
  for (let i = 1; i < sampledPoints.length; i++) {
    const distance = Math.hypot(sampledPoints[i][0] - sampledPoints[i - 1][0], sampledPoints[i][1] - sampledPoints[i - 1][1])
    const fromElevation = inspectTerrain(sampledPoints[i - 1])?.elevationM ?? 0
    const toElevation = inspectTerrain(sampledPoints[i])?.elevationM ?? fromElevation
    const delta = toElevation - fromElevation
    const slope = Math.atan2(Math.abs(delta), Math.max(1, distance)) * 180 / Math.PI
    distanceM += distance; elevationGainM += Math.max(0, delta); maximumSlopeDeg = Math.max(maximumSlopeDeg, slope); slopeTotal += slope
  }
  return { status: 'ok', points, distanceM, elevationGainM, maximumSlopeDeg, averageSlopeDeg: sampledPoints.length > 1 ? slopeTotal / (sampledPoints.length - 1) : 0 }
}

function simplify(points: Point[], tolerance: number) {
  if (points.length < 3) return points
  const result = [points[0]]
  let anchor = points[0]
  for (let i = 1; i < points.length - 1; i++) {
    const previousAngle = Math.atan2(points[i][1] - anchor[1], points[i][0] - anchor[0])
    const nextAngle = Math.atan2(points[i + 1][1] - points[i][1], points[i + 1][0] - points[i][0])
    if (Math.abs(previousAngle - nextAngle) > .12 || Math.hypot(points[i][0] - anchor[0], points[i][1] - anchor[1]) > tolerance * 8) { result.push(points[i]); anchor = points[i] }
  }
  result.push(points.at(-1)!)
  return result
}

export const terrainDataLabel = dem.sourceLabel
