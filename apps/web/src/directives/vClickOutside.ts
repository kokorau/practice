import type { Directive, DirectiveBinding } from 'vue'

export interface ClickOutsideOptions {
  handler: (event: MouseEvent) => void
  ignore?: (HTMLElement | null | undefined)[]
}

type BindingValue = ((event: MouseEvent) => void) | ClickOutsideOptions

declare global {
  interface HTMLElement {
    _clickOutsideHandler?: (event: MouseEvent) => void
  }
}

const normalizeOptions = (value: BindingValue): ClickOutsideOptions => {
  if (typeof value === 'function') {
    return { handler: value }
  }
  return value
}

const shouldIgnore = (target: Node, ignore: (HTMLElement | null | undefined)[]): boolean => {
  for (const el of ignore) {
    if (el && el.contains(target)) {
      return true
    }
  }
  return false
}

const createHandler = (
  el: HTMLElement,
  options: ClickOutsideOptions
): ((event: MouseEvent) => void) => {
  return (event: MouseEvent) => {
    const target = event.target as Node

    // Ignore clicks inside the element itself
    if (el.contains(target)) {
      return
    }

    // Ignore clicks on specified elements
    if (shouldIgnore(target, options.ignore ?? [])) {
      return
    }

    options.handler(event)
  }
}

export const vClickOutside: Directive<HTMLElement, BindingValue> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<BindingValue>) {
    const options = normalizeOptions(binding.value)
    const handler = createHandler(el, options)

    el._clickOutsideHandler = handler
    // Use capture phase to ensure we catch the event before other handlers
    document.addEventListener('click', handler, true)
  },

  updated(el: HTMLElement, binding: DirectiveBinding<BindingValue>) {
    // Remove old handler
    if (el._clickOutsideHandler) {
      document.removeEventListener('click', el._clickOutsideHandler, true)
    }

    // Create and attach new handler
    const options = normalizeOptions(binding.value)
    const handler = createHandler(el, options)

    el._clickOutsideHandler = handler
    document.addEventListener('click', handler, true)
  },

  unmounted(el: HTMLElement) {
    if (el._clickOutsideHandler) {
      document.removeEventListener('click', el._clickOutsideHandler, true)
      delete el._clickOutsideHandler
    }
  },
}
