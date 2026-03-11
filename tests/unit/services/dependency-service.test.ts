import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { DependencyService } from '../../../src/services/dependency-service'

describe('DependencyService manifest version checks', () => {
  const initialCwd = process.cwd()
  const tempDirs: string[] = []

  afterEach(async () => {
    process.chdir(initialCwd)
    for (const dir of tempDirs) {
      await fs.remove(dir)
    }
    tempDirs.length = 0
  })

  it('marks npm dependencies as missing when the manifest version differs or the package is absent', async () => {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'velyx-deps-'))
    tempDirs.push(projectPath)
    process.chdir(projectPath)

    await fs.writeJson(
      path.join(projectPath, 'package.json'),
      {
        dependencies: {
          alpinejs: '^3.14.0',
          '@tailwindcss/typography': '^0.5.19',
        },
      },
      { spaces: 2 },
    )

    const service = new DependencyService()
    const missing = await (service as any).filterMissingNpmDependencies([
      'alpinejs@^3.15.8',
      '@tailwindcss/typography@^0.5.19',
      'prismjs@^1.30.0',
    ])

    expect(missing).toEqual(['alpinejs@^3.15.8', 'prismjs@^1.30.0'])
  })

  it('marks composer dependencies as missing when the manifest version differs or the package is absent', async () => {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'velyx-deps-'))
    tempDirs.push(projectPath)
    process.chdir(projectPath)

    await fs.writeJson(
      path.join(projectPath, 'composer.json'),
      {
        require: {
          'mallardduck/blade-lucide-icons': '1.26.1',
        },
      },
      { spaces: 2 },
    )

    const service = new DependencyService()
    const missing = await (service as any).filterMissingComposerDependencies([
      'mallardduck/blade-lucide-icons@1.26.2',
      'livewire/livewire@^4.0',
    ])

    expect(missing).toEqual([
      'mallardduck/blade-lucide-icons@1.26.2',
      'livewire/livewire@^4.0',
    ])
  })
})
