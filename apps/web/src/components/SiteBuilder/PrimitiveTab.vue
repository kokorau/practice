<script setup lang="ts">
import type { Oklch } from '@practice/color'
import {
  type PrimitivePalette,
  BRAND_KEYS,
  ACCENT_KEYS,
} from '../../modules/SemanticColorPalette/Domain'
import ColorSwatchTooltip from './ColorSwatchTooltip.vue'

defineProps<{
  brandColor: {
    hex: string
    oklch: Oklch
    cssOklch: string
    cssP3: string
  }
  accentColor?: {
    hex: string
    oklch: Oklch
    cssOklch: string
    cssP3: string
  }
  foundationColor: {
    hex: string
    css: string
    cssP3: string
  }
  primitivePalette: PrimitivePalette
  neutralRampDisplay: Array<{
    key: string
    color: Oklch
    css: string
  }>
  foundationRampDisplay: Array<{
    key: string
    color: Oklch
    css: string
  }>
  accentRampDisplay?: Array<{
    key: string
    color: Oklch
    css: string
  }>
}>()
</script>

<template>
  <div class="primitive-tab">
    <section class="section">
      <div class="color-pair-grid">
        <!-- Brand Color -->
        <div class="color-card">
          <h2 class="section-heading">Brand Color</h2>
          <div class="color-display">
            <div
              class="color-large"
              :style="{ backgroundColor: brandColor.hex }"
            />
            <div class="color-info">
              <div class="color-row">
                <span class="color-label">HEX</span>
                <code class="color-value">{{ brandColor.hex }}</code>
              </div>
              <div class="color-row">
                <span class="color-label">OKLCH</span>
                <code class="color-value">{{ brandColor.cssOklch }}</code>
              </div>
              <div class="color-row">
                <span class="color-label">Display-P3</span>
                <code class="color-value">{{ brandColor.cssP3 }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Accent Color -->
        <div v-if="accentColor" class="color-card">
          <h2 class="section-heading">Accent Color</h2>
          <div class="color-display">
            <div
              class="color-large"
              :style="{ backgroundColor: accentColor.hex }"
            />
            <div class="color-info">
              <div class="color-row">
                <span class="color-label">HEX</span>
                <code class="color-value">{{ accentColor.hex }}</code>
              </div>
              <div class="color-row">
                <span class="color-label">OKLCH</span>
                <code class="color-value">{{ accentColor.cssOklch }}</code>
              </div>
              <div class="color-row">
                <span class="color-label">Display-P3</span>
                <code class="color-value">{{ accentColor.cssP3 }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Foundation Color -->
        <div class="color-card">
          <h2 class="section-heading">Foundation Color</h2>
          <div class="color-display">
            <div
              class="color-large"
              :style="{ backgroundColor: foundationColor.hex }"
            />
            <div class="color-info">
              <div class="color-row">
                <span class="color-label">HEX</span>
                <code class="color-value">{{ foundationColor.hex }}</code>
              </div>
              <div class="color-row">
                <span class="color-label">OKLCH</span>
                <code class="color-value">{{ foundationColor.css }}</code>
              </div>
              <div class="color-row">
                <span class="color-label">Display-P3</span>
                <code class="color-value">{{ foundationColor.cssP3 }}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Neutral Ramp + Brand -->
    <section class="section">
      <h2 class="section-heading">Neutral Ramp + Brand</h2>
      <p class="section-description">
        Brand hue with minimal chroma ({{ primitivePalette.BN0.C.toFixed(4) }}) for ink colors
      </p>
      <div class="ramp-with-derivatives">
        <div class="ramp-group">
          <div
            v-for="step in neutralRampDisplay"
            :key="step.key"
            class="neutral-step"
          >
            <ColorSwatchTooltip
              :color="step.color"
              :label="step.key"
              size="medium"
            />
            <div class="neutral-info">
              <span class="neutral-index">{{ step.key }}</span>
            </div>
          </div>
        </div>
        <div class="derivative-group">
          <div
            v-for="key in BRAND_KEYS"
            :key="key"
            class="derivative-item"
          >
            <ColorSwatchTooltip
              :color="primitivePalette[key]"
              :label="key"
              size="medium"
            />
            <span class="derivative-key">{{ key }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Accent Ramp + Accent -->
    <section v-if="accentRampDisplay" class="section">
      <h2 class="section-heading">Accent Ramp + Accent</h2>
      <p class="section-description">
        Accent hue with subtle chroma ({{ primitivePalette.AN0.C.toFixed(4) }}) for accent surfaces
      </p>
      <div class="ramp-with-derivatives">
        <div class="ramp-group">
          <div
            v-for="step in accentRampDisplay"
            :key="step.key"
            class="neutral-step"
          >
            <ColorSwatchTooltip
              :color="step.color"
              :label="step.key"
              size="medium"
            />
            <div class="neutral-info">
              <span class="neutral-index">{{ step.key }}</span>
            </div>
          </div>
        </div>
        <div class="derivative-group">
          <div
            v-for="key in ACCENT_KEYS"
            :key="key"
            class="derivative-item"
          >
            <ColorSwatchTooltip
              :color="primitivePalette[key]"
              :label="key"
              size="medium"
            />
            <span class="derivative-key">{{ key }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Foundation Ramp -->
    <section class="section">
      <h2 class="section-heading">Foundation Ramp</h2>
      <p class="section-description">
        Foundation hue with minimal chroma ({{ primitivePalette.F0.C.toFixed(4) }}) for surface colors
      </p>
      <div class="ramp-with-derivatives">
        <div class="ramp-group">
          <div
            v-for="step in foundationRampDisplay"
            :key="step.key"
            class="neutral-step"
          >
            <ColorSwatchTooltip
              :color="step.color"
              :label="step.key"
              size="medium"
            />
            <div class="neutral-info">
              <span class="neutral-index">{{ step.key }}</span>
            </div>
          </div>
        </div>
        <div class="derivative-group derivative-placeholder" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.section {
  max-width: 1400px;
  margin: 0 auto 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.section-header .section-heading {
  margin-bottom: 0;
}

.section-heading {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem;
  color: oklch(0.35 0.02 260);
}

:global(.dark) .section-heading {
  color: oklch(0.75 0.02 260);
}

.section-description {
  margin: 0 0 1rem;
  font-size: 0.8rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .section-description {
  color: oklch(0.60 0.02 260);
}

/* Color Pair Grid */
.color-pair-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.color-card {
  background: oklch(0.99 0.005 260);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

:global(.dark) .color-card {
  background: oklch(0.16 0.02 260);
}

.color-card .section-heading {
  margin-top: 0;
  margin-bottom: 1rem;
}

.color-display {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.color-large {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(128, 128, 128, 0.15);
  flex-shrink: 0;
}

.color-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.25rem;
}

.color-row {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.color-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .color-label {
  color: oklch(0.60 0.02 260);
}

.color-value {
  font-size: 0.7rem;
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 500;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .color-value {
  color: oklch(0.90 0.01 260);
}

/* Ramp with Derivatives Layout */
.ramp-with-derivatives {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.derivative-group {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.derivative-placeholder {
  visibility: hidden;
}

.derivative-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}


.derivative-key {
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(0.35 0.02 260);
}

:global(.dark) .derivative-key {
  color: oklch(0.75 0.02 260);
}

.ramp-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.neutral-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}


.neutral-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.neutral-index {
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(0.35 0.02 260);
}

:global(.dark) .neutral-index {
  color: oklch(0.75 0.02 260);
}

</style>
