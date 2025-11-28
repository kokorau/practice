/**
 * TileRenderer - Renders individual tiles using RayTracingRenderer
 *
 * Each tile is rendered to its own offscreen canvas for caching
 */

import type { Tile } from '../Domain/ValueObject'
import type { OrthographicCamera } from '../Domain/ValueObject'
import { RayTracingRenderer, type Scene } from './WebGL/RayTracingRenderer'

export type TileCanvas = {
  readonly tileId: string
  readonly canvas: HTMLCanvasElement
  readonly renderer: RayTracingRenderer
}

export class TileRenderer {
  private tileCanvases: Map<string, TileCanvas> = new Map()

  /**
   * Create or reuse a tile canvas for the given tile
   */
  private getOrCreateTileCanvas(tile: Tile): TileCanvas {
    const existing = this.tileCanvases.get(tile.id)
    if (existing && existing.canvas.width === tile.width && existing.canvas.height === tile.height) {
      return existing
    }

    // Dispose existing if size changed
    if (existing) {
      existing.renderer.dispose()
    }

    // Create new offscreen canvas for this tile
    const canvas = document.createElement('canvas')
    canvas.width = tile.width
    canvas.height = tile.height

    const renderer = new RayTracingRenderer(canvas)

    const tileCanvas: TileCanvas = {
      tileId: tile.id,
      canvas,
      renderer,
    }

    this.tileCanvases.set(tile.id, tileCanvas)
    return tileCanvas
  }

  /**
   * Render a single tile
   *
   * @param tile - The tile to render
   * @param scene - The full scene to render
   * @param camera - The full scene camera
   * @returns The rendered canvas for this tile
   */
  renderTile(tile: Tile, scene: Scene, camera: OrthographicCamera): HTMLCanvasElement {
    const tileCanvas = this.getOrCreateTileCanvas(tile)

    // Create a camera that only shows this tile's portion
    // The camera position needs to be offset so that this tile's region
    // maps to the full tile canvas
    const tileCamera = this.createTileCamera(tile, camera)

    tileCanvas.renderer.render(scene, tileCamera)

    return tileCanvas.canvas
  }

  /**
   * Create a camera adjusted for rendering a specific tile
   */
  private createTileCamera(tile: Tile, fullCamera: OrthographicCamera): OrthographicCamera {
    // The full camera renders the entire scene
    // For a tile, we need to offset the camera position so the tile region
    // fills the entire tile canvas

    // Calculate the center of the tile in camera space
    // Full camera renders from (0,0) to (fullWidth, fullHeight)
    // Tile is at (tile.x, tile.y) with size (tile.width, tile.height)

    // Camera center offset: move camera so tile center becomes render center
    const fullCenterX = fullCamera.width / 2
    const fullCenterY = fullCamera.height / 2
    const tileCenterX = tile.x + tile.width / 2
    const tileCenterY = tile.y + tile.height / 2

    // Offset in world space (camera right is +X, camera up is -Y for screen coords)
    const offsetX = tileCenterX - fullCenterX
    const offsetY = tileCenterY - fullCenterY

    // Calculate camera basis vectors (same as in RayTracingRenderer)
    const forward = this.normalize(this.sub(fullCamera.lookAt, fullCamera.position))
    const right = this.normalize(this.cross(fullCamera.up, forward))
    const up = this.cross(forward, right)

    // New camera position = original + right * offsetX - up * offsetY
    // (negative up because screen Y is inverted)
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

  private normalize(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
    if (len === 0) return { x: 0, y: 0, z: 0 }
    return { x: v.x / len, y: v.y / len, z: v.z / len }
  }

  private cross(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    }
  }

  private sub(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
  }

  /**
   * Get cached canvas for a tile (if exists)
   */
  getCachedCanvas(tileId: string): HTMLCanvasElement | null {
    return this.tileCanvases.get(tileId)?.canvas ?? null
  }

  /**
   * Invalidate a specific tile (force re-render on next request)
   */
  invalidateTile(tileId: string): void {
    const tileCanvas = this.tileCanvases.get(tileId)
    if (tileCanvas) {
      tileCanvas.renderer.dispose()
      this.tileCanvases.delete(tileId)
    }
  }

  /**
   * Invalidate all tiles
   */
  invalidateAll(): void {
    for (const tileCanvas of this.tileCanvases.values()) {
      tileCanvas.renderer.dispose()
    }
    this.tileCanvases.clear()
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.invalidateAll()
  }
}
