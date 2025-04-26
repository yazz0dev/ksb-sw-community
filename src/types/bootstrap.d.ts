declare global {
  interface Window {
    bootstrap?: {
      Modal: new (element: Element, options?: any) => any;
      Collapse?: {
        new(element: Element | string, options?: any): Collapse;
        getInstance(element: Element | string): Collapse | null;
      };
    }
  }
}

interface Collapse {
  toggle(): void;
  hide(): void;
  show(): void;
  dispose(): void;
}

export {};
