<template>
  <div class="manage-teams-component">
    <!-- Team Summary Header -->
    <div class="teams-summary mb-3 p-2 p-md-3 rounded-3 bg-light-subtle border">
      <div class="row align-items-center">
        <div class="col-md-8">
          <h6 class="mb-1 text-dark">
            <i class="fas fa-users me-2 text-primary"></i>
            Team Configuration
          </h6>
          <p class="small text-muted mb-0">
            <strong>{{ teams.length }}</strong> {{ teams.length === 1 ? 'team' : 'teams' }} configured
            • <strong>{{ totalMembers }}</strong> {{ totalMembers === 1 ? 'member' : 'members' }} assigned
            • <strong>{{ unassignedCount }}</strong> unassigned
          </p>
        </div>
        <div class="col-md-4 text-md-end mt-2 mt-md-0">
          <div class="d-flex gap-2 justify-content-md-end">
            <button 
              type="button" 
              class="btn btn-sm btn-outline-primary"
              @click="addTeam" 
              :disabled="teams.length >= maxTeams || props.isSubmitting"
            >
              <i class="fas fa-plus me-1"></i>
              Add Team
            </button>
            <button 
              v-if="props.canAutoGenerate && props.students.length > 0"
              type="button" 
              class="btn btn-sm btn-success"
              @click="autoGenerateTeams"
              :disabled="props.isSubmitting || teams.length === 0"
              title="Distribute all available students among existing teams"
            >
              <i class="fas fa-magic me-1"></i>
              Auto-fill
            </button>
          </div>
        </div>
        <!-- Compact Action Hints -->
        <div v-if="teams.length > 0" class="action-hints mt-2 p-2 bg-info-subtle rounded border border-info-subtle col-12">
          <small class="text-info-emphasis">
            <i class="fas fa-lightbulb me-1"></i>
            <strong>Tips:</strong> Use "Auto-fill" for quick setup
          </small>
        </div>
      </div>
    </div>

    <!-- Teams List -->
    <div v-if="teams.length > 0" class="teams-list">
      <transition-group name="team-fade" tag="div" class="row g-2 g-md-3">
        <div v-for="(team, teamIndex) in teams" :key="`team-${teamIndex}`" class="col-12">
          <div class="team-card card border-0 shadow-sm">
            <!-- Compact Team Header -->
            <div class="card-header bg-primary-subtle border-0 py-2">
              <div class="d-flex align-items-center justify-content-between">
                <div class="flex-grow-1 me-2">
                  <div class="input-group input-group-sm">
                    <span class="input-group-text bg-white border-end-0">
                      <i class="fas fa-users text-primary"></i>
                    </span>
                    <input
                      type="text"
                      class="form-control border-start-0"
                      :class="{ 'is-invalid': !team.teamName && team.touched?.teamName }"
                      v-model="team.teamName"
                      :placeholder="`Team ${teamIndex + 1} Name`"
                      @blur="team.touched && (team.touched.teamName = true); emitTeamsUpdate();"
                      :disabled="props.isSubmitting"
                    />
                  </div>
                  <small v-if="!team.teamName && team.touched?.teamName" class="text-danger mt-1 d-block">
                    Team name is required
                  </small>
                </div>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  @click="removeTeam(teamIndex)"
                  :disabled="props.isSubmitting || teams.length <= minTeams"
                  title="Remove Team"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>

            <div class="card-body p-2 p-md-3">
              <!-- Compact Team Members Section with Integrated Add -->
              <div class="team-members-section">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <label class="form-label small fw-medium text-secondary mb-0">
                    <i class="fas fa-users me-1"></i>
                    Members ({{ team.members.length }}/{{ maxMembersPerTeam }})
                    <span v-if="team.members.length >= minMembersPerTeam" class="text-success ms-1">
                      <i class="fas fa-check-circle" style="font-size: 0.8em;"></i>
                    </span>
                  </label>
                  <small class="text-muted">Tap crown to set lead</small>
                </div>

                <!-- Search-based Add Member Row -->
                <div v-if="team.members.length < maxMembersPerTeam && availableStudentsForTeam(teamIndex).length > 0" class="add-member-row mb-2 position-relative">
                  <label class="form-label small fw-medium text-secondary mb-1">
                    <i class="fas fa-user-plus text-primary me-1"></i>
                    Add Team Member
                  </label>
                  <div class="input-group input-group-sm">
                    <span class="input-group-text bg-light">
                      <i class="fas fa-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      class="form-control"
                      v-model="teamMemberSearches[teamIndex]"
                      :disabled="props.isSubmitting"
                      placeholder="Type a name to search..."
                      @focus="showMemberDropdowns[teamIndex] = true"
                      @input="searchTeamMembers(teamIndex)"
                      @blur="handleMemberSearchBlur(teamIndex)"
                      autocomplete="off"
                    />
                  </div>

                  <!-- Member Search Dropdown -->
                  <ul v-if="showMemberDropdowns[teamIndex] && filteredMembersForTeam(teamIndex).length > 0" class="search-dropdown">
                    <li v-for="student in filteredMembersForTeam(teamIndex)" :key="student.uid" class="dropdown-item-wrapper">
                      <button class="dropdown-item-custom" type="button" @mousedown.prevent="addMemberFromSearch(teamIndex, student.uid)">
                        <i class="fas fa-user text-muted me-2"></i>
                        {{ student.name || `UID: ${student.uid.substring(0,6)}...` }}
                      </button>
                    </li>
                  </ul>
                  
                  <!-- No Results Message -->
                  <div v-else-if="showMemberDropdowns[teamIndex] && teamMemberSearches[teamIndex] && filteredMembersForTeam(teamIndex).length === 0" class="search-dropdown">
                    <div class="no-results">
                      <i class="fas fa-search text-muted me-2"></i>
                      <span class="text-muted">No matching users found</span>
                    </div>
                  </div>
                </div>

                <!-- Team Lead Validation -->
                <small v-if="team.members.length > 0 && !team.teamLead && team.touched?.teamLead" class="text-warning d-block mb-2">
                  <i class="fas fa-exclamation-triangle me-1"></i>
                  Select a team lead by tapping the crown icon
                </small>

                <!-- Member Cards Grid -->
                <div v-if="team.members.length > 0" class="members-grid-compact">
                  <div
                    v-for="memberId in team.members"
                    :key="memberId"
                    class="member-card-compact"
                    :class="{ 'member-lead': team.teamLead === memberId }"
                  >
                    <button
                      type="button"
                      class="crown-btn-compact me-2"
                      :class="{
                        'active': team.teamLead === memberId,
                        'inactive': team.teamLead !== memberId
                      }"
                      @click="setTeamLead(teamIndex, memberId)"
                      :disabled="props.isSubmitting"
                      :title="team.teamLead === memberId ? 'Current team lead' : 'Set as team lead'"
                    >
                      <i class="fas fa-crown"></i>
                    </button>
                    <span class="member-name-compact flex-grow-1">
                      {{ studentNameCache[memberId] || `User (${memberId.substring(0,5)}...)` }}
                    </span>
                    <button
                      type="button"
                      class="btn-remove-compact ms-2"
                      @click="removeMember(teamIndex, memberId)"
                      :disabled="props.isSubmitting || team.members.length <= minMembersPerTeam"
                      title="Remove member"
                    >
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>

                <!-- Empty State -->
                <div v-else class="empty-members-compact text-center py-3">
                  <i class="fas fa-user-plus text-muted mb-1" style="font-size: 1.5rem; opacity: 0.5;"></i>
                  <p class="text-muted small mb-0">No members yet</p>
                </div>

                <!-- Validation Messages -->
                <small v-if="team.members.length < minMembersPerTeam && team.touched?.members" class="text-danger d-block mt-1">
                  Needs at least {{ minMembersPerTeam }} members
                </small>
              </div>
            </div>
          </div>
        </div>
      </transition-group>
    </div>

    <!-- Compact Empty State -->
    <div v-else class="empty-state text-center py-4">
      <i class="fas fa-users-slash text-muted mb-2" style="font-size: 2.5rem; opacity: 0.3;"></i>
      <h6 class="text-muted mb-2">No Teams Configured</h6>
      <p v-if="props.students.length > 0" class="text-muted small mb-3">
        Create teams for {{ props.students.length }} students
      </p>
      <p v-else class="text-warning small mb-3">
        <i class="fas fa-exclamation-triangle me-1"></i>
        Add participants first
      </p>
      <button
        v-if="props.students.length > 0"
        type="button"
        class="btn btn-primary btn-sm"
        @click="addTeam"
        :disabled="props.isSubmitting"
      >
        <i class="fas fa-plus me-2"></i>
        Create First Team
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, type PropType, nextTick } from 'vue';
import { useProfileStore } from '@/stores/profileStore';
import { type Team as EventTeamType } from '@/types/event';
import { type UserData } from '@/types/student';

const props = defineProps({
  initialTeams: {
      type: Array as PropType<EventTeamType[]>,
      default: () => []
  },
  students: { // These are all potential participants for the event
      type: Array as PropType<UserData[]>,
      required: true
  },
  isSubmitting: { type: Boolean, default: false },
  canAutoGenerate: { type: Boolean, default: true },
  eventId: { type: String, default: '' }, // Used to determine if editing or creating
});

const emit = defineEmits<{
  (e: 'update:teams', teams: EventTeamType[]): void;
  (e: 'error', message: string): void;
  (e: 'validity-change', isValid: boolean): void;
}>();

const studentStore = useProfileStore();
const teams = ref<LocalTeam[]>([]);
const maxTeams = 8;
const minTeams = 2; // Minimum number of teams that must exist
const minMembersPerTeam = 2; // Fixed: Minimum 2 members per team
const maxMembersPerTeam = 8; // Fixed: Maximum 8 members per team

// State for the member selection dropdowns (one per team)
const teamMemberSearches = ref<string[]>([]);
const showMemberDropdowns = ref<boolean[]>([]);

interface LocalTeam {
  id: string | undefined; // Explicitly allow undefined
  teamName: string;
  members: string[]; // Array of student UIDs
  teamLead: string | undefined;   // UID of team lead, allow undefined
  touched?: {
    teamName: boolean;
    members: boolean;
    teamLead: boolean;
  };
}

const studentNameCache = computed(() => {
    const cache: Record<string, string> = {};
    props.students.forEach(s => {
        if (s.uid && s.name) cache[s.uid] = s.name;
    });
    return cache;
});

// Add missing computed properties
const totalMembers = computed(() => {
    return teams.value.reduce((total, team) => total + team.members.length, 0);
});

const unassignedCount = computed(() => {
    const assignedUids = assignedStudentUids.value;
    return props.students.filter(student => student.uid && !assignedUids.has(student.uid)).length;
});

// A computed property that tracks all members currently assigned to any team.
// This is used to filter available students for other teams.
const assignedStudentUids = computed(() => {
  const uids = new Set<string>();
  teams.value.forEach(team => {
    team.members.forEach(memberId => uids.add(memberId));
  });
  return uids;
});

// Provides students available to be added to a specific team
const availableStudentsForTeam = (currentTeamIndex: number) => {
  const currentTeamMembers = new Set(teams.value[currentTeamIndex]?.members || []);
  return props.students.filter(student => {
    if (!student?.uid) return false;
    return !assignedStudentUids.value.has(student.uid) || currentTeamMembers.has(student.uid);
  });
};

// Replace availableStudentsForTeam with filtered search function
const filteredMembersForTeam = (teamIndex: number) => {
  const searchTerm = teamMemberSearches.value[teamIndex];
  if (!searchTerm || searchTerm.length < 2) return [];
  
  const searchLower = searchTerm.toLowerCase().trim();
  const currentTeamMembers = new Set(teams.value[teamIndex]?.members || []);
  
  return props.students.filter(student => {
    if (!student?.uid || !student.name) return false;
    if (assignedStudentUids.value.has(student.uid) && !currentTeamMembers.has(student.uid)) return false;
    return student.name.toLowerCase().includes(searchLower);
  }).slice(0, 10);
};

// Watches for changes in the `students` prop to ensure names are cached
watch(() => props.students, (newVal) => {
    if (newVal && newVal.length > 0) {
        const idsToFetch = newVal.map(s => s.uid).filter(uid => uid && !studentStore.getCachedStudentName(uid));
        if (idsToFetch.length > 0) {
            studentStore.fetchUserNamesBatch(idsToFetch).catch(_err => emit('error', 'Failed to fetch some student names.'));
        }
    }
}, { immediate: true, deep: true });


// Ensures that names for all team members are fetched and cached
// This function needs to be declared *before* `initializeTeams`
const ensureMemberNamesAreFetched = async (currentTeams: LocalTeam[]) => {
    const allMemberIds = new Set<string>();
    currentTeams.forEach(team => {
        (team.members || []).forEach(id => { if (id) allMemberIds.add(id); });
        if (team.teamLead) allMemberIds.add(team.teamLead);
    });
    const idsToFetch = Array.from(allMemberIds).filter(id => id && !studentStore.getCachedStudentName(id));
    if (idsToFetch.length > 0) {
        try { 
            await studentStore.fetchUserNamesBatch(idsToFetch); 
        }
        catch (error) { emit('error', 'Failed to load some member names.'); }
    }
};

// Define createDefaultTeam before it's used in initializeTeams
const createDefaultTeam = (index?: number): LocalTeam => {
  return {
    id: `team-${Math.random().toString(36).substr(2, 9)}`, // Always generate an ID, never undefined
    teamName: index !== undefined ? `Team ${index + 1}` : '', // Use sequential naming if index provided
    members: [],
    teamLead: undefined,
    touched: { teamName: false, members: false, teamLead: false },
  };
};

// Initializes `teams` and `selectedMemberToAddPerTeam` on component mount or `initialTeams` prop change
const initializeTeams = () => {
  const newTeams = props.initialTeams.map((t, index) => ({
    ...t,
    id: t.id || `team-${Math.random().toString(36).substr(2, 9)}`,
    teamName: t.teamName || `Team ${index + 1}`, // Use sequential naming if no name provided
    members: t.members || [],
    teamLead: t.teamLead || undefined,
    touched: { teamName: false, members: false, teamLead: false },
  }));
  
  if (newTeams.length === 0 && props.students.length > 0) {
    // Start with two default teams if none exist
    newTeams.push(createDefaultTeam(0) as {
      id: string;
      teamName: string;
      members: string[];
      teamLead: string | undefined;
      touched: { teamName: boolean; members: boolean; teamLead: boolean; };
    });
    newTeams.push(createDefaultTeam(1) as {
      id: string;
      teamName: string;
      members: string[];
      teamLead: string | undefined;
      touched: { teamName: boolean; members: boolean; teamLead: boolean; };
    });
  }
  
  teams.value = newTeams;

  // Initialize dropdown models
  teamMemberSearches.value = new Array(teams.value.length).fill('');
  showMemberDropdowns.value = new Array(teams.value.length).fill(false);
  
  ensureMemberNamesAreFetched(teams.value);
};

// Watches the `initialTeams` prop for deep changes
watch(() => props.initialTeams, initializeTeams, { deep: true, immediate: true });

// Watches the `teams` ref for deep changes and emits updates to the parent component
watch(teams, (newTeams, oldTeams) => {
    if (JSON.stringify(newTeams) !== JSON.stringify(oldTeams)) {
      nextTick(emitTeamsUpdate);
    }
}, { deep: true });

// Adds a new empty team
const addTeam = () => {
  if (teams.value.length < maxTeams) {
    // Use next index for sequential naming
    teams.value.push(createDefaultTeam(teams.value.length));
    teamMemberSearches.value.push('');
    showMemberDropdowns.value.push(false);
    nextTick(() => {
      const teamInputs = document.querySelectorAll('.list-group-item .form-control');
      const lastTeamInput = teamInputs[teamInputs.length - 1] as HTMLInputElement;
      lastTeamInput?.focus();
    });
    emitTeamsUpdate();
  } else {
    emit('error', `Cannot add more than ${maxTeams} teams.`);
  }
};

// Removes a team by its index
const removeTeam = (index: number) => {
  if (props.isSubmitting || teams.value.length <= minTeams) return;
  teams.value.splice(index, 1);
  teamMemberSearches.value.splice(index, 1);
  showMemberDropdowns.value.splice(index, 1);
  nextTick(emitTeamsUpdate);
};

// Adds a member to a specific team
const addMember = (teamIndex: number, memberId: string) => {
  if (props.isSubmitting) return;
  const team = teams.value[teamIndex];
  if (team && memberId && !team.members.includes(memberId)) {
    if (team.members.length < maxMembersPerTeam) {
      team.members.push(memberId);
      // Automatically set as lead if this is the first member
      if (team.members.length === 1) {
        team.teamLead = memberId;
      }
      nextTick(emitTeamsUpdate);
    } else {
        emit('error', `Maximum team members (${maxMembersPerTeam}) reached for ${team.teamName}.`);
    }
  }
};

// Search handlers
const searchTeamMembers = (teamIndex: number) => {
  showMemberDropdowns.value[teamIndex] = true;
};

const handleMemberSearchBlur = (teamIndex: number) => {
  setTimeout(() => { 
    showMemberDropdowns.value[teamIndex] = false; 
  }, 200);
};

// Add member from search
const addMemberFromSearch = (teamIndex: number, memberId: string) => {
  if (!props.isSubmitting) {
    addMember(teamIndex, memberId);
    teamMemberSearches.value[teamIndex] = '';
    showMemberDropdowns.value[teamIndex] = false;
  }
};

// Removes a member from a specific team
const removeMember = (teamIndex: number, memberId: string) => {
    if (props.isSubmitting) return;
    const team = teams.value[teamIndex];
    if (!team) return;

    if (team.members.length <= minMembersPerTeam) {
        emit('error', `Cannot remove member: Team ${team.teamName} requires at least ${minMembersPerTeam} members.`);
        return;
    }

    const newMembers = team.members.filter(m => m !== memberId);
    team.members = newMembers;
    // If the removed member was the lead, clear lead or set to first member
    if (team.teamLead === memberId) {
        team.teamLead = team.members.length > 0 ? team.members[0] : undefined; // Use undefined
    }
    nextTick(emitTeamsUpdate);
};


// Distributes all available students among the currently defined teams
const autoGenerateTeams = () => {
  if (props.isSubmitting || !props.canAutoGenerate || props.students.length === 0) return;
  if (teams.value.length === 0) {
    emit('error', "Please add at least one team shell before auto-generating members.");
    return;
  }

  // Create new team structures based on current teams, clearing members and leads
  const teamsToPopulate: LocalTeam[] = teams.value.map(team => ({
    ...team, // Preserves teamName, id, and touched status
    members: [],
    teamLead: undefined,
  }));

  // Shuffle all available students (props.students contains UserData objects)
  const shuffledStudents = [...props.students].sort(() => 0.5 - Math.random());

  let studentIdx = 0;
  // Distribute students in a round-robin fashion
  // Continue as long as there are students to assign
  while (studentIdx < shuffledStudents.length) {
    let studentAssignedInThisRound = false;
    for (let i = 0; i < teamsToPopulate.length; i++) {
      if (studentIdx >= shuffledStudents.length) break; // All students assigned

      const team = teamsToPopulate[i];
      // Add a check for team to satisfy TypeScript, though it should theoretically not be undefined
      if (team) {
        if (team.members.length < maxMembersPerTeam) {
          const studentToAdd = shuffledStudents[studentIdx];
          if (studentToAdd && studentToAdd.uid) {
            team.members.push(studentToAdd.uid);
            if (team.members.length === 1) { // Set first member as lead
              team.teamLead = studentToAdd.uid;
            }
            studentIdx++;
            studentAssignedInThisRound = true;
          }
        }
      }
    }
    // If no student could be assigned in a full pass (e.g., all teams full), break to prevent infinite loop
    if (!studentAssignedInThisRound && studentIdx < shuffledStudents.length) {
        // This is expected behavior when teams are full, not an error
        break;
    }
  }

  // Update the main teams ref with the newly populated teams
  teams.value = teamsToPopulate;

  nextTick(emitTeamsUpdate);
};

// Emits the updated teams to the parent component
const emitTeamsUpdate = () => {
  emit('update:teams', teams.value);
};

// Add validation computed property
const isTeamsValid = computed(() => {
  if (teams.value.length === 0) return false;
  
  return teams.value.every(team => {
    const hasName = !!(team.teamName?.trim());
    const hasMinMembers = team.members && team.members.length >= minMembersPerTeam;
    const hasTeamLead = !!(team.teamLead);
    return hasName && hasMinMembers && hasTeamLead;
  });
});

// Watch teams validity and emit changes
watch(isTeamsValid, (newValid) => {
  emit('validity-change', newValid);
}, { immediate: true });

// Initialize teams on mount
onMounted(initializeTeams);

// Add new method for setting team lead
const setTeamLead = (teamIndex: number, memberId: string) => {
  if (props.isSubmitting) return;
  const team = teams.value[teamIndex];
  if (team) {
    team.teamLead = memberId;
    // Mark as touched for validation
    if (team.touched) {
      team.touched.teamLead = true;
    }
    nextTick(emitTeamsUpdate);
  }
};
</script>

<style scoped>
.manage-teams-component {
  --border-radius: 6px;
  --primary-color: #0d6efd;
  --success-color: #198754;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
}

.teams-summary {
  background: linear-gradient(135deg, var(--bs-light-bg-subtle) 0%, var(--bs-primary-bg-subtle) 100%);
}

.team-card {
  border-radius: var(--border-radius);
  transition: all 0.2s ease;
}

.team-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08) !important;
}

.team-card .card-header {
  background: linear-gradient(135deg, var(--bs-primary-bg-subtle) 0%, var(--bs-info-bg-subtle) 100%);
}

.team-members-section {
  background: var(--bs-body-bg);
  padding: 0.75rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--bs-border-color-translucent);
}

.add-member-row {
  background: var(--bs-light-bg-subtle);
  padding: 0.5rem;
  border-radius: calc(var(--border-radius) - 2px);
  border: 1px dashed var(--bs-border-color);
}

.members-grid-compact {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* 4 columns on desktop */
  gap: 0.375rem;
}

.member-card-compact {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: var(--bs-secondary-bg-subtle);
  border: 1px solid var(--bs-border-color);
  border-radius: calc(var(--border-radius) - 2px);
  transition: all 0.2s ease;
  min-height: 2.5rem;
}

.member-card-compact:hover {
  background: var(--bs-tertiary-bg-subtle);
  border-color: var(--bs-secondary-border-subtle);
}

.member-card-compact.member-lead {
  background: linear-gradient(135deg, var(--bs-warning-bg-subtle) 0%, var(--bs-light-bg-subtle) 100%);
  border-color: var(--bs-warning-border-subtle);
}

.crown-btn-compact {
  background: none;
  border: 1px solid var(--bs-border-color);
  border-radius: 50%;
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.crown-btn-compact.active {
  background: var(--warning-color);
  border-color: var(--warning-color);
  color: white;
}

.crown-btn-compact.inactive {
  color: var(--bs-secondary);
}

.crown-btn-compact:hover {
  transform: scale(1.1);
  background: var(--warning-color);
  border-color: var(--warning-color);
  color: white;
}

.member-name-compact {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--bs-body-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px; /* Limit width for text truncation */
}

.btn-remove-compact {
  background: none;
  border: 1px solid var(--bs-border-color);
  border-radius: 50%;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: var(--danger-color);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-remove-compact:hover {
  background: var(--danger-color);
  border-color: var(--danger-color);
  color: white;
  transform: scale(1.1);
}

.empty-members-compact {
  background: var(--bs-light-bg-subtle);
  border: 1px dashed var(--bs-border-color);
  border-radius: var(--border-radius);
}

.empty-state {
  background: var(--bs-body-bg);
  border: 2px dashed var(--bs-border-color);
  border-radius: var(--border-radius);
}

/* Transitions */
.team-fade-enter-active,
.team-fade-leave-active {
  transition: all 0.3s ease;
}

.team-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.team-fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

/* Form improvements */
.form-control:focus,
.form-select:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.15);
}

.btn {
  border-radius: calc(var(--border-radius) - 2px);
  transition: all 0.2s ease;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .teams-summary {
    margin-bottom: 0.75rem;
  }
  
  .teams-summary .row {
    text-align: center;
  }
  
  .teams-summary .col-md-4 {
    justify-content: center !important;
  }
  
  /* Keep buttons in same row on mobile */
  .teams-summary .d-flex {
    flex-wrap: nowrap !important;
    justify-content: center;
    overflow-x: auto; /* Allow horizontal scroll if needed */
  }
  
  /* Ensure buttons don't break to new line */
  .teams-summary .btn {
    white-space: nowrap;
    flex-shrink: 0;
    min-width: auto;
    font-size: 0.875rem;
    padding: 0.375rem 0.75rem;
  }
  
  .team-card .card-body {
    padding: 0.75rem;
  }
  
  .team-members-section {
    padding: 0.5rem;
  }
  
  .member-card-compact {
    padding: 0.375rem;
    min-height: 2.25rem;
  }
  
  .members-grid-compact {
    grid-template-columns: repeat(2, 1fr); /* 2 columns on mobile */
    gap: 0.25rem;
  }
  
  .crown-btn-compact,
  .btn-remove-compact {
    width: 1.5rem;
    height: 1.5rem;
    font-size: 0.65rem;
  }
  
  .member-name-compact {
    font-size: 0.8rem;
    max-width: 80px; /* Smaller max width on mobile */
  }
}

@media (max-width: 480px) {
  /* Very small screens - reduce button size but keep them together */
  .teams-summary .btn {
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
  }
  
  .teams-summary .d-flex {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .team-card .card-header {
    padding: 0.75rem;
  }
  
  .empty-state {
    padding: 2rem 1rem;
  }
  
  .action-hints {
    font-size: 0.75rem;
  }
  
  .member-name-compact {
    max-width: 70px; /* Even smaller on very small screens */
  }
}

/* Input group enhancements */
.input-group-text {
  border-color: var(--bs-border-color);
  background: var(--bs-light-bg-subtle);
}

.input-group .form-control,
.input-group .form-select {
  border-color: var(--bs-border-color);
}

.input-group:focus-within .input-group-text {
  border-color: var(--primary-color);
  background: var(--bs-primary-bg-subtle);
}

/* Badge enhancements */
.badge {
  font-size: 0.7em;
  padding: 0.3em 0.5em;
  border-radius: 0.25rem;
}

/* Search Dropdown Styles */
.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--border-radius);
  max-height: 250px;
  overflow-y: auto;
  margin-top: 0.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  list-style: none;
  margin: 0.25rem 0 0 0;
  padding: 0;
}

.dropdown-item-wrapper {
  margin: 0;
  padding: 0;
}

.dropdown-item-custom {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  text-align: left;
  font-size: 0.875rem;
  color: var(--bs-body-color);
  transition: background-color 0.15s ease;
  display: flex;
  align-items: center;
}

.dropdown-item-custom:hover {
  background-color: var(--bs-primary-bg-subtle);
  color: var(--bs-primary);
}

.no-results {
  padding: 0.75rem;
  text-align: center;
  color: var(--bs-secondary);
  font-size: 0.875rem;
}
</style>