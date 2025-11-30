import type { SectionTemplate, SectionContent } from '../../Domain/ValueObject/SectionTemplate'

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

export const createTestCssVars = (): string => {
  return [
    '--color-base: 255, 255, 255',
    '--color-on-base: 0, 0, 0',
    '--color-primary: 59, 130, 246',
    '--color-on-primary: 255, 255, 255',
    '--color-secondary: 229, 231, 235',
    '--color-on-secondary: 31, 41, 55',
    '--color-brand: 139, 92, 246',
    '--color-on-brand: 255, 255, 255',
  ].join('; ')
}

export const assertValidTemplate = (
  template: SectionTemplate,
  content: SectionContent,
  expectedContent?: string
): void => {
  const cssVars = createTestCssVars()
  const html = template.render(content, cssVars)
  const result = validateTemplateOutput(html, expectedContent)

  if (!result.isValid) {
    throw new Error(`Template validation failed:\n${result.errors.join('\n')}`)
  }
}
