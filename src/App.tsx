import { Navigate, Route, Routes } from 'react-router-dom'
import { MissionLayout } from './components/layout/MissionLayout'
import { MissionOverview } from './pages/MissionOverview'
import { MarsExplorer, ScienceObjectives, EVASimulation, MissionReports, Settings } from './pages/MissionPages'

export default function App() {
  return (
    <Routes>
      <Route element={<MissionLayout />}>
        <Route index element={<MissionOverview />} />
        <Route path="explorer" element={<MarsExplorer />} />
        <Route path="route-planner" element={<Navigate to="/" replace />} />
        <Route path="science" element={<ScienceObjectives />} />
        <Route path="eva" element={<EVASimulation />} />
        <Route path="reports" element={<MissionReports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
