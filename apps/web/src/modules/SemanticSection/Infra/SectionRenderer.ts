/**
 * SectionRenderer - Renders sections to HTML
 *
 * Main pipeline for rendering pages from sections using Eta templates.
 */

import type {
  Page,
  Section,
  SectionContent,
  PageContents,
  RenderTheme,
} from '../Domain'
import { toCSSText, toCSSRuleSetsText } from '../../SemanticColorPalette/Infra'
import { toCSSText as toDesignTokensCSSText } from '../../DesignTokens/Infra'
import { eta } from './etaConfig'
import { getEtaTemplate } from './etaTemplates'

// ============================================================================
// Section Rendering
// ============================================================================

/**
 * Render a single section to HTML
 */
export const renderSection = (
  section: Section,
  content: SectionContent,
  _theme: RenderTheme
): string => {
  const template = getEtaTemplate(section.type)
  return eta.renderString(template.template, { content })
}

// ============================================================================
// Page Rendering
// ============================================================================

export interface RenderPageOptions {
  /** CSS selector for CSS variables (default: ".semantic-page") */
  cssSelector?: string
  /** Include CSS in output (default: true) */
  includeCSS?: boolean
  /** Wrapper class name (default: "semantic-page") */
  wrapperClass?: string
}

const DEFAULT_OPTIONS: Required<RenderPageOptions> = {
  cssSelector: '.semantic-page',
  includeCSS: true,
  wrapperClass: 'semantic-page',
}

/**
 * Render a page to HTML
 *
 * @param page - Page definition with sections
 * @param contents - Map of section ID to content
 * @param theme - Render theme (palette + style)
 * @param options - Rendering options
 * @returns Complete HTML string
 */
export const renderPage = (
  page: Page,
  contents: PageContents,
  theme: RenderTheme,
  options: RenderPageOptions = {}
): string => {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Generate CSS
  const css = opts.includeCSS
    ? generateCSS(theme, opts.cssSelector)
    : ''

  // Render sections
  const sectionsHtml = page.sections
    .map((section) => {
      const content = contents[section.id]
      if (!content) {
        console.warn(`No content found for section: ${section.id}`)
        return ''
      }
      return renderSection(section, content, theme)
    })
    .filter(Boolean)
    .join('\n')

  // Wrap in page container
  return `${css}
<div class="${opts.wrapperClass}">
${sectionsHtml}
</div>`
}

// ============================================================================
// CSS Generation
// ============================================================================

/**
 * Generate CSS text for the page
 */
export const generateCSS = (
  theme: RenderTheme,
  selector: string = '.semantic-page'
): string => {
  const colorVariables = toCSSText(theme.palette, selector)
  const tokenVariables = toDesignTokensCSSText(theme.tokens, selector)
  const cssRuleSets = toCSSRuleSetsText()

  return `<style>
${colorVariables}

${tokenVariables}

${cssRuleSets}
</style>`
}
