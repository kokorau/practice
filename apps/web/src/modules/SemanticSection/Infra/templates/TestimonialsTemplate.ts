/**
 * TestimonialsTemplate - Customer testimonials section
 */

import type { SectionTemplate, TestimonialsContent } from '../../Domain'
import {
  ctx,
  cmp,
  containerStyle,
  sectionPadding,
  gridGap,
  cardPadding,
  rounded,
  escapeHtml,
} from './templateHelper'

export const TestimonialsTemplate: SectionTemplate<TestimonialsContent> = {
  type: 'testimonials',

  render: (content, theme) => {
    const testimonialCards = content.testimonials
      .map(
        (testimonial) => `
      <div class="${cmp.cardFlat}" style="
        padding: ${cardPadding(theme)};
        border-radius: ${rounded(theme)};
      ">
        <p class="scp-body" style="font-size: 1rem; margin: 0 0 1.5rem; line-height: 1.6;">"${escapeHtml(testimonial.quote)}"</p>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--border);
          "></div>
          <div>
            <span class="scp-title" style="display: block; font-weight: 600; font-size: 0.9rem;">${escapeHtml(testimonial.authorName)}</span>
            <span class="scp-meta" style="font-size: 0.8rem;">${escapeHtml(testimonial.authorRole)}</span>
          </div>
        </div>
      </div>
    `
      )
      .join('')

    return `
<section class="${ctx.sectionTint}" style="padding: ${sectionPadding(theme)};">
  <div style="${containerStyle}">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; text-align: center; margin: 0 0 3rem;">${escapeHtml(content.title)}</h2>
    <div style="
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: ${gridGap(theme)};
    ">
      ${testimonialCards}
    </div>
  </div>
</section>`
  },
}
