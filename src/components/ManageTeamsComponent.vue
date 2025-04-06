// src/components/ManageTeamsComponent.vue

<template>
    <div class="manage-teams-component space-y-4">
        <!-- Overall Validation Message -->
         <p v-if="showValidationErrors && !overallValidation.isValid" class="mb-4 text-sm text-error bg-error-extraLight p-3 rounded-md border border-error-light text-center">
            <i class="fas fa-exclamation-triangle mr-1"></i> {{ overallValidation.message }}
        </p>

        <!-- No Teams Yet Message -->
        <div v-if="teams.length === 0" class="bg-info-extraLight border border-info-light text-info-text px-4 py-3 rounded-md text-sm shadow-sm italic text-center">
            <i class="fas fa-info-circle mr-1"></i> No teams defined yet. Click "Add Team" to begin. (Minimum {{ minTeams }} teams required)
        </div>

        <!-- Team Cards -->
        <transition-group name="fade-list" tag="div" class="space-y-4">
            <!-- Use internalId for stable key -->
            <div v-for="(team, index) in teams" :key="team.internalId"
                 class="bg-surface border border-border rounded-lg shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md">
                <div class="p-4 sm:p-5 space-y-4">
                    <!-- Team Name Input -->
                    <div class="flex justify-between items-center">
                        <label :for="'teamName-' + index" class="block text-sm font-medium text-text-secondary mb-1">
                            Team {{ index + 1 }} Name <span class="text-error">*</span>
                        </label>
                         <!-- Remove Team Button (moved to top right) -->
                         <button type="button"
                                class="text-error-dark hover:text-error hover:bg-error-light rounded-full p-1.5 transition-colors text-xs"
                                @click="removeTeam(index)"
                                :disabled="isSubmitting || teams.length <= minTeams"
                                title="Remove Team">
                            <i class="fas fa-trash-alt fa-fw"></i>
                            <span class="sr-only">Remove Team</span>
                        </button>
                    </div>
                    <input type="text" :id="'teamName-' + index"
                           v-model.trim="team.teamName"
                           required
                           class="form-input block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-text-placeholder focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:opacity-50 disabled:bg-surface-disabled disabled:cursor-not-allowed transition-colors bg-surface text-text-primary"
                           placeholder="Enter team name (e.g., Team Alpha)"
                           :disabled="isSubmitting"
                           @input="emitUpdate">
                    <p v-if="duplicateTeamNames.has(team.teamName.trim().toLowerCase()) && team.teamName.trim()" class="mt-1 text-xs text-error">
                        Team name must be unique.
                    </p>
                    <p v-if="showValidationErrors && !team.teamName.trim()" class="mt-1 text-xs text-error">
                        Team name is required.
                    </p>


                    <!-- Member Selection -->
                    <div class="pt-3 border-t border-border-light">
                        <label :for="'memberSearch-' + index" class="block text-sm font-medium text-text-secondary mb-1">
                            Add Team Members ({{ team.members.length }}) <span class="text-error">*</span>
                        </label>
                        <div class="relative">
                            <input type="text" :id="'memberSearch-' + index"
                                   v-model="searchQueries[index]"
                                   :ref="el => { if (el) memberSearchInputs[index] = el as HTMLInputElement }"
                                   class="form-input block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-text-placeholder focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:opacity-50 disabled:bg-surface-disabled disabled:cursor-not-allowed transition-colors bg-surface text-text-primary"
                                   placeholder="Search available students..."
                                   @focus="showDropdown(index)"
                                   @blur="hideDropdownWithDelay(index)"
                                   :disabled="isSubmitting"
                                   autocomplete="off">
                             <!-- Dropdown -->
                            <transition name="fade-fast">
                                <div v-if="dropdownVisible[index]"
                                     class="absolute z-50 mt-1 w-full bg-surface shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-border">
                                    <button v-for="student in filteredAndSortedStudents(index)"
                                            :key="student.uid"
                                            type="button"
                                            class="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-primary-light hover:text-white transition-colors"
                                            @mousedown.prevent="addMember(index, student)">
                                        {{ props.nameCache[student.uid] || student.uid }}
                                        <span v-if="getStudentTeamAssignment(student.uid, index)" class="text-xs text-text-disabled italic ml-1">
                                            (already in {{ getStudentTeamAssignment(student.uid, index) }})
                                        </span>
                                    </button>
                                    <div v-if="!filteredAndSortedStudents(index).length"
                                         class="px-4 py-2 text-sm text-text-secondary italic">
                                        {{ searchQueries[index] ? 'No matching students found.' : 'No more students available or matching search.' }}
                                    </div>
                                </div>
                            </transition>
                        </div>

                        <!-- Selected Member Pills -->
                        <div v-if="team.members.length > 0" class="mt-3 flex flex-wrap gap-2">
                             <span v-for="memberId in team.members" :key="memberId"
                                  class="inline-flex items-center py-1 pl-2.5 pr-1 rounded-full text-xs font-medium bg-secondary text-text-primary border border-secondary-dark shadow-sm">
                                {{ props.nameCache[memberId] || memberId }}
                                <button type="button"
                                        class="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-neutral-dark hover:bg-error-light hover:text-error-dark focus:outline-none focus:bg-error-light focus:text-error-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        @click="removeMember(index, memberId)" :disabled="isSubmitting"
                                        :aria-label="`Remove ${props.nameCache[memberId] || memberId}`">
                                     <svg class="h-2.5 w-2.5" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                                        <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                                    </svg>
                                    <span class="sr-only">Remove</span>
                                </button>
                            </span>
                        </div>
                         <p v-if="showValidationErrors && team.members.length === 0" class="mt-1 text-xs text-error">
                             Each team must have at least one member.
                         </p>
                    </div>
                </div>
            </div>
        </transition-group>

        <!-- Add Team Button -->
        <div class="mt-6 text-center">
            <button type="button"
                    class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    @click="addTeam" :disabled="isSubmitting || !canAddMoreTeams">
                <i class="fas fa-plus mr-1.5 h-4 w-4"></i> Add Team
            </button>
            <p v-if="!canAddMoreTeams" class="text-text-secondary text-xs mt-1 italic">
                Maximum number of teams reached ({{ maxTeams }}) or no more unassigned students available.
            </p>
        </div>

        <!-- Auto Generate (If enabled) - Placeholder styling -->
        <div v-if="canAutoGenerate" class="mt-6 pt-4 border-t border-border text-center space-y-2 bg-secondary-light p-4 rounded-md">
            <p class="text-sm text-text-secondary">Or auto-generate teams:</p>
            <!-- Auto-generate UI elements would go here -->
             <button type="button" class="text-primary text-sm hover:underline" disabled>
                (Auto-generation not yet implemented)
            </button>
        </div>

    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue';
import { EventTeam, User as TeamMember } from '../types/event'; // Use User as TeamMember
import { v4 as uuidv4 } from 'uuid';

interface Props {
    initialTeams?: EventTeam[];
    students: TeamMember[]; // Use User type here now
    nameCache: Record<string, string>;
    isSubmitting: boolean;
    canAutoGenerate?: boolean;
}

interface LocalEventTeam extends EventTeam {
    internalId: string;
}

// --- Props and Emits ---
const props = defineProps<Props>();
const emit = defineEmits<{
    'update:teams': [teams: EventTeam[]];
}>();

// --- Constants ---
const minTeams = 2;
const maxTeams = 10;

// --- Local State ---
const localTeams = ref<LocalEventTeam[]>([]);
// Corrected: Removed invalid Reactive<> type hints
const searchQueries = reactive<Record<number, string>>({});
const dropdownVisible = reactive<Record<number, boolean>>({});
const showValidationErrors = ref<boolean>(false);
const memberSearchInputs = ref<Record<number, HTMLInputElement | null>>({});

// --- Helper Methods ---

// Emit the current valid teams list to the parent (exclude internalId, ensure arrays)
const emitUpdate = (): void => {
    showValidationErrors.value = true;
    const teamsToEmit = localTeams.value.map(({ internalId, ...rest }) => ({
        ...rest,
        // Ensure ratings and submissions are always arrays, even if empty
        ratings: rest.ratings ?? [],
        submissions: rest.submissions ?? [],
    }));
    emit('update:teams', teamsToEmit);
};

// Add unique internal ID for stable list rendering
const addInternalId = (team: EventTeam): LocalEventTeam => ({
    ...team,
    internalId: uuidv4(),
});

// Check for duplicate team names (case-insensitive)
const duplicateTeamNames = computed(() => {
    const names = new Map<string, number>();
    const duplicates = new Set<string>();
    localTeams.value.forEach(team => {
        const name = team.teamName?.trim().toLowerCase();
        if (!name) return;
        const count = (names.get(name) || 0) + 1;
        names.set(name, count);
        if (count > 1) {
            duplicates.add(name); // Store the lowercase name for checking
        }
    });
    return duplicates;
});


// Helper to initialize or reset local teams
const initializeTeams = (initialData: EventTeam[] | undefined) => {
    let teamsToSet: EventTeam[];
    if (!initialData || initialData.length === 0) {
        teamsToSet = [
            { teamName: 'Team 1', members: [], ratings: [], submissions: [] },
            { teamName: 'Team 2', members: [], ratings: [], submissions: [] }
        ];
    } else {
        // Ensure ratings/submissions are arrays during initialization/copying
        teamsToSet = JSON.parse(JSON.stringify(initialData)).map((team: EventTeam) => ({
             ...team,
             ratings: team.ratings ?? [],
             submissions: team.submissions ?? [],
        }));
    }

    localTeams.value = teamsToSet.map(addInternalId);

    // Reset search/dropdown state correctly
    Object.keys(searchQueries).forEach(key => delete searchQueries[Number(key)]);
    Object.keys(dropdownVisible).forEach(key => delete dropdownVisible[Number(key)]);
    localTeams.value.forEach((_, index) => {
        searchQueries[index] = '';
        dropdownVisible[index] = false;
    });

    emitUpdate(); // Emit initial state
};


// Get all student IDs currently assigned to any team
const assignedStudentIds = computed<Set<string>>(() => {
    return new Set(localTeams.value.flatMap(team => team.members || []));
});

// Get the team name a student is assigned to (excluding the current team being searched)
const getStudentTeamAssignment = (studentId: string, currentTeamIndex: number): string | null => {
     // Find team where member exists and index is different
     const team = localTeams.value.find((t, idx) =>
        idx !== currentTeamIndex && Array.isArray(t.members) && t.members.includes(studentId)
     );
     return team ? team.teamName : null;
};


// Function to filter and sort students for a specific team's dropdown
const filteredAndSortedStudents = (teamIndex: number): TeamMember[] => {
    if (!Array.isArray(props.students)) return [];

    const currentSearch = searchQueries[teamIndex]?.trim().toLowerCase() || '';
    const currentTeamMembers = new Set(localTeams.value[teamIndex]?.members || []);

    // Filter students:
    // 1. Must have a valid uid
    // 2. Must NOT be assigned to ANOTHER team
    // 3. Must match search query if present
    const available = props.students.filter(student => {
        if (!student.uid) return false; // Ignore students without UID

        const assignedElsewhere = assignedStudentIds.value.has(student.uid) && !currentTeamMembers.has(student.uid);
        if (assignedElsewhere) return false; // Exclude if in another team

        // Apply search if query exists
        if (currentSearch) {
             const name = (props.nameCache[student.uid] || student.uid).toLowerCase();
             return name.includes(currentSearch);
        }

        return true; // Include if not assigned elsewhere and no search query
    });

    // Sort alphabetically by name
    return available.sort((a, b) => {
        const nameA = props.nameCache[a.uid] || a.uid;
        const nameB = props.nameCache[b.uid] || b.uid;
        return nameA.localeCompare(nameB);
    });
};

// Show/Hide Dropdown
const showDropdown = (index: number) => { dropdownVisible[index] = true; };
const hideDropdownWithDelay = (index: number) => {
    setTimeout(() => { dropdownVisible[index] = false; }, 200); // Delay to allow click
};

// Add/Remove Members
const addMember = async (teamIndex: number, student: TeamMember) => {
    const team = localTeams.value[teamIndex];
    // Ensure team and members array exist, check student uid
    if (!team || !Array.isArray(team.members) || !student.uid || team.members.includes(student.uid)) return;

    const currentAssignment = getStudentTeamAssignment(student.uid, teamIndex);

    if (currentAssignment) {
        const studentName = props.nameCache[student.uid] || student.uid;
        if (!confirm(`${studentName} is already in "${currentAssignment}". Move to "${team.teamName}"?`)) {
            searchQueries[teamIndex] = '';
            dropdownVisible[teamIndex] = false;
            return;
        }
        // Remove from other team(s)
        localTeams.value.forEach((t) => {
             if (Array.isArray(t.members) && t.members.includes(student.uid)) {
                t.members = t.members.filter(id => id !== student.uid);
            }
        });
    }

    // Add to current team
    team.members.push(student.uid);
    searchQueries[teamIndex] = '';
    emitUpdate();

    await nextTick();
    const inputElement = memberSearchInputs.value[teamIndex];
    inputElement?.focus();
    showDropdown(teamIndex);
};

const removeMember = (teamIndex: number, memberId: string) => {
    const team = localTeams.value[teamIndex];
    if (!team || !Array.isArray(team.members)) return;
    team.members = team.members.filter(id => id !== memberId);
    emitUpdate();
};

// Add/Remove Teams
const addTeam = async () => { // Made async for nextTick
    if (!canAddMoreTeams.value) return;

    const newTeamNumber = localTeams.value.length + 1;
    let newTeamName = `Team ${newTeamNumber}`;
    const existingNamesLower = new Set(localTeams.value.map(t => t.teamName?.trim().toLowerCase()));
    let counter = 1;
    while (existingNamesLower.has(newTeamName.toLowerCase())) {
        newTeamName = `Team ${newTeamNumber} (${counter++})`;
    }

    // Ensure new team has empty arrays for ratings/submissions
    const newTeam = addInternalId({ teamName: newTeamName, members: [], ratings: [], submissions: [] });
    localTeams.value.push(newTeam);

    const newIndex = localTeams.value.length - 1;
    searchQueries[newIndex] = '';
    dropdownVisible[newIndex] = false;

    emitUpdate();

     await nextTick();
     const teamInputElement = memberSearchInputs.value[newIndex]; // Target input instead of label
     teamInputElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
     teamInputElement?.focus();
};

const removeTeam = (index: number) => {
    if (localTeams.value.length <= minTeams) {
        alert(`At least ${minTeams} teams are required.`);
        return;
    }
    if (!confirm(`Are you sure you want to remove "${localTeams.value[index].teamName}"?`)) {
        return;
    }

    // Use the actual team's internalId if available, otherwise fallback to index
    const teamToRemoveId = localTeams.value[index]?.internalId;

    // Clean up state associated with the removed team index/id
    delete searchQueries[index];
    delete dropdownVisible[index];
    if (memberSearchInputs.value[index]) {
        memberSearchInputs.value[index] = null; // Clear ref
    }

    localTeams.value.splice(index, 1);

    // Important: Re-index the reactive state objects after removal if keys were based on index
    // This is complex, simpler approach is using Map or object keyed by internalId if needed

    emitUpdate();
};

// --- Computed Properties ---

const teams = computed(() => localTeams.value);
const totalStudents = computed(() => props.students?.length || 0);
const canAddMoreTeams = computed(() => {
    return localTeams.value.length < maxTeams && assignedStudentIds.value.size < totalStudents.value;
});

const overallValidation = computed(() => {
    const errors: string[] = [];
    if (localTeams.value.length < minTeams) {
        errors.push(`At least ${minTeams} teams are required.`);
    }
    let hasEmptyName = false;
    let hasEmptyMembers = false;
    localTeams.value.forEach(team => {
        if (!team.teamName?.trim()) hasEmptyName = true;
        if (!Array.isArray(team.members) || team.members.length === 0) hasEmptyMembers = true;
    });
    if (hasEmptyName) errors.push("All teams must have a name.");
    if (hasEmptyMembers) errors.push("All teams must have at least one member.");
    // Use the computed duplicateTeamNames set
    if (duplicateTeamNames.value.size > 0) errors.push("Team names must be unique.");

    return { isValid: errors.length === 0, message: errors.join(' ') };
});


// --- Watchers ---
watch(() => props.initialTeams, (newTeams) => {
    console.log("Initial teams prop changed, re-initializing component.");
    initializeTeams(newTeams);
}, { immediate: true, deep: true });

// --- Lifecycle Hooks ---
onMounted(() => {
    if (localTeams.value.length === 0) {
        initializeTeams(props.initialTeams);
    }
});

// --- Expose ---
defineExpose({ initializeTeams });

</script>

<style scoped>
/* Fade transition for dropdown */
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.15s ease-out;
}
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}

/* Transition for list items */
.fade-list-enter-active,
.fade-list-leave-active {
  transition: all 0.3s ease-out;
}
.fade-list-enter-from,
.fade-list-leave-to {
  opacity: 0;
  transform: translateY(15px);
}
/* Ensure moving items transition smoothly */
.fade-list-move {
  transition: transform 0.3s ease-out;
}
</style>