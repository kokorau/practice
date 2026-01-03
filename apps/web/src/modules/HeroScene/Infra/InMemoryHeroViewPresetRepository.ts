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

const createDefaultFilters = (): LayerFilterConfig => ({
  vignette: { enabled: false, intensity: 0.5, radius: 0.5, softness: 0.5 },
  chromaticAberration: { enabled: false, intensity: 0.01 },
  dotHalftone: { enabled: false, dotSize: 8, spacing: 16, angle: 45 },
  lineHalftone: { enabled: false, lineWidth: 4, spacing: 12, angle: 45 },
})

// ============================================================
// Preset Data
// ============================================================

const PRESETS: HeroViewPreset[] = [
  // 1. Minimal Brand - シンプルなブランドカラー背景
  {
    id: 'minimal-brand',
    name: 'Minimal Brand',
    config: {
      viewport: { width: 1280, height: 720 },
      colors: {
        background: { primary: 'B', secondary: 'auto' },
        mask: { primary: 'auto', secondary: 'auto', outer: 'auto' },
        semanticContext: 'canvas',
      },
      background: {
        surface: { type: 'solid' },
        filters: createDefaultFilters(),
      },
      mask: null,
      foreground: {
        title: { position: 'middle-center', content: 'Welcome' },
        description: { position: 'middle-center', content: 'Your brand story starts here.' },
      },
    },
  },

  // 2. Stripe Hero - ストライプ背景 + 円形マスク
  {
    id: 'stripe-hero',
    name: 'Stripe Hero',
    config: {
      viewport: { width: 1280, height: 720 },
      colors: {
        background: { primary: 'B', secondary: 'F1' },
        mask: { primary: 'auto', secondary: 'auto', outer: 'auto' },
        semanticContext: 'canvas',
      },
      background: {
        surface: { type: 'stripe', width1: 24, width2: 24, angle: 45 },
        filters: createDefaultFilters(),
      },
      mask: {
        shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.35, cutout: true },
        surface: { type: 'solid' },
        filters: createDefaultFilters(),
      },
      foreground: {
        title: { position: 'middle-center', content: 'Bold Design' },
        description: { position: 'middle-center', content: 'Make a statement with stripes.' },
      },
    },
  },

  // 3. Grid Modern - グリッドパターン背景
  {
    id: 'grid-modern',
    name: 'Grid Modern',
    config: {
      viewport: { width: 1280, height: 720 },
      colors: {
        background: { primary: 'BN3', secondary: 'F1' },
        mask: { primary: 'auto', secondary: 'auto', outer: 'auto' },
        semanticContext: 'canvas',
      },
      background: {
        surface: { type: 'grid', lineWidth: 1, cellSize: 40 },
        filters: createDefaultFilters(),
      },
      mask: null,
      foreground: {
        title: { position: 'middle-center', content: 'Modern Grid' },
        description: { position: 'middle-center', content: 'Clean and structured design.' },
      },
    },
  },

  // 4. Blob Accent - Blobマスク付き
  {
    id: 'blob-accent',
    name: 'Blob Accent',
    config: {
      viewport: { width: 1280, height: 720 },
      colors: {
        background: { primary: 'B', secondary: 'Bt' },
        mask: { primary: 'A', secondary: 'auto', outer: 'auto' },
        semanticContext: 'sectionTint',
      },
      background: {
        surface: { type: 'solid' },
        filters: createDefaultFilters(),
      },
      mask: {
        shape: {
          type: 'blob',
          centerX: 0.5,
          centerY: 0.5,
          baseRadius: 0.3,
          amplitude: 0.08,
          octaves: 4,
          seed: 42,
          cutout: false,
        },
        surface: { type: 'solid' },
        filters: createDefaultFilters(),
      },
      foreground: {
        title: { position: 'middle-center', content: 'Organic Flow' },
        description: { position: 'middle-center', content: 'Natural shapes for creative brands.' },
      },
    },
  },

  // 5. Polka Playful - ポルカドットパターン + 角丸マスク
  {
    id: 'polka-playful',
    name: 'Polka Playful',
    config: {
      viewport: { width: 1280, height: 720 },
      colors: {
        background: { primary: 'A', secondary: 'F2' },
        mask: { primary: 'B', secondary: 'auto', outer: 'auto' },
        semanticContext: 'canvas',
      },
      background: {
        surface: { type: 'polkaDot', dotRadius: 8, spacing: 32, rowOffset: 0.5 },
        filters: createDefaultFilters(),
      },
      mask: {
        shape: {
          type: 'rect',
          left: 0.1,
          right: 0.9,
          top: 0.15,
          bottom: 0.85,
          radiusTopLeft: 0.05,
          radiusTopRight: 0.05,
          radiusBottomLeft: 0.05,
          radiusBottomRight: 0.05,
          cutout: true,
        },
        surface: { type: 'solid' },
        filters: createDefaultFilters(),
      },
      foreground: {
        title: { position: 'middle-center', content: 'Fun & Playful' },
        description: { position: 'middle-center', content: 'Add personality to your brand.' },
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
