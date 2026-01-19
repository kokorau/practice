/**
 * Site - Unified type for site data
 *
 * Combines theme, pages, and contents into a single cohesive structure.
 * This is the top-level data structure that will be persisted and passed around.
 *
 * NOTE: For creating sites, use the Application layer functions:
 * - createSite() - Create a new site with custom parameters
 * - createDemoSite() - Create a demo site for previewing palettes
 * - exportToHTML() - Export site to standalone HTML
 * - exportToCSS() - Export site CSS
 */

import type { Page } from './Section'
import type { PageContents } from './SectionContent'
import type { RenderTheme } from './RenderTheme'
import type { SectionSchema } from './SectionSchema'
import type { StringSectionTemplate } from './SectionTemplate'

// ============================================================================
// SiteMeta
// ============================================================================

/**
 * Metadata about the site
 * Will be extended with AI context in later phases
 */
export interface SiteMeta {
  readonly id: string
  readonly name: string
  readonly description?: string
}

// ============================================================================
// Site
// ============================================================================

/**
 * Complete site data structure
 *
 * Contains all data needed to render a site:
 * - meta: Site metadata
 * - theme: Color palette and style settings
 * - templates: Section templates (DB-storable strings)
 * - schemas: Content validation schemas
 * - pages: Page definitions with sections
 * - contents: Actual content for each section
 */
export interface Site {
  readonly meta: SiteMeta
  readonly theme: RenderTheme
  readonly templates: readonly StringSectionTemplate[]
  readonly schemas: readonly SectionSchema[]
  readonly pages: readonly Page[]
  readonly contents: PageContents
}

// ============================================================================
// Query Helpers (Pure functions, no external dependencies)
// ============================================================================

export const $Site = {
  /**
   * Get the first page of a site (convenience helper)
   */
  getFirstPage: (site: Site): Page | undefined => site.pages[0],

  /**
   * Get schema for a section kind
   */
  getSchema: (site: Site, kind: string): SectionSchema | undefined =>
    site.schemas.find((s) => s.type === kind),

  /**
   * Get template for a section kind
   */
  getTemplate: (site: Site, kind: string): StringSectionTemplate | undefined =>
    site.templates.find((t) => t.kind === kind),

  /**
   * Get content for a section by ID
   */
  getContent: (site: Site, sectionId: string) => site.contents[sectionId],

  /**
   * Check if site has a page
   */
  hasPage: (site: Site, pageId: string): boolean =>
    site.pages.some((p) => p.id === pageId),

  /**
   * Get page by ID
   */
  getPage: (site: Site, pageId: string): Page | undefined =>
    site.pages.find((p) => p.id === pageId),
} as const
