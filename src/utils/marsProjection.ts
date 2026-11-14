import Projection from 'ol/proj/Projection'
import { addProjection } from 'ol/proj'

export const MARS_GEO_CODE = 'MARS:2000:EQUIRECTANGULAR'
export const MARS_RADIUS_METRES = 3_396_190
export const JEZERO_CENTER: [number, number] = [77.5, 18.4]

export const marsGeoProjection = new Projection({
  code: MARS_GEO_CODE,
  units: 'degrees',
  extent: [-180, -90, 180, 90],
  worldExtent: [-180, -90, 180, 90],
  metersPerUnit: Math.PI * MARS_RADIUS_METRES / 180,
})

addProjection(marsGeoProjection)

export function localMetresToMars([east, north]: [number, number]): [number, number] {
  const latitudeRadians = JEZERO_CENTER[1] * Math.PI / 180
  const longitude = JEZERO_CENTER[0] + (east / (MARS_RADIUS_METRES * Math.cos(latitudeRadians))) * 180 / Math.PI
  const latitude = JEZERO_CENTER[1] + (north / MARS_RADIUS_METRES) * 180 / Math.PI
  return [longitude, latitude]
}

export function marsToLocalMetres([longitude, latitude]: [number, number]): [number, number] {
  const latitudeRadians = JEZERO_CENTER[1] * Math.PI / 180
  const east = (longitude - JEZERO_CENTER[0]) * Math.PI / 180 * MARS_RADIUS_METRES * Math.cos(latitudeRadians)
  const north = (latitude - JEZERO_CENTER[1]) * Math.PI / 180 * MARS_RADIUS_METRES
  return [east, north]
}

const southWest = localMetresToMars([-16_000, -12_000])
const northEast = localMetresToMars([16_000, 12_000])
export const MARS_LOCAL_EXTENT: [number, number, number, number] = [southWest[0], southWest[1], northEast[0], northEast[1]]
