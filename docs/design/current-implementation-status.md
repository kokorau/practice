# Current Implementation Status

本ドキュメントは、Page/Section Rendering System 実装に向けた現在のモジュール状況をまとめる。

---

## 既存モジュール一覧

| Module | 概要 | レイヤー | 状態 |
|--------|------|----------|------|
| **Lighting** | 3Dライティングシミュレーション | Domain/Application/Infra | ✅ 実装済み |
| **Filter** | LUT・Adjustment・Curveによる画像フィルター | Domain/Application/Infra | ✅ 実装済み |
| **Color** | 7つのカラースペース変換 | Domain only | ✅ 実装済み |
| **Palette** | 画像から4色抽出 | Domain/Application/Infra | ✅ 実装済み |
| **Photo** | 画像データ構造 | Domain/Application/Infra | ✅ 実装済み |
| **Media** | Photo/Camera統合インターフェース | Domain/Application/Infra | ✅ 実装済み |
| **Segmentation** | 画像領域分析 | Domain/Application/Infra | ✅ 実装済み |
| **Vector** | 3Dベクトル演算 | Domain only | ✅ 実装済み |

---

## 未実装モジュール（仕様書で定義）

| Module | 概要 | 優先度 |
|--------|------|--------|
| **Theme** | Lighting + ColorPalette + StylePack + Filter の統合 | 高 |
| **ColorPalette** | セマンティックカラー・グレー階調・ブランドカラー | 高 |
| **StylePack** | rounded, padding, elevation など | 中 |
| **Page** | 複数Sectionの集合 + デフォルトTheme | 中 |
| **Section** | Template + ContentSchema + ThemeOverride | 中 |
| **Content** | Section に対応する実データ | 中 |
| **ContentSchema** | スロットガイドライン定義 | 低 |

---

## 詳細：既存モジュール

### Lighting Module

**場所:** `apps/web/src/modules/Lighting/`

**Domain/ValueObject:**
- `Tile` - タイルベースレンダリング用グリッド
- `Camera` - PerspectiveCamera, OrthographicCamera
- `Light` - AmbientLight, DirectionalLight
- `Material` - 表面マテリアルプロパティ
- `Geometry` - PlaneGeometry, BoxGeometry
- `Object` - シーンオブジェクト

**Application:**
- `RenderTilesUseCase` - 優先度付きタイルレンダリング
- `HTMLToScene` - DOM → 3Dシーン変換
- `ComputeBoxShadows` - シャドウ計算

**Infra:**
- `TileRenderer` - キャッシュ付きCanvasレンダラー
- `TileCompositor` - タイル合成
- `WebGL/RayTracingRenderer` - WebGLレンダラー

**プリセット:**
- Top Right, Top Left, Soft, Hard, Flat など

---

### Filter Module

**場所:** `apps/web/src/modules/Filter/`

**Domain/ValueObject:**
- `Filter` - adjustment + master curve + per-channel curves
- `Adjustment` - 30+パラメータ（exposure, contrast, temperature, tint, split toning, lift/gamma/gain など）
- `Curve` - トーンカーブ制御点
- `Lut1D`, `Lut3D` - ルックアップテーブル

**主要メソッド:**
- `$Filter.toLut()` - Filter → LUT変換
- `setAdjustment()`, `setMaster()`, `setChannel()` - イミュータブル更新

**Infra:**
- `WebGL/LutRenderer` - GPU加速LUTレンダリング

---

### Color Module

**場所:** `apps/web/src/modules/Color/`

**カラースペース:**
- `Srgb` - 標準RGB (0-255)
- `LinearRgb` - リニアRGB (0-1)
- `Hex` - CSS hex文字列
- `Oklab` - 知覚均一色空間
- `Oklch` - 円筒形Oklab
- `Hsv` - Hue/Saturation/Value
- `Hsl` - Hue/Saturation/Lightness

**特徴:** Domain層のみ。純粋な値オブジェクト。

---

### Palette Module

**場所:** `apps/web/src/modules/Palette/`

**Domain:**
- `Palette` - 4色のPaletteColor配列
- `PaletteColor` - `{ color: Srgb, weight: number }`

**Infra:**
- GPU加速k-meansクラスタリング
- カラーメトリクスサービス

---

## 次のステップ

### Phase 1: ColorPalette（セマンティックカラー）

**目的:** Themeの構成要素として、UI向けのセマンティックカラーパレットを定義

**含まれるもの:**
- プライマリ/セカンダリカラー
- セマンティックカラー（success, warning, error, info）
- グレー階調（50〜950）
- ブランドカラー
- サーフェスカラー（background, foreground, muted）

**検討事項:**
- 既存の `Color` モジュールとの連携
- LUT適用前の「アルベド」としての扱い
- Oklch ベースでの色操作

### Phase 2: Section データ構造

**目的:** Template + ContentSchema + ThemeOverride の基本構造を実装

---

## アーキテクチャ原則

1. **Pure Domain Values** - イミュータブルな値オブジェクト（`$Prefix` ファクトリパターン）
2. **循環依存なし** - Color < Filter < Lighting の依存方向
3. **Infrastructure抽象化** - Application層のポート/インターフェース
4. **GPU活用** - Filter, Palette は WebGL/WGSL シェーダー使用
