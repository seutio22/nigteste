/** Versão exibida na UI — vem de `package.json` via `define` nos configs Vite. */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION
export const APP_VERSION_LABEL = `v${APP_VERSION}`
export const NEXUS_APP_TITLE = `Nexus - ${APP_VERSION_LABEL}`
