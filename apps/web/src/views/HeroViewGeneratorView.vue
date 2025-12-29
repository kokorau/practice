<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { $Oklch } from '@practice/color'
import type { PrimitivePalette } from '../modules/SemanticColorPalette/Domain'
import {
  CONTEXT_CLASS_NAMES,
  COMPONENT_CLASS_NAMES,
  NEUTRAL_KEYS,
} from '../modules/SemanticColorPalette/Domain'
import {
  createPrimitivePalette,
  createSemanticFromPrimitive,
  createPrimitiveRefMap,
  toCSSText,
  toCSSRuleSetsText,
} from '../modules/SemanticColorPalette/Infra'
import BrandColorPicker from '../components/SiteBuilder/BrandColorPicker.vue'
import FoundationPresets from '../components/SiteBuilder/FoundationPresets.vue'
import PalettePreviewTab from '../components/SiteBuilder/PalettePreviewTab.vue'
import { useSiteColors, useTexturePreview } from '../composables/SiteBuilder'
import { LAYOUT_PATTERNS, type LayoutId } from '../components/SiteBuilder/layoutPatterns'
import './HeroViewGeneratorView.css'

// ============================================================
// Brand & Foundation Color State
// ============================================================
const {
  hue,
  saturation,
  value,
  selectedHex,
  brandColor,
  selectedFoundationId,
  foundationColor,
  isDark,
} = useSiteColors()

// ============================================================
// Primitive & Semantic Palette Generation
// ============================================================
const primitivePalette = computed((): PrimitivePalette => {
  return createPrimitivePalette({
    brand: brandColor.value.oklch,
    foundation: foundationColor.value.oklch,
  })
})

const semanticPalette = computed(() => createSemanticFromPrimitive(primitivePalette.value))
const primitiveRefMap = computed(() => createPrimitiveRefMap(primitivePalette.value))

// Neutral ramp display
const neutralRampDisplay = computed(() => {
  return NEUTRAL_KEYS.map((key) => ({
    key,
    color: primitivePalette.value[key],
    css: $Oklch.toCss(primitivePalette.value[key]),
  }))
})

// Context surfaces
const contexts = computed(() => [
  { name: 'canvas', label: 'Canvas', className: CONTEXT_CLASS_NAMES.canvas, tokens: semanticPalette.value.context.canvas, refs: primitiveRefMap.value.context.canvas },
  { name: 'sectionNeutral', label: 'Section Neutral', className: CONTEXT_CLASS_NAMES.sectionNeutral, tokens: semanticPalette.value.context.sectionNeutral, refs: primitiveRefMap.value.context.sectionNeutral },
  { name: 'sectionTint', label: 'Section Tint', className: CONTEXT_CLASS_NAMES.sectionTint, tokens: semanticPalette.value.context.sectionTint, refs: primitiveRefMap.value.context.sectionTint },
  { name: 'sectionContrast', label: 'Section Contrast', className: CONTEXT_CLASS_NAMES.sectionContrast, tokens: semanticPalette.value.context.sectionContrast, refs: primitiveRefMap.value.context.sectionContrast },
])

// Components
const components = computed(() => [
  { name: 'card', label: 'Card', className: COMPONENT_CLASS_NAMES.card, tokens: semanticPalette.value.component.card, refs: primitiveRefMap.value.component.card },
  { name: 'cardFlat', label: 'Card Flat', className: COMPONENT_CLASS_NAMES.cardFlat, tokens: semanticPalette.value.component.cardFlat, refs: primitiveRefMap.value.component.cardFlat },
])

// Actions
const actions = computed(() => [
  { name: 'action', label: 'Action (CTA)', className: COMPONENT_CLASS_NAMES.action, tokens: semanticPalette.value.component.action },
  { name: 'actionQuiet', label: 'Action Quiet', className: COMPONENT_CLASS_NAMES.actionQuiet, tokens: semanticPalette.value.component.actionQuiet },
])

// ============================================================
// Texture Preview (WebGPU rendering)
// ============================================================
const {
  previewCanvasRef,
  texturePatterns,
  maskPatterns,
  selectedBackgroundIndex,
  selectedMaskIndex,
  activeSection,
  openSection,
  initPreview,
} = useTexturePreview({ primitivePalette, isDark })

const selectedLayout = ref<LayoutId>('center')

// ============================================================
// Dynamic CSS Injection for Palette Preview
// ============================================================
let paletteStyleElement: HTMLStyleElement | null = null

const updatePaletteStyles = () => {
  if (!paletteStyleElement) return
  const colorVariables = toCSSText(semanticPalette.value, '.hero-palette-preview')
  const cssRuleSets = toCSSRuleSetsText()
  paletteStyleElement.textContent = `${colorVariables}\n\n${cssRuleSets}`
}

watch(semanticPalette, updatePaletteStyles)

onMounted(async () => {
  // Palette用スタイル要素を作成
  paletteStyleElement = document.createElement('style')
  paletteStyleElement.setAttribute('data-hero-palette', '')
  document.head.appendChild(paletteStyleElement)
  updatePaletteStyles()

  // テクスチャプレビュー用キャンバス初期化
  await initPreview()
})

onUnmounted(() => {
  if (paletteStyleElement) {
    document.head.removeChild(paletteStyleElement)
    paletteStyleElement = null
  }
})

// ============================================================
// Tab & Popup State
// ============================================================
type TabId = 'generator' | 'palette'
const activeTab = ref<TabId>('generator')
type ColorPopup = 'brand' | 'foundation' | null
const activeColorPopup = ref<ColorPopup>(null)

const toggleColorPopup = (popup: ColorPopup) => {
  activeColorPopup.value = activeColorPopup.value === popup ? null : popup
}
</script>

<template>
  <div class="hero-generator">
    <!-- 左パネル: カラー設定 & セクション一覧 -->
    <aside class="hero-sidebar">
      <!-- カラー設定セクション -->
      <div class="sidebar-section">
        <p class="sidebar-label">Color Settings</p>

        <!-- Brand Color -->
        <button
          class="color-button"
          :class="{ active: activeColorPopup === 'brand' }"
          @click="toggleColorPopup('brand')"
        >
          <span class="color-swatch" :style="{ backgroundColor: selectedHex }" />
          <span class="color-info">
            <span class="color-name">Brand</span>
            <span class="color-value">{{ selectedHex }}</span>
          </span>
        </button>

        <!-- Foundation -->
        <button
          class="color-button"
          :class="{ active: activeColorPopup === 'foundation' }"
          @click="toggleColorPopup('foundation')"
        >
          <span class="color-swatch" :style="{ backgroundColor: foundationColor.hex }" />
          <span class="color-info">
            <span class="color-name">Foundation</span>
            <span class="color-value">{{ foundationColor.label }}</span>
          </span>
        </button>
      </div>

      <!-- レイヤーセクション (Generator タブのみ) -->
      <template v-if="activeTab === 'generator'">
        <div class="sidebar-section">
          <p class="sidebar-label">Layers</p>

          <!-- 後景 -->
          <button
            class="layer-button"
            :class="{ active: activeSection === 'background' }"
            @click="openSection('background')"
          >
            <span class="layer-name">後景 (Background)</span>
            <span class="layer-value">{{ texturePatterns[selectedBackgroundIndex]?.label }}</span>
          </button>

          <!-- 中景 -->
          <button
            class="layer-button"
            :class="{ active: activeSection === 'midground' }"
            @click="openSection('midground')"
          >
            <span class="layer-name">中景 (Midground)</span>
            <span class="layer-value">{{ selectedMaskIndex !== null ? maskPatterns[selectedMaskIndex]?.label : 'なし' }}</span>
          </button>

          <!-- 前景 -->
          <button
            class="layer-button"
            :class="{ active: activeSection === 'foreground' }"
            @click="openSection('foreground')"
          >
            <span class="layer-name">前景 (Foreground)</span>
            <span class="layer-value">{{ LAYOUT_PATTERNS.find(l => l.id === selectedLayout)?.label }}</span>
          </button>
        </div>
      </template>

      <!-- Palette タブ: Neutral Ramp -->
      <template v-if="activeTab === 'palette'">
        <div class="sidebar-section">
          <p class="sidebar-label">Neutral Ramp</p>
          <div class="neutral-ramp">
            <span
              v-for="item in neutralRampDisplay"
              :key="item.key"
              class="ramp-step"
              :style="{ backgroundColor: item.css }"
              :title="`${item.key}: ${item.css}`"
            />
          </div>
        </div>
      </template>

      <!-- カラーポップアップ -->
      <Transition name="popup">
        <div v-if="activeColorPopup" class="color-popup">
          <div class="popup-header">
            <h2>{{ activeColorPopup === 'brand' ? 'Brand Color' : 'Foundation' }}</h2>
            <button class="popup-close" @click="activeColorPopup = null">×</button>
          </div>
          <div class="popup-content">
            <BrandColorPicker
              v-if="activeColorPopup === 'brand'"
              :hue="hue"
              :saturation="saturation"
              :value="value"
              @update:hue="hue = $event"
              @update:saturation="saturation = $event"
              @update:value="value = $event"
            />
            <FoundationPresets
              v-if="activeColorPopup === 'foundation'"
              :selected-id="selectedFoundationId"
              :brand-oklch="brandColor.oklch"
              :brand-hue="hue"
              @update:selected-id="selectedFoundationId = $event"
            />
          </div>
        </div>
      </Transition>
    </aside>

    <!-- サブパネル: パターン選択 (Generator タブのみ) -->
    <Transition name="subpanel">
      <aside v-if="activeSection && activeTab === 'generator'" class="hero-subpanel">
      <div class="hero-subpanel-header">
        <h2>{{ activeSection === 'background' ? 'テクスチャ選択' : activeSection === 'midground' ? 'マスク選択' : '前景設定' }}</h2>
        <button class="hero-subpanel-close" @click="activeSection = null">×</button>
      </div>

      <div class="hero-subpanel-content">
        <!-- 後景: テクスチャ選択 -->
        <template v-if="activeSection === 'background'">
          <div class="pattern-grid">
            <button
              v-for="(pattern, i) in texturePatterns"
              :key="i"
              class="pattern-button"
              :class="{ active: selectedBackgroundIndex === i }"
              @click="selectedBackgroundIndex = i"
            >
              <canvas data-thumbnail-canvas class="pattern-canvas" />
              <span class="pattern-label">{{ pattern.label }}</span>
            </button>
          </div>
        </template>

        <!-- 中景: マスク選択 -->
        <template v-else-if="activeSection === 'midground'">
          <div class="pattern-grid">
            <!-- なし -->
            <button
              class="pattern-button"
              :class="{ active: selectedMaskIndex === null }"
              @click="selectedMaskIndex = null"
            >
              <span class="pattern-none">なし</span>
              <span class="pattern-label">マスクなし</span>
            </button>
            <!-- マスクパターン -->
            <button
              v-for="(pattern, i) in maskPatterns"
              :key="i"
              class="pattern-button"
              :class="{ active: selectedMaskIndex === i }"
              @click="selectedMaskIndex = i"
            >
              <canvas data-thumbnail-canvas class="pattern-canvas" />
              <span class="pattern-label">{{ pattern.label }}</span>
            </button>
          </div>
        </template>

        <!-- 前景: レイアウト選択 -->
        <template v-else-if="activeSection === 'foreground'">
          <div class="layout-grid">
            <button
              v-for="layout in LAYOUT_PATTERNS"
              :key="layout.id"
              class="layout-button"
              :class="{ active: selectedLayout === layout.id }"
              @click="selectedLayout = layout.id"
            >
              <span class="layout-icon">{{ layout.icon }}</span>
              <span class="layout-label">{{ layout.label }}</span>
            </button>
          </div>
        </template>
      </div>
      </aside>
    </Transition>

    <!-- 中央: メインコンテンツ -->
    <main class="hero-main">
      <!-- ヘッダー -->
      <header class="hero-header">
        <h1>Hero View Generator</h1>
        <nav class="hero-tab-nav">
          <button
            class="hero-tab-button"
            :class="{ active: activeTab === 'generator' }"
            @click="activeTab = 'generator'"
          >Generator</button>
          <button
            class="hero-tab-button"
            :class="{ active: activeTab === 'palette' }"
            @click="activeTab = 'palette'"
          >Palette</button>
        </nav>
      </header>

      <!-- Generator タブ: プレビュー -->
      <div v-if="activeTab === 'generator'" class="hero-tab-content hero-preview-container">
        <div class="hero-preview-wrapper">
          <div class="hero-preview-frame hero-palette-preview context-canvas">
            <!-- 後景: テクスチャ -->
            <canvas ref="previewCanvasRef" class="layer-background" />

            <!-- 中景: グラフィック（後で実装） -->
            <div class="layer-midground">
              <!-- 画像やグラフィックテキスト -->
            </div>

            <!-- 前景: CTA + テキスト -->
            <div class="layer-foreground">
              <div class="hero-content" :class="`layout-${selectedLayout}`">
                <h1 class="hero-title scp-title">Build Amazing</h1>
                <p class="hero-subtitle scp-body">Create beautiful, responsive websites.<br>Design with confidence.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Palette タブ: Semantic Palette プレビュー -->
      <div v-if="activeTab === 'palette'" class="hero-tab-content hero-palette-container hero-palette-preview" :class="{ dark: isDark }">
        <PalettePreviewTab
          :contexts="contexts"
          :components="components"
          :actions="actions"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Sidebar Sections */
.sidebar-section {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid oklch(0.25 0.02 260);
}

.sidebar-label {
  margin: 0 0 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
}

/* Color Buttons */
.color-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  background: oklch(0.22 0.02 260);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.color-button:hover {
  background: oklch(0.26 0.02 260);
}

.color-button.active {
  background: oklch(0.50 0.20 250);
}

.color-swatch {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  border: 1px solid oklch(0.40 0.02 260);
  flex-shrink: 0;
}

.color-info {
  display: flex;
  flex-direction: column;
}

.color-name {
  font-size: 0.75rem;
  font-weight: 600;
}

.color-value {
  font-size: 0.625rem;
  color: oklch(0.60 0.02 260);
  font-family: ui-monospace, monospace;
}

/* Layer Buttons */
.layer-button {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  background: oklch(0.22 0.02 260);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.layer-button:hover {
  background: oklch(0.26 0.02 260);
}

.layer-button.active {
  background: oklch(0.50 0.20 250);
}

.layer-name {
  font-size: 0.875rem;
  font-weight: 600;
}

.layer-value {
  font-size: 0.75rem;
  color: oklch(0.70 0.02 260);
  margin-top: 0.25rem;
}

.layer-button.active .layer-value {
  color: oklch(0.90 0.02 260);
}

/* Neutral Ramp */
.neutral-ramp {
  display: flex;
  gap: 2px;
}

.ramp-step {
  flex: 1;
  height: 2rem;
}

.ramp-step:first-child {
  border-radius: 0.25rem 0 0 0.25rem;
}

.ramp-step:last-child {
  border-radius: 0 0.25rem 0.25rem 0;
}

/* Color Popup */
.color-popup {
  position: absolute;
  left: 100%;
  top: 0;
  margin-left: 0.25rem;
  width: 18rem;
  background: oklch(0.18 0.02 260);
  border: 1px solid oklch(0.25 0.02 260);
  border-radius: 0.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  z-index: 50;
  overflow: hidden;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-bottom: 1px solid oklch(0.25 0.02 260);
}

.popup-header h2 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.popup-close {
  background: none;
  border: none;
  color: oklch(0.60 0.02 260);
  font-size: 1.125rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.popup-close:hover {
  color: oklch(0.90 0.02 260);
}

.popup-content {
  padding: 1rem;
}

/* Pattern Grid */
.pattern-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pattern-button {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 2px solid oklch(0.30 0.02 260);
  border-radius: 0.5rem;
  background: transparent;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.pattern-button:hover {
  border-color: oklch(0.40 0.02 260);
}

.pattern-button.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.1);
}

.pattern-canvas {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.pattern-none {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: oklch(0.22 0.02 260);
  color: oklch(0.60 0.02 260);
  font-size: 0.875rem;
}

.pattern-label {
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  color: oklch(0.70 0.02 260);
  text-align: left;
}

/* Empty State */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: oklch(0.50 0.02 260);
}

/* Layout Grid */
.layout-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.375rem;
}

.layout-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.625rem 0.5rem;
  border: 2px solid oklch(0.30 0.02 260);
  border-radius: 0.375rem;
  background: transparent;
  color: oklch(0.70 0.02 260);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.layout-button:hover {
  border-color: oklch(0.40 0.02 260);
  background: oklch(0.20 0.02 260);
}

.layout-button.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.15);
  color: oklch(0.90 0.02 260);
}

.layout-icon {
  font-size: 1.25rem;
}

.layout-label {
  font-size: 0.625rem;
  font-weight: 500;
}
</style>
