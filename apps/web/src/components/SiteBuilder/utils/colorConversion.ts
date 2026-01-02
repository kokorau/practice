/**
 * HSV to RGB conversion utility
 */

/**
 * Convert HSV values to RGB
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param v - Value (0-100)
 * @returns RGB tuple [r, g, b] with values 0-255
 */
export const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  s = s / 100
  v = v / 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ]
}

/**
 * Convert RGB values to hex string
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Hex color string (e.g., "#ff0000")
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

/**
 * Convert hex string to RGB
 * @param hex - Hex color string (e.g., "#ff0000" or "ff0000")
 * @returns RGB tuple [r, g, b] with values 0-255, or null if invalid
 */
export const hexToRgb = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ]
}

/**
 * Convert RGB values to HSV
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns HSV tuple [h, s, v] with h: 0-360, s: 0-100, v: 0-100
 */
export const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : (d / max) * 100
  const v = max * 100

  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break
      case g: h = ((b - r) / d + 2) * 60; break
      case b: h = ((r - g) / d + 4) * 60; break
    }
  }

  return [Math.round(h), Math.round(s), Math.round(v)]
}

/**
 * Convert hex string to HSV
 * @param hex - Hex color string (e.g., "#ff0000" or "ff0000")
 * @returns HSV tuple [h, s, v], or null if invalid hex
 */
export const hexToHsv = (hex: string): [number, number, number] | null => {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  return rgbToHsv(...rgb)
}
