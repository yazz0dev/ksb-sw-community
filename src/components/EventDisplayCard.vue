<template>
    <CBox minW="0" flex="1" :sx="{ '& > *:not(style) ~ *:not(style)': { marginTop: '0.5rem' } }">
       <CHeading as="h3" size="lg" fontWeight="semibold" color="var(--color-text-primary)" mb="1">
           {{ event.eventName }} 
           <CText as="span" fontWeight="normal" color="var(--color-text-secondary)">({{ event.eventType }})</CText>
       </CHeading>

       <!-- Details Section with improved layout -->
       <CGrid :templateColumns="{ base: '1fr', sm: 'repeat(2, 1fr)' }" :gap="{ x: 4, y: 1 }" fontSize="sm" color="var(--color-text-secondary)">
           <CText><CText as="strong" fontWeight="medium" color="var(--color-text-primary)" mr="1">Requested by:</CText> {{ nameCache[event.requester] || '(Name unavailable)' }}</CText>
           <CText><CText as="strong" fontWeight="medium" color="var(--color-text-primary)" mr="1">Dates:</CText> {{ formatDate(event.startDate || event.desiredStartDate) }} - {{ formatDate(event.endDate || event.desiredEndDate) }}</CText>
           <CText><CText as="strong" fontWeight="medium" color="var(--color-text-primary)" mr="1">Team Event:</CText> {{ event.isTeamEvent ? 'Yes' : 'No' }}</CText>
           <CText v-if="showStatus && event.status">
               <CText as="strong" fontWeight="medium" color="var(--color-text-primary)" mr="1">Status:</CText>
               <CBadge :colorScheme="statusColorScheme.color" :variant="statusColorScheme.variant" fontSize="xs" px="2" py="0.5" borderRadius="full">
                   {{ event.status }}
               </CBadge>
           </CText>
       </CGrid>

       <CText v-if="event.organizers && event.organizers.length > 0" fontSize="sm" color="var(--color-text-secondary)">
           <CText as="strong" fontWeight="medium" color="var(--color-text-primary)">Co-Organizers:</CText>
           <CText as="span" v-for="(orgId, idx) in event.organizers" :key="orgId">
               {{ nameCache[orgId] || '(Name unavailable)' }}{{ idx < event.organizers.length - 1 ? ', ' : '' }}
           </CText>
       </CText>

       <CAlert 
         v-if="showStatus && event.status === 'Rejected' && event.rejectionReason" 
         status="error" 
         variant="subtle" 
         fontSize="sm" 
         mt="1" 
         p="2" 
         borderRadius="md"
         bg="var(--color-error-extraLight)"
         borderColor="var(--color-error-light)"
         borderWidth="1px"
         color="var(--color-error-text)"
       >
         <CAlertIcon name="warning" color="var(--color-error)" />
         <CAlertDescription>
           <CText as="strong" fontWeight="medium">Rejection Reason:</CText> {{ event.rejectionReason }}
         </CAlertDescription>
       </CAlert>

       <!-- Description -->
       <CBox pt="2">
           <CText as="strong" display="block" fontSize="sm" fontWeight="medium" color="var(--color-text-primary)" mb="1">Description:</CText>
           <CText fontSize="sm" color="var(--color-text-secondary)">{{ event.description }}</CText> 
       </CBox>

       <!-- Display XP/Constraint Info with better styling -->
       <CBox v-if="event.xpAllocation && event.xpAllocation.length > 0" mt="3" pt="3" borderTopWidth="1px" borderColor="var(--color-border)">
           <CText as="strong" display="block" fontSize="sm" fontWeight="medium" color="var(--color-text-primary)" mb="1">Rating Criteria & XP:</CText>
           <CList spacing="1" fontSize="sm" color="var(--color-text-secondary)">
               <CListItem v-for="(alloc, index) in event.xpAllocation" :key="index" d="flex" alignItems="center">
                   <CIcon name="star" color="yellow.400" mr="2" fontSize="xs" /> 
                   <CText as="span">{{ alloc.constraintLabel || 'Unnamed Criteria' }}: <CText as="span" fontWeight="medium">{{ alloc.points }} XP</CText> <CText as="span" fontSize="xs" color="var(--color-text-secondary)">({{ formatRoleName(alloc.role) }})</CText></CText>
               </CListItem>
           </CList>
       </CBox>
    </CBox>
</template>

<script setup>
import { computed } from 'vue';
import { formatRoleName } from '../utils/formatters';
import {
  Box as CBox,
  Text as CText,
  Heading as CHeading,
  SimpleGrid as CGrid,
  Badge as CBadge,
  Alert as CAlert,
  AlertIcon as CAlertIcon,
  AlertDescription as CAlertDescription,
  List as CList,
  ListItem as CListItem,
  Icon as CIcon
} from '@chakra-ui/vue-next';

const props = defineProps({
    event: { type: Object, required: true },
    nameCache: { type: Object, required: true },
    showStatus: { type: Boolean, default: false } // Prop to control status visibility
});

// Robust Date Formatting
const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    let date;
    if (typeof dateInput.toDate === 'function') date = dateInput.toDate();
    else if (dateInput instanceof Date) date = dateInput;
    else date = new Date(dateInput);

    if (isNaN(date.getTime())) return 'Invalid Date';
    try {
        return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
    } catch (error) { return 'Formatting Error'; }
};

// Status color scheme computation
const statusColorScheme = computed(() => {
  switch (props.event?.status) {
    case 'Approved':
    case 'Upcoming':
      return { color: 'green', variant: 'subtle' };
    case 'Pending':
      return { color: 'yellow', variant: 'subtle' };
    case 'Rejected':
      return { color: 'red', variant: 'subtle' };
    case 'In Progress':
    case 'Ongoing':
      return { color: 'blue', variant: 'subtle' };
    case 'Completed':
    case 'Cancelled': // Group cancelled with completed for display
      return { color: 'gray', variant: 'subtle' };
    default:
      return { color: 'gray', variant: 'subtle' }; // Default fallback
  }
});

</script>
