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

import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
          <div className="max-w-md bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-xs text-gray-500 mb-4">
              An unexpected error occurred while loading the app.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa]">
      <div className="h-8 w-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )
}

function getEffectiveRole(user) {
  if (!user) return 'team'
  if (user.role === 'manager' || user.role === 'superadmin' || user._isSuperAdmin) {
    return 'manager'
  }
  return 'team'
}

function ProtectedRoute({ children, role }) {
  const { user, token, loading } = useAuth()
  if (loading) return <Loading />
  if (!token || !user) return <Navigate to="/login" replace />
  const effectiveRole = getEffectiveRole(user)
  if (role && effectiveRole !== role) {
    return <Navigate to={effectiveRole === 'manager' ? '/dashboard' : '/my-dashboard'} replace />
  }
  return children
}

function RootRedirect() {
  const { user, token, loading } = useAuth()
  if (loading) return <Loading />
  if (!token || !user) return <Navigate to="/login" replace />
  const effectiveRole = getEffectiveRole(user)
  return <Navigate to={effectiveRole === 'manager' ? '/dashboard' : '/my-dashboard'} replace />
}

function ProfileWrapper() {
  const { user } = useAuth()
  const effectiveRole = getEffectiveRole(user)
  return effectiveRole === 'manager' ? <ManagerLayout /> : <TeamLayout />
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
]

const teamPages = [
  ['/my-dashboard', MyDashboard],
  ['/my-tasks', MyTasks],
  ['/my-clients', MyClients],
  ['/my-work', MyWork],
]

export default function App() {
  return (
    <ErrorBoundary>
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
            {teamPages.map(([path, Page]) => (
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
            {['/my-profile', '/profile'].map((path) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute>
                    <ProfileWrapper />
                  </ProtectedRoute>
                }
              >
                <Route index element={<MyProfile />} />
              </Route>
            ))}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
