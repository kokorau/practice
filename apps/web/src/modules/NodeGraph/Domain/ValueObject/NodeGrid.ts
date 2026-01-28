/**
 * NodeGrid - ノードグラフのグリッド管理と衝突検知
 *
 * ノード配置前に衝突を検知し、適切な位置を見つけるためのドメインロジック
 */

import { type GridCell, $GridCell, cellKey } from './GridCell'

/**
 * ノード配置情報
 */
export type NodePlacement = {
  readonly nodeId: string
  readonly column: number
  readonly row: number
  readonly rowSpan: number
  readonly isProcessorInternal: boolean
}

/**
 * 衝突情報
 */
export type CollisionInfo = {
  readonly hasCollision: boolean
  readonly collidingNodeId: string | null
  readonly collidingProcessorId: string | null
}

/**
 * Processor領域
 */
export type ProcessorArea = {
  readonly processorId: string
  readonly startColumn: number
  readonly endColumn: number
  readonly startRow: number
  readonly endRow: number
}

/**
 * ノードグリッド
 */
export type NodeGrid = {
  readonly columns: number
  readonly rows: number
  readonly cells: ReadonlyMap<string, GridCell>
  readonly placements: ReadonlyMap<string, NodePlacement>
}

/**
 * 探索方向
 */
export type SearchDirection = 'left' | 'right' | 'up' | 'down'

/**
 * 衝突なしの結果
 */
const NO_COLLISION: CollisionInfo = {
  hasCollision: false,
  collidingNodeId: null,
  collidingProcessorId: null,
}

export const $NodeGrid = {
  /**
   * 空のグリッドを作成
   */
  create: (columns: number, rows: number): NodeGrid => ({
    columns,
    rows,
    cells: new Map(),
    placements: new Map(),
  }),

  /**
   * 指定位置のセルを取得 (なければ空セルを返す)
   */
  getCell: (grid: NodeGrid, column: number, row: number): GridCell => {
    const key = cellKey(column, row)
    return grid.cells.get(key) ?? $GridCell.empty(column, row)
  },

  /**
   * 指定位置に配置可能か衝突をチェック
   */
  checkCollision: (grid: NodeGrid, column: number, row: number, rowSpan: number = 1): CollisionInfo => {
    for (let r = row; r < row + rowSpan; r++) {
      const cell = $NodeGrid.getCell(grid, column, r)
      if ($GridCell.isOccupied(cell)) {
        return {
          hasCollision: true,
          collidingNodeId: cell.occupiedBy,
          collidingProcessorId: null,
        }
      }
      if ($GridCell.isProcessorArea(cell)) {
        return {
          hasCollision: true,
          collidingNodeId: null,
          collidingProcessorId: cell.processorId,
        }
      }
    }
    return NO_COLLISION
  },

  /**
   * ノードを配置し、更新されたグリッドと衝突情報を返す
   */
  placeNode: (
    grid: NodeGrid,
    placement: NodePlacement
  ): { grid: NodeGrid; collision: CollisionInfo } => {
    const collision = $NodeGrid.checkCollision(grid, placement.column, placement.row, placement.rowSpan)

    if (collision.hasCollision) {
      return { grid, collision }
    }

    // セルを占有
    const newCells = new Map(grid.cells)
    for (let r = placement.row; r < placement.row + placement.rowSpan; r++) {
      const key = cellKey(placement.column, r)
      const cell = $GridCell.occupy($GridCell.empty(placement.column, r), placement.nodeId)
      newCells.set(key, cell)
    }

    // 配置情報を記録
    const newPlacements = new Map(grid.placements)
    newPlacements.set(placement.nodeId, placement)

    return {
      grid: {
        ...grid,
        cells: newCells,
        placements: newPlacements,
      },
      collision: NO_COLLISION,
    }
  },

  /**
   * 指定方向で利用可能な位置を探索
   * 見つからない場合は null を返す
   */
  findAvailablePosition: (
    grid: NodeGrid,
    startColumn: number,
    row: number,
    rowSpan: number,
    direction: SearchDirection,
    maxSearch: number = 10
  ): { column: number; row: number } | null => {
    const deltaColumn = direction === 'left' ? -1 : direction === 'right' ? 1 : 0
    const deltaRow = direction === 'up' ? -1 : direction === 'down' ? 1 : 0

    let column = startColumn
    let currentRow = row

    for (let i = 0; i < maxSearch; i++) {
      column += deltaColumn
      currentRow += deltaRow

      // 範囲外チェック
      if (column < 0 || currentRow < 0) {
        continue
      }

      const collision = $NodeGrid.checkCollision(grid, column, currentRow, rowSpan)
      if (!collision.hasCollision) {
        return { column, row: currentRow }
      }
    }

    return null
  },

  /**
   * 指定カラムで利用可能な位置を探索 (左方向優先)
   */
  findAvailableColumn: (
    grid: NodeGrid,
    preferredColumn: number,
    row: number,
    rowSpan: number
  ): number => {
    // まず希望位置をチェック
    const collision = $NodeGrid.checkCollision(grid, preferredColumn, row, rowSpan)
    if (!collision.hasCollision) {
      return preferredColumn
    }

    // 左方向で探索
    const leftResult = $NodeGrid.findAvailablePosition(grid, preferredColumn, row, rowSpan, 'left')
    if (leftResult) {
      return leftResult.column
    }

    // 右方向で探索
    const rightResult = $NodeGrid.findAvailablePosition(grid, preferredColumn, row, rowSpan, 'right')
    if (rightResult) {
      return rightResult.column
    }

    // 見つからない場合は希望位置を返す (呼び出し側で対処)
    return preferredColumn
  },

  /**
   * Processor領域を予約
   */
  reserveProcessorArea: (
    grid: NodeGrid,
    area: ProcessorArea
  ): { grid: NodeGrid; collisions: CollisionInfo[] } => {
    const collisions: CollisionInfo[] = []
    const newCells = new Map(grid.cells)

    for (let col = area.startColumn; col <= area.endColumn; col++) {
      for (let row = area.startRow; row < area.endRow; row++) {
        const key = cellKey(col, row)
        const existingCell = grid.cells.get(key)

        // 既に占有されている場合は衝突として記録
        if (existingCell && $GridCell.isOccupied(existingCell)) {
          collisions.push({
            hasCollision: true,
            collidingNodeId: existingCell.occupiedBy,
            collidingProcessorId: null,
          })
          continue
        }

        // Processor領域として予約
        const cell = $GridCell.reserveForProcessor($GridCell.empty(col, row), area.processorId)
        newCells.set(key, cell)
      }
    }

    return {
      grid: {
        ...grid,
        cells: newCells,
      },
      collisions,
    }
  },

  /**
   * ノードの配置を解除
   */
  removeNode: (grid: NodeGrid, nodeId: string): NodeGrid => {
    const placement = grid.placements.get(nodeId)
    if (!placement) {
      return grid
    }

    const newCells = new Map(grid.cells)
    for (let r = placement.row; r < placement.row + placement.rowSpan; r++) {
      const key = cellKey(placement.column, r)
      newCells.delete(key)
    }

    const newPlacements = new Map(grid.placements)
    newPlacements.delete(nodeId)

    return {
      ...grid,
      cells: newCells,
      placements: newPlacements,
    }
  },

  /**
   * 配置情報を取得
   */
  getPlacement: (grid: NodeGrid, nodeId: string): NodePlacement | undefined => {
    return grid.placements.get(nodeId)
  },

  /**
   * すべての配置情報を取得
   */
  getAllPlacements: (grid: NodeGrid): NodePlacement[] => {
    return Array.from(grid.placements.values())
  },
}
