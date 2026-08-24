import { cache } from 'react'
import { createClient } from './server'

// getClaims() verifies the JWT locally against a cached JWKS (no network
// round trip) when the project uses asymmetric signing keys, and only falls
// back to a network call for legacy symmetric-key projects. getUser() always
// hits the Auth server, which is the bulk of the per-navigation latency this
// app was seeing.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  return data?.claims ?? null
})
