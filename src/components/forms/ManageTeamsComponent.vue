<!-- src/components/forms/ManageTeamsComponent.vue -->

<template>
  <div class="mb-4">
    <h5 class="h5 mb-4">Manage Teams</h5>

    <div v-if="teams.length > 0" class="mb-4">
      <p class="small text-success">(Debug: Rendering team list. Students prop length: {{ props.students.length }})</p>
      <transition-group name="fade-fast" tag="div">
        <div v-for="(team, index) in teams" :key="team.name || `team-${index}`" class="p-4 mb-4 border rounded bg-light-subtle team-box">
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

          <div class="mb-3">
            <TeamMemberSelect
              :selected-members="team.members"
              :available-students="availableStudentsForTeam(index)"
              :is-submitting="props.isSubmitting"
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
               <option v-for="memberId in team.members"
                       :key="memberId"
                       :value="memberId">
                 {{ userStore.getCachedUserName(memberId) || `UID: ${memberId.substring(0,6)}...` }}
               </option>
             </select>
              <div class="invalid-feedback">Team lead selection is required.</div>
              <div v-if="team.teamLead" class="mt-1">
                  <span class="small text-muted">Selected Lead: </span>
                  <span class="small fw-medium text-success">{{ userStore.getCachedUserName(team.teamLead) || `UID: ${team.teamLead.substring(0,6)}...` }}</span>
              </div>
          </div>
        </div>
      </transition-group>
    </div>
    <div v-else class="mb-4">
        <p v-if="props.students.length > 0" class="text-secondary small fst-italic">
            No teams added yet. You can add teams manually or use the auto-generate feature below.
        </p>
        <p v-else class="text-warning small fst-italic">
            <i class="fas fa-exclamation-triangle me-1"></i>
            No teams have been added yet. The student list is currently empty, so features like auto-generating team members are unavailable. You can still add team structures manually.
        </p>
    </div>

    <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4 pt-3 border-top">
      <div>
        <button type="button" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center"
          :disabled="props.isSubmitting || teams.length >= maxTeams" @click="addTeam" :title="addTeamButtonTitle">
          <i class="fas fa-plus me-1"></i>
          <span>Add Team</span>
        </button>
         <p v-if="teams.length >= maxTeams" class="form-text text-warning mt-1">Maximum teams reached.</p>
      </div>

      <div v-if="props.canAutoGenerate" class="my-2">
          <div v-if="props.students.length > 0" class="d-flex flex-wrap align-items-center gap-2">
              <label for="simpleNumTeams" class="form-label small mb-0 me-1">Auto-generate members for current teams</label>
              <button type="button" class="btn btn-sm btn-outline-info d-inline-flex align-items-center"
                :disabled="props.isSubmitting || teams.length < 2 || props.students.length < minMembersPerTeam * teams.length"
                title="Distribute all students randomly into the currently configured teams (clears existing members). Prioritizes experienced or equipped users as leads."
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

<script setup lang="ts">
import { ref, computed, watch, onMounted, PropType, nextTick } from 'vue';
import { useUserStore } from '@/store/user';
import { useEventStore } from '@/store/events';
import TeamMemberSelect from './TeamMemberSelect.vue';
import { Team as EventTeamType } from '@/types/event';
// Use UserData as props.students will be UserData[]
import { UserData } from '@/types/user';
import { XPData, getDefaultXPData } from '@/types/xp'; // Import XPData for the map

const props = defineProps({
  initialTeams: {
      type: Array as PropType<EventTeamType[]>,
      default: () => []
  },
  students: { // This should now be UserData[]
      type: Array as PropType<UserData[]>,
      required: true
  },
  isSubmitting: { type: Boolean, default: false },
  canAutoGenerate: { type: Boolean, default: true },
  eventId: { type: String, default: '' },
});

const emit = defineEmits<{
  (e: 'update:teams', teams: EventTeamType[]): void;
  (e: 'error', message: string): void;
}>();

const userStore = useUserStore();
const eventStore = useEventStore();
const teams = ref<LocalTeam[]>([]);
const maxTeams = 8;
const minMembersPerTeam = 2;
const maxMembersPerTeam = 8; // Max members per team

interface LocalTeam {
  name: string;
  members: string[];
  teamLead: string;
}

watch(() => props.students, (newVal) => {
    console.log('[ManageTeamsComponent] Students prop changed:', newVal ? newVal.length : 0);
    // No xpData directly on UserData, so this check is removed or adapted if needed elsewhere
    // if (newVal && newVal.length > 0 && newVal[0].xpData) { 
    //     console.log('[ManageTeamsComponent] First student has xpData.');
    // } else if (newVal && newVal.length > 0) {
    //     console.warn('[ManageTeamsComponent] First student does NOT have xpData. Team lead prioritization might not work as expected.');
    // }
    if (newVal && newVal.length > 0) {
        console.log('[ManageTeamsComponent] Students prop updated. XP data will be fetched on demand for auto-generation.');
    }
}, { immediate: true, deep: true });

const removeMember = (teamIndex: number, memberId: string) => {
  if (props.isSubmitting) return;
  const team = teams.value[teamIndex];
  if (team) {
    const memberIndex = team.members.indexOf(memberId);
    if (memberIndex !== -1) {
      team.members.splice(memberIndex, 1);
      if (team.teamLead === memberId) team.teamLead = '';
      if (team.members.length > 0 && !team.members.includes(team.teamLead)) team.teamLead = '';
      nextTick(emitTeamsUpdate);
    }
  }
};

const ensureMemberNamesAreFetched = async (currentTeams: LocalTeam[]) => {
    const allMemberIds = new Set<string>();
    currentTeams.forEach(team => {
        (team.members || []).forEach(id => { if (id) allMemberIds.add(id); });
        if (team.teamLead) allMemberIds.add(team.teamLead);
    });
    const idsToFetch = Array.from(allMemberIds).filter(id => !userStore.getCachedUserName(id));
    if (idsToFetch.length > 0) {
        try { await userStore.fetchUserNamesBatch(idsToFetch); }
        catch (error) { emit('error', 'Failed to load some member names.'); }
    }
};

const initializeTeams = () => {
  teams.value = (props.initialTeams || []).map(team => ({
    name: team.teamName || '',
    members: Array.isArray(team.members) ? [...team.members] : [],
    teamLead: team.teamLead || ''
  }));
  if (!props.eventId && teams.value.length === 0) {
     teams.value.push({ name: `Team 1`, members: [], teamLead: '' });
     teams.value.push({ name: `Team 2`, members: [], teamLead: '' });
  }
   ensureMemberNamesAreFetched(teams.value);
};

watch(() => props.initialTeams, initializeTeams, { deep: true });
watch(teams, (newTeams, oldTeams) => {
    if (JSON.stringify(newTeams) !== JSON.stringify(oldTeams)) {
        ensureMemberNamesAreFetched(newTeams);
    }
}, { deep: true });

const addTeam = () => {
  if (teams.value.length < maxTeams) {
    teams.value.push({ name: `Team ${teams.value.length + 1}`, members: [], teamLead: '' });
    // emitTeamsUpdate will be called on name change or member addition
  }
};

const removeTeam = (index: number) => {
  if (teams.value.length <= 2) {
    alert(`At least 2 teams are required.`); return;
  }
  teams.value.splice(index, 1);
  emitTeamsUpdate();
};

const updateTeamMembers = (teamIndex: number, members: string[]) => {
  if (teams.value[teamIndex]) {
    const team = teams.value[teamIndex];
    team.members = [...members];
    if (team.teamLead && !team.members.includes(team.teamLead)) team.teamLead = '';
    emitTeamsUpdate();
  }
};

const emitTeamsUpdate = () => {
  const teamsToEmit: EventTeamType[] = teams.value.map(localTeam => ({
      teamName: localTeam.name,
      members: localTeam.members,
      teamLead: localTeam.teamLead,
  }));
  emit('update:teams', teamsToEmit);
};

const availableStudentsForTeam = (teamIndex: number): UserData[] => { // Return type is UserData[]
  if (!Array.isArray(props.students)) return [];
  const assignedToOtherTeams = new Set<string>(
    teams.value.filter((_, i) => i !== teamIndex).flatMap(t => t.members || []).filter(Boolean)
  );
  return props.students.filter(student => student?.uid && !assignedToOtherTeams.has(student.uid));
};


// Auto-Generate Teams Function with Prioritization
async function simpleAutoGenerateTeams() {
  if (!Array.isArray(props.students) || props.students.length === 0) {
      emit('error', 'Student list is not available for auto-generation.'); return;
  }
  if (teams.value.length < 2) {
    emit('error', `At least 2 teams must be configured.`); return;
  }
  const requiredStudents = minMembersPerTeam * teams.value.length;
  if (props.students.length < requiredStudents) {
    emit('error', `At least ${requiredStudents} students required for ${teams.value.length} teams.`); return;
  }
  if (teams.value.some(t => t.members.length > 0) && !confirm('This will clear existing members and leads. Proceed?')) {
    return;
  }

  // Use eventStore action if eventId exists (for existing events)
  // This part might need adjustment if eventStore.autoGenerateTeams also needs to fetch XP
  if (props.eventId) {
    try {
      emitTeamsUpdate(); // Save current team names if they changed
      await nextTick();
      // The eventStore action will need to be updated to fetch XP for students if it relies on it.
      // For now, assuming it might use its own logic or also call userStore.fetchXPForUsers.
      await eventStore.autoGenerateTeams({
          eventId: props.eventId,
          minMembersPerTeam: minMembersPerTeam,
          maxMembersPerTeam: maxMembersPerTeam,
      });
      // Parent will receive updated `initialTeams` prop
    } catch (error: any) {
      emit('error', error.message || 'Failed to auto-generate teams via store.');
    }
    return;
  }

  // Local generation for new events
  try {
    const studentUids = props.students.map(s => s.uid);
    let studentXpMap: Map<string, XPData> = new Map();

    if (studentUids.length > 0) {
        studentXpMap = await userStore.fetchXPForUsers(studentUids);
    }

    // 1. Sort students: by XP (desc), then by hasLaptop (true first), then shuffle for tie-breaking
    const sortedStudents = [...props.students].sort((a, b) => {
        const xpDataA = studentXpMap.get(a.uid) || getDefaultXPData(a.uid);
        const xpDataB = studentXpMap.get(b.uid) || getDefaultXPData(b.uid);
        const totalXpA = xpDataA.totalCalculatedXp ?? 0;
        const totalXpB = xpDataB.totalCalculatedXp ?? 0;

        if (totalXpB !== totalXpA) return totalXpB - totalXpA; // Higher XP first

        const hasLaptopA = a.hasLaptop ?? false;
        const hasLaptopB = b.hasLaptop ?? false;
        if (hasLaptopB !== hasLaptopA) return hasLaptopB ? 1 : -1; // Has laptop first

        return 0.5 - Math.random(); // Shuffle for same XP/laptop status
    });

    const localTeams = teams.value;
    const numberOfLocalTeams = localTeams.length;

    // 2. Clear existing members and leads, preserve team names
    const tempTeamsToPopulate = localTeams.map(t => ({
        name: t.name, members: [] as string[], teamLead: '' as string,
    }));

    // 3. Distribute members (round-robin)
    sortedStudents.forEach((student, idx) => {
        const teamIndexToAddTo = idx % numberOfLocalTeams;
        if (tempTeamsToPopulate[teamIndexToAddTo].members.length < maxMembersPerTeam) {
            tempTeamsToPopulate[teamIndexToAddTo].members.push(student.uid);
        }
    });

    // 4. Assign Team Leads and update reactive `teams.value`
    localTeams.forEach((originalTeam, index) => {
        const populatedTeamData = tempTeamsToPopulate[index];
        originalTeam.members = populatedTeamData.members;

        if (originalTeam.members.length > 0) {
            const teamMemberDetails = originalTeam.members
                .map(memberId => {
                    const studentData = props.students.find(s => s.uid === memberId);
                    if (!studentData) return null;
                    return {
                        ...studentData, // UserData
                        xpData: studentXpMap.get(memberId) || getDefaultXPData(memberId) // Add fetched XPData
                    };
                })
                .filter(Boolean) as (UserData & { xpData: XPData })[]; // Enriched locally

            teamMemberDetails.sort((a, b) => {
                const totalXpA = a.xpData.totalCalculatedXp ?? 0;
                const totalXpB = b.xpData.totalCalculatedXp ?? 0;
                if (totalXpB !== totalXpA) return totalXpB - totalXpA;

                const hasLaptopA = a.hasLaptop ?? false;
                const hasLaptopB = b.hasLaptop ?? false;
                if (hasLaptopB !== hasLaptopA) return hasLaptopB ? 1 : -1;
                return 0;
            });
            originalTeam.teamLead = teamMemberDetails[0]?.uid || '';
        } else {
            originalTeam.teamLead = '';
        }
    });

    emitTeamsUpdate();
  } catch (error: any) {
    emit('error', error.message || 'Failed to auto-generate teams locally.');
  }
}

const addTeamButtonTitle = computed(() => {
  if (teams.value.length >= maxTeams) return `Maximum teams (${maxTeams}) reached.`;
  return 'Add a new team';
});

onMounted(initializeTeams);
</script>

<style scoped>
.team-box {
  background-color: var(--bs-light-bg-subtle);
  border-color: var(--bs-border-color-translucent);
  transition: box-shadow 0.2s ease-in-out;
}
.team-box:hover { box-shadow: var(--bs-box-shadow-sm); }
.form-text { font-size: 0.8em; }
.badge .btn-close-sm {
    padding: 0.15em 0.3em; width: 0.7em; height: 0.7em; line-height: 0.7em;
    margin-left: 0.3rem !important; vertical-align: middle; background-size: 50%;
    opacity: 0.7; transition: opacity 0.15s ease-in-out;
}
.badge .btn-close-sm:hover { opacity: 1; }
.form-label.small { font-size: 0.8rem; margin-bottom: 0.25rem; color: var(--bs-secondary); }
.invalid-feedback { font-size: 0.8em; }
.align-items-start { align-items: flex-start !important; }
.mt-4 { margin-top: 1.5rem !important; }
.selected-members-display { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--bs-border-color-translucent); }
.fade-fast-enter-active, .fade-fast-leave-active { transition: all 0.3s ease; }
.fade-fast-enter-from, .fade-fast-leave-to { opacity: 0; transform: translateY(10px); }
.fade-fast-move { transition: transform 0.3s ease; }
</style>