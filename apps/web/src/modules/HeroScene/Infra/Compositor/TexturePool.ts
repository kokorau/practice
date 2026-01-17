/**
 * TexturePool
 *
 * Manages offscreen texture allocation for ping-pong rendering.
 * Abstracts the WebGPU offscreen texture management.
 */

import type { TextureHandle, TexturePool } from '../../Domain/Compositor'

// ============================================================
// Simple Ping-Pong TexturePool
// ============================================================

/**
 * A simple TexturePool implementation using two offscreen textures
 * for ping-pong rendering.
 *
 * This pool manages two texture slots (0 and 1) and alternates between
 * them for sequential effect applications.
 *
 * @example
 * ```typescript
 * const pool = new PingPongTexturePool(1280, 720)
 *
 * const texture1 = pool.acquire()  // Gets texture 0
 * const texture2 = pool.acquire()  // Gets texture 1
 *
 * pool.release(texture1)  // Returns texture 0 to pool
 * ```
 */
export class PingPongTexturePool implements TexturePool {
  private readonly width: number
  private readonly height: number
  private nextIndex: 0 | 1 = 0
  private handleCounter = 0

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  /**
   * Acquire a texture handle for rendering.
   * Alternates between indices 0 and 1.
   */
  acquire(): TextureHandle {
    const index = this.nextIndex
    this.nextIndex = this.nextIndex === 0 ? 1 : 0
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
   * In the ping-pong model, this is mostly a no-op since
   * we're just alternating between two fixed indices.
   */
  release(_handle: TextureHandle): void {
    // In a simple ping-pong model, we don't need to do anything
    // The texture slots are managed by index alternation
  }

  /**
   * Get the next available texture index for ping-pong rendering.
   * Returns the index that is NOT the current one.
   */
  getNextIndex(currentIndex: 0 | 1): 0 | 1 {
    return currentIndex === 0 ? 1 : 0
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
 * Factory function to create a PingPongTexturePool.
 */
export function createTexturePool(
  width: number,
  height: number
): TexturePool {
  return new PingPongTexturePool(width, height)
}
