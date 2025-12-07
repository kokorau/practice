/**
 * ScopedStyle - CSSネスティングでスコープを付与
 *
 * セクションのルート要素にユニークなクラスを付与し、
 * CSSをそのクラスでネストすることでスコープを実現。
 *
 * 例:
 *   CSS: .title { color: red; }
 *   → .s-abc123 { .title { color: red; } }
 *
 *   HTML: <section>...</section>
 *   → <section class="s-abc123">...</section>
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
   * HTMLのルート要素にスコープクラスを付与
   */
  addScopeClass(html: string, scopeClass: string): string {
    if (!html.trim()) return html

    // 既存のclass属性があるかチェック
    const hasClass = /^(\s*<\w+[^>]*)\bclass\s*=\s*["']/.test(html)

    if (hasClass) {
      // 既存のclass属性がある場合は拡張
      return html.replace(
        /^(\s*<\w+[^>]*)\bclass\s*=\s*["']([^"']*)["']/,
        (_, before: string, existingClasses: string) => {
          const classes = existingClasses ? `${scopeClass} ${existingClasses}` : scopeClass
          return `${before}class="${classes}"`
        }
      )
    } else {
      // class属性がなければ追加
      return html.replace(
        /^(\s*<\w+)(\s|>)/,
        (_, tagStart: string, rest: string) => {
          return `${tagStart} class="${scopeClass}"${rest}`
        }
      )
    }
  },
}
