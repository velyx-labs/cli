/**
 * Supported file types for Velyx components
 */
export type VelyxFileType = 'blade' | 'js' | 'css'

/**
 * Supported package managers
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

/**
 * Available color themes
 */
export type VelyxTheme = 'neutral' | 'gray' | 'slate' | 'stone' | 'zinc'

/**
 * Represents a file in a Velyx component (with content)
 */
export interface VelyxComponentFile {
  /** File type (blade, js, css) */
  type: VelyxFileType
  /** Relative file path */
  path: string
  /** File content */
  content: string
}

/**
 * Component dependencies
 */
export interface VelyxDependency {
  /** Composer (PHP) dependencies */
  composer?: readonly string[]
  /** npm/yarn/pnpm/bun dependencies */
  npm?: readonly string[]
}

/**
 * Velyx component metadata (from registry list endpoint)
 */
export interface VelyxComponentMeta {
  /** Unique component name */
  name: string
  /** Component description */
  description: string
  /** Latest version available */
  latest: string
  /** All available versions */
  versions: readonly string[]
  /** Component categories */
  categories?: readonly string[]
  /** Whether Alpine.js is required */
  requires_alpine: boolean
  /** Required Composer dependencies */
  requires: VelyxDependency
  /** Laravel version requirement */
  laravel?: string
}

/**
 * Velyx registry data
 */
export interface RegistryData {
  /** List of available components */
  components: readonly VelyxComponentMeta[]
  /** Total number of components */
  count: number
}

/**
 * Velyx configuration for a project
 */
export interface VelyxConfig {
  /** Configuration version */
  version: string
  /** Selected color theme */
  theme: VelyxTheme
  /** Package manager used */
  packageManager: PackageManager
  /** CSS configuration */
  css: {
    /** Main CSS file path */
    entry: string
    /** Velyx CSS file path */
    velyx: string
  }
  /** JS configuration */
  js: {
    /** Main JS file path */
    entry: string
  }
  /** Components configuration */
  components: {
    /** Path where components are stored */
    path: string
  }
}

/**
 * Component that failed during addition
 */
export interface FailedComponent {
  /** Component name */
  name: string
  /** Error message */
  error: string
}

/**
 * Result of adding components
 */
export interface AddResult {
  /** Names of successfully added files */
  added: readonly string[]
  /** Names of skipped files */
  skipped: readonly string[]
  /** Components that failed */
  failed: readonly FailedComponent[]
}

/**
 * Component list with categories
 */
export interface ComponentList {
  /** List of components */
  components: readonly VelyxComponentMeta[]
  /** List of available categories */
  categories: readonly string[]
}

/**
 * Main file information (CSS or JS)
 */
export interface FileInfo {
  /** File path */
  path: string
  /** File content */
  content: string
}

/**
 * Retry options for network requests
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number
  /** Initial delay in milliseconds */
  initialDelay?: number
  /** Delay multiplication factor */
  backoffFactor?: number
  /** Maximum delay in milliseconds */
  maxDelay?: number
  /** HTTP status codes to retry */
  retryableStatusCodes?: readonly number[]
}

/**
 * Network request options
 */
export interface FetchOptions extends RetryOptions {
  /** Timeout in milliseconds */
  timeout?: number
  /** Custom headers */
  headers?: Record<string, string>
}

/**
 * Velyx Registry API v1 component metadata (with files)
 */
export interface RegistryComponentWithFiles extends VelyxComponentMeta {
  /** Component version (if specific version requested) */
  version?: string
  /** Component files with content mapped to project structure */
  files: Record<string, string>
}

/**
 * Registry API v1 components list response
 */
export interface RegistryComponentsResponse {
  /** Component list data */
  data: Record<string, VelyxComponentMeta>
  /** Total number of components */
  count: number
}

/**
 * Registry API v1 versions response
 */
export interface RegistryVersionsResponse {
  /** Component name */
  name: string
  /** Latest version */
  latest: string
  /** All available versions */
  versions: readonly string[]
}

/**
 * Registry API v1 component detail response
 */
export interface RegistryComponentResponse {
  /** Component data */
  data: RegistryComponentWithFiles
}

/**
 * Registry API v1 versions list response
 */
export interface RegistryVersionsListResponse {
  /** Versions data */
  data: {
    /** Component name */
    name: string
    /** Latest version */
    latest: string
    /** All available versions */
    versions: readonly string[]
  }
}
