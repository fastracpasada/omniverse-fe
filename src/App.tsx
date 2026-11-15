import { Navigate, Route, Routes } from 'react-router-dom'
import { MissionLayout } from './components/layout/MissionLayout'
import { MissionOverview } from './pages/MissionOverview'
import { EVASimulation, Settings } from './pages/MissionPages'
import { ScienceExpedition } from './pages/ScienceExpedition'

export default function App() {
  return (
    <Routes>
      <Route element={<MissionLayout />}>
        <Route index element={<MissionOverview />} />
        <Route path="explorer" element={<Navigate to="/" replace />} />
        <Route path="route-planner" element={<Navigate to="/" replace />} />
        <Route path="science" element={<ScienceExpedition />} />
        <Route path="eva" element={<EVASimulation />} />
        <Route path="reports" element={<Navigate to="/" replace />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
