/**
 * HeaderTemplate - Site header/navigation section
 */

import type { SectionTemplate, HeaderContent } from '../../Domain'
import { ctx, cmp, containerStyle, flexBetween, cardGap, buttonPadding, roundedSm, escapeHtml } from './templateHelper'

export const HeaderTemplate: SectionTemplate<HeaderContent> = {
  type: 'header',

  render: (content, theme) => {
    const logo = content.logoUrl
      ? `<img src="${escapeHtml(content.logoUrl)}" alt="${escapeHtml(content.logoText)}" style="height: 2rem;" />`
      : `<span class="scp-title" style="font-size: 1.25rem; font-weight: 700;">${escapeHtml(content.logoText)}</span>`

    const links = content.links
      .map(
        (link) =>
          `<a href="${escapeHtml(link.url)}" class="scp-body" style="text-decoration: none;">${escapeHtml(link.label)}</a>`
      )
      .join('')

    const cta = content.ctaLabel
      ? `<button class="${cmp.actionQuiet}" style="padding: ${buttonPadding(theme)}; border-radius: ${roundedSm(theme)}; border: none; cursor: pointer;">${escapeHtml(content.ctaLabel)}</button>`
      : ''

    const ctaPrimary = content.ctaUrl
      ? `<button class="${cmp.action}" style="padding: ${buttonPadding(theme)}; border-radius: ${roundedSm(theme)}; border: none; cursor: pointer;">${escapeHtml(content.ctaLabel || 'Sign up')}</button>`
      : ''

    return `
<header class="${ctx.canvas}" style="padding: 1rem 0;">
  <div style="${containerStyle}">
    <nav style="${flexBetween}">
      <div class="logo">${logo}</div>
      <div style="display: flex; gap: ${cardGap(theme)}; align-items: center;">
        ${links}
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        ${cta}
        ${ctaPrimary}
      </div>
    </nav>
  </div>
</header>`
  },
}
