<template>
  <div class="mb-4">
    <!-- Existing Teams -->
    <div v-if="teams.length > 0" class="mb-4">
      <div v-for="(team, index) in teams" :key="index" class="box mb-4 p-4 team-box">
        <div class="level is-mobile">
          <div class="level-left">
            <div class="field level-item">
              <div class="control">
                <input
                  class="input is-small has-text-weight-medium"
                  v-model="team.teamName"
                  placeholder="Team Name"
                  :disabled="isSubmitting"
                  required
                />
              </div>
            </div>
          </div>
          <div class="level-right">
            <div class="level-item">
              <button
                type="button"
                class="button is-danger is-light is-small"
                :disabled="isSubmitting"
                @click="removeTeam(index)"
                aria-label="Remove team"
              >
                <span class="icon is-small"><i class="fas fa-times"></i></span>
              </button>
            </div>
          </div>
        </div>
        
        <div class="mb-3">
          <TeamMemberSelect
            :selected-members="team.members"
            :available-students="availableStudentsForTeam(index)"
            :name-cache="nameCache"
            :is-submitting="isSubmitting"
            :min-members="2"
            :max-members="10"
            @update:members="updateTeamMembers(index, $event)"
          />
        </div>
          
        <div v-if="team.members.length > 0" class="mt-2">
          <div class="tags">
            <span
              v-for="memberId in team.members"
              :key="memberId"
              class="tag is-primary is-light is-medium"
            >
              {{ nameCache[memberId] || memberId }}
              <button 
                class="delete is-small" 
                :disabled="isSubmitting"
                @click="removeMember(index, memberId)"
                aria-label="Remove member"
               ></button>
            </span>
          </div>
          <p class="help is-size-7" :class="{ 'has-text-danger': team.members.length < 2 }">
            {{ team.members.length }}/10 members
            <span v-if="team.members.length < 2">
              (Minimum 2 members required)
            </span>
          </p>
        </div>
      </div>
    </div>
     <p v-else class="has-text-grey is-size-7 mb-4">No teams added yet.</p>

    <!-- Actions: Add Team / Auto-Generate -->
    <div class="level is-mobile">
        <div class="level-left">
            <div class="level-item">
                <button
                  type="button"
                  class="button is-primary is-light is-small"
                  :disabled="isSubmitting || teams.length >= maxTeams"
                  @click="addTeam"
                 >
                   <span class="icon is-small"><i class="fas fa-plus"></i></span>
                   <span>Add Team</span>
                </button>
            </div>
        </div>
        
        <div class="level-right" v-if="canAutoGenerate">
           <div class="level-item">
             <div class="field is-grouped is-grouped-multiline">
                <div class="control">
                    <div class="select is-small">
                         <select v-model="generationType" :disabled="isSubmitting">
                            <option value="fixed-size">Fixed Size Teams</option>
                            <option value="fixed-count">Fixed Number of Teams</option>
                        </select>
                    </div>
                </div>
                 <div class="control">
                     <input 
                        class="input is-small" 
                        type="number" 
                        v-model.number="generateValue" 
                        style="width: 5em;"
                        :min="2" 
                        :max="maxGenerateValue" 
                        :disabled="isSubmitting"
                      />
                </div>
                <div class="control">
                    <button
                      type="button"
                      class="button is-link is-light is-small"
                      :disabled="isSubmitting || !canGenerate || !hasValidEventId"
                      :title="autoGenerateButtonTitle"
                      @click="handleAutoGenerate"
                    >
                       <span class="icon is-small"><i class="fas fa-random"></i></span>
                       <span>Auto-Generate</span>
                    </button>
                </div>
             </div>
           </div>
        </div>
    </div>
     <p v-if="teams.length >= maxTeams" class="help is-warning">Maximum number of teams ({{maxTeams}}) reached.</p>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import TeamMemberSelect from './TeamMemberSelect.vue'; 

interface Team {
  teamName: string;
  members: string[];
  submissions?: any[]; // Kept optional fields
  ratings?: any[];
}

interface Student {
  uid: string;
  name?: string;
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
    return 10; // Max team size
  }
  // Max number of teams: min of cap (8) or students/2
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
        team.teamName = team.teamName || '';
        team.submissions = Array.isArray(team.submissions) ? team.submissions : [];
        team.ratings = Array.isArray(team.ratings) ? team.ratings : [];
    });
  }
};

const addTeam = () => {
  if (teams.value.length < maxTeams) {
    teams.value.push({ teamName: '', members: [], submissions: [], ratings: [] });
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
    teams.value[teamIndex].members = teams.value[teamIndex].members.filter(id => id !== memberId);
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
            teamName: team.teamName || '', 
            members: Array.isArray(team.members) ? team.members : [],
            submissions: Array.isArray(team.submissions) ? team.submissions : [],
            ratings: Array.isArray(team.ratings) ? team.ratings : []
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
  background-color: #f9f9f9; /* Lighter background for team boxes */
  border: 1px solid #e0e0e0;
}
.help {
    margin-top: 0.25rem;
}
/* Ensure vertical alignment in grouped fields */
.field.is-grouped .control {
    display: flex;
    align-items: center;
}
</style>