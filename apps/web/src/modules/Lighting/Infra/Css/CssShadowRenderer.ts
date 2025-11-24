import type { Shadow, Highlight } from '../../Domain/ValueObject/Shadow'

/**
 * ShadowをCSS形式に変換するレンダラー
 */
/**
 * HEX色をRGBに変換
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(result[1] ?? '0', 16),
    g: parseInt(result[2] ?? '0', 16),
    b: parseInt(result[3] ?? '0', 16),
  }
}

export const CssShadowRenderer = {
  /**
   * box-shadow形式の文字列を生成
   * 影の色は光源色の暗い版
   */
  toBoxShadow(shadow: Shadow): string {
    const { offsetX, offsetY, blur, spread, opacity, inset, color } = shadow
    const insetStr = inset ? 'inset ' : ''
    const { r, g, b } = hexToRgb(color)
    return `${insetStr}${offsetX.toFixed(1)}px ${offsetY.toFixed(1)}px ${blur.toFixed(1)}px ${spread.toFixed(1)}px rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)})`
  },

  /**
   * ハイライトをbox-shadow形式の文字列に変換
   * 光源色を使用
   */
  toBoxShadowHighlight(highlight: Highlight): string {
    const { offsetX, offsetY, blur, spread, opacity, inset, color } = highlight
    const insetStr = inset ? 'inset ' : ''
    const { r, g, b } = hexToRgb(color)
    return `${insetStr}${offsetX.toFixed(1)}px ${offsetY.toFixed(1)}px ${blur.toFixed(1)}px ${spread.toFixed(1)}px rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)})`
  },

  /**
   * 複数の影を合成したbox-shadow文字列を生成
   */
  toBoxShadowMultiple(shadows: Shadow[]): string {
    return shadows.map((s) => this.toBoxShadow(s)).join(', ')
  },

  /**
   * 影とハイライトを合成したbox-shadow文字列を生成
   */
  toBoxShadowWithHighlight(shadows: Shadow[], highlights: Highlight[]): string {
    const shadowStrs = shadows.map((s) => this.toBoxShadow(s))
    const highlightStrs = highlights.map((h) => this.toBoxShadowHighlight(h))
    return [...highlightStrs, ...shadowStrs].join(', ')
  },
}
