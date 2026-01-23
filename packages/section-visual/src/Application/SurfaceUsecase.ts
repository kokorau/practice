/**
 * SurfaceUsecase
 *
 * 統合サーフェス操作のユースケース
 * 選択中のレイヤーに対してサーフェス/マスク操作を行う
 */

import type { HeroViewRepository } from './ports/HeroViewRepository'
import type {
  HeroPrimitiveKey,
  NormalizedSurfaceConfig,
  LayerNodeConfig,
  DepthMapType,
  SurfaceColorsConfig,
  ProcessorNodeConfig,
  MaskProcessorConfig,
  MaskShapeTypeId,
} from '../Domain/HeroViewConfig'
import { DEFAULT_LAYER_BACKGROUND_COLORS, DEFAULT_LAYER_MASK_COLORS } from '../Domain/HeroViewConfig'
import type { PropertyValue } from '../Domain/SectionVisual'
import { $PropertyValue } from '../Domain/SectionVisual'

/**
 * Convert raw param values to PropertyValue format
 */
function toPropertyValueParams(
  params: Record<string, string | number | boolean | undefined>
): Record<string, PropertyValue> {
  const result: Record<string, PropertyValue> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      result[key] = $PropertyValue.static(value)
    }
  }
  return result
}

// ============================================================
// Types
// ============================================================

/**
 * 画像アップロード用のポート
 */
export interface ImageUploadPort {
  /**
   * ファイルをアップロードしてIDを取得
   */
  upload(file: File): Promise<string>

  /**
   * ランダム画像を取得
   */
  fetchRandom(query?: string): Promise<File>
}

/**
 * 選択状態を取得するポート
 */
export interface SelectionPort {
  /**
   * 選択中のレイヤーIDを取得
   */
  getSelectedLayerId(): string | null
}

/**
 * サーフェスパラメータの更新型（各パターンタイプに対応）
 * id はサーフェスタイプの識別子（NormalizedSurfaceConfig.id と対応）
 */
export type SurfaceParamsUpdate =
  | { id: 'stripe'; width1?: number; width2?: number; angle?: number }
  | { id: 'grid'; lineWidth?: number; cellSize?: number }
  | { id: 'polkaDot'; dotRadius?: number; spacing?: number; rowOffset?: number }
  | { id: 'checker'; cellSize?: number; angle?: number }
  | {
      id: 'gradientGrain'
      depthMapType?: DepthMapType
      angle?: number
      centerX?: number
      centerY?: number
      radialStartAngle?: number
      radialSweepAngle?: number
      perlinScale?: number
      perlinOctaves?: number
      perlinContrast?: number
      perlinOffset?: number
      seed?: number
      sparsity?: number
    }

/**
 * マスク形状パラメータの更新型
 * id はマスク形状タイプの識別子
 */
export type MaskShapeParamsUpdate = {
  id: MaskShapeTypeId
  [key: string]: string | number | boolean | undefined
}

// ============================================================
// Interface
// ============================================================

/**
 * 統合サーフェス操作のユースケースインターフェース
 */
export interface SurfaceUsecase {
  // ----------------------------------------
  // Surface Operations (all layers)
  // ----------------------------------------

  /**
   * 選択中のレイヤーのサーフェスを選択
   * @param surface サーフェス設定
   */
  selectSurface(surface: NormalizedSurfaceConfig): void

  /**
   * 指定レイヤーのサーフェスを選択（明示的な制御用）
   * @param layerId レイヤーID
   * @param surface サーフェス設定
   */
  selectSurfaceForLayer(layerId: string, surface: NormalizedSurfaceConfig): void

  /**
   * サーフェスパラメータを更新
   * @param params 更新するパラメータ
   */
  updateSurfaceParams(params: SurfaceParamsUpdate): void

  /**
   * 指定レイヤーのサーフェスパラメータを更新
   * @param layerId レイヤーID
   * @param params 更新するパラメータ
   */
  updateSurfaceParamsForLayer(layerId: string, params: SurfaceParamsUpdate): void

  /**
   * 指定プロセッサーレイヤーのマスク形状パラメータを更新
   * @param processorId プロセッサーレイヤーID
   * @param params 更新するパラメータ
   */
  updateMaskShapeParams(processorId: string, params: MaskShapeParamsUpdate): void

  /**
   * カラーキーを更新
   * レイヤータイプに応じてbackgroundまたはmaskの色設定を更新
   * @param key 'primary' または 'secondary'
   * @param value パレットキーまたは 'auto'
   */
  updateColorKey(key: 'primary' | 'secondary', value: HeroPrimitiveKey | 'auto'): void

  // ----------------------------------------
  // Query Methods
  // ----------------------------------------

  /**
   * 選択中のレイヤーを取得
   */
  getSelectedLayer(): LayerNodeConfig | null

  /**
   * 選択中のレイヤーのカラー設定パスを取得
   */
  getColorConfigPath(): 'background' | 'mask' | null
}

// ============================================================
// Implementation
// ============================================================

/**
 * 依存性
 */
export interface SurfaceUsecaseDeps {
  repository: HeroViewRepository
  selection: SelectionPort
  imageUpload?: ImageUploadPort
}

/**
 * SurfaceUsecaseを作成
 */
export const createSurfaceUsecase = (deps: SurfaceUsecaseDeps): SurfaceUsecase => {
  const { repository, selection } = deps

  /**
   * 選択中のレイヤーIDを取得するヘルパー
   */
  const getSelectedLayerId = (): string | null => {
    return selection.getSelectedLayerId()
  }

  /**
   * 選択中のレイヤーを取得するヘルパー
   */
  const getSelectedLayer = (): LayerNodeConfig | null => {
    const layerId = getSelectedLayerId()
    if (!layerId) return null
    return repository.findLayer(layerId) ?? null
  }

  /**
   * レイヤータイプに応じたカラー設定パスを取得
   */
  const getColorPath = (layer: LayerNodeConfig): 'background' | 'mask' => {
    return layer.type === 'base' ? 'background' : 'mask'
  }

  return {
    // ----------------------------------------
    // Surface Operations
    // ----------------------------------------

    selectSurface(surface: NormalizedSurfaceConfig): void {
      const layerId = getSelectedLayerId()
      if (!layerId) return
      repository.updateLayer(layerId, { surface })
    },

    selectSurfaceForLayer(layerId: string, surface: NormalizedSurfaceConfig): void {
      repository.updateLayer(layerId, { surface })
    },

    updateSurfaceParams(params: SurfaceParamsUpdate): void {
      const layerId = getSelectedLayerId()
      if (!layerId) return
      this.updateSurfaceParamsForLayer(layerId, params)
    },

    updateSurfaceParamsForLayer(layerId: string, params: SurfaceParamsUpdate): void {
      const layer = repository.findLayer(layerId)
      if (!layer) return

      // base or surface layer のみ対応
      if (layer.type !== 'base' && layer.type !== 'surface') return

      const currentSurface = layer.surface
      if (currentSurface.id !== params.id) return

      // Extract params without 'id' field and convert to PropertyValue
      const { id: _id, ...updateParams } = params
      const newSurface: NormalizedSurfaceConfig = {
        id: currentSurface.id,
        params: { ...currentSurface.params, ...toPropertyValueParams(updateParams) },
      }
      repository.updateLayer(layerId, { surface: newSurface })
    },

    updateMaskShapeParams(processorId: string, params: MaskShapeParamsUpdate): void {
      const layer = repository.findLayer(processorId)
      if (!layer) return

      // processor layer のみ対応
      if (layer.type !== 'processor') return

      const processorLayer = layer as ProcessorNodeConfig
      const maskModifierIndex = processorLayer.modifiers.findIndex(
        (m): m is MaskProcessorConfig => m.type === 'mask'
      )
      if (maskModifierIndex === -1) return

      const maskModifier = processorLayer.modifiers[maskModifierIndex] as MaskProcessorConfig
      const currentShape = maskModifier.shape
      if (currentShape.id !== params.id) return

      // Extract params without 'id' field and convert to PropertyValue
      const { id: _id, ...updateParams } = params
      const newShape = {
        id: currentShape.id,
        params: { ...currentShape.params, ...toPropertyValueParams(updateParams) },
      }

      // Update modifiers array
      const newModifiers = [...processorLayer.modifiers]
      newModifiers[maskModifierIndex] = {
        ...maskModifier,
        shape: newShape,
      }

      repository.updateLayer(processorId, { modifiers: newModifiers } as Partial<ProcessorNodeConfig>)
    },

    updateColorKey(key: 'primary' | 'secondary', value: HeroPrimitiveKey | 'auto'): void {
      const layer = getSelectedLayer()
      if (!layer) return
      if (layer.type !== 'surface' && layer.type !== 'base') return

      // Get default colors based on layer type
      const colorPath = getColorPath(layer)
      const defaults = colorPath === 'background' ? DEFAULT_LAYER_BACKGROUND_COLORS : DEFAULT_LAYER_MASK_COLORS
      const currentColors: SurfaceColorsConfig = layer.colors ?? defaults

      // Update the layer's colors field
      const layerId = selection.getSelectedLayerId()
      if (!layerId) return

      repository.updateLayer(layerId, {
        colors: {
          ...currentColors,
          [key]: value,
        },
      })
    },

    // ----------------------------------------
    // Query Methods
    // ----------------------------------------

    getSelectedLayer,

    getColorConfigPath(): 'background' | 'mask' | null {
      const layer = getSelectedLayer()
      if (!layer) return null
      return getColorPath(layer)
    },
  }
}
