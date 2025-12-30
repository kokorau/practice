# ADR-001: WebGPU上でのテキストレンダリング方式

## ステータス

承認済み

## コンテキスト

HeroViewGeneratorにおいて、タイトルや装飾テキストをWebGPUでレンダリングされた背景上に配置する必要がある。WebGPU/WebGL上でテキストをレンダリングする方法を選定する。

### 要件

- 指定したWebフォントでテキストを表示
- ヒーローセクション用の大きめのテキスト（48px〜72px程度）
- ブラウザのネイティブフォントレンダリングとの整合性
- 実装の複雑さを抑える

## 検討した選択肢

### 1. Canvas 2D → テクスチャ変換

オフスクリーンのCanvas 2Dでテキストを描画し、そのCanvasをWebGPUテクスチャとしてコピーする。

**メリット:**
- ブラウザのネイティブフォントレンダリングをそのまま活用
- Webフォント対応が容易
- 実装がシンプル

**デメリット:**
- 拡大時にぼやける可能性（ただし高解像度レンダリングで対応可能）
- テキスト更新時にテクスチャ再生成が必要

### 2. SDF/MSDF (Signed Distance Field)

フォントをSDF/MSDF形式に事前変換し、シェーダーで距離値からエッジを計算する。

**メリット:**
- 任意のスケールでシャープなエッジ
- GPU側で高速にレンダリング

**デメリット:**
- フォントの事前変換が必要（msdf-bmfont-xml等）
- 日本語フォントは大量のグリフでアトラスが巨大になる
- 実装が複雑

### 3. 既存ライブラリ（troika-three-text, pixi.js等）

テキストレンダリングに特化したライブラリを使用。

**メリット:**
- 実装コストが低い
- 高品質なレンダリング

**デメリット:**
- Three.js等への依存が発生
- 既存のWebGPUパイプラインとの統合が複雑

## 決定

**選択肢1: Canvas 2D → テクスチャ変換** を採用する。

## 理由

1. **実装のシンプルさ**: 既存のWebGPUパイプラインに最小限の変更で統合可能
2. **フォント互換性**: ブラウザのネイティブレンダリングを使うため、CSSで表示するフォントと完全に同じ見た目
3. **ユースケースとの適合**: ヒーローセクションの大きなテキストは等倍〜やや縮小で表示されることが多く、拡大によるぼやけの問題が発生しにくい
4. **日本語対応**: SDFと違いグリフ数の制約がない

## 実装方針

### 高解像度レンダリング

`devicePixelRatio`を考慮して描画し、Retinaディスプレイでもシャープに表示する。

```typescript
const scale = window.devicePixelRatio
ctx.font = `${fontSize * scale}px ${fontFamily}`
```

### テクスチャ更新タイミング

フォントやテキストが変更されたタイミングで:

1. Canvas 2Dでテキストを再描画
2. `device.queue.copyExternalImageToTexture()`でGPUテクスチャを更新
3. 次フレームで反映

### Webフォント読み込み待機

フォントが読み込まれる前に描画するとfallbackフォントになるため、`document.fonts.ready`を待機する。

```typescript
await document.fonts.ready
textTexture.update(text, font, size)
```

### テクスチャサイズの目安

- 72px タイトル（20文字程度）: 約 1600 x 200px（Retina）
- メモリ使用量: 約1.3MB/テクスチャ
- WebGPU最大テクスチャサイズ（8192x8192）に対して十分余裕あり

## 影響

- `useTexturePreview` composableにテキストテクスチャ管理機能を追加
- HeroPreviewコンポーネントでテキスト入力UIを追加
- シェーダーにテキストテクスチャのサンプリング処理を追加

## 参考

- [WebGPU Spec - copyExternalImageToTexture](https://www.w3.org/TR/webgpu/#dom-gpuqueue-copyexternalimagetotexture)
- [Canvas API - fillText](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText)
