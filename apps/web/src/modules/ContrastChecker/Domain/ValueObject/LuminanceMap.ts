/**
 * Luminance map representing Y values for each pixel
 * Values are stored as normalized floats (0-1)
 */
export type LuminanceMap = {
  /** Y (luminance) values for each pixel, row-major order */
  data: Float32Array
  width: number
  height: number
}

/**
 * Create a luminance map from dimensions
 */
export function createLuminanceMap(width: number, height: number): LuminanceMap {
  return {
    data: new Float32Array(width * height),
    width,
    height,
  }
}

/**
 * Get luminance value at specific coordinates
 */
export function getLuminanceAt(map: LuminanceMap, x: number, y: number): number {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
    return 0
  }
  return map.data[y * map.width + x] ?? 0
}

export const $LuminanceMap = {
  create: createLuminanceMap,
  getAt: getLuminanceAt,
}
