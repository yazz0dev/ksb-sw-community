<template>
  <div class="mb-4">
    <div v-if="teams.length > 0" class="mb-4">
      <div v-for="(team, index) in teams" :key="index" class="p-4 mb-4 border rounded bg-light-subtle team-box">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="flex-grow-1 me-3">
            <input type="text" class="form-control form-control-sm fw-medium" v-model="team.name"
              placeholder="Team Name" :disabled="isSubmitting" required />
          </div>
          <div>
            <button type="button" class="btn btn-sm btn-outline-danger" :disabled="isSubmitting"
              @click="removeTeam(index)" aria-label="Remove team">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div class="mb-3">
          <TeamMemberSelect :selected-members="team.members" :available-students="availableStudentsForTeam(index)"
            :name-cache="nameCache" :is-submitting="isSubmitting" :min-members="2" :max-members="10"
            @update:members="updateTeamMembers(index, $event)" />
        </div>

        <div v-if="team.members.length > 0" class="mt-2">
          <!-- Display selected members using badges -->
          <div class="d-flex flex-wrap gap-2 mb-1">
            <span v-for="memberId in team.members" :key="memberId"
              class="badge rounded-pill bg-primary-subtle text-primary-emphasis d-inline-flex align-items-center">
              {{ nameCache[memberId] || memberId }}
              <button type="button" class="btn-close btn-close-sm ms-1" :disabled="isSubmitting"
                @click="removeMember(index, memberId)" aria-label="Remove member"></button>
            </span>
          </div>
          <small class="form-text" :class="{ 'text-danger': team.members.length < 2 }">
            {{ team.members.length }}/10 members
            <span v-if="team.members.length < 2">
              (Minimum 2 members required)
            </span>
          </small>
        </div>
      </div>
    </div>
    <p v-else class="text-secondary small mb-4">No teams added yet.</p>

    <!-- Actions: Add Team / Auto-Generate -->
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
      <div>
        <button type="button" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center"
          :disabled="isSubmitting || teams.length >= maxTeams" @click="addTeam">
          <i class="fas fa-plus me-1"></i>
          <span>Add Team</span>
        </button>
      </div>

      <div v-if="canAutoGenerate">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <label>Fixed Number of Teams</label>
          <input class="form-control form-control-sm" type="number" v-model.number="generateValue" style="width: 5em;"
            :min="generationType === 'fixed-size' ? 3 : 2" :max="maxGenerateValue" :disabled="isSubmitting" />
          <button type="button" class="btn btn-sm btn-outline-info d-inline-flex align-items-center"
            :disabled="isSubmitting || !canGenerate || !hasValidEventId" :title="autoGenerateButtonTitle"
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
import TeamMemberSelect from './TeamMemberSelect.vue';  // Updated path

// Interface for a team object
interface Team {
  name: string;
  members: string[];
}

// Interface for a student object
interface Student {
  uid: string;
  name: string;
}

const props = defineProps<{
  initialTeams: Team[];
  students: Student[];
  nameCache: Record<string, string>;
  isSubmitting: boolean;
  canAutoGenerate: boolean;
  eventId?: string;
}>();

const emit = defineEmits<{
  (e: 'update:teams', teams: Team[]): void;
  (e: 'error', message: string): void;
}>();

const store = useStore();
const teams = ref<Team[]>([]);
const generationType = ref<'fixed-size' | 'fixed-count'>('fixed-size');
const generateValue = ref(3);
const maxTeams = 8;

const maxGenerateValue = computed(() => {
  if (generationType.value === 'fixed-size') {
    return 8; // Max team size (Updated from 10)
  }
  // Max number of teams: min of cap (8) or students/2 (min team size is 2 for fixed count)
  const studentCount = Array.isArray(props.students) ? props.students.length : 0;
  return Math.min(maxTeams, Math.floor(studentCount / 2));
});

const canGenerate = computed(() => {
  const studentCount = Array.isArray(props.students) ? props.students.length : 0;
  const assignedMembersCount = teams.value.flatMap(t => t.members || []).length;
  const availableStudentsCount = studentCount - assignedMembersCount;
  return availableStudentsCount >= 2; // Need at least 2 students to form a team
});

const hasValidEventId = computed(() => Boolean(props.eventId?.trim()));

const autoGenerateButtonTitle = computed(() => {
  if (!hasValidEventId.value) {
    return 'Please save the event first before generating teams';
  }
  if (!canGenerate.value) {
    return 'Not enough available students to generate teams';
  }
  if (props.isSubmitting) { // Use prop here
    return 'Processing...';
  }
  return 'Generate teams automatically';
});

const initializeTeams = () => {
  // Deep copy initialTeams to prevent mutation issues
  teams.value = JSON.parse(JSON.stringify(props.initialTeams || []));
  // Ensure default structure if empty
  if (teams.value.length === 0) {
    // Optionally add one empty team to start
    // addTeam(); 
  } else {
    // Ensure existing teams have the correct structure
    teams.value.forEach(team => {
      team.members = Array.isArray(team.members) ? team.members : [];
      team.name = team.name || '';
    });
  }
};

const addTeam = () => {
  if (teams.value.length < maxTeams) {
    teams.value.push({ name: '', members: [] });
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
  // Emit a deep copy to ensure reactivity and prevent direct mutation
  emit('update:teams', JSON.parse(JSON.stringify(teams.value)));
};

const handleAutoGenerate = async () => {
  try {
    if (!hasValidEventId.value) {
      throw new Error('Please save the event first before generating teams.');
    }

    if (generationType.value === 'fixed-count' && generateValue.value > maxTeams) {
      throw new Error(`Cannot generate more than ${maxTeams} teams.`);
    }

    const generatedTeamsData = await store.dispatch('events/autoGenerateTeams', {
      eventId: props.eventId!,
      generationType: generationType.value,
      value: generateValue.value,
      maxTeams: maxTeams
    });

    // Ensure the response is correctly structured before updating
    if (Array.isArray(generatedTeamsData)) {
      teams.value = generatedTeamsData.map(team => ({ // Ensure structure
        name: team.name || '',
        members: Array.isArray(team.members) ? team.members : []
      }));
      emitTeamsUpdate();
    } else {
      throw new Error('Team generation failed: Invalid response format');
    }
  } catch (error) {
    console.error('Error generating teams:', error);
    emit('error', error instanceof Error ? error.message : 'Failed to generate teams');
  }
};

const availableStudentsForTeam = (teamIndex: number): Student[] => {
  if (!Array.isArray(props.students)) return [];

  // Students already assigned to other teams
  const assignedToOtherTeams = new Set<string>(
    teams.value
      .filter((_, i) => i !== teamIndex)
      .flatMap(t => t.members || [])
  );

  return props.students.filter(student => !assignedToOtherTeams.has(student.uid));
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
}

/* Adjust badge button size/padding */
.badge .btn-close {
  padding: 0.25em 0.4em;
}
</style>
