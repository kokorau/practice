/**
 * InMemoryHeroViewPresetRepository
 *
 * メモリ内にハードコードされたプリセットデータを提供
 * 将来的にはAPIからの取得に置き換え可能
 */

import type { HeroViewPresetRepository } from '../Application/ports/HeroViewPresetRepository'
import type { HeroViewPreset } from '../Domain/HeroViewPreset'
import type { LayerFilterConfig } from '../Domain'

// ============================================================
// Helper Functions
// ============================================================

const createFilters = (options?: {
  vignette?: Partial<LayerFilterConfig['vignette']>
  chromaticAberration?: Partial<LayerFilterConfig['chromaticAberration']>
  dotHalftone?: Partial<LayerFilterConfig['dotHalftone']>
  lineHalftone?: Partial<LayerFilterConfig['lineHalftone']>
}): LayerFilterConfig => ({
  vignette: { enabled: false, intensity: 0.5, radius: 0.5, softness: 0.5, ...options?.vignette },
  chromaticAberration: { enabled: false, intensity: 0.01, ...options?.chromaticAberration },
  dotHalftone: { enabled: false, dotSize: 8, spacing: 16, angle: 45, ...options?.dotHalftone },
  lineHalftone: { enabled: false, lineWidth: 4, spacing: 12, angle: 45, ...options?.lineHalftone },
})

// ============================================================
// Preset Data
// ============================================================

const PRESETS: HeroViewPreset[] = [
  // 1. Corporate Clean - ビジネス向けクリーンデザイン
  {
    id: 'corporate-clean',
    name: 'Corporate Clean',
    config: {
      viewport: { width: 1280, height: 720 },
      colors: {
        background: { primary: 'BN1', secondary: 'BN2' },
        mask: { primary: 'B', secondary: 'Bt', outer: 'BN0' },
        semanticContext: 'canvas',
      },
      background: {
        surface: { type: 'grid', lineWidth: 1, cellSize: 48 },
        filters: createFilters({ vignette: { enabled: true, intensity: 0.3, radius: 0.8, softness: 0.6 } }),
      },
      mask: {
        shape: {
          type: 'rect',
          left: 0.05, right: 0.55, top: 0.1, bottom: 0.9,
          radiusTopLeft: 0.02, radiusTopRight: 0.02,
          radiusBottomLeft: 0.02, radiusBottomRight: 0.02,
          cutout: true,
        },
        surface: { type: 'solid' },
        filters: createFilters(),
      },
      foreground: {
        title: { position: 'middle-left', content: 'Enterprise Solutions', fontSize: 3.5 },
        description: { position: 'middle-left', content: 'Streamline your business with our platform.', fontSize: 1.25 },
      },
    },
  },

  // 2. Creative Studio - クリエイティブ系
  {
    id: 'creative-studio',
    name: 'Creative Studio',
    config: {
      viewport: { width: 1280, height: 720 },
      colors: {
        background: { primary: 'A', secondary: 'At' },
        mask: { primary: 'B', secondary: 'Bf', outer: 'A' },
        semanticContext: 'sectionContrast',
      },
      background: {
        surface: { type: 'stripe', width1: 32, width2: 16, angle: -15 },
        filters: createFilters({ chromaticAberration: { enabled: true, intensity: 0.015 } }),
      },
      mask: {
        shape: {
          type: 'blob',
          centerX: 0.65, centerY: 0.5,
          baseRadius: 0.35, amplitude: 0.12, octaves: 5, seed: 123,
          cutout: false,
        },
        surface: { type: 'polkaDot', dotRadius: 4, spacing: 16, rowOffset: 0.5 },
        filters: createFilters(),
      },
      foreground: {
        title: { position: 'middle-left', content: 'Think Different', fontSize: 4 },
        description: { position: 'bottom-left', content: 'Where creativity meets innovation.', fontSize: 1.5 },
      },
    },
  },

  // 3. Tech Startup - テック系スタートアップ
  {
    id: 'tech-startup',
    name: 'Tech Startup',
    config: {
      viewport: { width: 1280, height: 720 },
      colors: {
        background: { primary: 'BN8', secondary: 'BN7' },
        mask: { primary: 'A', secondary: 'At', outer: 'BN9' },
        semanticContext: 'sectionContrast',
      },
      background: {
        surface: { type: 'grid', lineWidth: 1, cellSize: 32 },
        filters: createFilters({ lineHalftone: { enabled: true, lineWidth: 2, spacing: 8, angle: 45 } }),
      },
      mask: {
        shape: {
          type: 'circle',
          centerX: 0.75, centerY: 0.5, radius: 0.4,
          cutout: true,
        },
        surface: { type: 'solid' },
        filters: createFilters({ vignette: { enabled: true, intensity: 0.4, radius: 0.6, softness: 0.5 } }),
      },
      foreground: {
        title: { position: 'middle-left', content: 'Build the Future', fontSize: 3.5 },
        description: { position: 'middle-left', content: 'Next-gen tools for next-gen teams.', fontSize: 1.25 },
      },
    },
  },

  // 4. Fashion Editorial - ファッション系
  {
    id: 'fashion-editorial',
    name: 'Fashion Editorial',
    config: {
      viewport: { width: 1280, height: 720 },
      colors: {
        background: { primary: 'BN0', secondary: 'BN1' },
        mask: { primary: 'BN9', secondary: 'BN8', outer: 'BN0' },
        semanticContext: 'canvas',
      },
      background: {
        surface: { type: 'solid' },
        filters: createFilters(),
      },
      mask: {
        shape: {
          type: 'rect',
          left: 0.35, right: 0.65, top: 0.05, bottom: 0.95,
          radiusTopLeft: 0, radiusTopRight: 0,
          radiusBottomLeft: 0, radiusBottomRight: 0,
          cutout: false,
        },
        surface: { type: 'stripe', width1: 2, width2: 8, angle: 0 },
        filters: createFilters(),
      },
      foreground: {
        title: { position: 'top-center', content: 'SPRING 2025', fontSize: 2 },
        description: { position: 'bottom-center', content: 'The New Collection', fontSize: 4 },
      },
    },
  },

  // 5. Retro Pop - レトロポップ
  {
    id: 'retro-pop',
    name: 'Retro Pop',
    config: {
      viewport: { width: 1280, height: 720 },
      colors: {
        background: { primary: 'A', secondary: 'F3' },
        mask: { primary: 'B', secondary: 'F1', outer: 'At' },
        semanticContext: 'sectionTint',
      },
      background: {
        surface: { type: 'checker', cellSize: 48, angle: 0 },
        filters: createFilters({ dotHalftone: { enabled: true, dotSize: 6, spacing: 12, angle: 30 } }),
      },
      mask: {
        shape: {
          type: 'circle',
          centerX: 0.5, centerY: 0.5, radius: 0.38,
          cutout: true,
        },
        surface: { type: 'polkaDot', dotRadius: 12, spacing: 36, rowOffset: 0.5 },
        filters: createFilters(),
      },
      foreground: {
        title: { position: 'middle-center', content: 'GROOVY', fontSize: 5 },
        description: { position: 'bottom-center', content: 'Back to the classics', fontSize: 1.5 },
      },
    },
  },

  // 6. Minimal Zen - ミニマル禅
  {
    id: 'minimal-zen',
    name: 'Minimal Zen',
    config: {
      viewport: { width: 1280, height: 720 },
      colors: {
        background: { primary: 'F0', secondary: 'F1' },
        mask: { primary: 'BN3', secondary: 'BN2', outer: 'F0' },
        semanticContext: 'canvas',
      },
      background: {
        surface: { type: 'solid' },
        filters: createFilters({ vignette: { enabled: true, intensity: 0.2, radius: 0.9, softness: 0.8 } }),
      },
      mask: {
        shape: {
          type: 'blob',
          centerX: 0.5, centerY: 0.5,
          baseRadius: 0.25, amplitude: 0.03, octaves: 3, seed: 888,
          cutout: false,
        },
        surface: { type: 'solid' },
        filters: createFilters(),
      },
      foreground: {
        title: { position: 'middle-center', content: 'Simplicity', fontSize: 3 },
        description: { position: 'middle-center', content: 'Less is more.', fontSize: 1 },
      },
    },
  },

  // 7. Bold Statement - 大胆なステートメント
  {
    id: 'bold-statement',
    name: 'Bold Statement',
    config: {
      viewport: { width: 1280, height: 720 },
      colors: {
        background: { primary: 'B', secondary: 'Bs' },
        mask: { primary: 'A', secondary: 'As', outer: 'B' },
        semanticContext: 'sectionContrast',
      },
      background: {
        surface: { type: 'stripe', width1: 64, width2: 8, angle: 90 },
        filters: createFilters(),
      },
      mask: {
        shape: {
          type: 'rect',
          left: 0.1, right: 0.9, top: 0.25, bottom: 0.75,
          radiusTopLeft: 0, radiusTopRight: 0.1,
          radiusBottomLeft: 0.1, radiusBottomRight: 0,
          cutout: true,
        },
        surface: { type: 'solid' },
        filters: createFilters({ chromaticAberration: { enabled: true, intensity: 0.02 } }),
      },
      foreground: {
        title: { position: 'middle-center', content: 'MAKE IT HAPPEN', fontSize: 4.5 },
        description: { position: 'bottom-center', content: 'Your vision, our mission.', fontSize: 1.25 },
      },
    },
  },
]

// ============================================================
// Repository Implementation
// ============================================================

/**
 * インメモリプリセットリポジトリを作成
 */
export const createInMemoryHeroViewPresetRepository = (): HeroViewPresetRepository => ({
  findAll: async () => PRESETS,
  findById: async (id: string) => PRESETS.find((p) => p.id === id) ?? null,
})
