/**
 * Context menu item definition
 *
 * Shared type for context menus across the application.
 */
export interface ContextMenuItem {
  /** Unique identifier for the menu item */
  id: string
  /** Display label */
  label: string
  /** Material icon name (optional) */
  icon?: string
  /** Whether the item is disabled */
  disabled?: boolean
  /** Whether this item is a separator */
  separator?: boolean
}

/**
 * Context menu position
 */
export interface ContextMenuPosition {
  x: number
  y: number
}
