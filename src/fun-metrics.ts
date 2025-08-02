export function ecoFacts(tokens: number) {
  // Baseline: 0.0000012 kWh per token (≈1.2 Wh per 1000 tokens)
  const kWh = tokens * 0.0000012

  return {
    /* kg CO₂ per kWh (global avg 2024) / kg CO₂ sequestered per tree per year */
    trees: (kWh * 0.4) / 20,
    /* Water consumed in thermoelectric generation (L) */
    water: kWh * 1.8,
    /* Full iPhone-15-class battery charges (≈13 Wh) */
    iphones: (kWh * 1000) / 13,
    /* Hours of light from an old 60 W incandescent bulb */
    bulbs: kWh / 0.06
  }
}
