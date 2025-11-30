import type { ColorPalette } from '../../../ColorPalette/Domain/ValueObject'
import type { FontPreset } from '../../../Font/Domain/ValueObject'
import type { StylePack } from '../../../StylePack/Domain'
import { StylePackPresets } from '../../../StylePack/Domain'
import type { Section, Page } from './Section'
import { getTemplate } from '../../Infra/templates'
import type { RenderTheme } from './SectionTemplate'

// Re-export types from SectionTemplate for backward compatibility
export type {
  FeatureContent,
  TextContent,
  SectionContent,
  PageContents,
} from './SectionTemplate'

import type { SectionContent, PageContents } from './SectionTemplate'

const defaultStylePack: StylePack = StylePackPresets[0]!.style

export const renderSection = (
  section: Section,
  palette: ColorPalette,
  content: SectionContent,
  stylePack: StylePack = defaultStylePack
): string => {
  const template = getTemplate(section.type)
  const theme: RenderTheme = { palette, stylePack }
  return template.render(content, theme)
}

export type RenderPageOptions = {
  page: Page
  palette: ColorPalette
  contents: PageContents
  font?: FontPreset
  stylePack?: StylePack
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
  font?: FontPreset,
  stylePack: StylePack = defaultStylePack
): string => {
  const fontFamily = font ? `font-family: ${font.family};` : ''
  const theme: RenderTheme = { palette, stylePack }

  const sectionsHtml = page.sections
    .map(section => {
      const content = contents[section.id]
      if (!content) return ''
      const template = getTemplate(section.type)
      return template.render(content, theme)
    })
    .join('\n')

  const fontLink = font ? generateFontLinkTag(font) : ''
  return `${fontLink}\n<div class="page" style="${fontFamily}">\n${sectionsHtml}\n</div>`
}
