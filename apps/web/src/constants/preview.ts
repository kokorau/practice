/**
 * Preview-related constants
 *
 * Centralized configuration for preview rendering and thumbnail generation.
 */

/**
 * Base width for texture scale calculation.
 * Used to determine how textures should scale relative to display size.
 */
export const PREVIEW_ORIGINAL_WIDTH = 1280

/**
 * Base height for texture scale calculation (16:9 HD resolution).
 */
export const PREVIEW_ORIGINAL_HEIGHT = 720

/**
 * Default thumbnail canvas dimensions (16:9 aspect ratio).
 */
export const PREVIEW_THUMBNAIL_WIDTH = 256
export const PREVIEW_THUMBNAIL_HEIGHT = 144

/**
 * Container padding for responsive preview scaling.
 * Represents total horizontal padding (16px on each side).
 */
export const PREVIEW_CONTAINER_PADDING = 32

/**
 * Base font size for rem to px conversion.
 * Standard browser default for consistent text rendering.
 */
export const BASE_FONT_SIZE_PX = 16
