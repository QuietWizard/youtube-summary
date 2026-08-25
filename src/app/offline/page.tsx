'use client'

import { useEffect, useState } from 'react'
import OfflineReader from '../offline-reader'

type Diagnostics = {
  serviceWorkerSupported: boolean
  registrationCount: number
  registrationScope: string | null
  activeState: string | null
  waitingState: string | null
  installingState: string | null
  controllerPresent: boolean
  cacheNames: string[]
  online: boolean
}

export default function OfflinePage() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null)

  // Visible troubleshooting info — this page is exactly where someone
  // debugging "offline doesn't work" ends up, so surface what the browser
  // actually did rather than requiring devtools/remote debugging to see it.
  useEffect(() => {
    let cancelled = false

    async function loadDiagnostics() {
      const serviceWorkerSupported = 'serviceWorker' in navigator
      const registrations = serviceWorkerSupported
        ? await navigator.serviceWorker.getRegistrations()
        : []
      const registration = registrations[0]
      const cacheNames = typeof caches !== 'undefined' ? await caches.keys() : []

      if (cancelled) return

      setDiagnostics({
        serviceWorkerSupported,
        registrationCount: registrations.length,
        registrationScope: registration?.scope ?? null,
        activeState: registration?.active?.state ?? null,
        waitingState: registration?.waiting?.state ?? null,
        installingState: registration?.installing?.state ?? null,
        controllerPresent: serviceWorkerSupported && navigator.serviceWorker.controller !== null,
        cacheNames,
        online: navigator.onLine,
      })
    }

    loadDiagnostics()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto min-h-screen max-w-[880px] bg-qw-bg px-6 py-8">
      <OfflineReader />
      <DiagnosticsPanel diagnostics={diagnostics} />
    </div>
  )
}

function DiagnosticsPanel({ diagnostics }: { diagnostics: Diagnostics | null }) {
  return (
    <details className="mt-10 rounded-lg border border-qw-border bg-qw-surface-1 p-3.5 text-[12px] text-qw-muted-1">
      <summary className="cursor-pointer font-semibold text-qw-fg-2">
        Diagnostics
      </summary>
      {diagnostics ? (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 font-mono">
          <dt>Connection</dt>
          <dd>{diagnostics.online ? 'online' : 'offline'}</dd>
          <dt>Service worker supported</dt>
          <dd>{String(diagnostics.serviceWorkerSupported)}</dd>
          <dt>Registrations found</dt>
          <dd>{diagnostics.registrationCount}</dd>
          <dt>Registration scope</dt>
          <dd>{diagnostics.registrationScope ?? '—'}</dd>
          <dt>Active worker state</dt>
          <dd>{diagnostics.activeState ?? '—'}</dd>
          <dt>Waiting worker state</dt>
          <dd>{diagnostics.waitingState ?? '—'}</dd>
          <dt>Installing worker state</dt>
          <dd>{diagnostics.installingState ?? '—'}</dd>
          <dt>Controlling this page</dt>
          <dd>{String(diagnostics.controllerPresent)}</dd>
          <dt>Cache Storage entries</dt>
          <dd>{diagnostics.cacheNames.length ? diagnostics.cacheNames.join(', ') : '(none)'}</dd>
        </dl>
      ) : (
        <p className="mt-3">Loading…</p>
      )}
    </details>
  )
}
