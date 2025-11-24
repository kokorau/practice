import type { Shadow, Highlight } from '../../Domain/ValueObject/Shadow'

/**
 * ShadowをCSS形式に変換するレンダラー
 */
export const CssShadowRenderer = {
  /**
   * box-shadow形式の文字列を生成
   */
  toBoxShadow(shadow: Shadow): string {
    const { offsetX, offsetY, blur, spread, opacity, inset } = shadow
    const insetStr = inset ? 'inset ' : ''
    return `${insetStr}${offsetX.toFixed(1)}px ${offsetY.toFixed(1)}px ${blur.toFixed(1)}px ${spread.toFixed(1)}px rgba(0, 0, 0, ${opacity.toFixed(2)})`
  },

  /**
   * ハイライトをbox-shadow形式の文字列に変換
   * 白色の影として表現
   */
  toBoxShadowHighlight(highlight: Highlight): string {
    const { offsetX, offsetY, blur, spread, opacity, inset } = highlight
    const insetStr = inset ? 'inset ' : ''
    return `${insetStr}${offsetX.toFixed(1)}px ${offsetY.toFixed(1)}px ${blur.toFixed(1)}px ${spread.toFixed(1)}px rgba(255, 255, 255, ${opacity.toFixed(2)})`
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
