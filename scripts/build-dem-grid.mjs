import { fromFile, fromUrl } from 'geotiff'
import { writeFile } from 'node:fs/promises'

const url = 'https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif'
const radius = 3_396_190
const standardParallel = 18.4663 * Math.PI / 180
const center = [77.5, 18.4]
const localExtent = [-16_000, -12_000, 16_000, 12_000]
const width = 129
const height = 97
const projectedCenter = [radius * center[0] * Math.PI / 180 * Math.cos(standardParallel), radius * center[1] * Math.PI / 180]

const sourceFile = process.argv[2]
const tiff = sourceFile ? await fromFile(sourceFile) : await fromUrl(url)
const image = await tiff.getImage()
const [originX, originY] = image.getOrigin()
const [pixelX, pixelY] = image.getResolution()
const x0 = Math.floor((projectedCenter[0] + localExtent[0] - originX) / pixelX)
const x1 = Math.ceil((projectedCenter[0] + localExtent[2] - originX) / pixelX)
const y0 = Math.floor((projectedCenter[1] + localExtent[3] - originY) / pixelY)
const y1 = Math.ceil((projectedCenter[1] + localExtent[1] - originY) / pixelY)
const raster = await image.readRasters({ window: [x0, y0, x1, y1], width, height, interleave: true })
const elevations = Array.from(raster, (value) => Number.isFinite(value) && value > -1e20 ? Math.round(value) : null)
const payload = { source: url, sourceLabel: 'USGS Mars 2020 Jezero CTX DEM · 20 m source', generatedGrid: `${width} × ${height}`, width, height, extent: localExtent, cellSizeMetres: [250, 250], elevations }
await writeFile(new URL('../src/data/jezeroDem.json', import.meta.url), `${JSON.stringify(payload)}\n`)
console.log(`Wrote ${width} × ${height} routing grid from pixels ${x0},${y0} to ${x1},${y1}`)
