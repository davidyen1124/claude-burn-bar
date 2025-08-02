import fg from 'fast-glob'
import fs from 'node:fs'
import readline from 'node:readline'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween.js'
import os from 'node:os'
import path from 'node:path'
import { rateFor } from './pricing.js'

dayjs.extend(isBetween)

export interface Totals {
  usd: number
  read: number
  write: number
  input: number
  output: number
  tokens: number
}

export async function getTodaysTotals(): Promise<Totals> {
  const start = dayjs().startOf('day')
  const end = dayjs().endOf('day')

  // Get paths like ccusage does
  const homedir = os.homedir()
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(homedir, '.config')

  const claudePaths = [
    path.join(xdgConfig, 'claude', 'projects'),
    path.join(homedir, '.claude', 'projects')
  ]

  // Support CLAUDE_CONFIG_DIR environment variable
  if (process.env.CLAUDE_CONFIG_DIR) {
    const envPaths = process.env.CLAUDE_CONFIG_DIR.split(',').map((p) =>
      path.join(p.trim(), 'projects')
    )
    claudePaths.push(...envPaths)
  }

  // Find all JSONL files in all Claude paths
  const allFiles: string[] = []
  for (const claudePath of claudePaths) {
    try {
      const files = await fg('**/*.jsonl', {
        cwd: claudePath,
        absolute: true
      })
      allFiles.push(...files)
    } catch {
      // Ignore paths that don't exist
    }
  }

  let totals: Totals = {
    usd: 0,
    read: 0,
    write: 0,
    input: 0,
    output: 0,
    tokens: 0
  }

  for (const file of allFiles) {
    const rl = readline.createInterface({
      input: fs.createReadStream(file),
      crlfDelay: 1
    })

    for await (const line of rl) {
      try {
        const entry = JSON.parse(line)

        // Check timestamp
        const ts = dayjs(entry.timestamp)
        if (!ts.isBetween(start, end, null, '[]')) continue

        // If costUSD is already provided, use it
        if (entry.costUSD !== undefined) {
          totals.usd += entry.costUSD
        } else {
          // Otherwise calculate from tokens
          const model = entry.message?.model
          if (model) {
            const rate = rateFor(model)
            const usage = entry.message.usage
            const cost =
              ((usage.input_tokens || 0) * rate.in +
                (usage.output_tokens || 0) * rate.out +
                (usage.cache_creation_input_tokens || 0) * rate.cacheCreate +
                (usage.cache_read_input_tokens || 0) * rate.cacheRead) /
              1_000_000
            totals.usd += cost
          }
        }

        // Accumulate token counts
        const usage = entry.message?.usage || {}
        totals.input += usage.input_tokens || 0
        totals.output += usage.output_tokens || 0
        totals.read += usage.cache_read_input_tokens || 0
        totals.write += usage.cache_creation_input_tokens || 0
      } catch {
        // Skip malformed lines
      }
    }
  }

  totals.tokens = totals.input + totals.output + totals.read + totals.write
  return totals
}
