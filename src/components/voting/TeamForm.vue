<template>
  <div>
    <h5 class="h5 mb-4">{{ isManualMode ? 'Manually Set Best Team & Performer' : 'Select Best Team per Criterion:' }}</h5>
    <div class="d-flex flex-column mb-4 gap-3">
      <!-- Iterate over actual criteria -->
      <div
        v-for="allocation in criteria.filter(c => c.title !== BEST_PERFORMER_LABEL)"
        :key="`team-crit-${allocation.constraintIndex}`"
        class="mb-2"
      >
        <label :for="`team-select-${allocation.constraintIndex}`" class="form-label small">
          {{ allocation.title }} ({{ allocation.points }} XP<span v-if="allocation.role"> - {{ formatRoleName(allocation.role) }}</span>)
        </label>
        <!-- Manual Mode Select -->
        <select
          v-if="isManualMode"
          :id="`team-select-manual-${allocation.constraintIndex}`"
          class="form-select form-select-sm"
          v-model="manualSelections[`constraint${allocation.constraintIndex}`]"
          required
          :disabled="isSubmitting"
        >
          <option disabled value="">Select Team...</option>
          <option
            v-for="team in teams"
            :key="`manual-team-${team.teamName}`"
            :value="team.teamName"
          >
            {{ team.teamName }}
          </option>
        </select>
        <!-- Voting Mode Select -->
        <select
          v-else
          :id="`team-select-vote-${allocation.constraintIndex}`"
          class="form-select form-select-sm"
          v-model="teamVoting[`constraint${allocation.constraintIndex}`]"
          required
          :disabled="isSubmitting"
        >
          <option disabled value="">Select Team...</option>
          <option
            v-for="team in teams.filter(t => !isUserInTeam(t))"
            :key="`vote-team-${team.teamName}`"
            :value="team.teamName"
          >
            {{ team.teamName }}
          </option>
        </select>
        <small class="text-muted d-block mt-1" v-if="allocation.role">
          This criterion targets the {{ formatRoleName(allocation.role) }} role
        </small>
      </div>
      
      <!-- Best Performer Selection (Only for Team Events) -->
      <div class="mb-2">
        <label :for="`team-select-best-performer`" class="form-label small">
          Best Performer ({{ BEST_PERFORMER_POINTS }} XP)
        </label>
        <!-- Manual Mode Best Performer Select -->
        <select
          v-if="isManualMode"
          id="team-select-best-performer-manual"
          class="form-select form-select-sm"
          v-model="manualBestPerformerSelection"
          required
          :disabled="isSubmitting"
        >
          <option disabled value="">Select Participant...</option>
          <option
            v-for="member in allTeamMembers"
            :key="`manual-bp-${member.uid}`"
            :value="member.uid"
          >
             {{ getUserName(member.uid) }} ({{ getTeamNameForMember(member.uid) }})
          </option>
        </select>
        <!-- Voting Mode Best Performer Select -->
        <select
          v-else
          id="team-select-best-performer-vote"
          class="form-select form-select-sm"
          v-model="teamVoting['bestPerformer']"
          required
          :disabled="isSubmitting"
        >
          <option disabled value="">Select Participant...</option>
          <option
            v-for="member in selectableBestPerformers"
            :key="`vote-bp-${member.uid}`"
            :value="member.uid"
          >
             {{ getUserName(member.uid) }} ({{ getTeamNameForMember(member.uid) }})
          </option>
        </select>
        <small class="text-muted d-block mt-1">
          {{ isManualMode ? 'Select the best individual performer.' : 'Select the best individual performer (cannot be from your own team).' }}
        </small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, type PropType, watch } from 'vue';
import type { Team, EventCriteria } from '@/types/event';
import { BEST_PERFORMER_LABEL, BEST_PERFORMER_POINTS } from '@/utils/constants';
import { formatRoleName } from '@/utils/formatters';

interface TeamMember {
  uid: string;
  name: string;
}

interface TeamVoting {
  [constraintKey: string]: string;
}

interface ManualSelections {
  [constraintKey: string]: string;
}

const props = defineProps({
  criteria: {
    type: Array as PropType<EventCriteria[]>,
    required: true
  },
  teams: {
    type: Array as PropType<Team[]>,
    required: true
  },
  teamMembers: {
    type: Array as PropType<TeamMember[]>,
    required: true
  },
  teamMemberMap: {
    type: Object as PropType<Record<string, string>>,
    required: true
  },
  currentUserId: {
    type: String,
    default: ''
  },
  isManualMode: {
    type: Boolean,
    default: false
  },
  isSubmitting: {
    type: Boolean,
    default: false
  },
  existingVotes: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({})
  },
  existingBestPerformer: {
    type: String,
    default: ''
  },
  existingManualSelections: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({})
  },
  existingManualBestPerformer: {
    type: String,
    default: ''
  },
  getUserNameFn: {
    type: Function as PropType<(uid: string) => string>,
    required: true
  }
});

const emit = defineEmits(['update:teamVoting', 'update:manualSelections', 'update:bestPerformer']);

// Create reactive state to manage form inputs
const teamVoting = reactive<TeamVoting>({...props.existingVotes});
if (props.existingBestPerformer) {
  teamVoting['bestPerformer'] = props.existingBestPerformer;
}

const manualSelections = reactive<ManualSelections>({...props.existingManualSelections});
const manualBestPerformerSelection = ref(props.existingManualBestPerformer || '');

// Watch for changes in the voting data and emit events
watch(teamVoting, (newVal: Record<string, string>) => {
  emit('update:teamVoting', newVal);
}, { deep: true });

watch(manualSelections, (newVal: Record<string, string>) => {
  emit('update:manualSelections', newVal);
}, { deep: true });

watch(manualBestPerformerSelection, (newVal: string) => {
  emit('update:bestPerformer', newVal);
});

// Computed properties
const allTeamMembers = computed(() => props.teamMembers);

const selectableBestPerformers = computed(() => {
  if (!props.teamMembers || !props.currentUserId) return [];
  const currentUserTeamName = props.teamMemberMap[props.currentUserId];

  return props.teamMembers.filter(member => {
    if (member.uid === props.currentUserId) return false;
    const memberTeamName = props.teamMemberMap[member.uid];
    return memberTeamName !== currentUserTeamName;
  });
});

// Helper functions
const getUserName = (userId: string): string => {
  if (!userId) return 'Unknown User';
  return props.getUserNameFn(userId);
};

const getTeamNameForMember = (memberId: string): string => {
  return props.teamMemberMap[memberId] || 'Unknown Team';
};

const isUserInTeam = (team: Team): boolean => {
  return team.members?.includes(props.currentUserId) || false;
};
</script>

<style scoped>
.form-control:focus,
.form-select:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25);
}

.card {
  background-color: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
}

.card-header {
  background-color: var(--bs-tertiary-bg);
  border-bottom: 1px solid var(--bs-border-color);
}

.form-label {
  color: var(--bs-dark);
  font-weight: 500;
}

.text-muted {
  color: var(--bs-secondary) !important;
}

.form-select-sm {
  font-size: 0.875rem;
}
</style>
