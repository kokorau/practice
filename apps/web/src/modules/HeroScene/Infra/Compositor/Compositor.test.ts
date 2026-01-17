/**
 * Compositor Infra Layer Tests
 *
 * Tests for RenderNode implementations and TexturePool.
 */

import { describe, it, expect, vi } from 'vitest'
import { PingPongTexturePool, createTexturePool } from './TexturePool'
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

const mockGpuTexture = {} as GPUTexture

function createMockContext(): NodeContext {
  const texturePool = new PingPongTexturePool(1280, 720)

  return {
    renderer: {
      getViewport: vi.fn(() => ({ width: 1280, height: 720 })),
      renderToOffscreen: vi.fn(() => mockGpuTexture),
      applyPostEffectToOffscreen: vi.fn(() => mockGpuTexture),
      applyDualTextureEffectToOffscreen: vi.fn(() => mockGpuTexture),
      compositeToCanvas: vi.fn(),
    },
    viewport: { width: 1280, height: 720 },
    palette: createMockPalette(),
    scale: 1,
    texturePool,
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

describe('PingPongTexturePool', () => {
  it('alternates between texture indices 0 and 1', () => {
    const pool = new PingPongTexturePool(1280, 720)

    const handle1 = pool.acquire()
    expect(handle1._textureIndex).toBe(0)

    const handle2 = pool.acquire()
    expect(handle2._textureIndex).toBe(1)

    const handle3 = pool.acquire()
    expect(handle3._textureIndex).toBe(0)
  })

  it('assigns unique IDs to handles', () => {
    const pool = new PingPongTexturePool(1280, 720)

    const handle1 = pool.acquire()
    const handle2 = pool.acquire()

    expect(handle1.id).not.toBe(handle2.id)
  })

  it('sets correct dimensions', () => {
    const pool = new PingPongTexturePool(800, 600)

    const handle = pool.acquire()

    expect(handle.width).toBe(800)
    expect(handle.height).toBe(600)
  })

  it('getNextIndex returns opposite index', () => {
    const pool = new PingPongTexturePool(1280, 720)

    expect(pool.getNextIndex(0)).toBe(1)
    expect(pool.getNextIndex(1)).toBe(0)
  })

  it('reset() resets the pool state', () => {
    const pool = new PingPongTexturePool(1280, 720)

    pool.acquire()  // 0
    pool.acquire()  // 1
    pool.reset()

    const handle = pool.acquire()
    expect(handle._textureIndex).toBe(0)
  })
})

describe('createTexturePool', () => {
  it('creates a PingPongTexturePool', () => {
    const pool = createTexturePool(1280, 720)

    expect(pool).toBeInstanceOf(PingPongTexturePool)
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
    expect(ctx.renderer.renderToOffscreen).toHaveBeenCalled()
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
    expect(ctx.renderer.renderToOffscreen).toHaveBeenCalled()
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
    expect(ctx.renderer.renderToOffscreen).toHaveBeenCalled()
  })

  it('renders rect mask', () => {
    const ctx = createMockContext()
    const node = createMaskRenderNode(
      'rect-mask',
      { type: 'rect', centerX: 0.5, centerY: 0.5, width: 0.6, height: 0.4, cornerRadius: [0, 0, 0, 0] }
    )

    const result = node.render(ctx)

    expect(result).toBeDefined()
    expect(ctx.renderer.renderToOffscreen).toHaveBeenCalled()
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
    expect(ctx.renderer.applyPostEffectToOffscreen).toHaveBeenCalled()
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
    expect(result.id).toBe('masked-output')
    expect(ctx.renderer.applyDualTextureEffectToOffscreen).toHaveBeenCalled()
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

  it('applies effects in sequence', () => {
    const ctx = createMockContext()
    const inputNode = createMockRenderNode('input')

    const node = createEffectChainCompositorNode('effects', inputNode, [
      { id: 'blur', params: { strength: 5 } },
      { id: 'vignette', params: { shape: 'ellipse', intensity: 0.5 } },
    ])
    const result = node.composite(ctx)

    expect(result).toBeDefined()
    expect(ctx.renderer.applyPostEffectToOffscreen).toHaveBeenCalledTimes(2)
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
      '[EffectChainCompositorNode] Unknown effect type: invalidEffect'
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

  it('returns single layer directly', () => {
    const ctx = createMockContext()
    const layer1 = createMockRenderNode('layer1')

    const node = createOverlayCompositorNode('single', [layer1])
    const result = node.composite(ctx)

    expect(result).toBeDefined()
    expect(result.id).toBe('layer1-tex')
  })

  it('composites multiple layers', () => {
    const ctx = createMockContext()
    const layer1 = createMockRenderNode('layer1')
    const layer2 = createMockRenderNode('layer2')
    const layer3 = createMockRenderNode('layer3')

    const node = createOverlayCompositorNode('scene', [layer1, layer2, layer3])
    const result = node.composite(ctx)

    expect(result).toBeDefined()
    expect(result.id).toBe('scene-output')
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
