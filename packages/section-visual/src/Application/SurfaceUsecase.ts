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
  SurfaceLayerNodeConfig,
  BaseLayerNodeConfig,
  ProcessorNodeConfig,
} from '../Domain/HeroViewConfig'
import { normalizeSurfaceConfig, normalizeMaskConfig, isMaskProcessorConfig } from '../Domain/HeroViewConfig'
import { flattenLayersInTree, isProcessorLayerConfig } from '../Domain/LayerTreeOps'
import type { ColorValue } from '../Domain/SectionVisual'
import { fromCustomSurfaceParams } from '../Domain/SurfaceMapper'
import { fromCustomMaskShapeParams } from '../Domain/MaskShapeMapper'
import type { CustomSurfaceParams, CustomMaskShapeParams } from '../types/HeroSceneState'
import type { PropertyValue } from '../Domain/SectionVisual'
import { $PropertyValue } from '../Domain/SectionVisual'

/**
 * Convert raw param values to PropertyValue format
 * Handles primitive values and ColorValue objects
 */
function toPropertyValueParams(
  params: Record<string, string | number | boolean | ColorValue | undefined>
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
 * Common color fields for all surface types
 */
interface SurfaceColorParams {
  color1?: ColorValue
  color2?: ColorValue
}

/**
 * サーフェスパラメータの更新型（各パターンタイプに対応）
 * id はサーフェスタイプの識別子（NormalizedSurfaceConfig.id と対応）
 * All surface types include optional color1/color2 fields
 */
export type SurfaceParamsUpdate =
  | ({ id: 'solid' } & SurfaceColorParams)
  | ({ id: 'stripe'; width1?: number; width2?: number; angle?: number } & SurfaceColorParams)
  | ({ id: 'grid'; lineWidth?: number; cellSize?: number } & SurfaceColorParams)
  | ({ id: 'polkaDot'; dotRadius?: number; spacing?: number; rowOffset?: number } & SurfaceColorParams)
  | ({ id: 'checker'; cellSize?: number; angle?: number } & SurfaceColorParams)
  | ({ id: 'gradientGrainLinear'; angle?: number; centerX?: number; centerY?: number; seed?: number; sparsity?: number } & SurfaceColorParams)
  | ({ id: 'gradientGrainCircular'; centerX?: number; centerY?: number; circularInvert?: boolean; seed?: number; sparsity?: number } & SurfaceColorParams)
  | ({ id: 'gradientGrainRadial'; centerX?: number; centerY?: number; radialStartAngle?: number; radialSweepAngle?: number; seed?: number; sparsity?: number } & SurfaceColorParams)
  | ({ id: 'gradientGrainPerlin'; perlinScale?: number; perlinOctaves?: number; perlinContrast?: number; perlinOffset?: number; seed?: number; sparsity?: number } & SurfaceColorParams)
  | ({ id: 'gradientGrainCurl'; perlinScale?: number; perlinOctaves?: number; perlinContrast?: number; perlinOffset?: number; curlIntensity?: number; seed?: number; sparsity?: number } & SurfaceColorParams)
  | ({ id: 'gradientGrainSimplex'; simplexScale?: number; simplexOctaves?: number; simplexContrast?: number; simplexOffset?: number; seed?: number; sparsity?: number } & SurfaceColorParams)
  | ({ id: 'triangle'; size?: number; angle?: number } & SurfaceColorParams)
  | ({ id: 'hexagon'; size?: number; angle?: number } & SurfaceColorParams)
  | ({ id: 'asanoha'; size?: number; lineWidth?: number } & SurfaceColorParams)
  | ({ id: 'seigaiha'; radius?: number; rings?: number; lineWidth?: number } & SurfaceColorParams)
  | ({ id: 'wave'; amplitude?: number; wavelength?: number; thickness?: number; angle?: number } & SurfaceColorParams)
  | ({ id: 'scales'; size?: number; overlap?: number; angle?: number } & SurfaceColorParams)
  | ({ id: 'ogee'; width?: number; height?: number; lineWidth?: number } & SurfaceColorParams)
  | ({ id: 'sunburst'; rays?: number; centerX?: number; centerY?: number; twist?: number } & SurfaceColorParams)
  | ({ id: 'paperTexture'; fiberScale?: number; fiberStrength?: number; fiberWarp?: number; grainDensity?: number; grainSize?: number; bumpStrength?: number; lightAngle?: number; seed?: number } & SurfaceColorParams)

/**
 * @deprecated Shape-based masks are no longer supported.
 * Use children-based masks instead.
 */
export type MaskShapeParamsUpdate = {
  id: string
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

  // ----------------------------------------
  // CustomParams-based Operations (for UI binding)
  // ----------------------------------------

  /**
   * CustomSurfaceParams からサーフェスを設定
   * @param layerId レイヤーID
   * @param params カスタムサーフェスパラメータ
   */
  setSurfaceFromCustomParams(layerId: string, params: CustomSurfaceParams): void

  /**
   * CustomMaskShapeParams からマスク形状を設定
   * @param params カスタムマスク形状パラメータ
   */
  setMaskShapeFromCustomParams(params: CustomMaskShapeParams): void

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
 * 最初のMaskModifierを持つProcessorを検索
 */
function findFirstMaskModifier(repository: HeroViewRepository): { processorId: string | null; modifierIndex: number } {
  const config = repository.get()
  for (const layer of flattenLayersInTree(config.layers)) {
    if (isProcessorLayerConfig(layer)) {
      const processorLayer = layer as ProcessorNodeConfig
      const modifierIndex = processorLayer.modifiers.findIndex(isMaskProcessorConfig)
      if (modifierIndex !== -1) {
        return { processorId: layer.id, modifierIndex }
      }
    }
  }
  return { processorId: null, modifierIndex: -1 }
}

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

    /**
     * @deprecated Shape-based masks are no longer supported.
     * Use children-based masks instead.
     */
    updateMaskShapeParams(_processorId: string, _params: MaskShapeParamsUpdate): void {
      console.warn('[SurfaceUsecase] updateMaskShapeParams is deprecated. Shape-based masks are no longer supported.')
      // No-op: Shape-based masks are replaced with children-based masks
    },

    setSurfaceFromCustomParams(layerId: string, params: CustomSurfaceParams): void {
      const surface = normalizeSurfaceConfig(fromCustomSurfaceParams(params))
      repository.updateLayer(layerId, { surface })
    },

    setMaskShapeFromCustomParams(params: CustomMaskShapeParams): void {
      // CustomMaskShapeParams → MaskShapeConfig → NormalizedMaskConfig
      const maskShapeConfig = fromCustomMaskShapeParams(params)
      const shape = normalizeMaskConfig(maskShapeConfig)

      // プロセッサレイヤーとmodifierIndexを特定
      const { processorId, modifierIndex } = findFirstMaskModifier(repository)
      if (processorId === null || modifierIndex === -1) return

      repository.updateMaskShape(processorId, modifierIndex, shape)
    },

    updateColorKey(key: 'primary' | 'secondary', value: ColorValue): void {
      const layer = getSelectedLayer()
      if (!layer) return
      if (layer.type !== 'surface' && layer.type !== 'base') return

      // Map primary/secondary to color1/color2 in params
      const paramKey = key === 'primary' ? 'color1' : 'color2'

      // Update the layer's surface.params with new color
      const layerId = selection.getSelectedLayerId()
      if (!layerId) return

      const surfaceLayer = layer as SurfaceLayerNodeConfig | BaseLayerNodeConfig
      repository.updateLayer(layerId, {
        surface: {
          ...surfaceLayer.surface,
          params: {
            ...surfaceLayer.surface.params,
            [paramKey]: $PropertyValue.static(value),
          },
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
