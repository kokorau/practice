/**
 * SectionContent - セクションの実装（実際のコンテンツ）
 *
 * SectionMeta で定義された構造に対して、実際の値を保持する。
 * templateId は任意の文字列で、Infra 層のテンプレートを参照。
 */

// ============================================================
// Slot Values
// ============================================================

export type TextSlotValue = {
  readonly type: 'text'
  readonly value: string
}

export type RichtextSlotValue = {
  readonly type: 'richtext'
  readonly value: string
}

export type ImageSlotValue = {
  readonly type: 'image'
  readonly src: string
  readonly alt: string
}

export type ButtonSlotValue = {
  readonly type: 'button'
  readonly label: string
  readonly variant: 'primary' | 'secondary' | 'accent'
}

export type ListSlotValue = {
  readonly type: 'list'
  readonly items: readonly ListItem[]
}

export type ListItem = {
  readonly id: string
  readonly title: string
  readonly description?: string
  readonly icon?: string
}

export type SlotValue =
  | TextSlotValue
  | RichtextSlotValue
  | ImageSlotValue
  | ButtonSlotValue
  | ListSlotValue

// ============================================================
// Section Content
// ============================================================

export type SectionContent = {
  readonly id: string
  readonly templateId: string
  readonly slots: Readonly<Record<string, SlotValue>>
}

// ============================================================
// Factory
// ============================================================

let sectionIdCounter = 0

export const $SectionContent = {
  create(templateId: string, slots: Record<string, SlotValue> = {}): SectionContent {
    return {
      id: `section-${++sectionIdCounter}`,
      templateId,
      slots,
    }
  },

  createWithId(id: string, templateId: string, slots: Record<string, SlotValue> = {}): SectionContent {
    return { id, templateId, slots }
  },

  getSlotValue<T extends SlotValue>(section: SectionContent, slotId: string): T | undefined {
    return section.slots[slotId] as T | undefined
  },

  setSlotValue(section: SectionContent, slotId: string, value: SlotValue): SectionContent {
    return {
      ...section,
      slots: {
        ...section.slots,
        [slotId]: value,
      },
    }
  },

  setTemplateId(section: SectionContent, templateId: string): SectionContent {
    return { ...section, templateId }
  },

  // === Slot Value Factories ===

  text(value: string): TextSlotValue {
    return { type: 'text', value }
  },

  richtext(value: string): RichtextSlotValue {
    return { type: 'richtext', value }
  },

  image(src: string, alt: string): ImageSlotValue {
    return { type: 'image', src, alt }
  },

  button(label: string, variant: ButtonSlotValue['variant'] = 'primary'): ButtonSlotValue {
    return { type: 'button', label, variant }
  },

  list(items: ListItem[]): ListSlotValue {
    return { type: 'list', items }
  },

  listItem(id: string, title: string, description?: string): ListItem {
    return { id, title, description }
  },
}
