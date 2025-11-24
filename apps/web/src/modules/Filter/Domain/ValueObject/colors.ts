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
