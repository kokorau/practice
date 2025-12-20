/**
 * Site - Unified type for site data
 *
 * Combines theme, pages, and contents into a single cohesive structure.
 * This is the top-level data structure that will be persisted and passed around.
 */

import type { Page } from './Section'
import type { PageContents } from './SectionContent'
import type { RenderTheme, StylePack } from './RenderTheme'
import type { SemanticColorPalette } from '../../../SemanticColorPalette/Domain'
import { DEFAULT_STYLE_PACK } from './RenderTheme'
import { $Page } from './Section'
import { getDefaultContent } from '../../Application/getDefaultContent'

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
 * Phase 1: Wraps existing types without breaking changes
 * Future phases will add:
 * - templates: SectionTemplate[]
 * - schemas: SectionSchema[]
 * - assets
 */
export interface Site {
  readonly meta: SiteMeta
  readonly theme: RenderTheme
  readonly pages: readonly Page[]
  readonly contents: PageContents
}

// ============================================================================
// Factory
// ============================================================================

export const $Site = {
  /**
   * Create a new site with the given parameters
   */
  create: (params: {
    meta: SiteMeta
    palette: SemanticColorPalette
    style?: StylePack
    pages: readonly Page[]
    contents: PageContents
  }): Site => ({
    meta: params.meta,
    theme: {
      palette: params.palette,
      style: params.style ?? DEFAULT_STYLE_PACK,
    },
    pages: params.pages,
    contents: params.contents,
  }),

  /**
   * Create a demo site with default content
   * Useful for previewing palettes
   */
  createDemo: (palette: SemanticColorPalette): Site => {
    const page = $Page.createDemo()

    // Build contents from page sections
    const contents: Record<string, ReturnType<typeof getDefaultContent>> = {}
    for (const section of page.sections) {
      contents[section.id] = getDefaultContent(section.type)
    }

    return {
      meta: {
        id: 'demo-site',
        name: 'Demo Site',
        description: 'A demo site for previewing semantic color palettes',
      },
      theme: {
        palette,
        style: DEFAULT_STYLE_PACK,
      },
      pages: [page],
      contents,
    }
  },

  /**
   * Get the first page of a site (convenience helper)
   */
  getFirstPage: (site: Site): Page | undefined => site.pages[0],
} as const
