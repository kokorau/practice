/**
 * TileCompositor - Composites cached tile canvases onto a display canvas
 *
 * Handles the final composition of rendered tiles to the visible display
 */

import type { Tile, TileGrid } from '../Domain/ValueObject'
import type { Lut } from '../../Filter/Domain/ValueObject'
import type { PixelEffects } from '../../../composables/Filter/useFilter'
import { $Lut, $Lut3D } from '../../Filter/Domain/ValueObject'

export class TileCompositor {
  private displayCanvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor(displayCanvas: HTMLCanvasElement) {
    this.displayCanvas = displayCanvas
    const ctx = displayCanvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not get 2D context for display canvas')
    }
    this.ctx = ctx
  }

  /**
   * Update the display canvas size
   */
  setSize(width: number, height: number): void {
    if (this.displayCanvas.width !== width || this.displayCanvas.height !== height) {
      this.displayCanvas.width = width
      this.displayCanvas.height = height
    }
  }

  /**
   * Clear the display canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height)
  }

  /**
   * Composite a single tile onto the display canvas
   *
   * @param tile - The tile metadata
   * @param tileCanvas - The rendered tile canvas
   */
  compositeTile(tile: Tile, tileCanvas: HTMLCanvasElement): void {
    this.ctx.drawImage(tileCanvas, tile.x, tile.y, tile.width, tile.height)
  }

  /**
   * Composite multiple tiles onto the display canvas
   *
   * @param tiles - Array of tile metadata
   * @param getCanvas - Function to get the canvas for a tile
   */
  compositeTiles(tiles: Tile[], getCanvas: (tile: Tile) => HTMLCanvasElement | null): void {
    for (const tile of tiles) {
      const canvas = getCanvas(tile)
      if (canvas) {
        this.compositeTile(tile, canvas)
      }
    }
  }

  /**
   * Composite all tiles in a grid
   *
   * @param grid - The tile grid
   * @param getCanvas - Function to get the canvas for a tile
   */
  compositeGrid(grid: TileGrid, getCanvas: (tile: Tile) => HTMLCanvasElement | null): void {
    this.setSize(grid.canvasWidth, grid.canvasHeight)
    this.clear()
    this.compositeTiles(grid.tiles as Tile[], getCanvas)
  }

  /**
   * Composite only visible tiles (for scroll optimization)
   *
   * @param grid - The tile grid
   * @param viewport - The visible viewport
   * @param getCanvas - Function to get the canvas for a tile
   */
  compositeVisible(
    grid: TileGrid,
    _viewport: { scrollY: number; height: number },
    getCanvas: (tile: Tile) => HTMLCanvasElement | null
  ): void {
    // For now, we still need to set size to full content
    // The visible area optimization happens in which tiles we render
    this.setSize(grid.canvasWidth, grid.canvasHeight)
    this.clear()

    // Draw all clean tiles (they're cached anyway)
    this.compositeTiles(grid.tiles as Tile[], getCanvas)
  }

  /**
   * Apply LUT filter to the current display canvas content
   * @param lut - The LUT to apply (1D or 3D)
   * @param pixelEffects - Optional pixel effects (vibrance, etc.)
   */
  applyFilter(lut: Lut, pixelEffects?: PixelEffects): void {
    const { width, height } = this.displayCanvas
    if (width === 0 || height === 0) return

    const imageData = this.ctx.getImageData(0, 0, width, height)

    // Apply LUT (1D or 3D) with optional pixel effects
    let filteredData: ImageData
    if ($Lut3D.is(lut)) {
      // 3D LUT: apply without pixel effects (not yet supported for 3D)
      filteredData = $Lut3D.apply(imageData, lut)
    } else {
      // 1D LUT: apply with or without pixel effects
      filteredData = pixelEffects
        ? $Lut.applyWithEffects(imageData, lut, pixelEffects)
        : $Lut.apply(imageData, lut)
    }

    this.ctx.putImageData(filteredData, 0, 0)
  }

  /**
   * Get current canvas ImageData (for external processing)
   */
  getImageData(): ImageData | null {
    const { width, height } = this.displayCanvas
    if (width === 0 || height === 0) return null
    return this.ctx.getImageData(0, 0, width, height)
  }

  /**
   * Put ImageData back to canvas
   */
  putImageData(imageData: ImageData): void {
    this.ctx.putImageData(imageData, 0, 0)
  }
}
