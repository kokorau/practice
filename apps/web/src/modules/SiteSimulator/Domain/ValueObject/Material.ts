/**
 * MaterialId represents the surface material type.
 * Affects how light interacts with the surface (shadows, reflections).
 */
export type MaterialId = 'default' | 'plastic'

export const $Material = {
  allIds: undefined as unknown as () => MaterialId[],
}
