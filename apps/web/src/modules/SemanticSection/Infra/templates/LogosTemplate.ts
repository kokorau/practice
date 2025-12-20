/**
 * LogosTemplate - Trusted by / logo cloud section
 */

import type { SectionTemplate, LogosContent } from '../../Domain'
import { ctx, containerStyle, escapeHtml } from './templateHelper'

export const LogosTemplate: SectionTemplate<LogosContent> = {
  type: 'logos',

  render: (content) => {
    const logos = content.logos
      .map(
        (logo) => `
      <div class="scp-title" style="font-size: 1.25rem; font-weight: 600; opacity: 0.7;">${escapeHtml(logo)}</div>
    `
      )
      .join('')

    return `
<section class="${ctx.sectionNeutral}" style="padding: 3rem 0;">
  <div style="${containerStyle}">
    <p class="scp-meta" style="text-align: center; margin: 0 0 1.5rem; font-size: 0.875rem;">${escapeHtml(content.label)}</p>
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 4rem;
      flex-wrap: wrap;
    ">
      ${logos}
    </div>
  </div>
</section>`
  },
}
