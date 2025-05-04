import { Modal } from 'bootstrap'

declare global {
  interface Window {
    bootstrap: {
      Modal: typeof Modal;
      [key: string]: any;
    }
  }
}


export {}
