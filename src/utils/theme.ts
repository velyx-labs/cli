import fs from 'fs'
import path from 'path'
import type { VelyxTheme } from '@/src/types'

type BaseColor = {
  name: VelyxTheme
  label: string
  cssVars: {
    light: Record<string, string>
    dark: Record<string, string>
  }
}

function findColorsDir(startDir: string): string {
  let current = startDir
  for (let depth = 0; depth < 4; depth += 1) {
    const distPath = path.join(current, 'colors')
    if (fs.existsSync(distPath)) {
      return distPath
    }

    const srcPath = path.join(current, 'src/colors')
    if (fs.existsSync(srcPath)) {
      return srcPath
    }

    const parent = path.dirname(current)
    if (parent === current) {
      break
    }
    current = parent
  }

  return path.join(startDir, 'colors')
}

const entryDir = process.argv[1]
  ? path.dirname(path.resolve(process.argv[1]))
  : process.cwd()
const COLORS_DIR = findColorsDir(entryDir)

function loadBaseColors(): BaseColor[] {
  if (!fs.existsSync(COLORS_DIR)) {
    return []
  }

  const files = fs
    .readdirSync(COLORS_DIR)
    .filter((file) => file.endsWith('.json'))

  return files
    .map((file) => {
      const filePath = path.join(COLORS_DIR, file)
      const raw = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(raw) as BaseColor
    })
    .filter((color) => !!color?.name)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getBaseColors(): BaseColor[] {
  return loadBaseColors()
}

export function getBaseColor(name: VelyxTheme): BaseColor | undefined {
  return loadBaseColors().find((color) => color.name === name)
}

function renderCssVars(vars: Record<string, string>): string[] {
  return Object.entries(vars).map(([key, value]) => `  --${key}: ${value};`)
}

/**
 * Copy a theme CSS file to the target location
 * @param theme - Theme name to copy
 * @param target - Target file path
 * @throws Error if theme doesn't exist or copy fails
 */
export function copyTheme(theme: VelyxTheme, target: string): void {
  const baseColor = getBaseColor(theme)
  if (!baseColor) {
    throw new Error(`Theme "${theme}" not found in colors registry.`)
  }

  const lightVars = renderCssVars(baseColor.cssVars.light)
  const darkVars = renderCssVars(baseColor.cssVars.dark)

  // Generate Tailwind v4 @theme inline mappings
  const themeMappings = Object.keys(baseColor.cssVars.light)
    .filter((key) => key !== 'radius') // Exclude non-color vars
    .map((key) => `  --color-${key}: var(--${key});`)

  const content = [
    ':root {',
    ...lightVars,
    '}',
    '',
    '.dark {',
    ...darkVars,
    '}',
    '',
    '@theme inline {',
    ...themeMappings,
    '}',
    '',
  ].join('\n')

  fs.writeFileSync(target, content, { encoding: 'utf-8', flag: 'wx' })
}
