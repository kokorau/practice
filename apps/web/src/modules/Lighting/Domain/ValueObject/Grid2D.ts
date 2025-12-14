import type { AABB } from './AABB'
import { $AABB } from './AABB'
import type { RenderableObject } from './Scene'

/**
 * 2D Grid for spatial partitioning
 * Divides XY plane into cells for efficient ray traversal
 */
export interface Grid2D {
  /** Grid bounding box (XY plane, Z ignored for cell assignment) */
  readonly bounds: AABB
  /** Cell size in world units */
  readonly cellSize: number
  /** Number of cells in X direction */
  readonly cellsX: number
  /** Number of cells in Y direction */
  readonly cellsY: number
  /** Cell data: [startIndex, count] for each cell */
  readonly cells: readonly CellData[]
  /** Object indices, referenced by cells */
  readonly objectIndices: readonly number[]
}

/**
 * Data for a single cell
 */
export interface CellData {
  /** Start index in objectIndices array */
  readonly startIndex: number
  /** Number of objects in this cell */
  readonly count: number
}

/** Default cell size */
const DEFAULT_CELL_SIZE = 100

/** Minimum cells per axis */
const MIN_CELLS = 4

/** Maximum cells per axis */
const MAX_CELLS = 64

/**
 * Calculate grid bounds from objects
 */
const calculateBounds = (objects: readonly RenderableObject[]): AABB | null => {
  if (objects.length === 0) return null

  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

  for (const obj of objects) {
    const geometry = obj.type === 'plane' ? { ...obj.geometry, type: 'plane' as const }
      : obj.type === 'box' ? { ...obj.geometry, type: 'box' as const }
      : obj.type === 'capsule' ? { ...obj.geometry, type: 'capsule' as const }
      : { ...obj.geometry, type: 'sphere' as const }

    const aabb = $AABB.fromGeometry(geometry)
    if (!aabb) continue // Skip unbounded objects

    minX = Math.min(minX, aabb.min.x)
    minY = Math.min(minY, aabb.min.y)
    minZ = Math.min(minZ, aabb.min.z)
    maxX = Math.max(maxX, aabb.max.x)
    maxY = Math.max(maxY, aabb.max.y)
    maxZ = Math.max(maxZ, aabb.max.z)
  }

  if (minX === Infinity) return null

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  }
}

/**
 * Get cell index for a point
 */
const getCellIndex = (
  x: number,
  y: number,
  bounds: AABB,
  cellSize: number,
  cellsX: number,
  cellsY: number
): number => {
  const cellX = Math.floor((x - bounds.min.x) / cellSize)
  const cellY = Math.floor((y - bounds.min.y) / cellSize)

  // Clamp to grid bounds
  const clampedX = Math.max(0, Math.min(cellsX - 1, cellX))
  const clampedY = Math.max(0, Math.min(cellsY - 1, cellY))

  return clampedY * cellsX + clampedX
}

/**
 * Get all cells that an AABB overlaps
 */
const getCellsForAABB = (
  aabb: AABB,
  bounds: AABB,
  cellSize: number,
  cellsX: number,
  cellsY: number
): number[] => {
  const minCellX = Math.max(0, Math.floor((aabb.min.x - bounds.min.x) / cellSize))
  const maxCellX = Math.min(cellsX - 1, Math.floor((aabb.max.x - bounds.min.x) / cellSize))
  const minCellY = Math.max(0, Math.floor((aabb.min.y - bounds.min.y) / cellSize))
  const maxCellY = Math.min(cellsY - 1, Math.floor((aabb.max.y - bounds.min.y) / cellSize))

  const cells: number[] = []
  for (let y = minCellY; y <= maxCellY; y++) {
    for (let x = minCellX; x <= maxCellX; x++) {
      cells.push(y * cellsX + x)
    }
  }
  return cells
}

/**
 * Build a 2D grid from objects
 */
const build = (
  objects: readonly RenderableObject[],
  cellSize: number = DEFAULT_CELL_SIZE
): Grid2D | null => {
  const bounds = calculateBounds(objects)
  if (!bounds) return null

  // Calculate grid dimensions
  const width = bounds.max.x - bounds.min.x
  const height = bounds.max.y - bounds.min.y

  let cellsX = Math.ceil(width / cellSize)
  let cellsY = Math.ceil(height / cellSize)

  // Clamp cell count
  cellsX = Math.max(MIN_CELLS, Math.min(MAX_CELLS, cellsX))
  cellsY = Math.max(MIN_CELLS, Math.min(MAX_CELLS, cellsY))

  // Recalculate cell size based on clamped cell count
  const actualCellSizeX = width / cellsX
  const actualCellSizeY = height / cellsY
  const actualCellSize = Math.max(actualCellSizeX, actualCellSizeY)

  // Assign objects to cells
  const cellObjects: number[][] = Array.from({ length: cellsX * cellsY }, () => [])

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i]
    const geometry = obj.type === 'plane' ? { ...obj.geometry, type: 'plane' as const }
      : obj.type === 'box' ? { ...obj.geometry, type: 'box' as const }
      : obj.type === 'capsule' ? { ...obj.geometry, type: 'capsule' as const }
      : { ...obj.geometry, type: 'sphere' as const }

    const aabb = $AABB.fromGeometry(geometry)
    if (!aabb) {
      // Unbounded objects go in all cells
      for (let c = 0; c < cellObjects.length; c++) {
        cellObjects[c].push(i)
      }
      continue
    }

    const cellIndices = getCellsForAABB(aabb, bounds, actualCellSize, cellsX, cellsY)
    for (const cellIndex of cellIndices) {
      cellObjects[cellIndex].push(i)
    }
  }

  // Flatten to objectIndices array and build cell data
  const objectIndices: number[] = []
  const cells: CellData[] = []

  for (const cellObjList of cellObjects) {
    cells.push({
      startIndex: objectIndices.length,
      count: cellObjList.length,
    })
    objectIndices.push(...cellObjList)
  }

  return {
    bounds,
    cellSize: actualCellSize,
    cellsX,
    cellsY,
    cells,
    objectIndices,
  }
}

/**
 * Create an empty grid
 */
const empty = (): Grid2D => ({
  bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
  cellSize: 1,
  cellsX: 1,
  cellsY: 1,
  cells: [{ startIndex: 0, count: 0 }],
  objectIndices: [],
})

export const $Grid2D = {
  build,
  empty,
  getCellIndex,
  getCellsForAABB,
  calculateBounds,
}
