<template>
  <div class="card voting-card shadow-sm animate-fade-in">
    <div class="card-header bg-warning-subtle border-0">
      <div class="d-flex align-items-center">
        <i class="fas fa-vote-yea text-warning me-2 fs-5"></i>
        <h5 class="mb-0 fw-semibold text-warning-emphasis">Voting</h5>
      </div>
    </div>
    <div class="card-body">
      <!-- Loading State -->
      <template v-if="loading">
        <div class="state-container loading-state">
          <div class="state-icon">
            <div class="spinner-border text-warning" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
          <div class="state-content">
            <h6 class="state-title">Loading Eligibility</h6>
            <p class="state-text">Checking your voting permissions...</p>
          </div>
        </div>
      </template>

      <!-- Not Logged In -->
      <template v-else-if="!currentUser">
        <div class="state-container auth-required-state">
          <div class="state-icon">
            <i class="fas fa-sign-in-alt text-secondary"></i>
          </div>
          <div class="state-content">
            <h6 class="state-title">Login Required</h6>
            <p class="state-text">Please log in to participate in voting.</p>
          </div>
        </div>
      </template>

      <!-- Event Not Completed -->
      <template v-else-if="event.status !== EventStatus.Completed">
        <div class="state-container waiting-state">
          <div class="state-icon">
            <i class="fas fa-clock text-info"></i>
          </div>
          <div class="state-content">
            <h6 class="state-title">Voting Not Available</h6>
            <p class="state-text">Voting will be available once the event is completed.</p>
            <div class="status-badge">
              <span class="badge bg-info-subtle text-info-emphasis">
                Current Status: {{ event.status }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- Voting Not Open -->
      <template v-else-if="!event.votingOpen">
        <div class="state-container closed-state">
          <div class="state-icon">
            <i class="fas fa-lock text-secondary"></i>
          </div>
          <div class="state-content">
            <h6 class="state-title">Voting Closed</h6>
            <p class="state-text">Voting is currently closed for this event.</p>
          </div>
        </div>
      </template>

      <!-- User Not Eligible to Vote -->
      <template v-else-if="!canVoteInThisEvent">
        <div class="state-container ineligible-state">
          <div class="state-icon">
            <i class="fas fa-user-slash text-muted"></i>
          </div>
          <div class="state-content">
            <h6 class="state-title">Not Eligible</h6>
            <p class="state-text">You are not eligible to vote in this event.</p>
          </div>
        </div>
      </template>

      <!-- User Has Already Voted -->
      <template v-else-if="hasUserVoted">
        <div class="state-container voted-state">
          <div class="state-icon">
            <i class="fas fa-check-circle text-success"></i>
          </div>
          <div class="state-content">
            <h6 class="state-title">Vote Submitted</h6>
            <p class="state-text">You have successfully submitted your vote!</p>
            <div v-if="canEditSubmission" class="action-section">
              <button 
                @click="openVotingForm" 
                class="btn btn-outline-primary btn-action"
              >
                <i class="fas fa-edit me-2"></i> Edit Vote
              </button>
            </div>
            <div v-else class="finalized-notice">
              <i class="fas fa-lock me-1 text-muted"></i>
              <span class="text-muted small">Voting has been finalized.</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Ready to Vote -->
      <template v-else>
        <div class="state-container ready-state">
          <div class="state-icon">
            <i class="fas fa-vote-yea text-primary"></i>
          </div>
          <div class="state-content">
            <h6 class="state-title">Ready to Vote</h6>
            <p class="state-text">Cast your vote for the best projects and teams!</p>
            <div class="action-section">
              <button 
                @click="openVotingForm" 
                class="btn btn-primary btn-action"
              >
                <i class="fas fa-vote-yea me-2"></i> Vote Now
              </button>
            </div>
          </div>
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
.voting-card {
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  overflow: hidden;
}

.card-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(var(--bs-warning-rgb), 0.2);
}

/* State Container */
.state-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 2rem 1.5rem;
  text-align: left;
}

.state-icon {
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 1.25rem;
}

.state-content {
  flex-grow: 1;
  min-width: 0;
}

.state-title {
  font-weight: 600;
  color: var(--bs-dark);
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.state-text {
  color: var(--bs-secondary);
  margin-bottom: 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

/* State-specific styling */
.loading-state .state-icon {
  background: rgba(var(--bs-warning-rgb), 0.1);
}

.auth-required-state .state-icon {
  background: rgba(var(--bs-secondary-rgb), 0.1);
}

.waiting-state .state-icon {
  background: rgba(var(--bs-info-rgb), 0.1);
}

.closed-state .state-icon {
  background: rgba(var(--bs-secondary-rgb), 0.1);
}

.ineligible-state .state-icon {
  background: var(--bs-light);
}

.voted-state .state-icon {
  background: rgba(var(--bs-success-rgb), 0.1);
}

.ready-state .state-icon {
  background: rgba(var(--bs-primary-rgb), 0.1);
}

/* Action Section */
.action-section {
  margin-top: 1rem;
}

.btn-action {
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  border-radius: var(--bs-border-radius);
  transition: all 0.2s ease;
}

.btn-action:hover {
  transform: translateY(-1px);
  box-shadow: var(--bs-box-shadow);
}

/* Status Badge */
.status-badge {
  margin-top: 0.75rem;
}

.badge {
  padding: 0.4em 0.8em;
  font-size: 0.8rem;
  font-weight: 500;
}

/* Finalized Notice */
.finalized-notice {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
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
  .card-header {
    padding: 0.875rem 1rem;
  }
  
  .state-container {
    flex-direction: column;
    text-align: center;
    padding: 1.5rem 1rem;
    gap: 0.75rem;
  }
  
  .state-icon {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1.1rem;
  }
  
  .state-title {
    font-size: 0.95rem;
  }
  
  .state-text {
    font-size: 0.85rem;
  }
  
  .btn-action {
    padding: 0.625rem 1.25rem;
    font-size: 0.9rem;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .state-container {
    padding: 1.25rem 0.75rem;
  }
  
  .state-icon {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 1rem;
  }
  
  .state-title {
    font-size: 0.9rem;
  }
  
  .state-text {
    font-size: 0.8rem;
  }
  
  .btn-action {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }
}
</style>
