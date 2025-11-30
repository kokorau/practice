import type { SectionTemplate, HeroFormContent } from '../../Domain/ValueObject/SectionTemplate'

export type { HeroFormContent } from '../../Domain/ValueObject/SectionTemplate'

export const HeroFormTemplate: SectionTemplate = {
  type: 'hero-form',
  render: (content, cssVars) => {
    const c = content as HeroFormContent

    const logosHtml = c.trustedBy?.logos
      ? c.trustedBy.logos
          .slice(0, 5)
          .map(
            (logo) =>
              `<img src="${logo.url}" alt="${logo.alt}" style="height: 1.5rem; opacity: 0.5; filter: grayscale(100%);" />`
          )
          .join('')
      : ''

    const trustedByHtml = c.trustedBy
      ? `
      <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid rgb(var(--color-on-base) / 0.1);">
        <p style="margin: 0 0 1rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.5;">${c.trustedBy.label}</p>
        ${logosHtml ? `<div style="display: flex; gap: 2rem; align-items: center; justify-content: center; flex-wrap: wrap;">${logosHtml}</div>` : ''}
      </div>`
      : ''

    return `
<section class="section-hero-form" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <div style="max-width: 1280px; margin: 0 auto; padding: 5rem 2rem;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; min-height: 400px;">
      <div>
        <h1 style="margin: 0 0 1.5rem; font-size: 3rem; font-weight: 700; line-height: 1.1;">${c.title}</h1>
        ${c.subtitle ? `<p style="margin: 0; font-size: 1.25rem; opacity: 0.8; line-height: 1.6;">${c.subtitle}</p>` : ''}
      </div>
      <div>
        <div style="background: rgb(var(--color-secondary)); padding: 2rem; border-radius: 8px;">
          <div style="display: flex; gap: 0.5rem;">
            <input type="email" placeholder="${c.placeholderText ?? 'Enter your email'}" style="flex: 1; padding: 1rem; border: 1px solid rgb(var(--color-on-secondary) / 0.2); border-radius: 4px; font-size: 1rem; background: rgb(var(--color-base)); color: rgb(var(--color-on-base));" />
            <button style="background: rgb(var(--color-brand)); color: rgb(var(--color-on-brand)); padding: 1rem 1.5rem; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; white-space: nowrap;">${c.buttonText}</button>
          </div>
        </div>
        ${trustedByHtml}
      </div>
    </div>
  </div>
</section>`
  },
}
