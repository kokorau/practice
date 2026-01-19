/**
 * SectionSemantic - HTML ベースのセマンティックセクション
 *
 * CSS vars を消費して HTML をレンダリングする。
 */

export interface SectionSemantic {
  readonly kind: 'semantic'
  readonly id: string
  /** セクションタイプ (header, hero, features, etc.) */
  readonly type: string
  /** コンテンツへの参照パス */
  readonly contentPath: string
}
