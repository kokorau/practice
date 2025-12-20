/**
 * PricingTemplate - Pricing plans section
 */

import type { SectionTemplate, PricingContent } from '../../Domain'
import {
  ctx,
  cmp,
  containerStyle,
  sectionPadding,
  gridGap,
  cardPadding,
  buttonPadding,
  rounded,
  roundedSm,
  escapeHtml,
} from './templateHelper'

export const PricingTemplate: SectionTemplate<PricingContent> = {
  type: 'pricing',

  render: (content, theme) => {
    const planCards = content.plans
      .map(
        (plan) => `
      <div class="${plan.isFeatured ? cmp.card : cmp.cardFlat}" style="
        padding: ${cardPadding(theme)};
        border-radius: ${rounded(theme)};
        position: relative;
      ">
        ${
          plan.badge
            ? `<span class="scp-meta" style="
            position: absolute;
            top: -0.75rem;
            right: 1rem;
            padding: 0.25rem 0.75rem;
            background: var(--link-text);
            color: var(--surface);
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
          ">${escapeHtml(plan.badge)}</span>`
            : ''
        }
        <h3 class="scp-title" style="font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem;">${escapeHtml(plan.name)}</h3>
        <div style="margin-bottom: 1.5rem;">
          <span class="scp-title" style="font-size: 2.5rem; font-weight: 700;">${escapeHtml(plan.price)}</span>
          ${plan.period ? `<span class="scp-meta" style="font-size: 0.9rem;">/${escapeHtml(plan.period)}</span>` : ''}
        </div>
        <ul style="list-style: none; padding: 0; margin: 0 0 1.5rem;">
          ${plan.features
            .map(
              (feature) => `
            <li class="scp-body" style="padding: 0.5rem 0; font-size: 0.9rem;">${escapeHtml(feature.text)}</li>
          `
            )
            .join('')}
        </ul>
        <button class="${plan.isFeatured ? cmp.action : cmp.actionQuiet}" style="
          width: 100%;
          padding: ${buttonPadding(theme)};
          border-radius: ${roundedSm(theme)};
          border: none;
          cursor: pointer;
        ">${escapeHtml(plan.ctaLabel)}</button>
      </div>
    `
      )
      .join('')

    return `
<section class="${ctx.canvas}" style="padding: ${sectionPadding(theme)};">
  <div style="${containerStyle}">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; text-align: center; margin: 0 0 0.5rem;">${escapeHtml(content.title)}</h2>
    ${content.subtitle ? `<p class="scp-body" style="text-align: center; margin: 0 0 3rem;">${escapeHtml(content.subtitle)}</p>` : ''}
    <div style="
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: ${gridGap(theme)};
      max-width: 1000px;
      margin: 0 auto;
    ">
      ${planCards}
    </div>
  </div>
</section>`
  },
}
