import { chromium } from 'playwright'
import { $Screenshot, type Screenshot } from '../Domain/Screenshot'

export type CaptureScreenshotOptions = {
  url: string
}

export const captureScreenshot = async (options: CaptureScreenshotOptions): Promise<Screenshot> => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(options.url, { waitUntil: 'networkidle' })
    const viewport = page.viewportSize()
    const image = await page.screenshot({ type: 'png' })

    return $Screenshot.create({
      url: options.url,
      image,
      width: viewport?.width ?? 1280,
      height: viewport?.height ?? 720,
    })
  } finally {
    await browser.close()
  }
}
