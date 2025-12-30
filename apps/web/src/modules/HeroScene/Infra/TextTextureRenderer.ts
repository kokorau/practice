/**
 * TextTextureRenderer
 *
 * Canvas 2Dでテキストを描画し、WebGPUテクスチャに変換する
 * ADR-001に基づく実装
 */

import type { TextLayerConfig } from '../Domain'
import type { TextTexturePort, TextTextureInfo } from '../Application'

/**
 * テキストテクスチャレンダラーの設定
 */
export interface TextTextureRendererConfig {
  /** 最大スケール（将来の拡大に備える） */
  maxScale?: number
}

/**
 * Canvas 2D → GPUテクスチャ変換を行うレンダラー
 */
export class TextTextureRenderer implements TextTexturePort {
  private device: GPUDevice
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private config: Required<TextTextureRendererConfig>

  private constructor(
    device: GPUDevice,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    config: Required<TextTextureRendererConfig>
  ) {
    this.device = device
    this.canvas = canvas
    this.ctx = ctx
    this.config = config
  }

  /**
   * TextTextureRendererを作成
   */
  static create(
    device: GPUDevice,
    config?: TextTextureRendererConfig
  ): TextTextureRenderer {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get 2D context')
    }

    return new TextTextureRenderer(device, canvas, ctx, {
      maxScale: config?.maxScale ?? 2,
    })
  }

  /**
   * テキストからGPUテクスチャを生成
   */
  async createTextTexture(
    config: TextLayerConfig,
    devicePixelRatio: number
  ): Promise<TextTextureInfo> {
    // Webフォントの読み込みを待機
    await document.fonts.ready

    const scale = devicePixelRatio * this.config.maxScale
    const { text, fontFamily, fontSize, fontWeight, color } = config

    // フォント設定
    const fontString = `${fontWeight} ${fontSize * scale}px ${fontFamily}`
    this.ctx.font = fontString

    // テキストサイズを計測
    const metrics = this.ctx.measureText(text)
    const width = Math.ceil(metrics.width)
    const height = Math.ceil(fontSize * scale * 1.4) // 行高さ分の余裕

    // Canvasサイズを設定
    this.canvas.width = width
    this.canvas.height = height

    // Canvas再設定後にフォントを再設定（リセットされるため）
    this.ctx.font = fontString
    this.ctx.fillStyle = color
    this.ctx.textBaseline = 'top'

    // テキストを描画
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.fillText(text, 0, fontSize * scale * 0.1) // 上部に少し余白

    // GPUテクスチャを作成
    const texture = this.device.createTexture({
      size: [width, height],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    })

    // CanvasからGPUテクスチャにコピー
    this.device.queue.copyExternalImageToTexture(
      { source: this.canvas },
      { texture },
      [width, height]
    )

    return { texture, width, height }
  }

  /**
   * テクスチャを破棄
   */
  destroyTextTexture(texture: GPUTexture): void {
    texture.destroy()
  }
}

/**
 * TextTextureRendererを作成するファクトリ関数
 */
export const createTextTextureRenderer = (
  device: GPUDevice,
  config?: TextTextureRendererConfig
): TextTexturePort => {
  return TextTextureRenderer.create(device, config)
}
