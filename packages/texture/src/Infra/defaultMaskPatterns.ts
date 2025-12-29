import type { TexturePattern } from '../Domain'
import type { GetDefaultMaskPatterns } from '../Application'

/**
 * Default mask patterns for midground layer
 */
const defaultMaskPatterns: TexturePattern[] = [
  {
    label: 'Circle Center',
    render: (r, c1, c2, opts) =>
      r.renderCircleMask(
        { centerX: 0.5, centerY: 0.5, radius: 0.3, innerColor: c1, outerColor: c2 },
        opts
      ),
  },
  {
    label: 'Circle Large',
    render: (r, c1, c2, opts) =>
      r.renderCircleMask(
        { centerX: 0.5, centerY: 0.5, radius: 0.5, innerColor: c1, outerColor: c2 },
        opts
      ),
  },
  {
    label: 'Circle Top-Left',
    render: (r, c1, c2, opts) =>
      r.renderCircleMask(
        { centerX: 0.25, centerY: 0.25, radius: 0.35, innerColor: c1, outerColor: c2 },
        opts
      ),
  },
  {
    label: 'Circle Bottom-Right',
    render: (r, c1, c2, opts) =>
      r.renderCircleMask(
        { centerX: 0.75, centerY: 0.75, radius: 0.35, innerColor: c1, outerColor: c2 },
        opts
      ),
  },
  {
    label: 'Half Top',
    render: (r, c1, c2, opts) =>
      r.renderHalfMask({ direction: 'top', visibleColor: c1, hiddenColor: c2 }, opts),
  },
  {
    label: 'Half Bottom',
    render: (r, c1, c2, opts) =>
      r.renderHalfMask({ direction: 'bottom', visibleColor: c1, hiddenColor: c2 }, opts),
  },
  {
    label: 'Half Left',
    render: (r, c1, c2, opts) =>
      r.renderHalfMask({ direction: 'left', visibleColor: c1, hiddenColor: c2 }, opts),
  },
  {
    label: 'Half Right',
    render: (r, c1, c2, opts) =>
      r.renderHalfMask({ direction: 'right', visibleColor: c1, hiddenColor: c2 }, opts),
  },
  {
    label: 'Rect Center',
    render: (r, c1, c2, opts) =>
      r.renderRectMask(
        { left: 0.3, right: 0.7, top: 0.1, bottom: 0.9, innerColor: c1, outerColor: c2 },
        opts
      ),
  },
  {
    label: 'Rect Center Narrow',
    render: (r, c1, c2, opts) =>
      r.renderRectMask(
        { left: 0.35, right: 0.65, top: 0.1, bottom: 0.9, innerColor: c1, outerColor: c2 },
        opts
      ),
  },
  {
    label: 'Rect Frame',
    render: (r, c1, c2, opts) =>
      r.renderRectMask(
        { left: 0.1, right: 0.9, top: 0.1, bottom: 0.9, innerColor: c1, outerColor: c2 },
        opts
      ),
  },
  {
    label: 'Rect Top',
    render: (r, c1, c2, opts) =>
      r.renderRectMask(
        { left: 0.1, right: 0.9, top: 0.05, bottom: 0.5, innerColor: c1, outerColor: c2 },
        opts
      ),
  },
  {
    label: 'Rect Bottom',
    render: (r, c1, c2, opts) =>
      r.renderRectMask(
        { left: 0.1, right: 0.9, top: 0.5, bottom: 0.95, innerColor: c1, outerColor: c2 },
        opts
      ),
  },
  {
    label: 'Blob Center',
    render: (r, c1, c2, opts) =>
      r.renderBlobMask(
        {
          centerX: 0.5,
          centerY: 0.5,
          baseRadius: 0.35,
          amplitude: 0.15,
          frequency: 4,
          octaves: 3,
          seed: 42,
          innerColor: c1,
          outerColor: c2,
        },
        opts
      ),
  },
  {
    label: 'Blob Large',
    render: (r, c1, c2, opts) =>
      r.renderBlobMask(
        {
          centerX: 0.5,
          centerY: 0.5,
          baseRadius: 0.5,
          amplitude: 0.12,
          frequency: 5,
          octaves: 3,
          seed: 123,
          innerColor: c1,
          outerColor: c2,
        },
        opts
      ),
  },
  {
    label: 'Blob Subtle',
    render: (r, c1, c2, opts) =>
      r.renderBlobMask(
        {
          centerX: 0.5,
          centerY: 0.5,
          baseRadius: 0.4,
          amplitude: 0.08,
          frequency: 3,
          octaves: 2,
          seed: 777,
          innerColor: c1,
          outerColor: c2,
        },
        opts
      ),
  },
  {
    label: 'Blob Wild',
    render: (r, c1, c2, opts) =>
      r.renderBlobMask(
        {
          centerX: 0.5,
          centerY: 0.5,
          baseRadius: 0.35,
          amplitude: 0.25,
          frequency: 6,
          octaves: 4,
          seed: 999,
          innerColor: c1,
          outerColor: c2,
        },
        opts
      ),
  },
]

/**
 * Get default mask patterns for midground layer
 */
export const getDefaultMaskPatterns: GetDefaultMaskPatterns = () => defaultMaskPatterns
