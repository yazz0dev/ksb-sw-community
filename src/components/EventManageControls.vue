<template>
  <div class="box" style="background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: 6px;">
    <!-- Status Management Section -->
    <div class="mb-5">
      <h3 class="title is-4 has-text-primary mb-3">Event Management</h3>
      <div class="is-flex is-align-items-center mb-4">
        <span class="is-size-7 has-text-weight-medium has-text-grey mr-3">Current Status:</span>
        <span class="tag is-rounded" :class="statusBadgeClass">{{ event.status }}</span>
      </div>

      <!-- Status Update Controls -->
      <div class="buttons are-small">
        <button
          v-if="canStartEvent"
          class="button is-primary"
          :disabled="!isWithinEventDates || isActionLoading('InProgress')"
          @click="updateStatus('InProgress')"
          :class="{ 'is-loading': isActionLoading('InProgress') }"
        >
          <span class="icon is-small"><i class="fas fa-play"></i></span>
          <span>Start Event</span>
        </button>

        <button
          v-if="canComplete"
          class="button is-success"
          :disabled="isActionLoading('Completed')"
          @click="updateStatus('Completed')"
          :class="{ 'is-loading': isActionLoading('Completed') }"
        >
          <span class="icon is-small"><i class="fas fa-check"></i></span>
          <span>Mark Complete</span>
        </button>

        <button
          v-if="canCancel"
          class="button is-danger"
          :disabled="isActionLoading('Cancelled')"
          @click="confirmCancel"
          :class="{ 'is-loading': isActionLoading('Cancelled') }"
        >
          <span class="icon is-small"><i class="fas fa-times"></i></span>
          <span>Cancel Event</span>
        </button>
      </div>
      <p v-if="!isWithinEventDates && canStartEvent" class="is-size-7 has-text-danger mt-2">
        The event can only be started between its start and end dates.
      </p>
    </div>

    <!-- Rating Controls -->
    <div v-if="event.status === 'Completed' && !event.closed" class="pt-5" style="border-top: 1px solid var(--color-border);">
      <div class="is-flex is-justify-content-space-between is-align-items-center mb-4">
        <h3 class="title is-4 has-text-primary">Ratings</h3>
        <span class="tag is-rounded" :class="event.ratingsOpen ? 'is-success' : 'is-warning'">
          {{ event.ratingsOpen ? 'Open' : 'Closed' }}
        </span>
      </div>

      <div class="buttons are-small">
        <button
          v-if="event.ratingsOpen && canToggleRatings"
          class="button is-warning"
          :disabled="isLoadingRatings"
          @click="toggleRatings"
          :class="{ 'is-loading': isLoadingRatings }"
        >
          <span class="icon is-small"><i class="fas fa-lock"></i></span>
          <span>Close Ratings</span>
        </button>

        <button
          v-else-if="!event.ratingsOpen && canToggleRatings"
          class="button is-success"
          :disabled="isLoadingRatings"
          @click="toggleRatings"
          :class="{ 'is-loading': isLoadingRatings }"
        >
          <span class="icon is-small"><i class="fas fa-lock-open"></i></span>
          <span>Open Ratings</span>
        </button>

        <button
          v-if="canCloseEvent"
          class="button is-danger is-light"
          :disabled="isLoadingRatings"
          @click="confirmCloseEvent"
          :class="{ 'is-loading': isLoadingRatings }"
        >
          <span class="icon is-small"><i class="fas fa-archive"></i></span>
          <span>Close Event Permanently</span>
        </button>
      </div>
      <p v-if="!canManageRatings && event.status === 'Completed' && !event.closed" class="is-size-7 has-text-grey mt-2">
        <span v-if="event.ratingsClosed">Ratings have been manually closed by an admin.</span>
        <span v-else>Ratings have been opened and closed twice and cannot be toggled again.</span>
      </p>
       <p v-if="!canCloseEvent && event.status === 'Completed' && event.ratingsOpen" class="is-size-7 has-text-grey mt-2">
         Event must have ratings closed before it can be permanently closed.
       </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';

const props = defineProps({
    event: {
        type: Object,
        required: true
    }
});

const store = useStore();
const isLoadingRatings = ref(false);
const loadingAction = ref(null);

const statusBadgeClass = computed(() => {
  switch (props.event.status) {
    case 'Approved': return 'is-info';
    case 'InProgress': return 'is-primary';
    case 'Completed': return 'is-success';
    case 'Cancelled': return 'is-danger is-light';
    case 'Pending': return 'is-warning';
    case 'Rejected': return 'is-danger';
    default: return 'is-light';
  }
});

const isWithinEventDates = computed(() => {
    if (!props.event.startDate || !props.event.endDate) return false;
    const now = new Date();
    const start = props.event.startDate?.toDate ? props.event.startDate.toDate() : new Date(props.event.startDate);
    const end = props.event.endDate?.toDate ? props.event.endDate.toDate() : new Date(props.event.endDate);
    return now >= start && now <= end;
});

const canManageRatings = computed(() => {
    const isManuallyClosed = props.event.ratingsClosed === true;
    const openLimitReached = props.event.ratingsOpenCount >= 2;

    return !isManuallyClosed && !openLimitReached;
});

const canToggleRatings = computed(() => 
    !props.event.closed &&
    canManageRatings.value &&
    props.event.status === 'Completed'
);

const canCloseEvent = computed(() => 
    props.event.status === 'Completed' &&
    !props.event.ratingsOpen &&
    !props.event.closed
);

const canStartEvent = computed(() => 
    props.event.status === 'Approved' && 
    !!props.event.startDate && 
    !!props.event.endDate
);

const canComplete = computed(() => 
    props.event.status === 'InProgress'
);

const canCancel = computed(() => 
    ['Approved', 'InProgress'].includes(props.event.status) && !props.event.closed
);

const isAdmin = computed(() => store.getters['user/isAdmin']);

const isActionLoading = (action) => {
    return loadingAction.value === action;
};

const updateStatus = async (newStatus) => {
    if (loadingAction.value) return;
    loadingAction.value = newStatus;
    try {
        await store.dispatch('events/updateEventStatus', {
            eventId: props.event.id,
            newStatus
        });
    } catch (error) {
        store.dispatch('notification/showNotification', {
            message: error.message || `Failed to update status to ${newStatus}.`,
            type: 'error'
        });
    } finally {
        loadingAction.value = null;
    }
};

const toggleRatings = async () => {
    if (isLoadingRatings.value || !canManageRatings.value) return;
    
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
            message: error.message || 'Failed to toggle ratings status.',
            type: 'error'
        });
    } finally {
        isLoadingRatings.value = false;
    }
};

const confirmCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this event? This cannot be undone.')) {
        await updateStatus('Cancelled');
    }
};

const confirmCloseEvent = async () => {
    if (window.confirm('Are you sure you want to permanently close this event? Ratings cannot be reopened, and no further changes can be made.')) {
        await closeEventAction();
    }
};

const closeEventAction = async () => {
    if (isLoadingRatings.value) return;
    isLoadingRatings.value = true;
    try {
         await store.dispatch('events/closeEventPermanently', { eventId: props.event.id });
    } catch (error) {
        store.dispatch('notification/showNotification', {
            message: error.message || 'Failed to close the event.',
            type: 'error'
        });
    } finally {
         isLoadingRatings.value = false;
    }
};
</script>

<style scoped>
.buttons.are-small .button {
    margin-bottom: 0.5rem;
}
</style>
