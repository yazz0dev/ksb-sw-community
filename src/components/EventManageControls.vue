<template>
  <CBox bg="surface" shadow="md" borderWidth="1px" borderRadius="lg" p="4">
    <!-- Status Management Section -->
    <CStack spacing="4">
      <CBox>
        <CHeading size="lg" color="text-primary" mb="3">Event Management</CHeading>
        <CFlex align="center" gap="3">
          <CText fontSize="sm" fontWeight="medium" color="text-secondary">Current Status:</CText>
          <CBadge :variant="statusVariant">{{ event.status }}</CBadge>
        </CFlex>

        <!-- Status Update Controls -->
        <CButtonGroup mt="4" spacing="2" wrap="wrap">
          <CButton
            v-if="canStartEvent"
            :leftIcon="h(CIcon, { name: 'fa-play' })"
            colorScheme="primary"
            :isDisabled="!isWithinEventDates"
            @click="updateStatus('InProgress')"
          >
            Start Event
          </CButton>

          <CButton
            v-if="canComplete"
            :leftIcon="h(CIcon, { name: 'fa-check' })"
            colorScheme="green"
            @click="updateStatus('Completed')"
          >
            Mark Complete
          </CButton>

          <CButton
            v-if="canCancel"
            :leftIcon="h(CIcon, { name: 'fa-times' })"
            colorScheme="red"
            @click="confirmCancel"
          >
            Cancel Event
          </CButton>
        </CButtonGroup>
      </CBox>

      <!-- Rating Controls -->
      <CBox v-if="event.status === 'Completed' && !event.closed" borderTopWidth="1px" pt="4">
        <CFlex align="center" justify="space-between" mb="4">
          <CHeading size="lg" color="text-primary">Ratings</CHeading>
          <CBadge :colorScheme="event.ratingsOpen ? 'green' : 'yellow'">
            {{ event.ratingsOpen ? 'Open' : 'Closed' }}
          </CBadge>
        </CFlex>

        <CButtonGroup spacing="2">
          <CButton
            v-if="event.ratingsOpen && canToggleRatings"
            :leftIcon="h(CIcon, { name: 'fa-lock' })"
            colorScheme="yellow"
            :isLoading="isLoadingRatings"
            @click="toggleRatings"
          >
            Close Ratings
          </CButton>

          <CButton
            v-else-if="!event.ratingsOpen && canToggleRatings"
            :leftIcon="h(CIcon, { name: 'fa-lock-open' })"
            colorScheme="green"
            :isLoading="isLoadingRatings"
            @click="toggleRatings"
          >
            Open Ratings
          </CButton>

          <CButton
            v-if="canCloseEvent"
            :leftIcon="h(CIcon, { name: 'fa-archive' })"
            colorScheme="red"
            @click="closeEvent"
          >
            Close Event
          </CButton>
        </CButtonGroup>
      </CBox>
    </CStack>
  </CBox>
</template>

<script setup>
import { computed, ref, h } from 'vue';
import { useStore } from 'vuex';
import {
  Box as CBox,
  Button as CButton,
  ButtonGroup as CButtonGroup,
  Stack as CStack,
  Heading as CHeading,
  Text as CText,
  Flex as CFlex,
  Badge as CBadge,
  Icon as CIcon
} from '@chakra-ui/vue-next';

const props = defineProps({
    event: {
        type: Object,
        required: true
    }
});

const store = useStore();
const isLoadingRatings = ref(false);

const statusVariant = computed(() => {
  switch (props.event.status) {
    case 'Approved': return { colorScheme: 'blue', variant: 'subtle' };
    case 'InProgress': return { colorScheme: 'primary', variant: 'subtle' };
    case 'Completed': return { colorScheme: 'green', variant: 'subtle' };
    case 'Cancelled': return { colorScheme: 'red', variant: 'subtle' };
    default: return { colorScheme: 'gray', variant: 'subtle' };
  }
});

const isWithinEventDates = computed(() => {
    if (!props.event.startDate || !props.event.endDate) return false;
    const now = new Date();
    const start = props.event.startDate.toDate();
    const end = props.event.endDate.toDate();
    return now >= start && now <= end;
});

const canManageRatings = computed(() => {
    const isClosedByAdmin = props.event.ratingsClosed;
    return !isClosedByAdmin && props.event.ratingsOpenCount < 2;
});

const canToggleRatings = computed(() => 
    !props.event.closed && 
    canManageRatings.value &&
    props.event.status === 'Completed'
);

const canCloseEvent = computed(() => 
    props.event.status === 'Completed' && 
    props.event.ratingsOpenCount > 0 && 
    !props.event.ratingsOpen && 
    !props.event.closed
);

// Status transition permissions
const canStartEvent = computed(() => 
    props.event.status === 'Approved' && 
    !!props.event.startDate && 
    !!props.event.endDate
);

const canComplete = computed(() => 
    props.event.status === 'InProgress'
);

const canCancel = computed(() => 
    ['Approved', 'InProgress'].includes(props.event.status)
);

const isAdmin = computed(() => store.getters['user/getUserRole'] === 'Admin');

const updateStatus = async (newStatus) => {
    try {
        await store.dispatch('events/updateEventStatus', {
            eventId: props.event.id,
            newStatus
        });
    } catch (error) {
        store.dispatch('notification/showNotification', {
            message: error.message,
            type: 'error'
        });
    }
};

const toggleRatings = async () => {
    if (isLoadingRatings.value || !canManageRatings.value) return;
    
    // If admin is closing ratings, mark them as permanently closed
    const adminClosing = isAdmin.value && props.event.ratingsOpen;
    
    isLoadingRatings.value = true;
    try {
        await store.dispatch('events/toggleRatingsOpen', {
            eventId: props.event.id,
            isOpen: !props.event.ratingsOpen,
            permanentClose: adminClosing
        });
    } catch (error) {
        store.dispatch('notification/showNotification', {
            message: error.message,
            type: 'error'
        });
    } finally {
        isLoadingRatings.value = false;
    }
};

const confirmCancel = async () => {
    if (confirm('Are you sure you want to cancel this event? This action cannot be undone.')) {
        await updateStatus('Cancelled');
    }
};

const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(date);
};
</script>

<style scoped>
</style>
