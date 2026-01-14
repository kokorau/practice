/**
 * SurfaceWorkflow Integration Tests
 *
 * テクスチャ選択→パラメータ変更の統合テスト
 * HeroViewRepository + Surface/Mask UseCaseを組み合わせたワークフローを検証
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHeroViewInMemoryRepository } from '../Infra/HeroViewInMemoryRepository'
import {
  createBackgroundSurfaceUsecase,
  type BackgroundSurfaceUsecase,
  type ImageUploadPort,
} from '../Application/BackgroundSurfaceUsecase'
import { createMaskUsecase, type MaskUsecase } from '../Application/MaskUsecase'
import type { HeroViewRepository } from '../Domain/repository/HeroViewRepository'
import type { HeroViewConfig } from '../Domain/HeroViewConfig'
import { SCENE_LAYER_IDS } from '../Domain/LayerNode'

describe('SurfaceWorkflow Integration', () => {
  let repository: HeroViewRepository
  let backgroundUsecase: BackgroundSurfaceUsecase
  let maskUsecase: MaskUsecase
  let mockImageUpload: ImageUploadPort

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
        id: SCENE_LAYER_IDS.BASE,
        name: 'Background',
        visible: true,
        surface: { type: 'solid' },
        filters: [],
      },
      {
        type: 'surface',
        id: SCENE_LAYER_IDS.MASK,
        name: 'Mask Layer',
        visible: true,
        surface: { type: 'solid' },
        filters: [],
      },
      // Masks are now on processor nodes
      {
        type: 'processor',
        id: 'processor-mask',
        name: 'Mask Processor',
        visible: true,
        modifiers: [
          {
            type: 'mask',
            enabled: true,
            shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
            invert: false,
            feather: 0,
          },
        ],
      },
    ],
    foreground: { elements: [] },
  })

  beforeEach(() => {
    repository = createHeroViewInMemoryRepository(createTestConfig())
    mockImageUpload = {
      upload: vi.fn().mockResolvedValue('uploaded-image-id'),
      fetchRandom: vi.fn().mockResolvedValue(new File([''], 'random.jpg')),
    }
    backgroundUsecase = createBackgroundSurfaceUsecase({
      repository,
      imageUpload: mockImageUpload,
    })
    maskUsecase = createMaskUsecase({
      repository,
      imageUpload: mockImageUpload,
    })
  })

  describe('Background: solid → stripe → パラメータ変更', () => {
    it('should support complete background surface workflow', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      // Step 1: 初期状態を確認（solid）
      const baseLayer = repository.findLayer(SCENE_LAYER_IDS.BASE)
      expect(baseLayer?.type).toBe('base')
      if (baseLayer?.type === 'base') {
        expect(baseLayer.surface.type).toBe('solid')
      }

      // Step 2: stripeに変更
      backgroundUsecase.selectSurface({ type: 'stripe', width1: 20, width2: 20, angle: 45 })

      const afterStripe = repository.findLayer(SCENE_LAYER_IDS.BASE)
      if (afterStripe?.type === 'base') {
        expect(afterStripe.surface).toEqual({ type: 'stripe', width1: 20, width2: 20, angle: 45 })
      }

      // Step 3: stripeのパラメータを変更
      backgroundUsecase.updateSurfaceParams({ type: 'stripe', width1: 30, angle: 90 })

      const afterUpdate = repository.findLayer(SCENE_LAYER_IDS.BASE)
      if (afterUpdate?.type === 'base') {
        expect(afterUpdate.surface).toEqual({ type: 'stripe', width1: 30, width2: 20, angle: 90 })
      }

      // 2回の変更
      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('should support switching between multiple surface types', () => {
      // solid → stripe
      backgroundUsecase.selectSurface({ type: 'stripe', width1: 20, width2: 20, angle: 45 })

      // stripe → grid
      backgroundUsecase.selectSurface({ type: 'grid', lineWidth: 2, cellSize: 30 })

      // grid → polkaDot
      backgroundUsecase.selectSurface({ type: 'polkaDot', dotRadius: 10, spacing: 40, rowOffset: 0.5 })

      // polkaDot → solid
      backgroundUsecase.selectSurface({ type: 'solid' })

      const finalLayer = repository.findLayer(SCENE_LAYER_IDS.BASE)
      if (finalLayer?.type === 'base') {
        expect(finalLayer.surface).toEqual({ type: 'solid' })
      }
    })

    it('should update color keys independently of surface', () => {
      // surfaceを変更
      backgroundUsecase.selectSurface({ type: 'stripe', width1: 20, width2: 20, angle: 45 })

      // color keyを変更
      backgroundUsecase.updateColorKey('primary', 'A')
      backgroundUsecase.updateColorKey('secondary', 'F5')

      const config = repository.get()
      expect(config.colors.background.primary).toBe('A')
      expect(config.colors.background.secondary).toBe('F5')

      // surfaceは変わらない
      const layer = repository.findLayer(SCENE_LAYER_IDS.BASE)
      if (layer?.type === 'base') {
        expect(layer.surface.type).toBe('stripe')
      }
    })
  })

  describe('Mask: surface選択 → パラメータ変更', () => {
    // NOTE: selectMaskShape and updateMaskShapeParams are now deprecated no-ops
    // Masks are now on ProcessorNodeConfig.modifiers, not on surface layers

    it('should support mask surface workflow', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      // Step 1: mask surfaceを変更
      maskUsecase.selectMidgroundSurface({ type: 'stripe', width1: 15, width2: 15, angle: 30 })

      const afterSurfaceChange = repository.findLayer(SCENE_LAYER_IDS.MASK)
      if (afterSurfaceChange?.type === 'surface') {
        expect(afterSurfaceChange.surface).toEqual({ type: 'stripe', width1: 15, width2: 15, angle: 30 })
      }

      // 1回の変更
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should update mask color keys independently', () => {
      maskUsecase.selectMidgroundSurface({ type: 'grid', lineWidth: 2, cellSize: 30 })
      maskUsecase.updateMaskColorKey('primary', 'B')
      maskUsecase.updateMaskColorKey('secondary', 'F3')

      const config = repository.get()
      expect(config.colors.mask.primary).toBe('B')
      expect(config.colors.mask.secondary).toBe('F3')
    })
  })

  describe('Background と Mask の同時操作', () => {
    it('should handle concurrent background and mask changes', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      // 同時に両方を変更
      backgroundUsecase.selectSurface({ type: 'stripe', width1: 20, width2: 20, angle: 45 })
      maskUsecase.selectMidgroundSurface({ type: 'grid', lineWidth: 2, cellSize: 30 })

      // Background
      const baseLayer = repository.findLayer(SCENE_LAYER_IDS.BASE)
      if (baseLayer?.type === 'base') {
        expect(baseLayer.surface).toEqual({ type: 'stripe', width1: 20, width2: 20, angle: 45 })
      }

      // Mask
      const maskLayer = repository.findLayer(SCENE_LAYER_IDS.MASK)
      if (maskLayer?.type === 'surface') {
        expect(maskLayer.surface).toEqual({ type: 'grid', lineWidth: 2, cellSize: 30 })
      }

      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('should maintain separate color configurations', () => {
      backgroundUsecase.updateColorKey('primary', 'A')
      backgroundUsecase.updateColorKey('secondary', 'F5')
      maskUsecase.updateMaskColorKey('primary', 'B')
      maskUsecase.updateMaskColorKey('secondary', 'F3')

      const config = repository.get()
      expect(config.colors.background).toEqual({ primary: 'A', secondary: 'F5' })
      expect(config.colors.mask).toEqual({ primary: 'B', secondary: 'F3' })
    })
  })

  describe('gradientGrain surface の検証', () => {
    it('should support gradientGrain surface with all parameters', () => {
      const gradientGrainSurface = {
        type: 'gradientGrain' as const,
        depthMapType: 'linear' as const,
        angle: 0,
        centerX: 0.5,
        centerY: 0.5,
        radialStartAngle: 0,
        radialSweepAngle: 360,
        perlinScale: 1,
        perlinOctaves: 4,
        perlinContrast: 1,
        perlinOffset: 0,
        seed: 12345,
        sparsity: 0.5,
      }

      backgroundUsecase.selectSurface(gradientGrainSurface)

      const layer = repository.findLayer(SCENE_LAYER_IDS.BASE)
      if (layer?.type === 'base') {
        expect(layer.surface).toEqual(gradientGrainSurface)
      }

      // パラメータを更新
      backgroundUsecase.updateSurfaceParams({
        type: 'gradientGrain',
        angle: 45,
        sparsity: 0.8,
        seed: 54321,
      })

      const updatedLayer = repository.findLayer(SCENE_LAYER_IDS.BASE)
      if (updatedLayer?.type === 'base' && updatedLayer.surface.type === 'gradientGrain') {
        expect(updatedLayer.surface.angle).toBe(45)
        expect(updatedLayer.surface.sparsity).toBe(0.8)
        expect(updatedLayer.surface.seed).toBe(54321)
        // 他の値は保持
        expect(updatedLayer.surface.perlinScale).toBe(1)
      }
    })
  })

  describe('surface type mismatch handling', () => {
    it('should not update when surface type does not match for background', () => {
      backgroundUsecase.selectSurface({ type: 'stripe', width1: 20, width2: 20, angle: 45 })

      // 異なるtypeでupdateを試みる
      backgroundUsecase.updateSurfaceParams({ type: 'grid', cellSize: 50 })

      const layer = repository.findLayer(SCENE_LAYER_IDS.BASE)
      if (layer?.type === 'base') {
        // stripeのまま
        expect(layer.surface).toEqual({ type: 'stripe', width1: 20, width2: 20, angle: 45 })
      }
    })
  })

  describe('subscribe通知の検証', () => {
    it('should notify with complete updated config', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      backgroundUsecase.selectSurface({ type: 'stripe', width1: 20, width2: 20, angle: 45 })

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: expect.arrayContaining([
            expect.objectContaining({
              id: SCENE_LAYER_IDS.BASE,
              surface: { type: 'stripe', width1: 20, width2: 20, angle: 45 },
            }),
          ]),
        })
      )
    })
  })
})
