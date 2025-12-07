<script setup lang="ts">
import { computed } from 'vue'
import type { Oklch } from '../../modules/Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../../modules/Color/Domain/ValueObject/Oklch'
import { $Srgb } from '../../modules/Color/Domain/ValueObject/Srgb'
import {
  $AccentCandidate,
  type AccentCandidate,
  type AccentScore,
} from '../../modules/SiteSimulator/Domain/ValueObject'

const props = defineProps<{
  brandColor: Oklch
  selectedAccent: Oklch | null
  topCount?: number
}>()

const emit = defineEmits<{
  select: [accent: Oklch]
}>()

// Generate all candidates
const candidates = computed(() => $AccentCandidate.generateDefault())

// Score candidates by brand color
const scoredCandidates = computed(() =>
  $AccentCandidate.scoreByBrandColor(
    candidates.value,
    props.brandColor,
    props.topCount ?? 10
  )
)

// Group by category for display
const chromaticScores = computed(() =>
  scoredCandidates.value.filter((s) => s.candidate.category === 'chromatic')
)

const neutralScores = computed(() =>
  scoredCandidates.value
    .filter((s) => s.candidate.category === 'neutral')
    .sort((a, b) => a.candidate.oklch.L - b.candidate.oklch.L)
)

// Helper to convert OKLCH to CSS color
const toCssColor = (oklch: Oklch): string => {
  const srgb = $Oklch.toSrgb(oklch)
  return $Srgb.toHex(srgb)
}

// Check if this candidate is currently selected
const isSelected = (candidate: AccentCandidate): boolean => {
  if (!props.selectedAccent) return false
  const c = candidate.oklch
  const s = props.selectedAccent
  return (
    Math.abs(c.L - s.L) < 0.01 &&
    Math.abs(c.C - s.C) < 0.01 &&
    Math.abs(c.H - s.H) < 1
  )
}

// Handle click on candidate
const handleSelect = (candidate: AccentCandidate) => {
  emit('select', candidate.oklch)
}

// Organize chromatic candidates into a grid (hue x lightness)
const chromaticGrid = computed(() => {
  const options = $AccentCandidate.defaultOptions()
  const grid: AccentScore[][] = []

  // Build grid: rows = lightness steps, cols = hues
  for (let li = 0; li < options.chromatic.lSteps; li++) {
    const row: AccentScore[] = []
    for (let hi = 0; hi < options.chromatic.hueCount; hi++) {
      const id = `chromatic-${hi}-${li}`
      const score = scoredCandidates.value.find((s) => s.candidate.id === id)
      if (score) row.push(score)
    }
    grid.push(row)
  }

  return grid
})
</script>

<template>
  <div class="accent-selector">
    <!-- Chromatic Colors Grid -->
    <div class="mb-4">
      <h4 class="text-sm text-gray-400 mb-2">Chromatic ({{ chromaticScores.length }} colors)</h4>
      <div class="chromatic-grid">
        <div
          v-for="(row, rowIndex) in chromaticGrid"
          :key="rowIndex"
          class="flex gap-1 mb-1"
        >
          <button
            v-for="score in row"
            :key="score.candidate.id"
            class="color-chip"
            :class="{
              'ring-2 ring-white': isSelected(score.candidate),
              'opacity-30': !score.recommended,
            }"
            :style="{ backgroundColor: toCssColor(score.candidate.oklch) }"
            :title="`${score.candidate.name} (score: ${score.score.toFixed(2)})`"
            @click="handleSelect(score.candidate)"
          />
        </div>
      </div>
    </div>

    <!-- Neutral Colors Row -->
    <div>
      <h4 class="text-sm text-gray-400 mb-2">Neutral ({{ neutralScores.length }} colors)</h4>
      <div class="flex gap-1">
        <button
          v-for="score in neutralScores"
          :key="score.candidate.id"
          class="color-chip"
          :class="{
            'ring-2 ring-white': isSelected(score.candidate),
            'opacity-30': !score.recommended,
          }"
          :style="{ backgroundColor: toCssColor(score.candidate.oklch) }"
          :title="`${score.candidate.name} (score: ${score.score.toFixed(2)})`"
          @click="handleSelect(score.candidate)"
        />
      </div>
    </div>

    <!-- Legend -->
    <div class="mt-4 text-xs text-gray-500">
      <span class="inline-block w-3 h-3 bg-blue-500 rounded mr-1"></span>
      濃い = おすすめ
      <span class="inline-block w-3 h-3 bg-blue-500 opacity-30 rounded ml-3 mr-1"></span>
      薄い = 相性低め
    </div>
  </div>
</template>

<style scoped>
.color-chip {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}

.color-chip:hover {
  transform: scale(1.15);
  z-index: 1;
}

.chromatic-grid {
  display: flex;
  flex-direction: column;
}
</style>
