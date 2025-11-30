import type { Srgb } from '../../Color/Domain/ValueObject'
import { $Srgb } from '../../Color/Domain/ValueObject'

/**
 * SrgbをCSS RGB文字列に変換
 * Note: Srgbは既に0-1に正規化されているため、$Srgb.toCssRgbを使用
 */
export const srgbToCssRgb = (color: Srgb): string => {
  return $Srgb.toCssRgb(color)
}

/**
 * Srgbを16進数カラーコードに変換
 * Note: Srgbは既に0-1に正規化されているため、$Srgb.toHexを使用
 */
export const srgbToHex = (color: Srgb): string => {
  return $Srgb.toHex(color)
}

/**
 * 色の明度を計算（相対輝度）
 * ITU-R BT.709 の係数を使用
 * Input: 0-1 normalized Srgb
 * Output: 0-1 luminance value
 */
export const getLuminance = (color: Srgb): number => {
  // Already 0-1, no conversion needed
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