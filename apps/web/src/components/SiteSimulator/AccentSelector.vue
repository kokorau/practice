<script setup lang="ts">
import { computed } from 'vue'
import type { Oklch } from '@practice/color'
import { $Oklch } from '@practice/color'
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

// Helper to convert OKLCH to CSS color (Display-P3)
const toCssColor = (oklch: Oklch): string => {
  return $Oklch.toCssP3(oklch)
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

// Organize chromatic candidates into a flat array (row by row: lightness x hue)
const chromaticFlat = computed(() => {
  const options = $AccentCandidate.defaultOptions()
  const flat: AccentScore[] = []

  // Build flat array: rows = lightness steps, cols = hues
  for (let li = 0; li < options.chromatic.lSteps; li++) {
    for (let hi = 0; hi < options.chromatic.hueCount; hi++) {
      const id = `chromatic-${hi}-${li}`
      const score = scoredCandidates.value.find((s) => s.candidate.id === id)
      if (score) flat.push(score)
    }
  }

  return flat
})
</script>

<template>
  <div class="accent-selector">
    <div class="color-grid">
      <!-- Chromatic Title -->
      <h4 class="grid-title">Chromatic ({{ chromaticScores.length }} colors)</h4>

      <!-- Chromatic Colors -->
      <button
        v-for="score in chromaticFlat"
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

      <!-- Neutral Title -->
      <h4 class="grid-title">Neutral ({{ neutralScores.length }} colors)</h4>

      <!-- Neutral Colors -->
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
.accent-selector {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 4px;
  max-width: 100%;
  min-width: 0;
}

.grid-title {
  grid-column: 1 / -1;
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0;
  padding: 0.5rem 0;
}

.grid-title:first-child {
  padding-top: 0;
}

.color-chip {
  width: 100%;
  min-width: 0;
  aspect-ratio: 1;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  padding: 0;
}

.color-chip:hover {
  transform: scale(1.15);
  z-index: 1;
}
</style>
