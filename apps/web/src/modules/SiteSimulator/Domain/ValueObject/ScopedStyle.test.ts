import { describe, it, expect } from 'vitest'
import { $ScopedStyle } from './ScopedStyle'

describe('$ScopedStyle', () => {
  describe('scopeClass', () => {
    it('should generate scope class from UUID', () => {
      const result = $ScopedStyle.scopeClass('abc12345-6789-0000-0000-000000000000')
      expect(result).toBe('s-abc12345')
    })

    it('should use first 8 characters', () => {
      const result = $ScopedStyle.scopeClass('12345678-abcd-efgh-ijkl-mnopqrstuvwx')
      expect(result).toBe('s-12345678')
    })
  })

  describe('wrapCss', () => {
    it('should wrap CSS with scope class', () => {
      const css = '.title { color: red; }'
      const result = $ScopedStyle.wrapCss(css, 's-abc123')
      expect(result).toBe('.s-abc123 {\n.title { color: red; }\n}')
    })

    it('should handle multi-line CSS', () => {
      const css = `.title { color: red; }
.subtitle { color: blue; }`
      const result = $ScopedStyle.wrapCss(css, 's-abc123')
      expect(result).toBe(`.s-abc123 {
.title { color: red; }
.subtitle { color: blue; }
}`)
    })

    it('should return empty for empty CSS', () => {
      expect($ScopedStyle.wrapCss('', 's-abc123')).toBe('')
      expect($ScopedStyle.wrapCss('   ', 's-abc123')).toBe('')
    })
  })

  describe('addScopeClass', () => {
    it('should add class to element without class', () => {
      const html = '<section>content</section>'
      const result = $ScopedStyle.addScopeClass(html, 's-abc123')
      expect(result).toBe('<section class="s-abc123">content</section>')
    })

    it('should prepend to existing class', () => {
      const html = '<section class="hero">content</section>'
      const result = $ScopedStyle.addScopeClass(html, 's-abc123')
      expect(result).toBe('<section class="s-abc123 hero">content</section>')
    })

    it('should handle multiple existing classes', () => {
      const html = '<div class="card active">content</div>'
      const result = $ScopedStyle.addScopeClass(html, 's-abc123')
      expect(result).toBe('<div class="s-abc123 card active">content</div>')
    })

    it('should preserve other attributes', () => {
      const html = '<section id="main" data-test="value">content</section>'
      const result = $ScopedStyle.addScopeClass(html, 's-abc123')
      expect(result).toBe('<section class="s-abc123" id="main" data-test="value">content</section>')
    })

    it('should handle empty html', () => {
      expect($ScopedStyle.addScopeClass('', 's-abc123')).toBe('')
      expect($ScopedStyle.addScopeClass('  ', 's-abc123')).toBe('  ')
    })
  })
})
