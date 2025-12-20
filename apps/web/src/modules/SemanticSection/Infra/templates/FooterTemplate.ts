/**
 * FooterTemplate - Site footer section
 */

import type { SectionTemplate, FooterContent } from '../../Domain'
import { ctx, containerStyle, sectionPadding, escapeHtml } from './templateHelper'

export const FooterTemplate: SectionTemplate<FooterContent> = {
  type: 'footer',

  render: (content, theme) => {
    const columns = content.columns
      .map(
        (column) => `
      <div>
        <h4 class="scp-title" style="font-size: 0.9rem; font-weight: 600; margin: 0 0 1rem;">${escapeHtml(column.heading)}</h4>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${column.links
            .map(
              (link) => `
            <a href="${escapeHtml(link.url)}" class="scp-body" style="text-decoration: none; font-size: 0.875rem;">${escapeHtml(link.label)}</a>
          `
            )
            .join('')}
        </div>
      </div>
    `
      )
      .join('')

    const legalLinks = content.legalLinks?.length
      ? `<div style="display: flex; gap: 1rem;">
          ${content.legalLinks
            .map(
              (link) => `
            <a href="${escapeHtml(link.url)}" class="scp-meta" style="text-decoration: none; font-size: 0.8rem;">${escapeHtml(link.label)}</a>
          `
            )
            .join('')}
        </div>`
      : ''

    return `
<footer class="${ctx.sectionNeutral}" style="padding: ${sectionPadding(theme)};">
  <div style="${containerStyle}">
    <div style="
      display: flex;
      justify-content: space-between;
      gap: 4rem;
      margin-bottom: 3rem;
      flex-wrap: wrap;
    ">
      <div style="max-width: 250px;">
        <div class="scp-title" style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">${escapeHtml(content.logoText)}</div>
        <p class="scp-body" style="font-size: 0.9rem; margin: 0;">${escapeHtml(content.tagline)}</p>
      </div>
      <div style="
        display: flex;
        gap: 4rem;
        flex-wrap: wrap;
      ">
        ${columns}
      </div>
    </div>
    <div class="scp-divider" style="
      border-top: 1px solid var(--divider);
      padding-top: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    ">
      <p class="scp-meta" style="margin: 0; font-size: 0.8rem;">${escapeHtml(content.copyright)}</p>
      ${legalLinks}
    </div>
  </div>
</footer>`
  },
}
