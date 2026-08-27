import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Zap,
  LayoutDashboard,
  KanbanSquare,
  Megaphone,
  CalendarDays,
  Calendar,
  BarChart3,
  Building2,
  Users,
  ScrollText,
  LogOut,
  Search,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../components/NotificationBell'
import CommandPalette, { useCommandPalette } from '../components/CommandPalette'
import { Avatar } from '../components/ui'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: KanbanSquare },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/content', label: 'Content', icon: CalendarDays },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/clients', label: 'Clients', icon: Building2 },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/announcements', label: 'Notices', icon: ScrollText },
  { to: '/activity', label: 'Activity', icon: ScrollText },
]

export default function ManagerLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const palette = useCommandPalette()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-[#f7f8fa] standalone-safe">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar: Sliding drawer on mobile, static on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 w-[240px] bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <Zap size={16} />
            </div>
            <p className="font-semibold tracking-tight text-gray-900">Agency CRM</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-4 pt-2 border-t border-gray-100 space-y-0.5">
          <button
            onClick={() => {
              setSidebarOpen(false)
              palette.setOpen(true)
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-150"
          >
            <Search size={16} />
            Search
            <kbd className="ml-auto text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
              Ctrl K
            </kbd>
          </button>
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-150">
            <NavLink
              to="/profile"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2.5 min-w-0 flex-1"
              title="View & edit profile"
            >
              <Avatar name={user?.name} size="md" src={user?.avatar} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate hover:text-indigo-600">{user?.name}</p>
                {user?._isSuperAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 mt-0.5">
                    OWNER
                  </span>
                ) : (
                  <p className="text-xs text-gray-400 capitalize">{user?.role || 'Manager'}</p>
                )}
              </div>
            </NavLink>
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150 shrink-0"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-0 md:ml-[240px] flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 bg-white md:bg-[#f7f8fa] border-b border-gray-200 md:border-transparent flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-indigo-600 flex items-center justify-center text-white shrink-0">
                <Zap size={13} />
              </div>
              <span className="font-semibold text-sm text-gray-900">Agency CRM</span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => palette.setOpen(true)}
              className="flex items-center gap-2 pl-2.5 pr-3 md:pr-16 py-1.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-400 hover:border-gray-300 transition-colors duration-150 shadow-xs"
            >
              <Search size={14} />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden md:inline-block ml-6 text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded px-1 py-0.5">
                Ctrl K
              </kbd>
            </button>
            <NotificationBell />
          </div>
        </header>

        <div className="flex-1 px-3 sm:px-6 py-4 sm:py-6">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      <CommandPalette open={palette.open} onClose={() => palette.setOpen(false)} />
    </div>
  )
}
