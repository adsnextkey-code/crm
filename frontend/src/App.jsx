import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import ManagerLayout from './layouts/ManagerLayout'
import TeamLayout from './layouts/TeamLayout'
import Login from './pages/Login'
import AcceptInvite from './pages/AcceptInvite'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Campaigns from './pages/Campaigns'
import ContentCalendar from './pages/ContentCalendar'
import Calendar from './pages/Calendar'
import Reports from './pages/Reports'
import Clients from './pages/Clients'
import Team from './pages/Team'
import Activity from './pages/Activity'
import Announcements from './pages/Announcements'
import MyDashboard from './pages/MyDashboard'
import MyTasks from './pages/MyTasks'
import MyClients from './pages/MyClients'
import MyWork from './pages/MyWork'
import MyProfile from './pages/MyProfile'
import InstallPrompt from './components/InstallPrompt'

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa]">
      <div className="h-8 w-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children, role }) {
  const { user, token, loading } = useAuth()
  if (loading) return <Loading />
  if (!token || !user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

function RootRedirect() {
  const { user, token, loading } = useAuth()
  if (loading) return <Loading />
  if (!token || !user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'manager' ? '/dashboard' : '/my-dashboard'} replace />
}

const managerPages = [
  ['/dashboard', Dashboard],
  ['/tasks', Tasks],
  ['/campaigns', Campaigns],
  ['/content', ContentCalendar],
  ['/calendar', Calendar],
  ['/reports', Reports],
  ['/clients', Clients],
  ['/team', Team],
  ['/activity', Activity],
  ['/announcements', Announcements],
  ['/profile', MyProfile],
  ['/my-profile', MyProfile],
]

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#111827',
              border: '1px solid #e5e7eb',
            },
          }}
        />
        <InstallPrompt />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/invite/:token" element={<AcceptInvite />} />
          {managerPages.map(([path, Page]) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute role="manager">
                  <ManagerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Page />} />
            </Route>
          ))}
  {[
    ['/my-dashboard', MyDashboard],
    ['/my-tasks', MyTasks],
    ['/my-clients', MyClients],
    ['/my-work', MyWork],
    ['/my-profile', MyProfile],
  ].map(([path, Page]) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute role="team">
                  <TeamLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Page />} />
            </Route>
          ))}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
