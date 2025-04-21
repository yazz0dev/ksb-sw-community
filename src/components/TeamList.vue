<template>
  <div class="p-4 p-sm-5">
    <TransitionGroup name="fade-fast" tag="div">
      <div 
        v-for="team in teamsWithDetails"
        :key="team.teamName"
        class="mb-4"
      >
        <div class="card team-card shadow-sm">
          <div class="card-body p-4 p-sm-5">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <h5 class="h5 text-primary mb-0">{{ team.teamName }}</h5>
              <!-- Add any badges or right-side content here if needed -->
            </div>

            <button
              class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center"
              @click="toggleTeamDetails(team.teamName)"
              :aria-expanded="team.showDetails ? 'true' : 'false'"
              type="button"
            >
              <i class="fas fa-fw me-1" :class="team.showDetails ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
              <span>
                {{ team.showDetails ? 'Hide Members' : `Show Members (${team.members?.length || 0})` }}
              </span>
            </button>

            <!-- Collapsible Details Section -->
            <Transition name="slide-fade">
              <div v-if="team.showDetails" class="mt-4 pt-4 border-top" style="border-color: var(--bs-border-color) !important;">
                <p v-if="organizerNamesLoading" class="small text-secondary fst-italic">
                  <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Loading members...
                </p>
                <div v-else-if="team.members && team.members.length > 0">
                  <p class="text-muted small fw-bold text-uppercase mb-2">Team Members</p>
                  <div class="d-flex flex-column" style="gap: 0.5rem;">
                    <div
                      v-for="memberId in team.members"
                      :key="memberId"
                      class="d-flex align-items-center p-2 rounded transition-colors duration-150"
                      :class="{ 'bg-primary-subtle': memberId === currentUserUid }"
                    >
                      <span class="text-secondary me-2" style="width: 1rem; text-align: center;">
                        <i class="fas fa-user"></i>
                      </span>
                      <router-link
                        :to="{ name: 'PublicProfile', params: { userId: memberId } }"
                        class="small text-primary text-truncate"
                        :class="{ 'fw-semibold': memberId === currentUserUid }"
                      >
                        {{ getUserName(memberId) || memberId }} {{ memberId === currentUserUid ? '(You)' : '' }}
                      </router-link>
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

    <div v-if="!loading && teamsWithDetails.length === 0" class="alert alert-info small d-flex align-items-center mt-4" role="alert">
        <i class="fas fa-info-circle me-2"></i>
        No teams have been created for this event yet.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

interface Team {
  teamName: string;
  members: string[];
  showDetails?: boolean;
  ratings?: any[];
  submissions?: any[];
}

interface Props {
  teams: Team[];
  eventId: string;
  ratingsOpen: boolean;
  getUserName: (id: string) => string;
  organizerNamesLoading: boolean;
  currentUserUid: string | null;
}

const props = defineProps<Props>();

const store = useStore();
const router = useRouter();

const teamsWithDetails = ref<Team[]>([]);
const loading = ref<boolean>(true);

let unwatchTeams: (() => void) | null = null;

onMounted(() => {
  updateLocalTeams(props.teams);
  loading.value = false;
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
    members: Array.isArray(team.members) ? [...team.members] : [],
    ratings: Array.isArray(team.ratings) ? [...team.ratings] : [],
    submissions: Array.isArray(team.submissions) ? [...team.submissions] : []
  }));
}

const toggleTeamDetails = (teamName: string): void => {
  const teamIndex = teamsWithDetails.value.findIndex(t => t.teamName === teamName);
  if (teamIndex !== -1) {
    teamsWithDetails.value[teamIndex].showDetails = !teamsWithDetails.value[teamIndex].showDetails;
  } else {
    console.warn(`Could not find team ${teamName} to toggle details.`);
  }
};
</script>

<style scoped>
.team-card {
  transition: box-shadow 0.2s ease-in-out;
  overflow: hidden; /* Ensure content doesn't overflow during transitions */
}
/* Removed hover style as Bootstrap cards have subtle hover effects or can be customized globally */
/* .team-card:hover { ... } */

/* Remove transition styles, now in global SCSS */
.router-link {
  text-decoration: none;
}
.router-link:hover {
  text-decoration: underline;
}
</style>
