import { Menu } from 'electron'
import { ecoFacts } from './fun-metrics.js'

// Sarcastic loading messages
const loadingMessages = [
  'wallet-melting...',
  'tree-murdering...',
  'gpu-liquefying...',
  'inheritance-draining...',
  'gpu-sizzling...',
  'cap-dodging...',
  'bank-calling...',
  'savings-evaporating...',
  'budget-destroying...',
  'debt-accumulating...'
]

const getRandomLoadingMessage = () => {
  return loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
}

export function buildMenu(t: {
  usd: number
  input: number
  output: number
  read: number
  write: number
  tokens: number
}) {
  const stars = '★'.repeat(Math.min(4, Math.floor(t.usd / 50) + 1)).padEnd(4, '☆')
  const fact = ecoFacts(t.tokens)

  const topSpend = 500 // stub percentile curve
  const pctNum = Math.min(99.9, (t.usd / topSpend) * 100)

  const items = [
    { label: `💰  Today: $${t.usd.toFixed(2)}   ${stars}` },
    {
      label:
        t.usd > 100
          ? `🔥  Welcome to the 5% Club!`
          : `📈  ${(100 - pctNum).toFixed(1)}% away from 5% Club`
    },
    { label: `⏳  ${getRandomLoadingMessage()}`, enabled: false },
    { type: 'separator' as const },

    { label: `📥  Input: ${t.input.toLocaleString()}` },
    { label: `📤  Output: ${t.output.toLocaleString()}` },
    { label: `💾  Cache read: ${t.read.toLocaleString()}` },
    { label: `✏️  Cache write: ${t.write.toLocaleString()}` },
    { label: `📊  Total tokens: ${t.tokens.toLocaleString()}` },
    { type: 'separator' as const },

    { label: `🌳  ${fact.trees.toFixed(1)} trees worth of CO₂` },
    { label: `💧  ${fact.water.toFixed(0)}L of cooling water used` },
    { label: `🔋  ${fact.iphones.toFixed(0)} iPhone charges burned` },
    { label: `💡  ${fact.bulbs.toFixed(0)} hours of 60W bulb` },
    { type: 'separator' as const },
    { role: 'quit' as const }
  ]

  return Menu.buildFromTemplate(items)
}
