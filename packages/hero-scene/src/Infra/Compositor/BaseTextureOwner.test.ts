/**
 * BaseTextureOwner Tests
 *
 * Tests for the TextureOwner base class implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseTextureOwner } from './BaseTextureOwner'
import type { Viewport } from '@practice/texture'

// ============================================================
// Test Implementation
// ============================================================

/**
 * Concrete implementation for testing.
 */
class TestTextureOwner extends BaseTextureOwner {
  // Expose protected members for testing
  get testIsDirty(): boolean {
    return this._isDirty
  }

  set testIsDirty(value: boolean) {
    this._isDirty = value
  }

  get testLastViewport(): Viewport | null {
    return this._lastViewport
  }
}

// ============================================================
// Mock Data
// ============================================================

const createMockDevice = () => {
  const mockTexture = {
    width: 0,
    height: 0,
    destroy: vi.fn(),
  } as unknown as GPUTexture

  return {
    createTexture: vi.fn((descriptor: GPUTextureDescriptor) => {
      const texture = { ...mockTexture }
      texture.width = descriptor.size[0] as number
      texture.height = descriptor.size[1] as number
      return texture
    }),
  } as unknown as GPUDevice
}

// ============================================================
// Tests
// ============================================================

describe('BaseTextureOwner', () => {
  let owner: TestTextureOwner
  let mockDevice: GPUDevice

  beforeEach(() => {
    owner = new TestTextureOwner()
    mockDevice = createMockDevice()
  })

  describe('initial state', () => {
    it('has null outputTexture initially', () => {
      expect(owner.outputTexture).toBeNull()
    })

    it('is dirty initially', () => {
      expect(owner.isDirty).toBe(true)
    })
  })

  describe('ensureTexture', () => {
    it('creates texture on first call', () => {
      const viewport: Viewport = { width: 1280, height: 720 }
      const texture = owner.ensureTexture(mockDevice, viewport)

      expect(texture).toBeDefined()
      expect(mockDevice.createTexture).toHaveBeenCalledTimes(1)
      expect(owner.outputTexture).toBe(texture)
    })

    it('reuses texture when viewport unchanged', () => {
      const viewport: Viewport = { width: 1280, height: 720 }

      const texture1 = owner.ensureTexture(mockDevice, viewport)
      const texture2 = owner.ensureTexture(mockDevice, viewport)

      expect(texture1).toBe(texture2)
      expect(mockDevice.createTexture).toHaveBeenCalledTimes(1)
    })

    it('creates new texture when viewport size changes', () => {
      const viewport1: Viewport = { width: 1280, height: 720 }
      const viewport2: Viewport = { width: 1920, height: 1080 }

      const texture1 = owner.ensureTexture(mockDevice, viewport1)
      const texture2 = owner.ensureTexture(mockDevice, viewport2)

      expect(texture1).not.toBe(texture2)
      expect(mockDevice.createTexture).toHaveBeenCalledTimes(2)
      expect(texture1.destroy).toHaveBeenCalled()
    })

    it('sets dirty flag when texture is recreated', () => {
      const viewport1: Viewport = { width: 1280, height: 720 }
      const viewport2: Viewport = { width: 1920, height: 1080 }

      owner.ensureTexture(mockDevice, viewport1)
      owner.testIsDirty = false // Simulate render completion

      owner.ensureTexture(mockDevice, viewport2)
      expect(owner.isDirty).toBe(true)
    })

    it('stores last viewport', () => {
      const viewport: Viewport = { width: 1280, height: 720 }
      owner.ensureTexture(mockDevice, viewport)

      expect(owner.testLastViewport).toEqual(viewport)
    })
  })

  describe('invalidate', () => {
    it('sets dirty flag to true', () => {
      owner.testIsDirty = false
      owner.invalidate()
      expect(owner.isDirty).toBe(true)
    })
  })

  describe('dispose', () => {
    it('destroys the texture', () => {
      const viewport: Viewport = { width: 1280, height: 720 }
      const texture = owner.ensureTexture(mockDevice, viewport)

      owner.dispose()

      expect(texture.destroy).toHaveBeenCalled()
      expect(owner.outputTexture).toBeNull()
    })

    it('resets dirty flag', () => {
      const viewport: Viewport = { width: 1280, height: 720 }
      owner.ensureTexture(mockDevice, viewport)
      owner.testIsDirty = false

      owner.dispose()

      expect(owner.isDirty).toBe(true)
    })

    it('clears last viewport', () => {
      const viewport: Viewport = { width: 1280, height: 720 }
      owner.ensureTexture(mockDevice, viewport)

      owner.dispose()

      expect(owner.testLastViewport).toBeNull()
    })

    it('handles dispose when no texture exists', () => {
      // Should not throw
      expect(() => owner.dispose()).not.toThrow()
    })
  })

  describe('custom format', () => {
    it('accepts custom texture format via ensureTexture', () => {
      const customOwner = new TestTextureOwner()
      const viewport: Viewport = { width: 100, height: 100 }

      // Pass format as third argument to ensureTexture
      customOwner.ensureTexture(mockDevice, viewport, 'rgba16float')

      expect(mockDevice.createTexture).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'rgba16float',
        })
      )
    })
  })
})
