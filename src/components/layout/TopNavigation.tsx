import { Activity, CircleDot, Orbit } from 'lucide-react'
import { demoMission } from '../../data/demoMission'

export function TopNavigation() {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true"><Orbit size={19} /></div>
        <div><div className="brand-name">MARS-NAV</div><div className="brand-subtitle">NASA Space Apps · Mission Systems</div></div>
      </div>
      <div className="topbar-site"><span className="eyebrow">Active exploration site</span><span className="site-name">{demoMission.site} <span style={{ color: 'var(--orange)' }}>·</span> {demoMission.coordinates}</span></div>
      <div className="topbar-right">
        <span className="top-indicator"><span className="status-dot" /> Mission nominal</span>
        <span className="demo-badge">SIMULATION MODE</span>
        <span className="mission-clock"><Activity size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />SOL {String(demoMission.sol).padStart(3, '0')} · {demoMission.missionTime}</span>
        <CircleDot size={16} color="#78889d" aria-label="Mission link status" />
      </div>
    </header>
  )
}