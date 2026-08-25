import { useState } from 'react'
import toast from 'react-hot-toast'
import { Zap, Mail, Lock, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [role, setRole] = useState('manager')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const switchRole = (r) => {
    setRole(r)
    setEmail('')
    setPassword('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }
    setLoading(true)
    try {
      const user = await login(email, password)
      toast.success(`Welcome back, ${user.name}`)
      window.location.href = user.role === 'manager' ? '/dashboard' : '/my-tasks'
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-card p-8">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="h-11 w-11 rounded-lg bg-indigo-600 flex items-center justify-center text-white mb-4">
            <Zap size={22} />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">Agency CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your workspace</p>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg mb-6">
          {['manager', 'team'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => switchRole(r)}
              className={`py-1.5 rounded-md text-sm font-medium capitalize transition-colors duration-150 ${
                role === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1.5">Email</span>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@nextkeytechnologies.com"
                className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-150"
              />
            </div>
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1.5">Password</span>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-150"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
