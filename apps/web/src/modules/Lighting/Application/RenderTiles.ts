/**
 * RenderTiles UseCase
 *
 * Controls tile-based rendering with priority:
 * 1. Visible tiles (immediate render)
 * 2. Adjacent tiles (high priority idle render)
 * 3. Other tiles (low priority idle render)
 */

import type { Tile, TileGrid } from '../Domain/ValueObject'
import { $Tile, $TileGrid } from '../Domain/ValueObject'
import type { OrthographicCamera } from '../Domain/ValueObject'
import type { Scene } from '../Infra/WebGL/RayTracingRenderer'

// Render priority levels
export type RenderPriority = 'immediate' | 'high' | 'low'

// Tile render request
export type TileRenderRequest = {
  tile: Tile
  priority: RenderPriority
}

// Port interface for tile rendering infrastructure
export interface TileRenderPort {
  renderTile(tile: Tile, scene: Scene, camera: OrthographicCamera): HTMLCanvasElement
  renderAllTiles(grid: TileGrid, scene: Scene, camera: OrthographicCamera): void
  getCachedCanvas(tileId: string): HTMLCanvasElement | null
  invalidateAll(): void
}

// Port interface for tile composition
export interface TileCompositePort {
  setSize(width: number, height: number): void
  clear(): void
  compositeTile(tile: Tile, canvas: HTMLCanvasElement): void
}

// Options for the use case
export interface RenderTilesOptions {
  tileHeight?: number
  enableIdleRendering?: boolean
}

// State managed by the use case
export type RenderTilesState = {
  grid: TileGrid
  scene: Scene | null
  camera: OrthographicCamera | null
  viewport: { scrollY: number; height: number }
  viewportWidth: number
  viewportHeight: number
  idleCallbackId: number | null
  rafId: number | null
  pendingTiles: Set<string>
  renderVersion: number // Incremented on each updateScene to cancel stale renders
}

export class RenderTilesUseCase {
  private state: RenderTilesState
  private tileRenderer: TileRenderPort
  private compositor: TileCompositePort
  private options: Required<RenderTilesOptions>

  constructor(
    tileRenderer: TileRenderPort,
    compositor: TileCompositePort,
    options: RenderTilesOptions = {}
  ) {
    this.tileRenderer = tileRenderer
    this.compositor = compositor
    this.options = {
      tileHeight: options.tileHeight ?? 200,
      enableIdleRendering: options.enableIdleRendering ?? true,
    }

    this.state = {
      grid: $TileGrid.create(0, 0, this.options.tileHeight),
      scene: null,
      camera: null,
      viewport: { scrollY: 0, height: 0 },
      viewportWidth: 0,
      viewportHeight: 0,
      idleCallbackId: null,
      rafId: null,
      pendingTiles: new Set(),
      renderVersion: 0,
    }
  }

  /**
   * Update the scene and trigger re-render
   * Called when scene content changes (e.g., light settings)
   *
   * @param scene - The scene to render
   * @param camera - The camera for rendering
   * @param contentWidth - Full content width (for tile grid)
   * @param contentHeight - Full content height (for tile grid)
   * @param viewportWidth - Visible viewport width (for display canvas)
   * @param viewportHeight - Visible viewport height (for display canvas)
   * @param scrollY - Current scroll position
   */
  updateScene(
    scene: Scene,
    camera: OrthographicCamera,
    contentWidth: number,
    contentHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    scrollY: number
  ): void {
    // Invalidate all cached tiles when scene changes
    this.tileRenderer.invalidateAll()

    // Recreate grid if content size changed
    if (
      this.state.grid.canvasWidth !== contentWidth ||
      this.state.grid.canvasHeight !== contentHeight
    ) {
      this.state.grid = $TileGrid.create(contentWidth, contentHeight, this.options.tileHeight)
    } else {
      // Just mark all tiles as dirty
      this.state.grid = $TileGrid.markAllDirty(this.state.grid)
    }

    this.state.scene = scene
    this.state.camera = camera
    this.state.viewport = { scrollY, height: viewportHeight }
    this.state.viewportWidth = viewportWidth
    this.state.viewportHeight = viewportHeight

    // Cancel any pending render operations
    this.cancelPendingRenders()

    // Increment version to invalidate any in-flight renders
    this.state.renderVersion++

    // Clear pending tiles - we'll render all at once
    this.state.pendingTiles.clear()

    // Render all tiles in one WebGL pass (much faster than per-tile rendering)
    this.tileRenderer.renderAllTiles(this.state.grid, scene, camera)

    // Mark all tiles as clean
    for (const tile of this.state.grid.tiles) {
      this.state.grid = $TileGrid.updateTile(this.state.grid, tile.id, $Tile.markClean)
    }

    // Composite visible tiles to display canvas
    this.compositeVisible()
  }

  /**
   * Cancel any pending render operations
   */
  private cancelPendingRenders(): void {
    if (this.state.rafId !== null) {
      cancelAnimationFrame(this.state.rafId)
      this.state.rafId = null
    }
    if (this.state.idleCallbackId !== null) {
      cancelIdleCallback(this.state.idleCallbackId)
      this.state.idleCallbackId = null
    }
  }

  /**
   * Update viewport (scroll position changed)
   * Re-composites without re-rendering if tiles are cached
   */
  updateViewport(scrollY: number, viewportHeight: number): void {
    this.state.viewport = { scrollY, height: viewportHeight }
    this.state.viewportHeight = viewportHeight

    // Composite visible tiles to display canvas at viewport position
    this.compositeVisible()
  }

  /**
   * Composite visible tiles to display canvas at current scroll position
   * Canvas is viewport-sized, shows content at scrollY offset
   */
  private compositeVisible(): void {
    const { scrollY } = this.state.viewport
    const { viewportWidth, viewportHeight } = this.state

    // Set display canvas to viewport size
    this.compositor.setSize(viewportWidth, viewportHeight)
    this.compositor.clear()

    // Get tiles that intersect the visible area
    const visibleTiles = $TileGrid.getVisibleTiles(this.state.grid, this.state.viewport)

    // Composite each visible tile, offset by scroll position
    for (const tile of visibleTiles) {
      const canvas = this.tileRenderer.getCachedCanvas(tile.id)
      if (canvas) {
        // Create offset tile for compositing
        // Tile's y position needs to be adjusted by scrollY
        const offsetTile: Tile = {
          ...tile,
          y: tile.y - scrollY,
        }
        this.compositor.compositeTile(offsetTile, canvas)
      }
    }
  }

  /**
   * Force render all tiles immediately
   */
  forceRenderAll(): void {
    if (!this.state.scene || !this.state.camera) return

    // Render all tiles in one pass
    this.tileRenderer.renderAllTiles(this.state.grid, this.state.scene, this.state.camera)
    this.state.pendingTiles.clear()
    this.compositeVisible()
  }

  /**
   * Get current state for debugging
   */
  getDebugInfo(): {
    totalTiles: number
    pendingTiles: number
    cleanTiles: number
    gridSize: { width: number; height: number }
  } {
    return {
      totalTiles: this.state.grid.tiles.length,
      pendingTiles: this.state.pendingTiles.size,
      cleanTiles: this.state.grid.tiles.filter((t) => t.state === 'clean').length,
      gridSize: {
        width: this.state.grid.canvasWidth,
        height: this.state.grid.canvasHeight,
      },
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.cancelPendingRenders()
  }
}
