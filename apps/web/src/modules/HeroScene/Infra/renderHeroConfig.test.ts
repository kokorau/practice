/**
 * renderHeroConfig Unit Tests
 *
 * Tests for the core rendering logic that processes HeroViewConfig + PrimitivePalette
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TextureRendererLike, RenderHeroConfigOptions } from './renderHeroConfig'
import { renderHeroConfig } from './renderHeroConfig'
import type { HeroViewConfig, SurfaceConfig, MaskShapeConfig } from '../Domain/HeroViewConfig'
import { createDefaultHeroViewConfig, createDefaultColorsConfig, createDefaultForegroundConfig, createDefaultEffectFilterConfig } from '../Domain/HeroViewConfig'
import type { PrimitivePalette } from '../../SemanticColorPalette/Domain'
import type { Viewport, TextureRenderSpec } from '@practice/texture'

// ============================================================
// Mock TextureRendererLike
// ============================================================

function createMockRenderer(): TextureRendererLike & {
  renderCalls: Array<{ spec: TextureRenderSpec; options?: { clear?: boolean } }>
  applyPostEffectCalls: Array<{ effect: unknown; inputTexture: GPUTexture; options?: { clear?: boolean } }>
  renderToOffscreenCalls: Array<{ spec: TextureRenderSpec; textureIndex?: 0 | 1 }>
  copyCanvasToTextureCalls: number
} {
  const mockTexture = {} as GPUTexture

  return {
    renderCalls: [],
    applyPostEffectCalls: [],
    renderToOffscreenCalls: [],
    copyCanvasToTextureCalls: 0,

    getViewport: vi.fn(() => ({ width: 1280, height: 720 })),

    render: vi.fn(function (this: ReturnType<typeof createMockRenderer>, spec: TextureRenderSpec, options?: { clear?: boolean }) {
      this.renderCalls.push({ spec, options })
    }),

    copyCanvasToTexture: vi.fn(function (this: ReturnType<typeof createMockRenderer>) {
      this.copyCanvasToTextureCalls++
      return mockTexture
    }),

    applyPostEffect: vi.fn(function (
      this: ReturnType<typeof createMockRenderer>,
      effect: { shader: string; uniforms: ArrayBuffer; bufferSize: number },
      inputTexture: GPUTexture,
      options?: { clear?: boolean }
    ) {
      this.applyPostEffectCalls.push({ effect, inputTexture, options })
    }),

    renderToOffscreen: vi.fn(function (this: ReturnType<typeof createMockRenderer>, spec: TextureRenderSpec, textureIndex?: 0 | 1) {
      this.renderToOffscreenCalls.push({ spec, textureIndex })
      return mockTexture
    }),
  }
}

// ============================================================
// Test Palette Factory
// ============================================================

function createTestPalette(theme: 'light' | 'dark' = 'light'): PrimitivePalette {
  const lightPalette: PrimitivePalette = {
    theme: 'light',
    // Brand Neutral ramp
    BN0: { L: 0.98, C: 0.01, H: 200 },
    BN1: { L: 0.94, C: 0.02, H: 200 },
    BN2: { L: 0.88, C: 0.03, H: 200 },
    BN3: { L: 0.80, C: 0.04, H: 200 },
    BN4: { L: 0.70, C: 0.05, H: 200 },
    BN5: { L: 0.60, C: 0.06, H: 200 },
    BN6: { L: 0.50, C: 0.07, H: 200 },
    BN7: { L: 0.40, C: 0.08, H: 200 },
    BN8: { L: 0.30, C: 0.09, H: 200 },
    BN9: { L: 0.20, C: 0.10, H: 200 },
    // Foundation ramp
    F0: { L: 0.99, C: 0.00, H: 0 },
    F1: { L: 0.97, C: 0.00, H: 0 },
    F2: { L: 0.94, C: 0.00, H: 0 },
    F3: { L: 0.88, C: 0.00, H: 0 },
    F4: { L: 0.78, C: 0.00, H: 0 },
    F5: { L: 0.65, C: 0.00, H: 0 },
    F6: { L: 0.50, C: 0.00, H: 0 },
    F7: { L: 0.35, C: 0.00, H: 0 },
    F8: { L: 0.20, C: 0.00, H: 0 },
    F9: { L: 0.10, C: 0.00, H: 0 },
    // Accent Neutral ramp
    AN0: { L: 0.98, C: 0.02, H: 30 },
    AN1: { L: 0.94, C: 0.04, H: 30 },
    AN2: { L: 0.88, C: 0.06, H: 30 },
    AN3: { L: 0.80, C: 0.08, H: 30 },
    AN4: { L: 0.70, C: 0.10, H: 30 },
    AN5: { L: 0.60, C: 0.12, H: 30 },
    AN6: { L: 0.50, C: 0.14, H: 30 },
    AN7: { L: 0.40, C: 0.16, H: 30 },
    AN8: { L: 0.30, C: 0.18, H: 30 },
    AN9: { L: 0.20, C: 0.20, H: 30 },
    // Brand keys
    B: { L: 0.55, C: 0.15, H: 200 },
    Bt: { L: 0.92, C: 0.04, H: 200 },
    Bs: { L: 0.35, C: 0.10, H: 200 },
    Bf: { L: 0.50, C: 0.18, H: 200 },
    // Accent keys
    A: { L: 0.60, C: 0.18, H: 30 },
    At: { L: 0.93, C: 0.05, H: 30 },
    As: { L: 0.40, C: 0.12, H: 30 },
    Af: { L: 0.55, C: 0.20, H: 30 },
    // Foundation derived keys
    F: { L: 0.97, C: 0.00, H: 0 },
    Ft: { L: 0.99, C: 0.00, H: 0 },
    Fs: { L: 0.90, C: 0.00, H: 0 },
    Ff: { L: 0.95, C: 0.00, H: 0 },
  }

  if (theme === 'dark') {
    // For dark theme, F0 should have L < 0.5
    return {
      ...lightPalette,
      theme: 'dark',
      F0: { L: 0.15, C: 0.00, H: 0 },
      F1: { L: 0.20, C: 0.00, H: 0 },
      F8: { L: 0.90, C: 0.00, H: 0 },
    }
  }

  return lightPalette
}

// ============================================================
// Test Config Factories
// ============================================================

function createTestConfig(overrides?: Partial<HeroViewConfig>): HeroViewConfig {
  return {
    ...createDefaultHeroViewConfig(),
    ...overrides,
  }
}

function createConfigWithBaseLayer(surface: SurfaceConfig): HeroViewConfig {
  return createTestConfig({
    layers: [
      {
        type: 'base',
        id: 'base',
        name: 'Background',
        visible: true,
        surface,
        filters: [],
      },
    ],
  })
}

function createConfigWithMask(maskShape: MaskShapeConfig): HeroViewConfig {
  return createTestConfig({
    layers: [
      {
        type: 'base',
        id: 'base',
        name: 'Background',
        visible: true,
        surface: { type: 'solid' },
        filters: [],
      },
      {
        type: 'surface',
        id: 'surface-1',
        name: 'Surface',
        visible: true,
        surface: { type: 'solid' },
        filters: [],
      },
      {
        type: 'processor',
        id: 'processor-1',
        name: 'Mask Processor',
        visible: true,
        modifiers: [
          {
            type: 'mask',
            enabled: true,
            shape: maskShape,
            invert: false,
            feather: 0,
          },
        ],
      },
    ],
  })
}

// ============================================================
// Tests
// ============================================================

describe('renderHeroConfig', () => {
  let renderer: ReturnType<typeof createMockRenderer>
  let lightPalette: PrimitivePalette
  let darkPalette: PrimitivePalette

  beforeEach(() => {
    renderer = createMockRenderer()
    lightPalette = createTestPalette('light')
    darkPalette = createTestPalette('dark')
  })

  describe('basic rendering', () => {
    it('should call render with clear:true for base layer', async () => {
      const config = createConfigWithBaseLayer({ type: 'solid' })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderCalls.length).toBeGreaterThanOrEqual(1)
      expect(renderer.renderCalls[0]?.options?.clear).toBe(true)
    })

    it('should get viewport from renderer', async () => {
      const config = createConfigWithBaseLayer({ type: 'solid' })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.getViewport).toHaveBeenCalled()
    })

    it('should not render anything if layers array is empty', async () => {
      const config = createTestConfig({ layers: [] })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderCalls.length).toBe(0)
    })
  })

  describe('background surface types', () => {
    it('should render solid background', async () => {
      const config = createConfigWithBaseLayer({ type: 'solid' })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderCalls.length).toBe(1)
      // Solid spec should have shader containing 'solid' identifier
      expect(renderer.renderCalls[0]?.spec.shader).toBeDefined()
    })

    it('should render stripe background with scaled parameters', async () => {
      const config = createConfigWithBaseLayer({
        type: 'stripe',
        width1: 20,
        width2: 20,
        angle: 45,
      })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderCalls.length).toBe(1)
      expect(renderer.renderCalls[0]?.spec.shader).toBeDefined()
    })

    it('should render grid background', async () => {
      const config = createConfigWithBaseLayer({
        type: 'grid',
        lineWidth: 2,
        cellSize: 40,
      })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderCalls.length).toBe(1)
    })

    it('should render polkaDot background', async () => {
      const config = createConfigWithBaseLayer({
        type: 'polkaDot',
        dotRadius: 10,
        spacing: 30,
        rowOffset: 0.5,
      })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderCalls.length).toBe(1)
    })

    it('should render checker background', async () => {
      const config = createConfigWithBaseLayer({
        type: 'checker',
        cellSize: 20,
        angle: 0,
      })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderCalls.length).toBe(1)
    })

    it('should fallback to solid for unsupported surface types', async () => {
      const config = createConfigWithBaseLayer({
        type: 'image',
        imageId: 'test-image',
      } as SurfaceConfig)

      await renderHeroConfig(renderer, config, lightPalette)

      // Should still render (fallback to solid)
      expect(renderer.renderCalls.length).toBe(1)
    })
  })

  describe('scale option', () => {
    it('should scale texture parameters with scale option', async () => {
      const config = createConfigWithBaseLayer({
        type: 'stripe',
        width1: 100,
        width2: 100,
        angle: 45,
      })

      await renderHeroConfig(renderer, config, lightPalette, { scale: 0.3 })

      expect(renderer.renderCalls.length).toBe(1)
      // The render should have been called - scale affects internal values
    })

    it('should use scale=1 by default', async () => {
      const config = createConfigWithBaseLayer({
        type: 'stripe',
        width1: 20,
        width2: 20,
        angle: 45,
      })

      await renderHeroConfig(renderer, config, lightPalette)
      await renderHeroConfig(renderer, config, lightPalette, { scale: 1 })

      // Both should produce equivalent results
      expect(renderer.renderCalls.length).toBe(2)
    })
  })

  describe('mask rendering (2-stage greymap pipeline)', () => {
    it('should render circle mask using offscreen + post effect', async () => {
      const config = createConfigWithMask({
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: false,
      })

      await renderHeroConfig(renderer, config, lightPalette)

      // Should render background + surface layer
      expect(renderer.renderCalls.length).toBe(2)
      // Should render mask to offscreen (stage 1)
      expect(renderer.renderToOffscreenCalls.length).toBe(1)
      // Should apply colorize post effect (stage 2)
      expect(renderer.applyPostEffectCalls.length).toBe(1)
    })

    it('should render rect mask', async () => {
      const config = createConfigWithMask({
        type: 'rect',
        left: 0.1,
        right: 0.1,
        top: 0.1,
        bottom: 0.1,
        radiusTopLeft: 0.05,
        radiusTopRight: 0.05,
        radiusBottomLeft: 0.05,
        radiusBottomRight: 0.05,
        rotation: 0,
        perspectiveX: 0,
        perspectiveY: 0,
        cutout: false,
      })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderToOffscreenCalls.length).toBe(1)
      expect(renderer.applyPostEffectCalls.length).toBe(1)
    })

    it('should render blob mask', async () => {
      const config = createConfigWithMask({
        type: 'blob',
        centerX: 0.5,
        centerY: 0.5,
        baseRadius: 0.3,
        amplitude: 0.1,
        octaves: 3,
        seed: 42,
        cutout: false,
      })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderToOffscreenCalls.length).toBe(1)
      expect(renderer.applyPostEffectCalls.length).toBe(1)
    })

    it('should render perlin mask', async () => {
      const config = createConfigWithMask({
        type: 'perlin',
        seed: 42,
        threshold: 0.5,
        scale: 4,
        octaves: 4,
        cutout: false,
      })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderToOffscreenCalls.length).toBe(1)
      expect(renderer.applyPostEffectCalls.length).toBe(1)
    })

    it('should render linearGradient mask', async () => {
      const config = createConfigWithMask({
        type: 'linearGradient',
        angle: 90,
        startOffset: 0.2,
        endOffset: 0.8,
        cutout: false,
      })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderToOffscreenCalls.length).toBe(1)
      expect(renderer.applyPostEffectCalls.length).toBe(1)
    })

    it('should render radialGradient mask', async () => {
      const config = createConfigWithMask({
        type: 'radialGradient',
        centerX: 0.5,
        centerY: 0.5,
        innerRadius: 0.1,
        outerRadius: 0.5,
        aspectRatio: 1.0,
        cutout: false,
      })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderToOffscreenCalls.length).toBe(1)
      expect(renderer.applyPostEffectCalls.length).toBe(1)
    })

    it('should render boxGradient mask', async () => {
      const config = createConfigWithMask({
        type: 'boxGradient',
        left: 0.1,
        right: 0.1,
        top: 0.1,
        bottom: 0.1,
        cornerRadius: 0.05,
        curve: 'smooth',
        cutout: false,
      })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderToOffscreenCalls.length).toBe(1)
      expect(renderer.applyPostEffectCalls.length).toBe(1)
    })

    it('should not render mask if processor is disabled', async () => {
      const config = createTestConfig({
        layers: [
          {
            type: 'base',
            id: 'base',
            name: 'Background',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
          {
            type: 'surface',
            id: 'surface-1',
            name: 'Surface',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
          {
            type: 'processor',
            id: 'processor-1',
            name: 'Mask Processor',
            visible: true,
            modifiers: [
              {
                type: 'mask',
                enabled: false, // Disabled
                shape: {
                  type: 'circle',
                  centerX: 0.5,
                  centerY: 0.5,
                  radius: 0.3,
                  cutout: false,
                },
                invert: false,
                feather: 0,
              },
            ],
          },
        ],
      })

      await renderHeroConfig(renderer, config, lightPalette)

      // No mask rendering should occur
      expect(renderer.renderToOffscreenCalls.length).toBe(0)
      expect(renderer.applyPostEffectCalls.length).toBe(0)
    })
  })

  describe('effect filters', () => {
    it('should apply enabled effect filters on base layer', async () => {
      const config = createTestConfig({
        layers: [
          {
            type: 'base',
            id: 'base',
            name: 'Background',
            visible: true,
            surface: { type: 'solid' },
            filters: [
              {
                type: 'effect',
                enabled: true,
                config: {
                  blur: { enabled: true, radius: 8 },
                },
              },
            ],
          },
        ],
      })

      await renderHeroConfig(renderer, config, lightPalette)

      // Background render + blur effect
      expect(renderer.renderCalls.length).toBe(1)
      expect(renderer.copyCanvasToTextureCalls).toBeGreaterThanOrEqual(1)
      expect(renderer.applyPostEffectCalls.length).toBeGreaterThanOrEqual(1)
    })

    it('should not apply disabled effect filters', async () => {
      const config = createTestConfig({
        layers: [
          {
            type: 'base',
            id: 'base',
            name: 'Background',
            visible: true,
            surface: { type: 'solid' },
            filters: [
              {
                type: 'effect',
                enabled: false, // Disabled
                config: {
                  blur: { enabled: true, radius: 8 },
                },
              },
            ],
          },
        ],
      })

      await renderHeroConfig(renderer, config, lightPalette)

      // Only background render, no effect applied
      expect(renderer.renderCalls.length).toBe(1)
      expect(renderer.copyCanvasToTextureCalls).toBe(0)
    })

    it('should apply effects on surface layer', async () => {
      const config = createConfigWithMask({
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: false,
      })

      // Add effect to surface layer
      const surfaceLayer = config.layers[1]
      if (surfaceLayer && surfaceLayer.type === 'surface') {
        surfaceLayer.filters = [
          {
            type: 'effect',
            enabled: true,
            config: {
              vignette: {
                enabled: true,
                shape: 'ellipse',
                intensity: 0.5,
                softness: 0.4,
                color: [0, 0, 0, 1],
                radius: 0.8,
                centerX: 0.5,
                centerY: 0.5,
                aspectRatio: 1,
              },
            },
          },
        ]
      }

      await renderHeroConfig(renderer, config, lightPalette)

      // Should have mask pipeline calls + effect calls
      expect(renderer.applyPostEffectCalls.length).toBeGreaterThanOrEqual(2) // colorize + vignette
    })
  })

  describe('theme detection', () => {
    it('should detect light theme from palette', async () => {
      const config = createTestConfig()

      await renderHeroConfig(renderer, config, lightPalette)

      // Light theme uses F1 for canvas surface
      expect(renderer.renderCalls.length).toBeGreaterThanOrEqual(1)
    })

    it('should detect dark theme from palette', async () => {
      const config = createTestConfig()

      await renderHeroConfig(renderer, config, darkPalette)

      // Dark theme uses F8 for canvas surface
      expect(renderer.renderCalls.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('color resolution', () => {
    it('should resolve background colors from palette', async () => {
      const config = createTestConfig({
        colors: {
          ...createDefaultColorsConfig(),
          background: {
            primary: 'B', // Brand color
            secondary: 'F1', // Explicit foundation color
          },
        },
      })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderCalls.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle auto secondary color', async () => {
      const config = createTestConfig({
        colors: {
          ...createDefaultColorsConfig(),
          background: {
            primary: 'B',
            secondary: 'auto', // Auto-derived from canvas surface
          },
        },
      })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderCalls.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle auto mask primary color', async () => {
      const config = createConfigWithMask({
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: false,
      })

      // Set auto color on surface layer (per-surface colors)
      const surfaceLayer = config.layers[1]
      if (surfaceLayer && surfaceLayer.type === 'surface') {
        surfaceLayer.colors = { primary: 'auto', secondary: 'auto' }
      }

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderToOffscreenCalls.length).toBe(1)
    })

    it('should resolve mask colors based on semantic context', async () => {
      const config = createConfigWithMask({
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: false,
      })

      // Test different semantic contexts
      for (const context of ['canvas', 'sectionNeutral', 'sectionTint', 'sectionContrast'] as const) {
        config.colors.semanticContext = context
        await renderHeroConfig(renderer, config, lightPalette)
      }

      // All 4 contexts should render successfully (2 renders per context: base + surface)
      expect(renderer.renderCalls.length).toBe(8)
    })
  })

  describe('nested surface layer in group', () => {
    it('should find surface layer nested in group', async () => {
      const config = createTestConfig({
        layers: [
          {
            type: 'base',
            id: 'base',
            name: 'Background',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
          {
            type: 'group',
            id: 'group-1',
            name: 'Group',
            visible: true,
            expanded: true,
            children: [
              {
                type: 'surface',
                id: 'surface-1',
                name: 'Nested Surface',
                visible: true,
                surface: { type: 'solid' },
                filters: [],
              },
            ],
          },
        ],
      })

      await renderHeroConfig(renderer, config, lightPalette)

      // Should render base layer + nested surface layer (no mask in this test)
      expect(renderer.renderCalls.length).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('should handle missing palette keys gracefully', async () => {
      const incompletePalette = {
        ...lightPalette,
        B: undefined,
      } as unknown as PrimitivePalette

      const config = createTestConfig()

      // Should not throw, should fallback to gray
      await expect(renderHeroConfig(renderer, config, incompletePalette)).resolves.not.toThrow()
    })

    it('should handle config with only base layer (no surface)', async () => {
      const config = createConfigWithBaseLayer({ type: 'solid' })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderCalls.length).toBe(1)
      expect(renderer.renderToOffscreenCalls.length).toBe(0)
    })

    it('should handle surface layer without mask processor', async () => {
      const config = createTestConfig({
        layers: [
          {
            type: 'base',
            id: 'base',
            name: 'Background',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
          {
            type: 'surface',
            id: 'surface-1',
            name: 'Surface',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
        ],
      })

      await renderHeroConfig(renderer, config, lightPalette)

      // No mask should be rendered
      expect(renderer.renderToOffscreenCalls.length).toBe(0)
    })

    it('should handle cutout mode for masks', async () => {
      const config = createConfigWithMask({
        type: 'circle',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.3,
        cutout: true, // Cutout mode
      })

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.renderToOffscreenCalls.length).toBe(1)
    })
  })

  // ============================================================
  // Processor Node Tests (Position-based)
  // ============================================================

  describe('processor node rendering (position-based)', () => {
    it('should render mask from processor node at root level', async () => {
      const config = createTestConfig({
        layers: [
          {
            type: 'base',
            id: 'base',
            name: 'Background',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
          {
            type: 'surface',
            id: 'surface-1',
            name: 'Surface',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
          {
            type: 'processor',
            id: 'processor-1',
            name: 'Processor',
            visible: true,
            modifiers: [
              {
                type: 'mask',
                enabled: true,
                shape: {
                  type: 'circle',
                  centerX: 0.5,
                  centerY: 0.5,
                  radius: 0.3,
                  cutout: false,
                },
                invert: false,
                feather: 0,
              },
            ],
          },
        ],
      })

      await renderHeroConfig(renderer, config, lightPalette)

      // Base layer render + surface layer render + processor mask
      expect(renderer.renderCalls.length).toBe(2)
      expect(renderer.renderToOffscreenCalls.length).toBe(1)
      expect(renderer.applyPostEffectCalls.length).toBe(1)
    })

    it('should skip processor with no targets (processor first)', async () => {
      const config = createTestConfig({
        layers: [
          {
            type: 'processor',
            id: 'processor-1',
            name: 'Processor',
            visible: true,
            modifiers: [
              {
                type: 'mask',
                enabled: true,
                shape: {
                  type: 'circle',
                  centerX: 0.5,
                  centerY: 0.5,
                  radius: 0.3,
                  cutout: false,
                },
                invert: false,
                feather: 0,
              },
            ],
          },
          {
            type: 'base',
            id: 'base',
            name: 'Background',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
        ],
      })

      await renderHeroConfig(renderer, config, lightPalette)

      // Only base layer render, processor has no targets (is first)
      expect(renderer.renderCalls.length).toBe(1)
      expect(renderer.renderToOffscreenCalls.length).toBe(0)
    })

    it('should skip consecutive processor (no targets)', async () => {
      const config = createTestConfig({
        layers: [
          {
            type: 'base',
            id: 'base',
            name: 'Background',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
          {
            type: 'processor',
            id: 'processor-1',
            name: 'Processor 1',
            visible: true,
            modifiers: [
              {
                type: 'mask',
                enabled: true,
                shape: {
                  type: 'circle',
                  centerX: 0.5,
                  centerY: 0.5,
                  radius: 0.3,
                  cutout: false,
                },
                invert: false,
                feather: 0,
              },
            ],
          },
          {
            type: 'processor',
            id: 'processor-2',
            name: 'Processor 2',
            visible: true,
            modifiers: [
              {
                type: 'mask',
                enabled: true,
                shape: {
                  type: 'rect',
                  left: 0.1,
                  right: 0.1,
                  top: 0.1,
                  bottom: 0.1,
                  radiusTopLeft: 0,
                  radiusTopRight: 0,
                  radiusBottomLeft: 0,
                  radiusBottomRight: 0,
                  rotation: 0,
                  perspectiveX: 0,
                  perspectiveY: 0,
                  cutout: false,
                },
                invert: false,
                feather: 0,
              },
            ],
          },
        ],
      })

      await renderHeroConfig(renderer, config, lightPalette)

      // Base layer render + only first processor mask (second has no targets)
      expect(renderer.renderCalls.length).toBe(1)
      expect(renderer.renderToOffscreenCalls.length).toBe(1)
    })

    it('should apply effects from processor node', async () => {
      const config = createTestConfig({
        layers: [
          {
            type: 'base',
            id: 'base',
            name: 'Background',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
          {
            type: 'surface',
            id: 'surface-1',
            name: 'Surface',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
          {
            type: 'processor',
            id: 'processor-1',
            name: 'Processor',
            visible: true,
            modifiers: [
              {
                type: 'effect',
                enabled: true,
                config: {
                  blur: { enabled: true, radius: 8 },
                },
              },
            ],
          },
        ],
      })

      await renderHeroConfig(renderer, config, lightPalette)

      // Base layer render + surface layer render + effect application
      expect(renderer.renderCalls.length).toBe(2)
      expect(renderer.copyCanvasToTextureCalls).toBeGreaterThanOrEqual(1)
    })

    it('should apply both mask and effects from processor node', async () => {
      const config = createTestConfig({
        layers: [
          {
            type: 'base',
            id: 'base',
            name: 'Background',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
          {
            type: 'surface',
            id: 'surface-1',
            name: 'Surface',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
          {
            type: 'processor',
            id: 'processor-1',
            name: 'Processor',
            visible: true,
            modifiers: [
              {
                type: 'mask',
                enabled: true,
                shape: {
                  type: 'circle',
                  centerX: 0.5,
                  centerY: 0.5,
                  radius: 0.3,
                  cutout: false,
                },
                invert: false,
                feather: 0,
              },
              {
                type: 'effect',
                enabled: true,
                config: {
                  blur: { enabled: true, radius: 8 },
                },
              },
            ],
          },
        ],
      })

      await renderHeroConfig(renderer, config, lightPalette)

      // Base layer render + surface layer render + mask + effect
      expect(renderer.renderCalls.length).toBe(2)
      expect(renderer.renderToOffscreenCalls.length).toBe(1) // mask greymap
      expect(renderer.copyCanvasToTextureCalls).toBeGreaterThanOrEqual(1) // effect
    })

    it('should skip disabled mask in processor node', async () => {
      const config = createTestConfig({
        layers: [
          {
            type: 'base',
            id: 'base',
            name: 'Background',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
          {
            type: 'surface',
            id: 'surface-1',
            name: 'Surface',
            visible: true,
            surface: { type: 'solid' },
            filters: [],
          },
          {
            type: 'processor',
            id: 'processor-1',
            name: 'Processor',
            visible: true,
            modifiers: [
              {
                type: 'mask',
                enabled: false, // Disabled
                shape: {
                  type: 'circle',
                  centerX: 0.5,
                  centerY: 0.5,
                  radius: 0.3,
                  cutout: false,
                },
                invert: false,
                feather: 0,
              },
            ],
          },
        ],
      })

      await renderHeroConfig(renderer, config, lightPalette)

      // Base layer render + surface layer render, no mask
      expect(renderer.renderCalls.length).toBe(2)
      expect(renderer.renderToOffscreenCalls.length).toBe(0)
    })
  })
})
