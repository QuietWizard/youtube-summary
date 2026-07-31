export type MutationDescriptor<T> = {
  run: () => Promise<T>
}

export type RetryOptions = {
  retries?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

const DEFAULT_RETRIES = 2
const DEFAULT_BASE_DELAY_MS = 500
const DEFAULT_MAX_DELAY_MS = 3000

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runWithRetry<T>(
  descriptor: MutationDescriptor<T>,
  options?: RetryOptions
): Promise<T> {
  const retries = options?.retries ?? DEFAULT_RETRIES
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS
  const maxDelayMs = options?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS

  let attempt = 0

  for (;;) {
    try {
      return await descriptor.run()
    } catch (error) {
      if (attempt >= retries) {
        throw error
      }

      const backoff = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs)
      await delay(backoff)
      attempt += 1
    }
  }
}
