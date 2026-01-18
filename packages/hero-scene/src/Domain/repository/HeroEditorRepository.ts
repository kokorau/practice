/**
 * HeroEditorRepository Port
 *
 * HeroEditorState（UI状態 + ドメインモデル）の状態管理を抽象化するインターフェース
 * - 既存のHeroViewRepositoryを拡張し、UI状態も管理
 * - 単一の状態ソースを提供
 */

import type {
  HeroEditorState,
  HeroEditorUIState,
  BackgroundUIState,
  MaskUIState,
  FilterUIState,
  ForegroundUIState,
  PresetUIState,
  EditorSectionType,
} from '../HeroEditorState'
import type {
  HeroViewConfig,
  HeroColorsConfig,
  ViewportConfig,
  ForegroundLayerConfig,
  LayerNodeConfig,
} from '../HeroViewConfig'

/**
 * Subscribe callback type
 */
export type HeroEditorSubscriber = (state: HeroEditorState) => void

/**
 * Unsubscribe function type
 */
export type HeroEditorUnsubscribe = () => void

/**
 * HeroEditorStateのリポジトリインターフェース
 *
 * @example
 * ```typescript
 * const repo = createHeroEditorInMemoryRepository()
 *
 * // 状態の取得
 * const state = repo.get()
 * console.log(state.ui.activeSection) // 'background'
 * console.log(state.config.layers[0]) // LayerNodeConfig
 *
 * // UI状態の更新
 * repo.updateUI({ activeSection: 'mask-shape' })
 *
 * // Config状態の更新
 * repo.updateConfig({ viewport: { width: 1920, height: 1080 } })
 *
 * // 変更の購読
 * const unsubscribe = repo.subscribe((newState) => {
 *   console.log('State changed:', newState)
 * })
 * ```
 */
export interface HeroEditorRepository {
  // ============================================================
  // Core Operations
  // ============================================================

  /**
   * 現在のHeroEditorStateを取得
   */
  get(): HeroEditorState

  /**
   * HeroEditorState全体を更新
   * @param state 新しい状態
   */
  set(state: HeroEditorState): void

  /**
   * 状態変更を購読
   * @param subscriber 変更時に呼び出されるコールバック
   * @returns 購読解除関数
   */
  subscribe(subscriber: HeroEditorSubscriber): HeroEditorUnsubscribe

  // ============================================================
  // UI State Operations
  // ============================================================

  /**
   * UI状態を部分更新
   */
  updateUI(updates: Partial<HeroEditorUIState>): void

  /**
   * アクティブセクションを更新
   */
  setActiveSection(section: EditorSectionType): void

  /**
   * 背景UI状態を部分更新
   */
  updateBackgroundUI(updates: Partial<BackgroundUIState>): void

  /**
   * マスクUI状態を部分更新
   */
  updateMaskUI(updates: Partial<MaskUIState>): void

  /**
   * フィルターUI状態を部分更新
   */
  updateFilterUI(updates: Partial<FilterUIState>): void

  /**
   * 前景UI状態を部分更新
   */
  updateForegroundUI(updates: Partial<ForegroundUIState>): void

  /**
   * プリセットUI状態を部分更新
   */
  updatePresetUI(updates: Partial<PresetUIState>): void

  // ============================================================
  // Config (Domain) Operations
  // ============================================================

  /**
   * HeroViewConfig全体を更新
   */
  updateConfig(config: Partial<HeroViewConfig>): void

  /**
   * HeroViewConfig全体を置換
   */
  setConfig(config: HeroViewConfig): void

  /**
   * カラー設定を部分更新
   */
  updateColors(colors: Partial<HeroColorsConfig>): void

  /**
   * ビューポート設定を部分更新
   */
  updateViewport(viewport: Partial<ViewportConfig>): void

  /**
   * 前景レイヤー設定を部分更新
   */
  updateForeground(foreground: Partial<ForegroundLayerConfig>): void

  // ============================================================
  // Layer Operations
  // ============================================================

  /**
   * レイヤーIDで検索
   * @param layerId レイヤーID
   * @returns 見つかったレイヤー、なければundefined
   */
  findLayer(layerId: string): LayerNodeConfig | undefined

  /**
   * 特定レイヤーを更新
   */
  updateLayer(layerId: string, updates: Partial<LayerNodeConfig>): void

  /**
   * レイヤーを追加
   * @param layer 追加するレイヤー
   * @param index 挿入位置（省略時は末尾）
   */
  addLayer(layer: LayerNodeConfig, index?: number): void

  /**
   * レイヤーを削除
   */
  removeLayer(layerId: string): void

  /**
   * レイヤーの順序を変更
   * @param layerIds 新しい順序のレイヤーID配列
   */
  reorderLayers(layerIds: string[]): void

  // ============================================================
  // Snapshot Operations (for undo/redo support)
  // ============================================================

  /**
   * 現在の状態のスナップショットを作成
   * UI状態は含まず、configのみをシリアライズ
   */
  snapshot(): string

  /**
   * スナップショットから状態を復元
   * UI状態は維持し、configのみを復元
   */
  restore(snapshot: string): void
}
