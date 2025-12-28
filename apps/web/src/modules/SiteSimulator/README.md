# SiteSimulator Module

HTML/CSSに光とフィルター（LUT）の概念を追加し、統一感のあるWebサイトを構築するためのモジュール。

## 概要

- **Primitive Palette（ベース40色）** を土台に
- **Brand Color** からプライマリ・アクセントを派生
- **光源** と **フィルター（LUT）** を適用して最終色を決定
- **data-* 属性** でHTMLにセマンティック情報を付与
- 最終出力は Display-P3 の CSS変数

## アーキテクチャ

```
apps/web/src/modules/SiteSimulator/
├── Domain/
│   └── ValueObject/
│       ├── PrimitivePalette.ts     # ベース40色
│       ├── BrandPrimitive.ts       # ブランドカラー + variants
│       ├── CorePalette.ts          # brand/accent/neutral
│       ├── SemanticPalette.ts      # surface/text/brand/accent + SemanticColorToken
│       ├── PaletteOutput.ts        # 最終出力構造
│       ├── LightSource.ts          # 光源
│       ├── FilterPreset.ts         # フィルター（LUT）
│       ├── RenderedColor.ts        # レンダリング結果
│       ├── Material.ts             # マテリアル（default/plastic）
│       ├── LayoutDataAttributes.ts # data-* 属性の型定義
│       ├── LayoutHtml.ts           # HTMLテンプレート
│       ├── LayoutCssSpec.ts        # CSS仕様（変数 + ルール）
│       └── index.ts
├── Application/
│   ├── ports.ts                    # DI用インターフェース
│   └── index.ts
└── Infra/                          # レンダリング実装（未実装）
```

## パレット階層

```
PrimitivePalette (40色)
       ↓
BrandPrimitive (original → normalized → variants)
       ↓
CorePalette (brand.primary/accent + neutral)
       ↓
SemanticPalette (surface/text/brand/accent)
       ↓
+ LightSource + FilterPreset
       ↓
RenderedPalette (Display-P3)
       ↓
LayoutCssSpec (CSS変数 + ルール)
       ↓
LayoutHtml (data-* 属性付きHTML)
```

## 型定義

### パレット系

#### PrimitiveColor / PrimitivePalette

```typescript
type PrimitiveColor = {
  readonly name: string   // "base-blue-60" など
  readonly oklch: Oklch
}

type PrimitivePalette = {
  readonly baseColors: ReadonlyArray<PrimitiveColor>
}
```

#### BrandPrimitive

```typescript
type BrandPrimitive = {
  readonly original: Oklch     // 入力された元の色
  readonly normalized: Oklch   // アルベド安全範囲に補正済み
  readonly variants: {
    readonly light: Oklch
    readonly base: Oklch
    readonly dark: Oklch
  }
}
```

#### CorePalette

```typescript
type CorePalette = {
  readonly brand: {
    readonly primary: Oklch   // 主要ブランド色
    readonly accent: Oklch    // アクセントカラー
  }
  readonly neutral: {
    readonly base: Oklch      // surface用
    readonly strong: Oklch    // text-primary
    readonly weak: Oklch      // text-secondary
  }
}
```

#### SemanticPalette / SemanticColorToken

```typescript
type SemanticPalette = {
  readonly surface: { base, elevated, border }
  readonly text: { primary, secondary, muted, onBrandPrimary }
  readonly brand: { primary, hover, active }
  readonly accent: { base, hover }
}

// SemanticPaletteから自動導出されるトークン
type SemanticColorToken =
  | 'surface.base' | 'surface.elevated' | 'surface.border'
  | 'text.primary' | 'text.secondary' | 'text.muted' | 'text.onBrandPrimary'
  | 'brand.primary' | 'brand.hover' | 'brand.active'
  | 'accent.base' | 'accent.hover'
```

### レンダリング系

#### LightSource

```typescript
type LightSource = {
  readonly id: string
  readonly name: string
  readonly temperature: number  // ケルビン
  readonly tint: number         // -1〜1
  readonly intensity: number    // 強度倍率
}
```

#### FilterPreset

```typescript
type FilterPreset = {
  readonly id: string
  readonly name: string
  readonly lut: Lut  // Filter モジュールの LUT
}
```

### レイアウト系

#### Material

```typescript
type MaterialId = 'default' | 'plastic'
```

#### LayoutDataAttributes

HTMLテンプレートで使用可能な data-* 属性：

```typescript
type LayoutDataAttributes = {
  'data-bg-color'?: SemanticColorToken      // 背景色
  'data-text-color'?: SemanticColorToken    // テキスト色
  'data-border-color'?: SemanticColorToken  // ボーダー色
  'data-surface'?: 'base' | 'elevated'      // サーフェス種別
  'data-material'?: MaterialId              // マテリアル
  'data-thickness'?: number                 // 厚み (0, 1, 2+)
  'data-elevation'?: number                 // 高さ (0, 1, 2+)
  'data-layout'?: 'stack-vertical' | 'stack-horizontal' | 'inline'
}
```

#### LayoutHtml

```typescript
type LayoutHtml = {
  readonly id: string                    // テンプレートID
  readonly description?: string          // 説明
  readonly template: LayoutHtmlTemplate  // HTML文字列
}
```

例:
```html
<section data-surface="base" data-layout="stack-horizontal">
  <div data-surface="elevated" data-bg-color="surface.elevated" data-thickness="2">
    <img data-material="plastic" src="/hero.jpg" />
  </div>
  <div data-layout="stack-vertical">
    <h1 data-text-color="text.primary">Title</h1>
    <button
      data-material="plastic"
      data-bg-color="brand.primary"
      data-text-color="text.onBrandPrimary"
    >
      Action
    </button>
  </div>
</section>
```

#### LayoutCssSpec

```typescript
type LayoutCssSpec = {
  readonly themeRootSelector: string           // ":root" など
  readonly colorVarMap: ColorVariableMap       // token → CSS変数名
  readonly colorVarValues: CssVariableValues   // CSS変数 → 値
  readonly rules: CssRuleTemplate[]            // data-* に対応するルール
}

type CssRuleTemplate = {
  readonly selector: string                    // '[data-bg-color="brand.primary"]'
  readonly declarations: Record<string, string>
}
```

### プレビュー系（3Dシーン）

#### PreviewSceneConfig / PreviewScene

```typescript
type PreviewSceneConfig = {
  readonly layout: LayoutHtml
  readonly palette: SemanticPalette
  readonly lightSource: LightSource
  readonly filter?: FilterPreset
}

type PreviewScene = {
  readonly space: Space              // Lighting モジュールの Space
  readonly config: PreviewSceneConfig
  readonly viewport: { width: number; height: number }
}

type PreviewRenderOptions = {
  readonly shadows: boolean
  readonly shadowBlur: number
  readonly ambientOcclusion: boolean
  readonly quality: 'low' | 'medium' | 'high'
}
```

#### PreviewElement / PreviewElementTree

```typescript
type PreviewElement = {
  readonly id: string
  readonly bounds: { x, y, width, height }
  readonly depth: number              // Z-depth (data-elevation)
  readonly thickness: number          // data-thickness
  readonly material: MaterialId
  readonly bgColorToken?: SemanticColorToken
  readonly textColorToken?: SemanticColorToken
  readonly borderColorToken?: SemanticColorToken
  readonly borderRadius?: number
  readonly surface?: 'base' | 'elevated'
}

type PreviewElementTree = {
  readonly elements: ReadonlyArray<PreviewElement>
  readonly roots: ReadonlyArray<string>
  readonly children: ReadonlyMap<string, ReadonlyArray<string>>
}
```

### 成果物系（Output Artifacts）

#### CssOutput

```typescript
type BoxShadowOutput = {
  readonly selector: string
  readonly boxShadow: string
}

type CssOutput = {
  readonly spec: LayoutCssSpec
  readonly boxShadows: ReadonlyArray<BoxShadowOutput>
  readonly raw: string  // 埋め込み用CSS文字列
}
```

#### HtmlOutput

```typescript
type HtmlOutput = {
  readonly templateId: string
  readonly html: string           // レンダリング済みHTML
  readonly inlineStyles?: string
}
```

#### AssetOutput

```typescript
type ImageAsset = {
  readonly src: string            // 元画像パス
  readonly processed: string      // LUT適用後（data URL / blob URL）
  readonly width: number
  readonly height: number
  readonly filterId?: string
}

type AssetOutput = {
  readonly images: ReadonlyArray<ImageAsset>
}
```

#### SiteArtifact

```typescript
type SiteArtifact = {
  readonly palette: RenderedPalette   // レンダリング済みパレット（Display-P3）
  readonly css: CssOutput
  readonly html: HtmlOutput
  readonly assets: AssetOutput
  readonly metadata: {
    readonly generatedAt: string
    readonly brandColor: string
    readonly accentColor: string
    readonly lightSourceId: string
    readonly filterId?: string
  }
}
```

## Application層 ポート

| ポート | 責務 |
|--------|------|
| `ColorRenderer` | Oklch + LightSource + Filter → RenderedColor |
| `PaletteGenerator` | ブランドHEX + アクセントHEX → PaletteOutput |
| `CssExporter` | RenderedPalette → CSS変数/JSON |
| `SiteSimulatorService` | 統合ファサード |

---

## 実装フェーズ

### Phase 0: コアロジック決め打ち版
**ゴール**: ローカルで実行したら1セットのカラーパレットJSONが出力される

- [ ] ベース40色をコードに直書き（OKLCH配列）
- [ ] 仮のブランドカラーを1つ決め打ち
- [ ] BrandPrimitive → CorePalette → SemanticPalette の変換ロジック
- [ ] フィルターは1種類だけ適用（もしくはなし）
- [ ] 結果をJSON/コンソールログで出力
- [ ] UIなしでOK、TypeScript関数群だけ

### Phase 1: 縦に薄いプロトタイプ
**ゴール**: ブラウザで「ブランドカラー入力 → パレット表示」

- [ ] 簡単なフォーム（ブランドカラーHEX + アクセントカラーHEX入力）
- [ ] Phase 0のロジックを関数化して呼び出し
- [ ] 結果パレットを色チップ + CSS color(display-p3 ...) で表示

### Phase 2: フィルター & 光源の導入
**ゴール**: パレットに対してフィルター/光源の切り替えで見え方が変わる

- [ ] フィルタープリセット 3〜4個追加（LUTベース）
- [ ] 光源プリセット 4つ用意
- [ ] 「フィルター選択」「光源選択」のUIを追加
- [ ] パレット表示 + 簡単なコンポーネント（ボタン1個とか）にプレビュー

### Phase 3: HTML/CSSへのマッピング
**ゴール**: レンダリング済みパレットからCSS変数出力 + HTMLテンプレート

- [ ] SemanticPalette → LayoutCssSpec 変換
- [ ] data-* 属性に対応するCSSルール生成
- [ ] LayoutHtml テンプレート作成
- [ ] デモHTMLで実際にそのCSSを読み込ませて簡単なUIを表示

### Phase 4以降: カスタマイズ性の作り込み

- [ ] ベース40色を差し替え可能に
- [ ] ComponentPalette（button/input/card）の追加
- [ ] dark mode 対応
- [ ] state色（error/success/warning）の追加
- [ ] マテリアル追加（paper, glass）

---

## 依存モジュール

- `Color`: Oklch, DisplayP3, Srgb などの色空間
- `Filter`: Lut（1D/3D LUT）
- `Lighting`: Space, SceneObject, Light, Camera（プレビュー用3Dレンダリング）

## 設計方針

- Domain層は純粋な型とファクトリ関数のみ（外部依存なし）
- Application層でポート（インターフェース）を定義
- Infra層で具体的なレンダリング実装（将来的にDI可能）
- HTMLテンプレートは文字列として扱い、パーサー不要
- data-* 属性でセマンティック情報を付与、CSSルールで見た目を制御
