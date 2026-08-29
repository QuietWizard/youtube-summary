export const FONT_SIZE_COOKIE = 'qw-font-size'
export const DEFAULT_FONT_SCALE = 100
export const MIN_FONT_SCALE = 50
export const MAX_FONT_SCALE = 200

export function parseFontScale(value: string | undefined) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return DEFAULT_FONT_SCALE
  }

  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, parsed))
}
