<template>
  <div class="card mb-4 shadow-sm animate-fade-in">
    <div class="card-header d-flex justify-content-between align-items-center bg-light">
      <span class="h6 mb-0"><i class="fas fa-user-friends text-primary me-2"></i>Participants</span>
      <button class="btn btn-link btn-sm" @click="showParticipants = !showParticipants">
        {{ showParticipants ? 'Hide' : 'Show' }}
      </button>
    </div>
    <div class="card-body" v-if="showParticipants">
      <div v-if="loading" class="text-center py-3">
        <span class="spinner-border spinner-border-sm"></span> Loading participants...
      </div>
      <div v-else-if="participants.length === 0" class="text-center text-muted py-3">
        No participants yet.
      </div>
      <ul v-else class="list-unstyled mb-0">
        <li v-for="uid in participants" :key="uid" class="mb-2">
          <span class="fw-semibold">{{ studentStore.getCachedStudentName(uid) }}</span>
          <span v-if="uid === currentUserId" class="badge bg-primary ms-2">You</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useProfileStore } from '@/stores/profileStore';

defineProps<{
  participants: string[];
  loading: boolean;
  currentUserId: string | null;
}>();

const showParticipants = ref(true);
const studentStore = useProfileStore();
</script>

<style scoped>
</style>
