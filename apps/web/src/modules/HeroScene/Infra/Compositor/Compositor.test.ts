/**
 * Compositor Infra Layer Tests
 *
 * Tests for RenderNode implementations and TexturePool.
 */

import { describe, it, expect, vi } from 'vitest'
import { MultiBufferTexturePool, TripleBufferTexturePool, createTexturePool } from './TexturePool'
import {
  SurfaceRenderNode,
  createSurfaceRenderNode,
} from './nodes/SurfaceRenderNode'
import {
  MaskRenderNode,
  createMaskRenderNode,
} from './nodes/MaskRenderNode'
import {
  EffectRenderNode,
  createEffectRenderNode,
} from './nodes/EffectRenderNode'
import {
  MaskCompositorNode,
  createMaskCompositorNode,
} from './nodes/MaskCompositorNode'
import {
  EffectChainCompositorNode,
  createEffectChainCompositorNode,
} from './nodes/EffectChainCompositorNode'
import {
  OverlayCompositorNode,
  createOverlayCompositorNode,
} from './nodes/OverlayCompositorNode'
import {
  CanvasOutputNode,
  createCanvasOutputNode,
} from './nodes/CanvasOutputNode'
import type { NodeContext, TextureHandle, RenderNode, CompositorNode } from '../../Domain/Compositor'

// ============================================================
// Mock Helpers
// ============================================================

const mockGpuTexture = {
  destroy: vi.fn(),
  width: 1280,
  height: 720,
} as unknown as GPUTexture

function createMockGpuTexture(width = 1280, height = 720): GPUTexture {
  return {
    destroy: vi.fn(),
    width,
    height,
  } as unknown as GPUTexture
}

function createMockContext(): NodeContext {
  const texturePool = new MultiBufferTexturePool(1280, 720)
  const mockDevice = {
    createTexture: vi.fn((descriptor: GPUTextureDescriptor) => {
      const [w, h] = descriptor.size as [number, number]
      return createMockGpuTexture(w, h)
    }),
  } as unknown as GPUDevice

  return {
    renderer: {
      getViewport: vi.fn(() => ({ width: 1280, height: 720 })),
      getDevice: vi.fn(() => mockDevice),
      renderToOffscreen: vi.fn(() => mockGpuTexture),
      renderToTexture: vi.fn(),
      applyPostEffectToOffscreen: vi.fn(() => mockGpuTexture),
      applyPostEffectToTexture: vi.fn(),
      applyDualTextureEffectToOffscreen: vi.fn(() => mockGpuTexture),
      applyDualTextureEffectToTexture: vi.fn(),
      compositeToCanvas: vi.fn(),
    },
    viewport: { width: 1280, height: 720 },
    palette: createMockPalette(),
    scale: 1,
    texturePool,
    device: mockDevice,
    format: 'rgba8unorm',
  }
}

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

// ============================================================
// TexturePool Tests
// ============================================================

describe('MultiBufferTexturePool', () => {
  it('cycles through texture indices 0-5', () => {
    const pool = new MultiBufferTexturePool(1280, 720)

    expect(pool.acquire()._textureIndex).toBe(0)
    expect(pool.acquire()._textureIndex).toBe(1)
    expect(pool.acquire()._textureIndex).toBe(2)
    expect(pool.acquire()._textureIndex).toBe(3)
    expect(pool.acquire()._textureIndex).toBe(4)
    expect(pool.acquire()._textureIndex).toBe(5)
    // Cycles back to 0
    expect(pool.acquire()._textureIndex).toBe(0)
  })

  it('assigns unique IDs to handles', () => {
    const pool = new MultiBufferTexturePool(1280, 720)

    const handle1 = pool.acquire()
    const handle2 = pool.acquire()

    expect(handle1.id).not.toBe(handle2.id)
  })

  it('sets correct dimensions', () => {
    const pool = new MultiBufferTexturePool(800, 600)

    const handle = pool.acquire()

    expect(handle.width).toBe(800)
    expect(handle.height).toBe(600)
  })

  it('getNextIndex returns next index in cycle', () => {
    const pool = new MultiBufferTexturePool(1280, 720)

    expect(pool.getNextIndex(0)).toBe(1)
    expect(pool.getNextIndex(1)).toBe(2)
    expect(pool.getNextIndex(2)).toBe(3)
    expect(pool.getNextIndex(3)).toBe(4)
    expect(pool.getNextIndex(4)).toBe(5)
    expect(pool.getNextIndex(5)).toBe(0)
  })

  it('reset() resets the pool state', () => {
    const pool = new MultiBufferTexturePool(1280, 720)

    pool.acquire()  // 0
    pool.acquire()  // 1
    pool.reset()

    const handle = pool.acquire()
    expect(handle._textureIndex).toBe(0)
  })
})

describe('TripleBufferTexturePool (legacy alias)', () => {
  it('is an alias for MultiBufferTexturePool', () => {
    expect(TripleBufferTexturePool).toBe(MultiBufferTexturePool)
  })
})

describe('createTexturePool', () => {
  it('creates a MultiBufferTexturePool', () => {
    const pool = createTexturePool(1280, 720)

    expect(pool).toBeInstanceOf(MultiBufferTexturePool)
  })
})

// ============================================================
// SurfaceRenderNode Tests
// ============================================================

describe('SurfaceRenderNode', () => {
  it('creates a node with correct properties', () => {
    const node = createSurfaceRenderNode(
      'test-surface',
      { type: 'solid' },
      { primary: 'F1', secondary: 'F3' }
    )

    expect(node.id).toBe('test-surface')
    expect(node.type).toBe('render')
  })

  it('renders solid surface and returns texture handle', () => {
    const ctx = createMockContext()
    const node = createSurfaceRenderNode(
      'bg',
      { type: 'solid' },
      { primary: 'F1', secondary: 'F3' }
    )

    const result = node.render(ctx)

    expect(result).toBeDefined()
    expect(result.id).toBeDefined()
    expect(ctx.renderer.renderToTexture).toHaveBeenCalled()
  })

  it('renders stripe surface', () => {
    const ctx = createMockContext()
    const node = createSurfaceRenderNode(
      'stripe-bg',
      { type: 'stripe', width1: 10, width2: 10, angle: 45 },
      { primary: 'F1', secondary: 'F3' }
    )

    const result = node.render(ctx)

    expect(result).toBeDefined()
    expect(ctx.renderer.renderToTexture).toHaveBeenCalled()
  })
})

// ============================================================
// MaskRenderNode Tests
// ============================================================

describe('MaskRenderNode', () => {
  it('creates a node with correct properties', () => {
    const node = createMaskRenderNode(
      'test-mask',
      { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3 }
    )

    expect(node.id).toBe('test-mask')
    expect(node.type).toBe('render')
  })

  it('renders circle mask and returns texture handle', () => {
    const ctx = createMockContext()
    const node = createMaskRenderNode(
      'mask',
      { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3 }
    )

    const result = node.render(ctx)

    expect(result).toBeDefined()
    expect(result.id).toBeDefined()
    expect(ctx.renderer.renderToTexture).toHaveBeenCalled()
  })

  it('renders rect mask', () => {
    const ctx = createMockContext()
    const node = createMaskRenderNode(
      'rect-mask',
      { type: 'rect', centerX: 0.5, centerY: 0.5, width: 0.6, height: 0.4, cornerRadius: [0, 0, 0, 0] }
    )

    const result = node.render(ctx)

    expect(result).toBeDefined()
    expect(ctx.renderer.renderToTexture).toHaveBeenCalled()
  })
})

// ============================================================
// EffectRenderNode Tests
// ============================================================

describe('EffectRenderNode', () => {
  it('creates a node with correct properties', () => {
    const inputNode: RenderNode = {
      id: 'input',
      type: 'render',
      render: () => ({
        id: 'input-tex',
        width: 1280,
        height: 720,
        _gpuTexture: mockGpuTexture,
        _textureIndex: 0,
      }),
    }

    const node = createEffectRenderNode(
      'test-effect',
      inputNode,
      'blur',
      { strength: 5 }
    )

    expect(node.id).toBe('test-effect')
    expect(node.type).toBe('render')
  })

  it('throws error for invalid effect type', () => {
    const inputNode: RenderNode = {
      id: 'input',
      type: 'render',
      render: () => ({
        id: 'input-tex',
        width: 1280,
        height: 720,
        _gpuTexture: mockGpuTexture,
        _textureIndex: 0,
      }),
    }

    expect(() => {
      createEffectRenderNode(
        'invalid',
        inputNode,
        'invalidType' as never,
        {}
      )
    }).toThrow('Invalid effect type')
  })

  it('applies effect and returns texture handle', () => {
    const ctx = createMockContext()
    const inputNode: RenderNode = {
      id: 'input',
      type: 'render',
      render: () => ({
        id: 'input-tex',
        width: 1280,
        height: 720,
        _gpuTexture: mockGpuTexture,
        _textureIndex: 0,
      }),
    }

    const node = createEffectRenderNode(
      'blur-effect',
      inputNode,
      'blur',
      { strength: 5 }
    )

    const result = node.render(ctx)

    expect(result).toBeDefined()
    // EffectRenderNode now uses TextureOwner pattern with applyPostEffectToTexture
    expect(ctx.renderer.applyPostEffectToTexture).toHaveBeenCalled()
  })
})

// ============================================================
// MaskCompositorNode Tests
// ============================================================

describe('MaskCompositorNode', () => {
  function createMockRenderNode(id: string, textureIndex: 0 | 1 = 0): RenderNode {
    return {
      id,
      type: 'render',
      render: () => ({
        id: `${id}-tex`,
        width: 1280,
        height: 720,
        _gpuTexture: mockGpuTexture,
        _textureIndex: textureIndex,
      }),
    }
  }

  it('creates a node with correct properties', () => {
    const surfaceNode = createMockRenderNode('surface')
    const maskNode = createMockRenderNode('mask')

    const node = createMaskCompositorNode('masked', surfaceNode, maskNode)

    expect(node.id).toBe('masked')
    expect(node.type).toBe('compositor')
    expect(node.inputs).toHaveLength(2)
  })

  it('combines surface and mask textures', () => {
    const ctx = createMockContext()
    const surfaceNode = createMockRenderNode('surface', 0)
    const maskNode = createMockRenderNode('mask', 1)

    const node = createMaskCompositorNode('masked', surfaceNode, maskNode)
    const result = node.composite(ctx)

    expect(result).toBeDefined()
    // TextureOwner pattern: node owns its output texture
    expect(result.id).toBe('masked-owned')
    expect(ctx.renderer.applyDualTextureEffectToTexture).toHaveBeenCalled()
  })
})

// ============================================================
// EffectChainCompositorNode Tests
// ============================================================

describe('EffectChainCompositorNode', () => {
  function createMockRenderNode(id: string): RenderNode {
    return {
      id,
      type: 'render',
      render: () => ({
        id: `${id}-tex`,
        width: 1280,
        height: 720,
        _gpuTexture: mockGpuTexture,
        _textureIndex: 0,
      }),
    }
  }

  it('creates a node with correct properties', () => {
    const inputNode = createMockRenderNode('input')

    const node = createEffectChainCompositorNode('effects', inputNode, [
      { id: 'blur', params: { strength: 5 } },
    ])

    expect(node.id).toBe('effects')
    expect(node.type).toBe('compositor')
    expect(node.inputs).toHaveLength(1)
  })

  it('returns input unchanged if no effects', () => {
    const ctx = createMockContext()
    const inputNode = createMockRenderNode('input')

    const node = createEffectChainCompositorNode('no-effects', inputNode, [])
    const result = node.composite(ctx)

    expect(result).toBeDefined()
    expect(ctx.renderer.applyPostEffectToOffscreen).not.toHaveBeenCalled()
  })

  it('applies effects in sequence to owned texture', () => {
    const ctx = createMockContext()
    const inputNode = createMockRenderNode('input')

    const node = createEffectChainCompositorNode('effects', inputNode, [
      { id: 'blur', params: { strength: 5 } },
      { id: 'vignette', params: { shape: 'ellipse', intensity: 0.5 } },
    ])
    const result = node.composite(ctx)

    expect(result).toBeDefined()
    // TextureOwner pattern: first effect to pool, last effect to owned texture
    expect(ctx.renderer.applyPostEffectToOffscreen).toHaveBeenCalledTimes(1)
    expect(ctx.renderer.applyPostEffectToTexture).toHaveBeenCalledTimes(1)
  })

  it('skips invalid effect types', () => {
    const ctx = createMockContext()
    const inputNode = createMockRenderNode('input')

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const node = createEffectChainCompositorNode('effects', inputNode, [
      { id: 'invalidEffect', params: {} },
    ])
    node.composite(ctx)

    expect(consoleSpy).toHaveBeenCalledWith(
      '[EffectChainCompositorNode] Unknown effect type "invalidEffect", skipping (id: effects)'
    )

    consoleSpy.mockRestore()
  })
})

// ============================================================
// OverlayCompositorNode Tests
// ============================================================

describe('OverlayCompositorNode', () => {
  function createMockRenderNode(id: string): RenderNode {
    return {
      id,
      type: 'render',
      render: () => ({
        id: `${id}-tex`,
        width: 1280,
        height: 720,
        _gpuTexture: mockGpuTexture,
        _textureIndex: 0,
      }),
    }
  }

  it('creates a node with correct properties', () => {
    const layer1 = createMockRenderNode('layer1')
    const layer2 = createMockRenderNode('layer2')

    const node = createOverlayCompositorNode('overlay', [layer1, layer2])

    expect(node.id).toBe('overlay')
    expect(node.type).toBe('compositor')
    expect(node.inputs).toHaveLength(2)
  })

  it('throws error if no layers', () => {
    const ctx = createMockContext()
    const node = createOverlayCompositorNode('empty', [])

    expect(() => node.composite(ctx)).toThrow('No layers to composite')
  })

  it('returns single layer copied to owned texture', () => {
    const ctx = createMockContext()
    const layer1 = createMockRenderNode('layer1')

    const node = createOverlayCompositorNode('single', [layer1])
    const result = node.composite(ctx)

    expect(result).toBeDefined()
    // TextureOwner pattern: copies single layer to owned texture
    expect(result.id).toBe('single-owned')
  })

  it('composites multiple layers to owned texture', () => {
    const ctx = createMockContext()
    const layer1 = createMockRenderNode('layer1')
    const layer2 = createMockRenderNode('layer2')
    const layer3 = createMockRenderNode('layer3')

    const node = createOverlayCompositorNode('scene', [layer1, layer2, layer3])
    const result = node.composite(ctx)

    expect(result).toBeDefined()
    // TextureOwner pattern: node owns its output texture
    expect(result.id).toBe('scene-owned')
  })

  it('uses alpha blending shader for multi-layer composition', () => {
    const ctx = createMockContext()
    const layer1 = createMockRenderNode('bg')
    const layer2 = createMockRenderNode('overlay')

    const node = createOverlayCompositorNode('scene', [layer1, layer2])
    node.composite(ctx)

    // Should call applyDualTextureEffectToOffscreen for alpha blending
    expect(ctx.renderer.applyDualTextureEffectToOffscreen).toHaveBeenCalledTimes(1)
  })

  it('applies alpha blending for each additional layer', () => {
    const ctx = createMockContext()
    const layer1 = createMockRenderNode('bg')
    const layer2 = createMockRenderNode('mid')
    const layer3 = createMockRenderNode('top')

    const node = createOverlayCompositorNode('scene', [layer1, layer2, layer3])
    node.composite(ctx)

    // Should call applyDualTextureEffectToOffscreen twice (for layer2 and layer3)
    expect(ctx.renderer.applyDualTextureEffectToOffscreen).toHaveBeenCalledTimes(2)
  })
})

// ============================================================
// Texture Caching Tests (#466)
// ============================================================

describe('Texture Caching', () => {
  describe('RenderNode caching', () => {
    it('skips render when not dirty', () => {
      const ctx = createMockContext()
      const node = createSurfaceRenderNode(
        'cached-surface',
        { type: 'solid' },
        { primary: 'F1', secondary: 'F3' }
      )

      // First render - should render
      node.render(ctx)
      expect(ctx.renderer.renderToTexture).toHaveBeenCalledTimes(1)

      // Second render - should skip (not dirty)
      node.render(ctx)
      expect(ctx.renderer.renderToTexture).toHaveBeenCalledTimes(1)
    })

    it('re-renders after invalidation', () => {
      const ctx = createMockContext()
      const node = createSurfaceRenderNode(
        'invalidated-surface',
        { type: 'solid' },
        { primary: 'F1', secondary: 'F3' }
      )

      // First render
      node.render(ctx)
      expect(ctx.renderer.renderToTexture).toHaveBeenCalledTimes(1)

      // Invalidate
      node.invalidate()

      // Should re-render
      node.render(ctx)
      expect(ctx.renderer.renderToTexture).toHaveBeenCalledTimes(2)
    })

    it('re-renders after viewport resize', () => {
      const ctx1 = createMockContext()
      const node = createSurfaceRenderNode(
        'resized-surface',
        { type: 'solid' },
        { primary: 'F1', secondary: 'F3' }
      )

      // First render
      node.render(ctx1)
      expect(ctx1.renderer.renderToTexture).toHaveBeenCalledTimes(1)

      // Create context with different viewport
      const ctx2 = createMockContext()
      ctx2.viewport = { width: 1920, height: 1080 }

      // Should re-render due to viewport change
      node.render(ctx2)
      expect(ctx2.renderer.renderToTexture).toHaveBeenCalledTimes(1)
    })
  })

  describe('CompositorNode dirty propagation', () => {
    it('propagates dirty from surface node in MaskCompositorNode', () => {
      const ctx = createMockContext()
      const surfaceNode = createSurfaceRenderNode(
        'surface',
        { type: 'solid' },
        { primary: 'F1', secondary: 'F3' }
      )
      const maskNode = createMaskRenderNode(
        'mask',
        { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3 }
      )

      const node = createMaskCompositorNode('masked', surfaceNode, maskNode)

      // First composite - all nodes render
      node.composite(ctx)
      expect(ctx.renderer.applyDualTextureEffectToTexture).toHaveBeenCalledTimes(1)

      // Clear mocks for tracking
      vi.clearAllMocks()

      // Second composite - should skip (all clean)
      node.composite(ctx)
      expect(ctx.renderer.applyDualTextureEffectToTexture).not.toHaveBeenCalled()

      // Invalidate surface node
      surfaceNode.invalidate()

      // Should re-composite because input is dirty
      node.composite(ctx)
      expect(ctx.renderer.applyDualTextureEffectToTexture).toHaveBeenCalledTimes(1)
    })

    it('propagates dirty from input node in EffectChainCompositorNode', () => {
      const ctx = createMockContext()
      const inputNode = createSurfaceRenderNode(
        'input',
        { type: 'solid' },
        { primary: 'F1', secondary: 'F3' }
      )

      const node = createEffectChainCompositorNode('effects', inputNode, [
        { id: 'blur', params: { strength: 5 } },
      ])

      // First composite
      node.composite(ctx)

      // Clear mocks
      vi.clearAllMocks()

      // Second composite - should skip
      node.composite(ctx)
      expect(ctx.renderer.applyPostEffectToTexture).not.toHaveBeenCalled()

      // Invalidate input
      inputNode.invalidate()

      // Should re-composite
      node.composite(ctx)
      expect(ctx.renderer.applyPostEffectToTexture).toHaveBeenCalledTimes(1)
    })

    it('propagates dirty through multiple levels', () => {
      const ctx = createMockContext()

      // Create a chain: surface -> effectChain -> overlay
      const surfaceNode = createSurfaceRenderNode(
        'surface',
        { type: 'solid' },
        { primary: 'F1', secondary: 'F3' }
      )
      const bgNode = createSurfaceRenderNode(
        'bg',
        { type: 'solid' },
        { primary: 'BN0', secondary: 'BN1' }
      )

      const effectNode = createEffectChainCompositorNode('effect', surfaceNode, [
        { id: 'blur', params: { strength: 3 } },
      ])

      const overlayNode = createOverlayCompositorNode('overlay', [bgNode, effectNode])

      // First render all
      overlayNode.composite(ctx)

      // Clear mocks
      vi.clearAllMocks()

      // Second composite - should skip
      overlayNode.composite(ctx)
      expect(ctx.renderer.renderToTexture).not.toHaveBeenCalled()

      // Invalidate the deepest node (surfaceNode)
      surfaceNode.invalidate()

      // Should propagate through the chain
      overlayNode.composite(ctx)
      // Surface should re-render
      expect(ctx.renderer.renderToTexture).toHaveBeenCalled()
    })
  })

  describe('MaskRenderNode caching', () => {
    it('skips render when not dirty', () => {
      const ctx = createMockContext()
      const node = createMaskRenderNode(
        'cached-mask',
        { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3 }
      )

      node.render(ctx)
      expect(ctx.renderer.renderToTexture).toHaveBeenCalledTimes(1)

      node.render(ctx)
      expect(ctx.renderer.renderToTexture).toHaveBeenCalledTimes(1)
    })

    it('re-renders after invalidation', () => {
      const ctx = createMockContext()
      const node = createMaskRenderNode(
        'invalidated-mask',
        { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3 }
      )

      node.render(ctx)
      node.invalidate()
      node.render(ctx)

      expect(ctx.renderer.renderToTexture).toHaveBeenCalledTimes(2)
    })
  })

  describe('EffectRenderNode caching', () => {
    it('skips render when not dirty and input is clean', () => {
      const ctx = createMockContext()
      const inputNode = createSurfaceRenderNode(
        'input',
        { type: 'solid' },
        { primary: 'F1', secondary: 'F3' }
      )
      const effectNode = createEffectRenderNode(
        'effect',
        inputNode,
        'blur',
        { strength: 5 }
      )

      effectNode.render(ctx)
      vi.clearAllMocks()

      effectNode.render(ctx)
      expect(ctx.renderer.applyPostEffectToTexture).not.toHaveBeenCalled()
    })

    it('re-renders when input is invalidated', () => {
      const ctx = createMockContext()
      const inputNode = createSurfaceRenderNode(
        'input',
        { type: 'solid' },
        { primary: 'F1', secondary: 'F3' }
      )
      const effectNode = createEffectRenderNode(
        'effect',
        inputNode,
        'blur',
        { strength: 5 }
      )

      effectNode.render(ctx)
      vi.clearAllMocks()

      inputNode.invalidate()
      effectNode.render(ctx)
      expect(ctx.renderer.applyPostEffectToTexture).toHaveBeenCalledTimes(1)
    })
  })
})

// ============================================================
// CanvasOutputNode Tests
// ============================================================

describe('CanvasOutputNode', () => {
  function createMockRenderNode(id: string): RenderNode {
    return {
      id,
      type: 'render',
      render: () => ({
        id: `${id}-tex`,
        width: 1280,
        height: 720,
        _gpuTexture: mockGpuTexture,
        _textureIndex: 0,
      }),
    }
  }

  it('creates a node with correct properties', () => {
    const inputNode = createMockRenderNode('input')

    const node = createCanvasOutputNode('output', inputNode)

    expect(node.id).toBe('output')
    expect(node.type).toBe('output')
    expect(node.input).toBe(inputNode)
  })

  it('outputs texture to canvas', () => {
    const ctx = createMockContext()
    const inputNode = createMockRenderNode('input')

    const node = createCanvasOutputNode('output', inputNode)
    node.output(ctx)

    expect(ctx.renderer.compositeToCanvas).toHaveBeenCalled()
  })

  it('releases texture after output', () => {
    const ctx = createMockContext()
    const releaseSpy = vi.spyOn(ctx.texturePool, 'release')
    const inputNode = createMockRenderNode('input')

    const node = createCanvasOutputNode('output', inputNode)
    node.output(ctx)

    expect(releaseSpy).toHaveBeenCalled()
  })

  it('works with CompositorNode input', () => {
    const ctx = createMockContext()
    const inputNode = createMockRenderNode('input')
    const compositorNode: CompositorNode = {
      id: 'compositor',
      type: 'compositor',
      inputs: [inputNode],
      composite: () => ({
        id: 'compositor-tex',
        width: 1280,
        height: 720,
        _gpuTexture: mockGpuTexture,
        _textureIndex: 0,
      }),
    }

    const node = createCanvasOutputNode('output', compositorNode)
    node.output(ctx)

    expect(ctx.renderer.compositeToCanvas).toHaveBeenCalled()
  })
})
