/**
 * HeroEditorState
 *
 * UIの状態とドメインモデル(HeroViewConfig)を統合した単一の状態管理型
 *
 * ## 設計意図
 * - 2層状態管理（Vue Refs + Repository）を統一
 * - UI状態とドメイン状態を明確に分離しつつ、単一ソースとして管理
 * - テスト時に「どの状態を検証すべきか」を明確化
 *
 * ## 構造
 * ```typescript
 * EditorState = {
 *   ui: { ... }      // 選択状態、展開状態などUI固有の一時的状態
 *   config: { ... }  // HeroViewConfig（永続化対象のドメインモデル）
 * }
 * ```
 */

import type { HeroViewConfig, HeroContextName, MaskShapeConfig, SurfaceConfig } from './HeroViewConfig'
import type { LayerFilterConfig } from './EffectSchema'

// ============================================================
// Custom Params Types (JSON-serializable surface/mask params for UI)
// ============================================================

/**
 * カスタムマスク形状パラメータ
 * MaskShapeConfigと同等だが、UIカスタマイズ用
 * @deprecated Use MaskShapeConfig directly from HeroViewConfig.ts
 */
export type CustomMaskShapeParams = MaskShapeConfig

/**
 * カスタムマスクテクスチャパラメータ
 * SurfaceConfigと同等だが、UIカスタマイズ用
 * @deprecated Use SurfaceConfig directly from HeroViewConfig.ts
 */
export type CustomSurfaceParams = SurfaceConfig

/**
 * カスタム背景テクスチャパラメータ
 * SurfaceConfigと同等だが、UIカスタマイズ用
 * @deprecated Use SurfaceConfig directly from HeroViewConfig.ts
 */
export type CustomBackgroundSurfaceParams = SurfaceConfig

// ============================================================
// Section Types
// ============================================================

/**
 * エディタのアクティブセクション
 */
export type EditorSectionType =
  | 'background'
  | 'mask-shape'
  | 'mask-surface'
  | 'mask-filters'
  | 'background-filters'
  | 'text'
  | 'foreground'
  | 'colors'
  | 'preset'
  | null

// ============================================================
// UI State Types
// ============================================================

/**
 * 背景レイヤーのUI状態
 */
export interface BackgroundUIState {
  /** 選択されているプリセットインデックス (null = カスタム) */
  selectedPresetIndex: number | null
  /** カスタムサーフェスパラメータ */
  customSurfaceParams: CustomBackgroundSurfaceParams | null
  /** カスタム画像URL */
  customImageUrl: string | null
}

/**
 * マスクレイヤーのUI状態
 */
export interface MaskUIState {
  /** 選択されているマスク形状プリセットインデックス (null = カスタム) */
  selectedShapePresetIndex: number | null
  /** 選択されているマスクテクスチャプリセットインデックス */
  selectedTexturePresetIndex: number
  /** カスタムマスク形状パラメータ */
  customShapeParams: CustomMaskShapeParams | null
  /** カスタムマスクテクスチャパラメータ */
  customSurfaceParams: CustomSurfaceParams | null
  /** カスタム画像URL */
  customImageUrl: string | null
}

/**
 * フィルターのUI状態
 */
export interface FilterUIState {
  /** 選択されているフィルターレイヤーID */
  selectedLayerId: string | null
  /** レイヤーごとのフィルター設定 */
  layerConfigs: Map<string, LayerFilterConfig>
}

/**
 * 前景要素のUI状態
 */
export interface ForegroundUIState {
  /** 選択されている前景要素ID */
  selectedElementId: string | null
}

/**
 * プリセットのUI状態
 */
export interface PresetUIState {
  /** 選択されているプリセットID */
  selectedPresetId: string | null
}

/**
 * カラーのUI状態
 * @deprecated Use HeroColorsConfig from HeroViewConfig.ts instead.
 * This interface duplicates color keys already in HeroColorsConfig.
 */
export interface ColorUIState {
  /** 背景色キー1 */
  backgroundColorKey1: string
  /** 背景色キー2 */
  backgroundColorKey2: string
  /** マスク色キー1 */
  maskColorKey1: string
  /** マスク色キー2 */
  maskColorKey2: string
  /** マスクのセマンティックコンテキスト */
  maskSemanticContext: HeroContextName
}

/**
 * HeroEditorのUI状態
 *
 * エディタ固有の一時的な状態（永続化不要）
 */
export interface HeroEditorUIState {
  /** 現在アクティブなセクション */
  activeSection: EditorSectionType
  /** 背景レイヤーのUI状態 */
  background: BackgroundUIState
  /** マスクレイヤーのUI状態 */
  mask: MaskUIState
  /** フィルターのUI状態 */
  filter: FilterUIState
  /** 前景要素のUI状態 */
  foreground: ForegroundUIState
  /** プリセットのUI状態 */
  preset: PresetUIState
  /** カラーのUI状態 */
  color: ColorUIState
}

// ============================================================
// Editor State (統合型)
// ============================================================

/**
 * HeroEditor の統一状態
 *
 * UI状態とドメインモデル(config)を単一のオブジェクトで管理
 *
 * @example
 * ```typescript
 * const state = editorRepo.get()
 *
 * // UI状態の参照
 * console.log(state.ui.activeSection) // 'background'
 * console.log(state.ui.background.selectedPresetIndex) // 3
 *
 * // ドメイン状態の参照
 * console.log(state.config.layers[0].surface.type) // 'stripe'
 * console.log(state.config.colors.brand.hue) // 198
 * ```
 */
export interface HeroEditorState {
  /** UI状態（選択、展開など） */
  ui: HeroEditorUIState
  /** ドメイン状態（HeroViewConfig） */
  config: HeroViewConfig
}

// ============================================================
// Factory Functions
// ============================================================

/**
 * デフォルトのBackgroundUIStateを作成
 */
export const createDefaultBackgroundUIState = (): BackgroundUIState => ({
  selectedPresetIndex: 3, // Default: stripe
  customSurfaceParams: null,
  customImageUrl: null,
})

/**
 * デフォルトのMaskUIStateを作成
 */
export const createDefaultMaskUIState = (): MaskUIState => ({
  selectedShapePresetIndex: null,
  selectedTexturePresetIndex: 0, // Default: solid
  customShapeParams: null,
  customSurfaceParams: null,
  customImageUrl: null,
})

/**
 * デフォルトのFilterUIStateを作成
 */
export const createDefaultFilterUIState = (): FilterUIState => ({
  selectedLayerId: null,
  layerConfigs: new Map(),
})

/**
 * デフォルトのForegroundUIStateを作成
 */
export const createDefaultForegroundUIState = (): ForegroundUIState => ({
  selectedElementId: null,
})

/**
 * デフォルトのPresetUIStateを作成
 */
export const createDefaultPresetUIState = (): PresetUIState => ({
  selectedPresetId: 'corporate-clean',
})

/**
 * デフォルトのColorUIStateを作成
 * @deprecated Use createDefaultColorsConfig from HeroViewConfig.ts instead
 */
export const createDefaultColorUIState = (): ColorUIState => ({
  backgroundColorKey1: 'B',
  backgroundColorKey2: 'auto',
  maskColorKey1: 'auto',
  maskColorKey2: 'auto',
  maskSemanticContext: 'canvas',
})

/**
 * デフォルトのHeroEditorUIStateを作成
 */
export const createDefaultHeroEditorUIState = (): HeroEditorUIState => ({
  activeSection: null,
  background: createDefaultBackgroundUIState(),
  mask: createDefaultMaskUIState(),
  filter: createDefaultFilterUIState(),
  foreground: createDefaultForegroundUIState(),
  preset: createDefaultPresetUIState(),
  color: createDefaultColorUIState(),
})

// ============================================================
// Type Guards
// ============================================================

/**
 * EditorSectionTypeが有効な値かチェック
 */
export const isValidEditorSection = (value: unknown): value is EditorSectionType => {
  if (value === null) return true
  if (typeof value !== 'string') return false
  return [
    'background',
    'mask-shape',
    'mask-surface',
    'mask-filters',
    'background-filters',
    'text',
    'foreground',
    'colors',
    'preset',
  ].includes(value)
}
