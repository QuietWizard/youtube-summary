'use client'

import { useEffect, useState } from 'react'
import { getPendingMutationCount, subscribeToMutationsChanged } from './db'

// Reactively tracks how many local edits haven't been pushed to the server
// yet, for a small "N changes pending" indicator. Re-reads on every queue
// change rather than polling — see the notifyMutationsChanged calls in
// db.ts.
export function usePendingMutationCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    function refresh() {
      getPendingMutationCount().then((next) => {
        if (!cancelled) {
          setCount(next)
        }
      })
    }

    refresh()
    const unsubscribe = subscribeToMutationsChanged(refresh)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return count
}
