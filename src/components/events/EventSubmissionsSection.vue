<template>
  <div class="card submissions-box shadow-sm mb-4 animate-fade-in">
    <div class="card-header d-flex justify-content-between align-items-center bg-light">
      <span class="h6 mb-0"><i class="fas fa-upload text-primary me-2"></i>Project Submissions</span>
      <button v-if="canSubmitProject" class="btn btn-sm btn-primary" @click="$emit('open-submission-modal')">
        <i class="fas fa-plus me-1"></i>Submit
      </button>
    </div>
    <div class="card-body">
      <div v-if="loading" class="text-center py-3">
        <span class="spinner-border spinner-border-sm"></span> Loading submissions...
      </div>
      <template v-else>
        <template v-if="event.details.format === 'Team'">
          <div v-for="team in teams" :key="team.id" class="mb-3">
            <h6 class="fw-semibold">{{ team.teamName }}</h6>
            <ul class="list-unstyled mb-0">
              <li v-for="submission in team.submissions || []" :key="submission.submittedBy + '-' + submission.projectName">
                <span>{{ submission.projectName }}</span>
                <span class="text-muted ms-2">by {{ getUserName(submission.submittedBy) }}</span>
              </li>
            </ul>
          </div>
        </template>
        <template v-else>
          <ul class="list-unstyled mb-0">
            <li v-for="submission in event.submissions || []" :key="submission.submittedBy + '-' + submission.projectName">
              <span>{{ submission.projectName }}</span>
              <span class="text-muted ms-2">by {{ getUserName(submission.submittedBy) }}</span>
            </li>
          </ul>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Event, Team } from '@/types/event';

defineProps<{
  event: Event;
  teams: Team[];
  loading: boolean;
  getUserName: (uid: string) => string;
  canSubmitProject: boolean;
}>();
</script>

<style scoped>
</style>
