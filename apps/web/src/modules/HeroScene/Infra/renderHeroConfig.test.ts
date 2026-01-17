/**
 * renderHeroConfig Unit Tests
 *
 * Tests for the core rendering API using the compositor pipeline.
 * Detailed functionality is tested in pipelineFeatureParity.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TextureRendererLike } from './renderHeroConfig'
import { renderHeroConfig } from './renderHeroConfig'
import { createDefaultHeroViewConfig } from '../Domain/HeroViewConfig'
import type { PrimitivePalette } from '../../SemanticColorPalette/Domain'
import type { TextureRenderSpec } from '@practice/texture'

// ============================================================
// Mock TextureRendererLike
// ============================================================

function createMockRenderer(): TextureRendererLike & {
  renderCalls: Array<{ spec: TextureRenderSpec; options?: { clear?: boolean } }>
} {
  const mockTexture = {} as GPUTexture

  return {
    renderCalls: [],

    getViewport: vi.fn(() => ({ width: 1280, height: 720 })),

    getDevice: vi.fn(() => ({
      createTexture: vi.fn(() => mockTexture),
    }) as unknown as GPUDevice),

    render: vi.fn(function (this: ReturnType<typeof createMockRenderer>, spec: TextureRenderSpec, options?: { clear?: boolean }) {
      this.renderCalls.push({ spec, options })
    }),

    copyCanvasToTexture: vi.fn(() => mockTexture),

    applyPostEffect: vi.fn(),

    renderToOffscreen: vi.fn(() => mockTexture),

    renderToTexture: vi.fn(),

    applyDualTextureEffect: vi.fn(),

    applyDualTextureEffectToOffscreen: vi.fn(() => mockTexture),

    applyPostEffectToOffscreen: vi.fn(() => mockTexture),

    applyPostEffectToTexture: vi.fn(),

    compositeToCanvas: vi.fn(),
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
// Tests
// ============================================================

describe('renderHeroConfig', () => {
  let renderer: ReturnType<typeof createMockRenderer>
  let lightPalette: PrimitivePalette

  beforeEach(() => {
    renderer = createMockRenderer()
    lightPalette = createTestPalette('light')
  })

  describe('pipeline rendering', () => {
    it('should use compositeToCanvas for final output', async () => {
      const config = createDefaultHeroViewConfig()

      await renderHeroConfig(renderer, config, lightPalette)

      // Pipeline uses compositeToCanvas for final output
      expect(renderer.compositeToCanvas).toHaveBeenCalled()
    })

    it('should use renderToTexture for surface rendering', async () => {
      const config = createDefaultHeroViewConfig()

      await renderHeroConfig(renderer, config, lightPalette)

      // Pipeline renders surfaces to owned textures (TextureOwner pattern)
      expect(renderer.renderToTexture).toHaveBeenCalled()
    })

    it('should use applyDualTextureEffectToOffscreen for mask composition', async () => {
      const config = createDefaultHeroViewConfig()

      await renderHeroConfig(renderer, config, lightPalette)

      // Pipeline uses two-texture effect for mask composition
      expect(renderer.applyDualTextureEffectToOffscreen).toHaveBeenCalled()
    })

    it('should get viewport from renderer', async () => {
      const config = createDefaultHeroViewConfig()

      await renderHeroConfig(renderer, config, lightPalette)

      expect(renderer.getViewport).toHaveBeenCalled()
    })
  })

  describe('scale option', () => {
    it('should accept scale option', async () => {
      const config = createDefaultHeroViewConfig()

      await renderHeroConfig(renderer, config, lightPalette, { scale: 0.3 })

      // Should complete without error
      expect(renderer.compositeToCanvas).toHaveBeenCalled()
    })

    it('should use scale=1 by default', async () => {
      const config = createDefaultHeroViewConfig()

      await renderHeroConfig(renderer, config, lightPalette)
      await renderHeroConfig(renderer, config, lightPalette, { scale: 1 })

      // Both should succeed
      expect(renderer.compositeToCanvas).toHaveBeenCalledTimes(2)
    })
  })

  describe('edge cases', () => {
    it('should handle missing palette keys gracefully', async () => {
      const incompletePalette = {
        ...lightPalette,
        B: undefined,
      } as unknown as PrimitivePalette

      const config = createDefaultHeroViewConfig()

      // Should not throw, should fallback to gray
      await expect(renderHeroConfig(renderer, config, incompletePalette)).resolves.not.toThrow()
    })

    it('should throw for empty layers array', async () => {
      const config = {
        ...createDefaultHeroViewConfig(),
        layers: [],
      }

      // Pipeline requires at least one layer
      await expect(renderHeroConfig(renderer, config, lightPalette)).rejects.toThrow('[buildPipeline] No layers to render')
    })
  })
})
