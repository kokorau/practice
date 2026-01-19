/**
 * TextureOwner - Node-Owned Texture Architecture
 *
 * This interface enables each node to own and manage its output texture,
 * providing several benefits:
 *
 * - Scalability: No shared pool size limits
 * - Caching: Skip re-rendering unchanged nodes
 * - Simplicity: No texture index management
 * - Parallel execution: Independent subtrees can run concurrently
 *
 * @see https://github.com/anthropics/practice-beta/issues/463
 */

import type { Viewport } from '@practice/texture'

/**
 * Interface for nodes that own and manage their output texture.
 *
 * TextureOwner provides a pattern for lazy texture allocation and
 * dirty-flag-based caching. Nodes implementing this interface are
 * responsible for creating, maintaining, and disposing their textures.
 */
export interface TextureOwner {
  /**
   * The output texture produced by this node.
   * Returns null if the texture hasn't been generated yet.
   */
  readonly outputTexture: GPUTexture | null

  /**
   * Whether this node needs to re-render.
   * True if the node's inputs have changed since the last render.
   */
  readonly isDirty: boolean

  /**
   * Ensure a texture exists with the correct dimensions and format.
   * Creates a new texture if none exists or if viewport/format changed.
   *
   * @param device - WebGPU device for texture creation
   * @param viewport - Target viewport dimensions
   * @param format - Optional texture format (uses renderer's format from context)
   * @returns The output texture (existing or newly created)
   */
  ensureTexture(device: GPUDevice, viewport: Viewport, format?: GPUTextureFormat): GPUTexture

  /**
   * Mark this node as needing re-render.
   * Called when input parameters change.
   */
  invalidate(): void

  /**
   * Release GPU resources owned by this node.
   * Should be called when the node is no longer needed.
   */
  dispose(): void
}

/**
 * Type guard to check if a value implements TextureOwner.
 */
export function isTextureOwner(value: unknown): value is TextureOwner {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    'outputTexture' in obj &&
    'isDirty' in obj &&
    typeof obj.ensureTexture === 'function' &&
    typeof obj.invalidate === 'function' &&
    typeof obj.dispose === 'function'
  )
}
