import type { MaskPattern } from '../Domain'
import type { GetDefaultMaskPatterns } from '../Application'
import { $static } from '../Domain'

/**
 * Helper to create a circle surface layer for mask patterns.
 */
function circleSurface(
  centerX: number,
  centerY: number,
  radius: number,
  id = 'circle-1'
): MaskPattern['children'][0] {
  return {
    type: 'surface',
    id,
    name: 'Circle',
    visible: true,
    surface: {
      id: 'circle',
      params: {
        centerX: $static(centerX),
        centerY: $static(centerY),
        radius: $static(radius),
      },
    },
  }
}

/**
 * Helper to create a rect surface layer for mask patterns.
 */
function rectSurface(
  left: number,
  right: number,
  top: number,
  bottom: number,
  radii: { tl?: number; tr?: number; bl?: number; br?: number } = {},
  opts: { rotation?: number; perspectiveX?: number; perspectiveY?: number } = {},
  id = 'rect-1'
): MaskPattern['children'][0] {
  return {
    type: 'surface',
    id,
    name: 'Rect',
    visible: true,
    surface: {
      id: 'rect',
      params: {
        left: $static(left),
        right: $static(right),
        top: $static(top),
        bottom: $static(bottom),
        radiusTopLeft: $static(radii.tl ?? 0),
        radiusTopRight: $static(radii.tr ?? 0),
        radiusBottomLeft: $static(radii.bl ?? 0),
        radiusBottomRight: $static(radii.br ?? 0),
        ...(opts.rotation !== undefined && { rotation: $static(opts.rotation) }),
        ...(opts.perspectiveX !== undefined && { perspectiveX: $static(opts.perspectiveX) }),
        ...(opts.perspectiveY !== undefined && { perspectiveY: $static(opts.perspectiveY) }),
      },
    },
  }
}

/**
 * Helper to create a blob surface layer for mask patterns.
 */
function blobSurface(
  centerX: number,
  centerY: number,
  baseRadius: number,
  amplitude: number,
  octaves: number,
  seed: number,
  id = 'blob-1'
): MaskPattern['children'][0] {
  return {
    type: 'surface',
    id,
    name: 'Blob',
    visible: true,
    surface: {
      id: 'blob',
      params: {
        centerX: $static(centerX),
        centerY: $static(centerY),
        baseRadius: $static(baseRadius),
        amplitude: $static(amplitude),
        octaves: $static(octaves),
        seed: $static(seed),
      },
    },
  }
}

/**
 * Helper to create a perlin noise surface layer for mask patterns.
 */
function perlinSurface(
  seed: number,
  threshold: number,
  scale: number,
  octaves: number,
  id = 'perlin-1'
): MaskPattern['children'][0] {
  return {
    type: 'surface',
    id,
    name: 'Perlin',
    visible: true,
    surface: {
      id: 'perlin',
      params: {
        seed: $static(seed),
        threshold: $static(threshold),
        scale: $static(scale),
        octaves: $static(octaves),
      },
    },
  }
}

/**
 * Helper to create a simplex noise surface layer for mask patterns.
 */
function simplexSurface(
  seed: number,
  threshold: number,
  scale: number,
  octaves: number,
  id = 'simplex-1'
): MaskPattern['children'][0] {
  return {
    type: 'surface',
    id,
    name: 'Simplex',
    visible: true,
    surface: {
      id: 'simplex',
      params: {
        seed: $static(seed),
        threshold: $static(threshold),
        scale: $static(scale),
        octaves: $static(octaves),
      },
    },
  }
}

/**
 * Helper to create a curl noise surface layer for mask patterns.
 */
function curlSurface(
  seed: number,
  threshold: number,
  scale: number,
  octaves: number,
  intensity: number,
  id = 'curl-1'
): MaskPattern['children'][0] {
  return {
    type: 'surface',
    id,
    name: 'Curl',
    visible: true,
    surface: {
      id: 'curl',
      params: {
        seed: $static(seed),
        threshold: $static(threshold),
        scale: $static(scale),
        octaves: $static(octaves),
        intensity: $static(intensity),
      },
    },
  }
}

/**
 * Helper to create a radial gradient surface layer for mask patterns.
 */
function radialGradientSurface(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  aspectRatio: number,
  id = 'radialGradient-1'
): MaskPattern['children'][0] {
  return {
    type: 'surface',
    id,
    name: 'Radial Gradient',
    visible: true,
    surface: {
      id: 'radialGradient',
      params: {
        centerX: $static(centerX),
        centerY: $static(centerY),
        innerRadius: $static(innerRadius),
        outerRadius: $static(outerRadius),
        aspectRatio: $static(aspectRatio),
      },
    },
  }
}

/**
 * Helper to create a box gradient surface layer for mask patterns.
 */
function boxGradientSurface(
  left: number,
  right: number,
  top: number,
  bottom: number,
  cornerRadius: number,
  curve: 'linear' | 'smooth' | 'easeIn' | 'easeOut',
  id = 'boxGradient-1'
): MaskPattern['children'][0] {
  return {
    type: 'surface',
    id,
    name: 'Box Gradient',
    visible: true,
    surface: {
      id: 'boxGradient',
      params: {
        left: $static(left),
        right: $static(right),
        top: $static(top),
        bottom: $static(bottom),
        cornerRadius: $static(cornerRadius),
        curve: $static(curve),
      },
    },
  }
}

/**
 * Helper to create a wavy line surface layer for mask patterns.
 */
function wavyLineSurface(
  position: number,
  direction: 'vertical' | 'horizontal',
  amplitude: number,
  frequency: number,
  octaves: number,
  seed: number,
  id = 'wavyLine-1'
): MaskPattern['children'][0] {
  return {
    type: 'surface',
    id,
    name: 'Wavy Line',
    visible: true,
    surface: {
      id: 'wavyLine',
      params: {
        position: $static(position),
        direction: $static(direction),
        amplitude: $static(amplitude),
        frequency: $static(frequency),
        octaves: $static(octaves),
        seed: $static(seed),
      },
    },
  }
}

/**
 * Default mask patterns for midground layer.
 * Uses children-based Surface layers for mask rendering.
 *
 * Each pattern contains an array of Surface layers that are rendered
 * by MaskChildrenRenderNode and converted to luminance greymap.
 *
 * White areas (high luminance) = visible
 * Black areas (low luminance) = transparent
 */
const defaultMaskPatterns: MaskPattern[] = [
  // ============================================================
  // Circle patterns
  // ============================================================
  {
    label: 'Solid Circle Center',
    children: [circleSurface(0.5, 0.5, 0.3)],
  },
  {
    label: 'Solid Circle Large',
    children: [circleSurface(0.5, 0.5, 0.5)],
  },
  {
    label: 'Circle Top-Left',
    children: [circleSurface(0.25, 0.25, 0.35)],
  },
  {
    label: 'Circle Bottom-Right',
    children: [circleSurface(0.75, 0.75, 0.35)],
  },
  {
    label: 'Circle Small',
    children: [circleSurface(0.5, 0.5, 0.2)],
  },

  // ============================================================
  // Rect patterns (halves)
  // ============================================================
  {
    label: 'Half Top',
    children: [rectSurface(0, 1, 0, 0.5)],
  },
  {
    label: 'Half Bottom',
    children: [rectSurface(0, 1, 0.5, 1)],
  },
  {
    label: 'Half Left',
    children: [rectSurface(0, 0.5, 0, 1)],
  },
  {
    label: 'Half Right',
    children: [rectSurface(0.5, 1, 0, 1)],
  },

  // ============================================================
  // Rect patterns (centered)
  // ============================================================
  {
    label: 'Rect Center',
    children: [rectSurface(0.3, 0.7, 0.1, 0.9)],
  },
  {
    label: 'Rect Center Narrow',
    children: [rectSurface(0.35, 0.65, 0.1, 0.9)],
  },
  {
    label: 'Rect Frame',
    children: [rectSurface(0.1, 0.9, 0.1, 0.9)],
  },
  {
    label: 'Rect Top',
    children: [rectSurface(0.1, 0.9, 0.05, 0.5)],
  },
  {
    label: 'Rect Bottom',
    children: [rectSurface(0.1, 0.9, 0.5, 0.95)],
  },

  // ============================================================
  // Rounded rect patterns
  // ============================================================
  {
    label: 'Solid Rounded Center',
    children: [rectSurface(0.25, 0.75, 0.15, 0.85, { tl: 0.05, tr: 0.05, bl: 0.05, br: 0.05 })],
  },
  {
    label: 'Rounded Frame',
    children: [rectSurface(0.1, 0.9, 0.1, 0.9, { tl: 0.03, tr: 0.03, bl: 0.03, br: 0.03 })],
  },
  {
    label: 'Solid Pill',
    children: [rectSurface(0.32, 0.68, 0.05, 0.95, { tl: 0.18, tr: 0.18, bl: 0.18, br: 0.18 })],
  },
  {
    label: 'Arch Top',
    children: [rectSurface(0.35, 0.65, 0, 0.9, { tl: 0, tr: 0, bl: 0.15, br: 0.15 })],
  },
  {
    label: 'Arch Bottom',
    children: [rectSurface(0.35, 0.65, 0.1, 1, { tl: 0.15, tr: 0.15, bl: 0, br: 0 })],
  },
  {
    label: 'Rounded Left',
    children: [rectSurface(0, 0.55, 0.1, 0.9, { tl: 0, tr: 0.04, bl: 0, br: 0.04 })],
  },
  {
    label: 'Rounded Right',
    children: [rectSurface(0.45, 1, 0.1, 0.9, { tl: 0.04, tr: 0, bl: 0.04, br: 0 })],
  },

  // ============================================================
  // Blob patterns
  // ============================================================
  {
    label: 'Solid Blob',
    children: [blobSurface(0.5, 0.5, 0.4, 0.08, 2, 1)],
  },
  {
    label: 'Blob Organic',
    children: [blobSurface(0.5, 0.5, 0.4, 0.12, 3, 42)],
  },
  {
    label: 'Blob Large',
    children: [blobSurface(0.5, 0.5, 0.5, 0.1, 2, 77)],
  },
  {
    label: 'Blob Rough',
    children: [blobSurface(0.5, 0.5, 0.35, 0.15, 4, 123)],
  },

  // ============================================================
  // Perlin noise patterns
  // ============================================================
  {
    label: 'Perlin Noise',
    children: [perlinSurface(12345, 0.5, 4, 4)],
  },
  {
    label: 'Perlin Dense',
    children: [perlinSurface(99, 0.4, 6, 5)],
  },
  {
    label: 'Perlin Sparse',
    children: [perlinSurface(42, 0.6, 3, 3)],
  },
  {
    label: 'Perlin Fine',
    children: [perlinSurface(555, 0.5, 8, 6)],
  },

  // ============================================================
  // Simplex noise patterns (smoother than Perlin)
  // ============================================================
  {
    label: 'Simplex Noise',
    children: [simplexSurface(12345, 0.5, 4, 4)],
  },
  {
    label: 'Simplex Dense',
    children: [simplexSurface(99, 0.4, 6, 5)],
  },
  {
    label: 'Simplex Sparse',
    children: [simplexSurface(42, 0.6, 3, 3)],
  },
  {
    label: 'Simplex Organic',
    children: [simplexSurface(777, 0.48, 5, 4)],
  },

  // ============================================================
  // Curl noise patterns (flow-like boundaries)
  // ============================================================
  {
    label: 'Curl Flow',
    children: [curlSurface(12345, 0.3, 4, 4, 1)],
  },
  {
    label: 'Curl Vortex',
    children: [curlSurface(777, 0.25, 3, 5, 1.5)],
  },
  {
    label: 'Curl Stream',
    children: [curlSurface(999, 0.35, 6, 4, 1.2)],
  },
  {
    label: 'Curl Gentle',
    children: [curlSurface(42, 0.4, 2, 3, 0.8)],
  },
  {
    label: 'Curl Dense',
    children: [curlSurface(555, 0.2, 8, 6, 1.8)],
  },

  // ============================================================
  // Radial gradient patterns (vignette)
  // ============================================================
  {
    label: 'Vignette Center',
    children: [radialGradientSurface(0.5, 0.5, 0.2, 0.6, 1)],
  },
  {
    label: 'Vignette Large',
    children: [radialGradientSurface(0.5, 0.5, 0.3, 0.8, 1)],
  },
  {
    label: 'Spotlight',
    children: [radialGradientSurface(0.5, 0.5, 0, 0.4, 1)],
  },
  {
    label: 'Spotlight Top-Left',
    children: [radialGradientSurface(0.25, 0.25, 0, 0.5, 1)],
  },
  {
    label: 'Spotlight Bottom-Right',
    children: [radialGradientSurface(0.75, 0.75, 0, 0.5, 1)],
  },
  {
    label: 'Ellipse Horizontal',
    children: [radialGradientSurface(0.5, 0.5, 0.1, 0.5, 0.5)],
  },
  {
    label: 'Ellipse Vertical',
    children: [radialGradientSurface(0.5, 0.5, 0.1, 0.5, 2)],
  },
  {
    label: 'Spotlight Soft',
    children: [radialGradientSurface(0.5, 0.5, 0, 0.7, 1)],
  },

  // ============================================================
  // Box gradient patterns (rectangular vignette)
  // ============================================================
  {
    label: 'Box Frame',
    children: [boxGradientSurface(0.15, 0.15, 0.15, 0.15, 0, 'smooth')],
  },
  {
    label: 'Box Frame Narrow',
    children: [boxGradientSurface(0.08, 0.08, 0.08, 0.08, 0, 'smooth')],
  },
  {
    label: 'Box Frame Wide',
    children: [boxGradientSurface(0.25, 0.25, 0.25, 0.25, 0, 'smooth')],
  },
  {
    label: 'Box Rounded',
    children: [boxGradientSurface(0.15, 0.15, 0.15, 0.15, 0.5, 'smooth')],
  },
  {
    label: 'Box Top-Bottom',
    children: [boxGradientSurface(0, 0, 0.2, 0.2, 0, 'smooth')],
  },
  {
    label: 'Box Left-Right',
    children: [boxGradientSurface(0.2, 0.2, 0, 0, 0, 'smooth')],
  },
  {
    label: 'Letterbox',
    children: [boxGradientSurface(0, 0, 0.12, 0.12, 0, 'linear')],
  },
  {
    label: 'Box Asymmetric',
    children: [boxGradientSurface(0.1, 0.2, 0.15, 0.25, 0, 'smooth')],
  },

  // ============================================================
  // Wavy line patterns (organic dividing lines)
  // ============================================================
  {
    label: 'Wavy Half Left',
    children: [wavyLineSurface(0.5, 'vertical', 0.08, 3, 2, 42)],
  },
  {
    label: 'Wavy Half Right',
    children: [wavyLineSurface(0.5, 'vertical', 0.08, 3, 2, 43)],
  },
  {
    label: 'Wavy Half Top',
    children: [wavyLineSurface(0.5, 'horizontal', 0.08, 3, 2, 42)],
  },
  {
    label: 'Wavy Half Bottom',
    children: [wavyLineSurface(0.5, 'horizontal', 0.08, 3, 2, 43)],
  },
  {
    label: 'Wavy Third Left',
    children: [wavyLineSurface(0.33, 'vertical', 0.06, 4, 2, 123)],
  },
  {
    label: 'Wavy Third Right',
    children: [wavyLineSurface(0.67, 'vertical', 0.06, 4, 2, 123)],
  },
  {
    label: 'Wavy Gentle',
    children: [wavyLineSurface(0.5, 'vertical', 0.04, 2, 1, 77)],
  },
  {
    label: 'Wavy Wild',
    children: [wavyLineSurface(0.5, 'vertical', 0.15, 5, 3, 999)],
  },
]

/**
 * Get default mask patterns for midground layer
 */
export const getDefaultMaskPatterns: GetDefaultMaskPatterns = () => defaultMaskPatterns
