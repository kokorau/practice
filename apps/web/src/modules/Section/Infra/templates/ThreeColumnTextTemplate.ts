import type { SectionTemplate, ThreeColumnTextContent } from '../../Domain/ValueObject/SectionTemplate'

export type { ThreeColumnTextContent } from '../../Domain/ValueObject/SectionTemplate'

export const ThreeColumnTextTemplate: SectionTemplate = {
  type: 'three-column-text',
  render: (content, cssVars) => {
    const c = content as ThreeColumnTextContent
    const columns = c.columns
      .slice(0, 3)
      .map(
        (col) => `
      <div>
        <h3 style="margin: 0 0 1rem; font-weight: 600;">${col.title}</h3>
        <p style="margin: 0; opacity: 0.8; line-height: 1.7;">${col.text}</p>
      </div>`
      )
      .join('')

    return `
<section class="section-three-column-text" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <div style="max-width: 1280px; margin: 0 auto; padding: 5rem 2rem;">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 3rem;">
      ${columns}
    </div>
  </div>
</section>`
  },
}
