<template>
  <div class="mb-4">
    <!-- Display Existing Teams -->
    <div v-if="teams.length > 0" class="mb-4">
      <div v-for="(team, index) in teams" :key="team.name || index" class="p-4 mb-4 border rounded bg-light-subtle team-box">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="flex-grow-1 me-3">
            <!-- Team Name Input -->
            <input type="text" class="form-control form-control-sm fw-medium" v-model="team.name"
              placeholder="Team Name" :disabled="isSubmitting" required />
            <!-- Basic validation message for name -->
            <small v-if="!team.name" class="text-danger form-text">Team name is required.</small>
          </div>
          <div>
            <!-- Remove Team Button -->
            <button type="button" class="btn btn-sm btn-outline-danger" :disabled="isSubmitting"
              @click="removeTeam(index)" aria-label="Remove team">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <!-- Team Member Selection Component -->
        <div class="mb-3">
          <TeamMemberSelect :selected-members="team.members" :available-students="availableStudentsForTeam(index)"
            :name-cache="nameCache" :is-submitting="isSubmitting" :min-members="minMembersPerTeam" :max-members="maxMembersPerTeam"
            @update:members="updateTeamMembers(index, $event)" />
        </div>

        <!-- Team Lead Selection -->
        <div class="mb-3">
          <label class="form-label small">Team Lead</label>
          <select 
            class="form-select form-select-sm"
            v-model="team.teamLead"
            required
            :disabled="isSubmitting"
          >
            <option value="">Select Team Lead</option>
            <option v-for="memberId in team.members" 
                    :key="memberId" 
                    :value="memberId">
              {{ nameCache[memberId] || memberId }}
            </option>
          </select>
        </div>

        <!-- Display Selected Members -->
        <div v-if="team.members.length > 0" class="mt-2">
          <div class="d-flex flex-wrap gap-2 mb-1">
            <span v-for="memberId in team.members" :key="memberId"
              class="badge rounded-pill bg-primary-subtle text-primary-emphasis d-inline-flex align-items-center">
              {{ nameCache[memberId] || memberId }}
              <button type="button" class="btn-close btn-close-sm ms-1" :disabled="isSubmitting"
                @click="removeMember(index, memberId)" aria-label="Remove member"></button>
            </span>
          </div>
          <!-- Member Count and Validation Message -->
          <small class="form-text" :class="{ 'text-danger': team.members.length < minMembersPerTeam }">
            {{ team.members.length }}/{{ maxMembersPerTeam }} members
            <span v-if="team.members.length < minMembersPerTeam">
              (Minimum {{ minMembersPerTeam }} members required)
            </span>
          </small>
        </div>
        <!-- Validation message if no members selected -->
        <small v-else class="text-danger form-text">
            Minimum {{ minMembersPerTeam }} members required.
        </small>
      </div>
    </div>
    <p v-else class="text-secondary small mb-4">No teams added yet.</p>

    <!-- Actions: Add Team / Auto-Generate -->
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
      <!-- Add Team Button -->
      <div>
        <button type="button" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center"
          :disabled="isSubmitting || teams.length >= maxTeams" @click="addTeam" :title="addTeamButtonTitle">
          <i class="fas fa-plus me-1"></i>
          <span>Add Team</span>
        </button>
      </div>

      <!-- Auto-Generate Section -->
      <div v-if="canAutoGenerate">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <label for="numberOfTeamsInput" class="form-label mb-0">Generate</label>
          <input id="numberOfTeamsInput" class="form-control form-control-sm" type="number" v-model.number="numberOfTeamsToGenerate" style="width: 5em;"
            :min="1" :max="maxTeamsToGenerate" :disabled="isSubmitting || teams.length >= maxTeams" />
          <label for="numberOfTeamsInput" class="form-label mb-0">Teams</label>
          <button type="button" class="btn btn-sm btn-outline-info d-inline-flex align-items-center"
            :disabled="isSubmitting || !canGenerateAnyTeam || !hasValidEventId || teams.length >= maxTeams"
            :title="autoGenerateButtonTitle"
            @click="handleAutoGenerate">
            <i class="fas fa-random me-1"></i>
            <span>Auto-Generate</span>
          </button>
        </div>
      </div>
    </div>
    <p v-if="teams.length >= maxTeams" class="form-text text-warning mt-2">Maximum number of teams ({{ maxTeams }})
      reached.</p>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import TeamMemberSelect from './TeamMemberSelect.vue';
import { Team as EventTeamType } from '@/types/event'; // Import the actual Team type

// Interface for a team object used locally in the component
interface LocalTeam {
  name: string;
  members: string[];
  teamLead: string; // Add team lead property
}

// Interface for a student object (as passed in props)
interface Student {
  uid: string;
  name: string;
}

const props = defineProps<{
  initialTeams: EventTeamType[]; // Use the imported type
  students: Student[];
  nameCache: Record<string, string>;
  isSubmitting: boolean;
  canAutoGenerate: boolean;
  eventId?: string;
}>();

const emit = defineEmits<{
  (e: 'update:teams', teams: LocalTeam[]): void; // Emit local team structure
  (e: 'error', message: string): void;
}>();

const store = useStore();
const teams = ref<LocalTeam[]>([]); // Use local team structure
const numberOfTeamsToGenerate = ref(2); // Default number of teams to generate
const maxTeams = 8; // Overall maximum teams allowed for the event
const minMembersPerTeam = 2;
const maxMembersPerTeam = 8; // Updated max members per team

// Calculate max number of teams that can be generated
const maxTeamsToGenerate = computed(() => {
  const availableSlots = maxTeams - teams.value.length;
  const studentCount = Array.isArray(props.students) ? props.students.length : 0;
  const assignedMembersCount = teams.value.flatMap(t => t.members || []).length;
  const availableStudentsCount = studentCount - assignedMembersCount;
  // Max teams is limited by available slots and available students (min 2 per team)
  const maxFromStudents = Math.floor(availableStudentsCount / minMembersPerTeam);
  return Math.max(0, Math.min(availableSlots, maxFromStudents)); // Ensure non-negative
});

// Check if *any* new team can be generated (basic check for enabling button)
const canGenerateAnyTeam = computed(() => {
  const studentCount = Array.isArray(props.students) ? props.students.length : 0;
  const assignedMembersCount = teams.value.flatMap(t => t.members || []).length;
  const availableStudentsCount = studentCount - assignedMembersCount;
  return availableStudentsCount >= minMembersPerTeam && teams.value.length < maxTeams; // Enough students and slots available?
});

const hasValidEventId = computed(() => Boolean(props.eventId?.trim()));

// --- Button Titles ---
const addTeamButtonTitle = computed(() => {
  if (teams.value.length >= maxTeams) {
    return `Maximum number of teams (${maxTeams}) reached.`;
  }
  return 'Add a new team';
});

const autoGenerateButtonTitle = computed(() => {
  if (!hasValidEventId.value) {
    return 'Please save the event first before generating teams';
  }
  if (teams.value.length >= maxTeams) {
     return `Maximum number of teams (${maxTeams}) already reached.`;
  }
  if (!canGenerateAnyTeam.value) {
    // Check why it's disabled
    const studentCount = Array.isArray(props.students) ? props.students.length : 0;
    const assignedMembersCount = teams.value.flatMap(t => t.members || []).length;
    const availableStudentsCount = studentCount - assignedMembersCount;
    if (availableStudentsCount < minMembersPerTeam) {
        return `Not enough available students (${availableStudentsCount}) to generate new teams (minimum ${minMembersPerTeam} required).`;
    }
    return 'Cannot generate more teams.'; // Generic fallback if disabled for other reasons
  }
  if (props.isSubmitting) {
    return 'Processing...';
  }
  return `Generate ${numberOfTeamsToGenerate.value} new teams automatically`;
});
// --- End Button Titles ---

const initializeTeams = () => {
  // Map EventTeamType from props to LocalTeam structure
  teams.value = (props.initialTeams || []).map(team => ({
    name: team.teamName || '', // Map teamName to name
    members: Array.isArray(team.members) ? [...team.members] : [], // Ensure members is an array copy
    teamLead: '' // Initialize team lead
    // We don't need submissions/ratings in this component's local state
  }));
  // Ensure default structure if empty
  if (teams.value.length === 0) {
    // Optionally add one empty team to start? No, let user add explicitly.
  }
};

const addTeam = () => {
  if (teams.value.length < maxTeams) {
    teams.value.push({ 
      name: `Team ${teams.value.length + 1}`, 
      members: [], 
      teamLead: '' // Initialize team lead
    });
    emitTeamsUpdate();
  }
};

const removeTeam = (index: number) => {
  teams.value.splice(index, 1);
  emitTeamsUpdate();
};

const updateTeamMembers = (teamIndex: number, members: string[]) => {
  if (teams.value[teamIndex]) {
    teams.value[teamIndex].members = members;
    emitTeamsUpdate();
  }
};

const setTeamLead = (teamIndex: number, memberId: string) => {
  if (teams.value[teamIndex]) {
    teams.value[teamIndex].teamLead = memberId;
    emitTeamsUpdate();
  }
};

const removeMember = (teamIndex: number, memberId: string) => {
  if (teams.value[teamIndex]) {
    const memberIndex = teams.value[teamIndex].members.indexOf(memberId);
    if (memberIndex !== -1) {
      teams.value[teamIndex].members.splice(memberIndex, 1);
    }
    emitTeamsUpdate();
  }
};

const emitTeamsUpdate = () => {
  // Emit a deep copy to ensure reactivity and prevent direct mutation outside the component
  emit('update:teams', JSON.parse(JSON.stringify(teams.value)));
};

const handleAutoGenerate = async () => {
  try {
    if (!hasValidEventId.value) {
      throw new Error('Please save the event first before generating teams.');
    }
    if (teams.value.length >= maxTeams) {
      throw new Error(`Maximum number of teams (${maxTeams}) already reached.`);
    }
    if (!numberOfTeamsToGenerate.value || numberOfTeamsToGenerate.value <= 0) {
      throw new Error('Please enter a valid number of teams to generate (must be > 0).');
    }
    // Input validation against dynamic max
    if (numberOfTeamsToGenerate.value > maxTeamsToGenerate.value) {
        throw new Error(`Cannot generate ${numberOfTeamsToGenerate.value} teams. Maximum possible is ${maxTeamsToGenerate.value} based on available students and slots.`);
    }

    // Dispatch the simplified action
    const finalTeamsData: EventTeamType[] = await store.dispatch('events/autoGenerateTeams', {
      eventId: props.eventId!,
      numberOfTeams: numberOfTeamsToGenerate.value, // Pass the number requested
      maxTeams: maxTeams // Pass the overall max teams limit
    });

    // Action now returns the final, complete list of teams (EventTeamType[])
    // Update the local state directly with the result from the action
    teams.value = finalTeamsData.map(team => ({
        name: team.teamName || '',
        members: Array.isArray(team.members) ? [...team.members] : [],
        teamLead: '' // Initialize team lead
    }));
    emitTeamsUpdate(); // Emit the updated list

  } catch (error) {
    console.error('Error generating teams:', error);
    emit('error', error instanceof Error ? error.message : 'Failed to generate teams');
  }
};

const availableStudentsForTeam = (teamIndex: number): Student[] => {
  if (!Array.isArray(props.students)) return [];

  // Students already assigned to *other* teams
  const assignedToOtherTeams = new Set<string>(
    teams.value
      .filter((_, i) => i !== teamIndex) // Exclude the current team
      .flatMap(t => t.members || [])
      .filter(Boolean) // Ensure UIDs are valid strings
  );

  // Return students who are not assigned to other teams
  return props.students.filter(student => student?.uid && !assignedToOtherTeams.has(student.uid));
};

watch(() => props.initialTeams, (newVal) => {
  initializeTeams(); // Re-initialize when initial data changes
}, { deep: true });

onMounted(() => {
  initializeTeams(); // Initialize on mount
});

</script>

<style scoped>
.team-box {
  background-color: var(--bs-light-bg-subtle);
  /* Use Bootstrap variable */
  border-color: var(--bs-border-color-translucent);
  /* Use Bootstrap variable */
}

.form-text {
  margin-top: 0.25rem;
  display: block;
  /* Ensure it takes block space */
  font-size: 0.875em; /* Slightly smaller */
}

/* Adjust badge button size/padding */
.badge .btn-close {
  padding: 0.25em 0.4em;
}

.form-label {
    font-size: 0.875rem; /* Slightly smaller label */
}
</style>
