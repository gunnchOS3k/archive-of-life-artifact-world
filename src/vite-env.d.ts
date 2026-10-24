/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GUNNCHOS_PORTAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
