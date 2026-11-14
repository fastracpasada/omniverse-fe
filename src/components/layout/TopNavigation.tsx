import { useState } from 'react'
import { Check, CircleDot, Monitor, Moon, SlidersHorizontal, Sun } from 'lucide-react'
import { demoMission } from '../../data/demoMission'
import { useMissionStore } from '../../stores/missionStore'

export function TopNavigation() {
  const [displayOpen, setDisplayOpen] = useState(false)
  const colorMode = useMissionStore((state) => state.colorMode)
  const textSize = useMissionStore((state) => state.textSize)
  const setColorMode = useMissionStore((state) => state.setColorMode)
  const setTextSize = useMissionStore((state) => state.setTextSize)

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark mars-logo" role="img" aria-label="Rotating Mars globe"><span /></div>
        <div><div className="brand-name">MARS-NAV</div><div className="brand-subtitle">Mission companion</div></div>
      </div>
      <div className="topbar-site"><span className="eyebrow">Exploration site</span><span className="site-name">{demoMission.site}</span></div>
      <div className="topbar-right">
        <span className="top-indicator"><span className="status-dot" /> Systems normal</span>
        <span className="demo-badge">DEMO</span>
        <div className="display-menu-wrap">
          <button className="display-trigger" onClick={() => setDisplayOpen(!displayOpen)} aria-expanded={displayOpen} aria-haspopup="dialog"><SlidersHorizontal size={15} /><span>Display</span></button>
          {displayOpen && <div className="display-popover" role="dialog" aria-label="Display preferences">
            <div className="display-group"><span>APPEARANCE</span><div className="display-options">
              <DisplayOption active={colorMode === 'light'} label="Light" icon={<Sun size={14} />} onClick={() => setColorMode('light')} />
              <DisplayOption active={colorMode === 'dark'} label="Dark" icon={<Moon size={14} />} onClick={() => setColorMode('dark')} />
              <DisplayOption active={colorMode === 'system'} label="System" icon={<Monitor size={14} />} onClick={() => setColorMode('system')} />
            </div></div>
            <div className="display-group"><span>TEXT SIZE</span><div className="text-size-options">
              {(['compact', 'default', 'large'] as const).map((size) => <button key={size} className={textSize === size ? 'active' : ''} onClick={() => setTextSize(size)}><span className={`text-preview preview-${size}`}>Aa</span><span>{size === 'default' ? 'Standard' : size[0].toUpperCase() + size.slice(1)}</span>{textSize === size && <Check size={12} />}</button>)}
            </div></div>
          </div>}
        </div>
        <CircleDot size={16} color="#78889d" aria-label="Mission link status" />
      </div>
    </header>
  )
}

function DisplayOption({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button className={active ? 'active' : ''} onClick={onClick}>{icon}<span>{label}</span>{active && <Check size={11} />}</button>
}
