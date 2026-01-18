import type { HeroViewConfig, SurfaceLayerNodeConfig, GroupLayerNodeConfig } from '../../Domain'

/**
 * Create a minimal HeroViewConfig with solid background
 */
export function createSolidBackgroundConfig(colorKey = 'B'): HeroViewConfig {
  return {
    viewport: { width: 256, height: 256 },
    colors: {
      semanticContext: 'canvas',
    },
    layers: [
      {
        type: 'group',
        id: 'background-group',
        name: 'Background',
        visible: true,
        children: [
          {
            type: 'surface',
            id: 'background',
            name: 'Surface',
            visible: true,
            surface: { id: 'solid', params: {} },
            colors: { primary: colorKey, secondary: 'auto' },
          } as SurfaceLayerNodeConfig,
        ],
      } as GroupLayerNodeConfig,
    ],
    foreground: { elements: [] },
  }
}

/**
 * Create a multi-color stripe background config
 */
export function createGradientBackgroundConfig(): HeroViewConfig {
  return {
    viewport: { width: 256, height: 256 },
    colors: {
      semanticContext: 'canvas',
    },
    layers: [
      {
        type: 'group',
        id: 'background-group',
        name: 'Background',
        visible: true,
        children: [
          {
            type: 'surface',
            id: 'background',
            name: 'Surface',
            visible: true,
            surface: {
              id: 'stripe',
              params: {
                width1: 4,
                width2: 4,
                angle: 45,
              },
            },
            colors: { primary: 'B', secondary: 'A' },
          } as SurfaceLayerNodeConfig,
        ],
      } as GroupLayerNodeConfig,
    ],
    foreground: { elements: [] },
  }
}

/**
 * Create a grid pattern config
 */
export function createGridPatternConfig(): HeroViewConfig {
  return {
    viewport: { width: 256, height: 256 },
    colors: {
      semanticContext: 'canvas',
    },
    layers: [
      {
        type: 'group',
        id: 'background-group',
        name: 'Background',
        visible: true,
        children: [
          {
            type: 'surface',
            id: 'background',
            name: 'Surface',
            visible: true,
            surface: {
              id: 'grid',
              params: {
                lineWidth: 2,
                cellSize: 32,
              },
            },
            colors: { primary: 'B', secondary: 'F1' },
          } as SurfaceLayerNodeConfig,
        ],
      } as GroupLayerNodeConfig,
    ],
    foreground: { elements: [] },
  }
}

/**
 * Create a two-layer config (background + foreground surface)
 */
export function createTwoLayerConfig(): HeroViewConfig {
  return {
    viewport: { width: 256, height: 256 },
    colors: {
      semanticContext: 'canvas',
    },
    layers: [
      {
        type: 'group',
        id: 'background-group',
        name: 'Background',
        visible: true,
        children: [
          {
            type: 'surface',
            id: 'background',
            name: 'Background',
            visible: true,
            surface: { id: 'solid', params: {} },
            colors: { primary: 'F0', secondary: 'auto' },
          } as SurfaceLayerNodeConfig,
        ],
      } as GroupLayerNodeConfig,
      {
        type: 'group',
        id: 'foreground-group',
        name: 'Foreground',
        visible: true,
        children: [
          {
            type: 'surface',
            id: 'foreground-surface',
            name: 'Foreground',
            visible: true,
            surface: {
              id: 'stripe',
              params: {
                width1: 8,
                width2: 8,
                angle: 45,
              },
            },
            colors: { primary: 'B', secondary: 'Bt' },
          } as SurfaceLayerNodeConfig,
        ],
      } as GroupLayerNodeConfig,
    ],
    foreground: { elements: [] },
  }
}
