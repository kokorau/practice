# Section Template Guidelines

## Layout Structure

- **Base width**: 1280px
- **Breakpoints**: 768px, 640px

## Color

Use CSS variables only. Hard-coded colors are prohibited.

Available variables:
- `--color-base`, `--color-on-base`
- `--color-primary`, `--color-on-primary`
- `--color-secondary`, `--color-on-secondary`
- `--color-brand`, `--color-on-brand`

Usage:
```css
background: rgb(var(--color-primary));
color: rgb(var(--color-on-primary));
```

## Required Structure

1. Wrap content with `<section>` element
2. Follow heading hierarchy (h1 → h2 → h3)
3. Use semantic HTML elements

## Example

```typescript
export const ExampleTemplate: SectionTemplate = {
  type: 'example',
  render: (content, cssVars) => {
    const c = content as ExampleContent
    return `
<section class="section-example" style="${cssVars}">
  <div style="background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
    <h2>${c.title}</h2>
    <p>${c.body}</p>
  </div>
</section>`
  },
}
```

## Testing

All templates must pass validation tests:

```typescript
import { validateTemplateOutput, createTestCssVars } from './templateTestHelper'

it('renders valid section HTML', () => {
  const html = MyTemplate.render(content, createTestCssVars())
  const result = validateTemplateOutput(html)
  expect(result.isValid).toBe(true)
})
```

## Out of Scope (handled by StylePack)

The following are NOT defined in templates:
- Typography sizes
- gap / padding / margin values
- border-radius
- Other decorative values
