/**
 * sRGB color (0-255 range)
 */
export type Srgb = {
  r: number  // 0-255
  g: number  // 0-255
  b: number  // 0-255
}

export const $Srgb = {
  /**
   * Create Srgb from RGB values
   */
  create: (r: number, g: number, b: number): Srgb => ({ r, g, b }),
}
