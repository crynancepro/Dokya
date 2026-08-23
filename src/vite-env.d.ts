/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENEPAY_PUBLIC_KEY?: string;
  readonly VITE_SENEPAY_SECRET_KEY?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
