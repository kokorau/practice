/**
 * compileHeroView tests
 */

import { describe, it, expect } from 'vitest'
import { compileHeroView, type CompileContext } from './compileHeroView'
import type { HeroViewConfig, SurfaceLayerNodeConfig, ProcessorNodeConfig, GroupLayerNodeConfig } from '../Domain/HeroViewConfig'
import { $PropertyValue } from '../Domain/SectionVisual'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import type { Oklch } from '@practice/color'

// ============================================================
// Test Fixtures
// ============================================================

function createTestPalette(): PrimitivePalette {
  const white: Oklch = { L: 0.99, C: 0, H: 0 }
  const black: Oklch = { L: 0.01, C: 0, H: 0 }
  const brand: Oklch = { L: 0.6, C: 0.15, H: 250 }
  const accent: Oklch = { L: 0.7, C: 0.2, H: 30 }

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
    A: accent, At: { L: 0.9, C: 0.1, H: 30 }, As: { L: 0.4, C: 0.15, H: 30 }, Af: { L: 0.5, C: 0.25, H: 30 },
  } as PrimitivePalette
}

function createMinimalConfig(): HeroViewConfig {
  return {
    viewport: { width: 1280, height: 720 },
    colors: { semanticContext: 'canvas' },
    layers: [
      {
        type: 'group',
        id: 'background-group',
        name: 'Background',
        visible: true,
        children: [
          {
            type: 'surface',
            id: 'background',
            name: 'Background Surface',
            visible: true,
            surface: {
              id: 'solid',
              params: {
                color1: $PropertyValue.static('B'),
              },
            },
          } as SurfaceLayerNodeConfig,
        ],
      } as GroupLayerNodeConfig,
    ],
    foreground: {
      elements: [
        {
          id: 'title-1',
          type: 'title',
          visible: true,
          position: 'middle-center',
          content: 'Hello World',
        },
      ],
    },
  }
}

// ============================================================
// Tests
// ============================================================

describe('compileHeroView', () => {
  describe('basic compilation', () => {
    it('should compile minimal config', () => {
      const config = createMinimalConfig()
      const palette = createTestPalette()

      const compiled = compileHeroView(config, palette, false)

      expect(compiled.viewport.width).toBe(1280)
      expect(compiled.viewport.height).toBe(720)
      expect(compiled.isDark).toBe(false)
      expect(compiled.layers).toHaveLength(1)
      expect(compiled.foreground.elements).toHaveLength(1)
    })

    it('should set isDark correctly', () => {
      const config = createMinimalConfig()
      const palette = createTestPalette()

      const lightCompiled = compileHeroView(config, palette, false)
      const darkCompiled = compileHeroView(config, palette, true)

      expect(lightCompiled.isDark).toBe(false)
      expect(darkCompiled.isDark).toBe(true)
    })
  })

  describe('surface layer compilation', () => {
    it('should compile surface layer with resolved colors', () => {
      const config = createMinimalConfig()
      const palette = createTestPalette()

      const compiled = compileHeroView(config, palette, false)

      const group = compiled.layers[0]
      expect(group.type).toBe('group')
      if (group.type === 'group') {
        const surface = group.children[0]
        expect(surface.type).toBe('surface')
        if (surface.type === 'surface') {
          expect(surface.surface.id).toBe('solid')
          expect(surface.surface.color1).toHaveLength(4)
          expect(surface.surface.color2).toHaveLength(4)
          // Check that colors are valid RGBA values
          expect(surface.surface.color1[3]).toBe(1)
          expect(surface.surface.color2[3]).toBe(1)
        }
      }
    })

    it('should resolve PropertyValue params', () => {
      const config: HeroViewConfig = {
        ...createMinimalConfig(),
        layers: [
          {
            type: 'surface',
            id: 'stripe-bg',
            name: 'Stripe Background',
            visible: true,
            surface: {
              id: 'stripe',
              params: {
                width1: $PropertyValue.static(20),
                width2: $PropertyValue.static(20),
                angle: $PropertyValue.static(45),
                color1: $PropertyValue.static('B'),
                color2: $PropertyValue.static('F1'),
              },
            },
          } as SurfaceLayerNodeConfig,
        ],
      }
      const palette = createTestPalette()

      const compiled = compileHeroView(config, palette, false)

      const surface = compiled.layers[0]
      expect(surface.type).toBe('surface')
      if (surface.type === 'surface') {
        expect(surface.surface.params.width1).toBe(20)
        expect(surface.surface.params.width2).toBe(20)
        expect(surface.surface.params.angle).toBe(45)
      }
    })

    it('should resolve RangeExpr params with intensity provider', () => {
      const config: HeroViewConfig = {
        ...createMinimalConfig(),
        layers: [
          {
            type: 'surface',
            id: 'stripe-bg',
            name: 'Stripe Background',
            visible: true,
            surface: {
              id: 'stripe',
              params: {
                width1: $PropertyValue.range('track-1', 10, 30),
                width2: $PropertyValue.static(20),
                angle: $PropertyValue.static(45),
                color1: $PropertyValue.static('B'),
                color2: $PropertyValue.static('F1'),
              },
            },
          } as SurfaceLayerNodeConfig,
        ],
      }
      const palette = createTestPalette()

      // Test with intensity = 0.5
      const context: CompileContext = {
        intensityProvider: (trackId) => trackId === 'track-1' ? 0.5 : 0,
      }

      const compiled = compileHeroView(config, palette, false, context)

      const surface = compiled.layers[0]
      if (surface.type === 'surface') {
        // min=10, max=30, intensity=0.5 → 10 + (30-10) * 0.5 = 20
        expect(surface.surface.params.width1).toBe(20)
      }
    })
  })

  describe('processor layer compilation', () => {
    it('should compile effect modifiers', () => {
      const config: HeroViewConfig = {
        ...createMinimalConfig(),
        layers: [
          {
            type: 'surface',
            id: 'bg',
            name: 'Background',
            visible: true,
            surface: { id: 'solid', params: {} },
          } as SurfaceLayerNodeConfig,
          {
            type: 'processor',
            id: 'processor-1',
            name: 'Effects',
            visible: true,
            modifiers: [
              {
                type: 'effect',
                id: 'blur',
                params: {
                  radius: $PropertyValue.static(8),
                },
              },
            ],
          } as ProcessorNodeConfig,
        ],
      }
      const palette = createTestPalette()

      const compiled = compileHeroView(config, palette, false)

      expect(compiled.layers).toHaveLength(2)
      const processor = compiled.layers[1]
      expect(processor.type).toBe('processor')
      if (processor.type === 'processor') {
        expect(processor.modifiers).toHaveLength(1)
        expect(processor.modifiers[0].type).toBe('effect')
        if (processor.modifiers[0].type === 'effect') {
          expect(processor.modifiers[0].id).toBe('blur')
          expect(processor.modifiers[0].params.radius).toBe(8)
        }
      }
    })

    it('should compile mask modifiers', () => {
      const config: HeroViewConfig = {
        ...createMinimalConfig(),
        layers: [
          {
            type: 'surface',
            id: 'bg',
            name: 'Background',
            visible: true,
            surface: { id: 'solid', params: {} },
          } as SurfaceLayerNodeConfig,
          {
            type: 'processor',
            id: 'processor-1',
            name: 'Mask',
            visible: true,
            modifiers: [
              {
                type: 'mask',
                enabled: true,
                shape: {
                  id: 'circle',
                  params: {
                    centerX: $PropertyValue.static(0.5),
                    centerY: $PropertyValue.static(0.5),
                    radius: $PropertyValue.static(0.3),
                    cutout: $PropertyValue.static(false),
                  },
                },
                invert: false,
                feather: 0,
              },
            ],
          } as ProcessorNodeConfig,
        ],
      }
      const palette = createTestPalette()

      const compiled = compileHeroView(config, palette, false)

      const processor = compiled.layers[1]
      if (processor.type === 'processor') {
        expect(processor.modifiers[0].type).toBe('mask')
        if (processor.modifiers[0].type === 'mask') {
          expect(processor.modifiers[0].enabled).toBe(true)
          expect(processor.modifiers[0].shape.id).toBe('circle')
          expect(processor.modifiers[0].shape.params.centerX).toBe(0.5)
          expect(processor.modifiers[0].shape.params.radius).toBe(0.3)
        }
      }
    })
  })

  describe('foreground compilation', () => {
    it('should compile foreground elements', () => {
      const config = createMinimalConfig()
      const palette = createTestPalette()

      const compiled = compileHeroView(config, palette, false)

      expect(compiled.foreground.elements).toHaveLength(1)
      const title = compiled.foreground.elements[0]
      expect(title.id).toBe('title-1')
      expect(title.type).toBe('title')
      expect(title.visible).toBe(true)
      expect(title.position).toBe('middle-center')
      expect(title.content).toBe('Hello World')
      expect(title.color).toMatch(/oklch/)
    })

    it('should use default typography values', () => {
      const config = createMinimalConfig()
      const palette = createTestPalette()

      const compiled = compileHeroView(config, palette, false)

      const title = compiled.foreground.elements[0]
      expect(title.fontWeight).toBe(700) // default for title
      expect(title.fontSize).toBe(4) // default for title
      expect(title.lineHeight).toBe(1.1) // default for title
    })

    it('should use custom foreground color context', () => {
      const config = createMinimalConfig()
      const palette = createTestPalette()

      const context: CompileContext = {
        foregroundColorContext: {
          titleAutoColor: 'oklch(0.1 0 0)',
          bodyAutoColor: 'oklch(0.2 0 0)',
        },
      }

      const compiled = compileHeroView(config, palette, false, context)

      const title = compiled.foreground.elements[0]
      expect(title.color).toBe('oklch(0.1 0 0)')
    })
  })

  describe('group layer compilation', () => {
    it('should compile nested group layers', () => {
      const config: HeroViewConfig = {
        ...createMinimalConfig(),
        layers: [
          {
            type: 'group',
            id: 'outer-group',
            name: 'Outer',
            visible: true,
            blendMode: 'normal',
            children: [
              {
                type: 'group',
                id: 'inner-group',
                name: 'Inner',
                visible: true,
                children: [
                  {
                    type: 'surface',
                    id: 'nested-surface',
                    name: 'Nested Surface',
                    visible: true,
                    surface: { id: 'solid', params: {} },
                  } as SurfaceLayerNodeConfig,
                ],
              } as GroupLayerNodeConfig,
            ],
          } as GroupLayerNodeConfig,
        ],
      }
      const palette = createTestPalette()

      const compiled = compileHeroView(config, palette, false)

      expect(compiled.layers).toHaveLength(1)
      const outerGroup = compiled.layers[0]
      expect(outerGroup.type).toBe('group')
      if (outerGroup.type === 'group') {
        expect(outerGroup.blendMode).toBe('normal')
        expect(outerGroup.children).toHaveLength(1)
        const innerGroup = outerGroup.children[0]
        expect(innerGroup.type).toBe('group')
        if (innerGroup.type === 'group') {
          expect(innerGroup.children).toHaveLength(1)
          expect(innerGroup.children[0].type).toBe('surface')
        }
      }
    })
  })
})
