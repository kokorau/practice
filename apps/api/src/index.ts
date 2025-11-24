import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { captureScreenshotUseCase } from './modules/Screenshot/Application/captureScreenshotUseCase'

const app = new Hono()

app.use('*', cors())

app.get('/', (c) => {
  return c.json({ message: 'Screenshot API' })
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.get('/screenshot', async (c) => {
  const url = c.req.query('url')

  if (!url) {
    return c.json({ error: 'url parameter is required' }, 400)
  }

  try {
    const screenshot = await captureScreenshotUseCase({ url })

    return new Response(new Uint8Array(screenshot.image), {
      headers: {
        'Content-Type': 'image/png',
      },
    })
  } catch (error) {
    console.error('Screenshot error:', error)
    return c.json({ error: 'Failed to capture screenshot', details: String(error) }, 500)
  }
})

const port = 3001
console.log(`Server running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
