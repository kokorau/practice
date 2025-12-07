import type { Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../../../Color/Domain/ValueObject/Oklch'

/**
 * AccentCandidate represents a candidate color for accent selection.
 */
export type AccentCandidate = {
  readonly id: string
  readonly oklch: Oklch
  readonly category: 'chromatic' | 'neutral'
  readonly name: string
}

/**
 * Options for generating accent candidates.
 */
export type AccentCandidateOptions = {
  readonly chromatic: {
    /** Minimum lightness (e.g., 0.45) */
    readonly lMin: number
    /** Maximum lightness (e.g., 0.75) */
    readonly lMax: number
    /** Chroma value (e.g., 0.15) */
    readonly chroma: number
    /** Number of hues to generate (e.g., 12 for 30° steps) */
    readonly hueCount: number
    /** Number of lightness steps (e.g., 3) */
    readonly lSteps: number
  }
  readonly neutral: {
    /** Lightness steps for neutrals */
    readonly steps: readonly number[]
  }
}

/**
 * Scoring result for accent candidates.
 */
export type AccentScore = {
  readonly candidate: AccentCandidate
  /** Overall score (0-1, higher is better) */
  readonly score: number
  /** Whether this candidate is recommended */
  readonly recommended: boolean
}

// Hue names for display
const HUE_NAMES: Record<number, string> = {
  0: 'Red',
  30: 'Orange',
  60: 'Yellow',
  90: 'Lime',
  120: 'Green',
  150: 'Teal',
  180: 'Cyan',
  210: 'Sky',
  240: 'Blue',
  270: 'Purple',
  300: 'Magenta',
  330: 'Pink',
}

const getHueName = (hue: number): string => {
  // Find closest named hue
  const normalized = ((hue % 360) + 360) % 360
  const closest = Object.keys(HUE_NAMES)
    .map(Number)
    .reduce((a, b) => {
      const diffA = Math.min(Math.abs(normalized - a), 360 - Math.abs(normalized - a))
      const diffB = Math.min(Math.abs(normalized - b), 360 - Math.abs(normalized - b))
      return diffA < diffB ? a : b
    })
  return HUE_NAMES[closest] ?? 'Unknown'
}

const getLightnessName = (l: number): string => {
  if (l < 0.4) return 'Dark'
  if (l < 0.6) return 'Mid'
  return 'Light'
}

export const $AccentCandidate = {
  /**
   * Default options for generating 68 candidates
   * 12 hues × 5 L steps = 60 chromatic + 8 neutral = 68 total
   */
  defaultOptions: (): AccentCandidateOptions => ({
    chromatic: {
      lMin: 0.25,
      lMax: 0.85,
      chroma: 0.15,
      hueCount: 12,
      lSteps: 5,
    },
    neutral: {
      steps: [0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95],
    },
  }),

  /**
   * Generate accent candidates based on options.
   */
  generate: (options: AccentCandidateOptions): AccentCandidate[] => {
    const candidates: AccentCandidate[] = []
    const { chromatic, neutral } = options

    // Generate chromatic colors
    const hueStep = 360 / chromatic.hueCount
    const lRange = chromatic.lMax - chromatic.lMin
    const lStep = chromatic.lSteps > 1 ? lRange / (chromatic.lSteps - 1) : 0

    for (let hi = 0; hi < chromatic.hueCount; hi++) {
      const hue = hi * hueStep
      for (let li = 0; li < chromatic.lSteps; li++) {
        const l = chromatic.lMin + li * lStep
        const hueName = getHueName(hue)
        const lName = getLightnessName(l)
        candidates.push({
          id: `chromatic-${hi}-${li}`,
          oklch: $Oklch.create(l, chromatic.chroma, hue),
          category: 'chromatic',
          name: `${hueName} ${lName}`,
        })
      }
    }

    // Generate neutral colors
    neutral.steps.forEach((l, i) => {
      candidates.push({
        id: `neutral-${i}`,
        oklch: $Oklch.create(l, 0, 0),
        category: 'neutral',
        name: `Neutral ${Math.round(l * 100)}`,
      })
    })

    return candidates
  },

  /**
   * Generate default 44 candidates.
   */
  generateDefault: (): AccentCandidate[] => {
    return $AccentCandidate.generate($AccentCandidate.defaultOptions())
  },

  /**
   * Score candidates based on compatibility with brand color.
   * Returns candidates sorted by score (best first).
   */
  scoreByBrandColor: (
    candidates: AccentCandidate[],
    brandColor: Oklch,
    topCount = 10
  ): AccentScore[] => {
    const scores: AccentScore[] = candidates.map((candidate) => {
      const score = $AccentCandidate.calculateCompatibility(candidate.oklch, brandColor)
      return { candidate, score, recommended: false }
    })

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score)

    // Mark top N as recommended
    return scores.map((s, i) => ({
      ...s,
      recommended: i < topCount,
    }))
  },

  /**
   * Calculate compatibility score between accent and brand color.
   * Higher score = better complement.
   */
  calculateCompatibility: (accent: Oklch, brand: Oklch): number => {
    // Factors to consider:
    // 1. Hue contrast (complementary/triadic hues score higher)
    // 2. Lightness contrast (different lightness is better)
    // 3. Chroma balance (similar or complementary saturation)

    // Neutral colors get special treatment
    if (accent.C < 0.02) {
      // Neutrals are always somewhat compatible
      // Score based on lightness contrast
      const lContrast = Math.abs(accent.L - brand.L)
      return 0.3 + lContrast * 0.5
    }

    // Hue difference (0-180 degrees)
    const hueDiff = Math.abs(accent.H - brand.H)
    const normalizedHueDiff = Math.min(hueDiff, 360 - hueDiff)

    // Complementary hues (around 180°) score highest
    // Analogous hues (0-30°) score lower (too similar)
    // Triadic (around 120°) also good
    let hueScore: number
    if (normalizedHueDiff < 30) {
      // Too similar - low score
      hueScore = 0.2 + normalizedHueDiff / 30 * 0.3
    } else if (normalizedHueDiff >= 150) {
      // Complementary - high score
      hueScore = 0.8 + (normalizedHueDiff - 150) / 30 * 0.2
    } else if (normalizedHueDiff >= 90 && normalizedHueDiff < 150) {
      // Triadic range - good score
      hueScore = 0.6 + (normalizedHueDiff - 90) / 60 * 0.2
    } else {
      // 30-90 range - moderate score
      hueScore = 0.5 + (normalizedHueDiff - 30) / 60 * 0.1
    }

    // Lightness contrast (different is better for visibility)
    const lContrast = Math.abs(accent.L - brand.L)
    const lScore = 0.3 + lContrast * 0.7

    // Chroma similarity (not too different)
    const cDiff = Math.abs(accent.C - brand.C)
    const cScore = 1 - Math.min(cDiff / 0.2, 1) * 0.3

    // Weighted combination
    return hueScore * 0.5 + lScore * 0.3 + cScore * 0.2
  },
}
