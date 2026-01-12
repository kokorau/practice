/**
 * MaskUsecase
 *
 * マスク/ミッドグラウンド操作のユースケース
 * マスク形状選択、パラメータ更新、テクスチャ設定など
 */

import type { HeroViewRepository } from './ports/HeroViewRepository'
import type {
  HeroPrimitiveKey,
  SurfaceConfig,
  MaskShapeConfig,
  SurfaceLayerNodeConfig,
  MaskNodeConfig,
  GroupLayerNodeConfig,
  LayerNodeConfig,
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
 * マスク形状パラメータの更新型
 */
export type MaskShapeParamsUpdate =
  | { type: 'circle'; centerX?: number; centerY?: number; radius?: number; cutout?: boolean }
  | { type: 'rect'; left?: number; right?: number; top?: number; bottom?: number; radiusTopLeft?: number; radiusTopRight?: number; radiusBottomLeft?: number; radiusBottomRight?: number; cutout?: boolean }
  | { type: 'blob'; centerX?: number; centerY?: number; baseRadius?: number; amplitude?: number; octaves?: number; seed?: number; cutout?: boolean }
  | { type: 'perlin'; seed?: number; threshold?: number; scale?: number; octaves?: number; cutout?: boolean }
  | { type: 'linearGradient'; angle?: number; startOffset?: number; endOffset?: number; cutout?: boolean }
  | { type: 'radialGradient'; centerX?: number; centerY?: number; innerRadius?: number; outerRadius?: number; aspectRatio?: number; cutout?: boolean }
  | { type: 'boxGradient'; left?: number; right?: number; top?: number; bottom?: number; cornerRadius?: number; curve?: 'linear' | 'smooth' | 'easeIn' | 'easeOut'; cutout?: boolean }

/**
 * サーフェスパラメータの更新型（各パターンタイプに対応）
 */
export type SurfaceParamsUpdate =
  | { type: 'stripe'; width1?: number; width2?: number; angle?: number }
  | { type: 'grid'; lineWidth?: number; cellSize?: number }
  | { type: 'polkaDot'; dotRadius?: number; spacing?: number; rowOffset?: number }
  | { type: 'checker'; cellSize?: number; angle?: number }

// ============================================================
// Interface
// ============================================================

/**
 * マスク操作のユースケースインターフェース
 */
export interface MaskUsecase {
  // ----------------------------------------
  // マスク形状操作
  // ----------------------------------------

  /**
   * マスク形状を選択（MaskShapeConfigを直接設定）
   * @param shape マスク形状設定
   */
  selectMaskShape(shape: MaskShapeConfig): void

  /**
   * マスク形状パラメータを更新
   * @param params 更新するパラメータ
   */
  updateMaskShapeParams(params: MaskShapeParamsUpdate): void

  // ----------------------------------------
  // マスクサーフェス/テクスチャ操作
  // ----------------------------------------

  /**
   * ミッドグラウンドサーフェスを選択
   * @param surface サーフェス設定
   */
  selectMidgroundSurface(surface: SurfaceConfig): void

  /**
   * マスクのカラーキーを更新
   * @param key 'primary' または 'secondary'
   * @param value パレットキーまたは 'auto'
   */
  updateMaskColorKey(key: 'primary' | 'secondary', value: HeroPrimitiveKey | 'auto'): void

  /**
   * 画像をアップロードしてマスクサーフェスに設定
   * @param file アップロードする画像ファイル
   */
  uploadMaskImage(file: File): Promise<void>

  /**
   * マスク画像をクリア
   */
  clearMaskImage(): void

  /**
   * ランダム画像を読み込んでマスクサーフェスに設定
   * @param query 検索クエリ（省略可）
   */
  loadRandomMaskImage(query?: string): Promise<void>

  /**
   * サーフェスパラメータを更新
   * @param params 更新するパラメータ
   */
  updateSurfaceParams(params: SurfaceParamsUpdate): void
}

// ============================================================
// Constants
// ============================================================

const MASK_LAYER_ID = 'mask'

// ============================================================
// Implementation
// ============================================================

/**
 * 依存性
 */
export interface MaskUsecaseDeps {
  repository: HeroViewRepository
  imageUpload?: ImageUploadPort
}

/**
 * Figma-styleマスクノードとその親グループを検索する結果
 */
interface FigmaMaskResult {
  maskNode: MaskNodeConfig
  parentGroup: GroupLayerNodeConfig
  groupId: string
}

/**
 * Figma-styleマスクノードを検索するヘルパー
 * グループ内の最初のMaskNodeを探す
 */
const findFigmaMask = (layers: LayerNodeConfig[]): FigmaMaskResult | undefined => {
  for (const layer of layers) {
    if (layer.type === 'group' && 'children' in layer && layer.children) {
      const maskNode = layer.children.find((c): c is MaskNodeConfig => c.type === 'mask')
      if (maskNode) {
        return {
          maskNode,
          parentGroup: layer,
          groupId: layer.id,
        }
      }
    }
  }
  return undefined
}

/**
 * マスクレイヤーを取得するヘルパー (レガシー: processors方式)
 */
const getMaskLayer = (repository: HeroViewRepository): SurfaceLayerNodeConfig | undefined => {
  const layer = repository.findLayer(MASK_LAYER_ID)
  if (layer?.type === 'surface') {
    return layer
  }
  return undefined
}

/**
 * マスクprocessorを取得するヘルパー (レガシー)
 * @deprecated Use findFigmaMask for new Figma-style structure
 */
const getMaskProcessor = (layer: SurfaceLayerNodeConfig) => {
  return (layer.processors ?? []).find(p => p.type === 'mask')
}

/**
 * MaskUsecaseを作成
 */
export const createMaskUsecase = (deps: MaskUsecaseDeps): MaskUsecase => {
  const { repository, imageUpload } = deps

  /**
   * グループ内のMaskNodeを更新するヘルパー
   */
  const updateMaskNodeInGroup = (
    groupId: string,
    maskId: string,
    updates: Partial<MaskNodeConfig>
  ): void => {
    const config = repository.get()
    const updatedLayers = config.layers.map(layer => {
      if (layer.type !== 'group' || layer.id !== groupId) return layer
      const updatedChildren = layer.children.map(child => {
        if (child.type !== 'mask' || child.id !== maskId) return child
        return { ...child, ...updates }
      })
      return { ...layer, children: updatedChildren }
    })
    repository.set({ ...config, layers: updatedLayers })
  }

  return {
    // ----------------------------------------
    // マスク形状操作
    // ----------------------------------------

    selectMaskShape(shape: MaskShapeConfig): void {
      const config = repository.get()

      // Try Figma-style first (MaskNode in group)
      const figmaMask = findFigmaMask(config.layers)
      if (figmaMask) {
        updateMaskNodeInGroup(figmaMask.groupId, figmaMask.maskNode.id, { shape })
        return
      }

      // Legacy fallback: processor in surface layer
      const layer = getMaskLayer(repository)
      if (!layer) return

      const maskProcessor = getMaskProcessor(layer)
      if (!maskProcessor || maskProcessor.type !== 'mask') return

      const updatedProcessors = (layer.processors ?? []).map(p =>
        p.type === 'mask' ? { ...p, shape } : p
      )

      repository.updateLayer(MASK_LAYER_ID, { processors: updatedProcessors })
    },

    updateMaskShapeParams(params: MaskShapeParamsUpdate): void {
      const config = repository.get()

      // Try Figma-style first (MaskNode in group)
      const figmaMask = findFigmaMask(config.layers)
      if (figmaMask) {
        const currentShape = figmaMask.maskNode.shape
        if (currentShape.type !== params.type) return

        const newShape = { ...currentShape, ...params } as MaskShapeConfig
        updateMaskNodeInGroup(figmaMask.groupId, figmaMask.maskNode.id, { shape: newShape })
        return
      }

      // Legacy fallback: processor in surface layer
      const layer = getMaskLayer(repository)
      if (!layer) return

      const maskProcessor = getMaskProcessor(layer)
      if (!maskProcessor || maskProcessor.type !== 'mask') return
      if (maskProcessor.shape.type !== params.type) return

      const newShape = { ...maskProcessor.shape, ...params } as MaskShapeConfig
      const updatedProcessors = (layer.processors ?? []).map(p =>
        p.type === 'mask' ? { ...p, shape: newShape } : p
      )

      repository.updateLayer(MASK_LAYER_ID, { processors: updatedProcessors })
    },

    // ----------------------------------------
    // マスクサーフェス/テクスチャ操作
    // ----------------------------------------

    selectMidgroundSurface(surface: SurfaceConfig): void {
      repository.updateLayer(MASK_LAYER_ID, { surface })
    },

    updateMaskColorKey(key: 'primary' | 'secondary', value: HeroPrimitiveKey | 'auto'): void {
      const config = repository.get()
      const currentColors = config.colors.mask

      repository.set({
        ...config,
        colors: {
          ...config.colors,
          mask: {
            ...currentColors,
            [key]: value,
          },
        },
      })
    },

    async uploadMaskImage(file: File): Promise<void> {
      if (!imageUpload) {
        throw new Error('ImageUploadPort is not configured')
      }

      const imageId = await imageUpload.upload(file)
      repository.updateLayer(MASK_LAYER_ID, {
        surface: { type: 'image', imageId },
      })
    },

    clearMaskImage(): void {
      repository.updateLayer(MASK_LAYER_ID, {
        surface: { type: 'solid' },
      })
    },

    async loadRandomMaskImage(query?: string): Promise<void> {
      if (!imageUpload) {
        throw new Error('ImageUploadPort is not configured')
      }

      const file = await imageUpload.fetchRandom(query)
      const imageId = await imageUpload.upload(file)
      repository.updateLayer(MASK_LAYER_ID, {
        surface: { type: 'image', imageId },
      })
    },

    updateSurfaceParams(params: SurfaceParamsUpdate): void {
      const layer = getMaskLayer(repository)
      if (!layer) return

      const currentSurface = layer.surface
      if (currentSurface.type !== params.type) return

      const newSurface = { ...currentSurface, ...params } as SurfaceConfig
      repository.updateLayer(MASK_LAYER_ID, { surface: newSurface })
    },
  }
}
