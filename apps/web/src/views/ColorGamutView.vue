<script setup lang="ts">
import { ref, computed } from 'vue'

// 色空間の定義
type ColorSpace = 'srgb' | 'display-p3' | 'rec2020' | 'aces'

interface ColorSpaceInfo {
  id: ColorSpace
  name: string
  description: string
  cssSupport: boolean
  coverage: string // sRGBに対する色域の広さ（概算）
}

const colorSpaces: ColorSpaceInfo[] = [
  {
    id: 'srgb',
    name: 'sRGB',
    description: '標準的なWeb/ディスプレイ色空間',
    cssSupport: true,
    coverage: '100%'
  },
  {
    id: 'display-p3',
    name: 'Display P3',
    description: 'Apple機器やHDRディスプレイで使用される広色域',
    cssSupport: true,
    coverage: '~125%'
  },
  {
    id: 'rec2020',
    name: 'Rec.2020 (BT.2020)',
    description: 'UHD/4K/8K放送向けの超広色域規格',
    cssSupport: true,
    coverage: '~175%'
  },
  {
    id: 'aces',
    name: 'ACES (AP0/AP1)',
    description: '映画・映像制作向けのシーンリファード色空間',
    cssSupport: false,
    coverage: '~200%+'
  }
]

// 選択された色空間
const selectedColorSpace = ref<ColorSpace>('display-p3')

// RGB値（0-1）
const r = ref(1.0)
const g = ref(0.2)
const b = ref(0.1)

// 色空間のCSS color()関数生成
function getCssColor(space: ColorSpace, r: number, g: number, b: number): string {
  switch (space) {
    case 'srgb':
      return `color(srgb ${r} ${g} ${b})`
    case 'display-p3':
      return `color(display-p3 ${r} ${g} ${b})`
    case 'rec2020':
      return `color(rec2020 ${r} ${g} ${b})`
    case 'aces':
      // ACESはCSS未サポート。sRGBにトーンマッピングして表示
      return `color(srgb ${acesToSrgb(r, g, b).join(' ')})`
    default:
      return `rgb(${r * 255}, ${g * 255}, ${b * 255})`
  }
}

// ACES AP0からsRGBへの簡易変換（トーンマッピング含む）
function acesToSrgb(r: number, g: number, b: number): [number, number, number] {
  // ACES AP0 to XYZ D65 matrix (simplified)
  const x = r * 0.9525523959 + g * 0.0000000000 + b * 0.0000936786
  const y = r * 0.3439664498 + g * 0.7281660966 + b * -0.0721325464
  const z = r * 0.0000000000 + g * 0.0000000000 + b * 1.0088251844

  // XYZ D65 to sRGB
  let sr = x * 3.2404541621 + y * -1.5371385940 + z * -0.4985314095
  let sg = x * -0.9692660305 + y * 1.8760108454 + z * 0.0415560175
  let sb = x * 0.0556434309 + y * -0.2040259135 + z * 1.0572251882

  // 簡易トーンマッピング（Reinhard）
  const toneMap = (v: number) => v / (1 + v)

  sr = toneMap(Math.max(0, sr))
  sg = toneMap(Math.max(0, sg))
  sb = toneMap(Math.max(0, sb))

  // ガンマ補正
  const gamma = (v: number) => v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055

  return [
    Math.min(1, Math.max(0, gamma(sr))),
    Math.min(1, Math.max(0, gamma(sg))),
    Math.min(1, Math.max(0, gamma(sb)))
  ]
}

// 現在の色のCSS表現
const currentColor = computed(() => getCssColor(selectedColorSpace.value, r.value, g.value, b.value))

// sRGBでの表示（比較用）
const srgbColor = computed(() => getCssColor('srgb', r.value, g.value, b.value))

// 色域外かどうかをチェック
const isOutOfSrgbGamut = computed(() => {
  return r.value > 1 || g.value > 1 || b.value > 1 ||
         r.value < 0 || g.value < 0 || b.value < 0
})

// サンプル色（各色空間の特徴を示す色）
interface SampleColor {
  name: string
  description: string
  r: number
  g: number
  b: number
}

const sampleColors: SampleColor[] = [
  { name: 'Vivid Red', description: 'sRGB外の赤', r: 1.0, g: 0.1, b: 0.1 },
  { name: 'Electric Green', description: '高彩度の緑', r: 0.2, g: 1.0, b: 0.2 },
  { name: 'Deep Cyan', description: '深いシアン', r: 0.0, g: 0.9, b: 1.0 },
  { name: 'Ultra Violet', description: '紫外に近い青紫', r: 0.5, g: 0.0, b: 1.0 },
  { name: 'Laser Lime', description: 'レーザーのような黄緑', r: 0.7, g: 1.0, b: 0.0 },
  { name: 'Hot Pink', description: '蛍光ピンク風', r: 1.0, g: 0.2, b: 0.6 },
  { name: 'Pure Orange', description: '純粋なオレンジ', r: 1.0, g: 0.5, b: 0.0 },
  { name: 'Ocean Blue', description: '海のような青', r: 0.0, g: 0.4, b: 1.0 },
]

function applySampleColor(sample: SampleColor) {
  r.value = sample.r
  g.value = sample.g
  b.value = sample.b
}

// 色域の可視化用：CIE xy色度図上の色空間の頂点（概算）
const gamutVertices: Record<ColorSpace, { r: [number, number], g: [number, number], b: [number, number] }> = {
  srgb: {
    r: [0.64, 0.33],
    g: [0.30, 0.60],
    b: [0.15, 0.06]
  },
  'display-p3': {
    r: [0.68, 0.32],
    g: [0.265, 0.69],
    b: [0.15, 0.06]
  },
  rec2020: {
    r: [0.708, 0.292],
    g: [0.17, 0.797],
    b: [0.131, 0.046]
  },
  aces: {
    r: [0.7347, 0.2653],
    g: [0.0, 1.0],
    b: [0.0001, -0.077]
  }
}

// SVG用にxy色度座標を変換
function xyToSvg(x: number, y: number): { x: number, y: number } {
  const svgWidth = 400
  const svgHeight = 400
  const margin = 40

  // xy色度図の範囲（概算）
  const xMin = 0
  const xMax = 0.8
  const yMin = 0
  const yMax = 0.9

  return {
    x: margin + ((x - xMin) / (xMax - xMin)) * (svgWidth - 2 * margin),
    y: svgHeight - margin - ((y - yMin) / (yMax - yMin)) * (svgHeight - 2 * margin)
  }
}

function getGamutPath(space: ColorSpace): string {
  const vertices = gamutVertices[space]
  const rPt = xyToSvg(...vertices.r)
  const gPt = xyToSvg(...vertices.g)
  const bPt = xyToSvg(...vertices.b)

  return `M ${rPt.x} ${rPt.y} L ${gPt.x} ${gPt.y} L ${bPt.x} ${bPt.y} Z`
}

const gamutColors: Record<ColorSpace, string> = {
  srgb: 'rgba(100, 100, 100, 0.4)',
  'display-p3': 'rgba(0, 150, 255, 0.3)',
  rec2020: 'rgba(0, 255, 100, 0.2)',
  aces: 'rgba(255, 100, 0, 0.15)'
}

// ディスプレイの色域サポート検出
const supportsP3 = ref(false)
const supportsRec2020 = ref(false)

if (typeof window !== 'undefined') {
  supportsP3.value = window.matchMedia('(color-gamut: p3)').matches
  supportsRec2020.value = window.matchMedia('(color-gamut: rec2020)').matches
}
</script>

<template>
  <div class="h-screen bg-gray-900 text-white flex flex-col">
    <div class="p-4 border-b border-gray-700">
      <h1 class="text-xl font-bold">Color Gamut Explorer</h1>
      <p class="text-sm text-gray-400 mt-1">
        Rec.2020, Display-P3, ACESなど広色域の確認
      </p>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- 左パネル: コントロール -->
      <div class="w-96 flex-shrink-0 border-r border-gray-700 p-4 overflow-y-auto">
        <div class="space-y-6">
          <!-- ディスプレイ情報 -->
          <div class="p-3 bg-gray-800 rounded-lg">
            <h2 class="text-sm font-semibold text-gray-400 mb-2">Display Capabilities</h2>
            <div class="text-xs space-y-1">
              <div class="flex items-center gap-2">
                <span :class="supportsP3 ? 'text-green-400' : 'text-red-400'">
                  {{ supportsP3 ? '✓' : '✗' }}
                </span>
                <span>Display P3</span>
              </div>
              <div class="flex items-center gap-2">
                <span :class="supportsRec2020 ? 'text-green-400' : 'text-red-400'">
                  {{ supportsRec2020 ? '✓' : '✗' }}
                </span>
                <span>Rec.2020</span>
              </div>
            </div>
          </div>

          <!-- 色空間選択 -->
          <div>
            <h2 class="text-sm font-semibold text-gray-400 mb-2">Color Space</h2>
            <div class="space-y-2">
              <button
                v-for="space in colorSpaces"
                :key="space.id"
                class="w-full text-left px-3 py-2 rounded transition-colors"
                :class="selectedColorSpace === space.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'"
                @click="selectedColorSpace = space.id"
              >
                <div class="flex items-center justify-between">
                  <span class="font-medium">{{ space.name }}</span>
                  <span class="text-xs opacity-60">{{ space.coverage }}</span>
                </div>
                <div class="text-xs opacity-70 mt-0.5">{{ space.description }}</div>
                <div v-if="!space.cssSupport" class="text-xs text-yellow-400 mt-1">
                  ⚠ CSS未サポート（近似表示）
                </div>
              </button>
            </div>
          </div>

          <!-- RGB値入力 -->
          <div>
            <h2 class="text-sm font-semibold text-gray-400 mb-2">Color Values</h2>
            <div class="space-y-3">
              <div>
                <label class="flex justify-between text-xs text-gray-500 mb-1">
                  <span>R (Red)</span>
                  <span>{{ r.toFixed(3) }}</span>
                </label>
                <input
                  v-model.number="r"
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.01"
                  class="w-full accent-red-500"
                />
              </div>
              <div>
                <label class="flex justify-between text-xs text-gray-500 mb-1">
                  <span>G (Green)</span>
                  <span>{{ g.toFixed(3) }}</span>
                </label>
                <input
                  v-model.number="g"
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.01"
                  class="w-full accent-green-500"
                />
              </div>
              <div>
                <label class="flex justify-between text-xs text-gray-500 mb-1">
                  <span>B (Blue)</span>
                  <span>{{ b.toFixed(3) }}</span>
                </label>
                <input
                  v-model.number="b"
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.01"
                  class="w-full accent-blue-500"
                />
              </div>
            </div>

            <div v-if="isOutOfSrgbGamut" class="mt-2 text-xs text-yellow-400">
              ⚠ 値が0-1の範囲外です（広色域テスト用）
            </div>
          </div>

          <!-- サンプル色 -->
          <div>
            <h2 class="text-sm font-semibold text-gray-400 mb-2">Sample Colors</h2>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="sample in sampleColors"
                :key="sample.name"
                class="px-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded text-left transition-colors"
                @click="applySampleColor(sample)"
              >
                <div class="font-medium">{{ sample.name }}</div>
                <div class="text-gray-400 text-[10px]">{{ sample.description }}</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 中央パネル: 色プレビュー -->
      <div class="flex-1 p-6 overflow-y-auto">
        <div class="max-w-2xl mx-auto space-y-6">
          <!-- メイン色表示 -->
          <div>
            <h2 class="text-lg font-semibold mb-3">Color Preview</h2>
            <div class="grid grid-cols-2 gap-4">
              <!-- 選択された色空間での表示 -->
              <div>
                <div class="text-sm text-gray-400 mb-2">
                  {{ colorSpaces.find(s => s.id === selectedColorSpace)?.name }}
                </div>
                <div
                  class="h-40 rounded-lg border border-gray-600 shadow-lg"
                  :style="{ backgroundColor: currentColor }"
                />
                <div class="mt-2 text-xs font-mono text-gray-400 break-all">
                  {{ currentColor }}
                </div>
              </div>

              <!-- sRGBでの表示（比較用） -->
              <div>
                <div class="text-sm text-gray-400 mb-2">sRGB (Reference)</div>
                <div
                  class="h-40 rounded-lg border border-gray-600 shadow-lg"
                  :style="{ backgroundColor: srgbColor }"
                />
                <div class="mt-2 text-xs font-mono text-gray-400 break-all">
                  {{ srgbColor }}
                </div>
              </div>
            </div>
          </div>

          <!-- 全色空間比較 -->
          <div>
            <h2 class="text-lg font-semibold mb-3">All Color Spaces Comparison</h2>
            <div class="grid grid-cols-4 gap-3">
              <div v-for="space in colorSpaces" :key="space.id">
                <div class="text-xs text-gray-400 mb-1 truncate">{{ space.name }}</div>
                <div
                  class="h-20 rounded border border-gray-600"
                  :style="{ backgroundColor: getCssColor(space.id, r, g, b) }"
                />
              </div>
            </div>
          </div>

          <!-- 赤・緑・青の純色比較 -->
          <div>
            <h2 class="text-lg font-semibold mb-3">Primary Colors Comparison</h2>
            <div class="space-y-4">
              <!-- 赤 -->
              <div>
                <div class="text-sm text-gray-400 mb-2">Red (1, 0, 0)</div>
                <div class="grid grid-cols-4 gap-2">
                  <div v-for="space in colorSpaces" :key="space.id" class="text-center">
                    <div
                      class="h-12 rounded border border-gray-600"
                      :style="{ backgroundColor: getCssColor(space.id, 1, 0, 0) }"
                    />
                    <div class="text-[10px] text-gray-500 mt-1">{{ space.name }}</div>
                  </div>
                </div>
              </div>

              <!-- 緑 -->
              <div>
                <div class="text-sm text-gray-400 mb-2">Green (0, 1, 0)</div>
                <div class="grid grid-cols-4 gap-2">
                  <div v-for="space in colorSpaces" :key="space.id" class="text-center">
                    <div
                      class="h-12 rounded border border-gray-600"
                      :style="{ backgroundColor: getCssColor(space.id, 0, 1, 0) }"
                    />
                    <div class="text-[10px] text-gray-500 mt-1">{{ space.name }}</div>
                  </div>
                </div>
              </div>

              <!-- 青 -->
              <div>
                <div class="text-sm text-gray-400 mb-2">Blue (0, 0, 1)</div>
                <div class="grid grid-cols-4 gap-2">
                  <div v-for="space in colorSpaces" :key="space.id" class="text-center">
                    <div
                      class="h-12 rounded border border-gray-600"
                      :style="{ backgroundColor: getCssColor(space.id, 0, 0, 1) }"
                    />
                    <div class="text-[10px] text-gray-500 mt-1">{{ space.name }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- グラデーション表示 -->
          <div>
            <h2 class="text-lg font-semibold mb-3">Gradient Comparison</h2>
            <div class="space-y-3">
              <div v-for="space in colorSpaces" :key="space.id">
                <div class="text-xs text-gray-400 mb-1">{{ space.name }}</div>
                <div
                  class="h-8 rounded border border-gray-600"
                  :style="{
                    background: `linear-gradient(to right,
                      ${getCssColor(space.id, 1, 0, 0)},
                      ${getCssColor(space.id, 1, 1, 0)},
                      ${getCssColor(space.id, 0, 1, 0)},
                      ${getCssColor(space.id, 0, 1, 1)},
                      ${getCssColor(space.id, 0, 0, 1)},
                      ${getCssColor(space.id, 1, 0, 1)},
                      ${getCssColor(space.id, 1, 0, 0)}
                    )`
                  }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右パネル: 色度図 -->
      <div class="w-[450px] flex-shrink-0 border-l border-gray-700 p-4 overflow-y-auto">
        <h2 class="text-sm font-semibold text-gray-400 mb-3">CIE 1931 xy Chromaticity</h2>

        <svg viewBox="0 0 400 400" class="w-full bg-gray-800 rounded-lg">
          <!-- 背景グリッド -->
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect width="400" height="400" fill="url(#grid)" />

          <!-- 色空間の三角形 -->
          <path
            v-for="space in colorSpaces"
            :key="space.id"
            :d="getGamutPath(space.id)"
            :fill="gamutColors[space.id]"
            :stroke="selectedColorSpace === space.id ? 'white' : 'rgba(255,255,255,0.3)'"
            :stroke-width="selectedColorSpace === space.id ? 2 : 1"
          />

          <!-- 軸ラベル -->
          <text x="200" y="390" fill="rgba(255,255,255,0.5)" font-size="12" text-anchor="middle">x</text>
          <text x="15" y="200" fill="rgba(255,255,255,0.5)" font-size="12" text-anchor="middle">y</text>

          <!-- 凡例 -->
          <g transform="translate(280, 20)">
            <rect x="0" y="0" width="10" height="10" fill="rgba(100, 100, 100, 0.6)" />
            <text x="15" y="9" fill="rgba(255,255,255,0.7)" font-size="10">sRGB</text>

            <rect x="0" y="15" width="10" height="10" fill="rgba(0, 150, 255, 0.5)" />
            <text x="15" y="24" fill="rgba(255,255,255,0.7)" font-size="10">Display P3</text>

            <rect x="0" y="30" width="10" height="10" fill="rgba(0, 255, 100, 0.4)" />
            <text x="15" y="39" fill="rgba(255,255,255,0.7)" font-size="10">Rec.2020</text>

            <rect x="0" y="45" width="10" height="10" fill="rgba(255, 100, 0, 0.4)" />
            <text x="15" y="54" fill="rgba(255,255,255,0.7)" font-size="10">ACES</text>
          </g>
        </svg>

        <!-- 色空間情報 -->
        <div class="mt-4 p-3 bg-gray-800 rounded-lg">
          <h3 class="text-sm font-semibold mb-2">
            {{ colorSpaces.find(s => s.id === selectedColorSpace)?.name }}
          </h3>
          <p class="text-xs text-gray-400">
            {{ colorSpaces.find(s => s.id === selectedColorSpace)?.description }}
          </p>

          <div class="mt-3 text-xs space-y-2">
            <div v-if="selectedColorSpace === 'display-p3'" class="text-gray-300">
              <p>Display P3はDCI-P3を基にした色空間で、sRGBより約25%広い色域を持ちます。</p>
              <p class="mt-1">Apple製品やハイエンドディスプレイで広くサポートされています。</p>
            </div>
            <div v-else-if="selectedColorSpace === 'rec2020'" class="text-gray-300">
              <p>Rec.2020は4K/8K放送向け規格で、レーザープロジェクターなどで完全な再現が可能です。</p>
              <p class="mt-1">現在のLCD/OLEDディスプレイでは一部しか再現できません。</p>
            </div>
            <div v-else-if="selectedColorSpace === 'aces'" class="text-gray-300">
              <p>ACESは映画制作のための色空間で、人間の可視域を超える色も表現可能です。</p>
              <p class="mt-1">AP0は原色として、AP1は作業用色空間として使われます。</p>
              <p class="mt-1 text-yellow-400">※ブラウザでは直接サポートされないため、トーンマッピングして表示しています。</p>
            </div>
            <div v-else class="text-gray-300">
              <p>sRGBはWebと一般的なディスプレイの標準色空間です。</p>
              <p class="mt-1">ほぼ全てのデバイスで正確に再現されます。</p>
            </div>
          </div>
        </div>

        <!-- ACES特別セクション -->
        <div v-if="selectedColorSpace === 'aces'" class="mt-4 p-3 bg-orange-900/30 border border-orange-700 rounded-lg">
          <h3 class="text-sm font-semibold text-orange-300 mb-2">ACES Workflow</h3>
          <div class="text-xs text-gray-300 space-y-2">
            <p>ACESを試すには以下の方法があります：</p>
            <ul class="list-disc list-inside space-y-1 ml-2">
              <li>DaVinci Resolve（無料版でACES対応）</li>
              <li>Blender（ACES OCIOプロファイル）</li>
              <li>Nuke / After Effects（OCIOプラグイン）</li>
            </ul>
            <p class="mt-2 text-yellow-300">
              WebGLでACESトーンマッピングを実装することで、より正確なプレビューが可能です。
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
