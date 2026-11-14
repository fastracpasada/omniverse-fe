import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Battery, CheckCircle2, Clock3, Footprints, MapPin, Navigation, PackageCheck, Plane, Search, ShieldCheck, Truck } from 'lucide-react'
import { MarsMap } from '../components/map/MarsMap'
import { demoMission, environmentalContext, initialTelemetry, scienceTargets } from '../data/demoMission'
import { useMissionStore } from '../stores/missionStore'
import { marsToLocalMetres } from '../utils/marsProjection'
import type { ScienceTarget } from '../types/mission'
import { MarsWeatherBrief } from '../components/weather/MarsWeatherBrief'
import { planTerrainRoute } from '../utils/terrainRouting'
import { useMutation } from '@tanstack/react-query'
import { useMissionData } from '../hooks/useMissionData'
import { apiTargetToScienceTarget, missionApi } from '../services/missionApi'

type TravelMode = 'walk' | 'rover' | 'air'

const modes = {
  walk: { label: 'Walk', icon: Footprints, speed: 3, range: 'Up to 2 km', note: 'Best for nearby, low-risk destinations.' },
  rover: { label: 'Rover', icon: Truck, speed: 12, range: '2–20 km', note: 'Crew transport with cargo and emergency reserve.' },
  air: { label: 'Aerial vehicle', icon: Plane, speed: 30, range: 'Scout support', note: 'Experimental simulation; no operational crew aircraft on Mars.' },
} satisfies Record<TravelMode, { label: string; icon: typeof Footprints; speed: number; range: string; note: string }>

const habitatTarget: ScienceTarget = { id: 'habitat', name: 'HAB-01 Habitat', category: 'Mission habitat', localPosition: [0, 0], distanceKm: 0, risk: 'LOW', description: 'Primary mission habitat and safe return destination.', objective: 'Depart from or return to habitat', status: 'PLANNED', source: 'MISSION DEMO' }

function recommendation(distance: number, risk: string): TravelMode {
  if (distance <= 2 && risk === 'LOW') return 'walk'
  return 'rover'
}

function coordinateTarget(query: string): ScienceTarget | null {
  const matches = query.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/)
  if (!matches) return null
  const latitude = Number(matches[1])
  const longitude = Number(matches[2])
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
  const localPosition = marsToLocalMetres([longitude, latitude])
  const distanceKm = Math.hypot(...localPosition) / 1000
  return { id: `CUSTOM-${latitude.toFixed(5)}-${longitude.toFixed(5)}`, name: `Custom point ${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`, category: 'Latitude / longitude', localPosition, coordinates: [longitude, latitude], distanceKm, risk: distanceKm > 8 ? 'ELEVATED' : distanceKm > 2 ? 'MODERATE' : 'LOW', description: 'User-selected coordinate. Terrain and route safety have not been validated.', objective: 'Explore custom map point', status: 'PLANNED', source: 'CUSTOM COORDINATE' }
}

export function MissionOverview() {
  const { site, siteId, targets: apiTargets, apiConnected } = useMissionData()
  const selectedId = useMissionStore((state) => state.selectedScienceId)
  const selectScience = useMissionStore((state) => state.selectScience)
  const customDestination = useMissionStore((state) => state.customDestination)
  const setCustomDestination = useMissionStore((state) => state.setCustomDestination)
  const routeOrigin = useMissionStore((state) => state.routeOrigin)
  const setRouteOrigin = useMissionStore((state) => state.setRouteOrigin)
  const elapsed = useMissionStore((state) => state.telemetryElapsedSeconds)
  const [query, setQuery] = useState('')
  const [originQuery, setOriginQuery] = useState('HAB-01 Habitat')
  const mode = useMissionStore((state) => state.travelMode)
  const setMode = useMissionStore((state) => state.setTravelMode)
  const [showOptions, setShowOptions] = useState(false)
  const routePreference = useMissionStore((state) => state.routeProfile)
  const setRoutePreference = useMissionStore((state) => state.setRouteProfile)
  const [planConfirmed, setPlanConfirmed] = useState(false)
  const setCurrentMission = useMissionStore((state) => state.setCurrentMission)
  const setBackendRoutes = useMissionStore((state) => state.setBackendRoutes)
  const setSavedRouteId = useMissionStore((state) => state.setSavedRouteId)
  const backendTargets = site && apiTargets.data ? apiTargets.data.items.map((item) => apiTargetToScienceTarget(item, site)) : []
  const targetList = backendTargets.length ? backendTargets : scienceTargets
  const activeHabitat: ScienceTarget = site ? { ...habitatTarget, name: 'HAB-01 Habitat', localPosition: [site.habitat_location.x_m, site.habitat_location.y_m], description: site.local_frame_description, source: 'MISSION DEMO' } : habitatTarget
  useEffect(() => { if (backendTargets.length && !backendTargets.some((item) => item.id === selectedId) && customDestination?.id !== selectedId) selectScience(backendTargets[0].id) }, [backendTargets, selectedId, customDestination, selectScience])
  useEffect(() => { if (site && routeOrigin.id === 'habitat' && (routeOrigin.localPosition[0] !== site.habitat_location.x_m || routeOrigin.localPosition[1] !== site.habitat_location.y_m)) { setRouteOrigin(activeHabitat); setOriginQuery(activeHabitat.name) } }, [site, routeOrigin, setRouteOrigin, activeHabitat])
  const target = (customDestination?.id === selectedId ? customDestination : targetList.find((item) => item.id === selectedId)) ?? targetList[0]
  const tripDistanceKm = Math.hypot(target.localPosition[0] - routeOrigin.localPosition[0], target.localPosition[1] - routeOrigin.localPosition[1]) / 1000
  const routeResult = useMemo(() => mode === 'air' ? null : planTerrainRoute(routeOrigin.localPosition, target.localPosition, mode, routePreference), [mode, routeOrigin, target, routePreference])
  const routeDistanceKm = mode === 'air' ? tripDistanceKm : routeResult?.status === 'ok' ? routeResult.distanceM / 1000 : 0
  const suggestedMode = recommendation(tripDistanceKm, target.risk)
  const parsedCoordinate = coordinateTarget(query)
  const parsedOriginCoordinate = coordinateTarget(originQuery)
  const filteredTargets = [activeHabitat, ...targetList].filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase()))
  const originChoices = [activeHabitat, ...targetList].filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(originQuery.toLowerCase()))
  const oxygen = Math.max(0, initialTelemetry.oxygenPercent - Math.floor((elapsed - initialTelemetry.elapsedSeconds) / 90))
  const estimate = useMemo(() => {
    const activeMode = modes[mode]
    const travelHours = (routeDistanceKm * 2) / activeMode.speed
    const activityHours = 1
    const totalHours = travelHours + activityHours
    return {
      travelHours,
      totalHours,
      oxygen: Math.ceil(totalHours * 8 * 1.25),
      water: Math.max(1, Math.ceil(totalHours * .55 * 10) / 10),
      power: mode === 'rover' ? Math.ceil(routeDistanceKm * 2 * 1.8 * 1.25) : mode === 'air' ? Math.ceil(routeDistanceKm * 2 * .8 * 1.25) : Math.ceil(totalHours * 6),
    }
  }, [mode, routeDistanceKm])
  const walkingUnavailable = tripDistanceKm > 2
  const routeUnavailable = mode !== 'air' && routeResult?.status !== 'ok'
  const readiness = !routeUnavailable && !(mode === 'walk' && walkingUnavailable) && estimate.oxygen < oxygen
  const backendPlan = useMutation({
    mutationFn: async () => {
      if (!siteId || !site) throw new Error('The backend site is not available.')
      const apiTarget = apiTargets.data?.items.find((item) => item.id === target.id)
      const duration = Math.max(60, Math.ceil(estimate.totalHours * 60))
      const mission = await missionApi.createMission({ name: `${target.name} traverse`, description: `Created from the integrated MARS-NAV planner using ${mode} mode.`, site_id: siteId, start_location: { x_m: routeOrigin.localPosition[0], y_m: routeOrigin.localPosition[1] }, eva_duration_limit_min: duration, return_reserve_min: 60, science_target_ids: apiTarget ? [apiTarget.id] : [], constraints: { max_slope_deg: mode === 'walk' ? 15 : 20, block_unknown_terrain: true, preferred_profile: routePreference === 'safe' ? 'safety_first' : 'shorter_distance' } })
      const result = await missionApi.planRoutes({ mission_id: mission.id, start: { x_m: routeOrigin.localPosition[0], y_m: routeOrigin.localPosition[1] }, profiles: ['shorter_distance', 'safety_first'], return_to_habitat: true, eva_duration_limit_min: duration, return_reserve_min: 60, destinations: [{ ...(apiTarget ? { science_target_id: apiTarget.id } : { location: { x_m: target.localPosition[0], y_m: target.localPosition[1] } }), label: target.name, activity_duration_min: apiTarget?.estimated_activity_duration_min ?? 30 }] })
      const selectedProfile = routePreference === 'safe' ? 'safety_first' : 'shorter_distance'
      const selected = result.routes.find((route) => route.profile === selectedProfile) ?? result.routes[0]
      if (!selected || selected.status === 'no_route') throw new Error(selected?.warnings.join(' ') || 'The backend could not produce a traversable route.')
      const saved = await missionApi.saveRoute(mission.id, selected.profile, duration)
      return { mission, routes: result.routes, saved }
    },
    onSuccess: ({ mission, routes, saved }) => { setCurrentMission(mission); setBackendRoutes(routes); setSavedRouteId(saved.id); setPlanConfirmed(true) },
  })

  const chooseTarget = (id: string) => {
    const next = id === 'habitat' ? activeHabitat : targetList.find((item) => item.id === id)!
    if (id === 'habitat') setCustomDestination(activeHabitat)
    else selectScience(id)
    setQuery(next.name)
    setShowOptions(false)
    setMode(recommendation(Math.hypot(next.localPosition[0] - routeOrigin.localPosition[0], next.localPosition[1] - routeOrigin.localPosition[1]) / 1000, next.risk))
  }

  const chooseCoordinate = (next: ScienceTarget) => {
    setCustomDestination(next)
    setQuery(next.name)
    setShowOptions(false)
    setMode(recommendation(Math.hypot(next.localPosition[0] - routeOrigin.localPosition[0], next.localPosition[1] - routeOrigin.localPosition[1]) / 1000, next.risk))
  }

  const chooseOrigin = (next: ScienceTarget) => {
    setRouteOrigin(next)
    setOriginQuery(next.name)
  }

  if (planConfirmed) return <PlannedTripView target={target} origin={routeOrigin} distanceKm={routeDistanceKm} mode={mode} estimate={estimate} routePreference={routePreference} routeResult={routeResult} onEdit={() => setPlanConfirmed(false)} />

  return <div className="page-wrap travel-workspace">
    <header className="travel-hero">
      <div><span className="welcome-label">SOL {demoMission.sol} · TRIP PLANNER</span><h1>Where are you going?</h1><p>Search a destination and prepare the entire surface trip from one screen.</p></div>
      <div className="nominal-pill"><ShieldCheck size={17} /> Systems normal</div>
    </header>

    <section className={`destination-search route-search ${showOptions ? 'expanded' : ''}`} aria-label="Route search">
      <Search size={20} />
      <div className="search-field-wrap">
        <label>Plan a route</label>
        <button className="route-search-trigger" onClick={() => setShowOptions(true)} aria-expanded={showOptions}><span><small>FROM</small><strong>{routeOrigin.name}</strong></span><Navigation size={15} /><span><small>TO</small><strong>{target.name}</strong></span></button>
        {showOptions && <div className="route-search-panel">
          <div className="route-search-heading"><div><strong>Where are you traveling?</strong><small>Choose both endpoints before reviewing the route.</small></div><button onClick={() => setShowOptions(false)}>Done</button></div>
          <div className="route-endpoint"><label htmlFor="origin-search"><span>FROM</span> Starting point</label><input id="origin-search" value={originQuery} placeholder="Habitat, location, or coordinates" onChange={(event) => setOriginQuery(event.target.value)} /><div className="endpoint-results">{parsedOriginCoordinate && <button onClick={() => chooseOrigin({ ...parsedOriginCoordinate, id: `ORIGIN-${parsedOriginCoordinate.id}` })}><MapPin size={14} /><span><strong>Use these coordinates</strong><small>{parsedOriginCoordinate.name}</small></span></button>}{originChoices.slice(0, 5).map((item) => <button key={`from-${item.id}`} className={routeOrigin.id === item.id ? 'selected' : ''} onClick={() => chooseOrigin(item)}><MapPin size={14} /><span><strong>{item.name}</strong><small>{item.category}</small></span></button>)}</div></div>
          <div className="route-direction-line"><span /><Navigation size={14} /><span /></div>
          <div className="route-endpoint"><label htmlFor="destination-search"><span>TO</span> Destination</label><input id="destination-search" value={query} placeholder="Location or latitude, longitude" onChange={(event) => setQuery(event.target.value)} /><div className="endpoint-results">{parsedCoordinate && <button onClick={() => chooseCoordinate(parsedCoordinate)}><MapPin size={14} /><span><strong>Use these coordinates</strong><small>{parsedCoordinate.name}</small></span></button>}{filteredTargets.slice(0, 6).map((item) => <button key={`to-${item.id}`} className={target.id === item.id ? 'selected' : ''} onClick={() => chooseTarget(item.id)}><MapPin size={14} /><span><strong>{item.name}</strong><small>{item.category}</small></span></button>)}</div></div>
          <div className="route-search-summary"><span>{tripDistanceKm.toFixed(1)} km between points</span><button onClick={() => setShowOptions(false)}>Use this route</button></div>
        </div>}
      </div>
      <button className="search-action" onClick={() => setShowOptions(true)}>Change route</button>
      <div className="destination-help">Named references use NASA mission maps and the <a href="https://planetarynames.wr.usgs.gov/" target="_blank" rel="noreferrer">USGS–IAU Gazetteer</a>. Mission-area markers are approximate; click the map for any custom point.</div>
    </section>

    <section className="trip-layout">
      <div className="trip-main">
        <div className="map-home"><MarsMap /></div>
        <section className="travel-section">
          <div className="travel-section-heading"><div><span>2</span><div><h2>Choose how to travel</h2><p>We suggest a mode based on distance and terrain risk.</p></div></div><div className="recommendation-badge">Recommended: {modes[suggestedMode].label}</div></div>
          <div className="mode-grid">{(Object.keys(modes) as TravelMode[]).map((key) => {
            const item = modes[key]
            const Icon = item.icon
            const unavailable = key === 'walk' && walkingUnavailable
            return <button key={key} className={`mode-card ${mode === key ? 'selected' : ''} ${unavailable ? 'unavailable' : ''}`} onClick={() => !unavailable && setMode(key)} disabled={unavailable}>
              <div className="mode-card-top"><span className="mode-icon"><Icon size={20} /></span>{key === suggestedMode && <span className="best-chip">BEST MATCH</span>}</div>
              <strong>{item.label}</strong><small>{item.range}</small><p>{unavailable ? `Walking is limited to trips of 2 km or less.` : item.note}</p>
            </button>
          })}</div>
          {mode === 'air' && <div className="air-warning"><AlertTriangle size={16} /><span><strong>Aerial scouting path selected.</strong> This compares an autonomous reconnaissance flight with surface routes; it does not represent passenger transport.</span></div>}
        </section>

        <section className="travel-section">
          <div className="travel-section-heading"><div><span>3</span><div><h2>Review route and risk</h2><p>Choose the priority for this simulated route.</p></div></div></div>
          <div className="route-choice-row"><button className={routePreference === 'safe' ? 'selected' : ''} onClick={() => setRoutePreference('safe')}><ShieldCheck size={18} /><span><strong>Safety-first</strong><small>Weights slope and hazard clearance</small></span></button><button className={routePreference === 'fast' ? 'selected' : ''} onClick={() => setRoutePreference('fast')}><Navigation size={18} /><span><strong>Shortest traversable</strong><small>Minimizes distance within hard limits</small></span></button></div>
          {routeUnavailable && <div className="no-route-warning"><AlertTriangle size={17} /><span><strong>{routeResult?.status === 'outside_coverage' ? 'Outside terrain coverage' : 'No traversable surface route'}</strong><small>{routeResult?.reason} Choose another endpoint, mode, or route profile.</small></span></div>}
          <div className="risk-grid"><Risk label="Terrain" value={target.risk} detail={routeResult?.status === 'ok' ? `${routeResult.maximumSlopeDeg.toFixed(1)}° max · ${routeResult.elevationGainM.toFixed(0)} m gain` : 'Route terrain unavailable'} /><Risk label="Environment" value="MODERATE" detail={environmentalContext[1].value} /><Risk label="Communications" value="LOW" detail="Relay coverage available" /><Risk label="Return margin" value={estimate.totalHours < 5 ? 'GOOD' : 'TIGHT'} detail={`${Math.max(0, 6 - estimate.totalHours).toFixed(1)} h EVA reserve`} /></div>
        </section>
      </div>

      <aside className="trip-sidebar">
        <section className="trip-summary-card">
          <span className="simple-section-label">SELECTED TRIP · {target.source ?? 'MISSION DEMO'}</span><h2>{target.name}</h2><p>{target.description}</p>
          <div className="summary-facts"><Fact label="Starting from" value={routeOrigin.name} /><Fact label="Routed distance" value={routeUnavailable ? 'No route' : `${routeDistanceKm.toFixed(1)} km`} /><Fact label="Travel mode" value={modes[mode].label} /><Fact label="Total mission time" value={routeUnavailable ? '—' : `${estimate.totalHours.toFixed(1)} h`} /></div>
        </section>

        <MarsWeatherBrief origin={routeOrigin} destination={target} mode={mode} />

        <section className="resource-card">
          <div className="side-card-title"><PackageCheck size={18} /><div><h3>Required resources</h3><p>Includes a 25% planning reserve</p></div></div>
          <div className="resource-list"><Resource icon={<Activity />} label="Suit oxygen" value={`${estimate.oxygen}% capacity`} /><Resource icon={<Battery />} label={mode === 'rover' ? 'Rover energy' : 'Power reserve'} value={`${estimate.power}${mode === 'rover' ? ' kWh' : '%'}`} /><Resource icon={<PackageCheck />} label="Crew water" value={`${estimate.water} L`} /><Resource icon={<Clock3 />} label="Time allocation" value={`${estimate.totalHours.toFixed(1)} h`} /></div>
          <div className="packing-list"><span>PACKING CHECK</span><label><input type="checkbox" defaultChecked /> Emergency oxygen</label><label><input type="checkbox" defaultChecked /> Communications beacon</label><label><input type="checkbox" /> Science tools</label><label><input type="checkbox" /> Medical kit</label>{mode === 'rover' && <label><input type="checkbox" /> Rover repair kit</label>}</div>
        </section>

        <section className={`readiness-card ${readiness ? 'ready' : 'hold'}`}><div><CheckCircle2 size={21} /><span><strong>{readiness ? (mode === 'air' ? 'Scout flight ready for review' : 'Trip ready for review') : 'Trip requires changes'}</strong><small>{apiConnected && mode === 'walk' ? 'Walking EVA will be planned and saved by the backend.' : mode === 'air' ? 'Uncrewed reconnaissance remains a frontend simulation.' : 'Rover planning remains modeled locally until backend mode support is added.'}</small></span></div><button disabled={!readiness || backendPlan.isPending} onClick={() => apiConnected && mode === 'walk' ? backendPlan.mutate() : setPlanConfirmed(true)}>{backendPlan.isPending ? 'Planning with backend…' : mode === 'air' ? 'Confirm scout plan' : apiConnected && mode === 'walk' ? 'Plan & save walking EVA' : 'Confirm trip plan'}</button>{backendPlan.error && <p className="risk-elevated">{backendPlan.error.message}</p>}<p>{apiConnected ? 'Backend connected · rover and flight remain simulated' : 'Local simulation · backend unavailable'}</p></section>
      </aside>
    </section>
  </div>
}

function PlannedTripView({ target, origin, distanceKm, mode, estimate, routePreference, routeResult, onEdit }: { target: ScienceTarget; origin: ScienceTarget; distanceKm: number; mode: TravelMode; estimate: { travelHours: number; totalHours: number; oxygen: number; water: number; power: number }; routePreference: 'safe' | 'fast'; routeResult: ReturnType<typeof planTerrainRoute> | null; onEdit: () => void }) {
  const Icon = modes[mode].icon
  return <div className="page-wrap planned-workspace">
    <header className="compact-plan-bar">
      <div className="compact-plan-main"><span className="plan-ready-dot" /><div><small>ROUTE READY</small><strong>{origin.name} → {target.name}</strong></div></div>
      <div className="compact-plan-facts"><span><Icon size={14} />{modes[mode].label}</span><span><Navigation size={14} />{routePreference === 'safe' ? 'Safer route' : 'Faster route'}</span><span>{distanceKm.toFixed(1)} km</span><span>{estimate.totalHours.toFixed(1)} h total</span></div>
      <button onClick={onEdit}>Edit plan</button>
    </header>
    <section className="mission-map-stage" aria-label="Confirmed route map and trip details">
      <MarsMap large />
      <aside className="map-detail-overlay">
        <div className="overlay-header"><span className="simple-section-label">ACTIVE PLAN</span><strong>{target.name}</strong><small>{target.source ?? 'MISSION DEMO'} · {target.risk} RISK</small></div>
        <div className="overlay-metrics"><Fact label="Mode" value={modes[mode].label} /><Fact label="Round trip" value={`${estimate.travelHours.toFixed(1)} h`} /><Fact label="Oxygen" value={`${estimate.oxygen}%`} /><Fact label={mode === 'rover' ? 'Energy' : 'Power'} value={`${estimate.power}${mode === 'rover' ? ' kWh' : '%'}`} /><Fact label="Max slope" value={routeResult ? `${routeResult.maximumSlopeDeg.toFixed(1)}°` : 'Flight'} /><Fact label="Route" value={routePreference === 'safe' ? 'Safety-first' : 'Shortest'} /></div>
        <div className="overlay-alert"><ShieldCheck size={15} /><span><strong>Planning checks complete</strong><small>DEM route · 25% resource reserve</small></span></div>
        <MarsWeatherBrief origin={origin} destination={target} mode={mode} compact />
      </aside>
      <div className="map-path-hint"><span className="legend-line route-walk" /> Walk <span className="legend-line route-rover" /> Rover <span className="legend-line route-air" /> Flight</div>
    </section>
  </div>
}

function Fact({ label, value }: { label: string; value: string }) { return <div className="simple-fact"><span>{label}</span><strong>{value}</strong></div> }
function Risk({ label, value, detail }: { label: string; value: string; detail: string }) { const tone = value === 'LOW' || value === 'GOOD' ? 'low' : value === 'ELEVATED' || value === 'TIGHT' ? 'elevated' : 'moderate'; return <div className="risk-card"><span>{label}</span><strong className={`risk-${tone}`}>{value}</strong><small>{detail}</small></div> }
function Resource({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="resource-line"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div> }
