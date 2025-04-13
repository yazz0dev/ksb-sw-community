<template>
  <CCard variant="outline" shadow="md" borderRadius="lg" p="4">
    <CFlex direction={{ base: 'column', md: 'row' }} justify="space-between" gap="4">
      <CBox flex="1">
        <CText fontSize="lg" fontWeight="medium" color="text-primary" mb="2">
          {{ request.title }}
        </CText>
        <CStack spacing="2">
          <CFlex align="center" color="text-secondary">
            <CIcon name="fa-calendar" mr="2" />
            <CText fontSize="sm">Requested Date: {{ formatDate(request.requestDate) }}</CText>
          </CFlex>
          <CFlex align="center" color="text-secondary">
            <CIcon name="fa-user" mr="2" />
            <CText fontSize="sm">Requested By: {{ request.requesterName }}</CText>
          </CFlex>
        </CStack>
      </CBox>
      <CFlex gap="2" align={{ base: 'stretch', md: 'start' }} direction={{ base: 'row', md: 'column' }}>
        <CButton
          colorScheme="green"
          size="sm"
          leftIcon={<CIcon name="fa-check" />}
          onClick="approve"
          :isLoading="processing"
        >
          Approve
        </CButton>
        <CButton
          colorScheme="red"
          size="sm"
          variant="outline"
          leftIcon={<CIcon name="fa-times" />}
          onClick="reject"
          :isLoading="processing"
        >
          Reject
        </CButton>
      </CFlex>
    </CFlex>
  </CCard>
</template>

<script setup>
import {
  Card as CCard,
  Box as CBox,
  Flex as CFlex,
  Stack as CStack,
  Text as CText,
  Button as CButton,
  Icon as CIcon
} from '@chakra-ui/vue-next'
</script>