<template>
  <CFlex direction="column" align="center" justify="center" minH="calc(100vh - 8rem)" p="4">
    <CBox textAlign="center" maxW="md">
      <CHeading as="h1" size="4xl" color="primary" mb="4">404</CHeading>
      <CHeading as="h2" size="lg" color="text-primary" mb="4">Page Not Found</CHeading>
      <CText color="text-secondary" mb="8">Sorry, we couldn't find the page you're looking for.</CText>
      
      <CButtonGroup spacing="4">
        <CButton
          as="router-link"
          to="/"
          leftIcon={<CIcon name="fa-home" />}
          colorScheme="primary"
        >
          Go Home
        </CButton>
        <CButton
          onClick={() => $router.go(-1)}
          leftIcon={<CIcon name="fa-arrow-left" />}
          variant="outline"
        >
          Go Back
        </CButton>
      </CButtonGroup>
    </CBox>
  </CFlex>
</template>

<script setup>
import {
  Flex as CFlex,
  Box as CBox,
  Heading as CHeading,
  Text as CText,
  Button as CButton,
  ButtonGroup as CButtonGroup,
  Icon as CIcon
} from '@chakra-ui/vue-next'
</script>
