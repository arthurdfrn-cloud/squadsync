import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import TeamPage from './pages/TeamPage'
import SettingsPage from './pages/SettingsPage'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/team/:slug" element={<TeamPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  )
}
