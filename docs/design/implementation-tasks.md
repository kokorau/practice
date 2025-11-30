# Implementation Tasks

Page/Section Rendering System 実装のタスク分割。

---

## Task 1: ColorPalette モジュール

### 概要
セマンティックカラーパレットの定義。Themeの構成要素。

### サブタスク

- [ ] **1.1** Domain/ValueObject 設計
  - セマンティックカラーの種類決定
  - グレースケールの段階決定
  - 型定義

- [ ] **1.2** ファクトリ関数実装
  - `$ColorPalette.create()` - パレット生成
  - `$ColorPalette.fromBrandColor()` - ブランドカラーから派生生成

- [ ] **1.3** 色操作ユーティリティ
  - Oklch ベースの明度/彩度調整
  - コントラスト比計算（アクセシビリティ）

- [ ] **1.4** プリセット作成
  - デフォルトパレット
  - ダーク/ライトモード対応

### 依存関係
- 既存 `Color` モジュール（Oklch, Srgb など）

### 出力ファイル
```
apps/web/src/modules/ColorPalette/
├── Domain/ValueObject/
│   ├── ColorPalette.ts
│   ├── SemanticColor.ts
│   └── GrayScale.ts
└── index.ts
```

---

## Task 2: StylePack モジュール

### 概要
UIスタイルのパラメータセット（rounded, padding, elevation など）。

### サブタスク

- [ ] **2.1** Domain/ValueObject 設計
  - StylePack 型定義
  - 各プロパティの値範囲決定

- [ ] **2.2** プリセット作成
  - Default, Compact, Spacious など

### 出力ファイル
```
apps/web/src/modules/StylePack/
├── Domain/ValueObject/
│   └── StylePack.ts
└── index.ts
```

---

## Task 3: Theme モジュール

### 概要
Lighting + ColorPalette + StylePack + Filter の統合。

### サブタスク

- [ ] **3.1** Domain/ValueObject 設計
  - Theme 型定義
  - ThemeOverride 型（部分適用用）

- [ ] **3.2** Theme マージロジック
  - `mergeTheme(base, override)` 実装
  - shallow vs deep merge の決定

- [ ] **3.3** プリセット作成
  - デフォルトテーマ

### 依存関係
- Lighting（既存）
- Filter（既存）
- ColorPalette（Task 1）
- StylePack（Task 2）

### 出力ファイル
```
apps/web/src/modules/Theme/
├── Domain/ValueObject/
│   ├── Theme.ts
│   └── ThemeOverride.ts
├── Application/
│   └── MergeTheme.ts
└── index.ts
```

---

## Task 4: Section モジュール

### 概要
Template + ContentSchema + ThemeOverride の構造定義。

### サブタスク

- [ ] **4.1** Domain/ValueObject 設計
  - Section 型定義
  - Template 型（slot定義含む）
  - ContentSchema 型（ガイドライン）

- [ ] **4.2** SlotValue 型定義
  - text, image, list, richText

- [ ] **4.3** ガイドラインチェッカー
  - ContentSchema vs ContentValue の比較
  - アドバイスメッセージ生成

### 出力ファイル
```
apps/web/src/modules/Section/
├── Domain/ValueObject/
│   ├── Section.ts
│   ├── Template.ts
│   ├── ContentSchema.ts
│   └── SlotValue.ts
├── Application/
│   └── ValidateContent.ts
└── index.ts
```

---

## Task 5: Page モジュール

### 概要
複数Sectionの集合 + デフォルトTheme。

### サブタスク

- [ ] **5.1** Domain/ValueObject 設計
  - Page 型定義
  - SectionRef 型

- [ ] **5.2** レンダリングパイプライン
  - Page → Section 列挙
  - effectiveTheme 計算

### 依存関係
- Theme（Task 3）
- Section（Task 4）

### 出力ファイル
```
apps/web/src/modules/Page/
├── Domain/ValueObject/
│   ├── Page.ts
│   └── SectionRef.ts
├── Application/
│   └── ResolvePage.ts
└── index.ts
```

---

## 推奨実装順序

```
1. ColorPalette  ──┐
2. StylePack     ──┼──> 3. Theme ──> 4. Section ──> 5. Page
```

ColorPalette と StylePack は並行作業可能。
Theme 以降は依存関係あり。

---

## 質問・未決定事項

### ColorPalette
- [ ] セマンティックカラーの具体的な種類は？
  - primary, secondary, accent?
  - success, warning, error, info?
  - その他？
- [ ] グレースケールの段階数は？（50〜950 の11段階？）
- [ ] ダーク/ライトモードは最初から考慮する？

### StylePack
- [ ] elevation の具体的な実装方法は？（box-shadow? filter?）
- [ ] rounded の段階は？（none, sm, md, lg, full?）

### Theme
- [ ] merge は shallow? deep?
- [ ] ThemeOverride で部分上書きする場合のデフォルト値の扱いは？
