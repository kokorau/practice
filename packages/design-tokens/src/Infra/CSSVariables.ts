import type { DesignTokens } from '../Domain'
import type { Typography, TypographyRole, TypographyToken } from '../Domain/ValueObject/Typography'
import type { Radius, RadiusScale } from '../Domain/ValueObject/Radius'
import type { Spacing, SpacingScale } from '../Domain/ValueObject/Spacing'

/**
 * CSS variable entry [name, value]
 */
export type CSSVariableEntry = [string, string]

/**
 * Collect typography CSS variable entries
 */
const collectTypographyEntries = (typography: Typography): CSSVariableEntry[] => {
  const entries: CSSVariableEntry[] = []
  const roles: TypographyRole[] = ['title', 'body', 'meta', 'link']
  const props: (keyof TypographyToken)[] = ['family', 'size', 'weight', 'lineHeight', 'letterSpacing']

  for (const role of roles) {
    const token = typography[role]
    for (const prop of props) {
      const value = token[prop]
      const cssValue = typeof value === 'number' ? String(value) : value
      entries.push([`--dt-typography-${role}-${kebabCase(prop)}`, cssValue])
    }
  }

  return entries
}

/**
 * Collect radius CSS variable entries
 */
const collectRadiusEntries = (radius: Radius): CSSVariableEntry[] => {
  const scales: RadiusScale[] = ['none', 'sm', 'md', 'lg', 'xl', 'full']
  return scales.map((scale) => [`--dt-radius-${scale}`, radius[scale]])
}

/**
 * Collect spacing CSS variable entries
 */
const collectSpacingEntries = (spacing: Spacing): CSSVariableEntry[] => {
  const scales: SpacingScale[] = ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']
  return scales.map((scale) => [`--dt-spacing-${scale}`, spacing[scale]])
}

/**
 * Collect all CSS variable entries from design tokens
 */
export const collectCSSVariableEntries = (tokens: DesignTokens): CSSVariableEntry[] => {
  return [
    ...collectTypographyEntries(tokens.typography),
    ...collectRadiusEntries(tokens.radius),
    ...collectSpacingEntries(tokens.spacing),
  ]
}

/**
 * Convert design tokens to CSS variables object
 */
export const toCSSVariables = (tokens: DesignTokens): Record<string, string> => {
  const entries = collectCSSVariableEntries(tokens)
  return Object.fromEntries(entries)
}

/**
 * Convert design tokens to CSS text with optional selector
 */
export const toCSSText = (tokens: DesignTokens, selector = ':root'): string => {
  const entries = collectCSSVariableEntries(tokens)
  const declarations = entries.map(([name, value]) => `  ${name}: ${value};`).join('\n')
  return `${selector} {\n${declarations}\n}`
}

/**
 * Convert camelCase to kebab-case
 */
const kebabCase = (str: string): string => {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}
