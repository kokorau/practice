import type { TexturePattern } from '../Domain'
import type { GetDefaultMaskPatterns } from '../Application'
import {
  createCircleMaskSpec,
  createRectMaskSpec,
  createHalfMaskSpec,
  createBlobMaskSpec,
} from '../shaders'

/**
 * Default mask patterns for midground layer
 */
const defaultMaskPatterns: TexturePattern[] = [
  {
    label: 'Circle Center',
    createSpec: (c1, c2, viewport) =>
      createCircleMaskSpec(
        { centerX: 0.5, centerY: 0.5, radius: 0.3, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Circle Large',
    createSpec: (c1, c2, viewport) =>
      createCircleMaskSpec(
        { centerX: 0.5, centerY: 0.5, radius: 0.5, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Circle Top-Left',
    createSpec: (c1, c2, viewport) =>
      createCircleMaskSpec(
        { centerX: 0.25, centerY: 0.25, radius: 0.35, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Circle Bottom-Right',
    createSpec: (c1, c2, viewport) =>
      createCircleMaskSpec(
        { centerX: 0.75, centerY: 0.75, radius: 0.35, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Half Top',
    createSpec: (c1, c2, viewport) =>
      createHalfMaskSpec({ direction: 'top', visibleColor: c1, hiddenColor: c2 }, viewport!),
  },
  {
    label: 'Half Bottom',
    createSpec: (c1, c2, viewport) =>
      createHalfMaskSpec({ direction: 'bottom', visibleColor: c1, hiddenColor: c2 }, viewport!),
  },
  {
    label: 'Half Left',
    createSpec: (c1, c2, viewport) =>
      createHalfMaskSpec({ direction: 'left', visibleColor: c1, hiddenColor: c2 }, viewport!),
  },
  {
    label: 'Half Right',
    createSpec: (c1, c2, viewport) =>
      createHalfMaskSpec({ direction: 'right', visibleColor: c1, hiddenColor: c2 }, viewport!),
  },
  {
    label: 'Rect Center',
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.3, right: 0.7, top: 0.1, bottom: 0.9, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Rect Center Narrow',
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.35, right: 0.65, top: 0.1, bottom: 0.9, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Rect Frame',
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.1, right: 0.9, top: 0.1, bottom: 0.9, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Rect Top',
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.1, right: 0.9, top: 0.05, bottom: 0.5, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Rect Bottom',
    createSpec: (c1, c2, viewport) =>
      createRectMaskSpec(
        { left: 0.1, right: 0.9, top: 0.5, bottom: 0.95, innerColor: c1, outerColor: c2 },
        viewport!
      ),
  },
  {
    label: 'Blob Soft',
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
