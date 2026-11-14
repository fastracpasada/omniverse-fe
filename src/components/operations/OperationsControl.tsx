import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, Battery, Clock3, Footprints, Gauge, Pause, Plane, Play, Radio, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { MarsMap } from '../map/MarsMap'
import { initialTelemetry, scienceTargets } from '../../data/demoMission'
import { useMissionStore } from '../../stores/missionStore'

const modes = {
  walk: { label: 'Walking EVA', short: 'EVA', icon: Footprints, operator: 'Astronaut R. Chen', system: 'Suit and crew telemetry', accent: 'cyan' },
  rover: { label: 'Rover EVA', short: 'ROVER', icon: Truck, operator: 'Crew rover · EVA-02', system: 'Vehicle and crew telemetry', accent: 'orange' },
  air: { label: 'Scout flight', short: 'SCOUT', icon: Plane, operator: 'Autonomous scout', system: 'Uncrewed flight telemetry', accent: 'violet' },
} as const

export function OperationsControl() {
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
  const target = (customDestination?.id === selectedId ? customDestination : scienceTargets.find((item) => item.id === selectedId)) ?? scienceTargets[0]
  const active = modes[mode]
  const Icon = active.icon

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [running, tick])

  const missionSeconds = Math.max(0, elapsed - initialTelemetry.elapsedSeconds)
  const oxygen = Math.max(0, initialTelemetry.oxygenPercent - Math.floor(missionSeconds / 90))
  const power = Math.max(0, initialTelemetry.batteryPercent - Math.floor(missionSeconds / (mode === 'air' ? 70 : 120)))
  const progress = Math.min(100, Math.round(missionSeconds / Math.max(1, target.distanceKm * (mode === 'walk' ? 1200 : mode === 'rover' ? 320 : 180)) * 100))

  const toggle = () => {
    setRunning(!running)
    setNotice(running ? `${active.label} paused` : `${active.label} started`)
  }
  const resetAll = () => { reset(); setNotice(`${active.label} reset to pre-operation state`) }
  const returnHome = () => { setRunning(false); setNotice(mode === 'air' ? 'Scout recalled to habitat' : 'Emergency return route activated') }

  return <div className="page-wrap operations-page">
    <header className="operations-heading"><div><span className="welcome-label">SURFACE OPERATIONS / UNIFIED CONTROL</span><h1>EVA & scout controls</h1><p>Control walking, rover-assisted EVA, and autonomous reconnaissance from one workspace.</p></div><span className={`operations-status ${running ? 'running' : ''}`}><i />{running ? 'OPERATION ACTIVE' : 'STANDBY'}</span></header>

    <div className="operation-mode-tabs" role="tablist" aria-label="Operation type">{(Object.keys(modes) as Array<keyof typeof modes>).map((key) => { const item = modes[key]; const ModeIcon = item.icon; return <button key={key} role="tab" aria-selected={mode === key} className={mode === key ? 'active' : ''} onClick={() => { setRunning(false); setMode(key); setNotice(`${item.label} controls selected`) }}><ModeIcon size={18} /><span><strong>{item.label}</strong><small>{key === 'air' ? 'Uncrewed reconnaissance' : key === 'walk' ? 'Short-range surface activity' : 'Crew and cargo traverse'}</small></span></button> })}</div>

    <div className="operations-grid">
      <section className="panel operation-console">
        <div className="panel-heading"><div className="panel-title"><Icon size={14} /> {active.short} CONTROL</div><span className="demo-badge">SIMULATED</span></div>
        <div className="panel-body">
          <div className="operation-identity"><span className={`operation-icon ${active.accent}`}><Icon size={22} /></span><div><h2>{active.operator}</h2><p>{active.system}</p></div><span className="status-running"><span className="status-dot" />{running ? 'RUNNING' : 'PAUSED'}</span></div>
          <div className="operation-clock"><span>ELAPSED OPERATION TIME</span><strong>{formatTime(missionSeconds)}</strong></div>
          <div className="operation-metrics"><Metric icon={<Activity />} label={mode === 'air' ? 'Signal' : 'Oxygen'} value={`${mode === 'air' ? 94 : oxygen}%`} /><Metric icon={<Battery />} label={mode === 'walk' ? 'Suit battery' : 'Power'} value={`${power}%`} /><Metric icon={<Gauge />} label="Route progress" value={`${progress}%`} /><Metric icon={<Radio />} label="Link" value="NOMINAL" /></div>
          <div className="operation-buttons"><button className="primary-button" onClick={toggle}>{running ? <Pause size={14} /> : <Play size={14} />}{running ? 'Pause' : 'Start'} {active.label}</button><button className="secondary-button" onClick={resetAll}><RotateCcw size={14} />Reset</button><button className="danger-button" onClick={returnHome}><AlertTriangle size={14} />{mode === 'air' ? 'Recall scout' : 'Emergency return'}</button></div>
          <div className="operation-notice" aria-live="polite"><ShieldCheck size={14} />{notice}</div>
        </div>
      </section>

      <section className="panel operation-map"><div className="panel-heading"><div className="panel-title"><Clock3 size={14} /> LIVE ROUTE</div><span className="demo-badge">DEM ROUTING</span></div><MarsMap large /><div className="panel-body traverse-readout"><span>DESTINATION<strong>{target.name}</strong></span><span>RANGE<strong>{target.distanceKm.toFixed(1)} km</strong></span><span>MODE<strong>{active.label}</strong></span><span>RISK<strong>{target.risk}</strong></span></div></section>
    </div>

    <section className="panel operation-checks"><div className="panel-heading"><div className="panel-title"><ShieldCheck size={14} /> MODE-SPECIFIC CHECKS</div><span className="demo-badge">REQUIRED</span></div><div className="panel-body operation-check-grid">{checksFor(mode).map((item, index) => <label key={item}><input type="checkbox" defaultChecked={index < 2} /><span><strong>{item}</strong><small>{index < 2 ? 'Verified in simulation' : 'Awaiting confirmation'}</small></span></label>)}</div></section>
    <div className="warning-strip"><ShieldCheck size={13} /><span>Unified controls are a planning simulation. They do not command real suits, rovers, aircraft, or NASA mission systems.</span></div>
  </div>
}

function checksFor(mode: 'walk' | 'rover' | 'air') {
  if (mode === 'air') return ['Flight battery and thermal state', 'Command and telemetry link', 'Wind and visibility review', 'Emergency landing area', 'Return-to-base reserve']
  if (mode === 'rover') return ['Crew suit integrity', 'Rover power and wheel health', 'Cabin communications', 'Repair and recovery kit', 'Walk-back reserve']
  return ['Suit pressure and oxygen', 'Crew communications', 'Navigation beacon', 'Medical and sample kit', 'Return oxygen reserve']
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div><span>{icon}{label}</span><strong>{value}</strong></div> }
function formatTime(totalSeconds: number) { const hours = Math.floor(totalSeconds / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60; return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':') }
