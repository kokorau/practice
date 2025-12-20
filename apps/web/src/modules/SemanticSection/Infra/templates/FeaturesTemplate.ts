/**
 * FeaturesTemplate - Feature cards grid section
 */

import type { SectionTemplate, FeaturesContent } from '../../Domain'
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

export const FeaturesTemplate: SectionTemplate<FeaturesContent> = {
  type: 'features',

  render: (content, theme) => {
    const featureCards = content.features
      .map(
        (feature) => `
      <div class="${cmp.card}" style="
        padding: ${cardPadding(theme)};
        border-radius: ${rounded(theme)};
      ">
        <div style="
          width: 120px;
          height: 80px;
          margin-bottom: 1rem;
          background: var(--surface);
          border-radius: ${rounded(theme)};
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg viewBox="0 0 120 80" style="width: 100%; height: 100%; opacity: 0.6;">
            <circle cx="60" cy="40" r="25" fill="var(--link-text)" opacity="0.5" />
          </svg>
        </div>
        <h3 class="scp-title" style="font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem;">${escapeHtml(feature.title)}</h3>
        <p class="scp-body" style="font-size: 0.9rem; margin: 0;">${escapeHtml(feature.description)}</p>
      </div>
    `
      )
      .join('')

    return `
<section class="${ctx.canvas}" style="padding: ${sectionPadding(theme)};">
  <div style="${containerStyle}">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; text-align: center; margin: 0 0 3rem;">${escapeHtml(content.title)}</h2>
    <div style="
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: ${gridGap(theme)};
    ">
      ${featureCards}
    </div>
  </div>
</section>`
  },
}
