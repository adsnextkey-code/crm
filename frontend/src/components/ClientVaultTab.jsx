import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Download,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  FileText,
  FileSpreadsheet,
  Upload,
} from 'lucide-react'
import api from '../utils/api'
import { Spinner, Button } from './ui'

const SECTIONS = {
  credentials: ['label', 'username', 'url', 'password'],
  cards: ['label', 'holder', 'number', 'expiry', 'cvv'],
  links: ['label', 'url'],
  socials: ['platform', 'label', 'url'],
}

const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'Other']
const PLATFORM_ICONS = { Instagram, Facebook, LinkedIn: Linkedin, Twitter, Other: Globe }

const INPUT_CLS =
  'w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-900 placeholder-gray-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-150'

const ICON_BTN_CLS =
  'p-1.5 rounded-lg shrink-0 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed'

const uid = () =>
  window.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`

const normalize = (data) => ({
  credentials: data?.credentials || [],
  cards: data?.cards || [],
  links: data?.links || [],
  socials: data?.socials || [],
  files: data?.files || [],
})

const fileIcon = (f) =>
  /(sheet|excel|csv|xls)/i.test(`${f.type || ''} ${f.name || ''}`) ? FileSpreadsheet : FileText

function IconBtn({ onClick, title, disabled, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${ICON_BTN_CLS} ${
        danger
          ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

function SectionHeader({ icon: Icon, title, count, onAdd, addLabel }) {
  return (
    <div className="flex items-center justify-between mb-2 mt-6 first:mt-0">
      <h4 className="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
        <Icon size={13} />
        {title}
        {typeof count === 'number' && count > 0 && (
          <span className="normal-case tracking-normal text-gray-300">({count})</span>
        )}
      </h4>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-1.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors duration-150"
        >
          <Plus size={12} />
          {addLabel}
        </button>
      )}
    </div>
  )
}

export default function ClientVaultTab({ clientId }) {
  const [vault, setVault] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [revealedPw, setRevealedPw] = useState({})
  const [revealedCards, setRevealedCards] = useState({})
  const [revealedCvv, setRevealedCvv] = useState({})
  const fileInputRef = useRef(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .get(`/clients/${clientId}/vault`)
      .then((res) => {
        if (active) setVault(normalize(res.data))
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load vault'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [clientId])

  const touch = () => setDirty(true)

  const updateItem = (section, id, key, value) => {
    setVault((prev) => ({
      ...prev,
      [section]: prev[section].map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }))
    touch()
  }

  const addItem = (section, seed = {}) => {
    setVault((prev) => ({
      ...prev,
      [section]: [...prev[section], { id: uid(), ...seed }],
    }))
    touch()
  }

  const removeItem = (section, id) => {
    setVault((prev) => ({ ...prev, [section]: prev[section].filter((i) => i.id !== id) }))
    touch()
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await api.put(`/clients/${clientId}/vault`, {
        credentials: vault.credentials,
        cards: vault.cards,
        links: vault.links,
        socials: vault.socials,
        files: vault.files,
      })
      setVault(normalize(res.data))
      setDirty(false)
      toast.success('Vault saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save vault')
    } finally {
      setSaving(false)
    }
  }

  const copyText = async (text) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Copy failed')
    }
  }

  const handleUpload = (e) => {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    picked.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File too large (max 2MB)')
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        setVault((prev) => ({
          ...prev,
          files: [
            ...prev.files,
            {
              id: uid(),
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size,
              fileData: String(reader.result),
            },
          ],
        }))
        setDirty(true)
      }
      reader.onerror = () => toast.error(`Failed to read ${file.name}`)
      reader.readAsDataURL(file)
    })
  }

  if (loading) return <Spinner label="Loading vault..." />
  if (!vault) return null

  const maskedCardNumber = (num) =>
    num && num.length >= 4 ? `${'•'.repeat(Math.max(num.length - 4, 4))} ${num.slice(-4)}` : num || ''

  return (
    <div>
      <SectionHeader
        icon={Globe}
        title="Website Credentials"
        count={vault.credentials.length}
        onAdd={() => addItem('credentials')}
        addLabel="Credential"
      />

      {vault.credentials.length === 0 ? (
        <p className="text-xs text-gray-400">No credentials saved yet</p>
      ) : (
        <div className="space-y-1.5">
          {vault.credentials.map((c) => (
            <div key={c.id} className="p-2.5 border border-gray-200 rounded-lg space-y-1.5 bg-white shadow-card">
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  value={c.label || ''}
                  onChange={(e) => updateItem('credentials', c.id, 'label', e.target.value)}
                  placeholder="Label"
                  className={INPUT_CLS}
                />
                <input
                  value={c.username || ''}
                  onChange={(e) => updateItem('credentials', c.id, 'username', e.target.value)}
                  placeholder="Username"
                  className={INPUT_CLS}
                />
              </div>
              <input
                value={c.url || ''}
                onChange={(e) => updateItem('credentials', c.id, 'url', e.target.value)}
                placeholder="URL"
                className={INPUT_CLS}
              />
              <div className="flex items-center gap-1">
                <input
                  type={revealedPw[c.id] ? 'text' : 'password'}
                  value={c.password || ''}
                  onChange={(e) => updateItem('credentials', c.id, 'password', e.target.value)}
                  placeholder="Password"
                  className={`${INPUT_CLS} flex-1 min-w-0`}
                />
                <IconBtn
                  title={revealedPw[c.id] ? 'Hide password' : 'Show password'}
                  onClick={() => setRevealedPw((p) => ({ ...p, [c.id]: !p[c.id] }))}
                >
                  {revealedPw[c.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                </IconBtn>
                <IconBtn title="Copy password" onClick={() => copyText(c.password)} disabled={!c.password}>
                  <Copy size={14} />
                </IconBtn>
                <IconBtn title="Remove" danger onClick={() => removeItem('credentials', c.id)}>
                  <Trash2 size={14} />
                </IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionHeader
        icon={FileText}
        title="Cards"
        count={vault.cards.length}
        onAdd={() => addItem('cards')}
        addLabel="Card"
      />
      {vault.cards.length === 0 ? (
        <p className="text-xs text-gray-400">No cards saved yet</p>
      ) : (
        <div className="space-y-1.5">
          {vault.cards.map((card) => (
            <div key={card.id} className="p-2.5 border border-gray-200 rounded-lg space-y-1.5 bg-white shadow-card">
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  value={card.label || ''}
                  onChange={(e) => updateItem('cards', card.id, 'label', e.target.value)}
                  placeholder="Label"
                  className={INPUT_CLS}
                />
                <input
                  value={card.holder || ''}
                  onChange={(e) => updateItem('cards', card.id, 'holder', e.target.value)}
                  placeholder="Holder"
                  className={INPUT_CLS}
                />
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={revealedCards[card.id] ? card.number || '' : maskedCardNumber(card.number)}
                  onChange={(e) => updateItem('cards', card.id, 'number', e.target.value.replace(/\s/g, ''))}
                  readOnly={!revealedCards[card.id]}
                  placeholder="Card Number"
                  className={`${INPUT_CLS} flex-1 min-w-0 font-mono`}
                />
                <IconBtn
                  title={revealedCards[card.id] ? 'Hide number' : 'Show number'}
                  onClick={() => setRevealedCards((p) => ({ ...p, [card.id]: !p[card.id] }))}
                >
                  {revealedCards[card.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                </IconBtn>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  value={card.expiry || ''}
                  onChange={(e) => updateItem('cards', card.id, 'expiry', e.target.value)}
                  placeholder="Expiry (MM/YY)"
                  className={INPUT_CLS}
                />
                <div className="flex items-center gap-1">
                  <input
                    type={revealedCvv[card.id] ? 'text' : 'password'}
                    value={card.cvv || ''}
                    onChange={(e) => updateItem('cards', card.id, 'cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="CVV"
                    className={`${INPUT_CLS} flex-1 min-w-0`}
                    autoComplete="off"
                  />
                  <IconBtn
                    title={revealedCvv[card.id] ? 'Hide CVV' : 'Show CVV'}
                    onClick={() => setRevealedCvv((p) => ({ ...p, [card.id]: !p[card.id] }))}
                  >
                    {revealedCvv[card.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </IconBtn>
                </div>
              </div>
              <div className="flex justify-end">
                <IconBtn title="Remove" danger onClick={() => removeItem('cards', card.id)}>
                  <Trash2 size={14} />
                </IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionHeader
        icon={Twitter}
        title="Links & Socials"
        onAdd={() => addItem('links')}
        addLabel="Link"
      />
      {vault.links.length === 0 && vault.socials.length === 0 ? (
        <p className="text-xs text-gray-400">No links or social profiles saved yet</p>
      ) : (
        <div className="space-y-1.5">
          {[...vault.socials, ...vault.links].map((item) =>
            PLATFORMS.includes(item.platform) ? (
              <div
                key={item.id}
                className="flex items-start gap-1.5 p-2.5 border border-gray-200 rounded-lg bg-white shadow-card"
              >
                <span className="mt-1.5 text-gray-400 shrink-0">
                  {PLATFORM_ICONS[item.platform] || Globe}
                </span>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <select
                      value={item.platform}
                      onChange={(e) => updateItem('socials', item.id, 'platform', e.target.value)}
                      className={`${INPUT_CLS} w-auto appearance-none cursor-pointer`}
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <input
                      value={item.label || ''}
                      onChange={(e) => updateItem('socials', item.id, 'label', e.target.value)}
                      placeholder="Label"
                      className={`${INPUT_CLS} flex-1 min-w-0`}
                    />
                  </div>
                  <input
                    value={item.url || ''}
                    onChange={(e) => updateItem('socials', item.id, 'url', e.target.value)}
                    placeholder="https://..."
                    className={INPUT_CLS}
                  />
                </div>
                <IconBtn title="Remove" danger onClick={() => removeItem('socials', item.id)}>
                  <Trash2 size={14} />
                </IconBtn>
              </div>
            ) : (
              <div key={item.id} className="flex items-start gap-1.5 p-2.5 border border-gray-200 rounded-lg bg-white shadow-card">
                <span className="mt-1.5 text-gray-400 shrink-0">
                  <Globe size={14} />
                </span>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input
                    value={item.label || ''}
                    onChange={(e) => updateItem('links', item.id, 'label', e.target.value)}
                    placeholder="Label"
                    className={INPUT_CLS}
                  />
                  <input
                    value={item.url || ''}
                    onChange={(e) => updateItem('links', item.id, 'url', e.target.value)}
                    placeholder="https://..."
                    className={INPUT_CLS}
                  />
                </div>
                <IconBtn title="Remove" danger onClick={() => removeItem('links', item.id)}>
                  <Trash2 size={14} />
                </IconBtn>
              </div>
            )
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => addItem('socials', { platform: 'Instagram' })}
        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-1.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors duration-150"
      >
        <Plus size={12} />
        Social Profile
      </button>

      <SectionHeader
        icon={FileSpreadsheet}
        title="Confidential Files"
        count={vault.files.length}
        onAdd={() => fileInputRef.current?.click()}
        addLabel="Upload"
      />
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
      {vault.files.length === 0 ? (
        <p className="text-xs text-gray-400">No confidential files uploaded yet</p>
      ) : (
        <div className="space-y-1.5">
          {vault.files.map((f) => {
            const Icon = fileIcon(f)
            return (
              <div
                key={f.id}
                className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-white shadow-card"
              >
                <Icon size={16} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{f.name}</p>
                  <p className="text-[11px] text-gray-400">
                    {f.size ? `${(f.size / 1024).toFixed(0)} KB` : ''}
                  </p>
                </div>
                {f.fileData && (
                  <a
                    href={f.fileData}
                    download={f.name}
                    title="Download"
                    className={`${ICON_BTN_CLS} text-gray-400 hover:text-gray-700 hover:bg-gray-100`}
                  >
                    <Download size={14} />
                  </a>
                )}
                <IconBtn title="Delete file" danger onClick={() => removeItem('files', f.id)}>
                  <Trash2 size={14} />
                </IconBtn>
              </div>
            )
          })}
        </div>
      )}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-xs font-medium text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors duration-150"
      >
        <Upload size={13} />
        Upload files (max 2MB)
      </button>

      <div className="sticky bottom-0 -mx-5 mt-5 px-5 py-3 bg-white border-t border-gray-100">
        <Button onClick={save} disabled={!dirty || saving} className="w-full">
          {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
        </Button>
      </div>
    </div>
  )
}
