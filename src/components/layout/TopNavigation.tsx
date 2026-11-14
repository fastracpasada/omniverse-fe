import { Activity, CircleDot, Orbit } from 'lucide-react'
import { demoMission } from '../../data/demoMission'
import { useMissionData } from '../../hooks/useMissionData'

export function TopNavigation() {
  const { health, site } = useMissionData()
  const connected = health.data?.database === true
  const siteName = site?.name ?? demoMission.site
  const coordinateLabel = site ? `${site.center_latitude_deg.toFixed(2)}° N / ${site.center_longitude_deg_east.toFixed(2)}° E` : demoMission.coordinates
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true"><Orbit size={19} /></div>
        <div><div className="brand-name">MARS-NAV</div><div className="brand-subtitle">NASA Space Apps · Mission Systems</div></div>
      </div>
      <div className="topbar-site"><span className="eyebrow">Active exploration site</span><span className="site-name">{siteName} <span style={{ color: 'var(--orange)' }}>·</span> {coordinateLabel}</span></div>
      <div className="topbar-right">
        <span className="top-indicator"><span className="status-dot" style={{ background: connected ? 'var(--green)' : health.isError ? 'var(--amber)' : 'var(--cyan)' }} />{connected ? 'API connected' : health.isError ? 'Local demo fallback' : 'Connecting API'}</span>
        <span className="demo-badge">{site?.is_demo ? 'BACKEND DEMO SEED' : 'SIMULATION MODE'}</span>
        <span className="mission-clock"><Activity size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />SOL {String(demoMission.sol).padStart(3, '0')} · {demoMission.missionTime}</span>
        <CircleDot size={16} color="#78889d" aria-label="Mission link status" />
      </div>
    </header>
  )
}