import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Zap, ListTodo, User, LogOut, Search, LayoutDashboard, Building2, Briefcase } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../components/NotificationBell'
import CommandPalette, { useCommandPalette } from '../components/CommandPalette'
import { Avatar } from '../components/ui'

const NAV_ITEMS = [
  { to: '/my-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/my-tasks', label: 'My Tasks', icon: ListTodo },
  { to: '/my-clients', label: 'My Clients', icon: Building2 },
  { to: '/my-work', label: 'My Work', icon: Briefcase },
  { to: '/my-profile', label: 'My Profile', icon: User },
]

export default function TeamLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const palette = useCommandPalette()

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-[#f7f8fa] standalone-safe">
      <aside className="fixed inset-y-0 left-0 w-[240px] bg-white border-r border-gray-200 flex flex-col z-40">
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-gray-100">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
            <Zap size={16} />
          </div>
          <div>
            <p className="font-semibold tracking-tight text-gray-900 leading-none">Agency CRM</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Team Portal</p>
          </div>
        </div>

        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
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
            onClick={() => palette.setOpen(true)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-150"
          >
            <Search size={16} />
            Search
            <kbd className="ml-auto text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
              Ctrl K
            </kbd>
          </button>
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <Avatar name={user?.name} size="md" src={user?.avatar} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize truncate">
                {[user?.designation, user?.department].filter(Boolean).join(' · ') || 'Team Member'}
              </p>
            </div>
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

      <main className="ml-[240px] flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-12 bg-[#f7f8fa] flex items-center justify-end px-6 gap-1">
          <NotificationBell />
        </header>
        <div className="flex-1 px-6 pb-10">
          <div className="max-w-[1200px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      <CommandPalette open={palette.open} onClose={() => palette.setOpen(false)} />
    </div>
  )
}
