/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional absolute origin of the gateway. Empty means same-origin (/api is proxied). */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
