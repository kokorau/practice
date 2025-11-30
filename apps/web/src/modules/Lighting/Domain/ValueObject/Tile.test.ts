import { describe, it, expect } from 'vitest'
import { $Tile, $TileGrid, type Tile, type TileGrid } from './Tile'

describe('$Tile', () => {
  describe('create', () => {
    it('should create a tile with given dimensions', () => {
      const tile = $Tile.create(0, 0, 100, 50)

      expect(tile.x).toBe(0)
      expect(tile.y).toBe(0)
      expect(tile.width).toBe(100)
      expect(tile.height).toBe(50)
    })

    it('should default to dirty state', () => {
      const tile = $Tile.create(0, 0, 100, 50)

      expect(tile.state).toBe('dirty')
    })

    it('should accept custom initial state', () => {
      const tile = $Tile.create(0, 0, 100, 50, 'clean')

      expect(tile.state).toBe('clean')
    })

    it('should generate id from position', () => {
      const tile = $Tile.create(100, 200, 50, 50)

      expect(tile.id).toBe('100,200')
    })
  })

  describe('state changes', () => {
    it('should mark tile as dirty', () => {
      const tile = $Tile.create(0, 0, 100, 50, 'clean')
      const dirty = $Tile.markDirty(tile)

      expect(dirty.state).toBe('dirty')
    })

    it('should mark tile as rendering', () => {
      const tile = $Tile.create(0, 0, 100, 50)
      const rendering = $Tile.markRendering(tile)

      expect(rendering.state).toBe('rendering')
    })

    it('should mark tile as clean', () => {
      const tile = $Tile.create(0, 0, 100, 50)
      const clean = $Tile.markClean(tile)

      expect(clean.state).toBe('clean')
    })

    it('should not modify original tile', () => {
      const tile = $Tile.create(0, 0, 100, 50, 'dirty')
      $Tile.markClean(tile)

      expect(tile.state).toBe('dirty')
    })
  })

  describe('intersects', () => {
    it('should return true for overlapping rectangles', () => {
      const tile = $Tile.create(0, 0, 100, 100)
      const rect = { x: 50, y: 50, width: 100, height: 100 }

      expect($Tile.intersects(tile, rect)).toBe(true)
    })

    it('should return false for non-overlapping rectangles (rect to the right)', () => {
      const tile = $Tile.create(0, 0, 100, 100)
      const rect = { x: 200, y: 0, width: 100, height: 100 }

      expect($Tile.intersects(tile, rect)).toBe(false)
    })

    it('should return false for non-overlapping rectangles (rect below)', () => {
      const tile = $Tile.create(0, 0, 100, 100)
      const rect = { x: 0, y: 200, width: 100, height: 100 }

      expect($Tile.intersects(tile, rect)).toBe(false)
    })

    it('should return false for adjacent rectangles (touching edges)', () => {
      const tile = $Tile.create(0, 0, 100, 100)
      const rect = { x: 100, y: 0, width: 100, height: 100 }

      expect($Tile.intersects(tile, rect)).toBe(false)
    })

    it('should return true when rect contains tile', () => {
      const tile = $Tile.create(50, 50, 50, 50)
      const rect = { x: 0, y: 0, width: 200, height: 200 }

      expect($Tile.intersects(tile, rect)).toBe(true)
    })

    it('should return true when tile contains rect', () => {
      const tile = $Tile.create(0, 0, 200, 200)
      const rect = { x: 50, y: 50, width: 50, height: 50 }

      expect($Tile.intersects(tile, rect)).toBe(true)
    })
  })
})

describe('$TileGrid', () => {
  describe('create', () => {
    it('should create grid with correct dimensions', () => {
      const grid = $TileGrid.create(800, 600, 200)

      expect(grid.canvasWidth).toBe(800)
      expect(grid.canvasHeight).toBe(600)
      expect(grid.tileWidth).toBe(800) // full width
      expect(grid.tileHeight).toBe(200)
    })

    it('should calculate correct number of rows', () => {
      const grid = $TileGrid.create(800, 600, 200)

      expect(grid.rows).toBe(3) // 600 / 200 = 3
      expect(grid.columns).toBe(1) // full width tiles
    })

    it('should create correct number of tiles', () => {
      const grid = $TileGrid.create(800, 600, 200)

      expect(grid.tiles.length).toBe(3)
    })

    it('should handle non-divisible canvas height', () => {
      const grid = $TileGrid.create(800, 550, 200)

      expect(grid.rows).toBe(3) // ceil(550 / 200) = 3
      expect(grid.tiles.length).toBe(3)
      // Last tile should be shorter
      expect(grid.tiles[2]?.height).toBe(150)
    })

    it('should create tiles with correct positions', () => {
      const grid = $TileGrid.create(800, 600, 200)

      expect(grid.tiles[0]?.y).toBe(0)
      expect(grid.tiles[1]?.y).toBe(200)
      expect(grid.tiles[2]?.y).toBe(400)
    })

    it('should create all tiles as dirty by default', () => {
      const grid = $TileGrid.create(800, 600, 200)

      grid.tiles.forEach(tile => {
        expect(tile.state).toBe('dirty')
      })
    })
  })

  describe('markAllDirty', () => {
    it('should mark all tiles as dirty', () => {
      let grid = $TileGrid.create(800, 600, 200)
      // Mark some tiles clean first
      grid = {
        ...grid,
        tiles: grid.tiles.map($Tile.markClean),
      }
      expect(grid.tiles.every(t => t.state === 'clean')).toBe(true)

      grid = $TileGrid.markAllDirty(grid)

      grid.tiles.forEach(tile => {
        expect(tile.state).toBe('dirty')
      })
    })
  })

  describe('updateTile', () => {
    it('should update specific tile', () => {
      const grid = $TileGrid.create(800, 600, 200)
      const tileId = grid.tiles[1]!.id

      const updated = $TileGrid.updateTile(grid, tileId, $Tile.markClean)

      expect(updated.tiles[0]?.state).toBe('dirty')
      expect(updated.tiles[1]?.state).toBe('clean')
      expect(updated.tiles[2]?.state).toBe('dirty')
    })

    it('should not modify original grid', () => {
      const grid = $TileGrid.create(800, 600, 200)
      const tileId = grid.tiles[1]!.id

      $TileGrid.updateTile(grid, tileId, $Tile.markClean)

      expect(grid.tiles[1]?.state).toBe('dirty')
    })
  })

  describe('getTile', () => {
    it('should return tile by id', () => {
      const grid = $TileGrid.create(800, 600, 200)
      const expectedTile = grid.tiles[1]!

      const tile = $TileGrid.getTile(grid, expectedTile.id)

      expect(tile).toBe(expectedTile)
    })

    it('should return undefined for non-existent id', () => {
      const grid = $TileGrid.create(800, 600, 200)

      const tile = $TileGrid.getTile(grid, 'invalid-id')

      expect(tile).toBeUndefined()
    })
  })

  describe('getVisibleTiles', () => {
    it('should return tiles visible in viewport', () => {
      const grid = $TileGrid.create(800, 600, 200)
      const viewport = { scrollY: 0, height: 300 }

      const visible = $TileGrid.getVisibleTiles(grid, viewport)

      // Viewport 0-300 should see tiles at y=0 and y=200
      expect(visible.length).toBe(2)
      expect(visible.some(t => t.y === 0)).toBe(true)
      expect(visible.some(t => t.y === 200)).toBe(true)
    })

    it('should return tiles visible after scrolling', () => {
      const grid = $TileGrid.create(800, 600, 200)
      const viewport = { scrollY: 200, height: 300 }

      const visible = $TileGrid.getVisibleTiles(grid, viewport)

      // Viewport 200-500 should see tiles at y=200 and y=400
      expect(visible.length).toBe(2)
      expect(visible.some(t => t.y === 200)).toBe(true)
      expect(visible.some(t => t.y === 400)).toBe(true)
    })

    it('should return all tiles when viewport covers entire canvas', () => {
      const grid = $TileGrid.create(800, 600, 200)
      const viewport = { scrollY: 0, height: 600 }

      const visible = $TileGrid.getVisibleTiles(grid, viewport)

      expect(visible.length).toBe(3)
    })
  })

  describe('getAdjacentTiles', () => {
    it('should return tiles adjacent to visible area', () => {
      const grid = $TileGrid.create(800, 1000, 200)
      const viewport = { scrollY: 400, height: 200 }

      const adjacent = $TileGrid.getAdjacentTiles(grid, viewport)

      // Viewport 400-600 shows tile at y=400
      // Adjacent should be tiles at y=200 and y=600
      expect(adjacent.length).toBe(2)
      expect(adjacent.some(t => t.y === 200)).toBe(true)
      expect(adjacent.some(t => t.y === 600)).toBe(true)
    })

    it('should not include visible tiles', () => {
      const grid = $TileGrid.create(800, 1000, 200)
      const viewport = { scrollY: 400, height: 200 }
      const visible = $TileGrid.getVisibleTiles(grid, viewport)
      const visibleIds = visible.map(t => t.id)

      const adjacent = $TileGrid.getAdjacentTiles(grid, viewport)

      adjacent.forEach(tile => {
        expect(visibleIds).not.toContain(tile.id)
      })
    })
  })

  describe('getDirtyTiles', () => {
    it('should return all dirty tiles', () => {
      const grid = $TileGrid.create(800, 600, 200)

      const dirty = $TileGrid.getDirtyTiles(grid)

      expect(dirty.length).toBe(3) // all tiles start dirty
    })

    it('should not include clean tiles', () => {
      let grid = $TileGrid.create(800, 600, 200)
      grid = $TileGrid.updateTile(grid, grid.tiles[0]!.id, $Tile.markClean)

      const dirty = $TileGrid.getDirtyTiles(grid)

      expect(dirty.length).toBe(2)
      expect(dirty.every(t => t.state === 'dirty')).toBe(true)
    })

    it('should not include rendering tiles', () => {
      let grid = $TileGrid.create(800, 600, 200)
      grid = $TileGrid.updateTile(grid, grid.tiles[1]!.id, $Tile.markRendering)

      const dirty = $TileGrid.getDirtyTiles(grid)

      expect(dirty.length).toBe(2)
      expect(dirty.every(t => t.state === 'dirty')).toBe(true)
    })
  })
})
