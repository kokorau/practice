/**
 * GPUResourceTracker
 *
 * WebGPUリソースの使用状況を追跡するシングルトンサービス
 * 診断・デバッグ用途
 */

export interface GPUDeviceInfo {
  id: string
  createdAt: number
  isLost: boolean
  lostReason?: string
  label?: string
}

export interface GPUResourceStats {
  /** 現在アクティブなGPUDeviceの数 */
  activeDeviceCount: number
  /** 累計作成されたGPUDeviceの数 */
  totalDevicesCreated: number
  /** ロストしたGPUDeviceの数 */
  lostDeviceCount: number
  /** 推定VRAM使用量 (bytes) */
  estimatedVRAM: number
  /** 作成されたテクスチャの数 */
  textureCount: number
  /** 作成されたバッファの数 */
  bufferCount: number
  /** 各デバイスの詳細情報 */
  devices: GPUDeviceInfo[]
  /** GPUAdapter情報 */
  adapterInfo?: {
    vendor?: string
    architecture?: string
    description?: string
    device?: string
    isFallbackAdapter?: boolean
  }
}

type StatsChangeListener = (stats: GPUResourceStats) => void

class GPUResourceTrackerImpl {
  private devices: Map<string, GPUDeviceInfo> = new Map()
  private totalDevicesCreated = 0
  private estimatedVRAM = 0
  private textureCount = 0
  private bufferCount = 0
  private adapterInfo?: GPUResourceStats['adapterInfo']
  private listeners: Set<StatsChangeListener> = new Set()
  private deviceIdCounter = 0

  /**
   * GPUDeviceの登録
   */
  registerDevice(device: GPUDevice, label?: string): string {
    const id = `device_${++this.deviceIdCounter}`
    const info: GPUDeviceInfo = {
      id,
      createdAt: Date.now(),
      isLost: false,
      label,
    }
    this.devices.set(id, info)
    this.totalDevicesCreated++

    // デバイスロストを監視
    device.lost.then((info) => {
      const deviceInfo = this.devices.get(id)
      if (deviceInfo) {
        deviceInfo.isLost = true
        deviceInfo.lostReason = info.message || info.reason
        this.notifyListeners()
      }
      console.warn(`[GPUResourceTracker] Device ${id} lost:`, info.reason, info.message)
    })

    this.notifyListeners()
    return id
  }

  /**
   * GPUDeviceの登録解除
   */
  unregisterDevice(id: string): void {
    this.devices.delete(id)
    this.notifyListeners()
  }

  /**
   * GPUAdapter情報を設定
   */
  setAdapterInfo(adapter: GPUAdapter): void {
    const info = adapter.info
    this.adapterInfo = {
      vendor: info?.vendor,
      architecture: info?.architecture,
      description: info?.description,
      device: info?.device,
      // isFallbackAdapter may not exist in older TypeScript definitions
      isFallbackAdapter: (adapter as unknown as { isFallbackAdapter?: boolean }).isFallbackAdapter,
    }
    this.notifyListeners()
  }

  /**
   * テクスチャ作成を記録
   */
  recordTextureCreation(width: number, height: number, format: string = 'rgba8unorm'): void {
    this.textureCount++
    // RGBA8は4 bytes/pixel
    const bytesPerPixel = format.includes('rgba') ? 4 : (format.includes('rg') ? 2 : 1)
    this.estimatedVRAM += width * height * bytesPerPixel
    this.notifyListeners()
  }

  /**
   * テクスチャ破棄を記録
   */
  recordTextureDestruction(width: number, height: number, format: string = 'rgba8unorm'): void {
    this.textureCount--
    const bytesPerPixel = format.includes('rgba') ? 4 : (format.includes('rg') ? 2 : 1)
    this.estimatedVRAM -= width * height * bytesPerPixel
    if (this.estimatedVRAM < 0) this.estimatedVRAM = 0
    this.notifyListeners()
  }

  /**
   * バッファ作成を記録
   */
  recordBufferCreation(size: number): void {
    this.bufferCount++
    this.estimatedVRAM += size
    this.notifyListeners()
  }

  /**
   * バッファ破棄を記録
   */
  recordBufferDestruction(size: number): void {
    this.bufferCount--
    this.estimatedVRAM -= size
    if (this.estimatedVRAM < 0) this.estimatedVRAM = 0
    this.notifyListeners()
  }

  /**
   * 現在のリソース統計を取得
   */
  getStats(): GPUResourceStats {
    const deviceList = Array.from(this.devices.values())
    return {
      activeDeviceCount: deviceList.filter(d => !d.isLost).length,
      totalDevicesCreated: this.totalDevicesCreated,
      lostDeviceCount: deviceList.filter(d => d.isLost).length,
      estimatedVRAM: this.estimatedVRAM,
      textureCount: this.textureCount,
      bufferCount: this.bufferCount,
      devices: deviceList,
      adapterInfo: this.adapterInfo,
    }
  }

  /**
   * 統計変更リスナーを登録
   */
  subscribe(listener: StatsChangeListener): () => void {
    this.listeners.add(listener)
    // 初期値を通知
    listener(this.getStats())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(): void {
    const stats = this.getStats()
    for (const listener of this.listeners) {
      listener(stats)
    }
  }

  /**
   * デバッグ用: 全リソースをリセット
   */
  reset(): void {
    this.devices.clear()
    this.totalDevicesCreated = 0
    this.estimatedVRAM = 0
    this.textureCount = 0
    this.bufferCount = 0
    this.deviceIdCounter = 0
    this.notifyListeners()
  }
}

// シングルトンインスタンス
export const GPUResourceTracker = new GPUResourceTrackerImpl()
