export type GoogleFontSource = {
  vendor: 'google'
  url: string
}

export type AdobeFontSource = {
  vendor: 'adobe'
  kitId: string
}

export type CustomFontSource = {
  vendor: 'custom'
  urls: { format: string; url: string }[]
}

export type FontSource = GoogleFontSource | AdobeFontSource | CustomFontSource

export type FontPreset = {
  id: string
  name: string
  family: string
  source: FontSource
}
