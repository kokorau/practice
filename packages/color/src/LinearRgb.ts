/**
 * Linear RGB color (0-1 range, no gamma correction)
 * Used for physically correct lighting calculations
 */
export type LinearRgb = {
  r: number  // 0-1
  g: number  // 0-1
  b: number  // 0-1
}

const GAMMA = 2.2

export const $LinearRgb = {
  /**
   * Create LinearRgb from RGB values
   */
  create: (r: number, g: number, b: number): LinearRgb => ({ r, g, b }),

  /**
   * Convert sRGB (0-1 normalized) to Linear RGB (0-1)
   * Removes gamma correction for linear light calculations
   */
  fromSrgb: (srgb: { r: number; g: number; b: number }): LinearRgb => ({
    r: Math.pow(srgb.r, GAMMA),
    g: Math.pow(srgb.g, GAMMA),
    b: Math.pow(srgb.b, GAMMA),
  }),

  /**
   * Convert Linear RGB (0-1) to sRGB (0-1 normalized)
   * Applies gamma correction for display
   */
  toSrgb: (linear: LinearRgb): { r: number; g: number; b: number } => ({
    r: Math.pow(linear.r, 1 / GAMMA),
    g: Math.pow(linear.g, 1 / GAMMA),
    b: Math.pow(linear.b, 1 / GAMMA),
  }),
}
