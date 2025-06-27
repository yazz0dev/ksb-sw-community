<template>
  <div class="card phase-display-card shadow-sm">
    <div class="card-header bg-light py-2 px-3">
      <h6 class="mb-0 fw-medium text-dark d-flex align-items-center">
        <span class="text-primary me-2">Phase {{ phaseNumber }}:</span>
        {{ phase.type || 'Unnamed Phase Type' }}
        <span class="badge ms-2" :class="phaseFormatBadgeClass">{{ phase.format }}</span>
      </h6>
      <!-- Removed the redundant phase.type display here as it's now part of the main title -->
    </div>
    <div class="card-body p-3 p-md-4">
      <div v-if="phase.description" class="mb-3">
        <h6 class="details-subtitle"><i class="fas fa-info-circle me-2 text-info"></i>Description</h6>
        <div class="markdown-content" v-html="renderMarkdown(phase.description)"></div>
      </div>

      <div v-if="phase.rules" class="mb-3">
        <h6 class="details-subtitle"><i class="fas fa-gavel me-2 text-secondary"></i>Rules</h6>
        <div class="markdown-content" v-html="renderMarkdown(phase.rules)"></div>
      </div>

      <div v-if="phase.prize" class="mb-3">
        <h6 class="details-subtitle"><i class="fas fa-trophy me-2 text-warning"></i>Prize</h6>
        <p class="mb-0">{{ phase.prize }}</p>
      </div>

      <div class="mb-3">
          <h6 class="details-subtitle">
            <i class="fas fa-tasks me-2 text-primary"></i>Project Submissions
          </h6>
          <p class="mb-0">
            {{ phase.allowProjectSubmission ? 'Allowed for this phase' : 'Not allowed for this phase' }}
          </p>
      </div>

      <!-- Criteria for this phase -->
      <div v-if="phase.criteria && phase.criteria.length > 0" class="mb-3">
        <h6 class="details-subtitle"><i class="fas fa-star me-2 text-success"></i>Rating Criteria</h6>
        <EventCriteriaDisplay
            :criteria="phase.criteria"
            :event-format="phase.format"
            :is-competition="overallEventStatus !== EventStatus.Pending && overallEventStatus !== EventStatus.Rejected"
        />
      </div>

      <!-- Participants/Teams for this phase -->
      <div v-if="phase.format === EventFormat.Individual && phase.coreParticipants && phase.coreParticipants.length > 0" class="mb-3">
        <h6 class="details-subtitle"><i class="fas fa-user-friends me-2 text-info"></i>Core Participants</h6>
        <EventParticipantList
            :core-participants="phase.coreParticipants"
            :loading="false"
            :currentUserId="null"
            :show-header="false"
            :getName="nameCache ? (uid) => nameCache[uid] || uid : (uid) => uid"
        />
      </div>

      <div v-if="phase.format === EventFormat.Team && phase.teams && phase.teams.length > 0" class="mb-3">
        <h6 class="details-subtitle"><i class="fas fa-users me-2 text-info"></i>Teams</h6>
        <div class="row g-3">
            <div class="col-12"> <!-- Simplified to one column for phase display -->
                 <TeamList
                    :teams="phase.teams"
                    :event-id="eventId"
                    :votingOpen="false"
                    :organizerNamesLoading="false"
                    :currentUserUid="null"
                    :getName="nameCache ? (uid) => nameCache[uid] || uid : (uid) => uid"
                    class="team-list-box p-0"
                />
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { EventFormat, type EventPhase, EventStatus } from '@/types/event';
import { useMarkdownRenderer } from '@/composables/useMarkdownRenderer';

// Assuming these components are general enough for display purposes
import EventCriteriaDisplay from '@/components/events/EventCriteriaDisplay.vue';
import EventParticipantList from '@/components/events/ParticipantList.vue';
import TeamList from '@/components/events/TeamList.vue';

const props = defineProps({
  phase: {
    type: Object as PropType<EventPhase>,
    required: true,
  },
  phaseNumber: {
    type: Number,
    required: true,
  },
  nameCache: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({}),
  },
  eventId: { // Added to pass to TeamList if needed for links, etc.
    type: String,
    required: true,
  },
  overallEventStatus: {
    type: String as PropType<EventStatus>,
    required: true,
  }
});

const { renderMarkdown } = useMarkdownRenderer();

const phaseFormatBadgeClass = computed(() => {
  return props.phase.format === EventFormat.Team
    ? 'bg-primary-subtle text-primary-emphasis'
    : 'bg-success-subtle text-success-emphasis';
});
</script>

<style scoped>
.phase-display-card {
  background-color: var(--bs-white);
  border: 1px solid var(--bs-border-color-translucent);
  transition: box-shadow 0.2s ease-in-out;
}
.phase-display-card:hover {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.075);
}
.card-header {
  border-bottom: 1px solid var(--bs-border-color-translucent);
}
.details-subtitle {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--bs-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
}
.details-subtitle i {
    font-size: 0.8rem;
}
.markdown-content {
  font-size: 0.95rem;
}
.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}
.badge {
    font-size: 0.75em;
    padding: 0.3em 0.6em;
}
/* Scoped styles for child components if needed, e.g., to override margins */
:deep(.team-list-box) {
    box-shadow: none;
    border: 1px solid var(--bs-border-color-translucent);
}
</style>
