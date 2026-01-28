/**
 * GridCell - ノードグラフのグリッドセルを表す値オブジェクト
 *
 * セルの占有状態を管理し、衝突検知の基盤となる
 */

export type CellOccupancy = 'empty' | 'occupied' | 'processor-area'

export type GridCell = {
  readonly column: number
  readonly row: number
  readonly occupancy: CellOccupancy
  /** 占有ノードID (occupancy が 'occupied' の場合) */
  readonly occupiedBy: string | null
  /** Processor領域ID (occupancy が 'processor-area' の場合) */
  readonly processorId: string | null
}

/**
 * セルの一意キーを生成
 */
export function cellKey(column: number, row: number): string {
  return `${column},${row}`
}

export const $GridCell = {
  /**
   * 空のセルを作成
   */
  empty: (column: number, row: number): GridCell => ({
    column,
    row,
    occupancy: 'empty',
    occupiedBy: null,
    processorId: null,
  }),

  /**
   * セルをノードで占有
   */
  occupy: (cell: GridCell, nodeId: string): GridCell => ({
    ...cell,
    occupancy: 'occupied',
    occupiedBy: nodeId,
    processorId: null,
  }),

  /**
   * セルをProcessor領域として予約
   */
  reserveForProcessor: (cell: GridCell, processorId: string): GridCell => ({
    ...cell,
    occupancy: 'processor-area',
    occupiedBy: null,
    processorId,
  }),

  /**
   * セルが空かどうか
   */
  isEmpty: (cell: GridCell): boolean => cell.occupancy === 'empty',

  /**
   * セルがノードで占有されているかどうか
   */
  isOccupied: (cell: GridCell): boolean => cell.occupancy === 'occupied',

  /**
   * セルがProcessor領域かどうか
   */
  isProcessorArea: (cell: GridCell): boolean => cell.occupancy === 'processor-area',

  /**
   * セルが何らかの理由で使用不可かどうか
   */
  isUnavailable: (cell: GridCell): boolean => cell.occupancy !== 'empty',
}
