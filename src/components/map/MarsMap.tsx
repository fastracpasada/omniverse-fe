import { useEffect, useMemo, useRef, useState } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import Polygon from 'ol/geom/Polygon'
import LineString from 'ol/geom/LineString'
import VectorLayer from 'ol/layer/Vector'
import TileLayer from 'ol/layer/Tile'
import ImageLayer from 'ol/layer/Image'
import VectorSource from 'ol/source/Vector'
import WMTS from 'ol/source/WMTS'
import ImageStatic from 'ol/source/ImageStatic'
import WMTSTileGrid from 'ol/tilegrid/WMTS'
import ScaleLine from 'ol/control/ScaleLine'
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style'
import { Expand, LocateFixed, Map as MapIconLucide, Satellite } from 'lucide-react'
import { demoMission, scienceTargets } from '../../data/demoMission'
import { useMissionStore } from '../../stores/missionStore'
import { JEZERO_CENTER, MARS_LOCAL_EXTENT, localMetresToMars, marsGeoProjection, marsToLocalMetres } from '../../utils/marsProjection'
import type { ScienceTarget } from '../../types/mission'
import { inspectTerrain, terrainDataLabel, terrainRoute } from '../../utils/terrainRouting'
import type { RouteProfile } from '../../utils/terrainRouting'
import dem from '../../data/jezeroDem.json'
import { useMissionData } from '../../hooks/useMissionData'
import { apiTargetToScienceTarget, missionApi } from '../../services/missionApi'
import type { ApiHazard } from '../../types/mission'
import { mergeMissionTargets } from '../../utils/missionLocations'

interface MarsMapProps { large?: boolean; showLegend?: boolean }

const MARS_TILE_MATRIX_IDS = Array.from({ length: 13 }, (_, index) => String(index))
const MARS_TILE_RESOLUTIONS = MARS_TILE_MATRIX_IDS.map((_, zoom) => 360 / (512 * 2 ** zoom))

function makeRealisticLayer() {
  return new TileLayer({
    source: new WMTS({
      url: 'https://trek.nasa.gov/tiles/Mars/EQ/Jezero_CTX_BlockAdj_dd/1.0.0/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
      layer: 'Jezero_CTX_BlockAdj_dd',
      matrixSet: 'default028mm',
      style: 'default',
      format: 'image/png',
      requestEncoding: 'REST',
      projection: marsGeoProjection,
      tileGrid: new WMTSTileGrid({ origin: [-180, 90], resolutions: MARS_TILE_RESOLUTIONS, matrixIds: MARS_TILE_MATRIX_IDS, tileSize: 256 }),
      wrapX: false,
    }),
  })
}

function makeDemLayer(kind: 'elevation' | 'slope') {
  const canvas = document.createElement('canvas')
  canvas.width = dem.width; canvas.height = dem.height
  const context = canvas.getContext('2d')!
  const image = context.createImageData(dem.width, dem.height)
  for (let row = 0; row < dem.height; row++) for (let col = 0; col < dem.width; col++) {
    const index = row * dem.width + col
    const value = dem.elevations[index]
    const offset = index * 4
    if (value == null) { image.data[offset + 3] = 0; continue }
    if (kind === 'elevation') {
      const normalized = Math.max(0, Math.min(1, (value + 2700) / 900))
      image.data[offset] = Math.round(35 + normalized * 210); image.data[offset + 1] = Math.round(65 + normalized * 100); image.data[offset + 2] = Math.round(150 - normalized * 115)
    } else {
      const right = dem.elevations[row * dem.width + Math.min(dem.width - 1, col + 1)] ?? value
      const down = dem.elevations[Math.min(dem.height - 1, row + 1) * dem.width + col] ?? value
      const slope = Math.atan(Math.hypot(right - value, down - value) / 250) * 180 / Math.PI
      const normalized = Math.max(0, Math.min(1, slope / 18))
      image.data[offset] = Math.round(40 + normalized * 215); image.data[offset + 1] = Math.round(190 - normalized * 145); image.data[offset + 2] = Math.round(95 - normalized * 55)
    }
    image.data[offset + 3] = 165
  }
  context.putImageData(image, 0, 0)
  return new ImageLayer({ visible: false, opacity: .72, source: new ImageStatic({ url: canvas.toDataURL('image/png'), imageExtent: MARS_LOCAL_EXTENT, projection: marsGeoProjection, interpolate: true }) })
}

function makeTerrainLayer() {
  const features: Feature[] = []
  const lines = [
    [[-14500, 6900], [-10600, 6300], [-7200, 6600], [-3400, 6000], [1000, 6500], [5200, 5900], [9600, 6200], [14200, 5600]],
    [[-14200, 5200], [-10000, 4700], [-5900, 5100], [-1600, 4400], [2600, 4800], [6900, 4100], [11100, 4500], [14500, 3900]],
    [[-14500, 1800], [-10800, 2300], [-7000, 1600], [-3200, 2100], [800, 1300], [4800, 2000], [9000, 1500], [14100, 1900]],
    [[-14400, -1500], [-10400, -900], [-6600, -1700], [-2200, -1100], [1700, -2000], [5800, -1200], [9900, -1850], [14300, -1200]],
    [[-14200, -5000], [-10300, -4400], [-6200, -5300], [-2200, -4600], [1900, -5500], [6100, -4700], [10300, -5400], [14200, -4800]],
    [[-13500, -8200], [-9300, -7700], [-5100, -8500], [-900, -7900], [3300, -8700], [7600, -7800], [11800, -8500]],
  ]
  lines.forEach((coordinates) => {
    const feature = new Feature(new LineString(coordinates.map((coordinate) => localMetresToMars(coordinate as [number, number]))))
    feature.set('kind', 'contour')
    features.push(feature)
  })
  const basinCoordinates: [number, number][] = [[-12000, 3000], [-10300, 5300], [-7200, 5000], [-5200, 2800], [-6000, 900], [-9300, 700], [-11500, 1700], [-12000, 3000]]
  const basin = new Feature(new Polygon([basinCoordinates.map(localMetresToMars)]))
  basin.set('kind', 'terrain')
  features.push(basin)
  return new VectorLayer({
    source: new VectorSource({ features }),
    style: (feature) => feature.get('kind') === 'terrain'
      ? new Style({ fill: new Fill({ color: 'rgba(190, 133, 87, .21)' }), stroke: new Stroke({ color: 'rgba(232, 183, 132, .48)', width: 1 }) })
      : new Style({ stroke: new Stroke({ color: 'rgba(229, 188, 145, .34)', width: 1 }) }),
  })
}

function makeHazardLayer(apiHazards: ApiHazard[]) {
  if (apiHazards.length) {
    const features = apiHazards.map((item) => { const feature = new Feature(new Polygon([item.geometry.exterior.map(localMetresToMars)])); feature.setProperties({ kind: 'hazard', name: item.name, risk: item.risk_score }); return feature })
    return new VectorLayer({ source: new VectorSource({ features }), style: new Style({ fill: new Fill({ color: 'rgba(216,115,107,.22)' }), stroke: new Stroke({ color: '#D8736B', width: 1.5, lineDash: [6, 5] }) }) })
  }
  const hazardCoordinates: [number, number][] = [[1700, 3500], [3600, 4400], [5000, 3000], [4100, 1700], [2400, 1900], [1700, 3500]]
  const hazard = new Feature(new Polygon([hazardCoordinates.map(localMetresToMars)]))
  hazard.set('kind', 'hazard')
  return new VectorLayer({ source: new VectorSource({ features: [hazard] }), style: new Style({ fill: new Fill({ color: 'rgba(249, 115, 22, .18)' }), stroke: new Stroke({ color: 'rgba(255, 160, 92, .75)', width: 1.5, lineDash: [6, 5] }) }) })
}

function selectedTarget(targetId: string, customDestination: ScienceTarget | null, targets: ScienceTarget[]) {
  return customDestination?.id === targetId ? customDestination : targets.find((item) => item.id === targetId) ?? targets[0]
}

function makeTravelFeatures(targetId: string, customDestination: ScienceTarget | null, origin: ScienceTarget, profile: RouteProfile, targets: ScienceTarget[]) {
  const target = selectedTarget(targetId, customDestination, targets)
  const [x, y] = target.localPosition
  const [originX, originY] = origin.localPosition
  const paths: Record<'walk' | 'rover' | 'air', [number, number][]> = {
    walk: terrainRoute([originX, originY], [x, y], 'walk', profile),
    rover: terrainRoute([originX, originY], [x, y], 'rover', profile),
    air: [[originX, originY], [x, y]],
  }
  const backendProfile = profile === 'safe' ? 'safety_first' : 'shorter_distance'
  const backendWalk = useMissionStore.getState().backendRoutes.find((route) => route.profile === backendProfile && route.status !== 'no_route')
  if (backendWalk?.geometry.coordinates.length) paths.walk = backendWalk.geometry.coordinates
  return (Object.keys(paths) as Array<keyof typeof paths>).filter((mode) => paths[mode].length > 0).map((mode) => {
    const feature = new Feature(new LineString(paths[mode].map(localMetresToMars)))
    feature.set('travelMode', mode)
    return feature
  })
}

function makeRouteLayer(targets: ScienceTarget[]) {
  return new VectorLayer({
    source: new VectorSource({ features: makeTravelFeatures(useMissionStore.getState().selectedScienceId, useMissionStore.getState().customDestination, useMissionStore.getState().routeOrigin, useMissionStore.getState().routeProfile, targets) }),
    style: (feature) => {
      const mode = feature.get('travelMode') as 'walk' | 'rover' | 'air'
      const selected = mode === useMissionStore.getState().travelMode
      const colors = { walk: '#DDA660', rover: '#7DB8B5', air: '#A29AC9' }
      return new Style({ stroke: new Stroke({ color: colors[mode], width: selected ? 4 : 2, lineDash: mode === 'air' ? [10, 7] : mode === 'walk' ? [3, 5] : undefined }) })
    },
  })
}

function makeMarkerLayer(targets: ScienceTarget[], habitatPosition: [number, number], customDestination: ScienceTarget | null = null, origin: ScienceTarget = useMissionStore.getState().routeOrigin) {
  const markers = [
    { id: 'habitat', label: 'HAB-01', coordinate: habitatPosition, kind: 'habitat' },
    ...targets.map((target) => ({ id: target.id, label: target.name, coordinate: target.localPosition, kind: 'science' })),
    ...(customDestination && customDestination.id !== 'habitat' ? [{ id: customDestination.id, label: 'Custom destination', coordinate: customDestination.localPosition, kind: 'custom' }] : []),
    ...(origin.id !== 'habitat' ? [{ id: `origin-${origin.id}`, label: `FROM · ${origin.name}`, coordinate: origin.localPosition, kind: 'origin' }] : []),
  ]
  const features = markers.map((marker) => {
    const feature = new Feature(new Point(localMetresToMars(marker.coordinate)))
    feature.setProperties({ markerId: marker.id, label: marker.label, kind: marker.kind })
    return feature
  })
  return new VectorLayer({
    source: new VectorSource({ features }),
    style: (feature) => {
      const isHabitat = feature.get('kind') === 'habitat'
      const isOrigin = feature.get('kind') === 'origin'
      const selected = feature.get('markerId') === useMissionStore.getState().selectedScienceId
      return new Style({
        image: new CircleStyle({ radius: isHabitat ? 8 : selected ? 7 : 6, fill: new Fill({ color: isOrigin ? '#8FB7A8' : isHabitat ? '#DDA660' : selected ? '#7DB8B5' : '#A29AC9' }), stroke: new Stroke({ color: '#171B21', width: 2 }) }),
        text: new Text({ text: feature.get('label'), offsetY: -17, font: '600 10px sans-serif', fill: new Fill({ color: '#f2f4f7' }), stroke: new Stroke({ color: 'rgba(20,25,32,.9)', width: 3 }) }),
      })
    },
  })
}

export function MarsMap({ large = false, showLegend = true }: MarsMapProps) {
  const { site, siteId, targets: apiTargets, hazards: apiHazards } = useMissionData()
  const mapTargets = useMemo(() => mergeMissionTargets(site && apiTargets.data ? apiTargets.data.items.map((item) => apiTargetToScienceTarget(item, site)) : [], scienceTargets), [site, apiTargets.data])
  const habitatPosition: [number, number] = site ? [site.habitat_location.x_m, site.habitat_location.y_m] : demoMission.habitatPosition
  const targetRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const mapShellRef = useRef<HTMLDivElement>(null)
  const [coordinate, setCoordinate] = useState('18.40000° N · 77.50000° E')
  const [mapTheme, setMapTheme] = useState<'schematic' | 'realistic'>('realistic')
  const [terrainInspection, setTerrainInspection] = useState<{ elevationM: number; slopeDeg: number; classification: string; source?: string } | null>(null)
  const layers = useMissionStore((state) => state.layers)
  const selectedScienceId = useMissionStore((state) => state.selectedScienceId)
  const travelMode = useMissionStore((state) => state.travelMode)
  const customDestination = useMissionStore((state) => state.customDestination)
  const routeOrigin = useMissionStore((state) => state.routeOrigin)
  const routeProfile = useMissionStore((state) => state.routeProfile)
  const backendRoutes = useMissionStore((state) => state.backendRoutes)
  const setCoordinateStore = useMissionStore((state) => state.setCoordinate)
  const selectScience = useMissionStore((state) => state.selectScience)
  const setCustomDestination = useMissionStore((state) => state.setCustomDestination)

  useEffect(() => {
    if (!targetRef.current) return
    const realisticLayer = makeRealisticLayer()
    const elevationLayer = makeDemLayer('elevation')
    const slopeLayer = makeDemLayer('slope')
    const terrainLayer = makeTerrainLayer()
    const hazardLayer = makeHazardLayer(apiHazards.data?.items ?? [])
    const routeLayer = makeRouteLayer(mapTargets)
    const markerLayer = makeMarkerLayer(mapTargets, habitatPosition)
    const map = new Map({
      target: targetRef.current,
      layers: [realisticLayer, elevationLayer, slopeLayer, terrainLayer, hazardLayer, routeLayer, markerLayer],
      controls: [new ScaleLine({ units: 'metric', bar: true, steps: 3, text: true, minWidth: 90 })],
      view: new View({ projection: marsGeoProjection, center: JEZERO_CENTER, extent: MARS_LOCAL_EXTENT, resolutions: MARS_TILE_RESOLUTIONS, zoom: 10.4, minZoom: 9, maxZoom: 12, constrainOnlyCenter: true }),
    })
    map.on('pointermove', (event) => {
      const [longitude, latitude] = event.coordinate
      const label = `${latitude.toFixed(5)}° N · ${longitude.toFixed(5)}° E`
      setCoordinate(label)
      setCoordinateStore(label)
    })
    map.on('singleclick', (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (item) => item)
      const id = feature?.get('markerId')
      const kind = feature?.get('kind')
      if (typeof id === 'string' && id !== 'habitat' && kind !== 'origin') selectScience(id)
      else if (id !== 'habitat') {
        const [longitude, latitude] = event.coordinate
        const localPosition = marsToLocalMetres([longitude, latitude])
        const localSample = inspectTerrain(localPosition)
        setTerrainInspection({ elevationM: localSample?.elevationM ?? 0, slopeDeg: localSample?.slopeDeg ?? 0, classification: localSample?.classification ?? 'outside local terrain coverage', source: 'Local CTX grid' })
        if (siteId) void missionApi.getTerrainSample(siteId, { x_m: localPosition[0], y_m: localPosition[1] }).then((sample) => { const value = sample as { elevation_m?: number; slope_deg?: number; terrain_category?: string; risk_score?: number }; setTerrainInspection({ elevationM: Number(value.elevation_m ?? 0), slopeDeg: Number(value.slope_deg ?? 0), classification: `${value.terrain_category ?? 'backend sample'} · risk ${Number(value.risk_score ?? 0).toFixed(2)}`, source: 'Backend terrain sample' }) }).catch(() => undefined)
        const distanceKm = Math.hypot(...localPosition) / 1000
        setCustomDestination({ id: `CUSTOM-${latitude.toFixed(5)}-${longitude.toFixed(5)}`, name: 'Custom map point', category: 'Map-selected coordinate', localPosition, coordinates: [longitude, latitude], distanceKm, risk: distanceKm > 8 ? 'ELEVATED' : distanceKm > 2 ? 'MODERATE' : 'LOW', description: `Selected at ${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°. Terrain and route safety have not been validated.`, objective: 'Explore custom map point', status: 'PLANNED', source: 'CUSTOM COORDINATE' })
        const label = `${latitude.toFixed(5)}° N · ${longitude.toFixed(5)}° E`
        setCoordinate(label)
        setCoordinateStore(label)
      }
    })
    mapRef.current = map
    const resizeObserver = new ResizeObserver(() => map.updateSize())
    resizeObserver.observe(targetRef.current)
    return () => { resizeObserver.disconnect(); map.setTarget(undefined); mapRef.current = null }
  }, [setCoordinateStore, selectScience, setCustomDestination, site, siteId, apiTargets.data, apiHazards.data])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const [realistic, elevation, slope, terrain, hazards, routeLayer, markers] = map.getLayers().getArray()
    const route = routeLayer as VectorLayer<VectorSource>
    const isVisible = (id: string) => layers.find((layer) => layer.id === id)?.visible ?? false
    realistic.setVisible(mapTheme === 'realistic' && isVisible('optical'))
    elevation.setVisible(isVisible('elevation'))
    slope.setVisible(isVisible('slope'))
    terrain.setVisible(mapTheme === 'schematic')
    hazards.setVisible(isVisible('hazards'))
    route.setVisible(isVisible('route'))
    route.setSource(new VectorSource({ features: makeTravelFeatures(selectedScienceId, customDestination, routeOrigin, routeProfile, mapTargets) }))
    const markerFeatures = makeMarkerLayer(mapTargets, habitatPosition, customDestination, routeOrigin).getSource()?.getFeatures() ?? []
    ;(markers as VectorLayer<VectorSource>).setSource(new VectorSource({ features: markerFeatures }))
    markers.setVisible(true)
    map.render()
  }, [layers, selectedScienceId, travelMode, mapTheme, customDestination, routeOrigin, routeProfile, backendRoutes, site, apiTargets.data])

  const zoomBy = (delta: number) => {
    const view = mapRef.current?.getView()
    if (view) view.animate({ zoom: Math.max(9, Math.min(12, (view.getZoom() ?? 10.4) + delta)), duration: 180 })
  }
  const resetView = () => mapRef.current?.getView().animate({ center: JEZERO_CENTER, zoom: 10.4, duration: 240 })
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void mapShellRef.current?.requestFullscreen()
  }

  return <div className={`panel map-panel ${large ? 'map-large-panel' : ''}`} ref={mapShellRef}>
    <div className="panel-heading"><div className="panel-title"><MapIcon /> JEZERO CRATER · LOCAL MAP</div><span className="demo-badge">VISUAL SIMULATION</span></div>
    <div className={`map-frame ${large ? 'map-large' : ''}`}>
      <div className="map-caption">JEZERO CRATER · NORTH UP · MARS 2000</div>
      <div className="map-theme-switch" role="group" aria-label="Map appearance">
        <button className={mapTheme === 'realistic' ? 'active' : ''} onClick={() => setMapTheme('realistic')} aria-pressed={mapTheme === 'realistic'}><Satellite size={12} /> NASA CTX</button>
        <button className={mapTheme === 'schematic' ? 'active' : ''} onClick={() => setMapTheme('schematic')} aria-pressed={mapTheme === 'schematic'}><MapIconLucide size={12} /> Schematic</button>
      </div>
      <div ref={targetRef} className={`map-canvas ${mapTheme === 'realistic' ? 'realistic-terrain' : ''}`} role="application" aria-label={`Interactive ${mapTheme} map of a local Mars mission area`} />
      <div className="map-zoom-controls"><button onClick={() => zoomBy(0.5)} aria-label="Zoom in">+</button><button onClick={() => zoomBy(-0.5)} aria-label="Zoom out">−</button></div>
      <button className="map-fullscreen" onClick={toggleFullscreen} title="Toggle map fullscreen" aria-label="Toggle map fullscreen"><Expand size={14} /></button>
      <button className="map-locate" onClick={resetView} title="Reset map view" aria-label="Reset map view"><LocateFixed size={14} /></button>
      {showLegend && <div className="map-legend"><span className="legend-item"><span className="legend-dot" style={{ background: 'var(--orange)' }} />Habitat</span><span className="legend-item"><span className="legend-dot" style={{ background: 'var(--cyan)' }} />Target</span><span className="legend-item"><span className="legend-line route-walk" />Walk</span><span className="legend-item"><span className="legend-line route-rover" />Rover</span><span className="legend-item"><span className="legend-line route-air" />Flight</span></div>}
      <div className="map-unverified">{mapTheme === 'realistic' ? 'NASA MARS TREK · MRO CTX JEZERO MOSAIC' : 'SCHEMATIC TERRAIN'} · DEM ROUTING</div>
      <div className="map-coordinate">{coordinate}</div>
      {terrainInspection && <div className="terrain-inspection"><span>SELECTED TERRAIN · {terrainInspection.source}</span><strong>{terrainInspection.elevationM.toFixed(0)} m elevation</strong><small>{terrainInspection.slopeDeg.toFixed(1)}° slope · {terrainInspection.classification}</small></div>}
    </div>
    <div className="map-meta"><span>Surface paths use slope and hazard costs · flight remains direct</span><span>{terrainDataLabel}</span></div>
  </div>
}

function MapIcon() { return <span className="map-title-glyph" aria-hidden="true">◈</span> }
