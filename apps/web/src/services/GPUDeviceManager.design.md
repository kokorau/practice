# GPUDeviceManager 設計案

## 概要

WebGPUリソースを一元管理し、レンダリングリクエストをキュー処理するシングルトンサービス。

## 問題点（現状）

1. 各コンポーネントが個別に `TextureRenderer.create()` を呼び出し
2. それぞれが独自の `GPUDevice` を保持
3. サムネイル表示時に大量のレンダラーが並列作成
4. VRAMリソースの競合でクラッシュ/デバイスロスト

## 解決策

### GPUDeviceManager

```typescript
interface RenderRequest {
  id: string
  priority: 'high' | 'normal' | 'low'
  canvas: HTMLCanvasElement | OffscreenCanvas
  renderFn: (context: GPUCanvasContext) => Promise<void>
  onComplete?: () => void
  onError?: (error: Error) => void
}

class GPUDeviceManager {
  private static instance: GPUDeviceManager
  private device: GPUDevice | null = null
  private adapter: GPUAdapter | null = null

  // Priority queues
  private highPriorityQueue: RenderRequest[] = []
  private normalPriorityQueue: RenderRequest[] = []
  private lowPriorityQueue: RenderRequest[] = []

  // Processing state
  private isProcessing = false
  private currentRender: RenderRequest | null = null

  static getInstance(): GPUDeviceManager

  // Device lifecycle
  async initialize(): Promise<void>
  async getDevice(): Promise<GPUDevice>
  async recover(): Promise<void>

  // Context management (reusable contexts per canvas)
  configureContext(canvas: HTMLCanvasElement): GPUCanvasContext

  // Request submission
  submitRender(request: RenderRequest): string
  cancelRender(id: string): boolean

  // Queue processing
  private processQueue(): void
  private getNextRequest(): RenderRequest | null
}
```

### 優先度レベル

| Priority | 用途 | 処理方式 |
|----------|------|----------|
| `high` | メインキャンバス描画 | 即座に処理、他を中断可 |
| `normal` | UI上のサムネイル | 順次処理 |
| `low` | プリロード、バッチ処理 | アイドル時処理 |

### TextureRendererの変更

```typescript
// Before: 各インスタンスがDeviceを保持
class TextureRenderer {
  private device: GPUDevice
  static async create(canvas): Promise<TextureRenderer>
}

// After: GPUDeviceManagerから取得
class TextureRenderer {
  private manager: GPUDeviceManager
  private context: GPUCanvasContext

  static async create(canvas, options?: {
    priority?: 'high' | 'normal' | 'low'
    shared?: boolean  // true: 共有Device使用
  }): Promise<TextureRenderer>
}
```

### 使用例

```typescript
// メインプレビュー（高優先度、バイパス）
const mainRenderer = await TextureRenderer.create(canvas, {
  priority: 'high',
  shared: true,
})

// サムネイル（通常優先度、キュー処理）
const thumbnailRenderer = await TextureRenderer.create(offscreenCanvas, {
  priority: 'normal',
  shared: true,
})
```

## 実装ステップ

1. **Phase 2a**: GPUDeviceManager基盤実装
   - シングルトン作成
   - Device/Adapter管理
   - デバイスロスト復旧

2. **Phase 2b**: キュー処理実装
   - 優先度付きキュー
   - リクエスト処理ループ
   - キャンセル機能

3. **Phase 2c**: TextureRenderer統合
   - shared modeオプション追加
   - 既存コードの移行
   - サムネイルコンポーネント対応

4. **Phase 2d**: バッチレンダリング最適化
   - OffscreenCanvas活用
   - レンダリングパイプライン統合
   - メモリ使用量の最適化

## メトリクス

GPUResourceTrackerとの連携:
- 単一Deviceの監視で情報が正確に
- キュー長の監視追加
- レンダリング時間計測

## 注意点

- Device Lost時の全キュー再処理
- Context設定のキャッシュ
- 同一Canvasへの重複リクエスト処理
