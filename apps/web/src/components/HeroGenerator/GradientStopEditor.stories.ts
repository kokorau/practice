/**
 * GradientStopEditor Stories
 *
 * グラデーションのColorStop編集UIのStorybook
 * ドラッグ操作、カラー選択、ストップ追加/削除の動作を確認可能
 */

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import GradientStopEditor, { type GradientStop } from './GradientStopEditor.vue'
import { createPrimitivePalette } from '@practice/semantic-color-palette/Infra'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import { hsvToOklch } from '../SiteBuilder/utils/colorConversion'

// ============================================================
// Helper: Default Palette
// ============================================================

const DEFAULT_PALETTE: PrimitivePalette = createPrimitivePalette({
  brand: hsvToOklch({ h: 220, s: 70, v: 60 }),
  accent: hsvToOklch({ h: 30, s: 80, v: 90 }),
  foundation: hsvToOklch({ h: 220, s: 10, v: 95 }),
})

// ============================================================
// Helper: Default Gradient Stops
// ============================================================

const createDefaultStops = (): GradientStop[] => [
  { id: 'stop-1', color: 'B', position: 0 },
  { id: 'stop-2', color: 'A', position: 1 },
]

const createMultiStops = (): GradientStop[] => [
  { id: 'stop-1', color: 'B', position: 0 },
  { id: 'stop-2', color: 'BN5', position: 0.33 },
  { id: 'stop-3', color: 'A', position: 0.66 },
  { id: 'stop-4', color: 'AN5', position: 1 },
]

const createCustomColorStops = (): GradientStop[] => [
  { id: 'stop-1', color: { type: 'custom', hue: 0, saturation: 80, value: 70 }, position: 0 },
  { id: 'stop-2', color: { type: 'custom', hue: 60, saturation: 80, value: 90 }, position: 0.5 },
  { id: 'stop-3', color: { type: 'custom', hue: 120, saturation: 60, value: 70 }, position: 1 },
]

// ============================================================
// Storybook Meta
// ============================================================

const meta: Meta<typeof GradientStopEditor> = {
  title: 'Components/HeroGenerator/GradientStopEditor',
  component: GradientStopEditor,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f5f5f5' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
  },
  decorators: [
    () => ({
      template: '<div style="width: 320px; max-width: 100%; padding: 16px;"><story /></div>',
    }),
  ],
}

export default meta
type Story = StoryObj<typeof GradientStopEditor>

// ============================================================
// Default - Two Stops (Brand to Accent)
// ============================================================

export const Default: Story = {
  render: () => ({
    components: { GradientStopEditor },
    setup() {
      const stops = ref<GradientStop[]>(createDefaultStops())
      const palette = DEFAULT_PALETTE

      const handleUpdate = (newStops: GradientStop[]) => {
        stops.value = newStops
        console.log('Stops updated:', newStops)
      }

      return { stops, palette, handleUpdate }
    },
    template: `
      <GradientStopEditor
        :model-value="stops"
        :palette="palette"
        @update:model-value="handleUpdate"
      />
    `,
  }),
}

// ============================================================
// Multiple Stops
// ============================================================

export const MultipleStops: Story = {
  render: () => ({
    components: { GradientStopEditor },
    setup() {
      const stops = ref<GradientStop[]>(createMultiStops())
      const palette = DEFAULT_PALETTE

      return { stops, palette }
    },
    template: `
      <GradientStopEditor
        v-model="stops"
        :palette="palette"
      />
    `,
  }),
}

// ============================================================
// Custom Colors
// ============================================================

export const CustomColors: Story = {
  render: () => ({
    components: { GradientStopEditor },
    setup() {
      const stops = ref<GradientStop[]>(createCustomColorStops())
      const palette = DEFAULT_PALETTE

      return { stops, palette }
    },
    template: `
      <GradientStopEditor
        v-model="stops"
        :palette="palette"
      />
    `,
  }),
}

// ============================================================
// Rainbow Gradient
// ============================================================

export const RainbowGradient: Story = {
  render: () => ({
    components: { GradientStopEditor },
    setup() {
      const stops = ref<GradientStop[]>([
        { id: 'r1', color: { type: 'custom', hue: 0, saturation: 80, value: 80 }, position: 0 },
        { id: 'r2', color: { type: 'custom', hue: 60, saturation: 80, value: 90 }, position: 0.2 },
        { id: 'r3', color: { type: 'custom', hue: 120, saturation: 70, value: 80 }, position: 0.4 },
        { id: 'r4', color: { type: 'custom', hue: 180, saturation: 70, value: 80 }, position: 0.6 },
        { id: 'r5', color: { type: 'custom', hue: 240, saturation: 70, value: 80 }, position: 0.8 },
        { id: 'r6', color: { type: 'custom', hue: 300, saturation: 70, value: 80 }, position: 1 },
      ])
      const palette = DEFAULT_PALETTE

      return { stops, palette }
    },
    template: `
      <GradientStopEditor
        v-model="stops"
        :palette="palette"
      />
    `,
  }),
}

// ============================================================
// Monochrome (Neutral Ramp)
// ============================================================

export const Monochrome: Story = {
  render: () => ({
    components: { GradientStopEditor },
    setup() {
      const stops = ref<GradientStop[]>([
        { id: 'm1', color: 'BN1', position: 0 },
        { id: 'm2', color: 'BN3', position: 0.25 },
        { id: 'm3', color: 'BN5', position: 0.5 },
        { id: 'm4', color: 'BN7', position: 0.75 },
        { id: 'm5', color: 'BN9', position: 1 },
      ])
      const palette = DEFAULT_PALETTE

      return { stops, palette }
    },
    template: `
      <GradientStopEditor
        v-model="stops"
        :palette="palette"
      />
    `,
  }),
}

// ============================================================
// Wide Container
// ============================================================

export const WideContainer: Story = {
  render: () => ({
    components: { GradientStopEditor },
    setup() {
      const stops = ref<GradientStop[]>(createDefaultStops())
      const palette = DEFAULT_PALETTE

      return { stops, palette }
    },
    template: `
      <GradientStopEditor
        v-model="stops"
        :palette="palette"
      />
    `,
  }),
  decorators: [
    () => ({
      template: '<div style="width: 600px; max-width: 100%; padding: 16px;"><story /></div>',
    }),
  ],
}

// ============================================================
// Dark Mode
// ============================================================

export const DarkMode: Story = {
  render: () => ({
    components: { GradientStopEditor },
    setup() {
      const stops = ref<GradientStop[]>(createMultiStops())
      const palette = DEFAULT_PALETTE

      return { stops, palette }
    },
    template: `
      <GradientStopEditor
        v-model="stops"
        :palette="palette"
      />
    `,
  }),
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    () => ({
      template: '<div class="dark" style="width: 320px; max-width: 100%; padding: 16px;"><story /></div>',
    }),
  ],
}

// ============================================================
// Interactive Demo (with state display)
// ============================================================

export const InteractiveDemo: Story = {
  render: () => ({
    components: { GradientStopEditor },
    setup() {
      const stops = ref<GradientStop[]>(createDefaultStops())
      const palette = DEFAULT_PALETTE

      return { stops, palette }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <GradientStopEditor
          v-model="stops"
          :palette="palette"
        />
        <div style="padding: 12px; background: #f0f0f0; border-radius: 8px; font-family: monospace; font-size: 11px;">
          <div style="font-weight: 600; margin-bottom: 8px; color: #666;">Current State:</div>
          <pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">{{ JSON.stringify(stops, null, 2) }}</pre>
        </div>
      </div>
    `,
  }),
  decorators: [
    () => ({
      template: '<div style="width: 400px; max-width: 100%; padding: 16px;"><story /></div>',
    }),
  ],
}
