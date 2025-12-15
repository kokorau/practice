import { describe, it, expect } from 'vitest'
import { toCSSVariables, toCSSText } from './CSSVariables'
import { createDefaultLightPalette } from './DefaultPalettes'

describe('CSSVariables', () => {
  const palette = createDefaultLightPalette()

  describe('toCSSVariables', () => {
    it('generates context token variables', () => {
      const vars = toCSSVariables(palette)

      // Canvas context - surface
      expect(vars).toContain(
        `--context-canvas-surface: ${palette.context.canvas.surface};`
      )
      // Canvas context - ink
      expect(vars).toContain(
        `--context-canvas-title: ${palette.context.canvas.ink.title};`
      )

      // Section contexts (kebab-case conversion)
      expect(vars).toContain(
        `--context-section-neutral-surface: ${palette.context.sectionNeutral.surface};`
      )
      expect(vars).toContain(
        `--context-section-tint-surface: ${palette.context.sectionTint.surface};`
      )
      expect(vars).toContain(
        `--context-section-contrast-surface: ${palette.context.sectionContrast.surface};`
      )
    })

    it('generates component token variables (stateless)', () => {
      const vars = toCSSVariables(palette)

      // Card component - surface
      expect(vars).toContain(
        `--component-card-surface: ${palette.component.card.surface};`
      )
      // Card component - ink
      expect(vars).toContain(
        `--component-card-title: ${palette.component.card.ink.title};`
      )

      // CardFlat component (kebab-case conversion)
      expect(vars).toContain(
        `--component-card-flat-surface: ${palette.component.cardFlat.surface};`
      )
    })

    it('generates stateful component token variables', () => {
      const vars = toCSSVariables(palette)

      // Action component - surface with states
      expect(vars).toContain(
        `--component-action-surface-default: ${palette.component.action.surface.default};`
      )
      expect(vars).toContain(
        `--component-action-surface-hover: ${palette.component.action.surface.hover};`
      )
      expect(vars).toContain(
        `--component-action-surface-active: ${palette.component.action.surface.active};`
      )
      expect(vars).toContain(
        `--component-action-surface-disabled: ${palette.component.action.surface.disabled};`
      )

      // ActionQuiet component - ink with states (kebab-case conversion)
      expect(vars).toContain(
        `--component-action-quiet-title-default: ${palette.component.actionQuiet.ink.title.default};`
      )
    })
  })

  describe('toCSSText', () => {
    it('wraps variables in :root selector by default', () => {
      const css = toCSSText(palette)

      expect(css).toMatch(/^:root \{/)
      expect(css).toMatch(/\}$/)
      expect(css).toContain('  --context-canvas-surface:')
    })

    it('uses custom selector when provided', () => {
      const css = toCSSText(palette, '.theme-light')

      expect(css).toMatch(/^\.theme-light \{/)
    })

    it('properly indents variables', () => {
      const css = toCSSText(palette)
      const lines = css.split('\n')

      // Check indentation (skip first and last lines)
      for (let i = 1; i < lines.length - 1; i++) {
        expect(lines[i]).toMatch(/^  --/)
      }
    })
  })
})
