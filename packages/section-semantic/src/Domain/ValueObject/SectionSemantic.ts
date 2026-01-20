/**
 * SectionSemantic - HTML ベースのセマンティックセクション
 *
 * CSS vars を消費して HTML をレンダリングする。
 * Site パッケージから参照される抽象的なセクション型。
 */

export interface SectionSemantic {
  readonly kind: 'semantic'
  readonly id: string
  /** コンテンツへの参照パス */
  readonly contentPath: string
}
