import type { ColorPalette } from '../../../ColorPalette/Domain/ValueObject'
import type { FontPreset } from '../../../Font/Domain/ValueObject'
import type { Section, Page } from './Section'
import { generateColorCssVariables, cssVariablesToStyleString } from './ColorCssVariables'
import { getTemplate } from '../../Infra/templates'

// Re-export types from SectionTemplate for backward compatibility
export type {
  HeroContent,
  FeatureContent,
  TextContent,
  SectionContent,
  PageContents,
} from './SectionTemplate'

import type { SectionContent, PageContents } from './SectionTemplate'

export const renderSection = (
  section: Section,
  palette: ColorPalette,
  content: SectionContent
): string => {
  const cssVars = cssVariablesToStyleString(generateColorCssVariables(palette))
  const template = getTemplate(section.type)
  return template.render(content, cssVars)
}

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
      const template = getTemplate(section.type)
      return template.render(content, cssVars)
    })
    .join('\n')

  const fontLink = font ? generateFontLinkTag(font) : ''
  return `${fontLink}\n<div class="page" style="${pageStyle}">\n${sectionsHtml}\n</div>`
}
