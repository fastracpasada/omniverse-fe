import Projection from 'ol/proj/Projection'
import { addProjection } from 'ol/proj'

export const MARS_LOCAL_CODE = 'MARS:JEZERO:LOCAL'
export const MARS_LOCAL_EXTENT: [number, number, number, number] = [-16000, -12000, 16000, 12000]

export const marsLocalProjection = new Projection({
  code: MARS_LOCAL_CODE,
  units: 'm',
  extent: MARS_LOCAL_EXTENT,
  metersPerUnit: 1,
  worldExtent: [-16000, -12000, 16000, 12000],
})

addProjection(marsLocalProjection)