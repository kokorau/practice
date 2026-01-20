/**
 * Site - サイト全体のデータ構造
 *
 * 各パッケージは互いを知らず、Site が組み合わせ層として機能する。
 * - palette/token → CSS vars 生成 (Source)
 * - timeline → binding 式の source (section-visual が参照)
 * - contents → layout/section が参照
 */

import type { Color } from '@practice/color'
import type { DesignTokens } from '@practice/design-tokens/Domain'
import type { SemanticColorPalette, PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import type { Timeline } from '@practice/timeline'
import type { SectionSemantic } from './SectionSemantic'
import type { SectionVisual } from './SectionVisual'
import type { Contents } from './Contents'
import type { SectionTemplates, SectionSchemas } from './SectionDefinitions'

// ============================================================================
// Branded Types
// ============================================================================

export type PageUuid = string & { readonly __brand: 'PageUuid' }

export const PageUuid = (uuid: string): PageUuid => uuid as PageUuid

// ============================================================================
// SiteMeta
// ============================================================================

export interface SiteMeta {
  readonly id: string
  readonly name: string
  readonly description?: string
}

// ============================================================================
// Palette
// ============================================================================

export interface SeedColors {
  readonly brand: Color
  readonly foundation: Color
  readonly accent: Color
}

export interface Palette {
  readonly seedColors: SeedColors
  readonly semanticPalette: SemanticColorPalette
  readonly primitivePalette: PrimitivePalette
}

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
