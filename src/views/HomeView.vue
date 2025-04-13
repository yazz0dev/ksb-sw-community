<template>
  <CBox maxW="7xl" mx="auto" px={{ base: '4', sm: '6', lg: '8' }} py="8" bg="background" minH="calc(100vh - 8rem)">
    <template v-if="loading">
      <CFlex direction="column" align="center" justify="center" py="16">
        <CSpinner size="xl" color="primary" mb="2" />
        <CText color="text-secondary">Loading...</CText>
      </CFlex>
    </template>

    <template v-else>
      <CFlex wrap="wrap" justify="space-between" align="center" gap="4" mb="8" pb="4" borderBottomWidth="1px" borderColor="border">
        <CHeading as="h2" size="xl" color="text-primary" whiteSpace="nowrap">
          Events Dashboard
        </CHeading>
        
        <CButtonGroup spacing="3" wrap="wrap" justify="end">
          <CButton
            v-if="canRequestEvent && !isAdmin"
            as="router-link"
            to="/create-event"
            leftIcon={<CIcon name="fa-calendar-plus" />}
            colorScheme="primary"
          >
            {{ isAdmin ? 'Create Event' : 'Request Event' }}
          </CButton>

          <CButton
            v-if="isAdmin"
            as="router-link"
            to="/manage-requests"
            leftIcon={<CIcon name="fa-tasks" />}
            variant="outline"
          >
            Manage Requests
          </CButton>
        </CButtonGroup>
      </CFlex>

      <!-- Event Sections -->
      <CStack spacing="8">
        <!-- ...existing event sections with Chakra components... -->
      </CStack>
    </template>
  </CBox>
</template>

<script setup>
import {
  Box as CBox,
  Flex as CFlex,
  Heading as CHeading,
  Button as CButton,
  ButtonGroup as CButtonGroup,
  Stack as CStack,
  Text as CText,
  Icon as CIcon,
  Spinner as CSpinner
} from '@chakra-ui/vue-next'

import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import EventCard from '../components/EventCard.vue';
import EventCardSkeleton from '../components/EventCardSkeleton.vue'; // Import skeleton

const store = useStore();
const router = useRouter();
const allEvents = computed(() => store.getters['events/allEvents']); // Directly use getter
const loading = ref(true);
const userRole = computed(() => store.getters['user/getUserRole']);
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);

const isAdmin = computed(() => store.getters['user/getUserRole'] === 'Admin');
// Anyone authenticated can request (logic handled in RequestEvent view/action)
const canRequestEvent = computed(() => isAuthenticated.value);

// Update the computed properties to limit based on screen size
const maxEventsPerSection = computed(() => {
  // You can use window.innerWidth but it's not reactive
  // Consider using a reactive width value or CSS Grid instead
  if (window.innerWidth < 640) return 2; // mobile
  if (window.innerWidth < 1024) return 4; // tablet
  return 6; // desktop
});

const upcomingEvents = computed(() =>
  allEvents.value
    .filter(e => e.status === 'Upcoming' || e.status === 'Approved')
    .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0))
    .slice(0, maxEventsPerSection.value)
);

const activeEvents = computed(() =>
  allEvents.value
    .filter(e => e.status === 'In Progress' || e.status === 'InProgress')
    .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0))
    .slice(0, maxEventsPerSection.value)
);

const completedEvents = computed(() =>
  allEvents.value
    .filter(e => e.status === 'Completed')
    .sort((a, b) => (b.completedAt?.seconds ?? b.endDate?.seconds ?? 0) - (a.completedAt?.seconds ?? a.endDate?.seconds ?? 0))
    .slice(0, maxEventsPerSection.value)
);

// Add new ref for cancelled events visibility
const showCancelled = ref(false);

// Add new computed for cancelled events
const cancelledEvents = computed(() =>
  allEvents.value.filter(e => e.status === 'Cancelled')
       .sort((a, b) => (b.startDate?.seconds ?? 0) - (a.startDate?.seconds ?? 0)) // Sort cancelled newest first
);

onMounted(async () => {
  loading.value = true;
  try {
    await store.dispatch('events/fetchEvents');
    // Data is now reactive via the computed 'allEvents'
  } catch (error) {
    console.error("Failed to load events:", error);
    // Handle error display if needed
  } finally {
    loading.value = false;
  }
});
</script>

<!-- Keep fade-fast transition -->
<style scoped>
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.2s ease-in-out, max-height 0.3s ease-in-out;
  overflow: hidden;
  max-height: 1000px; /* Adjust if needed, large enough for grid */
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
