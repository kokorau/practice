# Mask Shader Guideline

ユーザーが自由にマスクシェーダーを作成するためのガイドライン。

## 概要

このガイドラインでは、`@practice/texture` パッケージにおけるカスタムマスクシェーダーの作成方法を説明します。

## 現在のマスク形状

| 形状 | 説明 | 主なパラメータ |
|------|------|----------------|
| `circle` | 円形マスク | centerX, centerY, radius, cutout |
| `rect` | 角丸矩形マスク | left, right, top, bottom, radius×4, cutout |
| `blob` | 波形変形円マスク | center, baseRadius, amplitude, octaves, seed, cutout |
| `perlin` | Perlinノイズマスク | seed, threshold, scale, octaves, cutout |

## マスクシェーダーの基本構造

### 1. 必須のパラメータ構造体

すべてのマスクシェーダーは以下の共通パラメータを含む必要があります。

```wgsl
struct Params {
    // ===== マスク固有のパラメータ =====
    param1: f32,
    param2: f32,
    // ...

    // ===== 共通パラメータ（必須） =====
    innerColor: vec4f,     // マスク内側の色
    outerColor: vec4f,     // マスク外側の色
    viewportWidth: f32,
    viewportHeight: f32,
    _padding: vec2f,       // 16バイト境界調整
}
```

### 2. フラグメントシェーダーの基本形

```wgsl
@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let aspectRatio = params.viewportWidth / params.viewportHeight;
    let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

    // 1. SDF（Signed Distance Field）を計算
    let sdf = calculateSDF(uv, aspectRatio);

    // 2. アンチエイリアス処理
    let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
    let alpha = smoothstep(-pixelSize, pixelSize, sdf);

    // 3. 色の補間
    return mix(params.innerColor, params.outerColor, alpha);
}
```

## 必須の共通処理

### 1. アスペクト比補正

正方形でないビューポートでの歪みを補正します。

```wgsl
fn aspectCorrectedUV(uv: vec2f, center: vec2f, aspectRatio: f32) -> vec2f {
    var delta = uv - center;
    // 横長の場合はXを拡大、縦長の場合はYを拡大
    delta.x *= max(aspectRatio, 1.0);
    delta.y *= max(1.0 / aspectRatio, 1.0);
    return delta;
}
```

**使用例（円形マスク）:**

```wgsl
let center = vec2f(params.centerX, params.centerY);
var delta = uv - center;

// アスペクト比補正
delta.x *= max(aspectRatio, 1.0);
delta.y *= max(1.0 / aspectRatio, 1.0);

let dist = length(delta);
```

### 2. アンチエイリアス

ピクセルサイズベースのスムージングでジャギーを防止します。

```wgsl
let pixelSize = 1.0 / min(viewportWidth, viewportHeight);
let smoothAlpha = smoothstep(edge - pixelSize, edge + pixelSize, dist);
```

**ポイント:**
- `pixelSize` は画面の短辺を基準に計算
- `smoothstep` で1ピクセル幅のグラデーションを作成

### 3. cutout モード

TypeScript側で色を交換することでcutoutモードを実現します。

```typescript
export function createMyMaskSpec(
    params: MyMaskParams,
    viewport: Viewport
): TextureRenderSpec {
    const cutout = params.cutout ?? true
    // cutout=false の場合、内外の色を交換
    const innerColor = cutout ? params.innerColor : params.outerColor
    const outerColor = cutout ? params.outerColor : params.innerColor

    // ...
}
```

| モード | 説明 |
|--------|------|
| `cutout = true (default)` | マスク外側にテクスチャ表示（穴あき効果） |
| `cutout = false` | マスク内側にテクスチャ表示（塗りつぶし効果） |

## バッファレイアウト制約

### 型とサイズ

| 型 | サイズ | アライメント |
|----|--------|--------------|
| `f32` | 4 bytes | 4 bytes |
| `u32` / `i32` | 4 bytes | 4 bytes |
| `vec2f` | 8 bytes | 8 bytes |
| `vec3f` | 12 bytes | 16 bytes |
| `vec4f` | 16 bytes | 16 bytes |

### 16バイト境界ルール

- 全バッファサイズは **16の倍数** にパディング
- `vec4f` は必ず16バイト境界から開始
- パディングは `_padding` フィールドで明示

**良い例:**

```wgsl
struct Params {
    innerColor: vec4f,        // 16 bytes (offset 0)
    outerColor: vec4f,        // 16 bytes (offset 16)
    centerX: f32,             // 4 bytes  (offset 32)
    centerY: f32,             // 4 bytes  (offset 36)
    radius: f32,              // 4 bytes  (offset 40)
    viewportWidth: f32,       // 4 bytes  (offset 44)
    viewportHeight: f32,      // 4 bytes  (offset 48)
    _padding: vec3f,          // 12 bytes (offset 52) → 合計 64 bytes
}
```

**悪い例:**

```wgsl
struct Params {
    centerX: f32,             // 4 bytes
    innerColor: vec4f,        // NG: vec4fが16バイト境界にない
}
```

## 新しいマスク追加の手順

### Step 1: TypeScript型定義を追加

`packages/texture/src/shaders/mask.ts` に追加：

```typescript
/** 星形マスクのパラメータ */
export interface StarMaskParams {
    /** 中心X座標 (0.0-1.0) */
    centerX: number
    /** 中心Y座標 (0.0-1.0) */
    centerY: number
    /** 外側の半径 (0.0-1.0) */
    outerRadius: number
    /** 内側の半径 (0.0-1.0) */
    innerRadius: number
    /** 頂点の数 */
    points: number
    /** 内側の色 */
    innerColor: [number, number, number, number]
    /** 外側の色 */
    outerColor: [number, number, number, number]
    /** cutout mode */
    cutout?: boolean
}
```

### Step 2: WGSLシェーダーを実装

```typescript
export const starMaskShader = /* wgsl */ `
${fullscreenVertex}

${aaUtils}

struct StarMaskParams {
    innerColor: vec4f,
    outerColor: vec4f,
    centerX: f32,
    centerY: f32,
    outerRadius: f32,
    innerRadius: f32,
    points: f32,
    aspectRatio: f32,
    viewportWidth: f32,
    viewportHeight: f32,
}

@group(0) @binding(0) var<uniform> params: StarMaskParams;

// 星形のSDF
fn starSDF(p: vec2f, outerR: f32, innerR: f32, n: f32) -> f32 {
    let angle = atan2(p.y, p.x);
    let segment = 6.283185 / n;
    let a = ((angle + segment / 2.0) % segment) - segment / 2.0;

    let r = cos(a) * outerR;
    let dist = length(p) - mix(innerR, outerR, cos(n * angle) * 0.5 + 0.5);

    return dist;
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);
    let center = vec2f(params.centerX, params.centerY);

    var delta = uv - center;
    delta.x *= max(params.aspectRatio, 1.0);
    delta.y *= max(1.0 / params.aspectRatio, 1.0);

    let sdf = starSDF(delta, params.outerRadius, params.innerRadius, params.points);

    let pixelSize = 1.0 / min(params.viewportWidth, params.viewportHeight);
    let alpha = smoothstep(-pixelSize, pixelSize, sdf);

    return mix(params.innerColor, params.outerColor, alpha);
}
`
```

### Step 3: Spec生成関数を実装

```typescript
/**
 * Create render spec for star mask
 */
export function createStarMaskSpec(
    params: StarMaskParams,
    viewport: Viewport
): TextureRenderSpec {
    const aspectRatio = viewport.width / viewport.height
    const cutout = params.cutout ?? true
    const innerColor = cutout ? params.innerColor : params.outerColor
    const outerColor = cutout ? params.outerColor : params.innerColor

    const data = new Float32Array([
        ...innerColor,
        ...outerColor,
        params.centerX,
        params.centerY,
        params.outerRadius,
        params.innerRadius,
        params.points,
        aspectRatio,
        viewport.width,
        viewport.height,
    ])

    return {
        shader: starMaskShader,
        uniforms: data.buffer,
        bufferSize: 64,  // 16バイト境界にアライン
        blend: maskBlendState,
    }
}
```

### Step 4: エクスポートを追加

`packages/texture/src/shaders/index.ts`:

```typescript
export {
    // 既存のエクスポート
    createCircleMaskSpec,
    createRectMaskSpec,
    createBlobMaskSpec,
    createPerlinMaskSpec,
    // 新規追加
    createStarMaskSpec,
    type StarMaskParams,
} from './mask'
```

### Step 5: （任意）プリセットを追加

`packages/texture/src/Infra/defaultMaskPatterns.ts`:

```typescript
export const starMaskPreset: StarMaskParams = {
    centerX: 0.5,
    centerY: 0.5,
    outerRadius: 0.3,
    innerRadius: 0.15,
    points: 5,
    innerColor: [1, 1, 1, 1],
    outerColor: [0, 0, 0, 0],
    cutout: true,
}
```

## SDF（Signed Distance Field）リファレンス

### 基本形状のSDF

```wgsl
// 円
fn circleSDF(p: vec2f, radius: f32) -> f32 {
    return length(p) - radius;
}

// 矩形
fn rectSDF(p: vec2f, halfSize: vec2f) -> f32 {
    let d = abs(p) - halfSize;
    return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
}

// 角丸矩形
fn roundedRectSDF(p: vec2f, halfSize: vec2f, radius: f32) -> f32 {
    let d = abs(p) - halfSize + radius;
    return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0) - radius;
}
```

### SDFの組み合わせ

```wgsl
// 和集合（OR）
fn unionSDF(d1: f32, d2: f32) -> f32 {
    return min(d1, d2);
}

// 差集合（NOT）
fn subtractSDF(d1: f32, d2: f32) -> f32 {
    return max(d1, -d2);
}

// 積集合（AND）
fn intersectSDF(d1: f32, d2: f32) -> f32 {
    return max(d1, d2);
}

// スムーズ和集合
fn smoothUnionSDF(d1: f32, d2: f32, k: f32) -> f32 {
    let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}
```

## 共通ユーティリティ関数

### common.ts で提供

```typescript
// フルスクリーン三角形（全シェーダー共通）
export const fullscreenVertex = /* wgsl */ `
@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
    var pos = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f(3.0, -1.0),
        vec2f(-1.0, 3.0)
    );
    return vec4f(pos[vertexIndex], 0.0, 1.0);
}
`

// アンチエイリアスユーティリティ
export const aaUtils = /* wgsl */ `
fn aaStep(edge: f32, x: f32) -> f32 {
    return smoothstep(edge - 0.5, edge + 0.5, x);
}
`

// マスク用ブレンドステート
export const maskBlendState: GPUBlendState = {
    color: {
        srcFactor: 'src-alpha',
        dstFactor: 'one-minus-src-alpha',
        operation: 'add',
    },
    alpha: {
        srcFactor: 'one',
        dstFactor: 'one-minus-src-alpha',
        operation: 'add',
    },
}
```

## チェックリスト

新しいマスクシェーダーを追加する際のチェックリスト：

- [ ] TypeScriptパラメータ型を定義（JSDocコメント付き）
- [ ] `cutout?: boolean` パラメータを含める
- [ ] `innerColor` / `outerColor` を含める
- [ ] バッファサイズが16の倍数であることを確認
- [ ] WGSLシェーダーで `fullscreenVertex` を使用
- [ ] アスペクト比補正を実装
- [ ] ピクセルベースのアンチエイリアスを実装
- [ ] `createXxxMaskSpec` 関数でcutout色交換を実装
- [ ] `maskBlendState` をブレンドモードに指定
- [ ] `shaders/index.ts` からエクスポート
- [ ] （任意）プリセットを `defaultMaskPatterns.ts` に追加

## 関連ドキュメント

- [SHADER_GUIDELINES.md](../SHADER_GUIDELINES.md) - 一般的なシェーダーガイドライン
- [TexturePattern.ts](../src/Domain/ValueObject/TexturePattern.ts) - 型定義
- [mask.ts](../src/shaders/mask.ts) - 既存マスクシェーダー実装

## 議論ポイント（将来の検討事項）

### maskedTextureの組み合わせ爆発

現在、マスク形状×テクスチャパターンの静的シェーダーが必要です。

**解決策の候補:**
- 動的シェーダー合成
- 2パスレンダリング（マスク→テクスチャ合成）

### ユーザー定義シェーダーの実行環境

- サンドボックス化の必要性
- バリデーション方法の検討
