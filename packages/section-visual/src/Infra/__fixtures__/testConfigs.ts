import type { HeroViewConfig, SurfaceLayerNodeConfig, GroupLayerNodeConfig, PropertyValue } from '../../Domain'
import { $PropertyValue } from '../../Domain'

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
            surface: {
              id: 'solid',
              params: {
                color1: $PropertyValue.static(colorKey),
              } as Record<string, PropertyValue>,
            },
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
                width1: $PropertyValue.static(4),
                width2: $PropertyValue.static(4),
                angle: $PropertyValue.static(45),
                color1: $PropertyValue.static('B'),
                color2: $PropertyValue.static('A'),
              } as Record<string, PropertyValue>,
            },
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
                lineWidth: $PropertyValue.static(2),
                cellSize: $PropertyValue.static(32),
                color1: $PropertyValue.static('B'),
                color2: $PropertyValue.static('F1'),
              } as Record<string, PropertyValue>,
            },
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
            surface: {
              id: 'solid',
              params: {
                color1: $PropertyValue.static('F0'),
              } as Record<string, PropertyValue>,
            },
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
                width1: $PropertyValue.static(8),
                width2: $PropertyValue.static(8),
                angle: $PropertyValue.static(45),
                color1: $PropertyValue.static('B'),
                color2: $PropertyValue.static('Bt'),
              } as Record<string, PropertyValue>,
            },
          } as SurfaceLayerNodeConfig,
        ],
      } as GroupLayerNodeConfig,
    ],
    foreground: { elements: [] },
  }
}
