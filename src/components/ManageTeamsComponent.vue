<template>
    <div class="manage-teams-component">
        <h4 class="mb-3">Define Teams</h4>
        <p class="text-muted small mb-3">Define at least two teams for this event. Add members to each team.</p>

        <div v-if="teams.length === 0" class="alert alert-warning small py-2">
            No teams defined yet. Click "Add Team".
        </div>

        <div v-for="(team, index) in teams" :key="index" class="card mb-3 team-card">
            <div class="card-body p-3"> <!-- Adjusted padding -->
                <div class="row g-3 align-items-center">
                    <!-- Team Name Input -->
                    <div class="col-md-4">
                        <label :for="'teamName-' + index" class="form-label small mb-1">Team {{ index + 1 }} Name <span class="text-danger">*</span></label>
                        <input type="text" :id="'teamName-' + index"
                               v-model.trim="team.teamName"
                               class="form-control form-control-sm"
                               placeholder="Enter team name"
                               :disabled="isSubmitting"
                               @input="emitUpdate">
                    </div>

                    <!-- Member Selection -->
                    <div class="col-md-6">
                        <label :for="'memberSearch-' + index" class="form-label small mb-1">Add Members ({{ team.members.length }}) <span class="text-danger">*</span></label>
                        <div class="position-relative">
                            <input type="text" :id="'memberSearch-' + index"
                                   v-model="searchQueries[index]"
                                   class="form-control form-control-sm"
                                   placeholder="Search students..."
                                   @focus="showDropdown(index)"
                                   @blur="hideDropdown(index)"
                                   :disabled="isSubmitting"
                                   autocomplete="off">
                            <!-- Dropdown for suggestions -->
                            <div v-if="dropdownVisible[index] && filteredStudents(index).length > 0"
                                 class="dropdown-menu d-block position-absolute w-100 shadow mt-1" style="max-height: 150px; overflow-y: auto; z-index: 1050;">
                                <button v-for="student in filteredStudents(index)"
                                        :key="student.uid"
                                        class="dropdown-item dropdown-item-sm py-1" type="button"
                                        @mousedown.prevent="addMember(index, student)">
                                    {{ student.name }}
                                </button>
                            </div>
                             <div v-if="dropdownVisible[index] && searchQueries[index] && !filteredStudents(index).length"
                                  class="dropdown-menu d-block position-absolute w-100 shadow mt-1">
                                 <span class="dropdown-item dropdown-item-sm text-muted disabled py-1">No matching students found.</span>
                             </div>
                        </div>
                        <!-- Selected Members List -->
                        <div v-if="team.members.length > 0" class="mt-2 d-flex flex-wrap gap-1">
                            <span v-for="memberId in team.members" :key="memberId"
                                  class="badge text-bg-light border d-flex align-items-center py-1 px-2">
                                {{ nameCache[memberId] || memberId }}
                                <button type="button" class="btn-close ms-1" aria-label="Remove"
                                        @click="removeMember(index, memberId)" :disabled="isSubmitting"
                                        style="font-size: 0.6em; padding: 0.1em 0.2em;"></button>
                            </span>
                        </div>
                    </div>

                    <!-- Remove Team Button -->
                    <div class="col-md-2 text-md-end align-self-center pt-3 pt-md-0">
                        <button type="button" class="btn btn-sm btn-outline-danger w-100 w-md-auto" <!-- Adjusted width -->
                                @click="removeTeam(index)"
                                :disabled="isSubmitting || teams.length <= 1">
                            <i class="fas fa-trash-alt"></i> <span class="d-none d-md-inline">Remove</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Team Button -->
        <div class="mt-3 text-center">
            <button type="button" class="btn btn-sm btn-outline-success" @click="addTeam" :disabled="isSubmitting || !canAddTeam">
                <i class="fas fa-plus me-1"></i> Add Another Team
            </button>
            <p v-if="!canAddTeam" class="form-text text-warning small mt-1">
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
