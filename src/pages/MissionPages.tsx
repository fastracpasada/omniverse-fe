import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, ArrowDownToLine, Check, Clock3, Compass, FlaskConical, Gauge, Pause, Play, RotateCcw, Route as RouteIcon, Settings2, ShieldAlert } from 'lucide-react'
import { demoMission, initialTelemetry, missionRoutes, scienceTargets } from '../data/demoMission'
import { MapLayerControl } from '../components/map/MapLayerControl'
import { MarsMap } from '../components/map/MarsMap'
import { useMissionStore } from '../stores/missionStore'
import { useMissionData } from '../hooks/useMissionData'
import { missionApi, toMissionRoute, toScienceTarget } from '../services/missionApi'
import type { MissionRoute } from '../types/mission'

export function MarsExplorer() {
  return <div className="page-wrap"><PageHeading kicker="SURFACE DATA / EXPLORER" title="Mars Explorer" description="Explore the Jezero demo area and inspect available map layers." /><div className="page-content-grid"><MarsMap large /><MapLayerControl /></div><div className="info-strip"><ShieldAlert size={14} /> No verified NASA imagery or terrain layers are configured. The rendered terrain, targets, route, and risk areas are schematic demo content.</div></div>
}

export function RoutePlanner() {
  const queryClient = useQueryClient()
  const { site, siteId, targets, apiConnected } = useMissionData()
  const selectedScienceId = useMissionStore((state) => state.selectedScienceId)
  const selectScience = useMissionStore((state) => state.selectScience)
  const selectedRouteId = useMissionStore((state) => state.selectedRouteId)
  const selectRoute = useMissionStore((state) => state.selectRoute)
  const generateRoute = useMissionStore((state) => state.generateRoute)
  const currentMission = useMissionStore((state) => state.currentMission)
  const setCurrentMission = useMissionStore((state) => state.setCurrentMission)
  const savedRouteId = useMissionStore((state) => state.savedRouteId)
  const setSavedRouteId = useMissionStore((state) => state.setSavedRouteId)
  const plannedRoutes = useMissionStore((state) => state.plannedRoutes)
  const setPlannedRoutes = useMissionStore((state) => state.setPlannedRoutes)
  const [maxHours, setMaxHours] = useState('6')
  const [waypoints, setWaypoints] = useState('0')
  const [preferredProfile, setPreferredProfile] = useState<'shorter_distance' | 'safety_first'>('shorter_distance')
  const [waypointX, setWaypointX] = useState('0')
  const [waypointY, setWaypointY] = useState('0')
  const targetList = targets.data?.items.map((item) => toScienceTarget(item, site)) ?? scienceTargets
  const target = targetList.find((item) => item.id === selectedScienceId) ?? targetList[0]
  const targetRecord = targets.data?.items.find((item) => item.id === target?.id)
  const fallbackRoutes = apiConnected ? [] : missionRoutes
  const routes = plannedRoutes.length ? plannedRoutes : fallbackRoutes
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!siteId || !targetRecord) throw new Error('Wait for a site and science target to load from the API.')
      const mission = currentMission ?? await missionApi.createMission({
        name: 'Jezero Traverse · MARS-NAV',
        description: 'Frontend-created draft mission for API route planning.',
        site_id: siteId,
        eva_duration_limit_min: Number(maxHours) * 60,
        return_reserve_min: 60,
        science_target_ids: [targetRecord.id],
        constraints: { max_slope_deg: 15, block_unknown_terrain: true, preferred_profile: preferredProfile },
      })
      const response = await missionApi.planRoutes({
        mission_id: mission.id,
        profiles: ['shorter_distance', 'safety_first'],
        return_to_habitat: true,
        eva_duration_limit_min: Number(maxHours) * 60,
        return_reserve_min: 60,
        destinations: [
          ...(waypoints === '1' ? [{ location: { x_m: Number(waypointX), y_m: Number(waypointY) }, label: 'Manual site-local waypoint', activity_duration_min: 10 }] : []),
          { label: targetRecord.name, activity_duration_min: targetRecord.estimated_activity_duration_min, science_target_id: targetRecord.id },
        ],
      })
      return { mission, routes: response.routes.map(toMissionRoute), notes: [...response.notes, ...response.warnings] }
    },
    onSuccess: ({ mission, routes: result }) => {
      setCurrentMission(mission)
      setPlannedRoutes(result)
      setSavedRouteId(null)
      selectRoute(result[0]?.id ?? '')
      generateRoute()
      void queryClient.invalidateQueries({ queryKey: ['api', 'missions'] })
    },
  })
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentMission) throw new Error('Generate routes to create a draft mission first.')
      const selectedRoute = routes.find((route) => route.id === selectedRouteId)
      if (!selectedRoute) throw new Error('Select a route returned by the backend.')
      const saved = await missionApi.saveMissionRoute(currentMission.id, {
        profile: selectedRoute.strategy === 'SAFETY FIRST' ? 'safety_first' : 'shorter_distance',
        select: true,
        eva_duration_limit_min: Number(maxHours) * 60,
        return_to_habitat: true,
      })
      return saved
    },
    onSuccess: (saved) => {
      setSavedRouteId(saved.id)
      void queryClient.invalidateQueries({ queryKey: ['api', 'missions', currentMission?.id, 'routes'] })
    },
  })
  useEffect(() => {
    if (targetList.length && !targetList.some((item) => item.id === selectedScienceId)) selectScience(targetList[0].id)
  }, [targetList, selectedScienceId, selectScience])
  return <div className="page-wrap"><PageHeading kicker="MISSION DESIGN / TRAVERSE" title="Route planner" description="Compare mock route alternatives for a proposed science traverse." />
    <div className="page-content-grid"><div className="stacked-panels">
      <section className="panel"><PanelHeading icon={<RouteIcon size={14} />} title="ROUTE CONFIGURATION" badge={apiConnected ? 'FASTAPI' : 'LOCAL DEMO'} /><div className="panel-body"><div className="form-grid"><Field label="Starting location"><select aria-label="Starting location" disabled><option>{site ? `Site habitat · ${site.habitat_location.x_m}, ${site.habitat_location.y_m} m` : 'Loading site habitat...'}</option></select></Field><Field label="Science destination"><select value={target?.id ?? ''} onChange={(event) => selectScience(event.target.value)}>{targetList.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Maximum EVA duration"><select value={maxHours} onChange={(event) => setMaxHours(event.target.value)}><option value="4">4 hours</option><option value="6">6 hours</option><option value="8">8 hours</option></select></Field><Field label="Add a site-local waypoint"><select value={waypoints} onChange={(event) => setWaypoints(event.target.value)}><option value="0">No extra waypoint</option><option value="1">Add one waypoint</option></select></Field>{waypoints === '1' && <><Field label="Waypoint X · metres"><input type="number" value={waypointX} onChange={(event) => setWaypointX(event.target.value)} /></Field><Field label="Waypoint Y · metres"><input type="number" value={waypointY} onChange={(event) => setWaypointY(event.target.value)} /></Field></>}</div><div className="strategy-label">PREFERRED ROUTE</div><div className="strategy-switch"><button className={preferredProfile === 'shorter_distance' ? 'selected' : ''} onClick={() => setPreferredProfile('shorter_distance')}><Compass size={13} /> Shorter distance</button><button className={preferredProfile === 'safety_first' ? 'selected' : ''} onClick={() => setPreferredProfile('safety_first')}><ShieldAlert size={13} /> Safety-first</button></div><div className="form-actions"><button className="primary-button" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending || !apiConnected}><RouteIcon size={13} />{generateMutation.isPending ? 'Planning routes...' : currentMission ? 'Generate route alternatives' : 'Create draft & plan routes'}</button>{currentMission && routes.length > 0 && <button className="secondary-button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving route...' : savedRouteId ? 'Route saved to mission' : 'Save selected route'}</button>}<span className="quiet-note">Backend-generated demo terrain · not operational guidance</span></div>{currentMission && <div className="inline-status">Draft mission: {currentMission.name} · {currentMission.id}</div>}{(generateMutation.error || saveMutation.error) && <div className="warning-strip"><ShieldAlert size={13} />{(generateMutation.error ?? saveMutation.error)?.message}</div>}</div></section>
      <section className="panel"><PanelHeading icon={<Compass size={14} />} title="ROUTE ALTERNATIVES" badge={routes.length ? 'API COMPUTED · DEMO TERRAIN' : 'AWAITING REQUEST'} /><div className="panel-body">{routes.length ? <div className="route-options">{routes.map((route) => <RouteCard key={route.id} route={route} selected={selectedRouteId === route.id} onSelect={() => { selectRoute(route.id); setSavedRouteId(null) }} />)}</div> : <div className="empty-state">Create a draft mission and request both route profiles to see backend-computed alternatives.</div>}<div className="warning-strip"><ShieldAlert size={13} /><span>Routes use the backend’s simulated DEM and prototype cost model. They are not validated for astronaut safety, and the configured slope limits are not NASA-approved thresholds. Destination: {target?.name ?? 'select a target'} · {maxHours} h duration limit · {waypoints} UI waypoint(s).</span></div></div></section>
    </div><div className="stacked-panels"><MarsMap large showLegend={false} /><div className="panel"><PanelHeading icon={<MapPinIcon />} title="SELECTED DESTINATION" /><div className="panel-body"><h3 className="plain-heading">{target?.name ?? 'No destination selected'}</h3><div className="card-description">{target?.description}</div><div className="route-stats"><span>{target?.distanceKm.toFixed(1)} km from habitat</span><span>{target?.risk === 'UNKNOWN' ? 'RISK NOT SCORED' : target?.risk}</span></div></div></div></div></div>
  </div>
}

export function ScienceObjectives() {
  const { site, targets } = useMissionData()
  const selectedId = useMissionStore((state) => state.selectedScienceId)
  const selectScience = useMissionStore((state) => state.selectScience)
  const targetList = targets.data?.items.map((target) => toScienceTarget(target, site)) ?? scienceTargets
  const apiTargets = Boolean(targets.data)
  return <div className="page-wrap"><PageHeading kicker="SCIENCE / TARGET CATALOG" title="Science objectives" description="Proposed points of interest and planned observations for the demo traverse." /><div className="objective-status-row"><span className="demo-badge">{targets.isLoading ? 'LOADING TARGETS' : `${targetList.length} ${apiTargets ? 'API TARGETS' : 'LOCAL DEMO TARGETS'}`}</span><span className="quiet-note">Targets are proposed records; they are not NASA-verified.</span></div>{targets.isError && <div className="warning-strip"><ShieldAlert size={13} />API science targets are unavailable; showing local demo examples.</div>}{targets.isLoading ? <div className="panel empty-state">Loading science targets from MARS-NAV API...</div> : targetList.length === 0 ? <div className="panel empty-state">No science targets are registered for this site.</div> : <div className="target-grid">{targetList.map((target, index) => <button className={`target-card ${target.id === selectedId ? 'selected' : ''}`} key={target.id} onClick={() => selectScience(target.id)}><div className="target-topline"><span className="target-index">TARGET {String(index + 1).padStart(2, '0')}</span><span className={`risk-label risk-${target.risk.toLowerCase()}`}>{target.risk === 'UNKNOWN' ? 'RISK UNSCORED' : target.risk}</span></div><h3>{target.name}</h3><div className="target-category"><FlaskConical size={12} />{target.category}</div><div className="card-description">{target.description}</div><div className="target-objective"><span>OBJECTIVE</span><strong>{target.objective}</strong></div><div className="target-footer"><span>{target.distanceKm.toFixed(1)} km from habitat · {apiTargets ? 'API DEMO' : 'LOCAL DEMO'}</span><span className="target-status">{target.status}</span></div></button>)}</div>}<section className="panel objectives-progress"><PanelHeading icon={<Check size={14} />} title="MISSION OBJECTIVE TRACKER" badge="SIMULATED" /><div className="panel-body"><div className="timeline">{demoMission.objectives.map((objective, index) => <div className="timeline-row" key={objective.id}><div className="timeline-time">OBJ-0{index + 1}</div><div className="timeline-rail"><span className="timeline-dot" /></div><div className="timeline-copy">{objective.title}<small>{index === 0 ? 'In progress · observation notes pending' : 'Queued for a future traverse'}</small></div></div>)}</div></div></section></div>
}

export function EVASimulation() {
  const queryClient = useQueryClient()
  const savedRouteId = useMissionStore((state) => state.savedRouteId)
  const session = useMissionStore((state) => state.simulation)
  const setSession = useMissionStore((state) => state.setSimulation)
  const updateSession = useMissionStore((state) => state.updateSimulation)
  const simulationId = session?.id
  const simulationQuery = useQuery({ queryKey: ['api', 'simulation', simulationId], queryFn: () => missionApi.getSimulation(simulationId!), enabled: Boolean(simulationId), retry: false })
  const simulation = simulationQuery.data ?? session
  const running = simulation?.status.toLowerCase() === 'running'
  const startMutation = useMutation({
    mutationFn: async () => {
      if (!savedRouteId) throw new Error('Save a backend-generated route in Route Planner before starting an EVA simulation.')
      return missionApi.startSimulation({
        route_id: savedRouteId,
        resource_model: {
          version: 'prototype-resources-v1',
          oxygen_use_pct_per_hour_moving: 12,
          oxygen_use_pct_per_hour_activity: 15,
          battery_use_pct_per_hour_moving: 8,
          battery_use_pct_per_hour_activity: 10,
          oxygen_warning_pct: 30,
          battery_warning_pct: 25,
          risk_warning_threshold: 0.6,
          risk_critical_threshold: 0.85,
        },
      })
    },
    onSuccess: ({ session: newSession }) => {
      setSession(newSession)
      queryClient.setQueryData(['api', 'simulation', newSession.id], newSession)
    },
  })
  const actionMutation = useMutation({
    mutationFn: ({ action, seconds }: { action: 'pause' | 'resume' | 'advance'; seconds?: number }) => {
      if (!simulationId) throw new Error('Start a simulation before using session controls.')
      if (action === 'pause') return missionApi.pauseSimulation(simulationId)
      if (action === 'resume') return missionApi.resumeSimulation(simulationId)
      return missionApi.advanceSimulation(simulationId, seconds ?? 300)
    },
    onSuccess: (nextState) => {
      updateSession(nextState)
      queryClient.setQueryData(['api', 'simulation', nextState.id], nextState)
    },
  })
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!simulationId) return
      return missionApi.resetSimulation(simulationId)
    },
    onSuccess: () => {
      if (simulationId) queryClient.removeQueries({ queryKey: ['api', 'simulation', simulationId] })
      setSession(null)
    },
  })
  const elapsed = simulation?.sim_elapsed_s ?? 0
  const oxygen = Number((simulation?.oxygen_remaining_pct ?? initialTelemetry.oxygenPercent).toFixed(1))
  const battery = Number((simulation?.battery_remaining_pct ?? initialTelemetry.batteryPercent).toFixed(1))
  const distanceKm = (simulation?.distance_along_route_m ?? 0) / 1000
  const totalDistanceKm = (simulation?.total_route_distance_m ?? 0) / 1000
  const error = startMutation.error ?? actionMutation.error ?? resetMutation.error
  return <div className="page-wrap"><PageHeading kicker="EXTRAVEHICULAR ACTIVITY / SIMULATOR" title="EVA simulation" description="Backend-controlled simulated telemetry; mission time advances only by explicit requests." /><div className="eva-grid"><div className="panel"><PanelHeading icon={<Activity size={14} />} title="ASTRONAUT STATUS" badge={simulation?.data_origin === 'simulated' ? 'API SIMULATED' : 'WAITING FOR SESSION'} /><div className="panel-body"><div className="eva-identity"><div className="crew-avatar">RC</div><div><h3 className="plain-heading">Astronaut R. Chen</h3><div className="card-description">{demoMission.crewId} · EVA-02 · fictional demo crew</div></div><span className="status-running"><span className="status-dot" />{simulation?.status.toUpperCase() ?? 'NOT STARTED'}</span></div><div className="eva-clock-label">ELAPSED SIMULATION TIME</div><div className="eva-clock">{formatTime(elapsed)}</div><div className="resource-bars"><ResourceBar label="Oxygen supply · simulated" value={oxygen} color="cyan" /><ResourceBar label="Suit battery · simulated" value={battery} color="orange" /></div><div className="eva-controls">{!simulation ? <button className="primary-button" onClick={() => startMutation.mutate()} disabled={startMutation.isPending || !savedRouteId}><Play size={13} />{startMutation.isPending ? 'Starting...' : 'Start API simulation'}</button> : <><button className="primary-button" onClick={() => actionMutation.mutate({ action: running ? 'pause' : 'resume' })} disabled={actionMutation.isPending}>{running ? <Pause size={13} /> : <Play size={13} />}{running ? 'Pause' : 'Resume'}</button><button className="secondary-button" onClick={() => actionMutation.mutate({ action: 'advance', seconds: 300 })} disabled={actionMutation.isPending || !running}><Clock3 size={13} />Advance 5 min</button><button className="secondary-button" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}><RotateCcw size={13} />Reset</button></>}</div>{!savedRouteId && !simulation && <div className="inline-status">A saved route is required. Create and save one in Route Planner.</div>}{error && <div className="warning-strip"><ShieldAlert size={13} />{error.message}</div>}<div className="warning-strip"><ShieldAlert size={13} /><span>API session telemetry is simulated. The resource model is a prototype and its warning values are not NASA-approved limits.</span></div></div></div><div className="panel"><PanelHeading icon={<Compass size={14} />} title="SIMULATED TRAVERSE" badge="LOCAL GRID · METRES" /><MarsMap large showLegend={false} /><div className="panel-body traverse-readout"><span>POSITION <strong>{simulation?.position ? `${simulation.position.x_m.toFixed(0)}, ${simulation.position.y_m.toFixed(0)} m` : 'WAITING FOR SESSION'}</strong></span><span>RANGE <strong>{distanceKm.toFixed(2)} / {totalDistanceKm.toFixed(2)} km</strong></span><span>RISK <strong>{simulation?.risk_level ?? 'NOT SCORED'}</strong></span></div></div></div><div className="panel eva-timeline"><PanelHeading icon={<Clock3 size={14} />} title="SESSION TELEMETRY" badge={`${simulation?.telemetry_count ?? 0} SAMPLES`} /><div className="panel-body"><div className="timeline"><div className="timeline-row"><div className="timeline-time">SESSION</div><div className="timeline-rail"><span className="timeline-dot" /></div><div className="timeline-copy">{simulation?.status ?? 'No active session'}<small>{simulation?.warnings.join(' · ') || 'Start a saved route simulation to receive API telemetry.'}</small></div></div>{simulation?.warnings.map((warning, index) => <div className="timeline-row" key={`${index}-${warning}`}><div className="timeline-time">NOTICE</div><div className="timeline-rail"><span className="timeline-dot" /></div><div className="timeline-copy">Simulation warning<small>{warning}</small></div></div>)}</div></div></div></div>
}

export function MissionReports() {
  const { siteId } = useMissionData()
  const reports = useQuery({ queryKey: ['api', 'missions', siteId], queryFn: () => missionApi.getMissions(25, 0, siteId), enabled: Boolean(siteId), retry: false })
  const downloadReport = () => {
    const report = { missions: reports.data?.items ?? [], targets: scienceTargets, routes: missionRoutes, telemetry: initialTelemetry, dataLabel: reports.data ? 'API RECORDS; TELEMETRY/ROUTES SHOWN ARE LOCAL DEMO EXAMPLES' : 'SIMULATED DEMO DATA' }
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${demoMission.id.toLowerCase()}-demo-report.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  return <div className="page-wrap"><PageHeading kicker="MISSION ARCHIVE / EXPORT" title="Mission reports" description="Review missions registered by the API and export structured JSON." /><div className="panel"><PanelHeading icon={<Activity size={14} />} title="MISSION LOG" badge={reports.data ? 'FASTAPI' : 'API'} /><div className="table-scroll"><table className="list-table"><thead><tr><th>MISSION ID</th><th>NAME</th><th>SITE</th><th>STATUS</th><th>ORIGIN</th></tr></thead><tbody>{reports.isLoading ? <tr><td colSpan={5}>Loading missions...</td></tr> : reports.data?.items.map((mission) => <tr key={mission.id}><td>{mission.id}</td><td>{mission.name}</td><td>{mission.site_id}</td><td><span className="status-text">{mission.status.toUpperCase()}</span></td><td>{mission.is_demo ? 'DEMO' : 'API'}</td></tr>)}</tbody></table></div>{reports.isError && <div className="panel-body"><div className="warning-strip"><ShieldAlert size={13} />Mission records are unavailable from the API. No local mission history is substituted.</div></div>}{reports.data?.items.length === 0 && <div className="empty-state">No missions have been created for this site yet.</div>}<div className="panel-body report-action-row"><div><div className="plain-heading">Export API mission records</div><div className="card-description">Exports registered missions alongside clearly separated local demo examples.</div></div><button className="primary-button" onClick={downloadReport}><ArrowDownToLine size={13} />Export JSON</button></div></div></div>
}

export function Settings() {
  const layers = useMissionStore((state) => state.layers)
  const toggleLayer = useMissionStore((state) => state.toggleLayer)
  const [compact, setCompact] = useState(false)
  const [units, setUnits] = useState('Metric')
  return <div className="page-wrap"><PageHeading kicker="SYSTEM / PREFERENCES" title="Settings" description="Display preferences and demo mission configuration." /><div className="settings-grid"><div className="panel"><PanelHeading icon={<Settings2 size={14} />} title="DISPLAY PREFERENCES" /><div className="panel-body"><div className="setting-row"><div><div className="layer-name">Compact telemetry cards</div><div className="layer-status">Reduce padding in mission telemetry panels.</div></div><Toggle value={compact} onToggle={() => setCompact(!compact)} /></div><div className="setting-row"><div><div className="layer-name">Distance units</div><div className="layer-status">Used for local demo-grid labels.</div></div><select className="compact-select" value={units} onChange={(event) => setUnits(event.target.value)}><option>Metric</option><option>Imperial</option></select></div></div></div><div className="panel"><PanelHeading icon={<Gauge size={14} />} title="DEMO MISSION PARAMETERS" badge="SIMULATED" /><div className="panel-body"><div className="setting-row"><div><div className="layer-name">Mission</div><div className="layer-status">Current local scenario</div></div><strong className="setting-value">{demoMission.name}</strong></div><div className="setting-row"><div><div className="layer-name">Site</div><div className="layer-status">Initial study area</div></div><strong className="setting-value">{demoMission.site}</strong></div><div className="setting-row"><div><div className="layer-name">Crew identifier</div><div className="layer-status">Fictional demo astronaut</div></div><strong className="setting-value">{demoMission.crewId}</strong></div></div></div><div className="panel setting-layers"><PanelHeading icon={<MapIcon />} title="DEFAULT MAP LAYERS" /><div className="panel-body">{layers.map((layer) => <div className="setting-row" key={layer.id}><div><div className="layer-name">{layer.name}</div><div className="layer-status">{layer.status === 'PLACEHOLDER' ? 'Unavailable until a verified source is configured' : 'Schematic demo layer'}</div></div><button className={`switch ${layer.visible ? 'on' : ''}`} aria-pressed={layer.visible} onClick={() => toggleLayer(layer.id)} aria-label={`Toggle ${layer.name}`}><span className="switch-knob" /></button></div>)}</div></div><div className="panel"><PanelHeading icon={<ShieldAlert size={14} />} title="DATA DISCLAIMER" /><div className="panel-body"><div className="warning-strip"><ShieldAlert size={13} /><span>This interface is a hackathon demonstration. No real NASA datasets, mission telemetry, safety limits, or weather feeds are connected.</span></div></div></div></div></div>
}

function PageHeading({ kicker, title, description }: { kicker: string; title: string; description: string }) { return <div className="page-heading"><div><div className="page-kicker">{kicker}</div><h1 className="page-title">{title}</h1><p className="page-description">{description}</p></div><span className="demo-badge">DEMO ENVIRONMENT</span></div> }
function PanelHeading({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: string }) { return <div className="panel-heading"><div className="panel-title">{icon}{title}</div>{badge && <span className="demo-badge">{badge}</span>}</div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="field"><label>{label}{children}</label></div> }
function RouteCard({ route, selected, onSelect }: { route: MissionRoute; selected: boolean; onSelect: () => void }) { return <button className={`route-card ${selected ? 'selected' : ''}`} onClick={onSelect}><div className="route-card-top"><h3>{route.name}</h3>{selected && <span className="selected-mark"><Check size={12} /> SELECTED</span>}</div><div className="card-description">{route.terrainNote}</div><div className="route-stats"><span>{route.distanceKm.toFixed(1)} km</span><span>{route.durationHours.toFixed(1)} h</span><span>{route.risk} RISK · DEMO</span></div></button> }
function ResourceBar({ label, value, color }: { label: string; value: number; color: 'cyan' | 'orange' }) { return <div className="resource-row"><div className="resource-label"><span>{label}</span><strong>{value}%</strong></div><div className="resource-track"><div className={`resource-fill ${color}`} style={{ width: `${value}%` }} /></div></div> }
function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) { return <button className={`switch ${value ? 'on' : ''}`} onClick={onToggle} aria-pressed={value}><span className="switch-knob" /></button> }
function formatTime(seconds: number) { return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` }
function MapPinIcon() { return <Compass size={14} /> }
function MapIcon() { return <Compass size={14} /> }