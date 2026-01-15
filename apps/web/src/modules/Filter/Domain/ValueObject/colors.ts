/**
 * 色変換ヘルパー関数
 */

/**
 * sRGB → Linear 変換
 * sRGBのガンマエンコードを解除
 */
export const srgbToLinear = (srgb: number): number => {
  if (srgb <= 0.04045) {
    return srgb / 12.92
  }
  return Math.pow((srgb + 0.055) / 1.055, 2.4)
}

/**
 * Linear → sRGB 変換
 * sRGBのガンマエンコードを適用
 */
export const linearToSrgb = (linear: number): number => {
  if (linear <= 0.0031308) {
    return linear * 12.92
  }
  return 1.055 * Math.pow(linear, 1 / 2.4) - 0.055
}

/**
 * Hue (0-360度) から RGB シフト値を計算
 * 返り値は -1 to +1 の範囲で、加算用
 */
export const hueToRGB = (hue: number): { r: number; g: number; b: number } => {
  // 0-360 を 0-1 に正規化
  const h = ((hue % 360) + 360) % 360 / 360

  // HSL to RGB (S=1, L=0.5 で最大彩度)
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }

  const q = 1 // L=0.5, S=1 の場合
  const p = 0

  // RGB値 (0-1)
  const r = hue2rgb(p, q, h + 1/3)
  const g = hue2rgb(p, q, h)
  const b = hue2rgb(p, q, h - 1/3)

  // 中央(0.5)からのオフセットに変換 (-0.5 to +0.5) → 2倍して (-1 to +1)
  return {
    r: (r - 0.5) * 2,
    g: (g - 0.5) * 2,
    b: (b - 0.5) * 2,
  }
}

/**
 * HSL (Hue 0-360, Saturation 0-1, Lightness 0-1) → RGB (0-255)
 */
export const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  const hNorm = ((h % 360) + 360) % 360 / 360

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }

  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, hNorm + 1/3)
    g = hue2rgb(p, q, hNorm)
    b = hue2rgb(p, q, hNorm - 1/3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

/**
 * RGB (0-255) → HSL (Hue 0-360, Saturation 0-1, Lightness 0-1)
 */
export const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const l = (max + min) / 2

  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6
        break
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) / 6
        break
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) / 6
        break
    }
  }

  return {
    h: h * 360,
    s,
    l,
  }
}

/**
 * 色相の差を計算 (0-180度の範囲で返す)
 */
export const hueDifference = (hue1: number, hue2: number): number => {
  const diff = Math.abs(hue1 - hue2)
  return diff > 180 ? 360 - diff : diff
}

/**
 * HSV (Hue 0-360, Saturation 0-1, Value 0-1) -> RGB (0-255)
 */
export const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
  const c = v * s
  const hNorm = ((h % 360) + 360) % 360 / 60
  const x = c * (1 - Math.abs((hNorm % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0

  if (hNorm < 1) { r = c; g = x; b = 0 }
  else if (hNorm < 2) { r = x; g = c; b = 0 }
  else if (hNorm < 3) { r = 0; g = c; b = x }
  else if (hNorm < 4) { r = 0; g = x; b = c }
  else if (hNorm < 5) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

/**
 * RGB (0-255) -> HSV (Hue 0-360, Saturation 0-1, Value 0-1)
 */
export const rgbToHsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255
  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const d = max - min

  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (d !== 0) {
    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) * 60
        break
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) * 60
        break
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) * 60
        break
    }
  }

  return { h, s, v }
}

/**
 * Hex string to RGB (0-255)
 * @param hex - Hex color string (e.g., "#ff0000" or "ff0000")
 * @returns RGB object or null if invalid
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null
  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  }
}

/**
 * RGB (0-255) to hex string
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

/**
 * Hex string to HSV
 * @param hex - Hex color string
 * @returns HSV object or null if invalid hex
 */
export const hexToHsv = (hex: string): { h: number; s: number; v: number } | null => {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  return rgbToHsv(rgb.r, rgb.g, rgb.b)
}

// ========================================
// Normalized (0-1) variants for internal use
// ========================================

/**
 * RGB (0-1) -> HSL (Hue 0-360, Saturation 0-1, Lightness 0-1)
 * Internal variant for 3D LUT processing
 */
export const rgbToHslNormalized = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s, l }
}

/**
 * HSL (Hue 0-360, Saturation 0-1, Lightness 0-1) -> RGB (0-1)
 * Internal variant for 3D LUT processing
 */
export const hslToRgbNormalized = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  const hNorm = h / 360
  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, hNorm + 1 / 3)
    g = hue2rgb(p, q, hNorm)
    b = hue2rgb(p, q, hNorm - 1 / 3)
  }

  return { r, g, b }
}

/**
 * HSV (Hue 0-1, Saturation 0-1, Value 0-1) -> RGB (0-1)
 * Internal variant for 3D scene rendering (lighting showcase)
 */
export const hsvToRgbNormalized = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
  const c = v * s
  const x = c * (1 - Math.abs((h * 6) % 2 - 1))
  const m = v - c

  let r = 0, g = 0, b = 0
  if (h < 1/6) { r = c; g = x; b = 0 }
  else if (h < 2/6) { r = x; g = c; b = 0 }
  else if (h < 3/6) { r = 0; g = c; b = x }
  else if (h < 4/6) { r = 0; g = x; b = c }
  else if (h < 5/6) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  return { r: r + m, g: g + m, b: b + m }
}

/**
 * HSL (Hue 0-1, Saturation 0-1, Lightness 0-1) -> RGB (0-1)
 * Internal variant for 3D scene rendering (lighting showcase)
 */
export const hslToRgbFromNormalized = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h * 6) % 2 - 1))
  const m = l - c / 2

  let r = 0, g = 0, b = 0
  if (h < 1/6) { r = c; g = x; b = 0 }
  else if (h < 2/6) { r = x; g = c; b = 0 }
  else if (h < 3/6) { r = 0; g = c; b = x }
  else if (h < 4/6) { r = 0; g = x; b = c }
  else if (h < 5/6) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  return { r: r + m, g: g + m, b: b + m }
}
