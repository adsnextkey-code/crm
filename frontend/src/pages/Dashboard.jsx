import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Building2, ListTodo, Loader, AlertTriangle, Clock, Activity as ActivityIcon,
} from 'lucide-react'
import api from '../utils/api'
import { StatCard, Avatar, Spinner, EmptyState, PageHeader, Card, relativeTime } from '../components/ui'

const ACTION_DOT_COLORS = {
  created: 'bg-emerald-500',
  updated: 'bg-blue-500',
  deleted: 'bg-red-500',
  login: 'bg-violet-500',
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchStats = async (silent) => {
      try {
        const res = await api.get('/dashboard/stats')
        if (mounted) setStats(res.data)
      } catch (err) {
        if (!silent) toast.error(err.response?.data?.message || 'Failed to load dashboard')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchStats()
    const interval = setInterval(() => fetchStats(true), 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (loading) return <Spinner label="Loading dashboard..." />

  const s = stats || {}
  const chartData = (s.clientsByServiceType || []).map((c) => ({
    name: c.serviceType,
    clients: c.count,
  }))
  const completedWeek = s.completedThisWeek ?? 0

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Agency overview at a glance" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Active Clients" value={s.totalClients} icon={Building2} />
        <StatCard label="Pending Tasks" value={s.pendingTasks} icon={ListTodo} />
        <StatCard label="In Progress" value={s.inProgressTasks} icon={Loader} />
        <StatCard label="High Priority" value={s.highPriorityTasks} icon={AlertTriangle} />
        <StatCard label="Overdue" value={s.overdueTasks} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-1 p-5">
          <h3 className="text-sm font-semibold tracking-tight text-gray-900 mb-4">Team Workload</h3>
          {(s.teamWorkload || []).length === 0 ? (
            <EmptyState icon={ActivityIcon} message="No team members yet" />
          ) : (
            <div className="space-y-1">
              {(s.teamWorkload || []).map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                  <Avatar name={m.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                    <p className="text-[11px] text-gray-400">{m.department || '-'}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium shrink-0">
                    <span className="text-gray-400" title="Assigned">{m.assigned ?? 0}</span>
                    <span className="text-amber-600" title="Pending">{m.pending ?? 0}</span>
                    <span className="text-emerald-600" title="Completed">{m.completed ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2 p-5">
          <h3 className="text-sm font-semibold tracking-tight text-gray-900 mb-4">Recent Activity</h3>
          {(s.recentActivity || []).length === 0 ? (
            <EmptyState icon={ActivityIcon} message="No recent activity" hint="Actions will appear here" />
          ) : (
            <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
              {(s.recentActivity || []).map((a, i) => (
                <div key={a._id || i} className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${ACTION_DOT_COLORS[a.action] || 'bg-gray-400'}`} />
                  <p className="text-sm text-gray-600 leading-snug">
                    <span className="font-medium text-gray-900">{a.userName}</span> {a.action}
                    {a.targetName && <> <span className="font-medium text-gray-900">{a.targetName}</span></>}
                  </p>
                  <span className="ml-auto text-[11px] text-gray-400 shrink-0 mt-0.5">{relativeTime(a.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <h3 className="text-sm font-semibold tracking-tight text-gray-900 mb-4">Clients by Service Type</h3>
          {chartData.length === 0 ? (
            <EmptyState icon={Building2} message="No clients yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="clients" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6 flex flex-col items-center justify-center h-full gap-2 text-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ListTodo size={22} />
          </div>
          <p className="text-4xl font-semibold tracking-tight text-gray-900 mt-1">{completedWeek}</p>
          <p className="text-sm text-gray-500">Tasks Completed This Week</p>
        </Card>
      </div>
    </div>
  )
}
