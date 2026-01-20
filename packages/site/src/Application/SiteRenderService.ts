/**
 * SiteRenderService - Site rendering and export utilities
 *
 * Provides functions for creating render themes and exporting sites to HTML.
 */

import type { SemanticColorPalette } from '@practice/semantic-color-palette/Domain'
import type { DesignTokens } from '@practice/design-tokens/Domain'
import type { Page, RenderTheme, SectionContent } from '@practice/section-semantic'
import { renderPage, DEFAULT_TOKENS } from '@practice/section-semantic'

// ============================================================================
// Types
// ============================================================================

export interface SiteMeta {
  readonly id: string
  readonly name: string
  readonly description?: string
}

/**
 * Renderable site structure for HTML export
 */
export interface RenderableSite {
  readonly meta: SiteMeta
  readonly theme: RenderTheme
  readonly pages: readonly Page[]
  readonly contents: Record<string, SectionContent>
}

// ============================================================================
// Create Site
// ============================================================================

export interface CreateRenderableSiteParams {
  meta?: Partial<SiteMeta>
  palette: SemanticColorPalette
  tokens?: DesignTokens
  pages?: readonly Page[]
  contents?: Record<string, SectionContent>
}

/**
 * Create a renderable site structure
 */
export const createRenderableSite = (
  params: CreateRenderableSiteParams
): RenderableSite => {
  const meta: SiteMeta = {
    id: params.meta?.id ?? crypto.randomUUID(),
    name: params.meta?.name ?? 'Untitled Site',
    description: params.meta?.description,
  }

  return {
    meta,
    theme: {
      palette: params.palette,
      tokens: params.tokens ?? DEFAULT_TOKENS,
    },
    pages: params.pages ?? [],
    contents: params.contents ?? {},
  }
}

// ============================================================================
// Export Site
// ============================================================================

export interface ExportHTMLOptions {
  /** Page to export (defaults to first page) */
  page?: Page
  /** Include full HTML document structure */
  fullDocument?: boolean
  /** Document title (for full document) */
  title?: string
  /** Additional CSS to include */
  additionalCSS?: string
  /** CSS selector for variables (default: ".semantic-page") */
  cssSelector?: string
  /** Wrapper class (default: "semantic-page") */
  wrapperClass?: string
}

const DEFAULT_EXPORT_OPTIONS: Required<Omit<ExportHTMLOptions, 'page'>> = {
  fullDocument: true,
  title: 'Exported Site',
  additionalCSS: '',
  cssSelector: '.semantic-page',
  wrapperClass: 'semantic-page',
}

/**
 * Export renderable site to standalone HTML
 *
 * @param site - Renderable site to export
 * @param options - Export options
 * @returns Complete HTML string (can be saved as .html file)
 */
export const exportToHTML = (
  site: RenderableSite,
  options: ExportHTMLOptions = {}
): string => {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options }
  const page = opts.page ?? site.pages[0]

  if (!page) {
    throw new Error('No page to export')
  }

  // Render page content with CSS
  const pageHtml = renderPage(page, site.theme, {
    cssSelector: opts.cssSelector,
    includeCSS: true,
    wrapperClass: opts.wrapperClass,
  })

  if (!opts.fullDocument) {
    // Return just the page HTML with embedded styles
    if (opts.additionalCSS) {
      return `<style>${opts.additionalCSS}</style>\n${pageHtml}`
    }
    return pageHtml
  }

  // Full HTML document
  const additionalStyles = opts.additionalCSS
    ? `\n<style>\n${opts.additionalCSS}\n</style>`
    : ''

  // Use provided title, fall back to site name, then to default
  const documentTitle = options.title ?? site.meta.name ?? opts.title

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(documentTitle)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>${additionalStyles}
</head>
<body>
${pageHtml}
</body>
</html>`
}

// ============================================================================
// Helpers
// ============================================================================

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
