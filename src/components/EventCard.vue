<template>
  <CBox
    v-if="event && event.id"
    :bg="cardBackground"
    :borderRadius="'lg'"
    :overflow="'hidden'"
    :boxShadow="'md'"
    :borderWidth="'1px'"
    :borderColor="'var(--color-border)'"
    :d="'flex'"
    :flexDir="'column'"
    :h="'full'"
    :transition="'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out'"
    :_hover="{ boxShadow: 'lg', transform: 'translateY(-4px)' }"
    :opacity="isCancelledOrRejected ? 0.75 : 1"
  >
    <CBox p="5" d="flex" flexDir="column" flexGrow="1">
      <CFlex justify="space-between" align="start" mb="2">
        <CHeading
          as="h5"
          size="md" 
          fontWeight="semibold"
          color="var(--color-text-primary)"
          mb="0"
          mr="2"
          flex="1"
          :textDecoration="isCancelledOrRejected ? 'line-through' : 'none'"
          :color="isCancelledOrRejected ? 'var(--color-text-disabled)' : 'var(--color-text-primary)'"
        >
          {{ event.eventName }}
        </CHeading>
        <CBadge 
          px="2.5" 
          py="0.5" 
          fontSize="xs" 
          fontWeight="semibold" 
          borderRadius="full" 
          whiteSpace="nowrap"
          :colorScheme="statusBadgeColorScheme.color"
          :variant="statusBadgeColorScheme.variant"
        >
          {{ event.status }}
        </CBadge>
      </CFlex>
      <CFlex fontSize="xs" color="var(--color-text-secondary)" mb="3" align="center" wrap="wrap" gap="3">
        <CFlex align="center">
            <CIcon name="fa-tag" mr="1" color="var(--color-text-disabled)" />{{ event.eventType }}
        </CFlex>
        <CFlex align="center">
            <CIcon name="fa-calendar-alt" mr="1" color="var(--color-text-disabled)" />{{ formatDateRange(event.startDate, event.endDate) }}
        </CFlex>
      </CFlex>
      <CText fontSize="sm" color="var(--color-text-secondary)" mb="4" flexGrow="1">{{ truncatedDescription }}</CText>
      <CFlex justify="space-between" align="center" mt="auto" pt="3" borderTopWidth="1px" borderColor="var(--color-border)">
        <CButton
          as="router-link"
          :to="{ name: 'EventDetails', params: { id: event.id } }"
          size="xs"
          colorScheme="primary"
          color="var(--color-primary-text)"
          bg="var(--color-primary)"
          :_hover="{ bg: 'var(--color-primary-dark)' }"
          boxShadow="md"
        >
          View Details
        </CButton>
        <CFlex align="center" fontSize="sm" color="var(--color-text-secondary)">
          <CIcon name="fa-users" mr="1.5" color="var(--color-text-disabled)" /> {{ participantCount }}
        </CFlex>
      </CFlex>
    </CBox>
  </CBox>
</template>

<script setup>
import { computed } from 'vue';
import { DateTime } from 'luxon';
import { CBox, CFlex, CHeading, CBadge, CIcon, CText, CButton } from '@chakra-ui/vue-next';

const props = defineProps({
  event: {
    type: Object,
    required: true
  }
});

const isCancelledOrRejected = computed(() => 
  props.event.status === 'Cancelled' || props.event.status === 'Rejected'
);

// Add new computed property for background color
const cardBackground = computed(() => 
  isCancelledOrRejected.value ? 'var(--color-neutral)' : 'var(--color-surface)'
);

// Helper to format date range
const formatDateRange = (start, end) => {
  try {
    const startDateObj = start?.toDate ? DateTime.fromJSDate(start.toDate()) : DateTime.fromISO(start);
    const endDateObj = end?.toDate ? DateTime.fromJSDate(end.toDate()) : (end ? DateTime.fromISO(end) : null);

    if (!startDateObj.isValid) return 'Invalid date';

    const startDate = startDateObj.toLocaleString(DateTime.DATE_MED);
    const endDate = endDateObj?.isValid ? endDateObj.toLocaleString(DateTime.DATE_MED) : null;

    return endDate && startDate !== endDate ? `${startDate} - ${endDate}` : startDate;
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Date N/A';
  }
};

// Truncate description
const truncatedDescription = computed(() => {
  const maxLen = 90;
  const desc = props.event?.description || '';
  if (desc.length > maxLen) {
    return desc.substring(0, maxLen).trim() + '…';
  }
  return desc || 'No description provided.';
});

// Participant count (Handles arrays and potentially objects/maps)
const participantCount = computed(() => {
    // For team events, count all team members
    if (props.event.isTeamEvent && Array.isArray(props.event.teams)) {
        let count = 0;
        props.event.teams.forEach(team => {
            count += team.members?.length || 0;
        });
        return count;
    }
    
    // For non-team events, count participants
    const participants = props.event?.participants;
    if (Array.isArray(participants)) {
        return participants.length;
    }
    if (typeof participants === 'object' && participants !== null) {
        return Object.keys(participants).length;
    }
    return 0;
});

// Map status to Chakra color schemes and variants
const statusBadgeColorScheme = computed(() => {
  switch (props.event?.status) {
    case 'Approved':
    case 'Upcoming':
      return { color: 'green', variant: 'subtle' }; // Use subtle for light background
    case 'Pending':
      return { color: 'yellow', variant: 'subtle' };
    case 'In Progress':
    case 'Ongoing':
      return { color: 'blue', variant: 'subtle' };
    case 'Rejected':
      return { color: 'red', variant: 'subtle' };
    case 'Completed':
      return { color: 'gray', variant: 'subtle' };
    case 'Cancelled':
      return { color: 'gray', variant: 'outline' }; // Outline for cancelled
    default:
      return { color: 'gray', variant: 'subtle' }; // Default fallback
  }
});

</script>

<style scoped>
/* Styles moved to Tailwind utilities */
</style>
