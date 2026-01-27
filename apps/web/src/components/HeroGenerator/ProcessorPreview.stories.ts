/**
 * ProcessorPreview Stories
 *
 * Mask/Effectプロセッサをプレビューするための専用Storybook
 * 適当なSurfaceを用意し、それにProcessorとしてMask/Effectをかけて表示
 */

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import HeroPreview from './HeroPreview.vue'
import {
  type HeroViewConfig,
  type ProcessorNodeConfig,
  type MaskProcessorConfig,
  type SingleEffectConfig,
  type SurfaceLayerNodeConfig,
  type LayerNodeConfig,
  normalizeSurfaceConfig,
  createSingleEffectConfig,
  HERO_CANVAS_WIDTH,
  HERO_CANVAS_HEIGHT,
  EFFECT_TYPES,
  type EffectType,
  $PropertyValue,
} from '@practice/section-visual'
import { createPrimitivePalette } from '@practice/semantic-color-palette/Infra'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import { maskPatternRepository, type MaskPattern } from '@practice/texture'
import { hsvToOklch } from '../../components/SiteBuilder/utils/colorConversion'

// ============================================================
// Helper: Default Palette (using HSV to Oklch conversion)
// ============================================================

const DEFAULT_PALETTE: PrimitivePalette = createPrimitivePalette({
  brand: hsvToOklch({ h: 220, s: 70, v: 60 }),
  accent: hsvToOklch({ h: 30, s: 80, v: 90 }),
  foundation: hsvToOklch({ h: 220, s: 10, v: 95 }),
})

// ============================================================
// Helper: Create base surface layer
// ============================================================

const createBaseSurfaceLayer = (): SurfaceLayerNodeConfig => ({
  id: 'base-surface',
  name: 'Base Surface',
  type: 'surface',
  visible: true,
  surface: normalizeSurfaceConfig({ id: 'stripe', width1: 25, width2: 25, angle: Math.PI / 4, color1: 'BN3', color2: 'BN7' }),
})

// ============================================================
// Helper: Convert MaskPattern's maskConfig to section-visual's MaskShapeConfig
// ============================================================

// Helper: Create a default mask child layer
const createDefaultMaskChild = (): LayerNodeConfig => ({
  type: 'surface',
  id: `mask-child-${Date.now()}`,
  name: 'Mask Surface',
  visible: true,
  surface: {
    id: 'solid',
    params: { color: $PropertyValue.static('#ffffff') },
  },
})

// ============================================================
// Helper: Create HeroViewConfig with Mask
// ============================================================

const createMaskConfig = (_maskPattern: MaskPattern): HeroViewConfig => {
  const maskProcessor: MaskProcessorConfig = {
    type: 'mask',
    enabled: true,
    children: [createDefaultMaskChild()],
    invert: false,
    feather: 0,
  }

  const processorNode: ProcessorNodeConfig = {
    id: 'processor-1',
    name: 'Processor',
    type: 'processor',
    visible: true,
    modifiers: [maskProcessor],
  }

  return {
    viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
    colors: { semanticContext: 'canvas' },
    layers: [
      createBaseSurfaceLayer(),
      processorNode,
    ],
    foreground: { elements: [] },
  }
}

// ============================================================
// Helper: Create HeroViewConfig with Effect
// ============================================================

const createEffectConfig = (effectType: EffectType): HeroViewConfig => {
  const effectConfig: SingleEffectConfig = createSingleEffectConfig(effectType)

  const processorNode: ProcessorNodeConfig = {
    id: 'processor-1',
    name: 'Processor',
    type: 'processor',
    visible: true,
    modifiers: [effectConfig],
  }

  return {
    viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
    colors: { semanticContext: 'canvas' },
    layers: [
      createBaseSurfaceLayer(),
      processorNode,
    ],
    foreground: { elements: [] },
  }
}

// ============================================================
// Helper: Create HeroViewConfig with Mask + Effect
// ============================================================

const createMaskWithEffectConfig = (
  _maskPattern: MaskPattern,
  effectType: EffectType
): HeroViewConfig => {
  const maskProcessor: MaskProcessorConfig = {
    type: 'mask',
    enabled: true,
    children: [createDefaultMaskChild()],
    invert: false,
    feather: 0,
  }

  const effectConfig: SingleEffectConfig = createSingleEffectConfig(effectType)

  const processorNode: ProcessorNodeConfig = {
    id: 'processor-1',
    name: 'Processor',
    type: 'processor',
    visible: true,
    modifiers: [effectConfig, maskProcessor],
  }

  return {
    viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
    colors: { semanticContext: 'canvas' },
    layers: [
      createBaseSurfaceLayer(),
      processorNode,
    ],
    foreground: { elements: [] },
  }
}

// ============================================================
// Storybook Meta
// ============================================================

const meta: Meta<typeof HeroPreview> = {
  title: 'Components/HeroGenerator/ProcessorPreview',
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
// Mask Pattern Data
// ============================================================

const maskPatterns = await maskPatternRepository.getAll()

// ============================================================
// Individual Mask Stories
// ============================================================

const solidCirclePattern = maskPatterns.find(p => p.label === 'Solid Circle Center')
export const MaskSolidCircle: Story = {
  args: solidCirclePattern ? {
    variant: 'thumbnail' as const,
    config: createMaskConfig(solidCirclePattern),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const circleCenterPattern = maskPatterns.find(p => p.label === 'Circle Center')
export const MaskCircleCenter: Story = {
  args: circleCenterPattern ? {
    variant: 'thumbnail' as const,
    config: createMaskConfig(circleCenterPattern),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const rectCenterPattern = maskPatterns.find(p => p.label === 'Rect Center')
export const MaskRectCenter: Story = {
  args: rectCenterPattern ? {
    variant: 'thumbnail' as const,
    config: createMaskConfig(rectCenterPattern),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const blobSoftPattern = maskPatterns.find(p => p.label === 'Blob Soft')
export const MaskBlobSoft: Story = {
  args: blobSoftPattern ? {
    variant: 'thumbnail' as const,
    config: createMaskConfig(blobSoftPattern),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const perlinNoisePattern = maskPatterns.find(p => p.label === 'Perlin Noise')
export const MaskPerlinNoise: Story = {
  args: perlinNoisePattern ? {
    variant: 'thumbnail' as const,
    config: createMaskConfig(perlinNoisePattern),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const fadeRightPattern = maskPatterns.find(p => p.label === 'Fade Right')
export const MaskFadeRight: Story = {
  args: fadeRightPattern ? {
    variant: 'thumbnail' as const,
    config: createMaskConfig(fadeRightPattern),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const vignetteCenterPattern = maskPatterns.find(p => p.label === 'Vignette Center')
export const MaskVignetteCenter: Story = {
  args: vignetteCenterPattern ? {
    variant: 'thumbnail' as const,
    config: createMaskConfig(vignetteCenterPattern),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const boxFramePattern = maskPatterns.find(p => p.label === 'Box Frame')
export const MaskBoxFrame: Story = {
  args: boxFramePattern ? {
    variant: 'thumbnail' as const,
    config: createMaskConfig(boxFramePattern),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const wavyHalfLeftPattern = maskPatterns.find(p => p.label === 'Wavy Half Left')
export const MaskWavyHalfLeft: Story = {
  args: wavyHalfLeftPattern ? {
    variant: 'thumbnail' as const,
    config: createMaskConfig(wavyHalfLeftPattern),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

const curlFlowPattern = maskPatterns.find(p => p.label === 'Curl Flow')
export const MaskCurlFlow: Story = {
  args: curlFlowPattern ? {
    variant: 'thumbnail' as const,
    config: createMaskConfig(curlFlowPattern),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

// ============================================================
// Individual Effect Stories
// ============================================================

export const EffectVignette: Story = {
  args: {
    variant: 'thumbnail' as const,
    config: createEffectConfig('vignette'),
    palette: DEFAULT_PALETTE,
  },
}

export const EffectBlur: Story = {
  args: {
    variant: 'thumbnail' as const,
    config: createEffectConfig('blur'),
    palette: DEFAULT_PALETTE,
  },
}

export const EffectChromaticAberration: Story = {
  args: {
    variant: 'thumbnail' as const,
    config: createEffectConfig('chromaticAberration'),
    palette: DEFAULT_PALETTE,
  },
}

export const EffectDotHalftone: Story = {
  args: {
    variant: 'thumbnail' as const,
    config: createEffectConfig('dotHalftone'),
    palette: DEFAULT_PALETTE,
  },
}

export const EffectLineHalftone: Story = {
  args: {
    variant: 'thumbnail' as const,
    config: createEffectConfig('lineHalftone'),
    palette: DEFAULT_PALETTE,
  },
}

export const EffectPixelate: Story = {
  args: {
    variant: 'thumbnail' as const,
    config: createEffectConfig('pixelate'),
    palette: DEFAULT_PALETTE,
  },
}

export const EffectHexagonMosaic: Story = {
  args: {
    variant: 'thumbnail' as const,
    config: createEffectConfig('hexagonMosaic'),
    palette: DEFAULT_PALETTE,
  },
}

export const EffectVoronoiMosaic: Story = {
  args: {
    variant: 'thumbnail' as const,
    config: createEffectConfig('voronoiMosaic'),
    palette: DEFAULT_PALETTE,
  },
}

// ============================================================
// Combined Mask + Effect Stories
// ============================================================

const circlePatternForCombo = maskPatterns.find(p => p.label === 'Circle Center')
export const MaskWithBlur: Story = {
  args: circlePatternForCombo ? {
    variant: 'thumbnail' as const,
    config: createMaskWithEffectConfig(circlePatternForCombo, 'blur'),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

export const MaskWithVignette: Story = {
  args: circlePatternForCombo ? {
    variant: 'thumbnail' as const,
    config: createMaskWithEffectConfig(circlePatternForCombo, 'vignette'),
    palette: DEFAULT_PALETTE,
  } : undefined,
}

// ============================================================
// All Masks Grid
// ============================================================

export const AllMasksGrid: Story = {
  render: () => ({
    components: { HeroPreview },
    setup() {
      const presetStories = maskPatterns
        .filter((pattern: MaskPattern) => pattern.maskConfig)
        .map((pattern: MaskPattern) => ({
          label: pattern.label,
          type: pattern.maskConfig!.type,
          args: {
            variant: 'thumbnail' as const,
            config: createMaskConfig(pattern),
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
// All Effects Grid
// ============================================================

export const AllEffectsGrid: Story = {
  render: () => ({
    components: { HeroPreview },
    setup() {
      const effectStories = EFFECT_TYPES.map((effectType: EffectType) => ({
        label: effectType,
        args: {
          variant: 'thumbnail' as const,
          config: createEffectConfig(effectType),
          palette: DEFAULT_PALETTE,
        },
      }))

      return { effectStories }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        <div v-for="effect in effectStories" :key="effect.label" style="display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 11px; font-weight: 600; color: #666;">{{ effect.label }}</div>
          <HeroPreview
            :variant="effect.args.variant"
            :config="effect.args.config"
            :palette="effect.args.palette"
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
// Masks by Category Grids
// ============================================================

export const CircleMasksGrid: Story = {
  render: () => ({
    components: { HeroPreview },
    setup() {
      const circlePatterns = maskPatterns
        .filter((p: MaskPattern) => p.maskConfig?.type === 'circle')
        .map((pattern: MaskPattern) => ({
          label: pattern.label,
          args: {
            variant: 'thumbnail' as const,
            config: createMaskConfig(pattern),
            palette: DEFAULT_PALETTE,
          },
        }))

      return { circlePatterns }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        <div v-for="preset in circlePatterns" :key="preset.label" style="display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 11px; font-weight: 600; color: #666;">{{ preset.label }}</div>
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

export const RectMasksGrid: Story = {
  render: () => ({
    components: { HeroPreview },
    setup() {
      const rectPatterns = maskPatterns
        .filter((p: MaskPattern) => p.maskConfig?.type === 'rect')
        .map((pattern: MaskPattern) => ({
          label: pattern.label,
          args: {
            variant: 'thumbnail' as const,
            config: createMaskConfig(pattern),
            palette: DEFAULT_PALETTE,
          },
        }))

      return { rectPatterns }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        <div v-for="preset in rectPatterns" :key="preset.label" style="display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 11px; font-weight: 600; color: #666;">{{ preset.label }}</div>
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

export const GradientMasksGrid: Story = {
  render: () => ({
    components: { HeroPreview },
    setup() {
      const gradientTypes = ['linearGradient', 'radialGradient', 'boxGradient']
      const gradientPatterns = maskPatterns
        .filter((p: MaskPattern) => p.maskConfig && gradientTypes.includes(p.maskConfig.type))
        .map((pattern: MaskPattern) => ({
          label: pattern.label,
          type: pattern.maskConfig?.type,
          args: {
            variant: 'thumbnail' as const,
            config: createMaskConfig(pattern),
            palette: DEFAULT_PALETTE,
          },
        }))

      return { gradientPatterns }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        <div v-for="preset in gradientPatterns" :key="preset.label" style="display: flex; flex-direction: column; gap: 4px;">
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

export const NoiseMasksGrid: Story = {
  render: () => ({
    components: { HeroPreview },
    setup() {
      const noiseTypes = ['perlin', 'simplex', 'curl']
      const noisePatterns = maskPatterns
        .filter((p: MaskPattern) => p.maskConfig && noiseTypes.includes(p.maskConfig.type))
        .map((pattern: MaskPattern) => ({
          label: pattern.label,
          type: pattern.maskConfig?.type,
          args: {
            variant: 'thumbnail' as const,
            config: createMaskConfig(pattern),
            palette: DEFAULT_PALETTE,
          },
        }))

      return { noisePatterns }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        <div v-for="preset in noisePatterns" :key="preset.label" style="display: flex; flex-direction: column; gap: 4px;">
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

export const WavyLineMasksGrid: Story = {
  render: () => ({
    components: { HeroPreview },
    setup() {
      const wavyPatterns = maskPatterns
        .filter((p: MaskPattern) => p.maskConfig?.type === 'wavyLine')
        .map((pattern: MaskPattern) => ({
          label: pattern.label,
          args: {
            variant: 'thumbnail' as const,
            config: createMaskConfig(pattern),
            palette: DEFAULT_PALETTE,
          },
        }))

      return { wavyPatterns }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        <div v-for="preset in wavyPatterns" :key="preset.label" style="display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 11px; font-weight: 600; color: #666;">{{ preset.label }}</div>
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
