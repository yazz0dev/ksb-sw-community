<template>
  <div class="mb-4">
    <h5 class="h5 mb-4">Manage Teams</h5>

    <!-- Loading/No Students Message -->
    <div v-if="students.length === 0" class="text-center text-muted small py-3">
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      Loading student list...
    </div>

    <!-- Display Existing Teams -->
    <div v-else-if="teams.length > 0" class="mb-4">
      <transition-group name="fade-fast" tag="div">
        <div v-for="(team, index) in teams" :key="team.name || `team-${index}`" class="p-4 mb-4 border rounded bg-light-subtle team-box">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <!-- Team Name Input -->
            <div class="flex-grow-1 me-3">
              <label :for="`team-name-${index}`" class="form-label small fw-medium">Team Name</label>
              <input
                :id="`team-name-${index}`"
                type="text"
                class="form-control form-control-sm"
                :class="{ 'is-invalid': !team.name }"
                v-model.trim="team.name"
                placeholder="Enter Team Name"
                :disabled="isSubmitting"
                required
              />
              <div class="invalid-feedback">Team name is required.</div>
            </div>
            <!-- Remove Team Button -->
            <div>
              <button
                type="button"
                class="btn btn-sm btn-outline-danger mt-4"
                :disabled="isSubmitting || teams.length <= 2"
                @click="removeTeam(index)"
                title="Remove Team (min 2 required)"
                aria-label="Remove team"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <!-- Team Member Selection Component -->
          <div class="mb-3">
            <!-- Ensure import path is correct -->
            <TeamMemberSelect
              :selected-members="team.members"
              :available-students="availableStudentsForTeam(index)"
              :name-cache="nameCache"
              :is-submitting="isSubmitting"
              :min-members="minMembersPerTeam"
              :max-members="maxMembersPerTeam"
              @update:members="updateTeamMembers(index, $event)"
            />
             <div v-if="team.members.length < minMembersPerTeam" class="text-danger small mt-1">
                Minimum {{ minMembersPerTeam }} members required.
             </div>
             <div v-else-if="team.members.length > maxMembersPerTeam" class="text-danger small mt-1">
                 Maximum {{ maxMembersPerTeam }} members allowed.
             </div>
             <div v-else class="text-muted small mt-1">
                  {{ team.members.length }} / {{ maxMembersPerTeam }} members selected.
             </div>
          </div>

          <!-- Team Lead Selection -->
          <div class="mb-3">
            <label :for="`team-lead-${index}`" class="form-label small fw-medium">Select Team Lead <span class="text-danger">*</span></label>
            <select
              :id="`team-lead-${index}`"
              class="form-select form-select-sm"
              :class="{ 'is-invalid': team.members.length > 0 && !team.teamLead }"
              v-model="team.teamLead"
              required
              :disabled="isSubmitting || team.members.length === 0"
            >
              <option value="" disabled>Select from members...</option>
              <option v-for="memberId in team.members"
                      :key="memberId"
                      :value="memberId">
                {{ getNameFromCache(memberId) }}
              </option>
            </select>
             <div class="invalid-feedback">Team lead selection is required.</div>
          </div>

          <!-- Display Selected Members (using nameCache) -->
          <div v-if="team.members.length > 0" class="mt-2">
             <p class="form-label small fw-medium mb-1">Selected Members:</p>
             <div class="d-flex flex-wrap gap-1 mb-1">
                <span v-for="memberId in team.members" :key="memberId"
                      class="badge rounded-pill bg-primary-subtle text-primary-emphasis d-inline-flex align-items-center">
                    {{ getNameFromCache(memberId) }}
                    <button type="button" class="btn-close btn-close-sm ms-1" :disabled="isSubmitting"
                            @click="removeMember(index, memberId)" aria-label="Remove member" style="filter: brightness(0) saturate(100%) invert(36%) sepia(94%) saturate(3115%) hue-rotate(214deg) brightness(96%) contrast(93%);"></button>
                </span>
             </div>
          </div>

        </div>
      </transition-group>
    </div>
    <p v-else class="text-secondary small mb-4 fst-italic">No teams added yet. Add at least two teams.</p>

    <!-- Actions: Add Team / Auto-Generate -->
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4 pt-3 border-top">
      <!-- Add Team Button -->
      <div>
        <button type="button" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center"
          :disabled="isSubmitting || teams.length >= maxTeams" @click="addTeam" :title="addTeamButtonTitle">
          <i class="fas fa-plus me-1"></i>
          <span>Add Team</span>
        </button>
         <p v-if="teams.length >= maxTeams" class="form-text text-warning mt-1">Maximum teams reached.</p>
      </div>

      <!-- Simplified Auto-Generate Section -->
      <div class="d-flex flex-wrap align-items-center gap-2 my-2">
          <label for="simpleNumTeams" class="form-label small mb-0 me-1">Auto-generate</label>
          <input id="simpleNumTeams" class="form-control form-control-sm" type="number" v-model.number="numberOfTeamsToGenerate" style="width: 5em;"
            :min="2" :max="maxTeams" :disabled="isSubmitting || teams.length > 0 || students.length < minMembersPerTeam * 2" />
          <label for="simpleNumTeams" class="form-label small mb-0 ms-1 me-2">teams</label>
          <button type="button" class="btn btn-sm btn-outline-info d-inline-flex align-items-center"
            :disabled="isSubmitting || students.length < minMembersPerTeam * 2 || numberOfTeamsToGenerate < 2"
            title="Distribute all students randomly into the specified number of teams (clears existing teams)."
            @click="simpleAutoGenerateTeams">
            <i class="fas fa-random me-1"></i>
            <span>Generate</span>
          </button>
          <small v-if="teams.length > 0" class="text-warning form-text ms-2">(Clear existing teams first)</small>
           <small v-else-if="students.length < minMembersPerTeam * 2" class="text-danger form-text ms-2">(Need at least {{ minMembersPerTeam * 2 }} students)</small>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, PropType } from 'vue';
import { useStore } from 'vuex';
// Corrected Import Path/Syntax
import TeamMemberSelect from './TeamMemberSelect.vue';
import { Team as EventTeamType } from '@/types/event'; // Import the actual Team type

// Interface for a team object used locally in the component
interface LocalTeam {
  name: string; // Use 'name' locally
  members: string[];
  teamLead: string;
}

// Interface for a student object (as passed in props)
interface Student {
  uid: string;
  name?: string; // Name might be optional initially
}

const props = defineProps({
  initialTeams: {
      type: Array as PropType<EventTeamType[]>,
      default: () => []
  },
  students: {
      type: Array as PropType<Student[]>,
      required: true
  },
  nameCache: {
      type: Object as PropType<Record<string, string>>,
      required: true
  },
  isSubmitting: {
      type: Boolean,
      default: false
  },
  canAutoGenerate: {
      type: Boolean,
      default: true
  },
  eventId: {
      type: String,
      default: ''
  },
});

const emit = defineEmits<{
  // Emit the structure expected by the parent (EventTeamType)
  (e: 'update:teams', teams: EventTeamType[]): void;
  (e: 'error', message: string): void;
}>();

const store = useStore();
const teams = ref<LocalTeam[]>([]); // Use local team structure
const numberOfTeamsToGenerate = ref(2); // Default number of teams to generate
const maxTeams = 8; // Overall maximum teams allowed for the event
const minMembersPerTeam = 2;
const maxMembersPerTeam = 8;

// Helper to get name from cache (object)
function getNameFromCache(uid: string): string {
  if (!uid) return 'Unknown';
  // Access nameCache from props
  return props.nameCache[uid] || `UID: ${uid.substring(0, 6)}...`;
}

// --- Auto-Generate Logic ---
function simpleAutoGenerateTeams() {
  if (props.students.length < minMembersPerTeam * 2) {
    emit('error', `At least ${minMembersPerTeam * 2} students required to auto-generate 2 teams.`);
    return;
  }
  if (teams.value.length > 0) {
    if (!confirm('This will clear any manually added teams. Proceed?')) {
        return;
    }
  }

  let nTeams = Math.max(2, Math.min(numberOfTeamsToGenerate.value || 2, maxTeams));
  if (nTeams > Math.floor(props.students.length / minMembersPerTeam)) {
    nTeams = Math.floor(props.students.length / minMembersPerTeam);
  }
  if (nTeams > maxTeams) nTeams = maxTeams;

  const shuffled = [...props.students.map(s => s.uid)].sort(() => Math.random() - 0.5);
  const newTeams: LocalTeam[] = Array.from({ length: nTeams }, (_, i) => ({
    name: `Team ${i + 1}`,
    members: [],
    teamLead: '',
  }));
  shuffled.forEach((uid, idx) => {
    newTeams[idx % nTeams].members.push(uid);
  });
  newTeams.forEach(team => {
    team.teamLead = team.members[0] || ''; // Assign first member as lead
  });
  teams.value = newTeams;
  emitTeamsUpdate();
}

// --- Button Titles ---
const addTeamButtonTitle = computed(() => {
  if (teams.value.length >= maxTeams) {
    return `Maximum number of teams (${maxTeams}) reached.`;
  }
  return 'Add a new team';
});

// --- Initialize Teams ---
const initializeTeams = () => {
  // Map EventTeamType from props to LocalTeam structure
  teams.value = (props.initialTeams || []).map(team => ({
    name: team.teamName || '', // Map teamName to name
    members: Array.isArray(team.members) ? [...team.members] : [],
    teamLead: team.teamLead || ''
  }));
  // Ensure minimum of 2 teams if initialTeams is empty or has less than 2
  while (teams.value.length < 2) {
      teams.value.push({ name: `Team ${teams.value.length + 1}`, members: [], teamLead: '' });
  }
};

const addTeam = () => {
  if (teams.value.length < maxTeams) {
    teams.value.push({
      name: `Team ${teams.value.length + 1}`,
      members: [],
      teamLead: ''
    });
    emitTeamsUpdate();
  }
};

const removeTeam = (index: number) => {
  if (teams.value.length <= 2) {
    // Optionally show a message instead of emitting an error
    alert(`At least 2 teams are required. Cannot remove more teams.`);
    // emit('error', `At least 2 teams are required. Cannot remove more teams.`);
    return;
  }
  teams.value.splice(index, 1);
  emitTeamsUpdate();
};

const updateTeamMembers = (teamIndex: number, members: string[]) => {
  if (teams.value[teamIndex]) {
    const team = teams.value[teamIndex];
    // Only reset teamLead if the current lead is no longer in the members list
    if (team.teamLead && !members.includes(team.teamLead)) {
      team.teamLead = '';
    }
    team.members = [...members]; // Update members
    emitTeamsUpdate();
  }
};

const removeMember = (teamIndex: number, memberId: string) => {
  if (teams.value[teamIndex]) {
    const team = teams.value[teamIndex];
    const memberIndex = team.members.indexOf(memberId);
    if (memberIndex !== -1) {
      team.members.splice(memberIndex, 1);
      // Reset team lead if the removed member was the lead
      if (team.teamLead === memberId) {
          team.teamLead = '';
      }
      emitTeamsUpdate();
    }
  }
};

const emitTeamsUpdate = () => {
  // Map local structure back to EventTeamType before emitting
  const teamsToEmit: EventTeamType[] = teams.value.map(localTeam => ({
      teamName: localTeam.name, // Map name back to teamName
      members: localTeam.members,
      teamLead: localTeam.teamLead,
      // submissions and ratings are not managed here, keep them undefined or empty
      submissions: [],
      ratings: []
  }));
  emit('update:teams', teamsToEmit);
};


const availableStudentsForTeam = (teamIndex: number): Student[] => {
  if (!Array.isArray(props.students)) return [];

  // Students already assigned to *other* teams
  const assignedToOtherTeams = new Set<string>(
    teams.value
      .filter((_, i) => i !== teamIndex)
      .flatMap(t => t.members || [])
      .filter(Boolean)
  );

  // Return students who are not assigned to other teams
  return props.students
    .filter(student => student?.uid && !assignedToOtherTeams.has(student.uid))
    .map(student => ({
      uid: student.uid,
      name: getNameFromCache(student.uid) // Add name from cache
    }));
};

// Use deep watcher for initialTeams
watch(() => props.initialTeams, (newVal) => {
    initializeTeams();
}, { deep: true, immediate: true }); // Run immediately on mount

// onMounted removed as logic moved to immediate watcher

</script>

<style scoped>
.team-box {
  background-color: var(--bs-light-bg-subtle);
  border-color: var(--bs-border-color-translucent);
  transition: box-shadow 0.2s ease-in-out;
}
.team-box:hover {
    box-shadow: var(--bs-box-shadow-sm);
}

.form-text {
  font-size: 0.8em;
}

.badge .btn-close-sm {
  padding: 0.2em 0.35em;
  width: 0.7em;
  height: 0.7em;
}

.form-label.small {
    font-size: 0.8rem;
    margin-bottom: 0.25rem;
    color: var(--bs-secondary);
}

.invalid-feedback {
    font-size: 0.8em;
}

/* Improved spacing and alignment */
.align-items-start {
    align-items: flex-start !important;
}
.mt-4 {
    margin-top: 1.5rem !important;
}
</style>