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
    <!-- Message shown if teams array is empty, with context about student list -->
    <div v-else class="mb-4">
        <p v-if="props.students.length > 0" class="text-secondary small fst-italic">
            No teams added yet. You can add teams manually or use the auto-generate feature below.
        </p>
        <p v-else class="text-warning small fst-italic">
            <i class="fas fa-exclamation-triangle me-1"></i>
            No teams have been added yet. The student list is currently empty, so features like auto-generating team members are unavailable. You can still add team structures manually.
        </p>
    </div>


    <!-- Actions Section: Add Team always available (respecting limits), Auto-Generate conditional -->
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4 pt-3 border-top">
      <!-- Add Team Button -->
      <div>
        <button type="button" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center"
          :disabled="props.isSubmitting || teams.length >= maxTeams" @click="addTeam" :title="addTeamButtonTitle">
          <i class="fas fa-plus me-1"></i>
          <span>Add Team</span>
        </button>
         <p v-if="teams.length >= maxTeams" class="form-text text-warning mt-1">Maximum teams reached.</p>
      </div>

      <!-- Auto-Generate Section -->
      <div v-if="props.canAutoGenerate" class="my-2">
          <div v-if="props.students.length > 0" class="d-flex flex-wrap align-items-center gap-2">
              <label for="simpleNumTeams" class="form-label small mb-0 me-1">Auto-generate members for current teams</label>
              <button type="button" class="btn btn-sm btn-outline-info d-inline-flex align-items-center"
                :disabled="props.isSubmitting || teams.length < 2 || props.students.length < minMembersPerTeam * teams.length" 
                title="Distribute all students randomly into the currently configured teams (clears existing members)."
                @click="simpleAutoGenerateTeams">
                <i class="fas fa-random me-1"></i>
                <span>Generate</span>
              </button>
               <small v-if="teams.length < 2" class="text-danger form-text ms-2">(Need at least 2 teams configured)</small>
               <small v-else-if="props.students.length < minMembersPerTeam * teams.length" class="text-danger form-text ms-2">(Need at least {{ minMembersPerTeam * teams.length }} students for {{teams.length}} teams)</small>
               <small v-else-if="teams.some(t => t.members.length > 0)" class="text-warning form-text ms-2">(Will clear existing members)</small>
          </div>
          <p v-else class="text-muted small">
            <i class="fas fa-info-circle me-1"></i>
            Auto-generation of team members is unavailable as the student list is empty.
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

<!-- Keep the <script setup> and <style> sections exactly as they were in the previous response -->
<script setup lang="ts">
import { ref, computed, watch, onMounted, PropType, nextTick } from 'vue';
import { useUserStore } from '@/store/user';
// Import useEventStore
import { useEventStore } from '@/store/events';
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
const eventStore = useEventStore(); // Add eventStore
const teams = ref<LocalTeam[]>([]);
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
    console.log('[ManageTeamsComponent] Students prop changed:', newVal); // Added console.log
    if (newVal && newVal.length > 0) {
        console.log(`[ManageTeamsComponent] Received ${newVal.length} students.`);
    } else {
        console.log('[ManageTeamsComponent] Students prop is empty or not yet loaded.');
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
        try {
            await userStore.fetchUserNamesBatch(idsToFetch);
            // Re-render might be needed if reactivity doesn't pick up cached name change immediately.
            // Forcing an update is generally discouraged, but could be a workaround if needed:
            // teams.value = [...teams.value]; // This creates a new array reference
        } catch (error) {
            emit('error', 'Failed to load some member names.');
        }
    }
};

// Initialize Teams Function
const initializeTeams = () => {
  teams.value = (props.initialTeams || []).map(team => ({
    name: team.teamName || '',
    members: Array.isArray(team.members) ? [...team.members] : [],
    teamLead: team.teamLead || ''
  }));

  // Add default teams if creating new event and no initial teams provided
  if (!props.eventId && teams.value.length === 0) {
     teams.value.push({ name: `Team 1`, members: [], teamLead: '' });
     teams.value.push({ name: `Team 2`, members: [], teamLead: '' });
  }
   // Fetch names after initialization
   ensureMemberNamesAreFetched(teams.value);
};

// --- Watchers ---
// Watch initialTeams prop for changes (e.g., when editing)
watch(() => props.initialTeams, (newInitialTeams) => {
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
  if (!Array.isArray(props.students)) {
    return [];
  }
  const assignedToOtherTeams = new Set<string>(
    teams.value.filter((_, i) => i !== teamIndex).flatMap(t => t.members || []).filter(Boolean)
  );
  
  const filteredStudents = props.students
    .filter(student => {
      const isAssignedElsewhere = student?.uid && assignedToOtherTeams.has(student.uid);
      return student?.uid && !isAssignedElsewhere;
    })
    .map(student => ({ ...student })); // Return shallow copy

  return filteredStudents;
};


// Auto-Generate Teams Function
async function simpleAutoGenerateTeams() {
  // Common validations
  if (!Array.isArray(props.students) || props.students.length === 0) {
      emit('error', 'Student list is not available for auto-generation.');
      return;
  }
  if (teams.value.length < 2) {
    emit('error', `At least 2 teams must be configured before auto-generating members.`);
    return;
  }
  if (props.students.length < minMembersPerTeam * teams.value.length) {
    emit('error', `At least ${minMembersPerTeam * teams.value.length} students required to populate ${teams.value.length} teams with a minimum of ${minMembersPerTeam} members each.`);
    return;
  }

  if (teams.value.some(t => t.members.length > 0)) {
    if (!confirm('This will clear existing members from all current teams and distribute students. Proceed?')) {
        return;
    }
  }

  if (props.eventId) { // Existing event: Use store action
    try {
      // Ensure the current team structure (names, number of teams) is saved if it has changed.
      emitTeamsUpdate(); 
      await nextTick();

      await eventStore.autoGenerateTeams({
          eventId: props.eventId,
          minMembersPerTeam: minMembersPerTeam,
          maxMembersPerTeam: maxMembersPerTeam,
      });
      // Parent component should react to store changes and update `initialTeams` prop,
      // which will trigger re-initialization in this component.
    } catch (error: any) {
      emit('error', error.message || 'Failed to auto-generate teams via store.');
    }
  } else { // New event: Generate locally
    try {
      const studentsToDistribute = [...props.students]; // Mutable copy
      const localTeams = teams.value; // Direct reference to the reactive array
      const numberOfLocalTeams = localTeams.length;

      // 1. Clear existing members and leads from local teams but preserve names
      const tempTeamsToPopulate = localTeams.map(t => ({
          name: t.name, // Preserve original name
          members: [] as string[],
          teamLead: '' as string,
      }));

      // 2. Shuffle students
      const shuffledStudents = studentsToDistribute.sort(() => 0.5 - Math.random());

      // 3. Distribute students (round-robin)
      shuffledStudents.forEach((student, idx) => {
          const teamIndexToAddTo = idx % numberOfLocalTeams;
          if (tempTeamsToPopulate[teamIndexToAddTo].members.length < maxMembersPerTeam) {
              tempTeamsToPopulate[teamIndexToAddTo].members.push(student.uid);
          }
      });
      
      // 4. Update the actual reactive `teams.value` with populated members and new leads
      localTeams.forEach((originalTeam, index) => {
          const populatedTeamData = tempTeamsToPopulate[index];
          originalTeam.members = populatedTeamData.members;
          originalTeam.teamLead = populatedTeamData.members.length > 0 ? populatedTeamData.members[0] : '';
      });
      
      // Ensure names are fetched for any new UIDs if necessary (though props.students should have names)
      // await ensureMemberNamesAreFetched(localTeams); // Watcher on `teams` should handle this if structure changes enough

      emitTeamsUpdate(); // Emit the locally updated teams to the parent
      // Optionally, emit a success message or rely on UI update.
      // emit('error', 'Teams generated locally. Save the event to persist them.'); // Example notification

    } catch (error: any) {
      emit('error', error.message || 'Failed to auto-generate teams locally.');
    }
  }
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