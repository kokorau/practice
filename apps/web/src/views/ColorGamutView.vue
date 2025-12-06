<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  convertXyYToColorSpaces,
  GAMUT_VERTICES,
  COLOR_SPACE_INFO,
  type ColorSpaceId,
} from '../modules/Color/Application/ConvertXyYToColorSpaces'
import { $Srgb } from '../modules/Color/Domain/ValueObject/Srgb'

// 色空間IDリスト（ACES除外）
const colorSpaceIds: ColorSpaceId[] = ['srgb', 'display-p3', 'rec2020']

// D65白色点
const D65_WHITE: [number, number] = [0.31272, 0.32903]

// SVG設定
const SVG_SIZE = 400
const SVG_MARGIN = 40

// xy色度図の表示範囲
const XY_RANGE = { xMin: 0, xMax: 0.8, yMin: 0, yMax: 0.9 }

// 選択されたxy座標
const selectedXy = ref<{ x: number; y: number }>({ x: D65_WHITE[0], y: D65_WHITE[1] })

// 輝度（Y）値
const luminance = ref(0.7)

// UseCaseを使った変換結果
const conversionResult = computed(() => {
  return convertXyYToColorSpaces(selectedXy.value.x, selectedXy.value.y, luminance.value)
})

// SVG座標 <-> xy色度座標の変換
function xyToSvg(x: number, y: number): { x: number; y: number } {
  return {
    x: SVG_MARGIN + ((x - XY_RANGE.xMin) / (XY_RANGE.xMax - XY_RANGE.xMin)) * (SVG_SIZE - 2 * SVG_MARGIN),
    y: SVG_SIZE - SVG_MARGIN - ((y - XY_RANGE.yMin) / (XY_RANGE.yMax - XY_RANGE.yMin)) * (SVG_SIZE - 2 * SVG_MARGIN)
  }
}

function svgToXy(svgX: number, svgY: number): { x: number; y: number } {
  return {
    x: XY_RANGE.xMin + ((svgX - SVG_MARGIN) / (SVG_SIZE - 2 * SVG_MARGIN)) * (XY_RANGE.xMax - XY_RANGE.xMin),
    y: XY_RANGE.yMin + ((SVG_SIZE - SVG_MARGIN - svgY) / (SVG_SIZE - 2 * SVG_MARGIN)) * (XY_RANGE.yMax - XY_RANGE.yMin)
  }
}

// 色度図クリック/ドラッグ処理
const svgRef = ref<SVGSVGElement | null>(null)
const isDragging = ref(false)

function updateFromEvent(event: MouseEvent) {
  if (!svgRef.value) return

  const rect = svgRef.value.getBoundingClientRect()
  const scaleX = SVG_SIZE / rect.width
  const scaleY = SVG_SIZE / rect.height

  const svgX = (event.clientX - rect.left) * scaleX
  const svgY = (event.clientY - rect.top) * scaleY

  const xy = svgToXy(svgX, svgY)

  // 有効範囲チェック
  if (xy.x >= 0 && xy.x <= 1 && xy.y > 0 && xy.y <= 1) {
    selectedXy.value = xy
  }
}

function handlePointerDown(event: PointerEvent) {
  isDragging.value = true
  ;(event.target as Element).setPointerCapture(event.pointerId)
  updateFromEvent(event)
}

function handlePointerMove(event: PointerEvent) {
  if (isDragging.value) {
    updateFromEvent(event)
  }
}

function handlePointerUp(event: PointerEvent) {
  isDragging.value = false
  ;(event.target as Element).releasePointerCapture(event.pointerId)
}

// ガマットパス生成
function getGamutPath(spaceId: ColorSpaceId): string {
  const vertices = GAMUT_VERTICES[spaceId]
  const rPt = xyToSvg(vertices.r[0], vertices.r[1])
  const gPt = xyToSvg(vertices.g[0], vertices.g[1])
  const bPt = xyToSvg(vertices.b[0], vertices.b[1])

  return `M ${rPt.x} ${rPt.y} L ${gPt.x} ${gPt.y} L ${bPt.x} ${bPt.y} Z`
}

// 選択点のSVG座標
const selectedPointSvg = computed(() => xyToSvg(selectedXy.value.x, selectedXy.value.y))

// D65白色点のSVG座標
const d65PointSvg = computed(() => xyToSvg(D65_WHITE[0], D65_WHITE[1]))

// ディスプレイの色域サポート検出
const supportsP3 = ref(false)
const supportsRec2020 = ref(false)

if (typeof window !== 'undefined') {
  supportsP3.value = window.matchMedia('(color-gamut: p3)').matches
  supportsRec2020.value = window.matchMedia('(color-gamut: rec2020)').matches
}

// 色空間ごとのディスプレイサポート状態
function isDisplaySupported(spaceId: ColorSpaceId): boolean {
  switch (spaceId) {
    case 'srgb':
      return true // sRGBは全ディスプレイでサポート
    case 'display-p3':
      return supportsP3.value
    case 'rec2020':
      return supportsRec2020.value
    default:
      return false
  }
}

// 色空間の塗りつぶし色
const gamutFillColors: Record<string, string> = {
  srgb: 'rgba(100, 100, 100, 0.3)',
  'display-p3': 'rgba(0, 150, 255, 0.2)',
  rec2020: 'rgba(0, 255, 100, 0.15)',
}

// 各色空間のマーカー色
const markerColors: Record<string, string> = {
  srgb: '#888',
  'display-p3': '#0af',
  rec2020: '#0f8',
}

// 各色空間の出力位置（xy座標）をSVG座標に変換
function getChromaticitySvg(spaceId: ColorSpaceId) {
  const chr = conversionResult.value.colorSpaces[spaceId].chromaticity
  return xyToSvg(chr.x, chr.y)
}

// RGB値のフォーマット（小数点3桁）
function formatRgb(v: number): string {
  return v.toFixed(3)
}

// sRGB用のHEX値を計算
const srgbHex = computed(() => {
  const gamma = conversionResult.value.colorSpaces.srgb.gamma
  return $Srgb.toHex($Srgb.create(gamma.r, gamma.g, gamma.b))
})
</script>

<template>
  <div class="h-screen bg-gray-900 text-white flex flex-col">
    <div class="p-4 border-b border-gray-700">
      <h1 class="text-xl font-bold">Color Gamut Explorer</h1>
      <p class="text-sm text-gray-400 mt-1">
        色度図をクリック/ドラッグして各色空間での色を確認
      </p>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- 左パネル: 色度図 -->
      <div class="w-[480px] flex-shrink-0 border-r border-gray-700 p-4 overflow-y-auto">
        <div class="space-y-4">
          <!-- 色度図 -->
          <div>
            <h2 class="text-sm font-semibold text-gray-400 mb-2">CIE 1931 xy Chromaticity</h2>
            <svg
              ref="svgRef"
              :viewBox="`0 0 ${SVG_SIZE} ${SVG_SIZE}`"
              class="w-full bg-gray-800 rounded-lg cursor-crosshair select-none"
              @pointerdown="handlePointerDown"
              @pointermove="handlePointerMove"
              @pointerup="handlePointerUp"
              @pointercancel="handlePointerUp"
            >
              <!-- 背景グリッド -->
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
                </pattern>
              </defs>
              <rect width="400" height="400" fill="url(#grid)" />

              <!-- 色空間の三角形（逆順で描画してsRGBを手前に） -->
              <path
                v-for="spaceId in [...colorSpaceIds].reverse()"
                :key="spaceId"
                :d="getGamutPath(spaceId)"
                :fill="gamutFillColors[spaceId]"
                stroke="rgba(255,255,255,0.3)"
                stroke-width="1"
              />

              <!-- D65白色点 -->
              <circle
                :cx="d65PointSvg.x"
                :cy="d65PointSvg.y"
                r="4"
                fill="white"
                stroke="gray"
                stroke-width="1"
              />
              <text
                :x="d65PointSvg.x + 8"
                :y="d65PointSvg.y + 4"
                fill="rgba(255,255,255,0.5)"
                font-size="10"
              >D65</text>

              <!-- 各色空間の出力位置マーカー -->
              <g v-for="spaceId in colorSpaceIds" :key="`marker-${spaceId}`">
                <circle
                  :cx="getChromaticitySvg(spaceId).x"
                  :cy="getChromaticitySvg(spaceId).y"
                  r="5"
                  :fill="markerColors[spaceId]"
                  :stroke="conversionResult.colorSpaces[spaceId].inGamut ? 'white' : 'red'"
                  stroke-width="1.5"
                />
              </g>

              <!-- 選択点（入力） -->
              <circle
                :cx="selectedPointSvg.x"
                :cy="selectedPointSvg.y"
                r="10"
                fill="none"
                stroke="white"
                stroke-width="2"
                stroke-dasharray="4 2"
              />
              <circle
                :cx="selectedPointSvg.x"
                :cy="selectedPointSvg.y"
                r="3"
                fill="white"
              />

              <!-- 軸ラベル -->
              <text x="200" y="390" fill="rgba(255,255,255,0.5)" font-size="12" text-anchor="middle">x</text>
              <text x="15" y="200" fill="rgba(255,255,255,0.5)" font-size="12" text-anchor="middle">y</text>

              <!-- 凡例 -->
              <g transform="translate(280, 20)">
                <rect x="0" y="0" width="10" height="10" :fill="gamutFillColors.srgb" stroke="rgba(255,255,255,0.5)" />
                <text x="15" y="9" fill="rgba(255,255,255,0.7)" font-size="10">sRGB</text>

                <rect x="0" y="15" width="10" height="10" :fill="gamutFillColors['display-p3']" stroke="rgba(255,255,255,0.5)" />
                <text x="15" y="24" fill="rgba(255,255,255,0.7)" font-size="10">Display P3</text>

                <rect x="0" y="30" width="10" height="10" :fill="gamutFillColors.rec2020" stroke="rgba(255,255,255,0.5)" />
                <text x="15" y="39" fill="rgba(255,255,255,0.7)" font-size="10">Rec.2020</text>
              </g>
            </svg>
            <p class="text-xs text-gray-500 mt-1">Y (luminance) = 0.7</p>
          </div>

        </div>
      </div>

      <!-- 右パネル: 各色空間の色 -->
      <div class="flex-1 p-6 overflow-y-auto">
        <h2 class="text-lg font-semibold mb-4">Color in Each Color Space</h2>

        <div class="grid grid-cols-3 gap-4">
          <div
            v-for="spaceId in colorSpaceIds"
            :key="spaceId"
            class="p-4 bg-gray-800 rounded-lg"
          >
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-semibold">{{ COLOR_SPACE_INFO[spaceId].name }}</h3>
              <div class="flex gap-1">
                <span
                  v-if="conversionResult.colorSpaces[spaceId].inGamut"
                  class="text-xs px-2 py-0.5 bg-green-600 rounded"
                >In Gamut</span>
                <span
                  v-else
                  class="text-xs px-2 py-0.5 bg-red-600 rounded"
                >Out of Gamut</span>
              </div>
            </div>

            <div class="flex items-center justify-between mb-3">
              <p class="text-xs text-gray-400">{{ COLOR_SPACE_INFO[spaceId].description }}</p>
              <span
                class="text-xs flex items-center gap-1"
                :class="isDisplaySupported(spaceId) ? 'text-green-400' : 'text-gray-500'"
              >
                {{ isDisplaySupported(spaceId) ? '✓' : '✗' }} Display
              </span>
            </div>

            <!-- 色プレビュー -->
            <div
              class="h-24 rounded-lg border border-gray-600 mb-3"
              :style="{ backgroundColor: conversionResult.colorSpaces[spaceId].css }"
            />

            <!-- RGB値（Linear） -->
            <div class="text-xs space-y-1">
              <div class="text-gray-400">Linear RGB:</div>
              <div class="font-mono grid grid-cols-3 gap-1">
                <span :class="conversionResult.colorSpaces[spaceId].linear.r < 0 || conversionResult.colorSpaces[spaceId].linear.r > 1 ? 'text-yellow-400' : ''">
                  R: {{ formatRgb(conversionResult.colorSpaces[spaceId].linear.r) }}
                </span>
                <span :class="conversionResult.colorSpaces[spaceId].linear.g < 0 || conversionResult.colorSpaces[spaceId].linear.g > 1 ? 'text-yellow-400' : ''">
                  G: {{ formatRgb(conversionResult.colorSpaces[spaceId].linear.g) }}
                </span>
                <span :class="conversionResult.colorSpaces[spaceId].linear.b < 0 || conversionResult.colorSpaces[spaceId].linear.b > 1 ? 'text-yellow-400' : ''">
                  B: {{ formatRgb(conversionResult.colorSpaces[spaceId].linear.b) }}
                </span>
              </div>
            </div>

            <!-- xy色度座標 -->
            <div class="mt-2 text-xs">
              <div class="text-gray-400">Chromaticity (xy):</div>
              <div class="font-mono text-gray-300">
                x: {{ conversionResult.colorSpaces[spaceId].chromaticity.x.toFixed(4) }},
                y: {{ conversionResult.colorSpaces[spaceId].chromaticity.y.toFixed(4) }}
              </div>
            </div>

            <!-- CSS値 -->
            <div class="mt-2 text-xs">
              <div class="text-gray-400">CSS:</div>
              <div class="font-mono text-gray-300 break-all">
                {{ conversionResult.colorSpaces[spaceId].css }}
              </div>
              <div v-if="spaceId === 'srgb'" class="font-mono text-gray-300 mt-1">
                {{ srgbHex }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
