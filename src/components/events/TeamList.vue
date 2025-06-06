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
              <div v-if="team.showDetails" class="mt-3 pt-3 border-top team-details-border">
                <p v-if="organizerNamesLoading" class="small text-secondary fst-italic">
                  <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Loading members...
                </p>
                <div v-else-if="team.members && team.members.length > 0">
                  <h6 class="small fw-medium text-muted mb-2">Team Members:</h6>
                  <div class="ps-2">
                    <div
                      v-for="(member, memberIndex) in team.members"
                      :key="member"
                      class="d-flex align-items-center py-1"
                    >
                      <span class="text-secondary me-2 member-index">
                        {{ memberIndex + 1 }}.
                      </span>
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

<style scoped>
/* Team Card Base Styling */
.team-card {
  background: linear-gradient(145deg, 
    var(--bs-white) 0%, 
    rgba(var(--bs-light-rgb), 0.4) 50%,
    rgba(var(--bs-primary-rgb), 0.02) 100%);
  border: 2px solid rgba(var(--bs-border-color-translucent), 0.6);
  border-radius: var(--bs-border-radius-xl);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  box-shadow: 
    0 4px 20px rgba(var(--bs-dark-rgb), 0.08),
    0 2px 8px rgba(var(--bs-dark-rgb), 0.04);
}

/* Enhanced Gradient Top Border */
.team-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg, 
    #ff6b6b 0%, 
    #4ecdc4 25%, 
    #45b7d1 50%, 
    #96ceb4 75%, 
    #ffeaa7 100%);
  opacity: 0.8;
  transition: all 0.4s ease;
}

.team-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255, 255, 255, 0.6), 
    transparent);
  transition: left 0.8s ease;
}

.team-card:hover {
  border-color: rgba(var(--bs-primary-rgb), 0.4);
  box-shadow: 
    0 12px 35px rgba(var(--bs-primary-rgb), 0.15),
    0 6px 20px rgba(var(--bs-dark-rgb), 0.12);
  transform: translateY(-5px) scale(1.02);
}

.team-card:hover::before {
  opacity: 1;
  height: 6px;
}

.team-card:hover::after {
  left: 100%;
}

/* Card Body Styling */
.card-body {
  padding: 1.5rem;
  position: relative;
}

/* Team Header */
.d-flex.justify-content-between.align-items-start {
  margin-bottom: 1.25rem;
}

.h6 {
  color: var(--bs-primary);
  font-weight: 700;
  margin-bottom: 0;
  font-size: 1.15rem;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

/* Enhanced Badge */
.badge {
  background: linear-gradient(135deg, 
    #667eea 0%, 
    #764ba2 100%);
  color: var(--bs-white);
  font-weight: 700;
  padding: 0.6rem 1rem;
  border-radius: var(--bs-border-radius-pill);
  font-size: 0.85rem;
  box-shadow: 
    0 4px 15px rgba(102, 126, 234, 0.3),
    0 2px 8px rgba(var(--bs-dark-rgb), 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.badge::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255, 255, 255, 0.3), 
    transparent);
  transition: left 0.6s ease;
}

.badge:hover {
  transform: scale(1.08) rotate(-2deg);
  box-shadow: 
    0 6px 20px rgba(102, 126, 234, 0.4),
    0 3px 12px rgba(var(--bs-dark-rgb), 0.15);
}

.badge:hover::before {
  left: 100%;
}

/* Enhanced Toggle Button */
.btn {
  background: linear-gradient(135deg, 
    rgba(var(--bs-primary-rgb), 0.06) 0%, 
    rgba(var(--bs-primary-rgb), 0.03) 100%);
  border: 2px solid rgba(var(--bs-primary-rgb), 0.15);
  color: var(--bs-primary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: var(--bs-border-radius-lg);
  padding: 0.75rem 1rem;
  font-weight: 500;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(var(--bs-primary-rgb), 0.1), 
    transparent);
  transition: left 0.5s ease;
}

.btn:hover {
  background: linear-gradient(135deg, 
    rgba(var(--bs-primary-rgb), 0.12) 0%, 
    rgba(var(--bs-primary-rgb), 0.08) 100%);
  border-color: var(--bs-primary);
  transform: translateY(-2px);
  color: var(--bs-primary);
  box-shadow: 0 4px 15px rgba(var(--bs-primary-rgb), 0.2);
}

.btn:hover::before {
  left: 100%;
}

.btn:focus {
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.25);
  outline: none;
}

.btn:active {
  transform: translateY(0);
}

/* Team Details Section */
.team-details-border {
  border-color: rgba(var(--bs-primary-rgb), 0.15) !important;
  background: linear-gradient(135deg, 
    rgba(var(--bs-light-rgb), 0.4) 0%, 
    rgba(var(--bs-light-rgb), 0.2) 100%);
  border-radius: var(--bs-border-radius-lg);
  padding: 1.25rem;
  margin-top: 1rem;
  position: relative;
}

.team-details-border::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    var(--bs-primary) 0%, 
    var(--bs-info) 100%);
  border-radius: var(--bs-border-radius-lg) var(--bs-border-radius-lg) 0 0;
  opacity: 0.6;
}

/* Member List Styling */
.small.fw-medium.text-muted {
  color: var(--bs-primary) !important;
  font-weight: 600 !important;
  font-size: 0.9rem !important;
  margin-bottom: 1rem !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Individual Member Items */
.d-flex.align-items-center.py-1 {
  padding: 0.75rem 1rem;
  border-radius: var(--bs-border-radius);
  transition: all 0.3s ease;
  margin-bottom: 0.5rem;
  background: rgba(var(--bs-white-rgb), 0.7);
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;
}

.d-flex.align-items-center.py-1::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--bs-primary);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.d-flex.align-items-center.py-1:hover {
  background: rgba(var(--bs-primary-rgb), 0.08);
  transform: translateX(8px);
  border-color: rgba(var(--bs-primary-rgb), 0.2);
  box-shadow: 0 2px 8px rgba(var(--bs-primary-rgb), 0.1);
}

.d-flex.align-items-center.py-1:hover::before {
  opacity: 1;
}

/* Member Index Styling */
.member-index {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, 
    #ff7675 0%, 
    #fd79a8 50%,
    #fdcb6e 100%);
  color: var(--bs-white);
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.85rem;
  margin-right: 1rem;
  flex-shrink: 0;
  box-shadow: 
    0 4px 12px rgba(255, 118, 117, 0.3),
    0 2px 6px rgba(var(--bs-dark-rgb), 0.1);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
}

.member-index::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255, 255, 255, 0.4), 
    transparent);
  transition: left 0.5s ease;
}

.d-flex.align-items-center.py-1:hover .member-index {
  transform: scale(1.15) rotate(-5deg);
  box-shadow: 
    0 6px 18px rgba(255, 118, 117, 0.4),
    0 3px 10px rgba(var(--bs-dark-rgb), 0.15);
}

.d-flex.align-items-center.py-1:hover .member-index::before {
  left: 100%;
}

/* Member Name Styling */
.text-dark {
  color: var(--bs-dark) !important;
  font-weight: 500;
  font-size: 1rem;
  transition: all 0.3s ease;
  position: relative;
}

.d-flex.align-items-center.py-1:hover .text-dark {
  color: #6c5ce7 !important;
  font-weight: 600;
  transform: translateX(4px);
}

/* Loading State */
.spinner-border-sm {
  width: 1.2rem;
  height: 1.2rem;
  border-width: 0.15em;
}

/* Alert Styling */
.alert {
  border: none;
  border-radius: var(--bs-border-radius-lg);
  background: linear-gradient(135deg, 
    rgba(var(--bs-info-rgb), 0.1) 0%, 
    rgba(var(--bs-info-rgb), 0.05) 100%);
  border-left: 4px solid var(--bs-info);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(var(--bs-info-rgb), 0.1);
}

/* Smooth Transitions */
.slide-fade-enter-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.6, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-20px);
  max-height: 0;
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-15px);
  max-height: 0;
}

.slide-fade-enter-to {
  max-height: 400px;
}

/* Mobile Responsive Adjustments */
@media (max-width: 575.98px) {
  .card-body {
    padding: 1.25rem 1rem;
  }
  
  .h6 {
    font-size: 1rem;
  }
  
  .badge {
    font-size: 0.75rem;
    padding: 0.375rem 0.625rem;
  }
  
  .btn {
    font-size: 0.875rem;
    padding: 0.625rem 0.875rem;
  }
  
  .team-details-border {
    padding: 1rem 0.75rem;
  }
  
  .member-index {
    width: 1.75rem;
    height: 1.75rem;
    font-size: 0.75rem;
    margin-right: 0.5rem;
  }
  
  .d-flex.align-items-center.py-1 {
    padding: 0.625rem 0.75rem;
  }
  
  .d-flex.align-items-center.py-1:hover {
    transform: translateX(4px);
  }
}

/* Extra Small Mobile */
@media (max-width: 374px) {
  .card-body {
    padding: 1rem 0.75rem;
  }
  
  .team-details-border {
    padding: 0.875rem 0.625rem;
  }
}
</style>
