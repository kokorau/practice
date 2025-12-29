import type { MaskPattern } from '../Domain'
import type { GetDefaultMaskPatterns } from '../Application'
import {
  createCircleMaskSpec,
  createRectMaskSpec,
  createBlobMaskSpec,
} from '../shaders'

/**
 * Default mask patterns for midground layer
 */
const defaultMaskPatterns: MaskPattern[] = [
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
]

/**
 * Get default mask patterns for midground layer
 */
export const getDefaultMaskPatterns: GetDefaultMaskPatterns = () => defaultMaskPatterns
