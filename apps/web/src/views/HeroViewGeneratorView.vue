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
} = useHeroScene({ primitivePalette, isDark })

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
    />

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
          <!-- 画像アップロード -->
          <p class="subpanel-section-label">画像</p>
          <div class="image-upload-section">
            <template v-if="customBackgroundImage">
              <div class="uploaded-image-preview">
                <img :src="customBackgroundImage" alt="Uploaded background" />
                <div class="uploaded-image-info">
                  <span class="uploaded-image-name">{{ customBackgroundFile?.name }}</span>
                  <button class="image-clear-button" @click="clearBackgroundImage">削除</button>
                </div>
              </div>
            </template>
            <label v-else class="image-upload-button">
              <input
                type="file"
                accept="image/*"
                class="image-upload-input"
                @change="(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) setBackgroundImage(file)
                }"
              />
              <span class="image-upload-icon">📷</span>
              <span class="image-upload-text">画像をアップロード</span>
            </label>
          </div>

          <p class="subpanel-section-label" style="margin-top: 1rem;">テクスチャ</p>
          <div class="pattern-grid">
            <button
              v-for="(pattern, i) in texturePatterns"
              :key="i"
              class="pattern-button"
              :class="{ active: !customBackgroundImage && selectedBackgroundIndex === i }"
              :disabled="!!customBackgroundImage"
              @click="selectedBackgroundIndex = i"
            >
              <canvas data-thumbnail-canvas class="pattern-canvas" />
              <span class="pattern-label">{{ pattern.label }}</span>
            </button>
          </div>
        </template>

        <!-- 中景: マスク + テクスチャ選択 -->
        <template v-else-if="activeSection === 'midground'">
          <!-- マスク形状選択 -->
          <p class="subpanel-section-label">マスク形状</p>
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

          <!-- テクスチャ選択 (マスクが選択されている場合のみ) -->
          <template v-if="selectedMaskIndex !== null">
            <p class="subpanel-section-label" style="margin-top: 1rem;">テクスチャ</p>
            <div class="texture-grid">
              <!-- べた塗り -->
              <button
                class="texture-button"
                :class="{ active: selectedMidgroundTextureIndex === null }"
                @click="selectedMidgroundTextureIndex = null"
              >
                <span class="texture-icon">■</span>
                <span class="texture-label">べた塗り</span>
              </button>
              <!-- テクスチャパターン -->
              <button
                v-for="(pattern, i) in midgroundTexturePatterns"
                :key="i"
                class="texture-button"
                :class="{ active: selectedMidgroundTextureIndex === i }"
                @click="selectedMidgroundTextureIndex = i"
              >
                <span class="texture-icon">{{ pattern.type === 'stripe' ? '▤' : pattern.type === 'grid' ? '▦' : '⚬' }}</span>
                <span class="texture-label">{{ pattern.label }}</span>
              </button>
            </div>
          </template>
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
/* Subpanel Section Label */
.subpanel-section-label {
  margin: 0 0 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
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

/* Image Upload Section */
.image-upload-section {
  margin-bottom: 0.5rem;
}

.image-upload-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1.5rem;
  border: 2px dashed oklch(0.35 0.02 260);
  border-radius: 0.5rem;
  background: oklch(0.18 0.02 260);
  color: oklch(0.60 0.02 260);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.image-upload-button:hover {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.22 0.02 260);
}

.image-upload-input {
  display: none;
}

.image-upload-icon {
  font-size: 1.5rem;
}

.image-upload-text {
  font-size: 0.75rem;
  font-weight: 500;
}

.uploaded-image-preview {
  border: 2px solid oklch(0.55 0.20 250);
  border-radius: 0.5rem;
  overflow: hidden;
  background: oklch(0.22 0.02 260);
}

.uploaded-image-preview img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}

.uploaded-image-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  border-top: 1px solid oklch(0.30 0.02 260);
}

.uploaded-image-name {
  font-size: 0.625rem;
  color: oklch(0.70 0.02 260);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 10rem;
}

.image-clear-button {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 0.25rem;
  background: oklch(0.35 0.10 25);
  color: oklch(0.95 0.02 260);
  font-size: 0.625rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.image-clear-button:hover {
  background: oklch(0.45 0.15 25);
}

/* Disabled pattern buttons when image is uploaded */
.pattern-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pattern-button:disabled:hover {
  border-color: oklch(0.30 0.02 260);
}
</style>
