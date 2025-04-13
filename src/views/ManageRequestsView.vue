<template>
  <CBox maxW="7xl" mx="auto" :p="{ base: '4', sm: '6', lg: '8' }" bg="background" minH="calc(100vh - 8rem)">
    <!-- Header -->
    <CBox mb="8" pb="4" borderBottomWidth="1px" borderColor="border">
      <CHeading size="xl" color="text-primary">Manage Event Requests</CHeading>
    </CBox>

    <!-- Loading state -->
    <CFlex v-if="loading" justify="center" py="16">
      <CSpinner size="xl" color="primary" thickness="4px" />
    </CFlex>

    <!-- Error state -->
    <CAlert v-else-if="error" status="error" variant="subtle" textAlign="center" py="16">
      <CAlertIcon />
      <CAlertDescription fontWeight="semibold">{{ error }}</CAlertDescription>
    </CAlert>

    <!-- Event requests list -->
    <CBox v-else>
      <CAlert v-if="pendingRequests.length === 0" status="info" variant="subtle" textAlign="center" fontStyle="italic">
        <CAlertIcon />
        <CAlertDescription>No pending event requests.</CAlertDescription>
      </CAlert>

      <CStack v-else spacing="6">
        <CBox v-for="(group, index) in groupedRequests" :key="index" spacing="4">
          <CHeading size="md" color="text-primary" pb="2" borderBottomWidth="1px" borderColor="border">
            {{ group.title }}
          </CHeading>
          <CSimpleGrid :columns="{ base: 1, sm: 2, lg: 3 }" spacing="6" mt="4">
            <RequestCard
              v-for="request in group.requests"
              :key="request.id"
              :event="request"
              @approve="approveRequest(request.id)"
              @reject="confirmRejectRequest(request.id)"
              class="animate-fade-in"
            />
          </CSimpleGrid>
        </CBox>
      </CStack>
    </CBox>

    <!-- Confirmation Modal for Reject Request -->
    <ConfirmationModal
      v-if="showRejectConfirmModal"
      :visible="showRejectConfirmModal"
      title="Reject Event Request?"
      message="Are you sure you want to reject this event request? This action cannot be undone."
      confirm-text="Reject Request"
      cancel-text="Cancel"
      @confirm="rejectRequestConfirmed"
      @cancel="cancelRejectRequest"
      @close="cancelRejectRequest"
    />
  </CBox>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import {
  Box as CBox,
  Flex as CFlex,
  Heading as CHeading,
  Stack as CStack,
  SimpleGrid as CSimpleGrid,
  Spinner as CSpinner,
  Alert as CAlert,
  AlertIcon as CAlertIcon,
  AlertDescription as CAlertDescription
} from '@chakra-ui/vue-next';
import RequestCard from '../components/RequestCard.vue';
import ConfirmationModal from '../components/ConfirmationModal.vue';

const store = useStore();
const loading = ref(false);
const error = ref(null);
const pendingRequests = computed(() => store.getters['events/pendingEvents']);

// State for confirmation modal
const showRejectConfirmModal = ref(false);
const eventIdToReject = ref(null);

const groupedRequests = computed(() => {
  const groups = {};
  
  pendingRequests.value.forEach(request => {
    const date = request.createdAt?.toDate() || new Date();
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[yearMonth]) {
      groups[yearMonth] = [];
    }
    groups[yearMonth].push(request);
  });

  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
    .map(([yearMonth, requests]) => {
      const [year, month] = yearMonth.split('-');
      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
      return {
        title: `${monthName} ${year}`,
        requests
      };
    });
});

async function fetchRequests() {
  loading.value = true;
  error.value = null;
  try {
    // Assuming fetchEvents fetches all events including pending ones
    await store.dispatch('events/fetchEvents');
  } catch (err) {
    error.value = 'Failed to load event requests.';
    console.error("Error fetching event requests:", err);
     store.dispatch('notification/showNotification', {
        message: `Failed to load requests: ${err.message || 'Unknown error'}`,
        type: 'error'
    });
  } finally {
    loading.value = false;
  }
}

const approveRequest = async (eventId) => {
  if (loading.value) return;
  loading.value = true;
  try {
    await store.dispatch('events/approveEventRequest', eventId);
     store.dispatch('notification/showNotification', {
        message: 'Event request approved successfully.',
        type: 'success'
    });
    // Re-fetch or update local state if needed
    // await fetchRequests(); // Or remove locally: pendingRequests.value = pendingRequests.value.filter(req => req.id !== eventId);
  } catch (err) {
    error.value = `Failed to approve request: ${err.message}`;
    console.error("Error approving event request:", err);
     store.dispatch('notification/showNotification', {
        message: `Failed to approve request: ${err.message || 'Unknown error'}`,
        type: 'error'
    });
  } finally {
    loading.value = false;
  }
};

// --- Reject Request Flow with Confirmation Modal ---
const confirmRejectRequest = (eventId) => {
  eventIdToReject.value = eventId;
  showRejectConfirmModal.value = true;
};

const cancelRejectRequest = () => {
  showRejectConfirmModal.value = false;
  eventIdToReject.value = null;
};

const rejectRequestConfirmed = async () => {
  const eventId = eventIdToReject.value;
  if (!eventId || loading.value) return;

  loading.value = true;
  showRejectConfirmModal.value = false; // Hide modal after confirm
  try {
    // Assuming rejectEventRequest takes an object { eventId, reason }
    await store.dispatch('events/rejectEventRequest', { eventId, reason: 'Rejected by admin' }); // Provide a default reason or implement input
    store.dispatch('notification/showNotification', {
        message: 'Event request rejected successfully.',
        type: 'success' // Or 'info'
    });
     // Re-fetch or update local state if needed
     // await fetchRequests(); // Or remove locally: pendingRequests.value = pendingRequests.value.filter(req => req.id !== eventId);
  } catch (err) {
    error.value = `Failed to reject request: ${err.message}`;
    console.error("Error rejecting event request:", err);
    store.dispatch('notification/showNotification', {
        message: `Failed to reject request: ${err.message || 'Unknown error'}`,
        type: 'error'
    });
  } finally {
    loading.value = false;
    eventIdToReject.value = null;
  }
};
// --- End Reject Request Flow ---


onMounted(() => {
  fetchRequests();
});
</script>
