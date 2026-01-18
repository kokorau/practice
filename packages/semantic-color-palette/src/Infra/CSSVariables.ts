import type {
  SemanticColorPalette,
  ContextTokens,
  ComponentTokens,
  StatefulComponentTokens,
  ActionState,
  ColorValue,
} from '../Domain'

type CSSVarEntry = readonly [key: string, value: ColorValue]

/**
 * Ink role name to CSS variable suffix mapping
 */
const INK_CSS_NAMES = {
  title: 'title',
  body: 'body',
  meta: 'meta',
  linkText: 'link-text',
  highlight: 'highlight',
  border: 'border',
  divider: 'divider',
} as const

type InkRoleKey = keyof typeof INK_CSS_NAMES

const INK_ROLES: InkRoleKey[] = ['title', 'body', 'meta', 'linkText', 'highlight', 'border', 'divider']

const ACTION_STATES: ActionState[] = ['default', 'hover', 'active', 'disabled']

/** Convert camelCase to kebab-case */
const toKebab = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

type StatelessTokens = ContextTokens | ComponentTokens

/** Collect CSS variable entries for stateless tokens */
const collectStatelessEntries = (
  prefix: string,
  tokens: StatelessTokens
): CSSVarEntry[] => {
  const entries: CSSVarEntry[] = []

  // Surface
  entries.push([`${prefix}-surface`, tokens.surface])

  // Ink roles
  for (const role of INK_ROLES) {
    entries.push([`${prefix}-${INK_CSS_NAMES[role]}`, tokens.ink[role]])
  }

  return entries
}

/** Collect CSS variable entries for stateful component tokens */
const collectStatefulEntries = (
  prefix: string,
  tokens: StatefulComponentTokens
): CSSVarEntry[] => {
  const entries: CSSVarEntry[] = []

  // Surface (stateful)
  for (const state of ACTION_STATES) {
    entries.push([`${prefix}-surface-${state}`, tokens.surface[state]])
  }

  // Ink roles (stateful)
  for (const role of INK_ROLES) {
    const stateMap = tokens.ink[role]
    for (const state of ACTION_STATES) {
      entries.push([`${prefix}-${INK_CSS_NAMES[role]}-${state}`, stateMap[state]])
    }
  }

  return entries
}

/** Convert entries to CSS variable declarations */
const entriesToDeclarations = (entries: CSSVarEntry[]): string[] =>
  entries.map(([key, value]) => `${key}: ${value};`)

/**
 * Collect all CSS variable entries from SemanticColorPalette
 * @returns Array of [key, value] tuples
 */
export const collectCSSVariableEntries = (
  palette: SemanticColorPalette
): CSSVarEntry[] => {
  const entries: CSSVarEntry[] = []

  // Context tokens
  for (const [name, tokens] of Object.entries(palette.context)) {
    entries.push(...collectStatelessEntries(`--context-${toKebab(name)}`, tokens))
  }

  // Component tokens
  for (const [name, tokens] of Object.entries(palette.component)) {
    const prefix = `--component-${toKebab(name)}`
    if (typeof tokens.surface === 'object') {
      entries.push(...collectStatefulEntries(prefix, tokens as StatefulComponentTokens))
    } else {
      entries.push(...collectStatelessEntries(prefix, tokens as ComponentTokens))
    }
  }

  return entries
}

/**
 * Generate CSS variable declarations from SemanticColorPalette
 * @returns Array of CSS variable declaration strings
 */
export const toCSSVariables = (palette: SemanticColorPalette): string[] =>
  entriesToDeclarations(collectCSSVariableEntries(palette))

/**
 * Generate CSS text block with variables wrapped in a selector
 * @param palette The semantic color palette
 * @param selector CSS selector to wrap variables (default: ":root")
 * @returns Complete CSS text block
 */
export const toCSSText = (
  palette: SemanticColorPalette,
  selector: string = ':root'
): string => {
  const entries = collectCSSVariableEntries(palette)
  const declarations = entries.map(([key, value]) => `  ${key}: ${value};`)
  return `${selector} {\n${declarations.join('\n')}\n}`
}
