import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ListTodo, Building2, Users, CornerDownLeft } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

const DEBOUNCE = 250

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ tasks: [], clients: [], team: [] })
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const isTeam = user?.role !== 'manager'

  const flat = [
    ...results.tasks.map((t) => ({
      type: 'task',
      to: isTeam ? `/my-tasks?task=${t._id}` : `/tasks?task=${t._id}`,
      label: t.title,
    })),
    ...results.clients.map((c) => ({ type: 'client', to: '/clients', label: c.name })),
    ...results.team.map((m) => ({ type: 'team', to: '/team', label: m.name })),
  ]

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults({ tasks: [], clients: [], team: [] })
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    if (!open || !query.trim()) {
      setResults({ tasks: [], clients: [], team: [] })
      return
    }
    const id = setTimeout(async () => {
      try {
        if (isTeam) {
          const tRes = await api.get(`/tasks?search=${encodeURIComponent(query)}`)
          setResults({ tasks: (tRes.data || []).slice(0, 8), clients: [], team: [] })
          setActiveIndex(0)
          return
        }
        const [tRes, cRes, mRes] = await Promise.all([
          api.get(`/tasks?search=${encodeURIComponent(query)}`),
          api.get(`/clients?search=${encodeURIComponent(query)}`),
          api.get('/team'),
        ])
        const q = query.toLowerCase()
        const members = (mRes.data || []).filter((m) => (m.name || '').toLowerCase().includes(q))
        setResults({
          tasks: (tRes.data || []).slice(0, 5),
          clients: (cRes.data || []).slice(0, 4),
          team: members.slice(0, 4),
        })
        setActiveIndex(0)
      } catch {}
    }, DEBOUNCE)
    return () => clearTimeout(id)
  }, [query, open, isTeam])

  const select = useCallback(
    (index) => {
      const item = flat[index]
      if (!item) return
      onClose()
      navigate(item.to)
    },
    [flat, onClose, navigate]
  )

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      select(activeIndex)
    }
  }

  if (!open) return null

  const groups = []
  const pushGroup = (label, icon, items, offset) => {
    if (!items.length) return
    groups.push({ label, icon, items, offset })
  }
  let offset = 0
  pushGroup('Tasks', ListTodo, results.tasks.map((t) => ({ label: t.title, sub: t.client?.name })), offset)
  offset += results.tasks.length
  pushGroup('Clients', Building2, results.clients.map((c) => ({ label: c.name, sub: c.serviceType })), offset)
  offset += results.clients.length
  pushGroup('Team', Users, results.team.map((m) => ({ label: m.name, sub: m.department })), offset)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4 bg-black/30"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-gray-100">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isTeam ? 'Search your tasks...' : 'Search tasks, clients, team...'}
            className="w-full py-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
          <kbd className="shrink-0 text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {!query.trim() ? (
            <p className="px-3 py-8 text-center text-sm text-gray-400">
              {isTeam ? 'Type to search your assigned tasks' : 'Type to search across tasks, clients and team members'}
            </p>
          ) : groups.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-gray-400">No results found</p>
          ) : (
            groups.map(({ label, icon: Icon, items, offset: base }) => (
              <div key={label} className="mb-1 last:mb-0">
                <p className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <Icon size={12} />
                  {label}
                </p>
                {items.map((item, i) => {
                  const idx = base + i
                  const active = idx === activeIndex
                  return (
                    <button
                      key={`${label}-${i}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => select(idx)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-150 ${
                        active ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate">{item.label}</span>
                        {item.sub && <span className="text-xs text-gray-400 truncate">{item.sub}</span>}
                      </span>
                      {active && <CornerDownLeft size={13} className="text-gray-400 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-50 border border-gray-200 rounded px-1">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-50 border border-gray-200 rounded px-1">↵</kbd> open
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="bg-gray-50 border border-gray-200 rounded px-1">Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  return { open, setOpen }
}
