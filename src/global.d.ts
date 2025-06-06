// src/global.d.ts

// This declaration file provides a basic type definition for the Bootstrap JS module,
// which doesn't have its own type declarations. This suppresses TypeScript errors
// related to the dynamic import of 'bootstrap/dist/js/bootstrap.bundle.min.js'.

declare module 'bootstrap/dist/js/bootstrap.bundle.min.js' {
  // We can use 'any' here as we are primarily using Bootstrap for its side effects
  // (attaching components to the window object) and not for its direct module exports.
  const bootstrap: any;
  export default bootstrap;
}

// This extends the global Window interface to include the 'bootstrap' and '__updateSW'
// properties, making them available globally in a type-safe manner.
interface Window {
  bootstrap: any; // The Bootstrap JS bundle
  __updateSW: (reloadPage?: boolean) => Promise<void>; // For PWA updates
} 