'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'

const AUTO_DISMISS_MS = 5000

type Toast = {
  id: number
  message: string
}

type ToastContextValue = {
  showError: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextIdRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showError = useCallback(
    (message: string) => {
      const id = nextIdRef.current++
      setToasts((current) => [...current, { id, message }])
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ showError }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className="pointer-events-auto flex max-w-[420px] items-center gap-3 rounded-md border border-qw-danger/30 bg-qw-surface-2 px-4 py-3 text-[13px] font-medium text-qw-danger-text shadow-[0_12px_32px_rgba(0,0,0,0.5)] animate-[qws-fade-in_200ms_ease-out]"
          >
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 text-qw-danger-text/70 transition-colors hover:text-qw-danger-text"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  return context
}
