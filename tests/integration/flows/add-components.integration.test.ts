import fs from 'fs-extra'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { addComponents } from '../../../src/utils/add-components'
import { RegistryService } from '../../../src/services/registry-service'
import type {
  RegistryComponentWithFiles,
  VelyxComponentMeta,
} from '../../../src/types'
import {
  cleanupTempProject,
  createTempProjectFromFixture,
} from '../../helpers/temp-project'

const buttonMeta: VelyxComponentMeta = {
  name: 'button',
  description: 'Button component',
  latest: '1.0.0',
  versions: ['1.0.0'],
  categories: ['forms'],
  requires_alpine: false,
  requires: [],
  laravel: '^11 || ^12',
}

const buttonWithFiles: RegistryComponentWithFiles = {
  ...buttonMeta,
  files: {
    'resources/views/components/ui/button/button.blade.php':
      '<button class="btn">Click</button>\n',
    'resources/js/ui/button.js': 'export default () => ({})\n',
  },
}

const rangeSliderMeta: VelyxComponentMeta = {
  name: 'range-slider',
  description: 'Range Slider component',
  latest: '1.0.0',
  versions: ['1.0.0'],
  categories: ['forms'],
  requires_alpine: false,
  requires: [],
  laravel: '^11 || ^12',
}

const rangeSliderWithFiles: RegistryComponentWithFiles = {
  ...rangeSliderMeta,
  files: {
    'resources/views/components/ui/range-slider/index.blade.php':
      '<div>Range Slider</div>\n',
    'resources/js/ui/range-slider.js': 'export default () => ({})\n',
  },
}

describe('addComponents integration', () => {
  const projectPaths: string[] = []
  const initialCwd = process.cwd()

  afterEach(async () => {
    process.chdir(initialCwd)
    vi.restoreAllMocks()
    for (const projectPath of projectPaths) {
      await cleanupTempProject(projectPath)
    }
    projectPaths.length = 0
  })

  it('adds a component into the target project and injects JS import', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)

    vi.spyOn(RegistryService.prototype, 'fetchRegistry').mockResolvedValue({
      components: [buttonMeta],
      count: 1,
    })
    vi.spyOn(RegistryService.prototype, 'fetchComponent').mockResolvedValue(
      buttonWithFiles,
    )
    vi.spyOn(RegistryService.prototype, 'resolveDependencies').mockResolvedValue(
      [buttonMeta],
    )

    const projectPath = await createTempProjectFromFixture('laravel-minimal')
    projectPaths.push(projectPath)

    await fs.writeJson(
      path.join(projectPath, 'velyx.json'),
      {
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
      },
      { spaces: 2 },
    )

    await addComponents({
      cwd: projectPath,
      all: false,
      components: ['button'],
    })

    const bladePath = path.join(
      projectPath,
      'resources/views/components/ui/button/button.blade.php',
    )
    const jsComponentPath = path.join(projectPath, 'resources/js/ui/button.js')
    const jsEntryPath = path.join(projectPath, 'resources/js/app.js')

    expect(await fs.pathExists(bladePath)).toBe(true)
    expect(await fs.pathExists(jsComponentPath)).toBe(true)

    const entryContent = await fs.readFile(jsEntryPath, 'utf8')
    expect(entryContent).toContain("import button from './ui/button'")
    expect(entryContent).toContain("Alpine.data('button', button);")
  })

  it('injects camelCase Alpine identifiers for kebab-case component names', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)

    vi.spyOn(RegistryService.prototype, 'fetchRegistry').mockResolvedValue({
      components: [rangeSliderMeta],
      count: 1,
    })
    vi.spyOn(RegistryService.prototype, 'fetchComponent').mockResolvedValue(
      rangeSliderWithFiles,
    )
    vi.spyOn(RegistryService.prototype, 'resolveDependencies').mockResolvedValue(
      [rangeSliderMeta],
    )

    const projectPath = await createTempProjectFromFixture('laravel-minimal')
    projectPaths.push(projectPath)

    await fs.writeJson(
      path.join(projectPath, 'velyx.json'),
      {
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
      },
      { spaces: 2 },
    )

    await addComponents({
      cwd: projectPath,
      all: false,
      components: ['range-slider'],
    })

    const entryContent = await fs.readFile(
      path.join(projectPath, 'resources/js/app.js'),
      'utf8',
    )

    expect(entryContent).toContain("import rangeSlider from './ui/range-slider'")
    expect(entryContent).toContain("Alpine.data('rangeSlider', rangeSlider);")
  })
})
