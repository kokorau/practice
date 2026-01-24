/**
 * HeroPreview Stories
 *
 * Layout Presetをベースにした描画検証用Storybook
 * thumbnail variantを使用して自己完結型WebGPU描画を行う
 */

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import HeroPreview from './HeroPreview.vue'
import {
  DEFAULT_PRESETS,
  getPresetConfig,
  isStaticPreset,
  migrateToNormalizedFormat,
  type HeroViewPreset,
  type PresetColorConfig,
} from '@practice/section-visual'
import { createPrimitivePalette } from '@practice/semantic-color-palette/Infra'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import { hsvToOklch } from '../../components/SiteBuilder/utils/colorConversion'

// ============================================================
// Helper: colorPreset (HSV) → PrimitivePalette (Oklch)
// ============================================================

const DEFAULT_COLOR_PRESET: PresetColorConfig = {
  brand: { hue: 220, saturation: 70, value: 60 },
  accent: { hue: 30, saturation: 80, value: 90 },
  foundation: { hue: 220, saturation: 10, value: 95 },
}

const createPaletteFromColorPreset = (colorPreset?: PresetColorConfig): PrimitivePalette => {
  const preset = colorPreset ?? DEFAULT_COLOR_PRESET
  return createPrimitivePalette({
    brand: hsvToOklch({ h: preset.brand.hue, s: preset.brand.saturation, v: preset.brand.value }),
    accent: hsvToOklch({ h: preset.accent.hue, s: preset.accent.saturation, v: preset.accent.value }),
    foundation: hsvToOklch({ h: preset.foundation.hue, s: preset.foundation.saturation, v: preset.foundation.value }),
  })
}

// ============================================================
// Helper: Preset → Story Args
// ============================================================

const createStoryArgsFromPreset = (preset: HeroViewPreset) => {
  const config = getPresetConfig(preset)
  if (!config) {
    console.warn(`Preset "${preset.id}" has no config`)
    return null
  }

  return {
    variant: 'thumbnail' as const,
    config: migrateToNormalizedFormat(config),
    palette: createPaletteFromColorPreset(preset.colorPreset),
  }
}

// ============================================================
// Storybook Meta
// ============================================================

const meta: Meta<typeof HeroPreview> = {
  title: 'Components/HeroGenerator/HeroPreview',
  component: HeroPreview,
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
      template: '<div style="width: 640px; max-width: 100%;"><story /></div>',
    }),
  ],
}

export default meta
type Story = StoryObj<typeof HeroPreview>

// ============================================================
// Filter: Static Presets Only (exclude animated presets)
// ============================================================

const staticPresets = DEFAULT_PRESETS.filter(isStaticPreset)

// ============================================================
// Design Presets (Production)
// ============================================================

const boldStatementPreset = staticPresets.find(p => p.id === 'bold-statement')
export const BoldStatement: Story = {
  args: boldStatementPreset ? createStoryArgsFromPreset(boldStatementPreset) ?? undefined : undefined,
}

const corporateCleanPreset = staticPresets.find(p => p.id === 'corporate-clean')
export const CorporateClean: Story = {
  args: corporateCleanPreset ? createStoryArgsFromPreset(corporateCleanPreset) ?? undefined : undefined,
}

const creativeStudioPreset = staticPresets.find(p => p.id === 'creative-studio')
export const CreativeStudio: Story = {
  args: creativeStudioPreset ? createStoryArgsFromPreset(creativeStudioPreset) ?? undefined : undefined,
}

const fashionEditorialPreset = staticPresets.find(p => p.id === 'fashion-editorial')
export const FashionEditorial: Story = {
  args: fashionEditorialPreset ? createStoryArgsFromPreset(fashionEditorialPreset) ?? undefined : undefined,
}

const minimalZenPreset = staticPresets.find(p => p.id === 'minimal-zen')
export const MinimalZen: Story = {
  args: minimalZenPreset ? createStoryArgsFromPreset(minimalZenPreset) ?? undefined : undefined,
}

const retroPopPreset = staticPresets.find(p => p.id === 'retro-pop')
export const RetroPop: Story = {
  args: retroPopPreset ? createStoryArgsFromPreset(retroPopPreset) ?? undefined : undefined,
}

const techStartupPreset = staticPresets.find(p => p.id === 'tech-startup')
export const TechStartup: Story = {
  args: techStartupPreset ? createStoryArgsFromPreset(techStartupPreset) ?? undefined : undefined,
}

// ============================================================
// Test Level Presets (Progressive Complexity)
// ============================================================

const testLevel1Preset = staticPresets.find(p => p.id === 'test-level1-bg-only')
export const TestLevel1BgOnly: Story = {
  args: testLevel1Preset ? createStoryArgsFromPreset(testLevel1Preset) ?? undefined : undefined,
}

const testLevel2Preset = staticPresets.find(p => p.id === 'test-level2-bg-surface')
export const TestLevel2BgSurface: Story = {
  args: testLevel2Preset ? createStoryArgsFromPreset(testLevel2Preset) ?? undefined : undefined,
}

const testLevel3Preset = staticPresets.find(p => p.id === 'test-level3-with-mask')
export const TestLevel3WithMask: Story = {
  args: testLevel3Preset ? createStoryArgsFromPreset(testLevel3Preset) ?? undefined : undefined,
}

const testLevel4Preset = staticPresets.find(p => p.id === 'test-level4-multi-mask')
export const TestLevel4MultiMask: Story = {
  args: testLevel4Preset ? createStoryArgsFromPreset(testLevel4Preset) ?? undefined : undefined,
}

const testLevel6Preset = staticPresets.find(p => p.id === 'test-level6-mask-with-effect')
export const TestLevel6MaskWithEffect: Story = {
  args: testLevel6Preset ? createStoryArgsFromPreset(testLevel6Preset) ?? undefined : undefined,
}

const testLevel7Preset = staticPresets.find(p => p.id === 'test-level7-multi-mask-with-effects')
export const TestLevel7MultiMaskWithEffects: Story = {
  args: testLevel7Preset ? createStoryArgsFromPreset(testLevel7Preset) ?? undefined : undefined,
}

const testLevel8Preset = staticPresets.find(p => p.id === 'test-level8-with-text')
export const TestLevel8WithText: Story = {
  args: testLevel8Preset ? createStoryArgsFromPreset(testLevel8Preset) ?? undefined : undefined,
}

// ============================================================
// Effect Test Presets
// ============================================================

const testEffectBlurPreset = staticPresets.find(p => p.id === 'test-effect-blur')
export const EffectBlur: Story = {
  args: testEffectBlurPreset ? createStoryArgsFromPreset(testEffectBlurPreset) ?? undefined : undefined,
}

const testEffectVignettePreset = staticPresets.find(p => p.id === 'test-effect-vignette')
export const EffectVignette: Story = {
  args: testEffectVignettePreset ? createStoryArgsFromPreset(testEffectVignettePreset) ?? undefined : undefined,
}

const testEffectChromaticPreset = staticPresets.find(p => p.id === 'test-effect-chromatic')
export const EffectChromatic: Story = {
  args: testEffectChromaticPreset ? createStoryArgsFromPreset(testEffectChromaticPreset) ?? undefined : undefined,
}

const testEffectDotHalftonePreset = staticPresets.find(p => p.id === 'test-effect-dot-halftone')
export const EffectDotHalftone: Story = {
  args: testEffectDotHalftonePreset ? createStoryArgsFromPreset(testEffectDotHalftonePreset) ?? undefined : undefined,
}

const testEffectLineHalftonePreset = staticPresets.find(p => p.id === 'test-effect-line-halftone')
export const EffectLineHalftone: Story = {
  args: testEffectLineHalftonePreset ? createStoryArgsFromPreset(testEffectLineHalftonePreset) ?? undefined : undefined,
}

const testEffectDotHalftoneAberrationPreset = staticPresets.find(p => p.id === 'test-effect-dot-halftone-aberration')
export const EffectDotHalftoneAberration: Story = {
  args: testEffectDotHalftoneAberrationPreset ? createStoryArgsFromPreset(testEffectDotHalftoneAberrationPreset) ?? undefined : undefined,
}

const testEffectLineHalftoneAberrationPreset = staticPresets.find(p => p.id === 'test-effect-line-halftone-aberration')
export const EffectLineHalftoneAberration: Story = {
  args: testEffectLineHalftoneAberrationPreset ? createStoryArgsFromPreset(testEffectLineHalftoneAberrationPreset) ?? undefined : undefined,
}

const testEffectPixelatePreset = staticPresets.find(p => p.id === 'test-effect-pixelate')
export const EffectPixelate: Story = {
  args: testEffectPixelatePreset ? createStoryArgsFromPreset(testEffectPixelatePreset) ?? undefined : undefined,
}

const testEffectHexagonMosaicPreset = staticPresets.find(p => p.id === 'test-effect-hexagon-mosaic')
export const EffectHexagonMosaic: Story = {
  args: testEffectHexagonMosaicPreset ? createStoryArgsFromPreset(testEffectHexagonMosaicPreset) ?? undefined : undefined,
}

const testEffectVoronoiMosaicPreset = staticPresets.find(p => p.id === 'test-effect-voronoi-mosaic')
export const EffectVoronoiMosaic: Story = {
  args: testEffectVoronoiMosaicPreset ? createStoryArgsFromPreset(testEffectVoronoiMosaicPreset) ?? undefined : undefined,
}

// ============================================================
// Other Test Presets
// ============================================================

const testImageLayerPreset = staticPresets.find(p => p.id === 'test-image-layer')
export const ImageLayer: Story = {
  args: testImageLayerPreset ? createStoryArgsFromPreset(testImageLayerPreset) ?? undefined : undefined,
}

const testImageLayerPositionedPreset = staticPresets.find(p => p.id === 'test-image-layer-positioned')
export const ImageLayerPositioned: Story = {
  args: testImageLayerPositionedPreset ? createStoryArgsFromPreset(testImageLayerPositionedPreset) ?? undefined : undefined,
}

const testSurfaceTextMaskPreset = staticPresets.find(p => p.id === 'test-surface-text-mask')
export const SurfaceTextMask: Story = {
  args: testSurfaceTextMaskPreset ? createStoryArgsFromPreset(testSurfaceTextMaskPreset) ?? undefined : undefined,
}

// ============================================================
// All Presets Grid (for visual comparison)
// ============================================================

// This story shows all presets in a grid for easy comparison
export const AllPresetsGrid: Story = {
  render: () => ({
    components: { HeroPreview },
    setup() {
      const presetStories = staticPresets
        .map(preset => ({
          id: preset.id,
          name: preset.name,
          args: createStoryArgsFromPreset(preset),
        }))
        .filter(p => p.args !== null)

      return { presetStories }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
        <div v-for="preset in presetStories" :key="preset.id" style="display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 12px; font-weight: 600; color: #666;">{{ preset.name }}</div>
          <HeroPreview
            :variant="preset.args.variant"
            :config="preset.args.config"
            :palette="preset.args.palette"
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
