<script setup lang="ts">
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import {
  type PrimitivePalette,
  NEUTRAL_KEYS,
  FOUNDATION_KEYS,
  BRAND_KEYS,
} from '../../modules/SemanticColorPalette/Domain'

defineProps<{
  brandColor: {
    hex: string
    oklch: Oklch
    cssOklch: string
    cssP3: string
  }
  foundationColor: {
    hex: string
    css: string
    label: string
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
                <span class="color-label">Preset</span>
                <code class="color-value">{{ foundationColor.label }}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-heading">Neutral Ramp (Brand-derived)</h2>
      <p class="section-description">
        Brand hue with minimal chroma ({{ primitivePalette.N0.C.toFixed(4) }}) for ink colors
      </p>
      <div class="neutral-ramp">
        <div
          v-for="step in neutralRampDisplay"
          :key="step.key"
          class="neutral-step"
        >
          <div
            class="neutral-swatch"
            :style="{ backgroundColor: step.css }"
          />
          <div class="neutral-info">
            <span class="neutral-index">{{ step.key }}</span>
            <span class="neutral-l">L: {{ (step.color.L * 100).toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-heading">Foundation Ramp (Foundation-derived)</h2>
      <p class="section-description">
        Foundation hue with minimal chroma ({{ primitivePalette.F0.C.toFixed(4) }}) for surface colors
      </p>
      <div class="neutral-ramp">
        <div
          v-for="step in foundationRampDisplay"
          :key="step.key"
          class="neutral-step"
        >
          <div
            class="neutral-swatch"
            :style="{ backgroundColor: step.css }"
          />
          <div class="neutral-info">
            <span class="neutral-index">{{ step.key }}</span>
            <span class="neutral-l">L: {{ (step.color.L * 100).toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h2 class="section-heading">Primitive Palette</h2>
        <span class="theme-badge" :class="primitivePalette.theme">
          {{ primitivePalette.theme }}
        </span>
      </div>

      <!-- Neutral (N0-N9) -->
      <div class="primitive-group">
        <h3 class="primitive-group-label">Neutral (Brand-derived)</h3>
        <div class="primitive-palette-grid">
          <div
            v-for="key in NEUTRAL_KEYS"
            :key="key"
            class="primitive-item"
          >
            <div
              class="primitive-swatch"
              :style="{ backgroundColor: $Oklch.toCss(primitivePalette[key]) }"
            />
            <span class="primitive-key">{{ key }}</span>
          </div>
        </div>
      </div>

      <!-- Foundation (F0-F9) -->
      <div class="primitive-group">
        <h3 class="primitive-group-label">Foundation (Foundation-derived)</h3>
        <div class="primitive-palette-grid">
          <div
            v-for="key in FOUNDATION_KEYS"
            :key="key"
            class="primitive-item"
          >
            <div
              class="primitive-swatch"
              :style="{ backgroundColor: $Oklch.toCss(primitivePalette[key]) }"
            />
            <span class="primitive-key">{{ key }}</span>
          </div>
        </div>
      </div>

      <!-- Brand (B, Bt, Bs, Bf) -->
      <div class="primitive-group">
        <h3 class="primitive-group-label">Brand (B + derivatives)</h3>
        <div class="primitive-palette-grid">
          <div
            v-for="key in BRAND_KEYS"
            :key="key"
            class="primitive-item"
          >
            <div
              class="primitive-swatch"
              :style="{ backgroundColor: $Oklch.toCss(primitivePalette[key]) }"
            />
            <span class="primitive-key">{{ key }}</span>
          </div>
        </div>
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
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
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
  font-size: 0.85rem;
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 500;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .color-value {
  color: oklch(0.90 0.01 260);
}

/* Neutral Ramp */
.neutral-ramp {
  display: flex;
  gap: 0.5rem;
}

.neutral-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.neutral-swatch {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(128, 128, 128, 0.15);
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

.neutral-l {
  font-size: 0.65rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .neutral-l {
  color: oklch(0.60 0.02 260);
}

/* Theme Badge */
.theme-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.theme-badge.light {
  background: oklch(0.96 0.02 80);
  color: oklch(0.45 0.08 80);
  border: 1px solid oklch(0.88 0.04 80);
}

.theme-badge.dark {
  background: oklch(0.25 0.02 260);
  color: oklch(0.75 0.02 260);
  border: 1px solid oklch(0.35 0.02 260);
}

/* Primitive Palette Grid */
.primitive-group {
  margin-bottom: 1.5rem;
}

.primitive-group:last-child {
  margin-bottom: 0;
}

.primitive-group-label {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .primitive-group-label {
  color: oklch(0.60 0.02 260);
}

.primitive-palette-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.primitive-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
}

.primitive-swatch {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(128, 128, 128, 0.15);
}

.primitive-key {
  font-size: 0.7rem;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.40 0.02 260);
}

:global(.dark) .primitive-key {
  color: oklch(0.70 0.02 260);
}
</style>
