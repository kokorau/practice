/**
 * createSharedRenderer
 *
 * 共有GPUDeviceを使用してTextureRendererを作成するヘルパー関数
 * 個別のDevice作成を避け、GPUリソースの効率的な利用を実現
 */

import { TextureRenderer } from '@practice/texture'
import { GPUDeviceManager } from './GPUDeviceManager'

/**
 * 共有GPUDeviceを使用してTextureRendererを作成
 *
 * @param canvas - レンダリング対象のcanvas要素
 * @returns TextureRendererインスタンス
 */
export async function createSharedRenderer(
  canvas: HTMLCanvasElement | OffscreenCanvas
): Promise<TextureRenderer> {
  await GPUDeviceManager.ensureInitialized()
  const device = GPUDeviceManager.getDeviceSync()
  const format = GPUDeviceManager.getFormat()
  return TextureRenderer.createWithSharedDevice(canvas, device, format)
}
