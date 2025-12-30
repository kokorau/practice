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
import PalettePreviewTab from '../components/SiteBuilder/PalettePreviewTab.vue'
import HeroSidebar from '../components/HeroGenerator/HeroSidebar.vue'
import HeroPreview from '../components/HeroGenerator/HeroPreview.vue'
import SurfaceSelector from '../components/HeroGenerator/SurfaceSelector.vue'
import { useSiteColors, useHeroScene } from '../composables/SiteBuilder'
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
// Hero Scene (WebGPU rendering with layer system)
// ============================================================
const {
  texturePatterns,
  maskPatterns,
  midgroundTexturePatterns,
  textureColor1,
  textureColor2,
  midgroundTextureColor1,
  midgroundTextureColor2,
  createMidgroundThumbnailSpec,
  selectedBackgroundIndex,
  selectedMaskIndex,
  selectedMidgroundTextureIndex,
  activeSection,
  openSection,
  initPreview,
  customBackgroundImage,
  customBackgroundFile,
  setBackgroundImage,
  clearBackgroundImage,
  customMaskImage,
  customMaskFile,
  setMaskImage,
  clearMaskImage,
  // Per-layer filters
  selectedFilterLayerId,
  selectedLayerFilters,
  updateLayerFilters,
} = useHeroScene({ primitivePalette, isDark })

// Filter state computed wrappers for v-model binding (on/off only)
const vignetteEnabled = computed({
  get: () => selectedLayerFilters.value?.vignette.enabled ?? false,
  set: (v) => {
    const layerId = selectedFilterLayerId.value
    if (layerId) updateLayerFilters(layerId, { vignette: { enabled: v } })
  },
})
const chromaticAberrationEnabled = computed({
  get: () => selectedLayerFilters.value?.chromaticAberration.enabled ?? false,
  set: (v) => {
    const layerId = selectedFilterLayerId.value
    if (layerId) updateLayerFilters(layerId, { chromaticAberration: { enabled: v } })
  },
})

// Convert texture patterns to SurfaceSelector format with createSpec
const backgroundPatterns = computed(() =>
  texturePatterns.map((p) => ({
    label: p.label,
    createSpec: (viewport: { width: number; height: number }) =>
      p.createSpec(textureColor1.value, textureColor2.value, viewport),
  }))
)

const maskSurfacePatterns = computed(() =>
  midgroundTexturePatterns.map((p) => ({
    label: p.label,
    createSpec: (viewport: { width: number; height: number }) =>
      createMidgroundThumbnailSpec(p, midgroundTextureColor1.value, midgroundTextureColor2.value, viewport),
  }))
)

const selectedLayout = ref<LayoutId>('row-top-between')
const heroPreviewRef = ref<InstanceType<typeof HeroPreview> | null>(null)

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

  // テクスチャプレビュー用キャンバス初期化 (HeroPreviewのcanvasを使用)
  await initPreview(heroPreviewRef.value?.canvasRef)
})

onUnmounted(() => {
  if (paletteStyleElement) {
    document.head.removeChild(paletteStyleElement)
    paletteStyleElement = null
  }
})

// ============================================================
// Tab State
// ============================================================
type TabId = 'generator' | 'palette'
const activeTab = ref<TabId>('generator')
</script>

<template>
  <div class="hero-generator">
    <!-- 左パネル: カラー設定 & セクション一覧 -->
    <HeroSidebar
      :active-tab="activeTab"
      :hue="hue"
      :saturation="saturation"
      :value="value"
      :selected-hex="selectedHex"
      :brand-oklch="brandColor.oklch"
      :selected-foundation-id="selectedFoundationId"
      :foundation-hex="foundationColor.hex"
      :foundation-label="foundationColor.label"
      :active-section="activeSection"
      :texture-patterns="texturePatterns"
      :mask-patterns="maskPatterns"
      :midground-texture-patterns="midgroundTexturePatterns"
      :selected-background-index="selectedBackgroundIndex"
      :selected-mask-index="selectedMaskIndex"
      :selected-midground-texture-index="selectedMidgroundTextureIndex"
      :neutral-ramp-display="neutralRampDisplay"
      @update:hue="hue = $event"
      @update:saturation="saturation = $event"
      @update:value="value = $event"
      @update:selected-foundation-id="selectedFoundationId = $event"
      @open-section="openSection"
      @select-filter-layer="selectedFilterLayerId = $event"
    />

    <!-- サブパネル: パターン選択 (Generator タブのみ) -->
    <Transition name="subpanel">
      <aside v-if="activeSection && activeTab === 'generator'" class="hero-subpanel">
      <div class="hero-subpanel-header">
        <h2>{{
          activeSection === 'background' ? 'テクスチャ選択' :
          activeSection === 'mask-surface' ? 'マスクテクスチャ' :
          activeSection === 'mask-shape' ? 'マスク形状' :
          activeSection === 'filter' ? 'フィルター設定' :
          '前景設定'
        }}</h2>
        <button class="hero-subpanel-close" @click="activeSection = null">×</button>
      </div>

      <div class="hero-subpanel-content">
        <!-- 後景: テクスチャ選択 -->
        <template v-if="activeSection === 'background'">
          <SurfaceSelector
            :custom-image="customBackgroundImage"
            :custom-file-name="customBackgroundFile?.name ?? null"
            :patterns="backgroundPatterns"
            :selected-index="selectedBackgroundIndex"
            @upload-image="setBackgroundImage"
            @clear-image="clearBackgroundImage"
            @select-pattern="(i) => { if (i !== null) selectedBackgroundIndex = i }"
          />
        </template>

        <!-- マスク形状選択 -->
        <template v-else-if="activeSection === 'mask-shape'">
          <div class="pattern-grid">
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

        <!-- マスクテクスチャ選択 -->
        <template v-else-if="activeSection === 'mask-surface'">
          <SurfaceSelector
            :custom-image="customMaskImage"
            :custom-file-name="customMaskFile?.name ?? null"
            :patterns="maskSurfacePatterns"
            :selected-index="selectedMidgroundTextureIndex"
            :show-solid-option="true"
            @upload-image="setMaskImage"
            @clear-image="clearMaskImage"
            @select-pattern="(i) => { selectedMidgroundTextureIndex = i }"
          />
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

        <!-- フィルター設定 (オン/オフのみ) -->
        <template v-else-if="activeSection === 'filter'">
          <div class="filter-section">
            <label class="filter-toggle">
              <input type="checkbox" v-model="vignetteEnabled" />
              <span class="filter-name">Vignette</span>
            </label>
            <label class="filter-toggle">
              <input type="checkbox" v-model="chromaticAberrationEnabled" />
              <span class="filter-name">Chromatic Aberration</span>
            </label>
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
      <HeroPreview
        v-if="activeTab === 'generator'"
        ref="heroPreviewRef"
        :selected-layout="selectedLayout"
        class="hero-tab-content"
      />

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

/* Texture Grid */
.texture-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.375rem;
}

.texture-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.25rem;
  border: 2px solid oklch(0.30 0.02 260);
  border-radius: 0.375rem;
  background: transparent;
  color: oklch(0.70 0.02 260);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.texture-button:hover {
  border-color: oklch(0.40 0.02 260);
  background: oklch(0.20 0.02 260);
}

.texture-button.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.15);
  color: oklch(0.90 0.02 260);
}

.texture-icon {
  font-size: 1rem;
}

.texture-label {
  font-size: 0.5rem;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
}

/* Filter Section */
.filter-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: oklch(0.20 0.02 260);
  border-radius: 0.5rem;
  cursor: pointer;
}

.filter-toggle input[type="checkbox"] {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: oklch(0.55 0.20 250);
}

.filter-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: oklch(0.85 0.02 260);
}

</style>
