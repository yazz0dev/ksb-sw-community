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
              style="max-width: 250px;"
              v-model="team.teamName"
              :placeholder="`Team ${teamIndex + 1} Name`"
              @blur="emitTeamsUpdate"
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
              @change="addMember(teamIndex, selectedMemberToAddPerTeam[teamIndex])"
            >
                <option value="" disabled>{{ availableStudentsForTeam(teamIndex).length ? 'Select a student to add...' : 'No available students' }}</option>
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
                v-model="team.teamLead"
                :disabled="props.isSubmitting || team.members.length === 0"
                @change="emitTeamsUpdate"
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
                 class="btn-close btn-close-sm ms-1"
                 aria-label="Remove member"
                 @click="removeMember(teamIndex, memberId)"
                 :disabled="props.isSubmitting || team.members.length <= minMembersPerTeam"
                 class="remove-member-btn"
               ></button>
            </span>
          </div>
          <!-- End Team Member Selection -->

          <small v-if="team.members.length < minMembersPerTeam" class="text-danger d-block mt-1">
            Requires at least {{ minMembersPerTeam }} members.
          </small>
           <small v-if="team.members.length > 0 && !team.teamLead" class="text-warning d-block mt-1">
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
import { ref, computed, watch, onMounted, PropType, nextTick } from 'vue';
import { useProfileStore } from '@/stores/profileStore';
import { Team as EventTeamType } from '@/types/event';
import { UserData } from '@/types/student';

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
const selectedMemberToAddPerTeam = ref<string[]>([]);

interface LocalTeam {
  id?: string; // Keep original ID if editing
  teamName: string;
  members: string[]; // Array of student UIDs
  teamLead: string;   // UID of team lead
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
            studentStore.fetchUserNamesBatch(idsToFetch).catch(err => emit('error', 'Failed to fetch some student names.'));
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

// Initializes `teams` and `selectedMemberToAddPerTeam` on component mount or `initialTeams` prop change
const initializeTeams = () => {
  teams.value = (props.initialTeams || []).map(team => ({
    id: team.id,
    teamName: team.teamName || '',
    members: Array.isArray(team.members) ? [...team.members] : [],
    teamLead: team.teamLead || ''
  }));
  // If creating a new event (no eventId) and no initial teams, add two default teams
  if (!props.eventId && teams.value.length === 0) {
     teams.value.push({ teamName: `Team 1`, members: [], teamLead: '' });
     teams.value.push({ teamName: `Team 2`, members: [], teamLead: '' });
  }
  // Initialize dropdown selections for each team
  selectedMemberToAddPerTeam.value = teams.value.map(() => '');
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
  if (teams.value.length < maxTeams && !props.isSubmitting) {
    teams.value.push({
      teamName: `Team ${teams.value.length + 1}`,
      members: [],
      teamLead: ''
    });
    selectedMemberToAddPerTeam.value.push(''); // Add a new empty selection for the new team
    nextTick(emitTeamsUpdate);
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
  selectedMemberToAddPerTeam.value[teamIndex] = ''; // Reset dropdown
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
    // If the removed member was the lead, clear lead (logic below ensures lead is valid)
    if (team.teamLead === memberId) {
        team.teamLead = team.members.length > 0 ? team.members[0] : '';
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

  const shuffledStudents = [...props.students].sort(() => 0.5 - Math.random());
  const teamsToPopulate: LocalTeam[] = teams.value.map(team => ({
    ...team,
    members: [], // Clear existing members
    teamLead: '' // Clear existing lead
  }));

  shuffledStudents.forEach((student, index) => {
    if (student.uid) {
      const teamIndex = index % teamsToPopulate.length;
      teamsToPopulate[teamIndex].members.push(student.uid);
    }
  });

  // Assign team leads (first member of each team for simplicity)
  teamsToPopulate.forEach(team => {
    if (team.members.length > 0) {
      team.teamLead = team.members[0];
    }
  });
  
  teams.value = teamsToPopulate; // Update local state
  nextTick(emitTeamsUpdate); // Emit changes to parent
};

// Emits the updated teams array to the parent component
const emitTeamsUpdate = () => {
  const eventTeams: EventTeamType[] = teams.value.map(lt => ({
    id: lt.id,
    teamName: lt.teamName.trim() || `Team ${teams.value.indexOf(lt) + 1}`,
    members: lt.members,
    teamLead: lt.teamLead,
  }));
  emit('update:teams', eventTeams);
  ensureMemberNamesAreFetched(teams.value);
};

// Lifecycle hook to initialize teams on component mount
onMounted(() => {
  initializeTeams();
});
</script>

<style scoped>
.list-group-item {
  background-color: var(--bs-body-bg);
  border-bottom: 1px solid var(--bs-border-color-translucent) !important;
}
.list-group-item:last-child {
  border-bottom: 0 !important;
}
.badge .btn-close-sm {
  padding: 0.2em 0.35em;
  width: 0.7em;
  height: 0.7em;
  filter: brightness(0) saturate(100%) invert(1) grayscale(100%) brightness(200%); /* Adjusted for secondary badge */
}
.badge .btn-close-sm:hover {
   filter: brightness(0) saturate(100%) invert(18%) sepia(88%) saturate(4792%) hue-rotate(348deg) brightness(96%) contrast(95%);
}
.user-select {
  max-width: 250px;
}

.remove-member-btn {
  filter: brightness(0) invert(1);
}

.slide-down-enter-active {
  transition: all 0.3s ease-out;
}

.slide-down-leave-active {
  transition: all 0.3s ease-in;
}

.slide-down-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>