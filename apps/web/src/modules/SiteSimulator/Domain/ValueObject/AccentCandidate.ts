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
 * Harmony pattern types based on color wheel relationships.
 */
export type HarmonyType =
  | 'analogous'           // 0-30°: Similar hues, unified feel
  | 'complementary'       // 150-180°: Opposite hues, high contrast
  | 'triadic'             // 110-130°: Three-way balance
  | 'split-complementary' // 130-150°: Contrast with harmony
  | 'neutral'             // Neutral colors (low chroma)
  | 'other'               // 30-110°: Moderate contrast

/**
 * Scoring result for accent candidates.
 */
export type AccentScore = {
  readonly candidate: AccentCandidate
  /** Overall score (0-1, higher is better) */
  readonly score: number
  /** Whether this candidate is recommended */
  readonly recommended: boolean
  /** Detected harmony pattern with brand color */
  readonly harmonyType: HarmonyType
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

/**
 * Detect harmony type based on hue difference.
 */
const detectHarmonyType = (accent: Oklch, brand: Oklch): HarmonyType => {
  // Neutral accent
  if (accent.C < 0.02) return 'neutral'

  // Calculate normalized hue difference (0-180)
  const hueDiff = Math.abs(accent.H - brand.H)
  const normalizedHueDiff = Math.min(hueDiff, 360 - hueDiff)

  if (normalizedHueDiff <= 30) return 'analogous'
  if (normalizedHueDiff >= 150) return 'complementary'
  if (normalizedHueDiff >= 110 && normalizedHueDiff < 130) return 'triadic'
  if (normalizedHueDiff >= 130 && normalizedHueDiff < 150) return 'split-complementary'
  return 'other'
}

/**
 * Brand color characteristics for scoring adjustments.
 */
type BrandCharacteristics = {
  readonly isNeutral: boolean      // C < 0.03
  readonly isDark: boolean         // L < 0.4
  readonly isLight: boolean        // L > 0.7
  readonly isHighChroma: boolean   // C > 0.2
}

const analyzeBrand = (brand: Oklch): BrandCharacteristics => ({
  isNeutral: brand.C < 0.03,
  isDark: brand.L < 0.4,
  isLight: brand.L > 0.7,
  isHighChroma: brand.C > 0.2,
})

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
    const brandChars = analyzeBrand(brandColor)

    const scores: AccentScore[] = candidates.map((candidate) => {
      const harmonyType = detectHarmonyType(candidate.oklch, brandColor)
      const score = $AccentCandidate.calculateCompatibility(
        candidate.oklch,
        brandColor,
        brandChars,
        harmonyType
      )
      return { candidate, score, recommended: false, harmonyType }
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
  calculateCompatibility: (
    accent: Oklch,
    brand: Oklch,
    brandChars: BrandCharacteristics,
    harmonyType: HarmonyType
  ): number => {
    // === Handle neutral accent ===
    if (harmonyType === 'neutral') {
      const lContrast = Math.abs(accent.L - brand.L)
      let baseScore = 0.3 + lContrast * 0.5

      // Boost neutral accents when brand is also neutral
      if (brandChars.isNeutral) {
        baseScore += 0.3
      }

      return Math.min(baseScore, 1)
    }

    // === Handle neutral brand (any chromatic accent is viable) ===
    if (brandChars.isNeutral) {
      // When brand is neutral, all chromatic colors work
      // Prefer mid-range lightness for balance
      const lBalance = 1 - Math.abs(accent.L - 0.55) * 0.5
      // Prefer moderate chroma
      const cBalance = accent.C > 0.1 && accent.C < 0.2 ? 1 : 0.8
      return 0.6 + lBalance * 0.2 + cBalance * 0.2
    }

    // === Harmony-based scoring for chromatic brand ===
    let harmonyScore: number
    switch (harmonyType) {
      case 'analogous':
        // Similar hues: good for unified feel
        harmonyScore = 0.7
        break
      case 'complementary':
        // Opposite hues: maximum contrast
        harmonyScore = 0.9
        break
      case 'triadic':
        // 120° apart: balanced and vibrant
        harmonyScore = 0.85
        break
      case 'split-complementary':
        // Near-complementary: contrast with nuance
        harmonyScore = 0.85
        break
      default:
        // Other angles: moderate compatibility
        harmonyScore = 0.5
    }

    // === Lightness contrast scoring ===
    const lContrast = Math.abs(accent.L - brand.L)
    let lScore = 0.3 + lContrast * 0.7

    // Adjust based on brand lightness
    if (brandChars.isDark && accent.L > 0.6) {
      // Dark brand + light accent = good contrast
      lScore += 0.15
    } else if (brandChars.isLight && accent.L < 0.5) {
      // Light brand + dark accent = good contrast
      lScore += 0.15
    }

    // === Chroma balance ===
    const cDiff = Math.abs(accent.C - brand.C)
    let cScore = 1 - Math.min(cDiff / 0.2, 1) * 0.3

    // High chroma brand benefits from moderate accent chroma
    if (brandChars.isHighChroma && accent.C < 0.15) {
      cScore += 0.1
    }

    // === Weighted combination ===
    const finalScore = harmonyScore * 0.5 + lScore * 0.3 + cScore * 0.2
    return Math.min(finalScore, 1)
  },
}
