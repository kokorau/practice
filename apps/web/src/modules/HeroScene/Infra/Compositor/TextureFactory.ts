/**
 * TextureFactory - Unified texture creation utilities
 *
 * Provides standardized functions for creating GPU textures
 * with consistent settings across all compositor nodes.
 *
 * @see https://github.com/anthropics/practice-beta/issues/463
 */

import type { Viewport } from '@practice/texture'

/**
 * Default texture format used throughout the compositor.
 */
export const DEFAULT_TEXTURE_FORMAT: GPUTextureFormat = 'rgba8unorm'

/**
 * Standard texture usage flags for render targets.
 * - TEXTURE_BINDING (0x04): Can be sampled in shaders
 * - RENDER_ATTACHMENT (0x10): Can be used as a render target
 * - COPY_SRC (0x01): Can be copied from (for debugging/export)
 */
export const RENDER_TEXTURE_USAGE = 0x04 | 0x10 | 0x01 // 21

/**
 * Create a texture suitable for rendering output.
 *
 * The texture is configured with:
 * - TEXTURE_BINDING: Can be sampled in shaders
 * - RENDER_ATTACHMENT: Can be used as a render target
 * - COPY_SRC: Can be copied from (for debugging/export)
 *
 * @param device - WebGPU device
 * @param viewport - Target dimensions
 * @param format - Texture format (defaults to rgba8unorm)
 * @returns A new GPUTexture
 */
export function createRenderTexture(
  device: GPUDevice,
  viewport: Viewport,
  format: GPUTextureFormat = DEFAULT_TEXTURE_FORMAT
): GPUTexture {
  return device.createTexture({
    size: [viewport.width, viewport.height],
    format,
    usage: RENDER_TEXTURE_USAGE,
  })
}

/**
 * Check if a texture needs to be recreated due to size change.
 *
 * @param texture - Existing texture (may be null)
 * @param viewport - Target dimensions
 * @returns True if a new texture is needed
 */
export function needsTextureResize(
  texture: GPUTexture | null,
  viewport: Viewport
): boolean {
  if (!texture) {
    return true
  }
  return texture.width !== viewport.width || texture.height !== viewport.height
}
