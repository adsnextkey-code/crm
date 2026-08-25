import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Zap, Loader2 } from 'lucide-react'
import api from '../utils/api'

export default function AcceptInvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [invite, setInvite] = useState(null)
  const [checking, setChecking] = useState(true)
  const [form, setForm] = useState({ name: '', password: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .get(`/auth/invite-preview/${token}`)
      .then((res) => setInvite(res.data))
      .catch((err) =>
        toast.error(err.response?.data?.message || 'This invitation is invalid or has expired')
      )
      .finally(() => setChecking(false))
  }, [token])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Please enter your full name')
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match')
    setSaving(true)
    try {
      const res = await api.post('/auth/accept-invite', { token, ...form })
      localStorage.setItem('crm_token', res.data.token)
      toast.success('Account created — welcome aboard!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not activate your account')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-150'

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
            <Zap size={20} />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-gray-900">Agency CRM</p>
            <p className="text-[11px] text-gray-400">Team Invitation</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-card p-6">
          {checking ? (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin" /> Checking your invitation...
            </p>
          ) : !invite ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600">
                This invitation link is invalid or has expired.
              </p>
              <p className="text-xs text-gray-400 mt-1.5">Ask your manager to send a new invitation.</p>
              <Link to="/login" className="inline-block mt-5 text-sm font-medium text-indigo-600 hover:text-indigo-700">
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-base font-semibold tracking-tight text-gray-900">
                You've been invited{invite.invitedByName ? ` by ${invite.invitedByName}` : ''}
              </h1>
              <p className="text-sm text-gray-500 mt-1 mb-5">
                Set up your account for{' '}
                <span className="font-medium text-gray-900">{invite.email}</span>{' '}
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  ({invite.role})
                </span>
              </p>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={set('name')}
                    placeholder="e.g. Ahmed Raza"
                    className={inputCls}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Create Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={set('password')}
                    placeholder="At least 6 characters"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    placeholder="Repeat your password"
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors duration-150"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? 'Creating account...' : 'Create My Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
