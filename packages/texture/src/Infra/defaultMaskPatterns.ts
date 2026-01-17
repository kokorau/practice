import type { MaskPattern } from '../Domain'
import type { GetDefaultMaskPatterns } from '../Application'
import {
  createCircleMaskSpec,
  createRectMaskSpec,
  createBlobMaskSpec,
  createPerlinMaskSpec,
  createLinearGradientMaskSpec,
  createRadialGradientMaskSpec,
  createBoxGradientMaskSpec,
  createWavyLineMaskSpec,
} from '../shaders'

/**
 * Default mask patterns for midground layer
 * Ordered: Normal (cutout=false, shape filled) first, then Invert (cutout=true, shape cutout)
 */
const defaultMaskPatterns: MaskPattern[] = [
  // ============================================================
  // Normal patterns (cutout=false) - shape is filled, outside is transparent
  // ============================================================
  {
    label: 'Solid Circle Center',
    maskConfig: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createCircleMaskSpec(
        { centerX: 0.5, centerY: 0.5, radius: 0.3, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Solid Circle Large',
    maskConfig: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.5, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createCircleMaskSpec(
        { centerX: 0.5, centerY: 0.5, radius: 0.5, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Solid Rounded Center',
    maskConfig: { type: 'rect', left: 0.25, right: 0.75, top: 0.15, bottom: 0.85, radiusTopLeft: 0.05, radiusTopRight: 0.05, radiusBottomLeft: 0.05, radiusBottomRight: 0.05, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.25, right: 0.75, top: 0.15, bottom: 0.85, radius: 0.05, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Solid Pill',
    maskConfig: { type: 'rect', left: 0.32, right: 0.68, top: 0.05, bottom: 0.95, radiusTopLeft: 0.18, radiusTopRight: 0.18, radiusBottomLeft: 0.18, radiusBottomRight: 0.18, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.32, right: 0.68, top: 0.05, bottom: 0.95, radius: 0.18, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Solid Blob',
    maskConfig: { type: 'blob', centerX: 0.5, centerY: 0.5, baseRadius: 0.4, amplitude: 0.08, octaves: 2, seed: 1, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createBlobMaskSpec(
        {
          centerX: 0.5,
          centerY: 0.5,
          baseRadius: 0.4,
          amplitude: 0.08,
          frequency: 0,
          octaves: 2,
          seed: 1,
          innerColor: c1,
          outerColor: c2,
          cutout: false,
        },
        viewport!
      ),
  },
  // ============================================================
  // Invert patterns (cutout=true) - shape is cutout, outside is filled
  // ============================================================
  {
    label: 'Circle Center',
    maskConfig: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3 },
    createSpec: (c1, c2, viewport) =>
      createCircleMaskSpec(
        { centerX: 0.5, centerY: 0.5, radius: 0.3, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Circle Large',
    maskConfig: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.5 },
    createSpec: (c1, c2, viewport) =>
      createCircleMaskSpec(
        { centerX: 0.5, centerY: 0.5, radius: 0.5, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Circle Top-Left',
    maskConfig: { type: 'circle', centerX: 0.25, centerY: 0.25, radius: 0.35 },
    createSpec: (c1, c2, viewport) =>
      createCircleMaskSpec(
        { centerX: 0.25, centerY: 0.25, radius: 0.35, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Circle Bottom-Right',
    maskConfig: { type: 'circle', centerX: 0.75, centerY: 0.75, radius: 0.35 },
    createSpec: (c1, c2, viewport) =>
      createCircleMaskSpec(
        { centerX: 0.75, centerY: 0.75, radius: 0.35, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Half Top',
    maskConfig: { type: 'rect', left: 0, right: 1, top: 0, bottom: 0.5 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0, right: 1, top: 0, bottom: 0.5, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Half Bottom',
    maskConfig: { type: 'rect', left: 0, right: 1, top: 0.5, bottom: 1 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0, right: 1, top: 0.5, bottom: 1, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Half Left',
    maskConfig: { type: 'rect', left: 0, right: 0.5, top: 0, bottom: 1 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0, right: 0.5, top: 0, bottom: 1, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Half Right',
    maskConfig: { type: 'rect', left: 0.5, right: 1, top: 0, bottom: 1 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.5, right: 1, top: 0, bottom: 1, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Rect Center',
    maskConfig: { type: 'rect', left: 0.3, right: 0.7, top: 0.1, bottom: 0.9 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.3, right: 0.7, top: 0.1, bottom: 0.9, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Rect Center Narrow',
    maskConfig: { type: 'rect', left: 0.35, right: 0.65, top: 0.1, bottom: 0.9 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.35, right: 0.65, top: 0.1, bottom: 0.9, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Rect Frame',
    maskConfig: { type: 'rect', left: 0.1, right: 0.9, top: 0.1, bottom: 0.9 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.1, right: 0.9, top: 0.1, bottom: 0.9, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Rect Top',
    maskConfig: { type: 'rect', left: 0.1, right: 0.9, top: 0.05, bottom: 0.5 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.1, right: 0.9, top: 0.05, bottom: 0.5, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Rect Bottom',
    maskConfig: { type: 'rect', left: 0.1, right: 0.9, top: 0.5, bottom: 0.95 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.1, right: 0.9, top: 0.5, bottom: 0.95, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Rounded Center',
    maskConfig: { type: 'rect', left: 0.25, right: 0.75, top: 0.15, bottom: 0.85, radiusTopLeft: 0.05, radiusTopRight: 0.05, radiusBottomLeft: 0.05, radiusBottomRight: 0.05 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.25, right: 0.75, top: 0.15, bottom: 0.85, radius: 0.05, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Rounded Frame',
    maskConfig: { type: 'rect', left: 0.1, right: 0.9, top: 0.1, bottom: 0.9, radiusTopLeft: 0.03, radiusTopRight: 0.03, radiusBottomLeft: 0.03, radiusBottomRight: 0.03 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.1, right: 0.9, top: 0.1, bottom: 0.9, radius: 0.03, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Pill Narrow',
    maskConfig: { type: 'rect', left: 0.32, right: 0.68, top: 0.05, bottom: 0.95, radiusTopLeft: 0.18, radiusTopRight: 0.18, radiusBottomLeft: 0.18, radiusBottomRight: 0.18 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.32, right: 0.68, top: 0.05, bottom: 0.95, radius: 0.18, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Arch Top',
    maskConfig: { type: 'rect', left: 0.35, right: 0.65, top: 0, bottom: 0.9, radiusTopLeft: 0, radiusTopRight: 0, radiusBottomLeft: 0.15, radiusBottomRight: 0.15 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        {
          left: 0.35, right: 0.65, top: 0, bottom: 0.9,
          radiusTopLeft: 0, radiusTopRight: 0,
          radiusBottomLeft: 0.15, radiusBottomRight: 0.15,
          innerColor: c1, outerColor: c2,
        },
        viewport!
      ),
  },
  {
    label: 'Arch Bottom',
    maskConfig: { type: 'rect', left: 0.35, right: 0.65, top: 0.1, bottom: 1, radiusTopLeft: 0.15, radiusTopRight: 0.15, radiusBottomLeft: 0, radiusBottomRight: 0 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        {
          left: 0.35, right: 0.65, top: 0.1, bottom: 1,
          radiusTopLeft: 0.15, radiusTopRight: 0.15,
          radiusBottomLeft: 0, radiusBottomRight: 0,
          innerColor: c1, outerColor: c2,
        },
        viewport!
      ),
  },
  {
    label: 'Rounded Left',
    maskConfig: { type: 'rect', left: 0, right: 0.55, top: 0.1, bottom: 0.9, radiusTopLeft: 0, radiusBottomLeft: 0, radiusTopRight: 0.04, radiusBottomRight: 0.04 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        {
          left: 0, right: 0.55, top: 0.1, bottom: 0.9,
          radiusTopLeft: 0, radiusBottomLeft: 0,
          radiusTopRight: 0.04, radiusBottomRight: 0.04,
          innerColor: c1, outerColor: c2,
        },
        viewport!
      ),
  },
  {
    label: 'Rounded Right',
    maskConfig: { type: 'rect', left: 0.45, right: 1, top: 0.1, bottom: 0.9, radiusTopLeft: 0.04, radiusBottomLeft: 0.04, radiusTopRight: 0, radiusBottomRight: 0 },
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        {
          left: 0.45, right: 1, top: 0.1, bottom: 0.9,
          radiusTopLeft: 0.04, radiusBottomLeft: 0.04,
          radiusTopRight: 0, radiusBottomRight: 0,
          innerColor: c1, outerColor: c2,
        },
        viewport!
      ),
  },
  {
    label: 'Blob Soft',
    maskConfig: { type: 'blob', centerX: 0.5, centerY: 0.5, baseRadius: 0.4, amplitude: 0.08, octaves: 2, seed: 1 },
    createSpec: (c1, c2, viewport) =>
      createBlobMaskSpec(
        {
          centerX: 0.5,
          centerY: 0.5,
          baseRadius: 0.4,
          amplitude: 0.08,
          frequency: 0,
          octaves: 2,
          seed: 1,
          innerColor: c1,
          outerColor: c2,
        },
        viewport!
      ),
  },
  {
    label: 'Blob Organic',
    maskConfig: { type: 'blob', centerX: 0.5, centerY: 0.5, baseRadius: 0.4, amplitude: 0.12, octaves: 3, seed: 42 },
    createSpec: (c1, c2, viewport) =>
      createBlobMaskSpec(
        {
          centerX: 0.5,
          centerY: 0.5,
          baseRadius: 0.4,
          amplitude: 0.12,
          frequency: 0,
          octaves: 3,
          seed: 42,
          innerColor: c1,
          outerColor: c2,
        },
        viewport!
      ),
  },
  {
    label: 'Perlin Noise',
    maskConfig: { type: 'perlin', seed: 12345, threshold: 0.5, scale: 4, octaves: 4 },
    createSpec: (c1, c2, viewport) =>
      createPerlinMaskSpec(
        { seed: 12345, threshold: 0.5, scale: 4, octaves: 4, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Perlin Dense',
    maskConfig: { type: 'perlin', seed: 99, threshold: 0.4, scale: 6, octaves: 5 },
    createSpec: (c1, c2, viewport) =>
      createPerlinMaskSpec(
        { seed: 99, threshold: 0.4, scale: 6, octaves: 5, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Perlin Sparse',
    maskConfig: { type: 'perlin', seed: 42, threshold: 0.6, scale: 3, octaves: 3 },
    createSpec: (c1, c2, viewport) =>
      createPerlinMaskSpec(
        { seed: 42, threshold: 0.6, scale: 3, octaves: 3, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  // ============================================================
  // Linear Gradient patterns
  // ============================================================
  {
    label: 'Fade Right',
    maskConfig: { type: 'linearGradient', angle: 0, startOffset: 0.3, endOffset: 0.7, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createLinearGradientMaskSpec(
        { angle: 0, startOffset: 0.3, endOffset: 0.7, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Fade Left',
    maskConfig: { type: 'linearGradient', angle: 180, startOffset: 0.3, endOffset: 0.7, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createLinearGradientMaskSpec(
        { angle: 180, startOffset: 0.3, endOffset: 0.7, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Fade Down',
    maskConfig: { type: 'linearGradient', angle: 90, startOffset: 0.3, endOffset: 0.7, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createLinearGradientMaskSpec(
        { angle: 90, startOffset: 0.3, endOffset: 0.7, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Fade Up',
    maskConfig: { type: 'linearGradient', angle: 270, startOffset: 0.3, endOffset: 0.7, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createLinearGradientMaskSpec(
        { angle: 270, startOffset: 0.3, endOffset: 0.7, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Fade Diagonal',
    maskConfig: { type: 'linearGradient', angle: 45, startOffset: 0.2, endOffset: 0.8, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createLinearGradientMaskSpec(
        { angle: 45, startOffset: 0.2, endOffset: 0.8, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Fade Sharp Right',
    maskConfig: { type: 'linearGradient', angle: 0, startOffset: 0.45, endOffset: 0.55, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createLinearGradientMaskSpec(
        { angle: 0, startOffset: 0.45, endOffset: 0.55, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  // ============================================================
  // Radial Gradient patterns
  // ============================================================
  {
    label: 'Vignette Center',
    maskConfig: { type: 'radialGradient', centerX: 0.5, centerY: 0.5, innerRadius: 0.2, outerRadius: 0.6, aspectRatio: 1, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createRadialGradientMaskSpec(
        { centerX: 0.5, centerY: 0.5, innerRadius: 0.2, outerRadius: 0.6, aspectRatio: 1, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Vignette Large',
    maskConfig: { type: 'radialGradient', centerX: 0.5, centerY: 0.5, innerRadius: 0.3, outerRadius: 0.8, aspectRatio: 1, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createRadialGradientMaskSpec(
        { centerX: 0.5, centerY: 0.5, innerRadius: 0.3, outerRadius: 0.8, aspectRatio: 1, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Spotlight',
    maskConfig: { type: 'radialGradient', centerX: 0.5, centerY: 0.5, innerRadius: 0, outerRadius: 0.4, aspectRatio: 1, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createRadialGradientMaskSpec(
        { centerX: 0.5, centerY: 0.5, innerRadius: 0, outerRadius: 0.4, aspectRatio: 1, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Spotlight Top-Left',
    maskConfig: { type: 'radialGradient', centerX: 0.25, centerY: 0.25, innerRadius: 0, outerRadius: 0.5, aspectRatio: 1, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createRadialGradientMaskSpec(
        { centerX: 0.25, centerY: 0.25, innerRadius: 0, outerRadius: 0.5, aspectRatio: 1, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Spotlight Bottom-Right',
    maskConfig: { type: 'radialGradient', centerX: 0.75, centerY: 0.75, innerRadius: 0, outerRadius: 0.5, aspectRatio: 1, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createRadialGradientMaskSpec(
        { centerX: 0.75, centerY: 0.75, innerRadius: 0, outerRadius: 0.5, aspectRatio: 1, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Ellipse Horizontal',
    maskConfig: { type: 'radialGradient', centerX: 0.5, centerY: 0.5, innerRadius: 0.1, outerRadius: 0.5, aspectRatio: 0.5, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createRadialGradientMaskSpec(
        { centerX: 0.5, centerY: 0.5, innerRadius: 0.1, outerRadius: 0.5, aspectRatio: 0.5, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Ellipse Vertical',
    maskConfig: { type: 'radialGradient', centerX: 0.5, centerY: 0.5, innerRadius: 0.1, outerRadius: 0.5, aspectRatio: 2, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createRadialGradientMaskSpec(
        { centerX: 0.5, centerY: 0.5, innerRadius: 0.1, outerRadius: 0.5, aspectRatio: 2, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Vignette Inverted',
    maskConfig: { type: 'radialGradient', centerX: 0.5, centerY: 0.5, innerRadius: 0.2, outerRadius: 0.6, aspectRatio: 1, cutout: true },
    createSpec: (c1, c2, viewport) =>
      createRadialGradientMaskSpec(
        { centerX: 0.5, centerY: 0.5, innerRadius: 0.2, outerRadius: 0.6, aspectRatio: 1, innerColor: c1, outerColor: c2, cutout: true },
        viewport!
      ),
  },
  // ============================================================
  // Box Gradient patterns (rectangular vignette)
  // ============================================================
  {
    label: 'Box Frame',
    maskConfig: { type: 'boxGradient', left: 0.15, right: 0.15, top: 0.15, bottom: 0.15, cornerRadius: 0, curve: 'smooth', cutout: false },
    createSpec: (c1, c2, viewport) =>
      createBoxGradientMaskSpec(
        { left: 0.15, right: 0.15, top: 0.15, bottom: 0.15, cornerRadius: 0, curve: 'smooth', innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Box Frame Narrow',
    maskConfig: { type: 'boxGradient', left: 0.08, right: 0.08, top: 0.08, bottom: 0.08, cornerRadius: 0, curve: 'smooth', cutout: false },
    createSpec: (c1, c2, viewport) =>
      createBoxGradientMaskSpec(
        { left: 0.08, right: 0.08, top: 0.08, bottom: 0.08, cornerRadius: 0, curve: 'smooth', innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Box Frame Wide',
    maskConfig: { type: 'boxGradient', left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, cornerRadius: 0, curve: 'smooth', cutout: false },
    createSpec: (c1, c2, viewport) =>
      createBoxGradientMaskSpec(
        { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, cornerRadius: 0, curve: 'smooth', innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Box Rounded',
    maskConfig: { type: 'boxGradient', left: 0.15, right: 0.15, top: 0.15, bottom: 0.15, cornerRadius: 0.5, curve: 'smooth', cutout: false },
    createSpec: (c1, c2, viewport) =>
      createBoxGradientMaskSpec(
        { left: 0.15, right: 0.15, top: 0.15, bottom: 0.15, cornerRadius: 0.5, curve: 'smooth', innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Box Top-Bottom',
    maskConfig: { type: 'boxGradient', left: 0, right: 0, top: 0.2, bottom: 0.2, cornerRadius: 0, curve: 'smooth', cutout: false },
    createSpec: (c1, c2, viewport) =>
      createBoxGradientMaskSpec(
        { left: 0, right: 0, top: 0.2, bottom: 0.2, cornerRadius: 0, curve: 'smooth', innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Box Left-Right',
    maskConfig: { type: 'boxGradient', left: 0.2, right: 0.2, top: 0, bottom: 0, cornerRadius: 0, curve: 'smooth', cutout: false },
    createSpec: (c1, c2, viewport) =>
      createBoxGradientMaskSpec(
        { left: 0.2, right: 0.2, top: 0, bottom: 0, cornerRadius: 0, curve: 'smooth', innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Letterbox',
    maskConfig: { type: 'boxGradient', left: 0, right: 0, top: 0.12, bottom: 0.12, cornerRadius: 0, curve: 'linear', cutout: false },
    createSpec: (c1, c2, viewport) =>
      createBoxGradientMaskSpec(
        { left: 0, right: 0, top: 0.12, bottom: 0.12, cornerRadius: 0, curve: 'linear', innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Box Asymmetric',
    maskConfig: { type: 'boxGradient', left: 0.1, right: 0.2, top: 0.15, bottom: 0.25, cornerRadius: 0, curve: 'smooth', cutout: false },
    createSpec: (c1, c2, viewport) =>
      createBoxGradientMaskSpec(
        { left: 0.1, right: 0.2, top: 0.15, bottom: 0.25, cornerRadius: 0, curve: 'smooth', innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  // ============================================================
  // Wavy Line patterns (organic dividing lines)
  // ============================================================
  {
    label: 'Wavy Half Left',
    maskConfig: { type: 'wavyLine', position: 0.5, direction: 'vertical', amplitude: 0.08, frequency: 3, octaves: 2, seed: 42, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createWavyLineMaskSpec(
        { position: 0.5, direction: 'vertical', amplitude: 0.08, frequency: 3, octaves: 2, seed: 42, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Wavy Half Right',
    maskConfig: { type: 'wavyLine', position: 0.5, direction: 'vertical', amplitude: 0.08, frequency: 3, octaves: 2, seed: 42, cutout: true },
    createSpec: (c1, c2, viewport) =>
      createWavyLineMaskSpec(
        { position: 0.5, direction: 'vertical', amplitude: 0.08, frequency: 3, octaves: 2, seed: 42, innerColor: c1, outerColor: c2, cutout: true },
        viewport!
      ),
  },
  {
    label: 'Wavy Half Top',
    maskConfig: { type: 'wavyLine', position: 0.5, direction: 'horizontal', amplitude: 0.08, frequency: 3, octaves: 2, seed: 42, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createWavyLineMaskSpec(
        { position: 0.5, direction: 'horizontal', amplitude: 0.08, frequency: 3, octaves: 2, seed: 42, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Wavy Half Bottom',
    maskConfig: { type: 'wavyLine', position: 0.5, direction: 'horizontal', amplitude: 0.08, frequency: 3, octaves: 2, seed: 42, cutout: true },
    createSpec: (c1, c2, viewport) =>
      createWavyLineMaskSpec(
        { position: 0.5, direction: 'horizontal', amplitude: 0.08, frequency: 3, octaves: 2, seed: 42, innerColor: c1, outerColor: c2, cutout: true },
        viewport!
      ),
  },
  {
    label: 'Wavy Third Left',
    maskConfig: { type: 'wavyLine', position: 0.33, direction: 'vertical', amplitude: 0.06, frequency: 4, octaves: 2, seed: 123, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createWavyLineMaskSpec(
        { position: 0.33, direction: 'vertical', amplitude: 0.06, frequency: 4, octaves: 2, seed: 123, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Wavy Third Right',
    maskConfig: { type: 'wavyLine', position: 0.67, direction: 'vertical', amplitude: 0.06, frequency: 4, octaves: 2, seed: 123, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createWavyLineMaskSpec(
        { position: 0.67, direction: 'vertical', amplitude: 0.06, frequency: 4, octaves: 2, seed: 123, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Wavy Gentle',
    maskConfig: { type: 'wavyLine', position: 0.5, direction: 'vertical', amplitude: 0.04, frequency: 2, octaves: 1, seed: 77, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createWavyLineMaskSpec(
        { position: 0.5, direction: 'vertical', amplitude: 0.04, frequency: 2, octaves: 1, seed: 77, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
  {
    label: 'Wavy Wild',
    maskConfig: { type: 'wavyLine', position: 0.5, direction: 'vertical', amplitude: 0.15, frequency: 5, octaves: 3, seed: 999, cutout: false },
    createSpec: (c1, c2, viewport) =>
      createWavyLineMaskSpec(
        { position: 0.5, direction: 'vertical', amplitude: 0.15, frequency: 5, octaves: 3, seed: 999, innerColor: c1, outerColor: c2, cutout: false },
        viewport!
      ),
  },
]

/**
 * Get default mask patterns for midground layer
 */
export const getDefaultMaskPatterns: GetDefaultMaskPatterns = () => defaultMaskPatterns
