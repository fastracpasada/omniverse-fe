import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useMissionStore } from '../../stores/missionStore'
import { Sidebar } from './Sidebar'
import { TopNavigation } from './TopNavigation'
import { MissionGuide } from '../guide/MissionGuide'

export function MissionLayout() {
  const colorMode = useMissionStore((state) => state.colorMode)
  const textSize = useMissionStore((state) => state.textSize)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const update = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const resolvedTheme = colorMode === 'system' ? (systemDark ? 'dark' : 'light') : colorMode
  return <div className={`app-shell theme-${resolvedTheme} text-${textSize}`}><TopNavigation /><div className="workspace"><Sidebar /><main className="main-area"><Outlet /><div className="footer-note">MARS-NAV · SIMULATED DATA · NOT FOR OPERATIONAL USE</div></main></div><MissionGuide /></div>
}
