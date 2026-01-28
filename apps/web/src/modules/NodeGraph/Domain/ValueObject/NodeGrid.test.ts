import { describe, it, expect } from 'vitest'
import { $NodeGrid, type NodePlacement, type ProcessorArea } from './NodeGrid'
import { $GridCell, cellKey } from './GridCell'

describe('$NodeGrid', () => {
  describe('create', () => {
    it('空のグリッドを作成する', () => {
      const grid = $NodeGrid.create(10, 6)

      expect(grid.columns).toBe(10)
      expect(grid.rows).toBe(6)
      expect(grid.cells.size).toBe(0)
      expect(grid.placements.size).toBe(0)
    })
  })

  describe('getCell', () => {
    it('存在しないセルは空のセルを返す', () => {
      const grid = $NodeGrid.create(10, 6)
      const cell = $NodeGrid.getCell(grid, 0, 0)

      expect($GridCell.isEmpty(cell)).toBe(true)
      expect(cell.column).toBe(0)
      expect(cell.row).toBe(0)
    })
  })

  describe('checkCollision', () => {
    it('空のグリッドでは衝突なし', () => {
      const grid = $NodeGrid.create(10, 6)
      const collision = $NodeGrid.checkCollision(grid, 0, 0, 1)

      expect(collision.hasCollision).toBe(false)
      expect(collision.collidingNodeId).toBeNull()
      expect(collision.collidingProcessorId).toBeNull()
    })

    it('占有セルとの衝突を検出', () => {
      let grid = $NodeGrid.create(10, 6)
      const placement: NodePlacement = {
        nodeId: 'node-1',
        column: 0,
        row: 0,
        rowSpan: 2,
        isProcessorInternal: false,
      }
      const result = $NodeGrid.placeNode(grid, placement)
      grid = result.grid

      // 同じ位置での衝突
      const collision = $NodeGrid.checkCollision(grid, 0, 0, 1)
      expect(collision.hasCollision).toBe(true)
      expect(collision.collidingNodeId).toBe('node-1')

      // rowSpan範囲内での衝突
      const collision2 = $NodeGrid.checkCollision(grid, 0, 1, 1)
      expect(collision2.hasCollision).toBe(true)
      expect(collision2.collidingNodeId).toBe('node-1')

      // 範囲外では衝突なし
      const collision3 = $NodeGrid.checkCollision(grid, 0, 2, 1)
      expect(collision3.hasCollision).toBe(false)
    })
  })

  describe('placeNode', () => {
    it('ノードを配置できる', () => {
      const grid = $NodeGrid.create(10, 6)
      const placement: NodePlacement = {
        nodeId: 'node-1',
        column: 0,
        row: 0,
        rowSpan: 2,
        isProcessorInternal: false,
      }

      const result = $NodeGrid.placeNode(grid, placement)

      expect(result.collision.hasCollision).toBe(false)
      expect(result.grid.placements.get('node-1')).toEqual(placement)
      expect($GridCell.isOccupied($NodeGrid.getCell(result.grid, 0, 0))).toBe(true)
      expect($GridCell.isOccupied($NodeGrid.getCell(result.grid, 0, 1))).toBe(true)
    })

    it('衝突する場合は配置せずに衝突情報を返す', () => {
      let grid = $NodeGrid.create(10, 6)
      const placement1: NodePlacement = {
        nodeId: 'node-1',
        column: 0,
        row: 0,
        rowSpan: 2,
        isProcessorInternal: false,
      }
      grid = $NodeGrid.placeNode(grid, placement1).grid

      const placement2: NodePlacement = {
        nodeId: 'node-2',
        column: 0,
        row: 0,
        rowSpan: 1,
        isProcessorInternal: false,
      }

      const result = $NodeGrid.placeNode(grid, placement2)

      expect(result.collision.hasCollision).toBe(true)
      expect(result.collision.collidingNodeId).toBe('node-1')
      expect(result.grid.placements.has('node-2')).toBe(false)
    })
  })

  describe('findAvailableColumn', () => {
    it('希望位置が空いていればその位置を返す', () => {
      const grid = $NodeGrid.create(10, 6)
      const column = $NodeGrid.findAvailableColumn(grid, 3, 0, 2)

      expect(column).toBe(3)
    })

    it('衝突する場合は左方向で空き位置を探す', () => {
      let grid = $NodeGrid.create(10, 6)
      // column 3 を占有
      grid = $NodeGrid.placeNode(grid, {
        nodeId: 'node-1',
        column: 3,
        row: 0,
        rowSpan: 2,
        isProcessorInternal: false,
      }).grid

      const column = $NodeGrid.findAvailableColumn(grid, 3, 0, 2)

      expect(column).toBe(2) // 左隣の空き位置
    })

    it('左に空きがない場合は右方向で探す', () => {
      let grid = $NodeGrid.create(10, 6)
      // column 0-3 を占有
      for (let c = 0; c <= 3; c++) {
        grid = $NodeGrid.placeNode(grid, {
          nodeId: `node-${c}`,
          column: c,
          row: 0,
          rowSpan: 2,
          isProcessorInternal: false,
        }).grid
      }

      const column = $NodeGrid.findAvailableColumn(grid, 2, 0, 2)

      expect(column).toBe(4) // 右側の空き位置
    })
  })

  describe('findAvailablePosition', () => {
    it('左方向で空き位置を探す', () => {
      let grid = $NodeGrid.create(10, 6)
      grid = $NodeGrid.placeNode(grid, {
        nodeId: 'node-1',
        column: 5,
        row: 0,
        rowSpan: 2,
        isProcessorInternal: false,
      }).grid

      const result = $NodeGrid.findAvailablePosition(grid, 5, 0, 2, 'left')

      expect(result).toEqual({ column: 4, row: 0 })
    })

    it('右方向で空き位置を探す', () => {
      let grid = $NodeGrid.create(10, 6)
      grid = $NodeGrid.placeNode(grid, {
        nodeId: 'node-1',
        column: 5,
        row: 0,
        rowSpan: 2,
        isProcessorInternal: false,
      }).grid

      const result = $NodeGrid.findAvailablePosition(grid, 5, 0, 2, 'right')

      expect(result).toEqual({ column: 6, row: 0 })
    })

    it('見つからない場合は null を返す', () => {
      let grid = $NodeGrid.create(5, 6)
      // 全カラムを占有
      for (let c = 0; c < 5; c++) {
        grid = $NodeGrid.placeNode(grid, {
          nodeId: `node-${c}`,
          column: c,
          row: 0,
          rowSpan: 2,
          isProcessorInternal: false,
        }).grid
      }

      const result = $NodeGrid.findAvailablePosition(grid, 2, 0, 2, 'left', 5)

      expect(result).toBeNull()
    })
  })

  describe('reserveProcessorArea', () => {
    it('Processor領域を予約できる', () => {
      const grid = $NodeGrid.create(10, 6)
      const area: ProcessorArea = {
        processorId: 'processor-1',
        startColumn: 1,
        endColumn: 3,
        startRow: 0,
        endRow: 1,
      }

      const result = $NodeGrid.reserveProcessorArea(grid, area)

      expect(result.collisions).toHaveLength(0)
      expect($GridCell.isProcessorArea($NodeGrid.getCell(result.grid, 1, 0))).toBe(true)
      expect($GridCell.isProcessorArea($NodeGrid.getCell(result.grid, 2, 0))).toBe(true)
      expect($GridCell.isProcessorArea($NodeGrid.getCell(result.grid, 3, 0))).toBe(true)
    })

    it('既存ノードとの衝突を検出', () => {
      let grid = $NodeGrid.create(10, 6)
      grid = $NodeGrid.placeNode(grid, {
        nodeId: 'node-1',
        column: 2,
        row: 0,
        rowSpan: 1,
        isProcessorInternal: false,
      }).grid

      const area: ProcessorArea = {
        processorId: 'processor-1',
        startColumn: 1,
        endColumn: 3,
        startRow: 0,
        endRow: 1,
      }

      const result = $NodeGrid.reserveProcessorArea(grid, area)

      expect(result.collisions).toHaveLength(1)
      expect(result.collisions[0]?.collidingNodeId).toBe('node-1')
    })
  })

  describe('removeNode', () => {
    it('ノードを削除できる', () => {
      let grid = $NodeGrid.create(10, 6)
      grid = $NodeGrid.placeNode(grid, {
        nodeId: 'node-1',
        column: 0,
        row: 0,
        rowSpan: 2,
        isProcessorInternal: false,
      }).grid

      grid = $NodeGrid.removeNode(grid, 'node-1')

      expect(grid.placements.has('node-1')).toBe(false)
      expect($GridCell.isEmpty($NodeGrid.getCell(grid, 0, 0))).toBe(true)
      expect($GridCell.isEmpty($NodeGrid.getCell(grid, 0, 1))).toBe(true)
    })

    it('存在しないノードを削除しても問題ない', () => {
      const grid = $NodeGrid.create(10, 6)
      const result = $NodeGrid.removeNode(grid, 'non-existent')

      expect(result).toBe(grid)
    })
  })

  describe('Preset2 衝突シナリオ', () => {
    it('Surface (column=0) と Graymap が同じカラムに配置されようとした場合、Graymapを別位置に配置', () => {
      let grid = $NodeGrid.create(10, 6)

      // Surface を column=0, row=0 に配置 (rowSpan=2)
      grid = $NodeGrid.placeNode(grid, {
        nodeId: 'center-solid',
        column: 0,
        row: 0,
        rowSpan: 2,
        isProcessorInternal: false,
      }).grid

      // Graymap を column=0, row=1 に配置しようとする
      const preferredColumn = 0
      const graymapRow = 1
      const collision = $NodeGrid.checkCollision(grid, preferredColumn, graymapRow, 1)

      expect(collision.hasCollision).toBe(true)
      expect(collision.collidingNodeId).toBe('center-solid')

      // 衝突したので左方向で空き位置を探す (ただし column=0 なので見つからない)
      // この場合、グリッドを拡張するか別の対策が必要
      // findAvailableColumn は左優先で探し、見つからなければ右で探す
      const availableColumn = $NodeGrid.findAvailableColumn(grid, preferredColumn, graymapRow, 1)

      // column=-1 は無効なので、右側の column=1 が返される
      expect(availableColumn).toBeGreaterThanOrEqual(0)
      expect(availableColumn).not.toBe(0) // Surface があるので 0 以外

      // 見つかった位置に配置
      const placeResult = $NodeGrid.placeNode(grid, {
        nodeId: 'graymap',
        column: availableColumn,
        row: graymapRow,
        rowSpan: 1,
        isProcessorInternal: false,
      })

      expect(placeResult.collision.hasCollision).toBe(false)
    })
  })
})

describe('$GridCell', () => {
  describe('状態判定', () => {
    it('空セルの判定', () => {
      const cell = $GridCell.empty(0, 0)
      expect($GridCell.isEmpty(cell)).toBe(true)
      expect($GridCell.isOccupied(cell)).toBe(false)
      expect($GridCell.isProcessorArea(cell)).toBe(false)
    })

    it('占有セルの判定', () => {
      const cell = $GridCell.occupy($GridCell.empty(0, 0), 'node-1')
      expect($GridCell.isEmpty(cell)).toBe(false)
      expect($GridCell.isOccupied(cell)).toBe(true)
      expect($GridCell.isProcessorArea(cell)).toBe(false)
      expect(cell.occupiedBy).toBe('node-1')
    })

    it('Processor領域の判定', () => {
      const cell = $GridCell.reserveForProcessor($GridCell.empty(0, 0), 'processor-1')
      expect($GridCell.isEmpty(cell)).toBe(false)
      expect($GridCell.isOccupied(cell)).toBe(false)
      expect($GridCell.isProcessorArea(cell)).toBe(true)
      expect(cell.processorId).toBe('processor-1')
    })
  })
})

describe('cellKey', () => {
  it('一意のキーを生成する', () => {
    expect(cellKey(0, 0)).toBe('0,0')
    expect(cellKey(5, 3)).toBe('5,3')
    expect(cellKey(10, 20)).toBe('10,20')
  })
})
