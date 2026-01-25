/**
 * LayoutPresetSelector Stories
 *
 * Layout Preset一覧表示のStorybook
 * WebGPUのシングルトンGPUDeviceManagerを使用してレンダリング
 */

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LayoutPresetSelector from './LayoutPresetSelector.vue'
import { TIMELINE_PRESETS } from '../../modules/Timeline/Infra/timelinePresets'

// ============================================================
// Storybook Meta
// ============================================================

const meta: Meta<typeof LayoutPresetSelector> = {
  title: 'Components/HeroGenerator/LayoutPresetSelector',
  component: LayoutPresetSelector,
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
      template: '<div style="width: 400px; max-width: 100%;"><story /></div>',
    }),
  ],
  argTypes: {
    selectedPresetId: {
      control: 'select',
      options: [null, ...TIMELINE_PRESETS.map(p => p.id)],
    },
  },
}

export default meta
type Story = StoryObj<typeof LayoutPresetSelector>

// ============================================================
// Default Story - All Timeline Presets
// ============================================================

export const Default: Story = {
  args: {
    presets: TIMELINE_PRESETS,
    selectedPresetId: null,
  },
}

// ============================================================
// With Selection
// ============================================================

export const WithSelection: Story = {
  args: {
    presets: TIMELINE_PRESETS,
    selectedPresetId: TIMELINE_PRESETS[0]?.id ?? null,
  },
}

// ============================================================
// Single Preset
// ============================================================

export const SinglePreset: Story = {
  args: {
    presets: TIMELINE_PRESETS.slice(0, 1),
    selectedPresetId: null,
  },
}

// ============================================================
// Wide Container (for grid layout testing)
// ============================================================

export const WideContainer: Story = {
  args: {
    presets: TIMELINE_PRESETS,
    selectedPresetId: null,
  },
  decorators: [
    () => ({
      template: '<div style="width: 800px; max-width: 100%;"><story /></div>',
    }),
  ],
}

// ============================================================
// All Presets Grid (full width view)
// ============================================================

export const AllPresetsGrid: Story = {
  render: () => ({
    components: { LayoutPresetSelector },
    setup() {
      const presets = TIMELINE_PRESETS
      return { presets }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px;">
        <div v-for="preset in presets" :key="preset.id" style="display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 14px; font-weight: 600; color: #333;">{{ preset.name }}</div>
          <div style="font-size: 12px; color: #666;">{{ preset.description }}</div>
          <LayoutPresetSelector
            :presets="[preset]"
            :selected-preset-id="null"
          />
        </div>
      </div>
    `,
  }),
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    () => ({
      template: '<div style="padding: 24px;"><story /></div>',
    }),
  ],
}

// ============================================================
// Dark Mode
// ============================================================

export const DarkMode: Story = {
  args: {
    presets: TIMELINE_PRESETS,
    selectedPresetId: TIMELINE_PRESETS[0]?.id ?? null,
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    () => ({
      template: '<div class="dark" style="width: 400px; max-width: 100%;"><story /></div>',
    }),
  ],
}
