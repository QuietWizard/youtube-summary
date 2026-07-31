'use client'

import { useCallback } from 'react'
import { runWithRetry } from './optimistic-mutation'
import type { MutationDescriptor, RetryOptions } from './optimistic-mutation'

export type MutationOutcome<T> =
  | { ok: true; result: T }
  | { ok: false; error: unknown }

export function useOptimisticMutation() {
  const mutate = useCallback(
    <T,>(
      descriptor: MutationDescriptor<T>,
      options?: RetryOptions
    ): Promise<MutationOutcome<T>> =>
      runWithRetry(descriptor, options).then(
        (result) => ({ ok: true as const, result }),
        (error) => ({ ok: false as const, error })
      ),
    []
  )

  return { mutate }
}
