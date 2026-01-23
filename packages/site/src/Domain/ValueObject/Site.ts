/**
 * Site - サイト全体のデータ構造
 *
 * 各パッケージは互いを知らず、Site が組み合わせ層として機能する。
 * - palette/token → CSS vars 生成 (Source)
 * - timeline → binding 式の source (section-visual が参照)
 * - contents → layout/section が参照
 */

import type { Contents } from '@practice/contents'
import type { DesignTokens } from '@practice/design-tokens/Domain'
import type { SectionSemantic, TemplateRegistry, SectionSchemas } from '@practice/section-semantic'
import type { SectionVisual, HeroViewConfig } from '@practice/section-visual'
import type { Palette } from '@practice/semantic-color-palette/Domain'
import type { SiteMeta } from '@practice/site-meta/Domain'
import type { Timeline } from '@practice/timeline'
import type { FilterConfig } from './FilterConfig'

// Re-export from other packages
export type { Contents } from '@practice/contents'
export type { SiteMeta } from '@practice/site-meta/Domain'
export type { Palette, SeedColors } from '@practice/semantic-color-palette/Domain'
export type { SectionSemantic, TemplateRegistry as SectionTemplates, SectionSchemas } from '@practice/section-semantic'
export type { SectionVisual, HeroViewConfig, HeroConfigRef, ConfigRef } from '@practice/section-visual'

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
// Site Configs (normalized data storage)
// ============================================================================

/**
 * 設定データの正規化ストレージ
 * Section は configRef で参照し、実データはここに格納
 */
export interface SiteConfigs {
  /** HeroViewConfig (section-visual) */
  readonly hero: Record<string, HeroViewConfig>
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

  /** フィルター設定 (画像調整) */
  readonly filter: FilterConfig

  /** コンテンツ */
  readonly contents: Contents

  /** セクション定義への参照 */
  readonly templates: TemplateRegistry
  readonly schemas: SectionSchemas

  /** 正規化された設定データ */
  readonly configs: SiteConfigs
}

// ============================================================================
// Factory / Helpers
// ============================================================================

export const $Site = {
  getPage: (site: Site, pageId: PageUuid): Page | undefined => site.pages[pageId],

  getFirstPage: (site: Site): Page | undefined => {
    const pageIds = Object.keys(site.pages) as PageUuid[]
    const firstPageId = pageIds[0]
    return firstPageId !== undefined ? site.pages[firstPageId] : undefined
  },

  getPageIds: (site: Site): PageUuid[] => Object.keys(site.pages) as PageUuid[],

  // Hero Config helpers
  getHeroConfig: (site: Site, configId: string): HeroViewConfig | undefined =>
    site.configs.hero[configId],

  getHeroConfigIds: (site: Site): string[] => Object.keys(site.configs.hero),
} as const
