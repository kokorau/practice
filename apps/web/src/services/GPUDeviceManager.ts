/**
 * GPUDeviceManager
 *
 * WebGPU GPUDeviceをシングルトンで管理し、複数のTextureRenderer間で共有する
 * これにより、GPUリソースの効率的な管理を実現
 */

import { GPUResourceTracker } from './GPUResourceTracker'

type DeviceLostCallback = () => void

class GPUDeviceManagerImpl {
  private device: GPUDevice | null = null
  private adapter: GPUAdapter | null = null
  private format: GPUTextureFormat | null = null
  private initPromise: Promise<void> | null = null
  private deviceLostCallbacks: Set<DeviceLostCallback> = new Set()
  private registeredDeviceId: string | null = null

  /**
   * 初期化を保証する
   * すでに初期化済みの場合は即座に解決される
   */
  async ensureInitialized(): Promise<void> {
    if (this.device) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this.initialize()
    return this.initPromise
  }

  private async initialize(): Promise<void> {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported')
    }

    this.adapter = await navigator.gpu.requestAdapter()
    if (!this.adapter) {
      throw new Error('No GPU adapter found')
    }

    this.device = await this.adapter.requestDevice()
    this.format = navigator.gpu.getPreferredCanvasFormat()

    // GPUResourceTrackerに共有デバイスとして登録
    this.registeredDeviceId = GPUResourceTracker.registerDevice(this.device, 'SharedGPUDevice')
    GPUResourceTracker.setAdapterInfo(this.adapter)

    // Device Lost監視
    this.device.lost.then((info) => {
      console.error('[GPUDeviceManager] Device Lost:', info.reason, info.message)
      this.handleDeviceLost()
    })
  }

  private handleDeviceLost(): void {
    // デバイスIDの登録解除
    if (this.registeredDeviceId) {
      GPUResourceTracker.unregisterDevice(this.registeredDeviceId)
      this.registeredDeviceId = null
    }

    this.device = null
    this.initPromise = null

    // 登録済みコールバックを呼び出し
    for (const callback of this.deviceLostCallbacks) {
      try {
        callback()
      } catch (e) {
        console.error('[GPUDeviceManager] Error in device lost callback:', e)
      }
    }
  }

  /**
   * 共有GPUDeviceを取得
   * 初期化されていない場合は初期化を行う
   */
  async getDevice(): Promise<GPUDevice> {
    await this.ensureInitialized()
    if (!this.device) {
      throw new Error('GPUDeviceManager: device is null after initialization')
    }
    return this.device
  }

  /**
   * 同期的にGPUDeviceを取得（初期化済みの場合のみ）
   * @throws 初期化されていない場合
   */
  getDeviceSync(): GPUDevice {
    if (!this.device) {
      throw new Error('GPUDeviceManager not initialized. Call ensureInitialized() first.')
    }
    return this.device
  }

  /**
   * テクスチャフォーマットを取得
   * @throws 初期化されていない場合
   */
  getFormat(): GPUTextureFormat {
    if (!this.format) {
      throw new Error('GPUDeviceManager not initialized. Call ensureInitialized() first.')
    }
    return this.format
  }

  /**
   * キャンバスのWebGPUコンテキストを設定
   */
  configureContext(canvas: HTMLCanvasElement | OffscreenCanvas): GPUCanvasContext {
    if (!this.device || !this.format) {
      throw new Error('GPUDeviceManager not initialized. Call ensureInitialized() first.')
    }

    const context = canvas.getContext('webgpu') as GPUCanvasContext | null
    if (!context) {
      throw new Error('Could not get WebGPU context')
    }

    context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    })

    return context
  }

  /**
   * Device Lost時のコールバックを登録
   * @returns 登録解除関数
   */
  onDeviceLost(callback: DeviceLostCallback): () => void {
    this.deviceLostCallbacks.add(callback)
    return () => {
      this.deviceLostCallbacks.delete(callback)
    }
  }

  /**
   * 初期化されているかどうかを確認
   */
  isInitialized(): boolean {
    return this.device !== null
  }
}

// シングルトンインスタンス
export const GPUDeviceManager = new GPUDeviceManagerImpl()
