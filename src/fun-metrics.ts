export function ecoFacts(tokens: number) {
  // Baseline: 0.0000006 kWh per token (≈0.3 Wh per 500 tokens)
  const kWh = tokens * 0.0000006

  return {
    trees: (kWh * 0.4) / 10, // kg CO₂ → trees/year
    water: kWh * 1.8, // L per kWh
    iphones: (kWh * 1000) / 11, // Wh / charge
    bulbs: kWh / 0.06 // 60 W bulb-hours
  }
}
