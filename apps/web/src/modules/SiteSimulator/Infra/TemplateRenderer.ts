import type { SectionContent, SlotValue, ListSlotValue, SemanticColorToken } from '../Domain/ValueObject'
import { $ScopedStyle } from '../Domain/ValueObject'
import type { StylePack } from '../../StylePack/Domain/ValueObject'
import { roundedToCss, gapToMultiplier, paddingToMultiplier } from '../../StylePack/Domain/ValueObject'
import { TemplateRepository } from './TemplateRepository'

type RenderContext = {
  getCssColor: (token: SemanticColorToken) => string
  stylePack: StylePack
}

/**
 * TemplateRenderer - テンプレート文字列を HTML に変換
 */
export const TemplateRenderer = {
  /**
   * セクションをレンダリング
   */
  render(section: SectionContent, context: RenderContext): string {
    const meta = TemplateRepository.getMeta(section.templateId)
    if (!meta) return `<div>Unknown template: ${section.templateId}</div>`

    let html = meta.template

    // 1. {{#each items}}...{{/each}} を展開
    html = this.expandEach(html, section.slots)

    // 2. {{slotId}} や {{slotId.property}} を展開
    html = this.expandSlots(html, section.slots)

    // 3. data-* 属性をインラインスタイルに変換
    html = this.applyDataAttributes(html, context)

    // 4. スコープ用のdivでラップ
    const scopeClass = $ScopedStyle.scopeClass(section.id)
    html = $ScopedStyle.wrapHtml(html, scopeClass)

    return html
  },

  /**
   * {{#each items}}...{{/each}} を展開
   */
  expandEach(template: string, slots: Readonly<Record<string, SlotValue>>): string {
    const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g

    return template.replace(eachRegex, (_, slotId, itemTemplate) => {
      const slot = slots[slotId]
      if (!slot || slot.type !== 'list') return ''

      const listSlot = slot as ListSlotValue
      return listSlot.items
        .map(item => {
          let itemHtml = itemTemplate
          // {{prop.subprop}} 形式（ネストされたプロパティ）
          itemHtml = itemHtml.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_match: string, prop: string, subprop: string) => {
            const obj = item[prop as keyof typeof item]
            if (obj && typeof obj === 'object') {
              const value = (obj as Record<string, unknown>)[subprop]
              return value != null ? String(value) : ''
            }
            return ''
          })
          // {{title}}, {{description}} などを展開
          itemHtml = itemHtml.replace(/\{\{(\w+)\}\}/g, (_match: string, prop: string) => {
            const value = item[prop as keyof typeof item]
            return value != null ? String(value) : ''
          })
          return itemHtml
        })
        .join('\n')
    })
  },

  /**
   * {{slotId}} や {{slotId.property}} を展開
   */
  expandSlots(template: string, slots: Readonly<Record<string, SlotValue>>): string {
    // {{slotId.property}} 形式
    let html = template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, slotId, prop) => {
      const slot = slots[slotId]
      if (!slot) return ''

      // button.label, button.variant など
      const value = (slot as Record<string, unknown>)[prop]
      return value != null ? String(value) : ''
    })

    // {{slotId}} 形式（text/richtext の value）
    html = html.replace(/\{\{(\w+)\}\}/g, (_, slotId) => {
      const slot = slots[slotId]
      if (!slot) return ''

      if (slot.type === 'text' || slot.type === 'richtext') {
        return slot.value
      }
      return ''
    })

    return html
  },

  /**
   * data-* 属性をインラインスタイルに変換
   */
  applyDataAttributes(html: string, context: RenderContext): string {
    const { getCssColor, stylePack } = context

    // DOMParser でパース
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
    const container = doc.body.firstChild as HTMLElement

    // 全要素を走査
    const elements = container.querySelectorAll('*')
    elements.forEach(el => {
      const styles: string[] = []

      // data-bg
      const bg = el.getAttribute('data-bg')
      if (bg) {
        // "primary" や "accent" は brand.primary / accent.base に変換
        const token = this.resolveColorToken(bg)
        styles.push(`background-color: ${getCssColor(token)}`)
        el.removeAttribute('data-bg')
      }

      // data-color
      const color = el.getAttribute('data-color')
      if (color) {
        styles.push(`color: ${getCssColor(color as SemanticColorToken)}`)
        el.removeAttribute('data-color')
      }

      // data-border
      const border = el.getAttribute('data-border')
      if (border) {
        styles.push(`border: 1px solid ${getCssColor(border as SemanticColorToken)}`)
        el.removeAttribute('data-border')
      }

      // data-radius
      if (el.hasAttribute('data-radius')) {
        styles.push(`border-radius: ${roundedToCss[stylePack.rounded]}`)
        el.removeAttribute('data-radius')
      }

      // data-padding
      const padding = el.getAttribute('data-padding')
      if (padding) {
        const multiplier = this.getPaddingMultiplier(padding, stylePack)
        styles.push(`padding: ${multiplier}rem`)
        el.removeAttribute('data-padding')
      }

      // data-gap
      const gap = el.getAttribute('data-gap')
      if (gap) {
        styles.push(`gap: ${gapToMultiplier[stylePack.gap]}rem`)
        el.removeAttribute('data-gap')
      }

      // 既存の style と結合
      const existingStyle = el.getAttribute('style') || ''
      const newStyle = [existingStyle, ...styles].filter(Boolean).join('; ')
      if (newStyle) {
        el.setAttribute('style', newStyle)
      }
    })

    return container.innerHTML
  },

  resolveColorToken(value: string): SemanticColorToken {
    // "primary" → "brand.primary", "accent" → "accent.base"
    const shortcuts: Record<string, SemanticColorToken> = {
      primary: 'brand.primary',
      accent: 'accent.base',
      secondary: 'brand.hover',
    }
    return (shortcuts[value] || value) as SemanticColorToken
  },

  getPaddingMultiplier(size: string, stylePack: StylePack): number {
    const base = paddingToMultiplier[stylePack.padding]
    const sizeMultipliers: Record<string, number> = {
      sm: 0.5,
      md: 1,
      lg: 1.5,
      xl: 2,
    }
    return base * (sizeMultipliers[size] || 1)
  },
}
