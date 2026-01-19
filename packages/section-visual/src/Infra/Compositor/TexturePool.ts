/**
 * TexturePool
 *
 * Manages offscreen texture allocation for compositor node rendering.
 * Uses a multi-buffer approach to avoid texture conflicts when
 * combining multiple input textures into a single output.
 */

import type { TextureHandle, TexturePool } from '../../Domain/Compositor'

// ============================================================
// Multi-Buffer TexturePool
// ============================================================

/** Number of texture slots in the pool */
const POOL_SIZE = 6

/**
 * A TexturePool implementation using multiple offscreen textures
 * to avoid conflicts when combining multiple inputs.
 *
 * The multi-buffer approach is necessary because complex pipelines
 * (e.g., background + masked layer with effects) may need to hold
 * multiple textures simultaneously:
 * - Background texture (held by OverlayCompositorNode)
 * - Layer surface texture
 * - Layer mask texture
 * - Masked layer output
 * - Effect chain intermediates
 *
 * With 6 slots, typical HeroScene pipelines can execute without
 * texture conflicts.
 *
 * @example
 * ```typescript
 * const pool = new MultiBufferTexturePool(1280, 720)
 *
 * const texture1 = pool.acquire()  // Gets texture 0
 * const texture2 = pool.acquire()  // Gets texture 1
 * const texture3 = pool.acquire()  // Gets texture 2
 *
 * pool.release(texture1)  // Returns texture 0 to pool
 * ```
 */
export class MultiBufferTexturePool implements TexturePool {
  private readonly width: number
  private readonly height: number
  private nextIndex: number = 0
  private handleCounter = 0

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  /**
   * Acquire a texture handle for rendering.
   * Cycles through indices 0 to POOL_SIZE-1.
   */
  acquire(): TextureHandle {
    const index = this.nextIndex
    this.nextIndex = (this.nextIndex + 1) % POOL_SIZE
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
    // In the multi-buffer model, we don't need to do anything
    // The texture slots are managed by index cycling
  }

  /**
   * Get an available texture index that differs from the given index.
   * Returns the next index in the cycle.
   */
  getNextIndex(currentIndex: number): number {
    return (currentIndex + 1) % POOL_SIZE
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

// Legacy alias for backwards compatibility
export { MultiBufferTexturePool as TripleBufferTexturePool }

/**
 * Factory function to create a MultiBufferTexturePool.
 */
export function createTexturePool(
  width: number,
  height: number
): TexturePool {
  return new MultiBufferTexturePool(width, height)
}
