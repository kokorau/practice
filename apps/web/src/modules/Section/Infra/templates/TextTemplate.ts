import type { SectionTemplate, TextContent } from '../../Domain/ValueObject/SectionTemplate'

export const TextTemplate: SectionTemplate = {
  type: 'text',
  render: (content, cssVars) => {
    const c = content as TextContent
    return `
<section class="section-text" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <div style="max-width: 800px; margin: 0 auto; padding: 3rem 2rem;">
    ${c.title ? `<h2 style="margin: 0 0 1.5rem;">${c.title}</h2>` : ''}
    <p style="margin: 0; line-height: 1.8;">${c.body}</p>
  </div>
</section>`
  },
}
