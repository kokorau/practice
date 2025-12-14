<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import type { Lut } from '../../modules/Filter/Domain/ValueObject/Lut'
import { $Lut3D } from '../../modules/Filter/Domain/ValueObject/Lut'
import { $PhotoColorPalette } from '../../modules/Photo/Domain/ValueObject/PhotoColorPalette'
import { $Oklch, $Srgb } from '@practice/color'

const props = defineProps<{
  lut?: Lut
}>()

const canvas = ref<HTMLCanvasElement>()

// Create palette once
const palette = $PhotoColorPalette.create()
const { columns, rows } = $PhotoColorPalette.dimensions(palette)

// Pre-calculate RGB values for each palette color
const paletteRgb = computed(() => {
  return palette.colors.map(color => $Oklch.toSrgb(color.oklch))
})

type ColorTransform = (r: number, g: number, b: number) => [number, number, number]

function createLutTransform(lut: Lut): ColorTransform {
  if ($Lut3D.is(lut)) {
    // 3D LUT expects and returns 0-1 values
    return (r: number, g: number, b: number): [number, number, number] => {
      return $Lut3D.lookup(lut, r, g, b)
    }
  } else {
    // 1D LUT uses 0-255 indices, values are already 0-1
    return (r: number, g: number, b: number): [number, number, number] => {
      const ri = Math.round(r * 255)
      const gi = Math.round(g * 255)
      const bi = Math.round(b * 255)
      // LUT values are already 0-1
      return [lut.r[ri]!, lut.g[gi]!, lut.b[bi]!]
    }
  }
}

function render() {
  if (!canvas.value) return

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  const width = canvas.value.width
  const height = canvas.value.height
  const cellWidth = width / columns
  const cellHeight = height / rows

  const transform = props.lut ? createLutTransform(props.lut) : undefined

  for (let i = 0; i < palette.colors.length; i++) {
    const color = palette.colors[i]!
    const rgb = paletteRgb.value[i]!  // Already 0-1

    const hueIndex = palette.hues.indexOf(color.hue)
    const shadeIndex = palette.shades.indexOf(color.shade)

    let finalRgb = rgb

    if (transform) {
      // LUT expects 0-1 input, returns 0-1
      const [rt, gt, bt] = transform(rgb.r, rgb.g, rgb.b)
      finalRgb = $Srgb.create(rt, gt, bt)
    }

    // Use the helper to convert to CSS
    ctx.fillStyle = $Srgb.toCssRgb(finalRgb)
    ctx.fillRect(
      hueIndex * cellWidth,
      shadeIndex * cellHeight,
      cellWidth + 1, // +1 to avoid gaps
      cellHeight + 1
    )
  }
}

watch(() => props.lut, render)

onMounted(() => {
  render()
})
</script>

<template>
  <canvas
    ref="canvas"
    :width="320"
    :height="160"
    class="w-full h-full"
  />
</template>
