import type { SectionTemplate, FooterContent } from '../../Domain/ValueObject/SectionTemplate'

export type { FooterContent } from '../../Domain/ValueObject/SectionTemplate'

export const FooterTemplate: SectionTemplate = {
  type: 'footer',
  render: (content, cssVars) => {
    const c = content as FooterContent
    const logo = c.logoUrl
      ? `<img src="${c.logoUrl}" alt="${c.logoAlt ?? ''}" style="height: 2rem;" />`
      : `<span style="font-size: 1.25rem; font-weight: 700;">${c.logoText ?? ''}</span>`

    const links = c.links
      .map(
        (link) =>
          `<a href="${link.url}" style="color: inherit; text-decoration: none; opacity: 0.8; transition: opacity 0.2s;">${link.label}</a>`
      )
      .join('')

    const infoItems = []
    if (c.info?.address) infoItems.push(c.info.address)
    if (c.info?.phone) infoItems.push(c.info.phone)
    if (c.info?.email) infoItems.push(c.info.email)
    const infoHtml = infoItems.length > 0
      ? `<div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem; opacity: 0.7;">${infoItems.map(item => `<span>${item}</span>`).join('')}</div>`
      : ''

    return `
<section class="section-footer" style="${cssVars} background: rgb(var(--color-secondary)); color: rgb(var(--color-on-secondary));">
  <footer style="max-width: 1280px; margin: 0 auto; padding: 3rem 2rem;">
    <div style="display: grid; grid-template-columns: 1fr auto auto; gap: 4rem; align-items: start;">
      <div class="logo">
        ${logo}
      </div>
      <div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.875rem;">
        ${links}
      </div>
      ${infoHtml}
    </div>
    ${c.copyright ? `<div style="margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid currentColor; opacity: 0.5; font-size: 0.75rem;">${c.copyright}</div>` : ''}
  </footer>
</section>`
  },
}
