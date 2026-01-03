/**
 * HeroViewConfig
 *
 * HeroView の完全な状態を表す統合インターフェース
 * - 外部参照なし（fontId, imageId は文字列識別子）
 * - JSON.stringify 可能（保存・復元可能）
 * - これだけあれば状態を完全に復元可能
 */

import type { LayerFilterConfig } from './FilterSchema'

// ============================================================
// Viewport
// ============================================================

export interface ViewportConfig {
  width: number
  height: number
}

// ============================================================
// Surface Config (背景・マスク共通のテクスチャパターン)
// ============================================================

export interface StripeSurfaceConfig {
  type: 'stripe'
  width1: number
  width2: number
  angle: number
}

export interface GridSurfaceConfig {
  type: 'grid'
  lineWidth: number
  cellSize: number
}

export interface PolkaDotSurfaceConfig {
  type: 'polkaDot'
  dotRadius: number
  spacing: number
  rowOffset: number
}

export interface CheckerSurfaceConfig {
  type: 'checker'
  cellSize: number
  angle: number
}

export interface SolidSurfaceConfig {
  type: 'solid'
}

export interface ImageSurfaceConfig {
  type: 'image'
  /** 画像の識別子（URL or asset ID） */
  imageId: string
}

/** 背景用サーフェス（solid, checker を含む） */
export type BackgroundSurfaceConfig =
  | SolidSurfaceConfig
  | StripeSurfaceConfig
  | GridSurfaceConfig
  | PolkaDotSurfaceConfig
  | CheckerSurfaceConfig
  | ImageSurfaceConfig

/** マスク用サーフェス */
export type MaskSurfaceConfig =
  | SolidSurfaceConfig
  | StripeSurfaceConfig
  | GridSurfaceConfig
  | PolkaDotSurfaceConfig
  | CheckerSurfaceConfig
  | ImageSurfaceConfig

// ============================================================
// Mask Shape Config
// ============================================================

export interface CircleMaskShapeConfig {
  type: 'circle'
  centerX: number
  centerY: number
  radius: number
  cutout: boolean
}

export interface RectMaskShapeConfig {
  type: 'rect'
  left: number
  right: number
  top: number
  bottom: number
  radiusTopLeft: number
  radiusTopRight: number
  radiusBottomLeft: number
  radiusBottomRight: number
  cutout: boolean
}

export interface BlobMaskShapeConfig {
  type: 'blob'
  centerX: number
  centerY: number
  baseRadius: number
  amplitude: number
  octaves: number
  seed: number
  cutout: boolean
}

export type MaskShapeConfig =
  | CircleMaskShapeConfig
  | RectMaskShapeConfig
  | BlobMaskShapeConfig

// ============================================================
// Layer Configs
// ============================================================

/** 背景レイヤーの設定 */
export interface BackgroundLayerConfig {
  surface: BackgroundSurfaceConfig
  filters: LayerFilterConfig
}

/** マスクレイヤーの設定 */
export interface MaskLayerConfig {
  shape: MaskShapeConfig
  surface: MaskSurfaceConfig
  filters: LayerFilterConfig
}

// ============================================================
// Foreground Config (HTML Layer)
// ============================================================

export type GridPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface ForegroundElementConfig {
  position: GridPosition
  content: string
  fontId?: string
  fontSize?: number
}

export interface ForegroundLayerConfig {
  title: ForegroundElementConfig
  description: ForegroundElementConfig
}

// ============================================================
// HeroViewConfig (統合インターフェース)
// ============================================================

/**
 * HeroView の完全な状態
 *
 * @example
 * ```typescript
 * const config: HeroViewConfig = {
 *   viewport: { width: 1280, height: 720 },
 *   background: {
 *     surface: { type: 'stripe', width1: 20, width2: 20, angle: 45 },
 *     filters: { vignette: { enabled: false }, chromaticAberration: { enabled: false } },
 *   },
 *   mask: {
 *     shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
 *     surface: { type: 'solid' },
 *     filters: { vignette: { enabled: false }, chromaticAberration: { enabled: false } },
 *   },
 *   foreground: {
 *     title: { position: 'middle-center', content: 'Hello World', fontId: 'montserrat' },
 *     description: { position: 'middle-center', content: 'Welcome', fontSize: 1.5 },
 *   },
 * }
 * ```
 */
export interface HeroViewConfig {
  /** キャンバスサイズ */
  viewport: ViewportConfig

  /** 背景レイヤー */
  background: BackgroundLayerConfig

  /** マスクレイヤー（null = マスクなし） */
  mask: MaskLayerConfig | null

  /** 前景レイヤー（HTML） */
  foreground: ForegroundLayerConfig
}

// ============================================================
// Factory Functions
// ============================================================

export const createDefaultForegroundConfig = (): ForegroundLayerConfig => ({
  title: { position: 'middle-center', content: 'Build Amazing' },
  description: { position: 'middle-center', content: 'Create beautiful, responsive websites.\nDesign with confidence.' },
})

export const createDefaultHeroViewConfig = (): HeroViewConfig => ({
  viewport: { width: 1280, height: 720 },
  background: {
    surface: { type: 'solid' },
    filters: {
      vignette: { enabled: false, intensity: 0.5, radius: 0.5, softness: 0.5 },
      chromaticAberration: { enabled: false, intensity: 0.01 },
      dotHalftone: { enabled: false, dotSize: 8, spacing: 16, angle: 45 },
      lineHalftone: { enabled: false, lineWidth: 4, spacing: 12, angle: 45 },
    },
  },
  mask: null,
  foreground: createDefaultForegroundConfig(),
})
