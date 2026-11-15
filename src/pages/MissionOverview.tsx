import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Battery, CheckCircle2, Clock3, Database, Footprints, MapPin, Navigation, PackageCheck, Plane, Search, ShieldCheck, Telescope, Truck } from 'lucide-react'
import { MarsMap } from '../components/map/MarsMap'
import { demoMission, environmentalContext, initialTelemetry, scienceTargets } from '../data/demoMission'
import { useMissionStore } from '../stores/missionStore'
import { marsToLocalMetres } from '../utils/marsProjection'
import type { ScienceTarget } from '../types/mission'
import { MarsWeatherBrief } from '../components/weather/MarsWeatherBrief'
import { inspectTerrain, planTerrainRoute } from '../utils/terrainRouting'
import { useMutation } from '@tanstack/react-query'
import { useMissionData } from '../hooks/useMissionData'
import { apiTargetToScienceTarget, missionApi } from '../services/missionApi'
import { isInsideBackendCoverage, mergeMissionTargets } from '../utils/missionLocations'
import { distanceRisk, SAFETY_LIMITS } from '../utils/safetyThresholds'
import { estimateMarsWeather } from '../utils/marsWeather'
import { SourceInfo } from '../components/SourceInfo'
import { MapLayerControl } from '../components/map/MapLayerControl'

type TravelMode = 'walk' | 'rover' | 'air'

const modes = {
  walk: { label: 'Walk', icon: Footprints, speed: 3, range: 'Up to 2 km', note: 'Best for nearby, low-risk destinations.' },
  rover: { label: 'Rover', icon: Truck, speed: 12, range: '2–20 km', note: 'Crew transport with cargo and emergency reserve.' },
  air: { label: 'Aerial vehicle', icon: Plane, speed: 30, range: 'Scout support', note: 'Experimental simulation; no operational crew aircraft on Mars.' },
} satisfies Record<TravelMode, { label: string; icon: typeof Footprints; speed: number; range: string; note: string }>

const habitatTarget: ScienceTarget = { id: 'habitat', name: 'HAB-01 Habitat', category: 'Mission habitat', localPosition: [0, 0], distanceKm: 0, risk: 'LOW', description: 'Primary mission habitat and safe return destination.', objective: 'Depart from or return to habitat', status: 'PLANNED', source: 'MISSION DEMO' }

function recommendation(distance: number, risk: string): TravelMode {
  if (distance <= SAFETY_LIMITS.walkingMaxDistanceKm && risk === 'LOW') return 'walk'
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
  return { id: `CUSTOM-${latitude.toFixed(5)}-${longitude.toFixed(5)}`, name: `Custom point ${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`, category: 'Latitude / longitude', localPosition, coordinates: [longitude, latitude], distanceKm, risk: distanceRisk(distanceKm), description: 'User-selected coordinate. Terrain and route safety have not been validated.', objective: 'Explore custom map point', status: 'PLANNED', source: 'CUSTOM COORDINATE' }
}

export function MissionOverview() {
  const { site, siteId, targets: apiTargets, apiConnected } = useMissionData()
  const selectedId = useMissionStore((state) => state.selectedScienceId)
  const missionConfig = useMissionStore((state) => state.missionConfig)
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
  const [departureTime, setDepartureTime] = useState('13:30')
  const setCurrentMission = useMissionStore((state) => state.setCurrentMission)
  const setBackendRoutes = useMissionStore((state) => state.setBackendRoutes)
  const setSavedRouteId = useMissionStore((state) => state.setSavedRouteId)
  const backendTargets = useMemo(() => site && apiTargets.data ? apiTargets.data.items.map((item) => apiTargetToScienceTarget(item, site)) : [], [site, apiTargets.data])
  const targetList = useMemo(() => mergeMissionTargets(backendTargets, scienceTargets), [backendTargets])
  const activeHabitat: ScienceTarget = site ? { ...habitatTarget, name: 'HAB-01 Habitat', localPosition: [site.habitat_location.x_m, site.habitat_location.y_m], description: site.local_frame_description, source: 'MISSION DEMO' } : habitatTarget
  useEffect(() => { if (targetList.length && !targetList.some((item) => item.id === selectedId) && customDestination?.id !== selectedId) selectScience(targetList[0].id) }, [targetList, selectedId, customDestination, selectScience])
  useEffect(() => { if (site && routeOrigin.id === 'habitat' && (routeOrigin.localPosition[0] !== site.habitat_location.x_m || routeOrigin.localPosition[1] !== site.habitat_location.y_m)) { setRouteOrigin(activeHabitat); setOriginQuery(activeHabitat.name) } }, [site, routeOrigin, setRouteOrigin, activeHabitat])
  const target = (customDestination?.id === selectedId ? customDestination : targetList.find((item) => item.id === selectedId)) ?? targetList[0]
  const tripDistanceKm = Math.hypot(target.localPosition[0] - routeOrigin.localPosition[0], target.localPosition[1] - routeOrigin.localPosition[1]) / 1000
  const routeResult = useMemo(() => mode === 'air' ? null : planTerrainRoute(routeOrigin.localPosition, target.localPosition, mode, routePreference), [mode, routeOrigin, target, routePreference])
  const routeComparison = useMemo(() => mode === 'air' ? null : ({ safe: planTerrainRoute(routeOrigin.localPosition, target.localPosition, mode, 'safe'), fast: planTerrainRoute(routeOrigin.localPosition, target.localPosition, mode, 'fast') }), [mode, routeOrigin, target])
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
  const routeOutcome = useMemo(() => {
    const points = routeResult?.status === 'ok' ? routeResult.points : [routeOrigin.localPosition, target.localPosition]
    const samples = points.map((point) => estimateMarsWeather(point, mode))
    const temperatures = samples.map((sample) => sample.temperatureC)
    const outcomeDistanceKm = routeResult?.status === 'ok' ? routeResult.distanceM / 1000 : mode === 'air' ? tripDistanceKm : 0
    const travelMinutes = Math.round(outcomeDistanceKm / modes[mode].speed * 60)
    return {
      etaMinutes: travelMinutes,
      minTemperatureC: Math.min(...temperatures),
      maxTemperatureC: Math.max(...temperatures),
      hazardClearanceM: routeResult?.status === 'ok' ? routeResult.minimumHazardClearanceM : 0,
      hazardExposureM: routeResult?.status === 'ok' ? routeResult.hazardExposureM : 0,
    }
  }, [routeResult, routeOrigin, target, mode, tripDistanceKm])
  const walkingUnavailable = tripDistanceKm > SAFETY_LIMITS.walkingMaxDistanceKm
  const routeUnavailable = mode !== 'air' && routeResult?.status !== 'ok'
  const returnReserveMinutes = Math.max(0, SAFETY_LIMITS.evaLimitMinutes - estimate.totalHours * 60)
  const departureMinutes = timeToMinutes(departureTime)
  const arrivalTime = minutesToTime(departureMinutes + routeOutcome.etaMinutes)
  const returnTime = minutesToTime(departureMinutes + Math.round(estimate.totalHours * 60))
  const turnaroundTime = minutesToTime(departureMinutes + SAFETY_LIMITS.evaLimitMinutes - SAFETY_LIMITS.returnReserve.highRiskBelowMin)
  const readiness = !routeUnavailable && !(mode === 'walk' && walkingUnavailable) && estimate.oxygen < oxygen && returnReserveMinutes >= SAFETY_LIMITS.returnReserve.highRiskBelowMin
  const backendRoutingAvailable = apiConnected && mode === 'walk' && isInsideBackendCoverage(routeOrigin, site) && isInsideBackendCoverage(target, site)
  const backendPlan = useMutation({
    mutationFn: async () => {
      if (!siteId || !site) throw new Error('The backend site is not available.')
      const apiTarget = apiTargets.data?.items.find((item) => item.id === target.id)
      const duration = Math.max(60, Math.ceil(estimate.totalHours * 60))
      const mission = await missionApi.createMission({ name: `${target.name} traverse`, description: `Created from the integrated MARS-NAV planner using ${mode} mode.`, site_id: siteId, start_location: { x_m: routeOrigin.localPosition[0], y_m: routeOrigin.localPosition[1] }, eva_duration_limit_min: duration, return_reserve_min: SAFETY_LIMITS.returnReserve.highRiskBelowMin, science_target_ids: apiTarget ? [apiTarget.id] : [], constraints: { max_slope_deg: SAFETY_LIMITS.surfaceMaxSlopeDeg, block_unknown_terrain: true, preferred_profile: routePreference === 'safe' ? 'safety_first' : 'shorter_distance' } })
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
      <div><span className="welcome-label">SOL {demoMission.sol} · JEZERO WESTERN DELTA</span><h1>{missionConfig.missionTitle}</h1><p>Plan a two-person science traverse while protecting slope, oxygen, energy, and return margins.</p></div>
      <div className="nominal-pill"><ShieldCheck size={17} /> Systems normal</div>
    </header>

    <section className="mission-objective-card">
      <span className="objective-icon"><Telescope size={21} /></span>
      <div><span>TEAM-DEFINED SCIENCE OBJECTIVE</span><strong>{missionConfig.scienceObjective}</strong><p>MARS-NAV recommends transport and routes; the science team owns the objective and target decision.</p></div>
      <div className="objective-success"><span>SUCCESS CRITERIA</span><strong>{missionConfig.successCriteria}</strong><small>Return to HAB-01 with at least 60 min reserve</small></div>
    </section>

    <section className={`destination-search route-search ${showOptions ? 'expanded' : ''}`} aria-label="Route search">
      <Search size={20} />
      <div className="search-field-wrap">
        <label>Plan a route</label>
        <button className="route-search-trigger" onClick={() => setShowOptions(true)} aria-expanded={showOptions}><span><small>FROM</small><strong>{routeOrigin.name}</strong></span><Navigation size={15} /><span><small>TO</small><strong>{target.name}</strong></span></button>
        {showOptions && <div className="route-search-panel">
          <div className="route-search-heading"><div><strong>Where are you traveling?</strong><small>Choose both endpoints before reviewing the route.</small></div><button onClick={() => setShowOptions(false)}>Done</button></div>
          <div className="route-endpoint"><label htmlFor="origin-search"><span>FROM</span> Starting point</label><input id="origin-search" value={originQuery} placeholder="Habitat, location, or coordinates" onChange={(event) => setOriginQuery(event.target.value)} /><div className="endpoint-results">{parsedOriginCoordinate && <button onClick={() => chooseOrigin({ ...parsedOriginCoordinate, id: `ORIGIN-${parsedOriginCoordinate.id}` })}><MapPin size={14} /><span><strong>Use these coordinates</strong><small>{parsedOriginCoordinate.name}</small></span></button>}{originChoices.slice(0, 8).map((item) => <button key={`from-${item.id}`} className={routeOrigin.id === item.id ? 'selected' : ''} onClick={() => chooseOrigin(item)}><MapPin size={14} /><span><strong>{item.name}</strong><small>{item.category} · {item.source ?? 'DENZ-FE LOCATION'} · {isInsideBackendCoverage(item, site) ? 'backend coverage' : 'local route only'}</small></span></button>)}</div></div>
          <div className="route-direction-line"><span /><Navigation size={14} /><span /></div>
          <div className="route-endpoint"><label htmlFor="destination-search"><span>TO</span> Destination</label><input id="destination-search" value={query} placeholder="Location or latitude, longitude" onChange={(event) => setQuery(event.target.value)} /><div className="endpoint-results">{parsedCoordinate && <button onClick={() => chooseCoordinate(parsedCoordinate)}><MapPin size={14} /><span><strong>Use these coordinates</strong><small>{parsedCoordinate.name}</small></span></button>}{filteredTargets.slice(0, 10).map((item) => <button key={`to-${item.id}`} className={target.id === item.id ? 'selected' : ''} onClick={() => chooseTarget(item.id)}><MapPin size={14} /><span><strong>{item.name}</strong><small>{item.category} · {item.source ?? 'DENZ-FE LOCATION'} · {isInsideBackendCoverage(item, site) ? 'backend coverage' : 'local route only'}</small></span></button>)}</div></div>
          <div className="route-search-summary"><span>{tripDistanceKm.toFixed(1)} km between points</span><button onClick={() => setShowOptions(false)}>Use this route</button></div>
        </div>}
      </div>
      <button className="search-action" onClick={() => setShowOptions(true)}>Change route</button>
      <div className="destination-help">Location references <SourceInfo label="Named references use NASA mission maps and the USGS–IAU Gazetteer. Mission-area markers are approximate; click the map for any custom point." href="https://planetarynames.wr.usgs.gov/" /></div>
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
          <div className="route-choice-row"><button className={routePreference === 'safe' ? 'selected' : ''} onClick={() => setRoutePreference('safe')}><ShieldCheck size={18} /><span><strong>Safety-first</strong><small>Weights slope and hazard clearance</small></span></button><button className={routePreference === 'fast' ? 'selected' : ''} onClick={() => setRoutePreference('fast')}><Navigation size={18} /><span><strong>Fastest traversable</strong><small>Minimizes distance within hard limits</small></span></button></div>
          {routeComparison && <RouteComparison safe={routeComparison.safe} fast={routeComparison.fast} selected={routePreference} />}
          <div className="route-outcome-grid" aria-live="polite">
            <Outcome label="ONE-WAY ETA" value={`${routeOutcome.etaMinutes} min`} detail={`${routePreference === 'safe' ? 'Safety-first' : 'Fastest'} route at ${modes[mode].speed} km/h`} />
            <Outcome label="HAZARD EXPOSURE" value={mode === 'air' ? 'N/A' : `${(routeOutcome.hazardExposureM / 1000).toFixed(1)} km`} detail={`Path within 1.2 km of modeled hazard · ${Math.round(routeOutcome.hazardClearanceM)} m minimum`} />
            <Outcome label="THERMAL EXPOSURE" value={`${routeOutcome.minTemperatureC} to ${routeOutcome.maxTemperatureC}°C`} detail="Estimated range sampled along this path" />
            <Outcome label="RETURN RESERVE" value={`${Math.round(returnReserveMinutes)} min`} detail="After travel and science activity" />
          </div>
          <div className="mission-schedule"><label>PLANNED DEPARTURE<input type="time" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} /></label><Fact label="Target arrival" value={`${arrivalTime} LMST`} /><Fact label="Planned return" value={`${returnTime} LMST`} /><Fact label="Mandatory turnaround" value={`${turnaroundTime} LMST`} /></div>
          {routeResult?.status === 'ok' && <RouteProfile result={routeResult} />}
          <div className="route-confidence"><span><strong>ROUTE CONFIDENCE · MEDIUM</strong><small>Distance ±5% · slope ±2° · 250 m planning grid · modeled hazard coverage</small></span><SourceInfo label="Confidence reflects DEM resampling, approximate target placement, and modeled hazards. It is a planning characterization, not a statistical navigation guarantee." /></div>
          {routeUnavailable && <div className="no-route-warning"><AlertTriangle size={17} /><span><strong>{routeResult?.status === 'outside_coverage' ? 'Outside terrain coverage' : 'No traversable surface route'}</strong><small>{routeResult?.reason} Choose another endpoint, mode, or route profile.</small></span></div>}
          <div className="risk-grid"><Risk label="Terrain" value={routeResult?.status === 'ok' ? (routeResult.maximumSlopeDeg <= 5 ? 'LOW' : routeResult.maximumSlopeDeg <= 10 ? 'MODERATE' : 'ELEVATED') : target.risk} detail={routeResult?.status === 'ok' ? `${routeResult.maximumSlopeDeg.toFixed(1)}° max · ${routeResult.elevationGainM.toFixed(0)} m gain` : 'Route terrain unavailable'} /><Risk label="Environment" value="MODERATE" detail={environmentalContext[1].value} /><Risk label="Communications" value="LOW" detail="Modeled relay coverage" /><Risk label="Return margin" value={returnReserveMinutes >= 90 ? 'GOOD' : returnReserveMinutes >= 60 ? 'MODERATE' : 'TIGHT'} detail={`${Math.round(returnReserveMinutes)} min EVA reserve`} /></div>
          <section className="parameter-guide" aria-labelledby="parameter-guide-title">
            <div><span>PARAMETER GUIDE</span><strong id="parameter-guide-title">What qualifies as Low, Medium, or High</strong></div>
            <div className="parameter-table" role="table" aria-label="Mission parameter thresholds">
              <div className="parameter-row parameter-head" role="row"><span>Parameter</span><span className="risk-low">Low</span><span className="risk-moderate">Medium</span><span className="risk-elevated">High</span></div>
              <div className="parameter-row" role="row"><strong>Terrain slope</strong><span>0–5°</span><span>&gt;5–10°</span><span>&gt;10–15°</span></div>
              <div className="parameter-row" role="row"><strong>Route distance</strong><span>0–2 km</span><span>&gt;2–8 km</span><span>&gt;8 km</span></div>
              <div className="parameter-row" role="row"><strong>Wind speed</strong><span>0–5 m/s</span><span>&gt;5–10 m/s</span><span>&gt;10 m/s</span></div>
              <div className="parameter-row" role="row"><strong>Return reserve</strong><span>&gt;90 min</span><span>60–90 min</span><span>&lt;60 min</span></div>
            </div>
            <small>Planning thresholds for this simulation. Values above 15° slope are excluded from surface routes.</small>
          </section>
        </section>

        <section className="travel-section evidence-section">
          <div className="travel-section-heading"><div><span>4</span><div><h2>Verify the evidence</h2><p>Know what is observed, derived, or modeled before approving the trip.</p></div></div></div>
          <div className="evidence-grid">
            <DataEvidence icon={<Database />} type="OPTICAL" status="NASA OBSERVATION" title="MRO CTX Jezero mosaic" detail="Orbital surface context delivered through NASA Mars Trek WMTS." source="NASA Mars Trek · MRO Context Camera Jezero mosaic" href="https://trek.nasa.gov/mars/" />
            <DataEvidence icon={<Database />} type="TOPOGRAPHIC" status="DERIVED" title="USGS CTX elevation + slope" detail="20 m source resampled to a 250 m planning grid; slope is calculated locally." source="USGS/NASA CTX terrain product; slope derived locally" href="https://astrogeology.usgs.gov/" />
            <DataEvidence icon={<Database />} type="THERMOPHYSICAL" status="NASA OBSERVATION" title="MGS TES thermal inertia" detail="Independent global surface-property layer delivered by NASA Mars Trek WMTS." source="Mars Global Surveyor Thermal Emission Spectrometer · global thermal inertia" href="https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars" />
            <DataEvidence icon={<Database />} type="ATMOSPHERIC" status="MODEL ESTIMATE" title="MEDA-informed weather context" detail="Location-aware planning estimate, not a live forecast or operational measurement." source="Perseverance MEDA observation context · NASA PDS" href="https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda_old.html" />
          </div>
          <div className="data-caution"><AlertTriangle size={15} /><span><strong>Hazards and communications remain modeled.</strong> They are planning demonstrations and must not be interpreted as surveyed operational products.</span></div>
        </section>
      </div>

      <aside className="trip-sidebar">
        <MapLayerControl />
        <section className="trip-summary-card">
          <span className="simple-section-label">SELECTED TRIP · {target.source ?? 'MISSION DEMO'}</span><h2>{target.name}</h2><p>{target.description}</p>
          <div className="summary-facts"><Fact label="Starting from" value={routeOrigin.name} /><Fact label="Routed distance" value={routeUnavailable ? 'No route' : `${routeDistanceKm.toFixed(1)} km`} /><Fact label="Travel mode" value={modes[mode].label} /><Fact label="Total mission time" value={routeUnavailable ? '—' : `${estimate.totalHours.toFixed(1)} h`} /></div>
        </section>

        <section className="surface-context-card">
          <img src="https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia24/pia24485/PIA24485.jpg?crop=faces%2Cfocalpoint&fit=crop&h=520&w=900" alt="Perseverance Mastcam-Z view toward the Jezero delta remnant" />
          <div><span>DESTINATION CONTEXT · PIA24485</span><strong>Recognize the delta remnant <SourceInfo label="PIA24485 · Perseverance Mastcam-Z · NASA/JPL-Caltech/ASU/MSSS" href="https://science.nasa.gov/photojournal/perseverance-view-of-the-delta-in-jezero-crater/" /></strong><p>Look for the raised, dark-brown layered deposit in the middle distance. The foreground boulder demonstrates the obstacle scale the crew may encounter.</p></div>
        </section>

        <MarsWeatherBrief origin={routeOrigin} destination={target} mode={mode} />

        <section className="resource-card">
          <div className="side-card-title"><PackageCheck size={18} /><div><h3>Required resources</h3><p>Includes a 25% planning reserve</p></div></div>
          <div className="resource-list"><Resource icon={<Activity />} label="Suit oxygen" value={`${estimate.oxygen}% capacity`} /><Resource icon={<Battery />} label={mode === 'rover' ? 'Rover energy' : 'Power reserve'} value={`${estimate.power}${mode === 'rover' ? ' kWh' : '%'}`} /><Resource icon={<PackageCheck />} label="Crew water" value={`${estimate.water} L`} /><Resource icon={<Clock3 />} label="Time allocation" value={`${estimate.totalHours.toFixed(1)} h`} /></div>
          <div className="packing-list"><span>PACKING CHECK</span><label><input type="checkbox" defaultChecked /> Emergency oxygen</label><label><input type="checkbox" defaultChecked /> Communications beacon</label><label><input type="checkbox" /> Science tools</label><label><input type="checkbox" /> Medical kit</label>{mode === 'rover' && <label><input type="checkbox" /> Rover repair kit</label>}</div>
        </section>

        <section className={`readiness-card ${readiness ? 'ready' : 'hold'}`}><div><CheckCircle2 size={21} /><span><strong>{readiness ? (mode === 'air' ? 'Scout flight ready for review' : 'Trip ready for review') : 'Trip requires changes'}</strong><small>{backendRoutingAvailable ? 'Inside backend coverage · walking EVA will be planned and saved by the backend.' : mode === 'air' ? 'Uncrewed reconnaissance remains a frontend simulation.' : mode === 'walk' ? 'Location remains available using the local route because it is outside backend terrain coverage.' : 'Rover planning remains modeled locally until backend mode support is added.'}</small></span></div><button disabled={!readiness || backendPlan.isPending} onClick={() => backendRoutingAvailable ? backendPlan.mutate() : setPlanConfirmed(true)}>{backendPlan.isPending ? 'Planning with backend…' : mode === 'air' ? 'Confirm scout plan' : backendRoutingAvailable ? 'Plan & save walking EVA' : 'Confirm local trip plan'}</button>{backendPlan.error && <p className="risk-elevated">{backendPlan.error.message}</p>}<p>{backendRoutingAvailable ? 'Backend route available' : apiConnected ? 'Backend connected · selected trip uses local routing' : 'Local simulation · backend unavailable'}</p></section>
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
function DataEvidence({ icon, type, status, title, detail, source, href }: { icon: React.ReactNode; type: string; status: string; title: string; detail: string; source: string; href: string }) { return <div className="evidence-card"><span>{icon}</span><div><small>{type} · {status}</small><strong>{title} <SourceInfo label={source} href={href} /></strong><p>{detail}</p></div></div> }
function Outcome({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="route-outcome"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div> }
function RouteProfile({ result }: { result: ReturnType<typeof planTerrainRoute> }) {
  const samples = result.points.map((point, index) => ({ index, elevation: inspectTerrain(point)?.elevationM ?? 0 }))
  const minimum = Math.min(...samples.map((item) => item.elevation)); const maximum = Math.max(...samples.map((item) => item.elevation)); const range = Math.max(1, maximum - minimum)
  const polyline = samples.map((item) => `${samples.length === 1 ? 0 : item.index / (samples.length - 1) * 100},${42 - (item.elevation - minimum) / range * 34}`).join(' ')
  return <section className="route-profile"><div><span>ROUTE ELEVATION PROFILE</span><strong>{minimum.toFixed(0)} to {maximum.toFixed(0)} m</strong><small>{result.distanceM.toFixed(0)} m route · {result.maximumSlopeDeg.toFixed(1)}° peak slope</small></div><svg viewBox="0 0 100 48" preserveAspectRatio="none" role="img" aria-label="Elevation along selected route"><defs><linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7DB8B5" stopOpacity=".45"/><stop offset="1" stopColor="#7DB8B5" stopOpacity="0"/></linearGradient></defs><polygon points={`0,48 ${polyline} 100,48`} fill="url(#profile-fill)"/><polyline points={polyline} fill="none" stroke="#7DB8B5" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/></svg></section>
}
function timeToMinutes(value: string) { const [hours, minutes] = value.split(':').map(Number); return (hours || 0) * 60 + (minutes || 0) }
function minutesToTime(value: number) { const normalized = ((value % 1440) + 1440) % 1440; return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}` }
function RouteComparison({ safe, fast, selected }: { safe: ReturnType<typeof planTerrainRoute>; fast: ReturnType<typeof planTerrainRoute>; selected: 'safe' | 'fast' }) {
  const valid = safe.status === 'ok' && fast.status === 'ok'
  const distanceDelta = valid ? safe.distanceM - fast.distanceM : 0
  const slopeDelta = valid ? fast.maximumSlopeDeg - safe.maximumSlopeDeg : 0
  const exposureDelta = valid ? fast.hazardExposureM - safe.hazardExposureM : 0
  const explanation = !valid
    ? 'Only one traversable alternative is currently available.'
    : selected === 'safe'
      ? `Adds ${(Math.max(0, distanceDelta) / 1000).toFixed(1)} km and avoids ${(Math.max(0, exposureDelta) / 1000).toFixed(1)} km of hazard exposure; peak slope changes by ${slopeDelta.toFixed(1)}°.`
      : `Saves ${(Math.max(0, distanceDelta) / 1000).toFixed(1)} km but adds ${(Math.max(0, exposureDelta) / 1000).toFixed(1)} km of travel near the modeled hazard.`
  return <div className="route-explanation"><div><ShieldCheck size={15} /><span><strong>{selected === 'safe' ? 'Why the safety-first route?' : 'What changes on the fastest route?'}</strong><small>{explanation}</small></span></div><div className="comparison-values"><span>SAFE<strong>{safe.status === 'ok' ? `${(safe.distanceM / 1000).toFixed(1)} km · ${(safe.hazardExposureM / 1000).toFixed(1)} km exposed` : 'NO ROUTE'}</strong></span><span>FASTEST<strong>{fast.status === 'ok' ? `${(fast.distanceM / 1000).toFixed(1)} km · ${(fast.hazardExposureM / 1000).toFixed(1)} km exposed` : 'NO ROUTE'}</strong></span></div></div>
}
