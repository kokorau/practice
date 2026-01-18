/**
 * SectionRenderer - Renders sections to HTML
 *
 * Main pipeline for rendering pages from sections using Eta templates.
 */

import type {
  Page,
  Section,
  RenderTheme,
} from '../Domain'
import { toCSSText, toCSSRuleSetsText } from '@practice/semantic-color-palette/Infra'
import { toCSSText as toDesignTokensCSSText } from '../../DesignTokens/Infra'
import { eta } from './etaConfig'
import { getEtaTemplate } from './etaTemplates'

// ============================================================================
// Section Rendering
// ============================================================================

/**
 * Render a single section to HTML
 *
 * Uses section.kind to select template and section.content for data.
 */
export const renderSection = (
  section: Section,
  _theme: RenderTheme
): string => {
  const template = getEtaTemplate(section.kind)
  return eta.renderString(template.template, { content: section.content })
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
 * @param page - Page definition with sections (content embedded)
 * @param theme - Render theme (palette + style)
 * @param options - Rendering options
 * @returns Complete HTML string
 */
export const renderPage = (
  page: Page,
  theme: RenderTheme,
  options: RenderPageOptions = {}
): string => {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Generate CSS
  const css = opts.includeCSS
    ? generateCSS(theme, opts.cssSelector)
    : ''

  // Render sections (content is now embedded in section)
  const sectionsHtml = page.sections
    .map((section) => renderSection(section, theme))
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
