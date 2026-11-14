import { useEffect, useRef, useState } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import Polygon from 'ol/geom/Polygon'
import LineString from 'ol/geom/LineString'
import VectorLayer from 'ol/layer/Vector'
import ImageLayer from 'ol/layer/Image'
import VectorSource from 'ol/source/Vector'
import ImageStatic from 'ol/source/ImageStatic'
import ScaleLine from 'ol/control/ScaleLine'
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style'
import { Expand, LocateFixed } from 'lucide-react'
import { useMemo } from 'react'
import { demoMission, missionRoutes, scienceTargets } from '../../data/demoMission'
import { useMissionData } from '../../hooks/useMissionData'
import { missionApi, toScienceTarget } from '../../services/missionApi'
import { useMissionStore } from '../../stores/missionStore'
import type { ApiHazard, ScienceTarget } from '../../types/mission'
import { MARS_LOCAL_EXTENT, marsLocalProjection } from '../../utils/marsProjection'

interface MarsMapProps { large?: boolean; showLegend?: boolean }

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
    const feature = new Feature(new LineString(coordinates))
    feature.set('kind', 'contour')
    features.push(feature)
  })
  const basin = new Feature(new Polygon([[[-12000, 3000], [-10300, 5300], [-7200, 5000], [-5200, 2800], [-6000, 900], [-9300, 700], [-11500, 1700], [-12000, 3000]]]))
  basin.set('kind', 'terrain')
  features.push(basin)
  return new VectorLayer({
    source: new VectorSource({ features }),
    style: (feature) => feature.get('kind') === 'terrain'
      ? new Style({ fill: new Fill({ color: 'rgba(190, 133, 87, .21)' }), stroke: new Stroke({ color: 'rgba(232, 183, 132, .48)', width: 1 }) })
      : new Style({ stroke: new Stroke({ color: 'rgba(229, 188, 145, .34)', width: 1 }) }),
  })
}

function makeHazardLayer(hazards: ApiHazard[]) {
  const features = hazards.length ? hazards.map((item) => {
    const feature = new Feature(new Polygon([item.geometry.exterior]))
    feature.set('kind', 'hazard')
    feature.set('name', item.name)
    return feature
  }) : [new Feature(new Polygon([[[1700, 3500], [3600, 4400], [5000, 3000], [4100, 1700], [2400, 1900], [1700, 3500]]]))]
  return new VectorLayer({ source: new VectorSource({ features }), style: new Style({ fill: new Fill({ color: 'rgba(249, 115, 22, .18)' }), stroke: new Stroke({ color: 'rgba(255, 160, 92, .75)', width: 1.5, lineDash: [6, 5] }) }) })
}

function makeRouteLayer(routes: import('../../types/mission').MissionRoute[]) {
  const features = routes.map((route) => {
    const feature = new Feature(new LineString(route.waypoints))
    feature.set('routeId', route.id)
    return feature
  })
  return new VectorLayer({ source: new VectorSource({ features }), style: (feature) => new Style({ stroke: new Stroke({ color: feature.get('routeId') === useMissionStore.getState().selectedRouteId ? '#42d4ff' : 'rgba(56,189,248,.42)', width: feature.get('routeId') === useMissionStore.getState().selectedRouteId ? 3 : 2, lineDash: feature.get('routeId') === 'ROUTE-B' ? [8, 6] : undefined }) }) })
}

function makeMarkerLayer(targets: ScienceTarget[], habitatPosition: [number, number]) {
  const markers = [
    { id: 'habitat', label: 'HABITAT', coordinate: habitatPosition, kind: 'habitat' },
    ...targets.map((target) => ({ id: target.id, label: target.name, coordinate: target.localPosition, kind: 'science' })),
  ]
  const features = markers.map((marker) => {
    const feature = new Feature(new Point(marker.coordinate))
    feature.setProperties({ markerId: marker.id, label: marker.label, kind: marker.kind })
    return feature
  })
  return new VectorLayer({
    source: new VectorSource({ features }),
    style: (feature) => {
      const isHabitat = feature.get('kind') === 'habitat'
      const selected = feature.get('markerId') === useMissionStore.getState().selectedScienceId
      return new Style({
        image: new CircleStyle({ radius: isHabitat ? 8 : selected ? 7 : 6, fill: new Fill({ color: isHabitat ? '#f97316' : selected ? '#38bdf8' : '#e5c7a6' }), stroke: new Stroke({ color: '#101a29', width: 2 }) }),
        text: new Text({ text: feature.get('label'), offsetY: -17, font: '600 10px sans-serif', fill: new Fill({ color: '#f2f4f7' }), stroke: new Stroke({ color: 'rgba(20,25,32,.9)', width: 3 }) }),
      })
    },
  })
}

export function MarsMap({ large = false, showLegend = true }: MarsMapProps) {
  const targetRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const mapShellRef = useRef<HTMLDivElement>(null)
  const [coordinate, setCoordinate] = useState('LOCAL GRID · 0 m E / 0 m N')
  const { site, targets: targetQuery, hazards: hazardQuery, layers: layerQuery } = useMissionData()
  const layers = useMissionStore((state) => state.layers)
  const plannedRoutes = useMissionStore((state) => state.plannedRoutes)
  const selectedScienceId = useMissionStore((state) => state.selectedScienceId)
  const selectedRouteId = useMissionStore((state) => state.selectedRouteId)
  const setCoordinateStore = useMissionStore((state) => state.setCoordinate)
  const selectScience = useMissionStore((state) => state.selectScience)
  const targetItems = targetQuery.data?.items
  const targets = useMemo(() => targetItems?.map((target) => toScienceTarget(target, site)) ?? scienceTargets, [targetItems, site])
  const hazardItems = hazardQuery.data?.items
  const hazards = useMemo(() => hazardItems ?? [], [hazardItems])
  const savedRoutes = plannedRoutes.length ? plannedRoutes : missionRoutes
  const elevation = layerQuery.data?.items.find((layer) => layer.layer_type === 'elevation' && layer.is_demo && layer.processing_status === 'demo')

  useEffect(() => {
    if (!targetRef.current) return
    const terrainLayer = makeTerrainLayer()
    const hazardLayer = makeHazardLayer(hazards)
    const routeLayer = makeRouteLayer(savedRoutes)
    const markerLayer = makeMarkerLayer(targets, site ? [site.habitat_location.x_m, site.habitat_location.y_m] : demoMission.habitatPosition)
    const width = site?.width_m ?? 8000
    const height = site?.height_m ?? 8000
    const elevationLayer = new ImageLayer({
      source: elevation ? new ImageStatic({
        url: missionApi.getLayerPreviewUrl(elevation.id),
        imageExtent: [-width / 2, -height / 2, width / 2, height / 2],
        projection: marsLocalProjection,
        crossOrigin: 'anonymous',
      }) : undefined,
    })
    const map = new Map({
      target: targetRef.current,
      layers: [terrainLayer, elevationLayer, hazardLayer, routeLayer, markerLayer],
      controls: [new ScaleLine({ units: 'metric', bar: true, steps: 3, text: true, minWidth: 90 })],
      view: new View({ projection: marsLocalProjection, center: [0, 0], extent: MARS_LOCAL_EXTENT, zoom: 1.05, minZoom: .4, maxZoom: 5, constrainOnlyCenter: true }),
    })
    map.on('pointermove', (event) => {
      const [east, north] = event.coordinate.map((value) => Math.round(value / 10) * 10)
      const label = `LOCAL GRID · ${east} m E / ${north} m N`
      setCoordinate(label)
      setCoordinateStore(label)
    })
    map.on('singleclick', (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (item) => item)
      const id = feature?.get('markerId')
      if (typeof id === 'string' && id !== 'habitat') selectScience(id)
      else if (!feature) {
        const [east, north] = event.coordinate.map((value) => Math.round(value / 10) * 10)
        const label = `LOCAL GRID · ${east} m E / ${north} m N`
        setCoordinate(label)
        setCoordinateStore(label)
      }
    })
    mapRef.current = map
    const mapSize = map.getSize()
    if (mapSize) map.getView().fit([-width / 2, -height / 2, width / 2, height / 2], { size: mapSize, padding: [28, 28, 28, 28], maxZoom: 3.2 })
    const resizeObserver = new ResizeObserver(() => map.updateSize())
    resizeObserver.observe(targetRef.current)
    return () => { resizeObserver.disconnect(); map.setTarget(undefined); mapRef.current = null }
  }, [setCoordinateStore, selectScience, hazards, savedRoutes, targets, site, elevation])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const [terrain, elevation, hazards, route, markers] = map.getLayers().getArray() as [VectorLayer<VectorSource>, ImageLayer<ImageStatic>, VectorLayer<VectorSource>, VectorLayer<VectorSource>, VectorLayer<VectorSource>]
    const isVisible = (id: string) => layers.find((layer) => layer.id === id)?.visible ?? false
    const hasElevation = Boolean(elevation.getSource())
    terrain.setVisible(!hasElevation || !isVisible('elevation'))
    elevation.setVisible(hasElevation && isVisible('elevation'))
    hazards.setVisible(isVisible('hazards'))
    route.setVisible(isVisible('route'))
    markers.setVisible(true)
    map.render()
  }, [layers, selectedScienceId, selectedRouteId])

  const zoomBy = (delta: number) => {
    const view = mapRef.current?.getView()
    if (view) view.animate({ zoom: Math.max(.4, Math.min(5, (view.getZoom() ?? 1) + delta)), duration: 180 })
  }
  const resetView = () => mapRef.current?.getView().animate({ center: [0, 0], zoom: 1.05, duration: 240 })
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void mapShellRef.current?.requestFullscreen()
  }

  return <div className={`panel map-panel ${large ? 'map-large-panel' : ''}`} ref={mapShellRef}>
    <div className="panel-heading"><div className="panel-title"><MapIcon /> JEZERO CRATER · LOCAL SCHEMATIC</div><span className="demo-badge">NO VERIFIED LAYER</span></div>
    <div className={`map-frame ${large ? 'map-large' : ''}`}>
      <div className="map-caption">{site?.local_crs_name.toUpperCase() ?? 'MARS LOCAL GRID'} · METRES · DEMO ORIGIN</div>
      <div ref={targetRef} className="map-canvas" role="application" aria-label="Interactive schematic map of a local Mars mission area" />
      <div className="map-zoom-controls"><button onClick={() => zoomBy(0.5)} aria-label="Zoom in">+</button><button onClick={() => zoomBy(-0.5)} aria-label="Zoom out">−</button></div>
      <button className="map-fullscreen" onClick={toggleFullscreen} title="Toggle map fullscreen" aria-label="Toggle map fullscreen"><Expand size={14} /></button>
      <button className="map-locate" onClick={resetView} title="Reset map view" aria-label="Reset map view"><LocateFixed size={14} /></button>
      {showLegend && <div className="map-legend"><span className="legend-item"><span className="legend-dot" style={{ background: 'var(--orange)' }} />Habitat</span><span className="legend-item"><span className="legend-dot" style={{ background: 'var(--cyan)' }} />Science target</span><span className="legend-item"><span className="legend-line" />Planned route</span></div>}
      <div className="map-unverified">{elevation ? 'SYNTHETIC API TERRAIN · DEMO · NOT NAVIGATIONAL' : 'SCHEMATIC TERRAIN · NOT NAVIGATIONAL'}</div>
      <div className="map-coordinate">{coordinate}</div>
    </div>
    <div className="map-meta"><span>Pan · zoom · select a target</span><span>Scale uses local demo grid metres</span></div>
  </div>
}

function MapIcon() { return <span className="map-title-glyph" aria-hidden="true">◈</span> }