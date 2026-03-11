import prompts from 'prompts'
import fsExtra from 'fs-extra'
import type {
  AddResult,
  FailedComponent,
  VelyxComponentMeta,
} from '@/src/types'
import type {
  IConfigManager,
  IFileSystemService,
  IRegistryService,
} from '@/src/types/interfaces'
import { FilesystemService } from '@/src/services/filesystem-service'
import { DependencyService } from '@/src/services/dependency-service'
import { injectComponentJs } from '@/src/utils/js'
import { logger } from '@/src/utils/logger'
import {
  createFileBackup,
  deleteFileBackup,
  restoreFileBackup,
} from '@/src/utils/file-helper'

type PlannedFile = {
  componentName: string
  filePath: string
  fileType: 'blade' | 'js' | 'css' | null
  destPath: string
  content: string
  existedBefore: boolean
}

/**
 * Determine file type from file path
 */
function getFileTypeFromPath(filePath: string): 'blade' | 'js' | 'css' | null {
  if (filePath.endsWith('.blade.php')) return 'blade'
  if (filePath.endsWith('.js')) return 'js'
  if (filePath.endsWith('.css')) return 'css'
  return null
}

/**
 * Service for managing component operations
 */
export class ComponentService {
  private readonly fileSystem: IFileSystemService
  private readonly dependencyService: DependencyService

  /**
   * Create a new ComponentService instance
   * @param registryService - Service for registry operations
   * @param fileSystem - Optional file system service (creates new one if not provided)
   * @param configManager - Service for configuration management
   */
  constructor(
    private readonly registryService: IRegistryService,
    fileSystem?: IFileSystemService,
    private readonly configManager?: IConfigManager,
  ) {
    this.fileSystem = fileSystem ?? new FilesystemService()
    this.dependencyService = new DependencyService(this.fileSystem)
    if (!this.configManager) {
      throw new Error('ConfigManager is required')
    }
  }

  /**
   * Add multiple components to the project
   * @param componentNames - Array of component names to add
   * @returns Promise resolving to result of the operation
   */
  async addComponents(componentNames: readonly string[]): Promise<AddResult> {
    const result: {
      added: string[]
      skipped: string[]
      failed: FailedComponent[]
    } = {
      added: [],
      skipped: [],
      failed: [],
    }

    for (const componentName of componentNames) {
      try {
        const componentResult = await this.addComponent(componentName)
        result.added.push(...componentResult.added)
        result.skipped.push(...componentResult.skipped)
        result.failed.push(...componentResult.failed)
      } catch (error) {
        result.failed.push({
          name: componentName,
          error: (error as Error).message,
        })
      }
    }

    return result
  }

  /**
   * Add a single component to the project
   * @param componentName - Name of the component to add
   * @returns Promise resolving to result of the operation
   * @throws Error if component fetch fails
   */
  private async addComponent(componentName: string): Promise<AddResult> {
    const result: {
      added: string[]
      skipped: string[]
      failed: FailedComponent[]
    } = {
      added: [],
      skipped: [],
      failed: [],
    }

    // Fetch component metadata with files
    const component = await this.registryService.fetchComponent(componentName, {
      includeFiles: true,
    })

    // Resolve dependencies (fetch without files for dependencies)
    await this.registryService.resolveDependencies(component)

    // Install component dependencies (npm/composer)
    const dependencies = this.buildDependencies(component)
    if (dependencies) {
      const packageManager = this.configManager!.getPackageManager()
      try {
        await this.dependencyService.installDependencies(
          dependencies,
          packageManager,
        )
      } catch (error) {
        logger.warn(
          `Failed to install dependencies for ${componentName}: ${
            (error as Error).message
          }`,
        )
        // Continue with file installation even if dependencies fail
      }
    }

    const plannedFiles: PlannedFile[] = []

    // Fetch files for the main component with content
    const componentWithFiles = await this.fetchComponentWithFiles(componentName)

    for (const [filePath, content] of Object.entries(
      componentWithFiles.files,
    )) {
      // Determine destination based on file type
      const dest = this.getDestinationPath(filePath)
      const fileType = getFileTypeFromPath(filePath)

      // Check if file exists and handle conflict
      const existedBefore = await this.fileSystem.fileExists(dest)
      if (existedBefore) {
        const action = await this.handleFileConflict(filePath)
        if (action === 'skip') {
          result.skipped.push(dest)
          continue
        } else if (action === 'cancel') {
          logger.error('Cancelled.')
          process.exit(0)
        }
      }

      plannedFiles.push({
        componentName,
        filePath,
        fileType,
        destPath: dest,
        content,
        existedBefore,
      })
    }

    if (plannedFiles.length > 0) {
      try {
        await this.applyFileBatch(plannedFiles)
        plannedFiles.forEach((file) => result.added.push(file.destPath))

        const jsComponents = new Set(
          plannedFiles
            .filter((file) => file.fileType === 'js')
            .map((file) => file.componentName),
        )
        for (const jsComponent of Array.from(jsComponents)) {
          await this.autoImportJs(jsComponent)
        }
      } catch (error) {
        plannedFiles.forEach((file) =>
          result.failed.push({
            name: file.destPath,
            error: (error as Error).message,
          }),
        )
      }
    }

    return result
  }

  /**
   * Build dependencies object from component metadata
   */
  private buildDependencies(component: VelyxComponentMeta): {
    composer?: readonly string[]
    npm?: readonly string[]
  } | null {
    const dependencies: {
      composer?: string[]
      npm?: string[]
    } = {}

    if (component.requires?.composer?.length) {
      dependencies.composer = Array.from(new Set(component.requires.composer))
    }

    const npmDependencies = component.requires?.npm
      ? [...component.requires.npm]
      : []

    if (
      component.requires_alpine &&
      !npmDependencies.some(
        (dep) => dep === 'alpinejs' || dep.startsWith('alpinejs@'),
      )
    ) {
      npmDependencies.unshift('alpinejs')
    }

    if (npmDependencies.length > 0) {
      dependencies.npm = Array.from(new Set(npmDependencies))
    }

    return Object.keys(dependencies).length > 0 ? dependencies : null
  }

  /**
   * Fetch component with files from registry
   */
  private async fetchComponentWithFiles(
    componentName: string,
  ): Promise<{ files: Record<string, string> }> {
    const result = await this.registryService.fetchComponent(componentName, {
      includeFiles: true,
    })

    // Check if the result has files (RegistryComponentWithFiles)
    if ('files' in result) {
      return result
    }

    // Fallback: if no files, return empty object
    return { files: {} }
  }

  /**
   * Automatically import component JS into the main JS entry
   * @param componentName - Name of the component
   */
  private async autoImportJs(componentName: string): Promise<void> {
    try {
      const jsEntry = this.configManager?.getJsEntryPath()
      if (!jsEntry || !(await this.fileSystem.fileExists(jsEntry))) {
        return
      }

      const importPath = `./ui/${componentName}`
      injectComponentJs(jsEntry, componentName, importPath)
      logger.success(`Auto-imported ${componentName} into ${jsEntry}`)
    } catch (error) {
      logger.warn(
        `Failed to auto-import JS for ${componentName}: ${
          (error as Error).message
        }`,
      )
    }
  }

  /**
   * Get the destination path for a component file
   * The API returns file paths in project structure format:
   * - resources/views/components/ui/{name}/{name}.blade.php
   * - resources/js/ui/{name}.js
   * - resources/css/ui/{name}.css
   *
   * We preserve the API's structure for consistency
   *
   * @param filePath - File path from API
   * @returns Destination file path
   */
  private getDestinationPath(filePath: string): string {
    // The API already provides the correct path structure
    // Just ensure it's relative to project root
    return filePath
  }

  /**
   * Handle file conflict by prompting user
   * @param filePath - Path of the conflicting file
   * @returns Promise resolving to user action ("skip", "overwrite", or "cancel")
   */
  private async handleFileConflict(
    filePath: string,
  ): Promise<'skip' | 'overwrite' | 'cancel'> {
    const { action } = await prompts(
      {
        type: 'select',
        name: 'action',
        message: `File "${filePath}" already exists. What do you want to do?`,
        choices: [
          { title: 'Skip', value: 'skip' },
          { title: 'Overwrite', value: 'overwrite' },
          { title: 'Cancel', value: 'cancel' },
        ],
        initial: 0,
      },
      {
        onCancel: () => {
          logger.error('Cancelled.')
          process.exit(0)
        },
      },
    )

    return action as 'skip' | 'overwrite' | 'cancel'
  }

  private async applyFileBatch(plannedFiles: PlannedFile[]): Promise<void> {
    const tempFiles: string[] = []
    const backupTargets: string[] = []

    try {
      for (const file of plannedFiles) {
        const tempPath = `${file.destPath}.velyx-tmp`
        await this.fileSystem.writeFile(tempPath, file.content)
        tempFiles.push(tempPath)
      }

      for (const file of plannedFiles) {
        if (!file.existedBefore) {
          continue
        }

        const backupPath = createFileBackup(file.destPath)
        if (!backupPath) {
          throw new Error(`Failed to create backup for ${file.destPath}`)
        }
        backupTargets.push(file.destPath)
      }

      for (const file of plannedFiles) {
        const tempPath = `${file.destPath}.velyx-tmp`
        await fsExtra.move(tempPath, file.destPath, { overwrite: true })
      }

      backupTargets.forEach((filePath) => deleteFileBackup(filePath))
    } catch (error) {
      for (const file of plannedFiles) {
        if (await this.fileSystem.fileExists(file.destPath)) {
          await fsExtra.remove(file.destPath)
        }
        if (file.existedBefore) {
          restoreFileBackup(file.destPath)
        }
      }

      for (const tempFile of tempFiles) {
        if (await this.fileSystem.fileExists(tempFile)) {
          await fsExtra.remove(tempFile)
        }
      }

      throw error
    }
  }
}
