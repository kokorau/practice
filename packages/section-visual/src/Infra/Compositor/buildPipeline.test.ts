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
import { GroupCompositorNode } from './nodes/GroupCompositorNode'
import { compileHeroView } from '../../Application/compileHeroView'
import { isDarkTheme } from '../../Domain/ColorHelpers'

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
    getDevice: vi.fn(() => ({
      createTexture: vi.fn(() => mockGpuTexture),
    }) as unknown as GPUDevice),
    getFormat: vi.fn(() => 'rgba8unorm' as GPUTextureFormat),
    renderToOffscreen: vi.fn(() => mockGpuTexture),
    renderToTexture: vi.fn(),
    applyPostEffectToOffscreen: vi.fn(() => mockGpuTexture),
    applyPostEffectToTexture: vi.fn(),
    applyDualTextureEffectToOffscreen: vi.fn(() => mockGpuTexture),
    applyDualTextureEffectToTexture: vi.fn(),
    compositeToCanvas: vi.fn(),
  }
}

/**
 * Helper to compile config and build pipeline options
 */
function compileAndGetOptions(config: HeroViewConfig, palette: ReturnType<typeof createMockPalette>) {
  const isDark = isDarkTheme(palette as never)
  const compiled = compileHeroView(config, palette as never, isDark)
  return {
    isDark,
    compiledLayers: compiled.layers,
  }
}

// ============================================================
// buildPipeline Tests
// ============================================================

describe('buildPipeline', () => {
  it('builds pipeline from default config', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    expect(result).toBeDefined()
    expect(result.outputNode).toBeDefined()
    expect(result.outputNode.type).toBe('output')
    expect(result.nodes.length).toBeGreaterThan(0)
  })

  it('creates background-group as GroupCompositorNode', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    // background-group is now a GroupCompositorNode (not special-cased)
    const bgGroupNode = result.nodes.find(n => n.id === 'background-group')
    expect(bgGroupNode).toBeDefined()
    expect(bgGroupNode).toBeInstanceOf(GroupCompositorNode)

    // background surface is a child of background-group
    const bgSurfaceNode = result.nodes.find(n => n.id === 'background')
    expect(bgSurfaceNode).toBeDefined()
    expect(bgSurfaceNode?.type).toBe('render')
  })

  it('creates clip-group nodes with mask', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    // Should have surface node for clip-group (uses child's ID directly)
    const clipSurfaceNode = result.nodes.find(n => n.id === 'surface-mask')
    expect(clipSurfaceNode).toBeDefined()

    // Should have mask node (processor ID + "-mask-{index}")
    const maskNode = result.nodes.find(n => n.id === 'processor-mask-mask-0')
    expect(maskNode).toBeDefined()
  })

  it('creates output node', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    expect(result.outputNode.id).toBe('output')
    expect(result.outputNode.type).toBe('output')
  })

  it('creates overlay node for multiple layers', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

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
              surface: { id: 'solid', params: { color1: 'B' } },
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
              surface: { id: 'stripe', params: { width1: 10, width2: 10, angle: 45, color1: 'auto', color2: 'auto' } },
            },
            // No processor node
          ],
        },
      ],
      foreground: { elements: [] },
    }
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    // Should still work without mask
    expect(result.outputNode).toBeDefined()
    // Should have surface node for clip-group
    const surfaceNode = result.nodes.find(n => n.id === 'surface-mask')
    expect(surfaceNode).toBeDefined()
    // Should not have mask compositor node (no processor means no mask applied)
    const maskCompositorNode = result.nodes.find(n => n.id.includes('-masked'))
    expect(maskCompositorNode).toBeUndefined()
  })
})

// ============================================================
// executePipeline Tests
// ============================================================

describe('executePipeline', () => {
  it('executes pipeline and outputs to canvas', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)
    const renderer = createMockRenderer()

    const { outputNode } = buildPipeline(config, options)
    executePipeline(outputNode, renderer)

    // Should call compositeToCanvas at the end
    expect(renderer.compositeToCanvas).toHaveBeenCalled()
  })

  it('uses scale option', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)
    const renderer = createMockRenderer()

    const { outputNode } = buildPipeline(config, options)
    executePipeline(outputNode, renderer, { scale: 0.5 })

    // Pipeline should execute with scale
    expect(renderer.compositeToCanvas).toHaveBeenCalled()
  })

  it('renders with renderToTexture for surfaces', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)
    const renderer = createMockRenderer()

    const { outputNode } = buildPipeline(config, options)
    executePipeline(outputNode, renderer)

    // Should call renderToTexture for surface rendering (TextureOwner pattern)
    expect(renderer.renderToTexture).toHaveBeenCalled()
  })

  it('uses dual texture effect for masked layers', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)
    const renderer = createMockRenderer()

    const { outputNode } = buildPipeline(config, options)
    executePipeline(outputNode, renderer)

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
    const options = compileAndGetOptions(config, palette)
    const renderer = createMockRenderer()

    // Build
    const { outputNode, nodes } = buildPipeline(config, options)

    // Verify structure
    expect(nodes.length).toBeGreaterThan(0)
    expect(outputNode.type).toBe('output')

    // Execute
    executePipeline(outputNode, renderer)

    // Verify execution (TextureOwner pattern uses renderToTexture)
    expect(renderer.renderToTexture).toHaveBeenCalled()
    expect(renderer.compositeToCanvas).toHaveBeenCalled()
  })

  it('handles dark theme palette', () => {
    const config = createDefaultHeroViewConfig()
    // Create dark theme palette (F0.L < 0.5)
    const darkPalette = {
      ...createMockPalette(),
      F0: { L: 0.10, C: 0.00, H: 0 },  // Dark theme indicator
    } as never
    const options = compileAndGetOptions(config, darkPalette as ReturnType<typeof createMockPalette>)

    const { outputNode } = buildPipeline(config, options)

    expect(outputNode).toBeDefined()
  })
})

// ============================================================
// Root-Level Processor Tests
// ============================================================

describe('Root-Level Processor Support', () => {
  it('handles root-level processor with effects', () => {
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
              surface: { id: 'solid', params: { color1: 'B' } },
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
              surface: { id: 'stripe', params: { width1: 10, width2: 10, angle: 45, color1: 'auto', color2: 'auto' } },
            },
          ],
        },
        // Root-level processor (applies to clip-group)
        {
          type: 'processor',
          id: 'root-processor',
          name: 'Global Effects',
          visible: true,
          modifiers: [
            { type: 'effect', id: 'blur', params: { strength: 5 } },
          ],
        },
      ],
      foreground: { elements: [] },
    }
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    // Should have effect node for root processor (effects-{index})
    const effectNode = result.nodes.find(n => n.id === 'root-processor-effects-0')
    expect(effectNode).toBeDefined()
    expect(effectNode?.type).toBe('compositor')
  })

  it('handles root-level processor with mask', () => {
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
              surface: { id: 'solid', params: { color1: 'B' } },
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
              surface: { id: 'stripe', params: { width1: 10, width2: 10, angle: 45, color1: 'auto', color2: 'auto' } },
            },
          ],
        },
        // Root-level processor with mask
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
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    // Should have mask render node for root processor (mask-{index}-render)
    const maskNode = result.nodes.find(n => n.id === 'root-processor-mask-0-render')
    expect(maskNode).toBeDefined()
    expect(maskNode?.type).toBe('render')

    // Should have masked compositor node (mask-{index})
    const maskedNode = result.nodes.find(n => n.id === 'root-processor-mask-0')
    expect(maskedNode).toBeDefined()
    expect(maskedNode?.type).toBe('compositor')
  })

  it('ignores root-level processor without valid targets', () => {
    const config: HeroViewConfig = {
      viewport: { width: 1280, height: 720 },
      colors: {
        semanticContext: 'canvas',
        brand: { hue: 198, saturation: 70, value: 65 },
        accent: { hue: 30, saturation: 80, value: 60 },
        foundation: { hue: 0, saturation: 0, value: 97 },
      },
      layers: [
        // Processor at the start (no preceding layer = no targets)
        {
          type: 'processor',
          id: 'invalid-processor',
          name: 'Invalid Processor',
          visible: true,
          modifiers: [
            { type: 'effect', id: 'blur', params: { strength: 5 } },
          ],
        },
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
              surface: { id: 'solid', params: { color1: 'B' } },
            },
          ],
        },
      ],
      foreground: { elements: [] },
    }
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    // Should NOT have nodes for invalid processor
    const processorNode = result.nodes.find(n => n.id.includes('invalid-processor'))
    expect(processorNode).toBeUndefined()
  })

  it('executes pipeline with root-level processor', () => {
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
              surface: { id: 'solid', params: { color1: 'B' } },
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
              surface: { id: 'solid', params: {} },
            },
          ],
        },
        // Root-level processor with mask and effects
        {
          type: 'processor',
          id: 'root-processor',
          name: 'Global Effects',
          visible: true,
          modifiers: [
            {
              type: 'mask',
              enabled: true,
              shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.4 },
              invert: false,
              feather: 0,
            },
            { type: 'effect', id: 'vignette', params: { shape: 'ellipse', intensity: 0.5 } },
          ],
        },
      ],
      foreground: { elements: [] },
    }
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)
    const renderer = createMockRenderer()

    const { outputNode } = buildPipeline(config, options)
    executePipeline(outputNode, renderer)

    // TextureOwner pattern: single effect goes directly to owned texture
    expect(renderer.applyPostEffectToTexture).toHaveBeenCalled()
    // Should call applyDualTextureEffectToOffscreen or applyDualTextureEffectToTexture for mask
    const dualTextureCalled =
      renderer.applyDualTextureEffectToOffscreen.mock.calls.length > 0 ||
      renderer.applyDualTextureEffectToTexture.mock.calls.length > 0
    expect(dualTextureCalled).toBe(true)
    // Should output to canvas
    expect(renderer.compositeToCanvas).toHaveBeenCalled()
  })
})

// ============================================================
// Text Layer Tests
// ============================================================

describe('Text Layer Support', () => {
  it('creates text render node for text layer', () => {
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
              surface: { id: 'solid', params: { color1: 'B' } },
            },
          ],
        },
        {
          type: 'text',
          id: 'text-layer-1',
          name: 'Title',
          visible: true,
          text: 'Hello World',
          fontFamily: 'sans-serif',
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: 0,
          lineHeight: 1.2,
          color: '#ffffff',
          position: { x: 0.5, y: 0.5, anchor: 'center' },
          rotation: 0,
        },
      ],
      foreground: { elements: [] },
    }
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    // Should have text render node
    const textNode = result.nodes.find(n => n.id === 'text-layer-1')
    expect(textNode).toBeDefined()
    expect(textNode?.type).toBe('render')
  })

  it('creates multiple text render nodes', () => {
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
              surface: { id: 'solid', params: { color1: 'B' } },
            },
          ],
        },
        {
          type: 'text',
          id: 'text-title',
          name: 'Title',
          visible: true,
          text: 'Title Text',
          fontFamily: 'sans-serif',
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: 0,
          lineHeight: 1.2,
          color: '#ffffff',
          position: { x: 0.5, y: 0.3, anchor: 'center' },
          rotation: 0,
        },
        {
          type: 'text',
          id: 'text-subtitle',
          name: 'Subtitle',
          visible: true,
          text: 'Subtitle Text',
          fontFamily: 'sans-serif',
          fontSize: 32,
          fontWeight: 400,
          letterSpacing: 0,
          lineHeight: 1.4,
          color: '#cccccc',
          position: { x: 0.5, y: 0.6, anchor: 'center' },
          rotation: 0,
        },
      ],
      foreground: { elements: [] },
    }
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    // Should have both text nodes
    const titleNode = result.nodes.find(n => n.id === 'text-title')
    const subtitleNode = result.nodes.find(n => n.id === 'text-subtitle')

    expect(titleNode).toBeDefined()
    expect(subtitleNode).toBeDefined()
  })

  it('ignores invisible text layers', () => {
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
              surface: { id: 'solid', params: { color1: 'B' } },
            },
          ],
        },
        {
          type: 'text',
          id: 'text-hidden',
          name: 'Hidden Text',
          visible: false,  // Not visible
          text: 'Hidden',
          fontFamily: 'sans-serif',
          fontSize: 48,
          fontWeight: 400,
          letterSpacing: 0,
          lineHeight: 1.2,
          color: '#ffffff',
          position: { x: 0.5, y: 0.5, anchor: 'center' },
          rotation: 0,
        },
      ],
      foreground: { elements: [] },
    }
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    // Should NOT have text node for hidden layer
    const textNode = result.nodes.find(n => n.id === 'text-hidden')
    expect(textNode).toBeUndefined()
  })

  it('includes text layers in overlay compositor', () => {
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
              surface: { id: 'solid', params: { color1: 'B' } },
            },
          ],
        },
        {
          type: 'text',
          id: 'text-layer-1',
          name: 'Text',
          visible: true,
          text: 'Hello',
          fontFamily: 'sans-serif',
          fontSize: 48,
          fontWeight: 400,
          letterSpacing: 0,
          lineHeight: 1.2,
          color: '#ffffff',
          position: { x: 0.5, y: 0.5, anchor: 'center' },
          rotation: 0,
        },
      ],
      foreground: { elements: [] },
    }
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    // Should have overlay node (multiple layers: background + text)
    const overlayNode = result.nodes.find(n => n.id === 'scene')
    expect(overlayNode).toBeDefined()
    expect(overlayNode?.type).toBe('compositor')
  })
})

// ============================================================
// GroupCompositorNode Tests
// ============================================================

describe('GroupCompositorNode Support', () => {
  it('creates GroupCompositorNode for non-background groups', () => {
    const config = createDefaultHeroViewConfig()
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    // Should have clip-group as GroupCompositorNode
    const clipGroupNode = result.nodes.find(n => n.id === 'clip-group')
    expect(clipGroupNode).toBeDefined()
    expect(clipGroupNode).toBeInstanceOf(GroupCompositorNode)
  })

  it('sets blendMode on GroupCompositorNode', () => {
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
              surface: { id: 'solid', params: { color1: 'B' } },
            },
          ],
        },
        {
          type: 'group',
          id: 'clip-group',
          name: 'Clip Group',
          visible: true,
          blendMode: 'multiply',
          children: [
            {
              type: 'surface',
              id: 'surface-mask',
              name: 'Surface',
              visible: true,
              surface: { id: 'stripe', params: { width1: 10, width2: 10, angle: 45, color1: 'auto', color2: 'auto' } },
            },
          ],
        },
      ],
      foreground: { elements: [] },
    }
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    const clipGroupNode = result.nodes.find(n => n.id === 'clip-group') as GroupCompositorNode
    expect(clipGroupNode).toBeInstanceOf(GroupCompositorNode)
    expect(clipGroupNode.getBlendMode()).toBe('multiply')
  })

  it('defaults blendMode to normal', () => {
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
              surface: { id: 'solid', params: { color1: 'B' } },
            },
          ],
        },
        {
          type: 'group',
          id: 'clip-group',
          name: 'Clip Group',
          visible: true,
          // No blendMode specified
          children: [
            {
              type: 'surface',
              id: 'surface-mask',
              name: 'Surface',
              visible: true,
              surface: { id: 'stripe', params: { width1: 10, width2: 10, angle: 45, color1: 'auto', color2: 'auto' } },
            },
          ],
        },
      ],
      foreground: { elements: [] },
    }
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    const clipGroupNode = result.nodes.find(n => n.id === 'clip-group') as GroupCompositorNode
    expect(clipGroupNode).toBeInstanceOf(GroupCompositorNode)
    expect(clipGroupNode.getBlendMode()).toBe('normal')
  })

  it('creates nested GroupCompositorNodes', () => {
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
              surface: { id: 'solid', params: { color1: 'B' } },
            },
          ],
        },
        {
          type: 'group',
          id: 'outer-group',
          name: 'Outer Group',
          visible: true,
          blendMode: 'overlay',
          children: [
            {
              type: 'group',
              id: 'inner-group',
              name: 'Inner Group',
              visible: true,
              blendMode: 'screen',
              children: [
                {
                  type: 'surface',
                  id: 'inner-surface',
                  name: 'Inner Surface',
                  visible: true,
                  surface: { id: 'solid', params: {} },
                    },
              ],
            },
          ],
        },
      ],
      foreground: { elements: [] },
    }
    const palette = createMockPalette()
    const options = compileAndGetOptions(config, palette)

    const result = buildPipeline(config, options)

    // Should have both outer and inner group nodes
    const outerGroupNode = result.nodes.find(n => n.id === 'outer-group') as GroupCompositorNode
    const innerGroupNode = result.nodes.find(n => n.id === 'inner-group') as GroupCompositorNode

    expect(outerGroupNode).toBeInstanceOf(GroupCompositorNode)
    expect(innerGroupNode).toBeInstanceOf(GroupCompositorNode)

    expect(outerGroupNode.getBlendMode()).toBe('overlay')
    expect(innerGroupNode.getBlendMode()).toBe('screen')
  })
})
