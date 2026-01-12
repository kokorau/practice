// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AssetPreviewPanel from './AssetPreviewPanel.vue'
import type { Asset } from '../../modules/Asset'

// ============================================================
// Mocks
// ============================================================

vi.mock('marked', () => ({
  marked: vi.fn((text: string) => `<p>${text}</p>`),
}))

vi.mock('prismjs', () => {
  const prism = {
    highlight: vi.fn((code: string) => code),
    languages: {
      typescript: {},
      javascript: {},
      json: {},
      css: {},
      markup: {},
    },
  }
  return { default: prism }
})

// Also mock the prism component imports which try to access Prism global
vi.mock('prismjs/components/prism-typescript', () => ({}))
vi.mock('prismjs/components/prism-javascript', () => ({}))
vi.mock('prismjs/components/prism-json', () => ({}))
vi.mock('prismjs/components/prism-css', () => ({}))
vi.mock('prismjs/components/prism-markup', () => ({}))

vi.mock('../../modules/Asset', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../modules/Asset')>()
  return {
    ...actual,
    $Asset: {
      toObjectUrl: vi.fn(() => Promise.resolve('blob:mock-url')),
      toBlob: vi.fn(() => Promise.resolve(new Blob(['test content'], { type: 'text/plain' }))),
    },
  }
})

// Mock FontFace
class MockFontFace {
  family: string
  constructor(family: string, _source: string) {
    this.family = family
  }
  load = vi.fn(() => Promise.resolve(this))
}
global.FontFace = MockFontFace as unknown as typeof FontFace

// Mock document.fonts
Object.defineProperty(document, 'fonts', {
  value: {
    add: vi.fn(),
  },
  configurable: true,
})

// Mock URL methods
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()
global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

// ============================================================
// Test Helpers
// ============================================================

function createMockAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'test-asset-1',
    name: 'test-file.png',
    data: new ArrayBuffer(100),
    meta: {
      type: 'image',
      mimeType: 'image/png',
      size: 1024,
      createdAt: new Date('2024-01-01'),
      tags: [],
      ...overrides.meta,
    },
    ...overrides,
  } as Asset
}

// ============================================================
// Tests
// ============================================================

describe('AssetPreviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('component structure', () => {
    it('renders without errors', () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: null,
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('renders preview container', () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: null,
        },
      })
      expect(wrapper.find('.preview-container').exists()).toBe(true)
    })
  })

  describe('no selection state', () => {
    it('shows empty state when no asset selected', () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: null,
        },
      })

      expect(wrapper.find('.preview-empty').exists()).toBe(true)
      expect(wrapper.text()).toContain('Select a file to preview')
    })
  })

  describe('image preview', () => {
    it('renders image preview for image assets', async () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            name: 'photo.jpg',
            meta: { type: 'image', mimeType: 'image/jpeg', size: 1024, createdAt: new Date(), tags: [] },
          }),
        },
      })

      await flushPromises()

      expect(wrapper.find('.preview-image-wrapper').exists()).toBe(true)
    })

    it('displays image with correct src', async () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            name: 'photo.jpg',
            meta: { type: 'image', mimeType: 'image/jpeg', size: 1024, createdAt: new Date(), tags: [] },
          }),
        },
      })

      await flushPromises()

      const img = wrapper.find('img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toBe('blob:mock-url')
    })
  })

  describe('font preview', () => {
    it('renders font preview for font assets', async () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            name: 'custom-font.woff2',
            meta: { type: 'font', mimeType: 'font/woff2', size: 2048, createdAt: new Date(), tags: [] },
          }),
        },
      })

      await flushPromises()

      expect(wrapper.find('.preview-font').exists()).toBe(true)
    })

    it('displays font samples at different sizes', async () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            name: 'custom-font.woff2',
            meta: { type: 'font', mimeType: 'font/woff2', size: 2048, createdAt: new Date(), tags: [] },
          }),
        },
      })

      await flushPromises()

      const samples = wrapper.findAll('.font-sample')
      expect(samples.length).toBeGreaterThan(0)
    })
  })

  describe('markdown preview', () => {
    it('renders markdown preview for .md files', async () => {
      const { $Asset } = await import('../../modules/Asset')
      vi.mocked($Asset.toBlob).mockResolvedValueOnce(new Blob(['# Hello World'], { type: 'text/markdown' }))

      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            name: 'readme.md',
            meta: { type: 'document', mimeType: 'text/markdown', size: 512, createdAt: new Date(), tags: [] },
          }),
        },
      })

      await flushPromises()

      expect(wrapper.find('.preview-markdown').exists()).toBe(true)
    })
  })

  describe('code preview', () => {
    it('renders code preview for code files', async () => {
      const { $Asset } = await import('../../modules/Asset')
      vi.mocked($Asset.toBlob).mockResolvedValueOnce(new Blob(['const x = 1;'], { type: 'text/javascript' }))

      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            name: 'script.ts',
            meta: { type: 'code', mimeType: 'text/typescript', size: 256, createdAt: new Date(), tags: [] },
          }),
        },
      })

      await flushPromises()

      expect(wrapper.find('.preview-code').exists()).toBe(true)
    })

    it('supports various code file extensions', async () => {
      const extensions = ['.ts', '.js', '.json', '.css', '.html']

      for (const ext of extensions) {
        const { $Asset } = await import('../../modules/Asset')
        vi.mocked($Asset.toBlob).mockResolvedValueOnce(new Blob(['content'], { type: 'text/plain' }))

        const wrapper = mount(AssetPreviewPanel, {
          props: {
            asset: createMockAsset({
              name: `file${ext}`,
              meta: { type: 'code', mimeType: 'text/plain', size: 100, createdAt: new Date(), tags: [] },
            }),
          },
        })

        await flushPromises()

        expect(wrapper.find('.preview-code').exists()).toBe(true)

        wrapper.unmount()
      }
    })
  })

  describe('text preview', () => {
    it('renders text preview for plain text files', async () => {
      const { $Asset } = await import('../../modules/Asset')
      vi.mocked($Asset.toBlob).mockResolvedValueOnce(new Blob(['plain text content'], { type: 'text/plain' }))

      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            name: 'notes.txt',
            meta: { type: 'document', mimeType: 'text/plain', size: 100, createdAt: new Date(), tags: [] },
          }),
        },
      })

      await flushPromises()

      expect(wrapper.find('.preview-text').exists()).toBe(true)
    })
  })

  describe('unsupported preview', () => {
    it('shows unsupported message for video', () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            name: 'video.mp4',
            meta: { type: 'video', mimeType: 'video/mp4', size: 10240, createdAt: new Date(), tags: [] },
          }),
        },
      })

      expect(wrapper.text()).toContain('Video preview not implemented')
    })

    it('shows unsupported message for audio', () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            name: 'audio.mp3',
            meta: { type: 'audio', mimeType: 'audio/mp3', size: 5120, createdAt: new Date(), tags: [] },
          }),
        },
      })

      expect(wrapper.text()).toContain('Audio preview not implemented')
    })

    it('shows no preview message for unknown types', () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            name: 'data.bin',
            meta: { type: 'unknown', mimeType: 'application/octet-stream', size: 1024, createdAt: new Date(), tags: [] },
          }),
        },
      })

      expect(wrapper.text()).toContain('No preview available')
    })
  })

  describe('info panel', () => {
    it('displays file name', async () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({ name: 'my-file.png' }),
        },
      })

      await flushPromises()

      expect(wrapper.find('.info-filename').text()).toBe('my-file.png')
    })

    it('displays file type', async () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            meta: { type: 'image', mimeType: 'image/png', size: 1024, createdAt: new Date(), tags: [] },
          }),
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('image/png')
    })

    it('displays formatted file size', async () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            meta: { type: 'image', mimeType: 'image/png', size: 1536, createdAt: new Date(), tags: [] },
          }),
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('1.5 KB')
    })

    it('displays tags when present', async () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            meta: { type: 'image', mimeType: 'image/png', size: 1024, createdAt: new Date(), tags: ['tag1', 'tag2'] },
          }),
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('tag1')
      expect(wrapper.text()).toContain('tag2')
    })
  })

  describe('loading state', () => {
    it('shows loading state while asset is being loaded', async () => {
      const { $Asset } = await import('../../modules/Asset')

      // Delay the promise
      let resolvePromise: (value: string) => void
      vi.mocked($Asset.toObjectUrl).mockReturnValueOnce(
        new Promise(resolve => { resolvePromise = resolve })
      )

      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset(),
        },
      })

      // Should show loading initially
      expect(wrapper.find('.preview-loading').exists()).toBe(true)

      // Resolve the promise
      resolvePromise!('blob:url')
      await flushPromises()

      // Loading should be gone
      expect(wrapper.find('.preview-loading').exists()).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('revokes object URL when asset changes', async () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({ id: 'asset-1' }),
        },
      })

      await flushPromises()

      await wrapper.setProps({
        asset: createMockAsset({ id: 'asset-2' }),
      })

      await flushPromises()

      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })

    it('revokes object URL on unmount', async () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset(),
        },
      })

      await flushPromises()
      wrapper.unmount()

      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })
  })

  describe('size formatting', () => {
    it('formats bytes correctly', async () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            meta: { type: 'image', mimeType: 'image/png', size: 500, createdAt: new Date(), tags: [] },
          }),
        },
      })

      await flushPromises()
      expect(wrapper.text()).toContain('500 B')
    })

    it('formats KB correctly', async () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            meta: { type: 'image', mimeType: 'image/png', size: 2048, createdAt: new Date(), tags: [] },
          }),
        },
      })

      await flushPromises()
      expect(wrapper.text()).toContain('2.0 KB')
    })

    it('formats MB correctly', async () => {
      const wrapper = mount(AssetPreviewPanel, {
        props: {
          asset: createMockAsset({
            meta: { type: 'image', mimeType: 'image/png', size: 2 * 1024 * 1024, createdAt: new Date(), tags: [] },
          }),
        },
      })

      await flushPromises()
      expect(wrapper.text()).toContain('2.0 MB')
    })
  })
})
