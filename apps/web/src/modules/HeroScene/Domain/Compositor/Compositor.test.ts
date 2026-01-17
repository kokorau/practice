/**
 * Compositor Node System - Type Tests
 *
 * Tests for type guards and utility functions.
 */

import { describe, it, expect } from 'vitest'
import {
  isRenderNode,
  isCompositorNode,
  isOutputNode,
  isTextureOwner,
  getTextureFromNode,
  DEFAULT_BLEND_MODE,
  type RenderNode,
  type CompositorNode,
  type OutputNode,
  type NodeContext,
  type TextureHandle,
  type TextureOwner,
} from './index'

// ============================================================
// Mock Data
// ============================================================

const mockTextureHandle: TextureHandle = {
  id: 'test-texture',
  width: 1280,
  height: 720,
  _gpuTexture: {} as GPUTexture,
  _textureIndex: 0,
}

const mockNodeContext: NodeContext = {
  renderer: {
    getViewport: () => ({ width: 1280, height: 720 }),
    getDevice: () => ({} as GPUDevice),
    renderToOffscreen: () => ({} as GPUTexture),
    applyPostEffectToOffscreen: () => ({} as GPUTexture),
    applyDualTextureEffectToOffscreen: () => ({} as GPUTexture),
    compositeToCanvas: () => {},
  },
  viewport: { width: 1280, height: 720 },
  palette: {} as never,
  scale: 1,
  texturePool: {
    acquire: () => mockTextureHandle,
    release: () => {},
    getNextIndex: (current) => (current === 0 ? 1 : 0),
  },
  device: {} as GPUDevice,
  format: 'rgba8unorm',
}

const mockRenderNode: RenderNode = {
  id: 'render-node',
  type: 'render',
  render: () => mockTextureHandle,
}

const mockCompositorNode: CompositorNode = {
  id: 'compositor-node',
  type: 'compositor',
  inputs: [mockRenderNode],
  composite: () => mockTextureHandle,
}

const mockOutputNode: OutputNode = {
  id: 'output-node',
  type: 'output',
  input: mockCompositorNode,
  output: () => {},
}

// ============================================================
// Tests
// ============================================================

describe('Compositor Type Guards', () => {
  describe('isRenderNode', () => {
    it('returns true for RenderNode', () => {
      expect(isRenderNode(mockRenderNode)).toBe(true)
    })

    it('returns false for CompositorNode', () => {
      expect(isRenderNode(mockCompositorNode)).toBe(false)
    })

    it('returns false for OutputNode', () => {
      expect(isRenderNode(mockOutputNode)).toBe(false)
    })
  })

  describe('isCompositorNode', () => {
    it('returns true for CompositorNode', () => {
      expect(isCompositorNode(mockCompositorNode)).toBe(true)
    })

    it('returns false for RenderNode', () => {
      expect(isCompositorNode(mockRenderNode)).toBe(false)
    })

    it('returns false for OutputNode', () => {
      expect(isCompositorNode(mockOutputNode)).toBe(false)
    })
  })

  describe('isOutputNode', () => {
    it('returns true for OutputNode', () => {
      expect(isOutputNode(mockOutputNode)).toBe(true)
    })

    it('returns false for RenderNode', () => {
      expect(isOutputNode(mockRenderNode)).toBe(false)
    })

    it('returns false for CompositorNode', () => {
      expect(isOutputNode(mockCompositorNode)).toBe(false)
    })
  })
})

describe('getTextureFromNode', () => {
  it('calls render() for RenderNode', () => {
    const result = getTextureFromNode(mockRenderNode, mockNodeContext)
    expect(result).toBe(mockTextureHandle)
  })

  it('calls composite() for CompositorNode', () => {
    const result = getTextureFromNode(mockCompositorNode, mockNodeContext)
    expect(result).toBe(mockTextureHandle)
  })
})

describe('DEFAULT_BLEND_MODE', () => {
  it('is "normal"', () => {
    expect(DEFAULT_BLEND_MODE).toBe('normal')
  })
})

describe('isTextureOwner', () => {
  const mockTextureOwner: TextureOwner = {
    outputTexture: null,
    isDirty: true,
    ensureTexture: () => ({} as GPUTexture),
    invalidate: () => {},
    dispose: () => {},
  }

  it('returns true for valid TextureOwner', () => {
    expect(isTextureOwner(mockTextureOwner)).toBe(true)
  })

  it('returns true for TextureOwner with outputTexture', () => {
    const owner = { ...mockTextureOwner, outputTexture: {} as GPUTexture }
    expect(isTextureOwner(owner)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isTextureOwner(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isTextureOwner(undefined)).toBe(false)
  })

  it('returns false for non-object', () => {
    expect(isTextureOwner('string')).toBe(false)
    expect(isTextureOwner(123)).toBe(false)
  })

  it('returns false for object missing required methods', () => {
    expect(isTextureOwner({ outputTexture: null, isDirty: true })).toBe(false)
    expect(
      isTextureOwner({
        outputTexture: null,
        isDirty: true,
        ensureTexture: () => {},
        // missing invalidate and dispose
      })
    ).toBe(false)
  })

  it('returns false for RenderNode (not TextureOwner)', () => {
    expect(isTextureOwner(mockRenderNode)).toBe(false)
  })
})
