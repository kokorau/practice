/**
 * HeroTemplate - Hero section with title, subtitle, CTAs and stats
 */

import type { SectionTemplate, HeroContent } from '../../Domain'
import {
  ctx,
  cmp,
  containerStyle,
  sectionPadding,
  cardGap,
  buttonPadding,
  roundedSm,
  escapeHtml,
} from './templateHelper'

export const HeroTemplate: SectionTemplate<HeroContent> = {
  type: 'hero',

  render: (content, theme) => {
    const badge = content.badge
      ? `<span class="scp-meta" style="
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          background: var(--surface);
          border-radius: 9999px;
          font-size: 0.875rem;
        ">
          <span style="width: 6px; height: 6px; background: var(--link-text); border-radius: 50%;"></span>
          ${escapeHtml(content.badge)}
        </span>`
      : ''

    const titleParts = content.highlight
      ? content.title.replace(
          content.highlight,
          `</span><br /><span class="scp-link">${escapeHtml(content.highlight)}</span><span class="scp-title">`
        )
      : content.title

    const title = `<h1 class="scp-title" style="
      font-size: 3.5rem;
      font-weight: 700;
      line-height: 1.1;
      margin: 1rem 0;
    ">${titleParts}</h1>`

    const subtitle = `<p class="scp-body" style="
      font-size: 1.25rem;
      max-width: 600px;
      margin: 0 auto 2rem;
    ">${escapeHtml(content.subtitle)}</p>`

    const primaryCta = `<button class="${cmp.action}" style="
      padding: ${buttonPadding(theme)};
      border-radius: ${roundedSm(theme)};
      border: none;
      cursor: pointer;
      font-size: 1rem;
    ">${escapeHtml(content.primaryCtaLabel)}</button>`

    const secondaryCta = content.secondaryCtaLabel
      ? `<button class="${cmp.actionQuiet}" style="
          padding: ${buttonPadding(theme)};
          border-radius: ${roundedSm(theme)};
          border: none;
          cursor: pointer;
          font-size: 1rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        ">
          <span style="font-size: 0.75rem;">&#9654;</span>
          ${escapeHtml(content.secondaryCtaLabel)}
        </button>`
      : ''

    const stats = content.stats?.length
      ? `<div style="display: flex; gap: 3rem; margin-top: 3rem; justify-content: center;">
          ${content.stats
            .map(
              (stat) => `
            <div style="text-align: center;">
              <span class="scp-title" style="font-size: 2rem; font-weight: 700;">${escapeHtml(stat.value)}</span>
              <span class="scp-meta" style="display: block; font-size: 0.875rem;">${escapeHtml(stat.label)}</span>
            </div>
          `
            )
            .join('')}
        </div>`
      : ''

    return `
<section class="${ctx.sectionTint}" style="padding: ${sectionPadding(theme)}; text-align: center;">
  <div style="${containerStyle}">
    ${badge}
    ${title}
    ${subtitle}
    <div style="display: flex; gap: ${cardGap(theme)}; justify-content: center;">
      ${primaryCta}
      ${secondaryCta}
    </div>
    ${stats}
  </div>
</section>`
  },
}
