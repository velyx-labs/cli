import http from 'http'

const BUTTON_COMPONENT = {
  name: 'button',
  description: 'Button component',
  latest: '1.0.0',
  versions: ['1.0.0'],
  categories: ['forms'],
  requires_alpine: false,
  requires: [],
  laravel: '^11 || ^12',
}

const RANGE_SLIDER_COMPONENT = {
  name: 'range-slider',
  description: 'Range slider component',
  latest: '1.0.0',
  versions: ['1.0.0'],
  categories: ['forms'],
  requires_alpine: false,
  requires: [],
  laravel: '^11 || ^12',
}

const TABS_COMPONENT = {
  name: 'tabs',
  description: 'Tabs component',
  latest: '1.0.0',
  versions: ['1.0.0'],
  categories: ['navigation'],
  requires_alpine: false,
  requires: [],
  laravel: '^11 || ^12',
}

const BUTTON_FILES = {
  'resources/views/components/ui/button/index.blade.php':
    '<button class="btn">Click</button>\n',
  'resources/js/ui/button.js': 'export default () => ({})\n',
}

const RANGE_SLIDER_FILES = {
  'resources/views/components/ui/range-slider/index.blade.php':
    '<div>Range Slider</div>\n',
  'resources/js/ui/range-slider.js': 'export default () => ({})\n',
}

const TABS_FILES = {
  'resources/views/components/ui/tabs/index.blade.php':
    '<div>{{ $slot }}</div>\n',
  'resources/views/components/ui/tabs/list.blade.php':
    '<div role="tablist">{{ $slot }}</div>\n',
  'resources/views/components/ui/tabs/content.blade.php':
    '<div role="tabpanel">{{ $slot }}</div>\n',
  'resources/views/components/ui/tabs/trigger.blade.php':
    '<button role="tab">{{ $slot }}</button>\n',
  'resources/js/ui/tabs.js': 'export default () => ({})\n',
}

const COMPONENTS = {
  button: BUTTON_COMPONENT,
  'range-slider': RANGE_SLIDER_COMPONENT,
  tabs: TABS_COMPONENT,
} as const

const COMPONENT_FILES = {
  button: BUTTON_FILES,
  'range-slider': RANGE_SLIDER_FILES,
  tabs: TABS_FILES,
} as const

export async function startMockRegistryServer(): Promise<{
  url: string
  stop: () => Promise<void>
}> {
  const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1')

    if (requestUrl.pathname === '/api/v1/components') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          data: COMPONENTS,
          count: Object.keys(COMPONENTS).length,
        }),
      )
      return
    }

    const match = requestUrl.pathname.match(/^\/api\/v1\/components\/([^/]+)$/)
    if (match) {
      const componentName = decodeURIComponent(match[1] ?? '') as keyof typeof COMPONENTS
      const component = COMPONENTS[componentName]

      if (!component) {
        res.writeHead(404, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ message: 'Not found' }))
        return
      }

      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          data: {
            ...component,
            files: COMPONENT_FILES[componentName],
          },
        }),
      )
      return
    }

    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ message: 'Not found' }))
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Unable to start mock registry server')
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error)
          else resolve()
        })
      }),
  }
}
