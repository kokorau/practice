/**
 * CTATemplate - Call to action section
 */

import type { SectionTemplate, CTAContent } from '../../Domain'
import {
  ctx,
  cmp,
  containerStyle,
  sectionPadding,
  buttonPadding,
  rounded,
  roundedSm,
  escapeHtml,
} from './templateHelper'

export const CTATemplate: SectionTemplate<CTAContent> = {
  type: 'cta',

  render: (content, theme) => {
    const benefits = content.benefits?.length
      ? `<div style="display: flex; gap: 2rem; justify-content: center; margin-bottom: 2rem; flex-wrap: wrap;">
          ${content.benefits
            .map(
              (benefit) => `
            <span class="scp-body" style="font-size: 0.9rem;">&#10003; ${escapeHtml(benefit)}</span>
          `
            )
            .join('')}
        </div>`
      : ''

    const form = content.inputPlaceholder
      ? `<div class="${cmp.cardFlat}" style="
          display: inline-flex;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: ${rounded(theme)};
        ">
          <input
            type="email"
            placeholder="${escapeHtml(content.inputPlaceholder)}"
            class="scp-body"
            style="
              padding: ${buttonPadding(theme)};
              border: none;
              background: transparent;
              font-size: 1rem;
              min-width: 250px;
              outline: none;
            "
          />
          <button class="${cmp.action}" style="
            padding: ${buttonPadding(theme)};
            border-radius: ${roundedSm(theme)};
            border: none;
            cursor: pointer;
          ">${escapeHtml(content.ctaLabel)}</button>
        </div>`
      : `<button class="${cmp.action}" style="
          padding: ${buttonPadding(theme)};
          border-radius: ${roundedSm(theme)};
          border: none;
          cursor: pointer;
          font-size: 1rem;
        ">${escapeHtml(content.ctaLabel)}</button>`

    const note = content.note
      ? `<p class="scp-meta" style="margin-top: 1rem; font-size: 0.8rem;">${escapeHtml(content.note)}</p>`
      : ''

    return `
<section class="${ctx.sectionContrast}" style="padding: ${sectionPadding(theme)}; text-align: center;">
  <div style="${containerStyle}">
    <h2 class="scp-title" style="font-size: 2.5rem; font-weight: 700; margin: 0 0 1rem;">${escapeHtml(content.title)}</h2>
    <p class="scp-body" style="font-size: 1.125rem; margin: 0 0 2rem; max-width: 600px; margin-left: auto; margin-right: auto;">${escapeHtml(content.description)}</p>
    ${benefits}
    ${form}
    ${note}
  </div>
</section>`
  },
}
