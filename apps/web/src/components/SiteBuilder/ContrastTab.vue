<script setup lang="ts">
import { $Oklch, $APCA } from '@practice/color'
import {
  type PrimitivePalette,
  type PrimitiveKey,
  BRAND_KEYS,
  ACCENT_KEYS,
  FOUNDATION_DERIVED_KEYS,
  NEUTRAL_KEYS,
  ACCENT_RAMP_KEYS,
  FOUNDATION_KEYS,
} from '@practice/semantic-color-palette/Domain'
import ColorSwatchTooltip from './ColorSwatchTooltip.vue'

const props = defineProps<{
  primitivePalette: PrimitivePalette
}>()

// Brand rows: B, Bt, Bs, Bf with BN0-BN9
const brandRows = BRAND_KEYS
const neutralRamp = NEUTRAL_KEYS

// Accent rows: A, At, As, Af with AN0-AN9
const accentRows = ACCENT_KEYS
const accentRamp = ACCENT_RAMP_KEYS

// Foundation rows: F, Ft, Fs, Ff with F0-F9
const foundationRows = FOUNDATION_DERIVED_KEYS
const foundationRamp = FOUNDATION_KEYS

// Calculate APCA Lc value
const getLc = (bgKey: PrimitiveKey, textKey: PrimitiveKey): number => {
  const bg = props.primitivePalette[bgKey]
  const text = props.primitivePalette[textKey]
  return $APCA.fromOklch(text, bg).Lc
}

// Format Lc value (absolute value)
const formatLc = (lc: number): string => {
  return Math.abs(lc).toFixed(1)
}

// Get Lc color class based on threshold
const getLcColorClass = (lc: number): string => {
  const absLc = Math.abs(lc)
  if (absLc >= 75) return 'lc-good'
  if (absLc >= 45) return 'lc-medium'
  return 'lc-poor'
}
</script>

<template>
  <div class="contrast-tab">
    <!-- Brand Section -->
    <section class="section">
      <div
        v-for="derivedKey in brandRows"
        :key="derivedKey"
        class="contrast-grid"
      >
        <!-- Row 1: Swatches -->
        <div class="cell cell-label">
          <ColorSwatchTooltip
            :color="primitivePalette[derivedKey]"
            :label="derivedKey"
            size="small"
          />
        </div>
        <template v-for="rampKey in neutralRamp" :key="`swatch-${rampKey}`">
          <div class="cell cell-swatch">
            <ColorSwatchTooltip
              :color="primitivePalette[rampKey]"
              :label="rampKey"
              size="small"
            />
          </div>
        </template>

        <!-- Row 2: Preview -->
        <div class="cell cell-label">
          <span class="row-label">{{ derivedKey }}</span>
        </div>
        <template v-for="rampKey in neutralRamp" :key="`preview-${rampKey}`">
          <div
            class="cell cell-preview"
            :style="{ backgroundColor: $Oklch.toCss(primitivePalette[derivedKey]) }"
          >
            <span
              class="preview-text"
              :style="{ color: $Oklch.toCss(primitivePalette[rampKey]) }"
            >Text</span>
          </div>
        </template>

        <!-- Row 3: Lc values -->
        <div class="cell cell-label">
          <span class="row-label">Lc</span>
        </div>
        <template v-for="rampKey in neutralRamp" :key="`lc-${rampKey}`">
          <div class="cell cell-lc">
            <span class="lc-value" :class="getLcColorClass(getLc(derivedKey, rampKey))">{{ formatLc(getLc(derivedKey, rampKey)) }}</span>
          </div>
        </template>
      </div>
    </section>

    <!-- Accent Section -->
    <section class="section">
      <div
        v-for="derivedKey in accentRows"
        :key="derivedKey"
        class="contrast-grid"
      >
        <!-- Row 1: Swatches -->
        <div class="cell cell-label">
          <ColorSwatchTooltip
            :color="primitivePalette[derivedKey]"
            :label="derivedKey"
            size="small"
          />
        </div>
        <template v-for="rampKey in accentRamp" :key="`swatch-${rampKey}`">
          <div class="cell cell-swatch">
            <ColorSwatchTooltip
              :color="primitivePalette[rampKey]"
              :label="rampKey"
              size="small"
            />
          </div>
        </template>

        <!-- Row 2: Preview -->
        <div class="cell cell-label">
          <span class="row-label">{{ derivedKey }}</span>
        </div>
        <template v-for="rampKey in accentRamp" :key="`preview-${rampKey}`">
          <div
            class="cell cell-preview"
            :style="{ backgroundColor: $Oklch.toCss(primitivePalette[derivedKey]) }"
          >
            <span
              class="preview-text"
              :style="{ color: $Oklch.toCss(primitivePalette[rampKey]) }"
            >Text</span>
          </div>
        </template>

        <!-- Row 3: Lc values -->
        <div class="cell cell-label">
          <span class="row-label">Lc</span>
        </div>
        <template v-for="rampKey in accentRamp" :key="`lc-${rampKey}`">
          <div class="cell cell-lc">
            <span class="lc-value" :class="getLcColorClass(getLc(derivedKey, rampKey))">{{ formatLc(getLc(derivedKey, rampKey)) }}</span>
          </div>
        </template>
      </div>
    </section>

    <!-- Foundation Section -->
    <section class="section">
      <div
        v-for="derivedKey in foundationRows"
        :key="derivedKey"
        class="contrast-grid"
      >
        <!-- Row 1: Swatches -->
        <div class="cell cell-label">
          <ColorSwatchTooltip
            :color="primitivePalette[derivedKey]"
            :label="derivedKey"
            size="small"
          />
        </div>
        <template v-for="rampKey in foundationRamp" :key="`swatch-${rampKey}`">
          <div class="cell cell-swatch">
            <ColorSwatchTooltip
              :color="primitivePalette[rampKey]"
              :label="rampKey"
              size="small"
            />
          </div>
        </template>

        <!-- Row 2: Preview -->
        <div class="cell cell-label">
          <span class="row-label">{{ derivedKey }}</span>
        </div>
        <template v-for="rampKey in foundationRamp" :key="`preview-${rampKey}`">
          <div
            class="cell cell-preview"
            :style="{ backgroundColor: $Oklch.toCss(primitivePalette[derivedKey]) }"
          >
            <span
              class="preview-text"
              :style="{ color: $Oklch.toCss(primitivePalette[rampKey]) }"
            >Text</span>
          </div>
        </template>

        <!-- Row 3: Lc values -->
        <div class="cell cell-label">
          <span class="row-label">Lc</span>
        </div>
        <template v-for="rampKey in foundationRamp" :key="`lc-${rampKey}`">
          <div class="cell cell-lc">
            <span class="lc-value" :class="getLcColorClass(getLc(derivedKey, rampKey))">{{ formatLc(getLc(derivedKey, rampKey)) }}</span>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.contrast-tab {
  max-width: 1400px;
  margin: 0 auto;
}

.section {
  margin-bottom: 2rem;
}

.contrast-grid {
  display: grid;
  grid-template-columns: 48px repeat(10, 48px);
  grid-template-rows: auto auto auto;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cell-label {
  justify-content: center;
}

.row-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .row-label {
  color: oklch(0.60 0.02 260);
}

.cell-swatch {
  justify-content: center;
}

.cell-preview {
  aspect-ratio: 16 / 9;
  border-radius: 8px;
}

.preview-text {
  font-size: 0.875rem;
  font-weight: 600;
}

.cell-lc {
  justify-content: center;
}

.lc-value {
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .lc-value {
  color: oklch(0.60 0.02 260);
}

/* Lc color classes */
/* 75+: Body text OK - green */
.lc-good {
  color: oklch(0.50 0.12 155);
}

:global(.dark) .lc-good {
  color: oklch(0.65 0.14 155);
}

/* 45-75: Title OK - blue/cyan */
.lc-medium {
  color: oklch(0.50 0.10 230);
}

:global(.dark) .lc-medium {
  color: oklch(0.65 0.12 230);
}

/* <45: Insufficient - muted red */
.lc-poor {
  color: oklch(0.50 0.12 25);
}

:global(.dark) .lc-poor {
  color: oklch(0.60 0.14 25);
}
</style>
