<template>
  <CBox bg="surface" borderWidth="1px" borderRadius="lg" shadow="md" overflow="hidden">
    <CBox :p="{ base: '4', sm: '6', lg: '8' }">
      <!-- Header Content -->
      <CFlex :direction="{ base: 'column', md: 'row' }" justify="space-between" align="start" gap="4">
        <CBox flex="1">
          <CFlex align="center" gap="2" mb="2">
            <CBadge :colorScheme="statusColor" variant="subtle">
              {{ event.status }}
            </CBadge>
            <CBadge v-if="event.closed" colorScheme="gray" variant="subtle">
              Archived
            </CBadge>
          </CFlex>

          <CHeading size="xl" color="text-primary" mb="2">
            {{ event.title }}
          </CHeading>

          <CStack direction="row" spacing="6" mb="4">
            <CFlex align="center">
              <CIcon name="fa-calendar" color="text-secondary" mr="2" />
              <CText color="text-secondary" fontSize="sm">
                {{ formatDate(event.startDate) }} - {{ formatDate(event.endDate) }}
              </CText>
            </CFlex>
            <CFlex align="center">
              <CIcon name="fa-users" color="text-secondary" mr="2" />
              <CText color="text-secondary" fontSize="sm">
                {{ event.teamSize }} members per team
              </CText>
            </CFlex>
          </CStack>

          <CBox>
            <CProse v-html="renderedDescription" />
          </CBox>
        </CBox>

        <!-- Action Buttons -->
        <CStack spacing="3" :min-w="{ md: '200px' }">
          <CButton
            v-if="canJoin"
            colorScheme="primary"
            :left-icon="'fa-plus'"
            @click="$emit('join')"
            :isLoading="isJoining"
          >
            Join Event
          </CButton>

          <CButton
            v-if="canLeave"
            colorScheme="red"
            variant="outline"
            :left-icon="'fa-times'"
            @click="$emit('leave')"
            :isLoading="isLeaving"
          >
            Leave Event
          </CButton>

          <CButton
            v-if="canEdit"
            variant="outline"
            :left-icon="'fa-edit'"
            @click="$router.push(`/event/${event.id}/edit`)"
          >
            Edit Event
          </CButton>
        </CStack>
      </CFlex>
    </CBox>
  </CBox>
</template>

<script setup>
import {
  Box as CBox,
  Flex as CFlex,
  Stack as CStack,
  Heading as CHeading,
  Text as CText,
  Button as CButton,
  Badge as CBadge,
  Icon as CIcon,
  Box as CProse
} from '@chakra-ui/vue-next'

// ...existing code...

const statusColor = computed(() => {
  switch (event.status) {
    case 'Pending': return 'yellow';
    case 'Approved': return 'blue';
    case 'InProgress': return 'primary';
    case 'Completed': return 'green';
    case 'Cancelled': return 'red';
    default: return 'gray';
  }
});
</script>
