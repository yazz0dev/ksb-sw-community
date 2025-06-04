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
              class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center w-100"
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
            <Transition name="slide-fade">
              <div v-if="team.showDetails" class="mt-3 pt-3 border-top" style="border-color: var(--bs-border-color) !important;">
                <p v-if="organizerNamesLoading" class="small text-secondary fst-italic">
                  <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Loading members...
                </p>
                <div v-else-if="team.members && team.members.length > 0">
                  <p class="text-muted small fw-bold text-uppercase mb-2">Team Members</p>
                  <div class="members-grid">
                    <div
                      v-for="memberId in team.members"
                      :key="memberId"
                      class="member-item d-flex align-items-center p-2 rounded transition-colors duration-150 small"
                      :class="{ 'bg-primary-subtle': memberId === currentUserUid }"
                    >
                      <span class="text-secondary me-2" style="width: 1rem; text-align: center;">
                        <i class="fas fa-user"></i>
                      </span>
                      <router-link
                        :to="{ name: 'PublicProfile', params: { userId: memberId } }"
                        class="text-primary text-truncate"
                        :class="{ 'fw-semibold': memberId === currentUserUid }"
                      >
                        {{ studentStore.getCachedStudentName(memberId) || memberId }}{{ memberId === currentUserUid ? ' (You)' : '' }}
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

    <div v-if="!loading && teamsWithDetails.length === 0" class="alert alert-info small d-flex align-items-center mt-3" role="alert">
        <i class="fas fa-info-circle me-2"></i>
        No teams have been created for this event yet.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';

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
}

const props = defineProps<Props>();

const studentStore = useProfileStore();
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
    members: Array.isArray(team.members) ? [...team.members] : []
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
  overflow: hidden;
}

.members-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.25rem;
}

.member-item {
  transition: background-color 0.2s ease-in-out;
  border: 1px solid transparent;
}

.member-item:hover {
  background-color: var(--bs-light) !important;
  border-color: var(--bs-border-color);
}

.router-link {
  text-decoration: none;
}
.router-link:hover {
  text-decoration: underline;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-fade-enter-from {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.slide-fade-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.slide-fade-enter-to,
.slide-fade-leave-from {
  opacity: 1;
  max-height: 500px;
  transform: translateY(0);
}
</style>
