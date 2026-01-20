/**
 * Site - サイト全体のデータ構造
 *
 * 各パッケージは互いを知らず、Site が組み合わせ層として機能する。
 * - palette/token → CSS vars 生成 (Source)
 * - timeline → binding 式の source (section-visual が参照)
 * - contents → layout/section が参照
 */

import type { DesignTokens } from '@practice/design-tokens/Domain'
import type { Palette, SeedColors } from '@practice/semantic-color-palette/Domain'
import type { SectionSemantic } from '@practice/section-semantic'
import type { SectionVisual } from '@practice/section-visual'
import type { SiteMeta } from '@practice/site-meta/Domain'
import type { Timeline } from '@practice/timeline'
import type { Contents } from './Contents'
import type { SectionTemplates, SectionSchemas } from './SectionDefinitions'

// Re-export from other packages
export type { SiteMeta } from '@practice/site-meta/Domain'
export type { Palette, SeedColors } from '@practice/semantic-color-palette/Domain'
export type { SectionSemantic } from '@practice/section-semantic'
export type { SectionVisual } from '@practice/section-visual'

// ============================================================================
// Branded Types
// ============================================================================

export type PageUuid = string & { readonly __brand: 'PageUuid' }

export const PageUuid = (uuid: string): PageUuid => uuid as PageUuid

// ============================================================================
// Page
// ============================================================================

export type Section = SectionSemantic | SectionVisual

export interface Page {
  readonly id: PageUuid
  readonly sections: readonly Section[]
  readonly timeline: Timeline
}

// ============================================================================
// Site
// ============================================================================

export interface Site {
  readonly meta: SiteMeta

  /** ページ構造 */
  readonly pages: Record<PageUuid, Page>

  /** スタイル (CSS vars source) */
  readonly token: DesignTokens
  readonly palette: Palette

  /** コンテンツ */
  readonly contents: Contents

  /** セクション定義への参照 */
  readonly templates: SectionTemplates
  readonly schemas: SectionSchemas
}

// ============================================================================
// Factory / Helpers
// ============================================================================

export const $Site = {
  getPage: (site: Site, pageId: PageUuid): Page | undefined => site.pages[pageId],

  getFirstPage: (site: Site): Page | undefined => {
    const pageIds = Object.keys(site.pages) as PageUuid[]
    return pageIds.length > 0 ? site.pages[pageIds[0]] : undefined
  },

  getPageIds: (site: Site): PageUuid[] => Object.keys(site.pages) as PageUuid[],
} as const
