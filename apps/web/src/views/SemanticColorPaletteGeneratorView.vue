<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import '../components/SemanticColorPaletteGenerator/demo-styles.css'
import './SemanticColorPaletteGeneratorView.css'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import {
  type PrimitivePalette,
  CONTEXT_CLASS_NAMES,
  COMPONENT_CLASS_NAMES,
  NEUTRAL_KEYS,
} from '../modules/SemanticColorPalette/Domain'
import {
  toCSSText,
  toCSSRuleSetsText,
  createPrimitivePalette,
  createSemanticFromPrimitive,
  createPrimitiveRefMap,
} from '../modules/SemanticColorPalette/Infra'
import { toCSSText as toDesignTokensCSSText } from '../modules/DesignTokens/Infra'
import type { Preset } from '../modules/Filter/Domain'
import { getPresets } from '../modules/Filter/Infra/PresetRepository'
import { getTokenPresetEntries } from '../modules/DesignTokens/Infra'
import { useFilter } from '../composables/Filter/useFilter'
import { useDemoSite } from '../composables/SemanticColorPalette/useDemoSite'
import { hsvToRgb, rgbToHex, applyLutToPalette } from '../components/SemanticColorPaletteGenerator/utils'
// Child components
import PaletteSidebar from '../components/SemanticColorPaletteGenerator/PaletteSidebar.vue'
import PrimitiveTab from '../components/SemanticColorPaletteGenerator/PrimitiveTab.vue'
import PalettePreviewTab from '../components/SemanticColorPaletteGenerator/PalettePreviewTab.vue'
import BrandGuideTab from '../components/SemanticColorPaletteGenerator/BrandGuideTab.vue'

// ============================================================
// Brand Color State (HSV Color Picker - the "ink")
// ============================================================
const hue = ref(210)
const saturation = ref(80)
const value = ref(70)

// Computed color values
const selectedRgb = computed(() => hsvToRgb(hue.value, saturation.value, value.value))
const selectedHex = computed(() => rgbToHex(...selectedRgb.value))

// Tab state
type TabId = 'primitive' | 'palette' | 'demo' | 'brand-guide'
const activeTab = ref<TabId>('primitive')

// Brand Guide state
const brandGuideMarkdown = ref(`# はっぱノート｜ブランド & デザインガイド

## 0. このドキュメントの目的

この md は、はっぱノートに関わる
- テキスト生成
- 画像選択
- スタイル / 配色判断
- UI・UX設計

を **人間とAIが協業するための共通前提**として使用する。

感覚的な表現も含むが、最終的な判断のブレを減らすため
「やること / やらないこと」を明示する。

---

## 1. プロダクト概要（Overview）

- プロダクト名：はっぱノート
- 種別：家計簿アプリ / Webサービス
- コンセプト：
  - がんばらなくても、気づいたらちょっと節約できている
  - 暮らしと並走してくれる、ポップな家計ノート

- 立ち位置：
  - 管理ツール ❌
  - 指導アプリ ❌
  - 生活の相棒 ✅

---

## 2. プロダクト人格（Personality）

はっぱノートは「キャラクターとしての人格」を持つ。

- 役割：暮らしと並走する相棒
- 口調：フラット、ややポップ
- 態度：
  - 判断しない
  - 叱らない
  - 押し付けない
- テンション：
  - 高すぎない
  - 低すぎない
- ユーモア：
  - 控えめ（体感 0.3）

### キャラクター（たぬき）について
- 教師ではない
- 上から目線にならない
- 「たまに一言くれる存在」
- 何も言わない日があってよい

---

## 3. 想定ユーザー（Target User）

### 年齢層
- 10代後半 〜 30代前半

### 主なユーザー像
- 学生 / 新社会人 / 一人暮らし / 同棲
- 家計簿をつけたことはあるが、続かなかった
- 節約したい気持ちはあるが、強くはない
- 数字に追われたくない

### よくある生活シーン
- コンビニで少し使いすぎたあと
- 月末に「今月どうだったっけ？」と思う瞬間
- 特に目的なくアプリを開く時間

---

## 4. 価値の優先順位（Value Priority）

以下の順序を常に意識する。

1. 気軽さ（なんとなく開ける）
2. ポップさ（重くない）
3. 安心感（叱られない）
4. 生活との並走感
5. 正確さ・厳密さ（優先度は低い）

---

## 5. やらないこと（What We Don't Do）

以下は明確に「やらない」。

- 厳密な家計管理を強要しない
- 強い警告・断定的表現を使わない
- 赤色を多用しない
- 数字でユーザーを評価しない
- ゲーミフィケーションを前面に出さない

例：
- 「無駄遣いです」 ❌
- 「目標未達成」 ❌

---

## 6. ビジュアル・画像方針（Visual Direction）

### 全体の印象
- 明るい
- 生活感がある
- 親しみやすい
- うるさくならない

### 写真を使う場合
- 高級すぎない
- ビジネス感が強すぎない
- 日常の一コマが伝わるもの
- 感情が強すぎない人物表情

### イラストを使う場合
- フラット
- 線は太すぎない
- 色数は多すぎない
- キャラクターは主張しすぎない

### NG例
- 高級ブランド感
- Awwwards的な過度な演出
- 強いコントラスト・派手なグラデーション

---

## 7. カラームード（Color Mood）

### 基本方針
- 温かみがある
- ホーム画面に置いても違和感がない
- 長時間見ても疲れない

### 色の役割
- ベース：やさしい黄色
- アクセント：オレンジ
- 補助：黄緑（少量）

※ 数値（OKLCH 等）は別ドキュメントで管理する。

---

## 8. UI密度・レイアウト方針（UI Density）

- 情報量：少なめ
- 余白：広め
- 一画面一メッセージ
- 数字は主役にしすぎない
- カードUI中心

---

## 9. 文言・コピーのガイド（Copy Guide）

### 推奨トーン
- やわらかい
- 断定しない
- 会話的

### 良い例（Good）
- 「今日はこんな感じ」
- 「先月より、少し落ち着いたかも」
- 「無理しなくて大丈夫そう」
- 「このあたり、よく使ってるね」

### 悪い例（Bad）
- 「支出が多すぎます」
- 「節約しましょう」
- 「改善が必要です」
- 「無駄です」

---

## 10. このドキュメントの使い方（AI向け）

- テキスト生成時は本ドキュメントを前提とする
- 判断に迷った場合は
  - 「気軽さ」
  - 「ポップさ」
を優先する
- 世界観に合わない提案は行わない

---

## 11. 補足メモ

- はっぱ：
  - お金そのものではなく「暮らしの単位」
  - 使った量・流れを表す抽象的モチーフ
- たぬき：
  - 主役ではない
  - そばにいる存在
`)

// Foundation preset state
const selectedFoundationId = ref('white')
const sidebarRef = ref<InstanceType<typeof PaletteSidebar> | null>(null)

// ============================================================
// Design Tokens State
// ============================================================
const tokenPresets = getTokenPresetEntries()
const selectedTokensId = ref(tokenPresets[0]?.id ?? 'default')

const currentTokensPreset = computed(() =>
  tokenPresets.find((p) => p.id === selectedTokensId.value) ?? tokenPresets[0]!
)
const currentTokens = computed(() => currentTokensPreset.value.tokens)

const tabs: { id: TabId; label: string }[] = [
  { id: 'primitive', label: 'Primitive' },
  { id: 'palette', label: 'Palette Preview' },
  { id: 'demo', label: 'Demo' },
  { id: 'brand-guide', label: 'Brand Guide' },
]

// Brand color computed
const brandColor = computed(() => {
  const [r, g, b] = selectedRgb.value
  const oklch = $Oklch.fromSrgb({ r: r / 255, g: g / 255, b: b / 255 })
  return {
    hex: selectedHex.value,
    oklch,
    cssOklch: $Oklch.toCss(oklch),
    cssP3: $Oklch.toCssP3(oklch),
  }
})

// Foundation color from FoundationPresets component via PaletteSidebar
const foundationColor = computed(() => {
  const presetsRef = sidebarRef.value?.foundationPresetsRef
  if (presetsRef) {
    const fc = presetsRef.foundationColor
    const preset = presetsRef.selectedPreset
    return {
      oklch: fc.oklch,
      css: fc.css,
      hex: fc.hex,
      label: preset.label,
    }
  }
  // Fallback
  const oklch: Oklch = { L: 0.955, C: 0, H: 0 }
  return {
    oklch,
    css: $Oklch.toCss(oklch),
    hex: '#f2f2f2',
    label: 'White',
  }
})

// ============================================================
// Filter State
// ============================================================

const FILTER_PRESETS: readonly Preset[] = getPresets()

const {
  filter,
  lut: filterLut,
  intensity,
  currentPresetId,
  applyPreset,
  setters: filterSetters,
  setMasterPoint,
  reset: resetFilter,
} = useFilter()

// Current preset name for display in list view
const currentFilterName = computed(() => {
  if (!currentPresetId.value) return 'No Filter'
  const preset = FILTER_PRESETS.find(p => p.id === currentPresetId.value)
  return preset?.name ?? 'Custom'
})

// ============================================================
// Primitive Palette Generation
// ============================================================

const basePrimitivePalette = computed((): PrimitivePalette => {
  return createPrimitivePalette({
    brand: brandColor.value.oklch,
    foundation: foundationColor.value.oklch,
  })
})

const primitivePalette = computed((): PrimitivePalette => {
  return applyLutToPalette(basePrimitivePalette.value, filterLut.value)
})

const neutralRampDisplay = computed(() => {
  return NEUTRAL_KEYS.map((key) => ({
    key,
    color: primitivePalette.value[key],
    css: $Oklch.toCss(primitivePalette.value[key]),
  }))
})

const foundationRampDisplay = computed(() => {
  return NEUTRAL_KEYS.map((key) => ({
    key,
    color: primitivePalette.value[key],
    css: $Oklch.toCss(primitivePalette.value[key]),
  }))
})

// ============================================================
// Generated Semantic Palette from Primitive
// ============================================================

const generatedPalette = computed(() => createSemanticFromPrimitive(primitivePalette.value))
const primitiveRefMap = computed(() => createPrimitiveRefMap(primitivePalette.value))
const palette = computed(() => generatedPalette.value)
const isDark = computed(() => foundationColor.value.oklch.L <= 0.5)

// Context surfaces with CSS class names and primitive refs
const contexts = computed(() => [
  { name: 'canvas', label: 'Canvas', className: CONTEXT_CLASS_NAMES.canvas, tokens: palette.value.context.canvas, refs: primitiveRefMap.value.context.canvas },
  { name: 'sectionNeutral', label: 'Section Neutral', className: CONTEXT_CLASS_NAMES.sectionNeutral, tokens: palette.value.context.sectionNeutral, refs: primitiveRefMap.value.context.sectionNeutral },
  { name: 'sectionTint', label: 'Section Tint', className: CONTEXT_CLASS_NAMES.sectionTint, tokens: palette.value.context.sectionTint, refs: primitiveRefMap.value.context.sectionTint },
  { name: 'sectionContrast', label: 'Section Contrast', className: CONTEXT_CLASS_NAMES.sectionContrast, tokens: palette.value.context.sectionContrast, refs: primitiveRefMap.value.context.sectionContrast },
])

// Stateless components with CSS class names and primitive refs
const components = computed(() => [
  { name: 'card', label: 'Card', className: COMPONENT_CLASS_NAMES.card, tokens: palette.value.component.card, refs: primitiveRefMap.value.component.card },
  { name: 'cardFlat', label: 'Card Flat', className: COMPONENT_CLASS_NAMES.cardFlat, tokens: palette.value.component.cardFlat, refs: primitiveRefMap.value.component.cardFlat },
])

// Stateful components with CSS class names
const actions = computed(() => [
  { name: 'action', label: 'Action (CTA)', className: COMPONENT_CLASS_NAMES.action, tokens: palette.value.component.action },
  { name: 'actionQuiet', label: 'Action Quiet', className: COMPONENT_CLASS_NAMES.actionQuiet, tokens: palette.value.component.actionQuiet },
])

// Dynamic CSS injection for CSS variables and rule sets
let styleElement: HTMLStyleElement | null = null

const updateStyles = () => {
  if (!styleElement) return
  const colorVariables = toCSSText(palette.value, '.semantic-color-palette-generator')
  const tokenVariables = toDesignTokensCSSText(currentTokens.value, '.semantic-color-palette-generator')
  const cssRuleSets = toCSSRuleSetsText()
  styleElement.textContent = `${colorVariables}\n\n${tokenVariables}\n\n${cssRuleSets}`
}

onMounted(() => {
  styleElement = document.createElement('style')
  styleElement.setAttribute('data-semantic-palette-generator', '')
  document.head.appendChild(styleElement)
  updateStyles()
})

onUnmounted(() => {
  if (styleElement) {
    document.head.removeChild(styleElement)
    styleElement = null
  }
})

watch([palette, currentTokens], updateStyles)

// ============================================================
// Demo Tab - Section-based Page Rendering
// ============================================================

const {
  siteContents,
  currentSections,
  demoHtml,
  selectedSectionId,
  updateSectionContent,
  downloadHTML,
} = useDemoSite({ palette, tokens: currentTokens })

// Handle master point update from sidebar
const handleUpdateMasterPoint = (index: number, val: number) => {
  setMasterPoint(index, val)
}
</script>

<template>
  <div class="semantic-color-palette-generator" :class="{ dark: isDark }">
    <!-- Left Sidebar -->
    <PaletteSidebar
      ref="sidebarRef"
      :hue="hue"
      :saturation="saturation"
      :value="value"
      :selected-hex="selectedHex"
      :selected-foundation-id="selectedFoundationId"
      :foundation-label="foundationColor.label"
      :foundation-hex="foundationColor.hex"
      :brand-oklch="brandColor.oklch"
      :filter="filter"
      :filter-presets="FILTER_PRESETS"
      :current-preset-id="currentPresetId"
      :filter-setters="filterSetters"
      :intensity="intensity"
      :current-filter-name="currentFilterName"
      :selected-tokens-id="selectedTokensId"
      :current-tokens-name="currentTokensPreset.name"
      :sections="currentSections"
      :section-contents="siteContents"
      :selected-section-id="selectedSectionId"
      @update:hue="hue = $event"
      @update:saturation="saturation = $event"
      @update:value="value = $event"
      @update:selected-foundation-id="selectedFoundationId = $event"
      @update:intensity="intensity = $event"
      @update:selected-tokens-id="selectedTokensId = $event"
      @update:selected-section-id="selectedSectionId = $event"
      @update-section-content="updateSectionContent"
      @apply-preset="applyPreset"
      @update-master-point="handleUpdateMasterPoint"
      @reset-filter="resetFilter"
      @download-h-t-m-l="downloadHTML"
    />

    <!-- Main Content -->
    <main class="main-content">
      <header class="header">
        <h1>Semantic Color Palette Generator</h1>
        <nav class="tab-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-button"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </nav>
      </header>

      <!-- Primitive Tab -->
      <div v-if="activeTab === 'primitive'" class="tab-content">
        <PrimitiveTab
          :brand-color="brandColor"
          :foundation-color="foundationColor"
          :primitive-palette="primitivePalette"
          :neutral-ramp-display="neutralRampDisplay"
          :foundation-ramp-display="foundationRampDisplay"
        />
      </div>

      <!-- Palette Preview Tab -->
      <div v-if="activeTab === 'palette'" class="tab-content">
        <PalettePreviewTab
          :contexts="contexts"
          :components="components"
          :actions="actions"
        />
      </div>

      <!-- Demo Tab -->
      <div v-if="activeTab === 'demo'" class="tab-content">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="demoHtml" />
      </div>

      <!-- Brand Guide Tab -->
      <div v-if="activeTab === 'brand-guide'" class="tab-content">
        <BrandGuideTab
          v-model:markdown="brandGuideMarkdown"
        />
      </div>
    </main>
  </div>
</template>
