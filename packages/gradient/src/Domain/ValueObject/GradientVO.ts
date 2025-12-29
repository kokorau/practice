/**
 * 2D Vector in UV space (0..1)
 */
export type Vec2 = {
  readonly x: number
  readonly y: number
}

/**
 * Display-P3 color with alpha (all values 0..1)
 */
export type P3Color = {
  readonly rgba: readonly [number, number, number, number]
}

/**
 * A color point in the gradient
 */
export type ColorPoint = {
  /** Position in UV space (0..1) */
  readonly pos: Vec2
  /** Color in Display-P3 with alpha */
  readonly color: P3Color
  /** Influence radius in UV space */
  readonly radius: number
  /** Weight multiplier (>= 0) */
  readonly strength: number
}

/**
 * Color mixing parameters
 */
export type MixParams = {
  /** Distance falloff shaping (affects sigma in Gaussian) */
  readonly softness: number
  /** Chroma preservation amount (0..1, 0 = disabled) */
  readonly preserveChroma: number
}

/**
 * FBM domain warp parameters
 * Applied as: uv' = uv + noise(uv) * amplitude
 */
export type WarpParams = {
  readonly seed: number
  /** Warp displacement strength in UV space */
  readonly amplitude: number
  /** Base noise frequency */
  readonly frequency: number
  /** Number of FBM octaves */
  readonly octaves: number
  /** Frequency multiplier per octave (typically 2.0) */
  readonly lacunarity: number
  /** Amplitude multiplier per octave (typically 0.5) */
  readonly gain: number
}

/**
 * Post-processing parameters
 * - Grain: monochrome noise
 * - Dither: blue-noise based
 */
export type PostParams = {
  readonly grainSeed: number
  /** Grain intensity (0..1) */
  readonly grainAmount: number
  /** Grain scale factor */
  readonly grainScale: number
  /** Blue-noise dither intensity (0..1) */
  readonly ditherAmount: number
}

/**
 * Complete gradient value object
 * Contains all parameters needed to reproduce the gradient
 */
export type GradientVO = {
  readonly version: 1
  /** Color points (usually 2..8) */
  readonly points: readonly ColorPoint[]
  readonly mix: MixParams
  readonly warp: WarpParams
  readonly post: PostParams
}

export const $GradientVO = {
  /** Maximum color points supported by GPU renderer */
  MAX_POINTS: 32,

  create: (params: {
    points: ColorPoint[]
    mix?: Partial<MixParams>
    warp?: Partial<WarpParams>
    post?: Partial<PostParams>
  }): GradientVO => ({
    version: 1,
    points: params.points,
    mix: {
      softness: params.mix?.softness ?? 0.5,
      preserveChroma: params.mix?.preserveChroma ?? 0.5,
    },
    warp: {
      seed: params.warp?.seed ?? 0,
      amplitude: params.warp?.amplitude ?? 0,
      frequency: params.warp?.frequency ?? 1,
      octaves: params.warp?.octaves ?? 4,
      lacunarity: params.warp?.lacunarity ?? 2,
      gain: params.warp?.gain ?? 0.5,
    },
    post: {
      grainSeed: params.post?.grainSeed ?? 0,
      grainAmount: params.post?.grainAmount ?? 0,
      grainScale: params.post?.grainScale ?? 1,
      ditherAmount: params.post?.ditherAmount ?? 0,
    },
  }),

  isValid: (vo: GradientVO): boolean => {
    return (
      vo.version === 1 &&
      vo.points.length > 0 &&
      vo.points.length <= $GradientVO.MAX_POINTS
    )
  },
}

export const $ColorPoint = {
  create: (
    pos: Vec2,
    color: P3Color,
    radius: number,
    strength: number = 1
  ): ColorPoint => ({
    pos,
    color,
    radius,
    strength,
  }),
}

export const $P3Color = {
  create: (r: number, g: number, b: number, a: number = 1): P3Color => ({
    rgba: [r, g, b, a],
  }),

  fromRgba: (rgba: readonly [number, number, number, number]): P3Color => ({
    rgba,
  }),
}

export const $Vec2 = {
  create: (x: number, y: number): Vec2 => ({ x, y }),
  zero: (): Vec2 => ({ x: 0, y: 0 }),
  center: (): Vec2 => ({ x: 0.5, y: 0.5 }),
}
