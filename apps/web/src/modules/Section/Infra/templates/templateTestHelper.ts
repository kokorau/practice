import type { SectionTemplate, SectionContent, RenderTheme } from '../../Domain/ValueObject/SectionTemplate'
import type { ColorPalette } from '../../../ColorPalette/Domain/ValueObject'
import { StylePackPresets } from '../../../StylePack/Domain'

export type TemplateValidationResult = {
  isValid: boolean
  hasSection: boolean
  hasCssVars: boolean
  hasClosingTag: boolean
  containsContent: boolean
  errors: string[]
}

export const validateTemplateOutput = (
  html: string,
  expectedContent?: string
): TemplateValidationResult => {
  const errors: string[] = []

  const hasSection = /<section[^>]*>/.test(html)
  if (!hasSection) errors.push('Missing <section> tag')

  const hasClosingTag = /<\/section>/.test(html)
  if (!hasClosingTag) errors.push('Missing </section> closing tag')

  const hasCssVars = /var\(--color-/.test(html) || /rgb\(var\(--color-/.test(html)
  if (!hasCssVars) errors.push('No CSS variables used')

  const containsContent = expectedContent ? html.includes(expectedContent) : true
  if (!containsContent) errors.push(`Expected content "${expectedContent}" not found`)

  return {
    isValid: errors.length === 0,
    hasSection,
    hasCssVars,
    hasClosingTag,
    containsContent,
    errors,
  }
}

const createTestPalette = (): ColorPalette => ({
  id: 'test-palette',
  base: { r: 1, g: 1, b: 1 },
  onBase: { r: 0, g: 0, b: 0 },
  primary: { r: 0.23, g: 0.51, b: 0.96 },
  onPrimary: { r: 1, g: 1, b: 1 },
  secondary: { r: 0.9, g: 0.91, b: 0.92 },
  onSecondary: { r: 0.12, g: 0.16, b: 0.22 },
  brand: { r: 0.55, g: 0.36, b: 0.96 },
  onBrand: { r: 1, g: 1, b: 1 },
})

export const createTestTheme = (): RenderTheme => ({
  palette: createTestPalette(),
  stylePack: StylePackPresets[0]!.style,
})

export const assertValidTemplate = (
  template: SectionTemplate,
  content: SectionContent,
  expectedContent?: string
): void => {
  const theme = createTestTheme()
  const html = template.render(content, theme)
  const result = validateTemplateOutput(html, expectedContent)

  if (!result.isValid) {
    throw new Error(`Template validation failed:\n${result.errors.join('\n')}`)
  }
}
