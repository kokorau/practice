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
} from '../Domain/HeroViewConfig'
import { DEFAULT_LAYER_BACKGROUND_COLORS, DEFAULT_LAYER_MASK_COLORS } from '../Domain/HeroViewConfig'

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
 */
export type SurfaceParamsUpdate =
  | { type: 'stripe'; width1?: number; width2?: number; angle?: number }
  | { type: 'grid'; lineWidth?: number; cellSize?: number }
  | { type: 'polkaDot'; dotRadius?: number; spacing?: number; rowOffset?: number }
  | { type: 'checker'; cellSize?: number; angle?: number }
  | {
      type: 'gradientGrain'
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
   * カラーキーを更新
   * レイヤータイプに応じてbackgroundまたはmaskの色設定を更新
   * @param key 'primary' または 'secondary'
   * @param value パレットキーまたは 'auto'
   */
  updateColorKey(key: 'primary' | 'secondary', value: HeroPrimitiveKey | 'auto'): void

  /**
   * 画像をアップロードしてサーフェスに設定
   * @param file アップロードする画像ファイル
   */
  uploadImage(file: File): Promise<void>

  /**
   * 画像をクリア
   */
  clearImage(): void

  /**
   * ランダム画像を読み込んでサーフェスに設定
   * @param query 検索クエリ（省略可）
   */
  loadRandomImage(query?: string): Promise<void>

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
  const { repository, selection, imageUpload } = deps

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

      const layer = repository.findLayer(layerId)
      if (!layer) return

      // base or surface layer のみ対応
      if (layer.type !== 'base' && layer.type !== 'surface') return

      const currentSurface = layer.surface
      if (currentSurface.id !== params.type) return

      const newSurface: NormalizedSurfaceConfig = {
        id: currentSurface.id,
        params: { ...currentSurface.params, ...params },
      }
      // Remove 'type' from params as it's now in 'id'
      delete (newSurface.params as Record<string, unknown>).type
      repository.updateLayer(layerId, { surface: newSurface })
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

    async uploadImage(file: File): Promise<void> {
      if (!imageUpload) {
        throw new Error('ImageUploadPort is not configured')
      }

      const layerId = getSelectedLayerId()
      if (!layerId) return

      const imageId = await imageUpload.upload(file)
      repository.updateLayer(layerId, {
        surface: { id: 'image', params: { imageId } },
      })
    },

    clearImage(): void {
      const layerId = getSelectedLayerId()
      if (!layerId) return

      repository.updateLayer(layerId, {
        surface: { id: 'solid', params: {} },
      })
    },

    async loadRandomImage(query?: string): Promise<void> {
      if (!imageUpload) {
        throw new Error('ImageUploadPort is not configured')
      }

      const layerId = getSelectedLayerId()
      if (!layerId) return

      const file = await imageUpload.fetchRandom(query)
      const imageId = await imageUpload.upload(file)
      repository.updateLayer(layerId, {
        surface: { id: 'image', params: { imageId } },
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
