'use client'

import { enqueueMutation, updateLocalVideoField } from './db'
import type { MutationField } from './db'
import { flushMutationQueue } from './sync-mutations'

// The local-first mutation path: writes the field to the local copy of the
// video immediately, queues it for a background push, and kicks off an
// immediate best-effort sync attempt. Deliberately fire-and-forget from the
// caller's perspective — the local write is the source of truth from the
// moment this resolves, and it's never rolled back just because the sync
// attempt that follows didn't succeed right away. It stays queued and gets
// retried on the next pull-then-push cycle instead, with the field-level
// "chronologically later edit wins" rule (see sync-mutations.ts) resolving
// anything that changed elsewhere in the meantime.
export async function applyLocalMutation(
  videoId: number,
  field: MutationField,
  value: boolean | string
) {
  await updateLocalVideoField(videoId, field, value)
  await enqueueMutation(videoId, field, value)
  void flushMutationQueue()
}
