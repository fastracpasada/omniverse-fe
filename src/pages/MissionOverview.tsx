import { Activity, ArrowUpRight, Clock3, Compass, FlaskConical, Gauge, ShieldAlert, Wind } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import { demoMission, environmentalContext, initialTelemetry, scienceTargets } from '../data/demoMission'
import { MarsMap } from '../components/map/MarsMap'
import { useMissionStore } from '../stores/missionStore'
import { useMissionData } from '../hooks/useMissionData'
import { toScienceTarget } from '../services/missionApi'

const trend = [
  { time: '13:45', oxygen: 100, battery: 100 }, { time: '14:00', oxygen: 95, battery: 94 }, { time: '14:15', oxygen: 91, battery: 88 },
  { time: '14:30', oxygen: 85, battery: 82 }, { time: '14:45', oxygen: 82, battery: 76 }, { time: '15:00', oxygen: 77, battery: 71 },
]

function formatElapsed(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function MissionOverview() {
  const { site, targets, terrainSample, apiConnected } = useMissionData()
  const elapsed = useMissionStore((state) => state.telemetryElapsedSeconds)
  const selectedId = useMissionStore((state) => state.selectedScienceId)
  const availableTargets = targets.data?.items.map((target) => toScienceTarget(target, site)) ?? scienceTargets
  const selectedTarget = availableTargets.find((target) => target.id === selectedId) ?? availableTargets[0]
  const oxygen = Math.max(0, initialTelemetry.oxygenPercent - Math.floor((elapsed - initialTelemetry.elapsedSeconds) / 90))
  const battery = Math.max(0, initialTelemetry.batteryPercent - Math.floor((elapsed - initialTelemetry.elapsedSeconds) / 120))
  return <div className="page-wrap">
    <div className="page-heading"><div><div className="page-kicker">MISSION CONTROL / OVERVIEW</div><h1 className="page-title">Mission overview</h1><p className="page-description">Expedition status, surface context, and EVA telemetry at a glance.</p></div><div className="date-chip"><Clock3 size={13} /> SOL {String(demoMission.sol).padStart(3, '0')} <span style={{ color: 'var(--faint)' }}>/</span> {demoMission.missionTime}</div></div>

    <section className="summary-grid" aria-label="Mission summary">
      <Metric icon={<Activity size={14} />} label="Backend status" value={apiConnected ? 'CONNECTED' : 'DEMO MODE'} note={apiConnected ? 'FastAPI + database available' : 'Local data fallback active'} color={apiConnected ? 'var(--green)' : 'var(--amber)'} />
      <Metric icon={<Compass size={14} />} label="Current traverse" value="2.4 km" note="Distance from habitat · SIMULATED" />
      <Metric icon={<FlaskConical size={14} />} label="Science objectives" value="01 / 03" note="One objective in progress" color="var(--orange)" />
      <Metric icon={<ShieldAlert size={14} />} label="Habitat terrain sample" value={terrainSample.data ? String(terrainSample.data.terrain_category).toUpperCase() : 'UNAVAILABLE'} note={terrainSample.data ? `${Number(terrainSample.data.risk_score).toFixed(2)} prototype score · DEMO` : 'Backend sample unavailable'} color={terrainSample.data ? 'var(--green)' : 'var(--amber)'} />
    </section>

    <section className="dashboard-grid">
      <MarsMap />
      <div className="panel brief-panel">
        <div className="panel-heading"><div className="panel-title"><Gauge size={14} /> MISSION BRIEF</div><span className="demo-badge">SIMULATED</span></div>
        <div className="panel-body">
          <div className="brief-name"><div className="brief-mission">{demoMission.name}</div><div className="brief-crew"><span className="status-dot" style={{ width: 6, height: 6 }} />{demoMission.crew}</div></div>
          <div className="brief-grid">
            <BriefCell label="Habitat" value={site ? `SITE HABITAT · ${site.habitat_location.x_m.toFixed(0)}, ${site.habitat_location.y_m.toFixed(0)} m` : demoMission.habitat} />
            <BriefCell label="Selected destination" value={selectedTarget.name} accent />
            <BriefCell label="Route distance" value={`${selectedTarget.distanceKm.toFixed(1)} km`} />
            <BriefCell label="Est. walking duration" value="2 h 24 m" />
            <BriefCell label="EVA time remaining" value="05 h 21 m" />
            <BriefCell label="Terrain sample · DEMO" value={terrainSample.data ? `${Number(terrainSample.data.slope_deg).toFixed(1)}° slope · ${String(terrainSample.data.terrain_category)}` : 'Unavailable'} />
          </div>
          <div className="objective-preview"><div className="panel-title"><FlaskConical size={13} /> SCIENCE OBJECTIVES</div>{demoMission.objectives.map((objective, index) => <div className="objective-row" key={objective.id}><span className={`objective-check ${index === 0 ? 'done' : ''}`}>{index === 0 ? '✓' : ''}</span><span>{objective.title}</span><span className="objective-count">{index === 0 ? 'ACTIVE' : 'QUEUED'}</span></div>)}</div>
        </div>
      </div>
    </section>

    <section className="panel telemetry-section">
      <div className="panel-heading"><div className="panel-title"><Activity size={14} /> EVA TELEMETRY</div><span className="demo-badge">ALL VALUES SIMULATED</span></div>
      <div className="telemetry-grid">
        <Telemetry label="Oxygen remaining" value={`${oxygen}%`} sub="Suit supply · SIMULATED" progress={oxygen} />
        <Telemetry label="Suit battery" value={`${battery}%`} sub="Power reserve · SIMULATED" progress={battery} />
        <Telemetry label="EVA elapsed" value={formatElapsed(elapsed)} sub="Mission clock · SIMULATED" />
        <Telemetry label="Distance traveled" value={`${(2.4 + (elapsed - initialTelemetry.elapsedSeconds) / 36000).toFixed(1)} km`} sub="From habitat · SIMULATED" />
        <Telemetry label="Estimated return" value={initialTelemetry.estimatedReturn} sub="Projected window · DEMO" />
      </div>
    </section>

    <section className="bottom-grid">
      <div className="panel"><div className="panel-heading"><div className="panel-title"><Activity size={14} /> RESOURCE PROFILE</div><span className="demo-badge">SIMULATED</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ top: 5, right: 12, left: -18, bottom: 0 }}><defs><linearGradient id="oxygenFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity={.23} /><stop offset="100%" stopColor="#38bdf8" stopOpacity={0} /></linearGradient><linearGradient id="batteryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity={.16} /><stop offset="100%" stopColor="#f97316" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#26374c" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="time" tick={{ fill: '#77879c', fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis domain={[60, 100]} tick={{ fill: '#77879c', fontSize: 9 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#101c2d', border: '1px solid #34465d', borderRadius: 4, color: '#dce5ef', fontSize: 10 }} /><Area type="monotone" dataKey="oxygen" name="Oxygen" stroke="#38bdf8" strokeWidth={2} fill="url(#oxygenFill)" /><Area type="monotone" dataKey="battery" name="Battery" stroke="#f97316" strokeWidth={1.5} fill="url(#batteryFill)" /></AreaChart></ResponsiveContainer></div><div className="chart-caption"><span><span className="chart-key cyan" /> Oxygen reserve</span><span><span className="chart-key orange" /> Battery reserve</span><span>DEMO PROFILE · NOT FLIGHT DATA</span></div></div>
      <div className="panel"><div className="panel-heading"><div className="panel-title"><Wind size={14} /> ENVIRONMENTAL CONTEXT</div><span className="demo-badge">SIMULATED</span></div><div className="panel-body"><div className="environment-list">{environmentalContext.map((item) => <div className="environment-row" key={item.label}><span className="environment-label">{item.label}</span><span className="environment-value">{item.value}</span></div>)}</div><div className="warning-strip"><ShieldAlert size={13} /><span>Terrain and environment values are mock examples, not NASA observations or operational thresholds.</span></div></div></div>
    </section>
    <div className="overview-links"><Link to="/explorer" className="panel-action">Open Mars Explorer <ArrowUpRight size={13} /></Link><Link to="/route-planner" className="panel-action">Plan a traverse <ArrowUpRight size={13} /></Link><Link to="/science" className="panel-action">View science targets <ArrowUpRight size={13} /></Link></div>
  </div>
}

function Metric({ icon, label, value, note, color = 'var(--cyan)' }: { icon: React.ReactNode; label: string; value: string; note: string; color?: string }) {
  return <div className="panel metric-card"><div className="metric-label"><span className="metric-icon" style={{ color }}>{icon}</span>{label}</div><div className="metric-value" style={{ color }}>{value}</div><div className="metric-note">{note}</div></div>
}
function BriefCell({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) { return <div className="brief-cell"><div className="brief-cell-label">{label}</div><div className={`brief-cell-value ${accent ? 'orange' : ''}`}>{value}</div></div> }
function Telemetry({ label, value, sub, progress }: { label: string; value: string; sub: string; progress?: number }) { return <div className="telemetry-item"><div className="telemetry-top">{label}<span className="sim-dot" title="Simulated value" /></div><div className="telemetry-value">{value}</div>{progress !== undefined && <div className="progress-track"><div className={`progress-fill ${progress < 35 ? 'amber' : ''}`} style={{ width: `${progress}%` }} /></div>}<div className="telemetry-sub">{sub}</div></div> }