# Styles Organization

This directory contains only **shared/global styles** that are used across multiple components. Component-specific styles should be defined locally within their respective Vue components using `<style scoped>`.

## Files Structure

### Core Files
- **`main.scss`** - Main entry point, Bootstrap imports, global base styles
- **`_variables.scss`** - Design tokens, color palette, typography scales

### Shared Systems
- **`_font.scss`** - Typography system (headings, body text, font weights)
- **`_button.scss`** - Button component system (variants, states, effects)
- **`_form.scss`** - Form controls system (inputs, selects, validation states)
- **`_space.scss`** - Spacing system (margins, paddings, custom spacing utilities)
- **`_animations.scss`** - Shared animations and transitions
- **`_utilities.scss`** - Global utility classes

## Principles

### ✅ What belongs in `/styles`
- Design tokens (colors, typography, spacing)
- Shared component systems (buttons, forms)
- Global utilities and helper classes
- Bootstrap configuration and overrides

### ❌ What should be local to components
- Component-specific layouts
- Page-specific styles
- View-specific responsive adjustments
- One-off styling that's only used in a single component

## Usage

### In Vue Components
```vue
<template>
  <div class="my-component">
    <!-- Use shared button classes -->
    <button class="btn btn-primary btn-lg">
      Shared Button Style
    </button>
    
    <!-- Component-specific elements -->
    <div class="custom-content">
      Local content
    </div>
  </div>
</template>

<style scoped>
/* Component-specific styles only */
.my-component {
  /* Local styles here */
}

.custom-content {
  /* Styles specific to this component */
}
</style>
```

### Importing Shared Styles
All shared styles are automatically available through the main.scss import. No need to import individual style files in components unless you need specific mixins or functions.

## Benefits

1. **Better Maintainability** - Component styles stay with their components
2. **Clearer Separation** - Easy to distinguish shared vs. component-specific styles
3. **Reduced Bundle Size** - No duplicate component-specific styles in the global bundle
4. **Better Scoping** - Component styles are naturally scoped and don't leak 