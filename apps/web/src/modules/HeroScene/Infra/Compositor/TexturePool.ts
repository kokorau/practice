/**
 * TexturePool
 *
 * Manages offscreen texture allocation for compositor node rendering.
 * Uses a triple-buffer approach to avoid texture conflicts when
 * combining multiple input textures into a single output.
 */

import type { TextureHandle, TexturePool } from '../../Domain/Compositor'

// ============================================================
// Triple-Buffer TexturePool
// ============================================================

/**
 * A TexturePool implementation using three offscreen textures
 * to avoid conflicts when combining multiple inputs.
 *
 * The triple-buffer approach is necessary because operations like
 * MaskCompositorNode need to read from two textures (surface + mask)
 * while writing to a third. With only two textures, one input would
 * be overwritten before it could be read.
 *
 * @example
 * ```typescript
 * const pool = new TripleBufferTexturePool(1280, 720)
 *
 * const texture1 = pool.acquire()  // Gets texture 0
 * const texture2 = pool.acquire()  // Gets texture 1
 * const texture3 = pool.acquire()  // Gets texture 2
 *
 * pool.release(texture1)  // Returns texture 0 to pool
 * ```
 */
export class TripleBufferTexturePool implements TexturePool {
  private readonly width: number
  private readonly height: number
  private nextIndex: 0 | 1 | 2 = 0
  private handleCounter = 0

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  /**
   * Acquire a texture handle for rendering.
   * Cycles through indices 0, 1, 2.
   */
  acquire(): TextureHandle {
    const index = this.nextIndex
    this.nextIndex = ((this.nextIndex + 1) % 3) as 0 | 1 | 2
    this.handleCounter++

    return {
      id: `texture-${this.handleCounter}`,
      width: this.width,
      height: this.height,
      // Note: The actual GPUTexture is created by the renderer
      // This is a placeholder that will be replaced after rendering
      _gpuTexture: null as unknown as GPUTexture,
      _textureIndex: index,
    }
  }

  /**
   * Release a texture handle back to the pool.
   * Currently a no-op since we cycle through fixed indices.
   */
  release(_handle: TextureHandle): void {
    // In the triple-buffer model, we don't need to do anything
    // The texture slots are managed by index cycling
  }

  /**
   * Get an available texture index that differs from the given index.
   * Returns the next index in the cycle.
   */
  getNextIndex(currentIndex: 0 | 1 | 2): 0 | 1 | 2 {
    return ((currentIndex + 1) % 3) as 0 | 1 | 2
  }

  /**
   * Reset the pool state.
   * Useful for starting a new render pass.
   */
  reset(): void {
    this.nextIndex = 0
    this.handleCounter = 0
  }
}

/**
 * Factory function to create a TripleBufferTexturePool.
 */
export function createTexturePool(
  width: number,
  height: number
): TexturePool {
  return new TripleBufferTexturePool(width, height)
}
