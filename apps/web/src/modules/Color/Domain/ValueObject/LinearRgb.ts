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
   * Convert sRGB (0-255) to Linear RGB (0-1)
   * Removes gamma correction for linear light calculations
   */
  fromSrgb: (srgb: { r: number; g: number; b: number }): LinearRgb => ({
    r: Math.pow(srgb.r / 255, GAMMA),
    g: Math.pow(srgb.g / 255, GAMMA),
    b: Math.pow(srgb.b / 255, GAMMA),
  }),

  /**
   * Convert sRGB normalized (0-1) to Linear RGB (0-1)
   * Removes gamma correction for linear light calculations
   */
  fromSrgbNormalized: (srgb: { r: number; g: number; b: number }): LinearRgb => ({
    r: Math.pow(srgb.r, GAMMA),
    g: Math.pow(srgb.g, GAMMA),
    b: Math.pow(srgb.b, GAMMA),
  }),

  /**
   * Convert Linear RGB (0-1) to sRGB (0-255)
   * Applies gamma correction for display
   */
  toSrgb: (linear: LinearRgb): { r: number; g: number; b: number } => ({
    r: Math.round(Math.pow(linear.r, 1 / GAMMA) * 255),
    g: Math.round(Math.pow(linear.g, 1 / GAMMA) * 255),
    b: Math.round(Math.pow(linear.b, 1 / GAMMA) * 255),
  }),

  /**
   * Convert Linear RGB (0-1) to sRGB normalized (0-1)
   * Applies gamma correction for display
   */
  toSrgbNormalized: (linear: LinearRgb): { r: number; g: number; b: number } => ({
    r: Math.pow(linear.r, 1 / GAMMA),
    g: Math.pow(linear.g, 1 / GAMMA),
    b: Math.pow(linear.b, 1 / GAMMA),
  }),
}
