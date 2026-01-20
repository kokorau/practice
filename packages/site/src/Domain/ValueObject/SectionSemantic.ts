/**
 * SectionSemantic - HTML ベースのセマンティックセクション
 *
 * CSS vars を消費して HTML をレンダリングする。
 */

export interface SectionSemantic {
  readonly kind: 'semantic'
  readonly id: string
  /** コンテンツへの参照パス */
  readonly contentPath: string
}
