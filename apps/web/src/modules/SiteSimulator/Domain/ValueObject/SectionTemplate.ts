/**
 * SectionTemplate - テンプレート定義（Meta + デフォルトコンテンツ）
 */
import type { SectionMeta } from './SectionMeta'
import type { SectionContent } from './SectionContent'

export type SectionTemplate = {
  readonly meta: SectionMeta
  readonly defaultContent: () => SectionContent
}
