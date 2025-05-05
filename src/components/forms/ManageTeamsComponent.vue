<!-- src/components/forms/ManageTeamsComponent.vue -->

<template>
  <div class="mb-4">
    <h5 class="h5 mb-4">Manage Teams</h5>

    <!-- Display Existing Teams -->
    <div v-if="teams.length > 0" class="mb-4">
      <p class="small text-success">(Debug: Rendering team list. Prop length: {{ props.students.length }})</p>
      <transition-group name="fade-fast" tag="div">
        <!-- Loop through each team -->
        <div v-for="(team, index) in teams" :key="team.name || `team-${index}`" class="p-4 mb-4 border rounded bg-light-subtle team-box">

          <!-- Team Name Input -->
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="flex-grow-1 me-3">
              <label :for="`team-name-${index}`" class="form-label small fw-medium">Team Name</label>
              <input
                :id="`team-name-${index}`"
                type="text"
                class="form-control form-control-sm"
                :class="{ 'is-invalid': !team.name }"
                v-model.trim="team.name"
                placeholder="Enter Team Name"
                :disabled="props.isSubmitting" 
                required
                @change="emitTeamsUpdate"
              />
              <div class="invalid-feedback">Team name is required.</div>
            </div>
            <div>
              <!-- Remove Team Button -->
              <button
                type="button"
                class="btn btn-sm btn-outline-danger mt-4"
                :disabled="props.isSubmitting || teams.length <= 2" 
                @click="removeTeam(index)"
                title="Remove Team (min 2 required)"
                aria-label="Remove team"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <!-- Team Member ADD Select Component -->
          <div class="mb-3">
            <TeamMemberSelect
              :selected-members="team.members"
              :available-students="availableStudentsForTeam(index)"
              :is-submitting="props.isSubmitting" 
              :min-members="minMembersPerTeam"
              :max-members="maxMembersPerTeam"
              @update:members="updateTeamMembers(index, $event)"
            />
            <!-- Validation/Count Display -->
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

          <!-- Display Selected Members -->
          <div v-if="team.members.length > 0" class="mb-3 selected-members-display">
            <label class="form-label small text-secondary mb-1">Selected Members:</label>
            <div class="d-flex flex-wrap gap-2">
              <span
                v-for="memberId in team.members"
                :key="memberId"
                class="badge rounded-pill bg-primary-subtle text-primary-emphasis d-inline-flex align-items-center p-1 ps-2"
              >
                <i class="fas fa-user fa-xs me-1"></i>
                <span class="me-1 small">{{ userStore.getCachedUserName(memberId) || `UID: ${memberId.substring(0,6)}...` }}</span>
                <!-- Remove Member Button -->
                <button
                  type="button"
                  class="btn-close btn-close-sm"
                  aria-label="Remove member"
                  :disabled="props.isSubmitting"
                  @click="removeMember(index, memberId)"
                  style="filter: brightness(0) saturate(100%) invert(25%) sepia(70%) saturate(3000%) hue-rotate(210deg) brightness(90%) contrast(90%);"
                ></button>
              </span>
            </div>
          </div>
          <p v-else class="text-muted small fst-italic">No members added to this team yet.</p>

          <!-- Team Lead Selection -->
          <div class="mb-3">
            <label :for="`team-lead-${index}`" class="form-label small fw-medium">Select Team Lead <span class="text-danger">*</span></label>
             <select
               :id="`team-lead-${index}`"
               class="form-select form-select-sm"
               :class="{ 'is-invalid': team.members.length > 0 && !team.teamLead }"
               v-model="team.teamLead"
               required
               :disabled="props.isSubmitting || team.members.length === 0" 
               @change="emitTeamsUpdate"
             >
               <option value="" disabled>Select from members...</option>
               <!-- Options show member names -->
               <option v-for="memberId in team.members"
                       :key="memberId"
                       :value="memberId">
                 {{ userStore.getCachedUserName(memberId) || `UID: ${memberId.substring(0,6)}...` }}
               </option>
             </select>
              <div class="invalid-feedback">Team lead selection is required.</div>
              <!-- Show Selected Team Lead Name -->
              <div v-if="team.teamLead" class="mt-1">
                  <span class="small text-muted">Selected Lead: </span>
                  <span class="small fw-medium text-success">{{ userStore.getCachedUserName(team.teamLead) || `UID: ${team.teamLead.substring(0,6)}...` }}</span>
              </div>
          </div>
        </div>
      </transition-group>
    </div>
    <!-- Message shown if teams array is empty but students are loaded -->
     <p v-else-if="props.students.length > 0" class="text-secondary small mb-4 fst-italic">No teams added yet. Add teams manually or use auto-generate.</p>
     <!-- Fallback if students prop is somehow still empty -->
     <div v-else class="text-center text-muted small py-3">
        <p class="small text-danger">(Debug: Rendering fallback 'loading/empty'. Prop length: {{ props.students?.length ?? 'undefined' }})</p>
        Student list is loading or empty...
     </div>

    <!-- Actions: Add Team / Auto-Generate -->
    <div v-if="props.students.length > 0" class="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4 pt-3 border-top">
      <!-- Add Team Button -->
      <div>
        <button type="button" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center"
          :disabled="props.isSubmitting || teams.length >= maxTeams" @click="addTeam" :title="addTeamButtonTitle"> <!-- FIX HERE -->
          <i class="fas fa-plus me-1"></i>
          <span>Add Team</span>
        </button>
         <p v-if="teams.length >= maxTeams" class="form-text text-warning mt-1">Maximum teams reached.</p>
      </div>

      <!-- Simplified Auto-Generate Section -->
      <div class="d-flex flex-wrap align-items-center gap-2 my-2">
          <label for="simpleNumTeams" class="form-label small mb-0 me-1">Auto-generate</label>
          <input id="simpleNumTeams" class="form-control form-control-sm" type="number" v-model.number="numberOfTeamsToGenerate" style="width: 5em;"
            :min="2" :max="maxTeams" :disabled="props.isSubmitting || props.students.length < minMembersPerTeam * 2" /> <!-- FIX HERE -->
          <label for="simpleNumTeams" class="form-label small mb-0 ms-1 me-2">teams</label>
          <button type="button" class="btn btn-sm btn-outline-info d-inline-flex align-items-center"
            :disabled="props.isSubmitting || props.students.length < minMembersPerTeam * 2 || numberOfTeamsToGenerate < 2" 
            title="Distribute all students randomly into the specified number of teams (clears existing teams)."
            @click="simpleAutoGenerateTeams">
            <i class="fas fa-random me-1"></i>
            <span>Generate</span>
          </button>
           <small v-if="props.students.length < minMembersPerTeam * 2 && teams.length === 0" class="text-danger form-text ms-2">(Need at least {{ minMembersPerTeam * 2 }} students)</small>
           <small v-else-if="teams.length > 0" class="text-warning form-text ms-2">(Will clear existing teams)</small>
      </div>
    </div>

  </div>
</template>

<!-- Keep the <script setup> and <style> sections exactly as they were in the previous response -->
<script setup lang="ts">
import { ref, computed, watch, onMounted, PropType, nextTick } from 'vue';
import { useUserStore } from '@/store/user';
import TeamMemberSelect from './TeamMemberSelect.vue';
import { Team as EventTeamType } from '@/types/event';
import { UserData } from '@/types/user';

// Props definition remains the same
const props = defineProps({
  initialTeams: {
      type: Array as PropType<EventTeamType[]>,
      default: () => []
  },
  students: {
      type: Array as PropType<UserData[]>,
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
  (e: 'update:teams', teams: EventTeamType[]): void;
  (e: 'error', message: string): void;
}>();

const userStore = useUserStore();
const teams = ref<LocalTeam[]>([]);
const numberOfTeamsToGenerate = ref(2);
const maxTeams = 8;
const minMembersPerTeam = 2;
const maxMembersPerTeam = 8;

interface LocalTeam {
  name: string;
  members: string[];
  teamLead: string;
}

// Debug log for students prop changes
watch(() => props.students, (newVal, oldVal) => {
    console.log(`[ManageTeamsComponent] WATCHER: students prop changed. New length: ${newVal?.length ?? 0}, Old length: ${oldVal?.length ?? 0}`);
    if (newVal && newVal.length > 0) {
        console.log(`[ManageTeamsComponent] WATCHER: First student prop:`, JSON.stringify(newVal[0]));
    }
}, { immediate: true, deep: true });


// --- NEW: Remove Member Function ---
const removeMember = (teamIndex: number, memberId: string) => {
  if (props.isSubmitting) return; // Use prop
  const team = teams.value[teamIndex];
  if (team) {
    const memberIndex = team.members.indexOf(memberId);
    if (memberIndex !== -1) {
      team.members.splice(memberIndex, 1);
      // If the removed member was the team lead, clear the lead selection
      if (team.teamLead === memberId) {
        team.teamLead = '';
      }
      // If members remain but lead is now invalid, clear lead
      if (team.members.length > 0 && !team.members.includes(team.teamLead)) {
           team.teamLead = '';
      }
      // Trigger update after state change
      nextTick(emitTeamsUpdate);
    }
  }
};

// --- Issue 2 Fix: Fetch Member Names ---
const ensureMemberNamesAreFetched = async (currentTeams: LocalTeam[]) => {
    const allMemberIds = new Set<string>();
    currentTeams.forEach(team => {
        (team.members || []).forEach(id => {
            if (id) allMemberIds.add(id);
        });
        // Also add team leads to ensure their names are fetched
        if (team.teamLead) allMemberIds.add(team.teamLead);
    });

    const idsToFetch = Array.from(allMemberIds).filter(id => !userStore.getCachedUserName(id));

    if (idsToFetch.length > 0) {
        console.log('[ManageTeams] Fetching names for members:', idsToFetch);
        try {
            await userStore.fetchUserNamesBatch(idsToFetch);
            // Re-render might be needed if reactivity doesn't pick up cached name change immediately.
            // Forcing an update is generally discouraged, but could be a workaround if needed:
            // teams.value = [...teams.value]; // This creates a new array reference
        } catch (error) {
            console.error('[ManageTeams] Failed to fetch member names:', error);
            // Optionally emit error
            emit('error', 'Failed to load some member names.');
        }
    }
};

// Initialize Teams Function
const initializeTeams = () => {
  console.log("[ManageTeamsComponent] Initializing teams from props:", props.initialTeams);
  teams.value = (props.initialTeams || []).map(team => ({
    name: team.teamName || '',
    members: Array.isArray(team.members) ? [...team.members] : [],
    teamLead: team.teamLead || ''
  }));

  // Add default teams if creating new event and no initial teams provided
  if (!props.eventId && teams.value.length === 0) {
     console.log("[ManageTeamsComponent] Initializing with 2 default teams.");
     teams.value.push({ name: `Team 1`, members: [], teamLead: '' });
     teams.value.push({ name: `Team 2`, members: [], teamLead: '' });
  }
   // Fetch names after initialization
   ensureMemberNamesAreFetched(teams.value);
};

// --- Watchers ---
// Watch initialTeams prop for changes (e.g., when editing)
watch(() => props.initialTeams, (newInitialTeams) => {
    console.log("[ManageTeamsComponent] initialTeams prop changed, re-initializing and fetching names.");
    initializeTeams(); // This now maps initialTeams to local `teams` ref
    // Names fetching is handled within initializeTeams
}, { deep: true }); // Removed immediate: true as onMounted will call initializeTeams

// Watch teams array for changes to fetch names of newly added members
watch(teams, (newTeams, oldTeams) => {
    // Avoid running on the initial setup triggered by the initialTeams watcher
    if (JSON.stringify(newTeams) !== JSON.stringify(oldTeams)) {
        ensureMemberNamesAreFetched(newTeams);
    }
}, { deep: true });

// Add Team Function
const addTeam = () => {
  if (teams.value.length < maxTeams) {
    teams.value.push({ name: `Team ${teams.value.length + 1}`, members: [], teamLead: '' });
    // No need to emit here directly, let watcher handle it if needed, or emit on form submit
    // emitTeamsUpdate();
  }
};

// Remove Team Function
const removeTeam = (index: number) => {
  if (teams.value.length <= 2) {
    alert(`At least 2 teams are required. Cannot remove more teams.`);
    return;
  }
  teams.value.splice(index, 1);
  emitTeamsUpdate(); // Emit after removing a whole team
};

// Update Team Members Function (Called by Child Component)
const updateTeamMembers = (teamIndex: number, members: string[]) => {
  if (teams.value[teamIndex]) {
    const team = teams.value[teamIndex];
    team.members = [...members]; // Update members
    // If the current lead is no longer in the members list, clear the lead
    if (team.teamLead && !team.members.includes(team.teamLead)) {
        team.teamLead = '';
    }
    // Names are fetched by the watcher on `teams` ref
    emitTeamsUpdate(); // Emit the update
  }
};

// Emit Teams Update Function
const emitTeamsUpdate = () => {
  // Perform validation before emitting
  let valid = true;
  const teamsToEmit: EventTeamType[] = teams.value.map(localTeam => {
      if (!localTeam.name.trim()) valid = false;
      if (localTeam.members.length > 0 && !localTeam.teamLead) valid = false; // Lead required if members exist
      return {
          teamName: localTeam.name,
          members: localTeam.members,
          teamLead: localTeam.teamLead,
          // Include other default fields if required by EventTeamType
          submissions: [],
          ratings: []
      };
  });
  // Optionally: emit an error if validation fails, or let parent handle it via `isFormValid`
  // if (!valid) {
  //     emit('error', 'Some team configurations are invalid.');
  // }
  emit('update:teams', teamsToEmit);
};

// Available Students for a Specific Team Function
const availableStudentsForTeam = (teamIndex: number): UserData[] => {
  if (!Array.isArray(props.students)) return [];
  const assignedToOtherTeams = new Set<string>(
    teams.value.filter((_, i) => i !== teamIndex).flatMap(t => t.members || []).filter(Boolean)
  );
  // Return only students not assigned to OTHER teams
  return props.students
    .filter(student => student?.uid && !assignedToOtherTeams.has(student.uid))
    .map(student => ({ ...student })); // Return shallow copy
};


// Auto-Generate Teams Function
function simpleAutoGenerateTeams() {
  // Check if students prop is valid before proceeding
  if (!Array.isArray(props.students) || props.students.length === 0) {
      emit('error', 'Student list is not available for auto-generation.');
      console.error("[ManageTeamsComponent] Auto-generate called with empty/invalid students prop.");
      return;
  }
  if (props.students.length < minMembersPerTeam * 2) {
    emit('error', `At least ${minMembersPerTeam * 2} students required to auto-generate teams.`);
    return;
  }
  if (teams.value.length > 0) {
    if (!confirm('This will clear any manually added teams and generate new ones. Proceed?')) {
        return;
    }
  }

  let nTeams = Math.max(2, Math.min(numberOfTeamsToGenerate.value || 2, maxTeams));
  if (nTeams > Math.floor(props.students.length / minMembersPerTeam)) {
    nTeams = Math.floor(props.students.length / minMembersPerTeam);
     emit('error', `Cannot create ${numberOfTeamsToGenerate.value} teams with ${minMembersPerTeam} members each. Generating ${nTeams} teams instead.`);
     numberOfTeamsToGenerate.value = nTeams;
  }
  if (nTeams < 2) {
      emit('error', `Cannot generate at least 2 valid teams with the available students.`);
      return;
  }

  const studentUIDs = props.students.map(s => s?.uid).filter(Boolean) as string[];
  if (studentUIDs.length < nTeams * minMembersPerTeam) {
       emit('error', `Not enough valid student UIDs (${studentUIDs.length}) available.`);
       return;
  }

  const shuffled = [...studentUIDs].sort(() => Math.random() - 0.5);
  const newTeams: LocalTeam[] = Array.from({ length: nTeams }, (_, i) => ({
    name: `Team ${i + 1}`, members: [], teamLead: '',
  }));
  shuffled.forEach((uid, idx) => {
    newTeams[idx % nTeams].members.push(uid);
  });
  newTeams.forEach(team => {
    // Ensure team lead is assigned only if members exist
    team.teamLead = team.members.length > 0 ? team.members[0] : '';
  });
  teams.value = newTeams; // This assignment will trigger the watcher to fetch names
  emitTeamsUpdate();
}

// --- Computed Button Titles ---
const addTeamButtonTitle = computed(() => {
  if (teams.value.length >= maxTeams) return `Maximum number of teams (${maxTeams}) reached.`;
  return 'Add a new team';
});


// --- Lifecycle Hooks ---
onMounted(() => {
  // Initialize based on props. Initial name fetching happens in watcher/initializeTeams
  initializeTeams();
});

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
.form-text { font-size: 0.8em; }

/* Adjusted badge close button size and style */
.badge .btn-close-sm {
    padding: 0.15em 0.3em; /* Smaller padding */
    width: 0.7em;
    height: 0.7em;
    line-height: 0.7em; /* Adjust line height */
    margin-left: 0.3rem !important;
    vertical-align: middle; /* Align vertically */
    background-size: 50%; /* Make the 'x' smaller */
    opacity: 0.7; /* Make it slightly less prominent */
    transition: opacity 0.15s ease-in-out;
}
.badge .btn-close-sm:hover {
    opacity: 1;
}

.form-label.small { font-size: 0.8rem; margin-bottom: 0.25rem; color: var(--bs-secondary); }
.invalid-feedback { font-size: 0.8em; }
.align-items-start { align-items: flex-start !important; }
.mt-4 { margin-top: 1.5rem !important; }

/* Style for selected members display */
.selected-members-display {
  margin-top: 0.75rem; /* Add some space above */
  padding-top: 0.75rem;
  border-top: 1px solid var(--bs-border-color-translucent);
}

/* Add animation for team boxes */
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: all 0.3s ease;
}
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
.fade-fast-move {
  transition: transform 0.3s ease;
}
</style>