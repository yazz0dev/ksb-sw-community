<template>
  <div class="p-4 sm:p-6">
    <TransitionGroup name="fade-fast" tag="div">
      <div 
        v-for="team in teamsWithDetails"
        :key="team.teamName"
        class="mb-4"
      >
        <div class="card team-card">
          <div class="card-content p-4 sm:p-5">
            <div class="is-flex is-justify-content-space-between is-align-items-flex-start mb-3">
              <h3 class="title is-5 has-text-primary mb-0">{{ team.teamName }}</h3>
              <!-- Add any badges or right-side content here if needed -->
            </div>

            <button
              class="button is-small is-outlined"
              @click="toggleTeamDetails(team.teamName)"
              :aria-expanded="team.showDetails ? 'true' : 'false'"
            >
              <span class="icon is-small">
                <i class="fas" :class="team.showDetails ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
              </span>
              <span>
                {{ team.showDetails ? 'Hide Members' : `Show Members (${team.members?.length || 0})` }}
              </span>
            </button>

            <!-- Collapsible Details Section -->
            <Transition name="slide-fade">
              <div v-if="team.showDetails" class="mt-4 pt-4" style="border-top: 1px solid var(--color-border);">
                <p v-if="organizerNamesLoading" class="is-size-7 has-text-grey is-italic">
                  <span class="icon is-small"><i class="fas fa-spinner fa-spin"></i></span> Loading members...
                </p>
                <div v-else-if="team.members && team.members.length > 0">
                  <p class="heading is-size-7 mb-2">Team Members</p>
                  <div class="is-flex is-flex-direction-column" style="gap: 0.5rem;">
                    <div
                      v-for="memberId in team.members"
                      :key="memberId"
                      class="is-flex is-align-items-center p-2 rounded-md transition-colors duration-150"
                      :style="{
                        backgroundColor: memberId === currentUserUid ? 'var(--color-secondary-light)' : 'transparent',
                        fontWeight: memberId === currentUserUid ? '500' : 'normal'
                      }"
                    >
                      <span class="icon has-text-grey mr-2" style="width: 1rem; text-align: center;">
                        <i class="fas fa-user"></i>
                      </span>
                      <router-link
                        :to="{ name: 'PublicProfile', params: { userId: memberId } }"
                        class="is-size-7 has-text-primary is-truncated"
                        :class="{ 'has-text-weight-semibold': memberId === currentUserUid }"
                        :style="{ 
                          '--hover-color': 'var(--bulma-primary)', 
                          fontWeight: memberId === currentUserUid ? '600' : 'normal' 
                        }"
                        @mouseover="$event.target.style.color = 'var(--hover-color)'"
                        @mouseout="$event.target.style.color = ''"
                      >
                        {{ getUserName(memberId) || memberId }} {{ memberId === currentUserUid ? '(You)' : '' }}
                      </router-link>
                    </div>
                  </div>
                </div>
                <p v-else class="is-size-7 has-text-grey is-italic">
                  No members assigned to this team yet.
                </p>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </TransitionGroup>

    <div v-if="!loading && teamsWithDetails.length === 0" class="message is-info is-small mt-4">
      <div class="message-body">
        <span class="icon is-small mr-1"><i class="fas fa-info-circle"></i></span>
        No teams have been created for this event yet.
      </div>
    </div>
  </div>
</template>

<script setup>
// Removed Chakra UI imports
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

const props = defineProps({
    teams: { 
        type: Array, 
        required: true, 
        default: () => [] 
    },
    eventId: { 
        type: String, 
        required: true 
    },
    ratingsOpen: { 
        type: Boolean, 
        default: false 
    },
    getUserName: { 
        type: Function, 
        required: true 
    },
    organizerNamesLoading: { 
        type: Boolean, 
        default: false 
    },
    currentUserUid: { 
        type: String, 
        default: null 
    }
});

const store = useStore();
const router = useRouter();
// canRate computed property seems unused in the template, removed for now.
// const canRate = computed(() => {
//     const userRole = store.getters['user/getUserRole'];
//     return store.getters['user/isAuthenticated'] && userRole !== 'Admin';
// });

const teamsWithDetails = ref([]);
// searchQueries and dropdownVisible refs seem unused, removed for now.
// const searchQueries = ref({});
// const dropdownVisible = ref({});
const loading = ref(true); // Add loading state

let unwatchTeams = null;

onMounted(() => {
    updateLocalTeams(props.teams);
    loading.value = false; // Set loading false after initial update
    unwatchTeams = watch(() => props.teams, (newTeams) => {
        updateLocalTeams(newTeams);
    }, { deep: true });
});

onBeforeUnmount(() => {
    if (unwatchTeams) {
        unwatchTeams();
    }
});

function updateLocalTeams(teamsFromProps) {
    if (!Array.isArray(teamsFromProps)) {
         teamsWithDetails.value = []; // Clear if input is invalid
         return;
    }
    
    // Preserve existing showDetails state if team still exists
    const existingStates = teamsWithDetails.value.reduce((acc, team) => {
        acc[team.teamName] = team.showDetails;
        return acc;
    }, {});

    teamsWithDetails.value = teamsFromProps.map(team => ({
        ...team,
        showDetails: existingStates[team.teamName] || false, // Restore or default to false
        // Ensure members, ratings, submissions are always arrays
        members: Array.isArray(team.members) ? [...team.members] : [],
        ratings: Array.isArray(team.ratings) ? [...team.ratings] : [],
        submissions: Array.isArray(team.submissions) ? [...team.submissions] : []
    }));
}

const toggleTeamDetails = (teamName) => {
    const teamIndex = teamsWithDetails.value.findIndex(t => t.teamName === teamName);
    if (teamIndex !== -1) {
        teamsWithDetails.value[teamIndex].showDetails = !teamsWithDetails.value[teamIndex].showDetails;
    } else {
        console.warn(`Could not find team ${teamName} to toggle details.`);
    }
};

// Removed unused emits update:teams and canAddTeam
// defineEmits(['update:teams', 'canAddTeam']);

</script>

<style scoped>
.team-card {
  transition: box-shadow 0.2s ease-in-out;
  overflow: hidden; /* Ensure content doesn't overflow during transitions */
}
.team-card:hover {
  box-shadow: 0 5px 10px rgba(10, 10, 10, 0.1);
}

.p-4 { padding: 1rem; }
.p-5 { padding: 1.25rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.pt-4 { padding-top: 1rem; }
.mr-1 { margin-right: 0.25rem; }
.mr-2 { margin-right: 0.5rem; }

.rounded-md {
  border-radius: 0.375rem; /* 6px */
}

.is-truncated {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Transition for collapsible section */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}


/* Transition for list items */
.fade-fast-enter-active,
.fade-fast-leave-active {
    transition: all 0.2s ease-out;
}

.fade-fast-enter-from,
.fade-fast-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

.fade-fast-move {
    transition: transform 0.3s ease-out;
}
</style>
