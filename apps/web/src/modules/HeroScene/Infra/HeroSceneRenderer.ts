/**
 * HeroSceneRenderer
 *
 * 複数のCanvasLayerをWebGPUで合成描画するレンダラー
 */

import type {
  HeroScene,
  CanvasLayer,
  TextureLayerConfig,
  ClipGroupLayerConfig,
  ImageLayerConfig,
  TextLayerConfig,
} from '../Domain'
import type { LayerRendererPort, LayerRenderResult, TextTextureInfo } from '../Application'
import type { TexturePatternSpec } from '@practice/texture'

/**
 * HeroSceneRendererの依存性
 */
export interface HeroSceneRendererDeps {
  /** テキストテクスチャを取得する関数 */
  getTextTexture: (layerId: string) => TextTextureInfo | undefined
  /** TexturePatternSpecをレンダリングする関数 */
  renderSpec: (spec: TexturePatternSpec, clear: boolean) => void
  /** 画像をレンダリングする関数 */
  renderImage: (source: ImageBitmap | string, clear: boolean) => Promise<void>
}

/**
 * HeroSceneRenderer
 * 複数レイヤーを順番に合成描画する
 */
export class HeroSceneRenderer implements LayerRendererPort {
  private canvas: HTMLCanvasElement
  private device: GPUDevice
  private context: GPUCanvasContext
  private deps: HeroSceneRendererDeps

  private constructor(
    canvas: HTMLCanvasElement,
    device: GPUDevice,
    context: GPUCanvasContext,
    deps: HeroSceneRendererDeps
  ) {
    this.canvas = canvas
    this.device = device
    this.context = context
    this.deps = deps
  }

  /**
   * HeroSceneRendererを作成
   */
  static async create(
    canvas: HTMLCanvasElement,
    deps: HeroSceneRendererDeps
  ): Promise<HeroSceneRenderer> {
    if (!navigator.gpu) {
      throw new Error('WebGPU is not supported')
    }

    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      throw new Error('Failed to get GPU adapter')
    }

    const device = await adapter.requestDevice()
    const context = canvas.getContext('webgpu')
    if (!context) {
      throw new Error('Failed to get WebGPU context')
    }

    context.configure({
      device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied',
    })

    return new HeroSceneRenderer(canvas, device, context, deps)
  }

  /**
   * シーン全体をレンダリング
   */
  async renderScene(scene: HeroScene): Promise<LayerRenderResult> {
    try {
      // キャンバスサイズを更新
      this.canvas.width = scene.config.width * scene.config.devicePixelRatio
      this.canvas.height = scene.config.height * scene.config.devicePixelRatio

      // 可視レイヤーをzIndex順にレンダリング
      const visibleLayers = scene.canvasLayers.filter((l) => l.visible)
      let isFirst = true

      for (const layer of visibleLayers) {
        const result = await this.renderLayer(layer, isFirst)
        if (!result.success) {
          return result
        }
        isFirst = false
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 単一レイヤーをレンダリング
   */
  async renderLayer(layer: CanvasLayer, clear: boolean): Promise<LayerRenderResult> {
    try {
      switch (layer.config.type) {
        case 'texture':
          this.renderTextureLayer(layer.config, clear)
          break
        case 'clipGroup':
          await this.renderClipGroupLayer(layer.config, clear)
          break
        case 'image':
          await this.renderImageLayer(layer.config, clear)
          break
        case 'text':
          await this.renderTextLayer(layer.id, layer.config, clear)
          break
      }
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * キャンバスをクリア
   */
  clear(): void {
    const encoder = this.device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })
    pass.end()
    this.device.queue.submit([encoder.finish()])
  }

  /**
   * ビューポートサイズを取得
   */
  getViewport(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    }
  }

  /**
   * リソースを破棄
   */
  destroy(): void {
    this.device.destroy()
  }

  // Private methods

  private renderTextureLayer(config: TextureLayerConfig, clear: boolean): void {
    this.deps.renderSpec(config.spec, clear)
  }

  private async renderClipGroupLayer(
    _config: ClipGroupLayerConfig,
    _clear: boolean
  ): Promise<void> {
    // TODO: Phase 4以降で本格実装
    // 1. 子レイヤーをオフスクリーンテクスチャにレンダリング
    // 2. マスク形状でクリッピング
    // 3. メインキャンバスに合成
    console.log('ClipGroup rendering not yet implemented')
  }

  private async renderImageLayer(config: ImageLayerConfig, clear: boolean): Promise<void> {
    await this.deps.renderImage(config.source, clear)
  }

  private async renderTextLayer(
    layerId: string,
    config: TextLayerConfig,
    _clear: boolean
  ): Promise<void> {
    const textureInfo = this.deps.getTextTexture(layerId)
    if (!textureInfo) {
      console.warn(`Text texture not found for layer: ${layerId}`)
      return
    }

    // TODO: テキストテクスチャを指定位置に描画するシェーダーを実装
    // 現在はプレースホルダー
    console.log('Rendering text layer:', config.text, 'at', config.position)
  }
}

/**
 * HeroSceneRendererを作成するファクトリ関数
 */
export const createHeroSceneRenderer = async (
  canvas: HTMLCanvasElement,
  deps: HeroSceneRendererDeps
): Promise<LayerRendererPort> => {
  return HeroSceneRenderer.create(canvas, deps)
}
