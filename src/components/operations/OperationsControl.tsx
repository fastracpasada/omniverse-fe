import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, Battery, Clock3, Footprints, Gauge, Pause, Plane, Play, Radio, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { MarsMap } from '../map/MarsMap'
import { initialTelemetry, scienceTargets } from '../../data/demoMission'
import { useMissionStore } from '../../stores/missionStore'
import { useMutation } from '@tanstack/react-query'
import { missionApi } from '../../services/missionApi'
import { useMissionData } from '../../hooks/useMissionData'

const modes = {
  walk: { label: 'Walking EVA', short: 'EVA', icon: Footprints, operator: 'Astronaut R. Chen', system: 'Suit and crew telemetry', accent: 'cyan' },
  rover: { label: 'Rover EVA', short: 'ROVER', icon: Truck, operator: 'Crew rover · EVA-02', system: 'Vehicle and crew telemetry', accent: 'orange' },
  air: { label: 'Scout flight', short: 'SCOUT', icon: Plane, operator: 'Autonomous scout', system: 'Uncrewed flight telemetry', accent: 'violet' },
} as const

export function OperationsControl() {
  const { apiConnected } = useMissionData()
  const elapsed = useMissionStore((state) => state.telemetryElapsedSeconds)
  const running = useMissionStore((state) => state.simulationRunning)
  const setRunning = useMissionStore((state) => state.setSimulationRunning)
  const reset = useMissionStore((state) => state.resetSimulation)
  const tick = useMissionStore((state) => state.tickSimulation)
  const mode = useMissionStore((state) => state.travelMode)
  const setMode = useMissionStore((state) => state.setTravelMode)
  const selectedId = useMissionStore((state) => state.selectedScienceId)
  const customDestination = useMissionStore((state) => state.customDestination)
  const [notice, setNotice] = useState('Ready for pre-operation checks')
  const savedRouteId = useMissionStore((state) => state.savedRouteId)
  const backendSimulation = useMissionStore((state) => state.simulation)
  const setBackendSimulation = useMissionStore((state) => state.setSimulation)
  const backendControl = apiConnected && mode === 'walk' && Boolean(savedRouteId)
  const startBackend = useMutation({ mutationFn: () => missionApi.startSimulation(savedRouteId!), onSuccess: ({ session }) => { setBackendSimulation(session); setRunning(session.status === 'running'); setNotice('Backend EVA session started') }, onError: (error) => setNotice(error.message) })
  const controlBackend = useMutation({ mutationFn: async (action: 'pause' | 'resume' | 'advance') => { if (!backendSimulation) throw new Error('Start the backend EVA session first.'); return action === 'pause' ? missionApi.pauseSimulation(backendSimulation.id) : action === 'resume' ? missionApi.resumeSimulation(backendSimulation.id) : missionApi.advanceSimulation(backendSimulation.id) }, onSuccess: (session) => { setBackendSimulation(session); setRunning(session.status === 'running'); setNotice(`Backend EVA ${session.status}`) }, onError: (error) => setNotice(error.message) })
  const resetBackend = useMutation({ mutationFn: async () => { if (backendSimulation) await missionApi.resetSimulation(backendSimulation.id) }, onSuccess: () => { setBackendSimulation(null); reset(); setNotice('Backend EVA session reset') }, onError: (error) => setNotice(error.message) })
  const target = (customDestination?.id === selectedId ? customDestination : scienceTargets.find((item) => item.id === selectedId)) ?? scienceTargets[0]
  const active = modes[mode]
  const Icon = active.icon

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [running, tick])

  const missionSeconds = backendControl && backendSimulation ? backendSimulation.sim_elapsed_s : Math.max(0, elapsed - initialTelemetry.elapsedSeconds)
  const oxygen = backendControl && backendSimulation ? backendSimulation.oxygen_remaining_pct : Math.max(0, initialTelemetry.oxygenPercent - Math.floor(missionSeconds / 90))
  const power = backendControl && backendSimulation ? backendSimulation.battery_remaining_pct : Math.max(0, initialTelemetry.batteryPercent - Math.floor(missionSeconds / (mode === 'air' ? 70 : 120)))
  const progress = backendControl && backendSimulation ? Math.min(100, Math.round(backendSimulation.distance_along_route_m / Math.max(1, backendSimulation.total_route_distance_m) * 100)) : Math.min(100, Math.round(missionSeconds / Math.max(1, target.distanceKm * (mode === 'walk' ? 1200 : mode === 'rover' ? 320 : 180)) * 100))

  const toggle = () => {
    if (backendControl) {
      if (!backendSimulation) startBackend.mutate()
      else controlBackend.mutate(backendSimulation.status === 'running' ? 'pause' : 'resume')
      return
    }
    setRunning(!running)
    setNotice(running ? `${active.label} paused` : `${active.label} started`)
  }
  const resetAll = () => { if (backendControl && backendSimulation) { resetBackend.mutate(); return }; reset(); setNotice(`${active.label} reset to pre-operation state`) }
  const returnHome = () => { setRunning(false); setNotice(mode === 'air' ? 'Scout recalled to habitat' : 'Emergency return route activated') }

  return <div className="page-wrap operations-page">
    <header className="operations-heading"><div><span className="welcome-label">SURFACE OPERATIONS / UNIFIED CONTROL</span><h1>EVA & scout controls</h1><p>Control walking, rover-assisted EVA, and autonomous reconnaissance from one workspace.</p></div><span className={`operations-status ${running ? 'running' : ''}`}><i />{running ? 'OPERATION ACTIVE' : 'STANDBY'}</span></header>

    <div className="operation-mode-tabs" role="tablist" aria-label="Operation type">{(Object.keys(modes) as Array<keyof typeof modes>).map((key) => { const item = modes[key]; const ModeIcon = item.icon; return <button key={key} role="tab" aria-selected={mode === key} className={mode === key ? 'active' : ''} onClick={() => { setRunning(false); setMode(key); setNotice(`${item.label} controls selected`) }}><ModeIcon size={18} /><span><strong>{item.label}</strong><small>{key === 'air' ? 'Uncrewed reconnaissance' : key === 'walk' ? 'Short-range surface activity' : 'Crew and cargo traverse'}</small></span></button> })}</div>

    <div className="operations-grid">
      <section className="panel operation-console">
        <div className="panel-heading"><div className="panel-title"><Icon size={14} /> {active.short} CONTROL</div><span className="demo-badge">{backendControl ? 'BACKEND EVA' : 'SIMULATED'}</span></div>
        <div className="panel-body">
          <div className="operation-identity"><span className={`operation-icon ${active.accent}`}><Icon size={22} /></span><div><h2>{active.operator}</h2><p>{active.system}</p></div><span className="status-running"><span className="status-dot" />{running ? 'RUNNING' : 'PAUSED'}</span></div>
          <div className="operation-clock"><span>ELAPSED OPERATION TIME</span><strong>{formatTime(missionSeconds)}</strong></div>
          <div className="operation-metrics"><Metric icon={<Activity />} label={mode === 'air' ? 'Signal' : 'Oxygen'} value={`${mode === 'air' ? 94 : oxygen}%`} /><Metric icon={<Battery />} label={mode === 'walk' ? 'Suit battery' : 'Power'} value={`${power}%`} /><Metric icon={<Gauge />} label="Route progress" value={`${progress}%`} /><Metric icon={<Radio />} label="Link" value="NOMINAL" /></div>
          <div className="operation-buttons"><button className="primary-button" onClick={toggle} disabled={startBackend.isPending || controlBackend.isPending}>{running ? <Pause size={14} /> : <Play size={14} />}{running ? 'Pause' : 'Start'} {active.label}</button>{backendControl && backendSimulation && <button className="secondary-button" onClick={() => controlBackend.mutate('advance')} disabled={!running || controlBackend.isPending}><Clock3 size={14} />Advance 5 min</button>}<button className="secondary-button" onClick={resetAll}><RotateCcw size={14} />Reset</button><button className="danger-button" onClick={returnHome}><AlertTriangle size={14} />{mode === 'air' ? 'Recall scout' : 'Emergency return'}</button></div>
          <div className="operation-notice" aria-live="polite"><ShieldCheck size={14} />{notice}</div>
        </div>
      </section>

      <section className="panel operation-map"><div className="panel-heading"><div className="panel-title"><Clock3 size={14} /> LIVE ROUTE</div><span className="demo-badge">DEM ROUTING</span></div><MarsMap large /><div className="panel-body traverse-readout"><span>DESTINATION<strong>{target.name}</strong></span><span>RANGE<strong>{target.distanceKm.toFixed(1)} km</strong></span><span>MODE<strong>{active.label}</strong></span><span>RISK<strong>{target.risk}</strong></span></div></section>
    </div>

    <section className="panel operation-checks"><div className="panel-heading"><div className="panel-title"><ShieldCheck size={14} /> MODE-SPECIFIC CHECKS</div><span className="demo-badge">REQUIRED</span></div><div className="panel-body operation-check-grid">{checksFor(mode).map((item, index) => <label key={item}><input type="checkbox" defaultChecked={index < 2} /><span><strong>{item}</strong><small>{index < 2 ? 'Verified in simulation' : 'Awaiting confirmation'}</small></span></label>)}</div></section>
    <div className="warning-strip"><ShieldCheck size={13} /><span>{backendControl ? 'Walking EVA uses backend-controlled simulated telemetry. Advance time explicitly; no real mission systems are controlled.' : mode === 'walk' && apiConnected ? 'Plan and save a walking EVA on the Overview before starting backend operations.' : 'Rover and scout controls remain frontend planning simulations and do not command real systems.'}</span></div>
  </div>
}

function checksFor(mode: 'walk' | 'rover' | 'air') {
  if (mode === 'air') return ['Flight battery and thermal state', 'Command and telemetry link', 'Wind and visibility review', 'Emergency landing area', 'Return-to-base reserve']
  if (mode === 'rover') return ['Crew suit integrity', 'Rover power and wheel health', 'Cabin communications', 'Repair and recovery kit', 'Walk-back reserve']
  return ['Suit pressure and oxygen', 'Crew communications', 'Navigation beacon', 'Medical and sample kit', 'Return oxygen reserve']
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div><span>{icon}{label}</span><strong>{value}</strong></div> }
function formatTime(totalSeconds: number) { const hours = Math.floor(totalSeconds / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60; return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':') }
