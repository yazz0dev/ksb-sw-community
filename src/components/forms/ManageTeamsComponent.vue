<template>
  <div class="mb-4">
    <!-- Existing Teams Display -->
    <div v-if="teams.length > 0" class="mb-4">
      <h6 class="text-dark mb-3">Current Teams ({{ teams.length }})</h6>
      <transition-group name="fade-fast" tag="div" class="list-group list-group-flush">
        <div v-for="(team, teamIndex) in teams" :key="`team-${teamIndex}`" class="list-group-item px-0 py-3">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <input
              type="text"
              class="form-control form-control-sm d-inline-block me-2"
              :class="{ 'is-invalid': !team.teamName && team.touched?.teamName }"
              style="max-width: 250px;"
              v-model="team.teamName"
              :placeholder="`Team ${teamIndex + 1} Name`"
              @blur="team.touched && (team.touched.teamName = true); emitTeamsUpdate();"
              :disabled="props.isSubmitting"
            />
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

          <!-- Team Member Selection (Integrated from TeamMemberSelect) -->
          <div class="mb-3">
            <label class="form-label small text-secondary">
              Add Team Members
              <span class="text-danger">*</span>
              <span class="text-muted ms-1">
                ({{ team.members.length }}/{{ maxMembersPerTeam }} selected)
              </span>
            </label>
            <div class="col-auto">
            <select
              v-model="selectedMemberToAddPerTeam[teamIndex]"
                class="form-select form-select-sm user-select"
              :disabled="props.isSubmitting || team.members.length >= maxMembersPerTeam"
              @change="handleMemberSelection(teamIndex)"
              @blur="team.touched && (team.touched.members = true)"
            >
                <option value="">{{ availableStudentsForTeam(teamIndex).length ? 'Select a student to add...' : 'No available students' }}</option>
              <option
                v-for="student in availableStudentsForTeam(teamIndex)"
                :key="student.uid"
                :value="student.uid"
              >
                {{ student.name || `UID: ${student.uid.substring(0,6)}...` }}
              </option>
            </select>
            </div>
          </div>

          <div v-if="team.members.length > 0" class="mt-2">
            <label class="form-label small text-secondary">
                Select Team Lead <span class="text-danger">*</span>
            </label>
            <select
                class="form-select form-select-sm"
                :class="{ 'is-invalid': !team.teamLead && team.touched?.teamLead }"
                v-model="team.teamLead"
                :disabled="props.isSubmitting || team.members.length === 0"
                @change="emitTeamsUpdate"
                @blur="team.touched && (team.touched.teamLead = true)"
            >
                <option value="" disabled selected>Select a team lead...</option>
                <option
                    v-for="memberId in team.members"
                    :key="`lead-${memberId}`"
                    :value="memberId"
                >
                    {{ studentNameCache[memberId] || `UID: ${memberId.substring(0,6)}...` }}
                </option>
            </select>
          </div>

          <div class="d-flex flex-wrap gap-2 mt-3" v-if="team.members.length > 0">
            <span v-for="memberId in team.members" :key="memberId" class="badge rounded-pill bg-primary-subtle text-primary-emphasis d-inline-flex align-items-center">
              <i class="fas fa-user me-1"></i>
              {{ studentNameCache[memberId] || `User (${memberId.substring(0,5)}...)` }}
              <button
                 type="button"
                 class="btn-close btn-close-sm ms-1 remove-member-btn"
                 aria-label="Remove member"
                 @click="removeMember(teamIndex, memberId)"
                 :disabled="props.isSubmitting || team.members.length <= minMembersPerTeam"
               ></button>
            </span>
          </div>
          <!-- End Team Member Selection -->

          <small v-if="!team.teamName && team.touched?.teamName" class="text-danger d-block mt-1">
            Team name is required.
          </small>
          <small v-if="team.members.length < minMembersPerTeam && team.touched?.members" class="text-danger d-block mt-1">
            Requires at least {{ minMembersPerTeam }} members.
          </small>
           <small v-if="team.members.length > 0 && !team.teamLead && team.touched?.teamLead" class="text-warning d-block mt-1">
            Please select a team lead.
          </small>
        </div>
      </transition-group>
    </div>
    <div v-else class="mb-4">
        <p v-if="props.students.length > 0" class="text-secondary small fst-italic">
          No teams configured yet. Add teams manually or use auto-generation.
        </p>
        <p v-else class="text-warning small fst-italic">
          No students available to form teams. Please ensure students are registered for the event or add participants.
        </p>
    </div>

    <!-- Add Team & Auto-Generate Section -->
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4 pt-3 border-top">
      <div>
        <button 
          type="button" 
          class="btn btn-sm btn-outline-primary d-inline-flex align-items-center"
          @click="addTeam" 
          :disabled="teams.length >= maxTeams || props.isSubmitting"
        >
          <i class="fas fa-plus me-1"></i>
          <span>Add Team</span>
        </button>
        <small v-if="teams.length >= maxTeams" class="text-danger ms-2">Max {{ maxTeams }} teams reached.</small>
      </div>

      <div v-if="props.canAutoGenerate" class="my-2">
          <div v-if="props.students.length > 0" class="d-flex flex-wrap align-items-center gap-2">
            <button 
              type="button" 
              class="btn btn-sm btn-success d-inline-flex align-items-center"
              @click="autoGenerateTeams"
              :disabled="props.isSubmitting || teams.length === 0 || props.students.length === 0"
              title="Distribute all available students among existing teams."
            >
              <i class="fas fa-cogs me-1"></i>
              <span>Auto-generate Members</span>
            </button>
          </div>
          <p v-else class="text-muted small">
            Add participants to enable auto-generation.
          </p>
      </div>
      <div v-else class="my-2">
          <p class="text-muted small">
              <i class="fas fa-ban me-1"></i>
              Auto-generation of teams is not enabled for this event configuration.
          </p>
      </div>
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
}>();

const studentStore = useProfileStore();
const teams = ref<LocalTeam[]>([]);
const maxTeams = 8;
const minTeams = 1; // Minimum number of teams that must exist
const minMembersPerTeam = 2; // Fixed: Minimum 2 members per team
const maxMembersPerTeam = 8; // Fixed: Maximum 8 members per team

// State for the member selection dropdowns (one per team)
const selectedMemberToAddPerTeam = ref<(string | undefined)[]>([]); // Allow undefined for reset

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
  return props.students.filter(student =>
    student.uid && (!assignedStudentUids.value.has(student.uid) || currentTeamMembers.has(student.uid))
  );
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
  selectedMemberToAddPerTeam.value = new Array(teams.value.length).fill(undefined);
  
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
    selectedMemberToAddPerTeam.value.push(undefined);
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
  selectedMemberToAddPerTeam.value.splice(index, 1); // Remove the corresponding selection state
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

// Handle member selection from dropdown
const handleMemberSelection = (teamIndex: number) => {
  const selectedMemberId = selectedMemberToAddPerTeam.value[teamIndex];
  if (selectedMemberId) {
    addMember(teamIndex, selectedMemberId);
    // Reset the dropdown selection
    selectedMemberToAddPerTeam.value[teamIndex] = '';
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

// Initialize teams on mount
onMounted(initializeTeams);
</script>

<style scoped>
.list-group-item {
  transition: background-color 0.2s ease;
}

.list-group-item:hover {
  background-color: #f8f9fa;
}

.fade-fast-enter-active, .fade-fast-leave-active {
  transition: opacity 0.2s ease;
}
.fade-fast-enter, .fade-fast-leave-to /* .fade-fast-leave-active in <2.1.8 */ {
  opacity: 0;
}
</style>