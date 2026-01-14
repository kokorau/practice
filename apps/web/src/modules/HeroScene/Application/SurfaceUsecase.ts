/**
 * SurfaceUsecase
 *
 * 統合サーフェス操作のユースケース
 * 選択中のレイヤーに対してサーフェス/マスク操作を行う
 */

import type { HeroViewRepository } from './ports/HeroViewRepository'
import type {
  HeroPrimitiveKey,
  SurfaceConfig,
  MaskShapeConfig,
  LayerNodeConfig,
  SurfaceLayerNodeConfig,
  DepthMapType,
} from '../Domain/HeroViewConfig'

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

/**
 * マスク形状パラメータの更新型
 */
export type MaskShapeParamsUpdate =
  | { type: 'circle'; centerX?: number; centerY?: number; radius?: number; cutout?: boolean }
  | { type: 'rect'; left?: number; right?: number; top?: number; bottom?: number; radiusTopLeft?: number; radiusTopRight?: number; radiusBottomLeft?: number; radiusBottomRight?: number; rotation?: number; perspectiveX?: number; perspectiveY?: number; cutout?: boolean }
  | { type: 'blob'; centerX?: number; centerY?: number; baseRadius?: number; amplitude?: number; octaves?: number; seed?: number; cutout?: boolean }
  | { type: 'perlin'; seed?: number; threshold?: number; scale?: number; octaves?: number; cutout?: boolean }
  | { type: 'linearGradient'; angle?: number; startOffset?: number; endOffset?: number; cutout?: boolean }
  | { type: 'radialGradient'; centerX?: number; centerY?: number; innerRadius?: number; outerRadius?: number; aspectRatio?: number; cutout?: boolean }
  | { type: 'boxGradient'; left?: number; right?: number; top?: number; bottom?: number; cornerRadius?: number; curve?: 'linear' | 'smooth' | 'easeIn' | 'easeOut'; cutout?: boolean }

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
  selectSurface(surface: SurfaceConfig): void

  /**
   * 指定レイヤーのサーフェスを選択（明示的な制御用）
   * @param layerId レイヤーID
   * @param surface サーフェス設定
   */
  selectSurfaceForLayer(layerId: string, surface: SurfaceConfig): void

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
  // Mask Shape Operations (surface layers only)
  // ----------------------------------------

  /**
   * 現在のレイヤーがマスク形状編集可能かどうか
   */
  canEditMaskShape(): boolean

  /**
   * マスク形状を選択（surfaceレイヤーのみ）
   * @param shape マスク形状設定
   * @returns 操作が成功したかどうか
   */
  selectMaskShape(shape: MaskShapeConfig): boolean

  /**
   * マスク形状パラメータを更新
   * @param params 更新するパラメータ
   * @returns 操作が成功したかどうか
   */
  updateMaskShapeParams(params: MaskShapeParamsUpdate): boolean

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
 * サーフェスレイヤーを取得するヘルパー
 */
const getSurfaceLayer = (
  repository: HeroViewRepository,
  layerId: string
): SurfaceLayerNodeConfig | undefined => {
  const layer = repository.findLayer(layerId)
  if (layer?.type === 'surface') {
    return layer
  }
  return undefined
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

    selectSurface(surface: SurfaceConfig): void {
      const layerId = getSelectedLayerId()
      if (!layerId) return
      repository.updateLayer(layerId, { surface })
    },

    selectSurfaceForLayer(layerId: string, surface: SurfaceConfig): void {
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
      if (currentSurface.type !== params.type) return

      const newSurface = { ...currentSurface, ...params } as SurfaceConfig
      repository.updateLayer(layerId, { surface: newSurface })
    },

    updateColorKey(key: 'primary' | 'secondary', value: HeroPrimitiveKey | 'auto'): void {
      const layer = getSelectedLayer()
      if (!layer) return

      const colorPath = getColorPath(layer)
      const config = repository.get()
      const currentColors = config.colors[colorPath]

      repository.set({
        ...config,
        colors: {
          ...config.colors,
          [colorPath]: {
            ...currentColors,
            [key]: value,
          },
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
        surface: { type: 'image', imageId },
      })
    },

    clearImage(): void {
      const layerId = getSelectedLayerId()
      if (!layerId) return

      repository.updateLayer(layerId, {
        surface: { type: 'solid' },
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
        surface: { type: 'image', imageId },
      })
    },

    // ----------------------------------------
    // Mask Shape Operations
    // ----------------------------------------

    canEditMaskShape(): boolean {
      const layerId = getSelectedLayerId()
      if (!layerId) return false

      const layer = getSurfaceLayer(repository, layerId)
      if (!layer) return false

      // @deprecated: Masks are now on ProcessorNodeConfig.modifiers
      // This function always returns false now
      return false
    },

    selectMaskShape(_shape: MaskShapeConfig): boolean {
      // @deprecated: Masks are now on ProcessorNodeConfig.modifiers
      console.warn('SurfaceUsecase.selectMaskShape is deprecated. Use processor nodes instead.')
      return false
    },

    updateMaskShapeParams(_params: MaskShapeParamsUpdate): boolean {
      // @deprecated: Masks are now on ProcessorNodeConfig.modifiers
      console.warn('SurfaceUsecase.updateMaskShapeParams is deprecated. Use processor nodes instead.')
      return false
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
