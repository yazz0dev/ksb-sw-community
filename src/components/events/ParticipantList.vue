<template>
  <div class="card mb-4 shadow-sm animate-fade-in">
    <div v-if="showHeader" class="card-header d-flex justify-content-between align-items-center bg-light">
      <span class="h6 mb-0"><i class="fas fa-user-friends text-primary me-2"></i>Participants</span>
      <button class="btn btn-link btn-sm" @click="showParticipants = !showParticipants">
        {{ showParticipants ? 'Hide' : 'Show' }}
      </button>
    </div>
    <div class="card-body" v-if="showParticipants || !showHeader">
      <div v-if="loading" class="text-center py-3">
        <span class="spinner-border spinner-border-sm"></span> Loading participants...
      </div>
      <div v-else-if="participants.length === 0" class="text-center text-muted py-3">
        No participants yet.
      </div>
      <div v-else class="participants-grid">
        <div
          v-for="(participantId, index) in participants"
          :key="participantId"
          class="d-flex align-items-center py-1"
        >
          <span class="text-secondary me-2 participant-index">
            {{ index + 1 }}.
          </span>
          <router-link
            :to="{ name: 'PublicProfile', params: { userId: participantId } }"
            class="text-primary text-truncate"
            :class="{ 'fw-semibold': participantId === currentUserId }"
          >
            {{ getName(participantId) }}{{ participantId === currentUserId ? ' (You)' : '' }}
          </router-link>
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
.participants-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

@media (min-width: 576px) {
  .participants-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

.participant-item {
  transition: background-color 0.2s ease-in-out;
  border: 1px solid transparent;
}

.participant-item:hover {
  background-color: var(--bs-light) !important;
  border-color: var(--bs-border-color);
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

.participant-index {
  width: 1rem;
  text-align: center;
}
</style>
