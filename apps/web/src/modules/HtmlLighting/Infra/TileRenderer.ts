/**
 * TileRenderer - Renders tiles using a single shared WebGL context
 *
 * Uses one large canvas for rendering and extracts tile regions as ImageData
 * This is much faster than creating WebGL context per tile
 */

import type { Tile, TileGrid } from '../Domain/ValueObject'
import type { OrthographicCamera } from '@practice/lighting'
import { $Vector3 } from '@practice/vector'
import { RayTracingRenderer, type Scene } from '@practice/lighting/Infra/WebGL/RayTracingRenderer'

export type TileCache = {
  readonly imageData: ImageData
}

export class TileRenderer {
  private renderer: RayTracingRenderer | null = null
  private renderCanvas: HTMLCanvasElement | null = null
  private tileCache: Map<string, TileCache> = new Map()

  /**
   * Initialize or resize the render canvas
   */
  private ensureRenderCanvas(width: number, height: number): void {
    if (!this.renderCanvas) {
      this.renderCanvas = document.createElement('canvas')
      this.renderCanvas.width = width
      this.renderCanvas.height = height
      this.renderer = new RayTracingRenderer(this.renderCanvas)
    } else if (this.renderCanvas.width !== width || this.renderCanvas.height !== height) {
      // Resize canvas
      this.renderCanvas.width = width
      this.renderCanvas.height = height
      // Recreate renderer (WebGL context needs to be reset)
      this.renderer?.dispose()
      this.renderer = new RayTracingRenderer(this.renderCanvas)
    }
  }

  /**
   * Render the entire scene once and cache all tiles
   * This is the key optimization - one WebGL render for all tiles
   */
  renderAllTiles(
    grid: TileGrid,
    scene: Scene,
    camera: OrthographicCamera
  ): void {
    const { canvasWidth: rawWidth, canvasHeight: rawHeight, tiles } = grid

    // Ensure integer dimensions
    const canvasWidth = Math.floor(rawWidth)
    const canvasHeight = Math.floor(rawHeight)

    // Skip if canvas size is invalid
    if (canvasWidth <= 0 || canvasHeight <= 0) return

    // Ensure render canvas is properly sized
    this.ensureRenderCanvas(canvasWidth, canvasHeight)

    if (!this.renderer || !this.renderCanvas) return

    // Render entire scene in one pass
    this.renderer.render(scene, camera)

    // Get the full rendered image
    const gl = this.renderCanvas.getContext('webgl', { preserveDrawingBuffer: true })
    if (!gl) return

    // Read pixels from WebGL
    const fullPixels = new Uint8Array(canvasWidth * canvasHeight * 4)
    gl.readPixels(0, 0, canvasWidth, canvasHeight, gl.RGBA, gl.UNSIGNED_BYTE, fullPixels)

    // WebGL pixels are bottom-up, need to flip
    const flippedPixels = new Uint8Array(canvasWidth * canvasHeight * 4)
    for (let y = 0; y < canvasHeight; y++) {
      const srcRow = (canvasHeight - 1 - y) * canvasWidth * 4
      const dstRow = y * canvasWidth * 4
      flippedPixels.set(fullPixels.subarray(srcRow, srcRow + canvasWidth * 4), dstRow)
    }

    // Extract each tile as ImageData
    for (const tile of tiles) {
      // Ensure integer dimensions for tile
      const tileW = Math.floor(tile.width)
      const tileH = Math.floor(tile.height)
      const tileX = Math.floor(tile.x)
      const tileY = Math.floor(tile.y)

      // Skip invalid tiles
      if (tileW <= 0 || tileH <= 0) continue

      const tilePixels = new Uint8ClampedArray(tileW * tileH * 4)

      // Copy tile region from full image
      for (let y = 0; y < tileH; y++) {
        const srcY = tileY + y
        if (srcY >= canvasHeight) continue

        const srcOffset = (srcY * canvasWidth + tileX) * 4
        const dstOffset = y * tileW * 4
        const copyLength = Math.min(tileW, canvasWidth - tileX) * 4

        if (srcOffset >= 0 && srcOffset + copyLength <= flippedPixels.length) {
          tilePixels.set(
            flippedPixels.subarray(srcOffset, srcOffset + copyLength),
            dstOffset
          )
        }
      }

      const imageData = new ImageData(tilePixels, tileW, tileH)
      this.tileCache.set(tile.id, { imageData })
    }
  }

  /**
   * Render a single tile (for incremental updates)
   * Falls back to full render if not efficient
   */
  renderTile(tile: Tile, scene: Scene, camera: OrthographicCamera): HTMLCanvasElement {
    // For single tile, we still need to render the full scene
    // but we can use viewport/scissor optimization in future
    // For now, create a small canvas for this tile

    const canvas = document.createElement('canvas')
    canvas.width = tile.width
    canvas.height = tile.height

    const tileCamera = this.createTileCamera(tile, camera)
    const renderer = new RayTracingRenderer(canvas)
    renderer.render(scene, tileCamera)

    // Cache the result
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, tile.width, tile.height)
      this.tileCache.set(tile.id, { imageData })
    }

    renderer.dispose()
    return canvas
  }

  /**
   * Create a camera adjusted for rendering a specific tile
   */
  private createTileCamera(tile: Tile, fullCamera: OrthographicCamera): OrthographicCamera {
    const fullCenterX = fullCamera.width / 2
    const fullCenterY = fullCamera.height / 2
    const tileCenterX = tile.x + tile.width / 2
    const tileCenterY = tile.y + tile.height / 2

    const offsetX = tileCenterX - fullCenterX
    const offsetY = tileCenterY - fullCenterY

    const forward = $Vector3.normalize($Vector3.sub(fullCamera.lookAt, fullCamera.position))
    const right = $Vector3.normalize($Vector3.cross(fullCamera.up, forward))
    const up = $Vector3.cross(forward, right)

    const newPosition = {
      x: fullCamera.position.x + right.x * offsetX - up.x * offsetY,
      y: fullCamera.position.y + right.y * offsetX - up.y * offsetY,
      z: fullCamera.position.z + right.z * offsetX - up.z * offsetY,
    }

    const newLookAt = {
      x: fullCamera.lookAt.x + right.x * offsetX - up.x * offsetY,
      y: fullCamera.lookAt.y + right.y * offsetX - up.y * offsetY,
      z: fullCamera.lookAt.z + right.z * offsetX - up.z * offsetY,
    }

    return {
      type: 'orthographic',
      position: newPosition,
      lookAt: newLookAt,
      up: fullCamera.up,
      width: tile.width,
      height: tile.height,
    }
  }

  /**
   * Get cached ImageData for a tile
   */
  getCachedImageData(tileId: string): ImageData | null {
    return this.tileCache.get(tileId)?.imageData ?? null
  }

  /**
   * Get cached canvas for a tile (creates temporary canvas from ImageData)
   */
  getCachedCanvas(tileId: string): HTMLCanvasElement | null {
    const cached = this.tileCache.get(tileId)
    if (!cached) return null

    // Create canvas from ImageData
    const canvas = document.createElement('canvas')
    canvas.width = cached.imageData.width
    canvas.height = cached.imageData.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.putImageData(cached.imageData, 0, 0)
    }
    return canvas
  }

  /**
   * Check if a tile is cached
   */
  hasCachedTile(tileId: string): boolean {
    return this.tileCache.has(tileId)
  }

  /**
   * Invalidate a specific tile
   */
  invalidateTile(tileId: string): void {
    this.tileCache.delete(tileId)
  }

  /**
   * Invalidate all tiles
   */
  invalidateAll(): void {
    this.tileCache.clear()
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.invalidateAll()
    this.renderer?.dispose()
    this.renderer = null
    this.renderCanvas = null
  }
}
