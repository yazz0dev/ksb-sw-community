<!-- src/components/events/EventSubmissionsSection.vue -->
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
        <!-- If no submissions at all for the event -->
        <div v-if="!event.submissions || event.submissions.length === 0" class="text-center text-muted py-3">
          No project submissions yet for this event.
        </div>

        <!-- Team Event: Group submissions by team -->
        <template v-else-if="event.details.format === 'Team'">
          <div v-for="team in teams" :key="team.id || team.teamName" class="mb-3">
            <h6 class="fw-semibold">{{ team.teamName }}</h6>
            <!-- Filter submissions for the current team -->
            <ul v-if="getTeamSubmissions(team.teamName).length > 0" class="list-unstyled mb-0 ps-2">
              <li v-for="submission in getTeamSubmissions(team.teamName)" :key="submission.submittedBy + '-' + submission.projectName" class="small py-1">
                <i class="fas fa-code-branch fa-fw text-secondary me-1"></i>
                <a :href="submission.link" target="_blank" rel="noopener noreferrer" class="text-decoration-none">
                  {{ submission.projectName }}
                </a>
                <span class="text-muted ms-2">by {{ getUserName(submission.submittedBy) }}</span>
                <p v-if="submission.description" class="text-muted small mt-1 mb-0 ps-3">{{ submission.description }}</p>
              </li>
            </ul>
            <p v-else class="small text-muted fst-italic ps-2">No submissions from this team yet.</p>
          </div>
        </template>

        <!-- Individual/Competition Event: List all submissions directly -->
        <template v-else>
          <ul class="list-unstyled mb-0">
            <li v-for="submission in event.submissions" :key="submission.submittedBy + '-' + submission.projectName" class="mb-2 small py-1">
              <i class="fas fa-code-branch fa-fw text-secondary me-1"></i>
              <a :href="submission.link" target="_blank" rel="noopener noreferrer" class="text-decoration-none">
                {{ submission.projectName }}
              </a>
              <span class="text-muted ms-2">by {{ getUserName(submission.submittedBy) }}</span>
              <p v-if="submission.description" class="text-muted small mt-1 mb-0 ps-3">{{ submission.description }}</p>
            </li>
          </ul>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Event, Team, Submission } from '@/types/event'; // Submission type is needed
import { computed } from 'vue'; // Import computed

const props = defineProps<{ // props are already defined
  event: Event;
  teams: Team[]; 
  loading: boolean;
  getUserName: (uid: string) => string;
  canSubmitProject: boolean;
}>();

defineEmits(['open-submission-modal']); // emit is defined

// Helper to get submissions for a specific team
const getTeamSubmissions = (teamName: string): Submission[] => {
  if (!props.event.submissions || !Array.isArray(props.event.submissions)) {
    return [];
  }
  return props.event.submissions.filter(sub => sub.teamId === teamName);
};
</script>

<style scoped>
/* Styles are fine, no changes needed here for this modification */
</style>