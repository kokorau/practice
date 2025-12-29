<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { TextureRenderer } from '@practice/texture'

type RGBA = [number, number, number, number]

// 共通カラー
const color1: RGBA = [0.29, 0.44, 0.65, 1.0]
const color2: RGBA = [0.2, 0.3, 0.5, 1.0]

interface TexturePattern {
  label: string
  render: (r: TextureRenderer, c1: RGBA, c2: RGBA, options?: { clear?: boolean }) => void
}

// 後景用テクスチャパターン
const texturePatterns: TexturePattern[] = [
  { label: 'Solid', render: (r, c1) => r.renderSolid({ color: c1 }) },
  {
    label: 'Diagonal 45°',
    render: (r, c1, c2) =>
      r.renderStripe({ width1: 20, width2: 20, angle: Math.PI / 4, color1: c1, color2: c2 }),
  },
  {
    label: 'Horizontal',
    render: (r, c1, c2) =>
      r.renderStripe({ width1: 15, width2: 15, angle: 0, color1: c1, color2: c2 }),
  },
  {
    label: 'Vertical',
    render: (r, c1, c2) =>
      r.renderStripe({ width1: 10, width2: 10, angle: Math.PI / 2, color1: c1, color2: c2 }),
  },
  {
    label: 'Grid',
    render: (r, c1, c2) =>
      r.renderGrid({ lineWidth: 2, cellSize: 30, lineColor: c1, bgColor: c2 }),
  },
  {
    label: 'Polka Dot',
    render: (r, c1, c2) =>
      r.renderPolkaDot({ dotRadius: 10, spacing: 40, rowOffset: 0.5, dotColor: c1, bgColor: c2 }),
  },
  {
    label: 'Checker',
    render: (r, c1, c2) => r.renderChecker({ cellSize: 30, angle: 0, color1: c1, color2: c2 }),
  },
  {
    label: 'Diamond',
    render: (r, c1, c2) =>
      r.renderChecker({ cellSize: 30, angle: Math.PI / 4, color1: c1, color2: c2 }),
  },
]

// 中景用マスクパターン（切り抜き）
const maskPatterns: TexturePattern[] = [
  {
    label: 'Circle Center',
    render: (r, c1, c2, opts) =>
      r.renderCircleMask({ centerX: 0.5, centerY: 0.5, radius: 0.3, innerColor: c1, outerColor: c2 }, opts),
  },
  {
    label: 'Circle Large',
    render: (r, c1, c2, opts) =>
      r.renderCircleMask({ centerX: 0.5, centerY: 0.5, radius: 0.5, innerColor: c1, outerColor: c2 }, opts),
  },
  {
    label: 'Circle Top-Left',
    render: (r, c1, c2, opts) =>
      r.renderCircleMask({ centerX: 0.25, centerY: 0.25, radius: 0.2, innerColor: c1, outerColor: c2 }, opts),
  },
  {
    label: 'Circle Bottom-Right',
    render: (r, c1, c2, opts) =>
      r.renderCircleMask({ centerX: 0.75, centerY: 0.75, radius: 0.2, innerColor: c1, outerColor: c2 }, opts),
  },
  {
    label: 'Half Top',
    render: (r, c1, c2, opts) =>
      r.renderHalfMask({ direction: 'top', visibleColor: c1, hiddenColor: c2 }, opts),
  },
  {
    label: 'Half Bottom',
    render: (r, c1, c2, opts) =>
      r.renderHalfMask({ direction: 'bottom', visibleColor: c1, hiddenColor: c2 }, opts),
  },
  {
    label: 'Half Left',
    render: (r, c1, c2, opts) =>
      r.renderHalfMask({ direction: 'left', visibleColor: c1, hiddenColor: c2 }, opts),
  },
  {
    label: 'Half Right',
    render: (r, c1, c2, opts) =>
      r.renderHalfMask({ direction: 'right', visibleColor: c1, hiddenColor: c2 }, opts),
  },
  {
    label: 'Rect Center',
    render: (r, c1, c2, opts) =>
      r.renderRectMask({ left: 0.3, right: 0.7, top: 0.1, bottom: 0.9, innerColor: c1, outerColor: c2 }, opts),
  },
  {
    label: 'Rect Frame',
    render: (r, c1, c2, opts) =>
      r.renderRectMask({ left: 0.1, right: 0.9, top: 0.1, bottom: 0.9, innerColor: c1, outerColor: c2 }, opts),
  },
  {
    label: 'Rect Top',
    render: (r, c1, c2, opts) =>
      r.renderRectMask({ left: 0.1, right: 0.9, top: 0.05, bottom: 0.5, innerColor: c1, outerColor: c2 }, opts),
  },
  {
    label: 'Rect Bottom',
    render: (r, c1, c2, opts) =>
      r.renderRectMask({ left: 0.1, right: 0.9, top: 0.5, bottom: 0.95, innerColor: c1, outerColor: c2 }, opts),
  },
]

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
        patterns[i]?.render(renderer, color1, color2)
      } catch (e) {
        console.error('WebGPU not available:', e)
      }
    }
  })
}

// マスク用カラー（内側透明、外側不透明）
const maskInnerColor: RGBA = [0, 0, 0, 0] // 透明 - 後景が見える
const maskOuterColor: RGBA = [0.1, 0.1, 0.15, 1.0] // 不透明 - 後景を隠す

// プレビュー更新
function updatePreview() {
  if (!previewRenderer) return

  // 1. 後景を描画
  const bgPattern = texturePatterns[selectedBackgroundIndex.value]
  if (bgPattern) {
    bgPattern.render(previewRenderer, color1, color2)
  }

  // 2. 中景のマスクを合成（選択されている場合）
  if (selectedMaskIndex.value !== null) {
    const maskPattern = maskPatterns[selectedMaskIndex.value]
    if (maskPattern) {
      maskPattern.render(previewRenderer, maskInnerColor, maskOuterColor, { clear: false })
    }
  }
}

watch([selectedBackgroundIndex, selectedMaskIndex], updatePreview)

onMounted(async () => {
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
})
</script>

<template>
  <div class="w-screen h-screen bg-gray-900 text-white flex">
    <!-- 左パネル: セクション一覧 -->
    <div class="w-64 flex-shrink-0 bg-gray-800 p-4">
      <p class="text-xl font-bold mb-6">Hero View Generator</p>

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
    </div>

    <!-- サブパネル: パターン選択 -->
    <div
      v-if="activeSection"
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

    <!-- 中央: プレビュー -->
    <div class="flex-1 flex items-center justify-center p-8 bg-gray-950">
      <div class="w-full max-w-4xl">
        <div class="aspect-video rounded-lg overflow-hidden border border-gray-700 shadow-2xl">
          <canvas ref="previewCanvasRef" class="w-full h-full" />
        </div>
      </div>
    </div>
  </div>
</template>
