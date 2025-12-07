/**
 * ScopedStyle - CSSネスティングでスコープを付与
 *
 * セクションのHTMLをスコープ用のdivでラップし、
 * CSSをそのクラスでネストすることでスコープを実現。
 *
 * 例:
 *   CSS: .hero { ... }
 *   → .s-abc123 { .hero { ... } }
 *
 *   HTML: <section class="hero">...</section>
 *   → <div class="s-abc123"><section class="hero">...</section></div>
 *
 * この方式により、テンプレートのCSSは通常の子孫セレクタで記述でき、
 * ルート要素に &.class のような特殊な記法が不要になる。
 */

export const $ScopedStyle = {
  /**
   * スコープ用のクラス名を生成
   */
  scopeClass(sectionId: string): string {
    // UUIDの先頭8文字を使用（十分ユニーク）
    return `s-${sectionId.slice(0, 8)}`
  },

  /**
   * CSSをスコープクラスでネスト
   */
  wrapCss(css: string, scopeClass: string): string {
    if (!css.trim()) return ''
    return `.${scopeClass} {\n${css}\n}`
  },

  /**
   * HTMLをスコープ用のdivでラップ
   */
  wrapHtml(html: string, scopeClass: string): string {
    if (!html.trim()) return html
    return `<div class="${scopeClass}">${html}</div>`
  },
}
