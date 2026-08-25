import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { CheckCircle2, AlertTriangle, Users, DollarSign, Clock } from 'lucide-react'
import api from '../utils/api'
import { Card, StatCard, Spinner, EmptyState, PageHeader } from '../components/ui'
import { formatDuration } from '../components/TaskModal'

const CHART_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export default function Reports() {
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/dashboard/stats'), api.get('/tasks'), api.get('/clients')])
      .then(([sRes, tRes, cRes]) => {
        setStats(sRes.data || {})
        setTasks(tRes.data || [])
        setClients(cRes.data || [])
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load reports'))
      .finally(() => setLoading(false))
  }, [])

  const weeklyData = useMemo(() => {
    const weeks = []
    const now = startOfWeek(new Date())
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now)
      start.setDate(now.getDate() - i * 7)
      const end = new Date(start)
      end.setDate(start.getDate() + 7)
      weeks.push({
        label: `${start.getMonth() + 1}/${start.getDate()}`,
        start: start.getTime(),
        end: end.getTime(),
        completed: 0,
      })
    }
    tasks.forEach((t) => {
      if (t.status !== 'Completed' || !t.completedAt) return
      const ts = new Date(t.completedAt).getTime()
      const week = weeks.find((w) => ts >= w.start && ts < w.end)
      if (week) week.completed++
    })
    return weeks.map(({ label, completed }) => ({ name: label, completed }))
  }, [tasks])

  const deptData = useMemo(() => {
    const map = {}
    tasks.forEach((t) => {
      if (t.status === 'Completed' || t.status === 'Cancelled') return
      const d = t.department || 'Unassigned'
      map[d] = (map[d] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [tasks])

  const serviceData = useMemo(() => {
    const map = {}
    clients.forEach((c) => {
      const s = c.serviceType || 'Other'
      map[s] = (map[s] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [clients])

  const revenueData = useMemo(() => {
    const map = {}
    let total = 0
    clients.forEach((c) => {
      const fee = Number(c.monthlyFee) || 0
      total += fee
      const s = c.serviceType || 'Other'
      map[s] = (map[s] || 0) + fee
    })
    return {
      total,
      data: Object.entries(map).map(([name, value]) => ({ name, value: value / 1000 })),
    }
  }, [clients])

  const billableThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    let minutes = 0
    tasks.forEach((t) =>
      (t.timeLogs || []).forEach((l) => {
        if (l.billable && new Date(l.date).getTime() >= cutoff) minutes += Number(l.minutes) || 0
      })
    )
    return formatDuration(minutes)
  }, [tasks])

  const summary = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'Completed').length
    const overdue = stats?.overdueTasks ?? tasks.filter(
      (t) =>
        t.dueDate &&
        t.status !== 'Completed' &&
        t.status !== 'Cancelled' &&
        new Date(t.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))
    ).length
    const teamSize = (stats?.teamWorkload || []).length
    return {
      completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
      overdue,
      avgPerMember: teamSize ? (completed / teamSize).toFixed(1) : '0',
      mrr: revenueData.total,
    }
  }, [tasks, stats, revenueData.total])

  if (loading) return <Spinner label="Loading reports..." />

  const tooltipStyle = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    fontSize: 12,
    color: '#374151',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle="Performance and revenue insights" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Completion Rate" value={`${summary.completionRate}%`} icon={CheckCircle2} />
        <StatCard label="Overdue Tasks" value={summary.overdue} icon={AlertTriangle} />
        <StatCard label="Avg Tasks / Member" value={summary.avgPerMember} icon={Users} />
        <StatCard label="Monthly Revenue" value={summary.mrr.toLocaleString()} icon={DollarSign} />
        <StatCard label="Billable Hours (this week)" value={billableThisWeek} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold tracking-tight text-gray-900 mb-4">Tasks Completed Per Week</h3>
          {weeklyData.every((d) => d.completed === 0) ? (
            <EmptyState icon={CheckCircle2} message="No completions in the last 6 weeks" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={tooltipStyle} />
                <Bar dataKey="completed" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold tracking-tight text-gray-900 mb-4">Open Tasks by Department</h3>
          {deptData.length === 0 ? (
            <EmptyState icon={Users} message="No open tasks" />
          ) : (
            <ResponsiveContainer width="100%" height={deptData.length * 38 + 40}>
              <BarChart data={deptData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold tracking-tight text-gray-900 mb-4">Clients by Service Type</h3>
          {serviceData.length === 0 ? (
            <EmptyState message="No clients yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={serviceData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {serviceData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold tracking-tight text-gray-900 mb-1">Monthly Revenue by Service</h3>
          <p className="text-xs text-gray-400 mb-4">Values in thousands (K)</p>
          {revenueData.data.length === 0 ? (
            <EmptyState message="No client fees recorded yet" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-15} dy={8} height={45} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={34} unit="K" />
                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={tooltipStyle} formatter={(v) => [`${v}K`, 'Revenue']} />
                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  )
}
