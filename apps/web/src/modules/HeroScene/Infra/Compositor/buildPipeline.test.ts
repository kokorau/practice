/**
 * Pipeline Builder Tests
 *
 * Tests for buildPipeline and executePipeline functions.
 */

import { describe, it, expect, vi } from 'vitest'
import { buildPipeline } from './buildPipeline'
import { executePipeline } from './executePipeline'
import type { HeroViewConfig } from '../../Domain/HeroViewConfig'
import { createDefaultHeroViewConfig } from '../../Domain/HeroViewConfig'
import type { CompositorRenderer } from '../../Domain/Compositor'

// Mock @practice/texture and @practice/color to prevent interference from other test files
// Use importOriginal to get the real module implementation
vi.mock('@practice/texture', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@practice/texture')>()
  return {
    ...actual,
  }
})

vi.mock('@practice/color', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@practice/color')>()
  return {
    ...actual,
  }
})

// ============================================================
// Mock Helpers
// ============================================================

const mockGpuTexture = {} as GPUTexture

function createMockPalette() {
  return {
    theme: 'light',
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
  } as never
}

function createMockRenderer(): CompositorRenderer {
  return {
    getViewport: vi.fn(() => ({ width: 1280, height: 720 })),
    renderToOffscreen: vi.fn(() => mockGpuTexture),
    applyPostEffectToOffscreen: vi.fn(() => mockGpuTexture),
    applyDualTextureEffectToOffscreen: vi.fn(() => mockGpuTexture),
    compositeToCanvas: vi.fn(),
  }
}

// ============================================================
// buildPipeline Tests
// ============================================================

describe('buildPipeline', () => {
  it('builds pipeline from default config', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()

    const result = buildPipeline(config, palette)

    expect(result).toBeDefined()
    expect(result.outputNode).toBeDefined()
    expect(result.outputNode.type).toBe('output')
    expect(result.nodes.length).toBeGreaterThan(0)
  })

  it('creates background surface node', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()

    const result = buildPipeline(config, palette)

    const bgNode = result.nodes.find(n => n.id === 'bg-surface')
    expect(bgNode).toBeDefined()
    expect(bgNode?.type).toBe('render')
  })

  it('creates clip-group nodes with mask', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()

    const result = buildPipeline(config, palette)

    // Should have surface node for clip-group
    const clipSurfaceNode = result.nodes.find(n => n.id === 'clip-group-surface')
    expect(clipSurfaceNode).toBeDefined()

    // Should have mask node
    const maskNode = result.nodes.find(n => n.id === 'clip-group-mask')
    expect(maskNode).toBeDefined()
  })

  it('creates output node', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()

    const result = buildPipeline(config, palette)

    expect(result.outputNode.id).toBe('output')
    expect(result.outputNode.type).toBe('output')
  })

  it('creates overlay node for multiple layers', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()

    const result = buildPipeline(config, palette)

    // Should have overlay node combining layers
    const overlayNode = result.nodes.find(n => n.id === 'scene')
    expect(overlayNode).toBeDefined()
    expect(overlayNode?.type).toBe('compositor')
  })

  it('handles config with no mask processor', () => {
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
              id: 'surface-mask',
              name: 'Surface',
              visible: true,
              surface: { type: 'stripe', width1: 10, width2: 10, angle: 45 },
              colors: { primary: 'auto', secondary: 'auto' },
            },
            // No processor node
          ],
        },
      ],
      foreground: { elements: [] },
    }
    const palette = createMockPalette()

    const result = buildPipeline(config, palette)

    // Should still work without mask
    expect(result.outputNode).toBeDefined()
    // Should not have mask node
    const maskNode = result.nodes.find(n => n.id.includes('mask') && n.type === 'render')
    expect(maskNode).toBeUndefined()
  })
})

// ============================================================
// executePipeline Tests
// ============================================================

describe('executePipeline', () => {
  it('executes pipeline and outputs to canvas', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const renderer = createMockRenderer()

    const { outputNode } = buildPipeline(config, palette)
    executePipeline(outputNode, renderer, palette)

    // Should call compositeToCanvas at the end
    expect(renderer.compositeToCanvas).toHaveBeenCalled()
  })

  it('uses scale option', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const renderer = createMockRenderer()

    const { outputNode } = buildPipeline(config, palette)
    executePipeline(outputNode, renderer, palette, { scale: 0.5 })

    // Pipeline should execute with scale
    expect(renderer.compositeToCanvas).toHaveBeenCalled()
  })

  it('renders with renderToOffscreen for surfaces', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const renderer = createMockRenderer()

    const { outputNode } = buildPipeline(config, palette)
    executePipeline(outputNode, renderer, palette)

    // Should call renderToOffscreen for surface rendering
    expect(renderer.renderToOffscreen).toHaveBeenCalled()
  })

  it('uses dual texture effect for masked layers', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const renderer = createMockRenderer()

    const { outputNode } = buildPipeline(config, palette)
    executePipeline(outputNode, renderer, palette)

    // Should call applyDualTextureEffectToOffscreen for mask composition
    expect(renderer.applyDualTextureEffectToOffscreen).toHaveBeenCalled()
  })
})

// ============================================================
// Integration Tests
// ============================================================

describe('Pipeline Integration', () => {
  it('builds and executes full pipeline', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const renderer = createMockRenderer()

    // Build
    const { outputNode, nodes } = buildPipeline(config, palette)

    // Verify structure
    expect(nodes.length).toBeGreaterThan(0)
    expect(outputNode.type).toBe('output')

    // Execute
    executePipeline(outputNode, renderer, palette)

    // Verify execution
    expect(renderer.renderToOffscreen).toHaveBeenCalled()
    expect(renderer.compositeToCanvas).toHaveBeenCalled()
  })

  it('handles dark theme palette', () => {
    const config = createDefaultHeroViewConfig()
    // Create dark theme palette (F0.L < 0.5)
    const darkPalette = {
      ...createMockPalette(),
      F0: { L: 0.10, C: 0.00, H: 0 },  // Dark theme indicator
    } as never

    const { outputNode } = buildPipeline(config, darkPalette)

    expect(outputNode).toBeDefined()
  })
})
// CI trigger
