import { X } from 'lucide-react'

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-card ${className}`} {...props}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, icon: Icon }) {
  return (
    <Card className="p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400 tracking-wide uppercase">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-gray-900 mt-1">{value ?? 0}</p>
      </div>
      {Icon && (
        <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shrink-0">
          <Icon size={18} />
        </div>
      )}
    </Card>
  )
}

const PRIORITY_STYLES = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-emerald-50 text-emerald-700',
}

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  'in progress': 'bg-blue-50 text-blue-700',
  review: 'bg-violet-50 text-violet-700',
  completed: 'bg-emerald-50 text-emerald-700',
  'on hold': 'bg-orange-50 text-orange-700',
  cancelled: 'bg-gray-100 text-gray-600',
  active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-orange-50 text-orange-700',
  churned: 'bg-red-50 text-red-700',
}

const PRIORITY_DOTS = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
}

const STATUS_DOTS = {
  pending: 'bg-amber-500',
  'in progress': 'bg-blue-500',
  review: 'bg-violet-500',
  completed: 'bg-emerald-500',
  'on hold': 'bg-orange-500',
  cancelled: 'bg-gray-400',
  active: 'bg-emerald-500',
  paused: 'bg-orange-500',
  churned: 'bg-red-500',
}

export function Badge({ text, type }) {
  const key = String(text || '').toLowerCase()
  const cls =
    type === 'priority'
      ? PRIORITY_STYLES[key] || 'bg-gray-100 text-gray-600'
      : type === 'status'
        ? STATUS_STYLES[key] || 'bg-gray-100 text-gray-600'
        : 'bg-gray-100 text-gray-600'
  const dot =
    type === 'priority' ? PRIORITY_DOTS[key] : type === 'status' ? STATUS_DOTS[key] : null
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {text}
    </span>
  )
}

const AVATAR_COLORS = [
  'bg-gray-200 text-gray-700',
  'bg-indigo-50 text-indigo-700',
  'bg-blue-50 text-blue-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
]

export function Avatar({ name, size = 'md', src }) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-7 w-7 text-[11px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-11 w-11 text-sm',
    xl: 'h-24 w-24 text-xl',
  }
  const color = AVATAR_COLORS[(name || '').length % AVATAR_COLORS.length]
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        title={name}
        className={`${sizes[size]} rounded-full object-cover shrink-0 select-none border border-gray-200`}
      />
    )
  }
  return (
    <div
      className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-semibold shrink-0 select-none`}
      title={name}
    >
      {initials}
    </div>
  )
}

export function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="h-7 w-7 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  )
}

export function EmptyState({ icon: Icon, message, hint }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {Icon && (
        <div className="h-12 w-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400">
          <Icon size={22} />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-gray-700">{message}</p>
        {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={`bg-white rounded-xl shadow-xl w-full ${width} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <h3 className="text-base font-semibold tracking-tight text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
          >
            <X size={17} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function Drawer({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 bg-black/30"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-y-0 right-0 w-96 max-w-full bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <h3 className="text-base font-semibold tracking-tight text-gray-900 truncate">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
          >
            <X size={17} />
          </button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">{children}</div>
      </div>
    </div>
  )
}

const FIELD_CLASSES =
  'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-150'

export function Field({ label, required, children }) {
  return (
    <label className="block">
      {label && (
        <span className="block text-xs font-medium text-gray-500 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </span>
      )}
      {children}
    </label>
  )
}

export function Input({ label, required, ...props }) {
  return (
    <Field label={label} required={required}>
      <input {...props} className={`${FIELD_CLASSES} ${props.className || ''}`} />
    </Field>
  )
}

export function Select({ label, required, children, ...props }) {
  return (
    <Field label={label} required={required}>
      <select {...props} className={`${FIELD_CLASSES} appearance-none cursor-pointer`}>
        {children}
      </select>
    </Field>
  )
}

export function Textarea({ label, required, rows = 3, ...props }) {
  return (
    <Field label={label} required={required}>
      <textarea {...props} rows={rows} className={`${FIELD_CLASSES} resize-y`} />
    </Field>
  )
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const styles =
    variant === 'primary'
      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
      : variant === 'danger'
        ? 'bg-white hover:bg-red-50 text-red-600 border border-red-200'
        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${styles} ${className}`}
      {...props}
    />
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export function relativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function isOverdue(dueDate) {
  if (!dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dueDate) < today
}

export function downloadCSV(filename, rows) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
