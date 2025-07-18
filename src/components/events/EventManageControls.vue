<template>
  <div class="event-manage-controls">
    <!-- Voting & Closing Section -->
    <div v-if="showVotingClosingSection" class="section-card shadow-sm rounded-4 p-3 p-md-4 mb-4 animate-fade-in">
      <div class="section-header mb-4">
        <div class="d-flex justify-content-between align-items-start align-items-md-center flex-column flex-md-row gap-2">
          <h3 class="h5 h4-md text-dark mb-0">
            <i class="fas fa-vote-yea text-primary me-2"></i>
            Event Management
          </h3>
          <span class="badge rounded-pill small" :class="statusBadgeClass">{{ event.status }}</span>
        </div>
      </div>
      
      <div class="action-buttons-grid">
        <!-- Award Points Button -->
        <button
          v-if="showAwardPointsButton"
          type="button"
          class="btn btn-primary action-btn"
          @click="goToAwardPoints"
        >
          <i class="fas fa-award me-2"></i>
          <span>Award Points</span>
        </button>

        <!-- Edit Event Button -->
        <button
          v-if="showEditButton"
          type="button"
          class="btn btn-outline-primary action-btn"
          @click="goToEditEvent"
        >
          <i class="fas fa-edit me-2"></i>
          <span>Edit Event</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';
import { EventStatus, EventFormat, type Event } from '@/types/event';
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import {
  isEventOrganizer,
  isEventEditable,
} from '@/utils/permissionHelpers';

// Define props and emits
const props = defineProps<{
  event: Event;
}>();

// Setup state
const router = useRouter();
const studentStore = useProfileStore();

// --- User Role & Permissions ---
const currentUserId = computed<string | null>(() => studentStore.currentStudent?.uid ?? null);

const localIsOrganizer = computed(() => {
  return isEventOrganizer(props.event, currentUserId.value);
});

const statusBadgeClass = computed(() => getEventStatusBadgeClass(props.event?.status));

// --- Button Visibility Logic ---
const showAwardPointsButton = computed(() =>
  localIsOrganizer.value &&
  props.event?.status === EventStatus.Approved
);

const showEditButton = computed(() =>
  localIsOrganizer.value &&
  isEventEditable(props.event?.status)
);

// --- Section Visibility ---
const showVotingClosingSection = computed(() =>
    showAwardPointsButton.value || showEditButton.value
);

// --- Actions ---
const goToEditEvent = (): void => {
  if (props.event.details.format === EventFormat.MultiEvent) {
    router.push({ name: 'EditMultiEvent', params: { eventId: props.event.id } });
  } else {
    router.push({ name: 'EditEvent', params: { eventId: props.event.id } });
  }
};

const goToAwardPoints = (): void => {
  router.push({ name: 'AwardPoints', params: { id: props.event.id } });
};
</script>

<style scoped>
.event-manage-controls {
  max-width: 1000px;
  margin: 0 auto;
}

/* Section Styling */
.section-card {
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
}

.section-header {
  border-bottom: 1px solid var(--bs-border-color-translucent);
  padding-bottom: 1rem;
  margin-bottom: 1.5rem !important;
}

/* Action Buttons Grid */
.action-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  font-weight: 500;
  font-size: 0.9rem;
  border-radius: var(--bs-border-radius);
  transition: all 0.2s ease;
  min-height: 2.75rem;
  white-space: nowrap;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--bs-box-shadow);
}

.action-btn:disabled {
  opacity: 0.65;
  transform: none;
}

/* Badge Styling */
.badge {
  padding: 0.4em 0.8em;
  font-size: 0.85rem;
  font-weight: 500;
}

/* Animation */
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .action-buttons-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .action-btn {
    padding: 0.625rem 0.875rem;
    font-size: 0.85rem;
    min-height: 2.5rem;
  }
  
  .section-header {
    padding-bottom: 0.75rem;
    margin-bottom: 1rem !important;
  }
}

@media (max-width: 480px) {
  .section-header .d-flex {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 0.75rem;
  }
  
  .action-btn {
    font-size: 0.8rem;
    padding: 0.5rem 0.75rem;
    min-height: 2.25rem;
  }
}
</style>