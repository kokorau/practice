# ADR-002: HeroSceneのレイヤーアーキテクチャ

## ステータス

承認済み（2回目改訂）

## コンテキスト

HeroViewGeneratorでは現在「後景」「中景」「前景」の3層構造でレンダリングを行っている。しかし、装飾テキストなどの要素が増えるとレイヤー数が動的に変化する必要がある。

### 現状の課題

- 固定の3層構造では装飾要素の追加に対応しにくい
- インタラクティブ要素（CTA、リンク）とグラフィック要素の責務が混在
- レイヤータイプによる分岐（type switch）が拡張性を阻害

### 設計目標

1. **HeroSceneは純粋なデータ**: JSONシリアライズ可能、保存/復元が容易
2. **シェーダーベース**: 全ての描画はシェーダーで表現（solid colorも含む）
3. **P3/OKLCHカラー**: Display P3色域、OKLCHベースの色指定
4. **プラグイン拡張**: Text、3Dオブジェクトなど特殊処理はプラグインで分離

## 決定

### データドリブン・シェーダーベースアーキテクチャ

```
┌──────────────────────────────────────────────────┐
│ HeroScene (pure data)                            │
│                                                  │
│ - layers: Layer[]                                │
│ - sceneFilters?: FilterSpec[]                    │
│ - htmlLayer: HtmlLayer                           │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ Rendering Engine                                 │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ Plugins                                    │  │
│  │  [Text]     Canvas2D → Texture             │  │
│  │  [3D]       WebGL/Three.js → Texture       │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Core: shader実行、レイヤー合成                  │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ Output                                           │
│  - Canvas (WebGPU)                               │
│  - HTML (インタラクティブ要素)                   │
└──────────────────────────────────────────────────┘
```

## 型定義

### Color: OKLCH統一

```typescript
import type { Oklch } from '@practice/color'

// 色は全てOKLCHで統一（P3色域対応）
type Color = Oklch  // { L: number, C: number, H: number }
```

### Surface: テクスチャソース

```typescript
type Surface =
  | { type: 'image'; source: string | ImageBitmap }
  | { type: 'video'; source: string }
```

注: `solid` はSurfaceではなくシェーダーで表現する。

### Layer: シェーダー + パラメータ

```typescript
interface Layer {
  id: string
  zIndex: number
  visible: boolean
  opacity: number

  // シェーダー（WGSLコード）- 全ての描画はシェーダーで表現
  shader: string

  // シェーダーパラメータ（色はOKLCH）
  params: Record<string, number | number[] | Color>

  // 外部テクスチャソース（オプション）
  surface?: Surface

  // プラグインデータ（Text, 3Dなど特殊処理が必要なもの）
  pluginData?: PluginData

  // ポストプロセス（レイヤー単位）
  filters?: FilterSpec[]
}
```

### PluginData: 特殊処理用データ

```typescript
type PluginData =
  | {
      plugin: 'text'
      content: string
      fontFamily: string
      fontSize: number
      fontWeight: number
      color: Color
      position: { x: number; y: number; anchor: Anchor }
    }
  | {
      plugin: '3d'
      geometry: unknown  // 後で詳細化
      material: unknown
      transform: {
        position: [number, number, number]
        rotation: [number, number, number]
      }
    }

type Anchor =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
```

### FilterSpec: ポストプロセスもシェーダーで表現

```typescript
interface FilterSpec {
  shader: string
  params: Record<string, number | number[] | Color>
}
```

### HeroScene: 完全なデータ

```typescript
interface HeroScene {
  config: {
    width: number
    height: number
    devicePixelRatio: number
    colorSpace: 'display-p3'  // 明示的に指定
  }
  layers: Layer[]
  sceneFilters?: FilterSpec[]
  htmlLayer: HtmlLayer
}

interface HtmlLayer {
  id: string
  layoutId: string
  items: HtmlContentItem[]
}
```

## シェーダー例

### Solid Color（単色塗り）

```wgsl
@group(0) @binding(0) var<uniform> color: vec3f; // OKLCH: L, C, H

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  return oklch_to_p3(color);
}
```

### Stripe Texture

```wgsl
@group(0) @binding(0) var<uniform> color1: vec3f; // OKLCH
@group(0) @binding(1) var<uniform> color2: vec3f; // OKLCH
@group(0) @binding(2) var<uniform> params: vec3f; // angle, width1, width2

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let stripe = stripe_pattern(uv, params.x, params.y, params.z);
  return mix(oklch_to_p3(color1), oklch_to_p3(color2), stripe);
}
```

### Mask（切り抜き）

```wgsl
@group(0) @binding(0) var<uniform> innerColor: vec3f; // OKLCH
@group(0) @binding(1) var<uniform> outerColor: vec3f; // OKLCH
@group(0) @binding(2) var<uniform> maskParams: vec4f; // centerX, centerY, radius, ...

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let mask = circle_mask(uv, maskParams);
  return mix(oklch_to_p3(outerColor), oklch_to_p3(innerColor), mask);
}
```

## プラグインインターフェース

```typescript
interface RenderPlugin {
  /** このプラグインが処理できるかどうか */
  canHandle(layer: Layer): boolean

  /** LayerからGPUTextureを生成 */
  createTexture(
    layer: Layer,
    device: GPUDevice,
    config: HeroSceneConfig
  ): Promise<GPUTexture>

  /** 更新が必要か判定 */
  needsUpdate(layer: Layer, prevLayer: Layer): boolean

  /** リソース破棄 */
  destroy(): void
}
```

### Text Plugin

```typescript
const textPlugin: RenderPlugin = {
  canHandle: (layer) => layer.pluginData?.plugin === 'text',

  createTexture: async (layer, device, config) => {
    const { content, fontFamily, fontSize, fontWeight, color } = layer.pluginData

    // Canvas 2Dでテキスト描画
    await document.fonts.ready
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    // ... (ADR-001参照)

    // GPUテクスチャに変換
    const texture = device.createTexture({ ... })
    device.queue.copyExternalImageToTexture({ source: canvas }, { texture }, [...])

    return texture
  },

  needsUpdate: (layer, prev) => {
    const a = layer.pluginData
    const b = prev.pluginData
    return a?.content !== b?.content ||
           a?.fontFamily !== b?.fontFamily ||
           a?.fontSize !== b?.fontSize
  },
}
```

### 3D Plugin

```typescript
const threeDPlugin: RenderPlugin = {
  canHandle: (layer) => layer.pluginData?.plugin === '3d',

  createTexture: async (layer, device, config) => {
    // Three.js or WebGL でオフスクリーンレンダリング
    // → ImageBitmap → GPUTexture
  },
}
```

## Editor側の責務

Editorは「Base」「Mask」「Text」などのUIカテゴリを提供するが、
データ上はシェーダーとパラメータに変換される。

```typescript
// Editor側でプリセットを用意
const LAYER_PRESETS = {
  base: {
    solid: (color: Color) => ({
      shader: SOLID_SHADER,
      params: { color },
    }),
    stripe: (color1: Color, color2: Color, angle: number, width: number) => ({
      shader: STRIPE_SHADER,
      params: { color1, color2, angle, width1: width, width2: width },
    }),
    image: (source: string) => ({
      shader: IMAGE_SHADER,
      params: {},
      surface: { type: 'image', source },
    }),
  },
  mask: {
    circle: (innerColor: Color, outerColor: Color, centerX: number, centerY: number, radius: number) => ({
      shader: CIRCLE_MASK_SHADER,
      params: { innerColor, outerColor, centerX, centerY, radius },
    }),
    blob: (innerColor: Color, outerColor: Color, seed: number, amplitude: number) => ({
      shader: BLOB_MASK_SHADER,
      params: { innerColor, outerColor, seed, amplitude },
    }),
  },
}
```

## レンダリングフロー

1. `layers`をzIndex順（小さい順=奥から）にソート
2. 各レイヤーについて:
   - `pluginData`があればプラグインでテクスチャ生成
   - `shader` + `params` + `surface`（あれば）でレンダリング
   - `filters`があればポストプロセス適用
3. `sceneFilters`があればシーン全体にポストプロセス適用
4. HTMLレイヤーはCSSで最前面に配置

## 影響

- Domain層の型定義を更新
- 既存の`CanvasLayerType`分岐を廃止
- シェーダーコードをデータとして管理
- プラグインシステムを導入

## 関連ADR

- ADR-001: WebGPU上でのテキストレンダリング方式
