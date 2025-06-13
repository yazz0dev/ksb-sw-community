<template>
  <div class="participant-card card mb-4 shadow-sm animate-fade-in">
    <div v-if="showHeader" class="card-header d-flex justify-content-between align-items-center">
      <div class="header-content d-flex align-items-center">
        <div class="header-icon me-3">
          <i class="fas fa-user-friends"></i>
        </div>
        <div>
          <h6 class="mb-0 section-title">Participants</h6>
          <small class="text-muted">{{ displayParticipants.length }} member{{ displayParticipants.length === 1 ? '' : 's' }}</small>
        </div>
      </div>
      <button class="btn btn-outline-primary btn-sm toggle-btn" @click="showParticipants = !showParticipants">
        <i class="fas me-1" :class="showParticipants ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
        {{ showParticipants ? 'Hide' : 'Show' }}
      </button>
    </div>
    <div class="card-body" v-if="showParticipants || !showHeader">
      <div v-if="loading" class="loading-section text-center py-4">
        <div class="spinner-border spinner-border-sm text-primary me-2"></div>
        <span class="text-muted">Loading participants...</span>
      </div>
      <div v-else-if="displayParticipants.length === 0" class="empty-state text-center py-4">
        <div class="empty-icon mb-3">
          <i class="fas fa-users fa-2x text-muted opacity-50"></i>
        </div>
        <p class="text-muted mb-0">No participants yet.</p>
      </div>
      <div v-else class="participants-grid">
        <div
          v-for="(participantId, index) in displayParticipants"
          :key="participantId"
          class="participant-item d-flex align-items-center"
          :class="{ 'current-user': participantId === currentUserId }"
        >
          <div class="participant-number">
            {{ index + 1 }}
          </div>
          <router-link
            :to="{ name: 'PublicProfile', params: { userId: participantId } }"
            class="participant-link text-truncate flex-grow-1"
          >
            {{ getName(participantId) }}{{ participantId === currentUserId ? ' (You)' : '' }}
          </router-link>
          <div v-if="participantId === currentUserId" class="current-user-badge">
            <i class="fas fa-star"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  participants?: string[];
  coreParticipants?: string[];
  loading: boolean;
  currentUserId: string | null;
  showHeader?: boolean;
  getName: (uid: string) => string;
}

const props = defineProps<Props>();

// Use coreParticipants if provided, otherwise fall back to participants
const displayParticipants = computed(() => {
  return props.coreParticipants || props.participants || [];
});

const showParticipants = ref(true);
</script>

<style scoped>
/* Main Card Styling */
.participant-card {
  background-color: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius-lg); /* Consistent with TeamList */
  box-shadow: var(--bs-box-shadow-sm);
  transition: all 0.2s ease-in-out;
  overflow: hidden; /* Keep for potential pseudo-elements */
}

.participant-card:hover {
  border-color: var(--bs-primary);
  box-shadow: var(--bs-box-shadow);
  transform: translateY(-2px);
}

/* Optional: Simplified Top Border Accent (if showHeader is true) */
.participant-card.card:has(.card-header)::before { /* Apply only if header exists */
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, 
    var(--bs-primary) 0%, 
    var(--bs-info) 100%);
  opacity: 0.7;
  border-radius: var(--bs-border-radius-lg) var(--bs-border-radius-lg) 0 0;
}


/* Header Styling - Simplified */
.card-header {
  background-color: var(--bs-tertiary-bg); /* Subtle background */
  border-bottom: 1px solid var(--bs-border-color-translucent);
  padding: 0.75rem 1.25rem; /* Adjusted padding */
}

.header-icon {
  width: 2rem; /* Slightly smaller */
  height: 2rem;
  border-radius: 50%;
  background-color: var(--bs-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bs-white);
  font-size: 1rem;
  box-shadow: var(--bs-box-shadow-sm);
}

.section-title {
  color: var(--bs-emphasis-color); /* Standard emphasis color */
  font-weight: 600;
  font-size: 1.05rem; /* Adjusted */
}

.toggle-btn {
  /* Uses Bootstrap default btn-outline-primary styling */
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
}

/* Body Styling */
.card-body {
  padding: 1rem 1.25rem; /* Standardized */
}

/* Loading State - Simplified */
.loading-section {
  background-color: transparent;
  padding: 1rem;
}

/* Empty State - Simplified */
.empty-state {
  background-color: transparent;
  padding: 1.5rem;
}

.empty-icon {
  opacity: 0.5; /* Less pronounced */
}

/* Participants Grid */
.participants-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem; /* Reduced gap */
}

@media (min-width: 576px) {
  .participants-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); /* Adjusted minmax */
  }
}

/* Participant Items - Simplified */
.participant-item {
  padding: 0.6rem 1rem; /* Adjusted padding */
  background-color: var(--bs-body-bg); /* Match card background */
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius); /* Standard radius */
  transition: all 0.2s ease;
}

.participant-item:hover {
  background-color: var(--bs-tertiary-bg);
  border-color: var(--bs-primary-border-subtle);
  transform: translateX(4px); /* Subtle hover effect */
  box-shadow: none;
}

.participant-item.current-user {
  background-color: var(--bs-warning-bg-subtle);
  border-color: var(--bs-warning-border-subtle);
}

/* Participant Number - Simplified */
.participant-number {
  width: 1.75rem; /* Smaller */
  height: 1.75rem;
  background-color: var(--bs-secondary); /* Consistent color */
  color: var(--bs-white);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 0.8rem;
  margin-right: 0.75rem;
  flex-shrink: 0;
  box-shadow: none;
  transition: transform 0.2s ease;
}

.participant-item:hover .participant-number {
  transform: scale(1.05);
}

.participant-item.current-user .participant-number {
  background-color: var(--bs-warning);
  color: var(--bs-black); /* Better contrast on warning */
}

/* Participant Link */
.participant-link {
  color: var(--bs-body-color);
  text-decoration: none;
  font-weight: 400; /* Regular weight */
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.participant-link:hover {
  color: var(--bs-primary);
}

.participant-item.current-user .participant-link {
  color: var(--bs-warning-text-emphasis);
  font-weight: 500;
}

/* Current User Badge - Simplified */
.current-user-badge {
  color: var(--bs-warning);
  font-size: 0.9rem; /* Adjusted size */
  margin-left: 0.5rem;
  animation: none; /* Removed sparkle animation for cleaner look */
}

/* Fade-in Animation */
.animate-fade-in { 
  animation: fadeIn 0.5s ease-out forwards; /* Slightly faster */
}

@keyframes fadeIn { 
  from { 
    opacity: 0; 
    transform: translateY(10px); /* Reduced transform */
  } 
  to { 
    opacity: 1; 
    transform: translateY(0); 
  } 
}

/* Mobile Responsive - Review and simplify */
@media (max-width: 575.98px) {
  .card-header {
    padding: 0.75rem 1rem;
  }
  
  .card-body {
    padding: 1rem;
  }
  
  .header-icon {
    width: 1.75rem;
    height: 1.75rem;
    font-size: 0.9rem;
  }
  
  .section-title {
    font-size: 1rem;
  }
  
  .participant-item {
    padding: 0.5rem 0.75rem;
  }
  
  .participant-number {
    width: 1.5rem;
    height: 1.5rem;
    font-size: 0.75rem;
  }
  
  .participant-link {
    font-size: 0.85rem;
  }
}
</style>
