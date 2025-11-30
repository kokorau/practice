import type { SectionTemplate, HeroStatsContent } from '../../Domain/ValueObject/SectionTemplate'

export type { HeroStatsContent } from '../../Domain/ValueObject/SectionTemplate'

export const HeroStatsTemplate: SectionTemplate = {
  type: 'hero-stats',
  render: (content, cssVars) => {
    const c = content as HeroStatsContent

    const statsHtml = c.stats
      .slice(0, 4)
      .map(
        (stat) => `
        <div style="text-align: center;">
          <div style="font-size: 2.5rem; font-weight: 700; color: rgb(var(--color-brand));">${stat.value}</div>
          <div style="font-size: 0.875rem; opacity: 0.7; margin-top: 0.5rem;">${stat.label}</div>
        </div>`
      )
      .join('')

    return `
<section class="section-hero-stats" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <div style="max-width: 1280px; margin: 0 auto; padding: 5rem 2rem; text-align: center;">
    <h1 style="margin: 0 0 1.5rem; font-size: 3rem; font-weight: 700; line-height: 1.1;">${c.title}</h1>
    ${c.subtitle ? `<p style="margin: 0 0 2rem; font-size: 1.25rem; opacity: 0.8; line-height: 1.6; max-width: 600px; margin-left: auto; margin-right: auto;">${c.subtitle}</p>` : ''}
    ${c.buttonText ? `<a href="${c.buttonUrl ?? '#'}" style="display: inline-block; background: rgb(var(--color-brand)); color: rgb(var(--color-on-brand)); padding: 1rem 2.5rem; text-decoration: none; font-weight: 600; font-size: 1.125rem; margin-bottom: 3rem;">${c.buttonText}</a>` : ''}
    <div style="display: grid; grid-template-columns: repeat(${Math.min(c.stats.length, 4)}, 1fr); gap: 3rem; margin-top: 3rem; padding-top: 3rem; border-top: 1px solid rgb(var(--color-on-base) / 0.1);">
      ${statsHtml}
    </div>
  </div>
</section>`
  },
}
