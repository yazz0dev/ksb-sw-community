// src/components/forms/ManageTeamsComponent.vue
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
              :disabled="props.isSubmitting"
              title="Remove Team"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <div class="mb-2">
            <label class="form-label small text-primary fw-medium mb-1">
              <i class="fas fa-user-tie me-1"></i> Team Lead
              <span class="text-danger">*</span>
            </label>
          </div>
          <TeamMemberSelect
            :selected-members="team.members"
            :available-students="availableStudentsForTeam(teamIndex)"
            :name-cache="studentNameCache"
            :team-lead="team.teamLead"
            :is-submitting="props.isSubmitting"
            @update:members="newMembers => updateTeamMembers(teamIndex, newMembers)"
            @update:team-lead="(newLead: string) => updateTeamLead(teamIndex, newLead)"
          />
          <small v-if="team.members.length < minMembersPerTeam" class="text-danger d-block mt-1">
            Requires at least {{ minMembersPerTeam }} members.
          </small>
           <small v-if="team.members.length > 0 && !team.teamLead" class="text-danger d-block mt-1">
            <i class="fas fa-exclamation-circle me-1"></i>Every team requires a team lead.
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
              :disabled="props.isSubmitting"
            >
              <i class="fas fa-cogs me-1"></i>
              <span>Auto-generate</span>
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
import { ref, computed, watch, PropType, nextTick } from 'vue';
import { useProfileStore } from '@/stores/profileStore';
import TeamMemberSelect from './TeamMemberSelect.vue'; 
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
// const eventStore = useEventStore() as any; 
const teams = ref<LocalTeam[]>([]);
const maxTeams = 8;
const minMembersPerTeam = 1; // Adjusted for flexibility, can be 2
const maxMembersPerTeam = 8; // Example, adjust as needed

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

const allStudentUids = computed(() => props.students.map(s => s.uid).filter(uid => !!uid));

const assignedStudentUids = computed(() => {
  const uids = new Set<string>();
  teams.value.forEach(team => {
    team.members.forEach(memberId => uids.add(memberId));
  });
  return uids;
});

const availableStudentsForTeam = (currentTeamIndex: number) => {
  const currentTeamMembers = new Set(teams.value[currentTeamIndex]?.members || []);
  return props.students.filter(student =>
    !assignedStudentUids.value.has(student.uid) || currentTeamMembers.has(student.uid)
  );
};


watch(() => props.students, (newVal) => {
    if (newVal && newVal.length > 0) {
        // Potentially update available students or re-validate teams
        // For now, ensure names are fetched if new students appear
        const idsToFetch = newVal.map(s => s.uid).filter(uid => uid && !studentStore.getCachedStudentName(uid));
        if (idsToFetch.length > 0) {
            studentStore.fetchUserNamesBatch(idsToFetch).catch(err => emit('error', 'Failed to fetch some student names.'));
        }
    }
}, { immediate: true, deep: true });

const emitTeamsUpdate = () => {
  const eventTeams: EventTeamType[] = teams.value.map(lt => ({
    id: lt.id, // Include original ID if it exists
    teamName: lt.teamName.trim() || `Team ${teams.value.indexOf(lt) + 1}`,
    members: lt.members,
    teamLead: lt.teamLead,
    // submissions: props.initialTeams.find(it => it.teamName === lt.teamName)?.submissions || [] // Preserve submissions if any
  }));
  emit('update:teams', eventTeams);
  ensureMemberNamesAreFetched(teams.value);
};

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
            // Force re-render or update computed props if necessary after names are fetched
            // This might involve a dummy ref change or specific logic if TeamMemberSelect relies on it.
        }
        catch (error) { emit('error', 'Failed to load some member names.'); }
    }
};

const initializeTeams = () => {
  teams.value = (props.initialTeams || []).map(team => ({
    id: team.id, // Preserve original team ID if present
    teamName: team.teamName || '',
    members: Array.isArray(team.members) ? [...team.members] : [],
    teamLead: team.teamLead || ''
  }));
  // If creating a new event (no eventId) and no initial teams, add some defaults
  if (!props.eventId && teams.value.length === 0 && props.students.length > 0) {
     // teams.value.push({ teamName: `Team 1`, members: [], teamLead: '' });
     // teams.value.push({ teamName: `Team 2`, members: [], teamLead: '' });
     // Default to 0 teams, let user add or auto-generate
  }
  ensureMemberNamesAreFetched(teams.value);
};

watch(() => props.initialTeams, initializeTeams, { deep: true, immediate: true });

watch(teams, (newTeams, oldTeams) => {
    // More robust check for actual changes before emitting
    if (JSON.stringify(newTeams) !== JSON.stringify(oldTeams)) {
      nextTick(emitTeamsUpdate);
    }
}, { deep: true });

const addTeam = () => {
  if (teams.value.length < maxTeams && !props.isSubmitting) {
    teams.value.push({
      teamName: `Team ${teams.value.length + 1}`,
      members: [],
      teamLead: ''
    });
    nextTick(emitTeamsUpdate);
  }
};

const removeTeam = (index: number) => {
  if (props.isSubmitting) return;
  teams.value.splice(index, 1);
  nextTick(emitTeamsUpdate);
};

const updateTeamMembers = (teamIndex: number, members: string[]) => {
  if (props.isSubmitting) return;
  const team = teams.value[teamIndex];
  if (team) {
    team.members = members;
    // If team lead is no longer in members, clear team lead
    if (team.teamLead && !team.members.includes(team.teamLead)) {
      team.teamLead = '';
    }
    nextTick(emitTeamsUpdate);
  }
};

const updateTeamLead = (teamIndex: number, teamLeadId: string) => {
  if (props.isSubmitting) return;
  const team = teams.value[teamIndex];
  if (team) {
    team.teamLead = teamLeadId;
    nextTick(emitTeamsUpdate);
  }
};

const autoGenerateTeams = () => {
  if (props.isSubmitting || !props.canAutoGenerate || props.students.length === 0) return;
  
  // Use current team count or default to 2 if no teams exist
  const numTeams = teams.value.length > 0 ? teams.value.length : 2;
  
  if (numTeams <= 0 || numTeams > maxTeams) {
    emit('error', `Number of teams must be between 1 and ${maxTeams}.`);
    return;
  }

  const shuffledStudents = [...props.students].sort(() => 0.5 - Math.random());
  const newGeneratedTeams: LocalTeam[] = [];

  for (let i = 0; i < numTeams; i++) {
    newGeneratedTeams.push({
      teamName: `Team ${i + 1}`,
      members: [],
      teamLead: ''
    });
  }

  shuffledStudents.forEach((student, index) => {
    if (student.uid) {
      const teamIndex = index % numTeams;
      newGeneratedTeams[teamIndex].members.push(student.uid);
    }
  });

  // Attempt to assign a team lead for each team (first member for simplicity)
  newGeneratedTeams.forEach(team => {
    if (team.members.length > 0) {
      team.teamLead = team.members[0];
    }
  });
  
  teams.value = newGeneratedTeams;
  nextTick(emitTeamsUpdate);
};

// Add this computed property to check if all teams have a team lead
const allTeamsHaveTeamLead = computed(() => {
  if (teams.value.length === 0) return true;
  return teams.value.every(team => team.members.length === 0 || team.teamLead);
});

// Make this property available to parent component
defineExpose({
  allTeamsHaveTeamLead
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
</style>