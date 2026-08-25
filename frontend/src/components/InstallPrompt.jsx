import { useEffect, useState } from 'react'
import { Smartphone, X, Share, Download } from 'lucide-react'

const DISMISS_KEY = 'pwa-install-dismissed'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)
  const [visible, setVisible] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      return
    }

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }

    const onInstalled = () => {
      setVisible(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    // If no Android/Chrome prompt arrives shortly after load, offer iOS instructions.
    const timer = setTimeout(() => {
      const ua = window.navigator.userAgent.toLowerCase()
      const iosDevice = /iphone|ipad|ipod/i.test(ua)
      if (iosDevice && !window.navigator.standalone && !deferredPrompt) {
        setIsIOS(true)
        setVisible(true)
      }
    }, 1500)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [deferredPrompt])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  const handleInstall = async () => {
    if (isIOS) {
      setShowHelp((v) => !v)
      return
    }
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setVisible(false)
  }

  return (
    <div className="fixed z-[60] bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:bottom-6 md:translate-x-0 w-[calc(100%-2rem)] max-w-sm">
      <div className="relative bg-white border border-gray-200 rounded-xl shadow-lg p-4">
        <button
          onClick={dismiss}
          title="Dismiss"
          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
        >
          <X size={14} />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
            {isIOS ? <Smartphone size={18} /> : <Download size={18} />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Install Agency CRM</p>
            <p className="text-xs text-gray-500 mt-0.5">Works offline, opens like an app</p>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleInstall}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors duration-150"
          >
            <Download size={13} />
            {isIOS ? 'Add to Home Screen' : 'Install'}
          </button>
        </div>
        {showHelp && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <span className="font-medium text-gray-900 shrink-0">Step 1:</span>
              <span className="inline-flex items-center gap-1">
                Tap Share (<Share size={12} className="inline text-indigo-600" />) in the Safari
                toolbar
              </span>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-600 mt-1.5">
              <span className="font-medium text-gray-900 shrink-0">Step 2:</span>
              <span>Scroll down and tap &ldquo;Add to Home Screen&rdquo;</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
