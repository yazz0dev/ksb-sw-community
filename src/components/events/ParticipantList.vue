<template>
  <div class="participant-card card mb-4 shadow-sm animate-fade-in">
    <div v-if="showHeader" class="card-header d-flex justify-content-between align-items-center">
      <div class="header-content d-flex align-items-center">
        <div class="header-icon me-3">
          <i class="fas fa-user-friends"></i>
        </div>
        <div>
          <h6 class="mb-0 section-title">Participants</h6>
          <small class="text-muted">{{ participants.length }} member{{ participants.length === 1 ? '' : 's' }}</small>
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
      <div v-else-if="participants.length === 0" class="empty-state text-center py-4">
        <div class="empty-icon mb-3">
          <i class="fas fa-users fa-2x text-muted opacity-50"></i>
        </div>
        <p class="text-muted mb-0">No participants yet.</p>
      </div>
      <div v-else class="participants-grid">
        <div
          v-for="(participantId, index) in participants"
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
import { ref } from 'vue';

const props = defineProps<{
  participants: string[];
  loading: boolean;
  currentUserId: string | null;
  showHeader?: boolean;
  getName: (uid: string) => string; // Add missing prop
}>();

const showParticipants = ref(true);
</script>

<style scoped>
/* Main Card Styling */
.participant-card {
  background: linear-gradient(145deg, var(--bs-white) 0%, rgba(var(--bs-light-rgb), 0.2) 100%);
  border: 1px solid rgba(var(--bs-border-color-translucent), 0.6);
  border-radius: var(--bs-border-radius-xl);
  overflow: hidden;
  box-shadow: 
    0 4px 15px rgba(var(--bs-dark-rgb), 0.08),
    0 2px 6px rgba(var(--bs-dark-rgb), 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.participant-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, 
    var(--bs-primary) 0%, 
    var(--bs-info) 50%, 
    var(--bs-success) 100%);
  opacity: 0.8;
}

.participant-card:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 25px rgba(var(--bs-primary-rgb), 0.12),
    0 4px 12px rgba(var(--bs-dark-rgb), 0.08);
}

/* Header Styling */
.card-header {
  background: linear-gradient(135deg, 
    rgba(var(--bs-primary-rgb), 0.08) 0%, 
    rgba(var(--bs-primary-rgb), 0.04) 100%);
  border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.15);
  padding: 1.25rem 1.5rem;
}

.header-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, 
    var(--bs-primary) 0%, 
    var(--bs-primary-dark, var(--bs-primary)) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bs-white);
  font-size: 1.1rem;
  box-shadow: 0 3px 10px rgba(var(--bs-primary-rgb), 0.3);
}

.section-title {
  color: var(--bs-primary);
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 0;
}

.toggle-btn {
  border: 2px solid rgba(var(--bs-primary-rgb), 0.2);
  background: rgba(var(--bs-primary-rgb), 0.05);
  color: var(--bs-primary);
  font-weight: 500;
  transition: all 0.3s ease;
  border-radius: var(--bs-border-radius-lg);
}

.toggle-btn:hover {
  border-color: var(--bs-primary);
  background: rgba(var(--bs-primary-rgb), 0.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--bs-primary-rgb), 0.2);
}

/* Body Styling */
.card-body {
  padding: 1.5rem;
}

/* Loading State */
.loading-section {
  background: linear-gradient(135deg, 
    rgba(var(--bs-light-rgb), 0.3) 0%, 
    rgba(var(--bs-light-rgb), 0.1) 100%);
  border-radius: var(--bs-border-radius-lg);
  padding: 1.5rem;
}

/* Empty State */
.empty-state {
  background: linear-gradient(135deg, 
    rgba(var(--bs-light-rgb), 0.4) 0%, 
    rgba(var(--bs-light-rgb), 0.1) 100%);
  border-radius: var(--bs-border-radius-lg);
  padding: 2rem;
}

.empty-icon {
  opacity: 0.6;
}

/* Participants Grid */
.participants-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 576px) {
  .participants-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}

/* Participant Items */
.participant-item {
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, 
    rgba(var(--bs-white-rgb), 0.9) 0%, 
    rgba(var(--bs-light-rgb), 0.3) 100%);
  border: 2px solid rgba(var(--bs-border-color-translucent), 0.6);
  border-radius: var(--bs-border-radius-lg);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.participant-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--bs-primary);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.participant-item:hover {
  background: linear-gradient(135deg, 
    rgba(var(--bs-primary-rgb), 0.08) 0%, 
    rgba(var(--bs-primary-rgb), 0.04) 100%);
  border-color: rgba(var(--bs-primary-rgb), 0.3);
  transform: translateX(8px);
  box-shadow: 0 4px 15px rgba(var(--bs-primary-rgb), 0.15);
}

.participant-item:hover::before {
  opacity: 1;
}

.participant-item.current-user {
  background: linear-gradient(135deg, 
    rgba(var(--bs-warning-rgb), 0.12) 0%, 
    rgba(var(--bs-warning-rgb), 0.06) 100%);
  border-color: rgba(var(--bs-warning-rgb), 0.4);
}

.participant-item.current-user::before {
  background: var(--bs-warning);
  opacity: 1;
}

/* Participant Number */
.participant-number {
  width: 2rem;
  height: 2rem;
  background: linear-gradient(135deg, 
    var(--bs-primary) 0%, 
    var(--bs-primary-dark, var(--bs-primary)) 100%);
  color: var(--bs-white);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.85rem;
  margin-right: 1rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(var(--bs-primary-rgb), 0.3);
  transition: transform 0.2s ease;
}

.participant-item:hover .participant-number {
  transform: scale(1.1);
}

.participant-item.current-user .participant-number {
  background: linear-gradient(135deg, 
    var(--bs-warning) 0%, 
    var(--bs-warning-dark, var(--bs-warning)) 100%);
  box-shadow: 0 2px 8px rgba(var(--bs-warning-rgb), 0.4);
}

/* Participant Link */
.participant-link {
  color: var(--bs-dark);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  transition: color 0.3s ease;
}

.participant-link:hover {
  color: var(--bs-primary);
  text-decoration: none;
}

.participant-item.current-user .participant-link {
  color: var(--bs-warning-emphasis);
  font-weight: 600;
}

/* Current User Badge */
.current-user-badge {
  color: var(--bs-warning);
  font-size: 1rem;
  margin-left: 0.5rem;
  animation: sparkle 2s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { 
    opacity: 0.6; 
    transform: scale(1); 
  }
  50% { 
    opacity: 1; 
    transform: scale(1.2); 
  }
}

/* Fade-in Animation */
.animate-fade-in { 
  animation: fadeIn 0.6s ease-out forwards; 
}

@keyframes fadeIn { 
  from { 
    opacity: 0; 
    transform: translateY(20px); 
  } 
  to { 
    opacity: 1; 
    transform: translateY(0); 
  } 
}

/* Mobile Responsive */
@media (max-width: 575.98px) {
  .card-header {
    padding: 1rem 1.25rem;
  }
  
  .card-body {
    padding: 1.25rem;
  }
  
  .header-icon {
    width: 2rem;
    height: 2rem;
    font-size: 1rem;
    margin-right: 0.75rem !important;
  }
  
  .section-title {
    font-size: 1rem;
  }
  
  .participant-item {
    padding: 0.875rem 1rem;
  }
  
  .participant-number {
    width: 1.75rem;
    height: 1.75rem;
    font-size: 0.8rem;
    margin-right: 0.75rem;
  }
  
  .participant-link {
    font-size: 0.9rem;
  }
  
  .participants-grid {
    grid-template-columns: 1fr;
  }
}
</style>
