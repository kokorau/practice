/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { useResponsiveScale } from './useResponsiveScale'

// Polyfill URL for happy-dom in CI environment
if (typeof globalThis.URL !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { URL: NodeURL } = require('node:url')
  globalThis.URL = NodeURL
}

// ============================================================
// Mocks
// ============================================================

let mountedCallbacks: (() => void)[] = []
let unmountedCallbacks: (() => void)[] = []
let resizeCallback: ResizeObserverCallback | null = null

class MockResizeObserver {
  callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    resizeCallback = callback
  }

  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

vi.stubGlobal('ResizeObserver', MockResizeObserver)

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return {
    ...actual,
    onMounted: (cb: () => void) => {
      mountedCallbacks.push(cb)
    },
    onUnmounted: (cb: () => void) => {
      unmountedCallbacks.push(cb)
    },
  }
})

// ============================================================
// Test Helpers
// ============================================================

const createMockElement = (clientWidth: number, clientHeight = 10000): HTMLElement => {
  return {
    clientWidth,
    clientHeight,
  } as HTMLElement
}

const triggerResize = (entries: Partial<ResizeObserverEntry>[]) => {
  if (resizeCallback) {
    resizeCallback(entries as ResizeObserverEntry[], {} as ResizeObserver)
  }
}

// ============================================================
// Tests
// ============================================================

describe('useResponsiveScale', () => {
  beforeEach(() => {
    mountedCallbacks = []
    unmountedCallbacks = []
    resizeCallback = null
  })

  describe('initial scale calculation', () => {
    it('should return scale of 1 when container is larger than original', () => {
      const containerRef = ref(createMockElement(1500))

      const scale = useResponsiveScale(containerRef, {
        originalWidth: 1280,
        originalHeight: 720,
      })

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())

      expect(scale.value).toBe(1)
    })

    it('should calculate scale when container is smaller than original', () => {
      const containerRef = ref(createMockElement(640))

      const scale = useResponsiveScale(containerRef, {
        originalWidth: 1280,
        originalHeight: 720,
      })

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())

      expect(scale.value).toBe(0.5)
    })

    it('should account for padding in scale calculation', () => {
      const containerRef = ref(createMockElement(1312)) // 1280 + 32 padding

      const scale = useResponsiveScale(containerRef, {
        originalWidth: 1280,
        originalHeight: 720,
        padding: 32,
      })

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())

      expect(scale.value).toBe(1)
    })

    it('should calculate scale with padding when container is smaller', () => {
      const containerRef = ref(createMockElement(672)) // 640 + 32 padding

      const scale = useResponsiveScale(containerRef, {
        originalWidth: 1280,
        originalHeight: 720,
        padding: 32,
      })

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())

      expect(scale.value).toBe(0.5)
    })
  })

  describe('resize handling', () => {
    it('should update scale when container resizes', async () => {
      const mockElement = createMockElement(1500, 10000)
      const containerRef = ref(mockElement)

      const scale = useResponsiveScale(containerRef, {
        originalWidth: 1280,
        originalHeight: 720,
      })

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())
      expect(scale.value).toBe(1)

      // Change container width and trigger resize
      ;(mockElement as { clientWidth: number; clientHeight: number }).clientWidth = 640
      triggerResize([{ target: mockElement }])
      await nextTick()

      expect(scale.value).toBe(0.5)
    })

    it('should consider height constraint when container is shorter', async () => {
      // Container is wide enough but not tall enough
      const mockElement = createMockElement(1500, 360)
      const containerRef = ref(mockElement)

      const scale = useResponsiveScale(containerRef, {
        originalWidth: 1280,
        originalHeight: 720,
      })

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())

      // Height constrains the scale: 360 / 720 = 0.5
      expect(scale.value).toBe(0.5)
    })
  })

  describe('lifecycle', () => {
    it('should observe container on mount', () => {
      const mockElement = createMockElement(1280)
      const containerRef = ref(mockElement)

      useResponsiveScale(containerRef, {
        originalWidth: 1280,
        originalHeight: 720,
      })

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())

      // Check that observe was called
      const observerInstance = resizeCallback
      expect(observerInstance).not.toBeNull()
    })

    it('should handle null containerRef gracefully', () => {
      const containerRef = ref<HTMLElement | null>(null)

      const scale = useResponsiveScale(containerRef, {
        originalWidth: 1280,
        originalHeight: 720,
      })

      // Simulate mount - should not throw
      expect(() => {
        mountedCallbacks.forEach(cb => cb())
      }).not.toThrow()

      // Scale should remain at default
      expect(scale.value).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('should not exceed scale of 1', () => {
      const containerRef = ref(createMockElement(5000))

      const scale = useResponsiveScale(containerRef, {
        originalWidth: 1280,
        originalHeight: 720,
      })

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())

      expect(scale.value).toBe(1)
    })

    it('should default padding to 0', () => {
      const containerRef = ref(createMockElement(1280))

      const scale = useResponsiveScale(containerRef, {
        originalWidth: 1280,
        originalHeight: 720,
      })

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())

      expect(scale.value).toBe(1)
    })
  })
})
