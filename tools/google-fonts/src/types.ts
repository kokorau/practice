// Google Fonts API Response Types
// https://developers.google.com/fonts/docs/developer_api

export type GoogleFontCategory =
  | 'serif'
  | 'sans-serif'
  | 'monospace'
  | 'display'
  | 'handwriting'

export type GoogleFontAxis = {
  tag: string
  start: number
  end: number
}

export type GoogleFontItem = {
  family: string
  variants: string[]
  subsets: string[]
  version: string
  lastModified: string
  files: Record<string, string>
  category: GoogleFontCategory
  axes?: GoogleFontAxis[]
  tags?: string[]
}

export type GoogleFontsResponse = {
  kind: string
  items: GoogleFontItem[]
}

export type GoogleFontsQueryParams = {
  key: string
  family?: string
  subset?: string
  category?: GoogleFontCategory
  capability?: 'VF' | 'WOFF2'
  sort?: 'alpha' | 'date' | 'popularity' | 'style' | 'trending'
}
