/// <reference types="vite/client" />

declare global {
  interface Window {
    uploadProgressInterval?: NodeJS.Timeout;
  }
}

export {};
