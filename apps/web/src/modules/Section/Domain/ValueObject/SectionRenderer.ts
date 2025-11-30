import type { ColorPalette } from '../../../ColorPalette/Domain/ValueObject'
import type { FontPreset } from '../../../Font/Domain/ValueObject'
import type { Section, SectionType, Page } from './Section'
import { generateColorCssVariables, cssVariablesToStyleString } from './ColorCssVariables'

export type HeroContent = {
  title: string
  subtitle?: string
  ctaText?: string
}

export type FeatureContent = {
  title: string
  description: string
  items: { title: string; description: string }[]
}

export type TextContent = {
  title?: string
  body: string
}

export type SectionContent = HeroContent | FeatureContent | TextContent

type RenderFn = (content: SectionContent, cssVars: string) => string

const renderHero: RenderFn = (content, cssVars) => {
  const c = content as HeroContent
  return `
<section class="section-hero" style="${cssVars}">
  <div class="hero-inner" style="background: rgb(var(--color-primary)); color: rgb(var(--color-on-primary)); padding: 4rem 2rem; text-align: center;">
    <h1 style="margin: 0 0 1rem; font-size: 2.5rem;">${c.title}</h1>
    ${c.subtitle ? `<p style="margin: 0 0 2rem; opacity: 0.9;">${c.subtitle}</p>` : ''}
    ${c.ctaText ? `<button style="background: rgb(var(--color-brand)); color: rgb(var(--color-on-brand)); border: none; padding: 0.75rem 2rem; border-radius: 4px; font-size: 1rem; cursor: pointer;">${c.ctaText}</button>` : ''}
  </div>
</section>`
}

const renderFeature: RenderFn = (content, cssVars) => {
  const c = content as FeatureContent
  const items = c.items.map(item => `
    <div style="background: rgb(var(--color-secondary)); color: rgb(var(--color-on-secondary)); padding: 1.5rem; border-radius: 8px;">
      <h3 style="margin: 0 0 0.5rem;">${item.title}</h3>
      <p style="margin: 0; opacity: 0.9;">${item.description}</p>
    </div>`).join('\n')

  return `
<section class="section-feature" style="${cssVars}">
  <div style="background: rgb(var(--color-base)); color: rgb(var(--color-on-base)); padding: 3rem 2rem;">
    <h2 style="text-align: center; margin: 0 0 1rem;">${c.title}</h2>
    <p style="text-align: center; margin: 0 0 2rem; opacity: 0.8;">${c.description}</p>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
      ${items}
    </div>
  </div>
</section>`
}

const renderText: RenderFn = (content, cssVars) => {
  const c = content as TextContent
  return `
<section class="section-text" style="${cssVars}">
  <div style="background: rgb(var(--color-base)); color: rgb(var(--color-on-base)); padding: 3rem 2rem; max-width: 800px; margin: 0 auto;">
    ${c.title ? `<h2 style="margin: 0 0 1.5rem;">${c.title}</h2>` : ''}
    <p style="margin: 0; line-height: 1.8;">${c.body}</p>
  </div>
</section>`
}

const renderers: Record<SectionType, RenderFn> = {
  hero: renderHero,
  feature: renderFeature,
  text: renderText,
  gallery: renderText,
  cta: renderHero,
}

export const renderSection = (
  section: Section,
  palette: ColorPalette,
  content: SectionContent
): string => {
  const cssVars = cssVariablesToStyleString(generateColorCssVariables(palette))
  const renderer = renderers[section.type]
  return renderer(content, cssVars)
}

export type PageContents = Record<string, SectionContent>

export type RenderPageOptions = {
  page: Page
  palette: ColorPalette
  contents: PageContents
  font?: FontPreset
}

const generateFontLinkTag = (font: FontPreset): string => {
  if (font.source.vendor === 'google') {
    return `<link rel="stylesheet" href="${font.source.url}">`
  }
  if (font.source.vendor === 'adobe') {
    return `<link rel="stylesheet" href="https://use.typekit.net/${font.source.kitId}.css">`
  }
  // custom fonts would need different handling
  return ''
}

export const renderPage = (
  page: Page,
  palette: ColorPalette,
  contents: PageContents,
  font?: FontPreset
): string => {
  const cssVars = cssVariablesToStyleString(generateColorCssVariables(palette))
  const fontFamily = font ? `font-family: ${font.family};` : ''
  const pageStyle = `${cssVars} ${fontFamily}`.trim()

  const sectionsHtml = page.sections
    .map(section => {
      const content = contents[section.id]
      if (!content) return ''
      const renderer = renderers[section.type]
      return renderer(content, cssVars)
    })
    .join('\n')

  const fontLink = font ? generateFontLinkTag(font) : ''
  return `${fontLink}\n<div class="page" style="${pageStyle}">\n${sectionsHtml}\n</div>`
}
