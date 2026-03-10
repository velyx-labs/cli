import fs from 'fs'
import type { FileInfo } from '@/src/types'

export function toJsIdentifier(componentName: string): string {
  return componentName
    .replace(/^[^a-zA-Z_$]+/, '')
    .replace(/[-_]+([a-zA-Z0-9])/g, (_, char: string) => char.toUpperCase())
}

/**
 * Common JS file paths to check for main script
 */
export const JS_CANDIDATES = [
  'resources/js/app.js',
  'resources/js/main.js',
  'resources/js/index.js',
] as const

/**
 * Find the main JS file in the project
 * @returns JS file info if found, null otherwise
 */
export function findMainJs(): FileInfo | null {
  for (const rel of JS_CANDIDATES) {
    if (fs.existsSync(rel)) {
      return {
        path: rel,
        content: fs.readFileSync(rel, 'utf8'),
      }
    }
  }
  return null
}

/**
 * Inject component JS import and Alpine initialization into main JS file
 * @param jsPath - Path to the JS file
 * @param componentName - Name of the component
 * @param componentImportPath - Path to import the component from
 * @throws Error if file read/write fails
 */
export function injectComponentJs(
  jsPath: string,
  componentName: string,
  componentImportPath: string,
): void {
  let content = fs.readFileSync(jsPath, 'utf8')

  const jsIdentifier = toJsIdentifier(componentName)

  // Avoid duplicate imports
  const importStatement = `import ${jsIdentifier} from '${componentImportPath}'`
  if (
    content.includes(importStatement) ||
    content.includes(`import ${jsIdentifier} from "${componentImportPath}"`)
  ) {
    return
  }

  // Add import at the top (after other imports if possible)
  const lines = content.split('\n')
  let lastImportIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.startsWith('import ')) {
      lastImportIndex = i
    }
  }

  lines.splice(lastImportIndex + 1, 0, importStatement)
  content = lines.join('\n')

  // Handle Alpine.data registration
  const alpineDataRegistration = `Alpine.data('${jsIdentifier}', ${jsIdentifier});`

  if (content.includes("document.addEventListener('alpine:init'")) {
    // Inject into existing listener
    if (!content.includes(alpineDataRegistration)) {
      content = content.replace(
        /document\.addEventListener\('alpine:init',\s*\(\)\s*=>\s*\{/,
        (match) => `${match}\n    ${alpineDataRegistration}`,
      )
    }
  } else {
    // Create new listener at the end
    content += `\n\ndocument.addEventListener('alpine:init', () => {\n    ${alpineDataRegistration}\n});\n`
  }

  fs.writeFileSync(jsPath, content, 'utf8')
}
