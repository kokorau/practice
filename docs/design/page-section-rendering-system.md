# Page / Section Rendering System – Specification v1.0

本仕様書は、Webデザインの質感を統合的に扱う **Theme ベースのレイアウトシステム** を構築するためのデータ構造・責務分担・処理パイプラインを定義する。

---

## 1. System Overview

本システムは、ページを複数のセクションで構成し、各セクションは **テンプレート（構造）・コンテンツ（中身）・テーマ（質感）** の3層でレンダリングされる。

質感を構成する主要構成要素は以下の4つ：

- **Lighting**
- **ColorPalette**
- **StylePack**
- **Filter**

これらをまとめて **Theme** と呼ぶ。

---

## 2. Top-Level Entities

システムは以下の4大データ構造で構成される：

- **Page**
- **Section**
- **Content**
- **Theme**

---

## 3. Page

ページは複数のセクションから構成され、基本の Theme を持つ。

```ts
type Page = {
  id: string;
  theme: Theme;                 // ページ全体のデフォルトTheme
  sections: SectionRef[];       // セクションの並び順＋参照
};
```

---

## 4. Section

セクションは **構造（Template）＋ガイド（ContentSchema）＋ThemeOverride** を含む。

※ Section を "定義" と "インスタンス" に分ける可能性があるが、現段階の仕様では一体型。

```ts
type Section = {
  id: string;
  template: Template;           // HTML的構造 / layout
  contentSchema: ContentSchema; // ガイドライン（推奨値）
  themeOverride?: Theme;        // Page.Theme に対する上書き
};
```

---

## 5. Content

Section に対応する「実データ」。

- 文章・画像・リストなど
- `Section.contentSchema` に従った構造
- ただしガイドは"縛りではなく推奨"

```ts
type SectionContent = {
  sectionId: string;
  value: ContentValue;
};

type ContentValue = {
  slots: Record<string, SlotValue>;
};

type SlotValue =
  | { kind: "text"; value: string }
  | { kind: "image"; src: string; width?: number; height?: number }
  | { kind: "list"; items: string[] }
  | { kind: "richText"; value: string };
```

---

## 6. ContentSchema（ガイドライン）

セクションに必要なスロット構造と、各スロットに対する **推奨文字数・推奨画像比率・推奨項目数** などの「デザインガイド」を保持する。

デザインを強制せず、推奨値として扱うのがポイント。

```ts
type ContentSchema = {
  slots: SlotGuideline[];
};

type SlotGuideline = {
  slotId: string;             // "title" "body" "mainImage"
  kind: "text" | "image" | "list";
  required?: boolean;

  text?: {
    recommendedChars?: { min?: number; max?: number };
    recommendedLines?: { min?: number; max?: number };
  };

  image?: {
    recommendedAspectRatio?: { min: number; max: number };
    recommendedSize?: { minWidth?: number; minHeight?: number };
  };

  list?: {
    recommendedItems?: { min?: number; max?: number };
  };

  severity?: "info" | "suggest" | "warn"; // "強制"ではなく"推奨"
};
```

---

## 7. Theme

デザインの「質感」を構成するパラメータセット。

Section では Page-theme の上にローカル指定で上書き可。

```ts
type Theme = {
  id: string;
  lighting: Lighting;
  colorPalette: ColorPalette;
  stylePack: StylePack;
  filter: Filter;
};
```

### 7.1 Lighting

- 方向光
- 強度
- 色味（tint）
- 柔らかさ（shadow softness）
- フレネル効果など（任意）

### 7.2 ColorPalette

- セマンティックカラー（primary, success, warning, …）
- グレー階調
- ブランドカラー
- LUT変換前の"物体色（アルベド）"

### 7.3 StylePack

- rounded
- padding / gap
- elevation behavior
- surface type（flat / raised）

### 7.4 Filter

- LUT（3D LUT）
- highlights / shadows 補正
- contrast
- vignette など

---

## 8. Theme Resolution（Theme適用ルール）

セクション描画時には以下を合成する：

```
effectiveTheme = merge(Page.theme, Section.themeOverride)
```

- Page.theme … デフォルト
- Section.themeOverride … 部分的に調整したい場合のみ
- merge は **上書き優先** の浅い合成 or 深い合成（プロジェクト要件に依存）

---

## 9. Rendering Pipeline

1. Page を読み込む
2. Page.theme を取得
3. SectionRef に従って Section を列挙
4. Section.template, Section.contentSchema を読み込む
5. SectionContent を取得
6. ContentSchema と ContentValue を突き合わせ、**ガイドからアドバイスを生成**
7. effectiveTheme を決定 → `merge(Page.theme, Section.themeOverride)`
8. Template + Content + effectiveTheme でレンダリング

---

## 10. アドバイス生成ロジック（Guideline Checker）

ガイドラインと実データ比較して以下のようなメッセージを生成：

- 「タイトルが66文字です。推奨は40文字以内です（suggest）。」
- 「画像比率が1.2:1です。推奨は1.6〜1.9です（info）。」
- 「リスト項目が10個あります。推奨は3〜6です（warn）。」

強制はせず、UI上でエディタに軽く警告を出すだけ。

---

## 11. データ分離のメリット

### Content と Section を分離したことにより：

- 多言語差し替えが容易
- A/B テストで Content だけ入れ替えられる
- Section は構造・制約・ThemeOverride だけに集中できる
- プロジェクト拡張時も破綻しづらい

### テーマの上書き階層により：

- Pageごとの世界観
- Sectionごとの局所調整
- どちらも自然に共存

### ContentSchema によって：

- デザインナレッジを **コードとして蓄積** できる
- 自動アドバイスで編集体験を向上できる

---

## 12. Future Work

- SectionTemplate と SectionInstance の分離
- EffectiveTheme の deep merge 仕様詳細
- Template の slot 定義方式（HTML-like DSL or AST）
- ThemePreset のライブラリ化
- SectionType（hero, feature, gallery）の標準セット
- Editor 側のガイド表示 UI 実装
