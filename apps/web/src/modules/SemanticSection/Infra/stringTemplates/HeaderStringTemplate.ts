/**
 * HeaderStringTemplate - String-based header template
 *
 * DB-storable template with preprocessor for variable preparation.
 */

import type { StringSectionTemplate, TemplateVars, HeaderContent, RenderTheme } from '../../Domain'
import { escapeHtml, mapToHtml, ifElse, when } from '../templateEvaluator'
import { CONTEXT_CLASS_NAMES, COMPONENT_CLASS_NAMES } from '../../../SemanticColorPalette/Domain'
import { $StylePack } from '../../Domain'

// ============================================================================
// Template Definition
// ============================================================================

/**
 * Header template string
 * Variables: logoHtml, linksHtml, ctaHtml, ctaPrimaryHtml
 */
export const headerTemplate: StringSectionTemplate = {
  id: 'header-default',
  type: 'header',
  template: `
<header class="${CONTEXT_CLASS_NAMES.canvas}" style="padding: 1rem 0;">
  <div style="max-width: 980px; margin: 0 auto; padding: 0 2rem;">
    <nav style="display: flex; align-items: center; justify-content: space-between;">
      <div class="logo">\${logoHtml}</div>
      <div style="display: flex; gap: \${cardGap}; align-items: center;">
        \${linksHtml}
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        \${ctaHtml}
        \${ctaPrimaryHtml}
      </div>
    </nav>
  </div>
</header>`.trim(),
}

// ============================================================================
// Preprocessor
// ============================================================================

/**
 * Prepare variables for header template
 */
export const preprocessHeader = (
  content: HeaderContent,
  theme: RenderTheme
): TemplateVars => {
  const cardGap = $StylePack.cardGap(theme.style.gap)
  const buttonPadding = $StylePack.buttonPadding(theme.style.padding)
  const roundedSm = getRoundedSm(theme)

  // Logo: image or text
  const logoHtml = ifElse(
    content.logoUrl,
    `<img src="${escapeHtml(content.logoUrl ?? '')}" alt="${escapeHtml(content.logoText)}" style="height: 2rem;" />`,
    `<span class="scp-title" style="font-size: 1.25rem; font-weight: 700;">${escapeHtml(content.logoText)}</span>`
  )

  // Navigation links
  const linksHtml = mapToHtml(
    content.links,
    (link) => `<a href="${escapeHtml(link.url)}" class="scp-body" style="text-decoration: none;">${escapeHtml(link.label)}</a>`
  )

  // CTA buttons
  const ctaHtml = when(
    content.ctaLabel && !content.ctaUrl,
    `<button class="${COMPONENT_CLASS_NAMES.actionQuiet}" style="padding: ${buttonPadding}; border-radius: ${roundedSm}; border: none; cursor: pointer;">${escapeHtml(content.ctaLabel ?? '')}</button>`
  )

  const ctaPrimaryHtml = when(
    content.ctaUrl,
    `<button class="${COMPONENT_CLASS_NAMES.action}" style="padding: ${buttonPadding}; border-radius: ${roundedSm}; border: none; cursor: pointer;">${escapeHtml(content.ctaLabel || 'Sign up')}</button>`
  )

  return {
    logoHtml,
    linksHtml,
    ctaHtml,
    ctaPrimaryHtml,
    cardGap,
  }
}

// ============================================================================
// Helper
// ============================================================================

const getRoundedSm = (theme: RenderTheme): string => {
  const size = theme.style.rounded
  if (size === 'none') return '0'
  if (size === 'sm') return '2px'
  if (size === 'md') return '4px'
  if (size === 'lg') return '8px'
  return '9999px'
}
