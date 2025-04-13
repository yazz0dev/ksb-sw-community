import { defineStyle, defineStyleConfig, extendTheme } from '@chakra-ui/vue-next'

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
    }
  },
  components: {
    Button: defineStyleConfig({
      baseStyle: defineStyle({
        fontWeight: 'medium',
        borderRadius: 'md'
      }),
      variants: {
        primary: defineStyle({
          bg: 'primary.500',
          color: 'white',
          _hover: { bg: 'primary.600' }
        }),
        outline: defineStyle({
          borderColor: 'gray.200',
          _hover: { bg: 'gray.50' }
        })
      }
    }),
    Card: defineStyleConfig({
      baseStyle: defineStyle({
        container: {
          bg: 'white',
          borderRadius: 'lg',
          boxShadow: 'sm',
          borderWidth: '1px',
          borderColor: 'gray.200'
        }
      })
    }),
    Form: defineStyleConfig({
      baseStyle: defineStyle({
        helperText: {
          fontSize: 'sm',
          color: 'gray.600'
        },
        errorText: {
          fontSize: 'sm',
          color: 'red.500'
        }
      })
    }),
    FormLabel: defineStyleConfig({
      baseStyle: defineStyle({
        marginBottom: '2',
        fontSize: 'sm',
        fontWeight: 'medium',
        color: 'gray.700'
      })
    })
  }
})

export default theme
