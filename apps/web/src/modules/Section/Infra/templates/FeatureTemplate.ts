import type { SectionTemplate, FeatureContent } from '../../Domain/ValueObject/SectionTemplate'

export const FeatureTemplate: SectionTemplate = {
  type: 'feature',
  render: (content, cssVars) => {
    const c = content as FeatureContent
    const items = c.items
      .map(
        (item) => `
    <div style="background: rgb(var(--color-secondary)); color: rgb(var(--color-on-secondary)); padding: 1.5rem; border-radius: 8px;">
      <h3 style="margin: 0 0 0.5rem;">${item.title}</h3>
      <p style="margin: 0; opacity: 0.9;">${item.description}</p>
    </div>`
      )
      .join('\n')

    return `
<section class="section-feature" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <div style="max-width: 1280px; margin: 0 auto; padding: 3rem 2rem;">
    <h2 style="text-align: center; margin: 0 0 1rem;">${c.title}</h2>
    <p style="text-align: center; margin: 0 0 2rem; opacity: 0.8;">${c.description}</p>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
      ${items}
    </div>
  </div>
</section>`
  },
}
