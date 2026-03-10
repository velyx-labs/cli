import fs from 'fs-extra'
import path from 'path'
import { existsSync } from 'fs'
import { afterEach, describe, expect, it } from 'vitest'
import {
  cleanupTempProject,
  createTempProjectFromFixture,
} from '../../helpers/temp-project'
import { getDistEntryPath, runCli } from '../../helpers/cli-runner'
import { startMockRegistryServer } from '../../helpers/mock-registry-server'

function projectConfig() {
  return {
    version: '1.0.0',
    theme: 'neutral',
    packageManager: 'npm',
    css: {
      entry: 'resources/css/app.css',
      velyx: 'resources/css/velyx.css',
    },
    js: {
      entry: 'resources/js/app.js',
    },
    components: {
      path: 'resources/views/components/ui',
    },
  }
}

describe('CLI add E2E', () => {
  const projectPaths: string[] = []
  const serverStops: Array<() => Promise<void>> = []

  afterEach(async () => {
    for (const stop of serverStops) {
      await stop()
    }
    serverStops.length = 0

    for (const projectPath of projectPaths) {
      await cleanupTempProject(projectPath)
    }
    projectPaths.length = 0
  })

  it.skipIf(!existsSync(getDistEntryPath()))(
    'adds a component from registry and writes files',
    async (ctx) => {
      const projectPath = await createTempProjectFromFixture('laravel-minimal')
      projectPaths.push(projectPath)

      await fs.writeJson(path.join(projectPath, 'velyx.json'), projectConfig(), {
        spaces: 2,
      })

      let server: Awaited<ReturnType<typeof startMockRegistryServer>>
      try {
        server = await startMockRegistryServer()
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('operation not permitted')
        ) {
          return ctx.skip()
        }
        throw error
      }
      serverStops.push(server.stop)

      const result = runCli(['add', 'button', '--cwd', projectPath], projectPath, {
        VELYX_REGISTRY_URL: `${server.url}/api/v1`,
      })

      expect(result.status).toBe(0)

      const bladePath = path.join(
        projectPath,
        'resources/views/components/ui/button/index.blade.php',
      )
      const jsComponentPath = path.join(projectPath, 'resources/js/ui/button.js')
      const jsEntryPath = path.join(projectPath, 'resources/js/app.js')

      expect(await fs.pathExists(bladePath)).toBe(true)
      expect(await fs.pathExists(jsComponentPath)).toBe(true)

      const entryContent = await fs.readFile(jsEntryPath, 'utf8')
      expect(entryContent).toContain("import button from './ui/button'")
      expect(entryContent).toContain("Alpine.data('button', button);")
    },
  )

  it.skipIf(!existsSync(getDistEntryPath()))(
    'adds a kebab-case component and registers Alpine with camelCase',
    async (ctx) => {
      const projectPath = await createTempProjectFromFixture('laravel-minimal')
      projectPaths.push(projectPath)

      await fs.writeJson(path.join(projectPath, 'velyx.json'), projectConfig(), {
        spaces: 2,
      })

      let server: Awaited<ReturnType<typeof startMockRegistryServer>>
      try {
        server = await startMockRegistryServer()
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('operation not permitted')
        ) {
          return ctx.skip()
        }
        throw error
      }
      serverStops.push(server.stop)

      const result = runCli(
        ['add', 'range-slider', '--cwd', projectPath],
        projectPath,
        { VELYX_REGISTRY_URL: `${server.url}/api/v1` },
      )

      expect(result.status).toBe(0)
      expect(
        await fs.pathExists(
          path.join(
            projectPath,
            'resources/views/components/ui/range-slider/index.blade.php',
          ),
        ),
      ).toBe(true)

      const entryContent = await fs.readFile(
        path.join(projectPath, 'resources/js/app.js'),
        'utf8',
      )

      expect(entryContent).toContain("import rangeSlider from './ui/range-slider'")
      expect(entryContent).toContain("Alpine.data('rangeSlider', rangeSlider);")
    },
  )

  it.skipIf(!existsSync(getDistEntryPath()))(
    'adds a nested component root as index.blade.php',
    async (ctx) => {
      const projectPath = await createTempProjectFromFixture('laravel-minimal')
      projectPaths.push(projectPath)

      await fs.writeJson(path.join(projectPath, 'velyx.json'), projectConfig(), {
        spaces: 2,
      })

      let server: Awaited<ReturnType<typeof startMockRegistryServer>>
      try {
        server = await startMockRegistryServer()
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('operation not permitted')
        ) {
          return ctx.skip()
        }
        throw error
      }
      serverStops.push(server.stop)

      const result = runCli(['add', 'tabs', '--cwd', projectPath], projectPath, {
        VELYX_REGISTRY_URL: `${server.url}/api/v1`,
      })

      expect(result.status).toBe(0)
      expect(
        await fs.pathExists(
          path.join(projectPath, 'resources/views/components/ui/tabs/index.blade.php'),
        ),
      ).toBe(true)
      expect(
        await fs.pathExists(
          path.join(projectPath, 'resources/views/components/ui/tabs/list.blade.php'),
        ),
      ).toBe(true)
      expect(
        await fs.pathExists(
          path.join(projectPath, 'resources/views/components/ui/tabs/content.blade.php'),
        ),
      ).toBe(true)
      expect(
        await fs.pathExists(
          path.join(projectPath, 'resources/views/components/ui/tabs/trigger.blade.php'),
        ),
      ).toBe(true)

      const entryContent = await fs.readFile(
        path.join(projectPath, 'resources/js/app.js'),
        'utf8',
      )

      expect(entryContent).toContain("import tabs from './ui/tabs'")
      expect(entryContent).toContain("Alpine.data('tabs', tabs);")
    },
  )

  it.skipIf(!existsSync(getDistEntryPath()))(
    'fails with a clear message when project is not initialized',
    async () => {
      const projectPath = await createTempProjectFromFixture('laravel-minimal')
      projectPaths.push(projectPath)

      const result = runCli(['add', 'button', '--cwd', projectPath], projectPath)

      expect(result.status).toBe(1)
      expect(await fs.pathExists(path.join(projectPath, 'velyx.json'))).toBe(false)
    },
  )
})
