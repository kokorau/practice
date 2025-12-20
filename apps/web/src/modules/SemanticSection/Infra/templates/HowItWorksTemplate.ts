/**
 * HowItWorksTemplate - Step-by-step process section
 */

import type { SectionTemplate, HowItWorksContent } from '../../Domain'
import { ctx, containerStyle, sectionPadding, cardGap, escapeHtml } from './templateHelper'

export const HowItWorksTemplate: SectionTemplate<HowItWorksContent> = {
  type: 'howItWorks',

  render: (content, theme) => {
    const steps = content.steps
      .map(
        (step, index) => `
      <div style="text-align: center; flex: 1; min-width: 200px;">
        <div class="scp-link" style="
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--surface);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 1rem;
        ">${index + 1}</div>
        <h3 class="scp-title" style="font-size: 1.125rem; font-weight: 600; margin: 0 0 0.5rem;">${escapeHtml(step.title)}</h3>
        <p class="scp-body" style="font-size: 0.9rem; margin: 0;">${escapeHtml(step.description)}</p>
      </div>
    `
      )
      .join(`
      <div class="scp-divider" style="
        width: 60px;
        height: 2px;
        background: var(--divider);
        margin-top: 24px;
      "></div>
    `)

    return `
<section class="${ctx.canvas}" style="padding: ${sectionPadding(theme)};">
  <div style="${containerStyle}">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; text-align: center; margin: 0 0 3rem;">${escapeHtml(content.title)}</h2>
    <div style="
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: ${cardGap(theme)};
      flex-wrap: wrap;
    ">
      ${steps}
    </div>
  </div>
</section>`
  },
}
