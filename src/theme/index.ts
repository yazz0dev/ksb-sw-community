import { extendTheme } from '@chakra-ui/vue-next'

const theme = extendTheme({
  colors: {
    primary: {
      50: '#e0f2fe',
      100: '#bae6fd',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
    },
    gray: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    // Add standard color palettes
    red: {
      50: '#fee2e2',
      100: '#fecaca',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    yellow: {
      50: '#fefce8',
      100: '#fef9c3',
      500: '#eab308',
      600: '#ca8a04',
      700: '#a16207',
    },
    green: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    blue: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    }
  }
  // Removed components section relying on defineStyle/defineStyleConfig
})

export default theme
