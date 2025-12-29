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
const selectedFoundationId = ref('charcoal')

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

// テクスチャ用カラー（Primitive Palette から派生）
// B = Brand, N4 = Neutral mid-tone
const textureColor1 = computed((): RGBA => paletteToRgba(primitivePalette.value.B))
const textureColor2 = computed((): RGBA => paletteToRgba(primitivePalette.value.N4))

// パターン取得
const texturePatterns = getDefaultTexturePatterns()
const maskPatterns = getDefaultMaskPatterns()

// 状態管理
const selectedBackgroundIndex = ref(0)
const selectedMaskIndex = ref<number | null>(null)
const activeSection = ref<'background' | 'midground' | 'foreground' | null>(null)

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
    patterns[i]?.render(thumbnailRenderers[i], textureColor1.value, textureColor2.value)
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
      // 16:9のアスペクト比でサムネイル描画
      canvas.width = 256
      canvas.height = 144
      try {
        const renderer = await TextureRenderer.create(canvas)
        thumbnailRenderers.push(renderer)
        patterns[i]?.render(renderer, textureColor1.value, textureColor2.value)
      } catch (e) {
        console.error('WebGPU not available:', e)
      }
    }
  })
}

// マスク用カラー（内側透明、外側不透明 - Foundationベース）
const maskInnerColor: RGBA = [0, 0, 0, 0] // 透明 - 後景が見える
const maskOuterColor = computed((): RGBA => paletteToRgba(primitivePalette.value.N8))

// プレビュー更新
function updatePreview() {
  if (!previewRenderer) return

  // 1. 後景を描画
  const bgPattern = texturePatterns[selectedBackgroundIndex.value]
  if (bgPattern) {
    bgPattern.render(previewRenderer, textureColor1.value, textureColor2.value)
  }

  // 2. 中景のマスクを合成（選択されている場合）
  if (selectedMaskIndex.value !== null) {
    const maskPattern = maskPatterns[selectedMaskIndex.value]
    if (maskPattern) {
      maskPattern.render(previewRenderer, maskInnerColor, maskOuterColor.value, { clear: false })
    }
  }
}

// 色・パターン変更時にプレビュー更新
watch([selectedBackgroundIndex, selectedMaskIndex, textureColor1, textureColor2, maskOuterColor], updatePreview)
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
  <div class="w-screen h-screen text-white flex bg-gray-900">
    <!-- 左パネル: カラー設定 & セクション一覧 -->
    <div class="w-64 flex-shrink-0 bg-gray-800 p-4 flex flex-col relative">
      <p class="text-xl font-bold mb-4">Hero View Generator</p>

      <!-- タブ切り替え -->
      <div class="flex gap-1 mb-4 bg-gray-900 p-1 rounded-lg">
        <button
          class="flex-1 px-2 py-1.5 text-xs font-semibold rounded transition-all"
          :class="activeTab === 'generator' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'"
          @click="activeTab = 'generator'"
        >Generator</button>
        <button
          class="flex-1 px-2 py-1.5 text-xs font-semibold rounded transition-all"
          :class="activeTab === 'palette' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'"
          @click="activeTab = 'palette'"
        >Palette</button>
      </div>

      <!-- カラー設定セクション -->
      <div class="mb-4 pb-4 border-b border-gray-700">
        <p class="text-xs text-gray-500 uppercase font-semibold mb-2">Color Settings</p>

        <!-- Brand Color -->
        <button
          class="w-full text-left p-2 rounded-lg mb-2 transition-all flex items-center gap-2"
          :class="activeColorPopup === 'brand' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'"
          @click="toggleColorPopup('brand')"
        >
          <div class="w-6 h-6 rounded border border-gray-500 flex-shrink-0" :style="{ backgroundColor: selectedHex }" />
          <div>
            <p class="text-xs font-semibold">Brand</p>
            <p class="text-[10px] text-gray-400 font-mono">{{ selectedHex }}</p>
          </div>
        </button>

        <!-- Foundation -->
        <button
          class="w-full text-left p-2 rounded-lg transition-all flex items-center gap-2"
          :class="activeColorPopup === 'foundation' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'"
          @click="toggleColorPopup('foundation')"
        >
          <div class="w-6 h-6 rounded border border-gray-500 flex-shrink-0" :style="{ backgroundColor: foundationColor.hex }" />
          <div>
            <p class="text-xs font-semibold">Foundation</p>
            <p class="text-[10px] text-gray-400">{{ foundationColor.label }}</p>
          </div>
        </button>
      </div>

      <!-- レイヤーセクション (Generator タブのみ) -->
      <template v-if="activeTab === 'generator'">
        <p class="text-xs text-gray-500 uppercase font-semibold mb-2">Layers</p>

        <!-- 後景 -->
        <button
          class="w-full text-left p-3 rounded-lg mb-2 transition-all"
          :class="activeSection === 'background' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'"
          @click="openSection('background')"
        >
          <p class="text-sm font-semibold">後景 (Background)</p>
          <p class="text-xs text-gray-300 mt-1">{{ texturePatterns[selectedBackgroundIndex].label }}</p>
        </button>

        <!-- 中景 -->
        <button
          class="w-full text-left p-3 rounded-lg mb-2 transition-all"
          :class="activeSection === 'midground' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'"
          @click="openSection('midground')"
        >
          <p class="text-sm font-semibold">中景 (Midground)</p>
          <p class="text-xs text-gray-300 mt-1">
            {{ selectedMaskIndex !== null ? maskPatterns[selectedMaskIndex].label : 'なし' }}
          </p>
        </button>

        <!-- 前景 -->
        <button
          class="w-full text-left p-3 rounded-lg transition-all"
          :class="activeSection === 'foreground' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'"
          @click="openSection('foreground')"
        >
          <p class="text-sm font-semibold">前景 (Foreground)</p>
          <p class="text-xs text-gray-300 mt-1">未設定</p>
        </button>
      </template>

      <!-- Palette タブ: Neutral Ramp -->
      <template v-if="activeTab === 'palette'">
        <p class="text-xs text-gray-500 uppercase font-semibold mb-2">Neutral Ramp</p>
        <div class="flex gap-0.5 mb-4">
          <div
            v-for="item in neutralRampDisplay"
            :key="item.key"
            class="flex-1 h-8 first:rounded-l last:rounded-r"
            :style="{ backgroundColor: item.css }"
            :title="`${item.key}: ${item.css}`"
          />
        </div>
      </template>

      <!-- カラーポップアップ -->
      <Transition name="popup">
        <div
          v-if="activeColorPopup"
          class="absolute left-full top-0 ml-1 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
        >
          <div class="flex items-center justify-between p-3 border-b border-gray-700">
            <h2 class="text-sm font-semibold">
              {{ activeColorPopup === 'brand' ? 'Brand Color' : 'Foundation' }}
            </h2>
            <button class="text-gray-400 hover:text-white text-lg leading-none" @click="activeColorPopup = null">×</button>
          </div>
          <div class="p-4">
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
    </div>

    <!-- サブパネル: パターン選択 (Generator タブのみ) -->
    <div
      v-if="activeSection && activeTab === 'generator'"
      class="w-72 flex-shrink-0 border-l border-gray-700 overflow-y-auto flex flex-col"
      style="background-color: #1a1f2e;"
    >
      <div class="flex items-center justify-between p-3 border-b border-gray-700">
        <h2 class="text-sm font-semibold text-gray-300">
          {{ activeSection === 'background' ? 'テクスチャ選択' : activeSection === 'midground' ? 'マスク選択' : '前景設定' }}
        </h2>
        <button class="text-gray-400 hover:text-white text-lg leading-none" @click="activeSection = null">
          ×
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-2">
        <!-- 後景: テクスチャ選択 -->
        <template v-if="activeSection === 'background'">
          <div class="space-y-2">
            <button
              v-for="(pattern, i) in texturePatterns"
              :key="i"
              class="w-full rounded-lg overflow-hidden border-2 transition-all"
              :class="selectedBackgroundIndex === i ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'"
              @click="selectedBackgroundIndex = i"
            >
              <canvas data-thumbnail-canvas class="w-full aspect-video" />
              <p class="text-xs text-gray-300 px-2 py-1.5 text-left">{{ pattern.label }}</p>
            </button>
          </div>
        </template>

        <!-- 中景: マスク選択 -->
        <template v-else-if="activeSection === 'midground'">
          <div class="space-y-2">
            <!-- なし -->
            <button
              class="w-full rounded-lg overflow-hidden border-2 transition-all"
              :class="selectedMaskIndex === null ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'"
              @click="selectedMaskIndex = null"
            >
              <div class="w-full aspect-video flex items-center justify-center bg-gray-700">
                <span class="text-sm text-gray-400">なし</span>
              </div>
              <p class="text-xs text-gray-300 px-2 py-1.5 text-left">マスクなし</p>
            </button>
            <!-- マスクパターン -->
            <button
              v-for="(pattern, i) in maskPatterns"
              :key="i"
              class="w-full rounded-lg overflow-hidden border-2 transition-all"
              :class="selectedMaskIndex === i ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'"
              @click="selectedMaskIndex = i"
            >
              <canvas data-thumbnail-canvas class="w-full aspect-video" />
              <p class="text-xs text-gray-300 px-2 py-1.5 text-left">{{ pattern.label }}</p>
            </button>
          </div>
        </template>

        <!-- 前景 -->
        <template v-else-if="activeSection === 'foreground'">
          <div class="text-center text-gray-500 py-8">
            <p>前景は未実装です</p>
          </div>
        </template>
      </div>
    </div>

    <!-- 中央: メインコンテンツ -->
    <div class="flex-1 flex flex-col overflow-hidden bg-gray-950">
      <!-- Generator タブ: プレビュー -->
      <div v-if="activeTab === 'generator'" class="flex-1 flex items-center justify-center p-8">
        <div class="w-full max-w-4xl">
          <div class="aspect-video rounded-lg overflow-hidden border border-gray-700 shadow-2xl">
            <canvas ref="previewCanvasRef" class="w-full h-full" />
          </div>
        </div>
      </div>

      <!-- Palette タブ: Semantic Palette プレビュー -->
      <div v-if="activeTab === 'palette'" class="flex-1 overflow-y-auto p-6 hero-palette-preview" :class="{ dark: isDark }">
        <PalettePreviewTab
          :contexts="contexts"
          :components="components"
          :actions="actions"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
