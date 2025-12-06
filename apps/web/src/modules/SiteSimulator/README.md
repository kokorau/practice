# SiteSimulator Module

HTML/CSSに光とフィルター（LUT）の概念を追加し、統一感のあるWebサイトを構築するためのモジュール。

## 概要

- **Primitive Palette（ベース40色）** を土台に
- **Brand Color** からプライマリ・アクセントを派生
- **光源** と **フィルター（LUT）** を適用して最終色を決定
- 最終出力は Display-P3 の CSS変数

## アーキテクチャ

```
apps/web/src/modules/SiteSimulator/
├── Domain/
│   └── ValueObject/
│       ├── PrimitivePalette.ts   # ベース40色
│       ├── BrandPrimitive.ts     # ブランドカラー + variants
│       ├── CorePalette.ts        # brand/accent/neutral
│       ├── SemanticPalette.ts    # surface/text/brand/accent
│       ├── PaletteOutput.ts      # 最終出力構造
│       ├── LightSource.ts        # 光源
│       ├── FilterPreset.ts       # フィルター（LUT）
│       ├── RenderedColor.ts      # レンダリング結果
│       └── index.ts
├── Application/
│   ├── ports.ts                  # DI用インターフェース
│   └── index.ts
└── Infra/                        # レンダリング実装（未実装）
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
CSS Variables
```

## 型定義

### PrimitiveColor / PrimitivePalette

```typescript
type PrimitiveColor = {
  readonly name: string   // "base-blue-60" など
  readonly oklch: Oklch
}

type PrimitivePalette = {
  readonly baseColors: ReadonlyArray<PrimitiveColor>
}
```

### BrandPrimitive

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

### CorePalette

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

### SemanticPalette

```typescript
type SemanticPalette = {
  readonly surface: {
    readonly base: Oklch       // ページ背景
    readonly elevated: Oklch   // カード・モーダル
    readonly border: Oklch
  }
  readonly text: {
    readonly primary: Oklch
    readonly secondary: Oklch
    readonly muted: Oklch
    readonly onBrandPrimary: Oklch
  }
  readonly brand: {
    readonly primary: Oklch
    readonly hover: Oklch
    readonly active: Oklch
  }
  readonly accent: {
    readonly base: Oklch
    readonly hover: Oklch
  }
}
```

### LightSource

```typescript
type LightSource = {
  readonly id: string
  readonly name: string
  readonly temperature: number  // ケルビン
  readonly tint: number         // -1〜1
  readonly intensity: number    // 強度倍率
}
```

### FilterPreset

```typescript
type FilterPreset = {
  readonly id: string
  readonly name: string
  readonly lut: Lut  // Filter モジュールの LUT
}
```

### ColorSystemResult

```typescript
type ColorSystemResult = {
  readonly input: {
    readonly brandColor: string
    readonly filterId?: string
    readonly lightSourceId?: string
  }
  readonly palette: PaletteOutput
  readonly cssVariables: Record<string, string>
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
**ゴール**: レンダリング済みパレットからCSS変数出力

- [ ] SemanticPalette から CSS変数名へのマッピング
- [ ] `:root { --color-surface-base: ... }` のようなCSS文字列を出力
- [ ] デモHTMLで実際にそのCSSを読み込ませて簡単なUIを表示

### Phase 4以降: カスタマイズ性の作り込み

- [ ] ベース40色を差し替え可能に
- [ ] ComponentPalette（button/input/card）の追加
- [ ] dark mode 対応
- [ ] state色（error/success/warning）の追加

---

## 依存モジュール

- `Color`: Oklch, DisplayP3, Srgb などの色空間
- `Filter`: Lut（1D/3D LUT）

## 設計方針

- Domain層は純粋な型とファクトリ関数のみ（外部依存なし）
- Application層でポート（インターフェース）を定義
- Infra層で具体的なレンダリング実装（将来的にDI可能）
