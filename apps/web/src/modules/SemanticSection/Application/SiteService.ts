/**
 * SiteService - Application layer use cases for Site management
 *
 * Provides high-level operations for creating, modifying, and exporting sites.
 */

import type {
  Site,
  SiteMeta,
  Page,
  PageContents,
  SectionContent,
  SectionKind,
  RenderTheme,
} from '../Domain'
import type { SemanticColorPalette } from '../../SemanticColorPalette/Domain'
import type { DesignTokens } from '../../DesignTokens/Domain'
import { DEFAULT_TOKENS } from '../Domain'
import { DEFAULT_SCHEMAS } from './defaultSchemas'
import {
  DEFAULT_TEMPLATES,
  createDemoPage,
  renderPage,
  generateCSS,
} from '../Infra'

// ============================================================================
// Create Site
// ============================================================================

export interface CreateSiteParams {
  meta?: Partial<SiteMeta>
  palette: SemanticColorPalette
  tokens?: DesignTokens
  pages?: readonly Page[]
  contents?: PageContents
}

/**
 * Create a new site with the given parameters
 */
export const createSite = (params: CreateSiteParams): Site => {
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
    templates: DEFAULT_TEMPLATES,
    schemas: DEFAULT_SCHEMAS,
    pages: params.pages ?? [],
    contents: params.contents ?? {},
  }
}

/**
 * Create a demo site with all section types and default content
 * Useful for previewing palettes
 */
export const createDemoSite = (palette: SemanticColorPalette): Site => {
  const page = createDemoPage()

  // Build contents map from page sections (for backward compatibility)
  const contents: Record<string, SectionContent> = {}
  for (const section of page.sections) {
    contents[section.id] = section.content
  }

  return createSite({
    meta: {
      id: 'demo-site',
      name: 'Demo Site',
      description: 'A demo site for previewing semantic color palettes',
    },
    palette,
    pages: [page],
    contents,
  })
}

// ============================================================================
// Update Site
// ============================================================================

/**
 * Update site theme (palette and/or tokens)
 */
export const updateSiteTheme = (
  site: Site,
  theme: Partial<RenderTheme>
): Site => ({
  ...site,
  theme: {
    palette: theme.palette ?? site.theme.palette,
    tokens: theme.tokens ?? site.theme.tokens,
  },
})

/**
 * Update content for a specific section
 */
export const updateSectionContent = (
  site: Site,
  sectionId: string,
  content: SectionContent
): Site => ({
  ...site,
  contents: {
    ...site.contents,
    [sectionId]: content,
  },
})

// ============================================================================
// Query Site
// ============================================================================

/**
 * Get the first page of a site
 */
export const getFirstPage = (site: Site): Page | undefined => site.pages[0]

/**
 * Get content for a specific section
 */
export const getSectionContent = (
  site: Site,
  sectionId: string
): SectionContent | undefined => site.contents[sectionId]

/**
 * Get all section kinds used in the site
 */
export const getUsedSectionKinds = (site: Site): SectionKind[] => {
  const kinds = new Set<SectionKind>()
  for (const page of site.pages) {
    for (const section of page.sections) {
      kinds.add(section.kind)
    }
  }
  return Array.from(kinds)
}

/**
 * @deprecated Use getUsedSectionKinds instead
 */
export const getUsedSectionTypes = getUsedSectionKinds

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
 * Export site to standalone HTML
 *
 * @param site - Site to export
 * @param options - Export options
 * @returns Complete HTML string (can be saved as .html file)
 */
export const exportToHTML = (
  site: Site,
  options: ExportHTMLOptions = {}
): string => {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options }
  const page = opts.page ?? getFirstPage(site)

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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(opts.title ?? site.meta.name)}</title>
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

/**
 * Export site CSS only
 *
 * @param site - Site to export CSS from
 * @param selector - CSS selector for variables (default: ".semantic-page")
 * @returns CSS text (can be saved as .css file)
 */
export const exportToCSS = (
  site: Site,
  selector: string = '.semantic-page'
): string => {
  // generateCSS returns <style>...</style>, strip the tags
  const cssWithTags = generateCSS(site.theme, selector)
  return cssWithTags.replace(/^<style>\n?/, '').replace(/\n?<\/style>$/, '')
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
