/**
 * resolveForeground tests
 */

import { describe, it, expect, vi } from 'vitest'
import type { Oklch } from '@practice/color'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import type { ForegroundLayerConfig, ForegroundElementConfig } from '../../Domain/HeroViewConfig'
import {
  resolveFontFamily,
  resolveElementColor,
  compileForegroundElement,
  compileForegroundLayer,
  createDefaultColorContext,
  DEFAULT_FONT_RESOLVER,
  type ForegroundColorContext,
  type FontResolver,
} from './resolveForeground'

// ============================================================
// Test Fixtures
// ============================================================

function createTestPalette(): PrimitivePalette {
  const white: Oklch = { L: 0.99, C: 0, H: 0 }
  const black: Oklch = { L: 0.01, C: 0, H: 0 }
  const brand: Oklch = { L: 0.6, C: 0.15, H: 250 }

  return {
    BN0: black, BN1: { L: 0.1, C: 0, H: 0 }, BN2: { L: 0.2, C: 0, H: 0 },
    BN3: { L: 0.3, C: 0, H: 0 }, BN4: { L: 0.4, C: 0, H: 0 }, BN5: { L: 0.5, C: 0, H: 0 },
    BN6: { L: 0.6, C: 0, H: 0 }, BN7: { L: 0.7, C: 0, H: 0 }, BN8: { L: 0.8, C: 0, H: 0 },
    BN9: white,
    F0: black, F1: { L: 0.95, C: 0, H: 0 }, F2: { L: 0.9, C: 0, H: 0 },
    F3: { L: 0.85, C: 0, H: 0 }, F4: { L: 0.8, C: 0, H: 0 }, F5: { L: 0.5, C: 0, H: 0 },
    F6: { L: 0.2, C: 0, H: 0 }, F7: { L: 0.15, C: 0, H: 0 }, F8: { L: 0.1, C: 0, H: 0 },
    F9: black,
    AN0: black, AN1: { L: 0.1, C: 0, H: 0 }, AN2: { L: 0.2, C: 0, H: 0 },
    AN3: { L: 0.3, C: 0, H: 0 }, AN4: { L: 0.4, C: 0, H: 0 }, AN5: { L: 0.5, C: 0, H: 0 },
    AN6: { L: 0.6, C: 0, H: 0 }, AN7: { L: 0.7, C: 0, H: 0 }, AN8: { L: 0.8, C: 0, H: 0 },
    AN9: white,
    B: brand, Bt: { L: 0.8, C: 0.1, H: 250 }, Bs: { L: 0.3, C: 0.1, H: 250 }, Bf: { L: 0.4, C: 0.2, H: 250 },
    A: { L: 0.7, C: 0.2, H: 30 }, At: { L: 0.9, C: 0.1, H: 30 }, As: { L: 0.4, C: 0.15, H: 30 }, Af: { L: 0.5, C: 0.25, H: 30 },
  } as PrimitivePalette
}

function createTestElement(overrides?: Partial<ForegroundElementConfig>): ForegroundElementConfig {
  return {
    id: 'test-element',
    type: 'title',
    visible: true,
    position: 'middle-center',
    content: 'Test Title',
    ...overrides,
  }
}

function createTestColorContext(overrides?: Partial<ForegroundColorContext>): ForegroundColorContext {
  return {
    titleAutoColor: 'oklch(0.1 0 0)',
    bodyAutoColor: 'oklch(0.2 0 0)',
    ...overrides,
  }
}

// ============================================================
// DEFAULT_FONT_RESOLVER
// ============================================================

describe('DEFAULT_FONT_RESOLVER', () => {
  it('should return fontId when provided', () => {
    expect(DEFAULT_FONT_RESOLVER('Inter')).toBe('Inter')
  })

  it('should return system font when fontId is undefined', () => {
    expect(DEFAULT_FONT_RESOLVER(undefined)).toBe('system-ui, sans-serif')
  })
})

// ============================================================
// resolveFontFamily
// ============================================================

describe('resolveFontFamily', () => {
  it('should use default resolver when not provided', () => {
    expect(resolveFontFamily('Roboto')).toBe('Roboto')
    expect(resolveFontFamily(undefined)).toBe('system-ui, sans-serif')
  })

  it('should use custom resolver when provided', () => {
    const customResolver: FontResolver = (fontId) => {
      if (fontId === 'custom-id') return 'Resolved Custom Font'
      return 'fallback'
    }

    expect(resolveFontFamily('custom-id', customResolver)).toBe('Resolved Custom Font')
    expect(resolveFontFamily('other', customResolver)).toBe('fallback')
  })
})

// ============================================================
// resolveElementColor
// ============================================================

describe('resolveElementColor', () => {
  const palette = createTestPalette()

  it('should use element-specific color from elementColors map', () => {
    const element = createTestElement({ id: 'special-element' })
    const colorContext = createTestColorContext({
      elementColors: new Map([['special-element', 'oklch(0.5 0.1 200)']]),
    })

    const color = resolveElementColor(element, palette, colorContext)
    expect(color).toBe('oklch(0.5 0.1 200)')
  })

  it('should resolve colorKey from palette when not auto', () => {
    const element = createTestElement({ colorKey: 'B' })
    const colorContext = createTestColorContext()

    const color = resolveElementColor(element, palette, colorContext)
    expect(color).toMatch(/oklch/)
    // B has L: 0.6, C: 0.15, H: 250
  })

  it('should use titleAutoColor for title with auto colorKey', () => {
    const element = createTestElement({ type: 'title', colorKey: 'auto' })
    const colorContext = createTestColorContext({ titleAutoColor: 'oklch(0.15 0 0)' })

    const color = resolveElementColor(element, palette, colorContext)
    expect(color).toBe('oklch(0.15 0 0)')
  })

  it('should use bodyAutoColor for description with auto colorKey', () => {
    const element = createTestElement({ type: 'description', colorKey: 'auto' })
    const colorContext = createTestColorContext({ bodyAutoColor: 'oklch(0.25 0 0)' })

    const color = resolveElementColor(element, palette, colorContext)
    expect(color).toBe('oklch(0.25 0 0)')
  })

  it('should use auto color when colorKey is undefined', () => {
    const element = createTestElement({ type: 'title', colorKey: undefined })
    const colorContext = createTestColorContext({ titleAutoColor: 'oklch(0.15 0 0)' })

    const color = resolveElementColor(element, palette, colorContext)
    expect(color).toBe('oklch(0.15 0 0)')
  })

  it('should prioritize elementColors over colorKey', () => {
    const element = createTestElement({ id: 'my-el', colorKey: 'B' })
    const colorContext = createTestColorContext({
      elementColors: new Map([['my-el', 'oklch(0.99 0 0)']]),
    })

    const color = resolveElementColor(element, palette, colorContext)
    expect(color).toBe('oklch(0.99 0 0)')
  })
})

// ============================================================
// compileForegroundElement
// ============================================================

describe('compileForegroundElement', () => {
  const palette = createTestPalette()

  it('should compile element with all resolved values', () => {
    const element = createTestElement({
      id: 'title-1',
      type: 'title',
      visible: true,
      position: 'top-left',
      content: 'Hello World',
      fontId: 'inter',
      fontSize: 3,
      fontWeight: 800,
      letterSpacing: -0.01,
      lineHeight: 1.2,
    })
    const colorContext = createTestColorContext({
      fontResolver: (id) => id === 'inter' ? 'Inter, sans-serif' : 'system-ui',
    })

    const compiled = compileForegroundElement(element, palette, colorContext)

    expect(compiled.id).toBe('title-1')
    expect(compiled.type).toBe('title')
    expect(compiled.visible).toBe(true)
    expect(compiled.position).toBe('top-left')
    expect(compiled.content).toBe('Hello World')
    expect(compiled.fontFamily).toBe('Inter, sans-serif')
    expect(compiled.fontSize).toBe(3)
    expect(compiled.fontWeight).toBe(800)
    expect(compiled.letterSpacing).toBe(-0.01)
    expect(compiled.lineHeight).toBe(1.2)
    expect(compiled.color).toBe('oklch(0.1 0 0)') // titleAutoColor
  })

  it('should use default values for title type', () => {
    const element = createTestElement({ type: 'title' })
    const colorContext = createTestColorContext()

    const compiled = compileForegroundElement(element, palette, colorContext)

    expect(compiled.fontWeight).toBe(700)
    expect(compiled.fontSize).toBe(4)
    expect(compiled.letterSpacing).toBe(-0.02)
    expect(compiled.lineHeight).toBe(1.1)
  })

  it('should use default values for description type', () => {
    const element = createTestElement({ type: 'description' })
    const colorContext = createTestColorContext()

    const compiled = compileForegroundElement(element, palette, colorContext)

    expect(compiled.fontWeight).toBe(400)
    expect(compiled.fontSize).toBe(1.25)
    expect(compiled.letterSpacing).toBe(0)
    expect(compiled.lineHeight).toBe(1.5)
  })

  it('should use DEFAULT_FONT_RESOLVER when fontResolver not provided', () => {
    const element = createTestElement({ fontId: 'Roboto' })
    const colorContext = createTestColorContext()

    const compiled = compileForegroundElement(element, palette, colorContext)

    expect(compiled.fontFamily).toBe('Roboto')
  })
})

// ============================================================
// compileForegroundLayer
// ============================================================

describe('compileForegroundLayer', () => {
  const palette = createTestPalette()

  it('should compile all elements in layer', () => {
    const config: ForegroundLayerConfig = {
      elements: [
        createTestElement({ id: 'title-1', type: 'title', content: 'Title' }),
        createTestElement({ id: 'desc-1', type: 'description', content: 'Description' }),
      ],
    }
    const colorContext = createTestColorContext()

    const compiled = compileForegroundLayer(config, palette, colorContext)

    expect(compiled.elements).toHaveLength(2)
    expect(compiled.elements[0].id).toBe('title-1')
    expect(compiled.elements[0].content).toBe('Title')
    expect(compiled.elements[1].id).toBe('desc-1')
    expect(compiled.elements[1].content).toBe('Description')
  })

  it('should return empty elements for empty config', () => {
    const config: ForegroundLayerConfig = { elements: [] }
    const colorContext = createTestColorContext()

    const compiled = compileForegroundLayer(config, palette, colorContext)

    expect(compiled.elements).toHaveLength(0)
  })

  it('should resolve colors for each element', () => {
    const config: ForegroundLayerConfig = {
      elements: [
        createTestElement({ id: 'el-1', type: 'title' }),
        createTestElement({ id: 'el-2', type: 'description' }),
      ],
    }
    const colorContext = createTestColorContext({
      titleAutoColor: 'oklch(0.1 0 0)',
      bodyAutoColor: 'oklch(0.3 0 0)',
    })

    const compiled = compileForegroundLayer(config, palette, colorContext)

    expect(compiled.elements[0].color).toBe('oklch(0.1 0 0)')
    expect(compiled.elements[1].color).toBe('oklch(0.3 0 0)')
  })
})

// ============================================================
// createDefaultColorContext
// ============================================================

describe('createDefaultColorContext', () => {
  const palette = createTestPalette()

  it('should create light mode defaults', () => {
    const context = createDefaultColorContext(palette, false)

    // Light mode uses F9 for title (dark text on light bg)
    expect(context.titleAutoColor).toMatch(/oklch/)
    expect(context.bodyAutoColor).toMatch(/oklch/)
  })

  it('should create dark mode defaults', () => {
    const context = createDefaultColorContext(palette, true)

    // Dark mode uses F1 for title (light text on dark bg)
    expect(context.titleAutoColor).toMatch(/oklch/)
    expect(context.bodyAutoColor).toMatch(/oklch/)
  })

  it('should not include elementColors by default', () => {
    const context = createDefaultColorContext(palette, false)

    expect(context.elementColors).toBeUndefined()
  })
})
