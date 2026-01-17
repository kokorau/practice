/**
 * LayerWorkflow Integration Tests
 *
 * レイヤー追加→削除→並べ替えの統合テスト
 * HeroViewRepository + Layer UseCaseを組み合わせたワークフローを検証
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHeroViewInMemoryRepository } from '../Infra/HeroViewInMemoryRepository'
import { addLayer } from '../usecase/Layer/addLayer'
import { removeLayer } from '../usecase/Layer/removeLayer'
import { toggleVisibility } from '../usecase/Layer/toggleVisibility'
// toggleExpand import removed - not used in current tests
import { updateLayer } from '../usecase/Layer/updateLayer'
import type { HeroViewRepository } from '../Domain/repository/HeroViewRepository'
import type { HeroViewConfig, SurfaceLayerNodeConfig, GroupLayerNodeConfig } from '../Domain/HeroViewConfig'

describe('LayerWorkflow Integration', () => {
  let repository: HeroViewRepository

  const createTestConfig = (): HeroViewConfig => ({
    viewport: { width: 1280, height: 720 },
    colors: {
      background: { primary: 'B', secondary: 'auto' },
      mask: { primary: 'auto', secondary: 'auto' },
      semanticContext: 'canvas',
      brand: { hue: 198, saturation: 70, value: 65 },
      accent: { hue: 30, saturation: 80, value: 60 },
      foundation: { hue: 0, saturation: 0, value: 97 },
    },
    layers: [
      {
        type: 'base',
        id: 'base',
        name: 'Background',
        visible: true,
        surface: { type: 'solid' },
        processors: [],
      },
    ],
    foreground: { elements: [] },
  })

  const createSurfaceLayer = (id: string, name: string = 'New Surface'): SurfaceLayerNodeConfig => ({
    type: 'surface',
    id,
    name,
    visible: true,
    surface: { type: 'solid' },
    processors: [],
  })

  const createGroupLayer = (id: string, children: SurfaceLayerNodeConfig[] = []): GroupLayerNodeConfig => ({
    type: 'group',
    id,
    name: 'Group',
    visible: true,
    children,
    processors: [],
    expanded: true,
  })

  beforeEach(() => {
    repository = createHeroViewInMemoryRepository(createTestConfig())
  })

  describe('レイヤー追加 → 並べ替え → visibility切り替え → 削除', () => {
    it('should support complete layer management workflow', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      // Step 1: レイヤーを追加
      const layer1 = createSurfaceLayer('surface-1', 'Surface 1')
      const layer2 = createSurfaceLayer('surface-2', 'Surface 2')
      const layer3 = createSurfaceLayer('surface-3', 'Surface 3')

      addLayer(layer1, repository)
      addLayer(layer2, repository)
      addLayer(layer3, repository)

      expect(repository.get().layers).toHaveLength(4)
      expect(repository.get().layers.map(l => l.id)).toEqual(['base', 'surface-1', 'surface-2', 'surface-3'])

      // Step 2: レイヤーを並べ替え
      repository.reorderLayers(['base', 'surface-3', 'surface-1', 'surface-2'])

      expect(repository.get().layers.map(l => l.id)).toEqual(['base', 'surface-3', 'surface-1', 'surface-2'])

      // Step 3: visibility切り替え
      toggleVisibility('surface-1', repository)
      expect(repository.findLayer('surface-1')?.visible).toBe(false)

      toggleVisibility('surface-1', repository)
      expect(repository.findLayer('surface-1')?.visible).toBe(true)

      // Step 4: レイヤーを削除
      removeLayer('surface-2', repository)
      expect(repository.get().layers).toHaveLength(3)
      expect(repository.findLayer('surface-2')).toBeUndefined()

      // 残りのレイヤーの順序を確認
      expect(repository.get().layers.map(l => l.id)).toEqual(['base', 'surface-3', 'surface-1'])

      // 通知回数: 3回追加 + 1回並べ替え + 2回visibility + 1回削除 = 7回
      expect(callback).toHaveBeenCalledTimes(7)
    })
  })

  describe('グループ内レイヤー操作', () => {
    it('should support group layer operations', () => {
      // グループレイヤーを追加
      const childLayer1 = createSurfaceLayer('child-1', 'Child 1')
      const childLayer2 = createSurfaceLayer('child-2', 'Child 2')
      const group = createGroupLayer('group-1', [childLayer1, childLayer2])

      addLayer(group, repository)

      expect(repository.get().layers).toHaveLength(2)
      const addedGroup = repository.findLayer('group-1')
      expect(addedGroup?.type).toBe('group')
      if (addedGroup?.type === 'group') {
        expect(addedGroup.children).toHaveLength(2)
      }
    })

    it('should toggle expand state of group layer (via updateLayer)', () => {
      const group = createGroupLayer('group-1', [])
      addLayer(group, repository)

      // 初期状態は展開
      expect((repository.findLayer('group-1') as GroupLayerNodeConfig)?.expanded).toBe(true)

      // 折りたたむ（updateLayerを使用）
      updateLayer('group-1', { expanded: false }, repository)
      expect((repository.findLayer('group-1') as GroupLayerNodeConfig)?.expanded).toBe(false)

      // 展開（updateLayerを使用）
      updateLayer('group-1', { expanded: true }, repository)
      expect((repository.findLayer('group-1') as GroupLayerNodeConfig)?.expanded).toBe(true)
    })
  })

  describe('レイヤー更新ワークフロー', () => {
    it('should update layer properties', () => {
      const layer = createSurfaceLayer('surface-1', 'Original Name')
      addLayer(layer, repository)

      // 名前を更新
      updateLayer('surface-1', { name: 'Updated Name' }, repository)
      expect(repository.findLayer('surface-1')?.name).toBe('Updated Name')

      // surfaceを更新
      updateLayer('surface-1', { surface: { type: 'stripe', width1: 20, width2: 20, angle: 45 } }, repository)
      const updatedLayer = repository.findLayer('surface-1')
      if (updatedLayer?.type === 'surface') {
        expect(updatedLayer.surface).toEqual({ type: 'stripe', width1: 20, width2: 20, angle: 45 })
      }
    })

    it('should handle non-existent layer gracefully', () => {
      const result = updateLayer('non-existent', { name: 'Test' }, repository)
      expect(result).toBe(false)
    })
  })

  describe('指定位置へのレイヤー追加', () => {
    it('should add layer at specific index', () => {
      // 複数のレイヤーを追加
      addLayer(createSurfaceLayer('surface-1'), repository)
      addLayer(createSurfaceLayer('surface-2'), repository)

      // 指定位置にレイヤーを挿入
      addLayer(createSurfaceLayer('surface-middle'), repository, 1)

      const layerIds = repository.get().layers.map(l => l.id)
      expect(layerIds).toEqual(['base', 'surface-middle', 'surface-1', 'surface-2'])
    })

    it('should add layer at the beginning', () => {
      addLayer(createSurfaceLayer('surface-1'), repository)

      addLayer(createSurfaceLayer('surface-first'), repository, 0)

      const layerIds = repository.get().layers.map(l => l.id)
      expect(layerIds).toEqual(['surface-first', 'base', 'surface-1'])
    })
  })

  describe('subscribe通知の検証', () => {
    it('should notify once per layer operation', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      addLayer(createSurfaceLayer('surface-1'), repository)
      expect(callback).toHaveBeenCalledTimes(1)

      removeLayer('surface-1', repository)
      expect(callback).toHaveBeenCalledTimes(2)

      // 存在しないレイヤーの削除は通知されない（存在チェックで早期リターン）
      removeLayer('non-existent', repository)
      expect(callback).toHaveBeenCalledTimes(2) // 変わらず
    })

    it('should include updated layers in callback', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      const newLayer = createSurfaceLayer('surface-1', 'Test Layer')
      addLayer(newLayer, repository)

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: expect.arrayContaining([
            expect.objectContaining({ id: 'surface-1', name: 'Test Layer' }),
          ]),
        })
      )
    })
  })

  describe('複数サブスクライバー', () => {
    it('should notify all subscribers', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      repository.subscribe(callback1)
      repository.subscribe(callback2)

      addLayer(createSurfaceLayer('surface-1'), repository)

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })

    it('should allow independent unsubscribe', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const unsubscribe1 = repository.subscribe(callback1)
      repository.subscribe(callback2)

      addLayer(createSurfaceLayer('surface-1'), repository)
      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)

      unsubscribe1()

      addLayer(createSurfaceLayer('surface-2'), repository)
      expect(callback1).toHaveBeenCalledTimes(1) // 変わらず
      expect(callback2).toHaveBeenCalledTimes(2)
    })
  })

  describe('visibility toggle for nested layers', () => {
    it('should toggle visibility of surface layer inside group', () => {
      // グループ内にsurfaceレイヤーを配置
      const childSurface = createSurfaceLayer('nested-surface', 'Nested Surface')
      const group = createGroupLayer('group-1', [childSurface])
      addLayer(group, repository)

      // 初期状態はvisible: true
      const initialLayer = repository.findLayer('nested-surface')
      expect(initialLayer?.visible).toBe(true)

      // visibilityを切り替え
      const result = toggleVisibility('nested-surface', repository)
      expect(result).toBe(false)

      // 更新が反映されているか確認
      const updatedLayer = repository.findLayer('nested-surface')
      expect(updatedLayer?.visible).toBe(false)
    })

    it('should toggle visibility of deeply nested layer', () => {
      // 深くネストされたレイヤー構造
      const deepSurface = createSurfaceLayer('deep-surface', 'Deep Surface')
      const innerGroup = createGroupLayer('inner-group', [deepSurface])
      const outerGroup = createGroupLayer('outer-group', [innerGroup])
      addLayer(outerGroup, repository)

      // 初期状態確認
      expect(repository.findLayer('deep-surface')?.visible).toBe(true)

      // visibilityを切り替え
      toggleVisibility('deep-surface', repository)
      expect(repository.findLayer('deep-surface')?.visible).toBe(false)

      // 再度切り替え
      toggleVisibility('deep-surface', repository)
      expect(repository.findLayer('deep-surface')?.visible).toBe(true)
    })

    it('should toggle group visibility itself', () => {
      const childSurface = createSurfaceLayer('child-surface', 'Child')
      const group = createGroupLayer('group-1', [childSurface])
      addLayer(group, repository)

      // グループ自体のvisibilityを切り替え
      toggleVisibility('group-1', repository)
      expect(repository.findLayer('group-1')?.visible).toBe(false)

      // 子レイヤーのvisibilityは変わらない（グループが非表示でも子は個別にvisible状態を持つ）
      expect(repository.findLayer('child-surface')?.visible).toBe(true)
    })
  })

  describe('reorderLayersの詳細検証', () => {
    it('should handle partial reorder (only specified layers)', () => {
      addLayer(createSurfaceLayer('surface-1'), repository)
      addLayer(createSurfaceLayer('surface-2'), repository)
      addLayer(createSurfaceLayer('surface-3'), repository)

      // 一部のレイヤーのみ指定（指定されないものは末尾に追加される）
      repository.reorderLayers(['surface-2', 'base'])

      const layerIds = repository.get().layers.map(l => l.id)
      expect(layerIds).toEqual(['surface-2', 'base', 'surface-1', 'surface-3'])
    })

    it('should ignore non-existent layer ids in reorder', () => {
      addLayer(createSurfaceLayer('surface-1'), repository)

      repository.reorderLayers(['non-existent', 'base', 'surface-1'])

      const layerIds = repository.get().layers.map(l => l.id)
      expect(layerIds).toEqual(['base', 'surface-1'])
    })
  })
})
