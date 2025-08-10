export type ModelRate = {
  in: number
  out: number
  cacheCreate: number
  cacheRead: number
}

interface LiteLLMPricing {
  input_cost_per_token?: number
  output_cost_per_token?: number
  cache_creation_input_token_cost?: number
  cache_read_input_token_cost?: number
}

const LITELLM_PRICING_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'

// Fallback pricing for when network is unavailable (current rates + Opus 4.1)
const FALLBACK_RATES: Record<string, ModelRate> = {
  '*opus*4*': { in: 15, out: 75, cacheCreate: 18.75, cacheRead: 1.5 },
  '*sonnet*4*': { in: 3, out: 15, cacheCreate: 3.75, cacheRead: 0.3 },
  '*haiku*': { in: 0.8, out: 4, cacheCreate: 1.0, cacheRead: 0.08 }
}

const COMPILED_FALLBACK_PATTERNS: Array<{ pattern: RegExp; rate: ModelRate }> = [
  { pattern: /.*opus.*4.*/, rate: FALLBACK_RATES['*opus*4*'] },
  { pattern: /.*sonnet.*4.*/, rate: FALLBACK_RATES['*sonnet*4*'] },
  { pattern: /.*haiku.*/, rate: FALLBACK_RATES['*haiku*'] }
]

class PricingFetcher {
  private cachedPricing: Map<string, ModelRate> | null = null
  private lastFetchTime: number = 0
  private readonly CACHE_DURATION = 60 * 60 * 1000

  private convertLiteLLMToModelRate(pricing: LiteLLMPricing): ModelRate {
    return {
      in: (pricing.input_cost_per_token || 0) * 1_000_000,
      out: (pricing.output_cost_per_token || 0) * 1_000_000,
      cacheCreate: (pricing.cache_creation_input_token_cost || 0) * 1_000_000,
      cacheRead: (pricing.cache_read_input_token_cost || 0) * 1_000_000
    }
  }

  private async fetchPricingFromLiteLLM(): Promise<Map<string, ModelRate>> {
    try {
      const response = await fetch(LITELLM_PRICING_URL)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json() as Record<string, unknown>
      const pricing = new Map<string, ModelRate>()
      
      for (const [modelName, modelData] of Object.entries(data)) {
        if (typeof modelData === 'object' && modelData !== null) {
          const litellmPricing = modelData as LiteLLMPricing
          if (litellmPricing.input_cost_per_token !== undefined || 
              litellmPricing.output_cost_per_token !== undefined) {
            pricing.set(modelName, this.convertLiteLLMToModelRate(litellmPricing))
          }
        }
      }
      
      return pricing
    } catch (error) {
      console.warn('Failed to fetch pricing from LiteLLM:', error)
      throw error
    }
  }

  private getFallbackRate(model: string): ModelRate {
    for (const { pattern, rate } of COMPILED_FALLBACK_PATTERNS) {
      if (pattern.test(model)) {
        return rate
      }
    }
    return FALLBACK_RATES['*opus*4*']
  }

  private async ensurePricingLoaded(): Promise<Map<string, ModelRate>> {
    const now = Date.now()
    
    if (this.cachedPricing && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return this.cachedPricing
    }

    try {
      console.warn('Fetching latest model pricing from LiteLLM...')
      this.cachedPricing = await this.fetchPricingFromLiteLLM()
      this.lastFetchTime = now
      console.warn(`Loaded pricing for ${this.cachedPricing.size} models`)
      return this.cachedPricing
    } catch (error) {
      console.warn('Falling back to static pricing due to fetch error:', error)
      const fallbackMap = new Map<string, ModelRate>()
      for (const [pattern, rate] of Object.entries(FALLBACK_RATES)) {
        fallbackMap.set(pattern, rate)
      }
      return fallbackMap
    }
  }

  async getModelRate(model: string): Promise<ModelRate> {
    try {
      const pricing = await this.ensurePricingLoaded()
      
      const exactMatch = pricing.get(model)
      if (exactMatch) return exactMatch
      
      const variations = [
        model,
        `claude-${model}`,
        `claude-3-${model}`,
        `claude-3-5-${model}`,
        model.replace('claude-', ''),
      ]
      
      for (const variant of variations) {
        const match = pricing.get(variant)
        if (match) return match
      }
      
      const lowerModel = model.toLowerCase()
      for (const [key, value] of pricing) {
        if (key.toLowerCase().includes(lowerModel) || 
            lowerModel.includes(key.toLowerCase())) {
          return value
        }
      }
      
      return this.getFallbackRate(model)
    } catch (error) {
      console.warn('Error getting model rate, using fallback:', error)
      return this.getFallbackRate(model)
    }
  }
}

const pricingFetcher = new PricingFetcher()

export async function rateFor(model: string): Promise<ModelRate> {
  return pricingFetcher.getModelRate(model)
}
