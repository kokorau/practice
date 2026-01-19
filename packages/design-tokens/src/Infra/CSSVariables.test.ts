import { describe, it, expect } from 'vitest'
import { collectCSSVariableEntries, toCSSVariables, toCSSText } from './CSSVariables'
import { createDefaultTokens } from './DefaultTokens'

describe('CSSVariables', () => {
  const tokens = createDefaultTokens()

  describe('collectCSSVariableEntries', () => {
    it('should collect typography variables', () => {
      const entries = collectCSSVariableEntries(tokens)
      const typographyEntries = entries.filter(([name]) => name.startsWith('--dt-typography-'))

      // 4 roles × 5 props = 20 entries
      expect(typographyEntries.length).toBe(20)

      // Check title entries
      expect(typographyEntries).toContainEqual(['--dt-typography-title-family', 'system-ui, -apple-system, sans-serif'])
      expect(typographyEntries).toContainEqual(['--dt-typography-title-size', '1rem'])
      expect(typographyEntries).toContainEqual(['--dt-typography-title-weight', '600'])
      expect(typographyEntries).toContainEqual(['--dt-typography-title-line-height', '1.3'])
      expect(typographyEntries).toContainEqual(['--dt-typography-title-letter-spacing', '-0.01em'])
    })

    it('should collect radius variables', () => {
      const entries = collectCSSVariableEntries(tokens)
      const radiusEntries = entries.filter(([name]) => name.startsWith('--dt-radius-'))

      expect(radiusEntries.length).toBe(6)
      expect(radiusEntries).toContainEqual(['--dt-radius-none', '0'])
      expect(radiusEntries).toContainEqual(['--dt-radius-sm', '0.25rem'])
      expect(radiusEntries).toContainEqual(['--dt-radius-md', '0.5rem'])
      expect(radiusEntries).toContainEqual(['--dt-radius-lg', '0.75rem'])
      expect(radiusEntries).toContainEqual(['--dt-radius-xl', '1rem'])
      expect(radiusEntries).toContainEqual(['--dt-radius-full', '9999px'])
    })

    it('should collect spacing variables', () => {
      const entries = collectCSSVariableEntries(tokens)
      const spacingEntries = entries.filter(([name]) => name.startsWith('--dt-spacing-'))

      expect(spacingEntries.length).toBe(8)
      expect(spacingEntries).toContainEqual(['--dt-spacing-none', '0'])
      expect(spacingEntries).toContainEqual(['--dt-spacing-xs', '0.25rem'])
      expect(spacingEntries).toContainEqual(['--dt-spacing-sm', '0.5rem'])
      expect(spacingEntries).toContainEqual(['--dt-spacing-md', '1rem'])
      expect(spacingEntries).toContainEqual(['--dt-spacing-lg', '1.5rem'])
      expect(spacingEntries).toContainEqual(['--dt-spacing-xl', '2rem'])
      expect(spacingEntries).toContainEqual(['--dt-spacing-2xl', '3rem'])
      expect(spacingEntries).toContainEqual(['--dt-spacing-3xl', '4rem'])
    })
  })

  describe('toCSSVariables', () => {
    it('should return object with all variables', () => {
      const vars = toCSSVariables(tokens)

      expect(vars['--dt-typography-body-size']).toBe('1rem')
      expect(vars['--dt-radius-md']).toBe('0.5rem')
      expect(vars['--dt-spacing-md']).toBe('1rem')
    })
  })

  describe('toCSSText', () => {
    it('should output CSS text with :root selector by default', () => {
      const css = toCSSText(tokens)

      expect(css).toMatch(/^:root \{/)
      expect(css).toMatch(/\}$/)
      expect(css).toContain('--dt-typography-title-size: 1rem;')
      expect(css).toContain('--dt-radius-md: 0.5rem;')
      expect(css).toContain('--dt-spacing-md: 1rem;')
    })

    it('should use custom selector', () => {
      const css = toCSSText(tokens, '.my-app')

      expect(css).toMatch(/^\.my-app \{/)
    })
  })
})
