<template>
  <div class="p-3 p-sm-4">
    <TransitionGroup name="fade-fast" tag="div">
      <div 
        v-for="team in teamsWithDetails"
        :key="team.teamName"
        class="mb-3"
      >
        <div class="card team-card shadow-sm">
          <div class="card-body p-3 p-sm-4">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <h6 class="h6 text-primary mb-0 text-truncate me-2">{{ team.teamName }}</h6>
              <span class="badge bg-secondary-subtle text-secondary-emphasis small">
                {{ team.members?.length || 0 }}
              </span>
            </div>

            <button
              class="btn btn-sm btn-outline-secondary team-toggle-btn d-inline-flex align-items-center w-100"
              @click="toggleTeamDetails(team.teamName)"
              :aria-expanded="team.showDetails ? 'true' : 'false'"
              type="button"
            >
              <i class="fas fa-fw me-1" :class="team.showDetails ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
              <span class="text-truncate">
                {{ team.showDetails ? 'Hide Members' : `Show Members` }}
              </span>
            </button>

            <!-- Collapsible Details Section -->
            <Transition name="slide-fade-smooth">
              <div v-if="team.showDetails" class="mt-3 pt-3 border-top team-details-border">
                <p v-if="organizerNamesLoading" class="small text-secondary fst-italic">
                  <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Loading members...
                </p>
                <div v-else-if="team.members && team.members.length > 0">
                  <h6 class="small fw-medium text-muted mb-2">Team Members:</h6>
                  <div class="ps-2">
                    <div
                      v-for="(member) in team.members"
                      :key="member"
                      class="d-flex align-items-center py-1"
                    >
                      <span class="text-dark">{{ getName(member) }}</span>
                    </div>
                  </div>
                </div>
                <p v-else class="small text-secondary fst-italic">
                  No members assigned to this team yet.
                </p>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </TransitionGroup>

    <div v-if="!loading && teamsWithDetails.length === 0" class="alert alert-info small d-flex align-items-center mt-3" role="alert">
        <i class="fas fa-info-circle me-2"></i>
        No teams have been created for this event yet.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

interface Team {
  teamName: string;
  members: string[];
  showDetails?: boolean;
}

interface Props {
  teams: Team[];
  eventId: string;
  votingOpen: boolean;
  organizerNamesLoading: boolean;
  currentUserUid: string | null;
  getName: (uid: string) => string; // Add missing prop
}

const props = defineProps<Props>();


const teamsWithDetails = ref<Team[]>([]);
const loading = ref<boolean>(true);

let unwatchTeams: (() => void) | null = null;

onMounted(() => {
  updateLocalTeams(props.teams);
  loading.value = false;
  if (unwatchTeams) {
    unwatchTeams();
  }
  unwatchTeams = watch(() => props.teams, (newTeams) => {
    updateLocalTeams(newTeams);
  }, { deep: true });
});

onBeforeUnmount(() => {
  if (unwatchTeams) {
    unwatchTeams();
  }
});

function updateLocalTeams(teamsFromProps: Team[]): void {
  if (!Array.isArray(teamsFromProps)) {
    teamsWithDetails.value = [];
    return;
  }
  
  const existingStates = teamsWithDetails.value.reduce((acc, team) => {
    acc[team.teamName] = !!team.showDetails; // Ensure boolean, not undefined
    return acc;
  }, {} as { [key: string]: boolean });

  teamsWithDetails.value = teamsFromProps.map(team => ({
    ...team,
    showDetails: existingStates[team.teamName] ?? false, // Provide default false
    members: Array.isArray(team.members) ? [...team.members] : []
  }));
}

const toggleTeamDetails = (teamName: string): void => {
  const teamIndex = teamsWithDetails.value.findIndex(t => t.teamName === teamName);
  if (teamIndex !== -1 && teamsWithDetails.value[teamIndex]) {
    const team = teamsWithDetails.value[teamIndex];
    if (team) {
      team.showDetails = !team.showDetails;
    }
  } else {
    console.warn(`Could not find team ${teamName} to toggle details.`);
  }
};
</script>

<style lang="scss" scoped>
/* Team Card Base Styling */
.team-card {
  background-color: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius-lg);
  box-shadow: var(--bs-box-shadow-sm);
  transition: all 0.2s ease-in-out;
  position: relative; /* Keep for potential pseudo-elements if simplified */
}

.team-card:hover {
  border-color: var(--bs-primary);
  box-shadow: var(--bs-box-shadow);
  transform: translateY(-2px);
}

/* Optional: Simplified Top Border Accent */
.team-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px; /* Thinner and static */
  background: linear-gradient(90deg, 
    var(--bs-primary) 0%, 
    var(--bs-info) 100%);
  opacity: 0.7;
  border-radius: var(--bs-border-radius-lg) var(--bs-border-radius-lg) 0 0;
}

/* Card Body Styling */
.card-body {
  padding: 1rem 1.25rem; /* Standardized padding */
}

/* Team Header */
.h6 {
  color: var(--bs-primary);
  font-weight: 600; /* Slightly less bold */
  font-size: 1.1rem; /* Adjusted size */
}

/* Simplified Badge */
.badge {
  background-color: var(--bs-secondary); /* Standard Bootstrap secondary */
  color: var(--bs-white);
  font-weight: 500;
  padding: 0.4em 0.65em; /* Adjusted padding */
  border-radius: var(--bs-border-radius-pill);
  font-size: 0.8rem;
  // Removed complex gradient and hover effects
}

/* Team toggle button - standard outline */
.team-toggle-btn {
  // Uses default Bootstrap .btn-outline-secondary styling
  // Additional specific styles can be added if needed
  font-size: 0.875rem;
}

/* Team Details Section */
.team-details-border {
  border-color: var(--bs-border-color-translucent) !important; /* Match card border */
  background-color: rgba(var(--bs-light-rgb), 0.5); /* Subtle background */
  border-radius: var(--bs-border-radius);
  padding: 1rem;
  margin-top: 1rem;
}

/* Member List Styling */
.small.fw-medium.text-muted {
  color: var(--bs-secondary) !important; /* Use secondary color */
  font-weight: 500 !important;
  font-size: 0.85rem !important;
  margin-bottom: 0.75rem !important;
  text-transform: none; /* Removed uppercase */
  letter-spacing: normal;
}

/* Individual Member Items */
.d-flex.align-items-center.py-1 {
  padding: 0.5rem 0.75rem; /* Adjusted padding */
  border-radius: var(--bs-border-radius-sm);
  transition: background-color 0.2s ease;
  margin-bottom: 0.25rem;
  background-color: transparent;
  border: none;
}

.d-flex.align-items-center.py-1:hover {
  background-color: rgba(var(--bs-primary-rgb), 0.05);
  transform: none; /* Removed translateX */
  box-shadow: none;
}

/* Member Name Styling */
.text-dark {
  color: var(--bs-body-color) !important; /* Standard text color */
  font-weight: 400; /* Regular weight */
  font-size: 0.95rem;
  transition: color 0.2s ease;
}

.d-flex.align-items-center.py-1:hover .text-dark {
  color: var(--bs-primary) !important;
  font-weight: 500; /* Slightly bolder on hover */
  transform: none;
}

/* Loading State */
.spinner-border-sm {
  width: 1rem; /* Standard size */
  height: 1rem;
  border-width: 0.15em;
}

/* Alert Styling - Standard Bootstrap alert */
.alert {
  // Uses default Bootstrap alert styling
  // .alert-info for this component
  font-size: 0.9rem;
}

/* Smooth Transitions for team details - using global slide-fade-smooth */
/* Styles for .slide-fade-smooth-enter-active, .slide-fade-smooth-leave-active, etc. */
/* are expected to be in a global SCSS file like _animations.scss */

/* Mobile Responsive Adjustments - Review and simplify if needed */
@media (max-width: 575.98px) {
  .card-body {
    padding: 0.75rem 1rem;
  }
  
  .h6 {
    font-size: 1rem;
  }
  
  .badge {
    font-size: 0.75rem;
    padding: 0.3em 0.5em;
  }
  
  .btn { // General btn, might be too broad
    font-size: 0.875rem;
  }
  
  .team-details-border {
    padding: 0.75rem;
  }
}
</style>
