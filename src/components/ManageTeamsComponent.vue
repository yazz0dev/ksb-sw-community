<template>
  <div class="space-y-4">
    <template v-if="teams.length > 0">
      <div v-for="(team, index) in teams" :key="index" class="p-4 bg-surface rounded-lg border border-border">
        <div class="flex justify-between items-center mb-3">
          <div class="flex items-center space-x-2">
            <input
              type="text"
              v-model="team.teamName"
              class="px-2 py-1 text-sm font-medium rounded border-border focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Team Name"
              :disabled="isSubmitting"
            >
          </div>
          <button
            @click="removeTeam(index)"
            class="text-error hover:text-error-dark"
            :disabled="isSubmitting"
            type="button"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="space-y-2">
          <TeamMemberSelect
            :selected-members="team.members"
            :available-students="availableStudentsForTeam(index)"
            :name-cache="nameCache"
            :is-submitting="isSubmitting"
            :min-members="2"
            :max-members="10"
            @update:members="updateTeamMembers(index, $event)"
          />
          
          <!-- Show selected members horizontally -->
          <div v-if="team.members.length > 0" class="mt-2">
            <div class="flex flex-wrap gap-2">
              <span v-for="memberId in team.members" :key="memberId"
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-primary-extraLight text-primary-dark">
                {{ nameCache[memberId] || memberId }}
                <button
                  @click="removeMember(index, memberId)"
                  class="ml-1.5 -mr-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-primary-dark hover:bg-primary-light hover:text-white focus:outline-none"
                  :disabled="isSubmitting"
                >
                  <span class="sr-only">Remove {{ nameCache[memberId] || memberId }}</span>
                  <i class="fas fa-times text-xs"></i>
                </button>
              </span>
            </div>
            <p class="text-xs text-text-secondary mt-1">
              {{ team.members.length }}/10 members
              <span v-if="team.members.length < 2" class="text-error">
                (Minimum 2 members required)
              </span>
            </p>
          </div>
        </div>
      </div>
    </template>

    <div class="flex justify-between items-center">
      <button
        type="button"
        @click="addTeam"
        class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
        :disabled="isSubmitting"
      >
        <i class="fas fa-plus mr-1.5"></i> Add Team
      </button>

      <template v-if="canAutoGenerate">
        <div class="flex items-center space-x-2">
          <select
            v-model="generationType"
            class="rounded-md border-border text-sm"
            :disabled="isSubmitting"
          >
            <option value="fixed-size">Fixed Size Teams</option>
            <option value="fixed-count">Fixed Number of Teams</option>
          </select>
          
          <input
            type="number"
            v-model.number="generateValue"
            class="w-16 rounded-md border-border text-sm"
            :min="2"
            :max="maxGenerateValue"
            :disabled="isSubmitting"
          >
          
          <button
            type="button"
            @click="handleAutoGenerate"
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-primary-text bg-secondary hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-colors disabled:opacity-50"
            :disabled="isSubmitting || !canGenerate || !hasValidEventId"
            :title="autoGenerateButtonTitle"
          >
            <i class="fas fa-random mr-1.5"></i> Auto-Generate
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
// Ensure this path is correct relative to ManageTeamsComponent.vue
import TeamMemberSelect from '././TeamMemberSelect.vue'; 

interface Team {
  teamName: string;
  members: string[];
  submissions: any[]; // Consider defining a Submission type if needed
  ratings: any[]; // Consider defining a Rating type if needed
}

interface Student {
  uid: string;
  name?: string;
}

interface Props {
  initialTeams: Team[];
  students: Student[];
  nameCache: Record<string, string>;
  isSubmitting: boolean;
  canAutoGenerate: boolean;
  eventId?: string; // Make eventId optional with '?'
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:teams', teams: Team[]): void;
  (e: 'error', message: string): void;
}>();

const store = useStore();
// Initialize teams ref correctly, handling potential undefined initialTeams
const teams = ref<Team[]>(JSON.parse(JSON.stringify(props.initialTeams || []))); 
const generationType = ref<'fixed-size' | 'fixed-count'>('fixed-size');
const generateValue = ref(3);

const maxTeams = 8; // Add this constant at the script setup level

const maxGenerateValue = computed(() => {
  if (generationType.value === 'fixed-size') {
    return 10; // Maximum 10 members per team
  }
  // For fixed-count, limit by both maxTeams and available students
  return Math.min(maxTeams, Math.floor(props.students.length / 2));
});

const canGenerate = computed(() => {
  const studentCount = Array.isArray(props.students) ? props.students.length : 0;
  const assignedMembersCount = teams.value.flatMap(t => t.members || []).length;
  const availableStudents = studentCount - assignedMembersCount;
  return availableStudents >= 2; // Minimum team size
});

const hasValidEventId = computed(() => Boolean(props.eventId?.trim()));

const autoGenerateButtonTitle = computed(() => {
  if (!hasValidEventId.value) {
    return 'Please save the event first before generating teams';
  }
  if (!canGenerate.value) {
    return 'Not enough available students to generate teams';
  }
  if (isSubmitting.value) {
    return 'Please wait...';
  }
  return 'Generate teams automatically';
});

const handleAutoGenerate = async () => {
  try {
    if (!hasValidEventId.value) {
      throw new Error('Please save the event first before generating teams.');
    }

    // Add validation for maximum teams
    if (generationType.value === 'fixed-count' && generateValue.value > maxTeams) {
      throw new Error(`Cannot generate more than ${maxTeams} teams.`);
    }

    const generatedTeams = await store.dispatch('events/autoGenerateTeams', {
      eventId: props.eventId!,
      generationType: generationType.value,
      value: generateValue.value,
      maxTeams: maxTeams
    });
    
    if (Array.isArray(generatedTeams)) {
      teams.value = generatedTeams;
      emit('update:teams', teams.value);
    } else {
      throw new Error('Team generation failed: Invalid response from server');
    }
  } catch (error) {
    console.error('Error generating teams:', error);
    emit('error', error instanceof Error ? error.message : 'Failed to generate teams');
  }
};

const availableStudentsForTeam = (teamIndex: number): Student[] => {
  if (!Array.isArray(props.students)) return [];
  
  const assignedToOtherTeams = new Set(
    teams.value
      .filter((_, i) => i !== teamIndex)
      .flatMap(t => t.members || []) // Ensure members is an array
  );
  
  return props.students.filter(s => s && s.uid && !assignedToOtherTeams.has(s.uid));
};

const addTeam = () => {
  if (teams.value.length >= maxTeams) {
    emit('error', 'Maximum of 8 teams allowed');
    return;
  }
  if (teams.value.length >= Math.floor(props.students.length / 2)) {
    emit('error', 'Maximum number of possible teams reached based on available students');
    return;
  }
  teams.value.push({
    teamName: `Team ${teams.value.length + 1}`,
    members: [],
    submissions: [],
    ratings: []
  });
  emit('update:teams', teams.value);
};

const removeTeam = (index: number) => {
    // Prevent removing first two teams
    if (index < 2) {
        emit('error', 'Cannot remove default teams - minimum 2 teams required');
        return;
    }
    teams.value.splice(index, 1);
    emit('update:teams', teams.value);
};

// Add initialization for default teams
const initializeDefaultTeams = () => {
    if (!teams.value || teams.value.length === 0) {
        teams.value = [
            {
                teamName: 'Team 1',
                members: [],
                submissions: [],
                ratings: []
            },
            {
                teamName: 'Team 2',
                members: [],
                submissions: [],
                ratings: []
            }
        ];
        emit('update:teams', teams.value);
    }
};

onMounted(() => {
    initializeDefaultTeams();
});

const removeMember = (teamIndex: number, memberId: string) => {
  if (teams.value[teamIndex]) {
    teams.value[teamIndex].members = teams.value[teamIndex].members.filter(id => id !== memberId);
    emit('update:teams', teams.value);
  }
};

const updateTeamMembers = (teamIndex: number, newMembers: string[]) => {
  if (teams.value[teamIndex]) {
    // Enforce member limits
    if (newMembers.length > 10) {
      emit('error', 'Maximum 10 members per team allowed');
      return;
    }
    teams.value[teamIndex].members = newMembers;
    emit('update:teams', teams.value);
  }
};

// Watch initialTeams prop for changes
watch(() => props.initialTeams, (newTeams) => {
  // Deep copy and handle potential undefined/null values
  teams.value = JSON.parse(JSON.stringify(newTeams || [])); 
}, { immediate: true, deep: true });

</script>

<style scoped>
/* Your existing styles */
</style>