import { describe, it, expect } from 'vitest'
import { collectCSSRuleSets, toCSSRuleSetsText } from './CSSRuleSets'

describe('CSSRuleSets', () => {
  describe('collectCSSRuleSets', () => {
    it('generates context rule sets', () => {
      const ruleSets = collectCSSRuleSets()

      const canvasRuleSet = ruleSets.find((r) => r.selector === '.context-canvas')
      expect(canvasRuleSet).toBeDefined()
      expect(canvasRuleSet!.declarations).toContainEqual({
        property: 'background-color',
        value: 'var(--context-canvas-surface)',
      })
      expect(canvasRuleSet!.declarations).toContainEqual({
        property: 'color',
        value: 'var(--context-canvas-body)',
      })
      expect(canvasRuleSet!.declarations).toContainEqual({
        property: 'border-color',
        value: 'var(--context-canvas-border)',
      })
    })

    it('generates context rule sets with kebab-case class names', () => {
      const ruleSets = collectCSSRuleSets()

      const sectionNeutralRuleSet = ruleSets.find(
        (r) => r.selector === '.context-section-neutral'
      )
      expect(sectionNeutralRuleSet).toBeDefined()
    })

    it('generates stateless component rule sets', () => {
      const ruleSets = collectCSSRuleSets()

      const cardRuleSet = ruleSets.find((r) => r.selector === '.component-card')
      expect(cardRuleSet).toBeDefined()
      expect(cardRuleSet!.declarations).toContainEqual({
        property: 'background-color',
        value: 'var(--component-card-surface)',
      })
    })

    it('generates stateful component rule sets with pseudo-classes', () => {
      const ruleSets = collectCSSRuleSets()

      // Default state
      const actionDefault = ruleSets.find(
        (r) => r.selector === '.component-action'
      )
      expect(actionDefault).toBeDefined()
      expect(actionDefault!.declarations).toContainEqual({
        property: 'background-color',
        value: 'var(--component-action-surface-default)',
      })

      // Hover state
      const actionHover = ruleSets.find(
        (r) => r.selector === '.component-action:hover'
      )
      expect(actionHover).toBeDefined()
      expect(actionHover!.declarations).toContainEqual({
        property: 'background-color',
        value: 'var(--component-action-surface-hover)',
      })

      // Active state
      const actionActive = ruleSets.find(
        (r) => r.selector === '.component-action:active'
      )
      expect(actionActive).toBeDefined()

      // Disabled state (multiple selectors)
      const actionDisabled = ruleSets.find((r) =>
        r.selector.includes('.component-action:disabled')
      )
      expect(actionDisabled).toBeDefined()
      expect(actionDisabled!.selector).toContain('.is-disabled')
    })

    it('generates stateful component rule sets with kebab-case', () => {
      const ruleSets = collectCSSRuleSets()

      const actionQuietDefault = ruleSets.find(
        (r) => r.selector === '.component-action-quiet'
      )
      expect(actionQuietDefault).toBeDefined()
    })
  })

  describe('toCSSRuleSetsText', () => {
    it('generates valid CSS text', () => {
      const css = toCSSRuleSetsText()

      expect(css).toContain('.context-canvas {')
      expect(css).toContain('background-color: var(--context-canvas-surface);')
      expect(css).toContain('}')
    })

    it('separates rule sets with blank lines', () => {
      const css = toCSSRuleSetsText()

      expect(css).toContain('}\n\n.')
    })

    it('properly indents declarations', () => {
      const css = toCSSRuleSetsText()
      const lines = css.split('\n')

      const declarationLines = lines.filter((line) =>
        line.includes('background-color:')
      )
      for (const line of declarationLines) {
        expect(line).toMatch(/^  /)
      }
    })
  })
})
