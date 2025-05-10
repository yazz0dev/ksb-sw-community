<template>
  <div class="card ratings-box shadow-sm mb-4 animate-fade-in">
    <div class="card-header bg-light d-flex justify-content-between align-items-center">
      <div class="section-header mb-0">
        <i class="fas fa-trophy text-warning me-2"></i>
        <span class="h5 mb-0 text-primary">Winner Selection</span>
      </div>
    </div>
    <div class="card-body">
      <template v-if="loading">
        <div class="text-center py-3">
          <span class="spinner-border spinner-border-sm"></span> Loading...
        </div>
      </template>
      <template v-else>
        <!-- Insert winner selection logic here, using props -->
        <slot />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Event } from '@/types/event';
import type { User } from '@/types/user';

defineProps<{
  event: Event;
  currentUser: User | null;
  isCurrentUserParticipant: boolean;
  canRateOrganizer: boolean;
  loading: boolean;
  isCurrentUserOrganizer?: boolean;
}>();
</script>

<style scoped>
</style>
