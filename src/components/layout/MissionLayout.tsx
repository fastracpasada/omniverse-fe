import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNavigation } from './TopNavigation'

export function MissionLayout() {
  return <div className="app-shell"><TopNavigation /><div className="workspace"><Sidebar /><main className="main-area"><Outlet /><div className="footer-note">MARS-NAV · DEMONSTRATION INTERFACE · NO OPERATIONAL GUIDANCE</div></main></div></div>
}