import type { Srgb } from '../../Color/Domain/ValueObject'

/**
 * SrgbをCSS RGB文字列に変換
 */
export const srgbToCssRgb = (color: Srgb): string => {
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Srgbを16進数カラーコードに変換
 */
export const srgbToHex = (color: Srgb): string => {
  const toHex = (value: number) => {
    const hex = Math.round(value * 255).toString(16).padStart(2, '0')
    return hex
  }
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`
}

/**
 * 色の明度を計算（相対輝度）
 */
export const getLuminance = (color: Srgb): number => {
  // ITU-R BT.709 の係数を使用
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b
}

/**
 * 背景色に対して適切なテキスト色を選択
 */
export const getContrastColor = (background: Srgb): Srgb => {
  const luminance = getLuminance(background)
  return luminance > 0.5
    ? { r: 0, g: 0, b: 0 } // 明るい背景には黒
    : { r: 1, g: 1, b: 1 } // 暗い背景には白
}