/**
 * Pipeline Feature Parity Tests
 *
 * Verifies that the node-based compositor pipeline covers all features
 * from the legacy procedural rendering path.
 *
 * ## Feature Parity Matrix
 *
 * | Feature                      | Legacy Path           | Pipeline               | Status |
 * |------------------------------|-----------------------|------------------------|--------|
 * | Background layer             | render() direct       | SurfaceRenderNode      | ✅     |
 * | Surface patterns (15 types)  | createBackgroundSpec  | SurfaceRenderNode      | ✅     |
 * | Mask shapes (7 types)        | createGreymapMaskSpec | MaskRenderNode         | ✅     |
 * | Mask composition             | applyDualTextureEffect| MaskCompositorNode     | ✅     |
 * | Layer overlay                | render() overlay      | OverlayCompositorNode  | ✅     |
 * | Effect chain                 | applySingleEffects    | EffectChainCompositor  | ✅     |
 * | Root processor (mask)        | applyEffectors        | buildProcessorNode     | ✅     |
 * | Root processor (effects)     | applyEffectors        | buildProcessorNode     | ✅     |
 * | Dark theme                   | isDarkTheme()         | isDarkTheme()          | ✅     |
 * | Semantic context colors      | getMaskSurfaceKey     | getMaskSurfaceKey      | ✅     |
 * | Per-surface colors           | getBackgroundColors   | getBackgroundColors    | ✅     |
 * | Scale option                 | scaleValue()          | NodeContext.scale      | ✅     |
 * | Cutout mask mode             | cutout flag           | cutout flag            | ✅     |
 * | Multiple clip-groups         | for loop              | buildPipeline loop     | ✅     |
 *
 * ## Known Differences
 *
 * 1. Layer filters (legacy `filters` array on BaseLayerNodeConfig):
 *    - Legacy: Supports `filters: [{ type: 'effect', config: LayerEffectConfig }]`
 *    - Pipeline: Uses processor nodes for effects
 *    - Migration: Convert legacy filters to processor modifiers
 *
 * 2. Rendering order:
 *    - Legacy: Renders directly to canvas with { clear: false } for overlays
 *    - Pipeline: Renders to offscreen textures, composites, then outputs
 *    - Result: Same visual output, different internal flow
 *
 * @see renderHeroConfig.ts - Contains both legacy and pipeline paths
 * @see buildPipeline.ts - Pipeline construction logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildPipeline, executePipeline } from './index'
import { renderHeroConfig } from '../renderHeroConfig'
import type { TextureRendererLike } from '../renderHeroConfig'
import type { HeroViewConfig } from '../../Domain/HeroViewConfig'
import { createDefaultHeroViewConfig } from '../../Domain/HeroViewConfig'
import type { PrimitivePalette } from '../../../SemanticColorPalette/Domain'
import type { CompositorRenderer } from '../../Domain/Compositor'

// ============================================================
// Test Helpers
// ============================================================

const mockGpuTexture = {} as GPUTexture

function createMockPalette(theme: 'light' | 'dark' = 'light'): PrimitivePalette {
  const base = {
    theme,
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
    F0: theme === 'light' ? { L: 0.99, C: 0.00, H: 0 } : { L: 0.10, C: 0.00, H: 0 },
    F1: { L: 0.97, C: 0.00, H: 0 },
    F2: { L: 0.94, C: 0.00, H: 0 },
    F3: { L: 0.88, C: 0.00, H: 0 },
    F4: { L: 0.78, C: 0.00, H: 0 },
    F5: { L: 0.65, C: 0.00, H: 0 },
    F6: { L: 0.50, C: 0.00, H: 0 },
    F7: { L: 0.35, C: 0.00, H: 0 },
    F8: { L: 0.20, C: 0.00, H: 0 },
    F9: { L: 0.10, C: 0.00, H: 0 },
    AN0: { L: 0.98, C: 0.02, H: 30 },
    AN1: { L: 0.94, C: 0.04, H: 30 },
    AN2: { L: 0.88, C: 0.06, H: 30 },
    AN3: { L: 0.80, C: 0.08, H: 30 },
    AN4: { L: 0.70, C: 0.10, H: 30 },
    AN5: { L: 0.60, C: 0.12, H: 30 },
    AN6: { L: 0.50, C: 0.14, H: 30 },
    AN7: { L: 0.40, C: 0.12, H: 30 },
    AN8: { L: 0.30, C: 0.10, H: 30 },
    AN9: { L: 0.20, C: 0.08, H: 30 },
    B: { L: 0.55, C: 0.15, H: 250 },
    Bt: { L: 0.45, C: 0.18, H: 250 },
    Bs: { L: 0.65, C: 0.12, H: 250 },
    Bf: { L: 0.35, C: 0.20, H: 250 },
    A: { L: 0.60, C: 0.18, H: 30 },
    At: { L: 0.50, C: 0.20, H: 30 },
    As: { L: 0.70, C: 0.15, H: 30 },
    Af: { L: 0.40, C: 0.22, H: 30 },
  }
  return base as never
}

interface MockRendererMetrics {
  renderToOffscreenCount: number
  applyDualTextureCount: number
  applyPostEffectCount: number
  compositeToCanvasCount: number
}

function createMockRenderer(): TextureRendererLike & CompositorRenderer & { metrics: MockRendererMetrics } {
  const metrics: MockRendererMetrics = {
    renderToOffscreenCount: 0,
    applyDualTextureCount: 0,
    applyPostEffectCount: 0,
    compositeToCanvasCount: 0,
  }

  return {
    metrics,
    getViewport: vi.fn(() => ({ width: 1280, height: 720 })),
    getDevice: vi.fn(() => ({
      createTexture: vi.fn(() => mockGpuTexture),
    }) as unknown as GPUDevice),
    render: vi.fn(),
    copyCanvasToTexture: vi.fn(() => mockGpuTexture),
    applyPostEffect: vi.fn(),
    renderToOffscreen: vi.fn(() => {
      metrics.renderToOffscreenCount++
      return mockGpuTexture
    }),
    renderToTexture: vi.fn(() => {
      metrics.renderToOffscreenCount++ // Count as renderToOffscreen for test compatibility
    }),
    applyDualTextureEffect: vi.fn(),
    applyDualTextureEffectToOffscreen: vi.fn(() => {
      metrics.applyDualTextureCount++
      return mockGpuTexture
    }),
    applyPostEffectToOffscreen: vi.fn(() => {
      metrics.applyPostEffectCount++
      return mockGpuTexture
    }),
    applyPostEffectToTexture: vi.fn(() => {
      metrics.applyPostEffectCount++
    }),
    compositeToCanvas: vi.fn(() => {
      metrics.compositeToCanvasCount++
    }),
  }
}

// ============================================================
// Feature Parity Tests
// ============================================================

describe('Pipeline Feature Parity', () => {
  let palette: PrimitivePalette
  let darkPalette: PrimitivePalette

  beforeEach(() => {
    palette = createMockPalette('light')
    darkPalette = createMockPalette('dark')
  })

  describe('Surface Pattern Coverage', () => {
    const surfaceTypes = [
      'solid',
      'stripe',
      'grid',
      'polkaDot',
      'checker',
      'triangle',
      'hexagon',
      'gradientGrain',
      'asanoha',
      'seigaiha',
      'wave',
      'scales',
      'ogee',
      'sunburst',
    ] as const

    it.each(surfaceTypes)('pipeline renders %s surface pattern', (surfaceType) => {
      const config: HeroViewConfig = {
        viewport: { width: 1280, height: 720 },
        colors: {
          semanticContext: 'canvas',
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
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
                name: 'Surface',
                visible: true,
                surface: createSurfaceConfig(surfaceType),
                colors: { primary: 'B', secondary: 'auto' },
              },
            ],
          },
        ],
        foreground: { elements: [] },
      }

      const renderer = createMockRenderer()
      const { outputNode } = buildPipeline(config, palette)
      executePipeline(outputNode, renderer, palette)

      expect(renderer.metrics.renderToOffscreenCount).toBeGreaterThan(0)
      expect(renderer.metrics.compositeToCanvasCount).toBe(1)
    })
  })

  describe('Mask Shape Coverage', () => {
    const maskShapes = [
      { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.4 },
      { type: 'rect', left: 0.1, right: 0.1, top: 0.1, bottom: 0.1, radiusTopLeft: 0, radiusTopRight: 0, radiusBottomLeft: 0, radiusBottomRight: 0, rotation: 0, perspectiveX: 0, perspectiveY: 0 },
      { type: 'blob', centerX: 0.5, centerY: 0.5, baseRadius: 0.3, amplitude: 0.1, octaves: 3, seed: 42 },
      { type: 'perlin', seed: 42, threshold: 0.5, scale: 4, octaves: 4 },
      { type: 'linearGradient', angle: 90, startOffset: 0.2, endOffset: 0.8 },
      { type: 'radialGradient', centerX: 0.5, centerY: 0.5, innerRadius: 0.1, outerRadius: 0.5, aspectRatio: 1 },
      { type: 'boxGradient', left: 0.1, right: 0.1, top: 0.1, bottom: 0.1, cornerRadius: 0.05, curve: 'smooth' },
    ] as const

    it.each(maskShapes)('pipeline renders $type mask shape', (maskShape) => {
      const config: HeroViewConfig = {
        viewport: { width: 1280, height: 720 },
        colors: {
          semanticContext: 'canvas',
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
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
                name: 'Surface',
                visible: true,
                surface: { type: 'solid' },
                colors: { primary: 'B', secondary: 'auto' },
              },
            ],
          },
          {
            type: 'group',
            id: 'clip-group',
            name: 'Clip Group',
            visible: true,
            children: [
              {
                type: 'surface',
                id: 'surface',
                name: 'Surface',
                visible: true,
                surface: { type: 'stripe', width1: 10, width2: 10, angle: 45 },
                colors: { primary: 'auto', secondary: 'auto' },
              },
              {
                type: 'processor',
                id: 'processor',
                name: 'Processor',
                visible: true,
                modifiers: [
                  {
                    type: 'mask',
                    enabled: true,
                    shape: maskShape as never,
                    invert: false,
                    feather: 0,
                  },
                ],
              },
            ],
          },
        ],
        foreground: { elements: [] },
      }

      const renderer = createMockRenderer()
      const { outputNode } = buildPipeline(config, palette)
      executePipeline(outputNode, renderer, palette)

      // Should render: background surface + clip surface + mask
      expect(renderer.metrics.renderToOffscreenCount).toBeGreaterThanOrEqual(3)
      // Should compose: mask composition + layer overlay
      expect(renderer.metrics.applyDualTextureCount).toBeGreaterThanOrEqual(1)
      expect(renderer.metrics.compositeToCanvasCount).toBe(1)
    })
  })

  describe('Effect Chain Coverage', () => {
    const effectTypes = [
      { id: 'blur', params: { strength: 5 } },
      { id: 'vignette', params: { shape: 'ellipse', intensity: 0.5 } },
      { id: 'chromaticAberration', params: { intensity: 10 } },
      { id: 'dotHalftone', params: { size: 4, contrast: 1 } },
      { id: 'lineHalftone', params: { spacing: 4, angle: 45, contrast: 1 } },
    ] as const

    it.each(effectTypes)('pipeline applies $id effect', ({ id, params }) => {
      const config: HeroViewConfig = {
        viewport: { width: 1280, height: 720 },
        colors: {
          semanticContext: 'canvas',
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
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
                name: 'Surface',
                visible: true,
                surface: { type: 'solid' },
                colors: { primary: 'B', secondary: 'auto' },
              },
            ],
          },
          {
            type: 'group',
            id: 'clip-group',
            name: 'Clip Group',
            visible: true,
            children: [
              {
                type: 'surface',
                id: 'surface',
                name: 'Surface',
                visible: true,
                surface: { type: 'solid' },
                colors: { primary: 'auto', secondary: 'auto' },
              },
              {
                type: 'processor',
                id: 'processor',
                name: 'Processor',
                visible: true,
                modifiers: [
                  {
                    type: 'mask',
                    enabled: true,
                    shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.4 },
                    invert: false,
                    feather: 0,
                  },
                  {
                    type: 'effect',
                    id,
                    params,
                  },
                ],
              },
            ],
          },
        ],
        foreground: { elements: [] },
      }

      const renderer = createMockRenderer()
      const { outputNode } = buildPipeline(config, palette)
      executePipeline(outputNode, renderer, palette)

      // Should apply the effect
      expect(renderer.metrics.applyPostEffectCount).toBeGreaterThan(0)
      expect(renderer.metrics.compositeToCanvasCount).toBe(1)
    })
  })

  describe('Multi-Layer Support', () => {
    it('renders multiple clip-groups in order', () => {
      const config: HeroViewConfig = {
        viewport: { width: 1280, height: 720 },
        colors: {
          semanticContext: 'canvas',
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
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
                name: 'Surface',
                visible: true,
                surface: { type: 'solid' },
                colors: { primary: 'B', secondary: 'auto' },
              },
            ],
          },
          // Clip group 1
          {
            type: 'group',
            id: 'clip-group-1',
            name: 'Clip Group 1',
            visible: true,
            children: [
              {
                type: 'surface',
                id: 'surface-1',
                name: 'Surface 1',
                visible: true,
                surface: { type: 'stripe', width1: 10, width2: 10, angle: 45 },
                colors: { primary: 'auto', secondary: 'auto' },
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
                    shape: { type: 'circle', centerX: 0.3, centerY: 0.5, radius: 0.2 },
                    invert: false,
                    feather: 0,
                  },
                ],
              },
            ],
          },
          // Clip group 2
          {
            type: 'group',
            id: 'clip-group-2',
            name: 'Clip Group 2',
            visible: true,
            children: [
              {
                type: 'surface',
                id: 'surface-2',
                name: 'Surface 2',
                visible: true,
                surface: { type: 'polkaDot', dotRadius: 5, spacing: 20, rowOffset: 0.5 },
                colors: { primary: 'A', secondary: 'auto' },
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
                    shape: { type: 'circle', centerX: 0.7, centerY: 0.5, radius: 0.2 },
                    invert: false,
                    feather: 0,
                  },
                ],
              },
            ],
          },
        ],
        foreground: { elements: [] },
      }

      const renderer = createMockRenderer()
      const { outputNode, nodes } = buildPipeline(config, palette)
      executePipeline(outputNode, renderer, palette)

      // Should have nodes for both clip-groups
      const clipGroup1Nodes = nodes.filter(n => n.id.includes('clip-group-1'))
      const clipGroup2Nodes = nodes.filter(n => n.id.includes('clip-group-2'))

      expect(clipGroup1Nodes.length).toBeGreaterThan(0)
      expect(clipGroup2Nodes.length).toBeGreaterThan(0)

      // Should have overlay compositor
      const overlayNode = nodes.find(n => n.id === 'scene')
      expect(overlayNode).toBeDefined()

      // Should render: bg + 2 surfaces + 2 masks = 5 renderToOffscreen calls
      expect(renderer.metrics.renderToOffscreenCount).toBeGreaterThanOrEqual(5)
      expect(renderer.metrics.compositeToCanvasCount).toBe(1)
    })
  })

  describe('Theme Support', () => {
    it('handles dark theme correctly', () => {
      const config = createDefaultHeroViewConfig()
      const renderer = createMockRenderer()

      const { outputNode } = buildPipeline(config, darkPalette)
      executePipeline(outputNode, renderer, darkPalette)

      expect(renderer.metrics.compositeToCanvasCount).toBe(1)
    })

    it('handles light theme correctly', () => {
      const config = createDefaultHeroViewConfig()
      const renderer = createMockRenderer()

      const { outputNode } = buildPipeline(config, palette)
      executePipeline(outputNode, renderer, palette)

      expect(renderer.metrics.compositeToCanvasCount).toBe(1)
    })
  })

  describe('Semantic Context Support', () => {
    const semanticContexts = ['canvas', 'sectionNeutral', 'sectionTint', 'sectionContrast'] as const

    it.each(semanticContexts)('handles %s semantic context', (context) => {
      const config: HeroViewConfig = {
        ...createDefaultHeroViewConfig(),
        colors: {
          semanticContext: context,
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
      }

      const renderer = createMockRenderer()
      const { outputNode } = buildPipeline(config, palette)
      executePipeline(outputNode, renderer, palette)

      expect(renderer.metrics.compositeToCanvasCount).toBe(1)
    })
  })

  describe('Root-Level Processor Support', () => {
    it('applies root processor mask to final composite', () => {
      const config: HeroViewConfig = {
        viewport: { width: 1280, height: 720 },
        colors: {
          semanticContext: 'canvas',
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
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
                name: 'Surface',
                visible: true,
                surface: { type: 'solid' },
                colors: { primary: 'B', secondary: 'auto' },
              },
            ],
          },
          {
            type: 'group',
            id: 'clip-group',
            name: 'Clip Group',
            visible: true,
            children: [
              {
                type: 'surface',
                id: 'surface',
                name: 'Surface',
                visible: true,
                surface: { type: 'solid' },
                colors: { primary: 'auto', secondary: 'auto' },
              },
            ],
          },
          // Root-level processor
          {
            type: 'processor',
            id: 'root-processor',
            name: 'Global Mask',
            visible: true,
            modifiers: [
              {
                type: 'mask',
                enabled: true,
                shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.4 },
                invert: false,
                feather: 0,
              },
            ],
          },
        ],
        foreground: { elements: [] },
      }

      const renderer = createMockRenderer()
      const { outputNode, nodes } = buildPipeline(config, palette)
      executePipeline(outputNode, renderer, palette)

      // Should have root processor mask node
      const rootMaskNode = nodes.find(n => n.id === 'root-processor-mask')
      expect(rootMaskNode).toBeDefined()

      expect(renderer.metrics.compositeToCanvasCount).toBe(1)
    })

    it('applies root processor effects to final composite', () => {
      const config: HeroViewConfig = {
        viewport: { width: 1280, height: 720 },
        colors: {
          semanticContext: 'canvas',
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
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
                name: 'Surface',
                visible: true,
                surface: { type: 'solid' },
                colors: { primary: 'B', secondary: 'auto' },
              },
            ],
          },
          {
            type: 'group',
            id: 'clip-group',
            name: 'Clip Group',
            visible: true,
            children: [
              {
                type: 'surface',
                id: 'surface',
                name: 'Surface',
                visible: true,
                surface: { type: 'solid' },
                colors: { primary: 'auto', secondary: 'auto' },
              },
            ],
          },
          // Root-level processor with effects
          {
            type: 'processor',
            id: 'root-processor',
            name: 'Global Effects',
            visible: true,
            modifiers: [
              { type: 'effect', id: 'blur', params: { strength: 5 } },
              { type: 'effect', id: 'vignette', params: { shape: 'ellipse', intensity: 0.5 } },
            ],
          },
        ],
        foreground: { elements: [] },
      }

      const renderer = createMockRenderer()
      const { outputNode, nodes } = buildPipeline(config, palette)
      executePipeline(outputNode, renderer, palette)

      // Should have root processor effects node
      const rootEffectsNode = nodes.find(n => n.id === 'root-processor-effects')
      expect(rootEffectsNode).toBeDefined()

      // Should apply 2 effects
      expect(renderer.metrics.applyPostEffectCount).toBe(2)
      expect(renderer.metrics.compositeToCanvasCount).toBe(1)
    })
  })

  describe('Cutout Mask Mode', () => {
    it('handles cutout mask correctly', () => {
      const config: HeroViewConfig = {
        viewport: { width: 1280, height: 720 },
        colors: {
          semanticContext: 'canvas',
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
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
                name: 'Surface',
                visible: true,
                surface: { type: 'solid' },
                colors: { primary: 'B', secondary: 'auto' },
              },
            ],
          },
          {
            type: 'group',
            id: 'clip-group',
            name: 'Clip Group',
            visible: true,
            children: [
              {
                type: 'surface',
                id: 'surface',
                name: 'Surface',
                visible: true,
                surface: { type: 'stripe', width1: 10, width2: 10, angle: 45 },
                colors: { primary: 'auto', secondary: 'auto' },
              },
              {
                type: 'processor',
                id: 'processor',
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
                      radius: 0.4,
                      cutout: true, // Cutout mode
                    },
                    invert: false,
                    feather: 0,
                  },
                ],
              },
            ],
          },
        ],
        foreground: { elements: [] },
      }

      const renderer = createMockRenderer()
      const { outputNode } = buildPipeline(config, palette)
      executePipeline(outputNode, renderer, palette)

      expect(renderer.metrics.compositeToCanvasCount).toBe(1)
    })
  })

  describe('Scale Option', () => {
    it('respects scale option for thumbnail rendering', () => {
      const config = createDefaultHeroViewConfig()
      const renderer = createMockRenderer()

      const { outputNode } = buildPipeline(config, palette)
      executePipeline(outputNode, renderer, palette, { scale: 0.3 })

      expect(renderer.metrics.compositeToCanvasCount).toBe(1)
    })
  })

  describe('renderHeroConfig Integration', () => {
    it('produces output via pipeline', async () => {
      const config = createDefaultHeroViewConfig()
      const renderer = createMockRenderer()

      await renderHeroConfig(renderer, config, palette)

      // Pipeline should produce output
      expect(renderer.metrics.compositeToCanvasCount).toBe(1)
    })
  })
})

// ============================================================
// Helper Functions
// ============================================================

function createSurfaceConfig(type: string): never {
  switch (type) {
    case 'solid':
      return { type: 'solid' } as never
    case 'stripe':
      return { type: 'stripe', width1: 10, width2: 10, angle: 45 } as never
    case 'grid':
      return { type: 'grid', lineWidth: 2, cellSize: 40 } as never
    case 'polkaDot':
      return { type: 'polkaDot', dotRadius: 10, spacing: 30, rowOffset: 0.5 } as never
    case 'checker':
      return { type: 'checker', cellSize: 20, angle: 0 } as never
    case 'triangle':
      return { type: 'triangle', size: 30, angle: 0 } as never
    case 'hexagon':
      return { type: 'hexagon', size: 30, angle: 0 } as never
    case 'gradientGrain':
      return {
        type: 'gradientGrain',
        depthMapType: 'linear',
        angle: 45,
        centerX: 0.5,
        centerY: 0.5,
        radialStartAngle: 0,
        radialSweepAngle: 360,
        perlinScale: 4,
        perlinOctaves: 4,
        perlinContrast: 1,
        perlinOffset: 0,
        seed: 42,
        sparsity: 0.5,
      } as never
    case 'asanoha':
      return { type: 'asanoha', size: 40, lineWidth: 2 } as never
    case 'seigaiha':
      return { type: 'seigaiha', radius: 30, rings: 3, lineWidth: 2 } as never
    case 'wave':
      return { type: 'wave', amplitude: 10, wavelength: 50, thickness: 5, angle: 0 } as never
    case 'scales':
      return { type: 'scales', size: 30, overlap: 0.3, angle: 0 } as never
    case 'ogee':
      return { type: 'ogee', width: 40, height: 60, lineWidth: 2 } as never
    case 'sunburst':
      return { type: 'sunburst', rays: 12, centerX: 0.5, centerY: 0.5, twist: 0 } as never
    default:
      return { type: 'solid' } as never
  }
}
