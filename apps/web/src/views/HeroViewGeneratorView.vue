<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  TextureRenderer,
  getDefaultTexturePatterns,
  getDefaultMaskPatterns,
  type TexturePattern,
  type RGBA,
} from '@practice/texture'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import { FOUNDATION_PRESETS } from '../components/SiteBuilder/foundationPresets'
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
import './HeroViewGeneratorView.css'

// ============================================================
// Brand Color State (HSV Color Picker)
// ============================================================
const hue = ref(220)
const saturation = ref(70)
const value = ref(65)

// HSV to RGB conversion
const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  s = s / 100
  v = v / 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ]
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

const selectedRgb = computed(() => hsvToRgb(hue.value, saturation.value, value.value))
const selectedHex = computed(() => rgbToHex(...selectedRgb.value))

// Brand color in Oklch
const brandColor = computed(() => {
  const [r, g, b] = selectedRgb.value
  const oklch = $Oklch.fromSrgb({ r: r / 255, g: g / 255, b: b / 255 })
  return {
    hex: selectedHex.value,
    oklch,
    cssOklch: $Oklch.toCss(oklch),
  }
})

// ============================================================
// Foundation Preset State
// ============================================================
const selectedFoundationId = ref('white')

const foundationColor = computed(() => {
  const preset = FOUNDATION_PRESETS.find((p) => p.id === selectedFoundationId.value) ?? FOUNDATION_PRESETS[0]!
  const presetHue = preset.H === 'brand' ? hue.value : preset.H
  const oklch: Oklch = { L: preset.L, C: preset.C, H: presetHue }
  const srgb = $Oklch.toSrgb(oklch)
  const toHex = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
  return {
    oklch,
    css: $Oklch.toCss(oklch),
    hex: `#${toHex(srgb.r)}${toHex(srgb.g)}${toHex(srgb.b)}`,
    label: preset.label,
  }
})

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
const isDark = computed(() => foundationColor.value.oklch.L <= 0.5)

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
// Texture Color (derived from Semantic Palette)
// ============================================================
// Palette から RGBA を生成
const paletteToRgba = (oklch: Oklch, alpha: number = 1.0): RGBA => {
  const srgb = $Oklch.toSrgb(oklch)
  return [
    Math.max(0, Math.min(1, srgb.r)),
    Math.max(0, Math.min(1, srgb.g)),
    Math.max(0, Math.min(1, srgb.b)),
    alpha
  ]
}

// テクスチャ用カラー（Semantic Palette から派生）
// textureColor1 = Card.surface (B)
// textureColor2 = Canvas.surface (F1 for light, F8 for dark)
const canvasSurfaceKey = computed(() => isDark.value ? 'F8' : 'F1' as const)
const textureColor1 = computed((): RGBA => paletteToRgba(primitivePalette.value.B))
const textureColor2 = computed((): RGBA => paletteToRgba(primitivePalette.value[canvasSurfaceKey.value]))

// パターン取得
const texturePatterns = getDefaultTexturePatterns()
const maskPatterns = getDefaultMaskPatterns()

// 状態管理
const selectedBackgroundIndex = ref(4) // Grid
const selectedMaskIndex = ref<number | null>(1) // Circle Large
const activeSection = ref<'background' | 'midground' | 'foreground' | null>(null)

// レイアウトパターン定義
const layoutPatterns = [
  // 3x3 grid
  { id: 'top-left', label: '左上', icon: '◰' },
  { id: 'top-center', label: '上中央', icon: '◱' },
  { id: 'top-right', label: '右上', icon: '◳' },
  { id: 'center-left', label: '左中央', icon: '◧' },
  { id: 'center', label: '中央', icon: '◉' },
  { id: 'center-right', label: '右中央', icon: '◨' },
  { id: 'bottom-left', label: '左下', icon: '◲' },
  { id: 'bottom-center', label: '下中央', icon: '◱' },
  { id: 'bottom-right', label: '右下', icon: '◳' },
  // Horizontal layouts - top
  { id: 'row-top-between', label: '横上両端', icon: '⟷' },
  { id: 'row-top-left', label: '横上左寄', icon: '⫷' },
  { id: 'row-top-right', label: '横上右寄', icon: '⫸' },
  // Horizontal layouts - center
  { id: 'row-between', label: '横両端', icon: '⟷' },
  { id: 'row-left', label: '横左寄', icon: '⫷' },
  { id: 'row-right', label: '横右寄', icon: '⫸' },
  // Horizontal layouts - bottom
  { id: 'row-bottom-between', label: '横下両端', icon: '⟷' },
  { id: 'row-bottom-left', label: '横下左寄', icon: '⫷' },
  { id: 'row-bottom-right', label: '横下右寄', icon: '⫸' },
] as const

type LayoutId = typeof layoutPatterns[number]['id']
const selectedLayout = ref<LayoutId>('center')

// プレビュー用
const previewCanvasRef = ref<HTMLCanvasElement | null>(null)
let previewRenderer: TextureRenderer | null = null

// サムネイル用renderer管理
const thumbnailRenderers: TextureRenderer[] = []

// パターン一覧を取得
function getPatterns(section: 'background' | 'midground' | 'foreground'): TexturePattern[] {
  if (section === 'background') return texturePatterns
  if (section === 'midground') return maskPatterns
  return []
}

// renderersを破棄
function destroyThumbnailRenderers() {
  for (const r of thumbnailRenderers) {
    r.destroy()
  }
  thumbnailRenderers.length = 0
}

// サムネイル再描画
async function renderThumbnails() {
  const section = activeSection.value
  if (!section) return

  const patterns = getPatterns(section)
  for (let i = 0; i < thumbnailRenderers.length; i++) {
    const renderer = thumbnailRenderers[i]
    const pattern = patterns[i]
    if (renderer && pattern) {
      const viewport = renderer.getViewport()
      const spec = pattern.createSpec(textureColor1.value, textureColor2.value, viewport)
      renderer.render(spec)
    }
  }
}

// サブパネルを開く
function openSection(section: 'background' | 'midground' | 'foreground') {
  destroyThumbnailRenderers()

  if (activeSection.value === section) {
    activeSection.value = null
    return
  }

  activeSection.value = section

  // DOMが更新されてからrendererを初期化
  nextTick(async () => {
    const patterns = getPatterns(section)
    const canvases = document.querySelectorAll<HTMLCanvasElement>('[data-thumbnail-canvas]')

    for (let i = 0; i < canvases.length; i++) {
      const canvas = canvases[i]
      if (!canvas) continue
      // 16:9のアスペクト比でサムネイル描画
      canvas.width = 256
      canvas.height = 144
      try {
        const renderer = await TextureRenderer.create(canvas)
        thumbnailRenderers.push(renderer)
        const pattern = patterns[i]
        if (pattern) {
          const viewport = renderer.getViewport()
          const spec = pattern.createSpec(textureColor1.value, textureColor2.value, viewport)
          renderer.render(spec)
        }
      } catch (e) {
        console.error('WebGPU not available:', e)
      }
    }
  })
}

// マスク用カラー（内側透明、外側不透明 - Canvas.surface）
// 内側色は Canvas.surface と同じRGBでアルファ0（AA境界での色ズレ防止）
const maskInnerColor = computed((): RGBA => paletteToRgba(primitivePalette.value[canvasSurfaceKey.value], 0))
const maskOuterColor = computed((): RGBA => paletteToRgba(primitivePalette.value[canvasSurfaceKey.value]))

// プレビュー更新
function updatePreview() {
  if (!previewRenderer) return

  const viewport = previewRenderer.getViewport()

  // 1. 後景を描画
  const bgPattern = texturePatterns[selectedBackgroundIndex.value]
  if (bgPattern) {
    const spec = bgPattern.createSpec(textureColor1.value, textureColor2.value, viewport)
    previewRenderer.render(spec)
  }

  // 2. 中景のマスクを合成（選択されている場合）
  if (selectedMaskIndex.value !== null) {
    const maskPattern = maskPatterns[selectedMaskIndex.value]
    if (maskPattern) {
      const spec = maskPattern.createSpec(maskInnerColor.value, maskOuterColor.value, viewport)
      previewRenderer.render(spec, { clear: false })
    }
  }
}

// 色・パターン変更時にプレビュー更新
watch([selectedBackgroundIndex, selectedMaskIndex, textureColor1, textureColor2, maskInnerColor, maskOuterColor], updatePreview)
// 色変更時にサムネイルも更新
watch([textureColor1, textureColor2], renderThumbnails)

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
  if (previewCanvasRef.value) {
    previewCanvasRef.value.width = 1280
    previewCanvasRef.value.height = 720
    try {
      previewRenderer = await TextureRenderer.create(previewCanvasRef.value)
      updatePreview()
    } catch (e) {
      console.error('WebGPU not available:', e)
    }
  }
})

onUnmounted(() => {
  previewRenderer?.destroy()
  destroyThumbnailRenderers()
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
            <span class="layer-value">{{ layoutPatterns.find(l => l.id === selectedLayout)?.label }}</span>
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
              v-for="layout in layoutPatterns"
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
