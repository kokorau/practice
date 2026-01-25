/**
 * SurfacePreview Stories
 *
 * 各Surfaceタイプをプレビューするための専用Storybook
 * Paper TextureやGradient Grainなどのsurfaceを個別に検証可能
 */

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import HeroPreview from './HeroPreview.vue'
import {
  type HeroViewConfig,
  normalizeSurfaceConfig,
  HERO_CANVAS_WIDTH,
  HERO_CANVAS_HEIGHT,
} from '@practice/section-visual'
import { createPrimitivePalette } from '@practice/semantic-color-palette/Infra'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import { getSurfacePresets, type SurfacePreset, type SurfacePresetParams } from '@practice/texture'
import { hsvToOklch } from '../../components/SiteBuilder/utils/colorConversion'

// ============================================================
// Helper: Create HeroViewConfig with a single surface
// ============================================================

const createSurfaceOnlyConfig = (surface: SurfacePresetParams): HeroViewConfig => ({
  viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
  colors: { semanticContext: 'canvas' },
  layers: [
    {
      id: 'bg-surface',
      name: 'Background Surface',
      type: 'surface',
      visible: true,
      surface: normalizeSurfaceConfig({ ...surface, color1: 'BN3', color2: 'BN7' } as Parameters<typeof normalizeSurfaceConfig>[0]),
    },
  ],
  foreground: { elements: [] },
})

// ============================================================
// Helper: Default Palette (using HSV to Oklch conversion)
// ============================================================

const DEFAULT_PALETTE: PrimitivePalette = createPrimitivePalette({
  brand: hsvToOklch({ h: 220, s: 70, v: 60 }),
  accent: hsvToOklch({ h: 30, s: 80, v: 90 }),
  foundation: hsvToOklch({ h: 220, s: 10, v: 95 }),
})

// ============================================================
// Storybook Meta
// ============================================================

const meta: Meta<typeof HeroPreview> = {
  title: 'Components/HeroGenerator/SurfacePreview',
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
// Surface Presets from @practice/texture
// ============================================================

const surfacePresets = getSurfacePresets()

// ============================================================
// Paper Texture Stories
// ============================================================

const paperSmoothPreset = surfacePresets.find(p => p.params.type === 'paperTexture' && p.label === 'Paper Smooth')
export const PaperSmooth: Story = {
  args: paperSmoothPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(paperSmoothPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const paperRoughPreset = surfacePresets.find(p => p.params.type === 'paperTexture' && p.label === 'Paper Rough')
export const PaperRough: Story = {
  args: paperRoughPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(paperRoughPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const paperKraftPreset = surfacePresets.find(p => p.params.type === 'paperTexture' && p.label === 'Paper Kraft')
export const PaperKraft: Story = {
  args: paperKraftPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(paperKraftPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

// ============================================================
// Basic Pattern Stories
// ============================================================

const solidPreset = surfacePresets.find(p => p.params.type === 'solid')
export const Solid: Story = {
  args: solidPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(solidPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const stripePreset = surfacePresets.find(p => p.label === 'Diagonal 45°')
export const StripeDiagonal: Story = {
  args: stripePreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(stripePreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const gridPreset = surfacePresets.find(p => p.params.type === 'grid' && p.label === 'Grid')
export const Grid: Story = {
  args: gridPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(gridPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const polkaDotPreset = surfacePresets.find(p => p.params.type === 'polkaDot' && p.label === 'Polka Dot')
export const PolkaDot: Story = {
  args: polkaDotPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(polkaDotPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const checkerPreset = surfacePresets.find(p => p.label === 'Checker')
export const Checker: Story = {
  args: checkerPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(checkerPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

// ============================================================
// Gradient Grain Stories
// ============================================================

const grainLinearPreset = surfacePresets.find(p => p.params.type === 'gradientGrainLinear')
export const GrainLinear: Story = {
  args: grainLinearPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(grainLinearPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const grainCircularPreset = surfacePresets.find(p => p.params.type === 'gradientGrainCircular')
export const GrainCircular: Story = {
  args: grainCircularPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(grainCircularPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const grainPerlinPreset = surfacePresets.find(p => p.params.type === 'gradientGrainPerlin')
export const GrainPerlin: Story = {
  args: grainPerlinPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(grainPerlinPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const grainCurlPreset = surfacePresets.find(p => p.label === 'Grain Curl')
export const GrainCurl: Story = {
  args: grainCurlPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(grainCurlPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const grainSimplexPreset = surfacePresets.find(p => p.label === 'Grain Simplex')
export const GrainSimplex: Story = {
  args: grainSimplexPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(grainSimplexPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

// ============================================================
// Tessellation Stories
// ============================================================

const trianglePreset = surfacePresets.find(p => p.label === 'Triangle')
export const Triangle: Story = {
  args: trianglePreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(trianglePreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const hexagonPreset = surfacePresets.find(p => p.label === 'Hexagon')
export const Hexagon: Story = {
  args: hexagonPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(hexagonPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

// ============================================================
// Textile Pattern Stories
// ============================================================

const asanohaPreset = surfacePresets.find(p => p.params.type === 'asanoha')
export const Asanoha: Story = {
  args: asanohaPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(asanohaPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const seigaihaPreset = surfacePresets.find(p => p.params.type === 'seigaiha')
export const Seigaiha: Story = {
  args: seigaihaPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(seigaihaPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const wavePreset = surfacePresets.find(p => p.label === 'Wave')
export const Wave: Story = {
  args: wavePreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(wavePreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const scalesPreset = surfacePresets.find(p => p.params.type === 'scales')
export const Scales: Story = {
  args: scalesPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(scalesPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const ogeePreset = surfacePresets.find(p => p.params.type === 'ogee')
export const Ogee: Story = {
  args: ogeePreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(ogeePreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const sunburstPreset = surfacePresets.find(p => p.label === 'Sunburst')
export const Sunburst: Story = {
  args: sunburstPreset ? {
    variant: 'thumbnail' as const,
    config: createSurfaceOnlyConfig(sunburstPreset.params),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

// ============================================================
// All Surfaces Grid
// ============================================================

export const AllSurfacesGrid: Story = {
  render: () => ({
    components: { HeroPreview },
    setup() {
      const presetStories = surfacePresets
        .map((preset: SurfacePreset) => ({
          label: preset.label,
          type: preset.params.type,
          args: {
            variant: 'thumbnail' as const,
            config: createSurfaceOnlyConfig(preset.params),
            palette: DEFAULT_PALETTE,
          },
        }))

      return { presetStories }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        <div v-for="preset in presetStories" :key="preset.label" style="display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 11px; font-weight: 600; color: #666;">{{ preset.label }}</div>
          <div style="font-size: 10px; color: #999;">type: {{ preset.type }}</div>
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

// ============================================================
// Paper Textures Grid (for detailed comparison)
// ============================================================

export const PaperTexturesGrid: Story = {
  render: () => ({
    components: { HeroPreview },
    setup() {
      const paperPresets = surfacePresets
        .filter((preset: SurfacePreset) => preset.params.type === 'paperTexture')
        .map((preset: SurfacePreset) => ({
          label: preset.label,
          args: {
            variant: 'thumbnail' as const,
            config: createSurfaceOnlyConfig(preset.params),
            palette: DEFAULT_PALETTE,
          },
        }))

      return { paperPresets }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
        <div v-for="preset in paperPresets" :key="preset.label" style="display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 14px; font-weight: 600; color: #333;">{{ preset.label }}</div>
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
