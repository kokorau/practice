/**
 * HeroScene Application Layer
 *
 * レイヤーレンダリングのポート（インターフェース）とユースケース
 * エディタ状態とコンパイル機能
 */

import type {
  HeroScene,
  CanvasLayer,
  TextLayerConfig,
  HeroSceneConfig,
} from '../Domain'

// Re-export Editor State types
export type {
  EditorTextureLayerConfig,
  EditorMaskedTextureLayerConfig,
  EditorImageLayerConfig,
  EditorTextLayerConfig,
  EditorCanvasLayerConfig,
  EditorCanvasLayer,
  HeroSceneEditorState,
} from './EditorState'
export { createHeroSceneEditorState } from './EditorState'

// Re-export Ports
export type { HeroViewPresetRepository } from './ports'

// Re-export Preset UseCase
export type { GetHeroViewPresetsUseCase } from './GetHeroViewPresetsUseCase'
export { createGetHeroViewPresetsUseCase } from './GetHeroViewPresetsUseCase'

// Re-export Compile functions
export type {
  MidgroundTexturePattern,
  PatternMaps,
  CompileColors,
  CompileOptions,
} from './CompileHeroScene'
export { compileHeroScene } from './CompileHeroScene'

// ============================================================
// Ports (Interfaces for Infrastructure)
// ============================================================

/**
 * テキストテクスチャの情報
 */
export interface TextTextureInfo {
  /** GPUテクスチャ */
  texture: GPUTexture
  /** テクスチャ幅 */
  width: number
  /** テクスチャ高さ */
  height: number
}

/**
 * テキストテクスチャ生成ポート
 */
export interface TextTexturePort {
  /**
   * テキストからGPUテクスチャを生成
   */
  createTextTexture(config: TextLayerConfig, devicePixelRatio: number): Promise<TextTextureInfo>

  /**
   * テクスチャを破棄
   */
  destroyTextTexture(texture: GPUTexture): void
}

/**
 * レイヤーレンダリング結果
 */
export interface LayerRenderResult {
  /** 成功/失敗 */
  success: boolean
  /** エラーメッセージ（失敗時） */
  error?: string
}

/**
 * レイヤーレンダラーポート
 */
export interface LayerRendererPort {
  /**
   * シーン全体をレンダリング
   */
  renderScene(scene: HeroScene): Promise<LayerRenderResult>

  /**
   * 単一レイヤーをレンダリング（合成用）
   * @param layer レンダリング対象レイヤー
   * @param clear 描画前にクリアするか
   */
  renderLayer(layer: CanvasLayer, clear: boolean): Promise<LayerRenderResult>

  /**
   * キャンバスをクリア
   */
  clear(): void

  /**
   * ビューポートサイズを取得
   */
  getViewport(): { width: number; height: number }

  /**
   * リソースを破棄
   */
  destroy(): void
}

// ============================================================
// Use Cases
// ============================================================

/**
 * シーン管理ユースケースの依存性
 */
export interface HeroSceneUseCaseDeps {
  renderer: LayerRendererPort
  textTexture: TextTexturePort
}

/**
 * シーン管理ユースケース
 */
export class HeroSceneUseCase {
  private scene: HeroScene
  private deps: HeroSceneUseCaseDeps
  private textTextures: Map<string, TextTextureInfo> = new Map()

  constructor(initialScene: HeroScene, deps: HeroSceneUseCaseDeps) {
    this.scene = initialScene
    this.deps = deps
  }

  /**
   * 現在のシーンを取得
   */
  getScene(): HeroScene {
    return this.scene
  }

  /**
   * シーン設定を更新
   */
  updateConfig(config: Partial<HeroSceneConfig>): void {
    this.scene = {
      ...this.scene,
      config: { ...this.scene.config, ...config },
    }
  }

  /**
   * レイヤーを追加
   */
  async addLayer(layer: CanvasLayer): Promise<void> {
    // テキストレイヤーの場合はテクスチャを事前生成
    if (layer.config.type === 'text') {
      await this.createTextTextureForLayer(layer.id, layer.config)
    }

    this.scene = {
      ...this.scene,
      canvasLayers: [...this.scene.canvasLayers, layer].sort((a, b) => a.zIndex - b.zIndex),
    }
  }

  /**
   * レイヤーを削除
   */
  removeLayer(layerId: string): void {
    const layer = this.scene.canvasLayers.find((l) => l.id === layerId)
    if (layer?.config.type === 'text') {
      this.destroyTextTextureForLayer(layerId)
    }

    this.scene = {
      ...this.scene,
      canvasLayers: this.scene.canvasLayers.filter((l) => l.id !== layerId),
    }
  }

  /**
   * レイヤーを更新
   */
  async updateLayer(layerId: string, updates: Partial<Omit<CanvasLayer, 'id'>>): Promise<void> {
    const layer = this.scene.canvasLayers.find((l) => l.id === layerId)
    if (!layer) return

    // テキストレイヤーの設定が変わった場合はテクスチャを再生成
    if (updates.config?.type === 'text' || (layer.config.type === 'text' && updates.config)) {
      const newConfig = { ...layer.config, ...updates.config } as TextLayerConfig
      await this.createTextTextureForLayer(layerId, newConfig)
    }

    this.scene = {
      ...this.scene,
      canvasLayers: this.scene.canvasLayers
        .map((l) => (l.id === layerId ? { ...l, ...updates } : l))
        .sort((a, b) => a.zIndex - b.zIndex),
    }
  }

  /**
   * レイヤーの表示/非表示を切り替え
   */
  toggleLayerVisibility(layerId: string): void {
    this.scene = {
      ...this.scene,
      canvasLayers: this.scene.canvasLayers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      ),
    }
  }

  /**
   * シーンをレンダリング
   */
  async render(): Promise<LayerRenderResult> {
    return this.deps.renderer.renderScene(this.scene)
  }

  /**
   * リソースをクリーンアップ
   */
  destroy(): void {
    // テキストテクスチャを破棄
    for (const [, info] of this.textTextures) {
      this.deps.textTexture.destroyTextTexture(info.texture)
    }
    this.textTextures.clear()

    // レンダラーを破棄
    this.deps.renderer.destroy()
  }

  /**
   * テキストレイヤー用のテクスチャを取得
   */
  getTextTexture(layerId: string): TextTextureInfo | undefined {
    return this.textTextures.get(layerId)
  }

  // Private methods

  private async createTextTextureForLayer(
    layerId: string,
    config: TextLayerConfig
  ): Promise<void> {
    // 既存のテクスチャを破棄
    this.destroyTextTextureForLayer(layerId)

    // 新しいテクスチャを生成
    const info = await this.deps.textTexture.createTextTexture(
      config,
      this.scene.config.devicePixelRatio
    )
    this.textTextures.set(layerId, info)
  }

  private destroyTextTextureForLayer(layerId: string): void {
    const existing = this.textTextures.get(layerId)
    if (existing) {
      this.deps.textTexture.destroyTextTexture(existing.texture)
      this.textTextures.delete(layerId)
    }
  }
}

// ============================================================
// Factory
// ============================================================

/**
 * HeroSceneUseCaseを作成
 */
export const createHeroSceneUseCase = (
  initialScene: HeroScene,
  deps: HeroSceneUseCaseDeps
): HeroSceneUseCase => {
  return new HeroSceneUseCase(initialScene, deps)
}
