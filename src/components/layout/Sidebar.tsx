import { Activity, ChevronLeft, ChevronRight, FileText, FlaskConical, Gauge, Map, Settings2, ShieldCheck, Wifi } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useMissionStore } from '../../stores/missionStore'

const navigation = [
  { to: '/', label: 'Overview', icon: Gauge, end: true },
  { to: '/explorer', label: 'Explore map', icon: Map },
  { to: '/science', label: 'Science', icon: FlaskConical },
  { to: '/eva', label: 'Operations', icon: Activity },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

export function Sidebar() {
  const collapsed = useMissionStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useMissionStore((state) => state.toggleSidebar)
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="side-label">Workspace</div>
      <nav className="nav-list" aria-label="Mission navigation">
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} title={label} aria-label={label} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Icon size={16} aria-hidden="true" /><span className="nav-text">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        {!collapsed && <div className="connection-box"><div className="connection-head"><Wifi size={13} color="var(--green)" /> Local demo environment</div><div className="connection-copy">Backend connection is not configured. Mission values are simulated.</div></div>}
        <button className="collapse-button" onClick={toggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}<span className="collapse-text">Collapse sidebar</span>
        </button>
        {!collapsed && <div style={{ padding: '9px 12px 0', color: '#526179', font: '8px ui-monospace, monospace' }}><ShieldCheck size={11} style={{ verticalAlign: '-2px', marginRight: 5 }} />DEMO DATA ONLY</div>}
      </div>
    </aside>
  )
}
