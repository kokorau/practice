/**
 * Grid Buffer Builder
 * Builds GPU buffers for 2D grid spatial partitioning
 */

import type { Grid2D } from '../../../Domain/ValueObject'

/**
 * Grid uniform data layout (32 bytes):
 * - minX, minY, minZ, pad (16 bytes)
 * - cellSize, cellsX, cellsY, useGrid (16 bytes)
 */
export const GRID_UNIFORM_SIZE = 32

/**
 * Cell data stride (2 u32 values = 8 bytes)
 * - startIndex: u32
 * - count: u32
 */
export const CELL_STRIDE = 2

/**
 * Build grid uniform buffer data
 */
export const buildGridUniform = (grid: Grid2D | undefined): Float32Array => {
  const data = new Float32Array(GRID_UNIFORM_SIZE / 4)

  if (!grid) {
    // No grid - set useGrid to 0
    data[7] = 0 // useGrid = false
    return data
  }

  // minX, minY, minZ, pad
  data[0] = grid.bounds.min.x
  data[1] = grid.bounds.min.y
  data[2] = grid.bounds.min.z
  data[3] = 0 // padding

  // cellSize, cellsX, cellsY, useGrid
  data[4] = grid.cellSize
  // Use Uint32Array view for integer values
  const intView = new Uint32Array(data.buffer)
  intView[5] = grid.cellsX
  intView[6] = grid.cellsY
  intView[7] = 1 // useGrid = true

  return data
}

/**
 * Build cell data buffer
 * Each cell has: startIndex (u32), count (u32)
 */
export const buildCellBuffer = (grid: Grid2D | undefined, capacity: number): Uint32Array => {
  const data = new Uint32Array(capacity * CELL_STRIDE)

  if (!grid) {
    return data
  }

  for (let i = 0; i < grid.cells.length && i < capacity; i++) {
    const cell = grid.cells[i]
    data[i * CELL_STRIDE + 0] = cell.startIndex
    data[i * CELL_STRIDE + 1] = cell.count
  }

  return data
}

/**
 * Build object indices buffer
 */
export const buildObjectIndicesBuffer = (grid: Grid2D | undefined, capacity: number): Uint32Array => {
  const data = new Uint32Array(capacity)

  if (!grid) {
    return data
  }

  for (let i = 0; i < grid.objectIndices.length && i < capacity; i++) {
    data[i] = grid.objectIndices[i]
  }

  return data
}
