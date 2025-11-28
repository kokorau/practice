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
  pendingTiles: Set<string>
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
      pendingTiles: new Set(),
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

    // Mark all tiles as pending
    this.state.pendingTiles = new Set(this.state.grid.tiles.map((t) => t.id))

    // Render ALL tiles immediately on scene update for faster initial display
    this.renderAllTiles()

    // Composite visible tiles to display canvas
    this.compositeVisible()
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
   * Render a single tile
   */
  private renderTile(tile: Tile): void {
    if (!this.state.scene || !this.state.camera) return

    // Update tile state to rendering
    this.state.grid = $TileGrid.updateTile(this.state.grid, tile.id, $Tile.markRendering)

    // Render the tile
    this.tileRenderer.renderTile(tile, this.state.scene, this.state.camera)

    // Update tile state to clean
    this.state.grid = $TileGrid.updateTile(this.state.grid, tile.id, $Tile.markClean)
  }

  /**
   * Render all tiles immediately (for initial render or full scene update)
   */
  private renderAllTiles(): void {
    if (!this.state.scene || !this.state.camera) return

    for (const tile of this.state.grid.tiles) {
      this.renderTile(tile as Tile)
      this.state.pendingTiles.delete(tile.id)
    }
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
   * Schedule idle rendering for non-visible tiles
   */
  private scheduleIdleRendering(): void {
    // Cancel any existing idle callback
    if (this.state.idleCallbackId !== null) {
      cancelIdleCallback(this.state.idleCallbackId)
      this.state.idleCallbackId = null
    }

    // Nothing to do if no pending tiles
    if (this.state.pendingTiles.size === 0) return

    this.state.idleCallbackId = requestIdleCallback(
      (deadline) => this.processIdleRendering(deadline),
      { timeout: 1000 } // Max wait time
    )
  }

  /**
   * Process idle rendering
   */
  private processIdleRendering(deadline: IdleDeadline): void {
    this.state.idleCallbackId = null

    if (!this.state.scene || !this.state.camera) return

    // Get tiles in priority order: adjacent first, then others
    const adjacentTiles = $TileGrid.getAdjacentTiles(this.state.grid, this.state.viewport)
    const otherTiles = this.state.grid.tiles.filter(
      (t) =>
        this.state.pendingTiles.has(t.id) &&
        !adjacentTiles.some((at) => at.id === t.id)
    )

    const prioritizedTiles = [
      ...adjacentTiles.filter((t) => this.state.pendingTiles.has(t.id)),
      ...otherTiles,
    ]

    // Render tiles while we have time
    for (const tile of prioritizedTiles) {
      // Check if we have time left (leave some buffer)
      if (deadline.timeRemaining() < 5) break

      if (this.state.pendingTiles.has(tile.id)) {
        this.renderTile(tile as Tile)
        this.state.pendingTiles.delete(tile.id)

        // Composite after each tile so user sees progress
        this.compositeVisible()
      }
    }

    // Schedule more rendering if there are still pending tiles
    if (this.state.pendingTiles.size > 0) {
      this.scheduleIdleRendering()
    }
  }

  /**
   * Force render all tiles immediately
   */
  forceRenderAll(): void {
    if (!this.state.scene || !this.state.camera) return

    for (const tile of this.state.grid.tiles) {
      this.renderTile(tile as Tile)
    }
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
    if (this.state.idleCallbackId !== null) {
      cancelIdleCallback(this.state.idleCallbackId)
      this.state.idleCallbackId = null
    }
  }
}
