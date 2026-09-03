import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Session refresh used to happen inside proxy.ts (middleware) on every
// request to '/', because that's the one place a plain Server Component
// can't reach: setting cookies requires a Server Action, Route Handler, or
// middleware response. The cost was that the refresh's own network round
// trip blocked the *entire* response — including the splash screen — on
// every cold launch, which is exactly the "long black screen before the
// logo" gap reported live and confirmed by timing the middleware's
// response (2-3+ seconds just for this check, before Next.js could send a
// single byte).
//
// Moving the check here means it runs on its own request, fired by the
// client right after the splash mounts (see splash-screen.tsx) — the
// splash and shell stream out immediately, unblocked, while this refresh
// happens in the background. Route Handlers can set cookies just like
// middleware can, so refreshed session cookies are still persisted; the
// only behavior change is that the refresh now happens a moment after
// first paint instead of before it.
export async function GET() {
  const supabase = await createClient()
  await supabase.auth.getClaims()
  return NextResponse.json({ ok: true })
}
