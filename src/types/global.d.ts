import { Modal } from 'bootstrap'

declare global {
  interface Window {
    bootstrap: {
      Modal: typeof Modal;
      [key: string]: any;
    }
    __updateSW?: (reloadPage?: boolean) => Promise<void>;
  }
}

export {}
