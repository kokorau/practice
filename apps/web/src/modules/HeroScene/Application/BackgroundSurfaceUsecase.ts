/**
 * BackgroundSurfaceUsecase
 *
 * 背景サーフェス操作のユースケース
 * パターン選択、カラー設定、画像アップロードなど
 */

import type { HeroViewRepository } from './ports/HeroViewRepository'
import type { HeroPrimitiveKey, SurfaceConfig, DepthMapType } from '../Domain/HeroViewConfig'

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
 * 背景サーフェス操作のユースケースインターフェース
 */
export interface BackgroundSurfaceUsecase {
  /**
   * パターンを選択（インデックスからサーフェス設定に変換）
   * @param surface サーフェス設定
   */
  selectSurface(surface: SurfaceConfig): void

  /**
   * 背景のカラーキーを更新
   * @param key 'primary' または 'secondary'
   * @param value パレットキーまたは 'auto'
   */
  updateColorKey(key: 'primary' | 'secondary', value: HeroPrimitiveKey | 'auto'): void

  /**
   * 画像をアップロードして背景に設定
   * @param file アップロードする画像ファイル
   */
  uploadImage(file: File): Promise<void>

  /**
   * 背景画像をクリア
   */
  clearImage(): void

  /**
   * ランダム画像を読み込んで背景に設定
   * @param query 検索クエリ（省略可）
   */
  loadRandomImage(query?: string): Promise<void>

  /**
   * サーフェスパラメータを更新
   * @param params 更新するパラメータ
   */
  updateSurfaceParams(params: SurfaceParamsUpdate): void
}

// ============================================================
// Constants
// ============================================================

const BACKGROUND_LAYER_ID = 'base'

// ============================================================
// Implementation
// ============================================================

/**
 * 依存性
 */
export interface BackgroundSurfaceUsecaseDeps {
  repository: HeroViewRepository
  imageUpload?: ImageUploadPort
}

/**
 * BackgroundSurfaceUsecaseを作成
 */
export const createBackgroundSurfaceUsecase = (
  deps: BackgroundSurfaceUsecaseDeps
): BackgroundSurfaceUsecase => {
  const { repository, imageUpload } = deps

  return {
    selectSurface(surface: SurfaceConfig): void {
      repository.updateLayer(BACKGROUND_LAYER_ID, { surface })
    },

    updateColorKey(key: 'primary' | 'secondary', value: HeroPrimitiveKey | 'auto'): void {
      const config = repository.get()
      const currentColors = config.colors.background

      repository.set({
        ...config,
        colors: {
          ...config.colors,
          background: {
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

      const imageId = await imageUpload.upload(file)
      repository.updateLayer(BACKGROUND_LAYER_ID, {
        surface: { type: 'image', imageId },
      })
    },

    clearImage(): void {
      repository.updateLayer(BACKGROUND_LAYER_ID, {
        surface: { type: 'solid' },
      })
    },

    async loadRandomImage(query?: string): Promise<void> {
      if (!imageUpload) {
        throw new Error('ImageUploadPort is not configured')
      }

      const file = await imageUpload.fetchRandom(query)
      const imageId = await imageUpload.upload(file)
      repository.updateLayer(BACKGROUND_LAYER_ID, {
        surface: { type: 'image', imageId },
      })
    },

    updateSurfaceParams(params: SurfaceParamsUpdate): void {
      const layer = repository.findLayer(BACKGROUND_LAYER_ID)
      if (!layer || layer.type !== 'base') return

      const currentSurface = layer.surface
      if (currentSurface.type !== params.type) return

      // 型を維持しながらマージ
      const newSurface = { ...currentSurface, ...params } as SurfaceConfig
      repository.updateLayer(BACKGROUND_LAYER_ID, { surface: newSurface })
    },
  }
}
