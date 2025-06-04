<template>
  <div class="card shadow-sm mb-4 animate-fade-in">
    <div class="card-header bg-warning-subtle text-warning-emphasis">
      <div class="d-flex align-items-center">
        <i class="fas fa-trophy me-2"></i>
        <h5 class="mb-0 fw-medium">Voting</h5>
      </div>
    </div>
    <div class="card-body">
      <!-- Loading State -->
      <template v-if="loading">
        <div class="d-flex align-items-center justify-content-center py-3">
          <div class="spinner-border spinner-border-sm me-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <span class="small text-secondary">Loading eligibility...</span>
        </div>
      </template>

      <!-- Not Logged In -->
      <template v-else-if="!currentUser">
        <div class="text-center py-3">
          <i class="fas fa-sign-in-alt text-secondary fs-4 mb-2"></i>
          <p class="small text-secondary mb-0">Please log in to participate in voting.</p>
        </div>
      </template>

      <!-- Event Not Completed -->
      <template v-else-if="event.status !== EventStatus.Completed">
        <div class="text-center py-3">
          <i class="fas fa-clock text-secondary fs-4 mb-2"></i>
          <p class="small text-secondary mb-2">Voting will be available once the event is completed.</p>
          <span class="badge bg-secondary-subtle text-secondary-emphasis">
            Current Status: {{ event.status }}
          </span>
        </div>
      </template>

      <!-- Voting Not Open -->
      <template v-else-if="!event.votingOpen">
        <div class="text-center py-3">
          <i class="fas fa-lock text-secondary fs-4 mb-2"></i>
          <p class="small text-secondary mb-0">Voting is currently closed for this event.</p>
        </div>
      </template>

      <!-- User Not Eligible to Vote -->
      <template v-else-if="!canVoteInThisEvent">
        <div class="text-center py-3">
          <i class="fas fa-user-slash text-secondary fs-4 mb-2"></i>
          <p class="small text-secondary mb-0">You are not eligible to vote in this event.</p>
        </div>
      </template>

      <!-- User Has Already Voted -->
      <template v-else-if="hasUserVoted">
        <div class="text-center py-3">
          <div class="alert alert-success alert-sm d-flex align-items-center mb-3">
            <i class="fas fa-check-circle me-2"></i>
            <span>You have successfully submitted your vote!</span>
          </div>
          <button 
            v-if="canEditSubmission" 
            @click="openVotingForm" 
            class="btn btn-sm btn-outline-primary d-inline-flex align-items-center"
          >
            <i class="fas fa-edit me-1"></i> Edit Vote
          </button>
          <p v-else class="small text-muted mb-0">Voting has been finalized.</p>
        </div>
      </template>

      <!-- Ready to Vote -->
      <template v-else>
        <div class="text-center py-3">
          <i class="fas fa-vote-yea text-primary fs-4 mb-3"></i>
          <p class="small text-secondary mb-3">Cast your vote for the best projects and teams!</p>
          <button 
            @click="openVotingForm" 
            class="btn btn-primary d-inline-flex align-items-center"
          >
            <i class="fas fa-vote-yea me-2"></i> Vote Now
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { EventStatus, type Event } from '@/types/event';
import { type EnrichedStudentData } from '@/types/student';
import { hasUserSubmittedVotes } from '@/utils/eventDataUtils';
import { canUserVoteInEvent } from '@/utils/permissionHelpers';

interface Props {
  event: Event;
  currentUser: EnrichedStudentData | null;
  loading: boolean;
}

const props = defineProps<Props>();

const router = useRouter();

// Computed properties
const hasUserVoted = computed(() => {
  return hasUserSubmittedVotes(props.event, props.currentUser?.uid || null);
});

const canEditSubmission = computed(() => {
  return hasUserVoted.value && props.event?.votingOpen === true;
});

const canVoteInThisEvent = computed(() =>
  props.event && props.currentUser ? canUserVoteInEvent(props.event, props.currentUser) : false
);

// Methods
const openVotingForm = (): void => {
  if (!props.event) return;
  router.push({ name: 'SelectionForm', params: { eventId: props.event.id } });
};
</script>

<style scoped>
.alert-sm { 
  padding: 0.5rem 0.75rem; 
  font-size: 0.875em; 
}
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
</style>
