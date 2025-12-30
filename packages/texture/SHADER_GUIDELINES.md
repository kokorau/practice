# WGSL Shader Guidelines

`@practice/texture` パッケージにおけるシェーダーの書き方ガイドライン。

## アーキテクチャ

```
packages/texture/src/
├── Domain/
│   └── ValueObject/
│       ├── TexturePattern.ts      # RGBA, Viewport, TexturePattern型
│       ├── TextureRenderSpec.ts   # shader + uniforms (レンダリング用)
│       └── TexturePatternSpec.ts  # shader + params (シリアライズ可能)
├── Application/
│   ├── CreateUniforms.ts          # params → ArrayBuffer 変換
│   └── CreateTexturePatternSpec.ts
├── Infra/
│   ├── defaultTexturePatterns.ts  # プリセットパターン
│   └── defaultMaskPatterns.ts
├── shaders/
│   ├── common.ts                  # 共通部品
│   ├── solid.ts                   # べた塗り
│   ├── stripe.ts                  # ストライプ
│   ├── grid.ts                    # グリッド
│   ├── polkaDot.ts                # 水玉
│   ├── checker.ts                 # チェッカー
│   ├── mask.ts                    # マスク（circle, rect）
│   ├── blob.ts                    # Blob形状
│   ├── maskedTexture.ts           # マスク付きテクスチャ
│   ├── vignette.ts                # ビネットフィルター
│   ├── chromaticAberration.ts     # 色収差フィルター
│   └── image.ts                   # 画像テクスチャ
├── filters/
│   └── index.ts                   # フィルター系のエクスポート
└── TextureRenderer.ts             # WebGPUレンダラー
```

## 型定義の階層

### 1. TexturePatternParams（Domain層）

シリアライズ可能なパラメータ。JSONとして保存・復元可能。

```typescript
// 単純なテクスチャ
type SimpleTexturePatternParams =
  | SolidPatternParams
  | StripePatternParams
  | GridPatternParams
  | PolkaDotPatternParams

// マスク形状
type MaskPatternParams =
  | CircleMaskPatternParams
  | RectMaskPatternParams

// マスク付きテクスチャ（3マスク × 3テクスチャ = 9種類）
type MaskedTexturePatternParams =
  | CircleStripePatternParams
  | CircleGridPatternParams
  | CirclePolkaDotPatternParams
  | RectStripePatternParams
  | RectGridPatternParams
  | RectPolkaDotPatternParams
  | BlobStripePatternParams
  | BlobGridPatternParams
  | BlobPolkaDotPatternParams

// フィルター
type FilterPatternParams =
  | VignettePatternParams
  | ChromaticAberrationPatternParams

// 全パターンの統合型
type TexturePatternParams =
  | SimpleTexturePatternParams
  | MaskPatternParams
  | MaskedTexturePatternParams
  | FilterPatternParams
```

### 2. TextureRenderSpec（Domain層）

レンダリング時に使用。uniformsはArrayBufferとして事前計算済み。

```typescript
interface TextureRenderSpec {
  shader: string           // WGSLコード
  uniforms: ArrayBuffer    // GPU用バッファ
  bufferSize: number       // 16バイトアライメント
  blend?: GPUBlendState    // ブレンドモード
}
```

### 3. TexturePatternSpec（Domain層）

自己完結型の仕様。paramsを保持し、render時にviewportを渡してuniformsを生成。

```typescript
interface TexturePatternSpec {
  shader: string               // WGSLコード（静的）
  bufferSize: number           // バッファサイズ
  blend?: GPUBlendState        // ブレンドモード
  params: TexturePatternParams // シリアライズ可能なパラメータ
}
```

## シェーダーファイルの標準フォーマット

新しいシェーダーを追加する際は以下のフォーマットに従う。

```typescript
// ============================================================
// 1. インポート
// ============================================================
import { fullscreenVertex, aaUtils, maskBlendState } from './common'
import type { TextureRenderSpec, Viewport } from '../Domain'

// ============================================================
// 2. パラメータ型定義（TypeScript）
// ============================================================
/**
 * パラメータの説明
 */
export interface XxxTextureParams {
  /** 各フィールドにJSDocコメント */
  color: [number, number, number, number]
  size: number
}

// ============================================================
// 3. バッファサイズ定数
// ============================================================
/**
 * Uniform buffer size (16-byte aligned)
 * Layout: color(vec4f=16) + size(f32=4) + padding(12) = 32 bytes
 */
export const XXX_BUFFER_SIZE = 32

// ============================================================
// 4. WGSLシェーダー
// ============================================================
export const xxxShader = /* wgsl */ `
// Uniform構造体（TypeScriptのパラメータ型と対応）
struct Params {
  color: vec4f,      // 16 bytes
  size: f32,         // 4 bytes
  _padding: vec3f,   // 12 bytes (alignment to 32)
}

@group(0) @binding(0) var<uniform> params: Params;

${fullscreenVertex}

${aaUtils}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // シェーダーロジック
  return params.color;
}
`

// ============================================================
// 5. Spec生成関数
// ============================================================
/**
 * TextureRenderSpecを生成
 */
export function createXxxSpec(
  params: XxxTextureParams,
  viewport?: Viewport  // viewport依存の場合のみ
): TextureRenderSpec {
  const data = new Float32Array([
    ...params.color,
    params.size,
    0, 0, 0,  // padding
  ])

  return {
    shader: xxxShader,
    uniforms: data.buffer,
    bufferSize: XXX_BUFFER_SIZE,
    // blend: maskBlendState,  // 透明度を使う場合
  }
}
```

## 共通部品（common.ts）

### fullscreenVertex

フルスクリーン三角形を描画する頂点シェーダー。全シェーダーで使用。

```wgsl
@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}
```

### aaUtils

アンチエイリアス用ユーティリティ関数。

```wgsl
// 1pxエッジのスムーズステップ
fn aaStep(edge: f32, x: f32) -> f32 {
  return smoothstep(edge - 0.5, edge + 0.5, x);
}

// 2色間のAA補間
fn aaMix(color1: vec4f, color2: vec4f, edge: f32, x: f32) -> vec4f {
  let t = aaStep(edge, x);
  return mix(color1, color2, t);
}
```

### maskBlendState

マスク・フィルター用のアルファブレンドステート。

```typescript
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

## Uniform バッファのルール

### 1. 16バイトアライメント

WGSLのuniform構造体は16バイト境界にアライメントされる。

```wgsl
struct Good {
  color: vec4f,    // 16 bytes (offset 0)
  size: f32,       // 4 bytes  (offset 16)
  _padding: vec3f, // 12 bytes (offset 20) → 合計32 bytes
}

struct Bad {
  size: f32,       // 4 bytes
  color: vec4f,    // NG: vec4fは16バイト境界が必要
}
```

### 2. バッファサイズの計算

```
vec4f = 16 bytes
vec3f = 12 bytes (ただし構造体内では16バイトにパディング)
vec2f = 8 bytes
f32   = 4 bytes
u32   = 4 bytes
i32   = 4 bytes
```

### 3. パディングの明示

常に `_padding` フィールドで明示的にパディング。

```wgsl
struct Params {
  color1: vec4f,        // 16 bytes
  color2: vec4f,        // 16 bytes
  width: f32,           // 4 bytes
  height: f32,          // 4 bytes
  _padding: vec2f,      // 8 bytes → 合計48 bytes
}
```

## TexturePatternParams への追加方法

新しいパターンを追加する場合：

### 1. パラメータ型を定義（TexturePatternSpec.ts）

```typescript
export interface NewPatternParams {
  type: 'newPattern'  // discriminant
  color: RGBA
  intensity: number
}
```

### 2. Union型に追加

```typescript
export type SimpleTexturePatternParams =
  | SolidPatternParams
  | StripePatternParams
  | ...
  | NewPatternParams  // 追加
```

### 3. createUniforms に分岐を追加（CreateUniforms.ts）

```typescript
case 'newPattern':
  return createNewPatternUniforms(params, viewport)
```

---

## 改善が必要な点

### 1. maskedTexture.ts の分割

**現状**: 1050行と巨大。9種類のマスク×テクスチャ組み合わせが1ファイルに集約。

**改善案**: ディレクトリ構造で分割

```
shaders/
├── maskedTexture/
│   ├── index.ts           # エクスポート
│   ├── patterns.ts        # texture pattern関数（stripe, grid, polkaDot）
│   ├── masks.ts           # mask SDF関数（circle, rect, blob）
│   ├── circleTextures.ts  # circle mask × 3 textures
│   ├── rectTextures.ts    # rect mask × 3 textures
│   └── blobTextures.ts    # blob mask × 3 textures
```

### 2. Uniform構造体の共通化

**現状**: 各シェーダーで類似のstruct定義が重複している。

**改善案**: 共通のstruct部品を `common.ts` に定義

```typescript
// common.ts に追加
export const viewportFields = /* wgsl */ `
  viewportWidth: f32,
  viewportHeight: f32,
`

export const colorPairFields = /* wgsl */ `
  color1: vec4f,
  color2: vec4f,
`
```

### 3. bufferSize の定数化

**現状**: 各 `createXxxSpec` 関数内でハードコードされている。

**改善案**: 各シェーダーファイルで定数として定義

```typescript
// stripe.ts
export const STRIPE_BUFFER_SIZE = 48

export function createStripeSpec(params: StripeTextureParams): TextureRenderSpec {
  // ...
  return {
    shader: stripeShader,
    uniforms: data.buffer,
    bufferSize: STRIPE_BUFFER_SIZE,  // 定数を参照
  }
}
```

### 4. シェーダーコードの型安全性

**現状**: WGSLとTypeScriptの型の不一致を検出する仕組みがない。

**改善案**: テスト時にシェーダーコンパイルを検証

```typescript
// stripe.test.ts
describe('stripe shader', () => {
  it('should compile without errors', async () => {
    const device = await getTestDevice()
    const module = device.createShaderModule({ code: stripeShader })
    const info = await module.getCompilationInfo()
    expect(info.messages.filter(m => m.type === 'error')).toHaveLength(0)
  })
})
```

---

## チェックリスト（新規シェーダー追加時）

- [ ] パラメータ型をTypeScriptで定義（JSDocコメント付き）
- [ ] `TexturePatternParams` union型に追加（type discriminant必須）
- [ ] バッファサイズを定数として定義（16バイトアライメント確認）
- [ ] WGSLシェーダーを `/* wgsl */` テンプレートリテラルで記述
- [ ] `fullscreenVertex` を使用
- [ ] 必要に応じて `aaUtils` を使用
- [ ] 透明度を使う場合は `maskBlendState` を指定
- [ ] `createXxxSpec` 関数を実装
- [ ] `shaders/index.ts` からエクスポート
- [ ] `packages/texture/src/index.ts` から型とspec関数をエクスポート
- [ ] `CreateUniforms.ts` に分岐を追加（TexturePatternSpecを使う場合）

---

## 参考: 既存シェーダーの対応表

| ファイル | パターン | viewport依存 | blend |
|---------|---------|-------------|-------|
| solid.ts | solid | No | No |
| stripe.ts | stripe | No | No |
| grid.ts | grid | No | No |
| polkaDot.ts | polkaDot | No | No |
| checker.ts | checker | No | No |
| mask.ts | circleMask, rectMask | Yes | Yes |
| blob.ts | blobMask | Yes | Yes |
| maskedTexture.ts | circle/rect/blob × stripe/grid/polkaDot | Yes | Yes |
| vignette.ts | vignette | Yes | Yes |
| chromaticAberration.ts | chromaticAberration | Yes | No |
