/**
 * SectionMeta - セクションの型定義（メタデータ）
 *
 * セクションが「どのような構造を持つか」を定義する。
 * template は HTML テンプレート文字列。
 */

// ============================================================
// Slot Types
// ============================================================

export type SlotType = 'text' | 'richtext' | 'image' | 'button' | 'list'

export type SlotMeta = {
  readonly id: string
  readonly type: SlotType
  readonly label: string
  readonly required: boolean
}

// ============================================================
// Section Meta (Template Definition)
// ============================================================

/**
 * SectionMeta - テンプレートのメタデータ + HTML テンプレート
 *
 * template 内で使えるプレースホルダー:
 *   {{slotId}}           - スロットの値を展開
 *   {{slotId.property}}  - スロット値のプロパティ（button.label など）
 *   {{#each items}}...{{/each}} - リストのループ
 *
 * data-* 属性:
 *   data-bg="surface.base"     - 背景色
 *   data-color="text.primary"  - テキスト色
 *   data-border="surface.border" - ボーダー色
 *   data-radius="md"           - 角丸
 *   data-padding="lg"          - パディング
 */
export type SectionMeta = {
  readonly templateId: string
  readonly name: string
  readonly description: string
  readonly template: string
  readonly slots: readonly SlotMeta[]
}

export const $SectionMeta = {
  create(
    templateId: string,
    name: string,
    description: string,
    template: string,
    slots: SlotMeta[]
  ): SectionMeta {
    return { templateId, name, description, template, slots }
  },

  getSlot(meta: SectionMeta, slotId: string): SlotMeta | undefined {
    return meta.slots.find(s => s.id === slotId)
  },
}
