/**
 * SiteRepository - サイトデータへのアクセスを抽象化
 *
 * Single Source of Truth として機能し、Slice adapters 経由で
 * 各関心事（Palette, Token, Contents, Timeline）へのアクセスを提供する。
 */

import type { Site, Page, PageUuid, Section } from '../../Domain/ValueObject/Site'
import type { Palette, SeedColors } from '@practice/semantic-color-palette/Domain'
import type { DesignTokens } from '@practice/design-tokens/Domain'
import type { Contents, ContentValue } from '@practice/contents'
import type { Timeline } from '@practice/timeline'

export type SiteSubscriber = (site: Site) => void
export type SiteUnsubscribe = () => void

export interface SiteRepository {
  /** 現在のSiteを取得 */
  get(): Site

  /** Siteを設定 */
  set(site: Site): void

  /** Site変更を購読 */
  subscribe(subscriber: SiteSubscriber): SiteUnsubscribe

  // ============================================================================
  // Page Operations
  // ============================================================================

  /** ページを取得 */
  getPage(pageId: PageUuid): Page | undefined

  /** ページを更新 */
  updatePage(pageId: PageUuid, updates: Partial<Page>): void

  /** ページを追加 */
  addPage(page: Page): void

  /** ページを削除 */
  removePage(pageId: PageUuid): void

  // ============================================================================
  // Section Operations
  // ============================================================================

  /** セクションを取得 */
  getSection(pageId: PageUuid, sectionId: string): Section | undefined

  /** セクションを更新 */
  updateSection(pageId: PageUuid, sectionId: string, updates: Partial<Section>): void

  /** セクションを追加 */
  addSection(pageId: PageUuid, section: Section): void

  /** セクションを削除 */
  removeSection(pageId: PageUuid, sectionId: string): void

  // ============================================================================
  // Style Operations (shortcuts for common updates)
  // ============================================================================

  /** Paletteを更新 */
  updatePalette(palette: Partial<Palette>): void

  /** SeedColorsを更新 */
  updateSeedColors(colors: Partial<SeedColors>): void

  /** DesignTokensを更新 */
  updateTokens(tokens: Partial<DesignTokens>): void

  // ============================================================================
  // Contents Operations
  // ============================================================================

  /** Contentsを更新 */
  updateContents(contents: Partial<Contents>): void

  /** パスでコンテンツを取得 */
  getContentByPath(path: string): ContentValue | undefined

  /** パスでコンテンツを設定 */
  setContentByPath(path: string, value: ContentValue): void

  // ============================================================================
  // Timeline Operations (per page)
  // ============================================================================

  /** ページのTimelineを取得 */
  getTimeline(pageId: PageUuid): Timeline | undefined

  /** ページのTimelineを更新 */
  updateTimeline(pageId: PageUuid, timeline: Partial<Timeline>): void
}
