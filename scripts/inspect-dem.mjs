import { fromUrl } from 'geotiff'

const url = 'https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif'
const tiff = await fromUrl(url)
const image = await tiff.getImage()
console.log(JSON.stringify({
  width: image.getWidth(),
  height: image.getHeight(),
  bbox: image.getBoundingBox(),
  resolution: image.getResolution(),
  origin: image.getOrigin(),
  samples: image.getSamplesPerPixel(),
  geoKeys: image.getGeoKeys(),
  noData: image.getGDALNoData(),
}, null, 2))
