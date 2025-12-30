# ADR-002: HeroSceneのレイヤーアーキテクチャ

## ステータス

承認済み

## コンテキスト

HeroViewGeneratorでは現在「後景」「中景」「前景」の3層構造でレンダリングを行っている。しかし、装飾テキストなどの要素が増えるとレイヤー数が動的に変化する必要がある。

### 現状の課題

- 固定の3層構造では装飾要素の追加に対応しにくい
- インタラクティブ要素（CTA、リンク）とグラフィック要素の責務が混在

## 検討した選択肢

### 1. CanvasLayer[] + HtmlLayer(最前面)

複数のCanvasレイヤーと、常に最前面に配置されるHtmlレイヤーを組み合わせる。

```
[HTMLLayer]       ← 最前面、インタラクティブ要素
[CanvasLayer N]   ← 装飾テキスト等
[CanvasLayer ...]
[CanvasLayer 1]   ← 中景（マスク付きテクスチャ）
[CanvasLayer 0]   ← 後景（背景テクスチャ/画像）
```

**メリット:**
- HTMLレイヤーでアクセシビリティ、SEO、クリックイベントを適切に処理
- Canvasレイヤーは装飾に専念、柔軟な合成が可能
- zIndexによるレイヤー順序の管理が明確

**デメリット:**
- HTMLとCanvasの位置合わせに注意が必要

### 2. 全てCanvasで描画

テキストやボタンも含めて全てWebGPUで描画。

**メリット:**
- 統一的なレンダリングパイプライン

**デメリット:**
- アクセシビリティが困難
- クリックイベントの処理が複雑
- SEOに不利

### 3. 複数のCanvas要素を重ねる

レイヤーごとに別のCanvas要素を作成して重ねる。

**メリット:**
- レイヤー追加が柔軟
- 個別に更新可能

**デメリット:**
- Canvas複数でメモリ増加
- WebGPUコンテキストが複数必要

## 決定

**選択肢1: CanvasLayer[] + HtmlLayer(最前面)** を採用する。

1つのWebGPUコンテキストで複数のCanvasLayerを合成描画し、HTMLレイヤーは常に最前面に配置する。

## 実装詳細

### モジュール構成

```
apps/web/src/modules/HeroScene/
├── Domain/
│   └── index.ts       # 型定義、ファクトリ関数
├── Application/
│   └── index.ts       # ポート、ユースケース
├── Infra/
│   ├── TextTextureRenderer.ts   # Canvas 2D → GPUテクスチャ
│   ├── HeroSceneRenderer.ts     # レイヤー合成レンダラー
│   └── index.ts
└── index.ts           # 公開API
```

### 主要な型

```typescript
// Canvasレイヤーの種類
type CanvasLayerType = 'texture' | 'maskedTexture' | 'image' | 'text'

// Canvasレイヤー
interface CanvasLayer {
  id: string
  name: string
  visible: boolean
  opacity: number
  zIndex: number
  config: CanvasLayerConfig
  blendMode: BlendMode
}

// HTMLレイヤー（常に最前面）
interface HtmlLayer {
  id: string
  layoutId: string
  items: HtmlContentItem[]
}

// シーン全体
interface HeroScene {
  config: HeroSceneConfig
  canvasLayers: CanvasLayer[]  // zIndexでソート
  htmlLayer: HtmlLayer
}
```

### レンダリングフロー

1. `canvasLayers`をzIndex順（小さい順=奥から）にソート
2. 各レイヤーを順番に合成描画（`clear: false`で重ね塗り）
3. HTMLレイヤーはCSSで最前面に配置（`z-index`またはDOM順序）

### テキストレイヤー

ADR-001に基づき、Canvas 2D → GPUテクスチャ変換でテキストを描画:

1. フォント変更時にCanvas 2Dで再描画
2. `copyExternalImageToTexture`でGPUテクスチャを更新
3. シェーダーで指定位置にテクスチャを配置

## 影響

- `useTexturePreview`は`HeroSceneUseCase`に置き換え
- `HeroPreview.vue`は新しいレイヤーシステムを使用
- 将来的にレイヤーパネルUIを追加可能

## 関連ADR

- ADR-001: WebGPU上でのテキストレンダリング方式
