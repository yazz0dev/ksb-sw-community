<template>
    <div class="manage-teams-component space-y-4">
        <h4 class="text-xl font-semibold text-gray-800">Define Teams</h4>
        <p class="text-sm text-gray-600">Define at least two teams for this event. Add members to each team.</p>

        <div v-if="teams.length === 0" class="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-md text-sm">
            No teams defined yet. Click "Add Another Team".
        </div>

        <div v-for="(team, index) in teams" :key="index" class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div class="p-4 space-y-3">
                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div class="md:col-span-4">
                        <label :for="'teamName-' + index" class="block text-sm font-medium text-gray-700 mb-1">Team {{ index + 1 }} Name <span class="text-red-600">*</span></label>
                        <input type="text" :id="'teamName-' + index"
                               v-model.trim="team.teamName"
                               class="block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                               placeholder="Enter team name"
                               :disabled="isSubmitting"
                               @input="emitUpdate">
                    </div>

                    <div class="md:col-span-6">
                        <label :for="'memberSearch-' + index" class="block text-sm font-medium text-gray-700 mb-1">Add Members ({{ team.members.length }}) <span class="text-red-600">*</span></label>
                        <div class="relative">
                            <input type="text" :id="'memberSearch-' + index"
                                   v-model="searchQueries[index]"
                                   class="block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                   placeholder="Search students..."
                                   @focus="showDropdown(index)"
                                   @blur="hideDropdown(index)"
                                   :disabled="isSubmitting"
                                   autocomplete="off">
                            <transition
                                enter-active-class="transition ease-out duration-100"
                                enter-from-class="transform opacity-0 scale-95"
                                enter-to-class="transform opacity-100 scale-100"
                                leave-active-class="transition ease-in duration-75"
                                leave-from-class="transform opacity-100 scale-100"
                                leave-to-class="transform opacity-0 scale-95"
                            >
                                <div v-if="dropdownVisible[index]"
                                     class="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                    <button v-for="student in filteredStudents(index)"
                                            :key="student.uid"
                                            class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                            type="button"
                                            @mousedown.prevent="addMember(index, student)">
                                        {{ student.name }}
                                    </button>
                                    <div v-if="searchQueries[index] && !filteredStudents(index).length"
                                         class="px-4 py-2 text-sm text-gray-500">
                                         No matching students found.
                                    </div>
                                </div>
                            </transition>
                        </div>
                        <div v-if="team.members.length > 0" class="mt-2 flex flex-wrap gap-1.5">
                            <span v-for="memberId in team.members" :key="memberId"
                                  class="inline-flex items-center py-0.5 pl-2 pr-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                                {{ nameCache[memberId] || memberId }}
                                <button type="button"
                                        class="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-500 focus:outline-none focus:bg-gray-500 focus:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        @click="removeMember(index, memberId)" :disabled="isSubmitting"
                                        aria-label="Remove">
                                    <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                                        <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                                    </svg>
                                </button>
                            </span>
                        </div>
                    </div>

                    <div class="md:col-span-2 md:text-right self-center">
                        <button type="button"
                                class="inline-flex justify-center items-center w-full md:w-auto px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                @click="removeTeam(index)"
                                :disabled="isSubmitting || teams.length <= 1">
                            <i class="fas fa-trash-alt mr-1 h-3 w-3"></i> <span class="hidden md:inline">Remove</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-4 text-center">
            <button type="button"
                    class="inline-flex items-center px-3 py-1.5 border border-green-300 shadow-sm text-xs font-medium rounded text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    @click="addTeam" :disabled="isSubmitting || !canAddTeam">
                <i class="fas fa-plus mr-1 h-3 w-3"></i> Add Another Team
            </button>
            <p v-if="!canAddTeam" class="text-yellow-600 text-xs mt-1">
                Maximum number of teams reached or cannot add more based on available students.
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';

interface Team {
    teamName: string;
    members: string[];
}

interface Student {
    uid: string;
}

interface Props {
    initialTeams: Team[];
    students: Student[];
    nameCache: Record<string, string>;
    isSubmitting: boolean;
    canAutoGenerate: boolean;
}

// --- Auto-Generation State ---
const autoGenType = ref<'numberOfTeams' | 'maxMembers'>('numberOfTeams');
const autoGenValue = ref<number>(2);
const autoGenErrorMessage = ref<string>('');

const props = defineProps<Props>();

const emit = defineEmits<{
    'update:teams': [teams: Team[]];
    'can-add-team': [canAdd: boolean];
    'auto-generate': [config: { generationType: string; value: number }];
}>();

// --- Local State ---
const localTeams = ref<Team[]>([]);
const editingTeamName = ref<string | null>(null);
const currentTeam = reactive<Team>({ teamName: '', members: [] });
const studentSearch = ref<string>('');
const addTeamErrorMessage = ref<string>('');
const showNewTeamForm = ref<boolean>(false);

// --- Initialization ---
onMounted(() => {
    // Deep copy initial teams to avoid modifying prop directly
    localTeams.value = JSON.parse(JSON.stringify(props.initialTeams || []));
});

// --- Watchers ---
// Watch for external changes to initialTeams
watch(() => props.initialTeams, (newVal) => {
    localTeams.value = JSON.parse(JSON.stringify(newVal || []));
    // If the team being edited was removed externally, reset the form
    if (editingTeamName.value !== null && !localTeams.value.some(t => t.teamName === editingTeamName.value)) {
        cancelEdit();
    }
}, { deep: true });

// --- Computed Properties ---

// All student IDs currently assigned to any team
const assignedStudentIds = computed<Set<string>>(() => {
    return new Set(localTeams.value.flatMap(team => team.members || []));
});

// Filtered list of students available to be added to the *current* team being edited/created
const filteredAvailableStudents = computed<Student[]>(() => {
    if (!Array.isArray(props.students)) return [];

    // Students not already in the *current* team's member list
    let available = props.students.filter(student => !currentTeam.members.includes(student.uid));

    // Further filter by search term if present
    if (studentSearch.value) {
        const search = studentSearch.value.toLowerCase();
        available = available.filter(student => {
            const name = props.nameCache[student.uid] || '';
            return name.toLowerCase().includes(search) ||
                   student.uid.toLowerCase().includes(search);
        });
    }

    // Sort alphabetically
    return available.sort((a, b) => {
        const nameA = props.nameCache[a.uid] || '';
        const nameB = props.nameCache[b.uid] || '';
        return nameA.localeCompare(nameB);
    });
});

// Sorted list of teams for display purposes
const sortedTeams = computed<Team[]>(() => {
     // Filter out any potential invalid/empty placeholder teams before sorting
     const validTeams = localTeams.value.filter(team => team && team.teamName);
     return [...validTeams].sort((a, b) =>
        (a?.teamName || '').localeCompare(b?.teamName || '')
    );
});

// Validation: Check if the current state represents valid teams (e.g., >= 2 teams, each with name and members)
// Note: This might be better handled in the parent component before final submission
const hasValidTeamsConfiguration = computed<boolean>(() => {
    const validTeams = localTeams.value.filter(team => team.teamName?.trim() && Array.isArray(team.members) && team.members.length > 0);
    return validTeams.length >= 2; // Example: require at least 2 valid teams
});

// Computed property to enable/disable the save button for the current team form
const canSaveTeam = computed<boolean>(() => {
    return currentTeam.teamName.trim() &&
           currentTeam.members.length > 0 &&
           !props.isSubmitting;
});

// Computed property to check if all available students have been assigned to a team
const areAllStudentsAssigned = computed<boolean>(() => {
    if (!Array.isArray(props.students) || props.students.length === 0) {
        return true; // Or false, depending on desired behavior when no students exist
    }
    const currentAssignedIds = assignedStudentIds.value; // Use the computed set
    return props.students.every(student => currentAssignedIds.has(student.uid));
});

// Emit whether adding more teams is possible (used by parent)
watch(areAllStudentsAssigned, (newVal) => {
    emit('can-add-team', !newVal);
}, { immediate: true });


// --- Auto-Generation Computed ---
const canTriggerAutoGenerate = computed<boolean>(() => {
    autoGenErrorMessage.value = ''; // Clear previous errors
    if (props.isSubmitting) return false;
    if (!Array.isArray(props.students) || props.students.length === 0) {
        autoGenErrorMessage.value = 'No students available to generate teams.';
        return false;
    }
    const value = Number(autoGenValue.value);
     if (isNaN(value) || !Number.isInteger(value) || value <= 0) { // Ensure integer > 0
        autoGenErrorMessage.value = 'Please enter a valid positive whole number.';
        return false;
    }

    if (autoGenType.value === 'numberOfTeams') {
        if (value < 2) {
             autoGenErrorMessage.value = 'Must generate at least 2 teams.';
             return false;
        }
        if (value > props.students.length) {
            autoGenErrorMessage.value = 'Cannot generate more teams than available students.';
            return false;
        }
    } else if (autoGenType.value === 'maxMembers') {
         if (value < 1) {
             // This case is already handled by the positive integer check above
             // autoGenErrorMessage.value = 'Max members per team must be at least 1.';
             // return false;
             return false; // Should not happen due to integer check
         }
         // Check if max members allows for at least 2 teams (if more than 1 student exists)
         if (props.students.length > 1 && Math.ceil(props.students.length / value) < 2 ) {
             autoGenErrorMessage.value = `Max members (${value}) results in only 1 team for ${props.students.length} students. Adjust to create at least 2 teams.`;
             return false;
         }
    }
    return true; // All checks passed
});


// --- Helper Methods ---

// Checks if a student is assigned to *another* team (different from the one currently being edited)
const isStudentAssignedElsewhere = (studentUid: string): boolean => {
    return localTeams.value.some(team =>
        team.teamName !== editingTeamName.value && // Exclude the team currently being edited
        Array.isArray(team.members) &&
        team.members.includes(studentUid)
    );
};


// --- Auto-Generation Action ---
const triggerAutoGenerate = (): void => {
    if (!canTriggerAutoGenerate.value) {
        // Error message should already be set by the computed property
        return;
    }
    // Emit the event for the parent component to handle the logic
    emit('auto-generate', {
        generationType: autoGenType.value,
        value: Number(autoGenValue.value) // Ensure it's a number
    });
};


// --- Team Management Actions ---

// Prepare the form for adding a *new* team
const prepareNewTeam = (): void => {
    editingTeamName.value = null; // Ensure we are not in edit mode
    currentTeam.teamName = '';
    currentTeam.members = [];
    studentSearch.value = '';
    addTeamErrorMessage.value = '';
    showNewTeamForm.value = true; // Show the form
};

// Prepare the form for editing an *existing* team
const editTeam = (teamName: string): void => {
    const teamToEdit = localTeams.value.find(t => t.teamName === teamName);
    if (teamToEdit) {
        editingTeamName.value = teamName; // Set the name of the team being edited
        currentTeam.teamName = teamToEdit.teamName;
        // Deep copy members to avoid modifying original array directly during edit
        currentTeam.members = teamToEdit.members ? [...teamToEdit.members] : [];
        studentSearch.value = '';
        addTeamErrorMessage.value = '';
        showNewTeamForm.value = false; // Ensure add mode is off
    } else {
        console.error("Could not find team to edit with name:", teamName);
        cancelEdit(); // Reset if team not found
    }
};

// Cancel the current add/edit operation and hide the form
const cancelEdit = (): void => {
    editingTeamName.value = null;
    showNewTeamForm.value = false;
    currentTeam.teamName = '';
    currentTeam.members = [];
    studentSearch.value = '';
    addTeamErrorMessage.value = '';
};

// Save the team currently in the form (either add new or update existing)
const saveTeam = (): void => {
    addTeamErrorMessage.value = ''; // Clear previous errors
    const teamNameTrimmed = currentTeam.teamName.trim();

    // --- Validation ---
    if (!teamNameTrimmed) {
        addTeamErrorMessage.value = 'Team name is required.';
        return;
    }
    if (!Array.isArray(currentTeam.members) || currentTeam.members.length === 0) {
        addTeamErrorMessage.value = 'Team must have at least one member.';
        return;
    }

    // Check for duplicate team names (case-insensitive), excluding the team being edited
    const isNameDuplicate = localTeams.value.some(team =>
        team.teamName !== editingTeamName.value && // Exclude self if editing
        team.teamName.trim().toLowerCase() === teamNameTrimmed.toLowerCase()
    );
    if (isNameDuplicate) {
        addTeamErrorMessage.value = `Team name "${teamNameTrimmed}" already exists. Please use a unique name.`;
        return;
    }

    // --- Update Logic ---
    const teamData: Team = {
        teamName: teamNameTrimmed,
        members: [...currentTeam.members] // Create a copy of members
    };

    const existingTeamIndex = localTeams.value.findIndex(t => t.teamName === editingTeamName.value);

    if (editingTeamName.value !== null && existingTeamIndex !== -1) {
        // Update existing team
        localTeams.value.splice(existingTeamIndex, 1, teamData);
    } else {
        // Add new team
        localTeams.value.push(teamData);
    }

    emitUpdate(); // Emit the updated list
    cancelEdit(); // Close form and reset state
};

// Delete a team by its name
const deleteTeam = (teamNameToDelete: string): void => {
    // Prevent deleting if it leaves less than 2 teams
     if (localTeams.value.filter(t => t.teamName).length <= 2) {
        addTeamErrorMessage.value = 'Cannot delete team: Minimum of 2 teams required.';
        // Use a more persistent notification system if needed
        setTimeout(() => addTeamErrorMessage.value = '', 3000);
        return;
    }

    if (confirm(`Are you sure you want to delete team "${teamNameToDelete}"? This cannot be undone.`)) {
        const indexToDelete = localTeams.value.findIndex(t => t.teamName === teamNameToDelete);
        if (indexToDelete !== -1) {
            localTeams.value.splice(indexToDelete, 1);

            // If the deleted team was being edited, reset the form
            if (editingTeamName.value === teamNameToDelete) {
                 cancelEdit();
            }
            emitUpdate(); // Emit the updated list
        } else {
             console.error("Could not find team to delete with name:", teamNameToDelete);
             addTeamErrorMessage.value = 'Error deleting team: Team not found.';
        }
    }
};

// Add a member to the *current* team being edited/created
const addMember = (uid: string): void => {
    if (!currentTeam.members.includes(uid) && !isStudentAssignedElsewhere(uid)) {
        currentTeam.members.push(uid);
    } else if (isStudentAssignedElsewhere(uid)) {
        // Optionally provide feedback that the student is already assigned
        console.warn(`Student ${uid} is already assigned to another team.`);
    }
};

// Remove a member from the *current* team being edited/created
const removeMember = (uid: string): void => {
    const index = currentTeam.members.indexOf(uid);
    if (index !== -1) {
        currentTeam.members.splice(index, 1);
    }
};

// Emit the current valid teams list to the parent
const emitUpdate = (): void => {
    // Filter out any potential invalid teams before emitting (e.g., empty placeholders)
    const validTeams = localTeams.value.filter(team => team.teamName?.trim() && Array.isArray(team.members));
    emit('update:teams', validTeams);
};
</script>

<style scoped>
.team-card {
    background-color: #f8f9fa; /* Light background for team cards */
    border: 1px solid #dee2e6;
}

.form-label.small {
    font-size: 0.8rem;
    font-weight: 500;
}

.dropdown-menu {
    z-index: 1050; /* Ensure dropdown is on top */
}

.dropdown-item-sm {
    font-size: 0.875rem;
}

/* Responsive adjustments */
@media (max-width: 767.98px) { /* Below md */
    .col-md-2.text-md-end {
        text-align: center !important; /* Center button on small screens */
    }
    .w-md-auto {
        width: auto !important; /* Allow button to shrink on mobile */
    }
}
</style>
