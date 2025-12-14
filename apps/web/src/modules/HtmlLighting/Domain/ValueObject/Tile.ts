// Tile represents a rectangular region of the rendering canvas

export type TileState = 'dirty' | 'rendering' | 'clean'

export type Tile = {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly state: TileState
}

export type TileGrid = {
  readonly tiles: ReadonlyArray<Tile>
  readonly tileWidth: number
  readonly tileHeight: number
  readonly columns: number
  readonly rows: number
  readonly canvasWidth: number
  readonly canvasHeight: number
}

export const $Tile = {
  create: (x: number, y: number, width: number, height: number, state: TileState = 'dirty'): Tile => ({
    id: `${x},${y}`,
    x,
    y,
    width,
    height,
    state,
  }),

  markDirty: (tile: Tile): Tile => ({ ...tile, state: 'dirty' }),
  markRendering: (tile: Tile): Tile => ({ ...tile, state: 'rendering' }),
  markClean: (tile: Tile): Tile => ({ ...tile, state: 'clean' }),

  intersects: (tile: Tile, rect: { x: number; y: number; width: number; height: number }): boolean => {
    return !(
      tile.x + tile.width <= rect.x ||
      rect.x + rect.width <= tile.x ||
      tile.y + tile.height <= rect.y ||
      rect.y + rect.height <= tile.y
    )
  },
}

export const $TileGrid = {
  create: (canvasWidth: number, canvasHeight: number, tileHeight: number = 200): TileGrid => {
    // Full width tiles, configurable height
    const tileWidth = canvasWidth
    const columns = 1
    const rows = Math.ceil(canvasHeight / tileHeight)

    const tiles: Tile[] = []
    for (let row = 0; row < rows; row++) {
      const y = row * tileHeight
      const height = Math.min(tileHeight, canvasHeight - y)
      tiles.push($Tile.create(0, y, tileWidth, height))
    }

    return {
      tiles,
      tileWidth,
      tileHeight,
      columns,
      rows,
      canvasWidth,
      canvasHeight,
    }
  },

  markAllDirty: (grid: TileGrid): TileGrid => ({
    ...grid,
    tiles: grid.tiles.map($Tile.markDirty),
  }),

  updateTile: (grid: TileGrid, tileId: string, updater: (tile: Tile) => Tile): TileGrid => ({
    ...grid,
    tiles: grid.tiles.map((t) => (t.id === tileId ? updater(t) : t)),
  }),

  getTile: (grid: TileGrid, tileId: string): Tile | undefined => grid.tiles.find((t) => t.id === tileId),

  getVisibleTiles: (grid: TileGrid, viewport: { scrollY: number; height: number }): Tile[] => {
    const viewRect = { x: 0, y: viewport.scrollY, width: grid.canvasWidth, height: viewport.height }
    return grid.tiles.filter((tile) => $Tile.intersects(tile, viewRect))
  },

  getAdjacentTiles: (grid: TileGrid, viewport: { scrollY: number; height: number }): Tile[] => {
    const visibleTiles = $TileGrid.getVisibleTiles(grid, viewport)
    const visibleIds = new Set(visibleTiles.map((t) => t.id))

    // Get tiles immediately above and below visible area
    const expandedRect = {
      x: 0,
      y: viewport.scrollY - grid.tileHeight,
      width: grid.canvasWidth,
      height: viewport.height + grid.tileHeight * 2,
    }

    return grid.tiles.filter((tile) => !visibleIds.has(tile.id) && $Tile.intersects(tile, expandedRect))
  },

  getDirtyTiles: (grid: TileGrid): Tile[] => grid.tiles.filter((t) => t.state === 'dirty'),
}
