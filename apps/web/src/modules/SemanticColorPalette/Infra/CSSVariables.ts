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
 * Role name to CSS variable suffix mapping
 */
const ROLE_CSS_NAMES = {
  surface: 'surface',
  tintSurface: 'tint-surface',
  title: 'title',
  body: 'body',
  meta: 'meta',
  linkText: 'link-text',
  border: 'border',
  divider: 'divider',
  accent: 'accent',
} as const

type RoleKey = keyof typeof ROLE_CSS_NAMES

/** Stateless token roles */
const STATELESS_REQUIRED: RoleKey[] = [
  'surface',
  'tintSurface',
  'title',
  'body',
  'meta',
  'linkText',
  'border',
  'divider',
]
const STATELESS_OPTIONAL: RoleKey[] = ['accent']

/** Stateful token roles */
const STATEFUL_REQUIRED: RoleKey[] = [
  'surface',
  'tintSurface',
  'border',
  'title',
  'linkText',
]
const STATEFUL_OPTIONAL: RoleKey[] = ['body', 'meta', 'accent', 'divider']

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

  for (const role of STATELESS_REQUIRED) {
    entries.push([`${prefix}-${ROLE_CSS_NAMES[role]}`, tokens[role]])
  }

  for (const role of STATELESS_OPTIONAL) {
    const value = tokens[role]
    if (value) {
      entries.push([`${prefix}-${ROLE_CSS_NAMES[role]}`, value])
    }
  }

  return entries
}

/** Collect CSS variable entries for stateful component tokens */
const collectStatefulEntries = (
  prefix: string,
  tokens: StatefulComponentTokens
): CSSVarEntry[] => {
  const entries: CSSVarEntry[] = []

  for (const role of STATEFUL_REQUIRED) {
    const stateMap = tokens[role] as Readonly<Record<ActionState, ColorValue>>
    for (const state of ACTION_STATES) {
      entries.push([`${prefix}-${ROLE_CSS_NAMES[role]}-${state}`, stateMap[state]])
    }
  }

  for (const role of STATEFUL_OPTIONAL) {
    const stateMap = tokens[role] as
      | Readonly<Record<ActionState, ColorValue>>
      | undefined
    if (stateMap) {
      for (const state of ACTION_STATES) {
        entries.push([`${prefix}-${ROLE_CSS_NAMES[role]}-${state}`, stateMap[state]])
      }
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
