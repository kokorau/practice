/**
 * FAQTemplate - FAQ accordion section
 */

import type { SectionTemplate, FAQContent } from '../../Domain'
import {
  ctx,
  cmp,
  containerStyle,
  sectionPadding,
  cardGap,
  cardPadding,
  rounded,
  escapeHtml,
} from './templateHelper'

export const FAQTemplate: SectionTemplate<FAQContent> = {
  type: 'faq',

  render: (content, theme) => {
    const faqItems = content.items
      .map(
        (item) => `
      <details class="${cmp.cardFlat}" style="
        padding: 0;
        border-radius: ${rounded(theme)};
        overflow: hidden;
      ">
        <summary class="scp-title" style="
          padding: ${cardPadding(theme)};
          cursor: pointer;
          font-weight: 600;
          font-size: 1rem;
          list-style: none;
        ">
          ${escapeHtml(item.question)}
        </summary>
        <p class="scp-body" style="
          padding: 0 ${cardPadding(theme)} ${cardPadding(theme)};
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.6;
        ">${escapeHtml(item.answer)}</p>
      </details>
    `
      )
      .join('')

    return `
<section class="${ctx.sectionNeutral}" style="padding: ${sectionPadding(theme)};">
  <div style="${containerStyle}">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; text-align: center; margin: 0 0 3rem;">${escapeHtml(content.title)}</h2>
    <div style="
      display: flex;
      flex-direction: column;
      gap: ${cardGap(theme)};
      max-width: 800px;
      margin: 0 auto;
    ">
      ${faqItems}
    </div>
  </div>
</section>`
  },
}
