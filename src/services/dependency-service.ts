import { exec } from 'child_process'
import { readFileSync } from 'fs'
import { promisify } from 'util'
import type { PackageManager, VelyxDependency } from '@/src/types'
import type { IDependencyService } from '@/src/types/interfaces'
import { logger } from '@/src/utils/logger'
import { FilesystemService } from './filesystem-service'

const execAsync = promisify(exec)

type DependencySpec = {
  name: string
  version: string | null
}

type PackageJsonManifest = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

type ComposerJsonManifest = {
  require?: Record<string, string>
  'require-dev'?: Record<string, string>
}

function parseNpmDependency(dep: string): DependencySpec {
  if (dep.startsWith('@')) {
    const separatorIndex = dep.lastIndexOf('@')
    if (separatorIndex > dep.indexOf('/')) {
      return {
        name: dep.slice(0, separatorIndex),
        version: dep.slice(separatorIndex + 1),
      }
    }

    return { name: dep, version: null }
  }

  const separatorIndex = dep.lastIndexOf('@')

  if (separatorIndex > 0) {
    return {
      name: dep.slice(0, separatorIndex),
      version: dep.slice(separatorIndex + 1),
    }
  }

  return { name: dep, version: null }
}

function parseComposerDependency(dep: string): DependencySpec {
  const colonIndex = dep.indexOf(':')
  if (colonIndex > 0) {
    return {
      name: dep.slice(0, colonIndex),
      version: dep.slice(colonIndex + 1),
    }
  }

  const atIndex = dep.lastIndexOf('@')
  if (atIndex > 0) {
    return {
      name: dep.slice(0, atIndex),
      version: dep.slice(atIndex + 1),
    }
  }

  return { name: dep, version: null }
}

function toComposerInstallSpec(dep: string): string {
  const parsed = parseComposerDependency(dep)
  return parsed.version ? `${parsed.name}:${parsed.version}` : parsed.name
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as T
  } catch {
    return null
  }
}

/**
 * Service for managing dependency installation
 */
export class DependencyService implements IDependencyService {
  private readonly fileSystem: FilesystemService

  constructor(fileSystem?: FilesystemService) {
    this.fileSystem = fileSystem ?? new FilesystemService()
  }

  /**
   * Install component dependencies using appropriate package managers
   * @param dependencies - Dependencies to install
   * @param packageManager - Package manager to use for npm dependencies
   * @returns Promise that resolves when installation is complete
   */
  async installDependencies(
    dependencies: VelyxDependency,
    packageManager: PackageManager,
  ): Promise<void> {
    const npmPromises = []
    const composerPromises = []

    if (dependencies.npm && dependencies.npm.length > 0) {
      npmPromises.push(
        this.installNpmDependencies(dependencies.npm, packageManager),
      )
    }

    if (dependencies.composer && dependencies.composer.length > 0) {
      composerPromises.push(
        this.installComposerDependencies(dependencies.composer),
      )
    }

    await Promise.allSettled([...npmPromises, ...composerPromises])
  }

  /**
   * Install npm/yarn/pnpm/bun dependencies
   * @param dependencies - Array of dependency strings (e.g., "alpinejs@^3.14.0")
   * @param packageManager - Package manager to use
   * @returns Promise that resolves when installation is complete
   */
  async installNpmDependencies(
    dependencies: readonly string[],
    packageManager: PackageManager,
  ): Promise<void> {
    if (!(await this.fileSystem.fileExists('package.json'))) {
      logger.warn('No package.json found, skipping npm dependencies')
      return
    }

    const missingDeps = await this.filterMissingNpmDependencies(dependencies)

    if (missingDeps.length === 0) {
      logger.info('All npm dependencies already installed')
      return
    }

    const command = this.getNpmInstallCommand(packageManager, missingDeps)

    try {
      logger.info(`Installing npm dependencies: ${missingDeps.join(', ')}`)

      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 120000,
      })

      if (stdout && process.env.NODE_ENV !== 'test') {
        console.log(stdout)
      }

      if (stderr && !stderr.includes('WARN')) {
        logger.warn(`npm install warnings: ${stderr}`)
      }

      logger.success(`Installed ${missingDeps.length} npm dependencies`)
    } catch (error) {
      logger.error(
        `Failed to install npm dependencies: ${(error as Error).message}`,
      )
      throw error
    }
  }

  /**
   * Install composer dependencies
   * @param dependencies - Array of dependency strings (e.g., "livewire/livewire:^3.0" or "livewire/livewire@^3.0")
   * @returns Promise that resolves when installation is complete
   */
  async installComposerDependencies(
    dependencies: readonly string[],
  ): Promise<void> {
    if (!(await this.fileSystem.fileExists('composer.json'))) {
      logger.warn('No composer.json found, skipping composer dependencies')
      return
    }

    const missingDeps =
      await this.filterMissingComposerDependencies(dependencies)

    if (missingDeps.length === 0) {
      logger.info('All composer dependencies already installed')
      return
    }

    const installSpecs = missingDeps.map(toComposerInstallSpec)

    try {
      logger.info(
        `Installing composer dependencies: ${installSpecs.join(', ')}`,
      )

      const { stdout, stderr } = await execAsync(
        `composer require ${installSpecs.join(' ')}`,
        {
          cwd: process.cwd(),
          timeout: 300000,
        },
      )

      if (stdout && process.env.NODE_ENV !== 'test') {
        console.log(stdout)
      }

      if (stderr) {
        logger.warn(`composer require warnings: ${stderr}`)
      }

      logger.success(`Installed ${missingDeps.length} composer dependencies`)
    } catch (error) {
      logger.error(
        `Failed to install composer dependencies: ${(error as Error).message}`,
      )
      throw error
    }
  }

  private getNpmInstallCommand(
    packageManager: PackageManager,
    dependencies: readonly string[],
  ): string {
    switch (packageManager) {
      case 'pnpm':
        return `pnpm add ${dependencies.join(' ')}`
      case 'yarn':
        return `yarn add ${dependencies.join(' ')}`
      case 'bun':
        return `bun add ${dependencies.join(' ')}`
      case 'npm':
      default:
        return `npm install ${dependencies.join(' ')}`
    }
  }

  private async filterMissingNpmDependencies(
    dependencies: readonly string[],
  ): Promise<string[]> {
    const manifest = readJsonFile<PackageJsonManifest>('package.json')

    if (!manifest) {
      return [...dependencies]
    }

    const installedDeps = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
    }

    return dependencies.filter((dep) => {
      const parsed = parseNpmDependency(dep)
      const installedVersion = installedDeps[parsed.name]

      if (!installedVersion) {
        return true
      }

      if (!parsed.version) {
        return false
      }

      return installedVersion !== parsed.version
    })
  }

  private async filterMissingComposerDependencies(
    dependencies: readonly string[],
  ): Promise<string[]> {
    const manifest = readJsonFile<ComposerJsonManifest>('composer.json')

    if (!manifest) {
      return [...dependencies]
    }

    const installedDeps = {
      ...manifest.require,
      ...manifest['require-dev'],
    }

    return dependencies.filter((dep) => {
      const parsed = parseComposerDependency(dep)
      const installedVersion = installedDeps[parsed.name]

      if (!installedVersion) {
        return true
      }

      if (!parsed.version) {
        return false
      }

      return installedVersion !== parsed.version
    })
  }
}
