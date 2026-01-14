import { describe, it, expect, vi } from 'vitest'
import { ref, computed } from 'vue'
import { useEffectorManager, type UseEffectorManagerOptions, type FilterProps } from './useEffectorManager'

// ============================================================
// Mock Data
// ============================================================

const createMockFilterProps = (): FilterProps => ({
  selectedType: computed({
    get: () => 'void' as const,
    set: () => {},
  }),
  vignetteConfig: computed({
    get: () => ({}),
    set: () => {},
  }),
  chromaticConfig: computed({
    get: () => ({}),
    set: () => {},
  }),
  dotHalftoneConfig: computed({
    get: () => ({}),
    set: () => {},
  }),
  lineHalftoneConfig: computed({
    get: () => ({}),
    set: () => {},
  }),
  blurConfig: computed({
    get: () => ({}),
    set: () => {},
  }),
})

const createMockOptions = (overrides?: Partial<UseEffectorManagerOptions>): UseEffectorManagerOptions => ({
  filterProps: createMockFilterProps(),
  maskShapePatterns: ref([
    { label: 'Circle', createSpec: () => null as any },
    { label: 'Rect', createSpec: () => null as any },
  ]) as any,
  selectedMaskShapeIndex: ref(0),
  maskShapeSchema: computed(() => null),
  maskShapeParams: computed(() => ({ type: 'circle' })),
  maskOuterColor: computed(() => ({ r: 1, g: 1, b: 1, a: 1 })) as any,
  maskInnerColor: computed(() => ({ r: 0, g: 0, b: 0, a: 1 })) as any,
  createBackgroundThumbnailSpec: () => null as any,
  onSelectMaskShape: vi.fn(),
  onUpdateMaskShapeParams: vi.fn(),
  ...overrides,
})

// ============================================================
// Tests
// ============================================================

describe('useEffectorManager', () => {
  describe('initial state', () => {
    it('returns null selectedEffectorType initially', () => {
      const options = createMockOptions()
      const { selectedEffectorType } = useEffectorManager(options)

      expect(selectedEffectorType.value).toBeNull()
    })

    it('returns filterProps from options', () => {
      const mockFilterProps = createMockFilterProps()
      const options = createMockOptions({ filterProps: mockFilterProps })
      const { filterProps } = useEffectorManager(options)

      expect(filterProps).toBe(mockFilterProps)
    })

    it('returns computed maskProps from options', () => {
      const options = createMockOptions()
      const { maskProps } = useEffectorManager(options)

      expect(maskProps.value.shapePatterns).toHaveLength(2)
      expect(maskProps.value.selectedShapeIndex).toBe(0)
      expect(maskProps.value.shapeParams).toEqual({ type: 'circle' })
    })
  })

  describe('selectEffectorType', () => {
    it('sets selectedEffectorType to effect', () => {
      const options = createMockOptions()
      const { selectedEffectorType, selectEffectorType } = useEffectorManager(options)

      selectEffectorType('effect')

      expect(selectedEffectorType.value).toBe('effect')
    })

    it('sets selectedEffectorType to mask', () => {
      const options = createMockOptions()
      const { selectedEffectorType, selectEffectorType } = useEffectorManager(options)

      selectEffectorType('mask')

      expect(selectedEffectorType.value).toBe('mask')
    })

    it('clears selectedEffectorType when null', () => {
      const options = createMockOptions()
      const { selectedEffectorType, selectEffectorType } = useEffectorManager(options)

      selectEffectorType('effect')
      selectEffectorType(null)

      expect(selectedEffectorType.value).toBeNull()
    })
  })

  describe('mask operations', () => {
    it('calls onSelectMaskShape when selectMaskShape is called', () => {
      const onSelectMaskShape = vi.fn()
      const options = createMockOptions({ onSelectMaskShape })
      const { selectMaskShape } = useEffectorManager(options)

      selectMaskShape(1)

      expect(onSelectMaskShape).toHaveBeenCalledWith(1)
    })

    it('calls onUpdateMaskShapeParams when updateMaskShapeParams is called', () => {
      const onUpdateMaskShapeParams = vi.fn()
      const options = createMockOptions({ onUpdateMaskShapeParams })
      const { updateMaskShapeParams } = useEffectorManager(options)

      const newParams = { type: 'rect', width: 0.5 }
      updateMaskShapeParams(newParams)

      expect(onUpdateMaskShapeParams).toHaveBeenCalledWith(newParams)
    })
  })

  describe('maskProps reactivity', () => {
    it('updates maskProps when source refs change', () => {
      const selectedIndex = ref<number | null>(0)
      const options = createMockOptions({ selectedMaskShapeIndex: selectedIndex })
      const { maskProps } = useEffectorManager(options)

      expect(maskProps.value.selectedShapeIndex).toBe(0)

      selectedIndex.value = 1

      expect(maskProps.value.selectedShapeIndex).toBe(1)
    })

    it('updates maskProps.shapePatterns when source changes', () => {
      const patterns = ref([{ label: 'Circle', createSpec: () => null as any }]) as any
      const options = createMockOptions({ maskShapePatterns: patterns })
      const { maskProps } = useEffectorManager(options)

      expect(maskProps.value.shapePatterns).toHaveLength(1)

      patterns.value = [
        { label: 'Circle', createSpec: () => null as any },
        { label: 'Rect', createSpec: () => null as any },
        { label: 'Blob', createSpec: () => null as any },
      ]

      expect(maskProps.value.shapePatterns).toHaveLength(3)
    })
  })
})
