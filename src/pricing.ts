export type ModelRate = {
  in: number
  out: number
  cacheCreate: number
  cacheRead: number
}

// USD per 1M tokens
const RATES: Record<string, ModelRate> = {
  '*opus*4*': { in: 15, out: 75, cacheCreate: 18.75, cacheRead: 1.5 },
  '*sonnet*4*': { in: 3, out: 15, cacheCreate: 3.75, cacheRead: 0.3 },
  '*haiku*': { in: 0.8, out: 4, cacheCreate: 1.0, cacheRead: 0.08 }
}

export function rateFor(model: string): ModelRate {
  for (const [glob, rate] of Object.entries(RATES)) {
    if (new RegExp(glob.replace(/\*/g, '.*')).test(model)) return rate
  }

  // Fallback to opus rates if no match
  return RATES['*opus*4*']
}
