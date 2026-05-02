import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))

export function readAppVersion(): string {
  const pkg = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf-8')) as { version: string }
  return pkg.version
}

export function appEnvDefine(version: string): Record<string, string> {
  return {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
  }
}

/** Substitui `%VITE_APP_VERSION%` em `index.html` (alinha título/meta ao package.json). */
export function htmlVersionPlugin(version: string) {
  return {
    name: 'inject-app-version',
    transformIndexHtml(html: string) {
      return html.replaceAll('%VITE_APP_VERSION%', version)
    },
  }
}
