import { describe, it, expect } from 'vitest'
import {
  toRenderSpecs,
  isTextureSpec,
  isImageSpec,
  isSolidSpec,
  isTextSpec,
  isClipGroupSpec,
  type RenderContext,
  type RenderSpec,
} from './RenderSpec'
import {
  createLayer,
  createGroup,
  createProcessor,
  createMaskModifier,
  type Layer,
  type Group,
  type Processor,
  type PatternSurface,
  type SolidSurface,
  type ImageSurface,
  type TextConfig,
} from '../Domain'
import type { TexturePatternSpec } from '@practice/texture'

describe('RenderSpec', () => {
  const context: RenderContext = {
    viewport: { width: 1280, height: 720 },
    devicePixelRatio: 2,
  }

  const mockTextureSpec: TexturePatternSpec = {
    shader: 'test-shader',
    bufferSize: 64,
    blend: true,
    params: { type: 'solid', color: [1, 0, 0, 1] },
  }

  describe('toRenderSpecs', () => {
    it('should convert a base layer with pattern surface to texture render spec', () => {
      const patternSurface: PatternSurface = {
        type: 'pattern',
        spec: mockTextureSpec,
      }
      const layer = createLayer('layer-1', 'base', [patternSurface], {
        name: 'Background',
      })

      const specs = toRenderSpecs([layer], context)

      expect(specs).toHaveLength(1)
      expect(specs[0]).toBeDefined()
      expect(isTextureSpec(specs[0]!)).toBe(true)
      if (isTextureSpec(specs[0]!)) {
        expect(specs[0].id).toBe('layer-1')
        expect(specs[0].spec).toBe(mockTextureSpec)
      }
    })

    it('should convert a layer with solid surface to solid render spec', () => {
      const solidSurface: SolidSurface = {
        type: 'solid',
        color: '#ff0000',
      }
      const layer = createLayer('layer-1', 'base', [solidSurface])

      const specs = toRenderSpecs([layer], context)

      expect(specs).toHaveLength(1)
      expect(specs[0]).toBeDefined()
      expect(isSolidSpec(specs[0]!)).toBe(true)
      if (isSolidSpec(specs[0]!)) {
        expect(specs[0].color).toBe('#ff0000')
      }
    })

    it('should convert a layer with image surface to image render spec', () => {
      const imageSurface: ImageSurface = {
        type: 'image',
        source: 'https://example.com/image.jpg',
      }
      const layer = createLayer('layer-1', 'image', [imageSurface])

      const specs = toRenderSpecs([layer], context)

      expect(specs).toHaveLength(1)
      expect(specs[0]).toBeDefined()
      expect(isImageSpec(specs[0]!)).toBe(true)
      if (isImageSpec(specs[0]!)) {
        expect(specs[0].source).toBe('https://example.com/image.jpg')
      }
    })

    it('should convert a text layer to text render spec', () => {
      const textConfig: TextConfig = {
        text: 'Hello World',
        fontFamily: 'Arial',
        fontSize: 48,
        fontWeight: 700,
        letterSpacing: 0,
        lineHeight: 1.2,
        color: '#000000',
        position: { x: 0.5, y: 0.5, anchor: 'center' },
        rotation: 0,
      }
      const layer = createLayer('text-1', 'text', [], {
        textConfig,
      })

      const specs = toRenderSpecs([layer], context)

      expect(specs).toHaveLength(1)
      expect(specs[0]).toBeDefined()
      expect(isTextSpec(specs[0]!)).toBe(true)
      if (isTextSpec(specs[0]!)) {
        expect(specs[0].text).toBe('Hello World')
        expect(specs[0].fontFamily).toBe('Arial')
        expect(specs[0].fontSize).toBe(48)
      }
    })

    it('should skip invisible layers', () => {
      const solidSurface: SolidSurface = { type: 'solid', color: '#ff0000' }
      const layer = createLayer('layer-1', 'base', [solidSurface], {
        visible: false,
      })

      const specs = toRenderSpecs([layer], context)

      expect(specs).toHaveLength(0)
    })

    it('should handle multiple layers', () => {
      const surface1: SolidSurface = { type: 'solid', color: '#ff0000' }
      const surface2: SolidSurface = { type: 'solid', color: '#00ff00' }
      const layer1 = createLayer('layer-1', 'base', [surface1])
      const layer2 = createLayer('layer-2', 'surface', [surface2])

      const specs = toRenderSpecs([layer1, layer2], context)

      expect(specs).toHaveLength(2)
      expect(specs[0]?.id).toBe('layer-1')
      expect(specs[1]?.id).toBe('layer-2')
    })

    it('should recursively process group children', () => {
      const surface1: SolidSurface = { type: 'solid', color: '#ff0000' }
      const surface2: SolidSurface = { type: 'solid', color: '#00ff00' }
      const layer1 = createLayer('layer-1', 'base', [surface1])
      const layer2 = createLayer('layer-2', 'surface', [surface2])
      const group = createGroup('group-1', [layer1, layer2])

      const specs = toRenderSpecs([group], context)

      expect(specs).toHaveLength(2)
      expect(specs[0]?.id).toBe('layer-1')
      expect(specs[1]?.id).toBe('layer-2')
    })

    it('should wrap processor targets in clip group', () => {
      const surface: SolidSurface = { type: 'solid', color: '#ff0000' }
      const layer = createLayer('layer-1', 'surface', [surface])
      const processor = createProcessor('processor-1', {
        modifiers: [createMaskModifier({ shape: 'circle' })],
      })

      // At root level, processor applies to immediately preceding node
      const specs = toRenderSpecs([layer, processor], context, true)

      expect(specs).toHaveLength(1)
      expect(specs[0]).toBeDefined()
      expect(isClipGroupSpec(specs[0]!)).toBe(true)
      if (isClipGroupSpec(specs[0]!)) {
        expect(specs[0].id).toBe('processor-1')
        expect(specs[0].children).toHaveLength(1)
        expect(specs[0].mask).toBeDefined()
        expect(specs[0].mask?.shape).toBe('circle')
      }
    })

    it('should skip invisible groups', () => {
      const surface: SolidSurface = { type: 'solid', color: '#ff0000' }
      const layer = createLayer('layer-1', 'base', [surface])
      const group = createGroup('group-1', [layer], { visible: false })

      const specs = toRenderSpecs([group], context)

      expect(specs).toHaveLength(0)
    })

    it('should return empty array for empty nodes', () => {
      const specs = toRenderSpecs([], context)
      expect(specs).toHaveLength(0)
    })

    it('should skip layers with no sources', () => {
      const layer = createLayer('layer-1', 'base', [])

      const specs = toRenderSpecs([layer], context)

      expect(specs).toHaveLength(0)
    })
  })

  describe('type guards', () => {
    const textureSpec: RenderSpec = {
      id: 'test',
      name: 'Test',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      type: 'texture',
      spec: mockTextureSpec,
    }

    const imageSpec: RenderSpec = {
      id: 'test',
      name: 'Test',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      type: 'image',
      source: 'test.jpg',
    }

    const solidSpec: RenderSpec = {
      id: 'test',
      name: 'Test',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      type: 'solid',
      color: '#ff0000',
    }

    it('isTextureSpec should correctly identify texture specs', () => {
      expect(isTextureSpec(textureSpec)).toBe(true)
      expect(isTextureSpec(imageSpec)).toBe(false)
      expect(isTextureSpec(solidSpec)).toBe(false)
    })

    it('isImageSpec should correctly identify image specs', () => {
      expect(isImageSpec(imageSpec)).toBe(true)
      expect(isImageSpec(textureSpec)).toBe(false)
      expect(isImageSpec(solidSpec)).toBe(false)
    })

    it('isSolidSpec should correctly identify solid specs', () => {
      expect(isSolidSpec(solidSpec)).toBe(true)
      expect(isSolidSpec(textureSpec)).toBe(false)
      expect(isSolidSpec(imageSpec)).toBe(false)
    })
  })
})
